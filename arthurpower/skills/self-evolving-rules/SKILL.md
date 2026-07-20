---
name: self-evolving-rules
description: "Use when the operator manually runs memory or rule evolution — \"add a memory\", \"merge memories\", \"archive\", \"rewrite the rule\", \"move across layers\", \"clean stale memory\", \"sync L1 + rules\", or trims always-on instruction load / CLAUDE.md length / rules dump — and needs the 6-step strip-and-route process plus optional Step 7 extraction."
bucket: engineering
disable-model-invocation: true
version: 2.1.0
tags: [memory, rules, self-evolving, strip, routing, L1, L2, archive, merge, always-on, instruction-budget, progressive-disclosure]
author: arthurpower-team
related_skills: [skill-authoring, session-handoff, verification-before-completion, using-agent-skills]
type: discipline
---

# Self-Evolving Rules

> **User-invoked.** `disable-model-invocation: true`. The model does not auto-fire this skill from description match. The operator types the skill name (or `/self-evolving-rules`) when memory / rule work starts.

This skill turns operator feedback and scattered notes into **one durable rule in the right layer**, after strip and conflict resolution. It does **not** author new skills (that is `arthurpower:skill-authoring`).

## When to use

Operator is doing any of these memory / rule jobs:

| Branch | Typical phrasing |
|--------|------------------|
| Add | "add a memory", "write a new rule", "add one rule" |
| Merge | "merge memories", "dedup fragments" |
| Archive | "archive", "mark SUPERSEDED", "mark ARCHIVED" |
| Rewrite | "rewrite the rule", "change wording", "revise existing" |
| Migrate | "move across layers", "promote auto memory to rules" |
| Clean | "clean stale memory", "delete old rule files" |
| Config sync | "sync L1 + auto memory + rules", "refresh the index" |

Also use after a completed iteration when the operator wants Step 7 knowledge extraction.

## When not to use

- Single-line typo with no rule semantics
- Pure command execution with no memory write
- Skill body already strip-clean and only needs structural skill-authoring work → hand off to `arthurpower:skill-authoring` (this skill never authors skill content itself)
- Writing domain glossary / ADR → `domain-modeling`
- Session continuity only → `session-handoff`
- Operator said not to touch memory / rules this turn

### Skill-write preflight (hand-off, not authoring)

When the task will create or edit a **skill**, still start here for strip / locate / conflict / provenance. After Steps 1–5 are clean, **hand off implementation** to `arthurpower:skill-authoring`. Do not skip this preflight and jump straight to skill-authoring when the change carries new durable rules, wrappers to strip, or cross-layer conflicts.

## Procedure

### Step 1 — Distill

Compress the feedback into **one imperative sentence**.

**Done when:** exactly one sentence exists; if more than one concern, split into separate iterations.

### Step 2 — Locate

Grep across three layers for the same topic:

1. Project `./CLAUDE.md` and `./.claude/rules/`
2. User-level CLAUDE.md and user-level rules topic files
3. Auto memory index + topic files for this project

**Done when:** every same-topic hit is listed with path + line, or operator confirms "this is new".

### Step 3 — Strip

Remove wrappers; keep content + real provenance.

Full strip categories and placeholders: [`references/strip-and-routing.md`](references/strip-and-routing.md).

Run the genericization grep suite from the `no-meta-specific` rule (or skill validator private-prefix checks). Hits outside necessary exemptions must be removed before write.

**Done when:** strip checklist clean; provenance present; no self-certifying wrapper remains.

### Step 4 — Resolve conflicts

Apply the priority ladder in [`references/strip-and-routing.md`](references/strip-and-routing.md).

**Done when:** at most one surviving rule per topic; losers deleted or marked SUPERSEDED with pointer.

### Step 5 — Polish (optional)

Tighten wording. Prefer leading words already in the operator's vocabulary. No new constraints without provenance.

**Done when:** wording is shorter or equal length and meaning unchanged.

**Instruction budget check (always-on rules only).** When the routed layer is global L1, project `CLAUDE.md`, or any `@import`-ed rules file: each new imperative unit increases the always-on instruction load. Confirm universal applicability (must fire on >50% of sessions for the same project), prefer `file:line` or markdown link over `@import` when the new rule is task-shaped, and reject duplicate rewording of existing bullets. Done when the touched file still has fewer imperative units than before, or the additions are universally-applicable.

### Step 6 — Route and write

Write only the target layer from the routing table in [`references/strip-and-routing.md`](references/strip-and-routing.md).

Re-read the written file. If the project has `.evals/`, run post-iteration regression (below) before claiming done.

**Done when:** file exists at the routed path; re-read matches intent; no secret values written.

### Step 7 — Extract knowledge (conditional)

After Step 6, optionally spawn a **read-only** subagent. Details: [`references/step-7-extraction.md`](references/step-7-extraction.md).

**Done when:** skip conditions applied, or candidates filtered and counts reported. Subagent wrote zero files.

## Post-iteration regression

When rules changed and the project has `.evals/`:

```bash
bash .evals/run.sh
```

Baseline must stay N/N pass. Fail → roll back the rule write and restart from Step 3.

No `.evals/` → skip, note the gap.

## Engineering changes ride-along

If this iteration ships with hook / skill / rules / settings changes (not memory-only), follow the project boundary-testing protocol. Subagent smoke alone is not acceptance.

## Acceptance Criteria

- [ ] Invoked for memory / rule evolution, or as strip/route preflight before handing skill implementation to skill-authoring
- [ ] Step 1 produced one imperative sentence
- [ ] Step 2 grepped all three layers (or operator confirmed new)
- [ ] Step 3 strip clean under genericization checks
- [ ] Step 4 left a single rule per topic
- [ ] Step 6 wrote only the routed layer; re-read OK
- [ ] No API key / token / password values in any written file
- [ ] Step 7 skipped for cause, or candidates filtered with counts
- [ ] `.evals/run.sh` run when present; fail rolled back

## Verification

```
Skill type: discipline
Bar level: discipline
```

```bash
# After write: genericization must be clean on the touched file
# (use the no-meta-specific grep suite; for skills, hand off to skill-authoring
#  which runs its own validator from the plugin skills root)

# If project evals exist:
bash .evals/run.sh; echo EXIT=$?
```

### Rationalization Table

| Excuse | Why it sounds right | Reality | Required action |
|--------|---------------------|---------|-----------------|
| "The new rule is obviously correct; skip grep" | Saves time | Misses same-topic rules → silent conflict | Always grep all three layers first |
| "I'll write memory directly; skill is overhead" | One-line fix feels trivial | Bypasses strip + routing + provenance | Invoke this skill before any L1/L2 write |
| "Keep both rules; they mostly agree" | Feels safer than deleting | Downstream agents pick at random | Merge to one rule after priority ladder |
| "Promote my inference to a hard constraint" | Confidence feels like evidence | Invented authority without provenance | Tag `[agent inference · unconfirmed]` or drop |
| "Run Step 7 on every tiny edit" | More extraction feels thorough | Noise candidates flood the queue | Honor skip conditions |
| "Accept every high-looking candidate" | Subagent sounded confident | Project-specific junk becomes L1 | Filter by scope + rating |
| "Regression tests can wait" | Eval suite is slow | Rule change can break routing | Run `.evals/run.sh` when present |
| "Docs-only; skip boundary testing" | Hook text is not product code | Silent bugs ship as discipline | Follow boundary-testing when shipping with code |
| "Always-on: add one more IMPORTANT, it's harmless" | Single line feels negligible | Decay is uniform, not additive; perimeter bias amplifies tails | Confirm universal applicability + count imperative units before adding |

### Red Flags — STOP

- Editing CLAUDE.md / rules / auto memory without this skill
- Skipping cross-layer grep before write
- Leaving two conflicting rules after a merge
- Shipping self-certifying wrappers instead of strip
- Step 7 subagent allowed to write files
- Accepting all Step 7 candidates without rating filter
- Claiming done without post-iteration eval when `.evals/` exists
- Skipping strip/route preflight and jumping straight to skill-authoring when the skill change carries new durable rules or wrappers
- Authoring skill content inside this skill instead of handing off to skill-authoring
- Adding imperative units to always-on layers without universal-applicability check or instruction-budget review

## References

- Step 7 details: [`references/step-7-extraction.md`](references/step-7-extraction.md)
- Strip + routing + priority: [`references/strip-and-routing.md`](references/strip-and-routing.md)
- Always-on / instruction budget hygiene: [`references/always-on-hygiene.md`](references/always-on-hygiene.md)
- Extra rationalization copy: [`references/rationalization-red-flags.md`](references/rationalization-red-flags.md)
- Genericization rule: project / user `no-meta-specific` rule file
- New skill creation: `arthurpower:skill-authoring`
- Project decision SSOT when always-on layout is locked: `docs/adr/0008-always-on-progressive-disclosure.md` (if present)
