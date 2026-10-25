import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { displayName, fail, isBlockedEitherWay, requireProfile } from "./lib/access";
import { firstThumbUrl } from "./lib/cards";
import { writeEvent } from "./lib/events";
import { cleanText, LIMITS } from "./lib/validate";

// Pickup threads. Only the two participants can read or write, and only
// while the conversation is open. Realtime comes from Convex live queries.

/** Only the two participants, and not once either has blocked the other (block hides messages both ways). */
async function requireParticipant(ctx: QueryCtx, conversationId: Id<"conversations">, userId: Id<"users">) {
  const c = await ctx.db.get(conversationId);
  if (!c || (c.ownerId !== userId && c.recipientId !== userId)) fail("Conversation not found");
  const otherId = c.ownerId === userId ? c.recipientId : c.ownerId;
  if (await isBlockedEitherWay(ctx, userId, otherId)) fail("Conversation not found");
  return c;
}

async function summary(ctx: QueryCtx, c: Doc<"conversations">, userId: Id<"users">) {
  const otherId = c.ownerId === userId ? c.recipientId : c.ownerId;
  const item = await ctx.db.get(c.itemId);
  const last = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
    .order("desc")
    .first();
  const unread = (
    await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
      .collect()
  ).filter((m) => m.senderId !== userId && m.readAt === undefined).length;
  return {
    id: c._id,
    requestId: c.requestId,
    role: c.ownerId === userId ? ("owner" as const) : ("recipient" as const),
    other: { userId: otherId, displayName: await displayName(ctx, otherId) },
    item: item
      ? { id: item._id, title: item.title, status: item.status, photoUrl: await firstThumbUrl(ctx, item) }
      : null,
    closed: c.closedAt !== undefined,
    lastMessage: last ? { body: last.body, senderId: last.senderId, at: last._creationTime } : null,
    unread,
    updatedAt: c.lastMessageAt ?? c._creationTime,
  };
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const convs = [
      ...(await ctx.db
        .query("conversations")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect()),
      ...(await ctx.db
        .query("conversations")
        .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
        .collect()),
    ];
    const out = [];
    for (const c of convs) {
      const otherId = c.ownerId === userId ? c.recipientId : c.ownerId;
      if (await isBlockedEitherWay(ctx, userId, otherId)) continue;
      out.push(await summary(ctx, c, userId));
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const { userId } = await requireProfile(ctx);
    const c = await requireParticipant(ctx, conversationId, userId);
    return await summary(ctx, c, userId);
  },
});

/** The latest messages, oldest first. */
export const messages = query({
  args: { conversationId: v.id("conversations"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    await requireParticipant(ctx, args.conversationId, userId);
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(Math.min(args.limit ?? 200, 500));
    return rows.reverse().map((m) => ({
      id: m._id,
      body: m.body,
      senderId: m.senderId,
      mine: m.senderId === userId,
      at: m._creationTime,
      read: m.readAt !== undefined,
    }));
  },
});

export const send = mutation({
  args: { conversationId: v.id("conversations"), body: v.string() },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    const c = await requireParticipant(ctx, args.conversationId, userId);
    if (c.closedAt !== undefined) fail("This conversation is closed");
    const otherId = c.ownerId === userId ? c.recipientId : c.ownerId;
    if (await isBlockedEitherWay(ctx, userId, otherId)) fail("You can't message this person");
    const body = cleanText(args.body, "Message", LIMITS.message);
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", { conversationId: c._id, senderId: userId, body });
    await ctx.db.patch(c._id, { lastMessageAt: now });
    const item = await ctx.db.get(c.itemId);
    await writeEvent(ctx, {
      recipientId: otherId,
      type: "new_message",
      actorId: userId,
      itemId: c.itemId,
      conversationId: c._id,
      title: profile.displayName,
      body: `New message about the ${item?.title ?? "item"}`,
    });
    return messageId;
  },
});

/** Marks the other person's messages as read. */
export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const { userId } = await requireProfile(ctx);
    await requireParticipant(ctx, conversationId, userId);
    const now = Date.now();
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    for (const m of rows) if (m.senderId !== userId && m.readAt === undefined) await ctx.db.patch(m._id, { readAt: now });
  },
});
