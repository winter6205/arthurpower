---
name: code-review
description: This skill should be used when users ask to "审代码", "审 PR", or "review" Git changes after implementation and before commit. Runs v-code-review, checks Standards and Spec, and returns severity-based remediation.
bucket: engineering
type: technique
---

# Code Review

Review implemented Git changes with the local `v-code-review` CLI, then interpret findings against the shared code-review protocol.

## When to use

- After implementation and before commit, when a Git diff is available.
- When the user asks to "审代码", "审 PR", or "review" changes.
- When a reviewer needs Standards and Spec findings with one remediation verdict.

## When not to use

- Before implementation; use `architecture-change-reviewer` for the plan gate.
- For a repository with no Git diff or review target.
- For the final pre-merge maintainability stage; use `maintainability-reviewer`.
- For changes outside the requested review scope.

## Procedure

1. **Confirm scope.** Identify the repository root and review target: working tree, commit, branch, or PR. Stop if the target is ambiguous.
2. **Build the CLI.** In the v-code-review project, run `go build -o build/v-code-review.exe ./cmd/opencodereview` and require exit code 0 before reviewing.
3. **Run the review.** Invoke `v-code-review review --audience agent` against the confirmed target. Preserve its raw output and exit code.
4. **Classify findings.** Group every finding as High, Medium, or Low. Do not silently discard uncertain findings; retain evidence and confidence.
5. **Apply both axes.** Use the shared `code-review-protocol` rule as the source of truth for the Standards axis and Spec axis. Reference that rule rather than duplicating its thresholds or semantic-gate definitions here.
6. **Inspect the Fowler smell baseline.** Explicitly check all twelve names:
   - Mysterious Name
   - Duplicated Code
   - Feature Envy
   - Data Clumps
   - Primitive Obsession
   - Repeated Switches
   - Shotgun Surgery
   - Divergent Change
   - Speculative Generativity
   - Message Chains
   - Middle Man
   - Refused Bequest
7. **Interpret the verdict.** High = 必修 and blocks commit. Medium = 应修 or must have a named follow-up ticket. Low = 选改 and does not block.
8. **Report evidence.** For each finding, provide severity, file:line, axis, problem, and concrete remediation. Report a clean result only when the CLI exits 0 and no unresolved High finding remains.

## Review-stage placement

- Before change: `architecture-change-reviewer` gates the plan via 5-verdict; writing-plans authors the ordered task list.
- After change: `code-review` checks the Git diff; `arthurpower-audit-agent` independently checks the plugin's governance scope.
- Before merge: `maintainability-reviewer` performs the third-stage S1-S6 decision.

## Acceptance Criteria

- [ ] The review target is explicit.
- [ ] The v-code-review build command exited 0.
- [ ] `v-code-review review --audience agent` ran and its raw exit code was captured.
- [ ] Standards and Spec axes were both evaluated through the shared rule.
- [ ] All twelve Fowler smell names were checked.
- [ ] Every finding has High, Medium, or Low severity plus file:line evidence.
- [ ] High findings are marked 必修; Medium 应修; Low 选改.
- [ ] The final result states whether commit must stop.

## Verification

Skill type: technique
Bar level: minimum

- Confirm the frontmatter omits `disable-model-invocation`, making this model-invoked.
- Confirm the description stays within 400 characters and contains both "审" and "review".
- Confirm the v-code-review build and review commands each return exit 0.
- Confirm unresolved High findings block the final verdict.
