# Arthurpower Skills

Arthurpower is a Claude Code plugin that ships skills across two
**promoted** buckets — `engineering` (code work, architecture, testing,
debugging, authoring) and `productivity` (non-code
workflow tools: cross-session handoff).

A skill is **promoted** when its frontmatter carries `bucket: engineering` or
`bucket: productivity`. Non-promoted buckets (`misc`, `personal`,
`in-progress`, `deprecated`) exist for future use; none are populated today.
`scripts/link-skills.sh` only links promoted skills into the local harness
skill directories.

Each skill below is grouped first by bucket, then by invocation class:

- **User-invoked** — `disable-model-invocation: true`. Only the human, typing
  the skill name, can invoke it. Zero context load.
- **Model-invoked** — model or user reachable; description sits in the
  context window so the agent can fire it autonomously.

## Engineering

### User-invoked

- [self-evolving-rules](skills/self-evolving-rules/SKILL.md) — Use when the operator manually runs memory or rule evolution — "add a memory", "merge memories", "archive", "rewrite the rule", "move across layers", "clean stale memory", "sync L1 + rule + skill".
- [setup-arthurpower](skills/setup-arthurpower/SKILL.md) — Use when bootstrapping an Arthurpower project for the first time, migrating an existing repo onto Arthurpower (preserving prior content), gap-filling against a partial setup, or switching a multi-cont
- [skill-authoring](skills/skill-authoring/SKILL.md) — Reference for writing and editing skills well — the vocabulary and principles that make a skill predictable.
- [spec-driven-development](skills/spec-driven-development/SKILL.md) — Use when starting a new project or feature with no spec yet, requirements are only a one-line ask, scope spans multiple files or days, an architectural decision lacks approved assumptions, or cross-fu
- [wayfinder](skills/wayfinder/SKILL.md) — Use when a chunk of work is more than one agent session can hold — plan it as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is
- [writing-plans](skills/writing-plans/SKILL.md) — Use when planning implementation after architecture-change-reviewer has issued a verdict. Covers ordered multi-file tasks, binary acceptance criteria, dependency sequencing, and commit-sized work. Tri

### Model-invoked

- [architecture-change-reviewer](skills/architecture-change-reviewer/SKILL.md) — Use before multi-file changes (>3 files) or cross-module work — emits a 5-line verdict (bounded-context-guardian / input-contract-tests / error-handling-enforcer / complexity-anti-drift / mini
- [bounded-context-guardian](skills/bounded-context-guardian/SKILL.md) — Use when slicing modules, restructuring folders across multiple files, detecting implementation-detail leaks between sibling modules, encountering circular import errors, noticing shotgun surgery in c
- [code-review](skills/code-review/SKILL.md) — Review Git changes when a ticket produces a code diff. Orchestrates standards and Spec reviewers; the Spec axis includes S4 checks of test evidence against applicable acceptance points. Aggregates findings and severity-gates landing (unresolved High blocks). Does not patch; `GATE: BLOCKED` hands off to `review-report-repair`.
- [review-report-repair](skills/review-report-repair/SKILL.md) — Next slot after `code-review` `GATE: BLOCKED` (or an operator-supplied findings report). Clusters High findings by root cause and repairs the contract; does not re-review.
- [complexity-anti-drift](skills/complexity-anti-drift/SKILL.md) — Use when a function exceeds 60 lines (soft review-trigger) or 10 branches, a function takes more than 4 parameters (soft review-trigger), nesting depth hits 4+, a file exceeds 500 lines, code clone perc
- [input-contract-tests](skills/input-contract-tests/SKILL.md) — Use when adding a public API or CLI command, fixing a bug, introducing an external dependency, or a PR misses a coverage class. Triggers on "add boundary tests", "test the edge cases", "what if input
- [dispatching-parallel-agents](skills/dispatching-parallel-agents/SKILL.md) — Use when 2+ independent tasks can run without shared mutable state, when context isolation is needed between tasks, when parallel subagent dispatch is requested, when batch review of multiple files is
- [domain-modeling](skills/domain-modeling/SKILL.md) — Persist terms to CONTEXT.md or an ADR when LogicSync / spec / writing-plans flushes a persist list, or the user asks to persist a one-way door.
- [error-handling-enforcer](skills/error-handling-enforcer/SKILL.md) — Use when modifying error handling in a diff, adding try/catch blocks, returning null/-1/empty string on failure, introducing magic error codes or string codes, adding fallback branches without exit cr
- [logicsync](skills/logicsync/SKILL.md) — This skill should be used when a long interview, 长访谈, 盘问, 质询, 深度盘问, or LogicSync interview is needed to resolve drifting terms or hard-to-reverse decisions.
- [minimal-change-verifier](skills/minimal-change-verifier/SKILL.md) — Use when a diff may include a second feature or drive-by, a new dependency appears without justification, or pre-commit tests are skipped.
- [systematic-debugging](skills/systematic-debugging/SKILL.md) — Use when debugging a test failure, build break, unexpected runtime error, flaky test, hanging process, or seeing "fix this bug"/"getting an error"/"failing test"/"flaky"/"hanging
- [test-driven-development](skills/test-driven-development/SKILL.md) — Use when implementing behavior or fixing bugs: choose expected outcomes from the spec or known examples, then complete one RED → minimal GREEN loop per behavior before starting the next.
- [using-agent-skills](skills/using-agent-skills/SKILL.md) — Use when starting a new session, switching tasks, or unsure which arthurpower skill applies. Routes incoming work to the matching skill via flowchart before invoking. Activates on phrases like "which skill should I use", "skill check", "pre-task skill check", "how to start", "router", "skill routing", or when multiple competing skills could apply. Does not auto-invoke skill-authoring or self-evolving-rules.
- [verification-before-completion](skills/verification-before-completion/SKILL.md) — Use when claiming 完成 / done / fixed / passing / ready to ship, before git commit or push, when a subagent reports success, or when checking 对照计划 / 对照 spec. Done means this run matches its basis, with 实测 for each line.

## Productivity

### User-invoked

- [session-handoff](skills/session-handoff/SKILL.md) — Use when a session is ending, a new agent must continue the same task, or the operator mentions session continuity, cross-session relay, token pressure, or next-agent pickup. Compresses the live thread into a project-local handoff document in docs/handoff/ and references already-committed artifacts instead of duplicating them.

## Non-promoted buckets

Four non-promoted buckets are reserved for skills that are not
shipped through the plugin:

- `misc` — kept around but rarely used
- `personal` — tied to one operator's setup
- `in-progress` — drafts not yet ready to ship
- `deprecated` — no longer used

Arthurpower currently has **zero** skills in any of these buckets. All
promoted skills ship in the two buckets above. If a future skill should not
be linked into local harnesses (for example, an experimental draft), set its
frontmatter `bucket:` to one of these values and `scripts/link-skills.sh`
will skip it on the next run.

## Installation

To (re)link every promoted skill into your local agent-harness skill
directories (`~/.claude/skills` and `~/.agents/skills`), run:

```bash
bash scripts/link-skills.sh
```

Pass `--dry-run` to preview the set of promoted skills without creating any
symlinks. Each link points back into this repo, so a `git pull` keeps
installed skills current; re-run the script after adding, removing, or
renaming a skill.

## S5 complexity check (warnings vs errors)

`complexity-anti-drift` does not run ESLint by itself. This plugin ships a
runner that prints the same gates as
`skills/complexity-anti-drift/references/thresholds.md`:

| Rule                                               | Level                          | Meaning                                                        |
| -------------------------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| `complexity` > 10, `max-depth` > 4                 | **error** (exit 1)             | hard FAIL — extract                                            |
| function > 60 lines, file > 1000 lines, > 4 params | **warn** (exit 0 if no errors) | soft REVIEW — yellow in the terminal, does not fail the script |

The agent skill fires when those `max-lines` / `complexity` words show up in
the session (or when you ask to split a function).

In the **project** (not this plugin):

```bash
npm i -D eslint typescript-eslint
```

```json
"lint:s5": "node $HOME/.claude/plugins/marketplaces/arthurpower-local/plugins/arthurpower/scripts/s5-complexity/check.mjs --changed",
"lint:s5:all": "node $HOME/.claude/plugins/marketplaces/arthurpower-local/plugins/arthurpower/scripts/s5-complexity/check.mjs src"
```

```bash
npm run lint:s5          # staged + unstaged + untracked code files vs HEAD
npm run lint:s5:all      # whole src (debt map)
# node …/check.mjs --changed --staged
# node …/check.mjs --changed --base origin/main
```

`--changed` keeps existing `.ts/.tsx/.js/.jsx/.mjs/.cjs` only. No matches →
exit 0. Tests / `dist` / `node_modules` are ignored. Clone rate (jscpd ≤ 3%)
is not in this script — add jscpd separately if you want that gate.

Pre-commit, if you add one, must use `--changed --staged`. Do not hook
`lint:s5:all` while historical files still trip the soft caps.
