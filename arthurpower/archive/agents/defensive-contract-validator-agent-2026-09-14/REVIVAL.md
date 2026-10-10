# Revival Conditions

Archived 2026-09-14. S2 post-impl agent overlapped write-time TDD + optional
`input-contract-tests` skill. Public-entry input classes are a thin checklist
skill (model-invoked when adding/changing a public API), not a default auditor.

Restore only if an operator wants a standalone read-only five-class audit
outside implementer + `input-contract-tests`.

Steps:

1. Copy `defensive-contract-validator-agent.md` back to `agents/`
2. Do not re-add a default soft-dispatch from the skill
