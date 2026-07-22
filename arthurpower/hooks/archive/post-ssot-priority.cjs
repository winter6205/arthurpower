#!/usr/bin/env node
'use strict';
// post-ssot-priority.cjs
// Context closed-loop SSOT priority advisory hook. Zero-dep Node CJS.
// Tool gate: PostToolUse Write/Edit/MultiEdit/Bash (targeting docs/CONTEXT.md,
// docs/CONTEXT-MAP.md, docs/team-glossary.md, docs/<sub-context>/CONTEXT.md).
// Enforces authority precedence: team-glossary > project CONTEXT > sub-context CONTEXT.
// Prevents duplication drift by emitting SSOT_PRIORITY messages.
// 2026-07-13 Dimension B P2 priority (deferred -> implemented in B-2 cycle).
// 2026-07-15 B-2 cycle: case C implemented; self-compare guard; 3-tier priority;
//   output contract switched to stderr + [POST-FIX WARNING] prefix.
//
// Behavior:
//  - HARD conflict (Case A/C) -> exit 2 + stderr systemMessage
//      "BLOCKED: ssot-priority - <reason>. 走 domain-modeling skill 落盘"
//  - WARN duplication (Case B) -> exit 0 + systemMessage (stdout)
//  - Legitimate override (Case D) / project-only / sub-context silent / team-self -> exit 0 silent
//  - All errors -> fail-open exit 0 + daemon.log line
//
// IMPORTANT: hook runs PostToolUse, i.e. the file is already on disk when we
// run. exit 2 cannot roll the write back. We MUST tell the operator explicitly
// to revert and consult domain-modeling, otherwise the bad state silently stays.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

let readStdin;
try {
  readStdin = require('./lib/read-stdin-with-timeout.cjs').readStdin;
} catch (_) {
  // Fallback: duplicated so the file still loads if the lib is missing.
  readStdin = function readStdinFallback() {
    return new Promise((resolve) => {
      let buf = '';
      const finish = () => resolve(buf);
      try {
        process.stdin.setEncoding('utf8');
      } catch (_) {
        finish();
        return;
      }
      process.stdin.on('data', (c) => { buf += c; });
      process.stdin.on('end', finish);
      process.stdin.on('error', finish);
      setTimeout(finish, 1000);
    });
  };
}

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

function detectBashTarget(command) {
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

function logFatal(err) {
  const msg = '[post-ssot-priority.cjs FATAL] ' +
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
      '[' + new Date().toISOString() + '] [post-ssot-priority.cjs] ' + msg + '\n', 'utf8');
  } catch (_) {}
}

// Output contract:
//  PostToolUse runs AFTER the file is on disk, so exit 2 cannot unwrite the
//  file. hardConflict() writes the advisory to STDERR with a loud
//  "[POST-FIX WARNING]" prefix so the operator's UI surfaces a manual
//  revert instruction. The "BLOCKED:" wording is intentional: humans and
//  downstream hooks treat it the same as PreToolUse hooks.
function hardConflict(reason, conflictingTerms) {
  const detail = (conflictingTerms && conflictingTerms.length)
    ? ' Conflicting terms: ' + conflictingTerms.join(', ') + '.'
    : '';
  const msg =
    '[POST-FIX WARNING] BLOCKED: ssot-priority - ' + reason + '.' + detail +
    ' The file is already on disk and cannot be rolled back automatically.' +
    ' 走 domain-modeling skill 落盘 (revert the file yourself first, then' +
    ' route the term through team-glossary or add <!-- project-override: reason --> marker).';
  process.stderr.write(JSON.stringify({ systemMessage: msg }) + '\n');
  process.exit(2);
}

function advisory(message) {
  // PostToolUse advisory: stdout is fine (file already written, no revert).
  console.log(JSON.stringify({ systemMessage: message }));
}

function extractTerms(content) {
  // Returns Map<term, {def, override}>
  const terms = new Map();
  if (!content) return terms;
  const langMatch = content.match(LANG_SECTION_RE);
  if (!langMatch) return terms;
  const startIdx = langMatch.index + langMatch[0].length;
  const rest = content.slice(startIdx);
  const endMatch = rest.match(/^##\s/m);
  const section = endMatch ? rest.slice(0, endMatch.index) : rest;
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
    terms.set(term, { def: def, override: hasOverride });
  }
  return terms;
}

function readTargetContent(cwd, targetPath) {
  try {
    return fs.readFileSync(path.join(cwd, targetPath), 'utf8');
  } catch (_) {
    return null;
  }
}

function readTeamGlossary(cwd) {
  return readTargetContent(cwd, 'docs/team-glossary.md');
}

function normalize(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizePath(p) {
  if (!p) return '';
  return path.resolve(p).replace(/\\/g, '/');
}

// Walk docs/<dir>/CONTEXT.md for every subdir under docs/. Returns array of
// "docs/<dir>/CONTEXT.md" relative paths (NOT "docs/CONTEXT.md" itself).
function listSubContextFiles(cwd) {
  const docsDir = path.join(cwd, 'docs');
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(docsDir, { withFileTypes: true });
  } catch (_) {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const rel = 'docs/' + e.name + '/CONTEXT.md';
    try {
      const stat = fs.statSync(path.join(cwd, rel));
      if (stat.isFile()) out.push(rel);
    } catch (_) {}
  }
  return out;
}

(async function main() {
  const raw = await readStdin();
  let toolName = '';
  let toolInput = {};

  try {
    const input = JSON.parse(raw || '{}');
    toolName = (input && input.tool_name) || '';
    toolInput = (input && input.tool_input) || {};
  } catch (_) {
    process.exit(0);
  }

  if (!TOOLS.has(toolName)) {
    process.exit(0);
  }

  // Resolve target path
  let targetPath = '';
  if (toolName === 'Bash') {
    const command = (toolInput && (toolInput.command || toolInput.cmd)) || '';
    targetPath = detectBashTarget(command) || '';
  } else {
    targetPath = (toolInput && toolInput.file_path) || '';
  }

  // Gate on docs/CONTEXT*.md OR docs/team-glossary.md OR docs/<sub-context>/CONTEXT.md.
  if (!targetPath) {
    process.exit(0);
  }
  const isProjectLevel = PROJECT_LEVEL_RE.test(targetPath);
  const isSubContext = SUB_CONTEXT_RE.test(targetPath);
  if (!isProjectLevel && !isSubContext) {
    process.exit(0);
  }

  const projectRoot = process.cwd();

  // Read team-glossary (top of SSOT pyramid).
  const teamContent = readTeamGlossary(projectRoot);
  const teamTerms = teamContent ? extractTerms(teamContent) : new Map();

  // Read the target file's actual current content.
  const targetContent = readTargetContent(projectRoot, targetPath);
  const targetTerms = targetContent ? extractTerms(targetContent) : new Map();

  // If neither has terms, nothing to check.
  if (teamTerms.size === 0 && targetTerms.size === 0) {
    process.exit(0);
  }

  const teamPathAbs = normalizePath(path.join(projectRoot, 'docs/team-glossary.md'));
  const targetPathAbs = normalizePath(path.join(projectRoot, targetPath));

  // Self-compare guard: if the operator is editing the team-glossary itself,
  // every term it shares with itself would otherwise be reported as
  // "duplicated". Skip self-comparison entirely.
  const isEditingTeamGlossary = teamPathAbs === targetPathAbs;

  const messages = [];
  const conflictingTerms = [];

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
          conflictingTerms.push(term);
          hardConflict(
            'term "' + term + '" is defined differently in docs/team-glossary.md' +
            ' (team authority) and ' + targetPath + '. ' +
            'Team glossary wins. Add <!-- project-override: reason --> marker or update team-glossary first.',
            [term]
          );
          // unreachable
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
      const projectTerms = projectContent ? extractTerms(projectContent) : new Map();
      const projectEntry = projectTerms.get(term);
      if (projectEntry) {
        const projectDef = normalize(projectEntry.def);
        if (projectDef !== targetDef && !override) {
          conflictingTerms.push(term);
          hardConflict(
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
    const myRel = targetPath.replace(/^docs[\\/]/, '').replace(/[\\/]CONTEXT\.md$/, '').toLowerCase();
    const myDirName = (() => {
      const m = targetPath.match(SUB_CONTEXT_RE);
      return m ? m[2].toLowerCase() : '';
    })();
    for (const rel of allSubContexts) {
      // Skip self.
      if (normalizePath(path.join(projectRoot, rel)) === targetPathAbs) continue;
      const otherDirName = (rel.match(SUB_CONTEXT_RE) || [])[2] || '';
      if (!otherDirName || otherDirName.toLowerCase() === myDirName) continue;
      const otherContent = readTargetContent(projectRoot, rel);
      const otherTerms = otherContent ? extractTerms(otherContent) : new Map();
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
          conflictingTerms.push(term);
          hardConflict(
            'term "' + term + '" is defined differently in sibling sub-contexts ' +
            rel + ' and ' + targetPath + ' with no override markers. ' +
            'Sub-contexts must align. Reconcile via domain-modeling skill.',
            [term]
          );
          // unreachable
        }
      }
    }
  }

  // Emit WARN advisories (if any).
  if (messages.length > 0) {
    advisory(messages.join('\n'));
  }

  process.exit(0);
})().catch((err) => {
  logFatal(err);
  process.exit(0);
});
