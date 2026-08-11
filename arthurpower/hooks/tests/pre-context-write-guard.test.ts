// Driver-level tests for pre-context-write-guard.ts (gh-68: ADR edit-mode leniency,
// ADR-0022: transcript-primary skill-identity).
// Protocol: spawn the hook with a PreToolUse envelope on stdin; assert exit code
// (0=allow, 2=block) + stderr BLOCKED message.
// Isolation: CLAUDE_CONFIG_DIR → per-suite mkdtempSync tmpdir so readActiveSkill()
// finds no routing-state → identity check falls back to transcript (or fully
// fails open if no transcript path provided). Structural validation
// (validateAdr / validateAdrFragment) is enforced when activeSkill is unresolved.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HOOK = path.resolve(
  import.meta.dirname,
  "..",
  "pre-context-write-guard.ts",
);
const ADR_PATH = "docs/adr/0002-foo.md";
let cfgDir: string;

before(() => {
  cfgDir = fs.mkdtempSync(path.join(os.tmpdir(), "guard-test-"));
});
after(() => {
  fs.rmSync(cfgDir, { recursive: true, force: true });
});

function runHook(
  envelope: unknown,
  opts?: { cfgDir?: string; transcriptPath?: string },
): { status: number; stderr: string } {
  const targetCfg = opts?.cfgDir ?? cfgDir;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CLAUDE_CONFIG_DIR: targetCfg,
  };
  let payload: string;
  if (opts?.transcriptPath) {
    const env2 = envelope as Record<string, unknown>;
    payload = JSON.stringify({ ...env2, transcript_path: opts.transcriptPath });
  } else {
    payload = JSON.stringify(envelope);
  }
  const r = spawnSync(process.execPath, ["--experimental-strip-types", HOOK], {
    input: payload,
    env,
    encoding: "utf8",
    timeout: 10000,
  });
  return { status: r.status ?? -1, stderr: r.stderr };
}

// Extract the BLOCKED systemMessage from stderr (skip non-JSON [guard] hint lines).
function blockedMessage(stderr: string): string {
  for (const line of stderr.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t) as { systemMessage?: unknown };
      if (
        typeof obj.systemMessage === "string" &&
        obj.systemMessage.startsWith("BLOCKED: ")
      )
        return obj.systemMessage;
    } catch {
      /* non-JSON line */
    }
  }
  return "";
}

const edit = (newString: string, filePath: string = ADR_PATH) => ({
  tool_name: "Edit",
  tool_input: { file_path: filePath, old_string: "x", new_string: newString },
});
const write = (content: string, filePath: string = ADR_PATH) => ({
  tool_name: "Write",
  tool_input: { file_path: filePath, content },
});
const VALID_ADR = "# 0002. Foo\n\nDate: 2026-07-24\n\nStatus: accepted\n";

// ----------------------------------------------------------------------------
// Bug repro + edit-mode positive (the fix's core)
// ----------------------------------------------------------------------------

test("Edit fragment Status: accepted on existing ADR → allow", () => {
  const r = runHook(edit("Status: accepted"));
  assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
});

test("Edit multi-line fragment with valid Date + Status → allow", () => {
  const r = runHook(edit("Date: 2026-07-24\nStatus: accepted"));
  assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
});

test("Edit prose-only fragment → allow", () => {
  const r = runHook(edit("Just adding a note here."));
  assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
});

test("MultiEdit two valid fragments → allow", () => {
  const r = runHook({
    tool_name: "MultiEdit",
    tool_input: {
      file_path: ADR_PATH,
      edits: [
        { old_string: "a", new_string: "Status: accepted" },
        { old_string: "b", new_string: "## Notes\nextra context" },
      ],
    },
  });
  assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
});

// ----------------------------------------------------------------------------
// Edit-mode fragment enforcement (negative)
// ----------------------------------------------------------------------------

test("Edit fragment with invalid Status enum → block", () => {
  const r = runHook(edit("Status: banana"));
  assert.equal(r.status, 2, "status was " + r.status);
  assert.ok(
    blockedMessage(r.stderr).includes("Status 不在"),
    "expected Status-enum block, got: " + r.stderr,
  );
});

test("Edit fragment with invalid Date format → block", () => {
  const r = runHook(edit("Date: 24-07-2026"));
  assert.equal(r.status, 2, "status was " + r.status);
  assert.ok(
    blockedMessage(r.stderr).includes("Date: YYYY-MM-DD"),
    "expected Date-format block, got: " + r.stderr,
  );
});

// ----------------------------------------------------------------------------
// Write-path regression (must stay intact)
// ----------------------------------------------------------------------------

test("Write valid single-paragraph ADR → allow", () => {
  const r = runHook(write(VALID_ADR));
  assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
});

test("Write valid multi-section ADR → allow", () => {
  const body =
    "# 0002. Foo\n\nDate: 2026-07-24\n\nStatus: accepted\n\n## Context\n\nstuff.\n\n## Decision\n\nstuff.\n\n## Consequences\n\nstuff.\n";
  const r = runHook(write(body));
  assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
});

test("Write missing NNNN. title prefix → block", () => {
  const r = runHook(write("# Foo\n\nDate: 2026-07-24\n\nStatus: accepted\n"));
  assert.equal(r.status, 2, "status was " + r.status);
  assert.ok(
    blockedMessage(r.stderr).includes("标题行缺少 NNNN"),
    "expected title-prefix block, got: " + r.stderr,
  );
});

test("Write wrong number prefix (3 vs file 0002) → block", () => {
  const r = runHook(
    write("# 3. Foo\n\nDate: 2026-07-24\n\nStatus: accepted\n"),
  );
  assert.equal(r.status, 2, "status was " + r.status);
  assert.ok(
    blockedMessage(r.stderr).includes("标题行缺少 NNNN"),
    "expected title-prefix block, got: " + r.stderr,
  );
});

test("Write invalid Status enum → block", () => {
  const r = runHook(
    write("# 0002. Foo\n\nDate: 2026-07-24\n\nStatus: banana\n"),
  );
  assert.equal(r.status, 2, "status was " + r.status);
  assert.ok(
    blockedMessage(r.stderr).includes("Status 不在"),
    "expected Status-enum block, got: " + r.stderr,
  );
});

test("Write partial multi-section (Context only) → block", () => {
  const body =
    "# 0002. Foo\n\nDate: 2026-07-24\n\nStatus: accepted\n\n## Context\n\nstuff.\n";
  const r = runHook(write(body));
  assert.equal(r.status, 2, "status was " + r.status);
  assert.ok(
    blockedMessage(r.stderr).includes("## Decision"),
    "expected Decision-missing block, got: " + r.stderr,
  );
});

test("Write superseded by NNNN status → allow", () => {
  const r = runHook(
    write("# 0002. Foo\n\nDate: 2026-07-24\n\nStatus: superseded by 0017\n"),
  );
  assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
});

// ----------------------------------------------------------------------------
// Empty boundary
// ----------------------------------------------------------------------------

test("Write empty content → block", () => {
  const r = runHook(write(""));
  assert.equal(r.status, 2, "status was " + r.status);
  assert.ok(
    blockedMessage(r.stderr).includes("写入内容为空"),
    "expected empty-write block, got: " + r.stderr,
  );
});

test("Edit empty new_string → block", () => {
  const r = runHook({
    tool_name: "Edit",
    tool_input: { file_path: ADR_PATH, old_string: "x", new_string: "" },
  });
  assert.equal(r.status, 2, "status was " + r.status);
  assert.ok(
    blockedMessage(r.stderr).includes("写入内容为空"),
    "expected empty-write block, got: " + r.stderr,
  );
});

// ----------------------------------------------------------------------------
// Non-guarded path
// ----------------------------------------------------------------------------

test("Write to non-ADR path → allow", () => {
  const r = runHook(write("anything at all", "docs/notes.md"));
  assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
});

// ----------------------------------------------------------------------------
// Overflow boundary
// ----------------------------------------------------------------------------

test("Edit 100KB fragment of valid Status lines → allow under 2s", () => {
  const fragment = "Status: proposed\n".repeat(6200);
  assert.ok(fragment.length > 100 * 1024, "precondition: fragment > 100KB");
  const t0 = Date.now();
  const r = runHook(edit(fragment));
  const elapsed = Date.now() - t0;
  assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
  assert.ok(elapsed < 2000, "elapsed " + elapsed + "ms exceeds 2s budget");
});

// ----------------------------------------------------------------------------
// Concurrent boundary
// ----------------------------------------------------------------------------

test("5 parallel Edit fragments, shared config dir → all allow", async () => {
  const envelope = edit("Status: accepted");
  const children = Array.from({ length: 5 }, () =>
    spawn(process.execPath, ["--experimental-strip-types", HOOK], {
      env: { ...process.env, CLAUDE_CONFIG_DIR: cfgDir },
    }),
  );
  for (const c of children) {
    c.stdin.end(JSON.stringify(envelope));
  }
  const codes = await Promise.all(
    children.map(
      (c) =>
        new Promise<number>((resolve) => {
          c.on("close", (code) => resolve(code ?? -1));
        }),
    ),
  );
  assert.deepEqual(codes, [0, 0, 0, 0, 0]);
});

// ----------------------------------------------------------------------------
// Exception boundary
// ----------------------------------------------------------------------------

test("content/new_string/edits all null → empty-write block", () => {
  const r = runHook({
    tool_name: "Edit",
    tool_input: {
      file_path: ADR_PATH,
      content: null,
      new_string: null,
      edits: null,
    },
  });
  assert.equal(r.status, 2, "status was " + r.status);
  assert.ok(
    blockedMessage(r.stderr).includes("写入内容为空"),
    "expected empty-write block, got: " + r.stderr,
  );
});

test("non-JSON stdin → fail-open exit 0", () => {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", HOOK], {
    input: "this is not json",
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfgDir },
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(
    r.status ?? -1,
    0,
    "status was " + r.status + " stderr=" + r.stderr,
  );
});

test("edits array with non-string new_string coerced to empty → allow", () => {
  const r = runHook({
    tool_name: "MultiEdit",
    tool_input: {
      file_path: ADR_PATH,
      edits: [
        { old_string: "a", new_string: "Status: accepted" },
        { old_string: "b", new_string: 42 },
      ],
    },
  });
  assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
});

// ----------------------------------------------------------------------------
// ADR-0022: transcript-primary skill-identity (C1 / C5 failure tests)
//
// These two tests pin the bug fixed by ADR-0022: the allow path skipped the
// transcript check, so a stale / unauthorized skill activation could write a
// guarded file as long as routing-state happened to show a whitelisted skill
// (C1) or routing-state TTL expired and the structural layer passed (C5).
//
// Test isolation: each test builds its own CLAUDE_CONFIG_DIR tmpdir with a
// mocked .routing-state.json (signed via the same sha256 algorithm as
// lib/ipc-core.ts) plus a real transcript file on disk. The hook is spawned
// with transcript_path pointing at that file.
// ----------------------------------------------------------------------------

import crypto from "node:crypto";

// Mirrors lib/ipc-core.writeRoutingState's signature algorithm exactly:
//   rest = zod-parsed object with keys in schema-declared order
//          (skill, timestamp, then passthrough extras), and
//   signature = sha256(JSON.stringify(rest)).
function writeSignedRoutingState(
  cfgDir: string,
  skill: string,
  timestamp: number,
): void {
  const rest = {
    skill,
    timestamp,
    schemaVersion: 1,
    id: "test-id",
    phase: "initial",
  };
  const signature = crypto
    .createHash("sha256")
    .update(JSON.stringify(rest))
    .digest("hex");
  const full = { ...rest, signature };
  fs.writeFileSync(
    path.join(cfgDir, ".routing-state.json"),
    JSON.stringify(full, null, 2),
  );
}

type TranscriptMarker =
  { kind: "skill"; name: string } | { kind: "slash"; name: string };

function writeTranscript(
  transcriptPath: string,
  markers: TranscriptMarker[],
): void {
  const parts: string[] = [];
  // Throwaway filler so the 64KB tail-read still sees the markers in order.
  parts.push(
    '{"type":"user","message":{"role":"user","content":"session start"}}\n',
  );
  for (const m of markers) {
    if (m.kind === "skill") {
      parts.push(
        JSON.stringify({
          type: "assistant",
          message: {
            role: "assistant",
            content: [
              { type: "tool_use", name: "Skill", input: { skill: m.name } },
            ],
          },
        }) + "\n",
      );
    } else {
      parts.push(`<command-name>${m.name}</command-name>\n`);
    }
  }
  fs.writeFileSync(transcriptPath, parts.join(""));
}

const CONTEXT_PATH = "docs/CONTEXT.md";
const VALID_CONTEXT_WRITE =
  "# Project Glossary\n\n## Language\n\n**Term**: A definition.\n";

// C1: routing-state is fresh and shows domain-modeling (whitelisted), but a
// slash command later activates code-review. Pre-fix behavior: allow path
// skips transcript, returns allow -> false negative. ADR-0005 requires block.
test("C1: routing-state=domain-modeling but transcript latest=code-review slash -> block", () => {
  const localCfg = fs.mkdtempSync(path.join(os.tmpdir(), "guard-c1-"));
  try {
    writeSignedRoutingState(localCfg, "domain-modeling", Date.now());
    const transcriptPath = path.join(localCfg, "transcript.jsonl");
    writeTranscript(transcriptPath, [
      { kind: "skill", name: "domain-modeling" },
      { kind: "slash", name: "/arthurpower:code-review" },
    ]);
    const r = runHook(
      {
        tool_name: "Write",
        tool_input: { file_path: CONTEXT_PATH, content: VALID_CONTEXT_WRITE },
      },
      { cfgDir: localCfg, transcriptPath },
    );
    assert.equal(r.status, 2, "status was " + r.status + " stderr=" + r.stderr);
    assert.ok(
      blockedMessage(r.stderr).includes("active skill"),
      "expected identity-layer block, got: " + r.stderr,
    );
  } finally {
    fs.rmSync(localCfg, { recursive: true, force: true });
  }
});

// C5: routing-state TTL has expired (readRoutingState returns null). Transcript
// shows tdd-protocol slash was the most-recent activation. With routing-state
// unusable, identityCheckDisabled=true pre-fix -> structural Edit-mode layer
// accepted the glossary line and allowed. ADR-0005 requires block.
test("C5: routing-state expired + transcript latest=tdd-protocol slash + Edit glossary -> block", () => {
  const localCfg = fs.mkdtempSync(path.join(os.tmpdir(), "guard-c5-"));
  try {
    // 30s in the past: well past the 5s STATE_TTL_MS in ipc-core.
    writeSignedRoutingState(localCfg, "domain-modeling", Date.now() - 30_000);
    const transcriptPath = path.join(localCfg, "transcript.jsonl");
    writeTranscript(transcriptPath, [
      { kind: "skill", name: "domain-modeling" },
      { kind: "slash", name: "/arthurpower:tdd-protocol" },
    ]);
    const r = runHook(
      {
        tool_name: "Edit",
        tool_input: {
          file_path: CONTEXT_PATH,
          old_string: "old",
          new_string: "**SomeTerm**: test entry.",
        },
      },
      { cfgDir: localCfg, transcriptPath },
    );
    assert.equal(r.status, 2, "status was " + r.status + " stderr=" + r.stderr);
    assert.ok(
      blockedMessage(r.stderr).includes("active skill"),
      "expected identity-layer block, got: " + r.stderr,
    );
  } finally {
    fs.rmSync(localCfg, { recursive: true, force: true });
  }
});

// C6: transcript is readable but contains NO skill-activation marker (neither
// Skill-tool call nor <command-name> slash). routing-state is also absent.
// ADR-0022 Decision 5: readable + no marker -> non-authorized -> BLOCK.
// Pre-fix bug caught by code-review: identityCheckDisabled was computed before
// the override, so this case fell into fail-open branch and allowed.
test("C6: transcript readable with no skill activation marker + Write CONTEXT -> block", () => {
  const localCfg = fs.mkdtempSync(path.join(os.tmpdir(), "guard-c6-"));
  try {
    const transcriptPath = path.join(localCfg, "transcript.jsonl");
    fs.writeFileSync(
      transcriptPath,
      '{"type":"user","message":{"role":"user","content":"hello"}}\n' +
        '{"type":"assistant","message":{"role":"assistant","content":"hi"}}\n',
    );
    const r = runHook(
      {
        tool_name: "Write",
        tool_input: { file_path: CONTEXT_PATH, content: VALID_CONTEXT_WRITE },
      },
      { cfgDir: localCfg, transcriptPath },
    );
    assert.equal(r.status, 2, "status was " + r.status + " stderr=" + r.stderr);
    assert.ok(
      blockedMessage(r.stderr).includes("no skill activation"),
      "expected no-activation block, got: " + r.stderr,
    );
  } finally {
    fs.rmSync(localCfg, { recursive: true, force: true });
  }
});

// ----------------------------------------------------------------------------
// 2026-08-03: Skill tool input key-order independence.
//
// The transcript is serialized by the model, and JSON object key order is NOT
// guaranteed. Production ground truth: a Skill(domain-modeling) invocation that
// carried a long `args` proposal was serialized as
//   "input":{"args":"提议 ADR：…","skill":"arthurpower:domain-modeling"}
// i.e. `args` BEFORE `skill`. The old SKILL_TOOL_RE required "skill" to be the
// FIRST key right after "input":{ , so it never matched an args-first record.
// With the transcript as the primary identity signal (ADR-0022), "readable but
// no marker" is a hard block — so every legit domain-modeling ADR/CONTEXT write
// following an args-first invocation was false-blocked. These tests pin both
// key orders and require allow.
// ----------------------------------------------------------------------------

// Build a single Skill tool_use transcript record with an explicit input key
// order. JSON.stringify preserves string-key insertion order, so passing the
// keys in the desired order reproduces the exact serialized bytes.
function writeSkillRecord(
  transcriptPath: string,
  inputKeys: Record<string, string>,
): void {
  const record = {
    type: "assistant",
    message: {
      role: "assistant",
      content: [
        { type: "tool_use", id: "call_x", name: "Skill", input: inputKeys },
      ],
    },
  };
  fs.writeFileSync(transcriptPath, JSON.stringify(record) + "\n");
}

test("args-first Skill(domain-modeling) activation + Write ADR -> allow", () => {
  const localCfg = fs.mkdtempSync(path.join(os.tmpdir(), "guard-argsfirst-"));
  try {
    const transcriptPath = path.join(localCfg, "transcript.jsonl");
    // args serialized BEFORE skill — the production order that triggered the bug.
    writeSkillRecord(transcriptPath, {
      args: "提议 ADR：iknow 上下文压缩采用客户端自建、provider 无关路线。",
      skill: "arthurpower:domain-modeling",
    });
    const r = runHook(
      {
        tool_name: "Write",
        tool_input: { file_path: ADR_PATH, content: VALID_ADR },
      },
      { cfgDir: localCfg, transcriptPath },
    );
    assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
  } finally {
    fs.rmSync(localCfg, { recursive: true, force: true });
  }
});

test("skill-first Skill(domain-modeling) activation + Write ADR -> allow (order regression guard)", () => {
  const localCfg = fs.mkdtempSync(path.join(os.tmpdir(), "guard-skillfirst-"));
  try {
    const transcriptPath = path.join(localCfg, "transcript.jsonl");
    writeSkillRecord(transcriptPath, {
      skill: "arthurpower:domain-modeling",
      args: "提议 ADR：…",
    });
    const r = runHook(
      {
        tool_name: "Write",
        tool_input: { file_path: ADR_PATH, content: VALID_ADR },
      },
      { cfgDir: localCfg, transcriptPath },
    );
    assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
  } finally {
    fs.rmSync(localCfg, { recursive: true, force: true });
  }
});

// Security preservation: an args-first UNAUTHORIZED skill must still block, so
// the order-independence fix does not loosen the whitelist.
test("args-first Skill(code-review) activation + Write ADR -> block", () => {
  const localCfg = fs.mkdtempSync(
    path.join(os.tmpdir(), "guard-argsfirst-unauth-"),
  );
  try {
    const transcriptPath = path.join(localCfg, "transcript.jsonl");
    writeSkillRecord(transcriptPath, {
      args: "review this",
      skill: "arthurpower:code-review",
    });
    const r = runHook(
      {
        tool_name: "Write",
        tool_input: { file_path: ADR_PATH, content: VALID_ADR },
      },
      { cfgDir: localCfg, transcriptPath },
    );
    assert.equal(r.status, 2, "status was " + r.status + " stderr=" + r.stderr);
    assert.ok(
      blockedMessage(r.stderr).includes("active skill"),
      "expected identity-layer block, got: " + r.stderr,
    );
  } finally {
    fs.rmSync(localCfg, { recursive: true, force: true });
  }
});

// ----------------------------------------------------------------------------
// 2026-08-06: false-block regression — activation marker OUTSIDE the old
// 64KB tail window.
//
// Real production transcript (efb41d90): 1.4MB file, the only activation marker
// (`/arthurpower:systematic-debugging`) at byte ~1110. The old 64KB tail window
// scanned bytes [1.34MB, 1.4MB] and saw ZERO markers -> "no skill activation"
// -> every later guarded write was hard-blocked even after a legit slash
// invocation of domain-modeling. These tests pin the fix: a domain-modeling
// marker anywhere in the (now 4MB) window must allow the write.
// ----------------------------------------------------------------------------

// Build a transcript with a slash marker followed by >64KB of filler, so the
// marker lands OUTSIDE the old 64KB tail window but INSIDE the 4MB window.
// Filler is a legal Skill-agnostic blob (a long natural-language turn) — it
// must NOT contain a <command-name> or Skill marker (those would change the
// latest-activation identity).
function writeTranscriptWithFarMarker(
  transcriptPath: string,
  markerKind: TranscriptMarker["kind"],
  markerName: string,
  fillerSizeBytes: number = 80 * 1024,
): void {
  const parts: string[] = [
    '{"type":"user","message":{"role":"user","content":"session start"}}\n',
  ];
  if (markerKind === "skill") {
    parts.push(
      JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [
            { type: "tool_use", name: "Skill", input: { skill: markerName } },
          ],
        },
      }) + "\n",
    );
  } else {
    parts.push(`<command-name>${markerName}</command-name>\n`);
  }
  // Filler: a plain user turn with no activation markers, >64KB.
  const fillerWord = "lorem ipsum dolor sit amet";
  const filler = "user says: " + (fillerWord + " ").repeat(5000) + "\n";
  parts.push(filler);
  fs.writeFileSync(transcriptPath, parts.join(""));
}

test("slash domain-modeling marker >64KB before Write ADR -> allow (false-block regression)", () => {
  const localCfg = fs.mkdtempSync(path.join(os.tmpdir(), "guard-far-slash-"));
  try {
    const transcriptPath = path.join(localCfg, "transcript.jsonl");
    writeTranscriptWithFarMarker(
      transcriptPath,
      "slash",
      "/arthurpower:domain-modeling",
    );
    const r = runHook(
      {
        tool_name: "Write",
        tool_input: { file_path: ADR_PATH, content: VALID_ADR },
      },
      { cfgDir: localCfg, transcriptPath },
    );
    assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
  } finally {
    fs.rmSync(localCfg, { recursive: true, force: true });
  }
});

test("Skill domain-modeling marker >64KB before Write CONTEXT (two-line format) -> allow", () => {
  const localCfg = fs.mkdtempSync(path.join(os.tmpdir(), "guard-far-skill-"));
  try {
    const transcriptPath = path.join(localCfg, "transcript.jsonl");
    writeTranscriptWithFarMarker(
      transcriptPath,
      "skill",
      "arthurpower:domain-modeling",
    );
    const twoLineContext =
      "# Context\n\n## Language\n\n**Chunk**:\nA retrievable text unit from the enterprise KB.\n_Avoid_: Document fragment, passage, snippet\n\n**Fact**:\nA compiled, deduplicated claim.\n";
    const r = runHook(
      {
        tool_name: "Write",
        tool_input: { file_path: CONTEXT_PATH, content: twoLineContext },
      },
      { cfgDir: localCfg, transcriptPath },
    );
    assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
  } finally {
    fs.rmSync(localCfg, { recursive: true, force: true });
  }
});

// ----------------------------------------------------------------------------
// 2026-08-06: hasTerm over-strictness regression — the real docs/CONTEXT.md
// mixes the CONTEXT-FORMAT two-line shape (`**Term**:\n  definition`) with the
// inline shape. The old single-line regex rejected the two-line entries.
// ----------------------------------------------------------------------------
test("Write CONTEXT with two-line term entries (real format) -> allow", () => {
  const localCfg = fs.mkdtempSync(path.join(os.tmpdir(), "guard-twoline-"));
  try {
    const transcriptPath = path.join(localCfg, "transcript.jsonl");
    // Slash activation near the top so the identity check sees domain-modeling.
    writeTranscript(transcriptPath, [
      { kind: "slash", name: "/arthurpower:domain-modeling" },
    ]);
    const twoLineContext =
      "# Context\n\n## Language\n\n**Loop Engine**:\nA state machine runtime kernel.\n_Avoid_: agent loop\n\n**Chunk**:\nA retrievable text unit.\n";
    const r = runHook(
      {
        tool_name: "Write",
        tool_input: { file_path: CONTEXT_PATH, content: twoLineContext },
      },
      { cfgDir: localCfg, transcriptPath },
    );
    assert.equal(r.status, 0, "status was " + r.status + " stderr=" + r.stderr);
  } finally {
    fs.rmSync(localCfg, { recursive: true, force: true });
  }
});
