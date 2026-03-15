import { query } from "./_generated/server";
import { v } from "convex/values";

export const getVersionSchema = query({
  args: { contractId: v.id("contracts"), versionNumber: v.number() },
  handler: async (ctx, args) => {
    // This is a public query meant to be consumed by the Mock API Route
    // In a production app, we would add an API Key check here.

    const version = await ctx.db
      .query("versions")
      .withIndex("by_contractId_version", (q) => 
         q.eq("contractId", args.contractId).eq("versionNumber", args.versionNumber)
      )
      .first();

    if (!version) {
      return null;
    }

    return {
      schema: version.schema,
    };
  },
});
