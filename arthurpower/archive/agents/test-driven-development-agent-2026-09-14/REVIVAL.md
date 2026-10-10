# Revival Conditions

Archived 2026-09-14. Post-impl S4 process audit overlapped the confirmation stack
(`code-review` Spec axis + `verification-before-completion`). Write-time discipline
stays on the `test-driven-development` skill + implementer pointer; claim-done stays on VBC.

Restore only if an operator explicitly needs a standalone S4 process auditor
(commit-order / skip / mock abuse) outside Spec review + VBC.

Steps:

1. Copy `test-driven-development-agent.md` back to `agents/`
2. Do not re-add a default "should dispatch" soft trigger from the TDD skill
