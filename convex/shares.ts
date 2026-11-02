import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { displayName, fail, getMembership, requireOwnItem, requireProfile } from "./lib/access";
import { photoUrls } from "./lib/cards";
import { generateCode, isWellFormedCode, normalizeCode } from "./lib/codes";
import { redeemShareCode } from "./lib/redeem";
import { rateLimit } from "./lib/rateLimit";
import { MAX_OPEN_SHARES, SHARE_LINK_MS, shareIsOpen } from "./lib/shares";

// Listing share links (docs/spec.md "Listing share links"). URL: https://<domain>/i/<code>.
// Owner only. Single use: each tap of "Share outside Domi" makes a new link, good for
// one request, even from someone outside the listing's circles. Links close when
// used, after 14 days, or when the listing ends.

/** A new single-use link for one of my live listings. */
export const create = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireOwnItem(ctx, userId, itemId);
    if (item.visibility !== "public") fail("Offers can't be shared");
    if (item.status !== "available" && item.status !== "pending") fail("Only live listings can be shared");
    await rateLimit(ctx, "share", userId);
    const now = Date.now();

    // Keep at most MAX_OPEN_SHARES unused links per listing: revoke the oldest.
    const open = (
      await ctx.db
        .query("itemShares")
        .withIndex("by_item", (q) => q.eq("itemId", item._id))
        .collect()
    ).filter((s) => shareIsOpen(s, now));
    for (const old of open.slice(0, Math.max(0, open.length - MAX_OPEN_SHARES + 1))) {
      await ctx.db.patch(old._id, { revokedAt: now });
    }

    for (let i = 0; i < 5; i++) {
      const code = generateCode();
      const clash = await ctx.db
        .query("itemShares")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (clash) continue;
      await ctx.db.insert("itemShares", { itemId: item._id, sharerId: userId, code, expiresAt: now + SHARE_LINK_MS });
      return code;
    }
    fail("Couldn't create a link, try again");
  },
});

/** Stops every unused link to this listing working. Anyone who already used one keeps their request. */
export const revoke = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireOwnItem(ctx, userId, itemId);
    const now = Date.now();
    const rows = await ctx.db
      .query("itemShares")
      .withIndex("by_item", (q) => q.eq("itemId", item._id))
      .collect();
    for (const r of rows) if (shareIsOpen(r, now)) await ctx.db.patch(r._id, { revokedAt: now });
  },
});

/** The one-time "One link, one person" sheet was shown. */
export const markIntroSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireProfile(ctx);
    if (profile.shareIntroSeenAt === undefined) await ctx.db.patch(profile._id, { shareIntroSeenAt: Date.now() });
  },
});

/**
 * After pickup, on the owner's listing: if the recipient came through a share link
 * and the two share no custom circle, suggest bringing them into one.
 */
export const circleNudge = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireOwnItem(ctx, userId, itemId);
    if (item.status !== "gone") return null;
    const picked = await ctx.db
      .query("requests")
      .withIndex("by_item_status", (q) => q.eq("itemId", item._id).eq("status", "selected"))
      .first();
    if (!picked?.viaShareId) return null;
    const mine = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    let hasCustom = false;
    for (const m of mine) {
      const c = await ctx.db.get(m.communityId);
      if (c?.kind !== "custom") continue;
      hasCustom = true;
      if (await getMembership(ctx, c._id, picked.requesterId)) return null;
    }
    return { name: await displayName(ctx, picked.requesterId), hasCustomCircle: hasCustom };
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
    const ownerName = await displayName(ctx, item.ownerId);
    if (item.status !== "available" && item.status !== "pending") {
      return { code, available: false as const, reason: "gone" as const, ownerName };
    }
    if (share.usedBy !== undefined) return { code, available: false as const, reason: "used" as const, ownerName };
    if (!shareIsOpen(share, Date.now())) return { code, available: false as const, reason: "expired" as const, ownerName };
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
      ownerName,
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
    await rateLimit(ctx, "redeem", userId);
    return await redeemShareCode(ctx, userId, code);
  },
});
