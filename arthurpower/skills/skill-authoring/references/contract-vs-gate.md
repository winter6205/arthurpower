# Contract, gate, measurement

Three meanings, three homes. Mixing them is **duplication**: a number written into a spec or plan Acceptance looks like a frozen contract, so changing the lint gate looks like changing the product.

| Home            | Holds                                                                                                                                | Moves when                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **Contract**    | Behaviour or structure the human can accept as yes/no — a round-trip, a single factory, extraction along the **responsibility line** | The product promise changes      |
| **Gate**        | A project-tunable quantitative threshold, marked hard FAIL or soft REVIEW, with one SSOT                                             | The project retunes the lint bar |
| **Measurement** | How the gate is read (ESLint rule, jscpd, `wc`)                                                                                      | The toolchain changes            |

A model-invoked **description** may repeat gate numbers as **triggers**. That is invocation, not a second SSOT. Plan bullets, spec Success Criteria, and skill Acceptance checklists are contracts: they name the observable, then **point** at the gate file.

Do not invent a gate that has no SSOT (a reviewer "≤1 literal" with no thresholds file). That is a recipe disguised as a number. Write the structural contract instead ("one helper factory"); leave counting to measurement if a real gate exists.

Do not add Quantitative-gate / Measurement fields onto every plan bullet. Those homes already exist (`complexity-anti-drift` `references/thresholds.md`, the linter config). Extra columns on the plan copy the numbers again.

Worked split: `writing-plans` Acceptance is the contract; `complexity-anti-drift` `references/thresholds.md` is the gate; the tool column on that table is measurement.

Skill-body shape that keeps the split readable: opening identity, When to use, Procedure (each step ends on a **completion criterion**), Acceptance as an artifact checklist or a pointer, References. Excuse tables and numeric gates sit behind **context pointers**. Edit history lives in CHANGELOG, not in the skill body.
