# 0007. ACR gate-only; tracer bullet owned by writing-plans; verdict SSOT = plans file

Date: 2026-07-18
Status: accepted; superseded-by ADR-0010 §Decision 4 only

## Context

Before this decision, `architecture-change-reviewer` (ACR) Procedure Step 6 ("Task Decomposition") and `writing-plans` both claimed ordered multi-file task lists with acceptance criteria and `[parallel]` markers. The 5-line verdict block's Verification grepped `PR.md` while writing-plans required the plan to live in `plans/<feature>.md` and called PR-description-only plans an afterthought. Tracer-bullet / vertical-slice vocabulary (the baseline author to-tickets) had no single home in arthurpower skills. ADR-0002 already fixed ACR as the pre-implementation gate (not post-impl code review) but did not settle task-decomposition ownership or verdict file SSOT.

Operator-approved reorg (PR #7, 2026-07-18) locked the split after conflict map C1–C8.

## Decision

1. **ACR is gate-only.** It emits the 5-line verdict block (bounded-context-guardian / defensive-contract-validator / error-handling-enforcer / complexity-anti-drift / minimal-change-verifier). It does not decompose features into ordered tickets, does not write acceptance criteria for implementation tasks, and does not run post-implementation review (that remains ADR-0002's code-review / audit-agent / maintainability-reviewer partition).
2. **writing-plans owns tracer bullets.** Each plan item is a tracer bullet (narrow vertical slice, demoable end-to-end, one context window) carrying exactly one `[decision]` or `[implementation]` tag and mapping to exactly one commit. Wide mechanical refactors use expand–contract rails, not a forced single bullet.
3. **Verdict SSOT is `plans/<feature>.md`.** ACR Verification greps that path only. Handoff: ACR runs first; writing-plans runs second and co-locates Section 2 (verdict) + Section 3 (tracer-bullet list) in the plan file.
4. **ACR frontmatter omits `description`** while keeping `disable-model-invocation: true` (user-invoked; router / slash reach). writing-plans retains its description.

Call chain product order is unchanged: `using-agent-skills` scale router → ACR (first) → writing-plans (second). Meta note: running ACR after *editing* the skill bodies is a reorg-session gate, not a product-order reversal.

## Consequences

**Positive:**
- Single owner per artifact (verdict vs tracer-bullet list); no dual Procedure Step 6.
- Leading word "tracer bullet" is predictable for agents writing plans.
- Verification is machine-assertable against one path (`plans/<feature>.md`).
- ADR-0002 pre-impl timing reinforced; code-review L49 wording no longer claims ACR "decides the implementation plan."

**Negative / follow-up:**
- Existing plan files written only into PR descriptions need a one-time copy into `plans/` if re-verified.
- Marketplace + cache 0.7.0 skill copies lag until post-merge sync (`plugin-source-marketplace-cache-sync` discipline).
- Pre-edit bodies archived under `docs/archive/acr-reorg-2026-07-18/` for rollback reading; do not treat archive as live SSOT.

## Considered Options

### Option A: ACR gate-only + writing-plans owns tracer bullets + plans-file verdict SSOT (accepted)
- Pros: matches handoff-acr, CONTEXT router row, quick-reference "After ACR verdict:yes"; minimal call-chain break.
- Cons: operators who only write PR descriptions must start writing plan files.

### Option B: Keep Task Decomposition in both skills with "ACR drafts, writing-plans refines"
- Pros: smaller body edit.
- Cons: permanent duplication; C1/C2 remain open.

### Option C: Move tracer-bullet ownership into ACR
- Pros: one skill for gate + tickets.
- Cons: contradicts decision-ticket = writing-plans (CONTEXT); expands ACR past ADR-0002 pre-impl gate.

## Why not B/C

B leaves two procedural owners for the same artifact. C collapses planning into the gate and breaks the three-body / router partition already accepted in ADR-0002 and CONTEXT.md.
