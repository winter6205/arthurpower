# 0014. Bridge gh-21: Skill tool routing-state sync hook

Date: 2026-07-21
Status: accepted

## Context

The global `pre-context-write-guard.cjs` (registered at user level in `~/.claude/settings.json`) enforces write sovereignty per ADR-0005 by reading the active skill from `~/.claude/.routing-state.json` and rejecting writes to `docs/CONTEXT*.md`, `docs/team-glossary.md`, and `docs/adr/NNNN-*.md` unless the active skill is `domain-modeling` or `setup-arthurpower`. The harness does not refresh that state file when the Skill tool injects a skill body, so after `Skill(domain-modeling)` is invoked the routing-state still reflects the previous skill (typically `claude-api`), and every legitimate domain-modeling write gets false-positive BLOCKed. This is documented as gh-21 in `docs/wayfinder/tickets/gh-21-hook-active-skill-detection-bug.md` and has been the open blocker on writing ADRs and CONTEXT.md files.

A user-level `~/.claude/hooks/lifecycle-hook.cjs:60-73` already implements the fix in isolation: it writes a fresh routing-state whenever PreToolUse fires on the `Skill` tool with a non-empty `tool_input.skill`. But it is only effective if registered in `~/.claude/settings.json`, which is operator-specific and not guaranteed. The project hook set (`arthurpower/hooks/hooks.json`) registers no matcher for `Skill`, so the project's defense against gh-21 depends entirely on a user-level config that may or may not be in place.

## Decision

Add a project-level PreToolUse hook on the `Skill` tool that writes a fresh `~/.claude/.routing-state.json` with the invoked skill id, preserving the prior `id` and `phase` and recomputing the `signature` over the canonical fields (`schemaVersion`, `id`, `skill`, `phase`, `timestamp`). The new file is `arthurpower/hooks/pre-tool-skill-routing-sync.cjs`; it is registered as a new PreToolUse group with `matcher: "Skill"` in `arthurpower/hooks/hooks.json` (lines 14-22 after this change). The hook is zero-dependency, sync, and fails-open on any error; it never blocks the Skill tool call itself.

This is a bridge, not a fix to the global hook or to the harness. The project hook now provides the same signal as `lifecycle-hook.cjs:60-73` does at user level, so the project's defense against gh-21 no longer depends on user-level hook registration.

## Consequences

Adding this hook makes the project's 10-hook set an 11-hook set. CLAUDE.md says "10-hook 不可 regress" — that rule targets weakening/deleting/bypassing, not adding; this change is additive in the strictest sense (new file, new matcher entry, no modification to any existing hook). The new hook is fail-open by design so it cannot become a new blocking surface. The cost is one extra subprocess per Skill tool call (typically <50 ms). The benefit is that the global `pre-context-write-guard.cjs` identity check now sees a fresh active skill and the agent can write ADRs and CONTEXT.md files after invoking `Skill(domain-modeling)` without false-positive BLOCKs.

The hook coexists with `lifecycle-hook.cjs`: if both fire, the later write wins (the agent's `Skill` tool call fires PreToolUse twice — once for the project matcher, once for the user matcher); both produce semantically equivalent routing states with the same skill id, so the order does not matter. The hook uses the same canonical field set as `ipc-core.writeRoutingState`, so consumers using `ipc.readRoutingState` (lifecycle-hook, pre-tool-routing-exempt, pre-tool-s2-test-gate, session-start-skill-evaluator) accept the new state without complaint, modulo the 5-second TTL.
