# Arthurpower Skills

Arthurpower is a Claude Code plugin that ships 30 skills across two
**promoted** buckets — `engineering` (code work, architecture, testing,
security, debugging, performance, authoring) and `productivity` (non-code
workflow tools: cross-session handoff, team-glossary sync). The bucket
discipline, `scripts/link-skills.sh` installer, and this README are ported and
adapted from
`the upstream skills repo` (see
ADR-0011).

A skill is **promoted** when its frontmatter carries `bucket: engineering` or
`bucket: productivity`. Non-promoted buckets (`misc`, `personal`,
`in-progress`, `deprecated`) exist for future use; none are populated today.
`scripts/link-skills.sh` only links promoted skills into the local harness
skill directories.

Each skill below is grouped first by bucket, then by invocation class:

- **User-invoked** — `disable-model-invocation: true`. Only the human, typing
  the skill name, can invoke it. Zero context load.
- **Model-invoked** — model or user reachable; description sits in the
  context window so the agent can fire it autonomously.

## Engineering

### User-invoked

- [codebase-onboarding](skills/codebase-onboarding/SKILL.md) — Use when a newcomer asks to learn a codebase through guided lessons, asks for onboarding, a learning path, a newcomer guide, or systematic study of how a project works.
- [commit-revert-protocol](skills/commit-revert-protocol/SKILL.md) — Use when a commit must be rolled back, a bad change was pushed, a feature toggle must disable a commit, or an ADR is superseded. Drives the revert decision (revert vs reset vs ADR supersede), executes
- [deep-dive-protocol](skills/deep-dive-protocol/SKILL.md) — Use when a long interview, 长访谈, 盘问, 质询, or 深度盘问 is needed to resolve project terms and hard-to-reverse decisions through domain-modeling — then STOP at an explicit operator stop gate before any downstream skill runs.
- [self-evolving-rules](skills/self-evolving-rules/SKILL.md) — Use when the operator manually runs memory or rule evolution — "add a memory", "merge memories", "archive", "rewrite the rule", "move across layers", "clean stale memory", "sync L1 + rule + skill".
- [setup-arthurpower](skills/setup-arthurpower/SKILL.md) — Use when bootstrapping an Arthurpower project for the first time, migrating an existing repo onto Arthurpower (preserving prior content), gap-filling against a partial setup, or switching a multi-cont
- [skill-authoring](skills/skill-authoring/SKILL.md) — Reference for writing and editing skills well — the vocabulary and principles that make a skill predictable.
- [spec-driven-development](skills/spec-driven-development/SKILL.md) — Use when starting a new project or feature with no spec yet, requirements are only a one-line ask, scope spans multiple files or days, an architectural decision lacks approved assumptions, or cross-fu
- [wayfinder](skills/wayfinder/SKILL.md) — Use when a chunk of work is more than one agent session can hold — plan it as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is
- [writing-plans](skills/writing-plans/SKILL.md) — Use when planning implementation after architecture-change-reviewer has issued a verdict. Covers ordered multi-file tasks, binary acceptance criteria, dependency sequencing, and commit-sized work. Tri

### Model-invoked

- [architecture-change-reviewer](skills/architecture-change-reviewer/SKILL.md) — Use before multi-file changes (>3 files) or cross-module work — emits a 5-line verdict (bounded-context-guardian / defensive-contract-validator / error-handling-enforcer / complexity-anti-drift / mini
- [bounded-context-guardian](skills/bounded-context-guardian/SKILL.md) — Use when slicing modules, restructuring folders across multiple files, detecting implementation-detail leaks between sibling modules, encountering circular import errors, noticing shotgun surgery in c
- [code-review](skills/code-review/SKILL.md) — This skill should be used when users ask to "审代码", "审 PR", or "review" Git changes after implementation and before commit. Runs v-code-review, checks Standards and Spec, and returns severity-based rem
- [complexity-anti-drift](skills/complexity-anti-drift/SKILL.md) — Use when a function exceeds 30 lines or 10 branches, a function takes more than 3 parameters, nesting depth hits 4+, a file exceeds 300 lines, code clone percentage is above 3%, or CI reports a comple
- [defend-claim](skills/defend-claim/SKILL.md) — Use when about to report 完成/done/fixed/passing/成功, before git commit/push, when asserting "X works"/"Y is configured"/"no regression", or when a claim substitutes prose for proof. Echoes "defend-claim
- [defensive-contract-validator](skills/defensive-contract-validator/SKILL.md) — Use when adding a public API or CLI command, fixing a bug, introducing an external dependency, or a PR misses a coverage class. Triggers on "add boundary tests", "test the edge cases", "what if input
- [dispatching-parallel-agents](skills/dispatching-parallel-agents/SKILL.md) — Use when 2+ independent tasks can run without shared mutable state, when context isolation is needed between tasks, when parallel subagent dispatch is requested, when batch review of multiple files is
- [domain-modeling](skills/domain-modeling/SKILL.md) — Use when another skill needs to write project terminology, or the user requests glossary alignment, an ADR, or decision persistence. Handles ambiguous or overloaded terms and hard-to-reverse decisions.
- [error-handling-enforcer](skills/error-handling-enforcer/SKILL.md) — Use when modifying error handling in a diff, adding try/catch blocks, returning null/-1/empty string on failure, introducing magic error codes or string codes, adding fallback branches without exit cr
- [frontend-ui-engineering](skills/frontend-ui-engineering/SKILL.md) — Use when building a component, page, or user-facing interface; modifying layout, state container, or visual design; adding keyboard, focus, or screen-reader interaction; reviewing a UI diff before mer
- [intent-inference](skills/intent-inference/SKILL.md) — Use when a request is vague, under-specified, or mixes multiple goals and the true intent must be inferred before any skill runs. Produces a one-paragraph inferred intent plus an explicit confirmation
- [issue-triage-validator](skills/issue-triage-validator/SKILL.md) — Use when Arthurpower receives an external request stream, external PR, or inbound support item and must decide category, state, owner, and next action.
- [minimal-change-verifier](skills/minimal-change-verifier/SKILL.md) — Use when preparing a commit, splitting a commit, adding a dependency, a commit message starts with refactor, a commit touches files outside task scope, a new dependency appears without justification,
- [performance-optimization](skills/performance-optimization/SKILL.md) — Use when optimizing page speed, API latency, or Core Web Vitals. Triggers: slow LCP/INP/CLS, bundle-size growth, render-blocking scripts, images without width/height, N+1 queries, unbounded list endpo
- [security-and-hardening](skills/security-and-hardening/SKILL.md) — Use when adding an endpoint, handler, RPC, web form, auth flow, file upload, third-party API integration, or secret-handling code path, or when input validation, authentication, authorization, rate li
- [systematic-debugging](skills/systematic-debugging/SKILL.md) — Use when debugging a test failure, build break, unexpected runtime error, flaky test, hanging process, or seeing "fix this bug"/"getting an error"/"failing test"/"flaky"/"hanging
- [test-driven-development](skills/test-driven-development/SKILL.md) — Use when implementing any logic, fixing any bug, or changing any behavior — write the failing test first, then minimal code to pass, then refactor. Use when proving code works, when a bug report arriv
- [using-agent-skills](skills/using-agent-skills/SKILL.md) — Use when starting a new session, switching tasks, or unsure which arthurpower skill applies. Routes incoming work to the matching skill via flowchart before invoking. Activates on phrases like "which skill should I use", "skill check", "pre-task skill check", "how to start", "router", "skill routing", or when multiple competing skills could apply. Does NOT auto-trigger symlink skills.
- [verification-before-completion](skills/verification-before-completion/SKILL.md) — Use when about to claim 完成 / done / fixed / passing / ready to ship / 跑过 / 真值, before git commit or push, when a subagent reports success, or before marking a TaskList task complete. Enforces evidence

## Productivity

### User-invoked

- [session-handoff](skills/session-handoff/SKILL.md) — Use when a session is ending, a new agent must continue the same task, or the operator mentions session continuity, cross-session relay, token pressure, or next-agent pickup. Compresses the live thread into a project-local handoff document in docs/handoff/ and references already-committed artifacts instead of duplicating them.
- [team-glossary-sync](skills/team-glossary-sync/SKILL.md) — Use when the same term carries different meanings across projects or team members and a team-level SSOT must be established. Drives the lifecycle of docs/team-glossary.md from propose, conflict detect, merge, to deprecate; writes via domain-modeling so the team-level SSOT stays under the same write authority as project-level CONTEXT.md.

## Non-promoted buckets

the baseline's system reserves four non-promoted buckets for skills that are not
shipped through the plugin:

- `misc` — kept around but rarely used
- `personal` — tied to one operator's setup
- `in-progress` — drafts not yet ready to ship
- `deprecated` — no longer used

Arthurpower currently has **zero** skills in any of these buckets. All 30
skills ship in the two promoted buckets above. If a future skill should not
be linked into local harnesses (for example, an experimental draft), set its
frontmatter `bucket:` to one of these values and `scripts/link-skills.sh`
will skip it on the next run.

## Installation

To (re)link every promoted skill into your local agent-harness skill
directories (`~/.claude/skills` and `~/.agents/skills`), run:

```bash
bash scripts/link-skills.sh
```

Pass `--dry-run` to preview the set of promoted skills without creating any
symlinks. Each link points back into this repo, so a `git pull` keeps
installed skills current; re-run the script after adding, removing, or
renaming a skill.

See [ADR-0011](../docs/adr/0011-fusion-approach-for-github-collab-adaptation.md)
for the fusion strategy and
[the gh-10 ticket](../docs/wayfinder/tickets/gh-10-bucket-tier.md) for the
bucket tier rationale.