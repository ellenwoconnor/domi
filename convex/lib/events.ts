import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

// The only way events are written. Push (M5) will hook in here: inserting an
// event schedules sendPush, so pushes and the Activity tab never disagree.

export type EventInput = Omit<Doc<"events">, "_id" | "_creationTime" | "readAt" | "pushedAt">;

export async function writeEvent(ctx: MutationCtx, event: EventInput) {
  if (event.actorId !== undefined && event.actorId === event.recipientId) return; // never notify yourself
  await ctx.db.insert("events", event);
}
