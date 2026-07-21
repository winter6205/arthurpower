---
name: spec-driven-development
description: Use when starting a new project or feature with no spec yet, requirements are only a one-line ask, scope spans multiple files or days, an architectural decision lacks approved assumptions, or cross-functional blast radius is in play. Not for single-line fixes or bounded bug fixes.
bucket: engineering
disable-model-invocation: true
---

# Spec-Driven Development

## Context-Loop Pre-Check

Before drafting any spec, this skill MUST:

1. Read `docs/CONTEXT.md` (or `CONTEXT-MAP.md` for monorepos) and surface all relevant domain terms in the spec's "Glossary" section (exact copy from the glossary, not redefinition).
2. Read `docs/adr/` for in-scope ADRs and reference them by number in the spec's "Architectural Constraints" section.
3. If a domain term is ambiguous or missing, HALT and route to `domain-modeling` (sole write authority for `docs/CONTEXT.md`). Do not invent terms inline.
4. If a new architectural decision arises during spec drafting that satisfies the three-condition gate (Hard to reverse ∧ Surprising w/o ctx ∧ Real trade-off), propose it via `domain-modeling` — never embed the decision in the spec body.

This skill is a **read-side consumer** of the context closed-loop read contract.

## Input

Spec-driven-development accepts either the wayfinder map or a one-line ask; it is a read-side consumer of the context closed-loop. When the wayfinder map is the input, `## Decisions so far` is the authoritative index of prior decisions — zoom each link for the full Resolution. Stable terms graduate from the map's working index into `docs/CONTEXT.md` via `domain-modeling`; ADR numbers take precedence over map decision IDs once promoted, but both forms are valid until promotion. Cross-ref `arthurpower/skills/wayfinder` §Handoff.

| Input source | 形态 | 消费方式 |
|---|---|---|
| wayfinder map (`wayfinder:map` issue) | artifact (GitHub issue / local markdown) | read `## Decisions so far` as authoritative prior decisions; zoom links for full Resolution |
| one-line ask | inline (operator prompt) | the feature / project request to spec |
| `docs/CONTEXT.md` + `docs/adr/` | file | read-side consumer per Context-Loop Pre-Check; surface terms in Glossary, reference ADRs by number |

**What this skill does NOT consume**: code / deliverables (this skill produces the spec, not the implementation); the plan (`plans/<feature>.md` is writing-plans territory); implementation details, tickets, or PR descriptions; ADR write authority (domain-modeling owns `docs/CONTEXT.md` and `docs/adr/`). The skip-spec decision (5-section skip condition) is decided by wayfinder's `AskUserQuestion` stop gate — not consumed here.

## Output

The main product is the spec document at `specs/<feature>.md` plus the ACR 5-verdict block embedded inline in Step 4. The stop-gate for whether spec runs at all lives in wayfinder's `AskUserQuestion` (the 3-way handoff choice), not here. This skill is always ready to run; whether it runs is wayfinder's call.

| Artifact | 落点 | 下游消费者 |
|---|---|---|
| spec document | `specs/<feature>.md` | `architecture-change-reviewer` (5-verdict gate) → `writing-plans` |
| ACR verdict block | inline in spec (Step 4) | `writing-plans` reads it as the gate result |
| handoff to writing-plans | Step 5 (fixed sequence: spec → ACR → writing-plans) | `writing-plans` |

**Explicit non-outputs**: the plan (`plans/<feature>.md` is writing-plans territory); working code or implementation artifacts; ADRs (domain-modeling owns `docs/adr/`); `docs/CONTEXT.md` glossary terms (domain-modeling owns those); the wayfinder map (wayfinder owns it); any commit / push / release action (those are operator-level, post-handoff).

## Overview

A spec is the contract between human reviewer and implementation. It captures what to build, why, and how to know it is done. Code without a spec is guessing at requirements. A spec without surfaced assumptions is guessing at context. This skill owns the SPECIFY phase of the four-phase gated workflow (SPECIFY → PLAN → TASKS → IMPLEMENT). PLAN / TASKS / IMPLEMENT live in `writing-plans`. The boundary gate between SPECIFY and PLAN is `architecture-change-reviewer` (5-verdict frame).

## When to Use

- Starting a new project, bounded context, or top-level package
- A feature whose requirements exist only as a one-line ask ("add X", "build Y")
- A change spanning multiple files, modules, or days
- An architectural decision is on the table (new storage engine, new auth model, new bounded context)
- Human reviewer requirements are ambiguous or self-contradicting
- Pre-implementation scope clarification needed before any code lands
- Cross-functional blast radius (frontend + backend + DB + ops)

## When NOT to Use

- Single-file fix or typo correction
- Requirements are unambiguous and self-contained
- Bug fix with a clear single bounded context and single Core Skill in scope
- Plan already exists and only tasks need decomposition (use `writing-plans` directly)
- Pure documentation or comment changes
- Implementation step already in progress (write spec retroactively, do not skip assumption gate)

## Iron Law

**SPECIFY before PLAN, never skip the assumption gate.** The gate is binary: every assumption is either confirmed by the human or removed from scope. No silent assumptions.

## Procedure

### Step 1 — Surface Assumptions (the gate)

List every implicit assumption as a numbered list. Hand to the human. Do not proceed until human replies "confirmed", "corrected", or "removed". Categories: tech stack, auth, deployment, browser matrix, scope boundaries, non-functional targets, dependencies, integration contracts, data model defaults, human-approval gates. Format: `references/spec-template.md`.

### Step 2 — Write the Spec Document

Spec lives in `specs/<feature>.md`. Nine core areas (Objective / Tech Stack / Commands / Project Structure / Code Style / Testing Strategy / Boundaries / Success Criteria / Open Questions). Never delete numbered sections. Template: `references/spec-template.md`.

### Step 3 — Reframe Vague Requirements as Binary Success Criteria

Vague asks ("make it faster", "be more secure") must become binary criteria. If unreframeable, surface as Open Question and stop.

### Step 4 — Hand the Spec to architecture-change-reviewer

Agent runs `architecture-change-reviewer` and emits 5-line verdict (bounded-context-guardian / defensive-contract-validator / error-handling-enforcer / complexity-anti-drift / minimal-change-verifier), each yes / no / unclear. If any verdict is `no` or `unclear`, return to Step 1 or Step 2. Verdict example: `references/example.md`.

### Step 5 — Hand Off to writing-plans

Hand the spec path to `writing-plans`. Sequence is fixed: spec-driven-development → architecture-change-reviewer → writing-plans. Merging phases skips the gate.

## Acceptance Criteria

A spec is complete when **all** of the following are true:

- [ ] Assumptions surfaced as a numbered list and confirmed (or removed)
- [ ] Spec covers all nine core areas (Objective / Tech Stack / Commands / Project Structure / Code Style / Testing Strategy / Boundaries / Success Criteria / Open Questions)
- [ ] Success criteria are binary (yes/no), not vague
- [ ] Boundaries triaged (Always / Ask first / Never)
- [ ] Spec lives in a committed file (`specs/<feature>.md`)
- [ ] `architecture-change-reviewer` emits all 5 verdicts as `yes` or `N/A with reason`
- [ ] Spec referenced by downstream `writing-plans`

## Example

End-to-end runnable example: vague ask → spec doc + 5-verdict gate. See `references/example.md`.

## Pressure handling

See `references/rationalization-and-redflags.md`.

## Pressure Scenarios & Anti-Patterns

See `references/pressure-and-antipatterns.md`.

## Required Baseline

Zero tolerance — every multi-file or multi-day change has a confirmed assumption list, a spec doc covering all nine core areas with binary criteria, an ACR 5-verdict block (all `yes` or `N/A with reason`), and a written handoff to `writing-plans`. No `EXPLICIT_OVERRIDE` waives the assumption gate.

## Verification

See `references/verification.md`.