import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { displayName } from "./access";
import { writeEvent } from "./events";

// Item and request state changes shared by several mutations. Callers check
// permissions; these functions only move state and write events.
// State machine and copy: docs/spec.md, "Item state machine and events".

type Ctx = MutationCtx;

async function closeConversationsFor(ctx: Ctx, requestId: Id<"requests">, now: number) {
  const convs = await ctx.db
    .query("conversations")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .collect();
  for (const c of convs) {
    if (c.closedAt === undefined) await ctx.db.patch(c._id, { closedAt: now });
  }
}

export async function selectedRequest(ctx: Ctx, itemId: Id<"items">) {
  return await ctx.db
    .query("requests")
    .withIndex("by_item_status", (q) => q.eq("itemId", itemId).eq("status", "selected"))
    .first();
}

export async function openRequests(ctx: Ctx, itemId: Id<"items">) {
  return await ctx.db
    .query("requests")
    .withIndex("by_item_status", (q) => q.eq("itemId", itemId).eq("status", "open"))
    .collect();
}

/** Selects a request: item → pending, request → selected, a new conversation opens. */
export async function openSelection(
  ctx: Ctx,
  item: Doc<"items">,
  requestId: Id<"requests">,
  recipientId: Id<"users">,
  now: number,
): Promise<Id<"conversations">> {
  await ctx.db.patch(requestId, { status: "selected", updatedAt: now });
  await ctx.db.patch(item._id, { status: "pending", updatedAt: now });
  return await ctx.db.insert("conversations", {
    itemId: item._id,
    requestId,
    ownerId: item.ownerId,
    recipientId,
  });
}

/**
 * Ends the current selection: the owner un-picked ("unpicked") or the
 * recipient backed out ("withdrew"). The item goes back to available and the
 * other open requests are still in line.
 */
export async function endSelection(
  ctx: Ctx,
  item: Doc<"items">,
  request: Doc<"requests">,
  how: "unpicked" | "withdrew",
  now: number,
  { notify = true } = {},
) {
  await ctx.db.patch(request._id, { status: how === "unpicked" ? "cancelled" : "withdrawn", updatedAt: now });
  await closeConversationsFor(ctx, request._id, now);
  if (item.status === "pending") await ctx.db.patch(item._id, { status: "available", updatedAt: now });
  if (!notify) return;

  const t = item.title;
  if (how === "unpicked") {
    const owner = await displayName(ctx, item.ownerId);
    await writeEvent(ctx, {
      recipientId: request.requesterId,
      type: "unpicked",
      actorId: item.ownerId,
      itemId: item._id,
      requestId: request._id,
      title: t,
      body:
        item.visibility === "private"
          ? `${owner} can't give you the ${t} anymore.`
          : `${owner} un-picked you for the ${t}.`,
    });
  } else {
    const who = await displayName(ctx, request.requesterId);
    await writeEvent(ctx, {
      recipientId: item.ownerId,
      type: item.visibility === "private" ? "offer_unpicked" : "recipient_withdrew",
      actorId: request.requesterId,
      itemId: item._id,
      requestId: request._id,
      title: t,
      body: `${who} can't take the ${t} anymore.`,
    });
  }
}

/** Withdraws a request; if it was selected, the item goes back to available. */
export async function withdrawRequest(ctx: Ctx, request: Doc<"requests">, now: number, { notify = true } = {}) {
  if (request.status === "open") {
    await ctx.db.patch(request._id, { status: "withdrawn", updatedAt: now });
  } else if (request.status === "selected") {
    const item = await ctx.db.get(request.itemId);
    if (item) await endSelection(ctx, item, request, "withdrew", now, { notify });
  }
}

/** Soft-removes an item. Open and selected requesters are told it's gone. */
export async function removeItem(ctx: Ctx, item: Doc<"items">, now: number, { notify = true } = {}) {
  if (item.status === "removed" || item.status === "gone") return;
  const selected = await selectedRequest(ctx, item._id);
  const active = [...(await openRequests(ctx, item._id)), ...(selected ? [selected] : [])];
  for (const r of active) {
    await ctx.db.patch(r._id, { status: "closed", updatedAt: now });
    await closeConversationsFor(ctx, r._id, now);
  }
  await ctx.db.patch(item._id, { status: "removed", updatedAt: now });
  if (!notify) return;

  const notified = new Set<Id<"users">>();
  for (const r of active) {
    notified.add(r.requesterId);
    await writeEvent(ctx, {
      recipientId: r.requesterId,
      type: "item_removed",
      actorId: item.ownerId,
      itemId: item._id,
      requestId: r._id,
      title: item.title,
      body: `The ${item.title} is no longer available.`,
    });
  }
  // An offer the wisher hadn't picked yet: still let them know it was withdrawn.
  if (item.visibility === "private" && item.wishlistItemId) {
    const wish = await ctx.db.get(item.wishlistItemId);
    if (wish && !notified.has(wish.userId)) {
      await writeEvent(ctx, {
        recipientId: wish.userId,
        type: "item_removed",
        actorId: item.ownerId,
        itemId: item._id,
        wishlistItemId: wish._id,
        title: item.title,
        body: `The ${item.title} offer is no longer available.`,
      });
    }
  }
}

/** pending → gone. The recipient and anyone still in line hear about it; a linked wish is fulfilled. */
export async function markGone(ctx: Ctx, item: Doc<"items">, now: number) {
  const selected = await selectedRequest(ctx, item._id);
  await ctx.db.patch(item._id, { status: "gone", updatedAt: now });
  if (selected) {
    await writeEvent(ctx, {
      recipientId: selected.requesterId,
      type: "picked_up",
      actorId: item.ownerId,
      itemId: item._id,
      requestId: selected._id,
      title: item.title,
      body: `Hope you enjoy the ${item.title}!`,
    });
  }
  for (const r of await openRequests(ctx, item._id)) {
    await ctx.db.patch(r._id, { status: "closed", updatedAt: now });
    await writeEvent(ctx, {
      recipientId: r.requesterId,
      type: "picked_up_elsewhere",
      actorId: item.ownerId,
      itemId: item._id,
      requestId: r._id,
      title: item.title,
      body: `The ${item.title} has been picked up.`,
    });
  }
  if (item.wishlistItemId) {
    const wish = await ctx.db.get(item.wishlistItemId);
    if (wish && wish.status === "open") await closeWish(ctx, wish, "fulfilled", now, { exceptItemId: item._id });
  }
}

/** available → expired. Open requests stay open so a repost keeps the line. */
export async function expireItem(ctx: Ctx, item: Doc<"items">, now: number) {
  await ctx.db.patch(item._id, { status: "expired", updatedAt: now });
  await writeEvent(ctx, {
    recipientId: item.ownerId,
    type: "item_expired",
    itemId: item._id,
    title: item.title,
    body: `Your ${item.title} listing expired. Repost?`,
  });
  for (const r of await openRequests(ctx, item._id)) {
    await writeEvent(ctx, {
      recipientId: r.requesterId,
      type: "request_expired",
      itemId: item._id,
      requestId: r._id,
      title: item.title,
      body: `The ${item.title} listing expired.`,
    });
  }
}

/** Fulfills or removes a wish; every other live offer is removed and its offerer told why. */
export async function closeWish(
  ctx: Ctx,
  wish: Doc<"wishlistItems">,
  status: "fulfilled" | "removed",
  now: number,
  { exceptItemId, notify = true }: { exceptItemId?: Id<"items">; notify?: boolean } = {},
) {
  await ctx.db.patch(wish._id, { status });
  const wisher = await displayName(ctx, wish.userId);
  const offers = await ctx.db
    .query("items")
    .withIndex("by_wishlistItem", (q) => q.eq("wishlistItemId", wish._id))
    .collect();
  for (const offer of offers) {
    if (offer._id === exceptItemId) continue;
    if (offer.status === "gone" || offer.status === "removed") continue;
    await removeItem(ctx, offer, now, { notify: false });
    if (!notify) continue;
    await writeEvent(ctx, {
      recipientId: offer.ownerId,
      type: "wish_closed",
      actorId: wish.userId,
      itemId: offer._id,
      wishlistItemId: wish._id,
      title: wish.title,
      body: status === "fulfilled" ? `${wisher}'s wish was fulfilled. Thanks for offering!` : `${wisher} removed the wish.`,
    });
  }
}

/** After a block: silently undo anything in flight between the two people. */
export async function cleanupBetween(ctx: Ctx, a: Id<"users">, b: Id<"users">, now: number) {
  for (const [requester, owner] of [
    [a, b],
    [b, a],
  ] as const) {
    for (const status of ["open", "selected"] as const) {
      const reqs = await ctx.db
        .query("requests")
        .withIndex("by_requester_status", (q) => q.eq("requesterId", requester).eq("status", status))
        .collect();
      for (const r of reqs) {
        const item = await ctx.db.get(r.itemId);
        if (item?.ownerId === owner) await withdrawRequest(ctx, r, now, { notify: false });
      }
    }
    // Offers one made to the other's wishes.
    const items = await ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", requester))
      .collect();
    for (const item of items) {
      if (item.visibility !== "private" || !item.wishlistItemId) continue;
      const wish = await ctx.db.get(item.wishlistItemId);
      if (wish?.userId === owner) await removeItem(ctx, item, now, { notify: false });
    }
  }
}
