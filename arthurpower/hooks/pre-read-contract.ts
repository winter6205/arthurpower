#!/usr/bin/env node
// pre-read-contract.ts
// Arthurpower context closed-loop read-contract advisory hook. zod-only runtime.
// Tool gate: PreToolUse Write/Edit/MultiEdit/NotebookEdit/Bash.
// Emits an advisory systemMessage when the agent is about to write under src/
// without having read docs/CONTEXT.md in the same session.
//
// Behavior: advisory only (exit 0). Never blocks. All errors fail-open.
// State file is read-only for this hook; writes are performed by the lifecycle
// router / PostToolUse Read hook.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { z } from 'zod';
import { defineHook } from './runtime/defineHook.ts';

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

function extractBashTargetPaths(command: string): string[] {
  const paths: string[] = [];
  if (!command) return paths;
  const regex = new RegExp(
    SEP + String.raw`(?:>>?\s*|(?:rm(?:\s+-\w+)?|rmdir|tee|cp|mv)\s+(?:[^|;&]*?\s+)?|sed\s+(?:-i\s+)?[^|;&]*?)` + String.raw`["']?((?:[./\\])?src[/\\][^\s"'|;&]+)["']?`,
    'ig'
  );
  let match: RegExpExecArray | null;
  while ((match = regex.exec(command)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

function isExcludedPath(p: string): boolean {
  return EXCLUDED_RE.test(p);
}

function isUnderSrc(p: string): boolean {
  return SRC_RE.test(p) && !isExcludedPath(p);
}

function normalizeSlashes(p: string): string {
  return p.replace(/\\/g, '/');
}

function getProjectRoot(cwd: string): string {
  if (!cwd) return process.cwd();
  return path.resolve(cwd);
}

function contextPath(projectRoot: string): string {
  return path.join(projectRoot, 'docs', 'CONTEXT.md');
}

function hasContextFile(projectRoot: string): boolean {
  try {
    return fs.existsSync(contextPath(projectRoot));
  } catch (_) {
    return false;
  }
}

interface ReadPathEntry {
  path?: unknown;
}

interface ReadContractState {
  read_paths?: unknown;
  last_checked?: unknown;
}

function loadState(sessionId: string): ReadContractState | null {
  try {
    const stateFile = path.join(STATE_DIR, sessionId + '.json');
    if (!fs.existsSync(stateFile)) return null;
    const raw = fs.readFileSync(stateFile, 'utf8');
    return JSON.parse(raw || 'null');
  } catch (_) {
    return null;
  }
}

function hasReadContext(state: ReadContractState | null, projectRoot: string): boolean {
  if (!state || !Array.isArray(state.read_paths)) return false;
  const expected = normalizeSlashes(path.join(projectRoot, 'docs', 'CONTEXT.md'));
  return state.read_paths.some((rawEntry: unknown) => {
    const entry = rawEntry as ReadPathEntry | null;
    if (!entry || typeof entry.path !== 'string') return false;
    const absolute = path.isAbsolute(entry.path)
      ? entry.path
      : path.join(projectRoot, entry.path);
    return normalizeSlashes(absolute) === expected;
  });
}

function rateLimited(state: ReadContractState | null): boolean {
  if (!state || typeof state.last_checked !== 'number') return false;
  return (Date.now() - state.last_checked) < RATE_LIMIT_MS;
}

function resolveWriteTarget(toolName: string, toolInput: Record<string, unknown>): string {
  if (toolName === 'Bash') {
    const command = (toolInput && (toolInput.command || toolInput.cmd)) || '';
    const targets = extractBashTargetPaths(command as string);
    // If any target is under src/ and not excluded, the whole Bash operation is
    // considered a src/ write for advisory purposes.
    const srcTarget = targets.find((t) => isUnderSrc(t));
    return srcTarget || '';
  }
  return (toolInput && (toolInput.file_path || toolInput.notebook_path)) as string || '';
}

defineHook({
  schema: z.object({
    file_path: z.string().optional(),
    notebook_path: z.string().optional(),
    command: z.string().optional(),
    cmd: z.string().optional(),
    cwd: z.string().optional(),
  }).passthrough(),
  failOpen: true,
  handler: ({ tool_name, tool_input, envelope }) => {
    if (!TOOLS.has(tool_name)) return { kind: 'allow' };

    const sessionId = (envelope.session_id as string | undefined) || 'default';
    const projectRoot = getProjectRoot((tool_input.cwd as string | undefined) || process.cwd());

    if (!hasContextFile(projectRoot)) return { kind: 'allow' };

    const writeTarget = resolveWriteTarget(tool_name, tool_input);
    if (!writeTarget || !isUnderSrc(writeTarget)) return { kind: 'allow' };

    const state = loadState(sessionId);

    if (hasReadContext(state, projectRoot)) return { kind: 'allow' };

    if (rateLimited(state)) return { kind: 'allow' };

    return {
      kind: 'advisory',
      message: 'Advisory: 建议先读 docs/CONTEXT.md 了解项目术语定义，再写 src/ 代码。',
    };
  },
});
