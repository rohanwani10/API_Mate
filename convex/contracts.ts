import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  BreakingChange,
  detectBreakingChanges,
  findUnsafeSchemaPatterns,
  getSchemaDepth,
  isDeepEqualIgnoringKeyOrder,
  MAX_SCHEMA_DEPTH,
  MAX_SCHEMA_LENGTH,
} from "./utils";

// Shared publish path used by both createVersion and restoreVersion: looks
// up the latest version for a contract, computes the next version number,
// runs breaking-change detection against the latest version, and inserts
// the new versions row. createVersion runs its own pre-checks (JSON parse
// validation, object-type check, safety limits, and the "no schema changes
// detected" no-op guard) before calling this — those are specific to
// publishing a hand-edited schema and don't apply to a restore, which
// simply republishes an already-validated, previously-stored schema.
async function insertNewVersion(
  ctx: MutationCtx,
  contractId: Id<"contracts">,
  schemaString: string
) {
  const latestVersion = await ctx.db
    .query("versions")
    .withIndex("by_contractId", (q) => q.eq("contractId", contractId))
    .order("desc")
    .first();

  const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  let breakingChanges: BreakingChange[] = [];
  if (latestVersion) {
    breakingChanges = detectBreakingChanges(latestVersion.schema, schemaString);
  }

  const versionId = await ctx.db.insert("versions", {
    contractId,
    versionNumber: newVersionNumber,
    schema: schemaString,
    breakingChanges: breakingChanges.length > 0 ? breakingChanges : undefined,
  });

  return versionId;
}

export const createProject = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated call to createProject");
    }
    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      userId: identity.subject,
    });
    return projectId;
  },
});

export const getProjects = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    return await ctx.db
      .query("projects")
      .filter((q) => 
        q.or(
          q.eq(q.field("userId"), identity.subject),
          q.eq(q.field("createdBy"), identity.subject)
        )
      )
      .collect();
  },
});


export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const project = await ctx.db.get(args.projectId);
    if (!project || (project.userId !== identity.subject && project.createdBy !== identity.subject)) {
      return null;
    }
    return project;
  },
});

export const updateProject = mutation({
  args: { 
    projectId: v.id("projects"), 
    name: v.optional(v.string()),
    description: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const project = await ctx.db.get(args.projectId);
    if (!project || (project.userId !== identity.subject && project.createdBy !== identity.subject)) {
      throw new Error("Unauthorized or project not found");
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.projectId, updates);
    return args.projectId;
  },
});

export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const project = await ctx.db.get(args.projectId);
    if (!project || (project.userId !== identity.subject && project.createdBy !== identity.subject)) {
      throw new Error("Unauthorized or project not found");
    }

    // Cascading Delete logic
    // 1. Find all contracts for this project
    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const contract of contracts) {
      // 2. Find and delete all versions for each contract
      const versions = await ctx.db
        .query("versions")
        .withIndex("by_contractId", (q) => q.eq("contractId", contract._id))
        .collect();
      
      for (const version of versions) {
        await ctx.db.delete(version._id);
      }
      
      // 3. Delete the contract
      await ctx.db.delete(contract._id);
    }

    // 4. Finally delete the project
    await ctx.db.delete(args.projectId);
    
    return { success: true };
  },
});

export const createContract = mutation({
  args: { projectId: v.id("projects"), name: v.string(), path: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated call to createContract");
    }
    
    const project = await ctx.db.get(args.projectId);
    if (!project || (project.userId !== identity.subject && project.createdBy !== identity.subject)) {
      throw new Error("Unauthorized");
    }

    const contractId = await ctx.db.insert("contracts", {
      projectId: args.projectId,
      name: args.name,
      path: args.path,
    });
    return contractId;
  },
});

export const getContracts = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    
    const project = await ctx.db.get(args.projectId);
    // Return empty array instead of throwing — a thrown error from a query
    // surfaces as an unhandled exception in the React component (blank screen).
    // Callers should treat [] as "no access / not found".
    if (!project || (project.userId !== identity.subject && project.createdBy !== identity.subject)) {
      return [];
    }

    return await ctx.db
      .query("contracts")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getContractWithVersions = query({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    const contract = await ctx.db.get(args.contractId);
    if (!contract) return null;

    const project = await ctx.db.get(contract.projectId);
    if (!project || (project.userId !== identity.subject && project.createdBy !== identity.subject)) {
      return null;
    }

    const versions = await ctx.db
      .query("versions")
      .withIndex("by_contractId", (q) => q.eq("contractId", contract._id))
      .order("desc")
      .collect();

    return { contract, versions };
  },
});

export const createVersion = mutation({
  args: { contractId: v.id("contracts"), schema: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated call to createVersion");
    }

    const contract = await ctx.db.get(args.contractId);
    if (!contract) throw new Error("Contract not found");

    const project = await ctx.db.get(contract.projectId);
    if (!project || (project.userId !== identity.subject && project.createdBy !== identity.subject)) {
      throw new Error("Unauthorized");
    }

    // Verify it's a valid JSON object
    let parsedNew: any;
    try {
      parsedNew = JSON.parse(args.schema);
      if (typeof parsedNew !== "object" || Array.isArray(parsedNew) || parsedNew === null) {
        throw new Error("SCHEMA_TYPE_ERROR: Expected a JSON object but received " + (Array.isArray(parsedNew) ? "an array" : typeof parsedNew));
      }
    } catch (e: any) {
      if (e.message?.startsWith("SCHEMA_TYPE_ERROR")) throw e;
      throw new Error("JSON_PARSE_ERROR: " + e.message);
    }

    // Publish-time safety limits: size cap, nesting-depth cap, and a
    // heuristic scan for catastrophic-backtracking regex patterns. These
    // exist so a pathologically large/deep schema can't bloat storage or
    // stack-overflow the breaking-change diff, and so an obviously
    // dangerous `pattern` can't be published for AJV to later compile
    // against public traffic.
    if (args.schema.length > MAX_SCHEMA_LENGTH) {
      throw new Error(
        `SCHEMA_TOO_LARGE: Schema is ${args.schema.length} characters, which exceeds the ${MAX_SCHEMA_LENGTH} character limit.`
      );
    }

    const schemaDepth = getSchemaDepth(parsedNew);
    if (schemaDepth > MAX_SCHEMA_DEPTH) {
      throw new Error(
        `SCHEMA_TOO_DEEP: Schema nests ${schemaDepth} levels deep, which exceeds the ${MAX_SCHEMA_DEPTH} level limit.`
      );
    }

    const unsafePatterns = findUnsafeSchemaPatterns(parsedNew);
    if (unsafePatterns.length > 0) {
      throw new Error(
        `UNSAFE_REGEX_PATTERN: Schema contains a pattern that looks vulnerable to catastrophic backtracking: ${unsafePatterns[0]}`
      );
    }

    // Get the latest version to check for a semantic no-op before publishing
    const latestVersion = await ctx.db
      .query("versions")
      .withIndex("by_contractId", (q) => q.eq("contractId", args.contractId))
      .order("desc")
      .first();

    if (latestVersion) {
      // Compare semantically rather than exact string (key-order-insensitive)
      try {
        const parsedLatest = JSON.parse(latestVersion.schema);
        if (isDeepEqualIgnoringKeyOrder(parsedLatest, parsedNew)) {
           throw new Error("No schema changes detected from latest version");
        }
      } catch (e) {
        if (e instanceof Error && e.message === "No schema changes detected from latest version") {
          throw e;
        }
        // Fallback to strict if unparseable for some reason
        if (latestVersion.schema === args.schema) {
           throw new Error("No schema changes detected from latest version");
        }
      }
    }

    return await insertNewVersion(ctx, args.contractId, args.schema);
  },
});

export const toggleContractStatus = mutation({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const contract = await ctx.db.get(args.contractId);
    if (!contract) throw new Error("Contract not found");

    const project = await ctx.db.get(contract.projectId);
    if (!project || (project.userId !== identity.subject && project.createdBy !== identity.subject)) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.contractId, {
      isDisabled: !contract.isDisabled,
    });

    return { success: true, isDisabled: !contract.isDisabled };
  },
});

export const restoreVersion = mutation({
  args: { contractId: v.id("contracts"), versionNumber: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const contract = await ctx.db.get(args.contractId);
    if (!contract) throw new Error("Contract not found");

    const project = await ctx.db.get(contract.projectId);
    if (!project || (project.userId !== identity.subject && project.createdBy !== identity.subject)) {
      throw new Error("Unauthorized");
    }

    // Get the schema to restore
    const versionToRestore = await ctx.db
      .query("versions")
      .withIndex("by_contractId_version", (q) =>
         q.eq("contractId", args.contractId).eq("versionNumber", args.versionNumber)
      )
      .first();

    if (!versionToRestore) throw new Error("Version not found");

    return await insertNewVersion(ctx, args.contractId, versionToRestore.schema);
  },
});
