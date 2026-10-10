import assert from "node:assert/strict";
import { test } from "node:test";
import { listChangedFromGit, parseArgs, resolveTargets } from "./resolve-targets.mjs";

test("no flags defaults to src", () => {
  assert.deepEqual(parseArgs([]), {
    changed: false,
    staged: false,
    base: null,
    paths: [],
  });
  assert.deepEqual(
    resolveTargets({
      argv: [],
      listChanged() {
        throw new Error("must not list git");
      },
      exists: () => true,
    }),
    {
      changed: false,
      staged: false,
      base: null,
      paths: ["src"],
      emptyChanged: false,
    },
  );
});

test("explicit paths skip git", () => {
  assert.deepEqual(
    resolveTargets({
      argv: ["lib", "apps/web"],
      listChanged() {
        throw new Error("must not list git");
      },
      exists: () => true,
    }),
    {
      changed: false,
      staged: false,
      base: null,
      paths: ["lib", "apps/web"],
      emptyChanged: false,
    },
  );
});

test("--changed with no matching files is emptyChanged", () => {
  const listed = [];
  const result = resolveTargets({
    argv: ["--changed"],
    listChanged(opts) {
      listed.push(opts);
      return ["README.md", "docs/a.md", "src/gone.ts"];
    },
    exists: (p) => p !== "src/gone.ts",
  });
  assert.deepEqual(listed, [{ staged: false, base: null }]);
  assert.deepEqual(result, {
    changed: true,
    staged: false,
    base: null,
    paths: [],
    emptyChanged: true,
  });
});

test("--changed keeps existing code files only", () => {
  const result = resolveTargets({
    argv: ["--changed"],
    listChanged: () => [
      "src/a.ts",
      "src/b.tsx",
      "src/c.md",
      "web/d.js",
      "gone.mjs",
    ],
    exists: (p) => p !== "gone.mjs",
  });
  assert.deepEqual(result, {
    changed: true,
    staged: false,
    base: null,
    paths: ["src/a.ts", "src/b.tsx", "web/d.js"],
    emptyChanged: false,
  });
});

test("--changed --staged and --base are passed through", () => {
  const listed = [];
  resolveTargets({
    argv: ["--changed", "--staged", "--base", "origin/main"],
    listChanged(opts) {
      listed.push(opts);
      return ["src/a.ts"];
    },
    exists: () => true,
  });
  assert.deepEqual(listed, [{ staged: true, base: "origin/main" }]);
});

test("listChangedFromGit default unions worktree, index, and untracked", () => {
  const calls = [];
  const names = listChangedFromGit({
    staged: false,
    base: null,
    run(args) {
      calls.push(args);
      if (args[0] === "ls-files") return "src/new.ts\n";
      if (args.includes("--cached")) return "src/staged.ts\n";
      return "src/unstaged.ts\n";
    },
  });
  assert.deepEqual(names, ["src/unstaged.ts", "src/staged.ts", "src/new.ts"]);
  assert.equal(calls[0][0], "diff");
  assert.ok(calls.some((a) => a.includes("--cached")));
  assert.ok(calls.some((a) => a[0] === "ls-files"));
});

test("listChangedFromGit --staged is index only", () => {
  const calls = [];
  listChangedFromGit({
    staged: true,
    base: null,
    run(args) {
      calls.push(args);
      return "";
    },
  });
  assert.deepEqual(calls, [
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
  ]);
});

test("listChangedFromGit --base diffs that ref", () => {
  const calls = [];
  listChangedFromGit({
    staged: false,
    base: "origin/main",
    run(args) {
      calls.push(args);
      return "src/a.ts\n";
    },
  });
  assert.deepEqual(calls, [
    ["diff", "--name-only", "--diff-filter=ACMR", "origin/main"],
  ]);
});

test("--changed rejects extra paths", () => {
  assert.throws(
    () =>
      resolveTargets({
        argv: ["--changed", "src"],
        listChanged: () => [],
        exists: () => true,
      }),
    /--changed does not take paths/,
  );
});
