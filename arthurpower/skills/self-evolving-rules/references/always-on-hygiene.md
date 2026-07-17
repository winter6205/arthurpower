# Always-on hygiene (Step 5 / Step 6 supplement)

> On-demand reference. Load when the iteration touches global L1, project
> `CLAUDE.md`, or any file that is `@import`-ed into always-on. Not loaded on
> memory-only or auto-memory-only iterations.

## Why this exists

Coding agents are mostly **stateless** across sessions. Always-on files
(`CLAUDE.md`, `@import` rules, auto-loaded context) are the only default
injection into every conversation. Every imperative unit in those files
competes for a finite **instruction budget**.

Frontier models follow roughly **150–200** instructions with reasonable
consistency. A typical harness system prompt already consumes ~50. Adding more
does **not** only push older lines out of attention — **instruction-following
quality decays uniformly** as the count grows. Models also bias toward the
prompt **peripheries** (system + CLAUDE.md at the start; latest user messages
at the end), so mid-file task-shaped SOPs are the first to be ignored when
the budget is tight.

## Progressive disclosure (load path, not capability cut)

Keep **capabilities**. Change **where** they load.

| Load path | What belongs | What does not |
|-----------|--------------|---------------|
| Always-on | Cross-task NEVER/MUST, thin pointers, universal pitfalls (≤2) | Task-shaped SOPs, case libraries, vendor-specific gotchas, volatile skill inventories |
| On-demand Read | Git / memory / code-quality SOPs, boundary case libraries, full S1–S6 prose | Universal NEVER/MUST that must fire every session |
| Hook / pre-commit | Deterministic checks (branch name, secret patterns, forbidden paths) | Semantic judgment (high-risk module?, unrelated refactor?) |
| Skill body | Procedural steps for a named skill | Global law phrased as if every repo installs the plugin |

Prefer **markdown links** and `file:line` pointers over `@import`. `@import`
injects the whole file into every session; a markdown link is clickable and
only loads when the agent Reads it.

## Instruction budget checklist (before Step 6 write)

For each new or rewritten always-on bullet, answer:

1. **Universal?** Would this fire on >50% of sessions for this project (or all
   projects if writing user-level L1)? If no → on-demand file + one-line pointer.
2. **Already said?** Grep same-topic bullets; collapse rewordings into one
   leading word or one bullet.
3. **Deterministic?** Could a hook / formatter / secret-scan enforce it without
   the model? If yes → register a real hook; do **not** add prose that claims a
   gate the harness does not run.
4. **Count.** Prefer fewer imperative units after the edit than before, unless
   the addition is proven universal and was missing.

## Honest gates before lean context

Documented hooks and CI gates that do not exist on disk (or are not registered
where the harness loads them) are worse than silence: operators trust a
non-firing guard. When evolving rules that mention gates:

1. Register or remove the claimed hook / path first.
2. Then cut always-on prose that only existed to restate the gate.

Do not optimize instruction budget while false gates remain.

## Glossary pointer, not dual prose

Process decisions that already live in an ADR should appear in project
`CONTEXT.md` (if at all) as **one-line terms + ADR path**, not a second full
restatement. Glossary = language SSOT; ADR = decision SSOT. Compressing long
glossary entries that restate ADRs is a valid Step 5 polish for
domain-modeling hand-off — this skill still does not write CONTEXT.md itself
(write authority stays with `domain-modeling`).

## Layer notes specific to always-on

| Surface | Always-on? | Hygiene note |
|---------|------------|--------------|
| User-level CLAUDE.md | Yes (all projects) | No dangling workspace paths; no vendor-specific pitfall dumps; no volatile skill counts (`N 项` / `28 auto-trigger`) |
| User-level rules/*.md | Yes if the harness loads the whole rules dir | Large SOP dumps (e.g. 300-line boundary case libraries) shrink to a short core + on-demand cases file |
| Project CLAUDE.md | Yes (this project) | Aggressive `@import` only for truly cross-task files (workflow + security is the current project lock under ADR-0008); rest = markdown links |
| Project `.claude/rules/*` not @imported | No (on-demand) | Keep full SOP here; do not re-@import under alias |
| Auto memory | Partial (index summary) | Session learnings only; do not dump always-on SOPs into MEMORY.md |

## Out of scope for this reference

- Authoring a new skill body → hand off to `arthurpower:skill-authoring`
- Writing `docs/CONTEXT.md` / ADR → `domain-modeling`
- Inventing new plugin product features (AFK, etc.)
