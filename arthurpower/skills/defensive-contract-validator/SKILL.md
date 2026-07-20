---
name: defensive-contract-validator
description: Use when adding a public API or CLI command, fixing a bug, introducing an external dependency, or a PR misses a coverage class. Triggers on "add boundary tests", "test the edge cases", "what if input is empty", "fix the regression", "concurrent case failed", "explain the 5 boundary classes". Not for prototypes, generated code, or formatting.
bucket: engineering
---

# Defensive Contract Validator

## When to use
Public functions and external dependencies are **contracts**. Every contract must be proven by tests covering the 5 boundary classes: empty, negative, long, concurrent, exception. Code without these tests is unverified behavior, not a working feature.

- Adding a new API endpoint, CLI command, or RPC handler
- Fixing a bug — regression test must fail before the fix lands
- Adding any new external dependency
- Writing a function that consumes input from outside its module
- Reviewing a PR whose test suite misses a coverage class

## When not to use
- Code marked `// PROTOTYPE:`
- Generated code (codegen output, vendored libs)
- Pure declarative config (yaml/json without code path)
- No-behavior-change formatting

## Procedure
1. List the 5 boundary classes the new code must cover: empty, negative, long, concurrent, exception.
2. For each class, write a failing test that exercises it (RED).
3. Confirm the test fails for the right reason (assertion message names the missing contract).
4. Implement the minimum code to make the failing tests pass (GREEN).
5. Refactor only with all 5 classes still green.
6. If a new dependency is added — write a YAGNI justification comment in the PR body: what is it for, what we would do without it, why that alternative is worse.

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "It's just an internal helper, no need for boundary tests" | Internal helpers become public via exports. Test now, refactor later is a lie. |
| "Happy path test covers the bug" | Happy path = "did the success work?" Boundary = "did it fail safely?" Two different questions. |
| "I'll add the empty/negative tests in the next commit" | Next commit never lands. Test is in this commit or behavior is unverified. |
| "The new dep is tiny, 200 lines, no need for YAGNI doc" | Tiny deps ship with breaking changes too. YAGNI doc = 1 minute vs 1-day deprecation fallout. |
| "Bug fix is obvious, regression test is overkill" | Obvious bug returns without regression test. Same root cause, second incident. |
| "Concurrent tests are flaky, skip this class" | Mark `// N/A: pure` only if the function is provably pure. Anything with IO needs a concurrent test. |

## Red Flags - Stop and Start Over

- Implementation file changed without a test file in the same commit
- Bug fix PR with no failing-test-before-fix proof
- New dep in `package.json` / `requirements.txt` / `Cargo.toml` with no YAGNI justification in PR body
- "Happy path only" test suite on a public function
- "TODO: edge cases" comment near a function that ships
- Skipped/todo test marked with `.skip` / `#[ignore]` without an issue link

## Acceptance Criteria
- [ ] Empty input case has a failing test
- [ ] Negative or boundary-low case has a failing test
- [ ] Long-input or boundary-high case has a failing test
- [ ] Concurrent case has a failing test (or `// N/A: pure` justification)
- [ ] Exception case has a failing test that asserts the typed error
- [ ] No new dep without YAGNI justification in PR body
- [ ] Bug fix lands with regression test that fails before the fix

## Required Baseline

**Zero tolerance**: code lands with all 5 boundary classes covered, or it does not land. No `// TODO: edge cases`. No "I'll add tests next commit."

## Example
See `references/boundary-test-examples.md` for a complete 5-class boundary test template (parse_user_input function with empty/negative/long/concurrent/exception test methods).

## Verification
- `git diff` shows test files added before or alongside implementation (test commit precedes impl commit)
- `pytest` / `npm test` exit 0 with new tests in the run
- Coverage report delta on touched file is non-negative
- `git log -p <file>` shows test case names mentioning `empty`, `negative`/`negative number`, `long`/`overflow`, `concurrent`/`race`, `exception`/`error`