# 0019. Removing codebase-graph tooling from arthurpower skill pipeline

Date: 2026-07-25
Status: accepted

## Context

`codebase-memory-mcp` and `serena` were integrated into arthurpower's skill system as auto-injected, MCP-backed codebase graph tools. Both were intended to give the agent symbol-level precision and architecture overview via JSON-RPC to long-running MCP servers. Two surveys (informal; recorded in the upstream investigation that produced spec §"Background") measured actual usage:

- **codebase-memory**: 0 MCP tool calls across the surveyed window. The SessionStart `cbm-session-reminder` hook fired "ALWAYS use codebase-memory-mcp FIRST" on every session, and the PreToolUse `cbm-code-discovery-gate` fired on every Grep / Glob, but the agent never executed any of the `mcp__codebase-memory-mcp__*` tools.
- **serena**: only the Skill doc was read (`Read` of `~/.claude/skills/serena/SKILL.md`); zero `mcp__serena__*` tool invocations across the surveyed window.

Despite the zero-call footprint, both tools continued to extract persistent cost:

1. **Context tax** — the SessionStart reminder and the PreToolUse Grep/Glob gate consumed prompt cache slots on every turn, displacing useful attention budget.
2. **Decision noise** — `arthurpower:using-agent-skills` (the router) listed both as "Registered" with no priority/deactivation signal; `arthurpower:systematic-debugging/references/when-to-use-detail.md` Phase 2 (isolation) referenced both, forcing the agent to resolve ambiguity before acting.
3. **Hard rules coupled to dead tooling** — `docs/rules/workflow.md` L1/L2 routing table still carried a "Codebase Memory FIRST" row and "不得跳过 Codebase 直接用 Serena 盲改" prohibition; these made a no-op workflow that contradicted the actual usage data.
4. **Documentation drift** — the router description and quick-reference kept advertising tools the agent never used, eroding trust in router output.

The codebase-memory *binary* (269 MB exe at `C:\Users\<user>\AppData\Local\Programs\codebase-memory-mcp\codebase-memory-mcp.exe`), the SQLite index, and the MCP server config in `~/.claude.json` remained operational and useful for ad-hoc work — they were never the problem. The problem was the *integration* (hook injection + router registration + documentation references) turning rare manual-use tools into always-on context burn.

This change affects user-global config (`~/.claude/hooks/`, `~/.claude/skills/`, `~/.claude/commands/`, `~/.claude/settings.json`) and 4 arthurpower project files (`arthurpower/skills/using-agent-skills/SKILL.md`, `arthurpower/skills/using-agent-skills/references/quick-reference.md`, `arthurpower/skills/systematic-debugging/references/when-to-use-detail.md`, `docs/rules/workflow.md`). The 10 arthurpower identity hooks at `arthurpower/hooks/hooks.json` are **not** touched (CLAUDE.md "10-hook 不可 regress" rule).

This decision meets the ADR-warranting 3-condition gate from `docs/rules/context-loop.md` §2.2:

1. **Hard to reverse** — undoing requires re-creating the two SessionStart / PreToolUse hook scripts (bash + TypeScript variants), re-registering both skills in the user-global skill system, re-injecting routes into 4 arthurpower doc files, and re-adding the two ad-hoc skill entries to the router. Non-trivial migration.
2. **Surprising without context** — a future maintainer reading "codebase-memory was gutted, serena was gutted" would ask "why?" without usage-metric evidence and a clearer story about what the integration cost vs. what is preserved.
3. **Real trade-off** — ≥2 defensible options exist (keep dual-mode MCP+CLI, replace with CodeGraph, full removal with manual CLI). Each option has distinct downsides enumerated below.

## Decision

Remove `codebase-memory-mcp` and `serena` from arthurpower's auto-injection, router registration, and skill documentation layer. Replace the on-demand access surface with two lightweight artifacts:

1. **`cbm-cli.py` Python wrapper** at `C:\Users\<user>\.claude\hooks\cbm-cli.py` — a single stdlib-only Python file (~10 subcommands per spec §2.1) that spawns the existing codebase-memory binary via stdin/stdout JSON-RPC, prints JSON by default, exposes `--human` for debug, and exits with explicit codes per spec §2.4 (binary missing = 2, protocol error = 3, timeout = 4, no index = 5).
2. **`/codebase-memory` slash command** at `C:\Users\<user>\.claude\commands\codebase-memory.md` — wraps `cbm-cli.py <subcommand>` so the operator can invoke any of the 8 subcommands from a Claude Code session via a single name.

Specifically:

- **Delete** (7 paths): `~/.claude/hooks/cbm-session-reminder`, `~/.claude/hooks/cbm-code-discovery-gate`, `~/.claude/hooks/cbm-code-discovery-gate.ts`, the old `~/.claude/skills/codebase-memory/SKILL.md` (3513 B MCP-tools version), `~/.claude/skills/serena/SKILL.md`, the entire `~/.claude/skills/serena/` directory, the obsolete `~/.claude/skills/codebase-memory/SKILL.md` replaced by the CLI-pointer version.
- **Replace** the codebase-memory skill with a minimal CLI-pointer `SKILL.md` (no MCP tool references, points to the CLI subcommand table).
- **Edit** `~/.claude/settings.json` to drop `cbm-session-reminder` and `cbm-code-discovery-gate` matcher entries (no-op if already absent per survey — confirmed at edit time per T5 acceptance).
- **Edit** the 4 arthurpower doc files listed in the Context section above: drop codebase-memory and serena from the router "Registered skills" list, drop them from `quick-reference.md`, replace their references in `systematic-debugging/when-to-use-detail.md` Phase 2 with "Grep + Glob + Read depth-combo", and remove the "Codebase Memory FIRST" routing row + the "不得跳过 Codebase 直接用 Serena 盲改" hard rule from `docs/rules/workflow.md`.

**Preserved (explicit non-changes):**

- The codebase-memory binary at `C:\Users\<user>\AppData\Local\Programs\codebase-memory-mcp\codebase-memory-mcp.exe` is untouched. The CLI wrapper spawns it as a child process.
- The SQLite index is untouched. The CLI queries it via JSON-RPC.
- `~/.claude.json` `mcpServers.codebase-memory-mcp` entry is untouched (kept as a future-revival option; the CLI does **not** route through MCP).
- The 10 `arthurpower/hooks/hooks.json` identity hooks are untouched (CLAUDE.md rule).
- `package.json`, `package-lock.json`, and `node_modules/` are untouched (no third-party Python deps in the CLI wrapper per spec §4.1 stdlib-only constraint).

**Interaction model change:** codebase memory access moves from implicit (auto-injected on every Grep / Glob / SessionStart) to explicit (operator runs `/codebase-memory <subcommand>` or calls `cbm-cli.py <subcommand>` from Bash). This is the intended behavior shift: rare manual needs no longer pay the integration tax.

## Consequences

**Positive:**

- **Context tax eliminated** — SessionStart no longer fires the "ALWAYS FIRST" reminder; PreToolUse no longer spawns the discovery gate on Grep/Glob. Every turn's prompt cache budget is freed up for actual agent reasoning.
- **Router simpler, more trustworthy** — `using-agent-skills` "Registered skills" only lists skills that are actually used. Future maintainers reading the router can trust its output without grep-checking for stale entries.
- **Manual on-demand access preserved** — the CLI + slash command give the operator every capability the MCP tools used to provide, just gated behind an explicit invocation. Python stdlib-only means zero lockfile churn.
- **Project CLAUDE.md invariants intact** — the 10-hook identity, package.json, package-lock.json, and node_modules are all preserved per "副作用禁区" and "10-hook 不可 regress" rules.

**Negative / trade-off:**

- **No symbol-level precision via auto-injection** — agents that previously relied on serena's LSP-like `mcp__serena__*` tools for cross-file refactors must now be explicitly told to use `cbm-cli.py snippet` or `cbm-cli.py trace`. Mitigation: the new minimal `SKILL.md` exposes the CLI in the model-invocation pool, so `using-agent-skills` will route to it when the agent correctly infers "I need a symbol-level lookup".
- **No auto-discovery on Grep/Glob** — the old `cbm-code-discovery-gate` surfaced graph context when a Grep returned many hits. Agents now handle hit-density decisions with raw Grep output. Mitigation: Grep/Glob are still the primary tools; the agent uses Read depth-combos per the updated `systematic-debugging/when-to-use-detail.md`.
- **Operator workflow change** — work that previously "just worked" via auto-injection now requires a `/codebase-memory <subcommand>` invocation. This is a one-time learning cost; documented in the new `SKILL.md`.
- **Future revival path requires re-doing the wiring** — if MCP tooling becomes high-value again, the deleted hook scripts and skill entries need to be reconstructed. This is the "hard to reverse" property that warranted the ADR.

**Neutral:**

- Binary + SQLite + MCP config preserved. CLI invocation is manual rather than auto. Future operator can choose to re-enable auto-injection without rebuilding infrastructure.
- 4 arthurpower doc files edit together but in 1 commit (T6) since they encode one logical decision.

## Considered Options

### Option A: Remove codebase-memory and serena; expose codebase-memory as CLI + slash command (adopted)

- **Pros:** zero integration tax; router + documentation accurately reflect operator reality; binary + index + MCP config remain intact as a future-revival path; changes are scoped to user-global config + 4 arthurpower doc files (small blast radius).
- **Cons:** operator workflow change (manual invocation); no auto-injection; future re-enable requires reconstruction.

### Option B: Keep both MCP tools alongside the CLI (dual mode)

- **Pros:** no behavioral change for current users; CLI available as manual fallback; no operator learning cost.
- **Cons:** context tax remains (the *reason* for the change is unaddressed); router still has stale entries; documentation drift worsens — the integration cost dominates the rare-use benefit. The "rare manual use" is precisely what makes this option inferior: paying auto-injection cost for tools not called.

### Option C: Replace codebase-memory with CodeGraph (or other modern MCP server)

- **Pros:** CodeGraph is a fresher codebase-graph MCP implementation with stronger LSP integration; could subsume both codebase-memory and serena functions in one tool.
- **Cons:** still auto-injected (context tax preserved); introduces a new third-party dependency whose usage data we don't yet have; explicit out-of-scope per spec §8 ("用户明确要求完全移除 graph 工具品类"). Even if usage later justifies a graph tool, the right path is to assess after the current removal is observed in production, not speculatively migrate.

### Option D: Full removal including the binary and SQLite index

- **Pros:** minimum surface area; zero future-maintenance cost for the 269 MB exe.
- **Cons:** discards a working artifact whose only cost was integration overhead; forces future re-installation if the tool is later wanted; contradicts spec §3.4 which explicitly preserves the binary, the SQLite index, and the MCP config. Spec §6.3 makes this a hard "Never".

## Why not B/C/D

**B is the status quo that motivated the change.** The proposal exists precisely because dual-mode MCP+CLI leaves the integration tax fully in place while adding only maintenance cost for the dual-mode layer. The user's two surveys showed the MCP path is not exercised; paying for it is unjustified.

**C violates spec §8 (out of scope) and the user's explicit request to fully remove the graph-tool category.** A speculative re-tool to CodeGraph before measuring the no-graph baseline would invert the evidence-based workflow this project enforces. Additionally, CodeGraph still produces context tax when integrated as MCP.

**D violates spec §3.4 and spec §6.3 (hard "Never" — do not delete binary / SQLite / MCP config) and removes an irrecoverable 269 MB exe whose only "cost" was the integration overhead this ADR addresses.** The binary costs no context once it's not auto-spawned; keeping it preserves the future option to revive the integration cheaply.

**A is the only option that satisfies the 3-condition ADR gate** (hard to reverse, surprising without context, real trade-off) *and* respects the operator-confirmed boundary: remove the integration, keep the infrastructure, gate access behind an explicit CLI invocation.

## References

- Spec: `docs/spec/codebase-command-spec.md` (13890 B, untracked as of this ADR; full command surface, error code matrix, §3 deletion / creation / edit lists, §6.2/6.3 boundary rules)
- Plan: `docs/plans/codebase-memory-removal-and-cli.md` (7 tracer bullets, this ADR is T1; T2-T7 build the CLI, slash command, replacement skill, settings edit, doc cleanup, and obsolete-path deletion)
- Project invariants: `CLAUDE.md` "10-hook 不可 regress" and "副作用禁区" rules
- ADR framework: `docs/rules/context-loop.md` §2.2 (3-condition gate this ADR satisfies)
- Prior cleanup history: `docs/handoff/2026-07-14-full-cleanup-catalog.md`, `docs/handoff/2026-07-15-plugin-mcp-cleanup-final.md` (precedent for scoped cleanup without lockfile / hook regressions)
- Investigation evidence: two surveys recorded in the upstream investigation that produced spec §"Background" (codebase-memory 0 MCP calls, serena only Skill doc reads)
