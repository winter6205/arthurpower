# 0010. ACR frontmatter adopts model-invoked loading (Path B); gate stays hard

Date: 2026-07-18
Status: accepted

## Gate check

1. **Hard to reverse**: yes. Flipping `disable-model-invocation` reopens the
   PR #7 doctrine churn (gate-only vs auto-trigger). Future agents who see
   `dmi: false` on ACR will treat model-invoked as settled; reverting later
   requires both skill body and router documentation edits, plus 3-layer
   cache re-sync.
2. **Surprising without context**: yes. ADR-0007 §Decision 4 currently locks
   `disable-model-invocation: true` + no `description`. After Path B the
   skill frontmatter gains `description` and the flag flips. Without this
   ADR, ADR-0007's text would silently contradict the live frontmatter and
   confuse future readers who grep `disable-model-invocation`.
3. **Real trade-off**: yes. Three defensible paths were considered (Path A
   add description only, Path B description + `dmi: false`, Path C ACR
   unchanged + writing-plans reaches ACR internally). Path B selected per
   ticket 01 resolution; the trade-off was operator-gate visibility vs
   model auto-trigger reach, settled in favor of reach + 3-layer protection.

All three conditions pass; ADR is recorded.

## Context

[ADR-0007](./0007-acr-gate-only-tracer-bullet-writing-plans.md) §Decision 4
mandated that `architecture-change-reviewer` (ACR) frontmatter omits
`description` while keeping `disable-model-invocation: true` (user-invoked;
router / slash reach). The trade-off recorded there was "operator 主动 gate"
visibility: only an operator typing `/architecture-change-reviewer` (or
walking through the user-invoked router) would load ACR. PR #7 settled the
reorg; ADR-0007 §Decision 1 (gate-only), §Decision 2 (writing-plans owns
tracer bullets), and §Decision 3 (verdict SSOT = `plans/<feature>.md`) were
all preserved verbatim.

Operator requested ACR re-enabled in a format that agents can auto-trigger.
[ticket 01](../wayfinder/tickets/01-trigger-mode.md) closed 2026-07-18 with
Path B chosen: add `description` and flip `disable-model-invocation: false`.
[ticket 02](../wayfinder/tickets/02-verdict-grammar-tips.md) is orthogonal —
it fixes a verdict grammar mismatch + a real `git diff --stat | wc -l` bug in
the SKILL.md body, landed in the same session as separate commits.

The doctrinal risk of Path B is real: removing `dmi: true` strips the
"operator 主动 gate" layer that ADR-0007 §Decision 4 called out as
protection against silent ACR skipping. The mitigation is a 3-layer
protection model — analogous in shape (not in mechanism) to ADR-0001's
3-layer write-authority for `domain-modeling` (doc contract + physical hook
+ discipline).

## Decision

1. **ACR frontmatter gains `description`.** The single-sentence trigger
   phrase is: `Use before multi-file changes (>3 files) or cross-module work
   — emits a 5-line verdict (bounded-context-guardian /
   defensive-contract-validator / error-handling-enforcer /
   complexity-anti-drift / minimal-change-verifier) and blocks on no /
   unclear. Triggers on multi-file change, new module, cross-module refactor,
   plan before implementation.`
2. **ACR frontmatter flips `disable-model-invocation: false`** (model-invoked).
   Operator still has explicit reach via `/architecture-change-reviewer` or
   router walk, but the model now also auto-triggers on matching prompts.
3. **3-layer protection model preserves gate hardness**, mirroring the
   three-body / ADR-0001 shape:
   - **doc contract**: `using-agent-skills` Failure Modes #2, Red Flag list,
     and Acceptance #5 all keep "ACR + writing-plans are gates, not
     suggestions" — re-checked after router sync (see Decision 4).
   - **physical**: 3-layer sha256 sync of the skill body across marketplace
     + cache 0.6.0 + cache 0.7.0 keeps all three observation points
     byte-identical so `/reload-plugins` and `claude plugin list` see one
     consistent frontmatter (no silent stale-cache trap).
   - **discipline**: `writing-plans/references/handoff-acr.md` still says
     "ACR runs first", still mandatory, still 5-line verdict — writing-plans
     is unchanged.
4. **Router documentation moves ACR out of the "User-invoked gates" table.**
   `arthurpower/skills/using-agent-skills/references/quick-reference.md`
   reclassifies ACR under a new "Model-invoked gates" row. `writing-plans`
   stays in the user-invoked table (Path C was rejected precisely because
   it would have collapsed both into one auto-trigger surface). A 2-line
   footer annotation on `flowchart.md` cites this ADR.

**Boundary check vs ADR-0007**: this ADR supersedes **§Decision 4 only**.
§Decision 1 (gate-only) stays verbatim — ACR still emits the 5-line verdict,
still no decomposition, still no post-impl review. §Decision 2 (writing-plans
owns tracer bullets) is untouched — this plan is itself a writing-plans
output. §Decision 3 (verdict SSOT = `plans/<feature>.md`) stays verbatim —
`plans/acr-reenable.md` IS the SSOT for this cycle's verdict block.

## Consequences

**Positive:**
- ACR is auto-reachable by the model on multi-file change prompts; operator
  gate is preserved by the 3-layer model (doc contract + physical sha256 +
  discipline), not by `dmi: true` alone.
- Gate hardness is unchanged: any `no` / `unclear` verdict still blocks
  implementation (see ticket 02 grammar fix in the same cycle).
- ADR-0007 §Decision 1–3 stay authoritative on gate-only, tracer-bullet
  ownership, and verdict file SSOT — the doctrinal layer above frontmatter.

**Negative / follow-up:**
- Marketplaces + caches must stay sha256-parity post every ACR frontmatter
  edit; lagging caches will keep serving the old `dmi: true` body and
  silently undo the flip (mitigation: A6 sync bullet in
  `plans/acr-reenable.md`).
- Model may over-trigger ACR on adjacent prompts (false positive). The
  5-line verdict gate itself absorbs the cost — verdicts are cheap to write,
  and writing-plans hands off only on all-yes.
- A new "Model-invoked gates" row in `quick-reference.md` is one more table
  to keep accurate; future split of gate vs suggestion needs to track both
  rows.

## Considered Options

### Path A — add description, keep `dmi: true` (rejected)
- Pros: lightest reopen of ADR-0007 §Decision 4; keeps operator gate
  visible; no 3-layer model needed.
- Cons: model still cannot auto-load ACR; operator must type
  `/architecture-change-reviewer` every time. Loses the reach that motivated
  the ticket.

### Path B — description + `dmi: false` (accepted)
- Pros: ACR auto-reachable; gate hardness preserved by 3-layer model;
  aligns with ADR-0001 precedent for doc-contract + physical + discipline.
- Cons: doctrinal risk; requires sha256 sync discipline; one more
  router table to keep accurate.

### Path C — writing-plans as proxy, ACR unchanged (rejected)
- Pros: zero frontmatter change; no ADR reopen.
- Cons: ACR is reached only via writing-plans Step 1; user-invoked gate
  flips to indirect invocation, harder to reason about; defeats the
  operator's "I want ACR auto-triggered" intent.

## Why not A / C

A keeps the operator-only gate that ticket 01 was specifically opened to
remove; the doctrinal cost (reopen §Decision 4) is paid either way. C
re-opens the dual-owner problem PR #7 just resolved by collapsing both
gates into one indirect chain; the trade-off (no frontmatter churn) does
not justify losing direct ACR reach.
