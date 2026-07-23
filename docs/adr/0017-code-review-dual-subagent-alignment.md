# 0017. Rewrite arthurpower:code-review as dual-subagent orchestrator aligned with the baseline author upstream

Date: 2026-07-24
Status: accepted

## Context

ADR-0002 created `arthurpower:code-review` as a v-code-review CLI wrapper (inline Bash call to `v-code-review.exe`). The ADR claimed alignment with the baseline author's `code-review` skill ("跟 the baseline v1.1 code-review skill 对齐"), but only aligned on content (two axes + Fowler 12 smells + severity gating) — not on mechanism. the baseline's skill spawns two parallel sub-agents (Standards + Spec) via Agent tool calls; ours shells out to a CLI in the main thread.

Three review surfaces collided on the same trigger phrases ("审代码 / 审 PR / review"):
1. `arthurpower:code-review` (plugin skill, inline CLI)
2. `v-code-review` (user-level skill, manual CLI wrapper)
3. `code-reviewer` persona + `code-review-and-quality` skill (user-level, five-axis single persona)

Operator intent (clarified in deep-dive session 2026-07-23/24):
- `v-code-review` = standalone manual slash command (`/v-code-review`), not part of task flow
- Per-ticket loop code review = dual parallel sub-agents (the baseline mechanism), orchestrated by a thin model-invoked skill
- Old five-axis persona/skill archived; single review mechanism going forward
- Code review step is conditional: main agent triggers it only when the ticket produces a code diff

## Decision

Rewrite `arthurpower:code-review` from CLI wrapper to **thin orchestration skill** that:

1. Pins the diff fixed point (commit/branch/tag/merge-base)
2. Identifies spec source (4-level priority: commit message issue ref → user path → docs/specs match → ask)
3. Identifies standards sources (repo coding standards + `code-review-protocol` rule + Fowler 12 smell baseline)
4. Spawns two parallel sub-agents via Agent tool:
   - `standards-reviewer-agent` — Standards axis (repo standards + Fowler smells, severity High/Medium/Low)
   - `spec-reviewer-agent` — Spec axis (missing requirements, scope creep, implementation deviation, severity High/Medium/Low)
5. Aggregates both reports side by side (no cross-axis reranking)
6. Applies severity gate: unresolved High → "commit must stop"; otherwise → "clear to commit"

New agent files: `arthurpower/agents/standards-reviewer-agent.md`, `arthurpower/agents/spec-reviewer-agent.md`.

Skill remains model-invoked (no `disable-model-invocation`) so the main agent can autonomously trigger it when a ticket produces code changes. Description states the conditional trigger explicitly.

`v-code-review` gets `disable-model-invocation: true` — pure manual `/v-code-review` slash command, exits task flow entirely.

Archived (not deleted): `~/.claude/agents/code-reviewer.md`, `~/.claude/skills/code-review-and-quality/`, old `arthurpower:code-review` SKILL.md body (CLI procedure).

`code-review-protocol` (references/protocol.md) stays — it is the Standards-axis SSOT referenced by domain-modeling and test-driven-development.

## Consequences

**Positive:**
- Mechanism aligned with the baseline upstream: parallel sub-agents with context isolation (one axis cannot mask the other)
- Single review mechanism in task flow (no three-way trigger collision)
- `v-code-review` cleanly separated as manual tool
- Severity gate + conditional trigger preserved from ADR-0002 intent
- Agent files follow arthurpower convention (like S1-S6 agents), dispatchable by arthurpower-dispatcher

**Negative:**
- Five-axis coverage (security, performance as explicit axes) lost from per-ticket loop; mitigated by `code-review-protocol` Standards axis covering security/performance smells, and pre-merge `/ship` fan-out still available if needed later
- ADR-0002 superseded (mechanism decision reversed); content decisions (two axes, Fowler, severity) retained
- writing-plans per-ticket loop description needs update (remove "v-code-review CLI" annotation)

**Supersedes:** ADR-0002 (mechanism portion). ADR-0002 content decisions (two axes, Fowler 12, severity gating, three-body time-point partition) remain valid.

## Considered Options

### Option A: Rewrite skill as dual-subagent orchestrator (adopted)
- Pros: the baseline alignment, context isolation, single mechanism, agent files reusable by dispatcher
- Cons: five-axis coverage reduced in per-ticket loop

### Option B: Keep CLI wrapper, add sub-agents alongside
- Pros: no mechanism change
- Cons: two mechanisms for one step, complexity, CLI coupling remains

### Option C: Use code-reviewer persona (five-axis) in per-ticket loop
- Pros: existing persona, no new files
- Cons: not the baseline-aligned, no context isolation, five axes too heavy for per-ticket tracer bullets

## Why not B/C

B keeps the CLI coupling that ADR-0002's own "Negative" section flagged ("跨 harness 层耦合"). C uses a single-context five-axis persona for a step that benefits from isolation (the baseline's core insight: "a change can pass one axis and fail the other").
