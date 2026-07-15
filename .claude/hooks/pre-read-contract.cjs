#!/usr/bin/env node
'use strict';
// pre-read-contract.cjs
// Arthurpower context closed-loop read-contract advisory hook.
// Zero-dep Node CJS.
// Tool gate: PreToolUse Write/Edit/MultiEdit/NotebookEdit/Bash.
// Emits an advisory systemMessage when the agent is about to write under src/
// without having read docs/CONTEXT.md in the same session.
//
// Behavior: advisory only (exit 0). Never blocks. All errors fail-open.
// State file is read-only for this hook; writes are performed by the lifecycle
// router / PostToolUse Read hook.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash']);
const RATE_LIMIT_MS = 60_000;

const STATE_DIR = path.join(os.homedir(), '.claude', '.locks', '.read-contract-state');

const EXCLUDED_RE = /(^|[/\\])(tests|docs|archive|__tests__)([/\\]|$)/i;
const SRC_RE = /(^|[/\\])src([/\\]|$)/i;

// Bash write detection for src/ targets.
// Reuses the 3-regex style of pre-context-write-guard.cjs, but matches targets
// under src/ instead of docs/.
const TARGET = String.raw`["']?(?:[./\\])?src[/\\][^\s"'|;&]+["']?`;
const SEP = String.raw`(?:^|[\s;&|(])`;

const BASH_REDIRECT_RE = new RegExp(
  SEP + String.raw`[^|;&]*?>>?\s*` + TARGET,
  'i'
);

const BASH_KEYWORD_RE = new RegExp(
  SEP + String.raw`(?:rm(?:\s+-\w+)?|rmdir|tee|cp|mv)\s+(?:[^|;&]*?\s+)?` + TARGET + String.raw`(?:\s|$|[|;&)])`,
  'i'
);

const BASH_SED_RE = new RegExp(
  SEP + String.raw`sed\s+(?:-i\s+)?[^|;&]*?` + TARGET + String.raw`(?:\s|$|[|;&)])`,
  'i'
);

function detectBashSrcWrite(command) {
  if (!command) return false;
  if (BASH_REDIRECT_RE.test(command)) return true;
  if (BASH_KEYWORD_RE.test(command)) return true;
  if (BASH_SED_RE.test(command)) return true;
  return false;
}

function extractBashTargetPaths(command) {
  const paths = [];
  if (!command) return paths;
  const regex = new RegExp(
    SEP + String.raw`(?:>>?\s*|(?:rm(?:\s+-\w+)?|rmdir|tee|cp|mv)\s+(?:[^|;&]*?\s+)?|sed\s+(?:-i\s+)?[^|;&]*?)` + String.raw`["']?((?:[./\\])?src[/\\][^\s"'|;&]+)["']?`,
    'ig'
  );
  let match;
  while ((match = regex.exec(command)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

function isExcludedPath(p) {
  return EXCLUDED_RE.test(p);
}

function isUnderSrc(p) {
  return SRC_RE.test(p) && !isExcludedPath(p);
}

function normalizeSlashes(p) {
  return p.replace(/\\/g, '/');
}

function getProjectRoot(cwd) {
  if (!cwd) return process.cwd();
  return path.resolve(cwd);
}

function contextPath(projectRoot) {
  return path.join(projectRoot, 'docs', 'CONTEXT.md');
}

function hasContextFile(projectRoot) {
  try {
    return fs.existsSync(contextPath(projectRoot));
  } catch (_) {
    return false;
  }
}

async function readStdin() {
  let buf = '';
  process.stdin.setEncoding('utf8');
  for await (const c of process.stdin) buf += c;
  return buf;
}

function logFatal(err) {
  const msg = '[pre-read-contract.cjs FATAL] ' +
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

function advisory(message) {
  console.log(JSON.stringify({ systemMessage: message }));
}

function loadState(sessionId) {
  try {
    const stateFile = path.join(STATE_DIR, sessionId + '.json');
    if (!fs.existsSync(stateFile)) return null;
    const raw = fs.readFileSync(stateFile, 'utf8');
    return JSON.parse(raw || 'null');
  } catch (_) {
    return null;
  }
}

function hasReadContext(state, projectRoot) {
  if (!state || !Array.isArray(state.read_paths)) return false;
  const expected = normalizeSlashes(path.join(projectRoot, 'docs', 'CONTEXT.md'));
  return state.read_paths.some((entry) => {
    if (!entry || typeof entry.path !== 'string') return false;
    const absolute = path.isAbsolute(entry.path)
      ? entry.path
      : path.join(projectRoot, entry.path);
    return normalizeSlashes(absolute) === expected;
  });
}

function rateLimited(state) {
  if (!state || typeof state.last_checked !== 'number') return false;
  return (Date.now() - state.last_checked) < RATE_LIMIT_MS;
}

function resolveWriteTarget(toolName, toolInput) {
  if (toolName === 'Bash') {
    const command = (toolInput && (toolInput.command || toolInput.cmd)) || '';
    const targets = extractBashTargetPaths(command);
    // If any target is under src/ and not excluded, the whole Bash operation is
    // considered a src/ write for advisory purposes.
    const srcTarget = targets.find((t) => isUnderSrc(t));
    return srcTarget || '';
  }
  return (toolInput && (toolInput.file_path || toolInput.notebook_path)) || '';
}

(async function main() {
  const raw = await readStdin();
  let toolName = '';
  let toolInput = {};
  let sessionId = 'default';

  try {
    const input = JSON.parse(raw || '{}');
    toolName = (input && input.tool_name) || '';
    toolInput = (input && input.tool_input) || {};
    sessionId = (input && input.session_id) || 'default';
  } catch (_) {
    process.exit(0);
  }

  if (!TOOLS.has(toolName)) {
    process.exit(0);
  }

  const projectRoot = getProjectRoot(toolInput.cwd || process.cwd());

  if (!hasContextFile(projectRoot)) {
    process.exit(0);
  }

  const writeTarget = resolveWriteTarget(toolName, toolInput);
  if (!writeTarget || !isUnderSrc(writeTarget)) {
    process.exit(0);
  }

  const state = loadState(sessionId);

  if (hasReadContext(state, projectRoot)) {
    process.exit(0);
  }

  if (rateLimited(state)) {
    process.exit(0);
  }

  advisory('Advisory: 建议先读 docs/CONTEXT.md 了解项目术语定义，再写 src/ 代码。');
  process.exit(0);
})().catch((err) => {
  logFatal(err);
  process.exit(0);
});
