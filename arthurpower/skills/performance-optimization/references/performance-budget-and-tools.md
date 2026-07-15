# Performance Budget, Tools, Anti-Patterns, Scope Boundary

Heavy reference for `performance-optimization`. The body SKILL.md is the discipline + procedure; this file holds the threshold tables, tool map, anti-pattern catalog, and the S5 scope-boundary table. Read on demand, not on every load.

## Performance Budget (threshold table)

Not "consider keeping it small". Not "尽量 low". Binary: at or under budget = OK, over budget = FAIL. Same usage as S5's complexity thresholds.

| Resource | Budget (per route) | Measurement |
|----------|---------------------|-------------|
| Initial JS (gzipped) | ≤ 200 KB | `bundlesize` / `size-limit` |
| Initial CSS (gzipped) | ≤ 50 KB | `bundlesize` |
| Per-image (above the fold) | ≤ 200 KB | build-time check |
| Per-image (below the fold) | ≤ 100 KB | build-time check |
| Critical-path fonts | ≤ 100 KB total | build-time check |
| API response (p95) | ≤ 200 ms | APM / RUM |
| Time to Interactive (4G, mid-tier device) | ≤ 3.5 s | Lighthouse |
| Lighthouse Performance score | ≥ 90 | Lighthouse CI |

**Web Vitals (binary good / poor):**

| Metric | Good | Poor |
|--------|------|------|
| LCP (Largest Contentful Paint) | ≤ 2.5 s | > 4.0 s |
| INP (Interaction to Next Paint) | ≤ 200 ms | > 500 ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | > 0.25 |

## Profile Tools (pick by question)

| Question | Tool | Output |
|----------|------|--------|
| "Is this page slow in CI?" | Lighthouse CI (`@lhci/cli`) | Score + LCP/INP/CLS + budget pass/fail |
| "What is the critical path on load?" | Chrome DevTools Performance tab | Flame chart, long tasks, network waterfall |
| "Does this regress in the field?" | RUM via `web-vitals` library | Real-user LCP/INP/CLS |
| "Is this slow on real networks / devices?" | WebPageTest (multi-location, multi-device) | Film strip, waterfall, Web Vitals |
| "Why is this specific endpoint slow?" | APM (OpenTelemetry / DataDog / Sentry) | Trace spans, p50/p95/p99, slow query log |
| "How big is my bundle / who imports what?" | `webpack-bundle-analyzer` / `rollup-plugin-visualizer` | Treemap of gzipped sizes |

## Common Anti-Patterns

| Anti-pattern | Symptom | Fix |
|--------------|---------|-----|
| **Render-blocking resources** | `<script>` without `async`/`defer`, `<link rel="stylesheet">` in head without `media` query | Add `async`/`defer`; split critical CSS inline, async-load the rest |
| **Large initial JS bundle** | Route ships > 200 KB gzipped on first load | Route-level code splitting; dynamic `import()` for rarely-used features |
| **Layout shift (no dimensions)** | `<img>` / `<video>` / `<iframe>` without `width` + `height` attributes | Always set explicit dimensions; reserve space at layout time |
| **Synchronous JS in parser** | `<script src="...">` in `<head>` without defer | Add `defer` (preserves order) or `async` (independent) |
| **N+1 queries** | Loop calls DB once per item | Use `include` / `join` for the related rows in one query |
| **Unbounded list endpoint** | `findMany()` with no `take` | Paginate: `take: 20, skip: (page-1)*20` |
| **Unoptimized images** | PNG hero, no `srcset`, no `loading="lazy"`, no `<picture>` with AVIF/WebP | `<picture>` with AVIF + WebP + `srcset` + `sizes`; `fetchpriority="high"` for LCP image; `loading="lazy"` for below-the-fold |
| **Cache-miss on every request** | Hot config endpoint hits DB on every call | In-process LRU + HTTP `Cache-Control: public, max-age=300` |
| **Re-rendering storm** | New object literal in render prop, breaking `React.memo` | Hoist to module constant; `useMemo` for derived data |
| **No fetchpriority on LCP image** | Hero `<img>` competes with everything | Add `fetchpriority="high"` on the LCP element only |

## Scope Boundary with S5 (complexity-anti-drift)

| Dimension | S5 (complexity-anti-drift) | This skill (performance-optimization) |
|-----------|----------------------------|--------------------------------------|
| Subject | Source code structure | Runtime behavior of the same code |
| Threshold | ≤30 lines/function, ≤10 branches, ≤3 params, ≤300 lines/file, ≤4 nesting | LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, bundle ≤ 200KB gz, API p95 ≤ 200ms |
| Tool | ESLint complexity, jscpd | Lighthouse, DevTools Performance, WebPageTest, RUM (web-vitals), APM |
| Failure signal | Linter warning | Budget gate fail, slow trace, poor Web Vitals |
| Fix shape | Extract helper, split responsibility | Profile, name bottleneck, fix named bottleneck, re-measure |
| Conflict resolution | — | If perf fix bloats a function → extract per S5, then optimize the helper |
| Common | — | "Small readable code that is also fast"; both gates must pass |

**Use both**: every PR runs S5 (linter) and this skill's budget gate in CI. A function can pass S5 and still be a 200ms hot path; a function can pass Web Vitals and still be a 60-line 12-branch mess. The two gates are independent and complementary.

## Verification

```bash
# 1. Web Vitals (lab)
npx lhci autorun                              # Lighthouse CI, score + budgets

# 2. Bundle size
npx bundlesize --config bundlesize.config.json
npx size-limit                                # per-route gzipped JS cap

# 3. Anti-pattern grep (CI gate)
grep -rnE '<img[^>]+(?!.*(width|height)=)' --include='*.html' --include='*.tsx' src/ | grep -vE 'width=|height='
grep -rnE '<script[^>]+src=' --include='*.html' src/ | grep -vE ' defer| async'
grep -rnE 'findMany\(\)' --include='*.ts' --include='*.tsx' src/ | grep -vE 'take:'

# 4. Budget re-check after fix
npx lhci autorun                              # all budgets pass
```

## Rationalization Table (full)

| Excuse | Reality |
|--------|---------|
| "It feels slow, just optimize the obvious thing" | "Feels slow" is not data. Profile. The obvious thing is rarely the actual bottleneck. |
| "I'll add a memo / cache later" | Without a profile, you do not know if the memo caches the right thing. Profile first. |
| "It's fast on my machine" | Your machine is not the user's. Measure on representative hardware, network, and device class. |
| "100ms is below the threshold anyway" | 100ms delays measurably affect conversion. Web Vitals thresholds exist for a reason — respect them. |
| "The framework handles performance" | Frameworks prevent some issues and cannot fix N+1 queries, oversized bundles, or images without dimensions. |
| "We will optimize later" | Performance debt compounds. Fix the obvious anti-patterns now, defer micro-optimizations — not the other way around. |
| "Bundle grew 10KB, that's fine" | 10KB today, 10KB next PR, 100KB by quarter end. CI budget catches it; trust the gate. |
| "Re-render storm is fine, React handles it" | React re-renders on prop change. If props are unstable references, every render re-renders every child. Profile, then `useMemo` / `React.memo`. |
| "Premature optimization is the root of all evil" | Knuth's quote is about optimizing *without measurement*. With a trace, optimization is not premature. |

## Red Flags (full)

- Optimization PR with no before/after number
- Bundle size growing commit-over-commit with no budget gate
- `<img>` / `<video>` / `<iframe>` added without `width` / `height`
- `<script src="...">` in `<head>` without `defer` or `async`
- Loop with `await` / `Promise` per iteration (N+1)
- List endpoint with no pagination / no `take` cap
- `React.memo` / `useMemo` added without a profiler showing the actual re-render
- "It's faster now" claim with no measurement
- Lighthouse score < 90 on the changed route, no follow-up issue
- "I'll add the budget to CI later" — later never arrives
