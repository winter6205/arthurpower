// Contract tests for the dependency-free validator used by every hook.
// These encode the semantics the hooks rely on: key-order issue reporting
// (lib/ipc-core.ts reads issues[0].path[0] to pick its message), unknown-key
// stripping vs .passthrough(), and optional/nullish handling.
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "../runtime/tiny-schema.ts";

const firstPath = (result: { success: false; error: { issues: { path: PropertyKey[] }[] } }) =>
  result.error.issues[0]?.path[0];

test("string: accepts strings, rejects other types", () => {
  const schema = z.string();
  assert.equal(schema.safeParse("a").success, true);
  assert.equal(schema.safeParse(1).success, false);
  assert.equal(schema.safeParse(null).success, false);
  assert.equal(schema.safeParse(undefined).success, false);
});

test("string: regex and length constraints", () => {
  const skill = z.string().regex(/^[a-z-]+$/);
  assert.equal(skill.safeParse("code-review").success, true);
  assert.equal(skill.safeParse("Code Review").success, false);

  const hash = z.string().length(3);
  assert.equal(hash.safeParse("abc").success, true);
  assert.equal(hash.safeParse("ab").success, false);
});

test("constraints are not shared between derived schemas", () => {
  const base = z.string();
  const strict = base.regex(/^a/);
  assert.equal(base.safeParse("zzz").success, true);
  assert.equal(strict.safeParse("zzz").success, false);
});

test("number: rejects NaN and non-numbers", () => {
  const schema = z.number();
  assert.equal(schema.safeParse(0).success, true);
  assert.equal(schema.safeParse(1.5).success, true);
  assert.equal(schema.safeParse(Number.NaN).success, false);
  assert.equal(schema.safeParse("1").success, false);
});

test("unknown: accepts any value", () => {
  const schema = z.unknown();
  for (const value of [undefined, null, 0, "", false, {}, []]) {
    assert.equal(schema.safeParse(value).success, true);
  }
});

test("array: validates each element and reports its index", () => {
  const schema = z.array(z.string());
  assert.equal(schema.safeParse(["a", "b"]).success, true);
  assert.equal(schema.safeParse([]).success, true);
  assert.equal(schema.safeParse("a").success, false);
  const failed = schema.safeParse(["a", 2]);
  assert.equal(failed.success, false);
  if (!failed.success) assert.deepEqual(failed.error.issues[0]?.path, [1]);
});

test("record: plain string-keyed objects only, values unchecked by unknown", () => {
  const schema = z.record(z.string(), z.unknown());
  assert.equal(schema.safeParse({ a: 1 }).success, true);
  assert.equal(schema.safeParse({}).success, true);
  assert.equal(schema.safeParse([]).success, false);
  assert.equal(schema.safeParse(null).success, false);
  assert.equal(schema.safeParse("a").success, false);
});

test("object: required keys, unknown keys stripped from data", () => {
  const schema = z.object({ id: z.string(), ts: z.number() });
  const result = schema.safeParse({ id: "x", ts: 1, extra: "gone" });
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data, { id: "x", ts: 1 });
  assert.equal(schema.safeParse({ id: "x" }).success, false);
});

test("object: passthrough keeps unknown keys", () => {
  const schema = z.object({ a: z.string().optional() }).passthrough();
  const result = schema.safeParse({ a: "x", b: 2 });
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data, { a: "x", b: 2 });
});

test("optional and nullish: missing and null handling", () => {
  const schema = z.object({
    s: z.string().optional(),
    n: z.string().nullish(),
    e: z.array(z.unknown()).nullish(),
  });
  assert.equal(schema.safeParse({}).success, true);
  assert.equal(schema.safeParse({ s: null }).success, false);
  assert.equal(schema.safeParse({ n: null, e: null }).success, true);
  const absent = schema.safeParse({ n: null });
  assert.equal(absent.success, true);
  if (absent.success) assert.equal("s" in absent.data, false);
});

test("object: optional object schema rejects non-objects", () => {
  const schema = z.object({ a: z.string() }).optional();
  assert.equal(schema.safeParse(undefined).success, true);
  assert.equal(schema.safeParse("a").success, false);
});

test("issues are reported in declaration order", () => {
  const schema = z.object({
    id: z.string(),
    ts: z.number(),
    suggestedSkill: z.string().regex(/^[a-z-]+$/),
  });
  const failed = schema.safeParse({ id: 1, ts: "a", suggestedSkill: "BAD" });
  assert.equal(failed.success, false);
  if (!failed.success) {
    assert.deepEqual(
      failed.error.issues.map((issue) => issue.path[0]),
      ["id", "ts", "suggestedSkill"],
    );
  }
});

test("nested objects report a dotted-walkable path", () => {
  const schema = z.object({ outer: z.object({ inner: z.string() }) });
  const failed = schema.safeParse({ outer: { inner: 7 } });
  assert.equal(failed.success, false);
  if (!failed.success) assert.deepEqual(firstPath(failed), "outer");
  if (!failed.success) assert.deepEqual(failed.error.issues[0]?.path, ["outer", "inner"]);
});
