// pre-release-validate.ts
// Router re-sync invariant detector (ADR-0011 fusion target #1, gh-09).
// Migrated from .cjs to .ts (2026-07-22). Zero-dep: uses only Node built-ins
// (no zod needed — this hook validates filesystem state, not structured input).
//
// Semantics (per boundary-testing-protocol.md):
//   - Drift detected   -> stderr [FAIL] line + exit 1
//   - No drift         -> exit 0
//   - Uncaught error   -> append one line to ~/.claude/daemon.log + exit 0
//
// Tool gate: PreToolUse Write/Edit/MultiEdit/Bash. On non-matching tool
// the hook exits 0 (fail-open, no work).

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'Bash']);

// Router file is the skill this whole hook is named after — its directory
// must be excluded from the "missing reference" check.
const ROUTER_DIR = 'using-agent-skills';

interface InvariantResult {
  status: 'clean' | 'drift';
  missing: string[];
  skillsRoot: string | null;
}

async function readStdin(): Promise<string> {
  const { readStdin: rs } = await import('./lib/read-stdin-with-timeout.ts');
  return rs();
}

function logFatal(err: unknown): void {
  const msg = '[pre-release-validate.ts FATAL] ' +
    ((err as Error)?.stack || err) + '\n';
  process.stderr.write(msg);
  try {
    const logPath = path.join(os.homedir(), '.claude', 'daemon.log');
    fs.appendFileSync(logPath,
      '[' + new Date().toISOString() + '] ' + msg, 'utf8');
  } catch (_) {
    // If daemon.log is unwritable, stderr write above is the fallback.
  }
}

function findSkillsRoot(): string | null {
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

function checkRouterInvariant(): InvariantResult {
  const skillsRoot = findSkillsRoot();
  if (!skillsRoot) {
    return { status: 'clean', missing: [], skillsRoot: null };
  }

  const routerPath = path.join(skillsRoot, ROUTER_DIR, 'SKILL.md');
  if (!fs.existsSync(routerPath)) {
    process.stderr.write('[FAIL] router:missing-file ' +
      path.join('arthurpower', 'skills', ROUTER_DIR, 'SKILL.md') + '\n');
    return { status: 'drift', missing: ['__router_file_missing__'], skillsRoot };
  }

  const routerText = fs.readFileSync(routerPath, 'utf8');

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
  } catch (err) {
    logFatal(new Error('readdirSync failed on ' + skillsRoot + ': ' + (err as Error).message));
    return { status: 'clean', missing: [], skillsRoot };
  }

  const missing: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name === ROUTER_DIR) continue;
    const skillMd = path.join(skillsRoot, name, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    if (!routerText.includes(name)) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    return { status: 'drift', missing, skillsRoot };
  }
  return { status: 'clean', missing: [], skillsRoot };
}

async function main(): Promise<void> {
  const raw = await readStdin();
  let toolName = '';
  try {
    const obj = JSON.parse(raw || '{}');
    toolName = (obj && obj.tool_name) || '';
  } catch (_) {
    // Bad JSON or empty stdin — keep toolName empty so validation still runs.
  }
  if (toolName && !TOOLS.has(toolName)) {
    process.exit(0);
  }

  const result = checkRouterInvariant();
  if (result.status === 'drift') {
    for (const name of result.missing) {
      if (name === '__router_file_missing__') continue;
      process.stderr.write(
        '[FAIL] router:missing-reference skills/' + name + '\n'
      );
    }
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  logFatal(err);
  process.exit(0);
});
