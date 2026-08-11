# 0025. defend-claim skill de-integrated to docs page; hook layer unchanged

Date: 2026-08-12
Status: accepted

## Gate check

1. **Hard to reverse**: yes. De-integration removes the skill layer (SKILL.md +
   references/ + iteration/) and the router entry in `using-agent-skills` +
   the description line in `plugin.json`. Reverting means restoring the skill
   tree, re-syncing router / quick-reference / flowchart / plugin.json (the
   ADR-0024 / ADR-0010 3-layer parity lesson), and re-populating the iteration
   eval directory. The five `.ts` hook files and `hooks.json` stay in place
   either way — the hook layer is the identity, the skill layer is the
   navigation surface.
2. **Surprising without context**: yes. `hooks.json` still lists 10 hooks,
   five of which are named `defend-claim-execution` / `cite-integrity` /
   `report-triple` / `dumb-zone` / `silent-fail`, but the plugin manifest and
   router no longer expose a `defend-claim` skill. A future reader who sees
   "5 hooks fire but no skill triggers" will ask "where is the discipline
   written down?" — this ADR is the answer (it lives at
   `docs/engineering/defend-claim.md`).
3. **Real trade-off**: yes. Three options — α keep the model-invoked skill
   and rewrite (3c), β downgrade to `disable-model-invocation: true`, γ
   de-integrate to a docs page (adopted). α wastes context load on a
   structurally inert trigger surface (0 calls; hook layer auto-fires).
   β keeps a half-inert skill in the tree (operator confusion). γ preserves
   every operational artifact (the 5 hooks, the verdict logic, the
   reference material) but moves the human-facing exposition out of the
   always-loaded skill slot, aligning with ADR-0019's "de-integrate not
   hard-delete" precedent (security-and-hardening, frontend-ui-engineering,
   performance-optimization) and SC-02's (#105) archive + REVIVAL pattern.

All three conditions pass; ADR is recorded.

## Context

Wayfinder map `skill-and-agent-curation` (#97) → SC-R0 evidence ledger →
SC-03 ticket (originally #106, superseded and carried by #114). The
disposition decision (operator-ratified 3c) committed to "skill name stays
`defend-claim`, rewrite two SKILL.md bodies"; this ADR records the
**re-opening** of that decision during the rewrite discussion, where the
operator observed that `defend-claim` has **0 invocations** (SC-R0) and
that the 5 PostToolUse hooks fire independently of whether any skill is
loaded.

Ground truth established during the session:

- The skill layer (SKILL.md + description) is **structurally inert** at the
  trigger surface. Hooks (`PostToolUse` on Bash / Edit / Write) read no
  SKILL.md. They fire on tool events; the model never has to "remember" to
  invoke `defend-claim` for them to deny.
- Description words ("about to report 完成", "before git commit/push") overlap
  almost entirely with `verification-before-completion`'s description. With
  the verifier skill being 7-call-active vs `defend-claim` 0-call, the model
  consistently picks the verifier; the claim-gate skill stays unloaded.
- `verification-before-completion` (the protocol-layer skill) stays put.
  Its 7-step procedure, `PASS = <criterion> <evidence>` contract, and
  context-loop extension hooks remain the soft discipline. The hard gate
  stays at the hook layer.

Precedent: ADR-0019 (de-integrate without hard-delete; used for
security-and-hardening, frontend-ui-engineering, performance-optimization
under SC-02 #105). This ADR adds `defend-claim` to the same de-integrated
list. SC-02's archive + REVIVAL path is the recovery mechanism — the docs
page is the live SSOT, the skill tree is gone (REVIVAL would recreate it
following the same 3-layer parity lesson as ADR-0010 / ADR-0024).

## Decision

Adopt γ (re-open SC-03 3c):

1. **Move `defend-claim` from skill layer to docs page.** Create
   `docs/engineering/defend-claim.md` carrying the operator-facing exposition
   (Quickstart / What it does / When to reach for it / Where it fits — the
   `engineering` bucket docs-page template per ADR-0011). The page points
   at the 5 hook files and the verdict table; it explicitly cites
   `verification-before-completion` as the soft-layer partner.
2. **Delete the skill tree.** Remove `arthurpower/skills/defend-claim/`
   (SKILL.md + references/ + iteration/). Pre-release-validate (router
   synchronization check at `pre-release-validate.ts:121`) must not light.
3. **Update the router and plugin manifest.** Remove the `defend-claim`
   line in `arthurpower/skills/using-agent-skills/SKILL.md` (currently
   L115) and the "claim-time anti-self-cert gate" line in
   `arthurpower/.claude-plugin/plugin.json` description.
4. **Untouched invariants (per #114 必走 + CLAUDE.md 10-hook clause):**
   - `arthurpower/hooks/hooks.json` — no edits.
   - 5 hook filenames (`defend-claim-execution.ts` / `cite-integrity.ts` /
     `report-triple.ts` / `dumb-zone.ts` / `silent-fail.ts`) — no edits.
   - `arthurpower/hooks/archive/defend-claim-*.cjs` — no edits.
   - `verification-before-completion` SKILL.md and its references — out of
     scope for this ADR.
5. **3-layer parity.** router / quick-reference / flowchart / plugin.json
   must all lose the `defend-claim` line together (the ADR-0024 / ADR-0010
   parity rule). Verification: `pre-release-validate.ts:121`
   `[FAIL] router:missing-reference` must not trigger post-merge.
6. **Recovery path.** Future re-promotion follows SC-02's REVIVAL pattern:
   copy the docs page back into a SKILL.md, restore router + quick-reference
   + flowchart + plugin.json in one commit, re-run iteration/1 evals. No
   ADR exemption is granted preemptively — each revival writes its own.

## Consequences

**Applied:**
- The model no longer pays context load for a structurally inert skill
  description (~400 chars every turn).
- The hook layer keeps its 10-hook identity intact — operator-visible
  evidence of the gate stays in the form of Exit 2 denials at tool time.
- The docs page is the operator's single source for "what `defend-claim`
  means, when it fires, and how it pairs with `verification-before-
  completion`".
- SC-R0 evidence ledger updates: `defend-claim` moves from "0-call skill"
  bucket to "de-integrated docs page" bucket, joining security-and-hardening
  / frontend-ui-engineering / performance-optimization (ADR-0019 family).

**Trade-offs:**
- Operators who used to reach for `defend-claim` as a manual `Skill(...)`
  call now reach for the docs page. The skill's auto-trigger never worked
  in practice (0 calls), so this is a navigation-surface change, not a
  behavior change.
- Router cardinality drops by 1 (28 → 27 active skills + 1 docs page
  substitute). The plugin.json description needs a one-line correction to
  the bucket count.

## Considered Options

### α — keep the skill, rewrite per new spec (rejected; 3c superseded)
- Pros: preserves the "skill exists" shape; one ADR record instead of two.
- Cons: the trigger surface stays inert by construction (hooks don't read
  SKILL.md). Repaid context load (every-turn description) buys zero
  operational behavior change. The 0-call pattern would persist.

### β — downgrade to `disable-model-invocation: true` (rejected)
- Pros: kills the every-turn context load while keeping the file in place.
- Cons: leaves a half-inert skill in the tree; operators who find
  `defend-claim` in the router / filesystem wonder "why doesn't it auto-pick?"
  — a *new* surprise without context, not the removal of one.

### γ — de-integrate to docs page (adopted)
- Pros: matches ADR-0019 / SC-02 precedent; removes context load; keeps the
  hook layer identity intact; one ADR + one docs page + one deletion +
  router/manifest parity (the standard 3-layer pattern).
- Cons: needs REVIVAL discipline for future re-promotion; needs the
  operator-facing docs page to be load-bearing on its own.

## Why not α / β

α treats the symptom (description text) instead of the cause (skill layer
structurally inert at the trigger surface). β preserves the file but
introduces a *new* surprise ("why is it here if not auto-reachable?") that
this ADR's "Surprising w/o ctx" condition is meant to kill.

## References

- Map: `wayfinder:map` `docs/wayfinder/skill-and-agent-curation.md` (#97)
- Tickets: SC-R0 #109, SC-03 #106 (superseded), SC-03 rewrite #114
- ADRs: 0011 (docs-page promotion gate), 0019 (de-integrate without
  hard-delete), 0024 (3-layer parity rule), 0001 / 0010 (precedent shape)
- Wayfinder ADR: 0024 Restricted escape-hatch reframing
- Hook layer: `arthurpower/hooks/hooks.json` + the 5 `defend-claim-*.ts`
- Soft partner: `arthurpower/skills/verification-before-completion/SKILL.md`
- CLAUDE.md L-N "10-hook 不可 regress" clause