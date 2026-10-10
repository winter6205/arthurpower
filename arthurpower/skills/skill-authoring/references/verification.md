# skill-authoring — Verification Reference

## Verification

```
Skill type: discipline
Bar level:  high_risk
```

Reason: canonical authoring gate for all arthurpower skills.

This skill is discipline by content. It becomes high_risk when promoted as the canonical gate for all arthurpower skill authoring.

Operator approval evidence: `iteration/<n>/approval.md` is mandatory for this skill; the validator checks that the file exists for `high_risk` skills.

### Skill type and bar level

Each skill declares its own type and the bar it must satisfy. The declaration lives in the `Verification` section of the body, with the following machine-readable form:

```
Skill type: discipline | technique | pattern | reference
Bar level:  minimum | discipline | high_risk
```

The optional frontmatter key `type:` (value: `discipline` | `technique` | `pattern` | `reference`) may declare the skill type. When both frontmatter `type:` and body `Skill type:` are present, they must match; otherwise the validator fails. The validator uses the declared type to decide whether excuse steering is required, and the declared bar level to decide which acceptance bar applies. A mismatch between frontmatter `type:` and body `Skill type:` is a validator error.

`high_risk` is reserved for Support Skills (those that change global agent routing, system reminders, cross-skill dispatch, or any safety-critical review behavior) and additionally requires `iteration/<n>/approval.md`.

### Validator

Run the structural validator:

```bash
python3 scripts/validate_skill.py arthurpower/skills/<name>/SKILL.md
```

Validator checks:

- Frontmatter parses as YAML.
- `name` matches `^[a-z0-9-]+$`.
- `description` starts with `This skill should be used when` (preferred) or `Use when` (deprecated, accepted for backward compatibility).
- `description` length is <= 400 Unicode characters after YAML parse.
- Required L2 sections exist (When to use + Procedure + Acceptance, or the older heading set).
- Skill type and bar level are declared in the `Verification` section (or via frontmatter `type:` key).
- Discipline skills include excuse steering (rationalization / red-flag smells), inline or disclosed — at least one of: inline table >= 5 rows, disclosed `references/pressure-and-antipatterns.md` with table >= 5 or list >= 5, or optional inline Red Flags / Anti-patterns list >= 5. Quantitative gates stay in their SSOT, not in plan Acceptance ([`contract-vs-gate.md`](contract-vs-gate.md)).
- High-risk skills require an existing `iteration/<n>/approval.md` file, not merely a textual reference.
- Body length <= 10000 Unicode characters (soft, approximately 2000 words). Line count is a deprecated proxy; char count is the machine-assertable metric. Content beyond the soft limit must move to `references/<topic>.md` and be referenced from the body.
- No private-prefix namespace bindings (compound, standalone, L1 path, date, or authority labels — see `validate_skill.py` for the exact pattern list).
- Markdown code fences are balanced: each opening fence must close with the same marker type and at least the same fence length.
- Bar downgrade: when declared `Bar level: minimum` but the body contains a `Rationalization Table` or `Red Flags` section, the validator upgrades the bar to `discipline` and re-checks.
- Frontmatter `type:` and body `Skill type:` consistency: when both are present, they must match; otherwise the validator fails. A mismatch is a validator error, never a silent override.

Validator exits 0 on pass, 1 on any violation. Each violation prints the file, the check name, and the matching line.

### Eval driver

Run the eval driver after the validator passes:

```bash
python3 scripts/run_skill_eval.py arthurpower/skills/<name>/iteration/1/evals.json
```

The driver reads the evals.json rubric, runs each query through a subagent or mocked harness, matches must_include and must_not_include items, and writes `grading.json` with per-query pass/fail and a summary pass rate.

### Body size

```bash
wc -m arthurpower/skills/<name>/SKILL.md
```

Body should be <= 10000 Unicode characters (approximately 2000 words). Beyond 10000 chars, split heavy material into `references/<topic>.md` and reference it from the body.
