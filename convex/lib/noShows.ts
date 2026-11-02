import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { fail } from "./access";
import { DAY_MS } from "./validate";

// Missed pickups. When an owner un-picks someone because they didn't show,
// it's logged here. Two missed pickups with two different neighbors within
// 30 days pause new requests for 7 days from the latest one. Nobody else sees
// the count, and it ages out on its own. Two different owners, so one
// unhappy neighbor can't pause someone alone. See docs/spec.md, "Missed pickups".

export const NO_SHOW_LIMIT = 2;
export const NO_SHOW_WINDOW_MS = 30 * DAY_MS;
export const NO_SHOW_PAUSE_MS = 7 * DAY_MS;

export async function recordNoShow(ctx: MutationCtx, request: Doc<"requests">, ownerId: Id<"users">, now: number) {
  await ctx.db.insert("noShows", {
    requesterId: request.requesterId,
    ownerId,
    itemId: request.itemId,
    requestId: request._id,
    at: now,
  });
}

/** When this person can request again, or null if they aren't paused. */
export async function requestsPausedUntil(ctx: QueryCtx | MutationCtx, userId: Id<"users">, now: number) {
  const recent = await ctx.db
    .query("noShows")
    .withIndex("by_requester_at", (q) => q.eq("requesterId", userId).gte("at", now - NO_SHOW_WINDOW_MS))
    .collect();
  if (new Set(recent.map((r) => r.ownerId)).size < NO_SHOW_LIMIT) return null;
  const until = Math.max(...recent.map((r) => r.at)) + NO_SHOW_PAUSE_MS;
  return until > now ? until : null;
}

export async function requireNotPaused(ctx: MutationCtx, userId: Id<"users">, now: number) {
  const until = await requestsPausedUntil(ctx, userId, now);
  if (until === null) return;
  const days = Math.ceil((until - now) / DAY_MS);
  fail(
    `You've missed a couple of pickups lately, so new requests are paused for ${days === 1 ? "1 more day" : `${days} more days`}. Pickups you already have aren't affected.`,
  );
}
