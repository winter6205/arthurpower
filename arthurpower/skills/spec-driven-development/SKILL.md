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

## Input contract

Spec-driven-development accepts the wayfinder map as a valid input source alongside the usual one-line ask.

- **Source of prior decisions.** When wayfinder is the input, read the map's `## Decisions so far` section as the authoritative list of prior decisions. Each line is a closeable ticket with gist + link — zoom the link for the full Resolution.
- **Decision identifiers.** Spec's "Architectural Constraints" may reference decisions by their wayfinder ticket number or map decision ID instead of formal ADR numbers. Decisions promoted via `domain-modeling` carry ADR numbers; those still at the map level do not — both forms are valid until promotion.
- **Skip-spec decision lives in wayfinder.** The 5-section skip condition (Problem / Solution / Implementation Decisions / Testing Decisions / Out of Scope — all present in the grilling ticket's Resolution) is decided by wayfinder's `AskUserQuestion` stop gate, not here. This skill is always ready to run; whether it runs is wayfinder's call.
- **Decisions-so-far ↔ CONTEXT.md.** The map's index is a working index, not a glossary. Stable terms graduate into `docs/CONTEXT.md` via `domain-modeling`.

Cross-ref `arthurpower/skills/wayfinder` §Handoff.

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