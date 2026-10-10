/**
 * Function-scope resolution for the S5 ratchet (--changed / --staged).
 *
 * File-level scanning drags a file's whole historical debt into every commit
 * that touches one line of it. This module narrows the audit to functions the
 * diff actually touches, then lets check.mjs compare each function against its
 * baseline version: new functions must be clean; existing functions must not
 * get worse. Discovering pre-existing debt stays with full-repo audits
 * (`lint:s5:all`), not the per-commit gate.
 *
 * Attribution is deliberately conservative in ONE direction: a function is
 * treated as new only on positive evidence (its lines exist nowhere at the
 * baseline). Anything ambiguous is left to the full audit rather than guessed
 * at, because a wrong "new" verdict blocks a legitimate commit, while a
 * skipped function is still covered by `lint:s5:all`.
 *
 * Everything here is pure: git runs in check.mjs, AST parsing in eslint-ast.mjs.
 */

/**
 * One diff hunk, both sides resolved to 1-based inclusive line ranges.
 *
 * `file`/`startLine`/`endLine` are the NEW side. `oldFile` is the path at the
 * baseline ref (null for a new file). The old side also carries an ANCHOR: for
 * a modification, the changed range [oldStartLine, oldEndLine]; for a pure
 * insertion there are no old lines, so `oldInserted` is set and the anchor is
 * the site the text was inserted after — the pair (oldStartLine,
 * oldStartLine + 1) brackets it.
 *
 * @typedef {Object} DiffHunk
 * @property {string} file
 * @property {number} startLine
 * @property {number} endLine
 * @property {string|null} oldFile
 * @property {number|null} oldStartLine
 * @property {number|null} oldEndLine
 * @property {boolean} oldInserted true → no old lines of its own
 */

/**
 * A function span, as extracted from source text (eslint-ast.mjs).
 * @typedef {Object} FunctionSpan
 * @property {string} file
 * @property {string} selector ESLint visitor key that produced this span
 * @property {string|null} name function name, or null when anonymous
 * @property {number} startLine 1-based inclusive
 * @property {number} endLine   1-based inclusive
 */

/**
 * A touched function and its baseline counterpart. `baseline` is null when the
 * function is new, and then its errors must be zero.
 * @typedef {Object} ScopedPair
 * @property {FunctionSpan} current
 * @property {FunctionSpan|null} baseline
 * @property {string|null} baselineFile path at the baseline ref (differs from
 *   `current.file` after a rename); null when `baseline` is null
 */

/**
 * An ESLint report reduced to what attribution needs.
 * @typedef {Object} LintReport
 * @property {number} severity 2 = error, 1 = warning
 * @property {number} line 1-based
 */

/**
 * Parse unified `git diff -U0` output into hunks with both sides resolved.
 *
 * Header detection is stateful: content lines are consumed by the counter
 * taken from the `@@` header, so an added line whose text happens to begin
 * with `+++` can never be mistaken for a file header. Binary / rename-only
 * entries carry no hunks and drop out naturally. Pure.
 *
 * @param {string} diffText
 * @returns {DiffHunk[]}
 */
export function parseDiffHunks(diffText) {
  const hunks = [];
  let file = null;
  let oldFile = null;
  let remaining = 0;
  for (const rawLine of diffText.split(/\r?\n/)) {
    // Not counted by the @@ header, so it must not consume the counter.
    if (rawLine.startsWith("\\ No newline")) continue;
    if (remaining > 0) {
      remaining -= 1;
      continue; // inside a hunk body: never a header
    }
    if (rawLine.startsWith("--- ")) {
      // `--- /dev/null` (new file) → nothing at the baseline to compare to.
      oldFile = rawLine.startsWith("--- a/") ? rawLine.slice(6) : null;
      continue;
    }
    if (rawLine.startsWith("+++ ")) {
      // `+++ /dev/null` (deleted file) → no new side to audit.
      file = rawLine.startsWith("+++ b/") ? rawLine.slice(6) : null;
      continue;
    }
    const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(rawLine);
    if (match === null) continue;
    const oldStart = Number(match[1]);
    const oldCount = match[2] === undefined ? 1 : Number(match[2]);
    const startLine = Number(match[3]);
    const count = match[4] === undefined ? 1 : Number(match[4]);
    remaining = oldCount + count;
    // Pure deletion: nothing new-side to measure. (Removing branches can only
    // lower complexity, so the ratchet has nothing to catch here either.)
    if (file === null || count === 0) continue;
    hunks.push({
      file,
      startLine,
      endLine: startLine + count - 1,
      oldFile,
      oldStartLine: oldFile === null ? null : oldStart,
      oldEndLine: oldFile === null || oldCount === 0 ? null : oldStart + oldCount - 1,
      oldInserted: oldCount === 0,
    });
  }
  return hunks;
}

/**
 * Flatten `getSpans(file)` over `hunks`, deduplicating by the file selected via
 * `selectFile(hunk)` so each touched file contributes its span list exactly
 * once. A `selectFile` that returns `null` (e.g. `h.oldFile` for a new file)
 * skips that hunk silently.
 *
 * This is the seam that preserves `uniqueNameMatch`'s exactly-one semantics:
 * naively doing `hunks.flatMap((h) => getSpans(h.file) ?? [])` duplicates
 * every span of a file once per hunk touching it, which makes a unique-named
 * function appear multiple times in `currentFunctions` and breaks name-based
 * pairing. Pure.
 *
 * @param {DiffHunk[]} hunks
 * @param {(hunk: DiffHunk) => string|null} selectFile
 * @param {(file: string) => FunctionSpan[]|null|undefined} getSpans
 * @returns {FunctionSpan[]}
 */
export function assembleSpanLists(hunks, selectFile, getSpans) {
  const seen = new Set();
  const out = [];
  for (const hunk of hunks) {
    const file = selectFile(hunk);
    if (file === null) continue;
    if (seen.has(file)) continue;
    seen.add(file);
    out.push(...(getSpans(file) ?? []));
  }
  return out;
}

/**
 * Innermost span in `functions` covering [startLine, endLine].
 *
 * Attribution resolves to the innermost candidate: an edit inside a nested
 * closure belongs to the closure, not to the component declaring it (ESLint
 * scores nested functions as independent scopes). Ties (identical spans) keep
 * the first for determinism. Pure.
 *
 * @param {FunctionSpan[]} functions
 * @param {string} file
 * @param {number} startLine
 * @param {number} endLine
 * @returns {FunctionSpan|null}
 */
export function innermostSpan(functions, file, startLine, endLine) {
  let best = null;
  for (const fn of functions) {
    if (fn.file !== file) continue;
    if (fn.endLine < startLine || endLine < fn.startLine) continue;
    if (best === null || fn.endLine - fn.startLine < best.endLine - best.startLine) {
      best = fn;
    }
  }
  return best;
}

/**
 * The distinct spans owning the lines [fromLine, toLine].
 *
 * Ownership is resolved per LINE, not from the range's endpoints: one hunk can
 * run through several functions, and a whole-file range (a new file) must claim
 * every function in it, not only those at its ends.
 *
 * @param {FunctionSpan[]} functions
 * @param {string} file
 * @param {number} fromLine
 * @param {number} toLine
 * @returns {FunctionSpan[]}
 */
export function spansOwningLines(functions, file, fromLine, toLine) {
  const owners = [];
  for (let line = fromLine; line <= toLine; line += 1) {
    const owner = innermostSpan(functions, file, line, line);
    if (owner !== null && !owners.includes(owner)) owners.push(owner);
  }
  return owners;
}

/**
 * A function's name, when it is UNAMBIGUOUS on both sides of the diff.
 *
 * A name is used as identity only when exactly one function in the same file
 * carries it in the working tree AND exactly one carried it at the baseline.
 * Anything else — no name (anonymous callbacks), two same-named methods in one
 * file — falls back to line geometry, because a wrong name match would compare
 * a function against an unrelated one and could hide new debt.
 *
 * @param {FunctionSpan} current
 * @param {FunctionSpan[]} currentFunctions
 * @param {FunctionSpan[]} baselineFunctions
 * @param {string} baseFile
 * @returns {FunctionSpan|null}
 */
function uniqueNameMatch(current, currentFunctions, baselineFunctions, baseFile) {
  if (typeof current.name !== "string" || current.name === "") return null;
  const here = currentFunctions.filter(
    (fn) => fn.file === current.file && fn.name === current.name,
  );
  if (here.length !== 1) return null;
  const there = baselineFunctions.filter(
    (fn) => fn.file === baseFile && fn.name === current.name,
  );
  return there.length === 1 ? there[0] : null;
}

/**
 * Baseline counterpart of `current`, or null when the function is new.
 *
 * Resolution order, each step a stronger statement than the next:
 *
 * 1. unique name — identity that survives line churn and code moves. A move
 *    is a deletion plus an insertion, and only the name tells them apart.
 * 2. no old side at all (new file) → new;
 * 3. inserted whole — the function lies entirely inside insert-only text, so
 *    every line of it is new. Step 4 would otherwise pair it with whichever
 *    function happens to precede the insertion site.
 * 4. line geometry: the old anchor lines own exactly one function. A rewrite
 *    in place lands here and pairs with what used to be at those lines, which
 *    is normally the same function — the author is then judged against its own
 *    baseline, not falsely treated as new. Lines no function owns are ignored,
 *    so editing a function's last line plus the blank line after it still
 *    resolves to that function.
 * 5. an anchor owning nothing at all → new (nothing was there before).
 *
 * Anything else — an anchor straddling two functions — returns "unknown" and
 * the pair is dropped: guessing could block a legitimate commit, and the full
 * audit still covers the file. Pure.
 *
 * @param {DiffHunk} hunk
 * @param {FunctionSpan} current
 * @param {FunctionSpan[]} currentFunctions
 * @param {FunctionSpan[]} baselineFunctions
 * @returns {{baseline: FunctionSpan, file: string}|null|"unknown"}
 */
function resolveBaseline(hunk, current, currentFunctions, baselineFunctions) {
  if (hunk.oldFile === null) return null; // new file
  const named = uniqueNameMatch(
    current,
    currentFunctions,
    baselineFunctions,
    hunk.oldFile,
  );
  if (named !== null) return { baseline: named, file: hunk.oldFile };
  if (
    hunk.oldInserted &&
    hunk.startLine <= current.startLine &&
    current.endLine <= hunk.endLine
  ) {
    return null; // every line of it is new text
  }
  if (hunk.oldStartLine === null) return null; // no old side to anchor to
  // An insertion has no old lines; the site is bracketed by the line before
  // and after it, so BOTH must be checked or an appended function could claim
  // its neighbour.
  const owners = spansOwningLines(
    baselineFunctions,
    hunk.oldFile,
    hunk.oldStartLine,
    hunk.oldEndLine ?? hunk.oldStartLine + 1,
  );
  if (owners.length === 1) return { baseline: owners[0], file: hunk.oldFile };
  if (owners.length === 0) return null; // nothing was here before
  return "unknown"; // straddles two functions
}

/**
 * Pair each diff-touched function (working tree) with its baseline counterpart.
 *
 * Both sides of a hunk are resolved from the SAME hunk — the working-tree side
 * against working-tree spans, the baseline side against baseline spans — so
 * lines are never matched across versions by name or position: a function
 * whose body shifted still pairs with itself. Hunks outside any function
 * (module top level, e.g. import edits) claim nothing: import churn is not
 * complexity debt.
 *
 * A function touched by several hunks keeps the first baseline that resolves:
 * one ambiguous hunk must not erase what another hunk established. Pure.
 *
 * @param {DiffHunk[]} hunks
 * @param {FunctionSpan[]} currentFunctions working-tree spans
 * @param {FunctionSpan[]} baselineFunctions baseline-ref spans
 * @returns {ScopedPair[]}
 */
export function scopePairs(hunks, currentFunctions, baselineFunctions) {
  const out = new Map();
  for (const hunk of hunks) {
    const currents = spansOwningLines(
      currentFunctions,
      hunk.file,
      hunk.startLine,
      hunk.endLine,
    );
    for (const current of currents) {
      const resolved = resolveBaseline(
        hunk,
        current,
        currentFunctions,
        baselineFunctions,
      );
      if (resolved === "unknown") continue; // not attributable; full audit covers it
      const key = `${current.file}:${current.selector}:${current.startLine}`;
      if (out.get(key)?.baseline != null) continue; // keep a known baseline
      out.set(key, {
        current,
        baseline: resolved === null ? null : resolved.baseline,
        baselineFile: resolved === null ? null : resolved.file,
      });
    }
  }
  return [...out.values()];
}

/**
 * Hard-gate errors attributable to one function.
 *
 * ESLint's function-scoped rules anchor their report on a line the function
 * owns — `complexity` on the function's start line (verified), `max-depth` on
 * the deepest offending block (verified) — so the innermost span containing
 * that line owns the report. Warnings are excluded: the ratchet only ratchets
 * hard gates, and soft metrics (function/file length, params) stay review
 * triggers surfaced by the full audit. Pure.
 *
 * @param {LintReport[]} reports errors+warnings for one file
 * @param {FunctionSpan[]} spans that file's spans (same objects as `target`)
 * @param {FunctionSpan} target
 * @returns {LintReport[]} the attributable errors
 */
export function attributedErrors(reports, spans, target) {
  const out = [];
  for (const report of reports) {
    if (report.severity !== 2) continue;
    const owner = innermostSpan(spans, target.file, report.line, report.line);
    if (owner === target) out.push(report);
  }
  return out;
}

/**
 * Measured value out of an ESLint message, per rule.
 *
 * Comparing MEASURED VALUES, not error counts, is what makes the ratchet
 * meaningful: a function already at complexity 49 keeps exactly one
 * `complexity` error whether it grows or not, so counting errors would let an
 * author add branches to a god function unnoticed. The value moves (49 → 50)
 * and is caught.
 *
 * Unknown rules fall back to 1: the rule's presence is then the whole signal,
 * which is the right granularity for a gate whose message format we cannot
 * parse.
 *
 * @param {{ruleId: string|null, message: string}} report
 * @returns {number}
 */
export function metricValue(report) {
  for (const pattern of [
    /complexity of (\d+)/,
    /nested too deeply \((\d+)\)/,
    /has too many lines \((\d+)\)/,
    /too many parameters \((\d+)\)/,
  ]) {
    const match = pattern.exec(report.message);
    if (match !== null) return Number(match[1]);
  }
  return 1;
}

/**
 * Per-rule maximum of the hard-gate metrics a function owns.
 *
 * Max, not first: several reports of one rule (two nested arrows both too
 * deep) describe one function's debt, and the largest is the one that must not
 * grow. Pure.
 *
 * @param {LintReport[]} reports errors attributed to one function
 * @returns {Map<string, number>} ruleId → measured value
 */
export function hardMetrics(reports) {
  const out = new Map();
  for (const report of reports) {
    const rule = report.ruleId ?? "unknown";
    const value = metricValue(report);
    const previous = out.get(rule);
    if (previous === undefined || value > previous) out.set(rule, value);
  }
  return out;
}

/** Rule-by-rule comparison, largest overshoot first, for the failure message. */
function regressions(baseline, current) {
  const out = [];
  for (const [rule, value] of current) {
    const before = baseline.get(rule) ?? 0;
    if (value > before) out.push({ rule, value, before });
  }
  return out.sort((a, b) => b.value - b.before - (a.value - a.before));
}

/** "complexity 50 (baseline 49)" — the shape every verdict line uses. */
function describe(regression) {
  return regression.before === 0
    ? `${regression.rule} ${regression.value} (was within threshold)`
    : `${regression.rule} ${regression.value} (baseline ${regression.before})`;
}

/**
 * Ratchet verdict for one audited function, over its hard-gate metrics.
 *
 * `isBaselineKnown=false` → the function is new in this diff: any hard-gate
 * error fails.
 * `isBaselineKnown=true` → it existed at the baseline ref: fail only when a
 * metric GREW. Equal or smaller passes — no forced improvement, so a passer-by
 * never owes an unrelated refactor, but any added branch to an already-failing
 * function is still caught. Pure.
 *
 * @param {{isBaselineKnown: boolean, baseline: Map<string, number>, current: Map<string, number>}} args
 * @returns {{fail: boolean, reason: string}}
 */
export function ratchetVerdict(args) {
  if (!args.isBaselineKnown) {
    return args.current.size > 0
      ? {
          fail: true,
          reason: `new function exceeds thresholds: ${[...args.current]
            .map(([rule, value]) => `${rule} ${value}`)
            .join(", ")}`,
        }
      : { fail: false, reason: "new function clean" };
  }
  const worse = regressions(args.baseline, args.current);
  if (worse.length > 0) {
    return {
      fail: true,
      reason: `regressed: ${worse.map(describe).join(", ")}`,
    };
  }
  const held = [...args.current]
    .map(([rule, value]) => `${rule} ${value}`)
    .join(", ");
  return {
    fail: false,
    reason: held === "" ? "clean" : `at or below baseline (${held})`,
  };
}
