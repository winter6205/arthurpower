# Harness Map — Cross-harness Asset Inventory

> **Scope:** Plugin-level (`arthurpower`) and user-level (`~/.claude/`) assets the
> plugin references, depends on, or composes with. Authoritative inventory for
> v0.7.0+ implementation and a single seam for future scope growth.

## 1. Six user-level review agents

These personas live in `~/.claude/agents/` and are reachable from slash
commands (`/review`, `/audit`, `/fanout`; `/test` `/ship` are **dead refs** —
no such command exists, see OD-03) and from `dispatching-parallel-agents`
fan-out (current agent launches workers).

| Persona                        | File                                               | Role                      | Primary trigger                                     | Notes                                                                                                        |
| ------------------------------ | -------------------------------------------------- | ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `code-reviewer`                | `~/.claude/agents/code-reviewer.md`                | Senior Staff Engineer     | five-axis review before merge                       | **archived 2026-07-24, ADR-0017; superseded by `arthurpower:code-review` dual-subagent**                     |
| `quick-reviewer`               | `~/.claude/agents/quick-reviewer.md`               | Fast lightweight reviewer | lint pass, small diffs, quick correctness           | suitable substitute for `code-reviewer` when wall-clock matters more than depth                              |
| ~~`maintainability-reviewer`~~ | ~~`~/.claude/agents/maintainability-reviewer.md`~~ | ~~Third-stage reviewer~~  | —                                                   | **removed**; S1-S6 is per-skill or `/audit`. Review repair is `review-report-repair`.                        |
| `project-code-quality-auditor` | `~/.claude/agents/project-code-quality-auditor.md` | Project-level auditor     | full round of changes complete, before reporting up | seven-dimension architecture-grade audit via Serena MCP                                                      |
| `security-auditor`             | `~/.claude/agents/security-auditor.md`             | Security Engineer         | vulnerability detection, OWASP-style audit          | pair with `security-and-hardening` user-invoked skill (v0.12.0 moved to `~/.claude/skills/`) for hard review |
| `test-engineer`                | `~/.claude/agents/test-engineer.md`                | QA Engineer               | test strategy, coverage analysis, Prove-It pattern  | pair with `input-contract-tests` for boundary coverage                                                       |

**Personas do not invoke other personas.** Composition is the job of slash
commands, the user, or the current agent running `dispatching-parallel-agents`.
`arthurpower:code-review` is the active review entry point.

## 2. User-level review skill

| Skill                     | File                                                | Loaded by                                                     | Purpose                                                                                                                                   |
| ------------------------- | --------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `code-review-and-quality` | `~/.claude/skills/code-review-and-quality/SKILL.md` | `code-reviewer` persona, any agent producing a review verdict | **archived 2026-07-24, ADR-0017; superseded by `arthurpower:code-review` dual-subagent (standards-reviewer-agent + spec-reviewer-agent)** |

This skill existed as a dangling reference in `~/.claude/agents/README.md` and
in the `code-reviewer` persona body (L12). v0.7.0 built it; ADR-0017 then
archived it in favour of the dual-subagent orchestration.

## 3. Three previously deferred assets — disposition

These three conflicts surfaced in 14-round adversarial self-review. Each has a
documented resolution now.

| #   | Asset                                                                                        | Original deferral                                                      | Final disposition (v0.7.0)                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `code-review-and-quality` skill                                                              | README and code-reviewer referenced a skill that did not exist on disk | **Built** at `~/.claude/skills/code-review-and-quality/SKILL.md`; model-invoked discipline skill; validated by `validate_skill.py` _(superseded by ADR-0017, 2026-07-24: archived, replaced by `arthurpower:code-review` dual-subagent)_ |
| 2   | `code-reviewer` L67 "Do not invoke from another persona" vs `arthurpower-dispatcher` fan-out | Prose warning conflicted with orchestrator pattern                     | **Resolved** by adding orchestrator exception to L67; dispatcher is not a persona, so the rule does not bind it                                                                                                                          |
| 3   | Three-body S1-S6 overlap (ACR + arthurpower-audit-agent + maintainability-reviewer)          | All three audited S1-S6 with no documented decision-location           | **Partitioned** by scope and time-point — see section 4 below                                                                                                                                                                            |

## 4. Three-body S1-S6 decision-location table

| Asset                                                                        | Type  | Time-point                         | Trigger                                                                      | Scope                         | Verdict format                                                                             |
| ---------------------------------------------------------------------------- | ----- | ---------------------------------- | ---------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `architecture-change-reviewer` (plugin skill)                                | Skill | **Before** implementation          | multi-file change (3+ files), new feature, refactor across module boundaries | arthurpower plan              | 5-verdict (S1-S6 + minimal-change), pre-impl gate                                          |
| `arthurpower:code-review` (plugin skill, v0.7.0 new; ADR-0017 dual-subagent) | Skill | **After** implementation, pre-land | conditional: ticket produces code diff                                       | any Git diff                  | dual-axis (standards-reviewer + spec-reviewer) side-by-side, High/Medium/Low severity gate |
| `review-report-repair` (plugin skill)                                        | Skill | **After** `GATE: BLOCKED`          | unresolved High, or operator-supplied findings report                        | same diff as the review       | root-cause clusters; does not re-review                                                    |
| `arthurpower-audit-agent` (plugin agent)                                     | Agent | **After** implementation, on ask   | "audit", "S1-S6", "审计"                                                     | arthurpower self-changes only | 6-rule PASS/FAIL with file:line evidence                                                   |
| ~~`maintainability-reviewer`~~ (user agent)                                  | Agent | —                                  | —                                                                            | —                             | **removed**; not a plugin stage                                                            |

**The partition is by time-point and scope, not by which rules are checked.**
All three audit S1-S6; what differs is **when** they fire and **what diff** they
operate on.

## 5. Companion plugin-level assets

| Asset                                    | File                                                            | Role                                                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `arthurpower-audit-agent`                | `plugins/arthurpower/agents/arthurpower-audit-agent.md`         | One-shot maintainability audit agent, S1-S6 with verification gate                                                                |
| ~~`arthurpower-dispatcher`~~             | `archive/agents/arthurpower-dispatcher-2026-08-20/`             | Archived 2026-08-20. Fan-out is the `dispatching-parallel-agents` skill.                                                          |
| ~~`test-driven-development-agent`~~      | `archive/agents/test-driven-development-agent-2026-09-14/`      | Archived 2026-09-14. S4 process audit overlapped Spec axis + VBC; write-time discipline stays on `test-driven-development` skill. |
| ~~`defensive-contract-validator-agent`~~ | `archive/agents/defensive-contract-validator-agent-2026-09-14/` | Archived 2026-09-14. Replaced by thin `input-contract-tests` skill (no default agent).                                            |
| `review-report-repair`                   | `plugins/arthurpower/skills/review-report-repair/SKILL.md`      | Next slot after `code-review` `GATE: BLOCKED`                                                                                     |
| `/audit` command                         | `plugins/arthurpower/commands/audit.md`                         | Single-shot audit entry point                                                                                                     |
| `/fanout` command                        | `plugins/arthurpower/commands/fanout.md`                        | Loads `dispatching-parallel-agents`; current agent fans out workers                                                               |

## 6. Maintenance

When a new user-level or plugin-level asset enters the inventory, add a row
in the relevant table above. When an asset is removed or replaced, mark its
row with `~~strikethrough~~` and add a one-line note pointing to the
replacement.
