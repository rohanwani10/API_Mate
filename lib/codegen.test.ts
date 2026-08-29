// Run with: node --test lib/codegen.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { generateTypeScriptCode } from "./codegen.ts";

const nested = JSON.stringify({
  type: "object",
  required: ["id", "name", "address"],
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    nickname: { type: "string" },
    role: { type: "string", enum: ["admin", "user"] },
    address: {
      type: "object",
      required: ["city"],
      properties: {
        city: { type: "string" },
        zip: { type: "string" },
      },
    },
    tags: { type: "array", items: { type: "string" } },
    scores: { type: "array", items: { type: ["number", "null"] } },
    "content-type": { type: "string" },
  },
});

test("required fields are non-optional, the rest get ?", () => {
  const out = generateTypeScriptCode("User", nested);
  assert.match(out, /\bid: number;/);
  assert.match(out, /\bnickname\?: string;/);
});

test("nested objects recurse instead of collapsing to unknown", () => {
  const out = generateTypeScriptCode("User", nested);
  assert.match(out, /address: \{/);
  assert.match(out, /city: string;/);
  assert.match(out, /zip\?: string;/);
});

test("enums become string-literal unions", () => {
  const out = generateTypeScriptCode("User", nested);
  assert.match(out, /role\?: "admin" \| "user";/);
});

test("arrays and union item types are bracketed correctly", () => {
  const out = generateTypeScriptCode("User", nested);
  assert.match(out, /tags\?: string\[\];/);
  assert.match(out, /scores\?: \(number \| null\)\[\];/);
});

test("keys that aren't identifiers are quoted", () => {
  const out = generateTypeScriptCode("User", nested);
  assert.match(out, /"content-type"\?: string;/);
});

test("a client is only emitted once an endpoint exists", () => {
  const without = generateTypeScriptCode("User", nested);
  assert.ok(!without.includes("fetchUser("), "should not emit a client with no endpoint");

  const withUrl = generateTypeScriptCode("User", nested, "https://x.dev/api/mock/abc/1/users");
  assert.match(withUrl, /export async function fetchUser\(/);
  assert.match(withUrl, /export async function fetchUserList\(/);
  assert.match(withUrl, /export async function postUser\(/);
  assert.match(withUrl, /https:\/\/x\.dev\/api\/mock\/abc\/1\/users/);
});

test("generated TypeScript actually parses", async () => {
  const code = generateTypeScriptCode("User", nested, "https://x.dev/api/mock/abc/1/users");
  const file = join(mkdtempSync(join(tmpdir(), "apimate-")), "generated.ts");
  writeFileSync(file, code, "utf8");
  // Node strips types on import; a syntax error in the emitted code throws here.
  const mod = await import(pathToFileURL(file).href);
  assert.equal(typeof mod.fetchUser, "function");
  assert.equal(typeof mod.postUser, "function");
});

test("a non-object schema returns a comment, never a crash", () => {
  assert.match(generateTypeScriptCode("X", '{"type":"string"}'), /^\/\/ Error/);
  assert.match(generateTypeScriptCode("X", "not json"), /^\/\/ Error parsing schema/);
});
