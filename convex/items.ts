import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  blockedUserIds,
  canSeeItem,
  displayName,
  fail,
  myCommunityIds,
  requireMember,
  requireOwnItem,
  requireProfile,
  requireVisibleItem,
} from "./lib/access";
import { itemCard } from "./lib/cards";
import { writeEvent } from "./lib/events";
import { endSelection, markGone, openRequests, openSelection, removeItem, selectedRequest } from "./lib/lifecycle";
import { checkPhotos, itemText } from "./lib/photos";
import { LISTING_LIFETIME_MS } from "./lib/validate";

// Listings: post, browse, search, and every owner-side status change.

const LIVE: Doc<"items">["status"][] = ["available", "pending"];

/** Step 1 of posting: the app uploads each (compressed) photo to this URL. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireProfile(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    photos: v.array(v.id("_storage")),
    communityIds: v.array(v.id("communities")),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    const text = itemText(args.title, args.description);
    await checkPhotos(ctx, args.photos);
    const circles = [...new Set(args.communityIds)];
    if (circles.length === 0) fail("Pick at least one circle");
    for (const c of circles) await requireMember(ctx, c, userId);

    const now = Date.now();
    const itemId = await ctx.db.insert("items", {
      ownerId: userId,
      ...text,
      photos: args.photos,
      approxLat: profile.approxLat,
      approxLng: profile.approxLng,
      visibility: "public",
      status: "available",
      expiresAt: now + LISTING_LIFETIME_MS,
      updatedAt: now,
      searchText: `${text.title} ${text.description}`,
    });
    for (const communityId of circles) await ctx.db.insert("itemCommunities", { itemId, communityId });
    return itemId;
  },
});

/**
 * Owner edits text, photos, or circles. Circles can be added any time, but
 * removed only while nobody has an active request (so no one loses sight of
 * something they asked for).
 */
export const update = mutation({
  args: {
    itemId: v.id("items"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    photos: v.optional(v.array(v.id("_storage"))),
    communityIds: v.optional(v.array(v.id("communities"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireOwnItem(ctx, userId, args.itemId);
    if (!["available", "pending", "expired"].includes(item.status)) fail("This listing can't be edited anymore");

    const text = itemText(args.title ?? item.title, args.description ?? item.description);
    const patch: Partial<Doc<"items">> = { ...text, searchText: `${text.title} ${text.description}`, updatedAt: Date.now() };

    if (args.photos) {
      await checkPhotos(ctx, args.photos);
      for (const old of item.photos) if (!args.photos.includes(old)) await ctx.storage.delete(old);
      patch.photos = args.photos;
    }

    if (args.communityIds) {
      if (item.visibility === "private") fail("Offers aren't posted to circles");
      const wanted = new Set(args.communityIds);
      if (wanted.size === 0) fail("Pick at least one circle");
      for (const c of wanted) await requireMember(ctx, c, userId);
      const links = await ctx.db
        .query("itemCommunities")
        .withIndex("by_item", (q) => q.eq("itemId", item._id))
        .collect();
      const removing = links.filter((l) => !wanted.has(l.communityId));
      if (removing.length > 0) {
        const active = (await openRequests(ctx, item._id)).length + ((await selectedRequest(ctx, item._id)) ? 1 : 0);
        if (active > 0) fail("You can't take a listing out of a circle once people have requested it");
      }
      for (const l of removing) await ctx.db.delete(l._id);
      for (const c of wanted) {
        if (!links.some((l) => l.communityId === c)) await ctx.db.insert("itemCommunities", { itemId: item._id, communityId: c });
      }
    }
    await ctx.db.patch(item._id, patch);
  },
});

export const remove = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireOwnItem(ctx, userId, itemId);
    if (item.status === "gone") fail("This item has already been picked up");
    await removeItem(ctx, item, Date.now());
  },
});

/** Expired → available for another 30 days. Open requests are still in line. */
export const repost = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireOwnItem(ctx, userId, itemId);
    if (item.status !== "expired") fail("Only expired listings can be reposted");
    if (item.photosPurgedAt !== undefined) fail("This listing is too old to repost; post it again");
    if (item.visibility === "public") {
      const link = await ctx.db
        .query("itemCommunities")
        .withIndex("by_item", (q) => q.eq("itemId", item._id))
        .first();
      if (!link) fail("Pick a circle to post to");
    } else {
      const wish = item.wishlistItemId ? await ctx.db.get(item.wishlistItemId) : null;
      if (!wish || wish.status !== "open") fail("That wish is closed");
    }
    const now = Date.now();
    await ctx.db.patch(item._id, { status: "available", expiresAt: now + LISTING_LIFETIME_MS, updatedAt: now });
  },
});

/** Owner picks a recipient from the requests on a public listing. Opens the thread. */
export const selectRecipient = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const { userId } = await requireProfile(ctx);
    const request = await ctx.db.get(requestId);
    if (!request) fail("Request not found");
    const item = await requireOwnItem(ctx, userId, request.itemId);
    if (item.visibility !== "public") fail("The wisher picks which offer to take");
    if (item.status !== "available") fail(item.status === "pending" ? "Un-pick the current recipient first" : "This listing isn't available");
    if (request.status !== "open") fail("That request isn't open");

    const now = Date.now();
    const conversationId = await openSelection(ctx, item, request._id, request.requesterId, now);
    const owner = await displayName(ctx, userId);
    await writeEvent(ctx, {
      recipientId: request.requesterId,
      type: "picked",
      actorId: userId,
      itemId: item._id,
      requestId: request._id,
      conversationId,
      title: item.title,
      body: `You were picked for the ${item.title}! Message ${owner} to arrange pickup.`,
    });
    for (const r of await openRequests(ctx, item._id)) {
      await writeEvent(ctx, {
        recipientId: r.requesterId,
        type: "pending_elsewhere",
        actorId: userId,
        itemId: item._id,
        requestId: r._id,
        title: item.title,
        body: `The ${item.title} is pending with someone else. You're still in line.`,
      });
    }
    return conversationId;
  },
});

/** Owner un-picks the current recipient; the item is available again. */
export const unpick = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireOwnItem(ctx, userId, itemId);
    const selected = await selectedRequest(ctx, item._id);
    if (item.status !== "pending" || !selected) fail("Nobody is picked for this item");
    await endSelection(ctx, item, selected, "unpicked", Date.now());
  },
});

export const markPickedUp = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireOwnItem(ctx, userId, itemId);
    if (item.status !== "pending") fail("Pick a recipient first");
    await markGone(ctx, item, Date.now());
  },
});

export const get = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await requireVisibleItem(ctx, userId, itemId);
    return await itemCard(ctx, item, userId);
  },
});

/** Live listings in one circle, or in all my circles. Newest first. */
export const browse = query({
  args: { communityId: v.optional(v.id("communities")), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const limit = Math.min(args.limit ?? 50, 100);
    const circles = args.communityId
      ? [(await requireMember(ctx, args.communityId, userId)).communityId]
      : await myCommunityIds(ctx, userId);
    const blocked = await blockedUserIds(ctx, userId);
    const seen = new Set<Id<"items">>();
    const found: Doc<"items">[] = [];
    for (const communityId of circles) {
      const links = await ctx.db
        .query("itemCommunities")
        .withIndex("by_community", (q) => q.eq("communityId", communityId))
        .order("desc")
        .take(limit * 2);
      for (const link of links) {
        if (seen.has(link.itemId)) continue;
        seen.add(link.itemId);
        const item = await ctx.db.get(link.itemId);
        if (!item || !LIVE.includes(item.status) || blocked.has(item.ownerId)) continue;
        found.push(item);
      }
    }
    found.sort((a, b) => b._creationTime - a._creationTime);
    return await Promise.all(found.slice(0, limit).map((i) => itemCard(ctx, i, userId)));
  },
});

/** Keyword search over live listings I can see (optionally one circle). */
export const search = query({
  args: { text: v.string(), communityId: v.optional(v.id("communities")) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const text = args.text.trim();
    if (!text) return [];
    if (args.communityId) await requireMember(ctx, args.communityId, userId);
    const hits = await ctx.db
      .query("items")
      .withSearchIndex("search_text", (q) => q.search("searchText", text).eq("visibility", "public"))
      .take(100);
    const out = [];
    for (const item of hits) {
      if (!LIVE.includes(item.status)) continue;
      if (args.communityId) {
        const inCircle = await ctx.db
          .query("itemCommunities")
          .withIndex("by_item_community", (q) => q.eq("itemId", item._id).eq("communityId", args.communityId!))
          .first();
        if (!inCircle) continue;
      }
      if (!(await canSeeItem(ctx, userId, item))) continue;
      out.push(await itemCard(ctx, item, userId));
      if (out.length >= 50) break;
    }
    return out;
  },
});

/** My listings and offers, newest first (removed ones left out). */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
    return await Promise.all(items.filter((i) => i.status !== "removed").map((i) => itemCard(ctx, i, userId)));
  },
});

