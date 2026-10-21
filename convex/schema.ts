import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Domi schema. See docs/spec.md ("Data model") for the meaning of each table.
// Status values are typed unions so a typo can't create a new state.

export const communityKind = v.union(v.literal("zip"), v.literal("custom"));
export const membershipRole = v.union(v.literal("owner"), v.literal("member"));
export const itemVisibility = v.union(v.literal("public"), v.literal("private"));
export const itemStatus = v.union(
  v.literal("available"),
  v.literal("pending"),
  v.literal("gone"),
  v.literal("expired"),
  v.literal("removed"),
);
export const wishStatus = v.union(v.literal("open"), v.literal("fulfilled"), v.literal("removed"));
export const requestStatus = v.union(
  v.literal("open"),
  v.literal("selected"),
  v.literal("withdrawn"),
  v.literal("cancelled"),
  v.literal("closed"),
);
export const reportTarget = v.union(
  v.literal("item"),
  v.literal("user"),
  v.literal("message"),
  v.literal("wishlist_item"),
);
export const reportStatus = v.union(v.literal("open"), v.literal("reviewed"), v.literal("dismissed"));
export const eventType = v.union(
  v.literal("request_created"),
  v.literal("picked"),
  v.literal("pending_elsewhere"),
  v.literal("unpicked"),
  v.literal("recipient_withdrew"),
  v.literal("picked_up"),
  v.literal("picked_up_elsewhere"),
  v.literal("item_removed"),
  v.literal("item_expired"),
  v.literal("request_expired"),
  v.literal("new_message"),
  v.literal("wish_offer"),
  v.literal("offer_picked"),
  v.literal("offer_unpicked"),
  v.literal("wish_closed"),
  v.literal("joined_via_invite"),
);

export default defineSchema({
  // Convex Auth: users, sessions, accounts, refresh tokens, etc.
  ...authTables,

  // Small key/value table for app-wide settings (e.g. minimum supported app version, terms version).
  appConfig: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  profiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    zip: v.string(),
    approxLat: v.number(),
    approxLng: v.number(),
    avatarStorageId: v.optional(v.id("_storage")), // unused in MVP
    termsVersion: v.string(),
    termsAcceptedAt: v.number(),
    bannedAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  zipCodes: defineTable({
    zip: v.string(),
    city: v.string(),
    state: v.string(),
    lat: v.number(),
    lng: v.number(),
  }).index("by_zip", ["zip"]),

  communities: defineTable({
    name: v.string(),
    emoji: v.string(),
    description: v.optional(v.string()),
    kind: communityKind,
    zip: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    memberCount: v.number(),
  }).index("by_kind_zip", ["kind", "zip"]),

  memberships: defineTable({
    communityId: v.id("communities"),
    userId: v.id("users"),
    role: membershipRole,
    invitedBy: v.optional(v.id("users")),
    inviteId: v.optional(v.id("invites")),
    muted: v.boolean(),
    joinedAt: v.number(),
  })
    .index("by_community_user", ["communityId", "userId"])
    .index("by_user", ["userId"])
    .index("by_community_joinedAt", ["communityId", "joinedAt"]),

  communityBans: defineTable({
    communityId: v.id("communities"),
    userId: v.id("users"),
  }).index("by_community_user", ["communityId", "userId"]),

  invites: defineTable({
    code: v.string(),
    communityId: v.id("communities"),
    inviterId: v.id("users"),
    revokedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_community_inviter", ["communityId", "inviterId"])
    .index("by_inviter", ["inviterId"]),

  items: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    description: v.string(),
    photos: v.array(v.id("_storage")),
    approxLat: v.number(),
    approxLng: v.number(),
    visibility: itemVisibility,
    wishlistItemId: v.optional(v.id("wishlistItems")),
    status: itemStatus,
    expiresAt: v.number(),
    updatedAt: v.number(),
    searchText: v.string(), // title + description, for the search index
    photosPurgedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_wishlistItem", ["wishlistItemId"])
    .index("by_status_expiresAt", ["status", "expiresAt"])
    .index("by_status_updatedAt", ["status", "updatedAt"])
    .searchIndex("search_text", { searchField: "searchText", filterFields: ["visibility"] }),

  itemCommunities: defineTable({
    itemId: v.id("items"),
    communityId: v.id("communities"),
  })
    .index("by_item", ["itemId"])
    .index("by_community", ["communityId"])
    .index("by_item_community", ["itemId", "communityId"]),

  itemShares: defineTable({
    itemId: v.id("items"),
    sharerId: v.id("users"),
    code: v.string(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_item", ["itemId"])
    .index("by_sharer", ["sharerId"]),

  shareGrants: defineTable({
    shareId: v.id("itemShares"),
    itemId: v.id("items"),
    userId: v.id("users"),
  })
    .index("by_user_item", ["userId", "itemId"])
    .index("by_item", ["itemId"])
    .index("by_share", ["shareId"]),

  wishlistItems: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: wishStatus,
  }).index("by_user", ["userId"]),

  wishlistCommunities: defineTable({
    wishlistItemId: v.id("wishlistItems"),
    communityId: v.id("communities"),
  })
    .index("by_wish", ["wishlistItemId"])
    .index("by_community", ["communityId"])
    .index("by_wish_community", ["wishlistItemId", "communityId"]),

  requests: defineTable({
    itemId: v.id("items"),
    requesterId: v.id("users"),
    note: v.optional(v.string()),
    status: requestStatus,
    updatedAt: v.number(),
  })
    .index("by_item", ["itemId"])
    .index("by_item_status", ["itemId", "status"])
    .index("by_item_requester", ["itemId", "requesterId"])
    .index("by_requester_status", ["requesterId", "status"]),

  conversations: defineTable({
    itemId: v.id("items"),
    requestId: v.id("requests"),
    ownerId: v.id("users"),
    recipientId: v.id("users"),
    closedAt: v.optional(v.number()),
    lastMessageAt: v.optional(v.number()),
  })
    .index("by_request", ["requestId"])
    .index("by_item", ["itemId"])
    .index("by_owner", ["ownerId"])
    .index("by_recipient", ["recipientId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
    readAt: v.optional(v.number()),
  }).index("by_conversation", ["conversationId"]),

  events: defineTable({
    recipientId: v.id("users"),
    type: eventType,
    actorId: v.optional(v.id("users")),
    itemId: v.optional(v.id("items")),
    requestId: v.optional(v.id("requests")),
    conversationId: v.optional(v.id("conversations")),
    wishlistItemId: v.optional(v.id("wishlistItems")),
    communityId: v.optional(v.id("communities")),
    title: v.string(),
    body: v.string(),
    readAt: v.optional(v.number()),
    pushedAt: v.optional(v.number()),
  })
    .index("by_recipient", ["recipientId"])
    .index("by_actor", ["actorId"]),

  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),

  reports: defineTable({
    reporterId: v.id("users"),
    targetType: reportTarget,
    targetId: v.string(),
    reason: v.string(),
    status: reportStatus,
  })
    .index("by_reporter", ["reporterId"])
    .index("by_status", ["status"]),

  blocks: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
  })
    .index("by_blocker_blocked", ["blockerId", "blockedId"])
    .index("by_blocked", ["blockedId"]),
});
