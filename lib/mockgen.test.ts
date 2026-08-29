// Run with: node --test lib/mockgen.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateSmartMock,
  createContext,
  parseSimParams,
  simulatedErrorBody,
  MAX_DELAY_MS,
} from "./mockgen.ts";

// A schema that touches every non-deterministic branch: random numbers, a
// random boolean, and a date derived from the clock.
const schema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    price: { type: "number" },
    rating: { type: "number" },
    inStock: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    tags: { type: "array", items: { type: "string" }, minItems: 3 },
  },
};

test("same seed produces byte-identical data", () => {
  const a = generateSmartMock(schema, "", createContext("demo"));
  const b = generateSmartMock(schema, "", createContext("demo"));
  assert.deepStrictEqual(a, b);
  // The date must be pinned too, or the seed drifts across midnight.
  assert.equal(a.createdAt, "2026-01-01T00:00:00.000Z");
});

test("different seeds produce different data", () => {
  const a = generateSmartMock(schema, "", createContext("demo"));
  const b = generateSmartMock(schema, "", createContext("other"));
  assert.notDeepStrictEqual(a, b);
});

test("no seed still generates a valid shape", () => {
  const out = generateSmartMock(schema);
  assert.equal(typeof out.id, "number");
  assert.equal(typeof out.inStock, "boolean");
  assert.equal(out.tags.length, 3);
});

test("enum is honoured on non-string types", () => {
  const enumSchema = {
    type: "object",
    properties: {
      level: { type: "integer", enum: [10, 20, 30] },
      role: { type: "string", enum: ["admin", "user"] },
    },
  };
  for (const seed of ["a", "b", "c", "d", "e", "f"]) {
    const out = generateSmartMock(enumSchema, "", createContext(seed));
    assert.ok([10, 20, 30].includes(out.level), `level ${out.level} not in enum`);
    assert.ok(["admin", "user"].includes(out.role), `role ${out.role} not in enum`);
  }
});

test("delay is clamped, never negative, never unbounded", () => {
  assert.equal(parseSimParams(new URLSearchParams("delay=800")).delayMs, 800);
  assert.equal(parseSimParams(new URLSearchParams("delay=99999")).delayMs, MAX_DELAY_MS);
  assert.equal(parseSimParams(new URLSearchParams("delay=-5")).delayMs, 0);
  assert.equal(parseSimParams(new URLSearchParams("delay=abc")).delayMs, 0);
  assert.equal(parseSimParams(new URLSearchParams("")).delayMs, 0);
});

test("status is only accepted inside the HTTP range", () => {
  assert.equal(parseSimParams(new URLSearchParams("status=500")).status, 500);
  assert.equal(parseSimParams(new URLSearchParams("status=200")).status, 200);
  assert.equal(parseSimParams(new URLSearchParams("status=99")).status, null);
  assert.equal(parseSimParams(new URLSearchParams("status=600")).status, null);
  assert.equal(parseSimParams(new URLSearchParams("status=oops")).status, null);
});

test("seed is trimmed, length-capped, and blank means none", () => {
  assert.equal(parseSimParams(new URLSearchParams("seed=  demo  ")).seed, "demo");
  assert.equal(parseSimParams(new URLSearchParams("seed=")).seed, null);
  assert.equal(parseSimParams(new URLSearchParams("seed=%20")).seed, null);
  assert.equal(parseSimParams(new URLSearchParams(`seed=${"x".repeat(200)}`)).seed?.length, 64);
});

test("simulated error body names the status it was asked for", () => {
  const body = simulatedErrorBody(503);
  assert.equal(body.status, 503);
  assert.equal(body.simulated, true);
  assert.equal(body.error, "Service Unavailable");
  assert.match(body.message, /\?status=503/);
});
