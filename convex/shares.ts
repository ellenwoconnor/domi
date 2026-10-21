import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { displayName, fail, requireOwnItem, requireProfile } from "./lib/access";
import { photoUrls } from "./lib/cards";
import { generateCode, isWellFormedCode, normalizeCode } from "./lib/codes";
import { redeemShareCode } from "./lib/redeem";

// Listing share links for posting outside Domi (e.g. a Buy Nothing group).
// URL: https://<domain>/i/<code>. Owner only. Redeeming lets the person
// see and request that one listing.

async function activeShare(ctx: MutationCtx, itemId: Id<"items">) {
  const rows = await ctx.db
    .query("itemShares")
    .withIndex("by_item", (q) => q.eq("itemId", itemId))
    .collect();
  return rows.find((r) => r.revokedAt === undefined) ?? null;
}

export const getOrCreate = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireOwnItem(ctx, userId, itemId);
    if (item.visibility !== "public") fail("Offers can't be shared");
    if (item.status !== "available" && item.status !== "pending") fail("Only live listings can be shared");
    const existing = await activeShare(ctx, item._id);
    if (existing) return existing.code;
    for (let i = 0; i < 5; i++) {
      const code = generateCode();
      const clash = await ctx.db
        .query("itemShares")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (clash) continue;
      await ctx.db.insert("itemShares", { itemId: item._id, sharerId: userId, code });
      return code;
    }
    fail("Couldn't create a link, try again");
  },
});

/** Stops the link working for new people. Anyone who already redeemed it keeps access. */
export const revoke = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireOwnItem(ctx, userId, itemId);
    const existing = await activeShare(ctx, item._id);
    if (existing) await ctx.db.patch(existing._id, { revokedAt: Date.now() });
  },
});

/** Public (signed-out OK): the read-only listing page. */
export const preview = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = normalizeCode(args.code);
    if (!isWellFormedCode(code)) return null;
    const share = await ctx.db
      .query("itemShares")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!share || share.revokedAt !== undefined) return null;
    const item = await ctx.db.get(share.itemId);
    if (!item || item.visibility !== "public") return null;
    if (item.status !== "available" && item.status !== "pending") return { code, available: false as const };
    const link = await ctx.db
      .query("itemCommunities")
      .withIndex("by_item", (q) => q.eq("itemId", item._id))
      .first();
    const circle = link ? await ctx.db.get(link.communityId) : null;
    return {
      code,
      available: true as const,
      title: item.title,
      description: item.description,
      status: item.status,
      photoUrl: (await photoUrls(ctx, item))[0] ?? null,
      ownerName: await displayName(ctx, item.ownerId),
      circleName: circle ? `${circle.emoji} ${circle.name}` : null,
      postedAt: item._creationTime,
    };
  },
});

/** Signed-in redemption (deep link). At signup, codes go to profiles.completeSignup instead. */
export const redeem = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const { userId } = await requireProfile(ctx);
    return await redeemShareCode(ctx, userId, code);
  },
});
