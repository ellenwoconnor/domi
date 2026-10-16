import { v } from "convex/values";
import { query } from "./_generated/server";

/** Public read of one app setting. Safe for signed-out users. */
export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
  },
});
