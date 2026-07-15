#!/usr/bin/env node
'use strict';
// pre-fs-guard.cjs — D1/D6 gate: block the find/grep/&-patterns that leaked the kernel pool.
//
// Background: in a 2026-07 incident, four orphan Git-for-Windows find.exe processes ran
// `find / -name *.png` for ~2 days. The parent (an automation agent) exited without
// reaping children. MSYS find leaked ~32M handles → 9.3 GB paged pool (`Key` registry
// objects, ~265 B each). This hook intercepts the upstream cause at the Bash tool layer.
//
// Rules (anchored, each independent — same convention as pre-tool-supply-chain.cjs):
//   R1: \bfind\s+/(?=\s|$)         — bare `find /` (root path), not `find /d/proj`.
//   R2: grep + -[rR] + standalone / — bare `grep -r /`, not `grep -r ./src`.
//   R3: [^&|>]\s*&\s*$              — trailing lone `&` (orphan-fork). Allows `&&`, `2>&1`, `& wait`.
//
// Output contract (aligned with plugin-dev validate-bash.sh example):
//   deny  -> emit {"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"..."}
//            on STDERR + exit 2 (harness feeds it back to Claude as the block reason).
//   allow -> exit 0 silently.
//
// Override: ARTHUR_FS_GUARD_ALLOW=1 bypasses (mirrors ARTHUR_PIP_ALLOW in supply-chain hook).
// Fail-open on bad stdin / parse error — never block legitimate calls on hook bugs.

const OVERRIDE_ENV = 'ARTHUR_FS_GUARD_ALLOW';

// Anchored, independent — never join into one mega-regex (see supply-chain note L29-31).
const R_FIND_ROOT  = /\bfind\s+\/(?=\s|$)/;
const R_GREP_REC   = /\bgrep\b[^\n]*?-\w*[rR]\w*/;      // grep with -r/-R (any combined form)
const R_ROOT_TOKEN = /(?:^|\s)\/(?=\s|$)/;               // standalone '/' token
const R_BG_TRAIL   = /[^&|>]\s*&\s*$/;

function readStdin() {
  const { readStdin: rs } = require('./lib/read-stdin-with-timeout.cjs');
  return rs();
}

// Split a shell command into independent segments at ; | && || boundaries.
// R_GREP_REC && R_ROOT_TOKEN must be AND'd only within a single segment —
// a 'grep -r ./src' alongside an unrelated 'ls / 2>/dev/null' (joined by ;) must
// not false-positive. (2026-07-15 Fix: command-piece isolation.)
function splitSegments(cmd) {
  // Split while preserving '&&' and '||' as separators (not split-words).
  // Split points: ';' | '&&' | '||' | '|' (pipe). All treated as command boundaries.
  return cmd.split(/\s*(?:&&|\|\||;|\|)\s*/);
}

function check(cmd) {
  if (R_FIND_ROOT.test(cmd)) {
    return 'find / (unbounded root scan) — MSYS find leaks kernel handles on whole-tree traversal. Use a scoped path (find ./src -name x) or fd/Everything.';
  }
  // R2 (grep -r /): AND of grep recursive flag and standalone '/' root token
  // must be evaluated per-segment. A bare '/' in an unrelated 'ls /' segment
  // joined by ';' must not trigger this rule.
  const segments = splitSegments(cmd);
  for (const seg of segments) {
    if (R_GREP_REC.test(seg) && R_ROOT_TOKEN.test(seg)) {
      return 'grep -r / (unbounded root recursion) — leaks handles on whole-tree grep. Scope to a subdir (grep -r ./src -e pattern) or add a path boundary.';
    }
  }
  if (R_BG_TRAIL.test(cmd)) {
    return 'bare trailing & (orphan fork) — backgrounded child outlives the agent and leaks handles. Use a PID-tracking helper, or `cmd & wait`, or `nohup cmd > out 2>&1 & echo $!`.';
  }
  return null;
}

(async function main() {
  if (process.env[OVERRIDE_ENV] === '1') process.exit(0);

  const raw = await readStdin();
  let cmd = '';
  try {
    const input = JSON.parse(raw || '{}');
    cmd = (input && input.tool_input && input.tool_input.command) || '';
  } catch (_) { process.exit(0); }

  if (typeof cmd !== 'string' || !cmd) process.exit(0);

  const reason = check(cmd);
  if (reason) {
    // plugin-dev convention: structured deny on stderr + exit 2.
    process.stderr.write(JSON.stringify({
      hookSpecificOutput: { permissionDecision: 'deny' },
      systemMessage: 'BLOCKED: fs-guard — ' + reason
        + ' Override: export ' + OVERRIDE_ENV + '=1',
    }) + '\n');
    process.exit(2);
  }
  process.exit(0);
})().catch((err) => {
  process.stderr.write('[pre-fs-guard.cjs FATAL] ' + (err && err.stack || err) + '\n');
  process.exit(0);
});