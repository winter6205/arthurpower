#!/usr/bin/env node
'use strict';
// pre-context-write-guard.cjs
// Context closed-loop write authority gate. Zero-dep Node CJS.
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

function detectBashViolation(command) {
  if (!command) return null;
  if (BASH_REDIRECT_RE.test(command)) return 'redirect';
  if (BASH_KEYWORD_RE.test(command)) return 'keyword';
  if (BASH_SED_RE.test(command)) return 'sed';
  return null;
}

// ----------------------------------------------------------------------------
// Schema validation
// ----------------------------------------------------------------------------

function readStdin() {
  // Delegates to the shared stdin reader with 1s grace timeout. See
  // lib/read-stdin-with-timeout.cjs for why this replaced the
  // for-await-on-stdin pattern (which hangs when the hook runner does
  // not close stdin, failing the tool with empty stderr).
  const { readStdin: rs } = require('./lib/read-stdin-with-timeout.cjs');
  return rs();
}

function logFatal(err) {
  // Fail-open visibility: write one line to daemon.log so silent crashes are
  // discoverable. Do NOT include secret content from stdin.
  const msg = '[pre-context-write-guard.cjs FATAL] ' +
    ((err && err.stack) || err) + '\n';
  process.stderr.write(msg);
  try {
    const fs = require('node:fs');
    const path = require('node:path');
    const os = require('node:os');
    const logPath = path.join(os.homedir(), '.claude', 'daemon.log');
    fs.appendFileSync(logPath,
      '[' + new Date().toISOString() + '] ' + msg, 'utf8');
  } catch (_) {
    // If daemon.log is unwritable, stderr write above is the fallback.
  }
}

function fail(reason) {
  // 2026-07-15 Fix: write the deny envelope to STDERR (not stdout) so the
  // harness feeds the systemMessage back to the model as the block reason.
  // (stdout may be consumed by tool output streams and bypasses hook feedback.)
  process.stderr.write(JSON.stringify({
    systemMessage:
      'BLOCKED: context-write-guard - ' + reason +
      '. 走 domain-modeling skill 落盘',
  }) + '\n');
  process.exit(2);
}

function hasHeading(content, re) {
  return content.split(/\r?\n/).some((line) => re.test(line.trim()));
}

// 2026-07-15 Fix: validateContext takes a mode parameter.
//   mode='write'         -> full 3-check (hasTitle + hasLanguage + hasTerm). For
//                           Write tool where the caller supplies the whole file.
//   mode='edit'          -> hasTerm ONLY (fragment-level). For Edit/MultiEdit
//                           where new_string is a diff fragment, not the full
//                           file. hasTitle/hasLanguage are file-level checks
//                           irrelevant to a single-term patch.
function validateContext(content, label, mode) {
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

function validateAdr(content, expectedNumber) {
  const lines = content.split(/\r?\n/);
  const titleRe = new RegExp('^#\\s+' + expectedNumber + '\\.\\s+.+');
  const hasTitle = lines.some((line) => titleRe.test(line.trim()));
  const hasDate = lines.some((line) => /^Date:\s*\d{4}-\d{2}-\d{2}\s*$/.test(line.trim()));
  const hasStatus = lines.some((line) => {
    const t = line.trim();
    return /^Status:\s*(proposed|accepted|deprecated|superseded\s+by\s+\d{4})\s*$/.test(t);
  });
  const hasContext = hasHeading(content, /^##\s+Context\b/i);
  const hasDecision = hasHeading(content, /^##\s+Decision\b/i);
  const hasConsequences = hasHeading(content, /^##\s+Consequences\b/i);

  if (!hasTitle) fail('ADR 标题行缺少 NNNN. 前缀');
  if (!hasDate) fail('ADR 缺少 Date: YYYY-MM-DD 行');
  if (!hasStatus) fail('ADR Status 不在 proposed/accepted/deprecated/superseded by NNNN 枚举内');
  if (!hasContext) fail('ADR 缺少 ## Context 章节');
  if (!hasDecision) fail('ADR 缺少 ## Decision 章节');
  if (!hasConsequences) fail('ADR 缺少 ## Consequences 章节');
}

function checkAdrUniqueness(filePath, expectedNumber) {
  // 2026-07-13 Dimension B: prevent ADR number collisions.
  // Scan docs/adr/*.md in the same directory as the target file. If a DIFFERENT
  // file (different basename) with the same NNNN prefix already exists, block.
  // Same-basename writes are allowed (legit Edit/overwrite of same ADR).
  try {
    const fs = require('node:fs');
    const path = require('node:path');
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
    // Fail-open on filesystem errors (e.g. permission denied). Uniqueness is a
    // safety check, not a hard gate - validation still ran above.
  }
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

(async function main() {
  const raw = await readStdin();
  let toolName = '';
  let filePath = '';
  let content = '';
  let bashCommand = '';

  try {
    const input = JSON.parse(raw || '{}');
    toolName = (input && input.tool_name) || '';
    const toolInput = input && input.tool_input ? input.tool_input : {};
    filePath = toolInput.file_path || '';
    bashCommand = (toolInput && (toolInput.command || toolInput.cmd)) || '';
    if (typeof toolInput.content === 'string' && toolInput.content.length > 0) {
      content = toolInput.content;
    } else if (typeof toolInput.new_string === 'string' && toolInput.new_string.length > 0) {
      content = toolInput.new_string;
    } else if (Array.isArray(toolInput.edits)) {
      content = toolInput.edits
        .map((e) => (e && typeof e.new_string === 'string') ? e.new_string : '')
        .join('\n');
    } else {
      content = '';
    }
  } catch (_) {
    // Bad JSON or empty stdin -> fail-open.
    process.exit(0);
  }

  if (!TOOLS.has(toolName)) {
    process.exit(0);
  }

  // Bash path: detect write/destroy redirection to context-guarded files.
  if (toolName === 'Bash' && bashCommand) {
    const violation = detectBashViolation(bashCommand);
    if (violation) {
      fail('Bash 命令尝试直接写/删 docs/CONTEXT.md | docs/CONTEXT-MAP.md | docs/team-glossary.md | docs/adr/*.md，绕过 domain-modeling 写入主权。走 domain-modeling skill 落盘');
    }
  }

  if (typeof filePath !== 'string' || !filePath) {
    process.exit(0);
  }

  const ctxMatch = CONTEXT_RE.exec(filePath);
  if (ctxMatch) {
    if (typeof content !== 'string' || !content) {
      fail('CONTEXT.md 写入内容为空');
    }
    const label = /team-glossary\.md$/i.test(filePath) ? 'team-glossary.md' : 'CONTEXT.md';
    // 2026-07-15 Fix: mode='edit' for Edit/MultiEdit (fragment-level hasTerm only);
    // mode='write' for Write (full 3-check).
    const mode = (toolName === 'Edit' || toolName === 'MultiEdit') ? 'edit' : 'write';
    validateContext(content, label, mode);
    process.exit(0);
  }

  const adrMatch = ADR_RE.exec(filePath);
  if (adrMatch) {
    if (typeof content !== 'string' || !content) {
      fail('ADR 写入内容为空');
    }
    checkAdrUniqueness(filePath, adrMatch[2]);
    validateAdr(content, adrMatch[2]);
    process.exit(0);
  }

  process.exit(0);
})().catch((err) => {
  // Fail-open: hook failures must never block legitimate tool use.
  // Write to daemon.log for visibility (no secret content included).
  logFatal(err);
  process.exit(0);
});