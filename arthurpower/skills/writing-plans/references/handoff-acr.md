# Handoff Sequence with architecture-change-reviewer

Both `writing-plans` and `architecture-change-reviewer` fire on the "3+ files" trigger. Without an explicit sequence, the two skills produce conflicting artifacts. The handoff is:

1. `architecture-change-reviewer` runs FIRST (it is a sibling of this skill in the Process Gates family). It emits the 5-line verdict block: bounded-context-guardian / defensive-contract-validator / error-handling-enforcer / complexity-anti-drift / minimal-change-verifier, each `yes` / `no` / `unclear` with a one-clause reason.
2. If any verdict is `no` or `unclear`, `writing-plans` does NOT run. The plan is incomplete. Fix the failing verdict first.
3. If all 5 verdicts are `yes` (or `N/A with reason`), `writing-plans` runs SECOND. It consumes the 5-line verdict block as input and produces the ordered tracer-bullet task list (Plan Format template, see plan-format.md).
4. Both artifacts land in `plans/<feature>.md` (SSOT): Section 2 (5-line verdict block) + Section 3 (ordered tracer-bullet task list). `architecture-change-reviewer` never ships without the verdict block in the plan file; `writing-plans` never ships a task list without that verdict block.

Conflict resolution: if the two artifacts disagree (e.g. ACR says split into 2 modules but writing-plans says merge into 1 commit), ACR wins on module structure, writing-plans wins on commit structure. They never merge.