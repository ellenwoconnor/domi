import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

// The only way events are written. Events whose type pushes (PUSH_TYPES) get a
// pushDueAt and a scheduled push.flush, so pushes and My stuff never disagree.
// See docs/m5-requirements.md.

export type EventInput = Omit<
  Doc<"events">,
  "_id" | "_creationTime" | "readAt" | "pushDueAt" | "pushedAt" | "pushResult" | "openedAt"
>;
export type EventType = Doc<"events">["type"];

/** Events with something to do. The rest are recorded for My stuff only. */
export const PUSH_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  "request_created",
  "recipient_withdrew",
  "item_expired",
  "picked",
  "unpicked",
  "new_message",
  "wish_offer",
  "offer_picked",
  "offer_unpicked",
  "wish_match",
  "circle_activity",
]);

/** Chat messages within this long of the last push fold into one push. */
export const MESSAGE_MERGE_MS = 2 * 60 * 1000;

export async function writeEvent(ctx: MutationCtx, event: EventInput) {
  if (event.actorId !== undefined && event.actorId === event.recipientId) return; // never notify yourself
  if (!PUSH_TYPES.has(event.type)) {
    await ctx.db.insert("events", event);
    return;
  }
  const now = Date.now();
  let dueAt: number | undefined = now;
  if (event.type === "new_message" && event.conversationId) {
    dueAt = await messagePushDue(ctx, event, now);
  }
  await ctx.db.insert("events", { ...event, pushDueAt: dueAt });
  if (dueAt !== undefined) await queueFlush(ctx, dueAt);
}

/**
 * When the push for a new chat message goes out, or undefined when an earlier
 * message's push (still waiting) will cover it.
 */
async function messagePushDue(ctx: MutationCtx, event: EventInput, now: number) {
  const recent = await ctx.db
    .query("events")
    .withIndex("by_recipient_conversation", (q) =>
      q.eq("recipientId", event.recipientId).eq("conversationId", event.conversationId),
    )
    .order("desc")
    .take(20);
  const messages = recent.filter((e) => e.type === "new_message");
  if (messages.some((e) => e.pushDueAt !== undefined)) return undefined; // one is already waiting
  const lastPushed = messages.find((e) => e.pushedAt !== undefined && e.pushResult === "sent");
  if (lastPushed?.pushedAt !== undefined && now - lastPushed.pushedAt < MESSAGE_MERGE_MS) {
    return lastPushed.pushedAt + MESSAGE_MERGE_MS;
  }
  return now;
}

/** Makes sure a push.flush runs at or before `dueAt`. */
export async function queueFlush(ctx: MutationCtx, dueAt: number) {
  const state = await ctx.db.query("pushState").first();
  // A marker more than a minute old means that flush died; schedule a new one.
  const pending = state?.flushAt !== undefined && state.flushAt > Date.now() - 60_000;
  if (pending && state!.flushAt! <= dueAt) return;
  if (state) await ctx.db.patch(state._id, { flushAt: dueAt });
  else await ctx.db.insert("pushState", { flushAt: dueAt });
  await ctx.scheduler.runAt(dueAt, internal.push.flush, {});
}
