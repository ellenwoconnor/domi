import { internalMutation } from "./_generated/server";

// A few real zip codes so signup works on a fresh dev deployment before the
// full table is imported (scripts/import-zips.mjs). Inserted only if missing.
const DEV_ZIPS = [
  { zip: "94610", city: "Oakland", state: "CA", lat: 37.812, lng: -122.243 },
  { zip: "94611", city: "Oakland", state: "CA", lat: 37.833, lng: -122.214 },
  { zip: "94705", city: "Berkeley", state: "CA", lat: 37.864, lng: -122.243 },
  { zip: "94707", city: "Berkeley", state: "CA", lat: 37.893, lng: -122.276 },
  { zip: "94110", city: "San Francisco", state: "CA", lat: 37.749, lng: -122.415 },
];

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
    // Owned by the code: set on every run, so bumping it here updates the deployment.
    const pinned: Record<string, string> = {
      // The effective date of the terms in web/src/legal.js. Bump when the terms
      // change; signup requires the app to send this exact value.
      terms_version: "2026-10-25",
    };
    for (const [key, value] of Object.entries({ ...defaults, ...pinned })) {
      const existing = await ctx.db
        .query("appConfig")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (!existing) {
        await ctx.db.insert("appConfig", { key, value });
      } else if (key in pinned && existing.value !== value) {
        await ctx.db.patch(existing._id, { value });
      }
    }
    for (const z of DEV_ZIPS) {
      const existing = await ctx.db
        .query("zipCodes")
        .withIndex("by_zip", (q) => q.eq("zip", z.zip))
        .unique();
      if (!existing) await ctx.db.insert("zipCodes", z);
    }
  },
});
