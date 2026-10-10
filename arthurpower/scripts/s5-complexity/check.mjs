#!/usr/bin/env node
/**
 * S5 complexity gate. Run from a project that has `eslint` and
 * `typescript-eslint` in node_modules.
 *
 * Two modes:
 *
 *   node check.mjs [paths...]            full audit of whole files (default src)
 *   node check.mjs --changed [--staged]  ratchet over diff-touched functions
 *
 * Full audit — the original behavior, unchanged. Reports every hard-gate
 * violation and every soft metric in the given paths; this is the track that
 * surfaces pre-existing debt and god files (`lint:s5:all`).
 *
 * Ratchet — what the pre-commit hook runs. Only functions the diff touches are
 * audited, each against its own version at the baseline ref (HEAD, or --base):
 * a new function must be clean, an existing function must not gain hard-gate
 * errors. Equal or fewer errors pass — a passing commit never owes an
 * unrelated refactor, and a file's historical debt never blocks a one-line
 * change to it. Pre-existing debt is discovered by the full audit, not here.
 *
 * Hard gates (complexity, max-depth) → exit 1. Soft metrics are reported by
 * the full audit only; the ratchet ignores them.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listChangedFromGit, resolveTargets } from "./resolve-targets.mjs";
import {
  assembleSpanLists,
  attributedErrors,
  hardMetrics,
  parseDiffHunks,
  ratchetVerdict,
  scopePairs,
} from "./scoped-rules.mjs";
import { createEslintTools } from "./eslint-ast.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const config = join(here, "eslint.config.mjs");
const cwd = process.cwd();
const eslintJs = join(cwd, "node_modules", "eslint", "bin", "eslint.js");

/**
 * Run git. `allowFailure` returns null instead of throwing (e.g. a path that
 * does not exist at the baseline ref).
 */
function git(args, allowFailure = false) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    if (allowFailure) return null;
    throw new Error(
      `s5-complexity: git ${args.join(" ")} failed:\n${result.stderr || result.error?.message || result.stdout}`,
    );
  }
  return result.stdout;
}

let resolved;
try {
  resolved = resolveTargets({
    argv: process.argv.slice(2),
    listChanged: (opts) => listChangedFromGit({ ...opts, run: git }),
    exists: (p) => existsSync(join(cwd, p)),
  });
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
}

if (resolved.emptyChanged) {
  console.log("s5-complexity: no changed code files; skip.");
  process.exit(0);
}

if (!existsSync(join(cwd, "package.json"))) {
  console.error("s5-complexity: run from a project root (package.json missing).");
  process.exit(2);
}
if (!existsSync(eslintJs)) {
  console.error(
    "s5-complexity: install eslint and typescript-eslint in this project:\n  npm i -D eslint typescript-eslint",
  );
  process.exit(2);
}

/**
 * ESLint (S5 config) over the given paths, streaming the normal report.
 * Whole files, both hard gates and soft metrics.
 *
 * @param {string[]} paths
 * @returns {number} exit status
 */
function runEslintCli(paths) {
  const result = spawnSync(
    process.execPath,
    [eslintJs, "-c", config, "--no-config-lookup", ...paths],
    { cwd, encoding: "utf8", stdio: "inherit" },
  );
  if (result.error) {
    console.error(result.error.message);
    return 2;
  }
  return result.status ?? 2;
}

// ---------------------------------------------------------------------------
// Full audit: whole files, unchanged from the original gate.
// ---------------------------------------------------------------------------
if (!resolved.changed) {
  process.exit(runEslintCli(resolved.paths));
}

// ---------------------------------------------------------------------------
// Ratchet: only diff-touched functions, each against its baseline version.
// ---------------------------------------------------------------------------

/** The ref the diff's old side comes from. */
const baselineRef = resolved.base ?? "HEAD";

/**
 * Diff flags matching the revision range `resolveTargets` enumerated, so hunks
 * and the audited file list can never describe different revisions.
 * @returns {string[]}
 */
function diffArgsForMode() {
  if (resolved.base !== null) return ["diff", "-U0", resolved.base, "--"];
  if (resolved.staged) return ["diff", "-U0", "--cached", "--"];
  // Unstaged + staged together; untracked files are added separately below.
  return ["diff", "-U0", "HEAD", "--"];
}

/**
 * All hunks to audit. Untracked files have no diff at all, so each one is
 * synthesized as a single all-new hunk: every function in it is new, and new
 * functions must be clean.
 *
 * @returns {import("./scoped-rules.mjs").DiffHunk[]}
 */
function collectHunks() {
  const hunks = parseDiffHunks(git([...diffArgsForMode(), ...resolved.paths]));
  if (resolved.base !== null || resolved.staged) return hunks;
  const known = new Set(hunks.map((h) => h.file));
  for (const file of resolved.paths) {
    if (known.has(file)) continue;
    const text = readWorking(file);
    if (text === null) continue;
    const lines = text.split(/\r?\n/).length;
    hunks.push({
      file,
      startLine: 1,
      endLine: lines,
      oldFile: null,
      oldStartLine: null,
      oldEndLine: null,
      oldInserted: true,
    });
  }
  return hunks;
}

/** Working-tree text, or null when unreadable. */
function readWorking(file) {
  try {
    return readFileSync(join(cwd, file), "utf8");
  } catch {
    return null;
  }
}

/** Baseline-ref text, or null when the path did not exist there. */
function readBaseline(file) {
  return git(["show", `${baselineRef}:${file}`], true);
}

const hunks = collectHunks();
if (hunks.length === 0) {
  console.log("s5-complexity: diff adds no lines; skip.");
  process.exit(0);
}

const tools = await createEslintTools(cwd);
const analyses = new Map(); // "side:path" → {spans, reports}|null

/**
 * Lint + spans for one side of the diff, cached per (side, path). Returns null
 * when the text is unavailable or the file is outside the audited set (tests,
 * specs) — such files are never ratcheted.
 *
 * `file` is repo-relative: spans are stamped with it so they compare directly
 * against hunk paths; the linter only ever sees the basename.
 */
function analyze(side, file) {
  const key = `${side}:${file}`;
  if (analyses.has(key)) return analyses.get(key);
  const text = side === "working" ? readWorking(file) : readBaseline(file);
  let result = null;
  if (text !== null) {
    const lint = tools.lint(file, text);
    result = lint.ignored
      ? null
      : { spans: tools.spans(file, text), reports: lint.reports };
  }
  analyses.set(key, result);
  return result;
}

/**
 * Hard-gate metrics for one function on both sides. `null` when the working
 * side is unaudited (ignored path, unreadable file).
 *
 * A baseline that cannot be read counts as unknown: the function is then
 * treated as new, so its own debt must be clean.
 */
function auditPair(pair) {
  const current = analyze("working", pair.current.file);
  if (current === null) return null;
  const baseline =
    pair.baseline === null || pair.baselineFile === null
      ? null
      : analyze("baseline", pair.baselineFile);
  return {
    current: hardMetrics(
      attributedErrors(current.reports, current.spans, pair.current),
    ),
    baseline:
      baseline === null || pair.baseline === null
        ? new Map()
        : hardMetrics(
            attributedErrors(baseline.reports, baseline.spans, pair.baseline),
          ),
    isBaselineKnown: pair.baseline !== null && baseline !== null,
  };
}

// Each side is assembled by distinct file, not per-hunk: a file touched by N
// hunks contributes its span list once, so a unique-named function in that
// file still appears once in the flat list — preserving uniqueNameMatch's
// exactly-one semantics inside scopePairs.
const currentFunctions = assembleSpanLists(
  hunks,
  (h) => h.file,
  (file) => analyze("working", file)?.spans ?? [],
);
const baselineFunctions = assembleSpanLists(
  hunks,
  (h) => h.oldFile,
  (file) => analyze("baseline", file)?.spans ?? [],
);
const pairs = scopePairs(hunks, currentFunctions, baselineFunctions);

if (pairs.length === 0) {
  console.log("s5-complexity: diff touches no function bodies; skip.");
  process.exit(0);
}

let failed = 0;
for (const pair of pairs) {
  const audit = auditPair(pair);
  if (audit === null) continue; // file outside the audited set
  const verdict = ratchetVerdict({
    isBaselineKnown: audit.isBaselineKnown,
    baseline: audit.baseline,
    current: audit.current,
  });
  const label = `${pair.current.file}:${pair.current.startLine} ${pair.current.selector}`;
  if (verdict.fail) {
    failed += 1;
    console.error(`✖ ${label}\n    ${verdict.reason}`);
    for (const [rule, value] of audit.current) {
      console.error(`    - ${rule} = ${value}`);
    }
  } else {
    console.log(`✔ ${label} — ${verdict.reason}`);
  }
}

if (failed > 0) {
  console.error(
    `\ns5-complexity: ${failed} touched function(s) regressed against ${baselineRef}.\n` +
      `Split the function or drop the added branching. Whole-file debt (including\n` +
      `god files) is reported separately by the full audit: npm run lint:s5:all`,
  );
  process.exit(1);
}
console.log(`s5-complexity: ${pairs.length} touched function(s) within baseline.`);
