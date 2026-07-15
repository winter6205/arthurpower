---
name: performance-optimization
description: Use when optimizing page speed, API latency, or Core Web Vitals. Triggers: slow LCP/INP/CLS, bundle-size growth, render-blocking scripts, images without width/height, N+1 queries, unbounded list endpoints, Lighthouse drops, or CI budget failures. Profile-driven fixes; ship only with before/after numbers.
---

# Performance Optimization

## When to use

Performance work without measurement is guessing. **Profile before optimize** — measure with a real trace, name the bottleneck, fix it, measure again. Runtime twin of `complexity-anti-drift` (S5); when a perf fix bloats a function, S5 wins — extract the hot path into a helper.

Apply this skill when any of the following appear:

- Web Vitals out of budget (LCP > 2.5s / INP > 200ms / CLS > 0.1)
- Bundle gzipped initial JS exceeds 200KB or any single route exceeds the per-route budget
- An image added without explicit `width` / `height`, or above-the-fold images lack `fetchpriority="high"`
- A `<script>` added without `async` / `defer`, blocking the parser
- A database query in a loop (N+1), or a list endpoint returns unbounded rows
- A critical-path function measured above 200ms (p95) in a profile
- CI reports a performance budget failure (bundlesize / Lighthouse CI / size-limit)
- A user or monitoring report says "it feels slow"

All numeric thresholds, budgets, profile tools, and anti-pattern catalog: `references/performance-budget-and-tools.md`.

## When not to use

- One-line refactor with no runtime path; test fixtures; generated code; pure type / config
- A function provably off the hot path (never called in a trace) — fix complexity, not perf

## Procedure

1. **Profile first.** Real measurement before code change (Lighthouse / DevTools / WebPageTest for synthetic, `web-vitals` for RUM). Capture a baseline — without it nothing to compare against.
2. **Identify the actual bottleneck.** Read the trace — slowest function, largest image, longest request, long task > 50ms. If the trace does not name it, do not guess.
3. **Set a budget before fixing.** Per-route JS, per-image, critical CSS, LCP/INP/CLS. Budgets fail in CI, not in code review. See `references/performance-budget-and-tools.md` § Performance Budget.
4. **Fix the named bottleneck, nothing else.** One commit = one fix; out-of-scope refactors are S6 territory.
5. **Re-measure.** Same tool, same conditions. If the number did not move, revert and re-profile.
6. **Guard against regression.** Add a CI gate (bundlesize / Lighthouse CI / size-limit / RUM alert). Unguarded fixes re-regress within two sprints.
7. **Hand to S5 / S2 if the fix bloats the function.** Extract the hot path; boundary tests under S2.
8. **Large rewrites cross architecture.** Full SSR migration or framework swap is not runtime-only — escalate to `architecture-change-reviewer`.

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "It feels slow, optimize the obvious thing" | "Feels slow" is not data. The obvious thing is rarely the actual bottleneck. |
| "I'll add a memo / cache later" | Without a profile, you do not know if the memo caches the right thing. |
| "It's fast on my machine" | Your machine is not the user's. Measure on representative hardware and network. |
| "The framework handles performance" | Frameworks cannot fix N+1 queries, oversized bundles, or images without dimensions. |
| "Premature optimization is the root of all evil" | Knuth's quote is about optimizing *without measurement*. With a trace, optimization is not premature. |

Full table: `references/performance-budget-and-tools.md` § Rationalization Table.

## Red Flags - Stop and Start Over

- Optimization PR with no before/after number
- `<img>` / `<video>` / `<iframe>` added without `width` / `height`
- `<script src="...">` in `<head>` without `defer` or `async`
- Loop with `await` / `Promise` per iteration (N+1)
- "It's faster now" claim with no measurement

Full list in `references/performance-budget-and-tools.md` § Red Flags.

## Acceptance Criteria

- [ ] Before-and-after numbers exist (Lighthouse / RUM / profile trace) for every claimed improvement
- [ ] Fix targets the bottleneck the trace names (not an assumed one)
- [ ] Web Vitals within budget on the changed route — `references/performance-budget-and-tools.md` § Performance Budget
- [ ] Every `<img>` / `<video>` / `<iframe>` has explicit `width` + `height`; every `<script>` in `<head>` has `defer` or `async`
- [ ] No N+1 query patterns; list endpoints paginated with explicit `take` cap
- [ ] CI budget enforced (bundlesize / Lighthouse CI / size-limit); Lighthouse Performance score ≥ 90 on the changed route
- [ ] Existing tests still pass; hot-path extraction follows S5 if the fix bloats a function

## Required Baseline + Example + Verification

**Zero tolerance**: no profile data ships; any added `<img>`/`<video>`/`<iframe>`/`<script>`/list endpoint violates the budget table in `references/performance-budget-and-tools.md`. CI budget gate must pass.

Two end-to-end patterns (image + LCP element; N+1 query + unbounded list endpoint) and the four-step check live in `references/performance-budget-and-tools.md` § Worked Examples + § Verification. Shape: profile → identify → set budget → fix named bottleneck → re-measure → guard.
