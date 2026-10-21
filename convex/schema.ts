import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Domi schema. Tables from docs/spec.md are added milestone by milestone.
export default defineSchema({
  // Convex Auth: users, sessions, accounts, refresh tokens, etc.
  ...authTables,

  // Small key/value table for app-wide settings (e.g. minimum supported app version).
  appConfig: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
