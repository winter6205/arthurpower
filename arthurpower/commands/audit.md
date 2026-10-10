---
description: Run a one-shot maintainability audit of the current diff against the 6 arthurpower S1-S6 rules + verification gate, then report pass/fail per rule with file:line evidence.
allowed-tools: Read, Grep, Glob, Bash
argument-hint: [optional: file or directory to scope the audit]
---

# /audit

Run the arthurpower maintainability audit on the current change set.

## What it does

Invokes the `arthurpower-audit-agent` to verify the diff (or the file/dir you
pass as `$ARGUMENTS`) against the six governance rules:

| Rule | Skill | Checks |
|------|-------|--------|
| S1 | bounded-context-guardian | module boundaries, no circular imports |
| S2 | input-contract-tests | 5 boundary classes tested |
| S3 | error-handling-enforcer | typed exceptions, no empty catch |
| S4 | code-review Spec axis | test evidence covers applicable acceptance points and meaningfully supports the required behavior |
| S5 | complexity-anti-drift | cyclomatic/nesting/params/lines thresholds |
| S6 | minimal-change-verifier | diff scope = one task |

plus the `verification-before-completion` gate (no PASS without evidence).

## Output

A per-rule PASS/FAIL table with `file:line` evidence and a one-line overall
verdict. Read-only - it never edits source.

## When to use

- Before a commit: `/audit` to catch rule violations pre-gate.
- After a refactor: `/audit src/module/` scoped to the changed module.
- In a PR review: `/audit` on the PR diff.

## Related

- Agent: `arthurpower-audit-agent` (the standalone isolated version).
- Skill: `architecture-change-reviewer` (the 5-verdict pre-implementation gate).
- Skill: `verification-before-completion` (the evidence-before-claims discipline this command enforces).
