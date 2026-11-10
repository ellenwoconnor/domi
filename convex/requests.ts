import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { blockedUserIds, canSeeItem, displayName, fail, requireOwnItem, requireProfile, requireVisibleItem } from "./lib/access";
import { firstThumbUrl } from "./lib/cards";
import { writeEvent } from "./lib/events";
import { withdrawRequest } from "./lib/lifecycle";
import { requireNotPaused } from "./lib/noShows";
import { shareUsedByOther, usableShareFor } from "./lib/shares";
import { cleanOptionalText, LIMITS } from "./lib/validate";

/** Request a public listing, with an optional note. Allowed while pending (you wait in line). */
export const create = mutation({
  args: { itemId: v.id("items"), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const found = await ctx.db.get(args.itemId);
    if (found && !(await canSeeItem(ctx, userId, found)) && (await shareUsedByOther(ctx, userId, found._id))) {
      fail(`This link was already used. Ask ${await displayName(ctx, found.ownerId)} to send you a new one.`);
    }
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
    // Un-picked (the owner cancelled the exchange): this listing is closed for them.
    if (existing?.status === "cancelled") fail(`${await displayName(ctx, item.ownerId)} cancelled this exchange`);

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
    await requireNotPaused(ctx, userId, now);
    // A share link they opened is used up by this request (single use).
    const share = await usableShareFor(ctx, userId, item._id);
    if (share && share.usedBy === undefined) await ctx.db.patch(share._id, { usedBy: userId, usedAt: now });
    const viaShareId = share?._id ?? existing?.viaShareId;
    const requestId = existing
      ? (await ctx.db.patch(existing._id, { status: "open", note, updatedAt: now, viaShareId }), existing._id)
      : await ctx.db.insert("requests", {
          itemId: item._id,
          requesterId: userId,
          note,
          status: "open",
          updatedAt: now,
          ...(viaShareId ? { viaShareId } : {}),
        });

    const who = await displayName(ctx, userId);
    await writeEvent(ctx, {
      recipientId: item.ownerId,
      type: "request_created",
      actorId: userId,
      itemId: item._id,
      requestId,
      title: item.title,
      body: note ? `${who} asked for your ${item.title}: "${note}"` : `${who} asked for your ${item.title}`,
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
    if ((await ctx.db.get(request.itemId))?.status === "gone") fail("This was already picked up");
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
    // "via your link" only for people the link let in: not for members of the listing's domis.
    const circles = (
      await ctx.db
        .query("itemCommunities")
        .withIndex("by_item_community", (q) => q.eq("itemId", item._id))
        .collect()
    ).map((l) => l.communityId);
    const inCircle = async (requesterId: (typeof rows)[number]["requesterId"]) => {
      for (const communityId of circles) {
        const m = await ctx.db
          .query("memberships")
          .withIndex("by_community_user", (q) => q.eq("communityId", communityId).eq("userId", requesterId))
          .first();
        if (m) return true;
      }
      return false;
    };
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
        viaLink: r.viaShareId !== undefined && !(await inCircle(r.requesterId)),
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
            photoUrl: await firstThumbUrl(ctx, item),
            owner: { userId: item.ownerId, displayName: await displayName(ctx, item.ownerId) },
          },
        });
      }
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  },
});
