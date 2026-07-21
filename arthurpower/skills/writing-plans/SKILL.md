---
name: writing-plans
description: Use when planning implementation after architecture-change-reviewer has issued a verdict. Covers ordered multi-file tasks, binary acceptance criteria, dependency sequencing, and commit-sized work. Triggers on 写计划, 拆任务, 任务分解, 制定方案, 跨文件改动, 计划.
bucket: engineering
disable-model-invocation: true
---

# Writing Plans

A plan is a sequence of ordered tasks. Each task is ≤ 1 commit, has 1+ binary acceptance criterion, ordered by dependency (not by file path). Plan lives in a file (`plans/<feature>.md`) or commit body — never in the agent's head.

Each task is a **tracer bullet**: a narrow vertical slice that touches every layer (schema / API / UI / tests), is demoable end-to-end, fits one fresh context window, and carries exactly one tag — either `[decision]` or `[implementation]`. Wide mechanical refactors are the exception: expand–contract, not forced into a single bullet.

Each tracer bullet is a **decision ticket** and must carry exactly one tag:

- `[decision]` — resolves an open choice or records a required verdict before code changes.
- `[implementation]` — changes code or tests after its prerequisite decisions are settled.

If the change is a wide mechanical refactor whose blast radius spans the whole codebase, do not force it into a single tracer bullet. Sequence as expand–contract: expand (add new form beside old) → migrate call sites in batches (each batch its own bullet) → contract (delete old form). Each batch is a real tracer bullet; expand and contract are not bullets, they are the rails that let bullets stay green.

If scope is unclear, route to the `using-agent-skills` router first; do not create implementation tickets from an undefined scope.

## Input

`writing-plans` runs AFTER the spec is buildable. The primary input is the spec (`specs/<feature>.md`) carrying an ACR all-yes verdict, OR a grilling ticket whose Resolution already holds the 5 spec sections (gh-22 skip path). The spec must be ready to decompose into ordered tracer bullets before this skill fires.

| Input source | 形态 | 消费方式 |
|---|---|---|
| spec document (`specs/<feature>.md`) | file | read the 9 core areas + ACR verdict as the buildable contract to decompose into tracer bullets |
| ACR 5-verdict block | inline in spec | the gate — `writing-plans` runs only after all 5 verdicts = yes; per-bullet cross-check before declaring plan done (see `references/handoff-acr.md`) |
| `docs/CONTEXT.md` + tagged ADRs | file | read-side per context-loop pre-check; annotate contradictions (`> Contradicts ADR-NNNN — worth reopening because <证据>`) — never silently override |

**What this skill does NOT consume**: the wayfinder map directly (`spec-driven-development` consumes it before `writing-plans` fires); working code (the plan is the input to the code, not vice-versa); implementation detail before planning is finalized.

## Output

The main output is the plan file (`plans/<feature>.md`) — ordered tracer bullets, each ≤ 1 commit, binary acceptance, dependency-ordered. This is the artifact that the per-ticket loop (ADR-0012) executes against. The closed-loop verification backstop is `.evals/tasks/<NNN>-<name>.yaml` running under `bash .evals/run.sh` — plan completion = N/N eval tasks pass.

| Artifact | 落点 | 下游消费者 |
|---|---|---|
| plan file (`plans/<feature>.md`) | file at repo root | the per-ticket loop (ADR-0012) executes it; each bullet → 1 commit on its own branch |
| tracer-bullet issues | GitHub issues with label `ready-for-agent` | the executing agent claims each issue, resolves via per-ticket loop; see `references/tracker.md` for the gh CLI mechanics |
| eval baseline | `.evals/tasks/<NNN>-<name>.yaml` | `bash .evals/run.sh` asserts completion — the closed-loop that proves the plan (replaces the retired closed-loop-feedback section archived in `docs/archive/skill-reorg-2026-07-21/writing-plans.md`) |

**Explicit non-outputs**: the spec (`spec-driven-development` owns it, `writing-plans` only consumes); working code (produced during per-ticket execution, not planning); ADRs (`domain-modeling` owns the 3-condition gate); the wayfinder map (`wayfinder` owns it).

## When to Use

- About to touch 3+ files in a single change
- New module, new bounded context, or new top-level package
- Cross-module refactor (touching ≥ 2 S1 bounded contexts)
- Scope is ambiguous and needs decomposition to become estimable
- Multiple tasks that could run in parallel and need a dependency graph
- AFTER `architecture-change-reviewer` emits all-yes verdict (never run in isolation when scope is unclear)

**Context-loop pre-check**: Before drafting the plan, read `docs/CONTEXT.md` (or `CONTEXT-MAP.md`) and `docs/adr/` under the context-loop read contract. If the plan contradicts an existing ADR, annotate: `> Contradicts ADR-NNNN — but worth reopening because <证据>`. Never silently override. New architectural decisions arising during planning must be proposed through `domain-modeling` (three-condition gate).

## When NOT to Use

- Single-file fix (1 file, 1 commit, obvious diff)
- Explicit override annotation waives the plan requirement
- Pure documentation work (docs-only change, no code surface)

## Procedure

1. **Enumerate affected files.** Stop and switch to a simpler skill if < 3 files. Group by logical task, not by directory (one tracer bullet = files that change together for one demoable behaviour). Files that change together = 1 task; files that change for unrelated reasons = split.
2. **For each tracer bullet, write four things:** a `[decision]` or `[implementation]` tag, a name, the affected files, and the acceptance criterion. Acceptance = binary yes/no check. Not "looks good" — a command, a test, or a verifiable artifact.
3. **Order tracer bullets by dependency**, not by file path. A task that consumes output of task N comes after N. File ordering hides dependencies.
4. **Mark parallelizable tracer bullets** with `[parallel]`. Mark blockers with `[blocks: T1, T2]`. Parallelism is a property of the dependency graph, not the file list.
5. **Cross-check with `architecture-change-reviewer`'s 5-verdict frame** before declaring the plan done. If scope is unclear, run that skill first. See `references/handoff-acr.md`.
6. **Plan lives in a file** (`plans/<feature>.md` or commit body) — not in agent memory, not in chat scrollback, not in PR description afterthought. Head-plan is not a reviewable plan.

## Per-ticket loop (ADR-0012)

Every `[implementation]` tracer bullet in `plans/<feature>.md` MUST embed the per-ticket loop verbatim. The loop is the discipline enforcement point — there is no separate `arthurpower:implement` orchestrator skill by design (ADR-0012 §Decision). Fusion into the tracer bullet definition makes the loop visible, reviewable, and impossible to skip silently.

The loop (verbatim from ADR-0012 §Decision):

1. **`arthurpower:test-driven-development`** — write the failing test first (or template-render / doc-render test for docs-only tickets).
2. **typecheck + tests** — run the project's typecheck and test suite; both must be green.
3. **`arthurpower:code-review`** (v-code-review CLI) — severity-gated: block on `high` or `critical` findings; `medium`/`low` are advisory.
4. **`arthurpower:verification-before-completion`** — capture actual evidence (output in full, not remembered); the 4-question ritual must complete before commit.
5. **commit on the ticket branch** — 1 commit per tracer bullet, on its own branch off `worktree-wayfinder-gh-collab-adapt` (or the active worktree base).

Why this exists (ADR-0012 §Why no implement skill): an orchestrator skill adds an unnecessary layer of indirection. Arthurpower already owns `test-driven-development`, `code-review` (v-code-review CLI), and `verification-before-completion`. What was missing was the discipline of running them in sequence per ticket — fusing the loop into the tracer bullet definition enforces it without adding a new skill surface.

**Template block** — embed this in every `[implementation]` tracer bullet of `plans/<feature>.md`:

```
#### Tn. `[implementation]` <name>
- **Affects**: <files>
- **Acceptance**: <binary check>
- **Per-ticket loop**: tdd → typecheck+tests → code-review (v-code-review CLI) → verification-before-completion → commit on ticket branch
```

The `Per-ticket loop` line is mandatory — review of `plans/<feature>.md` is a loop-completeness check per ticket, not a generic style review.

## Tracker = GitHub (main path)

The default tracker for plans produced by this skill is **GitHub issues** — not local markdown. Map tickets carry the `wayfinder:map` label; plan tickets carry `ready-for-agent`. Local markdown (`plans/<feature>.md` + `docs/wayfinder/tickets/`) is a **fallback only**, used when the `gh` CLI is unavailable (no GitHub remote configured, or `gh` not installed). When the fallback is used, the plan header must state the fallback explicitly (e.g. `**Tracker**: local markdown — gh CLI unavailable`).

Full `gh issue create` commands, the GraphQL `addBlockedBy` mutation mechanics, the fallback rules, and the gh-22 handoff-boundary interaction are disclosed to [`references/tracker.md`](references/tracker.md) — load that file when applying the tracker, not before.

## Acceptance Criteria

A plan is complete when every tracer bullet carries one binary acceptance criterion, one tag, and one commit, ordered by dependency. See `references/acceptance-criteria.md` for the binary checklist.

## Verification

Run all four before declaring "plan done":

1. `cat plans/<feature>.md | grep -E "^\s*[0-9]+\."` — tracer-bullet list present, numbered
2. `git log --oneline | head -N` — once executed, shows 1 commit per tracer bullet (N bullets = N commits)
3. `git diff --stat HEAD~N..HEAD` — diff scope per commit matches the tracer bullet's "affects:" line; no scope creep
4. Final report contains the line: `成功 = plan has N tracer bullets, each with binary acceptance + one [decision]|[implementation] tag`

## Required Baseline

Zero tolerance — every tracer bullet has 1 binary acceptance criterion + maps to exactly 1 commit. No exceptions, no `EXPLICIT_OVERRIDE` without explicit annotation.

See `references/acceptance-criteria.md` for the binary checklist and the cross-reference index.