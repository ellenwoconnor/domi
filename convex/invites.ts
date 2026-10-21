import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { displayName, fail, requireMember, requireProfile } from "./lib/access";
import { generateCode, isWellFormedCode, normalizeCode } from "./lib/codes";
import { redeemInviteCode } from "./lib/redeem";

// Invite links: one per member per custom circle. URL: https://<domain>/c/<code>

async function activeInvite(ctx: QueryCtx | MutationCtx, communityId: Id<"communities">, userId: Id<"users">) {
  const rows = await ctx.db
    .query("invites")
    .withIndex("by_community_inviter", (q) => q.eq("communityId", communityId).eq("inviterId", userId))
    .collect();
  return rows.find((r) => r.revokedAt === undefined) ?? null;
}

async function uniqueInviteCode(ctx: MutationCtx) {
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const clash = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!clash) return code;
  }
  fail("Couldn't create a code, try again");
}

async function requireCustomMember(ctx: QueryCtx | MutationCtx, communityId: Id<"communities">, userId: Id<"users">) {
  await requireMember(ctx, communityId, userId);
  const c = await ctx.db.get(communityId);
  if (!c || c.kind !== "custom") fail("Zip circles don't have invite links");
  return c;
}

/** My current invite code for a circle, or null if I haven't made one. */
export const mine = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, { communityId }) => {
    const { userId } = await requireProfile(ctx);
    await requireCustomMember(ctx, communityId, userId);
    return (await activeInvite(ctx, communityId, userId))?.code ?? null;
  },
});

export const getOrCreate = mutation({
  args: { communityId: v.id("communities") },
  handler: async (ctx, { communityId }) => {
    const { userId } = await requireProfile(ctx);
    await requireCustomMember(ctx, communityId, userId);
    const existing = await activeInvite(ctx, communityId, userId);
    if (existing) return existing.code;
    const code = await uniqueInviteCode(ctx);
    await ctx.db.insert("invites", { code, communityId, inviterId: userId });
    return code;
  },
});

/** Revokes my current link and makes a new one. */
export const regenerate = mutation({
  args: { communityId: v.id("communities") },
  handler: async (ctx, { communityId }) => {
    const { userId } = await requireProfile(ctx);
    await requireCustomMember(ctx, communityId, userId);
    const existing = await activeInvite(ctx, communityId, userId);
    if (existing) await ctx.db.patch(existing._id, { revokedAt: Date.now() });
    const code = await uniqueInviteCode(ctx);
    await ctx.db.insert("invites", { code, communityId, inviterId: userId });
    return code;
  },
});

/** Public (signed-out OK): what the landing page and the "enter code" screen show. */
export const preview = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = normalizeCode(args.code);
    if (!isWellFormedCode(code)) return null;
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!invite || invite.revokedAt !== undefined) return null;
    const c = await ctx.db.get(invite.communityId);
    if (!c || c.kind !== "custom") return null;
    return {
      code,
      name: c.name,
      emoji: c.emoji,
      description: c.description ?? null,
      memberCount: c.memberCount,
      invitedBy: await displayName(ctx, invite.inviterId),
    };
  },
});

/** Signed-in redemption (deep link or "Have an invite code?"). */
export const redeem = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const { userId } = await requireProfile(ctx);
    return await redeemInviteCode(ctx, userId, code);
  },
});
