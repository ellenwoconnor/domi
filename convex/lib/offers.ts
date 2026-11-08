import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;
import { displayName } from "./access";

// How an offer (a private listing for a wish) reads to the person who made it,
// once the wisher has moved on. Shared by My stuff and the item screen, so the
// two always say the same thing. Copy is deliberately gentle: being declined
// and not being needed read the same unless the wisher wrote a note.

export type OfferEnding = {
  who: string; // the wisher
  note: string | null; // their "no thanks" note, if they wrote one
  line: string; // the status line
  canShareAgain: boolean; // photos still there, so "Share with others" can post it publicly
};

/** An ended offer worth a word: declined, or the wish came true with another offer. Null otherwise. */
export async function offerEnding(ctx: Ctx, item: Doc<"items">): Promise<OfferEnding | null> {
  if (item.status !== "removed" || item.visibility !== "private" || !item.wishlistItemId) return null;
  if (item.sharedAgainAt !== undefined) return null;
  const wish = await ctx.db.get(item.wishlistItemId);
  if (!wish) return null;
  const declined = item.declinedAt !== undefined;
  if (!declined && wish.status !== "fulfilled") return null;
  const who = await displayName(ctx, wish.userId);
  const note = declined ? (item.declineNote ?? null) : null;
  return {
    who,
    note,
    line: note ? `${who}: “${note}”` : `${who}'s all set. Thanks for offering!`,
    canShareAgain: item.photosPurgedAt === undefined,
  };
}

/** An offer still waiting while the wisher arranges pickup of a different one. */
export async function offerOnHold(ctx: Ctx, item: Doc<"items">): Promise<boolean> {
  if (item.status !== "available" || item.visibility !== "private" || !item.wishlistItemId) return false;
  const wishId = item.wishlistItemId;
  const offers = await ctx.db
    .query("items")
    .withIndex("by_wishlistItem", (q) => q.eq("wishlistItemId", wishId))
    .collect();
  return offers.some((o) => o._id !== item._id && o.status === "pending");
}
