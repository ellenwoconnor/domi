import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { fail, isBlockedEitherWay, requireProfile } from "./lib/access";
import { writeEvent } from "./lib/events";
import { selectedRequest } from "./lib/lifecycle";
import { cleanText, LIMITS } from "./lib/validate";

// The thank-you poppy (docs/spec.md, "Thank-you poppy"). After a pickup, the
// person who got the item can send the giver one poppy, with an optional note.
// It's private to the two of them and never counted anywhere.

export const send = mutation({
  args: { conversationId: v.id("conversations"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    const c = await ctx.db.get(args.conversationId);
    // Only the person who got the item; the giver gets "not found" like anyone else.
    if (!c || c.recipientId !== userId) fail("Conversation not found");
    if (await isBlockedEitherWay(ctx, userId, c.ownerId)) fail("Conversation not found");
    const item = await ctx.db.get(c.itemId);
    if (!item) fail("Item not found");
    // This chat must be the handoff that happened, not an earlier pick.
    const selected = await selectedRequest(ctx, item._id);
    if (item.status !== "gone" || !selected || selected._id !== c.requestId) {
      fail("You can send a poppy once it's picked up");
    }
    if (item.thankedAt !== undefined) fail("You already sent a poppy");
    const note = cleanText(args.note ?? "", "Note", LIMITS.thankNote, { required: false });
    const now = Date.now();
    await ctx.db.patch(item._id, { thankedAt: now, ...(note ? { thankNote: note } : {}) });
    await writeEvent(ctx, {
      recipientId: c.ownerId,
      type: "thanked",
      actorId: userId,
      itemId: item._id,
      requestId: c.requestId,
      conversationId: c._id,
      title: `${profile.displayName} sent you a poppy`,
      body: note ? `“${note}”` : `A thank-you for the ${item.title}.`,
    });
  },
});
