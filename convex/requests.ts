import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { blockedUserIds, displayName, fail, requireOwnItem, requireProfile, requireVisibleItem } from "./lib/access";
import { photoUrls } from "./lib/cards";
import { writeEvent } from "./lib/events";
import { withdrawRequest } from "./lib/lifecycle";
import { cleanOptionalText, LIMITS } from "./lib/validate";

/** Request a public listing, with an optional note. Allowed while pending (you wait in line). */
export const create = mutation({
  args: { itemId: v.id("items"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireVisibleItem(ctx, userId, args.itemId);
    if (item.ownerId === userId) fail("You can't request your own item");
    if (item.visibility !== "public") fail("Pick this offer from your wish instead");
    if (item.status !== "available" && item.status !== "pending") fail("This item isn't available");
    const note = cleanOptionalText(args.note, "Note", LIMITS.requestNote);

    const existing = await ctx.db
      .query("requests")
      .withIndex("by_item_requester", (q) => q.eq("itemId", item._id).eq("requesterId", userId))
      .first();
    if (existing && (existing.status === "open" || existing.status === "selected")) fail("You've already requested this");

    // Cap: open requests on live items.
    const open = await ctx.db
      .query("requests")
      .withIndex("by_requester_status", (q) => q.eq("requesterId", userId).eq("status", "open"))
      .collect();
    let live = 0;
    for (const r of open) {
      const i = await ctx.db.get(r.itemId);
      if (i && (i.status === "available" || i.status === "pending")) live++;
    }
    if (live >= LIMITS.openRequestsPerUser) {
      fail(`You can have up to ${LIMITS.openRequestsPerUser} open requests. Withdraw one to request this.`);
    }

    const now = Date.now();
    const requestId = existing
      ? (await ctx.db.patch(existing._id, { status: "open", note, updatedAt: now }), existing._id)
      : await ctx.db.insert("requests", { itemId: item._id, requesterId: userId, note, status: "open", updatedAt: now });

    const who = await displayName(ctx, userId);
    await writeEvent(ctx, {
      recipientId: item.ownerId,
      type: "request_created",
      actorId: userId,
      itemId: item._id,
      requestId,
      title: item.title,
      body: note ? `${who} requested your ${item.title}: "${note}"` : `${who} requested your ${item.title}`,
    });
    return requestId;
  },
});

/** Withdraw my request. If I was picked, the item goes back to available and the owner is told. */
export const withdraw = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const { userId } = await requireProfile(ctx);
    const request = await ctx.db.get(requestId);
    if (!request || request.requesterId !== userId) fail("Request not found");
    if (request.status !== "open" && request.status !== "selected") fail("This request is already closed");
    await withdrawRequest(ctx, request, Date.now());
  },
});

/** Owner view: everyone who asked, with notes. */
export const forItem = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireOwnItem(ctx, userId, itemId);
    const blocked = await blockedUserIds(ctx, userId);
    const rows = await ctx.db
      .query("requests")
      .withIndex("by_item", (q) => q.eq("itemId", item._id))
      .collect();
    const out = [];
    for (const r of rows) {
      if (r.status !== "open" && r.status !== "selected") continue;
      if (blocked.has(r.requesterId)) continue;
      out.push({
        id: r._id,
        requester: { userId: r.requesterId, displayName: await displayName(ctx, r.requesterId) },
        note: r.note ?? null,
        status: r.status,
        createdAt: r._creationTime,
      });
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
  },
});

/** My requests that are still live (open or selected), newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const out = [];
    for (const status of ["selected", "open"] as const) {
      const rows = await ctx.db
        .query("requests")
        .withIndex("by_requester_status", (q) => q.eq("requesterId", userId).eq("status", status))
        .collect();
      for (const r of rows) {
        const item = await ctx.db.get(r.itemId);
        if (!item) continue;
        out.push({
          id: r._id,
          status: r.status,
          note: r.note ?? null,
          createdAt: r._creationTime,
          item: {
            id: item._id,
            title: item.title,
            status: item.status,
            visibility: item.visibility,
            photoUrl: (await photoUrls(ctx, item))[0] ?? null,
            owner: { userId: item.ownerId, displayName: await displayName(ctx, item.ownerId) },
          },
        });
      }
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  },
});
