---
description: Dispatch N independent arthurpower discipline checks as parallel subagents and merge their PASS/FAIL verdicts into one report. Use when 2+ checks have no shared mutable state.
allowed-tools: Read, Grep, Glob, Bash, Agent
argument-hint: <check1; check2; ...>  (semicolon-separated independent tasks)
---

# /fanout

Fan out independent arthurpower tasks to parallel subagents.

## What it does

Invokes the `arthurpower-dispatcher` agent with the tasks you pass in
`$ARGUMENTS` (semicolon-separated). Each task becomes one isolated subagent
running a single arthurpower discipline check; results merge into one table.

## When to use

You have 2+ checks that are genuinely independent (no shared mutable state,
no ordering). Example:

```
/fanout S1 check on src/auth/; S3 check on src/api/; S5 check on src/db/
```

## When NOT to use

- Tasks depend on each other (B needs A's result) -> run serially.
- Only one task -> just run it directly.
- Tasks share mutable state -> not independent, do not fan out.

## Output

A merged table: one row per task with the skill exercised, the verdict
(PASS/FAIL), and `file:line` evidence, plus a one-line summary
`dispatched N, passed M, failed K`.

## Discipline (from dispatching-parallel-agents)

- No silent truncation if fan-out is capped.
- A crashed subagent = FAIL row with the error, not a hidden skip.
- A subagent claiming PASS without evidence = downgraded to FAIL
  (verification-before-completion gate applies per subagent).
