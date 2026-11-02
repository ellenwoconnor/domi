import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { displayName, getProfile } from "./lib/access";
import { closeWish, removeItem, withdrawRequest } from "./lib/lifecycle";

// Reports, without the dashboard. Every new report emails the developer
// (safety.report schedules sendReportAlert), and the email lists the commands
// to act on it:
//   npx convex run --prod moderation:removeContent '{"reportId":"…"}'
//   npx convex run --prod moderation:suspendAuthor '{"reportId":"…"}'
//   npx convex run --prod moderation:dismiss '{"reportId":"…"}'
//
// Email goes through the website Worker (web/src/alerts.js), which sends it
// with Cloudflare Email Routing. Convex env: REPORT_ALERT_URL
// (https://domicircles.com/internal/report-alert) and REPORT_ALERT_SECRET (the
// same value as the Worker secret). Without them the alert is only logged.

type Ctx = QueryCtx | MutationCtx;

async function loadTarget(ctx: Ctx, report: Doc<"reports">) {
  const id = report.targetId;
  switch (report.targetType) {
    case "item": {
      const item = await ctx.db.get(id as Id<"items">);
      return item && { kind: "item" as const, doc: item, authorId: item.ownerId };
    }
    case "wishlist_item": {
      const wish = await ctx.db.get(id as Id<"wishlistItems">);
      return wish && { kind: "wish" as const, doc: wish, authorId: wish.userId };
    }
    case "message": {
      const message = await ctx.db.get(id as Id<"messages">);
      return message && { kind: "message" as const, doc: message, authorId: message.senderId };
    }
    case "user": {
      const userId = id as Id<"users">;
      return (await ctx.db.get(userId)) ? { kind: "user" as const, doc: null, authorId: userId } : null;
    }
  }
}

async function requireReport(ctx: Ctx, reportId: Id<"reports">) {
  const report = await ctx.db.get(reportId);
  if (!report) throw new Error("No such report");
  return report;
}

const clip = (s: string, n = 300) => (s.length > n ? `${s.slice(0, n)}…` : s);

export const reportDetails = internalQuery({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const report = await requireReport(ctx, reportId);
    const target = await loadTarget(ctx, report);
    const reporter = await displayName(ctx, report.reporterId);
    const author = target ? await displayName(ctx, target.authorId) : "unknown";
    let what = "It's already gone.";
    if (target?.kind === "item") {
      what = `Listing "${target.doc.title}" by ${author} (${target.doc.status})\n${clip(target.doc.description ?? "")}`;
    } else if (target?.kind === "wish") {
      what = `Wish "${target.doc.title}" by ${author} (${target.doc.status})\n${clip(target.doc.description ?? "")}`;
    } else if (target?.kind === "message") {
      what = `Chat message from ${author}:\n${clip(target.doc.body)}`;
    } else if (target?.kind === "user") {
      what = `The person ${author}`;
    }
    const label = { item: "listing", wishlist_item: "wish", message: "message", user: "person" }[report.targetType];
    const cmd = (fn: string) => `npx convex run --prod moderation:${fn} '{"reportId":"${reportId}"}'`;
    return {
      subject: `Domi report: ${label} (${report.reason.split(":")[0]})`,
      text: [
        `${reporter} reported a ${label}.`,
        "",
        `Reason: ${report.reason}`,
        "",
        what,
        "",
        "The Terms promise a review within 24 hours. From the domi folder, run one of:",
        "",
        "Take it down:",
        cmd("removeContent"),
        "",
        `Suspend ${author} and take down everything they have up:`,
        cmd("suspendAuthor"),
        "",
        "Nothing wrong:",
        cmd("dismiss"),
        "",
        `Report ${reportId}`,
      ].join("\n"),
    };
  },
});

export const sendReportAlert = internalAction({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const { subject, text } = await ctx.runQuery(internal.moderation.reportDetails, { reportId });
    const url = process.env.REPORT_ALERT_URL;
    const secret = process.env.REPORT_ALERT_SECRET;
    if (!url || !secret) {
      console.warn(`REPORT_ALERT_URL/SECRET not set; report alert not emailed.\n${subject}\n${text}`);
      return;
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify({ subject, text }),
    });
    if (!res.ok) throw new Error(`Report alert failed: ${res.status} ${await res.text()}`);
  },
});

/** Takes down what was reported: removes a listing or wish, deletes a message. For a person, suspends them. */
export const removeContent = internalMutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const report = await requireReport(ctx, reportId);
    const target = await loadTarget(ctx, report);
    const now = Date.now();
    if (target?.kind === "item") await removeItem(ctx, target.doc, now);
    else if (target?.kind === "wish" && target.doc.status === "open") await closeWish(ctx, target.doc, "removed", now);
    else if (target?.kind === "message") await ctx.db.delete(target.doc._id);
    else if (target?.kind === "user") await suspend(ctx, target.authorId, now);
    await ctx.db.patch(reportId, { status: "reviewed" });
    return target ? `Done: ${target.kind} handled` : "Already gone; report closed";
  },
});

/** Suspends whoever posted the reported thing (or the reported person), taking their live listings and wishes down. */
export const suspendAuthor = internalMutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const report = await requireReport(ctx, reportId);
    const target = await loadTarget(ctx, report);
    if (!target) throw new Error("The reported thing is gone, so its author is unknown");
    await suspend(ctx, target.authorId, Date.now());
    await ctx.db.patch(reportId, { status: "reviewed" });
    return `Suspended ${await displayName(ctx, target.authorId)}`;
  },
});

export const dismiss = internalMutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    await requireReport(ctx, reportId);
    await ctx.db.patch(reportId, { status: "dismissed" });
    return "Dismissed";
  },
});

/** bannedAt locks them out (lib/access.ts); their live listings, wishes and requests are taken down. */
async function suspend(ctx: MutationCtx, userId: Id<"users">, now: number) {
  const profile = await getProfile(ctx, userId);
  if (!profile) return;
  if (profile.bannedAt === undefined) await ctx.db.patch(profile._id, { bannedAt: now });
  const items = await ctx.db
    .query("items")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();
  for (const item of items) {
    if (item.status === "available" || item.status === "pending" || item.status === "expired") {
      await removeItem(ctx, item, now);
    }
  }
  const wishes = await ctx.db
    .query("wishlistItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const wish of wishes) if (wish.status === "open") await closeWish(ctx, wish, "removed", now);
  for (const status of ["open", "selected"] as const) {
    const reqs = await ctx.db
      .query("requests")
      .withIndex("by_requester_status", (q) => q.eq("requesterId", userId).eq("status", status))
      .collect();
    for (const r of reqs) await withdrawRequest(ctx, r, now);
  }
}
