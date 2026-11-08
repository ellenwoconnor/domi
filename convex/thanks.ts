import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import { blockedUserIds, displayName, fail, isBlockedEitherWay, requireProfile } from "./lib/access";
import { firstThumbUrl } from "./lib/cards";
import { writeEvent } from "./lib/events";
import { selectedRequest } from "./lib/lifecycle";
import { cleanText, LIMITS } from "./lib/validate";

// The domi flower (docs/spec.md, "Domi flower"): the thank-you the person who
// got an item can send the giver, once per handoff, with an optional note.
// Sendable from pickup time on: while the item is still pending ("I just
// picked it up") or after the giver marks it picked up. Private to the two of
// them and never counted anywhere.

export const send = mutation({
  args: { conversationId: v.id("conversations"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    const c = await ctx.db.get(args.conversationId);
    // Only the person who got the item; the giver gets "not found" like anyone else.
    if (!c || c.recipientId !== userId) fail("Conversation not found");
    if (await isBlockedEitherWay(ctx, userId, c.ownerId)) fail("Conversation not found");
    if (c.closedAt !== undefined) fail("This conversation is closed");
    const item = await ctx.db.get(c.itemId);
    if (!item) fail("Item not found");
    // This chat must be the current handoff (an un-pick closes the chat anyway).
    const selected = await selectedRequest(ctx, item._id);
    if ((item.status !== "pending" && item.status !== "gone") || !selected || selected._id !== c.requestId) {
      fail("This isn't yours to thank for");
    }
    if (c.thankedAt !== undefined) fail("You already sent a domi flower");
    const note = cleanText(args.note ?? "", "Note", LIMITS.thankNote, {
      required: false,
    });
    await ctx.db.patch(c._id, {
      thankedAt: Date.now(),
      ...(note ? { thankNote: note } : {}),
    });
    // Count it once in each domi where the item was listed and both people are members.
    for (const communityId of await flowerDomis(ctx, item, c.ownerId, c.recipientId)) {
      const community = await ctx.db.get(communityId);
      if (community) await ctx.db.patch(communityId, { flowerCount: (community.flowerCount ?? 0) + 1 });
    }
    await writeEvent(ctx, {
      recipientId: c.ownerId,
      type: "thanked",
      actorId: userId,
      itemId: item._id,
      requestId: c.requestId,
      conversationId: c._id,
      title: `${profile.displayName} sent you a domi flower`,
      body: note ? `“${note}”` : `A thank-you for the ${item.title}.`,
    });
  },
});

/**
 * You › Thank-yous: the domi flowers you've been sent as a giver, newest first,
 * each with its note. Private to you; no count is shown anywhere. People
 * blocked either way are left out.
 */
export const received = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const blocked = await blockedUserIds(ctx, userId);
    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();
    const out = [];
    for (const c of convs) {
      if (c.thankedAt === undefined || blocked.has(c.recipientId)) continue;
      const item = await ctx.db.get(c.itemId);
      out.push({
        conversationId: c._id,
        at: c.thankedAt,
        note: c.thankNote ?? null,
        from: await displayName(ctx, c.recipientId),
        thing: item?.title ?? null,
        photoUrl: item ? await firstThumbUrl(ctx, item) : null,
      });
    }
    return out.sort((a, b) => b.at - a.at);
  },
});

/**
 * The domis a domi flower counts for: where the item was listed (an offer on a
 * wish isn't listed anywhere, so the wish's domis) and both the giver and the
 * person who got it are members. Can be none, e.g. a handoff through a share link.
 */
async function flowerDomis(
  ctx: QueryCtx,
  item: Doc<"items">,
  ownerId: Id<"users">,
  recipientId: Id<"users">,
): Promise<Id<"communities">[]> {
  let listed = (
    await ctx.db
      .query("itemCommunities")
      .withIndex("by_item", (q) => q.eq("itemId", item._id))
      .collect()
  ).map((l) => l.communityId);
  if (listed.length === 0 && item.wishlistItemId) {
    listed = (
      await ctx.db
        .query("wishlistCommunities")
        .withIndex("by_wish", (q) => q.eq("wishlistItemId", item.wishlistItemId!))
        .collect()
    ).map((l) => l.communityId);
  }
  const both: Id<"communities">[] = [];
  for (const communityId of new Set(listed)) {
    const isMember = async (userId: Id<"users">) =>
      (await ctx.db
        .query("memberships")
        .withIndex("by_community_user", (q) => q.eq("communityId", communityId).eq("userId", userId))
        .first()) !== null;
    if ((await isMember(ownerId)) && (await isMember(recipientId))) both.push(communityId);
  }
  return both;
}

/**
 * Recounts every domi's flowerCount from the flowers sent so far, under the
 * rule above (with today's memberships). One-off, after changing the rule:
 *   npx convex run --prod thanks:recountFlowers
 */
export const recountFlowers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const counts = new Map<Id<"communities">, number>();
    for (const c of await ctx.db.query("conversations").collect()) {
      if (c.thankedAt === undefined) continue;
      const item = await ctx.db.get(c.itemId);
      if (!item) continue;
      for (const id of await flowerDomis(ctx, item, c.ownerId, c.recipientId)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    let changed = 0;
    for (const community of await ctx.db.query("communities").collect()) {
      const n = counts.get(community._id) ?? 0;
      if ((community.flowerCount ?? 0) !== n) {
        await ctx.db.patch(community._id, { flowerCount: n });
        changed++;
      }
    }
    return { flowers: [...counts.values()].reduce((a, b) => a + b, 0), domisChanged: changed };
  },
});
