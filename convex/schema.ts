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
});
