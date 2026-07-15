---
description: "Arthurpower 体系结构声明入口 - 一次性 setup. Auto-detects project mode (fresh / old-repo / intermediate) and runs the right flow: fresh -> bootstrap from GitHub template, old-repo -> incremental gap-fill (existing CLAUDE.md / docs/ preserved, only missing pieces added). Registers 5 context-闭环 hooks + pre-fs-guard WITH dedup detection. Slash command - only runs when the operator explicitly types /setup-arthurpower; the model does NOT auto-invoke it from this description."
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
argument-hint: [optional: project root path, defaults to cwd]
---

# /setup-arthurpower

One-shot Arthurpower structural declaration entry. Run once when a project
first adopts Arthurpower, or when migrating an existing repo into the
Arthurpower spec without deleting user content.

## Why a command, not a skill

This was a skill (auto-triggered by description match). It is now a slash
command: the operator must explicitly type `/setup-arthurpower`. A one-shot
setup entry should NOT be auto-triggered by the model mid-task - that caused
accidental re-bootstrap. Slash command = explicit intent.

Full design rationale + the original v3.0.0 SKILL.md body is archived at:
`~/.claude/plugins/.archive/2026-07-15-setup-arthurpower-skill-to-command/arthurpower/skills/setup-arthurpower/SKILL.md`

Read that archive file for the complete Step 0-6 procedure, PROTECTED list,
and Verification Checklist. This command body is the operator-facing entry;
the archive is the SSOT for the procedure detail.

## What it does

Declares **structure** (where to read / where to write / who consumes), not
business terms. Core commitments:

- **Dual-mode**: auto-detect fresh (no `CLAUDE.md`) / old-repo (has `CLAUDE.md`) / intermediate, run the matching flow
- **No deletion of old content**: old-repo only gap-fills missing pieces, never touches `CLAUDE.md` / `CLAUDE.local.md` / existing `docs/`
- **GitHub pull**: default template source = `<owner>/<repo>`, via `scripts/update.sh --from-git`
- **5-hook dedup**: register 5 context-闭环 hooks + pre-fs-guard with 3-branch decision (clean / partial / full-overlap) by scanning user-level `~/.claude/settings.json`

## How to run

Execute the procedure from the archived SKILL.md, in this order:

### Step 0: Mode Detection

Read project root, decide mode:

| Condition | Mode | Flow |
|-----------|------|------|
| No `CLAUDE.md` AND no `.claude/` | **fresh** | Step 1 -> Step 6 (GitHub pull bootstrap) -> Step 1-5 |
| Has `CLAUDE.md` (or `docs/CONTEXT.md` / `.claude/`) | **old-repo** | Step 1-4 skip-if-present -> Step 5 dedup -> Step 6 update (optional) |
| Partial (has `CLAUDE.md` but missing `.claude/rules/` etc) | **intermediate** | Step 0.5 gap-fill -> Step 5 dedup -> Step 6 update (optional) |

**Never decide by file list alone**: any one core marker file (`CLAUDE.md` / `docs/CONTEXT.md` / `.claude/settings.json`) present => treat as old-repo or intermediate, NEVER delete old files.

### Step 0.5: Gap-Fill (intermediate only)

For old-repo / intermediate, list missing required assets and pull only those:

```bash
declare -a REQUIRED=(
  ".claude/rules/context-loop.md"
  ".claude/rules/boundary-testing-protocol.md"
  ".claude/rules/self-evolving.md"
  ".claude/hooks/pre-context-write-guard.cjs"
  ".claude/hooks/pre-stale-read.cjs"
  ".claude/hooks/pre-read-contract.cjs"
  ".claude/hooks/post-ssot-priority.cjs"
  ".claude/hooks/post-conflict-annotation.cjs"
  ".claude/hooks/pre-fs-guard.cjs"
  ".claude/skills/domain-modeling/SKILL.md"
  "docs/CONTEXT.md"
  "docs/agents/context-contract.md"
  "scripts/bootstrap.sh"
  "scripts/update.sh"
  ".evals/run.sh"
)
for f in "${REQUIRED[@]}"; do
  [ ! -f "$f" ] && PULL_LIST+=("$f")
done
```

Non-empty PULL_LIST -> `bash scripts/update.sh --from-git <owner>/<repo> --only "${PULL_LIST[@]}"`

**PROTECTED never overwrite** (even `--force`): `CLAUDE.md`, `CLAUDE.local.md`, `docs/CONTEXT.md`, `.claude/settings.local.json`, `.claude/settings.json`, `docs/handoff/*`.

### Step 1-4: Context structure (fresh only)

- Step 1: detect single-context (CONTEXT.md) vs monorepo (CONTEXT-MAP.md)
- Step 2: `mkdir -p docs/agents docs/adr`
- Step 3: copy template `docs/agents/context-contract.md`
- Step 4: write placeholder `docs/CONTEXT.md` (H1 = project name decided by operator; do NOT Edit H1 afterwards - pre-context-write-guard blocks it)

### Step 5: Register physical guardrails (dedup, avoid double-run)

Claude Code hooks accumulate user-level + project-level (not fallback). Same matcher registered twice runs twice (duplicate systemMessage + state file races). So registration branches by environment.

**Step 5a**: read `~/.claude/settings.json` hooks.PreToolUse + PostToolUse, check for same-name hook filenames. Default detect 6 hooks (5 context-闭环 + pre-fs-guard):

| Hook | Trigger | Duty |
|------|---------|------|
| `pre-context-write-guard.cjs` | PreToolUse Write/Edit/MultiEdit/Bash | CONTEXT.md / ADR write authority + Bash 3-regex |
| `pre-stale-read.cjs` | PreToolUse Write/Edit/MultiEdit/Bash (src/) | CONTEXT.md mtime stale -> advisory |
| `pre-read-contract.cjs` | PreToolUse Write/Edit/MultiEdit/NotebookEdit/Bash (src/) | write src/ without reading CONTEXT.md -> advisory |
| `post-ssot-priority.cjs` | PostToolUse Write/Edit/MultiEdit/Bash | team/project/sub-context term conflict -> stderr POST-FIX WARNING |
| `post-conflict-annotation.cjs` | PostToolUse Write/Edit/MultiEdit/Bash (tool_name whitelist) | skill output contradicts ADR -> advisory |
| `pre-fs-guard.cjs` | PreToolUse Bash | block `find /` / `grep -r /` / trailing `&` |

**Step 5b**: 3-branch decision

| Scenario | Decision | Action |
|----------|----------|--------|
| User-level has NONE of the same-name hooks | clean (CI / Docker / new machine) | register all 6 hooks to `.claude/settings.json` |
| User-level has SOME | partial clean | register only the ones user-level lacks |
| User-level has ALL | full overlap | skip project-level registration, notify "provided by user-level" |

**Step 5c**: project-level registration snippet (only scenarios 1+2):

```json
"PreToolUse": [
  {
    "matcher": "Write|Edit|MultiEdit|Bash",
    "hooks": [
      {"type": "command", "command": "node .claude/hooks/pre-context-write-guard.cjs", "timeout": 5},
      {"type": "command", "command": "node .claude/hooks/pre-stale-read.cjs", "timeout": 5},
      {"type": "command", "command": "node .claude/hooks/pre-read-contract.cjs", "timeout": 5}
    ]
  },
  {
    "matcher": "Bash",
    "hooks": [
      {"type": "command", "command": "node .claude/hooks/pre-fs-guard.cjs", "timeout": 5}
    ]
  }
],
"PostToolUse": [
  {
    "matcher": "Write|Edit|MultiEdit|Bash",
    "hooks": [
      {"type": "command", "command": "node .claude/hooks/post-ssot-priority.cjs", "timeout": 5},
      {"type": "command", "command": "node .claude/hooks/post-conflict-annotation.cjs", "timeout": 5}
    ]
  }
]
```

**Step 5d**: byte-level discipline - settings.json may contain secrets, use `Edit` tool to precisely append, do NOT `Write` the whole file. Validate with `python3 -m json.tool` afterwards.

**Step 5e**: verify:

```bash
bash .evals/run.sh --all   # must be 10/10
python3 -c "import json; print(json.load(open('.claude/settings.json'))['hooks'])"
```

### Step 6: GitHub Pull (template evolution sync)

```bash
# pull latest template spec to this project (incremental, no PROTECTED overwrite)
bash scripts/update.sh --from-git <owner>/<repo>

# pull only specified paths (gap-fill)
bash scripts/update.sh --from-git <owner>/<repo> --only .claude/rules/ scripts/

# local template path (dev)
ARTHUR_TEMPLATE=/path/to/local/arthur-tpl bash scripts/update.sh

# force overwrite (breaks local customization outside PROTECTED)
bash scripts/update.sh --from-git <owner>/<repo> --force
```

`update.sh` auto: (1) `git clone --depth=1` to temp dir (2) sha256 compare each file (3) SAME skip / DIFF skip-or-warn-`--force` / MISSING copy (4) PROTECTED never overwrite (5) cleanup temp clone.

## Verification Checklist

### Fresh / Intermediate

- [ ] `docs/agents/context-contract.md` exists
- [ ] `docs/CONTEXT.md` or `docs/CONTEXT-MAP.md` exists (with SSOT header, H1 = correct project name, NOT Edit'd after setup)
- [ ] `docs/adr/` exists (empty OK)
- [ ] 6 hook files in `.claude/hooks/`
- [ ] hook registration per Step 5b 3-branch
- [ ] `domain-modeling` in `.claude/skills/` (template ships it); `deep-dive-protocol` + `self-evolving-rules` via global plugin
- [ ] `.claude/rules/{context-loop,boundary-testing-protocol,self-evolving}.md` exist
- [ ] `scripts/{bootstrap,update}.sh` exist + executable
- [ ] `.evals/run.sh --all` 10/10 PASS

### Old-repo (incremental, no deletion)

- [ ] Step 0 detection correct (has CLAUDE.md -> old-repo)
- [ ] Step 0.5 gap-fill lists PULL_LIST, calls update.sh
- [ ] existing `CLAUDE.md` unchanged (sha256 before == after)
- [ ] existing `docs/` files unchanged (except gap-fill created CONTEXT.md / context-contract.md)
- [ ] NO existing file deleted
- [ ] new hooks/rules/skills pulled via update.sh, sha256 matches template
- [ ] `.claude/settings.json` only appended necessary hooks per Step 5 dedup
- [ ] `.evals/run.sh --all` at least 5/10 (old-repo structure may not match all 10 task assumptions)

## Completion semantics

Success = fresh mode `.evals/run.sh --all` 10/10 + 6 hooks present; old-repo mode zero modification of existing files + missing assets gap-filled via update.sh + dedup decision executed correctly.

## Related

- Template repo: https://github.com/<owner>/<repo> (ships `scripts/bootstrap.sh` + `scripts/update.sh`)
- Read-side contract: `docs/agents/context-contract.md`
- Write authority: `.claude/skills/domain-modeling/SKILL.md`
- Physical guardrail root: `.claude/hooks/pre-context-write-guard.cjs`
- Rule layer: `.claude/rules/context-loop.md`
- Boundary-testing SOP: `.claude/rules/boundary-testing-protocol.md`
- Archived v3.0.0 SKILL.md (full procedure SSOT): `~/.claude/plugins/.archive/2026-07-15-setup-arthurpower-skill-to-command/arthurpower/skills/setup-arthurpower/SKILL.md`
