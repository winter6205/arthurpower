# skill-authoring — Context-Loop Integration Reference

## Context-Loop Integration

When authoring skills that participate in the Arthurpower context closed-loop:

| Skill role                                          | Authoring rule                                                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Write authority** (e.g. `domain-modeling`)        | Body MUST state "唯一写入主权" explicitly. Frontmatter description MUST include "唯一被授权". Acceptance criteria MUST include schema guardrail (CONTEXT.md / ADR). |
| **Write driver** (e.g. logicsync)                   | Body MUST route all writes through the write-authority skill. Must NOT contain raw `Edit CONTEXT.md` examples.                                                      |
| **Write deepener** (e.g. arch-improve)              | Body MUST include both READ (guardrail) and WRITE (proposal) sides. Must reference ADR three-condition gate.                                                        |
| **Read consumer** (e.g. tdd-protocol, bug-diagnose) | Body MUST include "探索前必读 CONTEXT.md + ADR" as a procedure step. Must include conflict-annotation protocol exactly as defined.                                  |
| **Read contract** (e.g. context-contract.md)        | Body MUST define glossary-gap signal and ADR-conflict annotation as hard rules.                                                                                     |

Authoring gate: a new skill that touches `docs/CONTEXT.md` / `docs/CONTEXT-MAP.md` / `docs/adr/` is rejected at review if it does not reference `domain-modeling` as the write authority and `docs/agents/context-contract.md` as the read contract.
