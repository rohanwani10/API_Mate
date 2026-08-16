import { mutation } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Shared rate-limit counter for the public mock API route
// (app/api/mock/[contractId]/[version]/[...path]/route.ts).
//
// This lives in Convex (rather than an in-memory Map inside the Next.js
// route) so the "100 requests / IP / 60s" limit actually holds once the
// route is deployed across multiple serverless instances — an in-memory
// counter is per-process and silently stops enforcing anything the moment
// there is more than one instance handling traffic.
//
// Convex mutations are serialized per document via optimistic concurrency
// control, so concurrent calls for the same `ip` cannot both read the same
// stale counter and both "win" — this makes the increment-and-check below
// effectively atomic.
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 100;

export const checkAndIncrement = mutation({
  args: { ip: v.string() },
  handler: async (ctx, args) => {
    // Server-side clock only — never trust a client-supplied timestamp here.
    const now = Date.now();

    const existing = await ctx.db
      .query("rateLimitCounters")
      .withIndex("by_ip", (q) => q.eq("ip", args.ip))
      .first();

    // No record yet, or the previous window has fully elapsed: start fresh.
    if (!existing || now - existing.windowStart >= RATE_LIMIT_WINDOW_MS) {
      if (existing) {
        await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
      } else {
        await ctx.db.insert("rateLimitCounters", {
          ip: args.ip,
          windowStart: now,
          count: 1,
        });
      }
      return { allowed: true };
    }

    if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
      return { allowed: false };
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { allowed: true };
  },
});
