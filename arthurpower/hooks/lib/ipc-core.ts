// =============================================================
//  ipc-core.ts — Zero-dep cross-platform IPC for Arthurpower
//  Shared by: 13 hooks (.cjs) + Lifecycle (.ts via require)
//
//  Windows NTFS-optimized:
//    - lock: fs.open('wx') advisory exclusive (no flock dependency)
//    - write: temp + fd.sync + fsp.rename (Node 14+ rename-over-existing
//      is atomic on NTFS)
//    - sig + TTL guarantee: reader always sees a valid signed fresh state
//
//  Exports:
//    { IPCError, paths, uuid, sha256, sleep, withBoundary,
//      acquireLock, releaseLock,
//      atomicWriteJson, readJson,
//      appendSignalJson, readSignals,
//      writeRoutingState, readRoutingState,
//      constants, routingStateSchema, signalSchema }
// =============================================================

import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { z } from 'zod';

// =============================================================
//  CONSTANTS — single source of truth, shared by hook + lifecycle
// =============================================================

const STATE_TTL_MS = 5_000;            // routing-state freshness window
const SIGNAL_TTL_MS = 300_000;         // signal expiration for consumers (5min, covers cross-session handoff)
const LOCK_TIMEOUT_MS = 2_000;         // default lock acquire timeout
const LOCK_READ_TIMEOUT_MS = 500;      // shorter for read hot-path
const LOCK_RETRY_BASE_MS = 30;         // initial back-off
const LOCK_RETRY_CAP_MS = 200;         // back-off cap
const SIGNAL_FILE_MAX_BYTES = 65_536;  // hard rotation cap (64KB)
const SIGNAL_LINE_MAX = 50;            // soft rotation cap (lines)

// Validation: skill id (anti-injection guard for routing-state readback)
const SKILL_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

// =============================================================
//  DERIVED PATHS — env override > homedir/.claude
// =============================================================

const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR
  || path.join(os.homedir(), '.claude');

const LOCK_DIR = path.join(CONFIG_DIR, '.locks');

const STATE_FILE   = path.join(CONFIG_DIR, '.routing-state.json');
const SIGNAL_FILE  = path.join(CONFIG_DIR, '.routing-signal.in');
const CONTEXT_FILE = path.join(CONFIG_DIR, '.routing-context.json');

const STATE_LOCK   = path.join(LOCK_DIR, 'routing-state.lock');
const SIGNAL_LOCK  = path.join(LOCK_DIR, 'routing-signal.lock');

// =============================================================
//  ZOD SCHEMAS — replace hand-rolled typeof + regex validation
// =============================================================

// Stored routing-state (with signature). Passthrough preserves
// caller-supplied fields (schemaVersion, id, phase, …).
export const routingStateSchema = z.object({
  skill: z.string().regex(SKILL_ID_PATTERN),
  timestamp: z.number(),
  signature: z.string().length(64),
}).passthrough();

export type RoutingState = z.infer<typeof routingStateSchema>;

// Write-side: no signature yet — it is computed and attached by
// writeRoutingState. Same field rules, minus signature.
const routingStateInputSchema = z.object({
  skill: z.string().regex(SKILL_ID_PATTERN),
  timestamp: z.number(),
}).passthrough();

// Signal: one NDJSON row in the routing-signal file.
export const signalSchema = z.object({
  id: z.string(),
  ts: z.number(),
  suggestedSkill: z.string().regex(SKILL_ID_PATTERN),
}).passthrough();

export type Signal = z.infer<typeof signalSchema>;

// =============================================================
//  HELPERS
// =============================================================

export function uuid(): string {
  return crypto.randomUUID();
}

export function sha256(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// =============================================================
//  IPCError — typed error class (S3 explicit error handling)
// =============================================================

export class IPCError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'IPCError';
    if (cause !== undefined) this.cause = cause;
  }
}

// =============================================================
//  withBoundary — converts any throw to typed IPCError
//  Re-throws IPCError transparent (preserves original).
// =============================================================

export async function withBoundary<T>(fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (err instanceof IPCError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new IPCError(message, err);
  }
}

// =============================================================
//  LOCK — fs.open('wx') advisory exclusive lock
//
//  On Windows NTFS, 'wx' (create-if-not-exists) is atomic.
//  Lock-file holds PID + ts + attempt# for forensics.
//  Stale-lock recovery: if timeout, unlink and retry once.
// =============================================================

export async function acquireLock(lockPath: string, timeoutMs: number = LOCK_TIMEOUT_MS): Promise<void> {
  try {
    await fsp.mkdir(path.dirname(lockPath), { recursive: true });
  } catch (_) { /* mkdir race is harmless */ }

  const start = Date.now();

  for (let attempt = 1; ; attempt++) {
    try {
      const fd = await fsp.open(lockPath, 'wx');
      try {
        await fd.writeFile(
          `pid:${process.pid}\nts:${Date.now()}\nattempt:${attempt}\n`
        );
        await fd.sync();
      } finally {
        await fd.close();
      }
      return; // acquired
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== 'EEXIST' && code !== 'EPERM' && code !== 'EBUSY') {
        throw new IPCError(`lock create failed: ${lockPath}`, err);
      }
      // Held by another writer
      if (Date.now() - start > timeoutMs) {
        // Stale-recovery: assume holder died, unlink, retry once
        try { await fsp.unlink(lockPath); } catch (_) { /* stale lock may already be gone */ }
        try {
          const fd = await fsp.open(lockPath, 'wx');
          try {
            await fd.writeFile(
              `pid:${process.pid}\nts:${Date.now()}\nattempt:${attempt}(timeout-recovery)\n`
            );
            await fd.sync();
          } finally {
            await fd.close();
          }
          return;
        } catch (retryErr: unknown) {
          throw new IPCError(`lock timeout: ${lockPath}`, retryErr);
        }
      }
      // Linear back-off + jitter (anti thundering-herd)
      const backoff = Math.min(LOCK_RETRY_BASE_MS * attempt, LOCK_RETRY_CAP_MS)
                    + Math.random() * 20;
      await sleep(backoff);
    }
  }
}

export async function releaseLock(lockPath: string): Promise<void> {
  try {
    await fsp.unlink(lockPath);
  } catch (err: unknown) {
    if (!(err as NodeJS.ErrnoException) || (err as NodeJS.ErrnoException).code === 'ENOENT') return;
    // Windows EBUSY: wait, retry once, ignore further errors
    await sleep(50);
    try { await fsp.unlink(lockPath); } catch (_) { /* swallow */ }
  }
}

// =============================================================
//  ATOMIC JSON WRITE
//
//  Guarantee: reader sees complete file or ENOENT — never a
//  partially-written JSON. Node 14+ fsp.rename over existing
//  is atomic on NTFS (MoveFileEx semantics).
// =============================================================

export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  try { await fsp.mkdir(dir, { recursive: true }); } catch (_) { }

  const payload = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const tmpName = `.tmp-${crypto.randomBytes(8).toString('hex')}.json`;
  const tmpPath = path.join(dir, tmpName);

  const fd = await fsp.open(tmpPath, 'w');
  try {
    await fd.writeFile(payload);
    await fd.sync();
  } finally {
    await fd.close();
  }

  await fsp.rename(tmpPath, filePath);
}

export async function readJson(filePath: string): Promise<unknown> {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
    throw new IPCError(`readJson failed: ${filePath}`, err);
  }
}

// =============================================================
//  SIGNAL — NDJSON append + rotation + lock
//
//  Each line is one signal object with required: id, ts, suggestedSkill.
//  Consumers filter by processedIds (dedup) and by SIGNAL_TTL_MS.
// =============================================================

export async function appendSignalJson(filePath: string, signal: unknown): Promise<void> {
  const result = signalSchema.safeParse(signal);
  if (!result.success) {
    const field = result.error.issues[0]?.path[0];
    if (field === 'suggestedSkill') {
      throw new IPCError('appendSignalJson: invalid signal (suggestedSkill)');
    }
    throw new IPCError('appendSignalJson: invalid signal (id, ts required)');
  }

  const line = JSON.stringify(result.data) + '\n';
  await acquireLock(SIGNAL_LOCK);
  try {
    let existing = '';
    try {
      existing = await fsp.readFile(filePath, 'utf8');
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') throw err;
    }

    const lines = existing.split('\n').filter(Boolean);
    let trimmed = lines;
    // Rotate when (a) already at cap (>= SIGNAL_LINE_MAX - 1) so the next
    // append lands exactly at SIGNAL_LINE_MAX, or (b) byte-size about to
    // overflow. After rotation, slice() keeps the most recent
    // SIGNAL_LINE_MAX - 1 rows, then +1 append = exactly SIGNAL_LINE_MAX.
    if (lines.length >= SIGNAL_LINE_MAX - 1
        || Buffer.byteLength(existing) + Buffer.byteLength(line) > SIGNAL_FILE_MAX_BYTES) {
      trimmed = lines.slice(-(SIGNAL_LINE_MAX - 1));
    }

    const body = (trimmed.length ? trimmed.join('\n') + '\n' : '') + line;
    await atomicWriteJson(filePath, body);
  } finally {
    await releaseLock(SIGNAL_LOCK);
  }
}

export async function readSignals(filePath: string, processedIds?: Set<string>): Promise<Signal[]> {
  let raw: string;
  try {
    raw = await fsp.readFile(filePath, 'utf8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return [];
    throw new IPCError(`readSignals failed: ${filePath}`, err);
  }

  const now = Date.now();
  const out: Signal[] = [];
  for (const line of raw.split('\n').filter(Boolean)) {
    let parsed: unknown;
    try { parsed = JSON.parse(line); }
    catch { continue; /* skip corrupted line */ }
    const result = signalSchema.safeParse(parsed);
    if (!result.success) continue;
    if (processedIds instanceof Set && processedIds.has(result.data.id)) continue;
    if (now - result.data.ts > SIGNAL_TTL_MS) continue;
    out.push(result.data);
  }
  return out;
}

// =============================================================
//  ROUTING-STATE — signed + TTL-checked single source of truth
//
//  writeRoutingState(state):
//    strip signature → sha256(JSON.stringify(rest)) → attach → atomicWriteJson
//
//  readRoutingState():
//    readJson → strip signature → re-compute sha256 → compare →
//    TTL check → return | null
//
//  Both sides share STATE_TTL_MS so hook and lifecycle cannot drift.
// =============================================================

function lockPathFor(filePath: string): string {
  return `${filePath}.lock`;
}

export async function writeRoutingState(state: unknown, filePath: string = STATE_FILE): Promise<void> {
  const result = routingStateInputSchema.safeParse(state);
  if (!result.success) {
    if (!state || typeof state !== 'object') {
      throw new IPCError('writeRoutingState: state must be object');
    }
    const field = result.error.issues[0]?.path[0];
    if (field === 'skill') {
      throw new IPCError(`writeRoutingState: invalid skill id "${(state as Record<string, unknown>).skill}"`);
    }
    if (field === 'timestamp') {
      throw new IPCError('writeRoutingState: missing timestamp');
    }
    throw new IPCError('writeRoutingState: validation failed');
  }

  // Strip any pre-existing signature to avoid double-signing
  const data = result.data as Record<string, unknown>;
  const { signature: _omit, ...rest } = data;
  const sig = sha256(JSON.stringify(rest));
  const full = { ...rest, signature: sig };

  // Each call-path gets its own lock to avoid contention between
  // canonical and sandbox writes.
  const lockPath = filePath === STATE_FILE ? STATE_LOCK
                 : `${lockPathFor(filePath)}.lock`;
  await acquireLock(lockPath);
  try {
    await atomicWriteJson(filePath, full);
  } finally {
    await releaseLock(lockPath);
  }
}

export async function readRoutingState(filePath: string = STATE_FILE): Promise<RoutingState | null> {
  const lockPath = filePath === STATE_FILE ? STATE_LOCK
                 : `${lockPathFor(filePath)}.lock`;
  await acquireLock(lockPath, LOCK_READ_TIMEOUT_MS);
  try {
    const data = await readJson(filePath);
    if (!data) return null;

    const result = routingStateSchema.safeParse(data);
    if (!result.success) {
      const field = result.error.issues[0]?.path[0];
      if (field === 'skill') {
        // Distinguish missing (not a string) from invalid (bad pattern)
        const skill = (data as Record<string, unknown>)?.skill;
        if (typeof skill !== 'string') throw new IPCError('routingState: missing skill');
        throw new IPCError('routingState: invalid skill id');
      }
      if (field === 'timestamp') throw new IPCError('routingState: missing timestamp');
      if (field === 'signature') throw new IPCError('routingState: missing/invalid signature');
      throw new IPCError('routingState: not an object');
    }

    // Signature verification (S5 anti-tamper)
    const validated = result.data as Record<string, unknown>;
    const { signature: actual, ...rest } = validated;
    const expected = sha256(JSON.stringify(rest));
    if (actual !== expected) {
      throw new IPCError('routingState: signature mismatch (tampered)');
    }

    // TTL gate: age == STATE_TTL_MS is treated as stale. Match the
    // semantics of "5 seconds TTL" rather than "5 seconds + 1 ms".
    const age = Date.now() - result.data.timestamp;
    if (age >= STATE_TTL_MS) return null;

    return result.data;
  } finally {
    await releaseLock(lockPath);
  }
}

// =============================================================
//  EXPORTS — path & constant bundles (single source of truth)
// =============================================================

export const paths = {
  CONFIG_DIR,
  STATE_FILE,
  SIGNAL_FILE,
  CONTEXT_FILE,
  STATE_LOCK,
  SIGNAL_LOCK,
  LOCK_DIR,
} as const;

export const constants = {
  STATE_TTL_MS,
  SIGNAL_TTL_MS,
  LOCK_TIMEOUT_MS,
  LOCK_READ_TIMEOUT_MS,
  SIGNAL_FILE_MAX_BYTES,
  SIGNAL_LINE_MAX,
} as const;
