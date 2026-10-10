# arthurpower skills

This is the catalogue of the 23 skills the `arthurpower` plugin ships, grouped
first by bucket, then by invocation class. Each line's text is copied verbatim
from that skill's frontmatter `description`, so this list is checkable against
`skills/*/SKILL.md` and carries no separate claims.

The plugin as a whole — hooks, agents, commands, install, tests — is described
in the [repository README](../README.md).

## Buckets

A skill is **promoted** when its frontmatter carries `bucket: engineering` or
`bucket: productivity`. 22 skills are `engineering` (code work, architecture,
testing, debugging, authoring) and 1 is `productivity` (non-code workflow tools:
cross-session handoff). `scripts/link-skills.sh` only links promoted skills into
the local harness skill directories.

## Invocation classes

- **User-invoked** — `disable-model-invocation: true`. Only the human, typing the
  skill name, can invoke it. Zero context load. 7 skills.
- **Model-invoked** — model or user reachable; the description sits in the
  context window so the agent can fire it autonomously. 16 skills.

## Engineering

### User-invoked

- [self-evolving-rules](skills/self-evolving-rules/SKILL.md) — Use when the operator manually runs memory or rule evolution — "add a memory", "merge memories", "archive", "rewrite the rule", "move across layers", "clean stale memory", "sync L1 + rules", or trims always-on instruction load / CLAUDE.md length / rules dump — and needs the 6-step strip-and-route process plus optional Step 7 extraction and Step 8 context handoff to domain-modeling.
- [setup-arthurpower](skills/setup-arthurpower/SKILL.md) — Use when bootstrapping an Arthurpower project for the first time, migrating an existing repo onto Arthurpower (preserving prior content), gap-filling against a partial setup, or switching a multi-context project to CONTEXT-MAP.md mode. User-invoked: operator triggers explicitly; model does NOT auto-fire. Registers 5 context-闭环 hooks + pre-fs-guard WITH dedup detection.
- [skill-authoring](skills/skill-authoring/SKILL.md) — Reference for writing and editing skills well — the vocabulary and principles that make a skill predictable.
- [spec-driven-development](skills/spec-driven-development/SKILL.md) — Use when the work isn't a spec yet — a one-line ask, multi-file change, ambiguous scope, or architectural decision on the table. Spec-driven-development captures what to build, why, and how to know it's done before any plan or commit. Skip for single-line fixes or bounded bug fixes.
- [wayfinder](skills/wayfinder/SKILL.md) — Use when a chunk of work is more than one agent session can hold — plan it as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
- [writing-plans](skills/writing-plans/SKILL.md) — Use when turning a buildable spec into ordered tracer bullets after architecture-change-reviewer. Covers vertical slicing, dependency order, and headroom for the implementer. Triggers on 写计划, 拆任务, 任务分解, 制定方案, 跨文件改动, 计划.

### Model-invoked

- [architecture-change-reviewer](skills/architecture-change-reviewer/SKILL.md) — Use before multi-file changes (>3 files) or cross-module work — emits a 5-line verdict (bounded-context-guardian / input-contract-tests / error-handling-enforcer / complexity-anti-drift / minimal-change-verifier) and blocks on no / unclear. Triggers on multi-file change, new module, cross-module refactor, plan before implementation.
- [boundary-testing](skills/boundary-testing/SKILL.md) — Use when a change can drift hook, detector, or skill trigger behavior — exit-code contract, state-key mismatch, mtime precision, smoke false-pass, secret-config whole-file rewrite. Triggers on "触发语义", "force smoke", "detector drift". For public-entry input classes use input-contract-tests. Not ordinary multi-file features.
- [bounded-context-guardian](skills/bounded-context-guardian/SKILL.md) — Use when slicing modules, restructuring folders across multiple files, detecting implementation-detail leaks between sibling modules, encountering circular import errors, noticing shotgun surgery in code review, or adding a new bounded context without updating docs/context-map.md. Enforces business-capability slicing and forbids technical-layer directories.
- [code-review](skills/code-review/SKILL.md) — Review Git changes when a ticket produces a code diff, after implementation and before landing. Use when the user asks to "审代码", "审 PR", "review", or "代码审查" against Standards and Spec axes. Orchestrates two parallel sub-agents and applies a severity gate. Does not patch; GATE BLOCKED hands off to review-report-repair.
- [complexity-anti-drift](skills/complexity-anti-drift/SKILL.md) — Use when ESLint flags complexity, max-depth, max-lines, max-lines-per-function, or max-params; when jscpd is over 3%; when a changed function exceeds 60 lines, cyclomatic 10, 4 params, or nest 4, or a changed file exceeds 1000 lines; or when the user asks to split a function or extract a helper.
- [dispatching-parallel-agents](skills/dispatching-parallel-agents/SKILL.md) — Use when 2+ independent tasks can run without shared mutable state, when context isolation is needed between tasks, when parallel subagent dispatch is requested, when batch review of multiple files is required, or when the user requests fan-out across independent investigations.
- [domain-modeling](skills/domain-modeling/SKILL.md) — This skill should be used when LogicSync, spec-driven-development, or writing-plans flushes a persist list, or the user needs to persist a term to docs/CONTEXT.md or an ADR for a one-way door.
- [error-handling-enforcer](skills/error-handling-enforcer/SKILL.md) — Use when modifying error handling in a diff, adding try/catch blocks, returning null/-1/empty string on failure, introducing magic error codes or string codes, adding fallback branches without exit criteria, mixing error path with main logic, throwing generic Error without a typed class, or seeing empty catch swallowing failure silently in code review.
- [input-contract-tests](skills/input-contract-tests/SKILL.md) — Use when adding or changing a public API, CLI command, or module export — cover applicable input classes (empty, invalid/negative, overflow, concurrent, exception). Triggers on "入参契约", "input contract", "public API tests". Not for hook/detector trigger-semantics (use boundary-testing). Not a default landing gate.
- [logicsync](skills/logicsync/SKILL.md) — This skill should be used when a long interview, 长访谈, 盘问, 质询, 深度盘问, or LogicSync interview is needed to resolve drifting terms or hard-to-reverse decisions.
- [minimal-change-verifier](skills/minimal-change-verifier/SKILL.md) — Use when a diff may include a second feature or drive-by, a new dependency appears without justification, or pre-commit tests are skipped.
- [review-report-repair](skills/review-report-repair/SKILL.md) — Use when arthurpower:code-review emits "GATE: BLOCKED" or unresolved High, or the operator says "修审查意见" / "fix review findings". Also use when a findings table, JSON, or markdown review report must become root-cause fixes without patch stacking. Skip greenfield design and severity disputes.
- [systematic-debugging](skills/systematic-debugging/SKILL.md) — Use when debugging a test failure, build break, unexpected runtime error, flaky test, or hanging process. Triggers on phrases like "fix this bug", "getting an error", "failing test", "flaky", "hanging", "halfway through debugging", "this used to work", "intermittent failure", "stack trace shows X", or any case where behavior does not match expectations. Prevents shotgun debugging.
- [test-driven-development](skills/test-driven-development/SKILL.md) — Use when implementing logic, fixing a bug, or changing behavior — write the failing test first (RED), then minimal code (GREEN), then refactor. Triggers on "write the failing test first", "Prove-It", or a bug that needs a reproduction test before the fix.
- [using-agent-skills](skills/using-agent-skills/SKILL.md) — Use when starting a new session, switching tasks, or unsure which arthurpower skill applies. Routes incoming work to the matching skill via flowchart before invoking. Activates on phrases like "which skill should I use", "skill check", "pre-task skill check", "how to start", "router", "skill routing", or when multiple competing skills could apply. Does not auto-invoke user-invoked authoring skills (skill-authoring, self-evolving-rules).
- [verification-before-completion](skills/verification-before-completion/SKILL.md) — This skill should be used when claiming "完成" / "done" / "fixed" / "passing" / "ready to ship", before trusting a subagent success report, or when checking "对照计划" / "对照 spec" — whether this run's delivery matches its basis.

## Productivity

### User-invoked

- [session-handoff](skills/session-handoff/SKILL.md) — Reference for compressing the live thread into a lean handoff pointer in docs/handoff/ that references committed artifacts instead of duplicating them.

## Non-promoted buckets

Four non-promoted buckets are reserved for skills that are not shipped through
the plugin:

- `misc` — kept around but rarely used
- `personal` — tied to one operator's setup
- `in-progress` — drafts not yet ready to ship
- `deprecated` — no longer used

arthurpower currently has **zero** skills in any of these buckets. If a future
skill should not be linked into local harnesses (for example, an experimental
draft), set its frontmatter `bucket:` to one of these values and
`scripts/link-skills.sh` will skip it on the next run.

## Installing the skills directly

To (re)link every promoted skill into your local agent-harness skill directories
(`~/.claude/skills` and `~/.agents/skills`), run this from the **repository
root**:

```bash
bash scripts/link-skills.sh          # add --dry-run to preview
```

Each link points back into the clone, so a `git pull` keeps installed skills
current; re-run the script after adding, removing, or renaming a skill.
Installing the plugin itself (hooks, agents, and commands included) is a
different path — see the [repository README](../README.md).

## S5 complexity check (warnings vs errors)

`complexity-anti-drift` does not run ESLint by itself. This plugin ships a
runner whose rules come from
[`eslint.config.mjs`](scripts/s5-complexity/eslint.config.mjs), kept in sync with
[`skills/complexity-anti-drift/references/thresholds.md`](skills/complexity-anti-drift/references/thresholds.md):

| Rule                                               | Level                          | Meaning                                                        |
| -------------------------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| `complexity` > 10, `max-depth` > 4                 | **error** (exit 1)             | hard FAIL — extract                                            |
| function > 60 lines, file > 1000 lines, > 4 params | **warn**                       | soft REVIEW — yellow in the terminal, does not fail the script |

The agent skill fires when those `max-lines` / `complexity` words show up in the
session (or when you ask to split a function).

The runner reads ESLint and the TypeScript parser from the project being linted,
so install them there (not in this plugin):

```bash
npm i -D eslint typescript-eslint
```

```json
"lint:s5": "node /path/to/arthurpower/arthurpower/scripts/s5-complexity/check.mjs --changed",
"lint:s5:all": "node /path/to/arthurpower/arthurpower/scripts/s5-complexity/check.mjs src"
```

`/path/to/arthurpower` is wherever this repository is checked out (or installed).
npm runs these scripts with **your** project as the working directory, which is
exactly where the runner looks for `node_modules/eslint`.

The two modes are not the same check:

```bash
npm run lint:s5        # ratchet over diff-touched functions vs HEAD
npm run lint:s5:all    # full audit: whole files, hard gates + soft metrics
# node …/check.mjs --changed --staged       # staged diff only
# node …/check.mjs --changed --base origin/main
```

- **Full audit** (paths, no `--changed`) reports every hard-gate violation and
  every soft metric in those files. This is the track that surfaces pre-existing
  debt and god files.
- **Ratchet** (`--changed`) audits only the functions the diff touches, each
  against its own version at the baseline ref. A new function must be clean; an
  existing function must not gain hard-gate errors. Equal or fewer errors pass,
  and soft metrics are ignored — so a one-line change to an old file never owes
  an unrelated refactor.

`--changed` keeps existing `.ts/.tsx/.js/.jsx/.mjs/.cjs` only. No matches, or a
diff that adds no lines → exit 0. Tests, `dist`, and `node_modules` are ignored
by the config. Clone rate (jscpd ≤ 3%) is not in this script — add jscpd
separately if you want that gate.

A pre-commit hook, if you add one, should use `--changed --staged`. Do not hook
`lint:s5:all` while historical files still trip the gates.
