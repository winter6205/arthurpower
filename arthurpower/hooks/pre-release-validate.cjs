#!/usr/bin/env node
'use strict';
// pre-release-validate.cjs
// Router re-sync invariant detector (ADR-0011 fusion target #1, gh-09).
// Zero-dep Node CJS. Fail-open on any uncaught error.
//
// Semantics (per boundary-testing-protocol.md):
//   - Drift detected   -> stderr [FAIL] line + exit 1
//   - No drift         -> exit 0
//   - Uncaught error   -> append one line to ~/.claude/daemon.log + exit 0
//
// IMPORTANT: When wired as a PreToolUse hook, exit 1 surfaces as a
// NON-BLOCKING advisory to the model (the harness treats exit 2 as the
// blocking signal; exit 1 is informational). Do NOT use exit 2 here.
// The detector is a state check, not a per-call permission gate; the
// plan and boundary protocol explicitly require exit 1 for drift so
// the eval can verify state via `python <driver>; echo exit=$?`.
//
// Tool gate: PreToolUse Write/Edit/MultiEdit/Bash. On non-matching tool
// the hook exits 0 (fail-open, no work). Stdin may be empty or malformed
// because the hook validates filesystem state, not per-call payload;
// empty/malformed stdin still runs the validation.

const TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'Bash']);

// Router file is the skill this whole hook is named after — its directory
// must be excluded from the "missing reference" check, otherwise the
// router reports itself as missing.
const ROUTER_DIR = 'using-agent-skills';

function readStdin() {
  const { readStdin: rs } = require('./lib/read-stdin-with-timeout.cjs');
  return rs();
}

function logFatal(err) {
  // Fail-open visibility: one line to daemon.log so silent crashes are
  // discoverable. Do NOT include secret content from stdin.
  const msg = '[pre-release-validate.cjs FATAL] ' +
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

// ----------------------------------------------------------------------------
// Core invariant check
// ----------------------------------------------------------------------------

function findSkillsRoot() {
  // Walk up from process.cwd() looking for an `arthurpower/skills`
  // directory. This makes the hook work whether invoked from the repo
  // root, from the arthurpower/ subdir, or from a CI runner with a
  // different cwd. Limited to 8 hops to bound the search.
  const fs = require('node:fs');
  const path = require('node:path');
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'arthurpower', 'skills');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function checkRouterInvariant() {
  const fs = require('node:fs');
  const path = require('node:path');

  const skillsRoot = findSkillsRoot();
  if (!skillsRoot) {
    // No skills root found anywhere up the tree. Treat as "nothing to
    // validate" rather than a failure — the hook may be invoked outside
    // a repo (e.g. during testing harness setup).
    return { status: 'clean', missing: [], skillsRoot: null };
  }

  const routerPath = path.join(skillsRoot, ROUTER_DIR, 'SKILL.md');
  if (!fs.existsSync(routerPath)) {
    process.stderr.write('[FAIL] router:missing-file ' +
      path.join('arthurpower', 'skills', ROUTER_DIR, 'SKILL.md') + '\n');
    return { status: 'drift', missing: ['__router_file_missing__'] };
  }

  const routerText = fs.readFileSync(routerPath, 'utf8');

  let entries = [];
  try {
    entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
  } catch (err) {
    // Unreadable skills directory -> fail-open. The structural check
    // (router file present) still ran above; the per-skill loop cannot
    // run so we report clean to avoid blocking on transient IO errors.
    logFatal(new Error('readdirSync failed on ' + skillsRoot + ': ' + err.message));
    return { status: 'clean', missing: [], skillsRoot };
  }

  const missing = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name === ROUTER_DIR) continue; // router references itself
    // Cheap structural check: each skill directory should contain a
    // SKILL.md. Skip directories that don't, so we don't false-positive
    // on placeholder folders.
    const skillMd = path.join(skillsRoot, name, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    // Substring check: the router file's body should mention the skill
    // name at least once. This is intentionally coarse — it covers both
    // Quick Reference Table entries and prose mentions in Skill Rules.
    if (!routerText.includes(name)) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    return { status: 'drift', missing, skillsRoot };
  }
  return { status: 'clean', missing: [], skillsRoot };
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

(async function main() {
  // Read stdin once into a string buffer. We then try to JSON.parse it
  // purely to extract toolName for the tool gate. Empty or malformed
  // stdin is OK — toolName stays empty and the validation still runs.
  const raw = await readStdin();
  let toolName = '';
  try {
    const obj = JSON.parse(raw || '{}');
    toolName = (obj && obj.tool_name) || '';
  } catch (_) {
    // Bad JSON or empty stdin — keep toolName empty so we skip the tool
    // gate and run validation. This is the fail-open contract.
  }
  if (toolName && !TOOLS.has(toolName)) {
    process.exit(0);
  }

  const result = checkRouterInvariant();
  if (result.status === 'drift') {
    for (const name of result.missing) {
      // Use a stable, greppable prefix so the eval (and humans) can
      // extract failure lines from stderr reliably. See eval 016's
      // success criterion: "[FAIL] router:missing-reference" in stderr.
      if (name === '__router_file_missing__') {
        // already written above; nothing to do
        continue;
      }
      process.stderr.write(
        '[FAIL] router:missing-reference skills/' + name + '\n'
      );
    }
    process.exit(1);
  }
  process.exit(0);
})().catch((err) => {
  logFatal(err);
  process.exit(0);
});