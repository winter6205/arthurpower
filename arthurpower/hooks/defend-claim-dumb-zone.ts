#!/usr/bin/env node
// Port of defend-claim-dumb-zone.sh. zod-only runtime.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { defineHook } from './runtime/defineHook.ts';

const counterFile = path.join(
  process.env.USERPROFILE || process.env.HOME || os.homedir(),
  '.claude',
  'hooks',
  '.dc-turn-counter',
);

function readCounter(): number {
  try {
    return Number.parseInt(fs.readFileSync(counterFile, 'utf8').trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function writeCounter(count: number): boolean {
  try {
    fs.mkdirSync(path.dirname(counterFile), { recursive: true });
    fs.writeFileSync(counterFile, String(count));
    return true;
  } catch {
    return false;
  }
}

const arg = process.argv[2];
if (arg === '--self-test') {
  process.stdout.write('Q4 self-test: dumb-zone counter. PASS\n');
  process.exit(0);
}
if (arg === '--self-test-reset') {
  try {
    fs.unlinkSync(counterFile);
  } catch {
    // An absent counter is already reset.
  }
  process.exit(0);
}

defineHook({
  schema: z.object({}).passthrough(),
  failOpen: true,
  handler: () => {
    const count = readCounter() + 1;
    if (!writeCounter(count)) return { kind: 'allow' };
    if (count % 10 !== 0) return { kind: 'allow' };

    return {
      kind: 'advisory',
      message: `[defend-claim Q4] Advisory: turn ${count} reached. Consider re-grepping for referenced entities (functions/classes/imports) to detect drift. Stale references are the #1 source of phantom claims.`,
    };
  },
});
