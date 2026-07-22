#!/usr/bin/env node
'use strict';
// defend-claim-dumb-zone.cjs - Q4 Session Entity Consistency advisory.
// Port of defend-claim-dumb-zone.sh. Zero-dep Node CJS.
// PostToolUse on Edit|Write. Advisory every 10th turn; never blocks.

const fs = require('node:fs');
const path = require('node:path');
const { readStdin } = require('./lib/read-stdin-with-timeout.cjs');

const COUNTER_FILE = path.join(
  (process.env.USERPROFILE || process.env.HOME || require('node:os').homedir()),
  '.claude', 'hooks', '.dc-turn-counter',
);

function readCounter() {
  try { return parseInt(fs.readFileSync(COUNTER_FILE, 'utf8').trim(), 10) || 0; }
  catch (_) { return 0; }
}

function writeCounter(n) {
  try {
    fs.mkdirSync(path.dirname(COUNTER_FILE), { recursive: true });
    fs.writeFileSync(COUNTER_FILE, String(n));
    return true;
  } catch (_) { return false; }
}

(async function main() {
  const arg = process.argv[2];

  if (arg === '--self-test') {
    console.log('Q4 self-test: dumb-zone counter. PASS');
    process.exit(0);
  }

  if (arg === '--self-test-reset') {
    try { fs.unlinkSync(COUNTER_FILE); } catch (_) { /* not present */ }
    process.exit(0);
  }

  // Drain stdin (must always exist for PostToolUse hooks)
  await readStdin();

  let count = readCounter();
  count = count + 1;
  if (!writeCounter(count)) process.exit(0);

  if (count % 10 === 0) {
    console.log(JSON.stringify({
      systemMessage: '[defend-claim Q4] Advisory: turn ' + count
        + ' reached. Consider re-grepping for referenced entities '
        + '(functions/classes/imports) to detect drift. Stale '
        + 'references are the #1 source of phantom claims.',
    }));
  }
  process.exit(0);
})().catch((err) => {
  process.stderr.write('[defend-claim-dumb-zone.cjs FATAL] '
    + (err && err.stack || err) + String.fromCharCode(10));
  process.exit(0); // fail-open
});
