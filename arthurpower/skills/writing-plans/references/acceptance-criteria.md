# Plan Acceptance Criteria (binary)

A plan is complete when **all** of these are true:

- [ ] Plan has ≥ 3 tracer bullets, OR has a written justification for fewer
- [ ] Each tracer bullet has 1+ binary acceptance criterion (test command, observable artifact, or pass/fail check)
- [ ] Each tracer bullet maps to exactly 1 commit (1 tracer bullet ↔ 1 commit, never N:1 or 1:N)
- [ ] Tracer bullets ordered by dependency, not by file path or directory
- [ ] Plan lives in a file (`plans/<feature>.md`) or commit body — not in agent memory, chat, or PR afterthought

See `plan-format.md` for the canonical template and `example-plan.md` for a filled-in example.

# Cross-references

- Handoff with ACR: `handoff-acr.md`
- Plan format template: `plan-format.md`
- Filled-in example: `example-plan.md`
- 1-commit-per-logical-task spec (each commit is one tracer bullet) (新增功能 / Bug fix / 格式调整 各 1 commit)
- Architecture gate: `architecture-change-reviewer` (5-verdict frame)
- Minimal-change enforcement: `minimal-change-verifier` (S6)
- Defensive contract: `defensive-contract-validator` (S2 — every task's acceptance is a contract)