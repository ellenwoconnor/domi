import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { displayName, requireProfile } from "./lib/access";
import { photoUrls } from "./lib/cards";
import { DAY_MS } from "./lib/validate";

// The "My stuff" tab: one row per thing you're giving or getting, each with a
// single plain status line. Rows that need you sort first; recent endings
// (picked up, went to someone else) show for a few days at the bottom, then
// drop off. See "My stuff" in docs/spec.md.

const RECENT_MS = 3 * DAY_MS;

export type StuffRow = {
  key: string;
  kind: "item" | "wish";
  title: string;
  subtitle: string | null; // e.g. "your wish"
  photoUrl: string | null;
  status: string;
  needsYou: boolean;
  ended: boolean;
  itemId: Id<"items"> | null;
  wishId: Id<"wishlistItems"> | null;
  conversationId: Id<"conversations"> | null;
  at: number;
};

async function openConversation(ctx: QueryCtx, requestId: Id<"requests">) {
  const convs = await ctx.db
    .query("conversations")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .collect();
  return convs.find((c) => c.closedAt === undefined) ?? null;
}

async function chatState(ctx: QueryCtx, conv: Doc<"conversations"> | null, me: Id<"users">) {
  if (!conv) return { unread: 0, iSpoke: false };
  const msgs = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
    .collect();
  return {
    unread: msgs.filter((m) => m.senderId !== me && m.readAt === undefined).length,
    iSpoke: msgs.some((m) => m.senderId === me),
  };
}

const people = (n: number) => (n === 1 ? "1 person asked." : `${n} people asked.`);

function sortRows(rows: StuffRow[]) {
  return rows.sort((a, b) => {
    if (a.ended !== b.ended) return a.ended ? 1 : -1;
    if (a.needsYou !== b.needsYou) return a.needsYou ? -1 : 1;
    return b.at - a.at;
  });
}

export async function givingRows(ctx: QueryCtx, userId: Id<"users">): Promise<StuffRow[]> {
  const now = Date.now();
  const items = await ctx.db
    .query("items")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();
  const rows: StuffRow[] = [];
  for (const item of items) {
    if (item.status === "removed") continue;
    if (item.status === "gone" && now - item.updatedAt > RECENT_MS) continue;

    const open = await ctx.db
      .query("requests")
      .withIndex("by_item_status", (q) => q.eq("itemId", item._id).eq("status", "open"))
      .collect();
    const selected = await ctx.db
      .query("requests")
      .withIndex("by_item_status", (q) => q.eq("itemId", item._id).eq("status", "selected"))
      .first();
    const recipient = selected ? await displayName(ctx, selected.requesterId) : null;
    const conv = selected ? await openConversation(ctx, selected._id) : null;
    const chat = await chatState(ctx, conv, userId);
    const offerFor =
      item.visibility === "private" && item.wishlistItemId ? await ctx.db.get(item.wishlistItemId) : null;

    let status: string;
    let needsYou = false;
    let ended = false;
    if (item.status === "available") {
      if (offerFor) status = `Offered for ${await displayName(ctx, offerFor.userId)}'s wish. Waiting for them to choose.`;
      else if (open.length > 0) {
        status = `${people(open.length)} Choose one.`;
        needsYou = true;
      } else status = "No requests yet";
    } else if (item.status === "pending") {
      if (chat.unread > 0) {
        status = `New message from ${recipient}`;
        needsYou = true;
      } else status = `Going to ${recipient}`;
    } else if (item.status === "expired") {
      status = "Expired. Tap to post again.";
    } else {
      status = recipient ? `Picked up by ${recipient}` : "Picked up";
      ended = true;
    }

    rows.push({
      key: `item:${item._id}`,
      kind: "item",
      title: item.title,
      subtitle: offerFor ? "an offer" : null,
      photoUrl: (await photoUrls(ctx, item))[0] ?? null,
      status,
      needsYou,
      ended,
      itemId: item._id,
      wishId: null,
      conversationId: conv?._id ?? null,
      at: item.updatedAt,
    });
  }
  return sortRows(rows);
}

export async function gettingRows(ctx: QueryCtx, userId: Id<"users">): Promise<StuffRow[]> {
  const now = Date.now();
  const rows: StuffRow[] = [];
  const offerItemsWithMyPick = new Set<Id<"wishlistItems">>();

  for (const status of ["selected", "open", "closed", "cancelled"] as const) {
    const reqs = await ctx.db
      .query("requests")
      .withIndex("by_requester_status", (q) => q.eq("requesterId", userId).eq("status", status))
      .collect();
    for (const r of reqs) {
      const item = await ctx.db.get(r.itemId);
      if (!item) continue;
      const owner = await displayName(ctx, item.ownerId);
      let line: string;
      let needsYou = false;
      let ended = false;
      let conv: Doc<"conversations"> | null = null;

      if (status === "selected") {
        if (item.wishlistItemId) offerItemsWithMyPick.add(item.wishlistItemId);
        if (item.status === "gone") {
          if (now - item.updatedAt > RECENT_MS) continue;
          line = "Picked up. Enjoy!";
          ended = true;
        } else {
          conv = await openConversation(ctx, r._id);
          const chat = await chatState(ctx, conv, userId);
          if (chat.unread > 0) {
            line = `New message from ${owner}`;
            needsYou = true;
          } else if (!chat.iSpoke) {
            line = `${owner} chose you. Reply to plan pickup.`;
            needsYou = true;
          } else line = `Pickup with ${owner}`;
        }
      } else if (status === "open") {
        if (item.status === "available") line = `You asked. ${owner} hasn't chosen yet.`;
        else if (item.status === "pending") line = "You asked. It's on hold for someone else.";
        else if (item.status === "expired") line = "You asked. The listing has expired.";
        else continue;
      } else {
        // Endings: shown briefly, gently, then gone.
        if (now - r.updatedAt > RECENT_MS) continue;
        line = item.status === "gone" ? "Went to someone else" : "No longer available";
        ended = true;
      }

      rows.push({
        key: `req:${r._id}`,
        kind: "item",
        title: item.title,
        subtitle: null,
        photoUrl: (await photoUrls(ctx, item))[0] ?? null,
        status: line,
        needsYou,
        ended,
        itemId: item._id,
        wishId: null,
        conversationId: conv?._id ?? null,
        at: r.updatedAt,
      });
    }
  }

  const wishes = await ctx.db
    .query("wishlistItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const wish of wishes) {
    if (wish.status !== "open" || offerItemsWithMyPick.has(wish._id)) continue;
    const offers = (
      await ctx.db
        .query("items")
        .withIndex("by_wishlistItem", (q) => q.eq("wishlistItemId", wish._id))
        .collect()
    ).filter((o) => o.status === "available");
    rows.push({
      key: `wish:${wish._id}`,
      kind: "wish",
      title: wish.title,
      subtitle: "your wish",
      photoUrl: null,
      status:
        offers.length === 0
          ? "No offers yet"
          : offers.length === 1
            ? "1 neighbor offered one"
            : `${offers.length} neighbors offered one`,
      needsYou: offers.length > 0,
      ended: false,
      itemId: null,
      wishId: wish._id,
      conversationId: null,
      at: wish._creationTime,
    });
  }
  return sortRows(rows);
}

export const giving = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    return await givingRows(ctx, userId);
  },
});

export const getting = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    return await gettingRows(ctx, userId);
  },
});

/** For the tab dots: how many rows need you on each side. */
export const needsYou = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const giving = (await givingRows(ctx, userId)).filter((r) => r.needsYou).length;
    const getting = (await gettingRows(ctx, userId)).filter((r) => r.needsYou).length;
    return { giving, getting, total: giving + getting };
  },
});
