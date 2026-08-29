import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getVersionSchema = query({
  args: { contractId: v.id("contracts"), versionNumber: v.number() },
  handler: async (ctx, args) => {
    // This is a public query meant to be consumed by the Mock API Route
    // In a production app, we would add an API Key check here.

    const contract = await ctx.db.get(args.contractId);
    if (!contract) return null;
    
    if (contract.isDisabled) {
      return { isDisabled: true, schema: "{}" };
    }

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
      isDisabled: false
    };
  },
});

// Keeps a contract's log to its most recent MAX_LOGS_PER_CONTRACT rows.
const MAX_LOGS_PER_CONTRACT = 100;

/**
 * Records one mock-endpoint request.
 *
 * Public and unauthenticated because it is called from the mock route, which
 * serves anonymous traffic by design. Abuse is bounded on three sides: the
 * route rate-limits to 100 req/IP/60s, an unknown contractId is dropped rather
 * than inserted, and each insert trims the contract back to the newest
 * MAX_LOGS_PER_CONTRACT rows — so storage per contract is capped regardless of
 * traffic. No bodies or headers are stored.
 */
export const logRequest = mutation({
  args: {
    contractId: v.id("contracts"),
    method: v.string(),
    versionNumber: v.number(),
    status: v.number(),
    durationMs: v.number(),
    query: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const contract = await ctx.db.get(args.contractId);
    if (!contract) return null;

    await ctx.db.insert("requestLogs", {
      ...args,
      query: args.query?.slice(0, 300) || undefined,
      error: args.error?.slice(0, 300) || undefined,
    });

    // Because rows are added one at a time, dropping a single row whenever the
    // window overflows is enough to hold the cap — O(1) amortised, no cron.
    const window = await ctx.db
      .query("requestLogs")
      .withIndex("by_contractId", (q) => q.eq("contractId", args.contractId))
      .order("desc")
      .take(MAX_LOGS_PER_CONTRACT + 1);

    if (window.length > MAX_LOGS_PER_CONTRACT) {
      await ctx.db.delete(window[window.length - 1]._id);
    }

    return null;
  },
});
