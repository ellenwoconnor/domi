import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { displayName, fail, getProfile, requireProfile } from "./lib/access";
import { cleanText, LIMITS } from "./lib/validate";
import { cleanupBetween } from "./lib/lifecycle";
import { reportTarget } from "./schema";

// Block and report. Blocking hides everything both ways and quietly undoes
// requests, offers and threads between the two people. Reports are reviewed
// by hand in the Convex dashboard.

export const block = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    if (args.userId === userId) fail("You can't block yourself");
    if (!(await getProfile(ctx, args.userId))) fail("User not found");
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_blocked", (q) => q.eq("blockerId", userId).eq("blockedId", args.userId))
      .first();
    if (existing) return;
    await ctx.db.insert("blocks", { blockerId: userId, blockedId: args.userId });
    await cleanupBetween(ctx, userId, args.userId, Date.now());
  },
});

export const unblock = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const rows = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_blocked", (q) => q.eq("blockerId", userId).eq("blockedId", args.userId))
      .collect();
    for (const r of rows) await ctx.db.delete(r._id);
  },
});

/** People I've blocked (not people who blocked me). */
export const blocked = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const rows = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_blocked", (q) => q.eq("blockerId", userId))
      .collect();
    return await Promise.all(rows.map(async (r) => ({ userId: r.blockedId, displayName: await displayName(ctx, r.blockedId) })));
  },
});

export const report = mutation({
  args: { targetType: reportTarget, targetId: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const targetId = ctx.db.normalizeId(
      args.targetType === "item"
        ? "items"
        : args.targetType === "user"
          ? "users"
          : args.targetType === "message"
            ? "messages"
            : "wishlistItems",
      args.targetId,
    );
    if (!targetId || !(await ctx.db.get(targetId))) fail("Nothing to report");
    return await ctx.db.insert("reports", {
      reporterId: userId,
      targetType: args.targetType,
      targetId,
      reason: cleanText(args.reason, "Reason", LIMITS.reportReason),
      status: "open",
    });
  },
});
