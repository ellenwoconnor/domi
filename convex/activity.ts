import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail, requireProfile } from "./lib/access";

// Events (read state, taps), push tokens, app opens. Both read from `events` (see lib/events.ts).

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const rows = await ctx.db
      .query("events")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .order("desc")
      .take(Math.min(args.limit ?? 50, 200));
    return rows.map((e) => ({
      id: e._id,
      type: e.type,
      title: e.title,
      body: e.body,
      at: e._creationTime,
      read: e.readAt !== undefined,
      itemId: e.itemId ?? null,
      conversationId: e.conversationId ?? null,
      wishlistItemId: e.wishlistItemId ?? null,
      communityId: e.communityId ?? null,
    }));
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const rows = await ctx.db
      .query("events")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .order("desc")
      .take(200);
    return rows.filter((e) => e.readAt === undefined).length;
  },
});

/** Marks the given events read, or all of mine if none are given. */
export const markRead = mutation({
  args: { eventIds: v.optional(v.array(v.id("events"))) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const now = Date.now();
    const rows = args.eventIds
      ? await Promise.all(args.eventIds.map((id) => ctx.db.get(id)))
      : await ctx.db
          .query("events")
          .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
          .collect();
    for (const e of rows) {
      if (e && e.recipientId === userId && e.readAt === undefined) await ctx.db.patch(e._id, { readAt: now });
    }
  },
});

const clock = {
  timeZone: v.optional(v.string()),
  utcOffsetMinutes: v.optional(v.number()),
};

function clockPatch(args: { timeZone?: string; utcOffsetMinutes?: number }) {
  const patch: { timeZone?: string; utcOffsetMinutes?: number } = {};
  if (args.timeZone && args.timeZone.length <= 64) patch.timeZone = args.timeZone;
  if (args.utcOffsetMinutes !== undefined && Math.abs(args.utcOffsetMinutes) <= 14 * 60) {
    patch.utcOffsetMinutes = Math.round(args.utcOffsetMinutes);
  }
  return patch;
}

/** The app came to the foreground (at most every few minutes). Resets back-off. */
export const touch = mutation({
  args: clock,
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    await ctx.db.patch(profile._id, { lastOpenedAt: Date.now(), backoffSent: 0, ...clockPatch(args) });
  },
});

/** The person tapped a push. Logged for open rates; also marks it read. */
export const markOpened = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const { userId } = await requireProfile(ctx);
    const e = await ctx.db.get(eventId);
    if (!e || e.recipientId !== userId) return; // not theirs: say nothing
    const now = Date.now();
    await ctx.db.patch(e._id, { openedAt: e.openedAt ?? now, readAt: e.readAt ?? now });
  },
});

/** "Not now" on our own notifications screen (the system dialog is never shown then). */
export const declinePushAsk = mutation({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireProfile(ctx);
    await ctx.db.patch(profile._id, { pushAskCount: (profile.pushAskCount ?? 0) + 1, pushAskedAt: Date.now() });
  },
});

/** Sign-out: this device stops getting this person's pushes. */
export const unregisterPushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { userId } = await requireProfile(ctx);
    const rows = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .collect();
    for (const t of rows) if (t.userId === userId) await ctx.db.delete(t._id);
  },
});

export const registerPushToken = mutation({
  args: { token: v.string(), platform: v.union(v.literal("ios"), v.literal("android")), ...clock },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    if (args.token.length > 200) fail("That isn't a push token");
    await ctx.db.patch(profile._id, { pushAskedAt: Date.now(), ...clockPatch(args) });
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .collect();
    for (const t of existing) await ctx.db.delete(t._id); // a device belongs to whoever signed in last
    await ctx.db.insert("pushTokens", { userId, token: args.token, platform: args.platform, updatedAt: Date.now() });
  },
});
