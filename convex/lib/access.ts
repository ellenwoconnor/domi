import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

// Access checks that replace row-level security. Every public function calls
// one of the require* helpers first. See "Access rules" in docs/spec.md.

type Ctx = QueryCtx | MutationCtx;

export function fail(message: string): never {
  throw new ConvexError(message);
}

export async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) fail("Not signed in");
  return userId;
}

export async function getProfile(ctx: Ctx, userId: Id<"users">) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

/** The caller and their profile. Throws if signed out, not onboarded, or banned. */
export async function requireProfile(ctx: Ctx): Promise<{ userId: Id<"users">; profile: Doc<"profiles"> }> {
  const userId = await requireUserId(ctx);
  const profile = await getProfile(ctx, userId);
  if (!profile) fail("Finish signing up first");
  if (profile.bannedAt !== undefined) fail("This account is suspended");
  return { userId, profile };
}

/** Like requireProfile, but returns null instead of throwing when signed out or not onboarded. */
export async function viewer(ctx: Ctx): Promise<{ userId: Id<"users">; profile: Doc<"profiles"> } | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  const profile = await getProfile(ctx, userId);
  if (!profile || profile.bannedAt !== undefined) return null;
  return { userId, profile };
}

export async function getMembership(ctx: Ctx, communityId: Id<"communities">, userId: Id<"users">) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_community_user", (q) => q.eq("communityId", communityId).eq("userId", userId))
    .unique();
}

export async function requireMember(ctx: Ctx, communityId: Id<"communities">, userId: Id<"users">) {
  const membership = await getMembership(ctx, communityId, userId);
  if (!membership) fail("You're not in this circle");
  return membership;
}

export async function requireCircleOwner(ctx: Ctx, communityId: Id<"communities">, userId: Id<"users">) {
  const membership = await requireMember(ctx, communityId, userId);
  if (membership.role !== "owner") fail("Only the circle's owner can do that");
  const community = await ctx.db.get(communityId);
  if (!community) fail("Circle not found");
  return { membership, community };
}

export async function myCommunityIds(ctx: Ctx, userId: Id<"users">): Promise<Id<"communities">[]> {
  const rows = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return rows.map((m) => m.communityId);
}

export async function isBlockedEitherWay(ctx: Ctx, a: Id<"users">, b: Id<"users">) {
  if (a === b) return false;
  const ab = await ctx.db
    .query("blocks")
    .withIndex("by_blocker_blocked", (q) => q.eq("blockerId", a).eq("blockedId", b))
    .first();
  if (ab) return true;
  const ba = await ctx.db
    .query("blocks")
    .withIndex("by_blocker_blocked", (q) => q.eq("blockerId", b).eq("blockedId", a))
    .first();
  return ba !== null;
}

/** Everyone the user has blocked or been blocked by. */
export async function blockedUserIds(ctx: Ctx, userId: Id<"users">): Promise<Set<Id<"users">>> {
  const mine = await ctx.db
    .query("blocks")
    .withIndex("by_blocker_blocked", (q) => q.eq("blockerId", userId))
    .collect();
  const theirs = await ctx.db
    .query("blocks")
    .withIndex("by_blocked", (q) => q.eq("blockedId", userId))
    .collect();
  return new Set([...mine.map((b) => b.blockedId), ...theirs.map((b) => b.blockerId)]);
}

async function hasRequestOn(ctx: Ctx, userId: Id<"users">, itemId: Id<"items">) {
  const r = await ctx.db
    .query("requests")
    .withIndex("by_item_requester", (q) => q.eq("itemId", itemId).eq("requesterId", userId))
    .first();
  return r !== null;
}

/**
 * Whether `userId` may see `item`. `excludeCommunityId` answers "could they
 * still see it without this circle?" (used by leave / zip-change previews).
 */
export async function canSeeItem(
  ctx: Ctx,
  userId: Id<"users">,
  item: Doc<"items">,
  opts: { excludeCommunityId?: Id<"communities"> } = {},
): Promise<boolean> {
  if (item.ownerId === userId) return true;
  if (await isBlockedEitherWay(ctx, userId, item.ownerId)) return false;

  if (item.visibility === "private") {
    if (!item.wishlistItemId) return false;
    const wish = await ctx.db.get(item.wishlistItemId);
    return wish?.userId === userId;
  }

  if (item.status === "removed") return await hasRequestOn(ctx, userId, item._id);

  const links = await ctx.db
    .query("itemCommunities")
    .withIndex("by_item", (q) => q.eq("itemId", item._id))
    .collect();
  for (const link of links) {
    if (link.communityId === opts.excludeCommunityId) continue;
    if (await getMembership(ctx, link.communityId, userId)) return true;
  }

  const grant = await ctx.db
    .query("shareGrants")
    .withIndex("by_user_item", (q) => q.eq("userId", userId).eq("itemId", item._id))
    .first();
  return grant !== null;
}

export async function requireVisibleItem(ctx: Ctx, userId: Id<"users">, itemId: Id<"items">) {
  const item = await ctx.db.get(itemId);
  if (!item || !(await canSeeItem(ctx, userId, item))) fail("Item not found");
  return item;
}

export async function requireOwnItem(ctx: Ctx, userId: Id<"users">, itemId: Id<"items">) {
  const item = await ctx.db.get(itemId);
  if (!item || item.ownerId !== userId) fail("Item not found");
  return item;
}

/** Whether `userId` may see a wish (posted to one of their circles, or their own). */
export async function canSeeWish(
  ctx: Ctx,
  userId: Id<"users">,
  wish: Doc<"wishlistItems">,
): Promise<boolean> {
  if (wish.userId === userId) return true;
  if (wish.status === "removed") return false;
  if (await isBlockedEitherWay(ctx, userId, wish.userId)) return false;
  const links = await ctx.db
    .query("wishlistCommunities")
    .withIndex("by_wish", (q) => q.eq("wishlistItemId", wish._id))
    .collect();
  for (const link of links) {
    if (await getMembership(ctx, link.communityId, userId)) return true;
  }
  return false;
}

export async function displayName(ctx: Ctx, userId: Id<"users"> | undefined): Promise<string> {
  if (!userId) return "Someone";
  const profile = await getProfile(ctx, userId);
  return profile?.displayName ?? "Someone";
}
