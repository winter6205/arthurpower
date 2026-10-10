# skill-authoring — Red Flags Reference

## Red Flags

- Description frontmatter starts with `Guides`, `Helps`, or `Explains` instead of `This skill should be used when`.
- Description frontmatter contains step numbers or workflow summaries.
- Description exceeds 400 Unicode chars.
- Body > 10000 chars with no `references/<topic>.md` for heavy content.
- Discipline skill has no excuse steering (rationalization / red-flag smells), neither inline nor in `references/pressure-and-antipatterns.md`.
- Gate numbers copied into spec or plan Acceptance (see [`contract-vs-gate.md`](contract-vs-gate.md)).
- Skill shipped without a recorded RED baseline.
- Acceptance criteria use `should`, `probably`, `looks good` instead of binary yes/no.
- Validator exits non-zero on the skill.
- Eval pass rate or mandatory-case result fails the declared bar's threshold after iteration.
- Support Skill committed without `iteration/<n>/approval.md`.
- Skill declared as `Minimum` bar but content matches `Discipline` bar (reviewer must upgrade).
