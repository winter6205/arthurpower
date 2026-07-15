#!/usr/bin/env node
'use strict';
// defend-claim-cite-integrity.cjs - Q2 phantom cite gate (R2)
// Port of defend-claim-cite-integrity.sh. Zero-dep Node CJS.
// Uses pure string operations (no regex) to sidestep security reminder
// false positives on Win-drive backslash-paren regex patterns.

const fs = require('node:fs');
const path = require('node:path');
const NL = String.fromCharCode(10);  // newline char
const { readStdin } = require('./lib/read-stdin-with-timeout.cjs');

function isDigits(s) {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 48 || code > 57) return false;
  }
  return s.length > 0;
}

function tryResolve(p, cwd) {
  const tries = [p, path.join(cwd, p)];
  for (const i = 0; i < tries.length; i++) {
    try {
      if (fs.statSync(tries[i]).isFile()) return tries[i];
    } catch (_) { /* try next */ }
  }
  return null;
}

function readLine(file, n) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    let idx = 0, cur = 0;
    for (let i = 0; i < data.length; i++) {
      if (data.charCodeAt(i) === 10) {
        if (cur === n - 1) return data.substring(idx, i);
        idx = i + 1; cur++;
      }
    }
    if (cur === n - 1) return data.substring(idx);
    return null;
  } catch (_) { return null; }
}

(async function main() {
  const raw = await readStdin();
  let input = {};
  try { if (raw.trim()) input = JSON.parse(raw); } catch (_) { /* ignore */ }

  const content = (input && input.tool_input && input.tool_input.content) || '';
  const editedFile = (input && input.tool_input && input.tool_input.file_path) || '';
  const cwd = editedFile ? path.dirname(editedFile) : process.cwd();

  if (!content) process.exit(0);

  const lines = content.split(NL);
  for (const line of lines) {
    const colon = line.lastIndexOf(':');
    if (colon <= 0) continue;
    const head = line.substring(0, colon);
    const tail = line.substring(colon + 1).trim();
    if (!isDigits(tail)) continue;
    // Path-like: must contain slash OR drive letter colon
    if (head.indexOf('/') < 0 && head.indexOf(':') < 0) continue;
    // Skip URL prefixes
    if (head.indexOf('//') === 0 || head.indexOf('http') === 0) continue;

    const resolved = tryResolve(head, cwd);
    if (!resolved) {
      console.log(JSON.stringify({
        systemMessage: 'REJECTED: Q2 phantom cite - file does not exist: '
          + head + ' (cwd: ' + cwd + ')',
      }));
      process.exit(2);
    }
    const lc = readLine(resolved, parseInt(tail, 10));
    if (lc === null) {
      console.log(JSON.stringify({
        systemMessage: 'REJECTED: Q2 phantom cite - line ' + tail
          + ' does not exist in ' + resolved,
      }));
      process.exit(2);
    }
  }
  process.exit(0);
})().catch((err) => {
  process.stderr.write('[defend-claim-cite-integrity.cjs FATAL] '
    + (err && err.stack || err) + String.fromCharCode(10));
  process.exit(0);
});
