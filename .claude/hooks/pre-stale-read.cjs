#!/usr/bin/env node
'use strict';
// pre-stale-read.cjs
// Context closed-loop stale-read advisory hook. Zero-dep Node CJS.
// Tool gate: PreToolUse Write/Edit/MultiEdit/Bash.
// Emits an advisory systemMessage when docs/CONTEXT.md has been modified since
// the agent last read it and the agent is about to write under src/.
//
// Behavior: advisory only (exit 0). Never blocks. All errors fail-open.
// State file is read-only for this hook; writes are performed by the lifecycle
// router / PostToolUse Read hook.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'Bash']);

const STATE_PATH = path.join(
  os.homedir(),
  '.claude',
  'hooks',
  'state',
  'stale-read-state.json'
);

const DEFAULT_CONTEXT_PATH = 'docs/CONTEXT.md';

// Excluded path segments. A path is excluded if any component matches.
const EXCLUDED_RE = /(^|[/\\])(tests|docs|archive|__tests__|\.claude|node_modules|dist|build|\.next|\.cache)[/\\]/i;
const SRC_RE = /(^|[/\\])src[/\\]/i;

// Bash write detection for src/ targets.
// Reuses the 3-regex style of pre-context-write-guard.cjs (lines 25-68).
// Each regex matches a Bash write/destroy form; the capture group extracts the
// target path so we can run the same src/ + exclusion check used for file paths.
const BASH_TARGET = String.raw`["']?((?:[./\\])?[^"'\s|;&]*src[/\\][^"'\s|;&]*)["']?`;
const SEP = String.raw`(?:^|[\s;&|(])`;

// Form A: standalone redirect like `> src/foo.ts` or `>> src/foo.ts`.
// Allows a heredoc body before the redirect (e.g. `cat <<EOF > src/foo.ts`).
const BASH_REDIRECT_RE = new RegExp(
  SEP + String.raw`[^|;&]*?>>?\s*` + BASH_TARGET,
  'i'
);

// Form B: command keyword + optional flags + optional middle args + target.
// The target must be the LAST path argument so `cp foo src/bar` matches only
// when `src/bar` is the destination.
const BASH_KEYWORD_RE = new RegExp(
  SEP + String.raw`(?:rm(?:\s+-\w+)?|rmdir|tee|cp|mv)\s+(?:[^|;&]*?\s+)?` + BASH_TARGET + String.raw`(?:\s|$|[|;&)])`,
  'i'
);

// Form C: `sed -i [optional script] TARGET` because -i precedes the path.
const BASH_SED_RE = new RegExp(
  SEP + String.raw`sed\s+(?:-i\s+)?[^|;&]*?` + BASH_TARGET + String.raw`(?:\s|$|[|;&)])`,
  'i'
);

function normalizeSlashes(p) {
  return p.replace(/\\/g, '/');
}

function isExcludedPath(p) {
  return EXCLUDED_RE.test(normalizeSlashes(p));
}

function isUnderSrc(p) {
  return SRC_RE.test(p) && !isExcludedPath(p);
}

function detectBashSrcWrite(command) {
  if (!command) return false;
  for (const re of [BASH_REDIRECT_RE, BASH_KEYWORD_RE, BASH_SED_RE]) {
    re.lastIndex = 0;
    const m = re.exec(command);
    if (m && m[1] && isUnderSrc(m[1])) return true;
  }
  return false;
}

function resolveWriteTarget(toolName, toolInput) {
  if (toolName === 'Bash') {
    const command = (toolInput && (toolInput.command || toolInput.cmd)) || '';
    return detectBashSrcWrite(command) ? 'src/' : '';
  }
  return (toolInput && toolInput.file_path) || '';
}

async function readStdin() {
  let buf = '';
  process.stdin.setEncoding('utf8');
  for await (const c of process.stdin) buf += c;
  return buf;
}

function logFatal(err) {
  const msg = '[pre-stale-read.cjs FATAL] ' +
    ((err && err.stack) || err) + '\n';
  process.stderr.write(msg);
  try {
    const logPath = path.join(os.homedir(), '.claude', 'daemon.log');
    fs.appendFileSync(logPath,
      '[' + new Date().toISOString() + '] ' + msg, 'utf8');
  } catch (_) {
    // stderr fallback already written.
  }
}

function logDaemon(msg) {
  try {
    const logPath = path.join(os.homedir(), '.claude', 'daemon.log');
    fs.appendFileSync(logPath,
      '[' + new Date().toISOString() + '] [pre-stale-read.cjs] ' + msg + '\n', 'utf8');
  } catch (_) {
    process.stderr.write('[pre-stale-read.cjs] ' + msg + '\n');
  }
}

function readState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return null;
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    return JSON.parse(raw || 'null');
  } catch (err) {
    // State file corrupted/JSON parse fail -> fail-open + daemon.log warning.
    logDaemon('state file corrupted or unreadable: ' + err.message);
    return null;
  }
}

function getCurrentMtime(projectRoot, contextRelPath) {
  try {
    return fs.statSync(path.join(projectRoot, contextRelPath)).mtimeMs;
  } catch (_) {
    return null;
  }
}

function emitAdvisory(readMtime, currentMtime) {
  const message =
    'Advisory: CONTEXT.md 自你上次读取后已被 domain-modeling 更新（mtime 从 ' +
    readMtime + ' 变为 ' + currentMtime +
    '）。当前 Write/Edit 可能引用过时术语，建议在继续前重读 docs/CONTEXT.md。';
  console.log(JSON.stringify({ systemMessage: message }));
}

(async function main() {
  const raw = await readStdin();
  let toolName = '';
  let toolInput = {};

  try {
    const input = JSON.parse(raw || '{}');
    toolName = (input && input.tool_name) || '';
    toolInput = (input && input.tool_input) || {};
  } catch (_) {
    // Bad JSON or empty stdin -> fail-open.
    process.exit(0);
  }

  if (!TOOLS.has(toolName)) {
    process.exit(0);
  }

  const writeTarget = resolveWriteTarget(toolName, toolInput);
  if (!writeTarget || !isUnderSrc(writeTarget)) {
    process.exit(0);
  }

  const projectRoot = path.resolve(process.cwd());

  const state = readState();
  if (!state || typeof state !== 'object') {
    // Missing/corrupted state -> fail-open (already logged if corrupted).
    process.exit(0);
  }

  const key = normalizeSlashes(projectRoot);
  const record = state[key];
  if (!record || typeof record.readMtime !== 'number') {
    // Never read or malformed record -> fail-open silent.
    process.exit(0);
  }

  const contextRelPath = (record && record.contextPath) || DEFAULT_CONTEXT_PATH;
  const currentMtime = getCurrentMtime(projectRoot, contextRelPath);
  if (currentMtime === null) {
    // Project has no docs/CONTEXT.md -> fail-open silent.
    process.exit(0);
  }

  // Platform mtime precision differs (NTFS 100ns vs Python int truncation).
  // Use a 10ms tolerance so equal-mtime reads (within measurement noise) are not
  // falsely flagged as stale. Only genuine modifications (mtime advanced by
  // more than 10ms) trigger the advisory.
  const MTIME_TOLERANCE_MS = 10;
  if (currentMtime > record.readMtime + MTIME_TOLERANCE_MS) {
    emitAdvisory(record.readMtime, currentMtime);
  }

  process.exit(0);
})().catch((err) => {
  logFatal(err);
  process.exit(0);
});
