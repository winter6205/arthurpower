import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assembleSpanLists,
  attributedErrors,
  hardMetrics,
  innermostSpan,
  metricValue,
  parseDiffHunks,
  ratchetVerdict,
  scopePairs,
} from "./scoped-rules.mjs";

test("parseDiffHunks: hunk carries both sides, 1-based inclusive", () => {
  const diff = [
    "diff --git a/src/a.ts b/src/a.ts",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -10,3 +10,5 @@ fn context",
    " ctx",
    "+added one",
    "+added two",
    " ctx",
  ].join("\n");
  assert.deepEqual(parseDiffHunks(diff), [
    {
      file: "src/a.ts",
      startLine: 10,
      endLine: 14,
      oldFile: "src/a.ts",
      oldStartLine: 10,
      oldEndLine: 12,
      oldInserted: false,
    },
  ]);
});

test("parseDiffHunks: single-line hunk defaults both counts to 1", () => {
  const diff = [
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -3 +3 @@",
    "-old",
    "+new",
  ].join("\n");
  assert.deepEqual(parseDiffHunks(diff), [
    {
      file: "src/a.ts",
      startLine: 3,
      endLine: 3,
      oldFile: "src/a.ts",
      oldStartLine: 3,
      oldEndLine: 3,
      oldInserted: false,
    },
  ]);
});

test("parseDiffHunks: pure insertion anchors after old line N", () => {
  // `git diff -U0` renders a pure insertion as `-N,0`.
  const diff = [
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -4,0 +5,2 @@",
    "+new one",
    "+new two",
  ].join("\n");
  assert.deepEqual(parseDiffHunks(diff), [
    {
      file: "src/a.ts",
      startLine: 5,
      endLine: 6,
      oldFile: "src/a.ts",
      oldStartLine: 4,
      oldEndLine: null,
      oldInserted: true,
    },
  ]);
});

test("parseDiffHunks: new file has no old side, deleted file no new side", () => {
  const diff = [
    "--- /dev/null",
    "+++ b/src/fresh.ts",
    "@@ -0,0 +1,2 @@",
    "+a",
    "+b",
    "--- a/src/gone.ts",
    "+++ /dev/null",
    "@@ -1,3 +0,0 @@",
    "-a",
    "-b",
  ].join("\n");
  assert.deepEqual(parseDiffHunks(diff), [
    {
      file: "src/fresh.ts",
      startLine: 1,
      endLine: 2,
      oldFile: null,
      oldStartLine: null,
      oldEndLine: null,
      oldInserted: true,
    },
  ]);
});

test("parseDiffHunks: content line shaped like a header is not a header", () => {
  // The counter from the @@ header is what keeps the body opaque.
  const diff = [
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -1 +1,2 @@",
    "+--- not a header",
    "++++ not a header either",
  ].join("\n");
  assert.deepEqual(parseDiffHunks(diff), [
    {
      file: "src/a.ts",
      startLine: 1,
      endLine: 2,
      oldFile: "src/a.ts",
      oldStartLine: 1,
      oldEndLine: 1,
      oldInserted: false,
    },
  ]);
});

test("parseDiffHunks: empty diff → empty list", () => {
  assert.deepEqual(parseDiffHunks(""), []);
});

const CURRENT = [
  { file: "src/a.ts", selector: "FunctionDeclaration", startLine: 2, endLine: 20 },
  { file: "src/a.ts", selector: "ArrowFunctionExpression", startLine: 6, endLine: 12 },
  { file: "src/b.ts", selector: "FunctionDeclaration", startLine: 1, endLine: 8 },
];
const BASELINE = [
  { file: "src/a.ts", selector: "FunctionDeclaration", startLine: 2, endLine: 20 },
  { file: "src/a.ts", selector: "ArrowFunctionExpression", startLine: 6, endLine: 12 },
];

/** Minimal modification hunk: both sides span the same lines. */
function hunk(file, startLine, endLine) {
  return {
    file,
    startLine,
    endLine,
    oldFile: file,
    oldStartLine: startLine,
    oldEndLine: endLine,
    oldInserted: false,
  };
}

/** Pure insertion of [startLine, endLine] in NEW numbering after old line N. */
function insertedHunk(file, startLine, endLine, afterOldLine) {
  return {
    file,
    startLine,
    endLine,
    oldFile: file,
    oldStartLine: afterOldLine,
    oldEndLine: null,
    oldInserted: true,
  };
}

test("scopePairs: innermost function wins for nested spans", () => {
  const pairs = scopePairs([hunk("src/a.ts", 8, 9)], CURRENT, BASELINE);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].current.selector, "ArrowFunctionExpression");
  assert.equal(pairs[0].baseline.selector, "ArrowFunctionExpression");
});

test("scopePairs: hunk outside any function claims nothing", () => {
  assert.deepEqual(scopePairs([hunk("src/a.ts", 40, 41)], CURRENT, BASELINE), []);
});

test("scopePairs: hunks dedupe to one entry per touched function", () => {
  const pairs = scopePairs(
    [hunk("src/b.ts", 2, 2), hunk("src/b.ts", 6, 7), hunk("src/b.ts", 7, 8)],
    CURRENT,
    BASELINE,
  );
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].current.file, "src/b.ts");
  assert.equal(pairs[0].baseline, null); // src/b.ts absent at baseline
});

test("scopePairs: import churn at top of file claims nothing", () => {
  assert.deepEqual(scopePairs([hunk("src/a.ts", 1, 1)], CURRENT, BASELINE), []);
});

test("scopePairs: function modified in place keeps its baseline", () => {
  const pairs = scopePairs([hunk("src/a.ts", 8, 9)], CURRENT, BASELINE);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].baseline.startLine, 6);
  assert.equal(pairs[0].baselineFile, "src/a.ts");
});

test("scopePairs: lines inserted INSIDE an existing function keep its baseline", () => {
  // Lines 8-9 are new, tucked between line 7 and line 12 of the arrow (6-12).
  // The insertion point (old line 7) is inside the same arrow at the baseline.
  const pairs = scopePairs([insertedHunk("src/a.ts", 8, 9, 7)], CURRENT, BASELINE);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].current.selector, "ArrowFunctionExpression");
  assert.equal(pairs[0].baseline.selector, "ArrowFunctionExpression");
});

test("scopePairs: a wholly new function is not credited to its neighbour", () => {
  // Lines 21-25 are inserted after old line 20, i.e. right after the outer
  // function (2-20) ends. The new function there has no baseline.
  const created = [
    { file: "src/a.ts", selector: "FunctionDeclaration", startLine: 21, endLine: 25 },
  ];
  const pairs = scopePairs(
    [insertedHunk("src/a.ts", 21, 25, 20)],
    [...CURRENT, ...created],
    BASELINE,
  );
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].current.startLine, 21);
  assert.equal(pairs[0].baseline, null);
  assert.equal(pairs[0].baselineFile, null);
});

test("scopePairs: new file's functions have no baseline", () => {
  const fresh = {
    file: "src/fresh.ts",
    startLine: 1,
    endLine: 10,
    oldFile: null,
    oldStartLine: null,
    oldEndLine: null,
    oldInserted: true,
  };
  const pairs = scopePairs(
    [fresh],
    [...CURRENT, { file: "src/fresh.ts", selector: "FunctionDeclaration", startLine: 1, endLine: 10 }],
    BASELINE,
  );
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].baseline, null);
});

test("scopePairs: hunk straddling two functions has no single baseline", () => {
  // The old range covers the tail of one function AND the head of the next,
  // so no single function can be called the baseline: the pair is dropped
  // rather than guessed at. (A range overlapping a function plus an ownerless
  // blank line does resolve — that is the ignore-nulls rule above.)
  const second = { file: "src/a.ts", selector: "FunctionDeclaration", startLine: 24, endLine: 32 };
  const baseline = [...BASELINE, second];
  const current = [...BASELINE, second];
  const straddle = {
    file: "src/a.ts",
    startLine: 20,
    endLine: 25,
    oldFile: "src/a.ts",
    oldStartLine: 20,
    oldEndLine: 25,
    oldInserted: false,
  };
  assert.deepEqual(scopePairs([straddle], current, baseline), []);
});

test("scopePairs: function edited together with a following blank line keeps its baseline", () => {
  // Old range = the outer function's last line (20) plus the blank line 21.
  // Line 21 has no owner; ignoring ownerless lines still resolves the pair.
  const outerLine19To21 = {
    file: "src/a.ts",
    startLine: 19,
    endLine: 21,
    oldFile: "src/a.ts",
    oldStartLine: 19,
    oldEndLine: 21,
    oldInserted: false,
  };
  const current = [
    { file: "src/a.ts", selector: "FunctionDeclaration", startLine: 2, endLine: 21 },
  ];
  const baseline = [
    { file: "src/a.ts", selector: "FunctionDeclaration", startLine: 2, endLine: 20 },
  ];
  const pairs = scopePairs([outerLine19To21], current, baseline);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].baseline.startLine, 2);
});

test("scopePairs: an existing function's baseline survives an ambiguous hunk", () => {
  // Two hunks land in the same arrow (6-12): one modification whose baseline
  // resolves, and one boundary insertion whose anchor straddles outer (line 5)
  // and the arrow (line 6), so it resolves nothing. Whichever order they run
  // in, the arrow must stay an existing function — losing its baseline would
  // demand cleaning pre-existing debt as if the function were new.
  const modifying = hunk("src/a.ts", 8, 9);
  const straddling = insertedHunk("src/a.ts", 6, 7, 5);
  for (const order of [
    [modifying, straddling],
    [straddling, modifying],
  ]) {
    const pairs = scopePairs(order, CURRENT, BASELINE);
    assert.equal(pairs.length, 1, "both hunks touch the same function");
    assert.equal(pairs[0].current.selector, "ArrowFunctionExpression");
    assert.notEqual(pairs[0].baseline, null, "baseline must not be downgraded");
  }
});

test("innermostSpan: picks the smallest containing span", () => {
  const spans = [
    { file: "src/a.ts", selector: "FunctionDeclaration", startLine: 1, endLine: 30 },
    { file: "src/a.ts", selector: "ArrowFunctionExpression", startLine: 10, endLine: 20 },
  ];
  assert.equal(innermostSpan(spans, "src/a.ts", 12, 12).selector, "ArrowFunctionExpression");
  assert.equal(innermostSpan(spans, "src/a.ts", 28, 28).selector, "FunctionDeclaration");
  assert.equal(innermostSpan(spans, "other.ts", 12, 12), null);
});

test("attributedErrors: errors belong to the containing function, warnings never count", () => {
  const spans = [
    { file: "src/a.ts", selector: "FunctionDeclaration", startLine: 1, endLine: 30 },
    { file: "src/a.ts", selector: "ArrowFunctionExpression", startLine: 10, endLine: 20 },
  ];
  const reports = [
    { severity: 2, line: 1, ruleId: "complexity" }, // outer's own line
    { severity: 2, line: 15, ruleId: "max-depth" }, // innermost = arrow
    { severity: 1, line: 15, ruleId: "max-params" }, // warning → ignored
    { severity: 2, line: 10, ruleId: "complexity" }, // arrow's start line
  ];
  assert.deepEqual(
    attributedErrors(reports, spans, spans[1]).map((r) => `${r.ruleId}:${r.line}`),
    ["max-depth:15", "complexity:10"],
  );
  assert.deepEqual(
    attributedErrors(reports, spans, spans[0]).map((r) => `${r.ruleId}:${r.line}`),
    ["complexity:1"],
  );
});

test("attributedErrors: report outside every function is not attributable", () => {
  const spans = [
    { file: "src/a.ts", selector: "FunctionDeclaration", startLine: 5, endLine: 9 },
  ];
  assert.deepEqual(
    attributedErrors([{ severity: 2, line: 1, ruleId: "max-lines" }], spans, spans[0]),
    [],
  );
});

test("metricValue: reads the measured number out of the message", () => {
  assert.equal(
    metricValue({ ruleId: "complexity", message: "Function 'f' has a complexity of 49. Maximum allowed is 10." }),
    49,
  );
  assert.equal(
    metricValue({ ruleId: "max-depth", message: "Blocks are nested too deeply (5). Maximum allowed is 4." }),
    5,
  );
  assert.equal(
    metricValue({ ruleId: "max-lines-per-function", message: "Function 'f' has too many lines (586). Maximum allowed is 60" }),
    586,
  );
  assert.equal(
    metricValue({ ruleId: "max-params", message: "Function 'f' has too many parameters (5). Maximum allowed is 4." }),
    5,
  );
  // Unparseable message → presence alone is the signal.
  assert.equal(metricValue({ ruleId: "mystery", message: "boom" }), 1);
});

test("hardMetrics: per-rule maximum, one entry per rule", () => {
  const metrics = hardMetrics([
    { severity: 2, ruleId: "complexity", message: "complexity of 12." },
    { severity: 2, ruleId: "complexity", message: "complexity of 15." },
    { severity: 2, ruleId: "max-depth", message: "nested too deeply (5)." },
  ]);
  assert.equal(metrics.get("complexity"), 15);
  assert.equal(metrics.get("max-depth"), 5);
  assert.equal(metrics.size, 2);
});

test("ratchetVerdict: new function fails when any metric is over threshold", () => {
  const clean = ratchetVerdict({
    isBaselineKnown: false,
    baseline: new Map(),
    current: new Map(),
  });
  assert.equal(clean.fail, false);
  const dirty = ratchetVerdict({
    isBaselineKnown: false,
    baseline: new Map(),
    current: new Map([["complexity", 49]]),
  });
  assert.equal(dirty.fail, true);
  assert.match(dirty.reason, /complexity 49/);
});

test("ratchetVerdict: existing function fails on any metric GROWTH", () => {
  // The case that motivated value comparison: 49 → 50 is still one error
  // report, so counting errors would pass it. The metric must not.
  const grew = ratchetVerdict({
    isBaselineKnown: true,
    baseline: new Map([["complexity", 49]]),
    current: new Map([["complexity", 50]]),
  });
  assert.equal(grew.fail, true);
  assert.match(grew.reason, /complexity 50 \(baseline 49\)/);
});

test("ratchetVerdict: equal or improved metrics pass (no forced refactor)", () => {
  const equal = ratchetVerdict({
    isBaselineKnown: true,
    baseline: new Map([["complexity", 49]]),
    current: new Map([["complexity", 49]]),
  });
  assert.equal(equal.fail, false);
  const better = ratchetVerdict({
    isBaselineKnown: true,
    baseline: new Map([["complexity", 49]]),
    current: new Map([["complexity", 41]]),
  });
  assert.equal(better.fail, false);
});

test("ratchetVerdict: a behaviour metric appearing where there was none fails", () => {
  const appeared = ratchetVerdict({
    isBaselineKnown: true,
    baseline: new Map([["complexity", 12]]),
    current: new Map([
      ["complexity", 12],
      ["max-depth", 5],
    ]),
  });
  assert.equal(appeared.fail, true);
  assert.match(appeared.reason, /max-depth 5 \(was within threshold\)/);
});

test("assembleSpanLists: span lists are deduped per file so uniqueNameMatch keeps exactly-one semantics across multiple hunks", () => {
  // Regression: check.mjs used to call
  //   hunks.flatMap((h) => analyze("working", h.file)?.spans ?? [])
  // which duplicated every span of a file once per hunk touching that file.
  // When `foo` is unique-named but its file has 2 hunks, currentFunctions
  // would list `foo` twice → uniqueNameMatch's filter().length === 1 failed
  // → resolution fell to line geometry → unchanged `foo` was reported as a
  // complexity regression (ratchetVerdict.isBaselineKnown: false).
  // assembleSpanLists must call getSpans exactly once per distinct file,
  // preserving first-seen order, so each file's spans appear once.
  const spansByFile = {
    "src/a.ts": [
      { file: "src/a.ts", selector: "FunctionDeclaration", name: "foo", startLine: 1, endLine: 5 },
    ],
    "src/b.ts": [
      { file: "src/b.ts", selector: "FunctionDeclaration", name: "bar", startLine: 1, endLine: 3 },
    ],
  };
  const calls = [];
  const getSpans = (file) => {
    calls.push(file);
    return spansByFile[file] ?? [];
  };
  const hunks = [
    hunk("src/a.ts", 2, 2),
    hunk("src/a.ts", 4, 4),
    hunk("src/b.ts", 1, 1),
  ];
  const out = assembleSpanLists(hunks, (h) => h.file, getSpans);
  // First-seen order, one span per file.
  assert.deepEqual(
    out.map((s) => `${s.file}:${s.name}`),
    ["src/a.ts:foo", "src/b.ts:bar"],
  );
  // Getter called exactly once per distinct file, not per hunk.
  assert.deepEqual(calls, ["src/a.ts", "src/b.ts"]);
});

test("assembleSpanLists: selector returning null skips that hunk", () => {
  // Baseline side: h.oldFile is null for new files, those must contribute
  // nothing rather than throw or include a file=null lookup.
  const getSpans = (file) => {
    if (file === null) throw new Error("getSpans must not be called with null");
    return [];
  };
  const hunks = [
    {
      file: "src/fresh.ts",
      startLine: 1,
      endLine: 3,
      oldFile: null,
      oldStartLine: null,
      oldEndLine: null,
      oldInserted: true,
    },
    hunk("src/a.ts", 2, 2),
  ];
  assert.deepEqual(assembleSpanLists(hunks, (h) => h.oldFile, getSpans), []);
});
