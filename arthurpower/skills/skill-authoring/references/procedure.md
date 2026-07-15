# skill-authoring — Procedure Reference

## Procedure

1. Define the skill scope and the target failure mode in one sentence.
2. Capture the baseline before drafting. For discipline skills, run a pressure scenario without the skill and record rationalizations word-for-word. For technique, pattern, and reference skills, record the application failure, recognition miss, retrieval gap, or coverage gap the skill must fix.
3. Draft the frontmatter. Description uses routing language, starts with `This skill should be used when` (third person), and avoids first-person, assistant-persona, or workflow-summary phrasing. Description targets 200-400 Unicode chars after YAML parse; hard max is 400. Shorter is allowed when routing evals prove sufficient trigger coverage.
4. Write the L2 body: When to use, When not to use, Procedure, Acceptance Criteria, Verification.
5. For discipline-enforcing skills, add Rationalization Table (>= 5 rows) and Red Flags (>= 5 items).
6. Run validator and eval. Validator must exit 0 before commit.
7. Iterate until the same scenario fails without the skill and passes with it.
8. Submit for review before commit. Support Skills additionally need `iteration/<n>/approval.md`.
