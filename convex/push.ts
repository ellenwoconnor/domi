import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalMutation, type ActionCtx, type MutationCtx } from "./_generated/server";

// Sends pushes for events (lib/events.ts sets pushDueAt and schedules flush).
// claim runs in a mutation, so two flushes can never send the same push.
// Expo push API: https://docs.expo.dev/push-notifications/sending-notifications/

const EXPO_SEND = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS = "https://exp.host/--/api/v2/push/getReceipts";
const BATCH = 100; // Expo's limit per request
const RECEIPT_DELAY_MS = 15 * 60 * 1000;

type Message = {
  to: string;
  title?: string;
  body: string;
  data: Record<string, unknown>;
  sound: "default";
  channelId: "default";
};

/** What a tap should open. The app routes on `data.open`. */
function tapTarget(e: Doc<"events">): Record<string, unknown> {
  const base = { eventId: e._id, type: e.type };
  switch (e.type) {
    case "new_message":
    case "picked":
    case "offer_picked":
      return e.conversationId
        ? { ...base, open: "chat", conversationId: e.conversationId }
        : { ...base, open: "item", itemId: e.itemId };
    case "wish_offer":
      return { ...base, open: "wish", wishlistItemId: e.wishlistItemId };
    case "circle_activity":
      return { ...base, open: "browse", tab: e.itemId ? "offers" : "wishes", communityId: e.communityId };
    default:
      return { ...base, open: "item", itemId: e.itemId };
  }
}

function clip(s: string, max = 140) {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
}

/** The copy for a chat push: the latest text, or a count. Null if they've read everything. */
async function messageCopy(ctx: MutationCtx, e: Doc<"events">) {
  if (!e.conversationId) return null;
  const earlier = await ctx.db
    .query("events")
    .withIndex("by_recipient_conversation", (q) =>
      q.eq("recipientId", e.recipientId).eq("conversationId", e.conversationId),
    )
    .order("desc")
    .take(50);
  const lastPush = earlier.find((x) => x._id !== e._id && x.type === "new_message" && x.pushResult === "sent");
  const since = lastPush?.pushedAt ?? 0;
  const msgs = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) => q.eq("conversationId", e.conversationId!))
    .order("desc")
    .take(50);
  const unread = msgs.filter((m) => m._creationTime > since && m.senderId !== e.recipientId && m.readAt === undefined);
  if (unread.length === 0) return null;
  const latest = clip(unread[0].body);
  return { title: e.title, body: unread.length === 1 ? latest : `${unread.length} new messages: ${latest}` };
}

/** Claims due events, builds their messages and marks them handled. */
export const claim = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("events")
      .withIndex("by_pushDueAt", (q) => q.gte("pushDueAt", 0).lte("pushDueAt", now))
      .take(BATCH);
    const messages: Message[] = [];
    for (const e of due) {
      let copy: { title?: string; body: string } | null = { title: e.title, body: e.body };
      if (e.type === "new_message") copy = await messageCopy(ctx, e);
      const tokens = copy
        ? await ctx.db
            .query("pushTokens")
            .withIndex("by_user", (q) => q.eq("userId", e.recipientId))
            .collect()
        : [];
      const result = !copy ? "skipped" : tokens.length === 0 ? "no_device" : "sent";
      await ctx.db.patch(e._id, { pushDueAt: undefined, pushedAt: now, pushResult: result });
      if (!copy) continue;
      for (const t of tokens) {
        messages.push({ to: t.token, title: copy.title, body: copy.body, data: tapTarget(e), sound: "default", channelId: "default" });
      }
    }

    // What's next: more due now (flush loops), something later (schedule it), or nothing.
    const next = await ctx.db
      .query("events")
      .withIndex("by_pushDueAt", (q) => q.gte("pushDueAt", 0))
      .first();
    const more = next !== null && next.pushDueAt! <= now;
    const state = await ctx.db.query("pushState").first();
    const flushAt = next && !more ? next.pushDueAt : undefined;
    if (state) await ctx.db.patch(state._id, { flushAt });
    else await ctx.db.insert("pushState", { flushAt });
    if (flushAt !== undefined) await ctx.scheduler.runAt(flushAt, internal.push.flush, {});
    return { messages, more };
  },
});

type Ticket = { status: "ok"; id: string } | { status: "error"; message?: string; details?: { error?: string } };

async function expoPost(url: string, body: unknown): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const token = process.env.EXPO_ACCESS_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Expo push ${res.status}: ${await res.text()}`);
  return await res.json();
}

export const flush = internalAction({
  args: {},
  handler: async (ctx) => {
    for (let round = 0; round < 20; round++) {
      const { messages, more } = await ctx.runMutation(internal.push.claim, {});
      for (let i = 0; i < messages.length; i += BATCH) await send(ctx, messages.slice(i, i + BATCH));
      if (!more) return;
    }
    await ctx.scheduler.runAfter(0, internal.push.flush, {}); // a very big backlog: keep going in a new run
  },
});

async function send(ctx: ActionCtx, batch: Message[]) {
  if (batch.length === 0) return;
  let tickets: Ticket[];
  try {
    tickets = (await expoPost(EXPO_SEND, batch)).data ?? [];
  } catch (err) {
    console.error("push send failed", err);
    return;
  }
  const dead: string[] = [];
  const receipts: { id: string; token: string }[] = [];
  tickets.forEach((t, i) => {
    if (t.status === "ok") receipts.push({ id: t.id, token: batch[i].to });
    else if (t.details?.error === "DeviceNotRegistered") dead.push(batch[i].to);
    else console.warn("push error", t.message, t.details?.error);
  });
  if (dead.length) await ctx.runMutation(internal.push.removeTokens, { tokens: dead });
  if (receipts.length) await ctx.scheduler.runAfter(RECEIPT_DELAY_MS, internal.push.checkReceipts, { receipts });
}

export const checkReceipts = internalAction({
  args: { receipts: v.array(v.object({ id: v.string(), token: v.string() })) },
  handler: async (ctx, { receipts }) => {
    const byId = new Map(receipts.map((r) => [r.id, r.token]));
    const dead: string[] = [];
    for (let i = 0; i < receipts.length; i += 300) {
      const ids = receipts.slice(i, i + 300).map((r) => r.id);
      let data: Record<string, Ticket>;
      try {
        data = (await expoPost(EXPO_RECEIPTS, { ids })).data ?? {};
      } catch (err) {
        console.error("push receipts failed", err);
        continue;
      }
      for (const [id, r] of Object.entries(data)) {
        if (r.status === "error" && r.details?.error === "DeviceNotRegistered") dead.push(byId.get(id)!);
        else if (r.status === "error") console.warn("push receipt error", r.message, r.details?.error);
      }
    }
    if (dead.length) await ctx.runMutation(internal.push.removeTokens, { tokens: dead });
  },
});

export const removeTokens = internalMutation({
  args: { tokens: v.array(v.string()) },
  handler: async (ctx, { tokens }) => {
    for (const token of tokens) {
      const rows = await ctx.db
        .query("pushTokens")
        .withIndex("by_token", (q) => q.eq("token", token))
        .collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }
  },
});

