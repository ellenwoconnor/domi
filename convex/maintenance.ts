import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { expireItem } from "./lib/lifecycle";
import { deleteFiles, itemFiles } from "./lib/photos";
import { DAY_MS, ORPHAN_UPLOAD_MS, PHOTO_RETENTION_MS } from "./lib/validate";

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
      // Only items not yet purged, so purged ones never crowd out the batch.
      const rows = await ctx.db
        .query("items")
        .withIndex("by_status_purged_updatedAt", (q) =>
          q.eq("status", status).eq("photosPurgedAt", undefined).lt("updatedAt", cutoff),
        )
        .take(BATCH);
      for (const item of rows) {
        await deleteFiles(ctx, itemFiles(item));
        await ctx.db.patch(item._id, { photosPurgedAt: Date.now() });
        purged++;
      }
    }
    return purged;
  },
});

/** How far back each daily run looks; more than a day, so a missed run is caught up. */
const ORPHAN_LOOKBACK_MS = 3 * DAY_MS;
/** Clock slack between a file's upload time and the mutation that attached it. */
const CLOCK_SLACK_MS = 60 * 60 * 1000;
const ORPHAN_BATCH = 1000;

/**
 * Deletes uploads that were never attached to a listing (a post abandoned
 * halfway, an app crash, or someone uploading without posting).
 *
 * Looks at files uploaded 1 to 3 days ago. A listing that uses a file was
 * created or edited after the upload, and every write that sets photos also
 * sets `updatedAt`, so only listings updated since then need checking.
 */
export const purgeOrphanUploads = internalMutation({
  args: { now: v.optional(v.number()) }, // tests only; the cron passes nothing
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const newest = now - ORPHAN_UPLOAD_MS;
    const oldest = now - ORPHAN_LOOKBACK_MS;
    const files = await ctx.db.system
      .query("_storage")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", oldest).lt("_creationTime", newest))
      .take(ORPHAN_BATCH);
    if (files.length === 0) return 0;

    const since = files[0]._creationTime - CLOCK_SLACK_MS;
    const inUse = new Set<Id<"_storage">>();
    for (const status of ["available", "pending", "expired", "gone", "removed"] as const) {
      const items = await ctx.db
        .query("items")
        .withIndex("by_status_updatedAt", (q) => q.eq("status", status).gte("updatedAt", since))
        .collect();
      for (const item of items) for (const f of itemFiles(item)) inUse.add(f);
    }
    const orphans = files.filter((f) => !inUse.has(f._id)).map((f) => f._id);
    await deleteFiles(ctx, orphans);
    return orphans.length;
  },
});
