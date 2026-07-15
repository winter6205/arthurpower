---
name: writing-plans
description: Use when planning implementation after architecture-change-reviewer has issued a verdict. Covers ordered multi-file tasks, binary acceptance criteria, dependency sequencing, and commit-sized work. Triggers on 写计划, 拆任务, 任务分解, 制定方案, 跨文件改动, 计划.
disable-model-invocation: true
---

# Writing Plans

A plan is a sequence of ordered tasks. Each task is ≤ 1 commit, has 1+ binary acceptance criterion, ordered by dependency (not by file path). Plan lives in a file (`plans/<feature>.md`) or commit body — never in the agent's head.

Each task is a **decision ticket** and must carry exactly one tag:

- `[decision]` — resolves an open choice or records a required verdict before code changes.
- `[implementation]` — changes code or tests after its prerequisite decisions are settled.

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

1. **Enumerate affected files.** Stop and switch to a simpler skill if < 3 files. Group by logical task, not by directory. Files that change together = 1 task; files that change for unrelated reasons = split.
2. **For each task, write four things:** a `[decision]` or `[implementation]` tag, a name, the affected files, and the acceptance criterion. Acceptance = binary yes/no check. Not "looks good" — a command, a test, or a verifiable artifact.
3. **Order tasks by dependency**, not by file path. A task that consumes output of task N comes after N. File ordering hides dependencies.
4. **Mark parallelizable tasks** with `[parallel]`. Mark blockers with `[blocks: T1, T2]`. Parallelism is a property of the dependency graph, not the file list.
5. **Cross-check with `architecture-change-reviewer`'s 5-verdict frame** before declaring the plan done. If scope is unclear, run that skill first. See `references/handoff-acr.md`.
6. **Plan lives in a file** (`plans/<feature>.md` or commit body) — not in agent memory, not in chat scrollback, not in PR description afterthought. Head-plan is not a reviewable plan.

## Acceptance Criteria

See `references/acceptance-criteria.md` for the full binary checklist.

## Verification

Run all four before declaring "plan done":

1. `cat plans/<feature>.md | grep -E "^\s*[0-9]+\."` — task list present, numbered
2. `git log --oneline | head -N` — once executed, shows 1 commit per task (N tasks = N commits)
3. `git diff --stat HEAD~N..HEAD` — diff scope per commit matches the task's "affects:" line; no scope creep
4. Final report contains the line: `成功 = plan has N tasks, all with binary acceptance`

## Rationalization Table

| Rationalization | Counter |
|---|---|
| "Plan is in my head, no need to write it down" | Head-plan ≠ reviewable plan. PR description and audit both need the plan in a file. |
| "Just 3 files, no plan needed" | 3 files = 3 commits = 3 tasks. The plan is what makes those 3 commits atomic and ordered. |
| "I'll plan as I go" | Plan-as-you-go = re-work. Tasks discovered mid-implementation are tasks you cannot verify retroactively. |
| "Acceptance criterion is obvious" | Obvious to you ≠ binary. "Looks good" is not a check. Write the command. |
| "Tasks can be merged for efficiency" | Merged tasks = 1 commit = `minimal-change-verifier` (S6) fails. 1 task per commit, full stop. |
| "Operator said ship it, skip plan" | Override requires `EXPLICIT_OVERRIDE` annotation. Audit still needs the plan. |

## Red Flags

- Plan with any task missing its `[decision]` or `[implementation]` decision-ticket tag
- Plan with no acceptance criteria on any task
- Plan using "should" / "probably" / "looks good" / "TBD" in place of a binary check
- Tasks not mapped to commits (1-to-1 violation — 1 commit per logical task)
- Tasks ordered by file path or directory depth, not by dependency
- Plan only in chat scrollback, not in `plans/<feature>.md` or commit body
- "I'll plan during implementation" — post-hoc planning is invalid

## Required Baseline

Zero tolerance — every task has 1 binary acceptance criterion + maps to exactly 1 commit. No exceptions, no `EXPLICIT_OVERRIDE` without explicit annotation.

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