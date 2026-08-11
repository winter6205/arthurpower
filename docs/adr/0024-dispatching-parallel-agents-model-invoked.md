# 0024. dispatching-parallel-agents unlocked to model-invoked; Dispatch branch added to router

Date: 2026-08-11
Status: proposed

## Gate check

1. **Hard to reverse**: yes. Unlocking removes the router's deliberate
   "requires explicit user trigger" discipline for `dispatching-parallel-agents`
   (symlink Red Flag list + flowchart Restricted branch in `using-agent-skills`).
   Reverting means re-adding the Restricted discipline across SKILL.md /
   flowchart / quick-reference, plus marketplace + cache re-sync (ADR-0010's
   3-layer parity lesson). The model also builds call habits while unlocked.
2. **Surprising without context**: yes. APR-05 deliberately wired
   `dispatching-parallel-agents` into the router as Restricted / symlink
   (explicit user trigger only). A future reader who sees it auto-firing will
   ask "why did it escape the Restricted list?" — this ADR is that answer.
3. **Real trade-off**: yes. Three options — α router branch only (skill stays
   Restricted), β unlock + branch + description, γ status quo (strengthen
   CLAUDE.md wording only). Each has a real cost; β was chosen because the
   root cause of the dispatch failure was "nothing pushes main toward the
   dispatcher at the decision moment".

All three conditions pass; ADR is recorded.

## Context

Wayfinder map #96 (Dispatch Discipline + Test-Agent Coherence), ticket OD-00
(A(b) = c + β). Root cause of "调度原则写在全局 CLAUDE.md 但 main 不会执行":
the dispatch discipline has no operational consequence — the dispatcher skill
is wired but locked behind the router's "symlink skills require explicit user
trigger" rule, so the model never fires it at the moment dispatch is
warranted. The decision: fix the trigger mechanism rather than add a hook
(dispatch judgment is semantic; hooks are deterministic — `linter-as-LLM`
applies both ways, ADR-0006 context).

Ground truth established during the session:
- `dispatching-parallel-agents` SKILL.md frontmatter already has a
  `description` and omits `disable-model-invocation` — the skill is
  structurally model-invoked already. The lock lives entirely in the router:
  `using-agent-skills` SKILL.md Red Flag list (L196 names it a symlink skill)
  + flowchart Restricted branch + "symlink requires explicit trigger" step.
- `using-agent-skills/references/quick-reference.md` already lists
  dispatching-parallel-agents under the "Meta" phase with triggers; the
  Restricted table itself is empty — the restriction is carried by router
  discipline text, not the table.

Precedent: ADR-0001 (domain-modeling model-invoked) and ADR-0010 (ACR
unlocked to model-invoked with a 3-layer protection model: doc contract +
physical sha256 + discipline). This ADR mirrors ADR-0010's shape.

## Decision

Adopt β for OD-00 A(b):

1. **Unlock `dispatching-parallel-agents` to model-invoked.** Remove it from
   the router's symlink / Restricted discipline (Red Flag list, flowchart
   Restricted branch, "requires explicit user trigger" step) in
   `using-agent-skills`. The skill's frontmatter already permits model-invoked
   loading; this removes the router-side lock.
2. **Add an explicit Dispatch routing branch** to `using-agent-skills`
   (flowchart + SKILL.md + quick-reference): when a selected skill plus a
   non-trivial task needs parallel / context-isolated subagents, route to
   `dispatching-parallel-agents`. Router invariant honoured — all three router
   artifacts updated together.
3. **Strengthen the dispatch skill's `description`** for model-facing
   auto-trigger (phrasing for "fan out", "dispatch N independent", "run these
   checks in parallel").
4. **No hook.** Dispatch judgment stays with the model; the 10-hook set is
   untouched; no ADR exemption requested.
5. **Boundaries preserved:** no new agent/skill; dispatcher 3-condition gate +
   7-field template untouched; `boundary-testing` skill not revived (APR-06);
   map #96 out-of-scope list respected.

Status flows to `accepted` when OD-00 closes. Execution lands in OD-01
(dispatch-rule SSOT) / OD-02 (CLAUDE.md L5 pointer) task tickets.

## Consequences

**Positive:**
- The dispatch skill becomes auto-reachable at the decision moment — the exact
  gap that caused "main 不执行调度原则".
- Global CLAUDE.md L5 pointer text (D1) cites this unlocked entry point.
- Precedent alignment: ADR-0010's "Model-invoked gates" row pattern is reused.

**Negative / follow-up:**
- Model may over-trigger dispatch on adjacent prompts (false positive).
  Absorption: the dispatcher's own 3-condition gate (independent tasks / no
  shared mutable state / no cross-task overlap) rejects unqualified fan-outs —
  the gate is the cost absorber, exactly as ACR's 5-line verdict absorbs
  over-trigger under ADR-0010.
- Router drift risk: quick-reference + flowchart + SKILL.md must stay in sync
  (router invariant).
- Marketplace + cache must re-sync the edited router/dispatch skill bodies
  (3-layer parity per ADR-0010).
- Global CLAUDE.md L5 is a global file; non-arthurpower projects see only the
  pointer text, not the full rule.

## Considered Options

### α — router branch only; skill stays Restricted (rejected)
- Pros: smallest change; no router discipline edit.
- Cons: fixes "router will point", not "main will think of it". The Restricted
  discipline still requires explicit user naming — the model still skips
  dispatch unless it remembers the router. Same horse, re-bet.

### β — unlock + branch + description (adopted)
- Pros: complete fix for the root cause; the dispatcher's own gate absorbs
  false positives; aligns with ADR-0001 / ADR-0010 precedent.
- Cons: touches router discipline; needs 3-layer re-sync; one more table row.

### γ — status quo; strengthen CLAUDE.md wording only (rejected)
- Pros: zero structural change.
- Cons: documented the root cause precisely — "写在 CLAUDE.md 但 main 不执行" —
  more text on the same wall does not change behavior.

## Why not α / γ

α fixes the router's pointing but not the model's remembering — the failure
mode was never "the router didn't know", it was "main never reached the
dispatch decision". γ is precisely the pattern this map exists to kill: prose
alone, no operational consequence. β changes the trigger mechanism, which is
the only lever that changes behavior.

## References

- Map: `wayfinder:map` #96 "Dispatch Discipline + Test-Agent Coherence"
- Tickets: OD-00 #98, OD-01 #99, OD-02 #100, OD-03 #101, OD-06 #102
- ADR-0001 / ADR-0010 (precedent), ADR-0006 (validator-ambiguity context)
- APR-05 (dispatch wiring, commits c4954e7 / bc77b89), APR-06 (boundary-testing)
- `arthurpower/skills/using-agent-skills/SKILL.md` L196 + `references/quick-reference.md` + `references/flowchart.md`
- `arthurpower/skills/dispatching-parallel-agents/SKILL.md`
