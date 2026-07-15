# Pressure Scenarios & Anti-Patterns

## Pressure Scenarios

| Pressure | Tempting shortcut | Correct response |
|---|---|---|
| Human reviewer says "just build it, spec is overkill" | Skip SPECIFY, write code | Spec is 15 minutes. Reframe as 2-line spec + assumption gate. If still refused, escalate. |
| Requirements look obvious from past work | Skip assumption gate | Past-work context is an assumption. Surface it. |
| Spec feels too long | Drop Boundaries or Open Questions | Drop is not "less work" — it is missing acceptance criteria. Keep all 9 areas. |
| Human reviewer wants vague success ("make it fast") | Write "fast" as a criterion | Reframe to LCP < 2.5s or surface as Open Question. No binary = no spec. |
| ACR verdict is `unclear` | Push forward and resolve during PLAN | Unclear = gate not passed. Return to Step 1 or Step 2. |
| Human reviewer in a rush, "ship the plan tomorrow" | Combine SPECIFY + PLAN into one doc | Phases are gated. Combine = skip gate = rework later. |
| Multiple features in one ask | One spec covering all features | One feature per spec. Compound asks split at the gate. |

## Anti-Patterns

- **Head-spec** — spec lives only in agent memory or chat scrollback. Spec must be in a committed file.
- **Implicit-assumption spec** — assumption list absent, or present but not confirmed. Gate not run.
- **Vague-criterion spec** — success criteria are qualitative. Each criterion must map to a command or measurable check.
- **Gate-skipping handoff** — writing-plans invoked without ACR verdict block. Plan built on shaky ground.
- **Phase-merge doc** — SPECIFY and PLAN in one document. The gate is the boundary; merge removes it.
- **Verification bypass** — implementation begins before the spec passes the 5-verdict gate.
- **Living-document drift** — spec updated after code without a new assumption gate. Spec changes are themselves spec work.
- **One-shot spec** — spec written once and never revisited. The spec is a living document; revisit on scope change.