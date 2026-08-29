// Pure mock-data generation — deliberately free of framework imports so it can
// be exercised directly with `node --test lib/mockgen.test.ts`.

// A JSON Schema document is an arbitrary, author-defined shape; typing it
// properly would mean re-encoding the JSON Schema spec. This alias confines
// that dynamism — and the lint suppression — to one declaration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonSchema = any;

export type MockContext = {
  rng: () => number;
  now: Date;
};

// mulberry32 — a small, fast, well-distributed 32-bit PRNG.
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a — maps an arbitrary seed string onto the uint32 mulberry32 wants.
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Seeded runs pin "now" to a fixed instant as well as the RNG — otherwise a
// schema with a date field would drift day to day and the seed would be a lie.
const SEEDED_EPOCH = "2026-01-01T00:00:00.000Z";

export function createContext(seed?: string | null): MockContext {
  if (!seed) return { rng: Math.random, now: new Date() };
  return { rng: mulberry32(hashSeed(seed)), now: new Date(SEEDED_EPOCH) };
}

function pick<T>(items: T[], ctx: MockContext): T {
  return items[Math.floor(ctx.rng() * items.length)];
}

// ---------------------------------------------------------------------------
// Rule-based mock generator (Stage 1 — no AI cost, always succeeds)
// ---------------------------------------------------------------------------
export function generateSmartMock(
  schema: JsonSchema,
  propName = "",
  ctx: MockContext = createContext()
  // Returns the generated value, whose shape is dictated by the caller's
  // schema — `unknown` here would just push a cast onto every call site.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (!schema) return null;

  const type = schema.type;
  const name = propName.toLowerCase();
  const desc = (schema.description || "").toLowerCase();

  if (schema.example !== undefined) return schema.example;
  if (Array.isArray(schema.examples) && schema.examples.length > 0) {
    return schema.examples[0];
  }

  // Checked ahead of every type branch: an `enum` on an integer or boolean is
  // just as binding as one on a string, and ignoring it produced mock data that
  // failed validation against the very schema that generated it.
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return pick(schema.enum, ctx);
  }

  if (type === "array") {
    const count = schema.minItems ?? 2;
    return Array.from({ length: count }, () =>
      generateSmartMock(schema.items ?? {}, propName, ctx)
    );
  }

  if (type === "object" || schema.properties) {
    const obj: Record<string, unknown> = {};
    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        obj[key] = generateSmartMock(value, key, ctx);
      }
    }
    return obj;
  }

  if (type === "string") {
    // `format` is checked before the field-name heuristics because it is what
    // the schema author actually declared. Guessing from names alone produced
    // values (e.g. "Sample text" for a date-time field) that the POST endpoint's
    // own ajv-formats validator would reject — a mock you cannot round-trip.
    switch (schema.format) {
      case "email":
      case "idn-email":
        return "user123@gmail.com";
      case "date-time":
        return ctx.now.toISOString();
      case "date":
        return ctx.now.toISOString().split("T")[0];
      case "time":
        return ctx.now.toISOString().split("T")[1];
      case "uuid":
        return "a1b2c3d4-e5f6-7890-1234-56789abcdef0";
      case "uri":
      case "url":
      case "iri":
        return "https://example.com/item";
      case "hostname":
        return "example.com";
      case "ipv4":
        return "192.168.1.42";
      case "ipv6":
        return "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
    }

    if (name.includes("email") || desc.includes("email"))
      return "user123@gmail.com";
    if (name.includes("first") && name.includes("name")) return "John";
    if (name.includes("last") && name.includes("name")) return "Doe";
    if (name.includes("name") || desc.includes("name"))
      return "Wireless Bluetooth Headphones";
    if (name.includes("desc") || desc.includes("desc"))
      return "High quality wireless headphones with noise cancellation";
    if (
      name.includes("city") ||
      desc.includes("city") ||
      name.includes("location") ||
      desc.includes("location")
    )
      return "Mumbai";
    if (
      name.includes("url") ||
      name.includes("link") ||
      desc.includes("url") ||
      desc.includes("link")
    )
      return "https://example.com/item";
    if (name.includes("uuid") || name.includes("id"))
      return "a1b2c3d4-e5f6-7890-1234-56789abcdef0";
    if (name.includes("date") || desc.includes("date"))
      return ctx.now.toISOString().split("T")[0];
    // "createdAt" / "updatedAt" / "expiresAt" contain neither "date" nor
    // "time", yet they are the most common timestamp names in practice.
    if (
      name.includes("time") ||
      desc.includes("time") ||
      name.endsWith("at") ||
      name.includes("timestamp")
    )
      return ctx.now.toISOString();
    if (name.includes("avatar") || name.includes("image"))
      return "https://example.com/avatar.jpg";
    if (name.includes("phone")) return "+1-555-0198";
    if (name.includes("status")) return "active";
    return "Sample text";
  }

  if (type === "number" || type === "integer") {
    const min = schema.minimum ?? 1;
    const max = schema.maximum ?? 1000;
    if (
      name.includes("price") ||
      desc.includes("price") ||
      name.includes("cost") ||
      desc.includes("cost")
    )
      return Math.floor(ctx.rng() * 4900) + 100;
    if (name.includes("age") || desc.includes("age"))
      return Math.floor(ctx.rng() * 47) + 18;
    if (
      name.includes("stock") ||
      name.includes("qty") ||
      name.includes("quantity")
    )
      return type === "integer"
        ? Math.floor(ctx.rng() * 100)
        : +(ctx.rng() * 100).toFixed(2);
    if (name.includes("rating")) return +(ctx.rng() * 4 + 1).toFixed(1);
    if (type === "integer")
      return Math.floor(ctx.rng() * (max - min + 1)) + min;
    return Math.round((ctx.rng() * (max - min) + min) * 100) / 100;
  }

  if (type === "boolean") {
    if (
      name.includes("active") ||
      name.includes("enabled") ||
      name.includes("is") ||
      name.includes("has")
    )
      return true;
    return ctx.rng() > 0.5;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Simulation params — ?delay, ?status, ?seed
//
// Parsed here rather than in the route so the clamping rules are testable and
// every verb reads them the same way.
// ---------------------------------------------------------------------------
export const MAX_DELAY_MS = 10_000;

export type SimParams = {
  delayMs: number;
  status: number | null;
  seed: string | null;
};

export function parseSimParams(params: URLSearchParams): SimParams {
  const rawDelay = parseInt(params.get("delay") ?? "", 10);
  const delayMs = Number.isFinite(rawDelay)
    ? Math.min(Math.max(rawDelay, 0), MAX_DELAY_MS)
    : 0;

  const rawStatus = parseInt(params.get("status") ?? "", 10);
  const status =
    Number.isFinite(rawStatus) && rawStatus >= 200 && rawStatus <= 599
      ? rawStatus
      : null;

  const rawSeed = params.get("seed");
  const seed = rawSeed && rawSeed.trim() ? rawSeed.trim().slice(0, 64) : null;

  return { delayMs, status, seed };
}

// Body returned when a caller forces a non-2xx status. Mirrors the shape real
// APIs tend to use so frontend error handling can be built against it.
export function simulatedErrorBody(status: number) {
  const messages: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return {
    error: messages[status] ?? "Simulated Error",
    status,
    simulated: true,
    message: `ApiMate returned this ${status} because the request asked for it via ?status=${status}.`,
  };
}

/**
 * Builds the public URL of a mock endpoint.
 *
 * Shared by the Mock tab, the Try It console and the generated TypeScript
 * client so a contract path saved without a leading slash (a very easy thing to
 * do) cannot produce a working URL in one place and a broken one in another.
 */
export function buildMockUrl(
  baseUrl: string,
  contractId: string,
  versionNumber: number,
  path: string
): string {
  const normalized = path.startsWith("/") ? path : "/" + path;
  return `${baseUrl}/api/mock/${contractId}/${versionNumber}${normalized}`;
}
