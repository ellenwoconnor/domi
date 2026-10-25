/// <reference types="vite/client" />
// Test helpers (the double dot keeps Convex from deploying this file).
import { convexTest } from "convex-test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

export const TERMS = "2026-10-24";

export async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.init.default, {});
  return t;
}

export type T = Awaited<ReturnType<typeof setup>>;

export async function newUser(
  t: T,
  name: string,
  { zip = "94610", inviteCodes, shareCodes }: { zip?: string; inviteCodes?: string[]; shareCodes?: string[] } = {},
) {
  const userId = await t.run((ctx) => ctx.db.insert("users", { name }));
  const as = t.withIdentity({ subject: `${userId}|session-${name}` });
  const signup = await as.mutation(api.profiles.completeSignup, {
    displayName: name,
    zip,
    termsVersion: TERMS,
    inviteCodes,
    shareCodes,
  });
  return { userId, as, zipCircle: signup.zipCommunityId, signup };
}

export type U = Awaited<ReturnType<typeof newUser>>;

export async function photo(t: T): Promise<Id<"_storage">> {
  return await t.run((ctx) => ctx.storage.store(new Blob(["jpeg bytes"], { type: "image/jpeg" })));
}

export async function post(t: T, user: U, communityIds: Id<"communities">[], title = "Crib") {
  return await user.as.mutation(api.items.create, {
    title,
    description: `A ${title.toLowerCase()} in good shape`,
    photos: [await photo(t)],
    communityIds,
  });
}

export async function circle(owner: U, name = "Baby Shower", emoji = "🍼") {
  return await owner.as.mutation(api.communities.create, { name, emoji });
}

/** Adds `user` to a custom circle through `inviter`'s link. */
export async function invite(inviter: U, user: U, communityId: Id<"communities">) {
  const code = await inviter.as.mutation(api.invites.getOrCreate, { communityId });
  const result = await user.as.mutation(api.invites.redeem, { code });
  if (!result.ok) throw new Error(`invite failed: ${result.reason}`);
}

export async function eventsFor(t: T, userId: Id<"users">) {
  return await t.run((ctx) =>
    ctx.db
      .query("events")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .collect(),
  );
}

export async function doc<TableName extends "items" | "requests" | "conversations" | "wishlistItems">(
  t: T,
  id: Id<TableName>,
) {
  return await t.run((ctx) => ctx.db.get(id));
}
