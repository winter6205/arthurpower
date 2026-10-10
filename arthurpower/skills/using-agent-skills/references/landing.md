# Using Agent Skills — Landing

Default **code landing** (non-WIP product diff):

1. `test-driven-development` (write-time; implementer follows this skill)
2. `code-review` (Standards ∥ Spec, including S4 test evidence against applicable acceptance points)
3. `verification-before-completion` (sole claim-done)
4. commit — `minimal-change-verifier` for scope + hook only

**Conditional (same round, still one skill at a time):**

- Public API / CLI / export input classes → `input-contract-tests` (checklist; no auditor agent)
- Hook / detector / skill **trigger** drift → `boundary-testing` (**axis1 then axis2**, not parallel)
- Complex bug, unbiased repro → follow the blind-writer procedure in `test-driven-development`

Claim-done is only `verification-before-completion`. Do not dispatch a standalone TDD audit or run a second Spec pass by default.
