import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { fail, isBlockedEitherWay, requireProfile } from "./lib/access";
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
    // Count it for every domi the item was shared in. An offer on a wish isn't
    // posted anywhere, so it counts for the wish's domis.
    const links = await ctx.db
      .query("itemCommunities")
      .withIndex("by_item", (q) => q.eq("itemId", item._id))
      .collect();
    const wishLinks =
      links.length === 0 && item.wishlistItemId
        ? await ctx.db
            .query("wishlistCommunities")
            .withIndex("by_wish", (q) => q.eq("wishlistItemId", item.wishlistItemId!))
            .collect()
        : [];
    for (const { communityId } of [...links, ...wishLinks]) {
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
