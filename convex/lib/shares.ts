import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

// Single-use listing share links (decided 2026-11-02; docs/spec.md "Listing share links").
// A link lets one person request a listing, even outside its circles. Opening it
// writes a shareGrant (view access); the first request made through it uses it up.

type Ctx = QueryCtx | MutationCtx;

export const SHARE_LINK_MS = 14 * 24 * 60 * 60 * 1000;
/** Unused links per item; making another revokes the oldest. */
export const MAX_OPEN_SHARES = 5;

/** Live and not yet used. Links from before single use (no expiresAt) are closed. */
export function shareIsOpen(share: Doc<"itemShares">, now: number) {
  return (
    share.revokedAt === undefined && share.usedBy === undefined && share.expiresAt !== undefined && share.expiresAt > now
  );
}

/**
 * The share link that gives `userId` access to `itemId`: one they used themselves,
 * or one they opened that nobody has used yet. Null if none.
 */
export async function usableShareFor(ctx: Ctx, userId: Id<"users">, itemId: Id<"items">) {
  const grants = await ctx.db
    .query("shareGrants")
    .withIndex("by_user_item", (q) => q.eq("userId", userId).eq("itemId", itemId))
    .collect();
  const now = Date.now();
  let open: Doc<"itemShares"> | null = null;
  for (const g of grants) {
    const share = await ctx.db.get(g.shareId);
    if (!share) continue;
    if (share.usedBy === userId) return share;
    if (!open && shareIsOpen(share, now)) open = share;
  }
  return open;
}

/** They opened a link for this item, but someone else used it first. */
export async function shareUsedByOther(ctx: Ctx, userId: Id<"users">, itemId: Id<"items">) {
  const grants = await ctx.db
    .query("shareGrants")
    .withIndex("by_user_item", (q) => q.eq("userId", userId).eq("itemId", itemId))
    .collect();
  for (const g of grants) {
    const share = await ctx.db.get(g.shareId);
    if (share?.usedBy !== undefined && share.usedBy !== userId) return true;
  }
  return false;
}
