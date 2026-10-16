import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Domi schema. Tables from docs/spec.md are added milestone by milestone.
export default defineSchema({
  // Small key/value table for app-wide settings (e.g. minimum supported app
  // version). In M0 it exists so the app can prove it reads from the backend.
  appConfig: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
