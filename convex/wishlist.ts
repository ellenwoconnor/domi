import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import {
  blockedUserIds,
  canSeeWish,
  displayName,
  fail,
  getMembership,
  myCommunityIds,
  requireMember,
  requireProfile,
} from "./lib/access";
import { itemCard } from "./lib/cards";
import { writeEvent } from "./lib/events";
import { closeWish, openSelection } from "./lib/lifecycle";
import { checkPhotos, itemText } from "./lib/photos";
import { cleanOptionalText, cleanText, LIMITS, LISTING_LIFETIME_MS } from "./lib/validate";

// Wishes and offers. Offers are private listings linked to a wish; they
// accumulate and the wisher picks one. See "Wish offers" in docs/spec.md.

async function liveOffers(ctx: QueryCtx, wishId: Id<"wishlistItems">) {
  const offers = await ctx.db
    .query("items")
    .withIndex("by_wishlistItem", (q) => q.eq("wishlistItemId", wishId))
    .collect();
  return offers.filter((o) => o.status === "available" || o.status === "pending");
}

async function wishCard(ctx: QueryCtx, wish: Doc<"wishlistItems">, viewerId: Id<"users">) {
  const isMine = wish.userId === viewerId;
  const links = await ctx.db
    .query("wishlistCommunities")
    .withIndex("by_wish", (q) => q.eq("wishlistItemId", wish._id))
    .collect();
  const circles = [];
  for (const link of links) {
    if (!isMine && !(await getMembership(ctx, link.communityId, viewerId))) continue;
    const c = await ctx.db.get(link.communityId);
    if (c) circles.push({ id: c._id, name: c.name, emoji: c.emoji });
  }
  const offers = await liveOffers(ctx, wish._id);
  const myOffer = offers.find((o) => o.ownerId === viewerId);
  return {
    id: wish._id,
    title: wish.title,
    description: wish.description ?? null,
    status: wish.status,
    createdAt: wish._creationTime,
    user: { userId: wish.userId, displayName: await displayName(ctx, wish.userId) },
    isMine,
    offerCount: isMine ? offers.length : null, // only the wisher sees how many offers there are
    myOfferId: myOffer?._id ?? null,
    // The wisher picked an offer and pickup is being arranged. Others see "Pending pickup".
    pending: offers.some((o) => o.status === "pending"),
    circles,
  };
}

export const create = mutation({
  args: { title: v.string(), description: v.optional(v.string()), communityIds: v.array(v.id("communities")) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const circles = [...new Set(args.communityIds)];
    if (circles.length === 0) fail("Pick at least one circle");
    for (const c of circles) await requireMember(ctx, c, userId);
    const wishId = await ctx.db.insert("wishlistItems", {
      userId,
      title: cleanText(args.title, "Title", LIMITS.wishTitle),
      description: cleanOptionalText(args.description, "Description", LIMITS.wishDescription),
      status: "open",
    });
    for (const communityId of circles) await ctx.db.insert("wishlistCommunities", { wishlistItemId: wishId, communityId });
    return wishId;
  },
});

/** Remove my wish. Open offers are removed and their offerers told. */
export const remove = mutation({
  args: { wishId: v.id("wishlistItems") },
  handler: async (ctx, { wishId }) => {
    const { userId } = await requireProfile(ctx);
    const wish = await ctx.db.get(wishId);
    if (!wish || wish.userId !== userId) fail("Wish not found");
    if (wish.status !== "open") return;
    await closeWish(ctx, wish, "removed", Date.now());
  },
});

/** Open wishes in one circle or all my circles, newest first. */
export const browse = query({
  args: { communityId: v.optional(v.id("communities")), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const limit = Math.min(args.limit ?? 50, 100);
    const circles = args.communityId
      ? [(await requireMember(ctx, args.communityId, userId)).communityId]
      : await myCommunityIds(ctx, userId);
    const blocked = await blockedUserIds(ctx, userId);
    const seen = new Set<Id<"wishlistItems">>();
    const found: Doc<"wishlistItems">[] = [];
    for (const communityId of circles) {
      const links = await ctx.db
        .query("wishlistCommunities")
        .withIndex("by_community", (q) => q.eq("communityId", communityId))
        .order("desc")
        .take(limit * 2);
      for (const link of links) {
        if (seen.has(link.wishlistItemId)) continue;
        seen.add(link.wishlistItemId);
        const wish = await ctx.db.get(link.wishlistItemId);
        if (!wish || wish.status !== "open" || blocked.has(wish.userId)) continue;
        found.push(wish);
      }
    }
    found.sort((a, b) => b._creationTime - a._creationTime);
    return await Promise.all(found.slice(0, limit).map((w) => wishCard(ctx, w, userId)));
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const wishes = await ctx.db
      .query("wishlistItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return await Promise.all(wishes.filter((w) => w.status === "open").map((w) => wishCard(ctx, w, userId)));
  },
});

export const get = query({
  args: { wishId: v.id("wishlistItems") },
  handler: async (ctx, { wishId }) => {
    const { userId } = await requireProfile(ctx);
    const wish = await ctx.db.get(wishId);
    if (!wish || !(await canSeeWish(ctx, userId, wish))) fail("Wish not found");
    return await wishCard(ctx, wish, userId);
  },
});

/** "I have this": offer an item for someone's wish (a private listing). */
export const offer = mutation({
  args: {
    wishId: v.id("wishlistItems"),
    title: v.string(),
    description: v.string(),
    photos: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    const wish = await ctx.db.get(args.wishId);
    if (!wish || !(await canSeeWish(ctx, userId, wish))) fail("Wish not found");
    if (wish.userId === userId) fail("You can't offer on your own wish");
    if (wish.status !== "open") fail("This wish is closed");
    if ((await liveOffers(ctx, wish._id)).some((o) => o.ownerId === userId)) fail("You've already offered something for this wish");
    const text = itemText(args.title, args.description);
    await checkPhotos(ctx, args.photos);

    const now = Date.now();
    const itemId = await ctx.db.insert("items", {
      ownerId: userId,
      ...text,
      photos: args.photos,
      approxLat: profile.approxLat,
      approxLng: profile.approxLng,
      visibility: "private",
      wishlistItemId: wish._id,
      status: "available",
      expiresAt: now + LISTING_LIFETIME_MS,
      updatedAt: now,
      searchText: `${text.title} ${text.description}`,
    });
    await writeEvent(ctx, {
      recipientId: wish.userId,
      type: "wish_offer",
      actorId: userId,
      itemId,
      wishlistItemId: wish._id,
      title: wish.title,
      body: `${profile.displayName} offered a ${text.title} for your wish`,
    });
    return itemId;
  },
});

/** The wisher's view of offers on their wish. */
export const offers = query({
  args: { wishId: v.id("wishlistItems") },
  handler: async (ctx, { wishId }) => {
    const { userId } = await requireProfile(ctx);
    const wish = await ctx.db.get(wishId);
    if (!wish || wish.userId !== userId) fail("Wish not found");
    const blocked = await blockedUserIds(ctx, userId);
    const live = (await liveOffers(ctx, wish._id)).filter((o) => !blocked.has(o.ownerId));
    return await Promise.all(live.map((o) => itemCard(ctx, o, userId)));
  },
});

/** The wisher picks an offer: it becomes pending and a thread opens. */
export const pickOffer = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireProfile(ctx);
    const item = await ctx.db.get(itemId);
    if (!item || item.visibility !== "private" || !item.wishlistItemId) fail("Offer not found");
    const wish = await ctx.db.get(item.wishlistItemId);
    if (!wish || wish.userId !== userId) fail("Offer not found");
    if (wish.status !== "open") fail("This wish is closed");
    if (item.status !== "available") fail("This offer isn't available");
    if ((await liveOffers(ctx, wish._id)).some((o) => o.status === "pending")) {
      fail("You've already picked an offer. Withdraw from it first to pick another.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("requests")
      .withIndex("by_item_requester", (q) => q.eq("itemId", item._id).eq("requesterId", userId))
      .first();
    const requestId =
      existing?._id ?? (await ctx.db.insert("requests", { itemId: item._id, requesterId: userId, status: "open", updatedAt: now }));
    const conversationId = await openSelection(ctx, item, requestId, userId, now);
    const who = await displayName(ctx, userId);
    await writeEvent(ctx, {
      recipientId: item.ownerId,
      type: "offer_picked",
      actorId: userId,
      itemId: item._id,
      requestId,
      conversationId,
      wishlistItemId: wish._id,
      title: item.title,
      body: `${who} chose your ${item.title}! Message ${who} to arrange pickup.`,
    });
    return conversationId;
  },
});
