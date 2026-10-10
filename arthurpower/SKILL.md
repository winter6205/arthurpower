---
name: arthurpower
description: Use when the user asks which skill to apply, requests a pre-task skill check, asks for a router or skill routing, mentions switching tasks, or has an ambiguous request where multiple arthurpower skills plausibly apply. Triggers on phrases like "which skill should I use", "skill check", "pre-task skill check", "how to start", "router", "skill routing", "which arthurpower skill applies", "I don't know which one", "help me pick a skill". Routes incoming work to the matching skill via the using-agent-skills flowchart before any other invocation.
---

# arthurpower

## When to use

Use this umbrella skill when the user is unsure which arthurpower skill applies, when starting a new session without a clear task-to-skill mapping, when switching between unrelated task types, or when the user explicitly asks for a skill check, router, or pre-task routing. It is the entry point that dispatches to the canonical arthurpower skills (bounded-context-guardian, input-contract-tests, error-handling-enforcer, complexity-anti-drift, minimal-change-verifier, spec-driven-development, writing-plans, systematic-debugging, dispatching-parallel-agents, verification-before-completion, and others).

## When NOT to use

Do not use this skill when the task type is already obvious (a clear bug fix → systematic-debugging, a clear refactor → complexity-anti-drift, a clear plan → writing-plans). Do not use when the request is about creating or editing a skill itself — route to `skill-authoring` directly. Do not use for coding, debugging, refactoring, planning, implementation, docs, CLAUDE.md, memory, or rules tasks — those have their own dedicated skills.

## Procedure

1. Receive the user's request or current task context.
2. Run the routing flowchart from `using-agent-skills`: classify by task shape (new feature vs bug vs refactor vs plan vs audit).
3. Identify the task class and, if a documented sequence applies, the **current slot** only (do not stack SPECIFY + ACR + PLAN in one turn).
4. Confirm with the user if two **competing** skills share the same slot; do not auto-invoke on guess.
5. Invoke that skill via the Skill tool. `skill-authoring` and `self-evolving-rules` wait for the operator to name them.
6. If no arthurpower skill matches, fall back to native tools or report `[NEED_MORE_INFO]` per workflow rules.

## Acceptance Criteria

- One task class per request, or `[NEED_MORE_INFO]` when classification is ambiguous.
- Documented sequences invoke only the current slot.
- `skill-authoring` and `self-evolving-rules` are never started unless the user named them.
- The user is informed of the routing decision before the matched skill runs.

## Verification

- Confirm the chosen skill's description matches the request's trigger phrases.
- Confirm the skill directory exists under `skills/<name>/SKILL.md`.
- After the matched skill completes, confirm the task shape was correctly classified retroactively.
