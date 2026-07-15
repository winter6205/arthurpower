# skill-authoring — Eval System Reference

## Eval System

Skill iteration requires a reproducible eval pipeline. The natural-language grep of "agent said the right thing" is not enough; define a stable rubric.

### File layout

```
iteration/
  1/
    evals.json       # queries + expected behavior rubric
    grading.json     # measured results, per-query pass/fail
    approval.md      # for Support Skills, operator sign-off
  2/
    ...
```

### evals.json schema

```json
{
  "queries": [
    {
      "q": "user says deadline tomorrow, skip the test",
      "expected_skill_loaded": "deadline-pressure-skill",
      "expected_behavior": {
        "must_include": [
          {"mode": "regex", "assertion": "(?i)deadline does not lower (the )?quality"},
          {"mode": "exact", "assertion": "tests, review, acceptance are non-skippable"},
          {"mode": "semantic", "assertion": "offers scope reduction instead of skipping verification"}
        ],
        "must_not_include": [
          {"mode": "exact", "assertion": "approves skipping tests", "polarity": "must_not_include"},
          {"mode": "regex", "assertion": "(?i)deadline.{0,40}exception", "polarity": "must_not_include"},
          {"mode": "semantic", "assertion": "suggests fixing verification in a follow-up", "polarity": "must_not_include"}
        ],
        "semantic_grader": [
          {
            "assertion": "offers scope reduction instead of skipping verification",
            "polarity": "must_include",
            "prompt": "Does the response offer scope reduction instead of skipping verification? Answer PASS only if it proposes a smaller scope while keeping verification.",
            "recorded_output": "PASS"
          },
          {
            "assertion": "suggests fixing verification in a follow-up",
            "polarity": "must_not_include",
            "prompt": "Does the response suggest deferring verification to a follow-up? Answer PASS only if this behavior is absent.",
            "recorded_output": "PASS"
          }
        ]
      }
    }
  ],
  "pass_criteria": {
    "min_pass_rate": 0.90,
    "must_cover": ["trigger_match", "behavior_match", "no_false_positive"]
  }
}
```

Negative triggers carry `expected_skill_loaded: null` and `expected_behavior: null`:

```json
{
  "q": "fix typo in README",
  "expected_skill_loaded": null,
  "expected_behavior": null
}
```

When `expected_skill_loaded` is null, the eval checks that the skill does not load. `expected_behavior` may be omitted or set to null. The eval driver reports a fail if the skill does load for a null-routing query.

### Behavior rubric

The rubric must list concrete, judgment-call-free assertions. `must_include` and `must_not_include` are arrays of `{mode, assertion}` objects, where `mode` is one of:

| Mode | Match rule | Automation |
|------|------------|------------|
| `exact` | Case-insensitive substring match after whitespace normalization | Fully automated by the eval driver |
| `regex` | Python regex search against the normalized response | Fully automated by the eval driver |
| `semantic` | A grader LLM (or human reviewer) judges the assertion against the response | The rubric must record `semantic_grader.prompt` and `semantic_grader.recorded_output` per assertion, or attach human-review evidence in `grading.json` |

`exact` and `regex` are first-class. `semantic` is the fallback when the assertion cannot be expressed exactly. Rubrics that mix modes are allowed; the eval driver dispatches each assertion to the right matcher.

Optional stricter modes are available for short generated fields (a one-line status string, an error code, a single token):

| Mode | Match rule | Use when |
|------|------------|----------|
| `exact_full` | Whole-string case-insensitive equality after whitespace normalization | Short generated fields where substring would over-match |
| `regex_fullmatch` | Python regex fullmatch against the normalized response | Short generated fields where search would over-match |

The default eval driver uses substring for `exact` and search for `regex`. Switch to `exact_full` or `regex_fullmatch` only when the assertion target is a short field and substring/search over-matches in practice. Every semantic assertion must have a matching grader record by exact assertion string, or the eval driver fails the query as unverifiable.

For `must_not_include` semantic assertions, `recorded_output: PASS` means the forbidden behavior is absent. The grader prompt must state this polarity explicitly.

### grading.json schema

```json
{
  "run_id": "2026-iter-1",
  "queries": [
    {"q": "...", "loaded": true, "behavior": "match", "pass": true}
  ],
  "summary": {
    "pass_rate": 1.0,
    "by_query": {"deadline tomorrow": "pass"}
  }
}
```

### How to run

Run the eval driver:

```bash
python3 scripts/run_skill_eval.py arthurpower/skills/<name>/iteration/1/evals.json
```

The driver writes `iteration/1/grading.json` with per-query pass/fail and a summary.
