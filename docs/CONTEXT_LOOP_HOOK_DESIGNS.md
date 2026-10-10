# Context Closed-Loop Hook Designs (C/D/E/F) - Subagent Synthesis

This document captures the design essence of 4 advisory hooks deferred from Dimension B Round 2.
Each design was produced by a parallel subagent and reviewed for implementation feasibility.

## D_stale_read Hook (subagent complete)

### Trigger
PreToolUse Write/Edit/MultiEdit/Bash, restricted to business-code paths (src/, lib/, app/, components/, services/, .py/.js/.ts/.tsx/.vue production source).
Excluded: docs/, tests/, __tests__/, *.md-only, .claude/, archive/, build artifacts.

### Detection logic
1. Read session-state file `~/.claude/hooks/state/stale-read-state.json`
2. Get current `fs.statSync(docs/CONTEXT.md).mtimeMs`
3. Compare vs recorded `readMtime` for this project root
4. If current > recorded -> stale -> emit advisory `systemMessage` (exit 0)

### State schema (per project, keyed by project root)
```json
{
  "<workspace>/projects/<local-project>": {
    "contextPath": "docs/CONTEXT.md",
    "readMtime": 1720875600123,
    "readAt": "2026-07-13T09:00:00.123Z",
    "termHashVersion": "v1"
  }
}
```

### Atomic write strategy (mirror token-counter pattern)
1. Read original state to memory
2. Update project record in memory
3. Write temp file `stale-read-state.json.tmp.<pid>`
4. `fs.renameSync(tmp, target)` (Windows: delete dest first if EEXIST)
5. Fail-open on any error; no Node lock lib (zero-dep)

### Failure modes
| Scenario | Handling |
|----------|----------|
| state file corrupted/JSON parse fail | fail-open exit 0 + daemon.log warning |
| mtime missing (FS error) | fail-open exit 0 |
| first write, never read CONTEXT.md | no project record -> fail-open silent |
| project has no CONTEXT.md | fail-open |
| concurrent read/write state | atomic rename reduces race; advisory tolerates stale reads |
| platform mtime precision diff | Windows NTFS ms, FAT s; use 10ms tolerance or `>=` compare |

### 5 test cases
| # | Scenario | Input | Expected |
|---|----------|-------|----------|
| 1 | read then modified, write src/foo.ts | state readMtime=100, current=200 | exit 0 + advisory systemMessage |
| 2 | read, not modified, write src/foo.ts | readMtime=200, current=200 | exit 0, no systemMessage |
| 3 | never read, write src/foo.ts | no project record | exit 0, no systemMessage |
| 4 | write docs/CONTEXT.md or tests/foo.test.ts | path matches excluded set | exit 0, no check |
| 5 | state file corrupted | JSON parse fail | exit 0 + daemon.log line |

### Risks
- **False positive**: mtime changes from git checkout / IDE auto-save without content change. Mitigation: optional `termHashVersion` content-hash compare; default mtime, upgrade later.
- **Performance**: every write tool `statSync`. Mitigation: only business-code writes; state read once per process.
- **Cross-platform mtime**: Windows vs Linux precision. Use tolerance or second-truncate.
- **Advisory ignored**: `systemMessage` non-blocking. Mitigation: lifecycle router can count advisories per session, escalate to block above threshold.

### Relationship with existing guards
- `pre-context-write-guard.cjs`: write authority + schema (exit 2 block)
- `pre-context-stale-read.cjs` (this): read-side freshness advisory (exit 0)
- `lifecycle-hook.cjs`: updates state file after skill reads CONTEXT.md
- `domain-modeling`: sole write authority; mtime change triggers downstream stale advisory


## E_conflict_annotation Hook (subagent complete)

### Trigger
PostToolUse (after skill produces output).
Restricted to: tool returns that contain assistant text output (skill natural-language reply).
Skipped for: plain file Read/Write/Bash (non-skill), user input, pure error stacks.

### Detection algorithm

**ADR parsing**:
- Read `docs/adr/*.md`
- Extract ADR-NNNN (from filename or first line), Decision section text, Status
- Only process Accepted / Proposed; ignore Superseded / Deprecated

**Skill output scan**:
- Scan last N=5 assistant messages
- Detect explicit selection phrases: `we will use X`, `migrate to X`, `switch to X`, `adopt X`, `use X`
- Detect inverse: `do not use Y`, `avoid Y`, `deprecate Y`

**Conflict rule**:
- If ADR Decision has `use Y` and skill output has `use X`, and X/Y are same-class mutually-exclusive tech (DB, framework, language) -> conflict
- If output already has `> Contradicts ADR-NNNN` -> skip (explicit override)
- Otherwise no conflict

**Conservative design** (no deep semantic inference):
- No perf/cost/security hidden-impact inference
- No synonym/abbreviation/vendor-diff handling
- No "consider X" / "POC X" / "evaluate X" (not yet decisions)

### State management

**ADR Decision cache**:
```json
{
  "lastScan": "2026-07-13T10:00:00Z",
  "adrDir": "docs/adr",
  "decisions": {
    "ADR-0001": {"slug": "choose-mysql", "decision": "use MySQL ...", "status": "Accepted"}
  }
}
```
**Invalidation**: startup compares all `docs/adr/*.md` mtimes; any newer than `lastScan` triggers full rescan.

**Runtime context**: hook gets last N messages via env var or stdin payload; does not persist skill output.

**Config** (settings.json hooks config):
- `adrDir`: default `docs/adr`
- `lookbackMessages`: default 5
- `exitCode`: fixed 0 (advisory)

### 5 test cases
| # | ADR Decision | Skill output | Advisory? | Reason |
|---|--------------|--------------|-----------|--------|
| TC-1 | `use MySQL` | `we will use PostgreSQL` | yes | explicit tech-selection conflict |
| TC-2 | Context mentions MySQL, Decision empty | `we will use PostgreSQL` | no | constraint only in Decision |
| TC-3 | `use Vue` | `use React\n\n> Contradicts ADR-0002 - but worth reopening because ...` | no | already annotated |
| TC-4 | `use REST` | `evaluated GraphQL and REST, both possible` | no | no decision formed |
| TC-5 | `do not use microservices` | `migrate to microservices` | yes | inverse explicit conflict |

### Risks
| Risk | Mitigation |
|------|-----------|
| False positive (co-existable tech flagged) | only match strong verbs use/adopt/migrate; ignore evaluate/comparison/POC |
| Semantic ambiguity ("use X" = dev tool, not prod) | rough file-path/context classification; or require ADR Decision tech-noun tagged |
| Performance (many ADRs, long convo) | cache ADR Decisions; limit lookback messages; async |
| Miss (deep semantic contradiction) | advisory layer; complex conflicts need human review |
| Annotation fatigue (frequent advisories) | exit 0 non-blocking; collect FP samples then tighten rules |

### Output format
```
[context-loop/conflict] Skill output may contradict ADR-0001 (use MySQL).
Required annotation: > Contradicts ADR-0001 - but worth reopening because <reason>.
No block applied (exit 0).
```


## F_read_contract Hook (subagent complete)

### Trigger
PreToolUse Write/Edit/MultiEdit/NotebookEdit/Bash, restricted to writes targeting `src/` paths.
Bash matcher: reuse pre-context-write-guard.cjs 3-regex style for `>`, `>>`, `cp`, `mv`, `tee`, `sed -i` with target under `src/`.

**Excluded paths**: tests/, docs/, archive/ (even if path also contains `src/`).
**Direction**: advisory (exit 0 + systemMessage), never block.

### State file structure (per session)
Path: `~/.claude/.locks/.read-contract-state/<session_id>.json`
```json
{
  "session_id": "abc123",
  "project_root": "<workspace>/projects/<local-project>",
  "read_paths": [
    {"path": "docs/CONTEXT.md", "mtime": 1750000000000},
    {"path": "docs/agents/context-contract.md", "mtime": 1750000001000}
  ],
  "last_checked": 1750000005000
}
```
- `read_paths`: paths read via Read tool this session that exist in project
- `mtime`: file current mtime (for stale-read hook D cooperation)
- `last_checked`: last time this hook fired; avoids spam
- Session end or 24h expiry: SessionEnd hook or periodic cleanup deletes

### Detection logic
1. Write target identification: Write/Edit/MultiEdit/NotebookEdit -> `file_path`/`notebook_path`; Bash -> 3-regex src/ write
2. Judgment:
   ```
   if project root has docs/CONTEXT.md
      AND write target is under src/
      AND this session has NOT read docs/CONTEXT.md
   then emit advisory systemMessage
   else exit 0
   ```
3. State update: PostToolUse Read hook appends to `read_paths`. Does not rely on agent self-report.

### Cooperation with stale-read hook (D)
| Responsibility | F_read_contract | D_stale_read |
|----------------|-----------------|--------------|
| Trigger | before first src/ write | after reading context file, before later writes |
| Detects | "have I read CONTEXT.md?" | "has CONTEXT.md changed since I read it?" |
| State consumed | `read_paths[].path` | `read_paths[].mtime` vs current mtime |
| Behavior | advisory to go read | advisory content may be stale |
| Interaction | produces `read_paths` for D | depends on F's state file |

### 5 test cases
| # | Scenario | Has CONTEXT.md? | Read? | Write target | Expected |
|---|----------|-----------------|-------|--------------|----------|
| 1 | first write src/index.ts | yes | no | src/index.ts | advisory "consider reading docs/CONTEXT.md" |
| 2 | after read, write src/utils.ts | yes | yes | src/utils.ts | exit 0, no message |
| 3 | write tests/unit/foo.test.ts | yes | no | tests/unit/foo.test.ts | exit 0, no trigger |
| 4 | no CONTEXT.md, write src/x.py | no | - | src/x.py | exit 0, graceful absence |
| 5 | Bash `cp template.ts src/new.ts` | yes | no | src/new.ts | hits Bash regex, advisory |

### Risks
| Risk | Mitigation |
|------|-----------|
| False positive (skill writes src via MCP tool without src/ path) | only check tools with explicit src/ path; complex cases defer to lifecycle router |
| First-time code write before read (frequent) | advisory non-blocking; `last_checked` rate-limits same-session repeats |
| Multi-project session cwd switch | state file keyed by `session_id` + records `project_root`; per-project isolation |
| Bash path ambiguity (`cp src/a ../other/src/b`) | only trigger when target arg is under src/ |
| Overlap with lifecycle router | F is lightweight detection, not router replacement; output as advisory to augment context |

### settings.json config draft
```json
{
  "PreToolUse": [{
    "matcher": "Write|Edit|MultiEdit|NotebookEdit|Bash",
    "hooks": [{
      "type": "command",
      "command": "node C:/Users/<user>/.claude/hooks/pre-read-contract.cjs",
      "timeout": 5
    }]
  }]
}
```


## C_ssot_priority Hook (subagent complete)

### Trigger
PostToolUse (after the guarded write succeeds, reads new file state from disk).
Tool coverage: Write, Edit, MultiEdit, Bash (via redirect/keyword/sed regexes, same as pre-context-write-guard).

### Why PostToolUse not PreToolUse
- Existing pre-context-write-guard already blocks unauthorized writes + schema at PreToolUse
- Semantic precedence can only be evaluated against NEW file state on disk
- PreToolUse sees only tool input fragment; cannot resolve full glossary after Edit/MultiEdit
- PostToolUse reads both team-glossary.md and CONTEXT.md/CONTEXT-MAP.md from disk, compares normalized term sets
- Preserves existing authority gate as hard blocker; C_ssot_priority is semantic linter

### Term extraction
File scope:
- `docs/team-glossary.md` (org-wide source of truth)
- `docs/CONTEXT.md` (project-level override)
- `docs/CONTEXT-MAP.md` (pointer file; validate terms declared inside; sub-context files second pass)

Term definition: line in `## Language` section matching `**Term**: definition.`
Algorithm:
1. Read file from disk
2. Locate first `## Language` heading
3. Stop at next `##` or EOF
4. For each line, match `^\*\*([^*]+?)\*\*\s*:\s*(.+)$`
5. Normalize: trim, collapse whitespace, case-insensitive compare (preserve original casing for messages)
6. Strip trailing period for comparison only

**Definition comparison**: equivalent if identical after normalization; conflicting if terms match but definitions differ.
**Override marker**: `**Term**: definition. <!-- project-override: reason -->` exempts from duplication-drift warning.

### Conflict classes
| Case | Condition | Action | Severity |
|------|-----------|--------|----------|
| A team/project conflict | term in both, different defs, no override marker | auto-append `_TeamRef_` or block, ask domain-modeling | HARD |
| B silent duplication | term in both, identical defs, no marker | warn: remove from CONTEXT, use `_TeamRef_` | WARN |
| C unauthorized project redefinition | term only in team-glossary, CONTEXT redefines without acknowledgment | block: require `_TeamRef_` or `project-override` | HARD |
| D legitimate project override | term in both, different defs, CONTEXT has `<!-- project-override -->` | allow | OK |
| E project-only term | term only in CONTEXT | allow | OK |

### `_TeamRef_` line format
```markdown
- `_TeamRef_`: see `docs/team-glossary.md#Term` for canonical definition.
```
Placed immediately after `**Term**: ...` line, or standalone in `## Language` if term removed from project scope.

### Relationship with existing guard
| Guard | Phase | Responsibility |
|-------|-------|----------------|
| pre-context-write-guard.cjs | PreToolUse | write authority, schema, ADR uniqueness |
| C_ssot_priority | PostToolUse | SSOT precedence, term drift, override annotation |

Pre-context-write-guard runs first, exit 2 on unauthorized/malformed. If pass, tool writes. C_ssot_priority runs after, reads both files, term-level cross-file analysis. Does NOT auto-rewrite; emits `systemMessage` with remediation. If HARD conflict, may exit 2 to force domain-modeling resolution.

### Failure messages
**HARD - team/project conflict without override**:
```
SSOT_PRIORITY: term "Account" is defined in both docs/team-glossary.md and docs/CONTEXT.md with different meanings.
Project-level override must be explicit. Add one of:
  1. A project-override annotation: **Account**: ... <!-- project-override: billing uses net-30 semantics -->
  2. A _TeamRef_ line and remove the local definition:
     **Account**: _TeamRef_ see docs/team-glossary.md#Account
Blocked until resolved via domain-modeling skill.
```

**WARN - silent duplication**:
```
SSOT_PRIORITY: term "Customer" is duplicated in docs/team-glossary.md and docs/CONTEXT.md with identical definitions.
To prevent duplication drift, replace the CONTEXT.md entry with:
  **Customer**: _TeamRef_ see docs/team-glossary.md#Customer
```

### 5 test cases
| # | team-glossary | CONTEXT before write | Action | Expected |
|---|---------------|---------------------|--------|----------|
| 1 | `**Customer**: A person...purchases.` | `**Customer**: A person...purchases.` | domain-modeling edits CONTEXT | WARN, suggest `_TeamRef_` |
| 2 | `**Account**: financial record.` | `**Account**: user credential.` (no marker) | domain-modeling writes CONTEXT | HARD conflict, exit 2 |
| 3 | `**Account**: financial record.` | `**Account**: user cred. <!-- project-override: auth -->` | domain-modeling writes CONTEXT | OK, no message |
| 4 | `**Tenant**: isolated instance.` | `**Tenant**: db schema namespace.` (no marker) | domain-modeling writes CONTEXT | HARD conflict, exit 2 |
| 5 | (no ScreeningSession) | `**ScreeningSession**: single movie showing.` | domain-modeling writes CONTEXT | OK, no message |

### Risk assessment
| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| FP on near-identical defs with minor wording | Medium | normalize whitespace+ punctuation; require exact normalized equality before flag; override annotation suppresses |
| FP on polysemous terms intentionally split | Low | project-override annotation is escape hatch |
| Race between parallel writes to both files | Low | PostToolUse reads disk after each; second write sees updated state |
| Performance cost reading 2 files per Write/Edit | Low | SSOT files small (<=300 lines per S5 anti-drift); O(n) read |
| Hook failure blocks legit work | Low | fail-open: if cannot read file, emit warning, don't block |
| Overlap with pre-context-write-guard path detection | Low | C_ssot_priority does not re-implement path detection; reuses same CONTEXT_RE pattern |


## Implementation Priority (follow-up cycle)

| Hook | Complexity | Value | Priority |
|------|-----------|-------|----------|
| D_stale_read | Medium (state + mtime + atomic write) | High (direct user-facing) | P1 |
| F_read_contract | Medium (session state + path match) | High (entry-point advisory) | P1 |
| C_ssot_priority | High (cross-file term analysis) | Medium (team-level rare) | P2 |
| E_conflict_annotation | High (semantic detection + ADR cache) | Medium (false-positive risk) | P3 |

## Cross-cutting concerns
- All 4 hooks are advisory (exit 0) except C_ssot_priority HARD cases (exit 2)
- All reuse pre-context-write-guard.cjs path-detection patterns to avoid divergence
- All fail-open on state/FS errors; write daemon.log line for visibility
- All zero-dep Node CJS (consistent with existing hook chain)
- Atomic state writes (temp + rename, Windows EEXIST handling) for D/F state files
