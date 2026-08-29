import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    userId: v.optional(v.string()), // Our new field
    createdBy: v.optional(v.string()), // Existing field
    description: v.optional(v.string()), // Existing field
  }),
  
  contracts: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    path: v.string(), // e.g., "/users"
    isDisabled: v.optional(v.boolean()), // For toggling mock endpoints off
  }).index("by_projectId", ["projectId"]),
  
  versions: defineTable({
    contractId: v.id("contracts"),
    versionNumber: v.number(),
    schema: v.string(), // JSON string representation of the schema
    breakingChanges: v.optional(
      v.array(
        v.object({
          type: v.string(), // e.g., "type_changed", "required_added"
          path: v.string(), // JSON path
          message: v.string(),
        })
      )
    ),
  }).index("by_contractId", ["contractId"])
    .index("by_contractId_version", ["contractId", "versionNumber"]),

  // One row per request that reaches a mock endpoint. Deliberately stores no
  // request or response bodies — only the metadata needed to answer "why did my
  // frontend get a 400?" — so a log row can never leak payload contents.
  requestLogs: defineTable({
    contractId: v.id("contracts"),
    method: v.string(),
    versionNumber: v.number(),
    status: v.number(),
    durationMs: v.number(),
    query: v.optional(v.string()),   // raw query string, e.g. "count=5&seed=demo"
    error: v.optional(v.string()),   // short reason for a non-2xx, truncated
  }).index("by_contractId", ["contractId"]),
  // Shared, cross-instance rate-limit counters for the public mock API route.
  // Replaces the old in-memory Map so the "100 req/IP/60s" limit actually
  // holds once the route is deployed across multiple serverless instances.
  rateLimitCounters: defineTable({
    ip: v.string(),
    windowStart: v.number(), // ms epoch of the start of the current 60s window
    count: v.number(),
  }).index("by_ip", ["ip"]),
});
