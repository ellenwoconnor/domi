import { internalMutation } from "./_generated/server";

/**
 * Seeds required rows. Idempotent, so it is safe to run on every
 * `npm run dev:backend` (which calls `convex dev --run init`).
 */
export default internalMutation({
  args: {},
  handler: async (ctx) => {
    const defaults: Record<string, string> = {
      welcome_message: "Hello from Convex 👋",
    };
    for (const [key, value] of Object.entries(defaults)) {
      const existing = await ctx.db
        .query("appConfig")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (!existing) {
        await ctx.db.insert("appConfig", { key, value });
      }
    }
  },
});
