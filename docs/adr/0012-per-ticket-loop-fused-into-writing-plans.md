# 0012. Per-ticket loop fused into writing-plans (no implement orchestrator skill)

Date: 2026-07-20
Status: accepted

## Context

the upstream skills repo' `implement` orchestrator enforces a per-ticket loop: tdd → code-review → verification → commit per ticket. arthurpower has matching skills (`arthurpower:test-driven-development`, `arthurpower:code-review` backed by v-code-review CLI, `arthurpower:verification-before-completion`) and `writing-plans` owns tracer bullets (ADR-0007 §Decision 2). The question is whether to (a) create a new `arthurpower:implement` orchestrator skill, (b) leave the loop scattered across skills with no enforcement point, or (c) fuse the loop into `writing-plans` tracer bullet descriptions.

## Decision

Fuse the loop into `writing-plans` tracer bullet descriptions. Each tracer bullet in `plans/<feature>.md` carries an explicit per-ticket section: invoke `arthurpower:test-driven-development` → run typecheck + tests → invoke `arthurpower:code-review` (v-code-review CLI) → invoke `arthurpower:verification-before-completion` → commit on ticket branch.

Why no `arthurpower:implement` skill: an orchestrator skill adds an unnecessary layer of indirection — Arthurpower's existing skills (tdd / code-review / verification) already cover the loop steps. What was missing was the **discipline** of running them in sequence per ticket, which the tracer bullet description enforces naturally.

Why not scattered (current state): without an explicit fusion point, implementers can pick and choose which steps to run, breaking the loop.

Fusion into `writing-plans` makes the loop part of the ticket definition itself — visible, reviewable, and impossible to skip silently.

## Consequences

Positive: no new skill surface; tracer bullets become self-describing loops; review of `plans/<feature>.md` validates loop completeness per ticket; ADR-0007 §Decision 2 (writing-plans owns tracer bullets) is reinforced rather than bypassed.

Negative / trade-offs: `writing-plans` template grows longer; agents that skip reading the tracer bullet description still might bypass the loop (mitigation: verify in `verification-before-completion` that the loop ran); if tdd / code-review / verification skills are renamed later, the bullet description must be updated in lockstep (router invariant applies).

Companion: ADR-0011 (fusion approach).