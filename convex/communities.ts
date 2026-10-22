import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  blockedUserIds,
  displayName,
  fail,
  getProfile,
  requireCircleOwner,
  requireMember,
  requireProfile,
} from "./lib/access";
import { addMembership, deleteCircleRows, leaveCommunity, previewLeave } from "./lib/circles";
import { cleanEmoji, cleanOptionalText, cleanText, LIMITS } from "./lib/validate";

/** Circles I'm in. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const out = [];
    for (const m of memberships) {
      const c = await ctx.db.get(m.communityId);
      if (!c) continue;
      out.push({
        id: c._id,
        name: c.name,
        emoji: c.emoji,
        description: c.description ?? null,
        kind: c.kind,
        memberCount: c.memberCount,
        role: m.role,
        muted: m.muted,
      });
    }
    // Zip circle first, then custom circles by name.
    return out.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "zip" ? -1 : 1));
  },
});

export const get = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, { communityId }) => {
    const { userId } = await requireProfile(ctx);
    const m = await requireMember(ctx, communityId, userId);
    const c = (await ctx.db.get(communityId))!;
    // The current owner (ownership passes on if the founder leaves).
    const owner =
      c.kind === "custom"
        ? (
            await ctx.db
              .query("memberships")
              .withIndex("by_community_joinedAt", (q) => q.eq("communityId", communityId))
              .collect()
          ).find((x) => x.role === "owner")
        : undefined;
    return {
      id: c._id,
      startedBy: owner ? (owner.userId === userId ? "you" : await displayName(ctx, owner.userId)) : null,
      name: c.name,
      emoji: c.emoji,
      description: c.description ?? null,
      kind: c.kind,
      memberCount: c.memberCount,
      role: m.role,
      muted: m.muted,
    };
  },
});

/** Member list (people you've blocked, or who blocked you, are left out). */
export const members = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, { communityId }) => {
    const { userId } = await requireProfile(ctx);
    await requireMember(ctx, communityId, userId);
    const blocked = await blockedUserIds(ctx, userId);
    const rows = await ctx.db
      .query("memberships")
      .withIndex("by_community_joinedAt", (q) => q.eq("communityId", communityId))
      .collect();
    const out = [];
    for (const m of rows) {
      if (blocked.has(m.userId)) continue;
      const p = await getProfile(ctx, m.userId);
      if (!p) continue;
      out.push({ userId: m.userId, displayName: p.displayName, role: m.role, joinedAt: m.joinedAt, isMe: m.userId === userId });
    }
    return out;
  },
});

export const create = mutation({
  args: { name: v.string(), emoji: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const id = await ctx.db.insert("communities", {
      name: cleanText(args.name, "Name", LIMITS.circleName),
      emoji: cleanEmoji(args.emoji),
      description: cleanOptionalText(args.description, "Description", LIMITS.circleDescription),
      kind: "custom",
      createdBy: userId,
      memberCount: 0,
    });
    await addMembership(ctx, (await ctx.db.get(id))!, userId, { role: "owner" });
    return id;
  },
});

/** Owner edits name, emoji or description. */
export const update = mutation({
  args: {
    communityId: v.id("communities"),
    name: v.optional(v.string()),
    emoji: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const { community } = await requireCircleOwner(ctx, args.communityId, userId);
    if (community.kind !== "custom") fail("Zip circles can't be edited");
    await ctx.db.patch(community._id, {
      ...(args.name !== undefined ? { name: cleanText(args.name, "Name", LIMITS.circleName) } : {}),
      ...(args.emoji !== undefined ? { emoji: cleanEmoji(args.emoji) } : {}),
      ...(args.description !== undefined
        ? { description: cleanOptionalText(args.description, "Description", LIMITS.circleDescription) }
        : {}),
    });
  },
});

export const setMuted = mutation({
  args: { communityId: v.id("communities"), muted: v.boolean() },
  handler: async (ctx, { communityId, muted }) => {
    const { userId } = await requireProfile(ctx);
    const m = await requireMember(ctx, communityId, userId);
    await ctx.db.patch(m._id, { muted });
  },
});

/** What leaving would cancel, for a confirmation sheet. */
export const previewLeaving = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, { communityId }) => {
    const { userId } = await requireProfile(ctx);
    await requireMember(ctx, communityId, userId);
    return await previewLeave(ctx, userId, communityId);
  },
});

export const leave = mutation({
  args: { communityId: v.id("communities") },
  handler: async (ctx, { communityId }) => {
    const { userId } = await requireProfile(ctx);
    await requireMember(ctx, communityId, userId);
    const c = (await ctx.db.get(communityId))!;
    if (c.kind === "zip") fail("To leave your zip circle, change your zip code");
    await leaveCommunity(ctx, userId, communityId);
  },
});

/** Owner removes a member. They can't rejoin through an invite. */
export const removeMember = mutation({
  args: { communityId: v.id("communities"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const { community } = await requireCircleOwner(ctx, args.communityId, userId);
    if (community.kind !== "custom") fail("Zip circles have no owner");
    if (args.userId === userId) fail("Use Leave to leave your own circle");
    await requireMember(ctx, args.communityId, args.userId);
    await leaveCommunity(ctx, args.userId, args.communityId);
    await ctx.db.insert("communityBans", { communityId: args.communityId, userId: args.userId });
  },
});

/** Owner deletes the circle. Everyone leaves it, with the usual cleanup. */
export const deleteCircle = mutation({
  args: { communityId: v.id("communities") },
  handler: async (ctx, { communityId }) => {
    const { userId } = await requireProfile(ctx);
    const { community } = await requireCircleOwner(ctx, communityId, userId);
    if (community.kind !== "custom") fail("Zip circles can't be deleted");
    const members = await ctx.db
      .query("memberships")
      .withIndex("by_community_joinedAt", (q) => q.eq("communityId", communityId))
      .collect();
    for (const m of members) await leaveCommunity(ctx, m.userId, communityId, { deletingCircle: true });
    await deleteCircleRows(ctx, communityId);
  },
});
