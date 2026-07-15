---
name: frontend-ui-engineering
description: Use when building a component, page, or user-facing interface; modifying layout, state container, or visual design; adding keyboard, focus, or screen-reader interaction; reviewing a UI diff before merge; replacing hardcoded CSS with design tokens; or when output looks generic and template-driven. Stops the AI-aesthetic frontend failure mode.
---

# Frontend UI Engineering

## Overview

Production UI is accessible UI, by default. Every component has three boundaries that must be explicit: **state** (what it owns, what it borrows, what it persists), **props** (the contract surface, not a free-for-all), and **lifecycle** (when it mounts, what it cleans up, where it releases focus). Components that hide these boundaries break under refactor. Components that ship without a11y ship broken — a11y is not a feature, it is the floor.

Generic-looking UI ("AI aesthetic") is a discipline failure: hardcoded hex values, oversized rounded cards, purple gradients, hero with no real content. Each is a shortcut that signals "I did not read the design system." Design tokens exist; use them.

## When to use

- Building a new component, page, modal, drawer, form, or any user-facing surface
- Modifying state management (lift / context / store / server cache)
- Touching CSS that introduces a new color, spacing value, or breakpoint
- Adding keyboard, focus-trap, or screen-reader interaction
- Reviewing a UI diff before merge
- Migrating a hardcoded style to design tokens

## When not to use

- Backend or pure data-layer work (no user surface)
- Static config or build scripts
- Test fixtures that intentionally exercise broken markup
- One-off scripts that print to stdout (no UI)

## Procedure

The full 10-step build procedure lives in [`references/procedure-steps.md`](references/procedure-steps.md). Summary:

1. Locate design tokens (no magic values)
2. Pick state owner (local / lifted / context / URL / server cache / store)
3. Declare typed prop contract (composition over configuration)
4. Semantic HTML first (button / a / label htmlFor / heading order)
5. Wire keyboard navigation (Tab, Enter/Space, focus-trap)
6. Check a11y (contrast ratios, alt text, color-not-sole-indicator)
7. Handle loading / empty / error states explicitly
8. Container over configuration (separate fetching from rendering)
9. img keeps natural ratio (no aspect-ratio lock, no padding-bottom hack)
10. No AI slop (no purple gradients, no rounded-2xl everywhere, no stock copy)

## Rationalization Table

See [`references/discipline-tables.md`](references/discipline-tables.md#rationalization-table) for the full 12-row table mapping common excuses ("a11y is a nice-to-have", "just one hardcoded color", "stock copy is fine for now") to the corresponding reality. Reach for it whenever a reviewer pushes back on a11y / design-token / component-size constraint.

## Red Flags - Stop and Start Over

See [`references/discipline-tables.md`](references/discipline-tables.md#red-flags--stop-and-start-over) for the 16-item red-flag catalogue (div-onClick, missing alt, off-scale spacing, locked aspect-ratio, purple-gradient hero, stock copy, missing keyboard test, etc.). Any one match = stop and start over.

## Required Baseline

**Zero tolerance**: any interactive element without a11y, any color/spacing outside the design system, any `<div onClick>`, any image without `alt`, any `img` with locked aspect-ratio. Production UI fails fast on these — they are non-negotiable.

## Example

See [`references/container-component-example.md`](references/container-component-example.md) for one complete runnable React + Tailwind component demonstrating: 1 accessible container (loading/empty/error/data 4 states) + 1 presentation component (semantic HTML + keyboard + a11y) + design token references, with every key decision annotated.

## Acceptance Criteria

Binary pass/fail checklist. Every item must hold before the UI change merges.

- [ ] All interactive elements use semantic HTML (`<button>`, `<a>`, `<label htmlFor>`); zero `<div onClick>` / `<span onClick>`
- [ ] Zero raw hex values (`#xxxxxx`) or off-scale spacing (`13px`, `2.3rem`) inside component files — design tokens only
- [ ] `<img>` elements never lock `aspect-ratio` / `padding-bottom`; container sets `max-width`, image keeps natural ratio
- [ ] Every `<img>` has descriptive `alt` (decorative: `alt=""`)
- [ ] Color contrast ≥ 4.5:1 (normal text) / ≥ 3:1 (large text and UI components); color never the sole state indicator
- [ ] Container components include loading / empty / error states explicitly
- [ ] Keyboard test passes: every interactive element reachable by Tab, activatable by Enter/Space, focus moves correctly on dialog/route change, focus trapped in modals
- [ ] Heading order is sequential (`h1` → `h2` → `h3`); no skipping levels
- [ ] axe-core / Lighthouse reports 0 critical a11y violations
- [ ] Single component ≤ 200 lines; ≤ 8 props; ≤ 3 levels of prop drilling

## Verification

See [`references/verification-commands.md`](references/verification-commands.md) for the full set of grep / scan commands covering a11y, keyboard, design tokens, img constraints, component size, and interactive elements.

## Related Skills

- `defensive-contract-validator` — 5 类边界 (空 / 负 / 超长 / 并发 / 异常) 覆盖在 UI 层 = empty / error / loading 4 态 + 大量数据
- `complexity-anti-drift` — 圈复杂度 + 嵌套深度 + 参数数量在 UI 层 = 组件行数 + prop 数量 + 嵌套层级
- `minimal-change-verifier` — 改 UI 时 diff scope = 任务 scope, 不顺手优化无关组件
- `error-handling-enforcer` — UI 错误处理 (error boundary + retry button) 走 typed error + 显式 fallback, 不空 catch
- `using-agent-skills` — 本 skill 在 arthurpower canonical 下的位置 + 调度协议