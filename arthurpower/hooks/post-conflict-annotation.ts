#!/usr/bin/env node
// post-conflict-annotation.ts
// Context closed-loop ADR conflict annotation advisory hook. zod-only runtime.
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
// Behavior: advisory only (exit 0). Never blocks. All errors fail-open.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { defineHook } from './runtime/defineHook.ts';

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

interface ParsedAdr {
  adrNumber: string;
  terms: Set<string>;
}

interface Conflict {
  adrNumber: string;
  term: string;
  kind: string;
}

function extractDecisionSection(content: string): string | null {
  const decisionMatch = content.match(DECISION_SECTION_RE);
  if (!decisionMatch) return null;
  const startIdx = (decisionMatch.index ?? 0) + decisionMatch[0].length;
  const rest = content.slice(startIdx);
  const endMatch = rest.match(SECTION_END_RE);
  return endMatch ? rest.slice(0, endMatch.index ?? rest.length) : rest;
}

function parseAdrFile(filePath: string): ParsedAdr | null {
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
    const negationSpans: Array<[number, number, string]> = [];
    const negRe = new RegExp(NEGATION_VERB_RE.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = negRe.exec(decisionText)) !== null) {
      negationSpans.push([m.index, m.index + m[0].length, m[2].toLowerCase()]);
    }
    // Second: find all SELECTION matches and exclude ones inside negation spans
    const positiveTerms = new Set<string>();
    const selRe = new RegExp(SELECTION_VERB_RE.source, 'gi');
    while ((m = selRe.exec(decisionText)) !== null) {
      const match = m;
      // Check if this match is contained in a negation span
      const inside = negationSpans.some(([s, e]) => match.index >= s && match.index + match[0].length <= e);
      if (!inside) {
        positiveTerms.add(match[2].toLowerCase());
      }
    }
    // Build terms set
    const terms = new Set<string>();
    for (const t of positiveTerms) terms.add(t);
    for (const [, , term] of negationSpans) terms.add('!' + term);
    return { adrNumber, terms };
  } catch {
    return null;
  }
}

function loadAdrDecisions(adrDir: string): Map<string, Set<string>> {
  const decisions = new Map<string, Set<string>>(); // adrNumber -> Set<term>
  if (!fs.existsSync(adrDir)) return decisions;
  let entries: string[];
  try { entries = fs.readdirSync(adrDir); } catch { return decisions; }
  for (const entry of entries) {
    if (!/^\d{4}-.+\.md$/.test(entry)) continue;
    const adr = parseAdrFile(path.join(adrDir, entry));
    if (adr && adr.terms.size > 0) {
      decisions.set(adr.adrNumber, adr.terms);
    }
  }
  return decisions;
}

function extractSkillOutput(envelope: Record<string, unknown>): string {
  // Try several common fields from PostToolUse tool_response
  // tool_response may be a string or object
  const tr = envelope.tool_response;
  if (typeof tr === 'string') return tr;
  if (tr && typeof tr === 'object') {
    const o = tr as Record<string, unknown>;
    if (typeof o.output === 'string') return o.output;
    if (typeof o.content === 'string') return o.content;
    if (typeof o.text === 'string') return o.text;
  }
  // Direct field
  if (typeof envelope.output === 'string') return envelope.output;
  if (typeof envelope.content === 'string') return envelope.content;
  return '';
}

function detectConflicts(skillOutput: string, adrDecisions: Map<string, Set<string>>): Conflict[] {
  // Extract output terms using two-pass scan: first NEGATION (track spans),
  // then SELECTION (exclude spans inside negation matches).
  const negationSpans: Array<[number, number]> = [];
  const outputNegative = new Set<string>();
  const negRe = new RegExp(NEGATION_VERB_RE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = negRe.exec(skillOutput)) !== null) {
    negationSpans.push([m.index, m.index + m[0].length]);
    outputNegative.add(m[2].toLowerCase());
  }
  const outputPositive = new Set<string>();
  const selRe = new RegExp(SELECTION_VERB_RE.source, 'gi');
  while ((m = selRe.exec(skillOutput)) !== null) {
    const match = m;
    const inside = negationSpans.some(([s, e]) => match.index >= s && match.index + match[0].length <= e);
    if (!inside) {
      outputPositive.add(match[2].toLowerCase());
    }
  }

  // Detect conflicts: conflict = ADR and output DISAGREE on polarity
  const conflicts: Conflict[] = [];
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

defineHook({
  schema: z.object({}).passthrough(),
  failOpen: true,
  handler: ({ tool_name, envelope }) => {
    // Bug 1 fix: tool_name gate. Defense-in-depth: matcher in hooks.json should
    // also be narrowed to (Edit|MultiEdit|Write|Bash), but that file is out of
    // scope. We enforce the narrow allow-list here so Read/Glob/Grep cannot
    // trigger an advisory even if the matcher becomes `.*` again.
    if (!ALLOWED_TOOLS.has(tool_name)) {
      return { kind: 'allow' };
    }

    const skillOutput = extractSkillOutput(envelope as unknown as Record<string, unknown>);
    if (!skillOutput || skillOutput.length < 5) {
      return { kind: 'allow' };
    }

    const projectRoot = process.cwd();
    const adrDir = path.join(projectRoot, 'docs', 'adr');
    const decisions = loadAdrDecisions(adrDir);

    if (decisions.size === 0) {
      return { kind: 'allow' };
    }

    const conflicts = detectConflicts(skillOutput, decisions);
    if (conflicts.length === 0) {
      return { kind: 'allow' };
    }

    // Bug 2 fix: annotation validation. A `> Contradicts ADR-NNNN` annotation
    // only suppresses the advisory for conflicts whose adrNumber equals NNNN.
    // Annotations that cite an unrelated ADR number do NOT suppress — the agent
    // must annotate the actual conflicting ADR by its real number.
    const annotatedAdrNumbers = new Set<string>();
    for (const m of skillOutput.matchAll(CONTRADICTS_ANNOTATION_RE)) {
      annotatedAdrNumbers.add(m[1]);
    }

    // Collect advisory text for each conflict whose ADR lacks a matching
    // annotation. Emitted as a single advisory (exit 0, never blocks).
    const advisories: string[] = [];
    for (const c of conflicts) {
      if (annotatedAdrNumbers.has(c.adrNumber)) continue;
      advisories.push('[context-loop/conflict] Skill output may contradict ADR-' + c.adrNumber +
        ' (' + (c.kind === 'inverse' ? 'ADR prohibits' : 'ADR uses') + ' "' + c.term +
        '"). Required annotation: > Contradicts ADR-' + c.adrNumber +
        ' - but worth reopening because <reason>. No block applied (exit 0).');
    }

    if (advisories.length === 0) {
      return { kind: 'allow' };
    }
    return { kind: 'advisory', message: advisories.join('\n') };
  },
});
