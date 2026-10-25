import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { processActivity } from "./lib/circleActivity";

const PER_RUN = 50;

/** Cron (every 30 minutes): circle activity that's due. See lib/circleActivity.ts. */
export const processDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("profiles")
      .withIndex("by_activityDueAt", (q) => q.gte("activityDueAt", 0).lte("activityDueAt", now))
      .take(PER_RUN);
    for (const profile of due) await processActivity(ctx, profile, now);
    if (due.length === PER_RUN) await ctx.scheduler.runAfter(0, internal.circleActivity.processDue, {});
  },
});
