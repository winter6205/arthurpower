# Skill Discovery Flowchart

```
Task arrives
│
├── Scale router
│   ├── Scope 已定 + single session ─────────→ deep-dive-protocol
│   ├── Scope 已定 + multi-session ──────────→ architecture-change-reviewer + writing-plans
│   └── Scope 未定 + multi-session ──────────→ architecture-change-reviewer + writing-plans + session-handoff
│
├── Defining what to build
│   ├── Vague / under-specified request ──→ intent-inference (then deep-dive-protocol)
│   ├── Glossary / ADR / SSOT decision ───→ domain-modeling
│   ├── External issue / PR triage ───────→ issue-triage-validator
│   ├── Don't know what you want yet ────→ interview-me
│   ├── Have rough concept, need variants → idea-refine
│   └── New project/feature/change ───────→ spec-driven-development
│
├── Planning implementation
│   ├── Multi-file change (>3 files) ─────→ architecture-change-reviewer (ACR)
│   └── Single-file or trivial ──────────→ minimal-change-verifier
│
├── Implementing code
│   ├── TDD: failing test first ──────────→ test-driven-development
│   ├── 5-class boundary contract ────────→ defensive-contract-validator
│   ├── Module boundary violation ───────→ bounded-context-guardian
│   ├── Complexity threshold breach ─────→ complexity-anti-drift
│   └── Empty catch / null-on-failure ───→ error-handling-enforcer
│
├── Verifying
│   ├── Bug / something broke ───────────→ systematic-debugging
│   └── Pre-merge final check ──────────→ verification-before-completion
│
├── Reviewing
│   ├── Pre-impl 5-verdict ─────────────→ architecture-change-reviewer (ACR)
│   └── Post-impl 5-axis review ─────────→ code-review-and-quality
│
├── Committing / branching
│   └── 1 commit = 1 logical task ──────→ minimal-change-verifier
│
└── Meta / orchestration
    ├── Creating/editing SKILL.md ─────→ skill-authoring
    ├── Self-evolving rules ───────────→ self-evolving-rules
    └── Parallel sub-agent dispatch ───→ dispatching-parallel-agents
```

---

**Note (2026-07-18)**: `architecture-change-reviewer` is now model-invoked under [ADR-0010](../../adr/0010-acr-model-invoked.md) (Path B). The 5-line verdict still blocks on `no` / `unclear`. `writing-plans` remains user-invoked.