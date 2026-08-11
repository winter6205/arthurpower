---
name: using-agent-skills
description: Use when starting a new session, switching tasks, or unsure which arthurpower skill applies. Routes incoming work to the matching skill via flowchart before invoking. Activates on phrases like "which skill should I use", "skill check", "pre-task skill check", "how to start", "router", "skill routing", or when multiple competing skills could apply. Does NOT auto-trigger symlink skills.
bucket: engineering
type: discipline
---

# Using Agent Skills

## When to use

Trigger this skill when any of the following arrive:

- A new session begins and the first task has not been classified
- The user asks "which skill should I use" / "how do I start" / "skill check" / "pre-task skill check" / "skill routing"
- A task arrives that could match multiple skills (ambiguous routing)
- A symlink-style skill is being considered (these require explicit user trigger)
- Switching from one task class to another mid-session (e.g., planning → implementing → verifying)
- Before invoking any `arthurpower:*` skill on a non-trivial task, to confirm the right gate is being applied

## When not to use

Do NOT trigger this skill for:

- A clearly classified task already matched to a single skill (skip the router and invoke directly)
- One-line typo fixes, single-file edits, trivial config tweaks
- Code review of a small diff with no routing question
- When the user has explicitly named a skill (use that skill directly)
- General research / web search / writing tasks outside the agent skill graph
- Tasks covered by `update-config`, `init`, or other harness-level skills

## Overview

Skill router for the arthurpower:* skill collection. Entry point for session start, task switching, and "which skill" routing. Check flowchart before system prompt defaults; invoking symlink skills without explicit trigger is forbidden.

## Procedure

### Scale router

Route by scope certainty and session scale before choosing the task-class branch:

- **Scope 已定，single session** → `deep-dive-protocol`.
- **Scope 已定，multi-session** → `architecture-change-reviewer` + `writing-plans`.
- **Scope 未定，multi-session** → `architecture-change-reviewer` + `writing-plans` + `session-handoff`.

The scale route selects the required sequence; the flowchart then selects the focused task-class skill within that sequence.

1. Classify the incoming task against the flowchart in `references/flowchart.md`. Pick the single best matching branch (Defining / Planning / Implementing / Verifying / Reviewing / Committing / Meta).
2. If the match points to a symlink-style skill (any skill listed under "Restricted" in the Quick Reference Table), STOP and require the user to name it explicitly. Do not auto-invoke.
3. If the match is a gate skill (ACR, writing-plans, verification-before-completion), run it before doing the underlying work; gates are mandatory, not advisory.
4. Invoke exactly one targeted skill via the Skill tool. State the routing decision in one sentence before invocation.
5. Verify after invocation: confirm the chosen skill matches the task class and that no symlink skill was auto-triggered.

## Skill Discovery

See `references/flowchart.md` for the full decision flowchart. Branches: Defining / Planning / Implementing / Verifying / Reviewing / Committing / Meta.

## Core Operating Behaviors

See `references/behaviors.md` for the six operating behaviors (assumptions, confusion, push-back, simplicity, scope, verify).

## 维护纪律

Promoted skill add / rename / remove / flow-placement MUST update this router file (and `references/quick-reference.md`) in the same commit. The invariant is enforced by the physical hook `arthurpower/hooks/pre-release-validate.cjs` (PreToolUse on `Write|Edit|MultiEdit|Bash`) and recorded in `docs/agents/contributor-guide.md`. Drift between the filesystem (`arthurpower/skills/`) and the router surfaces as a non-blocking `[FAIL] router:missing-reference skills/<name>` advisory; fixing it is a precondition for shipping that ticket.

Trigger cases (all four require a router update in the same commit):

- **Add** — a new directory under `arthurpower/skills/<name>/SKILL.md` is added at promotion time. Add a row in `references/quick-reference.md` and reference the name in `SKILL.md` prose.
- **Rename** — a skill directory is renamed. Update the row in `references/quick-reference.md` and replace prose mentions in `SKILL.md` (and the flowchart in `references/flowchart.md` if the skill was named there).
- **Remove** — a skill directory is removed. Remove its row from `references/quick-reference.md` and strip prose mentions from `SKILL.md`. See also git workflow history hygiene in `docs/rules/git.md`.
- **Flow-placement** — an existing skill moves to a different phase (Defining / Build / Verify / Review / SSOT / Setup / Restricted / User-invoked / Model-invoked). Update the phase column in `references/quick-reference.md` and the corresponding branch in `references/flowchart.md` if the skill is named in the tree.

Cross-reference: `docs/agents/contributor-guide.md` for the full contributor contract (router rule + docs-page presence for promoted skills, the latter to be enforced by the docs-page-frame extension in T9).

## Failure Modes to Avoid

1. Invoking symlink skill without explicit trigger
2. Skipping ACR before multi-file change
3. 1 commit violation: mega-commit instead of 1 commit = 1 task
4. typed-error violation: null/-1 instead of typed error
5. test-first violation: writing tests after code
6. 1 commit violation: modifying orthogonal code as "cleanup"
7. Reaching for comprehensive skill when focused one suffices
8. Skipping verification step
9. Sycophantic agreement to bad approach
10. 1 commit violation: treating refactor as feature commit

## Skill Rules

1. Always check flowchart before invoking any skill. Symlink skills require explicit trigger.
2. ACR + writing-plans are gates, not suggestions. Multi-file change without ACR = 1 commit scope violation.
3. Symlink skills are tools, not defaults. Don't auto-trigger them.
4. **Context-loop wiring**: When any downstream skill touches `docs/CONTEXT.md` / `docs/CONTEXT-MAP.md` / `docs/adr/`, route writes through `domain-modeling` (write authority) and route reads through `docs/agents/context-contract.md` (read-side contract). The physical hook `pre-context-write-guard.cjs` enforces schema at PreToolUse.

## Quick Reference Table

See `references/quick-reference.md` for the full table (auto-trigger vs restricted skills).

### Registered skills (router mirror)

The router invariant requires every promoted skill under `arthurpower/skills/`
to be named here. Names listed in alphabetical order so the substring check
in `pre-release-validate.cjs` is greppable by skill directory basename.
Add / rename / remove entries here in the same commit that touches the
skill directory. For full per-phase routing (auto-trigger vs restricted vs
gates) see `references/quick-reference.md`.

- architecture-change-reviewer
- bounded-context-guardian
- code-review
- complexity-anti-drift
- deep-dive-protocol
- defensive-contract-validator
- dispatching-parallel-agents
- domain-modeling
- error-handling-enforcer
- minimal-change-verifier
- self-evolving-rules
- session-handoff
- setup-arthurpower
- skill-authoring
- spec-driven-development
- systematic-debugging
- test-driven-development
- using-agent-skills
- verification-before-completion
- wayfinder
- writing-plans

## Acceptance Criteria

Mark complete only if ALL of the following are true (binary yes/no):

- [ ] Did I run the flowchart classification step before selecting any skill?
- [ ] Does the chosen skill match exactly one documented task class?
- [ ] Did I refuse to auto-trigger any symlink skill without explicit user naming?
- [ ] Did I state the routing decision in one sentence before invoking the skill?
- [ ] Is the gate-skill (ACR / writing-plans / verification-before-completion) check performed before downstream work?
- [ ] Did I avoid stacking multiple skills when a focused single skill suffices?
- [ ] Did I avoid the "comprehensive catch-all" reflex (selecting a meta skill when a domain-specific one applies)?

## Verification

Skill type: discipline
Bar level: discipline

Run before declaring this router step complete:

```bash
# Confirm skill directory layout (symlink skills live alongside the canonical router)
ls ~/.claude/skills/arthurpower/skills/using-agent-skills/

# Confirm referenced sub-skills exist (replace <name> with chosen target)
test -f ~/.claude/skills/arthurpower/skills/<name>/SKILL.md && echo "OK: <name> skill present"

# Confirm no symlink auto-trigger (recent Skill tool invocations should not include symlink skills)
grep -l "skill-authoring\|self-evolving-rules\|dispatching-parallel-agents" \
  ~/.claude/skills/arthurpower/skills/using-agent-skills/SKILL.md >/dev/null && echo "router is reference-only"
```

Manual checks:

- Re-read the flowchart branch that was selected and confirm the task fits the branch label.
- If a symlink skill was selected, confirm the user explicitly named it in the prompt.

## Required Baseline

The minimum invariant this skill guarantees:

> No skill is invoked without (1) flowchart reference, (2) match to a documented task class, and (3) no symlink auto-trigger.

If any of these three is missing, the router MUST halt and either reclassify or request explicit user input.

## Rationalization Table

| Rationalization | Counter-evidence | Required action |
|-----------------|------------------|-----------------|
| "I already know which skill fits, skip the flowchart." | Flowchart exists precisely because memory-based selection misses gates and triggers wrong symlinks. | Re-read the flowchart before invoking. |
| "The symlink skill is convenient, just invoke it." | Symlink skills require explicit user trigger; auto-invoking breaks the router contract. | Stop, ask the user to name the skill. |
| "This task is too small to route." | Trivial tasks still need the gate check; many bugs originate from skipping gates. | Apply `minimal-change-verifier` at minimum. |
| "I'll invoke multiple skills in parallel, more coverage." | Stacking skills obscures accountability and breaks the one-skill-per-task-class contract. | Pick the single best match; invoke only that. |
| "The user implied the skill, that's enough." | "Implied" ≠ explicit; symlink skills especially need exact naming. | Confirm by asking the user to state the skill name. |
| "ACR / writing-plans is overhead for a small change." | Gates are mandatory precisely because small changes still touch shared code. | Run the gate; it returns fast when not applicable. |

## Red Flags - STOP

Halt and re-classify if any of the following appear:

- About to invoke a symlink skill (skill-authoring, self-evolving-rules, dispatching-parallel-agents) without the user naming it explicitly.
- Skipped the flowchart for a multi-file change.
- Selecting a comprehensive / catch-all skill when a focused one suffices.
- Treating a refactor as part of a feature commit (1 commit = 1 logical task violation).
- Auto-triggering based on system-prompt defaults instead of explicit user signal.
- Stacking two routing skills ("I'll invoke both ACR and arthurpower:code-review") when one is the gate.
- Reaching for `verification-before-completion` before the implementation actually runs (gate ordering violation).

## References

- `references/flowchart.md` — Full decision flowchart with all branches
- `references/behaviors.md` — Core Operating Behaviors (assumptions, confusion, push-back, simplicity, scope, verify)
- `references/quick-reference.md` — Quick Reference Table for auto-trigger vs restricted skills
- Context closed-loop contract — write authority + read contract + ADR gate
- `~/.claude/hooks/pre-context-write-guard.cjs` — Physical guardrail for CONTEXT.md / ADR schema

