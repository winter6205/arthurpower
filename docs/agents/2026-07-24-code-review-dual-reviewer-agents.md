# Code-review dual reviewer agents

Date: 2026-07-24

## Problem diagnosis

`arthurpower:code-review` needs the the baseline author dual-sub-agent mechanism described by ADR-0017: Standards and Spec reviews must run as isolated, parallel axes rather than colliding in one reviewer surface. The two agents provide the dispatch targets while the skill remains the orchestrator and commit gate.

## Responsibility boundary

| Agent | Does | Does not |
|---|---|---|
| `standards-reviewer-agent` | Reads the pinned diff and applies protocol hard rules plus Fowler smells; returns severity findings. | Does not modify files, write plans, run sub-agents, or judge Spec compliance. |
| `spec-reviewer-agent` | Resolves the four-level spec source and checks missing requirements, scope creep, and false implementation. | Does not modify files, write plans, run sub-agents, or judge Standards compliance. |

Both return `Severity | File:Line | Finding | Suggestion` plus an `OVERALL` count. Unresolved High blocks commit through the calling skill.

## Anti-redundancy design

The Standards agent references `arthurpower/skills/code-review/references/protocol.md` §2.2 and §4 instead of copying the Fowler list or severity prose. The Spec agent references §3 and §4, keeping orchestration, acceptance criteria, and shared rule text in the skill/rule sources.

## Verification status

File-level acceptance passed for both agent files: frontmatter, required references, severity labels, and size limits were checked. Live `subagent_type` registration remains pending plugin reload and is intentionally not claimed here.
