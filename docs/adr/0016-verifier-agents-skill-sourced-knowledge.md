# 0016. Verifier agents source knowledge from owning skill, not global rules or inline citations

Date: 2026-07-23
Status: accepted

## Context

The 6 verifier agents (S1–S6) had `## Reference → Rule source` pointers at `~/.claude/rules/sN-*.md`. Those files were migrated into each owning skill's `references/` (commit fca9ad5, ticket ctx-v2-04-user-rules). The pointers were stale — the files no longer exist. Additionally, each agent carried a `Provenance` citation line attributing its criteria to books/papers. An authoritative-source audit (6 parallel subagents, web-verified) found misattributions: S2 falsely attributed "5 boundary classes" to Kent Beck; S3 inverted the Amazon Builders' Library stance (the article argues against fallback, not for annotating it); S4 attributed the three laws of TDD to Beck instead of Robert C. Martin; S6 cited the wrong Pragmatic Programmer tip number (Tip 12 instead of Tip 13).

## Decision

1. Repoint all 5 affected agents' `Rule source` to the owning skill's installed `SKILL.md` at `~/.claude/plugins/marketplaces/arthurpower-local/plugins/arthurpower/skills/<name>/SKILL.md` (S5 was already fixed by the operator).
2. Remove `Provenance` citation lines from all 5 agent files — citations have no runtime effect (agents check criteria, not literature). Audit findings archived at `docs/agents/2026-07-23-verifier-agents-provenance-audit.md`.
3. Extend S4 (test-driven-development) agent from 5 criteria to the skill's full 9-point acceptance set (8 hard gates + 2 soft REVIEW triggers), mirroring the S5 hard-gate + soft-REVIEW pattern.

## Consequences

**Applied:**
- Single source of truth: agents reference the skill, not a duplicate rule file.
- No inline citations to maintain or drift.
- S4 agent covers the full TDD acceptance set, not a subset.

**Trade-offs:**
- Agents depend on the skill being installed at the expected plugin path.
- Provenance knowledge lives only in the audit archive, not in the agent files themselves.
