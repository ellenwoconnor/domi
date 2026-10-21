import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireProfile } from "./lib/access";

// The Activity tab and push tokens. Both read from `events` (see lib/events.ts).

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

export const registerPushToken = mutation({
  args: { token: v.string(), platform: v.union(v.literal("ios"), v.literal("android")) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .collect();
    for (const t of existing) await ctx.db.delete(t._id); // a device belongs to whoever signed in last
    await ctx.db.insert("pushTokens", { userId, token: args.token, platform: args.platform, updatedAt: Date.now() });
  },
});
