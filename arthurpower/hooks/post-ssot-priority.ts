#!/usr/bin/env node
// post-ssot-priority.ts
// Context closed-loop SSOT priority advisory hook. zero-dep runtime.
// Tool gate: PostToolUse Write/Edit/MultiEdit/Bash (targeting docs/CONTEXT.md,
// docs/CONTEXT-MAP.md, docs/team-glossary.md, docs/<sub-context>/CONTEXT.md).
// Enforces authority precedence: team-glossary > project CONTEXT > sub-context CONTEXT.
// Prevents duplication drift by emitting SSOT_PRIORITY messages.
// 2026-07-13 Dimension B P2 priority (deferred -> implemented in B-2 cycle).
// 2026-07-15 B-2 cycle: case C implemented; self-compare guard; 3-tier priority;
//   output contract migrated to stderr via defineHook exit helpers (SC7).
//
// Behavior:
//  - HARD conflict (Case A/C) -> exit 2 + stderr systemMessage
//      "[POST-FIX WARNING] BLOCKED: ssot-priority - <reason>...."
//  - WARN duplication (Case B) -> exit 0 + stderr systemMessage
//  - Legitimate override (Case D) / project-only / sub-context silent / team-self -> exit 0 silent
//  - All errors -> fail-open exit 0 (defineHook runtime writes [defineHook FATAL] to stderr)
//
// IMPORTANT: hook runs PostToolUse, i.e. the file is already on disk when we
// run. exit 2 cannot roll the write back. The operator-facing message tells
// them to revert and consult domain-modeling, otherwise the bad state silently
// stays.

import fs, { type Dirent } from 'node:fs';
import path from 'node:path';
import { z } from './runtime/tiny-schema.ts';
import { defineHook, type HookResult } from './runtime/defineHook.ts';

const TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'Bash']);

// Top-level docs/CONTEXT(MAP|team-glossary).md  OR  docs/<sub-context>/CONTEXT.md
// Sub-context detection: docs/<dir-name>/CONTEXT.md where <dir-name> is NOT
// "CONTEXT-MAP.md" or "team-glossary.md". This lets us scan every CONTEXT.md
// under docs/ in the 3-tier phase without listing a fixed whitelist.
const PROJECT_LEVEL_RE = /(^|[/\\])docs[/\\](CONTEXT\.md|CONTEXT-MAP\.md|team-glossary\.md)$/i;
const SUB_CONTEXT_RE = /(^|[/\\])docs[/\\]([^/\\]+)[/\\]CONTEXT\.md$/i;

const TARGET = String.raw`["']?(?:[./\\])?docs[/\\](?:CONTEXT\.md|CONTEXT-MAP\.md|team-glossary\.md)["']?`;
const SEP = String.raw`(?:^|[\s;&|(])`;

const BASH_REDIRECT_RE = new RegExp(SEP + String.raw`[^|;&]*?>>?\s*` + TARGET, 'i');
const BASH_KEYWORD_RE = new RegExp(
  SEP + String.raw`(?:rm(?:\s+-\w+)?|rmdir|tee|cp|mv)\s+(?:[^|;&]*?\s+)?` + TARGET + String.raw`(?:\s|$|[|;&)])`,
  'i'
);
const BASH_SED_RE = new RegExp(
  SEP + String.raw`sed\s+(?:-i\s+)?[^|;&]*?` + TARGET + String.raw`(?:\s|$|[|;&)])`,
  'i'
);

const TERM_LINE_RE = /^\*\*([^*]+?)\*\*\s*:\s*(.+)$/;
const OVERRIDE_RE = /<!--\s*project-override\s*:[^>]*-->/i;
const LANG_SECTION_RE = /^##\s+Language\b/m;

function detectBashTarget(command: string): string | null {
  if (!command) return null;
  for (const re of [BASH_REDIRECT_RE, BASH_KEYWORD_RE, BASH_SED_RE]) {
    const m = re.exec(command);
    if (m) {
      const matched = m[0];
      const idx = matched.search(/docs[/\\]/);
      if (idx >= 0) {
        const slice = matched.slice(idx).replace(/^["'\s]+|["'\s;,|&)]+$/g, '');
        if (/^docs[/\\](CONTEXT\.md|CONTEXT-MAP\.md|team-glossary\.md)/i.test(slice)) {
          return slice;
        }
      }
    }
  }
  return null;
}

// HARD block: PostToolUse runs AFTER the file is on disk, so exit 2 cannot
// unwrite the file. The operator-facing message keeps the original
// "[POST-FIX WARNING] BLOCKED: ssot-priority" framing plus the full revert
// instruction so the operator's UI surfaces a loud manual revert instruction.
// defineHook's exitBlock writes it to stderr + exit 2 (SC7).
function hardConflict(reason: string, conflictingTerms: string[]): HookResult {
  const detail = (conflictingTerms && conflictingTerms.length)
    ? ' Conflicting terms: ' + conflictingTerms.join(', ') + '.'
    : '';
  const msg =
    '[POST-FIX WARNING] ssot-priority - ' + reason + '.' + detail +
    ' The file is already on disk and cannot be rolled back automatically.' +
    ' 走 domain-modeling skill 落盘 (revert the file yourself first, then' +
    ' route the term through team-glossary or add <!-- project-override: reason --> marker).';
  return { kind: 'block', message: msg };
}

interface TermEntry {
  def: string;
  override: boolean;
}

function extractTerms(content: string): Map<string, TermEntry> {
  // Returns Map<term, {def, override}>
  const terms = new Map<string, TermEntry>();
  if (!content) return terms;
  const langMatch = content.match(LANG_SECTION_RE);
  if (!langMatch) return terms;
  const startIdx = (langMatch.index ?? 0) + langMatch[0].length;
  const rest = content.slice(startIdx);
  const endMatch = rest.match(/^##\s/m);
  const section = endMatch ? rest.slice(0, endMatch.index ?? rest.length) : rest;
  const lines = section.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(TERM_LINE_RE);
    if (!m) continue;
    const term = m[1].trim();
    let def = m[2].trim();
    if (def.endsWith('.')) def = def.slice(0, -1).trim();
    const overrideMatch = trimmed.match(OVERRIDE_RE);
    const hasOverride = !!overrideMatch;
    terms.set(term, { def, override: hasOverride });
  }
  return terms;
}

function readTargetContent(cwd: string, targetPath: string): string | null {
  try {
    return fs.readFileSync(path.join(cwd, targetPath), 'utf8');
  } catch {
    return null;
  }
}

function readTeamGlossary(cwd: string): string | null {
  return readTargetContent(cwd, 'docs/team-glossary.md');
}

function normalize(s: string): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizePath(p: string): string {
  if (!p) return '';
  return path.resolve(p).replace(/\\/g, '/');
}

// Walk docs/<dir>/CONTEXT.md for every subdir under docs/. Returns array of
// "docs/<dir>/CONTEXT.md" relative paths (NOT "docs/CONTEXT.md" itself).
function listSubContextFiles(cwd: string): string[] {
  const docsDir = path.join(cwd, 'docs');
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = fs.readdirSync(docsDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const rel = 'docs/' + e.name + '/CONTEXT.md';
    try {
      const stat = fs.statSync(path.join(cwd, rel));
      if (stat.isFile()) out.push(rel);
    } catch {
      // skip
    }
  }
  return out;
}

const schema = z.object({
  file_path: z.string().optional(),
  command: z.string().optional(),
  cmd: z.string().optional(),
}).passthrough();

defineHook({
  schema,
  failOpen: true,
  handler: ({ tool_name, tool_input }) => {
    if (!TOOLS.has(tool_name)) {
      return { kind: 'allow' };
    }

    // Resolve target path
    let targetPath = '';
    if (tool_name === 'Bash') {
      const command = (tool_input.command ?? tool_input.cmd ?? '');
      targetPath = detectBashTarget(command) ?? '';
    } else {
      targetPath = tool_input.file_path ?? '';
    }

    // Gate on docs/CONTEXT*.md OR docs/team-glossary.md OR docs/<sub-context>/CONTEXT.md.
    if (!targetPath) {
      return { kind: 'allow' };
    }
    const isProjectLevel = PROJECT_LEVEL_RE.test(targetPath);
    const isSubContext = SUB_CONTEXT_RE.test(targetPath);
    if (!isProjectLevel && !isSubContext) {
      return { kind: 'allow' };
    }

    const projectRoot = process.cwd();

    // Read team-glossary (top of SSOT pyramid).
    const teamContent = readTeamGlossary(projectRoot);
    const teamTerms = teamContent ? extractTerms(teamContent) : new Map<string, TermEntry>();

    // Read the target file's actual current content.
    const targetContent = readTargetContent(projectRoot, targetPath);
    const targetTerms = targetContent ? extractTerms(targetContent) : new Map<string, TermEntry>();

    // If neither has terms, nothing to check.
    if (teamTerms.size === 0 && targetTerms.size === 0) {
      return { kind: 'allow' };
    }

    const teamPathAbs = normalizePath(path.join(projectRoot, 'docs/team-glossary.md'));
    const targetPathAbs = normalizePath(path.join(projectRoot, targetPath));

    // Self-compare guard: if the operator is editing the team-glossary itself,
    // every term it shares with itself would otherwise be reported as
    // "duplicated". Skip self-comparison entirely.
    const isEditingTeamGlossary = teamPathAbs === targetPathAbs;

    const messages: string[] = [];

    // Pass 1: every term that appears in the TARGET file -> check against
    // team-glossary (top authority) and, if needed, against project CONTEXT.md
    // (when target is a sub-context, project CONTEXT is the next-tier authority).
    //
    // 3-tier precedence:
    //    team-glossary > docs/CONTEXT.md (project) > docs/<sub>/CONTEXT.md
    //
    // For each term t in target:
    //   - If t is in team-glossary with a different def and target has no
    //     override marker => HARD block (team beats everything).
    //   - If t is in team-glossary with same def and no override =>
    //     SSOT_PRIORITY duplication advisory.
    //   - Otherwise, if target is a SUB-context, and t is in project
    //     docs/CONTEXT.md with a different def and no override =>
    //     HARD block (project beats sub-context).
    //   - Same def => SSOT_PRIORITY advisory.
    //   - Legitimate override marker => silent.
    //   - Project-only term being newly authored in sub-context =>
    //     SSOT_PRIORITY advisory (not block; promote via override or new term).
    for (const [term, targetEntry] of targetTerms) {
      const targetDef = normalize(targetEntry.def);
      const override = !!targetEntry.override;

      // --- vs team-glossary (always) ---
      if (!isEditingTeamGlossary) {
        const teamEntry = teamTerms.get(term);
        if (teamEntry) {
          const teamDef = normalize(teamEntry.def);
          if (targetDef !== teamDef && !override) {
            return hardConflict(
              'term "' + term + '" is defined differently in docs/team-glossary.md' +
              ' (team authority) and ' + targetPath + '. ' +
              'Team glossary wins. Add <!-- project-override: reason --> marker or update team-glossary first.',
              [term]
            );
          } else if (targetDef === teamDef && !override) {
            messages.push(
              'SSOT_PRIORITY: term "' + term + '" duplicated in docs/team-glossary.md and ' +
              targetPath + ' with identical definitions. To prevent duplication drift, use _TeamRef_ line.'
            );
          }
        }
      }

      // --- vs project CONTEXT.md (only when target is a SUB-context) ---
      if (isSubContext) {
        const projectContent = readTargetContent(projectRoot, 'docs/CONTEXT.md');
        const projectTerms = projectContent ? extractTerms(projectContent) : new Map<string, TermEntry>();
        const projectEntry = projectTerms.get(term);
        if (projectEntry) {
          const projectDef = normalize(projectEntry.def);
          if (projectDef !== targetDef && !override) {
            return hardConflict(
              'term "' + term + '" is defined differently in docs/CONTEXT.md (project authority)' +
              ' and ' + targetPath + ' (sub-context). ' +
              'Project CONTEXT.md wins. Add <!-- project-override: reason --> marker or update project CONTEXT.md first.',
              [term]
            );
          } else if (projectDef === targetDef && !override) {
            messages.push(
              'SSOT_PRIORITY: term "' + term + '" duplicated in docs/CONTEXT.md (project)' +
              ' and ' + targetPath + ' (sub-context) with identical definitions. ' +
              'To prevent drift, reference via _ProjectRef_ line.'
            );
          }
        }
      }
    }

    // Pass 2 (Case C / reverse semantic): terms defined in team-glossary but
    // missing from the edited file are fine (silent). Terms defined in the
    // project CONTEXT.md but missing from the edited sub-context file are
    // also fine (project is being newly authored, no conflict). The team's
    // existence is informational; no block.
    //
    // Pass 3 (Case C implementation): scan every OTHER sub-context under docs/
    // for term conflicts with the edited sub-context. If two sub-contexts
    // disagree on the same term without override markers, that is an
    // intra-docs conflict -> HARD block on the freshly-written file (since
    // it is the file under edit and cannot be auto-resolved).
    if (isSubContext) {
      const allSubContexts = listSubContextFiles(projectRoot);
      const myDirName = (() => {
        const m = targetPath.match(SUB_CONTEXT_RE);
        return m ? m[2].toLowerCase() : '';
      })();
      for (const rel of allSubContexts) {
        // Skip self.
        if (normalizePath(path.join(projectRoot, rel)) === targetPathAbs) continue;
        const otherMatch = rel.match(SUB_CONTEXT_RE);
        const otherDirName = otherMatch ? (otherMatch[2] ?? '') : '';
        if (!otherDirName || otherDirName.toLowerCase() === myDirName) continue;
        const otherContent = readTargetContent(projectRoot, rel);
        const otherTerms = otherContent ? extractTerms(otherContent) : new Map<string, TermEntry>();
        for (const [term, targetEntry] of targetTerms) {
          if (targetEntry.override) continue; // legitimate override marker
          const otherEntry = otherTerms.get(term);
          if (!otherEntry) continue;
          const otherDef = normalize(otherEntry.def);
          const targetDef = normalize(targetEntry.def);
          if (otherDef === targetDef) {
            // Same definition in two sub-contexts -> SSOT_PRIORITY duplication
            // (advisory, not block: each sub-context may legitimately re-state).
            messages.push(
              'SSOT_PRIORITY: term "' + term + '" duplicated in ' + rel +
              ' and ' + targetPath + ' with identical definitions. ' +
              'Consider promoting to a parent CONTEXT or docs/team-glossary.md.'
            );
          } else {
            // Different definition in two sub-contexts -> hard block.
            return hardConflict(
              'term "' + term + '" is defined differently in sibling sub-contexts ' +
              rel + ' and ' + targetPath + ' with no override markers. ' +
              'Sub-contexts must align. Reconcile via domain-modeling skill.',
              [term]
            );
          }
        }
      }
    }

    // Emit WARN advisories (if any).
    if (messages.length > 0) {
      return { kind: 'advisory', message: messages.join('\n') };
    }

    return { kind: 'allow' };
  },
});