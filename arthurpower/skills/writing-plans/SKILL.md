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

The default tracker for plans produced by this skill is **GitHub issues** — not local markdown. Local markdown (`plans/<feature>.md` + `docs/wayfinder/tickets/`) is a **fallback only**, used when the `gh` CLI is unavailable (no GitHub remote configured, or `gh` not installed). When the fallback is used, the plan header must state the fallback explicitly (e.g. `**Tracker**: local markdown — gh CLI unavailable`).

### Main path (GitHub issues)

Apply the main path as follows (gh-08 ratified decision; gh-16 fusion location):

1. **Wayfinder map + decision tickets** → one GitHub issue per ticket, all carrying the label `wayfinder:map`. Create with `gh issue create --label 'wayfinder:map' --title "<ticket-title>" --body-file <ticket.md>`. The `wayfinder:map` label is the routing key for the wayfinder-map context.
2. **Spec output** (from `spec-driven-development` or a grilling ticket whose Resolution already carries the 5 spec sections per gh-22) → one **spec issue**. Create with `gh issue create --label 'spec' --title "spec: <feature>"`; body is the rendered spec markdown.
3. **Plan output** (this skill's `plans/<feature>.md`) → one **ticket issue per tracer bullet**, all carrying the label `ready-for-agent`. Create in dependency order (blockers first) so each issue gets a real number before its dependents reference it: `gh issue create --label 'ready-for-agent' --title "T1 <name>" --body-file <ticket.md>`. Then render the blocking edges — for every `[blocks: T1, T2]` annotation in `plans/<feature>.md` (the source of truth), use the GraphQL `addBlockedBy` mutation (`gh issue edit` has NO `--add-blocking` flag): resolve each issue's node id via `gh api graphql -f query='query { repository(owner:"<owner>", name:"<repo>") { issue(number:<n>) { id } } }'`, then run `gh api graphql -f query='mutation { addBlockedBy(input: {issueId: "<dependent-node-id>", blockingIssueId: "<blocker-node-id>"}) { clientMutationId } }'` so the blocker shows natively on the dependent. **Completion criterion**: every tracer-bullet issue carries `ready-for-agent` (NOT `wayfinder:map` — that label is path 1's decision tickets only), and every `[blocks:]` edge in the plan file renders as a native blocking link on the tracker.

### Fallback (local markdown)

Use the fallback ONLY when one of the following holds:

- No GitHub remote on the local clone (`git remote get-url origin` fails).
- `gh` CLI not installed (`gh --version` exits non-zero) or not authenticated (`gh auth status` reports not logged in).

In fallback mode:

- Plan lives in `plans/<feature>.md` as today.
- Decision / spec / ticket files live in `docs/wayfinder/tickets/` and `docs/specs/`.
- The plan header must record the fallback rationale so a reader knows why no tracker edges exist.

### Handoff boundary interaction (gh-22)

The tracker choice interacts with the wayfinder → spec handoff boundary (gh-22). When the main path is active:

- Map tickets live on GitHub with the `wayfinder:map` label.
- After the map clears, the handoff target is `spec-driven-development` (default) — its output is a spec issue (step 2 above) — or `writing-plans` directly when the grilling ticket's Resolution already contains the 5 spec sections per gh-22's exception clause.
- Plan tickets then follow step 3 with native blocking edges.

When the fallback is active, the handoff boundary still applies (map closes → spec or plans), but the artifacts are local markdown files instead of GitHub issues. The contract is the same; the storage changes.

This section documents the fusion of gh-08's tracker decision into the writing-plans skill. The original gh-16 ticket scoped a new `tracker-publisher` skill; per gh-07 (Fusion strategy) that surface is intentionally not created — the publisher responsibilities are fused into writing-plans here, with `gh issue create` plus the GraphQL `addBlockedBy` mutation as the direct CLI surface.

## Acceptance Criteria

A plan is complete when every tracer bullet carries one binary acceptance criterion, one tag, and one commit, ordered by dependency. See `references/acceptance-criteria.md` for the binary checklist.

## Verification

Run all four before declaring "plan done":

1. `cat plans/<feature>.md | grep -E "^\s*[0-9]+\."` — tracer-bullet list present, numbered
2. `git log --oneline | head -N` — once executed, shows 1 commit per tracer bullet (N bullets = N commits)
3. `git diff --stat HEAD~N..HEAD` — diff scope per commit matches the tracer bullet's "affects:" line; no scope creep
4. Final report contains the line: `成功 = plan has N tracer bullets, each with binary acceptance + one [decision]|[implementation] tag`

## Rationalization Table

| Rationalization | Counter |
|---|---|
| "Plan is in my head, no need to write it down" | Head-plan ≠ reviewable plan. PR description and audit both need the plan in a file. |
| "Just 3 files, no plan needed" | 3 files = 3 commits = 3 tracer bullets. The plan is what makes those 3 commits atomic and ordered. |
| "I'll plan as I go" | Plan-as-you-go = re-work. Tasks discovered mid-implementation are tasks you cannot verify retroactively. |
| "Acceptance criterion is obvious" | Obvious to you ≠ binary. "Looks good" is not a check. Write the command. |
| "Tasks can be merged for efficiency" | Merged tracer bullets = 1 commit = `minimal-change-verifier` (S6) fails. 1 task per commit, full stop. |
| "Split by layer (one bullet for schema, one for API, one for UI)" | Horizontal split, not a tracer bullet. A vertical slice ships end-to-end; layer-only splits are not demoable on their own. |
| "Operator said ship it, skip plan" | Override requires `EXPLICIT_OVERRIDE` annotation. Audit still needs the plan. |

## Red Flags

- Plan with any tracer bullet missing its `[decision]` or `[implementation]` decision-ticket tag
- Plan with no acceptance criteria on any tracer bullet
- Plan using "should" / "probably" / "looks good" / "TBD" in place of a binary check
- Tracer bullets not mapped to commits (1-to-1 violation — 1 commit per logical task)
- Tracer bullets ordered by file path or directory depth, not by dependency
- Plan only in chat scrollback, not in `plans/<feature>.md` or commit body
- "I'll plan during implementation" — post-hoc planning is invalid

## Required Baseline

Zero tolerance — every tracer bullet has 1 binary acceptance criterion + maps to exactly 1 commit. No exceptions, no `EXPLICIT_OVERRIDE` without explicit annotation.

See `references/acceptance-criteria.md` for the binary checklist and the cross-reference index.

---

## Plan + eval baseline (闭环反馈组件)

新 plan / 新 feature / 新 baseline 任务必须配套 `.evals/tasks/<NNN>-<name>.yaml`:

- `id`: 唯一 (001, 002, ...)
- `description`: 1 行说明验证什么
- `test_command`: bash / pytest / curl 之一, exit 0 = pass
- `success`: 输出包含的 marker (可选, 用于 grep 验证)
- `budget`: max_turns / max_cost_usd (agent 任务才有)

让 plan 完成 = `bash .evals/run.sh` 全 N/N pass. **无 eval = 不可证伪, 等于没 plan**.

RAG 项目示例见 `D:\workspace\projects\project-rag-customer-service\.evals\tasks\` (4 tasks: 001-bootstrap / 002-pytest / 003-import / 004-ruff). 模板见 `~/.claude/skills/arthurpower/...` 暂无 (v2 模板 `.evals/tasks/001-bootstrap-pass.yaml` 是参考).