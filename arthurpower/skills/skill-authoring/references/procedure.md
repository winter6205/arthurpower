# skill-authoring — Procedure Reference

## Procedure

1. Define the skill scope and the target failure mode in one sentence.
2. Capture the baseline before drafting. For discipline skills, run a pressure scenario without the skill and record rationalizations word-for-word. For technique, pattern, and reference skills, record the application failure, recognition miss, retrieval gap, or coverage gap the skill must fix.
3. Draft the frontmatter. Description uses routing language, starts with `This skill should be used when` (third person), and avoids first-person, assistant-persona, or workflow-summary phrasing. Description targets 200-400 Unicode chars after YAML parse; hard max is 400. Shorter is allowed when routing evals prove sufficient trigger coverage.
4. Write SKILL.md to the spec / writing-plans shape: identity opening, When to use (skip cases as the last paragraph), Procedure with a **completion criterion** on each step, Acceptance as an artifact checklist or a pointer, References. Disclose examples, excuse tables, and numeric gates. Shape and the contract/gate/measurement split: [`contract-vs-gate.md`](contract-vs-gate.md).
5. Discipline skills need steering against LLM excuses (rationalization / red-flag smells) — inline or in `references/pressure-and-antipatterns.md`. Quantitative thresholds live in their own SSOT file, not in plan or spec Acceptance.
6. Run validator and eval. Validator must exit 0 before commit.
7. Iterate until the same scenario fails without the skill and passes with it.
8. Submit for review before commit. Support Skills additionally need `iteration/<n>/approval.md`.
