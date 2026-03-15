// Basic schema breaking change detection.
// In a production app, we would use a robust JSON Schema diff library (like json-schema-diff).

export type BreakingChange = {
  type: string;
  path: string;
  message: string;
};

export function detectBreakingChanges(
  oldSchemaStr: string,
  newSchemaStr: string
): BreakingChange[] {
  const changes: BreakingChange[] = [];

  try {
    const oldSchema = JSON.parse(oldSchemaStr);
    const newSchema = JSON.parse(newSchemaStr);

    compareSchemas(oldSchema, newSchema, "$", changes);
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
  oldSchema: any,
  newSchema: any,
  path: string,
  changes: BreakingChange[]
) {
  if (typeof oldSchema !== "object" || typeof newSchema !== "object") {
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
          changes
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
