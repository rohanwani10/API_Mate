// Basic schema breaking change detection.
// In a production app, we would use a robust JSON Schema diff library (like json-schema-diff).

export type BreakingChange = {
  type: string;
  path: string;
  message: string;
};

// Parsed JSON Schema documents are arbitrary, author-defined shapes —
// modelling them as a strict TypeScript type would mean re-encoding the JSON
// Schema spec itself, which is out of scope here. This alias documents that
// the dynamism is intentional and confines the lint suppression to a single
// declaration instead of every use site (mirrors the same pattern in
// app/api/mock/.../route.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonSchema = any;

// ---- Publish-time schema safety limits ----
// These caps guard against pathologically large / deeply nested schemas
// bloating storage and requests, and against stack overflows while diffing
// or walking a schema. MAX_SCHEMA_DEPTH is shared between the publish-time
// depth guard (see contracts.ts createVersion) and compareSchemas below, so
// a schema that somehow bypasses the publish-time check (e.g. via
// restoreVersion, which republishes an already-stored schema without
// re-running createVersion's validation) still can't blow the stack here.

export const MAX_SCHEMA_LENGTH = 50_000;
export const MAX_SCHEMA_DEPTH = 20;

export function detectBreakingChanges(
  oldSchemaStr: string,
  newSchemaStr: string
): BreakingChange[] {
  const changes: BreakingChange[] = [];

  try {
    const oldSchema = JSON.parse(oldSchemaStr);
    const newSchema = JSON.parse(newSchemaStr);

    compareSchemas(oldSchema, newSchema, "$", changes, 0);
  } catch (e) {
    // If we can't parse them, assume a breaking change or invalid schema.
    changes.push({
      type: "invalid_schema",
      path: "$",
      message: "Could not parse JSON schema.",
    });
  }

  return changes;
}

function compareSchemas(
  oldSchema: JsonSchema,
  newSchema: JsonSchema,
  path: string,
  changes: BreakingChange[],
  depth: number
) {
  if (typeof oldSchema !== "object" || typeof newSchema !== "object") {
    return;
  }

  // Safety net: stop descending past the depth cap rather than throwing.
  // Comparison for anything nested deeper than this is simply skipped.
  if (depth > MAX_SCHEMA_DEPTH) {
    return;
  }

  // 1. Type changed
  if (oldSchema.type && newSchema.type && oldSchema.type !== newSchema.type) {
    changes.push({
      type: "type_changed",
      path,
      message: `Type changed from ${oldSchema.type} to ${newSchema.type}`,
    });
  }

  // 2. Required field added
  if (Array.isArray(newSchema.required)) {
    const oldRequired = Array.isArray(oldSchema.required)
      ? oldSchema.required
      : [];
    for (const req of newSchema.required) {
      if (!oldRequired.includes(req)) {
        changes.push({
          type: "required_field_added",
          path: `${path}.required`,
          message: `New required field added: ${req}`,
        });
      }
    }
  }

  // 3. Drill into properties
  if (oldSchema.properties && newSchema.properties) {
    for (const key of Object.keys(oldSchema.properties)) {
      if (newSchema.properties[key]) {
        compareSchemas(
          oldSchema.properties[key],
          newSchema.properties[key],
          `${path}.properties.${key}`,
          changes,
          depth + 1
        );
      } else {
        // Field removed
        changes.push({
          type: "field_removed",
          path: `${path}.properties.${key}`,
          message: `Field ${key} was removed`,
        });
      }
    }
  }
}

/**
 * Walks a parsed JSON schema (following properties/items/additionalProperties)
 * and returns its maximum nesting depth. Recursion itself is bounded by
 * MAX_SCHEMA_DEPTH so pathological input can't cause a stack overflow while
 * we're merely trying to measure how deep it is — once depth exceeds the
 * cap we stop descending and report a value greater than the cap, which is
 * all callers need to reject it.
 */
export function getSchemaDepth(schema: JsonSchema, depth = 0): number {
  if (typeof schema !== "object" || schema === null) return depth;
  if (depth > MAX_SCHEMA_DEPTH) return depth;

  let maxDepth = depth;

  if (schema.properties && typeof schema.properties === "object") {
    for (const key of Object.keys(schema.properties)) {
      maxDepth = Math.max(
        maxDepth,
        getSchemaDepth(schema.properties[key], depth + 1)
      );
    }
  }
  if (schema.items && typeof schema.items === "object") {
    maxDepth = Math.max(maxDepth, getSchemaDepth(schema.items, depth + 1));
  }
  if (
    schema.additionalProperties &&
    typeof schema.additionalProperties === "object"
  ) {
    maxDepth = Math.max(
      maxDepth,
      getSchemaDepth(schema.additionalProperties, depth + 1)
    );
  }

  return maxDepth;
}

// Heuristic guard against catastrophic-backtracking ("ReDoS") regex
// patterns. This is NOT a formal proof of regex safety — it only flags a
// handful of classic nested-quantifier / overlapping-alternation shapes
// (e.g. `(x+)+`, `(x*)+`, `(x+)*`, `(x*)*`, `(x|x)+`). A pattern that
// passes this check can still be unsafe in subtler ways; this exists to
// catch the obvious cases before a schema is published and its `pattern`
// values get compiled by AJV against public traffic.
const REDOS_HEURISTICS: RegExp[] = [
  // Nested quantifiers directly inside a group: (x+)+ , (x*)+ , (x+)* , (x*)*
  /\([^()]*[+*][^()]*\)[+*]/,
  // Alternation with an overlapping/duplicated branch, then repeated: (x|x)+
  /\(([^()|]+)\|\1\)[+*]/,
];

export function isLikelyUnsafeRegexPattern(pattern: string): boolean {
  return REDOS_HEURISTICS.some((re) => re.test(pattern));
}

/**
 * Recursively walks a parsed schema for string values under a `pattern`
 * key and returns any that look like catastrophic-backtracking regexes,
 * per the isLikelyUnsafeRegexPattern heuristic above.
 */
export function findUnsafeSchemaPatterns(
  schema: JsonSchema,
  found: string[] = []
): string[] {
  if (typeof schema !== "object" || schema === null) return found;

  if (Array.isArray(schema)) {
    for (const item of schema) {
      findUnsafeSchemaPatterns(item, found);
    }
    return found;
  }

  for (const key of Object.keys(schema)) {
    const value = schema[key];
    if (key === "pattern" && typeof value === "string") {
      if (isLikelyUnsafeRegexPattern(value)) {
        found.push(value);
      }
    } else if (typeof value === "object" && value !== null) {
      findUnsafeSchemaPatterns(value, found);
    }
  }

  return found;
}

/**
 * Deep-compares two parsed JSON values for semantic equality, ignoring
 * object key order: sorts keys before comparing, recurses into arrays and
 * nested objects, and compares primitives directly.
 */
export function isDeepEqualIgnoringKeyOrder(a: JsonSchema, b: JsonSchema): boolean {
  if (a === b) return true;

  if (typeof a === "number" && typeof b === "number") {
    // NaN !== NaN, but two NaNs should still count as "the same value".
    return Number.isNaN(a) && Number.isNaN(b);
  }

  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== "object") return false;

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray || bIsArray) {
    if (!aIsArray || !bIsArray) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqualIgnoringKeyOrder(a[i], b[i])) return false;
    }
    return true;
  }

  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
  }
  for (const key of aKeys) {
    if (!isDeepEqualIgnoringKeyOrder(a[key], b[key])) return false;
  }
  return true;
}
