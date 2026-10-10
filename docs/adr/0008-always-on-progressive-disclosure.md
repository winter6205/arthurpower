# 0008. Always-on progressive disclosure for CLAUDE.md and rules

Date: 2026-07-18
Status: accepted

## Context

Published guidance on authoring `CLAUDE.md` argues that coding agents are mostly
stateless, that `CLAUDE.md` is the only default always-on project file, and that
frontier models follow roughly 150–200 instructions with reasonable consistency
while Claude Code's system prompt already consumes ~50. Instruction-following
degrades uniformly as instruction count grows (not only for later lines). The
post recommends: fewer always-on instructions, universally applicable content
only, progressive disclosure (pointers + on-demand detail), no linter-as-LLM,
and hand-crafted (not `/init`) CLAUDE.md.

A 2026-07-18 deep-dive (seven read-only audits: project A–E + global G1–G2)
measured this repository's always-on stack at roughly **~4,090 instructions**
for an Arthurpower session (~20× the cited frontier band): L2 global rules
(~982 lines, largest dump), auto-loaded `docs/CONTEXT.md` (~600 instruction
units), project @import fan-out (notably full `git.md`), plus system + L1.
Additional defects: global rules leaking arthurpower skill names into every
session; project docs claiming hooks that are missing or unregistered in
`.claude/settings.json`; CONTEXT.md process/pitfall entries restating ADR-0002 /
0006 / 0007 without pointers.

Operator decisions (2026-07-18): Q1 delete dangling workspace CLAUDE pointer;
Q2 keep only universal AI-pitfall lines always-on; **Q3 aggressive** always-on
@import = `workflow` + `security-boundaries` only; Q4 CONTEXT curation = ADR
pointers first (not full glossary split); Q5 wire real hooks then fix docs;
Q6 accept this ADR; Q7 tracer order = honest gates first, then always-on cut.

## Decision

1. **Always-on budget is a first-class engineering constraint.** Target for an
   Arthurpower session: **≤ ~400–500 always-on instructions** (about 2× the
   150–200 band from that guidance, leaving headroom for system ~50 and project delta).
   Counting method: imperative units (NEVER/MUST, checklist rows, numbered
   steps), not line count alone. Skill bodies and explicit Read are **not**
   always-on.

2. **Progressive disclosure is the default layout.** Global and project
   `CLAUDE.md` hold only cross-task WHY / WHAT / HOW, NEVER/MUST, and **pointers**.
   Task-shaped SOPs (PR/tag flows, task templates, 30-case boundary libraries,
   full S1–S6 prose) live in on-demand rules, skill `references/`, or skill
   bodies. Prefer `file:line` and markdown links over `@import` when full-file
   injection is not required every session. `@import` injects; markdown links do
   not (see CONTEXT term `progressive disclosure` / `markdown link vs @ import`).

3. **Project always-on @import is aggressive (operator Q3=A).** Project
   `CLAUDE.md` may unconditionally `@import` only:
   - `.claude/rules/workflow.md`
   - `.claude/rules/security-boundaries.md`
   All other project rules (`git*`, `memory`, `code-quality`, `task-templates`,
   `boundary-testing*`, full `context-loop` body) are **on-demand** (pointer +
   Read when the task shape matches). Git basics needed every commit session
   must either fit inside those two files as one-line pointers or be enforced by
   hooks, not by re-@importing a 300-line `git.md`.

   §3.1 Amendment (2026-07-20, accepted as refinement of §3): In implementation,
   `git.md` is retained in `.claude/rules/` as always-on. Rationale: four eval
   gates (`007-git-hook-paths-exist`, `023-merge-conflict-doc`,
   `024-prototype-carveout-doc`, `025-changeset-doc`) hard-lock the path
   `.claude/rules/git.md`, and git discipline applies universally across
   commit / push sessions. The other four project rules (`context-loop.md`,
   `task-templates.md`, `code-quality.md`, `memory.md`) are moved out of
   `.claude/rules/` to `docs/rules/` per the §3 on-demand principle;
   `workflow.md` and `security-boundaries.md` remain always-on as originally
   permitted. This amendment is an evidence-based exception grounded in
   machine-assertable eval locks, not a re-import for convenience; the budget
   discipline of §3 stands.

   §3.2 Amendment (2026-07-20, accepted as second refinement of §3): All three
   remaining files (git.md, workflow.md, security-boundaries.md) moved from
   .claude/rules/ to docs/rules/. Rationale: (a) CLAUDE.md already carries
   the 7 Coding Principles + compressed project deltas (~90 lines), making
   prose-duplication of detailed rules pure noise; (b) hooks physically enforce
   the critical invariants (write authority, SSOT priority, conflict annotation,
   silent-fail) -- prose duplication of hook-enforced rules is redundant;
   (c) the four eval gates (007, 023, 024, 025) were updated to point
   to docs/rules/git.md in the same commit, so the prior machine-assertable
   lock that justified §3.1 is gone; (d) net always-on budget: 618 -> ~90 lines
   (CLAUDE.md only), an 85% reduction. .claude/rules/ is now empty;
   bootstrap.sh step 8 was updated to check docs/rules/ instead.

4. **Global layer stays cross-project.** Global `~/.claude/CLAUDE.md` and
   `~/.claude/rules/*` must not name arthurpower-only skills as if they were
   universal. Arthurpower execution entrypoints live under the plugin / project
   rules. Large global SOP dumps (especially `boundary-testing-protocol.md`)
   shrink to a short universal core; case libraries and YAML templates move to
   skill/on-demand references.

5. **Linter-as-LLM is forbidden for deterministic checks.** Branch naming,
   Conventional Commit shape, secret patterns, forbidden paths, and
   no-meta-specific greps are **hook / pre-commit / formatter** territory.
   Semantic gates (high-risk modules, unrelated refactor) stay LLM-judgment.
   Documentation must not claim a hook exists unless the file exists **and** is
   registered where the harness actually loads it.

6. **Honest gates before lean context (tracer order).** Implementation order
   for this ADR: (1) register or remove claimed hooks and fix false paths in
   docs; (2) cut always-on @import and global dumps. Do not optimize instruction
   budget while operators still trust non-firing gates.

7. **CONTEXT.md stays glossary SSOT under domain-modeling**, but process and
   ADR restatements become **one-line terms + pointer to ADR/rule/skill** (Q4=A).
   Full split into `docs/glossary/*` is out of scope for the first cycle.

8. **Verdict / plan SSOT unchanged:** ADR-0007 still owns `plans/<feature>.md`
   for ACR + writing-plans artifacts.

## Consequences

**Positive:**
- Models see fewer competing instructions; follow rate for the remaining NEVER/MUST should rise.
- Non-arthurpower projects stop paying for plugin-internal skill graphs in global rules.
- Operators can trust documented hooks after the honest-gate pass.
- Clear layering: always-on / on-demand / hook / skill body.

**Negative / follow-up:**
- Agents must Read more files mid-task; workflow.md and skills must name those paths explicitly.
- Aggressive Q3 means commit sessions no longer auto-load full `git.md` — commit-msg and pre-commit hooks must carry the deterministic half.
- Global ↔ `<workspace>\data\rules` junction/mirror discipline remains; edits must stay byte-consistent.
- Marketplace/cache skill copies still need three-layer sync when skill bodies absorb moved SOPs.
- CONTEXT corpus trim (process entries) is multi-commit; this ADR does not auto-delete history terms.

## Considered Options

### Option A: Always-on progressive disclosure + aggressive project @import + honest hooks first (accepted)
- Pros: matches the cited external evidence, measured 20× overshoot, operator Q1–Q7.
- Cons: more mid-task Reads; git discipline depends on hooks.

### Option B: Keep current @import set; only delete duplicate paragraphs
- Pros: smaller diff.
- Cons: leaves ~2.6–3.5× project-only overshoot; global dump untouched.

### Option C: Single mega CLAUDE.md with all rules inlined (reject the external guidance)
- Pros: one file to open.
- Cons: maximizes ignore risk; opposite of progressive disclosure.

## Why not B/C

B treats symptoms (duplicate tables) and leaves the budget failure mode. C
maximizes always-on instruction count and contradicts both the external guidance and the
measured failure mode (uniform instruction decay).
