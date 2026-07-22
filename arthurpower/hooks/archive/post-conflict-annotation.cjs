#!/usr/bin/env node
'use strict';
// post-conflict-annotation.cjs
// Context closed-loop ADR conflict annotation advisory hook. Zero-dep Node CJS.
// Tool gate: PostToolUse (Edit|MultiEdit|Write|Bash only; Read/Glob/Grep silent pass).
// Detects skill output contradicting existing ADR Decision sections.
// Requires explicit "> Contradicts ADR-NNNN" annotation for any deviation,
// where NNNN must match an actually-detected conflicting ADR number.
// 2026-07-13 Dimension B P3 priority (deferred -> implemented in B-2 cycle).
// 2026-07-15: matcher narrowed in body (hooks.json edit is out-of-scope of this file),
//             annotation NNNN validated against real conflict set,
//             verb whitelist expanded to 10 Chinese verbs.
// Refs: deferred-multilang-adr-detect (full multilang detection in next PR)
//
// Behavior: advisory only (exit 0). Never blocks.
// All errors fail-open.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ADR_DIR_RE = /(^|[/\\])docs[/\\]adr[/\\]\d{4}-[^/\\]+\.md$/i;
const ADR_NUMBER_RE = /^(\d{4})-/;
const ADR_STATUS_ACCEPTED = /^\s*Status:\s*(accepted|proposed)\s*$/im;
const ADR_STATUS_REJECTED = /^\s*Status:\s*(superseded\s+by\s+\d{4}|deprecated)\s*$/im;
const DECISION_SECTION_RE = /^##\s+Decision\s*$/m;
const SECTION_END_RE = /^##\s/m;

// Whitelisted tools that actually emit skill output worth conflict-scanning.
// Defense-in-depth: hooks.json matcher should also be narrowed, but that
// change is out of scope of this single-file commit.
const ALLOWED_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'Bash']);

// Verb whitelist: 7 English + 10 Chinese (parity subset).
// Full multilang conflict detection is deferred.
// English selection verbs: choose/use an item
const SELECTION_VERB_RE = /(?:^|\W)(use|adopt|migrate to|switch to|will use|decided on|使用|采用|迁移到|切换到|选择|决定|改用)\s+([\w-]+)/g;
// English+Chinese negation verbs: explicitly reject an item
const NEGATION_VERB_RE = /(?:^|\W)(do not use|avoid|deprecate|不用|避免|废弃)\s+([\w-]+)/g;

const CONTRADICTS_ANNOTATION_RE = />\s*Contradicts\s+ADR-(\d{4})/gi;

async function readStdin() {
  let buf = '';
  process.stdin.setEncoding('utf8');
  for await (const c of process.stdin) buf += c;
  return buf;
}

function logFatal(err) {
  const msg = '[post-conflict-annotation.cjs FATAL] ' +
    ((err && err.stack) || err) + '\n';
  process.stderr.write(msg);
  try {
    const logPath = path.join(os.homedir(), '.claude', 'daemon.log');
    fs.appendFileSync(logPath,
      '[' + new Date().toISOString() + '] ' + msg, 'utf8');
  } catch (_) {}
}

function logDaemon(msg) {
  try {
    const logPath = path.join(os.homedir(), '.claude', 'daemon.log');
    fs.appendFileSync(logPath,
      '[' + new Date().toISOString() + '] [post-conflict-annotation.cjs] ' + msg + '\n', 'utf8');
  } catch (_) {}
}

function advisory(message) {
  console.log(JSON.stringify({ systemMessage: message }));
}

function extractDecisionSection(content) {
  const decisionMatch = content.match(DECISION_SECTION_RE);
  if (!decisionMatch) return null;
  const startIdx = decisionMatch.index + decisionMatch[0].length;
  const rest = content.slice(startIdx);
  const endMatch = rest.match(SECTION_END_RE);
  return endMatch ? rest.slice(0, endMatch.index) : rest;
}

function parseAdrFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (ADR_STATUS_REJECTED.test(content)) return null;
    if (!ADR_STATUS_ACCEPTED.test(content)) return null;
    const numMatch = path.basename(filePath).match(ADR_NUMBER_RE);
    if (!numMatch) return null;
    const adrNumber = numMatch[1];
    const decisionText = extractDecisionSection(content);
    if (!decisionText) return null;
    // First: find all NEGATION matches and record their spans (to exclude from SELECTION)
    const negationSpans = [];
    const negRe = new RegExp(NEGATION_VERB_RE.source, 'gi');
    let m;
    while ((m = negRe.exec(decisionText)) !== null) {
      negationSpans.push([m.index, m.index + m[0].length, m[2].toLowerCase()]);
    }
    // Second: find all SELECTION matches and exclude ones inside negation spans
    const positiveTerms = new Set();
    const selRe = new RegExp(SELECTION_VERB_RE.source, 'gi');
    while ((m = selRe.exec(decisionText)) !== null) {
      // Check if this match is contained in a negation span
      const inside = negationSpans.some(([s, e]) => m.index >= s && m.index + m[0].length <= e);
      if (!inside) {
        positiveTerms.add(m[2].toLowerCase());
      }
    }
    // Build terms set
    const terms = new Set();
    for (const t of positiveTerms) terms.add(t);
    for (const [, , term] of negationSpans) terms.add('!' + term);
    return { adrNumber, terms };
  } catch (_) {
    return null;
  }
}

function loadAdrDecisions(adrDir) {
  const decisions = new Map();  // adrNumber -> Set<term>
  if (!fs.existsSync(adrDir)) return decisions;
  let entries;
  try { entries = fs.readdirSync(adrDir); } catch (_) { return decisions; }
  for (const entry of entries) {
    if (!/^\d{4}-.+\.md$/.test(entry)) continue;
    const adr = parseAdrFile(path.join(adrDir, entry));
    if (adr && adr.terms.size > 0) {
      decisions.set(adr.adrNumber, adr.terms);
    }
  }
  return decisions;
}

function extractSkillOutput(input) {
  // Try several common fields from PostToolUse tool_response
  if (!input || typeof input !== 'object') return '';
  // tool_response may be a string or object
  const tr = input.tool_response;
  if (typeof tr === 'string') return tr;
  if (tr && typeof tr === 'object') {
    if (typeof tr.output === 'string') return tr.output;
    if (typeof tr.content === 'string') return tr.content;
    if (typeof tr.text === 'string') return tr.text;
  }
  // Direct field
  if (typeof input.output === 'string') return input.output;
  if (typeof input.content === 'string') return input.content;
  return '';
}

function detectConflicts(skillOutput, adrDecisions) {
  // Extract output terms using two-pass scan: first NEGATION (track spans),
  // then SELECTION (exclude spans inside negation matches).
  const negationSpans = [];
  const outputNegative = new Set();
  const negRe = new RegExp(NEGATION_VERB_RE.source, 'gi');
  let m;
  while ((m = negRe.exec(skillOutput)) !== null) {
    negationSpans.push([m.index, m.index + m[0].length]);
    outputNegative.add(m[2].toLowerCase());
  }
  const outputPositive = new Set();
  const selRe = new RegExp(SELECTION_VERB_RE.source, 'gi');
  while ((m = selRe.exec(skillOutput)) !== null) {
    const inside = negationSpans.some(([s, e]) => m.index >= s && m.index + m[0].length <= e);
    if (!inside) {
      outputPositive.add(m[2].toLowerCase());
    }
  }

  // Detect conflicts: conflict = ADR and output DISAGREE on polarity
  const conflicts = [];
  for (const [adrNumber, adrTerms] of adrDecisions) {
    for (const outputTerm of outputPositive) {
      if (adrTerms.has('!' + outputTerm)) {
        conflicts.push({ adrNumber, term: outputTerm, kind: 'inverse' });
      }
    }
    for (const outputTerm of outputNegative) {
      if (adrTerms.has(outputTerm)) {
        conflicts.push({ adrNumber, term: outputTerm, kind: 'inverse' });
      }
    }
  }
  return conflicts;
}

(async function main() {
  const raw = await readStdin();

  let payload = {};
  try {
    payload = JSON.parse(raw || '{}');
  } catch (_) {
    process.exit(0);
  }

  // Bug 1 fix: tool_name gate. Defense-in-depth: matcher in hooks.json should
  // also be narrowed to (Edit|MultiEdit|Write|Bash), but that file is out of
  // scope. We enforce the narrow allow-list here so Read/Glob/Grep cannot
  // trigger an advisory even if the matcher becomes `.*` again.
  const toolName = (payload && typeof payload.tool_name === 'string')
    ? payload.tool_name : '';
  if (!ALLOWED_TOOLS.has(toolName)) {
    process.exit(0);
  }

  const skillOutput = extractSkillOutput(payload);
  if (!skillOutput || skillOutput.length < 5) {
    process.exit(0);
  }

  const projectRoot = process.cwd();
  const adrDir = path.join(projectRoot, 'docs', 'adr');
  const decisions = loadAdrDecisions(adrDir);

  if (decisions.size === 0) {
    process.exit(0);
  }

  const conflicts = detectConflicts(skillOutput, decisions);
  if (conflicts.length === 0) {
    process.exit(0);
  }

  // Bug 2 fix: annotation validation. A `> Contradicts ADR-NNNN` annotation
  // only suppresses the advisory for conflicts whose adrNumber equals NNNN.
  // Annotations that cite an unrelated ADR number do NOT suppress — the agent
  // must annotate the actual conflicting ADR by its real number.
  const annotatedAdrNumbers = new Set();
  for (const m of skillOutput.matchAll(CONTRADICTS_ANNOTATION_RE)) {
    annotatedAdrNumbers.add(m[1]);
  }

  // Emit advisory for each conflict whose ADR lacks a matching annotation.
  let emittedCount = 0;
  for (const c of conflicts) {
    if (annotatedAdrNumbers.has(c.adrNumber)) continue;
    advisory('[context-loop/conflict] Skill output may contradict ADR-' + c.adrNumber +
      ' (' + (c.kind === 'inverse' ? 'ADR prohibits' : 'ADR uses') + ' "' + c.term +
      '"). Required annotation: > Contradicts ADR-' + c.adrNumber +
      ' - but worth reopening because <reason>. No block applied (exit 0).');
    emittedCount++;
  }

  // Touch emittedCount so future readers know we accounted for the partial
  // suppression; the value is intentionally unused to keep behaviour advisory.
  void emittedCount;

  process.exit(0);
})().catch((err) => {
  logFatal(err);
  process.exit(0);
});