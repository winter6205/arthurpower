# 0011. Fusion approach for the upstream skills repo GitHub collaboration adaptation

Date: 2026-07-20
Status: accepted

## Context

the upstream skills repo ships a GitHub collaboration workflow (router invariant / per-ticket loop / throwaway prototype / triage state machine) as a coherent unit. When adapting it into arthurpower we must choose between (a) wholesale port of the upstream's skill files, (b) distill and rewrite in arthurpower style, or (c) a hybrid: learn the upstream's flow discipline and fuse it into Arthurpower's existing skills and rules at the precise positions where each discipline belongs.

Wholesale port has a known cost: commit `5d3d02e` set this precedent for `writing-great-skills` and now duplicates maintenance burden whenever upstream updates upstream. Distillation drops the side-by-side comparison Arthurpower needs to learn the flow. Fusion preserves both — the existing Arthurpower surface (10 hooks, code-review, verification) and the upstream flow discipline.

## Decision

Adopt the **fusion** strategy. Three fusion targets:

1. **Router invariant** fused into `using-agent-skills` + a new `contributor-guide.md` (router invariant: promoted skill add/rename/remove/flow-placement must update the router skill in the same commit).
2. **Per-ticket loop** fused into `writing-plans` tracer bullet descriptions instead of creating a new `arthurpower:implement` orchestrator skill (see ADR-0012).
3. **Prototype / merge-conflict / changeset disciplines** fused into `git.md` rule sections rather than spawning new skills.

Arthurpower's 10-hook automation layer is the deliberate divergence from the upstream's prose + maintainer-discipline approach (see `gh-18 automation-divergence.md` once written).

## Consequences

Positive: existing Arthurpower surface (10 hooks, code-review, verification) preserved; flow discipline absorbed at the precise positions where each discipline belongs; no maintenance duplication from wholesale porting; reader can still see the upstream source next to the arthurpower adaptation.

Negative / trade-offs: each fusion point requires its own ADR explaining the boundary (e.g. ADR-0012 for the per-ticket loop fusion); the contributor-guide.md is a new artifact to maintain; fusion discipline must be enforced on every future upstream-adapt cycle.

Companion: ADR-0012 (per-ticket loop fusion).