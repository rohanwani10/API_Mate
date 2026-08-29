import type { JsonSchema } from './mockgen';

export function generateDartCode(className: string, schemaStr: string): string {
    try {
        const schema = JSON.parse(schemaStr);
        if (schema.type !== 'object' || !schema.properties) {
             return "// Error: Root schema must be an object with properties";
        }

        let dartCode = `class ${className} {\n`;
        const props = schema.properties;
        const required = schema.required || [];

        // Fields
        for (const [key, value] of Object.entries<JsonSchema>(props)) {
            let dartType = 'dynamic';
            if (value.type === 'string') dartType = 'String';
            else if (value.type === 'number' || value.type === 'integer') dartType = 'num';
            else if (value.type === 'boolean') dartType = 'bool';

            const isNullable = !required.includes(key) ? '?' : '';
            dartCode += `  final ${dartType}${isNullable} ${key};\n`;
        }

        // Constructor
        dartCode += `\n  ${className}({\n`;
        for (const key of Object.keys(props)) {
            const isReq = required.includes(key) ? 'required ' : '';
            dartCode += `    ${isReq}this.${key},\n`;
        }
        dartCode += `  });\n\n`;

        // fromJson
        dartCode += `  factory ${className}.fromJson(Map<String, dynamic> json) {\n`;
        dartCode += `    return ${className}(\n`;
        for (const key of Object.keys(props)) {
            dartCode += `      ${key}: json['${key}'],\n`;
        }
        dartCode += `    );\n  }\n\n`;

        // toJson
        dartCode += `  Map<String, dynamic> toJson() {\n`;
        dartCode += `    return {\n`;
        for (const key of Object.keys(props)) {
            dartCode += `      '${key}': ${key},\n`;
        }
        dartCode += `    };\n  }\n`;

        dartCode += `}\n`;
        return dartCode;

    } catch (e) {
        return "// Error parsing schema: " + (e as Error).message;
    }
}

export function generateJavaCode(className: string, schemaStr: string): string {
    try {
        const schema = JSON.parse(schemaStr);
        if (schema.type !== 'object' || !schema.properties) {
             return "// Error: Root schema must be an object with properties";
        }

        let javaCode = `import com.fasterxml.jackson.annotation.JsonProperty;\n\n`;
        javaCode += `public class ${className} {\n`;
        const props = schema.properties;

        // Fields
        for (const [key, value] of Object.entries<JsonSchema>(props)) {
            let javaType = 'Object';
            if (value.type === 'string') javaType = 'String';
            else if (value.type === 'number') javaType = 'Double';
            else if (value.type === 'integer') javaType = 'Integer';
            else if (value.type === 'boolean') javaType = 'Boolean';

            javaCode += `    @JsonProperty("${key}")\n`;
            javaCode += `    private ${javaType} ${key};\n\n`;
        }

        // Getters & Setters
        for (const [key, value] of Object.entries<JsonSchema>(props)) {
             let javaType = 'Object';
             if (value.type === 'string') javaType = 'String';
             else if (value.type === 'number') javaType = 'Double';
             else if (value.type === 'integer') javaType = 'Integer';
             else if (value.type === 'boolean') javaType = 'Boolean';

             const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
             
             // Getter
             javaCode += `    public ${javaType} get${capitalized}() {\n`;
             javaCode += `        return ${key};\n`;
             javaCode += `    }\n\n`;

             // Setter
             javaCode += `    public void set${capitalized}(${javaType} ${key}) {\n`;
             javaCode += `        this.${key} = ${key};\n`;
             javaCode += `    }\n\n`;
        }

        javaCode += `}\n`;
        return javaCode;

    } catch (e) {
        return "// Error parsing schema: " + (e as Error).message;
    }
}

// ---------------------------------------------------------------------------
// TypeScript generator
//
// Unlike the Dart and Java generators above, this one recurses into nested
// objects and arrays. A flat-only TypeScript type would be near useless for the
// audience ApiMate is aimed at, and TypeScript can express nested shapes inline
// without the naming/collision problem that hoisted sub-types would introduce.
// ---------------------------------------------------------------------------

/** Property keys that aren't plain identifiers have to be quoted in a type. */
function tsKey(key: string): string {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

/** Turn a schema node into a TypeScript type expression. */
function tsType(node: JsonSchema, indent: string): string {
    if (!node || typeof node !== 'object') return 'unknown';

    // An enum is more precise than the type it sits on, so it wins.
    if (Array.isArray(node.enum) && node.enum.length > 0) {
        return node.enum.map((v: unknown) => JSON.stringify(v)).join(' | ');
    }

    // JSON Schema allows `"type": ["string", "null"]`.
    if (Array.isArray(node.type)) {
        return node.type.map((t: string) => tsType({ ...node, type: t }, indent)).join(' | ');
    }

    if (node.type === 'array') {
        const item = tsType(node.items ?? {}, indent);
        // Union item types need parentheses before the [] suffix binds.
        return /[|&]/.test(item) ? `(${item})[]` : `${item}[]`;
    }

    if (node.type === 'object' || node.properties) {
        if (!node.properties || Object.keys(node.properties).length === 0) {
            return 'Record<string, unknown>';
        }
        const required: string[] = Array.isArray(node.required) ? node.required : [];
        const inner = indent + '  ';
        const lines = Object.entries<JsonSchema>(node.properties).map(([key, value]) => {
            const optional = required.includes(key) ? '' : '?';
            return `${inner}${tsKey(key)}${optional}: ${tsType(value, inner)};`;
        });
        return `{\n${lines.join('\n')}\n${indent}}`;
    }

    switch (node.type) {
        case 'string': return 'string';
        case 'number':
        case 'integer': return 'number';
        case 'boolean': return 'boolean';
        case 'null': return 'null';
        default: return 'unknown';
    }
}

export function generateTypeScriptCode(
    typeName: string,
    schemaStr: string,
    endpoint?: string
): string {
    try {
        const schema = JSON.parse(schemaStr);
        if (schema.type !== 'object' || !schema.properties) {
            return "// Error: Root schema must be an object with properties";
        }

        const body = tsType(schema, '');
        let out = `export interface ${typeName} ${body}\n`;

        if (!endpoint) {
            out += `\n// Publish a version to also generate a typed client for this contract.\n`;
            return out;
        }

        out += `\nconst API_URL = ${JSON.stringify(endpoint)};\n`;
        out += `
export type MockOptions = {
  /** Same seed returns identical data every call — safe for snapshot tests. */
  seed?: string;
  /** Artificial latency in ms (max 10000) for exercising loading states. */
  delay?: number;
  /** Force a status code, e.g. 500, for exercising error states. */
  status?: number;
};

function buildUrl(opts: MockOptions & { count?: number }): string {
  const params = new URLSearchParams();
  if (opts.seed) params.set("seed", opts.seed);
  if (opts.delay) params.set("delay", String(opts.delay));
  if (opts.status) params.set("status", String(opts.status));
  if (opts.count) params.set("count", String(opts.count));
  const qs = params.toString();
  return qs ? API_URL + "?" + qs : API_URL;
}

`;
        out += `export async function fetch${typeName}(opts: MockOptions = {}): Promise<${typeName}> {\n`;
        out += `  const res = await fetch(buildUrl(opts));\n`;
        out += `  if (!res.ok) throw new Error("ApiMate request failed: " + res.status);\n`;
        out += `  return (await res.json()) as ${typeName};\n}\n\n`;

        out += `export async function fetch${typeName}List(\n`;
        out += `  count: number,\n  opts: MockOptions = {}\n): Promise<${typeName}[]> {\n`;
        out += `  const res = await fetch(buildUrl({ ...opts, count }));\n`;
        out += `  if (!res.ok) throw new Error("ApiMate request failed: " + res.status);\n`;
        out += `  return (await res.json()) as ${typeName}[];\n}\n\n`;

        out += `/** Validates \`body\` against the published contract. */\n`;
        out += `export async function post${typeName}(body: ${typeName}): Promise<Response> {\n`;
        out += `  return fetch(API_URL, {\n`;
        out += `    method: "POST",\n`;
        out += `    headers: { "Content-Type": "application/json" },\n`;
        out += `    body: JSON.stringify(body),\n`;
        out += `  });\n}\n`;

        return out;

    } catch (e) {
        return "// Error parsing schema: " + (e as Error).message;
    }
}
