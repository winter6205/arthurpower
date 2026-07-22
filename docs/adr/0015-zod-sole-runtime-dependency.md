# 0015. zod as the sole runtime dependency for the hook system

Date: 2026-07-21
Status: accepted

## Context

The hook system (global `~/.claude/hooks/` + project `arthurpower/hooks/`, ~35 `.cjs` files) has long declared a "zero runtime dependency" principle — every hook header comment advertises it. issue #47 (the TypeScript migration roadmap) plans to centralize input parsing into a shared `defineHook` runtime. An explorer audit of the current code found the real pain is **duplication, not missing validation**: 7 distinct hand-rolled implementations of the same "read stdin + JSON.parse + extract fields" pattern (the canonical `lib/read-stdin-with-timeout.cjs` plus 3 `for await` clones that hang on EOF, a setTimeout clone, an inlined fallback, and a `fs.readFileSync(0)` variant), and ~150-180 lines of repeated `(input && input.tool_input && input.tool_input.X) || ''` extraction ladders spread across ~20 hooks.

The migration decision (wayfinder session, 2026-07-21, recorded on issue #47) is to admit **zod as the single runtime dependency** and reverse the zero-dep principle. This ADR records that reversal because it satisfies all three ADR conditions: it is hard to reverse (once 35 hooks depend on zod schemas via `defineHook`, removing it means rewriting the whole runtime), it is surprising without context (a future reader seeing `node_modules/zod` under `~/.claude` will ask "wasn't this zero-dep?"), and it is the result of a real trade-off.

## Decision

Admit zod (v4) as the **sole** runtime dependency of the hook system. All other runtime dependencies remain forbidden; the dev toolchain (typescript / tsx / vitest / @types/node) is a separate category and unaffected. zod is used at exactly one chokepoint — the `defineHook` runtime's input parser — where a single zod schema both validates the untrusted stdin envelope at runtime and derives the TypeScript type from the same source. `safeParse` (which never throws) implements the fail-open contract: a parse failure exits 0 and lets the tool call through.

## Considered Options

**Zero-dep, hand-rolled parser (~30 lines).** A typed `parseHookInput(unknown): HookInput | null` with manual `typeof` guards. Zero supply-chain surface, no `node_modules`, preserves the advertised principle. Cost: the runtime type and the runtime validation are two artifacts that must be kept in sync by hand (an interface + a guard + a test asserting they agree), and the fail-open contract is hand-maintained per call site.

**zod (chosen).** Schema-is-type: one definition yields both the runtime validator and the TS type, so they cannot drift. `safeParse` gives fail-open for free. Cost: one dependency, `node_modules` under `~/.claude`, and a sync-exclusion entry.

## Consequences

**正面 / Applied:**
- The 7 hand-rolled parse implementations and ~150-180 lines of extraction ladders collapse into one zod-backed `defineHook` parser; the 3 EOF-hanging `for await` clones are retired as a side effect of "all input goes through one validator."
- Runtime validation and the TS type derive from one schema — no manual sync, and the type gate (`tsc --noEmit`) plus the runtime check agree by construction.

**负面 / Trade-offs:**
- `node_modules` now lives under `~/.claude`. `claude-sync-home`'s exclusion list must add `node_modules` (already flagged in the issue #47 risk table) so it is not synced.
- Supply-chain surface grows by exactly one package. zod v4 has **zero transitive dependencies**, so the added surface is a single audited package — consistent with what `pre-tool-supply-chain.cjs` is designed to police (untrusted transitive deps), not in conflict with it.
- The "zero-dep" header comments on existing hooks become stale and must be updated to "zod-only runtime" as each hook migrates.

## Evidence pointers

- Explorer audit (2026-07-21): 7 distinct stdin/parse implementations; ~150-180 lines of duplicated field-extraction ladders across ~20 hooks; the recurring bug history in `pre-context-write-guard.cjs` (7 dated fix comments) is in business logic, not the parsing layer — the parsing layer is stable, which is why the win here is deduplication, not added validation.
- S7 gate ground truth (measured 2026-07-21): `npm install -D <pkg>` → WARN, exit 0; `npm install zod` → BLOCKED, exit 2. The one-time zod install therefore uses the gate's own `ARTHUR_PIP_ALLOW=1` override (this ADR is the audit), without weakening the gate or mislabeling zod as a dev dependency.
- Decision record: issue #47 `## Decisions so far` + resolution comments (2026-07-21).
- Ratified 2026-07-22: migration complete — L3 (26 hooks) + L1 (10 overlapping hooks) migrated to `.ts` + `defineHook` runtime; zod deployed to MKT + CACHE; smoke tests pass.
