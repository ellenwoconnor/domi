import { internalMutation } from "./_generated/server";
import { expireItem } from "./lib/lifecycle";
import { PHOTO_RETENTION_MS } from "./lib/validate";

// Scheduled work (see crons.ts). Each run handles a batch; the next run picks up the rest.

const BATCH = 200;

/** available → expired once expiresAt passes. Pending items never expire. */
export const expireDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("items")
      .withIndex("by_status_expiresAt", (q) => q.eq("status", "available").lte("expiresAt", now))
      .take(BATCH);
    for (const item of due) await expireItem(ctx, item, now);
    return due.length;
  },
});

/** Deletes photos of listings that ended more than 30 days ago, which revokes their URLs. */
export const purgeEndedPhotos = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - PHOTO_RETENTION_MS;
    let purged = 0;
    for (const status of ["gone", "removed", "expired"] as const) {
      const rows = await ctx.db
        .query("items")
        .withIndex("by_status_updatedAt", (q) => q.eq("status", status).lt("updatedAt", cutoff))
        .take(BATCH);
      for (const item of rows) {
        if (item.photosPurgedAt !== undefined) continue;
        for (const p of item.photos) {
          if (await ctx.db.system.get(p)) await ctx.storage.delete(p);
        }
        await ctx.db.patch(item._id, { photosPurgedAt: Date.now() });
        purged++;
      }
    }
    return purged;
  },
});
