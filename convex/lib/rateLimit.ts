import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { fail } from "./access";

// Per-user limits on actions that cost money or could be used to spam.
// A fixed window per user and action: simple, and good enough to stop abuse.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WAIT = "You're doing that a lot. Please wait a bit and try again.";

export const RATE_LIMITS = {
  // 2 uploads per photo (full + thumbnail), up to 3 photos a listing, plus retries.
  uploadUrl: { max: 60, windowMs: HOUR, message: WAIT },
  // New listings, reposts and offers on wishes. Each one can push to a whole circle.
  post: { max: 20, windowMs: DAY, message: "You've posted a lot today. Please try again tomorrow." },
  // New wishes (each can push to people who might have the thing).
  wish: { max: 20, windowMs: DAY, message: "You've made a lot of wishes today. Please try again tomorrow." },
  // Chat messages; each one sends a push.
  message: { max: 30, windowMs: MINUTE, message: "You're sending messages very fast. Please wait a moment." },
  // Invite and share codes typed or opened while signed in.
  redeem: { max: 10, windowMs: HOUR, message: "Too many codes tried. Please wait a bit and try again." },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

export async function rateLimit(ctx: MutationCtx, name: RateLimitName, userId: Id<"users">) {
  const { max, windowMs, message } = RATE_LIMITS[name];
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
  if (row.count >= max) fail(message);
  await ctx.db.patch(row._id, { count: row.count + 1 });
}
