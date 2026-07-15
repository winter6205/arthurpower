---
name: context7-lookup
description: Use when answering about a specific library, framework, SDK, API, CLI tool, or cloud service — even well-known ones — to fetch current version-pinned docs. Triggers on API syntax, configuration, version migration, library-specific debugging, setup steps, or CLI usage. Skip for refactoring, scripts-from-scratch, business-logic debugging, code review, or general programming concepts.
version: 0.1.0
author: arthurpower
tags: [reference, lookup, docs, mcp]
type: discipline
---

# context7-lookup

## Scope and Boundary

This skill governs how the agent uses the `context7` MCP server to fetch upstream library documentation. The agent's training data is stale; library APIs drift between releases. When the user names a library, framework, SDK, API, CLI tool, or cloud service and asks anything version-specific, the agent must consult `context7` rather than recall from memory. The skill applies to all arthurpower-routed work because documentation drift is a project-independent correctness risk.

## When to use

- User names a library / framework / SDK / API / CLI tool / cloud service (e.g. "React", "Next.js", "Prisma", "Express", "Tailwind", "Django", "Spring Boot") and asks about API syntax, configuration, options, or setup.
- User asks about version migration, breaking change, or upgrade path for a known dependency.
- User reports a library-specific bug, error message, or unexpected behavior tied to a named package.
- User asks for current CLI flags, environment variables, or auth flow of a named tool.
- User wants the canonical setup / install / initialization steps for a new project using a named framework.

## When not to use

- Refactoring existing code, writing scripts from scratch, or implementing a feature where the API surface is already known.
- Debugging application-level or business logic (logic errors, race conditions, schema design).
- Code review, lint, or style changes.
- General programming concepts, language tutorials, or algorithm design.
- Tasks where the library name is incidental (e.g. "write a regex" inside a Python file).

## Procedure

1. Detect: the user message names a specific upstream library / framework / SDK / API / CLI tool / cloud service AND asks something version-sensitive (syntax, config, migration, setup, CLI flag).
2. If the library is named but the question is about the user's own code using it, still run `context7` for the library-side reference, then re-read the user's code.
3. Call `mcp__context7__resolve-library-id` with a precise query (library name + intent) before any `query-docs` call. Never skip this step.
4. From the returned candidates, select the best match by: exact name match, source reputation (High > Medium > Low > Unknown), snippet coverage (higher is better), benchmark score, and relevance to the user query.
5. If a library version is named in the query (or implied by lockfile / project config), pass the version in the `/org/project/version` form to `query-docs`.
6. Call `mcp__context7__query-docs` with the chosen `libraryId` and a focused question. Do not exceed 3 calls per question.
7. Cite the returned snippets in the answer. If the snippets contradict each other, prefer the highest-reputation source and the most recent version.
8. If `context7` returns no usable snippet, say so explicitly; do not invent API details from training memory.

## Decision Verdict

| Question | Verdict |
|----------|---------|
| User named a library + asked version-sensitive question | PASS — invoke `context7` |
| User asked about their own code that uses a library | PASS — invoke `context7` for library side, then re-read code |
| User asked refactor / business logic / general concept | SKIP — do not invoke |
| `resolve-library-id` returned no match | FAIL-CLOSED — state the gap, do not guess from memory |
| `query-docs` returned no usable snippet | FAIL-CLOSED — say so, do not invent API details |
| Snippets from multiple versions disagree | PASS-WITH-CAVEAT — cite the chosen version explicitly |

## Anti-Self-Certification Bypass Table

| Bypass attempt | Why it fails |
|----------------|--------------|
| "I already know this API from training" | Training data has a cutoff; library APIs drift. Unverified recall = plausible hallucination. |
| "The user just wants a quick answer" | Quick answers from stale memory ship bugs into user code. |
| "It's a well-known library, skip lookup" | "Well-known" is the exact case where stale recall hurts most (high traffic + frequent breaking changes). |
| "resolve-library-id is redundant" | The libraryId format is `/org/project/version`; guessing it returns nothing or wrong docs. |
| "No snippet returned, I'll describe from memory" | Memory-derived API details have no source of truth; fail closed. |
| "I'll cite the docs without reading them" | Citation requires the snippet content; hand-waving citation is fabrication. |

## Pitfalls

- Skipping `resolve-library-id` and calling `query-docs` directly with a guessed ID.
- Picking the first candidate from `resolve-library-id` without checking source reputation or snippet count.
- Returning training-memory details when `context7` returned no snippet, instead of stating the gap.
- Calling `context7` more than 3 times for a single question (token waste; refine the query instead).
- Citing a snippet without quoting or paraphrasing the actual returned content.
- Mixing snippets from two different library versions in one answer without flagging the version split.
- Treating `context7` as a web search replacement; it is upstream-docs only.

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "I know React / Next.js / Prisma cold, no lookup needed" | You knew the version at training time. The user's installed version may differ; APIs drift every release. |
| "Quick answer is better than slow correct answer" | A fast wrong answer ships a bug. The user pays for the correction downstream. |
| "context7 is just a wrapper around docs" | It is. That is the point — it returns version-pinned snippets, not memory. |
| "The library is small / niche, no docs to find" | Small libraries change too; if `context7` returns nothing, that is the answer. |
| "I'll mention I used context7 without quoting it" | Mentioning the tool without quoting its output is self-certification. Cite the snippet. |
| "resolve-library-id adds latency, skip it" | Skipping it produces zero or wrong results. Latency cost > correctness cost. |
| "Multiple snippet disagreements means I should pick the majority" | Pick the highest-reputation + most-recent-version source. Majority-vote on API surface is hallucination. |

## Red Flags

- Answer cites API surface (function names, option keys, CLI flags) without a `context7` snippet reference.
- `context7` returned no match but the answer proceeds with API details anyway.
- More than 3 `query-docs` calls for a single user question.
- `resolve-library-id` skipped in the trace.
- Snippet version not stated when the user is on a specific version.
- "I'll look it up later" or "see docs" without actually invoking `context7` in this turn.
- Mixing snippets from different library versions without version labels in the answer.

## Acceptance Criteria

- [ ] Detection step ran before any `context7` call (library named + question is version-sensitive).
- [ ] `resolve-library-id` called with a focused query, candidate chosen by name + reputation + snippet count + benchmark.
- [ ] Version included in `libraryId` when known (lockfile / project config / user statement).
- [ ] `query-docs` called with a focused question, ≤ 3 calls per user question.
- [ ] Returned snippet content quoted or paraphrased in the final answer.
- [ ] No API details invented from training memory when `context7` returned no usable snippet; gap is stated explicitly.
- [ ] No skill content uses private-prefix namespace bindings (validator enforces).
- [ ] `context7` not used as a web-search replacement.

## Verification

```
Skill type: discipline
Bar level:  discipline
```

Reason: this skill enforces a non-negotiable lookup-first rule under pressure ("just answer quickly", "I already know it"). Pressure scenarios, rationalization coverage, and Red Flags are required.

Run the structural validator after every edit:

```bash
python3 scripts/validate_skill.py arthurpower/skills/context7-lookup/SKILL.md
```

Validator exits 0 on pass, 1 on any violation. Treat non-zero exit as a hard gate; do not commit.

## Cross-References

- `skill-authoring` — meta-standard for authoring any `arthurpower` skill (frontmatter rules, validator invocation).
- `using-agent-skills` — router that loads this skill when `context7`-shaped queries arrive.
- `codebase-memory` — companion lookup for code-graph questions; use when the question is about the project's own code, not upstream docs.
- `serena` — companion lookup for symbol-level code edits; orthogonal to docs lookup.
- `mcp__context7__*` — tool surface; `resolve-library-id` (mandatory first call) and `query-docs` (≤ 3 calls per question).
