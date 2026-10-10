# 0009. `settings.json` is not tracked in `~/.claude` SSOT

Date: 2026-07-18
Status: accepted

## Gate check

1. **Hard to reverse**: yes. Tracked `settings.json` would re-introduce the
   secret-leak failure mode the user-level repo was designed to prevent.
   Untracking later requires scrubbing history, not just adding a rule.
2. **Surprising without context**: yes. T2 ticket draft line 22 listed
   `settings.json` as committed SSOT, contradicting the actual ignore rules.
   Without this ADR, the drift between ticket wording and ignore reality is
   silent and would reappear in future tickets.
3. **Real trade-off**: yes. Options were (A) track `settings.json` per ticket
   wording, (B) keep `settings.json` ignored and surface drift via this ADR,
   (C) move it into a separate sidecar that strips secrets. B was selected;
   secret-aware default wins.

All three conditions pass; ADR is recorded.

## Context

The user-level `~/.claude` data directory was promoted to a git repo (see
handoff 2026-07-17-user-claude-git-init-and-evals-autoload (`docs/handoff/2026-07-17-user-claude-git-init-and-evals-autoload.md`))
so that L1 rules, hooks, agent prompts, and knowledge assets have version
history. The ignore policy at `<workspace>/data/.gitignore` deliberately
excludes `settings.json` and related secret-bearing files.

A subsequent T2 ticket draft under the `claude-sync-ssot` plan listed
`settings.json` as a tracked, committed SSOT. That wording contradicted the
actual on-disk ignore rules. Without an ADR, the ticket would have been the
authoritative drift and a future operator would either commit a secret file
(NEVER #5 violation) or reverse the ticket without explanation.

## Decision

1. **`settings.json` is not tracked in `~/.claude`.** The user-level repo
   tracks rules / hooks / agents / skills / `CLAUDE.md` / `.gitignore`
   knowledge only. Per-machine settings stay untracked, in the user home,
   edited surgically per boundary-testing § "通用外科式 edit 纪律" (`./.claude/rules/boundary-testing-protocol.md`).
2. **Lines 6, 8, 59, 67 of `<workspace>/data/.gitignore` are the canonical
   ignore rules** for `settings.json`, `**/settings.json`,
   `settings.local.json`, and `.claude.json` respectively. They are the
   user-level manifest of "secrets + machine state never enter git".
3. **T2 ticket wording is corrected by this ADR.** The ticket draft is
   drift; the on-disk ignore reality is the source of truth. Ticket 02 is
   treated as a drafting defect to be reopened (see annotation below).
4. **Future `~/.claude` sync work must not propose tracking `settings.json`
   or any file under the `settings*.json` / `.claude.json` / `.mcp.json` /
   `.credentials.json` family** without first reopening this ADR with a
   new numbered decision and a sidecar strategy approved in writing.

> Contradicts ticket 02 — but worth reopening because ticket draft was wrong, secret-aware default wins

## Consequences

**Positive:**
- Secret-bearing configuration cannot enter the knowledge repo by accident.
- The ticket-vs-ignore drift is now ADR-recorded and machine-checkable
  (a fresh `git check-ignore` on `settings.json` returns ignored, while
  grep for `settings.json` in tracked files under the user-level repo
  stays zero).
- Future `~/.claude` sync plans inherit the rule by pointer.

**Negative / follow-up:**
- Operators who share working `settings.json` snippets between machines
  must do so via encrypted out-of-band channels, not via the data repo.
- The data repo's absence of remote (handoff §"Open blockers" item 2)
  remains a separate concern; this ADR does not touch backup strategy.

## Considered Options

### Option A: Track `settings.json` per T2 ticket draft (rejected)

- Pros: matches ticket literal wording.
- Cons: reintroduces the secret-leak failure mode the data repo was
  designed to prevent; contradicts the ignore rules already in place;
  violates CLAUDE.md NEVER #5.

### Option B: Keep `settings.json` ignored, surface drift as ADR (accepted)

- Pros: respects the actual ignore policy; records the decision so future
  tickets inherit it; aligns with boundary-testing protocol on
  secret-bearing config.
- Cons: requires one extra ticket-reopen step in the claude-sync plan.

### Option C: Sidecar commit that strips secrets (rejected for this cycle)

- Pros: shared working preferences without re-entering secrets.
- Cons: out of scope for the current `claude-sync-ssot` plan; would
  require a separate ADR with a stripper contract and a verification
  driver.

## Why not A/C

A breaks the data repo's threat model and silently violates NEVER #5.
C is a defensible future path but is not within the B2 acceptance
contract; recording A as forbidden keeps the sidecar work reversible
once designed.

## Evidence pointers

- Plan: `plans/claude-sync-ssot.md` (`plans/claude-sync-ssot.md`) bullet B2
- Ignore manifest: lines 6, 8, 59, 67 of the user-level `.gitignore`
  (target = `<workspace>/data/.gitignore`)
- Handoff that established ignore policy and verified clean stage:
  docs/handoff/2026-07-17-user-claude-git-init-and-evals-autoload.md (`docs/handoff/2026-07-17-user-claude-git-init-and-evals-autoload.md`) § "Verified state"
  (staged-content pattern scan before commit: 0 real key material hits)
- Secret-aware edit discipline:
  .claude/rules/boundary-testing-protocol.md (`.claude/rules/boundary-testing-protocol.md`) § "通用外科式 edit 纪律"
- Project NEVER #5: [CLAUDE.md](../../CLAUDE.md) § "不变量 NEVER"
