# skill-authoring — Acceptance Criteria Reference

## Acceptance Criteria

By bar level. Each skill declares its bar in its own Verification section.

### Minimum bar (every skill)

- [ ] Description uses routing language, starts with `This skill should be used when` (third person), avoids first-person / persona / workflow-summary phrasing.
- [ ] Description length is within target or proven by routing eval (<= 400 Unicode chars hard max).
- [ ] Description contains no workflow summary, no step numbers, no "we do X then Y".
- [ ] Required L2 sections exist: When to use, When not to use, Procedure, Acceptance Criteria, Verification.
- [ ] Name is lowercase letters, numbers, hyphens.
- [ ] Frontmatter parses as valid YAML.
- [ ] Validator exits 0 on the skill.
- [ ] Skill product contains no private-prefix namespace bindings.
- [ ] Baseline evidence exists before drafting: behavior failure, routing miss, retrieval gap, application gap, or pressure rationalization.

### Discipline bar (any skill enforcing behavior under pressure)

- [ ] RED baseline records the exact rationalization used under pressure.
- [ ] Same pressure scenario passes with the skill and fails without it.
- [ ] Rationalization Table present with >= 5 rows.
- [ ] Red Flags list present with >= 5 items.
- [ ] Behavior eval rubric uses mode-tagged assertions (`exact`, `regex`, or `semantic` with grader prompt).

### High-risk / Support Skill bar

- [ ] Operator approval recorded in `iteration/<n>/approval.md`.
- [ ] At least 20 eval queries covering routing, pressure, counter-examples.
- [ ] Routing eval reaches >= 18/20 across at least 20 positive and negative trigger queries.
- [ ] No safety-critical false positive allowed.
- [ ] At least three description-optimization iterations completed without regression in the last two.

### Discipline bar eval

- At least 10 eval queries, including pressure scenarios and counter-examples.
- Passing: all pressure scenarios reject the target rationalization; counter-examples do not trigger the rule.

### Minimum bar eval

- At least 5 eval queries: 3 positive and 2 negative triggers.
- Passing: no false positives on negatives and behavior match on positives.

### Bar authority

Bar declaration is not authoritative. The reviewer or validator may upgrade the required bar when the skill enforces behavior under pressure, changes routing, or affects global behavior. When a skill declares `Minimum` but its purpose is to stop rationalization, enforce a non-negotiable rule, resist pressure, define red flags, or prevent quality-gate bypasses, the reviewer must upgrade it to `Discipline`. The presence of Rationalization Table, Red Flags, pressure scenarios, or zero-tolerance language is evidence for upgrade, not the only trigger.
