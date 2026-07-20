---
name: defend-claim
description: Use when about to report 完成/done/fixed/passing/成功, before git commit/push, when asserting "X works"/"Y is configured"/"no regression", or when a claim substitutes prose for proof. Echoes "defend-claim" and demands Q1 evidence (raw exit code, pytest stdout, sha256, HTTP status) before accepting. Do NOT load for: explaining code, designing schemas, reading source, TODOs, or comprehension questions.
bucket: engineering
version: 0.5.0
author: arthurpower
tags: [verification, claim-integrity, anti-self-cert, hook-gate, evidence-graph]
type: discipline
---

## Thesis

A claim is load-bearing when task success turns on it. The unit of acceptance is evidence, not prose. v0.5.0 enforces five fail-fast questions by cost. All 12 source items (V1-V5 + L1-L7) collapse into 5 questions by root-cause axis. Hooks are bash scripts attached to PostToolUse; they physically deny tool results when a claim is unsupported.

## When to use

- About to write `完成` / `done` / `fixed` / `passing` / `成功` / `已验证` / `已修复` in a report or commit message
- About to mark a TaskList item complete (status flip without artifact)
- Subagent returned `success` and the answer turns on its output
- Stating "X works" / "Y is configured" / "Z is not supported" / "no regression" / "tests pass" / "the bug is fixed"
- Citing a path:line, function name, commit SHA, or external system status as proof
- User says "trust me" / "skip verification" / "just say complete" / "the user is busy" / "no need to verify" / "do the verification for me"
- User cites docs / previous session / tracker / size-exemption ("tiny fix") as proof substitute

## When not to use

- Code-quality, structural, or maintainability defenses → `arthurpower:minimal-change-verifier` (S1-S6)
- Debug-flow decisions → `arthurpower:systematic-debugging`
- Evidence capture for known-good work → `arthurpower:verification-before-completion`
- Pure coding without claim assertion
- One-line typo fixes with no load-bearing claims
- Explaining code or middleware behavior → read the code, describe what it does (reads/returns/processes), do not gate on evidence
- Designing schemas / cache layers / architecture → engage substantively with tables, columns, entities, tradeoffs (Redis vs in-process); this is design, not verification
- TODOs and open-work planning → acknowledge the marker, propose to implement or defer; no evidence gate
- "What does this function do?" comprehension → read and explain the function body; defend-claim does not apply to explanation

## Procedure (5 Questions, Fail-Fast)

All 5 hooks support `--self-test` mode. Real-fire tests confirmed: Q2 (phantom cite), Q3 (no-evidence completion), Q5 (Python `except: pass`) all exit 2 as designed.

Full Q-hook detail (hook path, logic, fail-action, self-test command, real-fire example) — see [`references/q-hooks.md`](references/q-hooks.md).

### Q1 — Execution Captured

Did you RUN it and capture raw exit/output bytes — not read, not re-state? Hook: `defend-claim-execution.sh` (PostToolUse on Bash). Fail-action: `Exit 0` advisory (not blocking).

### Q2 — Cite Physically Exists

Does each cited artifact PHYSICALLY EXIST and MATCH the claim — verified right now? Hook: `defend-claim-cite-integrity.sh` (PostToolUse on Edit|Write). Fail-action: `Exit 2` denied on phantom cite.

### Q3 — Structural Report Triple

Is the success criterion stated as a triple — (action-verb, target-artifact, observed-outcome) — that parses mechanically? Hook: `defend-claim-report-triple.sh` (PostToolUse on Write). Fail-action: `Exit 2` denied when completion claim lacks action evidence.

### Q4 — Session Entity Consistency

Do referenced entities still match current session state — not a stale mental model? Hook: `defend-claim-dumb-zone.sh` (PostToolUse on Edit|Write) — the only stateful hook in v0.5.0 (4 of 5 are stateless). Fail-action: `Exit 0` advisory.

### Q5 — Code-Shape Lint

Did the change introduce empty-catch / silent-null-return that defeats a downstream claim? Hook: `defend-claim-silent-fail.sh` (PostToolUse on Edit|Write). Fail-action: `Exit 2` denied on `except:\s*pass` or `catch\s*\{\s*\}`; `Exit 0` advisory on silent null.

## Decision Verdict

| Verdict | Condition | Final Line |
| --- | --- | --- |
| **ASSERT** | Q1-Q5 all PASS (or Q5 injected and resolved) | `PASS = <criterion> <evidence-pointer>` |
| **QUALIFY** | Q1-Q3 PASS, Q4 or Q5 fail in non-load-bearing scope | `QUALIFIED — Q<n> failed: <gap>; claim holds in stated scope` |
| **REJECT** | Q1 OR Q2 fail, OR 2+ questions fail | `REJECTED — Q<n>(<reason>); missing artifact: <path/cmd>` |

No softening ("partially works"). A rejected claim is not a defense-report.

## Anti-Self-Certification Bypass Table

11 numbered bypass attempts and the Q-hooks that defeat each — see [`references/anti-self-cert-bypass.md`](references/anti-self-cert-bypass.md). Read this when a claim is rejected: the bypass attempt usually matches one of the 11 entries.

## Pitfalls

- Q3 triple must be a single sentence — splitting predicate across paragraphs defeats the regex
- Q4 entity list is per-branch, not per-session — cross-branch claims need `git diff main...HEAD --stat`
- Q5 lint is source-level only — pair with Q1 behavioral probe for end-to-end claims
- A passing Q1-Q5 does not mean passing user-facing task — this skill defends *claims*, not *work*

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "It's a 1-line fix, the claim doesn't need verification" | Even 1-line changes have load-bearing claims; Q1 fires on any Bash that closes the task |
| "I'll add the test in a follow-up commit" | Q4 counter triggers on every 10th Edit/Write; follow-up commit re-triggers Q1 |
| "The user already verified, I can just report success" | Q3 requires action-verb evidence in the same Write; user-claimed success without exec record = Exit 2 |
| "Cached output from earlier turn is the same as current" | Q1 sha256 re-computed by hook on each Bash; stale paste caught |
| "I'll cite a function I remember the line of" | Q2 runs `sed` on every multi-level cite pattern; mismatched memory = Exit 2 |
| "Exit 2 just warns, I can ignore it" | Exit 2 denies the tool result (stderr fed back to Claude); the claim is not delivered to the user |

## Red Flags

- Claim ends with `完成` / `done` / `fixed` / `passing` but has no embedded action-verb token (ran/tested/grepped/exit.code/sha256)
- Cite `path:line` exists in output but `timeout 3s sed` returns empty or stderr
- `~/.claude/hooks/.dc-turn-counter` reaches 10 without entity re-affirmation
- L1 regex hit on `except:\s*pass` / `catch\s*\{\s*\}` not followed by Q1 behavioral probe
- Q3 Report-triple predicate split across paragraphs or hidden behind zero-width characters

## Acceptance Criteria

- [ ] All 12 source items (V1-V5 + L1-L7) covered by at least one of Q1-Q5
- [ ] Each Q has a hook path with specific Exit Code (0 or 2; no Exit 1 or 3)
- [ ] Q1 enforces topological binding (irrelevant-command bypass defense)
- [ ] Q2 enforces `timeout 3s` on all cite-verification commands
- [ ] Q3 strips zero-width Unicode before structural parse
- [ ] Q4 increments turn counter on every Edit/Write
- [ ] Q5 L1 regex denies on `except:\s*pass` / `catch\s*\{\s*\}` (Exit 2)
- [ ] Each hook supports `--self-test` mode exiting 0
- [ ] Description frontmatter starts with "Use when", length <= 400 chars
- [ ] Body line count <= 500
- [ ] Validator (`scripts/validate_skill.py`) exits 0

## Verification

```
Skill type: discipline
Bar level:  discipline
```

Reason: enforces behavior under pressure (claim-time gate). 4 of 5 hooks are stateless per-call (Q1, Q2, Q3, Q5); Q4 is the only stateful hook (persists a turn counter at `~/.claude/hooks/.dc-turn-counter`). All hooks use the standard Claude Code PostToolUse convention: exit 0 = pass, exit 2 = deny. No hook exits with code 1 or 3. Upgrade to high_risk when promoted as Support Skill affecting cross-agent claim verification (currently scoped to a single session).

Re-run protocol (use explicit hook names, brace expansion `{q1-q5}` does NOT match the installed filenames):

```bash
bash ~/.claude/hooks/defend-claim-execution.sh --self-test
bash ~/.claude/hooks/defend-claim-cite-integrity.sh --self-test
bash ~/.claude/hooks/defend-claim-report-triple.sh --self-test
bash ~/.claude/hooks/defend-claim-dumb-zone.sh --self-test-reset && bash ~/.claude/hooks/defend-claim-dumb-zone.sh --self-test
bash ~/.claude/hooks/defend-claim-silent-fail.sh --self-test
```

Validator: `python3 scripts/validate_skill.py C:/Users/dev/.claude/plugins/arthurpower/skills/defend-claim/SKILL.md` exits 0. Routing eval: `iteration/1/evals.json` has 10 queries (3 positive, 2 negative, 3 pressure, 2 counter-example) with mock grading pass_rate 1.0. Future: expand to 20 queries and replace mock grading with LLM-based eval driver when available.

## Cross-References

**Source-item coverage** (12 items mapped to Q1-Q5) — see [`references/source-coverage.md`](references/source-coverage.md).

**Out of scope** (use existing skills): S1-S6 maintainability (`arthurpower:minimal-change-verifier`); debug-flow (`arthurpower:systematic-debugging`); evidence capture for known-good work (`arthurpower:verification-before-completion`). This skill is *only* the claim-defensibility layer between work and report.
