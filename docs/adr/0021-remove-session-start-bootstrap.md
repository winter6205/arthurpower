# 0021. Removing the `session-start.sh` constraint bootstrap

Date: 2026-07-29
Status: accepted

## Gate check

1. **Hard to reverse**: yes. Reversing means re-registering `SessionStart` in
   `arthurpower/hooks/hooks.json` (12 lines of JSON), re-creating
   `arthurpower/hooks/session-start.sh` (the deleted text), and re-syncing the
   four docs that drop the reference. The `.sh` cannot be recovered from git
   once this commit lands without a re-write — it was a 3-line shell script,
   not a complex artifact, but the contract (SessionStart bootstrap in
   plugin hooks) is the unit being retired.
2. **Surprising without context**: yes. A future maintainer opening
   `arthurpower/hooks/` will find no `session-start.sh`, no `SessionStart`
   block in `hooks.json`, and CLAUDE.md claiming "10-hook 不可 regress" —
   they will ask "where did the constraint bootstrap go, and why is the
   hook count now 12 instead of 13?". Without this ADR the natural response
   is to re-add the script, silently re-introducing the contamination this
   decision removes.
3. **Real trade-off**: yes. Three defensible options existed (drop SessionStart;
   detect main-agent vs subagent and inject only into subagent; shorten the
   text). Each has distinct downsides, enumerated below.

All three conditions pass; ADR is recorded.

## Context

`arthurpower/hooks/session-start.sh` was a 3-line shell script registered as a
`SessionStart` hook in `arthurpower/hooks/hooks.json`. Its sole purpose was to
`echo` two lines to stdout at the start of every session:

```
arthurpower active: engineering changes must respect Core Skill constraints—bounded context, contract correctness, error handling, architecture review, complexity control, and minimal change.
Use descriptions to choose specific skills; load only matching skills and avoid long workflow injection.
```

Claude Code's hook runtime folds hook stdout into the agent's system context,
so every agent session — main and subagent alike — received those two lines
as a `<system-reminder>` block before its first turn.

Three problems surfaced as the plugin's agent/skill architecture matured:

1. **Redundancy with agent definitions.** The six "Core Skill constraints"
   summarised in the bootstrap (S1 bounded context, S2 contract correctness,
   S3 error handling, S4 architecture review, S5 complexity control, S6
   minimal change) are each owned by a dedicated verifier agent —
   `bounded-context-guardian-agent`, `defensive-contract-validator-agent`,
   `error-handling-enforcer-agent`, `complexity-anti-drift-agent`,
   `minimal-change-verifier-agent` — whose `description` frontmatter names
   the S-rule and whose body spells out the binary criteria and procedure.
   When a verifier agent is invoked, it already carries the rule in its own
   context. The bootstrap was a single-paragraph paraphrase of rules whose
   authoritative definitions live elsewhere.
2. **Terminology drift.** The bootstrap called S5 "complexity control"; the
   agent definition calls it "Anti-Drift / complexity-anti-drift". Future
   rule renames would have to be hand-synced in two places, with no
   compiler to catch the drift. The single-paragraph summary was
   structurally doomed to lag behind the canonical definitions.
3. **Main-agent context contamination.** The orchestrating main agent
   carries the user-facing conversation context. Every bootstrap line
   injected into the main agent eats prompt-cache space and reading budget
   that should go to user work. The orchestrator's job is dispatch and
   synthesis; the S-rules are the verifier agents' job. Carrying both
   copies of the rule was the worst of both worlds: the main agent saw a
   stale paraphrase, and the verifier agents re-derived the rule from
   their own definitions anyway.

This decision interacts with two prior ADRs / project rules:

- **CLAUDE.md "10-hook 不可 regress"**: the rule applies to *weakening,
  deleting, or bypassing* hooks. This decision deletes one hook with a
  recorded ADR — exactly the carve-out the rule contemplates. The 12
  remaining arthurpower plugin hooks (`pre-tool-skill-routing-sync`,
  `pre-context-write-guard`, `pre-stale-read`, `pre-release-validate`,
  `pre-read-contract`, `post-ssot-priority`, `post-conflict-annotation`,
  `defend-claim-execution`, `defend-claim-cite-integrity`,
  `defend-claim-dumb-zone`, `defend-claim-silent-fail`,
  `defend-claim-report-triple`) are untouched.
- **ADR-0008 (always-on progressive disclosure)**: skill / agent
  descriptions are loaded by Claude Code only when the agent/skill is
  invoked or considered. The verifier agents' S-rules reach context via
  their own descriptions — they do not require a SessionStart bootstrap
  to be present. Removing the bootstrap aligns with the progressive-
  disclosure model: rules load when relevant, not at session start.

## Decision

Remove the `SessionStart` constraint bootstrap from the arthurpower plugin.

1. **Drop the registration.** Remove the `SessionStart` array from
   `arthurpower/hooks/hooks.json`. No replacement registration is added.
2. **Delete the script.** Remove `arthurpower/hooks/session-start.sh`
   outright. The 3 lines of `echo` text it contained were the entire
   artifact; archival is unnecessary.
3. **Sync the four referencing docs.** Update the four docs that name
   the script so they do not point at a non-existent file:
   - `arthurpower/hooks/README.md` — drop the "Real hooks live in
     `hooks.json` and `session-start.sh`" sentence.
   - `docs/rules/git.md` — drop the `session-start.sh` row from the
     hook inventory table.
   - `docs/Arthuropower_usage.md` — drop the `session-start.sh` rows
     from the plugin-tree listing and the hook table; drop the
     `session-start.sh` mention in the post-tool reference block.
   CHANGELOG.md, Regress reports, archive/, and plan/ documents are
   historical and untouched.
4. **No comment edits in `pre-context-write-guard.ts`.** That file
   contains three comments referring to "session-start" — line 207
   ("session-start evaluator contract" — a naming collision referring to
   that file's own internal contract, not the hook script), line 228
   ("session-start injection never fire PreToolUse:Skill" — describing
   the absence of a PreToolUse refresh on any non-Skill-tool activation,
   which remains true), and line 480 (same description, in the gh-43
   corroboration context). All three are descriptive comments that remain
   accurate after the deletion — none depend on the script existing.

**Preserved (explicit non-changes):** the 12 non-SessionStart plugin
hooks are untouched; the verifier agents' S-rule definitions are
untouched; ADR-0020's global `pre-tool-guard.ts` is untouched; the
project's pre-commit / lint-staged / `.git/hooks` configurations are
untouched.

## Consequences

**Positive:**
- Main-agent context is no longer contaminated by a stale single-
  paragraph paraphrase of rules whose canonical definitions live
  elsewhere. The orchestrator's reading budget is freed for user work.
- S-rule definitions have a single source of truth: each verifier
  agent's `description` + body. There is no second copy in
  `session-start.sh` to drift.
- Verifier agents' rule bodies reach context *when they are invoked*,
  matching the always-on progressive-disclosure model (ADR-0008). An
  agent that is never invoked pays no context cost; an agent that is
  invoked gets the canonical rule, not a paraphrase.
- The 13 → 12 hook reduction removes a non-blocking, non-load-bearing
  shell process from every session start — a small but real latency
  improvement on cold start.

**Negative / trade-off:**
- A human reading the source tree for the first time will not see the
  S-rules listed anywhere unless they read the verifier-agent files.
  This is mitigated by `docs/rules/` and the S-rule table inside
  `arthurpower-audit-agent`'s description.
- The deleted bootstrap was the only place where S4 "architecture
  review" had any textual anchor (no `architecture-review-agent` file
  exists; the role is filled by `architecture-change-reviewer-agent`).
  S4 now has no bootstrap line but the verifier agent's description
  covers it on demand. If S4 ever needs a persistent home, an ADR
  records it.
- Once this commit lands, the previous session's already-injected
  `<system-reminder>` cannot be retroactively removed. The change
  affects only sessions that start *after* the commit.

## Considered Options

### Option A: Drop `SessionStart` outright (adopted)
- Pros: kills the redundancy, the drift, and the main-agent
  contamination in one move; verifier agents carry the canonical rule;
  no detection logic to maintain; aligns with ADR-0008 progressive
  disclosure.
- Cons: requires an ADR (CLAUDE.md rule); S4 loses its only textual
  anchor outside the `architecture-change-reviewer-agent` description;
  the previous session's injection cannot be undone.

### Option B: Inject only into subagent sessions (rejected)
- Pros: keeps the bootstrap reachable for subagent context; reduces
  main-agent contamination to zero.
- Cons: subagent sessions already receive the canonical S-rules via
  the verifier-agent `description` when the agent is invoked — the
  bootstrap line in subagent context is the same paraphrase carrying
  the same drift. Detection of "main vs subagent" via env vars
  (`CLAUDE_AGENT_ROLE` etc.) is not a stable API surface; building
  detection on top of it would add maintenance for zero information
  gain over Option A. Rejected on "no information gain".

### Option C: Shorten the bootstrap text to a one-liner (rejected)
- Pros: smaller token cost on the main agent; no detection logic.
- Cons: does not fix the redundancy (verifier agents still carry the
  canonical rule) and does not fix the drift (the one-liner is still a
  paraphrase that has to be hand-synced). Smaller contamination, same
  root problem. Rejected as half-measure.

## Why not B / C

**B adds detection logic to solve a problem that has already been
solved** — the verifier agents carry the canonical rules. Building a
main-vs-subagent detector to re-inject a paraphrase of those same
rules into the subagent is pure overhead.

**C reduces the symptom without addressing the cause.** The cause is
that the canonical rules live in the verifier-agent files and the
bootstrap is a paraphrase; any paraphrase, however short, drifts.

**A is the only option that retires the duplicate source of truth and
leaves the canonical definitions as the sole carrier** — which is the
single change that prevents the drift from recurring.

## References

- `arthurpower/hooks/hooks.json` — `SessionStart` block removed.
- `arthurpower/hooks/session-start.sh` — deleted.
- `arthurpower/hooks/README.md`, `docs/rules/git.md`,
  `docs/Arthuropower_usage.md`
  — sync edits (drop `session-start.sh` mentions).
- Verifier-agent single sources of truth (untouched):
  `arthurpower/agents/bounded-context-guardian-agent.md` (S1),
  `defensive-contract-validator-agent.md` (S2),
  `error-handling-enforcer-agent.md` (S3),
  `complexity-anti-drift-agent.md` (S5),
  `minimal-change-verifier-agent.md` (S6),
  `architecture-change-reviewer-agent.md` (S4).
- ADR-0008 — always-on progressive disclosure (verifier agents'
  `description` + body are the canonical carrier; SessionStart was the
  pre-disclosure ancestor).
- ADR-0020 — global `pre-tool-guard.ts` consolidation (the global
  registration is machine state, not affected by this ADR; only the
  plugin-local `SessionStart` is).
- CLAUDE.md "10-hook 不可 regress" — this ADR is the explicit
  carve-out for the one-hook deletion; the 12 remaining plugin hooks
  remain untouched.