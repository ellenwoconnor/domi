import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { canSeeItem, fail, getMembership } from "./access";
import { closeWish, removeItem, withdrawRequest } from "./lifecycle";

// Membership changes. "Leaving a circle" in docs/spec.md is leaveCommunity;
// leave, remove member, delete circle, zip change and account deletion all use it.

export async function addMembership(
  ctx: MutationCtx,
  community: Doc<"communities">,
  userId: Id<"users">,
  fields: { role?: "owner" | "member"; invitedBy?: Id<"users">; inviteId?: Id<"invites"> } = {},
) {
  const existing = await getMembership(ctx, community._id, userId);
  if (existing) return existing._id;
  const id = await ctx.db.insert("memberships", {
    communityId: community._id,
    userId,
    role: fields.role ?? "member",
    invitedBy: fields.invitedBy,
    inviteId: fields.inviteId,
    muted: false,
    joinedAt: Date.now(),
  });
  await ctx.db.patch(community._id, { memberCount: community.memberCount + 1 });
  return id;
}

/** Most invite-only circles one person can be in (the home zip circle doesn't count). Bounds the feed's cost. */
export const MAX_CIRCLES = 10;
export const TOO_MANY_CIRCLES = `You're in ${MAX_CIRCLES} circles, the most for now. Leave one to join or start another.`;

export async function customCircleCount(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  let count = 0;
  for (const m of memberships) {
    if ((await ctx.db.get(m.communityId))?.kind === "custom") count++;
  }
  return count;
}

export async function lookupZip(ctx: QueryCtx | MutationCtx, zip: string) {
  return await ctx.db
    .query("zipCodes")
    .withIndex("by_zip", (q) => q.eq("zip", zip))
    .unique();
}

export async function findOrCreateZipCircle(ctx: MutationCtx, zip: string): Promise<Doc<"communities">> {
  const existing = await ctx.db
    .query("communities")
    .withIndex("by_kind_zip", (q) => q.eq("kind", "zip").eq("zip", zip))
    .unique();
  if (existing) return existing;
  const ref = await lookupZip(ctx, zip);
  if (!ref) fail("We don't recognize that zip code");
  const id = await ctx.db.insert("communities", {
    name: `${ref.city} · ${zip}`,
    emoji: "📍",
    kind: "zip",
    zip,
    memberCount: 0,
  });
  return (await ctx.db.get(id))!;
}

async function itemCircleCount(ctx: QueryCtx | MutationCtx, itemId: Id<"items">) {
  return (
    await ctx.db
      .query("itemCommunities")
      .withIndex("by_item", (q) => q.eq("itemId", itemId))
      .collect()
  ).length;
}

async function wishCircleCount(ctx: QueryCtx | MutationCtx, wishId: Id<"wishlistItems">) {
  return (
    await ctx.db
      .query("wishlistCommunities")
      .withIndex("by_wish", (q) => q.eq("wishlistItemId", wishId))
      .collect()
  ).length;
}

/** What leaving `communityId` would cancel. Used for the zip-change confirmation. */
export async function previewLeave(ctx: QueryCtx, userId: Id<"users">, communityId: Id<"communities">) {
  let listings = 0;
  let requests = 0;
  let wishes = 0;

  const items = await ctx.db
    .query("items")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();
  for (const item of items) {
    if (item.status !== "available" && item.status !== "pending") continue;
    const link = await ctx.db
      .query("itemCommunities")
      .withIndex("by_item_community", (q) => q.eq("itemId", item._id).eq("communityId", communityId))
      .unique();
    if (link && (await itemCircleCount(ctx, item._id)) === 1) listings++;
  }

  for (const status of ["open", "selected"] as const) {
    const reqs = await ctx.db
      .query("requests")
      .withIndex("by_requester_status", (q) => q.eq("requesterId", userId).eq("status", status))
      .collect();
    for (const r of reqs) {
      const item = await ctx.db.get(r.itemId);
      if (item && !(await canSeeItem(ctx, userId, item, { excludeCommunityId: communityId }))) requests++;
    }
  }

  const myWishes = await ctx.db
    .query("wishlistItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const wish of myWishes) {
    if (wish.status !== "open") continue;
    const link = await ctx.db
      .query("wishlistCommunities")
      .withIndex("by_wish_community", (q) => q.eq("wishlistItemId", wish._id).eq("communityId", communityId))
      .unique();
    if (link && (await wishCircleCount(ctx, wish._id)) === 1) wishes++;
  }

  return { listings, requests, wishes };
}

/**
 * Takes `userId` out of `communityId` and cleans up what only lived there.
 * With `deletingCircle`, ownership isn't handed on (the circle is going away).
 */
export async function leaveCommunity(
  ctx: MutationCtx,
  userId: Id<"users">,
  communityId: Id<"communities">,
  { deletingCircle = false } = {},
) {
  const now = Date.now();
  const membership = await getMembership(ctx, communityId, userId);
  if (!membership) return;
  const community = await ctx.db.get(communityId);

  // 1. Membership.
  await ctx.db.delete(membership._id);
  if (community) await ctx.db.patch(community._id, { memberCount: Math.max(0, community.memberCount - 1) });

  // 2. Their items posted there.
  const items = await ctx.db
    .query("items")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();
  for (const item of items) {
    const link = await ctx.db
      .query("itemCommunities")
      .withIndex("by_item_community", (q) => q.eq("itemId", item._id).eq("communityId", communityId))
      .unique();
    if (!link) continue;
    await ctx.db.delete(link._id);
    if ((await itemCircleCount(ctx, item._id)) === 0) await removeItem(ctx, item, now);
  }

  // 3. Their requests on items they can no longer see.
  for (const status of ["open", "selected"] as const) {
    const reqs = await ctx.db
      .query("requests")
      .withIndex("by_requester_status", (q) => q.eq("requesterId", userId).eq("status", status))
      .collect();
    for (const r of reqs) {
      const item = await ctx.db.get(r.itemId);
      if (item && !(await canSeeItem(ctx, userId, item))) await withdrawRequest(ctx, r, now);
    }
  }

  // 4. Their wishes posted there.
  const wishes = await ctx.db
    .query("wishlistItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const wish of wishes) {
    const link = await ctx.db
      .query("wishlistCommunities")
      .withIndex("by_wish_community", (q) => q.eq("wishlistItemId", wish._id).eq("communityId", communityId))
      .unique();
    if (!link) continue;
    await ctx.db.delete(link._id);
    if (wish.status === "open" && (await wishCircleCount(ctx, wish._id)) === 0) {
      await closeWish(ctx, wish, "removed", now);
    }
  }

  // Their invite links to this circle stop working.
  const invites = await ctx.db
    .query("invites")
    .withIndex("by_community_inviter", (q) => q.eq("communityId", communityId).eq("inviterId", userId))
    .collect();
  for (const inv of invites) if (inv.revokedAt === undefined) await ctx.db.patch(inv._id, { revokedAt: now });

  // Hand ownership on, or delete an empty custom circle.
  if (!community || community.kind !== "custom" || deletingCircle) return;
  const next = await ctx.db
    .query("memberships")
    .withIndex("by_community_joinedAt", (q) => q.eq("communityId", communityId))
    .first();
  if (!next) {
    await deleteCircleRows(ctx, communityId);
  } else if (membership.role === "owner") {
    await ctx.db.patch(next._id, { role: "owner" });
  }
}

/** Deletes a circle's own rows. Members must already have left. */
export async function deleteCircleRows(ctx: MutationCtx, communityId: Id<"communities">) {
  for (const table of ["invites", "communityBans"] as const) {
    const rows =
      table === "invites"
        ? await ctx.db
            .query("invites")
            .withIndex("by_community_inviter", (q) => q.eq("communityId", communityId))
            .collect()
        : await ctx.db
            .query("communityBans")
            .withIndex("by_community_user", (q) => q.eq("communityId", communityId))
            .collect();
    for (const row of rows) await ctx.db.delete(row._id);
  }
  // Defensive: nothing should be posted here once everyone has left.
  for (const link of await ctx.db
    .query("itemCommunities")
    .withIndex("by_community", (q) => q.eq("communityId", communityId))
    .collect())
    await ctx.db.delete(link._id);
  for (const link of await ctx.db
    .query("wishlistCommunities")
    .withIndex("by_community", (q) => q.eq("communityId", communityId))
    .collect())
    await ctx.db.delete(link._id);
  await ctx.db.delete(communityId);
}
