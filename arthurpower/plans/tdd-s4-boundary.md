# TDD and S4 ownership correction

The TDD skill owns the write-time RED → GREEN loop and recorded failure evidence. S4 owns review of whether tests prove the specified behavior. Keep the test pyramid as optional guidance.

## Affected files

affects: plans/tdd-s4-boundary.md
affects: skills/test-driven-development/SKILL.md
affects: skills/test-driven-development/references/spec-as-test.md
affects: skills/code-review/references/spec-as-test.md
affects: skills/code-review/references/protocol.md
affects: skills/test-driven-development/references/testing-standards.md
affects: agents/spec-reviewer-agent.md
affects: agents/arthurpower-audit-agent.md
affects: commands/audit.md
affects: skills/using-agent-skills/references/landing.md
affects: README.md

## Pre-implementation architecture verdict

bounded-context-guardian: yes — move S4 review criteria to code-review and update all live consumers, including `/audit`.
input-contract-tests: N/A — no public API or CLI input contract changes.
error-handling-enforcer: N/A — no executable error paths change.
complexity-anti-drift: N/A — no executable functions change; preserve concise skill instructions.
minimal-change-verifier: yes — every listed file serves the TDD/S4 ownership correction; no test-ratio change.

## Implementation order

1. Clarify one behavior per RED → GREEN loop and independently chosen expected outcomes in TDD.
2. Move S4 criteria to code-review, remove the red-commit requirement, and make the Spec reviewer check test evidence against each applicable acceptance point.
3. Update the audit, references, router, and README; review the diff and verify all live links.
