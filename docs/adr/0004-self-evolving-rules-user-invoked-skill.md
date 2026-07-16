# 0004. Restore self-evolving-rules as a user-invoked skill

Date: 2026-07-16
Status: accepted

## Context

Project rule `.claude/rules/self-evolving.md` already encodes the 6-step strip-and-route flow, Step 7 extraction, and post-iteration regression. An earlier skill form was archived into the rule file because it conflicted with context-loop write authority, genericization strip, and boundary-testing discipline.

Operators still need a **manual, loadable procedure** that does not sit in always-on description context, and that can hand off cleanly to `skill-authoring` after strip/preflight. Leaving the process only in a rule file makes invocation accidental (agents "remember" the rule) and hard to boundary-test as a skill artifact.

Options considered: (A) rule-only (status quo), (B) model-invoked skill with rich triggers, (C) user-invoked discipline skill + rule kept as project policy.

## Decision

Restore `arthurpower:self-evolving-rules` as a **user-invoked** skill (`disable-model-invocation: true`, `type: discipline`):

1. Operator must type the skill name / slash command; the model does not auto-match description.
2. Skill body owns the runnable 6+1 procedure, strip/routing pointers, Step 7 template, and ride-along boundary-testing note.
3. Project rule `.claude/rules/self-evolving.md` remains the project-level trigger/governance copy; skill is the executable form (dual form, not dual truth for steps — skill procedure is SSOT for how to run; rule points at the same process).
4. Skill writes **do not** author skill content: Skill-write preflight (Steps 1–5) then hand-off to `arthurpower:skill-authoring`.
5. Install both marketplace and cache copies; genericization-clean; driver `iteration/1` 22/22 + validator pass before claim ready.

## Consequences

**Positive**:

- Zero always-on context load for this skill; cognitive load stays with the operator.
- Boundary-testable artifact (`evals.json` + `driver.py`) separate from the rule file.
- Clear hand-off to skill-authoring without scope leak.
- Aligns with the baseline invocation split (user-invoked vs model-invoked) already resolved in Flagged ambiguities.

**Negative**:

- Operator must remember to invoke; no auto-fire on "记住 X" unless they run the skill (router / human habit).
- Dual form (rule + skill) can drift if one is edited without the other — mitigate by editing skill procedure first, then syncing rule pointers in a later self-evolving pass.

**Relation to existing ADRs**:

- Does not reopen ADR-0001 (domain-modeling stays model-invoked); this skill is a different loading choice for a different job.
- Complements ADR-0003 (user-level / self-evolving 6-step required for cross-harness writes) by giving an invocable procedure.

## Considered Options

### Option A: rule-only (rejected)

- Pros: single file, no plugin install
- Cons: no Skill tool loading, weak boundary testing surface, agents improvise from prose

### Option B: model-invoked skill (rejected)

- Pros: auto-trigger on memory phrases
- Cons: permanent context load; false-positive mid-task rewrites; fights "manual only" operator request

### Option C: user-invoked discipline skill (accepted)

- Pros: manual gate, testable, zero context load, clear preflight hand-off
- Cons: relies on operator memory / router listing
