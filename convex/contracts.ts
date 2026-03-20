import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { detectBreakingChanges } from "./utils";

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
    if (!project || project.userId !== identity.subject) {
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
    if (!project || project.userId !== identity.subject) {
      throw new Error("Unauthorized");
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
    if (!project || project.userId !== identity.subject) {
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
    if (!project || project.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Verify it's a valid JSON object
    try {
      const parsed = JSON.parse(args.schema);
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
        throw new Error("SCHEMA_TYPE_ERROR: Expected a JSON object but received " + (Array.isArray(parsed) ? "an array" : typeof parsed));
      }
    } catch (e: any) {
      if (e.message?.startsWith("SCHEMA_TYPE_ERROR")) throw e;
      throw new Error("JSON_PARSE_ERROR: " + e.message);
    }

    // Get the latest version to determine breaking changes and the new version number
    const latestVersion = await ctx.db
      .query("versions")
      .withIndex("by_contractId", (q) => q.eq("contractId", args.contractId))
      .order("desc")
      .first();

    let newVersionNumber = 1;
    let breakingChanges: any[] = [];

    if (latestVersion) {
      // Compare semantically rather than exact string
      try {
        const parsedLatest = JSON.parse(latestVersion.schema);
        const parsedNew = JSON.parse(args.schema);
        if (JSON.stringify(parsedLatest) === JSON.stringify(parsedNew)) {
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
      newVersionNumber = latestVersion.versionNumber + 1;
      breakingChanges = detectBreakingChanges(latestVersion.schema, args.schema);
    }

    const versionId = await ctx.db.insert("versions", {
      contractId: args.contractId,
      versionNumber: newVersionNumber,
      schema: args.schema,
      breakingChanges: breakingChanges.length > 0 ? breakingChanges : undefined,
    });

    return versionId;
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
    if (!project || project.userId !== identity.subject) {
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
    if (!project || project.userId !== identity.subject) {
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

    // Get latest version number
    const latestVersion = await ctx.db
      .query("versions")
      .withIndex("by_contractId", (q) => q.eq("contractId", args.contractId))
      .order("desc")
      .first();

    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Detect breaking changes between latest and restored
    let breakingChanges: any[] = [];
    if (latestVersion) {
      breakingChanges = detectBreakingChanges(latestVersion.schema, versionToRestore.schema);
    }

    const versionId = await ctx.db.insert("versions", {
      contractId: args.contractId,
      versionNumber: newVersionNumber,
      schema: versionToRestore.schema,
      breakingChanges: breakingChanges.length > 0 ? breakingChanges : undefined,
    });

    return versionId;
  },
});
