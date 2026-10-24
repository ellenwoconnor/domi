import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { displayName, getMembership } from "./access";

// What the app gets for an item. Photo URLs are only ever produced here, after
// the caller has checked access (see "Access rules" in docs/spec.md).

type Ctx = QueryCtx | MutationCtx;

export async function photoUrls(ctx: Ctx, item: Doc<"items">): Promise<string[]> {
  if (item.photosPurgedAt !== undefined) return [];
  const urls = await Promise.all(item.photos.map((p) => ctx.storage.getUrl(p)));
  return urls.filter((u): u is string => u !== null);
}

async function ownerPhotos(ctx: Ctx, item: Doc<"items">) {
  const out: { storageId: Id<"_storage">; url: string }[] = [];
  for (const storageId of item.photos) {
    const url = await ctx.storage.getUrl(storageId);
    if (url) out.push({ storageId, url });
  }
  return out;
}

export async function activeRequestCount(ctx: Ctx, itemId: Id<"items">) {
  const open = await ctx.db
    .query("requests")
    .withIndex("by_item_status", (q) => q.eq("itemId", itemId).eq("status", "open"))
    .collect();
  const selected = await ctx.db
    .query("requests")
    .withIndex("by_item_status", (q) => q.eq("itemId", itemId).eq("status", "selected"))
    .collect();
  return open.length + selected.length;
}

export async function itemCard(ctx: Ctx, item: Doc<"items">, viewerId: Id<"users">) {
  const isOwner = item.ownerId === viewerId;
  const links = await ctx.db
    .query("itemCommunities")
    .withIndex("by_item", (q) => q.eq("itemId", item._id))
    .collect();
  const circles = [];
  for (const link of links) {
    if (!isOwner && !(await getMembership(ctx, link.communityId, viewerId))) continue;
    const c = await ctx.db.get(link.communityId);
    if (c) circles.push({ id: c._id, name: c.name, emoji: c.emoji });
  }
  const mine = isOwner
    ? null
    : await ctx.db
        .query("requests")
        .withIndex("by_item_requester", (q) => q.eq("itemId", item._id).eq("requesterId", viewerId))
        .first();
  return {
    id: item._id,
    title: item.title,
    description: item.description,
    status: item.status,
    visibility: item.visibility,
    wishlistItemId: item.wishlistItemId ?? null,
    photoUrls: await photoUrls(ctx, item),
    // The owner edits photos by storage id; nobody else gets the ids.
    ownerPhotos: isOwner && item.photosPurgedAt === undefined ? await ownerPhotos(ctx, item) : null,
    approxLat: item.approxLat,
    approxLng: item.approxLng,
    createdAt: item._creationTime,
    expiresAt: item.expiresAt,
    owner: { userId: item.ownerId, displayName: await displayName(ctx, item.ownerId) },
    isOwner,
    requestCount: await activeRequestCount(ctx, item._id),
    myRequest: mine ? { id: mine._id, status: mine.status, note: mine.note ?? null } : null,
    circles,
  };
}
