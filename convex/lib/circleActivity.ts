import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { blockedUserIds, displayName, isBlockedEitherWay } from "./access";
import { writeEvent } from "./events";
import { isQuiet, nextMorning, sameLocalDay } from "./localTime";
import { DAY_MS } from "./validate";
import { matchesWish } from "./wishMatch";

// Circle activity pushes (docs/m5-requirements.md, R3): new listings and wishes
// in your circles. Welcome: 5 pushes per circle joined, each gathering a 3-hour
// window. Back-off: then 3, 7, 14, 30 days after your last open. Never at night,
// at most one a day, nothing if nothing's new. Each push is a circle_activity event.

export const WELCOME_PUSHES = 5;
export const ACTIVITY_WINDOW_MS = 3 * 60 * 60 * 1000;
export const BACKOFF_DAYS = [3, 7, 14, 30];

/** A listing or wish was just posted to these circles: wake up their members. */
export async function noteCircleActivity(ctx: MutationCtx, communityIds: Id<"communities">[], posterId: Id<"users">) {
  const now = Date.now();
  const windowEnd = now + ACTIVITY_WINDOW_MS;
  const seen = new Set<Id<"users">>();
  for (const communityId of communityIds) {
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_community_joinedAt", (q) => q.eq("communityId", communityId))
      .collect();
    for (const m of members) {
      if (m.userId === posterId || m.muted || seen.has(m.userId)) continue;
      seen.add(m.userId);
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", m.userId))
        .unique();
      if (!profile || profile.bannedAt !== undefined) continue;
      const welcome = (m.welcomePushesSent ?? 0) < WELCOME_PUSHES;
      const due = profile.activityDueAt;
      // Welcome activity pulls the check forward to the end of this window;
      // back-off activity only starts one if none is planned.
      if (due === undefined || (welcome && due > windowEnd)) {
        await ctx.db.patch(profile._id, { activityDueAt: windowEnd });
      }
    }
  }
}

type Found = {
  membership: Doc<"memberships">;
  community: Doc<"communities">;
  items: Doc<"items">[];
  wishes: Doc<"wishlistItems">[];
};

/** New, unseen listings and wishes from others in each of my unmuted circles. */
async function newActivity(ctx: MutationCtx, profile: Doc<"profiles">): Promise<Found[]> {
  const me = profile.userId;
  const blocked = await blockedUserIds(ctx, me);
  const sinceAll = Math.max(profile.lastOpenedAt ?? 0, profile.lastActivityPushAt ?? 0);
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", me))
    .collect();
  const counted = new Set<string>();
  const out: Found[] = [];
  for (const m of memberships) {
    if (m.muted) continue;
    const community = await ctx.db.get(m.communityId);
    if (!community) continue;
    const since = Math.max(sinceAll, m.joinedAt);
    const items: Doc<"items">[] = [];
    const itemLinks = await ctx.db
      .query("itemCommunities")
      .withIndex("by_community", (q) => q.eq("communityId", m.communityId).gt("_creationTime", since))
      .take(50);
    for (const l of itemLinks) {
      if (counted.has(l.itemId)) continue;
      const item = await ctx.db.get(l.itemId);
      if (!item || item.status !== "available" || item.visibility !== "public") continue;
      if (item.ownerId === me || blocked.has(item.ownerId)) continue;
      const asked = await ctx.db
        .query("requests")
        .withIndex("by_item_requester", (q) => q.eq("itemId", item._id).eq("requesterId", me))
        .first();
      if (asked) continue;
      counted.add(item._id);
      items.push(item);
    }
    const wishes: Doc<"wishlistItems">[] = [];
    const wishLinks = await ctx.db
      .query("wishlistCommunities")
      .withIndex("by_community", (q) => q.eq("communityId", m.communityId).gt("_creationTime", since))
      .take(50);
    for (const l of wishLinks) {
      if (counted.has(l.wishlistItemId)) continue;
      const wish = await ctx.db.get(l.wishlistItemId);
      if (!wish || wish.status !== "open" || wish.userId === me || blocked.has(wish.userId)) continue;
      counted.add(wish._id);
      wishes.push(wish);
    }
    if (items.length || wishes.length) out.push({ membership: m, community, items, wishes });
  }
  return out;
}

async function activityCopy(ctx: MutationCtx, found: Found[]) {
  const lead = found.find((f) => f.items.length) ?? found[0];
  const total = found.reduce((n, f) => n + f.items.length + f.wishes.length, 0);
  const more = total > 1 ? ` + ${total - 1} more` : "";
  const title = `${lead.community.emoji} ${lead.community.name}`;
  if (lead.items.length) {
    const item = lead.items[lead.items.length - 1]; // newest
    return { title, body: `New from ${await displayName(ctx, item.ownerId)}: ${item.title}${more}`, lead, itemId: item._id };
  }
  const wish = lead.wishes[lead.wishes.length - 1];
  const name = await displayName(ctx, wish.userId);
  return { title, body: `${name} wishes for: ${wish.title}. Have one?${more}`, lead, wishlistItemId: wish._id };
}

/** Looks at one person's circle activity now: push, wait, or stop. */
export async function processActivity(ctx: MutationCtx, profile: Doc<"profiles">, now: number) {
  const clear = () => ctx.db.patch(profile._id, { activityDueAt: undefined });
  const waitUntil = (at: number) => ctx.db.patch(profile._id, { activityDueAt: at });

  const found = await newActivity(ctx, profile);
  if (found.length === 0) return await clear();
  if (isQuiet(now, profile)) return await waitUntil(nextMorning(now, profile));
  if (profile.lastActivityPushAt !== undefined && sameLocalDay(profile.lastActivityPushAt, now, profile)) {
    return await waitUntil(nextMorning(now, profile));
  }

  const welcome = found.filter((f) => (f.membership.welcomePushesSent ?? 0) < WELCOME_PUSHES);
  let patch: Partial<Doc<"profiles">> = {};
  let send = found;
  if (welcome.length) {
    send = [...welcome, ...found.filter((f) => !welcome.includes(f))];
    for (const f of welcome) {
      await ctx.db.patch(f.membership._id, { welcomePushesSent: (f.membership.welcomePushesSent ?? 0) + 1 });
    }
  } else {
    const step = profile.backoffSent ?? 0;
    if (step >= BACKOFF_DAYS.length) return await clear(); // they've gone quiet; stop until they open the app
    const anchor = profile.lastOpenedAt ?? profile._creationTime;
    const eligible = anchor + BACKOFF_DAYS[step] * DAY_MS;
    if (now < eligible) return await waitUntil(eligible);
    patch = { backoffSent: step + 1 };
  }

  const copy = await activityCopy(ctx, send);
  await writeEvent(ctx, {
    recipientId: profile.userId,
    type: "circle_activity",
    communityId: copy.lead.community._id,
    itemId: copy.itemId,
    wishlistItemId: copy.wishlistItemId,
    title: copy.title,
    body: copy.body,
  });
  await ctx.db.patch(profile._id, { ...patch, lastActivityPushAt: now, activityDueAt: undefined });
}

/** A new public listing: tell anyone in its circles whose open wish it matches. */
export async function notifyWishMatches(ctx: MutationCtx, item: Doc<"items">, communityIds: Id<"communities">[]) {
  const told = new Set<Id<"users">>([item.ownerId]);
  let poster: string | null = null;
  for (const communityId of communityIds) {
    const links = await ctx.db
      .query("wishlistCommunities")
      .withIndex("by_community", (q) => q.eq("communityId", communityId))
      .order("desc")
      .take(200);
    for (const l of links) {
      const wish = await ctx.db.get(l.wishlistItemId);
      if (!wish || wish.status !== "open" || told.has(wish.userId)) continue;
      if (!matchesWish(item.title, wish.title)) continue;
      if (await isBlockedEitherWay(ctx, wish.userId, item.ownerId)) continue;
      told.add(wish.userId);
      poster ??= await displayName(ctx, item.ownerId);
      await writeEvent(ctx, {
        recipientId: wish.userId,
        type: "wish_match",
        actorId: item.ownerId,
        itemId: item._id,
        wishlistItemId: wish._id,
        communityId,
        title: `Matches your wish: ${wish.title}`,
        body: `${poster} posted ${item.title}`,
      });
    }
  }
}
