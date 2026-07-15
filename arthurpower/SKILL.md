---
name: arthurpower
description: Use when the user asks which skill to apply, requests a pre-task skill check, asks for a router or skill routing, mentions switching tasks, or has an ambiguous request where multiple arthurpower skills plausibly apply. Triggers on phrases like "which skill should I use", "skill check", "pre-task skill check", "how to start", "router", "skill routing", "which arthurpower skill applies", "I don't know which one", "help me pick a skill". Routes incoming work to the matching skill via the using-agent-skills flowchart before any other invocation.
---

# arthurpower

## When to use

Use this umbrella skill when the user is unsure which arthurpower skill applies, when starting a new session without a clear task-to-skill mapping, when switching between unrelated task types, or when the user explicitly asks for a skill check, router, or pre-task routing. It is the entry point that dispatches to the canonical arthurpower skills (bounded-context-guardian, defensive-contract-validator, error-handling-enforcer, complexity-anti-drift, minimal-change-verifier, spec-driven-development, writing-plans, systematic-debugging, dispatching-parallel-agents, verification-before-completion, and others).

## When NOT to use

Do not use this skill when the task type is already obvious (a clear bug fix → systematic-debugging, a clear refactor → complexity-anti-drift, a clear plan → writing-plans). Do not use when the request is about creating or editing a skill itself — route to `skill-authoring` directly. Do not use for coding, debugging, refactoring, planning, implementation, docs, CLAUDE.md, memory, or rules tasks — those have their own dedicated skills.

## Procedure

1. Receive the user's request or current task context.
2. Run the routing flowchart from `using-agent-skills`: classify by task shape (new feature vs bug vs refactor vs plan vs audit).
3. Identify the single canonical arthurpower skill that matches the task shape.
4. Confirm with the user if classification is ambiguous between 2+ skills; do not auto-invoke on guess.
5. Invoke the matched skill via the Skill tool with the request as args.
6. If no arthurpower skill matches, fall back to native tools or report `[NEED_MORE_INFO]` per workflow rules.

## Acceptance Criteria

- The router identifies exactly one canonical arthurpower skill per request, or pauses with `[NEED_MORE_INFO]` when classification is ambiguous.
- The matched skill is invoked through the Skill tool, not by manual instruction-following.
- Auto-trigger symlink skills (manual-only) are never invoked without explicit user request.
- The user is informed of the routing decision before the matched skill runs.

## Verification

- Confirm the chosen skill's description matches the request's trigger phrases.
- Confirm the chosen skill is canonical (not a symlink) by checking `~/.claude/skills/arthurpower/skills/<name>/SKILL.md` exists.
- If a symlink skill was the only match, stop and ask the user to confirm explicit invocation.
- After the matched skill completes, confirm the task shape was correctly classified retroactively.
