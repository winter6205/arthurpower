# 0023. v0.10.0 - hook cleanup: dead registration, LF enforcement, empty-catch consolidation, lifecycle/ topology

Date: 2026-08-02
Status: accepted

## Gate check

1. **Hard to reverse**: yes. Reversing means (a) re-introducing the cite-integrity
   Edit registration, (b) re-adding the `.gitattributes` gaps that allow CRLF
   into the index, (c) re-deploying the global `post-tool-no-empty-catch`
   hook plus its `settings.json` registration, and (d) re-creating the
   `~/.claude/lifecycle/` sibling directory + reverting the two `lifecycle-hook.ts`
   import paths. The lifecycle/ move is a cross-global-directory relocation
   with no migration script; the empty-catch deletion removes a global hook
   visible to every project.
2. **Surprising without context**: yes. Three points specifically:
   (a) **ADR-0014 says the routing-sync hook coexists with `lifecycle-hook.ts`**
   ("if both fire, the later write wins"), but step 1.5 of that hook no longer
   exists. Without an explicit override note, ADR-0014 reads as
   self-contradictory.
   (b) **The global `post-tool-no-empty-catch` hook disappears from
   `~/.claude/hooks/`** with no marker - a future maintainer sees no trace of
   empty-catch interception at the user level and may "fix" by re-adding it,
   re-introducing the disjoint-regex double-coverage the consolidation removed.
   (c) **The `.gitattributes` rule `*.ts text eol=lf` is silent** until someone
   with `core.autocrlf=true` tries to commit CRLF - without this ADR the
   protection looks decorative rather than load-bearing.
3. **Real trade-off**: yes. Each of the four changes had a defensible
   alternative; each was rejected for a specific reason enumerated in
   §Considered Options. The lifecycle/ topology decision in particular had
   four options (sibling / nested under hooks/ / nested under hooks/lib/ /
   nested under hooks/runtime/) with distinct downsides.

All three conditions pass; ADR is recorded.

## Context

v0.9.0 (2026-07-29) shipped the SessionStart bootstrap removal (ADR-0021).
Between v0.9.0 and this release, 5 commits on `master` accumulated as the
tracer-bullet cleanup series. Each bullet was scoped to one logical change
with end-to-end verification; this ADR records the consolidated decision
because the changes interact (TB1 + TB2 touch the same global file; TB4
deletes a global hook that ADR-0020's sibling-consolidation argument would
not have included) and the consumer-visible behaviour change (TB4's
empty-catch ownership transfer) warrants a minor version bump per the
release's own precedent (0.8.2 -> 0.9.0 was also minor for a consumer-visible
change).

The five changes:

1. **TB0 - dead Edit registration removed.** `defend-claim-cite-integrity.ts`
   reads only `tool_input.content` and `tool_input.file_path`. Edit provides
   `new_string`, not `content`, so the Edit matcher registration always
   early-returned `{kind:'allow'}` at the `if (!content)` guard. Behaviour:
   same (the block path was unreachable). The hook remains registered under
   Write (where `content` is provided). Commit `ab0760a`.

2. **TB1 - `lifecycle/` topology relocated.** The directory moved from
   `~/.claude/lifecycle/` (a sibling of `hooks/`, undocumented, never deployed
   by any install script) to `~/.claude/hooks/lib/lifecycle/`. The single
   consumer `~/.claude/hooks/lifecycle-hook.ts` had its two imports changed
   from `../lifecycle/...` to `./lib/lifecycle/...`. Behaviour: same when
   lifecycle/ is present (now in a place that gets carried by whatever
   mechanism syncs `hooks/`). The failure mode when lifecycle/ is missing
   (`ERR_MODULE_NOT_FOUND` on stderr, fail-open) is structurally unchanged,
   but the dependency is now *adjacent* to the consuming file rather than
   across a sibling boundary, which makes the missing-directory case rarer
   and easier to diagnose. No commit (global-only file).

3. **TB2 - `lifecycle-hook.ts` step 1.5 deleted.** The hook's step 1.5
   (`if (tool_name === 'Skill' && toolInputSkill) { writeRoutingState(...) }`)
   double-wrote `~/.claude/.routing-state.json` alongside the project hook
   `pre-tool-skill-routing-sync.ts` (ADR-0014). Two writers, one lock and one
   without, opposite colon-id handling - and critically, opposite
   id-handling: lifecycle always generated a fresh `uuid()`, the plugin
   preserved the existing id per ADR-0014's gh-21 bridge semantics. For
   non-colon ids the last-writer-wins was genuine AND broke ADR-0014's
   id-stability contract. Step 5 (signal-driven routing switch) is preserved.
   No commit (global-only file). Companion cleanup removed the now-orphaned
   `toolInputSkill` declaration, the `skill` zod schema field, and the
   `{ tool_name, tool_input }` handler destructure.

4. **TB3 - `.gitattributes` LF enforcement.** Appended `*.ts text eol=lf` and
   `*.cjs text eol=lf` to the repo root `.gitattributes`. The git index
   already stored LF; the working tree was CRLF purely from
   `core.autocrlf=true` on this Windows machine. The rule prevents future
   Windows commits from re-introducing CRLF into the index (the failure mode
   that exposes `env: 'node\r'` on Linux direct exec). Behaviour: none on
   this machine today; protection against regression. Commit `503c520`.

5. **TB4 - empty-catch consolidation.** The empty-catch check was split
   across two hooks with strictly disjoint regexes: global
   `post-tool-no-empty-catch` (matched `catch (e) {}` - bound form) and
   plugin `defend-claim-silent-fail` (matched `catch {}` - bare form).
   `docs/Arthuropower_usage.md` documented this as intentional
   complementarity. Consolidation moves all detection to
   `defend-claim-silent-fail` with the merged regex
   `/(^|\})\s*catch\s*(?:\([^)]*\))?\s*\{\s*\}/` applied to **whole content**
   (not per-line, to preserve multi-line `catch (e) {\n}` coverage). The
   `(^|\})` anchor is kept to preserve the test-assertion string-literal
   false-positive regression. The global hook file is deleted; its
   `settings.json` registration (lines 54-62) is removed; the docs are
   updated. Behaviour: same blocks fire on the same inputs, but the owner
   is now single (plugin), and the system message changes from
   `BLOCKED: empty catch (S3)` to `BLOCKED: [defend-claim Q5] REJECTED: empty
   catch {} detected`. Commit `385b11c`; docs commit `31af6c0`.

The 10 arthurpower identity hooks at `arthurpower/hooks/hooks.json` are
**not** weakened (CLAUDE.md "10-hook 不可 regress"). TB4 modifies
`defend-claim-silent-fail.ts` (one of the 10) by *extending* its coverage
(bound catch in addition to bare), which is strengthening, not weakening.
TB0 modifies `hooks.json` by removing one Edit registration - also
strengthening-adjacent (removes a dead no-op registration), not weakening.

## Decision

Ship v0.10.0 with all five changes as one minor release. Specific
decisions:

1. **Keep TB0's Edit-removal as-is.** The dead registration is purely
   overhead; removing it has no consumer-visible effect and reduces the
   per-Edit hook count from 3 to 2.
2. **Adopt TB1's lifecycle/ topology (Option A: nested under hooks/lib/).**
   The single-consumer locality argument outweighs the deploy-script option;
   no existing script touches `~/.claude/` so a new deploy script would be
   net new infrastructure for a fragile layout.
3. **Adopt TB2's step 1.5 deletion.** The plugin is now the sole writer on
   the Skill tool path; the global hook retains only Step 5 (signal-driven
   routing switch). This **supersedes the coexist conclusion of ADR-0014**:
   the bridge hook and `lifecycle-hook.ts` no longer both write on Skill;
   only the bridge hook does.
4. **Adopt TB3's LF rule.** Pre-emptive defence; cost is one `.gitattributes`
   rule; benefit is no future CRLF-index regressions.
5. **Adopt TB4's consolidation.** Single owner for empty-catch detection;
   the `(^|\})` anchor and the string-literal regression tests are preserved.

**Preserved (explicit non-changes):** the 10 plugin hooks; the routing-sync
hook itself (TB2 only removes a competing writer); the Step 5 signal-driven
write in `lifecycle-hook.ts`; the test-assertion string-literal false-positive
regression tests; the existing Python `except:pass` and TypeScript `=> null;`
advisories in `defend-claim-silent-fail.ts`.

## Consequences

**Positive:**
- `defend-claim-cite-integrity.ts` Edit registration overhead removed (TB0).
- `lifecycle/` lives next to its single consumer; the silent-crash failure
  class is structurally less likely because the deployment boundary is the
  `hooks/` directory itself (TB1).
- `lifecycle-hook.ts` no longer competes with the plugin for routing-state
  writes; ADR-0014's id-stability contract holds under all Skill tool paths,
  not just colon-id paths (TB2).
- `.gitattributes` blocks future CRLF contamination of the index on Windows
  (TB3).
- Empty-catch detection has one owner, one regex, one test surface; the
  disjoint-regex split is gone (TB4).

**Negative / trade-off:**
- **If the arthurpower plugin is disabled**, TB2's removal of step 1.5 means
  there is no global fallback writer for Skill tool invocations. The
  delegation comment added at the deleted block calls this out. ADR-0014
  assumed both writers existed; that assumption no longer holds.
- **TB4's whole-content regex match is a slight cost increase** vs the
  previous per-line loop (one regex on full content vs N regexes on N lines).
  Acceptable: regex on 64 KB content is microseconds.
- **TB4 removes a global hook visible to non-arthurpower projects.** The
  empty-catch check is now plugin-bound; consumers not using the
  arthurpower plugin lose bound-catch interception unless they install it.
  The plugin is enabled in this machine's `settings.json`; that is the
  consumer surface for v0.10.0.
- **The lifecycle/ relocation did not migrate it into the repo.** The
  files still live only under `~/.claude/hooks/lib/lifecycle/` - the same
  provenance gap as before TB1 (the original B3 audit finding). A future
  machine sync must still carry them. The fix here is structural
  (adjacency), not version-control. ADR-0009 still applies: global
  registration is untracked machine state.
- **TB4 deleted a file (`post-tool-no-empty-catch.ts`) without a tracked
  pointer.** The file is in `~/.claude/.backup/20260802-133847/` for
  recovery, but a reader of `~/.claude/hooks/` cannot tell empty-catch
  enforcement ever existed at the global level. This ADR is that pointer.

## Considered Options

### Option A: Nested under `hooks/lib/lifecycle/` (TB1, adopted)
- Pros: single consumer locality; colocation with `hooks/lib/ipc-core.ts`
  matches `lifecycle/DESIGN.md`'s claimed topology; eliminates the
  sibling-directory failure class.
- Cons: still not version-controlled; the original "global hook not in repo"
  meta-bug persists.

### Option B: Deploy script (`bootstrap.sh` / `update.sh` extension)
- Pros: keeps the sibling layout; explicit deploy step makes the dependency
  visible.
- Cons: no existing script touches `~/.claude/`, so this would be a new
  infra surface for a fragile layout. The audit report's "no deploy script"
  finding is a feature, not a bug, in this topology.

### Option C: Keep both writers (TB2 status quo, rejected)
- Pros: ADR-0014 unchanged; consumer behaviour preserved under disabled plugin.
- Cons: data-layer race is conditional but real for non-colon ids; the
  id-rotation divergence silently breaks ADR-0014's id-stability contract.
  "Status quo" here means "keep a known bug because the fix removes a
  fallback the user might rely on."

### Option D: Keep split empty-catch (TB4 status quo, rejected)
- Pros: no consumer-visible behaviour change at all; the disjoint-regex split
  is documented and tested.
- Cons: two owners, two regexes, two test surfaces for one responsibility;
  the motivating bug ("double BLOCKED") was never real (the regexes are
  strictly disjoint), so the split had no compensating benefit beyond
  organisational separation. Consolidation strengthens, not weakens.

### Option E: Move empty-catch ownership to a different plugin hook (rejected)
- Pros: doesn't touch `defend-claim-silent-fail` (one of the 10).
- Cons: no other plugin hook is in the empty-catch semantic neighbourhood;
  would require a new hook (CLAUDE.md 10-hook rule would force an ADR with
  stronger justification than this).

## Why not B / C / D / E

**B solves a problem that does not exist** - no existing script manages
`~/.claude/`, so introducing one to "deploy lifecycle" is adding infra for a
topology that should not be deployed in pieces anyway. A is structurally
simpler.

**C preserves a known contract violation.** The id-rotation divergence means
ADR-0014's id-stability guarantee was only honoured for colon-id Skill
invocations, not for non-colon ids. "Status quo" here means "keep the bug."

**D was rejected in the v0.10.0 audit** when the motivating "double BLOCKED"
bug was verified not to exist (the regexes are strictly disjoint by
construction - global requires binding, plugin forbids it). The split had no
behavioural benefit; it was organisational separation with two test surfaces.

**E invents a hook to satisfy a rule** rather than letting an existing hook
grow coverage. Strengthening `defend-claim-silent-fail` is the smallest
change.

## Interaction with prior ADRs

- **ADR-0014** (Skill tool routing-sync hook): **superseded in part.** The
  "coexists with lifecycle-hook.cjs" conclusion no longer holds - the
  bridge hook is now the sole writer on the Skill tool path. The bridge
  hook itself is unchanged. ADR-0014's gh-21 id-preservation semantics
  continue to apply because lifecycle no longer competes with them.
- **ADR-0020** (single global pre-tool-guard): unaffected structurally,
  but TB4 deleted a different global hook (`post-tool-no-empty-catch`) for
  unrelated reasons (consumer consolidation, not anti-tamper). ADR-0020's
  argument about global-vs-project-local does not apply to
  `post-tool-no-empty-catch` because its work has moved into the plugin,
  not into another global hook.
- **ADR-0021** (SessionStart bootstrap removal): unrelated.
- **ADR-0022** (transcript primary skill-identity): unrelated; this ADR's
  write was itself gated by ADR-0022's transcript-primary mechanism (the
  guard required a recent `domain-modeling` skill activation in the
  transcript before allowing the ADR write).
- **CLAUDE.md "10-hook 不可 regress"**: one hook modified
  (`defend-claim-silent-fail.ts` - strengthened, not weakened); one
  registration removed from the 10-hook `hooks.json` (the cite-integrity
  Edit entry - strengthening-adjacent; removes a dead no-op); zero
  hooks deleted or bypassed.
- **CLAUDE.md "scope and authorization"**: no settings.json tracked, no
  scope-creep into auth/payment, no test deletion, no quality-gate
  bypass; all changes verified end-to-end per `verification-before-completion`.

## References

- Commits included in v0.10.0:
  - `ab0760a` fix(hooks): remove dead Edit registration for defend-claim-cite-integrity
  - `503c520` chore(repo): add .gitattributes enforcing LF for .ts and .cjs
  - `385b11c` refactor(hooks): consolidate empty-catch detection into defend-claim-silent-fail
  - `31af6c0` docs(usage): reflect empty-catch consolidation into defend-claim-silent-fail
  - `9c07078` chore(release): v0.10.0 -- hook cleanup + empty-catch consolidation
- `arthurpower/hooks/hooks.json` Edit block (post-TB0): dumb-zone + silent-fail only
- `arthurpower/hooks/defend-claim-silent-fail.ts` (post-TB4): whole-content match with `/(^|\})\s*catch\s*(?:\([^)]*\))?\s*\{\s*\}/`
- `~/.claude/hooks/lib/lifecycle/` (post-TB1): dynamic-router.ts, schemas.ts, skills.ts, DESIGN.md
- `~/.claude/hooks/lifecycle-hook.ts` (post-TB1+TB2): imports at `./lib/lifecycle/...`; step 1.5 deleted with delegation comment; orphan cleanup
- `~/.claude/.gitattributes` (post-TB3): appended `*.ts text eol=lf` + `*.cjs text eol=lf`
- Backups:
  - `~/.claude/.backup/20260802-130437/` (TB1 + TB2 source state)
  - `~/.claude/.backup/20260802-133847/` (TB4 global state: settings.json + post-tool-no-empty-catch.ts)
- ADR-0009 - `settings.json` not tracked (global state still machine-bound; lifecycle/ remains so)
- ADR-0014 - Skill tool routing-state sync hook (superseded in part; coexist conclusion no longer holds)
- ADR-0015 - zod sole runtime dependency (no change; TB4 still uses defineHook/zod)
- ADR-0017 - code-review dual-subagent alignment (not invoked for this cleanup - single-file changes + a docs edit; CCR bar not met)
- ADR-0020 - single global pre-tool-guard hook (unaffected; TB4 deletes a different hook for unrelated reasons)
- ADR-0021 - SessionStart bootstrap removal (unrelated)
- ADR-0022 - transcript primary skill-identity signal (unrelated; this ADR's own write was gated by it)
- `docs/Arthuropower_usage.md:311,351,449` - docs updated to reflect empty-catch consolidation (commit `31af6c0`)
- `arthurpower/CHANGELOG.md` - v0.10.0 entry (commit `9c07078`) including consumer-visible behaviour table
