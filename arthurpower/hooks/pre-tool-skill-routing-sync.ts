// pre-tool-skill-routing-sync.ts
// Bridge gh-21: Skill tool injection does not refresh ~/.claude/.routing-state.json,
// causing the global pre-context-write-guard (which reads that file) to false-block
// legit writes after Skill(domain-modeling) invocation. This hook listens on
// PreToolUse:Skill, writes a fresh routing-state with the invoked skill id
// (preserving id + phase, recomputing signature), so the next Write tool call
// sees a valid active skill and identity check passes naturally.
//
// Migrated from .cjs to .ts (2026-07-22) to align with the rest of the plugin
// hooks. Zero-dep: uses only Node built-ins (no zod needed — this hook does
// not validate structured input, it only reads a single string field).

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';

const SKILL_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

const STATE_FILE = path.join(os.homedir(), '.claude', '.routing-state.json');

function sha256(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function uuid(): string {
  return crypto.randomUUID();
}

function writeRoutingState(next: object): void {
  const tmp = STATE_FILE + '.tmp';
  const json = JSON.stringify(next, null, 2);
  fs.writeFileSync(tmp, json, 'utf8');
  fs.renameSync(tmp, STATE_FILE);
}

function normalizeSkillId(s: unknown): string {
  if (typeof s !== 'string' || !s) return '';
  const parts = s.split(':');
  return parts[parts.length - 1];
}

interface RoutingState {
  schemaVersion: number;
  id: string;
  skill: string;
  phase: string;
  timestamp: number;
  signature: string;
}

function main(): void {
  let input: string;
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch (_) {
    process.exit(0); // fail-open
  }
  if (!input) process.exit(0);

  let parsed: any;
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

  let currentId: string | null = null;
  let currentPhase = 'initial';
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const state = JSON.parse(raw);
    if (state && typeof state.id === 'string') currentId = state.id;
    if (state && typeof state.phase === 'string') currentPhase = state.phase;
  } catch (_) {
    // Missing/corrupt — start fresh.
  }

  const next: RoutingState = {
    schemaVersion: 1,
    id: currentId || uuid(),
    skill,
    phase: currentPhase,
    timestamp: Date.now(),
    signature: '',
  };
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
}

main();
