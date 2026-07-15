# Rationalization Table & Red Flags

## Rationalization Table

| Rationalization | Reality |
|---|---|
| "Spec is obvious, requirements are clear" | Clear-to-you ≠ clear-to-spec. Two-line spec beats no spec. Acceptance criteria are mandatory. |
| "I'll write the spec after the code" | That is documentation, not specification. Post-code specs cannot prevent rework. |
| "Spec will slow us down" | 15-minute spec prevents hours of rework. The 5-verdict gate is fast. |
| "Requirements will change anyway" | That is why the spec is a living document. Outdated spec beats no spec. |
| "User knows what they want" | Even clear asks carry implicit assumptions. The spec exposes them. |
| "Skip the assumption gate, just write the spec" | Unsurfaced assumptions = silent contract drift. The gate is the only place they surface. |
| "Acceptance criteria can be 'looks good'" | "Looks good" is not a check. Rewrite to binary or surface as Open Question. |
| "I'll combine SPECIFY and PLAN into one doc" | Combined docs skip the gate. writing-plans consumes the spec; the gate is the boundary. |
| "ACR verdict can wait until PLAN is drafted" | ACR verdict gates PLAN, not the other way around. Reverse order = audit-on-rope. |
| "Vague requirements are operator's problem, not mine" | Reframing vague-to-binary is part of this skill. If you cannot reframe, the gap is yours to surface. |

## Red Flags

- Spec written without an explicit assumption list
- Assumption list without human confirmation (silent advancement)
- Acceptance criteria using "should" / "probably" / "looks good" / "fast enough"
- Boundaries missing one or more of Always / Ask first / Never
- Spec exists only in chat scrollback, not in a committed file
- `architecture-change-reviewer` skipped or verdict is `unclear` and spec still advances
- SPECIFY and PLAN phases merged into one document (gate bypassed)
- Open Questions section empty when vague requirements existed at intake
- Spec covers fewer than all nine core areas
- Success criteria not testable by any command or measurable check