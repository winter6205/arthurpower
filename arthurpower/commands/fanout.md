---
description: Fan out N independent tasks as parallel worker subagents from the current agent and merge dispatched/passed/failed. Use when 2+ checks have no shared mutable state.
allowed-tools: Read, Grep, Glob, Bash, Agent
argument-hint: <check1; check2; ...>  (semicolon-separated independent tasks)
---

# /fanout

Fan out independent tasks. This command **loads `dispatching-parallel-agents`**: the current agent writes 7-field prompts and launches worker subagents in one message.

## When to use

2+ checks that are independent (no shared mutable state, no ordering). Example:

```
/fanout S1 check on src/auth/; S3 check on src/api/; S5 check on src/db/
```

## When NOT to use

- Tasks depend on each other → sequence
- Only one task → run it on the current agent
- Shared mutable paths → not independent

## Output

Merged table plus `dispatched N, passed M, failed K`. Discipline: [`skills/dispatching-parallel-agents/SKILL.md`](../skills/dispatching-parallel-agents/SKILL.md).
