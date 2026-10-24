import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { displayName, getMembership, isBlockedEitherWay } from "./access";

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

/**
 * The viewer's pickup chats about this item: the owner's with each person they
 * picked, or a requester's own. `chat` is the open one; `pastChats` are the
 * ended ones, newest first. Chats with someone blocked either way are left out.
 */
async function chatsFor(ctx: Ctx, item: Doc<"items">, viewerId: Id<"users">) {
  const convs = await ctx.db
    .query("conversations")
    .withIndex("by_item", (q) => q.eq("itemId", item._id))
    .collect();
  let chat: { id: Id<"conversations">; other: { userId: Id<"users">; displayName: string } } | null = null;
  const pastChats = [];
  for (const c of convs) {
    if (c.ownerId !== viewerId && c.recipientId !== viewerId) continue;
    const otherId = c.ownerId === viewerId ? c.recipientId : c.ownerId;
    if (await isBlockedEitherWay(ctx, viewerId, otherId)) continue;
    const other = { userId: otherId, displayName: await displayName(ctx, otherId) };
    if (c.closedAt === undefined) {
      chat = { id: c._id, other };
      continue;
    }
    const last = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
      .order("desc")
      .first();
    pastChats.push({
      id: c._id,
      other,
      endedAt: c.closedAt,
      lastMessage: last ? { body: last.body, mine: last.senderId === viewerId } : null,
    });
  }
  pastChats.sort((a, b) => b.endedAt - a.endedAt);
  return { chat, pastChats };
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
  // An offer for a wish: only its owner and the wisher can see it (checked by
  // the caller), so both may see which wish it answers.
  const wish = item.visibility === "private" && item.wishlistItemId ? await ctx.db.get(item.wishlistItemId) : null;
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
    wish: wish
      ? {
          id: wish._id,
          title: wish.title,
          description: wish.description ?? null,
          status: wish.status,
          wisher: { userId: wish.userId, displayName: await displayName(ctx, wish.userId) },
        }
      : null,
    ...(await chatsFor(ctx, item, viewerId)),
  };
}
