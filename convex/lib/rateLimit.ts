import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { fail } from "./access";

// Per-user limits on actions that cost money or could be used to spam.
// A fixed window per user and action: simple, and good enough to stop abuse.

export const RATE_LIMITS = {
  // 2 uploads per photo (full + thumbnail), up to 3 photos a listing, plus retries.
  uploadUrl: { max: 60, windowMs: 60 * 60 * 1000 },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

export async function rateLimit(ctx: MutationCtx, name: RateLimitName, userId: Id<"users">) {
  const { max, windowMs } = RATE_LIMITS[name];
  const key = `${name}:${userId}`;
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!row) {
    await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    return;
  }
  if (now - row.windowStart >= windowMs) {
    await ctx.db.patch(row._id, { windowStart: now, count: 1 });
    return;
  }
  if (row.count >= max) fail("You're doing that a lot. Please wait a bit and try again.");
  await ctx.db.patch(row._id, { count: row.count + 1 });
}
