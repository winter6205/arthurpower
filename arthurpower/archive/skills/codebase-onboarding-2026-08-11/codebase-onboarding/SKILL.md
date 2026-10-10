---
name: codebase-onboarding
version: 1.0.0
tags: [onboarding, codebase-study, learning-path, newcomer-guide, source-citation, 新人, 上手, 读懂代码, 看懂项目, 带我过一遍, 搞懂, 入门]
related_skills: [domain-modeling, deep-dive-protocol, bounded-context-guardian]
type: discipline
description: Use when a newcomer asks to learn a codebase through guided lessons, asks for onboarding, a learning path, a newcomer guide, or systematic study of how a project works.
bucket: engineering
disable-model-invocation: true
---

# Codebase Onboarding

## When to use

- 教我做这个项目 / 系统学习 / onboarding / 上手 / 新人导读 / codebase 怎么学
- codebase onboarding / learning path / newcomer guide
- Requests for a structured, lesson-based introduction to a codebase rather than a one-off lookup

## When not to use

- Code changes, debugging, refactoring, or implementation tasks
- External framework or library tutorials that are not project-specific
- One-line "where is X defined" lookups
- Creating non-onboarding project documentation

## Procedure

1. Verify prerequisites. Confirm `docs/CONTEXT.md` exists as the domain SSOT and `docs/adr/` contains decision records. If either is missing, report the gap before producing onboarding artifacts.
2. Initialize the onboarding workspace in the project root:
   - `MISSION.md` — overall learning objectives, bounded-context path, and success criteria
   - `lessons/` — one lesson per bounded context or coherent workflow
   - `reference/` — source map and ADR index
   - `learning-records/` — user progress tracker
   - `assets/` — reusable diagrams or screenshots
3. Draft `MISSION.md` by reading `docs/CONTEXT.md` with the `domain-modeling` skill. List bounded contexts, their responsibilities, and the recommended learning order.
4. Build each lesson as a standalone file. Anchor every lesson to a bounded-context boundary using `bounded-context-guardian`. Include concept overview, walkthrough, and exercises. Every factual claim must cite project sources.
5. Produce citations in this exact format:

```markdown
### Lesson: 用户下单流程

涉及源码:
- `src/order/create.py:45-78` — `Order.create()` 入口
- `src/payment/charge.py:23-50` — `PaymentGateway.charge()` 实际扣款

涉及决策:
- ADR-0001 (选 PostgreSQL 作主存储) — 因为订单需强一致性
- ADR-0007 (event-sourced orders) — Order 状态机基于事件回放
```

6. Build `reference/source-map.md` mapping each lesson to source ranges and decision records. Build `reference/adr-index.md` listing every ADR referenced by lessons.
7. Create `learning-records/template.md` with checkboxes for lesson completion, exercises, and open questions.
8. When a term or behavior needs clarification during lesson writing, invoke `deep-dive-protocol` and record the result as a citation, not as prose speculation.
9. Treat the workspace as incrementally maintainable. When the codebase changes, update the affected lesson and reference files, leaving unchanged lessons intact.

## Acceptance Criteria

- [ ] `MISSION.md` exists and names every bounded context drawn from `docs/CONTEXT.md`
- [ ] `lessons/` contains at least one lesson per bounded context or coherent workflow
- [ ] Every lesson contains at least one source citation in the form `path/file.ext:line-line`
- [ ] Every lesson references at least one ADR by ID in the form `ADR-NNNN`
- [ ] `reference/source-map.md` and `reference/adr-index.md` exist and are consistent with lesson citations
- [ ] `learning-records/template.md` exists with progress checkboxes
- [ ] Zero external URLs are used as evidence or citations
- [ ] All artifacts are generic to the project; no private namespace bindings

## Verification

```
Skill type: discipline
Bar level:  discipline
```

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "External docs are more readable than code" | External docs drift from the codebase. The project SSOT is the code plus `docs/adr/`. |
| "Copying `docs/CONTEXT.md` into the lesson is faster" | Duplicated text rots. Lessons must reference the SSOT, not replicate it. |
| "One long markdown file is enough" | A monolith violates progressive disclosure and makes incremental updates impossible. |
| "The user only wanted a quick answer" | Quick lookups belong to exploration tools, not structured onboarding. |
| "Precise citations are too verbose" | Verbose citations now prevent hallucinated explanations later. |
| "Bounded contexts are just folders" | Boundaries are semantic contracts; use `bounded-context-guardian` to validate them. |

## Red Flags

- Any lesson cites an external URL such as `https://docs.example.com/...` instead of project sources.
- A lesson pastes the full text of `docs/CONTEXT.md` or an ADR rather than referencing the file path.
- No `learning-records/` directory or progress tracker exists.
- Onboarding output is a single monolithic document instead of a `lessons/` directory.
- Acceptance criteria use "should" or "probably" instead of binary yes/no checks.
- A source citation lacks a line range or refers to a file that does not exist.