#!/usr/bin/env node
'use strict';
// pre-tool-skill-routing-sync.cjs
// Bridge gh-21: Skill tool injection does not refresh ~/.claude/.routing-state.json,
// causing the global pre-context-write-guard (which reads that file) to false-block
// legit writes after Skill(domain-modeling) invocation. This hook listens on
// PreToolUse:Skill, writes a fresh routing-state with the invoked skill id
// (preserving id + phase, recomputing signature), so the next Write tool call
// sees a valid active skill and identity check passes naturally.
//
// Why a new file rather than patching pre-context-write-guard.cjs:
//   - pre-context-write-guard is part of the 10-hook set (CLAUDE.md "10-hook
//     不可 regress"); patching it would require ADR.
//   - Adding a PreToolUse:Skill matcher to arthurpower/hooks/hooks.json does
//     not modify any existing hook, only adds a new listener.
//   - Mirrors the proven pattern of user-level lifecycle-hook.cjs:60-73
//     (which solves the same problem but only fires if registered in
//     ~/.claude/settings.json — not always the case).
//
// Zero-dep Node CJS. Sync write (no ipc-core to avoid cross-plugin require).
// Fails-open on any error. Never blocks the Skill tool call itself.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const SKILL_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

const STATE_FILE = path.join(os.homedir(), '.claude', '.routing-state.json');

function sha256(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function uuid() {
  return crypto.randomUUID();
}

function writeRoutingState(next) {
  // Atomic-ish: write to .tmp then rename. Two-process races are not a concern
  // because PreToolUse:Skill fires before the agent's Write tool, which is the
  // only consumer that depends on a fresh skill field.
  const tmp = STATE_FILE + '.tmp';
  const json = JSON.stringify(next, null, 2);
  fs.writeFileSync(tmp, json, 'utf8');
  fs.renameSync(tmp, STATE_FILE);
}

function normalizeSkillId(s) {
  if (typeof s !== 'string' || !s) return '';
  const parts = s.split(':');
  return parts[parts.length - 1];
}

(function main() {
  let input = '';
  try {
    // Use shared 1s-silence stdin reader when co-located; fall back to
    // a minimal sync read when the shared lib is absent.
    try {
      const libPath = path.join(__dirname, 'lib', 'read-stdin-with-timeout.cjs');
      const { readStdin } = require(libPath);
      // readStdin is async; for this hook we only need a synchronous read
      // because we have no other I/O to await. Fall through to sync read.
    } catch (_) { /* no shared lib, use sync */ }
    input = fs.readFileSync(0, 'utf8');
  } catch (_) {
    process.exit(0); // fail-open
  }
  if (!input) process.exit(0);

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (_) {
    process.exit(0); // fail-open
  }

  const toolName = parsed && parsed.tool_name;
  if (toolName !== 'Skill') process.exit(0);

  const rawSkill = parsed && parsed.tool_input && parsed.tool_input.skill;
  const skill = normalizeSkillId(rawSkill);
  if (!skill || !SKILL_ID_PATTERN.test(skill)) process.exit(0);

  // Read current state to preserve id + phase (matches lifecycle-hook.cjs:57-58).
  let currentId = null;
  let currentPhase = 'initial';
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const state = JSON.parse(raw);
    if (state && typeof state.id === 'string') currentId = state.id;
    if (state && typeof state.phase === 'string') currentPhase = state.phase;
  } catch (_) {
    // Missing/corrupt — start fresh.
  }

  const next = {
    schemaVersion: 1,
    id: currentId || uuid(),
    skill,
    phase: currentPhase,
    timestamp: Date.now(),
  };
  // Sign over the same canonical fields ipc-core signs (schemaVersion, id,
  // skill, phase, timestamp) so consumers using ipc.readRoutingState accept
  // this state too.
  next.signature = sha256(JSON.stringify({
    schemaVersion: next.schemaVersion,
    id: next.id,
    skill: next.skill,
    phase: next.phase,
    timestamp: next.timestamp,
  }));

  try {
    writeRoutingState(next);
  } catch (_) {
    // fail-open: a failed sync must not block the Skill tool call.
  }

  process.exit(0);
})();
