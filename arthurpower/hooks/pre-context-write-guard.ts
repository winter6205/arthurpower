#!/usr/bin/env node
// pre-context-write-guard.ts
// Context closed-loop write authority gate. zod-only runtime.
// Tool gate: PreToolUse Write/Edit/MultiEdit/Bash. Fail-open on bad input.
// Enforces that docs/CONTEXT.md, docs/CONTEXT-MAP.md, docs/team-glossary.md,
// and docs/adr/NNNN-*.md may only be written by the domain-modeling skill;
// structural validation is performed here, authority enforcement is performed
// by the lifecycle router.
//
// 2026-07-13 fixes:
//  - Bash path coverage: echo > docs/CONTEXT.md, heredoc, rm, tee, cp, mv, sed -i.
//  - Legit rm/mv/cp/cat of non-context paths no longer false-positive (was
//    caused by single-regex alternation ambiguity; replaced by 3 explicit
//    regexes: redirect / keyword / sed).
//  - Windows backslash path support (docs\CONTEXT.md).
//  - Quoted paths (rm "docs/CONTEXT.md" / rm 'docs/CONTEXT.md') covered.
//  - Comment block updated to reflect Bash tool gate.
//  - Fail-open crash now writes one line to daemon.log instead of silent exit.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { z } from 'zod';
import { defineHook } from './runtime/defineHook.ts';
import { readRoutingState } from './lib/ipc-core.ts';

// BlockError: typed carry for `fail()` / `failIdentity()` semantics. The
// original .cjs called process.exit(2) + stderr writes from deep inside
// helpers (validateContext / validateAdr / checkAdrUniqueness). With
// defineHook, blocks must return a HookResult to go through the runtime's
// exit helpers (SC7). Throwing a typed error preserves the original
// "abort the rest of validation" control flow exactly; the handler's
// outer catch converts it to { kind: 'block', message }.
class BlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockError';
  }
}

const TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'Bash']);

const CONTEXT_RE = /(^|[/\\])docs[/\\](CONTEXT\.md|CONTEXT-MAP\.md|team-glossary\.md)$/i;
const ADR_RE = /(^|[/\\])docs[/\\]adr[/\\](\d{4})-[^/\\]+\.md$/i;

// ----------------------------------------------------------------------------
// Bash write/destroy detection - 3 explicit regexes (one per form)
// ----------------------------------------------------------------------------

// TARGET: matched path with optional quotes, optional Windows backslashes,
// relative or absolute. Captures the bare filename for error messages.
const TARGET = String.raw`["']?(?:[./\\])?docs[/\\](?:CONTEXT\.md|CONTEXT-MAP\.md|team-glossary\.md|adr[/\\]\d{4}-[^\s"'|;&]+\.md)["']?`;

// SEP: command boundary (start of string, whitespace, semicolon, pipe, paren).
const SEP = String.raw`(?:^|[\s;&|(])`;

// Form A: standalone redirect like `> docs/CONTEXT.md` or `>> docs/...`.
// Allow heredoc body BEFORE the redirect (e.g. `cat <<EOF > docs/CONTEXT.md`).
// The target MUST immediately follow the redirect operator (with optional quotes).
const BASH_REDIRECT_RE = new RegExp(
  SEP + String.raw`[^|;&]*?>>?\s*` + TARGET,
  'i'
);

// Form B: command keyword + optional flags + path = target.
// The target MUST be the LAST argument so `mv foo bar` only matches when bar
// is the target. `rm node_modules/.cache` does not match because
// node_modules/.cache is not the guarded target.
// Middle args (e.g. `cp foo TARGET`, `mv foo TARGET`) are optional - `rm TARGET`
// directly (no middle arg) also matches.
const BASH_KEYWORD_RE = new RegExp(
  SEP + String.raw`(?:rm(?:\s+-\w+)?|rmdir|tee|cp|mv)\s+(?:[^|;&]*?\s+)?` + TARGET + String.raw`(?:\s|$|[|;&)])`,
  'i'
);

// Form C: `sed -i [optional s/foo/bar/] TARGET` - special because -i precedes path.
const BASH_SED_RE = new RegExp(
  SEP + String.raw`sed\s+(?:-i\s+)?[^|;&]*?` + TARGET + String.raw`(?:\s|$|[|;&)])`,
  'i'
);

function detectBashViolation(command: string): string | null {
  if (!command) return null;
  if (BASH_REDIRECT_RE.test(command)) return 'redirect';
  if (BASH_KEYWORD_RE.test(command)) return 'keyword';
  if (BASH_SED_RE.test(command)) return 'sed';
  return null;
}

function hasHeading(content: string, re: RegExp): boolean {
  return content.split(/\r?\n/).some((line) => re.test(line.trim()));
}

// 2026-07-24 Fix (gh-68): Status/Date line regexes shared by validateAdr
// (write path, full-file) and validateAdrFragment (edit path, diff fragment).
const STATUS_LINE_RE = /^Status:\s*(proposed|accepted|deprecated|superseded\s+by\s+\d{4})\s*$/;
const DATE_LINE_RE = /^Date:\s*\d{4}-\d{2}-\d{2}\s*$/;

function fail(reason: string): never {
  // 2026-07-15 Fix: the block envelope is written via the runtime's exitBlock
  // (SC7: stderr-only block emission). The runtime prepends "BLOCKED: ".
  throw new BlockError('context-write-guard - ' + reason + '. 走 domain-modeling skill 落盘');
}

function failIdentity(activeSkill: string, filePath: string): never {
  // 2026-07-17 Fix (T9 active-skill identity check):
  // White-list enforcement on top of structural validation. The structural
  // validation above remains intact - this layer is purely ADDITIVE and can
  // only make denials stricter, never weaker (per S6 + boundary-testing hard
  // rule "additive"). White-list per ADR-0005: domain-modeling is the only
  // writer for CONTEXT.md / CONTEXT-MAP.md / team-glossary.md / docs/adr/*.md.
  // Escape hatch: setup-arthurpower may write during template bootstrap (ADR
  // seeding) only when docs/adr/ does not yet contain any ADR (i.e. the
  // canonical-file-set is being created). This prevents first-run setup from
  // being blocked when the lifecycle router has not yet recorded
  // domain-modeling as the active skill.
  throw new BlockError(
    'pre-context-write-guard - active skill "' + activeSkill +
    '" is not authorized to write ' + filePath +
    ' (write authority per ADR-0005 belongs to domain-modeling). Run `domain-modeling` first.'
  );
}

const AUTHORIZED_SKILLS = new Set(['domain-modeling', 'setup-arthurpower']);

function isSetupBootstrapAllowed(filePath: string): boolean {
  // Escape-hatch condition for setup-arthurpower: only allowed when docs/adr/
  // does not yet contain any ADR (template bootstrap). Once any ADR exists,
  // setup-arthurpower is treated as untrusted and must defer to domain-modeling.
  try {
    // The target file is one of:
    //   <root>/docs/CONTEXT.md / CONTEXT-MAP.md / team-glossary.md
    //   <root>/docs/adr/NNNN-*.md
    // The docs/adr/ sibling is at <root>/docs/adr/.
    //
    // Two cases for dirname(filePath):
    //   A) filePath = "<root>/docs/CONTEXT.md"          -> dirname = "<root>/docs"
    //      -> sibling "adr" at "<root>/docs/adr" is found via path.join(dir,'adr')
    //   B) filePath = "<root>/docs/adr/NNNN-foo.md"     -> dirname = "<root>/docs/adr"
    //      -> the directory itself IS docs/adr/, so check it directly.
    //
    // Strategy: walk up from dirname(filePath). At each level, check both
    // "<current>/adr" (case A) and the current directory itself if it ends in
    // "adr" (case B). On first hit, return whether any NNNN-*.md file exists.
    let dir = path.dirname(filePath);
    for (let i = 0; i < 8; i++) {
      // Case B: current dir IS docs/adr/ (ends in /adr).
      const base = path.basename(dir).toLowerCase();
      if (base === 'adr' && fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        const entries = fs.readdirSync(dir);
        return entries.filter((e) => /^\d{4}-.+\.md$/.test(e)).length === 0;
      }
      // Case A: sibling "adr" under current dir.
      const sibling = path.join(dir, 'adr');
      if (fs.existsSync(sibling) && fs.statSync(sibling).isDirectory()) {
        const entries = fs.readdirSync(sibling);
        return entries.filter((e) => /^\d{4}-.+\.md$/.test(e)).length === 0;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    // No docs/adr/ found anywhere up the tree -> bootstrap scenario (first-run).
    return true;
  } catch (_) {
    // Fail-open: if filesystem is unreadable, do not block setup.
    return true;
  }
}

// 2026-07-18 Fix (DESIGN-DEFECT closure): strip marketplace / plugin prefix
// before AUTHORIZED_SKILLS check. The lifecycle router may record skill ids as
// "arthurpower:domain-modeling" or "marketplace:plugin:name"; AUTHORIZED_SKILLS
// stores bare names ("domain-modeling" | "setup-arthurpower"). Without this
// normalize, every legitimate domain-modeling write was false-positively
// blocked. See daemon.log 2026-07-18T15:37:01Z DESIGN-DEFECT entry.
function normalizeSkillId(s: string): string {
  if (!s) return s;
  // Take the last ':'-segment ("arthurpower:domain-modeling" -> "domain-modeling").
  // Bare names pass through unchanged.
  const parts = s.split(':');
  return parts[parts.length - 1];
}

// 2026-07-20 Fix (gh-21 active-skill stale-read): the lifecycle router state
// file is the only signal the hook has for which skill invoked the current
// tool call (the harness does not pass active-skill in PreToolUse payload).
// When the Skill tool injects a skill body, it does NOT refresh this file -
// the field stays at whatever was last written (often the previous session's
// skill). A naive read produces stale data and false-positive BLOCKs on every
// legit domain-modeling write. The TRUE root cause is harness-side (Skill tool
// should refresh state); the hook can only read files. Safe hook-side
// mitigation: when the state's timestamp is clearly stale, treat the state
// as untrusted and fail-open (return null).
//
// ipc-core.readRoutingState (lib/ipc-core.ts) is now the primary read path
// and enforces its own signature-verified TTL (STATE_TTL_MS = 5s). The 60-min
// check below is kept as a secondary defensive guard preserving the fix's
// intent; in practice ipc-core's stricter TTL has already returned null for
// stale states, so this 60-min check only ever fires on (hypothetical)
// freshly-returned states beyond 60 minutes.
const MAX_STATE_AGE_MS = 60 * 60 * 1000; // 60 minutes; covers typical session span.

async function readActiveSkill(): Promise<string | null> {
  // Read the lifecycle router's state file via ipc-core (signature-verified +
  // TTL-gated). Fail-open on any error. The expected shape per
  // session-start evaluator contract:
  //   { schemaVersion, id, skill, phase, timestamp, signature }.
  try {
    const state = await readRoutingState();
    if (!state || typeof state.skill !== 'string') return null;
    // Stale-read guard (2026-07-20): defensive secondary check. ipc-core
    // returns null for stale states, but if it ever loosens its TTL this
    // 60-min gate preserves the original fail-open-on-stale semantics.
    if (typeof state.timestamp === 'number' && state.timestamp > 0) {
      const ageMs = Date.now() - state.timestamp;
      if (ageMs > MAX_STATE_AGE_MS) return null;
    }
    return normalizeSkillId(state.skill);
  } catch (_) {
    return null;
  }
}

// 2026-07-21 Fix (gh-43 root cause): routing-state.skill is only refreshed by
// the PreToolUse:Skill bridge (#30 / ADR-0014). Skill bodies that enter via a
// slash command (`/arthurpower:domain-modeling`), a subagent/Task invocation, or
// a session-start injection never fire PreToolUse:Skill, so routing-state keeps
// a FRESH residual skill (e.g. claude-api). Within the 60-minute window that
// residual is indistinguishable from a genuine unauthorized write, so the
// whitelist hard-blocks legit domain-modeling writes (exit 2).
//
// The session transcript is the authoritative record of BOTH invocation paths:
//   - Skill tool:   assistant tool_use  {"name":"Skill","input":{"skill":X}}
//   - slash command: user message text  <command-name>X</command-name>
//
// 2026-07-29 Fix (ADR-0022): transcript is now the PRIMARY identity signal, not
// a block-path-only corroboration. The previous design consulted the transcript
// ONLY when routing-state showed an unauthorized skill (the block path). When
// routing-state showed a whitelisted skill (the allow path) - including stale
// residuals left by a slash-command switch - the transcript was never read, so
// a slash switch from domain-modeling to code-review followed by a Write to
// CONTEXT.md was silently allowed (C1). Likewise, when routing-state TTL
// expired (identityCheckDisabled) the structural layer became the de-facto
// authority and any glossary-shaped Edit passed (C5).
//
// Resolution: compute the most-recent skill activation from the transcript
// unconditionally; routing-state is consulted only as a fallback when the
// transcript itself is unreadable. See ADR-0022.
const TRANSCRIPT_TAIL_BYTES = 64 * 1024;
const SKILL_TOOL_RE = /"name"\s*:\s*"Skill"\s*,\s*"input"\s*:\s*\{\s*"skill"\s*:\s*"([^"]+)"/g;
const SLASH_CMD_RE = /<command-name>\s*([^<\s][^<]*?)\s*<\/command-name>/g;

// readLatestSkillFromTranscript: returns the normalized id of the most-recent
// skill activation in the transcript tail.
//   { readable: true,  skill: string }  -> transcript readable, latest activation is `skill`
//   { readable: true,  skill: null }    -> transcript readable, NO activation marker (treat as non-authorized)
//   { readable: false, skill: null }    -> transcript missing/corrupt/unreadable -> fall back to routing-state
function readLatestSkillFromTranscript(transcriptPath: string): { readable: boolean; skill: string | null } {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return { readable: false, skill: null };
    const stat = fs.statSync(transcriptPath);
    const start = Math.max(0, stat.size - TRANSCRIPT_TAIL_BYTES);
    const fd = fs.openSync(transcriptPath, 'r');
    let buf: Buffer;
    try {
      buf = Buffer.alloc(Math.min(stat.size, TRANSCRIPT_TAIL_BYTES));
      fs.readSync(fd, buf, 0, buf.length, start);
    } finally {
      fs.closeSync(fd);
    }
    const tail = buf.toString('utf8');
    // Collect (position, normalizedSkill) for both activation markers.
    const hits: Array<{ pos: number; skill: string }> = [];
    let m: RegExpExecArray | null;
    SKILL_TOOL_RE.lastIndex = 0;
    while ((m = SKILL_TOOL_RE.exec(tail)) !== null) {
      hits.push({ pos: m.index, skill: normalizeSkillId(m[1]) });
    }
    SLASH_CMD_RE.lastIndex = 0;
    while ((m = SLASH_CMD_RE.exec(tail)) !== null) {
      hits.push({ pos: m.index, skill: normalizeSkillId(m[1]) });
    }
    if (hits.length === 0) return { readable: true, skill: null };
    // Most recent activation wins (transcript is append-ordered).
    hits.sort((a, b) => a.pos - b.pos);
    return { readable: true, skill: hits[hits.length - 1].skill };
  } catch (_) {
    return { readable: false, skill: null }; // unreadable -> fall back to routing-state
  }
}

// 2026-07-15 Fix: validateContext takes a mode parameter.
//   mode='write'         -> full 3-check (hasTitle + hasLanguage + hasTerm). For
//                           Write tool where the caller supplies the whole file.
//   mode='edit'          -> hasTerm ONLY (fragment-level). For Edit/MultiEdit
//                           where new_string is a diff fragment, not the full
//                           file. hasTitle/hasLanguage are file-level checks
//                           irrelevant to a single-term patch.
function validateContext(content: string, label: string, mode: 'write' | 'edit'): void {
  const lines = content.split(/\r?\n/);
  const hasTerm = lines.some((line) => /^\*\*[^*]+\*\*\s*:\s*[^\s].*[.。]\s*$/.test(line.trim()));
  if (mode === 'edit') {
    if (!hasTerm) fail(label + ' 缺少 **Term**: definition. 格式词条');
    return;
  }
  // mode === 'write' (default)
  const hasTitle = lines.some((line) => /^#\s+.+/.test(line.trim()));
  const hasLanguage = hasHeading(content, /^##\s+Language\b/i);
  if (!hasTitle) fail(label + ' 缺少 # 标题行');
  if (!hasLanguage) fail(label + ' 缺少 ## Language 章节');
  if (!hasTerm) fail(label + ' 缺少 **Term**: definition. 格式词条');
}

function validateAdr(content: string, expectedNumber: string, mode: 'write' | 'edit'): void {
  // 2026-07-24 Fix (gh-68): mode='edit' (Edit/MultiEdit) validates only fields
  // present in the diff fragment — mirrors validateContext's edit branch.
  // mode='write' retains the full 5-check below.
  if (mode === 'edit') { validateAdrFragment(content); return; }
  const lines = content.split(/\r?\n/);
  const titleRe = new RegExp('^#\\s+' + expectedNumber + '\\.\\s+.+');
  const hasTitle = lines.some((line) => titleRe.test(line.trim()));
  const hasDate = lines.some((line) => DATE_LINE_RE.test(line.trim()));
  const hasStatus = lines.some((line) => STATUS_LINE_RE.test(line.trim()));
  const hasContext = hasHeading(content, /^##\s+Context\b/i);
  const hasDecision = hasHeading(content, /^##\s+Decision\b/i);
  const hasConsequences = hasHeading(content, /^##\s+Consequences\b/i);

  if (!hasTitle) fail('ADR 标题行缺少 NNNN. 前缀');
  if (!hasDate) fail('ADR 缺少 Date: YYYY-MM-DD 行');
  if (!hasStatus) fail('ADR Status 不在 proposed/accepted/deprecated/superseded by NNNN 枚举内');
  // 2026-07-20 Fix (gh-21): align with ADR-FORMAT.md "single-paragraph is
  // the default". If NONE of the optional section headings are present, the
  // ADR is valid as a single-paragraph record (skip the 3-heading check).
  // If ONE OR MORE is present, ALL 3 must be present (no partial multi-section).
  // This preserves regression on genuinely incomplete ADRs (any one heading
  // missing in a multi-section ADR still blocks).
  const multiSectionPresent = hasContext || hasDecision || hasConsequences;
  if (multiSectionPresent) {
    if (!hasContext) fail('ADR 缺少 ## Context 章节');
    if (!hasDecision) fail('ADR 缺少 ## Decision 章节');
    if (!hasConsequences) fail('ADR 缺少 ## Consequences 章节');
  }
}

// 2026-07-24 Fix (gh-68): fragment-level ADR validation for Edit/MultiEdit.
// A diff fragment (new_string) is not the whole file, so file-level checks
// (title line, section headings) are irrelevant — the full file was validated
// at creation time. Validate only fields PRESENT in the fragment: any Status:
// line must match the enum, any Date: line must match the format. Absence of
// fields is fine. Mirrors validateContext's mode='edit' branch (hasTerm only).
function validateAdrFragment(content: string): void {
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^Status:/.test(line) && !STATUS_LINE_RE.test(line)) {
      fail('ADR Status 不在 proposed/accepted/deprecated/superseded by NNNN 枚举内');
    }
    if (/^Date:/.test(line) && !DATE_LINE_RE.test(line)) {
      fail('ADR 缺少 Date: YYYY-MM-DD 行');
    }
  }
}

function checkAdrUniqueness(filePath: string, expectedNumber: string): void {
  // 2026-07-13 Dimension B: prevent ADR number collisions.
  // Scan docs/adr/*.md in the same directory as the target file. If a DIFFERENT
  // file (different basename) with the same NNNN prefix already exists, block.
  // Same-basename writes are allowed (legit Edit/overwrite of same ADR).
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      // No existing ADR directory -> no collision possible. Allow.
      return;
    }
    const newBase = path.basename(filePath);
    const entries = fs.readdirSync(dir);
    const collisionRe = new RegExp('^' + expectedNumber + '-.+\\.md$', 'i');
    for (const entry of entries) {
      if (!collisionRe.test(entry)) continue;
      if (entry.toLowerCase() === newBase.toLowerCase()) continue; // same file, allow
      // Different filename, same number -> collision
      fail('ADR 编号 ' + expectedNumber + ' 已被 ' + entry + ' 占用。走 domain-modeling skill 取最大号+1 落盘');
    }
  } catch (err) {
    // Re-throw BlockError so a block is not swallowed by the fs-error handler.
    if (err instanceof BlockError) throw err;
    // Fail-open on filesystem errors (e.g. permission denied). Uniqueness is a
    // safety check, not a hard gate - validation still ran above.
  }
}

// logFatal: 2026-07-13 visibility fix — fail-open crashes write one line to
// daemon.log so silent failures are discoverable. Mirror of the original
// .cjs's logFatal, retained so handler-side crashes are still surfaced even
// when defineHook's runtime catch also writes to stderr.
function logFatal(err: unknown): void {
  const msg = '[pre-context-write-guard.ts FATAL] ' +
    (err instanceof Error ? (err.stack ?? err.message) : String(err)) + '\n';
  process.stderr.write(msg);
  try {
    const logPath = path.join(os.homedir(), '.claude', 'daemon.log');
    fs.appendFileSync(logPath,
      '[' + new Date().toISOString() + '] ' + msg, 'utf8');
  } catch (_) {
    // If daemon.log is unwritable, stderr write above is the fallback.
  }
}

// ----------------------------------------------------------------------------
// Main handler (defineHook)
// ----------------------------------------------------------------------------

defineHook({
  schema: z.object({
    file_path: z.string().optional(),
    command: z.string().optional(),
    cmd: z.string().optional(),
    // The schema accepts null for content/new_string because the original
    // .cjs treated a non-string content (e.g. `payload(path, null)`) as
    // empty and then blocked on "写入内容为空". A strict `z.string()` would
    // reject null and fail-open (exit 0) instead of letting the guard
    // surface the empty-write block. .nullish() preserves the original
    // fail-NOT-open semantics on null content.
    content: z.string().nullish(),
    new_string: z.string().nullish(),
    edits: z.array(z.unknown()).nullish(),
  }).passthrough(),
  failOpen: true,
  handler: async ({ tool_name, tool_input, envelope }) => {
    try {
      const toolName = tool_name;
      const filePath = (typeof tool_input.file_path === 'string' ? tool_input.file_path : '');
      const bashCommand = (typeof tool_input.command === 'string' && tool_input.command)
        || (typeof tool_input.cmd === 'string' && tool_input.cmd) || '';
      const transcriptPath = (typeof envelope.transcript_path === 'string' ? envelope.transcript_path : '');

      // Content extraction — preserve original precedence: content > new_string > edits.
      let content = '';
      if (typeof tool_input.content === 'string' && tool_input.content.length > 0) {
        content = tool_input.content;
      } else if (typeof tool_input.new_string === 'string' && tool_input.new_string.length > 0) {
        content = tool_input.new_string;
      } else if (Array.isArray(tool_input.edits)) {
        content = (tool_input.edits as Array<unknown>)
          .map((e) => {
            const ns = (e && typeof e === 'object')
              ? (e as { new_string?: unknown }).new_string
              : undefined;
            return typeof ns === 'string' ? ns : '';
          })
          .join('\n');
      }

      if (!TOOLS.has(toolName)) return { kind: 'allow' };

      // 2026-07-17 Fix (T9 active-skill identity check): read the lifecycle
      // router state BEFORE path matching so we can apply the white-list
      // uniformly to Write/Edit/MultiEdit/Bash. Fail-open semantics: if
      // state is missing, unreadable, malformed, or skill field is
      // missing/empty -> skip identity check entirely (structural validation
      // below still runs).
      const routingSkill = await readActiveSkill();
      // ADR-0022: transcript is the primary identity signal. routing-state is a
      // fallback used only when the transcript itself is unreadable.
      const transcript = readLatestSkillFromTranscript(transcriptPath);

      // Resolve the effective active skill. Three mutually exclusive cases:
      //   transcript readable + has skill  -> transcript.skill (ground truth)
      //   transcript readable + no marker  -> null  + transcriptHasMarker=false
      //                                       (treated as non-authorized below;
      //                                       does NOT enter fail-open branch)
      //   transcript unreadable            -> routingSkill (fallback, may be null)
      let activeSkill: string | null;
      let transcriptHasMarker: boolean;
      if (transcript.readable) {
        activeSkill = transcript.skill; // string | null
        transcriptHasMarker = transcript.skill !== null;
      } else {
        activeSkill = routingSkill; // null when routing-state also unreadable
        transcriptHasMarker = false;
      }
      // Recompute AFTER resolution so the "readable but no marker" case does not
      // silently fall into the fail-open branch (security regression fixed by
      // review feedback on ADR-0022 initial implementation).
      const identityCheckDisabled = activeSkill === null && !transcript.readable;

      // Resolve the targeted file path for the identity check. For Bash tool
      // we treat the entire bashCommand as the "intent surface" - if the
      // command contains a guarded-path token, we hold it accountable
      // regardless of which file_path the harness supplies (Bash's
      // tool_input.file_path is empty).
      function pathGuarded(p: string): string | null {
        if (typeof p !== 'string' || !p) return null;
        if (CONTEXT_RE.test(p)) return 'CONTEXT';
        if (ADR_RE.test(p)) return 'ADR';
        return null;
      }

      function bashPathFromCommand(cmd: string): string | null {
        if (!cmd) return null;
        if (BASH_REDIRECT_RE.test(cmd)) return 'CONTEXT';
        if (BASH_KEYWORD_RE.test(cmd)) return 'CONTEXT';
        if (BASH_SED_RE.test(cmd)) return 'CONTEXT';
        return null;
      }

      // Apply identity check (ADR-0022): if a guarded file is targeted, the
      // effective active skill (transcript-primary, routing-state fallback)
      // must be in the white-list. setup-arthurpower has an escape hatch only
      // when docs/adr/ is empty (template bootstrap).
      //
      // Diagnostics: surface which signal resolved the identity, so a stale
      // residual or a transcript override is observable in stderr.
      if (!identityCheckDisabled) {
        // Label for block messages: null activeSkill (transcript readable but no
        // marker) is rendered as a human-readable hint rather than the literal
        // string "null".
        const skillLabel = activeSkill ?? '(no skill activation in transcript)';

        if (transcript.readable && transcript.skill !== null) {
          process.stderr.write('[guard] identity from transcript: "' + transcript.skill + '"\n');
        } else if (transcript.readable && transcript.skill === null) {
          process.stderr.write('[guard] transcript readable but no skill activation; blocking non-authorized\n');
        } else {
          process.stderr.write('[guard] transcript unreadable; identity from routing-state: "' + (routingSkill ?? 'null') + '"\n');
        }

        if (toolName === 'Bash') {
          const guardedKind = bashPathFromCommand(bashCommand);
          if (guardedKind && !AUTHORIZED_SKILLS.has(activeSkill)) {
            failIdentity(skillLabel, 'docs/CONTEXT*.md | docs/team-glossary.md | docs/adr/*.md (via Bash)');
          }
          if (guardedKind && activeSkill === 'setup-arthurpower' && !isSetupBootstrapAllowed(process.cwd())) {
            failIdentity(skillLabel, 'docs/CONTEXT*.md | docs/team-glossary.md | docs/adr/*.md (via Bash; bootstrap already done)');
          }
        } else if (typeof filePath === 'string' && filePath) {
          const guardedKind = pathGuarded(filePath);
          if (guardedKind) {
            if (!AUTHORIZED_SKILLS.has(activeSkill)) {
              failIdentity(skillLabel, filePath);
            } else if (activeSkill === 'setup-arthurpower' && !isSetupBootstrapAllowed(filePath)) {
              failIdentity(skillLabel, filePath + ' (bootstrap already done)');
            }
          }
        }
      } else {
        // Fail-open visibility: one-line stderr hint when BOTH transcript and
        // routing-state are unreadable. Structural validation below still runs.
        process.stderr.write('[guard] routing-state + transcript both unreadable; identity check skipped\n');
      }

      // Bash path: detect write/destroy redirection to context-guarded files.
      if (toolName === 'Bash' && bashCommand) {
        const violation = detectBashViolation(bashCommand);
        if (violation) {
          fail('Bash 命令尝试直接写/删 docs/CONTEXT.md | docs/CONTEXT-MAP.md | docs/team-glossary.md | docs/adr/*.md，绕过 domain-modeling 写入主权。走 domain-modeling skill 落盘');
        }
      }

      if (typeof filePath !== 'string' || !filePath) {
        return { kind: 'allow' };
      }

      const ctxMatch = CONTEXT_RE.exec(filePath);
      if (ctxMatch) {
        if (typeof content !== 'string' || !content) {
          fail('CONTEXT.md 写入内容为空');
        }
        const label = /team-glossary\.md$/i.test(filePath) ? 'team-glossary.md' : 'CONTEXT.md';
        // 2026-07-15 Fix: mode='edit' for Edit/MultiEdit (fragment-level
        // hasTerm only); mode='write' for Write (full 3-check).
        const mode = (toolName === 'Edit' || toolName === 'MultiEdit') ? 'edit' : 'write';
        validateContext(content, label, mode);
        return { kind: 'allow' };
      }

      const adrMatch = ADR_RE.exec(filePath);
      if (adrMatch) {
        if (typeof content !== 'string' || !content) {
          fail('ADR 写入内容为空');
        }
        checkAdrUniqueness(filePath, adrMatch[2]);
        // 2026-07-24 Fix (gh-68): mode='edit' for Edit/MultiEdit (fragment-level
        // validation); mode='write' for Write (full 5-check). Mirrors the
        // CONTEXT.md branch above.
        const mode = (toolName === 'Edit' || toolName === 'MultiEdit') ? 'edit' : 'write';
        validateAdr(content, adrMatch[2], mode);
        return { kind: 'allow' };
      }

      return { kind: 'allow' };
    } catch (err) {
      if (err instanceof BlockError) return { kind: 'block', message: err.message };
      // Fail-open: hook failures must never block legitimate tool use.
      // Preserve 2026-07-13 daemon.log visibility fix, then allow.
      logFatal(err);
      return { kind: 'allow' };
    }
  },
});
