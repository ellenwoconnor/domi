import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { fail, getProfile, requireProfile, requireUserId } from "./lib/access";
import { addMembership, findOrCreateZipCircle, leaveCommunity, lookupZip, previewLeave } from "./lib/circles";
import { closeWish, removeItem, withdrawRequest } from "./lib/lifecycle";
import { deleteFiles, itemFiles } from "./lib/photos";
import { RATE_LIMITS, type RateLimitName } from "./lib/rateLimit";
import { redeemInviteCode, redeemShareCode, type RedeemResult } from "./lib/redeem";
import { checkLatLng, cleanText, cleanZip, LIMITS, roundCoord } from "./lib/validate";

/** The caller's profile; `needsSignup` means signed in but not onboarded yet. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const profile = await getProfile(ctx, userId);
    if (!profile) return { userId, needsSignup: true as const, profile: null };
    const terms = await currentTermsVersion(ctx);
    return {
      userId,
      needsSignup: false as const,
      profile: {
        displayName: profile.displayName,
        zip: profile.zip,
        approxLat: profile.approxLat,
        approxLng: profile.approxLng,
        termsVersion: profile.termsVersion,
        // False when the terms changed since this person accepted them: the app
        // asks them to accept the new version before anything else.
        termsCurrent: terms === null || profile.termsVersion === terms,
        currentTermsVersion: terms,
        banned: profile.bannedAt !== undefined,
        introSeen: profile.introSeenAt !== undefined,
        pushAskCount: profile.pushAskCount ?? 0,
        pushAskedAt: profile.pushAskedAt ?? null,
      },
    };
  },
});

async function currentTermsVersion(ctx: QueryCtx | MutationCtx) {
  const row = await ctx.db
    .query("appConfig")
    .withIndex("by_key", (q) => q.eq("key", "terms_version"))
    .unique();
  return row?.value ?? null;
}

async function resolveLocation(ctx: MutationCtx, zip: string, lat?: number, lng?: number) {
  const ref = await lookupZip(ctx, zip);
  if (!ref) fail("We don't recognize that zip code");
  if (lat !== undefined && lng !== undefined) {
    checkLatLng(lat, lng);
    return { approxLat: roundCoord(lat), approxLng: roundCoord(lng) };
  }
  return { approxLat: roundCoord(ref.lat), approxLng: roundCoord(ref.lng) };
}

/**
 * Signup: terms, profile, zip circle, and any invite/share codes saved before
 * signup. One mutation, so it all happens or none of it does.
 */
export const completeSignup = mutation({
  args: {
    displayName: v.string(),
    zip: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    termsVersion: v.string(),
    inviteCodes: v.optional(v.array(v.string())),
    shareCodes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (await getProfile(ctx, userId)) fail("You've already signed up");

    const terms = await currentTermsVersion(ctx);
    if (!terms) fail("Terms of service aren't configured");
    if (args.termsVersion !== terms) fail("Please accept the current terms of service");

    const displayName = cleanText(args.displayName, "Display name", LIMITS.displayName);
    const zip = cleanZip(args.zip);
    const location = await resolveLocation(ctx, zip, args.lat, args.lng);
    const now = Date.now();

    await ctx.db.insert("profiles", {
      userId,
      displayName,
      zip,
      ...location,
      termsVersion: terms,
      termsAcceptedAt: now,
    });

    const zipCircle = await findOrCreateZipCircle(ctx, zip);
    await addMembership(ctx, zipCircle, userId);

    const invites: { code: string; result: RedeemResult }[] = [];
    for (const code of (args.inviteCodes ?? []).slice(0, 10)) {
      invites.push({ code, result: await redeemInviteCode(ctx, userId, code) });
    }
    const shares: { code: string; result: RedeemResult }[] = [];
    for (const code of (args.shareCodes ?? []).slice(0, 10)) {
      shares.push({ code, result: await redeemShareCode(ctx, userId, code) });
    }
    return { zipCommunityId: zipCircle._id, invites, shares };
  },
});

/**
 * Redeems invite and share codes the app saved while someone who already has
 * an account was signed out (they tapped a link, then signed in). New accounts
 * redeem theirs in completeSignup instead. Same result shape as completeSignup.
 */
export const redeemSavedCodes = mutation({
  args: {
    inviteCodes: v.array(v.string()),
    shareCodes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const invites: { code: string; result: RedeemResult }[] = [];
    for (const code of args.inviteCodes.slice(0, 10)) {
      invites.push({ code, result: await redeemInviteCode(ctx, userId, code) });
    }
    const shares: { code: string; result: RedeemResult }[] = [];
    for (const code of args.shareCodes.slice(0, 10)) {
      shares.push({ code, result: await redeemShareCode(ctx, userId, code) });
    }
    return { invites, shares };
  },
});

/** Accepts the current terms after they changed (signup accepts them in completeSignup). */
export const acceptTerms = mutation({
  args: { termsVersion: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    const terms = await currentTermsVersion(ctx);
    if (!terms) fail("Terms of service aren't configured");
    if (args.termsVersion !== terms) fail("The terms changed again. Please review the latest version.");
    if (profile.termsVersion === terms) return;
    await ctx.db.patch(profile._id, { termsVersion: terms, termsAcceptedAt: Date.now() });
  },
});

/** The "How Domi works" cards were shown. Keeps the first time; safe to call again. */
export const markIntroSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const { profile } = await requireProfile(ctx);
    if (profile.introSeenAt === undefined) await ctx.db.patch(profile._id, { introSeenAt: Date.now() });
  },
});

export const updateProfile = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const { profile } = await requireProfile(ctx);
    await ctx.db.patch(profile._id, { displayName: cleanText(args.displayName, "Display name", LIMITS.displayName) });
  },
});

async function zipCircleId(ctx: QueryCtx | MutationCtx, zip: string) {
  const c = await ctx.db
    .query("communities")
    .withIndex("by_kind_zip", (q) => q.eq("kind", "zip").eq("zip", zip))
    .unique();
  return c?._id ?? null;
}

/** What a zip change would cancel, for the "Are you sure?" sheet. */
export const previewZipChange = query({
  args: { zip: v.string() },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    const zip = cleanZip(args.zip);
    const known = (await ctx.db
      .query("zipCodes")
      .withIndex("by_zip", (q) => q.eq("zip", zip))
      .unique()) !== null;
    const oldCircle = await zipCircleId(ctx, profile.zip);
    const counts = oldCircle ? await previewLeave(ctx, userId, oldCircle) : { listings: 0, requests: 0, wishes: 0 };
    return { oldZip: profile.zip, newZip: zip, knownZip: known, sameZip: zip === profile.zip, ...counts };
  },
});

export const changeZip = mutation({
  args: { zip: v.string(), lat: v.optional(v.number()), lng: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    const zip = cleanZip(args.zip);
    const location = await resolveLocation(ctx, zip, args.lat, args.lng);
    if (zip === profile.zip) {
      await ctx.db.patch(profile._id, location); // just moving the pin
      return null;
    }
    const oldCircle = await zipCircleId(ctx, profile.zip);
    if (oldCircle) await leaveCommunity(ctx, userId, oldCircle);
    const newCircle = await findOrCreateZipCircle(ctx, zip);
    await addMembership(ctx, newCircle, userId);
    await ctx.db.patch(profile._id, { zip, ...location });
    return newCircle._id;
  },
});

/**
 * Immediate, permanent deletion (App Store and Google Play requirement).
 * See "Account deletion" in docs/spec.md.
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await deleteUserData(ctx, userId);
  },
});

async function deleteAll<T extends { _id: Id<any> }>(ctx: MutationCtx, rows: T[]) {
  for (const row of rows) await ctx.db.delete(row._id);
}

export async function deleteUserData(ctx: MutationCtx, userId: Id<"users">) {
  const now = Date.now();

  // Leave every circle (notifies people whose pickups were affected).
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const m of memberships) await leaveCommunity(ctx, userId, m.communityId);

  // Remaining items (offers, items posted only by share) and wishes.
  const items = await ctx.db
    .query("items")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();
  for (const item of items) await removeItem(ctx, item, now);
  const wishes = await ctx.db
    .query("wishlistItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const wish of wishes) if (wish.status === "open") await closeWish(ctx, wish, "removed", now);

  // Their requests on other people's items (selected ones free the item first).
  for (const status of ["open", "selected"] as const) {
    const reqs = await ctx.db
      .query("requests")
      .withIndex("by_requester_status", (q) => q.eq("requesterId", userId).eq("status", status))
      .collect();
    for (const r of reqs) await withdrawRequest(ctx, r, now);
  }

  // Conversations they were part of, and their messages, for both sides.
  const convs = [
    ...(await ctx.db
      .query("conversations")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect()),
    ...(await ctx.db
      .query("conversations")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .collect()),
  ];
  for (const c of convs) {
    await deleteAll(
      ctx,
      await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
        .collect(),
    );
    await ctx.db.delete(c._id);
  }

  // Items, their links, shares, grants, requests on them, and photos.
  for (const item of items) {
    await deleteFiles(ctx, itemFiles(item));
    await deleteAll(ctx, await ctx.db.query("itemCommunities").withIndex("by_item", (q) => q.eq("itemId", item._id)).collect());
    await deleteAll(ctx, await ctx.db.query("requests").withIndex("by_item", (q) => q.eq("itemId", item._id)).collect());
    await deleteAll(ctx, await ctx.db.query("shareGrants").withIndex("by_item", (q) => q.eq("itemId", item._id)).collect());
    await deleteAll(ctx, await ctx.db.query("itemShares").withIndex("by_item", (q) => q.eq("itemId", item._id)).collect());
    await ctx.db.delete(item._id);
  }
  for (const wish of wishes) {
    await deleteAll(ctx, await ctx.db.query("wishlistCommunities").withIndex("by_wish", (q) => q.eq("wishlistItemId", wish._id)).collect());
    await ctx.db.delete(wish._id);
  }

  // Rows that are simply theirs.
  for (const status of ["open", "selected", "withdrawn", "cancelled", "closed"] as const) {
    await deleteAll(
      ctx,
      await ctx.db
        .query("requests")
        .withIndex("by_requester_status", (q) => q.eq("requesterId", userId).eq("status", status))
        .collect(),
    );
  }
  await deleteAll(ctx, await ctx.db.query("shareGrants").withIndex("by_user_item", (q) => q.eq("userId", userId)).collect());
  for (const name of Object.keys(RATE_LIMITS) as RateLimitName[]) {
    await deleteAll(ctx, await ctx.db.query("rateLimits").withIndex("by_key", (q) => q.eq("key", `${name}:${userId}`)).collect());
  }
  await deleteAll(ctx, await ctx.db.query("itemShares").withIndex("by_sharer", (q) => q.eq("sharerId", userId)).collect());
  await deleteAll(ctx, await ctx.db.query("invites").withIndex("by_inviter", (q) => q.eq("inviterId", userId)).collect());
  await deleteAll(ctx, await ctx.db.query("events").withIndex("by_recipient", (q) => q.eq("recipientId", userId)).collect());
  for (const e of await ctx.db.query("events").withIndex("by_actor", (q) => q.eq("actorId", userId)).collect()) {
    await ctx.db.patch(e._id, { actorId: undefined });
  }
  await deleteAll(ctx, await ctx.db.query("blocks").withIndex("by_blocker_blocked", (q) => q.eq("blockerId", userId)).collect());
  await deleteAll(ctx, await ctx.db.query("blocks").withIndex("by_blocked", (q) => q.eq("blockedId", userId)).collect());
  await deleteAll(ctx, await ctx.db.query("reports").withIndex("by_reporter", (q) => q.eq("reporterId", userId)).collect());
  await deleteAll(ctx, await ctx.db.query("pushTokens").withIndex("by_user", (q) => q.eq("userId", userId)).collect());
  const profile = await getProfile(ctx, userId);
  if (profile) await ctx.db.delete(profile._id);

  // Convex Auth rows: sessions (and their refresh tokens), accounts, the user.
  for (const s of await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", userId)).collect()) {
    await deleteAll(ctx, await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", s._id)).collect());
    await ctx.db.delete(s._id);
  }
  for (const a of await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", userId)).collect()) {
    await deleteAll(ctx, await ctx.db.query("authVerificationCodes").withIndex("accountId", (q) => q.eq("accountId", a._id)).collect());
    await ctx.db.delete(a._id);
  }
  if (await ctx.db.get(userId)) await ctx.db.delete(userId);
}
