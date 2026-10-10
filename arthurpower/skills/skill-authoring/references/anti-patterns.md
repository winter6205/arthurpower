# skill-authoring — Anti-Patterns Reference

## Anti-Patterns (forbidden)

- Workflow summary in description (steps, numbered procedure, "we do X then Y").
- Multi-language dilution: duplicating full procedural content in multiple languages when one suffices.
- Generic labels in examples: `helper1`, `step3`, `pattern4`.
- Flowcharts that embed executable code.
- Internal monologue: `Let me think carefully about this`.
- Verbatim copy of any source skill without distillation and adaptation.
- Long chronological explanation, origin story, or persuasive essay that does not change agent behavior.
- Second-person prose ("You should...", "You need to...") instead of imperative form.
- Discipline skill with no steering against LLM excuses (rationalization / red-flag smells) — inline or disclosed behind a pointer such as `references/pressure-and-antipatterns.md`.
- Gate numbers copied into spec or plan Acceptance; invented counts with no gate SSOT. Placement: [`contract-vs-gate.md`](contract-vs-gate.md).
- Acceptance criteria using `should`, `probably`, `looks good` instead of binary yes/no.
- Skill body narrating its own rewrite (formerly / moved / this revision). Edit history belongs in CHANGELOG.
- Private-prefix namespace bindings in the skill product (validator exits non-zero).
