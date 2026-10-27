import { internal } from "./_generated/api";
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { BACKOFF_DAYS, newActivity, processActivity, WELCOME_PUSHES } from "./lib/circleActivity";
import { isQuiet, sameLocalDay } from "./lib/localTime";
import { DAY_MS } from "./lib/validate";

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

/**
 * Diagnostic: why is (or isn't) a circle activity push coming for this person?
 * npx convex run circleActivity:explain '{"name": "Ellen"}'
 */
export const explain = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const now = Date.now();
    const iso = (t?: number) => (t === undefined ? null : new Date(t).toISOString());
    const profiles = (await ctx.db.query("profiles").collect()).filter((p) =>
      p.displayName.toLowerCase().includes(name.toLowerCase()),
    );
    const out = [];
    for (const p of profiles) {
      const tokens = await ctx.db.query("pushTokens").withIndex("by_user", (q) => q.eq("userId", p.userId)).collect();
      const memberships = await ctx.db.query("memberships").withIndex("by_user", (q) => q.eq("userId", p.userId)).collect();
      const circles = [];
      for (const m of memberships) {
        const c = await ctx.db.get(m.communityId);
        circles.push({ circle: c?.name, muted: m.muted, joinedAt: iso(m.joinedAt), welcomePushesLeft: WELCOME_PUSHES - (m.welcomePushesSent ?? 0) });
      }
      const found = await newActivity(ctx, p);
      const blockers: string[] = [];
      if (tokens.length === 0) blockers.push("no push token on file");
      if (p.activityDueAt === undefined) blockers.push("no check scheduled (activityDueAt unset): nothing was posted since, or it was already counted as seen");
      else if (p.activityDueAt > now) blockers.push(`check waits until ${iso(p.activityDueAt)}`);
      if (found.length === 0) blockers.push("no unseen activity: everything was posted before lastOpenedAt / lastActivityPushAt, or is theirs, requested, blocked, or in a muted circle");
      if (isQuiet(now, p)) blockers.push("quiet hours right now (9pm-8am local)");
      if (p.lastActivityPushAt !== undefined && sameLocalDay(p.lastActivityPushAt, now, p)) blockers.push("already had today's circle activity push");
      const inWelcome = memberships.some((m) => !m.muted && (m.welcomePushesSent ?? 0) < WELCOME_PUSHES);
      if (!inWelcome) {
        const step = p.backoffSent ?? 0;
        if (step >= BACKOFF_DAYS.length) blockers.push("back-off finished; nothing until they open the app");
        else {
          const eligible = (p.lastOpenedAt ?? p._creationTime) + BACKOFF_DAYS[step] * DAY_MS;
          if (now < eligible) blockers.push(`welcome pushes used up; back-off push not before ${iso(eligible)} (${BACKOFF_DAYS[step]} days after last open)`);
        }
      }
      out.push({
        name: p.displayName,
        now: iso(now),
        timeZone: p.timeZone ?? null,
        pushTokens: tokens.length,
        lastOpenedAt: iso(p.lastOpenedAt),
        lastActivityPushAt: iso(p.lastActivityPushAt),
        activityDueAt: iso(p.activityDueAt),
        backoffSent: p.backoffSent ?? 0,
        circles,
        unseenActivity: found.map((f) => ({ circle: f.community.name, items: f.items.map((i) => i.title), wishes: f.wishes.map((w) => w.title) })),
        blockers,
      });
    }
    return out;
  },
});
