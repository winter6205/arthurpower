---
name: complexity-anti-drift
type: discipline
description: Use when a function exceeds 30 lines or 10 branches, a function takes more than 3 parameters, nesting depth hits 4+, a file exceeds 300 lines, code clone percentage is above 3%, or CI reports a complexity gate failure. Triggers on requests to refactor, split a function, reduce complexity, extract a helper, or fix ESLint complexity violations.
---

# Complexity Anti-Drift

## Overview

Complexity drifts by accretion: one branch, one nested `if`, one more parameter. Each addition is locally defensible and globally fatal. The fix is extraction along the **responsibility line**, not along "where the code happens to be". Helpers extract; comments do not.

## When to use
- A function in the diff exceeds 30 lines or 10 branches
- Nesting depth hits 4+ (`if` inside `if` inside `if` inside `if`)
- A file exceeds 300 lines after the diff
- A function takes more than 3 parameters
- CI reports a complexity gate failure (ESLint `complexity` / `max-depth` / `max-params` / `max-lines-per-function` / `max-lines`)
- `jscpd` reports > 3% clone coverage
- Reviewing a PR that "just adds one more case" repeatedly

## When not to use
- One-line getter or setter
- Test fixtures (allowed higher complexity for clarity)
- Generated code (codegen, vendored)
- Declarative config / type-only files

## Procedure
1. Run the complexity linter on the diff. Capture the output.
2. For each offender — extract a helper, NOT a comment. The function stays at one abstraction level.
3. If extraction reveals two responsibilities — split along the responsibility line, not along "what code happens to be there".
4. For clone offenders — extract the shared logic into a function. Do NOT just deduplicate the string.
5. For nesting offenders — early-return / guard-clause. Do NOT just collapse one branch.
6. Re-run linter. All metrics under threshold.

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "Just one more branch, refactor next time" | "Next time" never arrives. 4 branches become 10 by feature 5. |
| "This function is hard to split, just add a comment" | Comments don't reduce cyclomatic complexity. Linter still fails. |
| "Nested ifs are clearer than extracted functions" | Nested ifs are clearer to write, not to read. Extract. |
| "It's only 4 params, who cares about the limit" | 4 params is the threshold. 5 means the function takes a config blob — split. |
| "Duplicate string is just a coincidence" | Coincidence repeats. Extract the function or the constant. |
| "Just this once for the demo" | "This once" = 30+ lines once = 60 lines next PR. |

## Red Flags - Stop and Start Over

- Function > 30 lines in the diff
- Function with > 3 parameters (excluding `self`/`this`)
- Nesting depth > 4 (`if` inside `if` inside `if` inside `if`)
- File > 300 lines after the diff
- Chained ternary `a ? b : c ? d : e : f`
- `// just this once` or `// temporary` comment near a complex block
- Duplicate code block in 2+ places with no shared extraction
- "I added a comment explaining the nesting" instead of extracting

## Acceptance Criteria
- [ ] Is every function in the diff <= 30 lines?
- [ ] Is every function in the diff <= 10 branches?
- [ ] Does every function in the diff take <= 3 parameters?
- [ ] Is every file in the diff <= 300 lines?
- [ ] Is max nesting depth <= 4?
- [ ] Is `jscpd` clone % on touched files <= 3%?
- [ ] Are no ternaries chained (`a ? b : c ? d : e : f`)?
- [ ] Is there no "just this once" comment near a complex function?

## Required Baseline

**Zero tolerance**: function > 30 lines, nesting > 4, file > 300 lines, params > 3 in the diff. Linter must exit 0.

## Example

See [`references/extract-function-example.md`](references/extract-function-example.md) for a full Extract Function refactor (40-line 4-responsibility function → 4-line caller + 3 single-responsibility helpers). The pattern: split along the responsibility line, not along "where the code happens to be". Adapt to any function > 30 lines.

## Verification
- Linter exit 0 with no warnings on touched files
- `jscpd --reporters json` shows touched files < 3%
- `git diff --stat` shows extracted helper files are reasonable in size
- `grep -nE "// (just|only|temporary) this once" -- $(git diff --name-only)` returns no matches