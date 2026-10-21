import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { displayName, getMembership, isBlockedEitherWay } from "./access";
import { addMembership } from "./circles";
import { isWellFormedCode, normalizeCode } from "./codes";
import { writeEvent } from "./events";

// Redeeming invite and share codes, at signup or later.

export type RedeemResult =
  | { ok: true; communityId?: Id<"communities">; itemId?: Id<"items"> }
  | { ok: false; reason: "invalid" | "revoked" | "banned" | "unavailable" };

export async function redeemInviteCode(ctx: MutationCtx, userId: Id<"users">, rawCode: string): Promise<RedeemResult> {
  const code = normalizeCode(rawCode);
  if (!isWellFormedCode(code)) return { ok: false, reason: "invalid" };
  const invite = await ctx.db
    .query("invites")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique();
  if (!invite) return { ok: false, reason: "invalid" };
  if (invite.revokedAt !== undefined) return { ok: false, reason: "revoked" };
  const community = await ctx.db.get(invite.communityId);
  if (!community || community.kind !== "custom") return { ok: false, reason: "invalid" };

  if (await getMembership(ctx, community._id, userId)) return { ok: true, communityId: community._id };
  const banned = await ctx.db
    .query("communityBans")
    .withIndex("by_community_user", (q) => q.eq("communityId", community._id).eq("userId", userId))
    .first();
  if (banned) return { ok: false, reason: "banned" };

  await addMembership(ctx, community, userId, { invitedBy: invite.inviterId, inviteId: invite._id });
  const who = await displayName(ctx, userId);
  await writeEvent(ctx, {
    recipientId: invite.inviterId,
    type: "joined_via_invite",
    actorId: userId,
    communityId: community._id,
    title: community.name,
    body: `${who} joined ${community.emoji} ${community.name}`,
  });
  return { ok: true, communityId: community._id };
}

export async function redeemShareCode(ctx: MutationCtx, userId: Id<"users">, rawCode: string): Promise<RedeemResult> {
  const code = normalizeCode(rawCode);
  if (!isWellFormedCode(code)) return { ok: false, reason: "invalid" };
  const share = await ctx.db
    .query("itemShares")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique();
  if (!share) return { ok: false, reason: "invalid" };
  if (share.revokedAt !== undefined) return { ok: false, reason: "revoked" };
  const item = await ctx.db.get(share.itemId);
  if (!item || item.visibility !== "public") return { ok: false, reason: "invalid" };
  if (item.status !== "available" && item.status !== "pending") return { ok: false, reason: "unavailable" };
  if (item.ownerId === userId) return { ok: true, itemId: item._id };
  if (await isBlockedEitherWay(ctx, userId, item.ownerId)) return { ok: false, reason: "unavailable" };

  const existing = await ctx.db
    .query("shareGrants")
    .withIndex("by_user_item", (q) => q.eq("userId", userId).eq("itemId", item._id))
    .first();
  if (!existing) await ctx.db.insert("shareGrants", { shareId: share._id, itemId: item._id, userId });
  return { ok: true, itemId: item._id };
}
