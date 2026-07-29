# 0022. Transcript as primary skill-identity signal

Date: 2026-07-29
Status: accepted

## Gate check

1. **Hard to reverse**: yes. Reversing means re-introducing a window in which
   the `pre-context-write-guard` allow path is blind to transcript evidence,
   and re-coupling identity to the 5-second routing-state TTL alone. Both
   regressions are silent (they only manifest as false-positive ALLOWs during
   slash-skill transitions), so the natural future-maintainer response without
   this ADR is to revert without recognising what was lost.
2. **Surprising without context**: yes. A reader of the hook sees a `gh-43`
   transcript corroboration branch and reasonably assumes the transcript is
   consulted on every write. The branch is in fact dead in the allow path
   (only the block path calls it). Future work on the hook would happily
   extend the dead branch and never notice. Without this ADR the asymmetry is
   invisible.
3. **Real trade-off**: yes. Two defensible options are enumerated below
   (extend TTL; promote transcript). Each has distinct downsides. The
   transcript option is selected because it is the only one that closes the
   allow-path blind spot rather than widening it.

All three conditions pass; ADR is recorded.

## Context

`pre-context-write-guard.ts` enforces ADR-0005 write sovereignty by
detecting the active skill and rejecting writes to `docs/CONTEXT.md`,
`docs/CONTEXT-MAP.md`, `docs/team-glossary.md`, and `docs/adr/NNNN-*.md`
unless the active skill is `domain-modeling` or `setup-arthurpower` (the
bootstrap carve-out). The identity check has two layers:

- **Identity layer** -- read the active skill from `~/.claude/.routing-state.json`.
  If the skill is in the authorised set, the file is allow-listed. If it is
  not, the file goes to corroboration.
- **Corroboration / structural layer** -- read the transcript
  (`~/.claude/transcripts/<session>.jsonl`) for a recent skill activation;
  if the transcript agrees with the routing-state, allow; if it disagrees,
  block. When the routing-state is missing or stale (TTL expired,
  `identityCheckDisabled=true`), the identity layer is skipped and the
  structural regex (`**Term**: definition.` for glossary, ADR schema for ADRs)
  becomes the de-facto authority.

Two structural defects were observed during boundary-testing axis2 driver
runs against the live FS (tempfile + Path.stat, real JSON, real cwd):

1. **Slash commands do not refresh routing-state.** The sync hook
   `pre-tool-skill-routing-sync.ts` (ADR-0014) only fires on the Skill tool
   matcher -- it writes a fresh routing-state when `Skill(domain-modeling)`
   is invoked. Slash commands such as `/arthurpower:domain-modeling`,
   `/arthurpower:code-review`, or `/arthurpower:tdd-protocol` are routed by
   the harness through a different path that does **not** fire
   PreToolUse:Skill, so the routing-state retains the previously active
   skill id. With the 5-second TTL
   (`arthurpower/hooks/ipc-core.ts:30` `STATE_TTL_MS = 5_000`), a slash
   transition followed within 5 s by a write to a guarded path passes
   whatever skill id the routing-state happened to carry -- which is the
   prior skill, not the just-activated one.

2. **The transcript corroboration branch is only consulted on the block
   path.** `pre-context-write-guard.ts` contains a `corroborate()` helper
   that scans the session transcript for recent Skill-tool activations
   (`{"name":"Skill","input":{"skill":X}`) or slash activations
   (`<command-name>X`). It is invoked **only inside the
   `!AUTHORIZED_SKILLS.has(activeSkill)` branch** (the block path). When
   routing-state already resolves to an authorised skill, the allow path
   runs `return {}` without ever reading the transcript. The same is true
   when `identityCheckDisabled=true` (routing-state missing or stale): the
   identity layer short-circuits to the structural regex, and the
   corroboration branch is never reached. In both cases the transcript
   signal -- which would have caught the slash-residual defect -- is
   ignored.

These two defects compose. Smoke results from the boundary-testing axis2
driver (real FS, real exit codes):

| Case | routing-state | transcript last | expected | observed |
|------|---------------|-----------------|----------|----------|
| SMK-1 (C1) | `domain-modeling` (fresh) | `/arthurpower:code-review` | BLOCK | **ALLOW (exit 0)**, no transcript word on stderr |
| SMK-2 (C5) | expired (`identityCheckDisabled=true`) | `/arthurpower:tdd-protocol`, Edit glossary line | BLOCK | **ALLOW (exit 0)** |
| Control | `code-review` (unauthorised) | `/arthurpower:domain-modeling` | ALLOW (override) | ALLOW (exit 0), `gh-43 override` on stderr |

The control case proves the corroboration branch *works* -- the bug is
that it is unreachable from the allow path.

This decision interacts with three prior ADRs and one project rule:

- **ADR-0005** -- establishes write sovereignty for CONTEXT.md /
  CONTEXT-MAP.md / team-glossary.md / `adr/NNNN-*.md` to `domain-modeling`
  and `setup-arthurpower` only. The identity layer exists to serve this
  decision. Widening the false-ALLOW window would violate the spirit of
  ADR-0005 even if the literal text were not touched.
- **ADR-0014** -- adds the Skill-tool routing-sync hook that refreshes
  routing-state on Skill tool invocations. ADR-0014 covers the Skill tool
  path only; slash commands are out of scope for that ADR and remain a
  known gap.
- **ADR-0018** -- extends edit-mode leniency to ADR fragment validation. It
  governs the *structural* layer (ADR schema) and is unaffected by this
  decision; the structural layer remains the last line of defence when
  the identity layer cannot reach a verdict.
- **CLAUDE.md "10-hook 不可 regress"** -- the 10 plugin hooks remain
  untouched. This decision is contained in the existing
  `pre-context-write-guard.ts`; no hook is added, removed, weakened, or
  bypassed.

### Why extending the TTL is rejected

The most tempting one-line fix is to widen the routing-state TTL from 5 s
to 5 min (or any larger value). This makes the slash-residual window less
likely to bite, because the routing-state would stay valid through a
slash-skill activation. It is rejected for two reasons:

1. **It widens, not closes, the allow-path blind spot.** The hook still
   never consults the transcript on the allow path. A larger TTL just
   makes the routing-state stale *more often* before expiring -- every
   slash transition now produces a window 60x larger during which the
   routing-state misnames the active skill and the allow path trusts it
   without corroboration.
2. **It preserves the wrong ground truth.** Routing-state is a *cache* of
   the harness notion of the active skill. The transcript is the
   *authoritative record* of every Skill tool / slash invocation that has
   actually fired in this session. Treating the cache as primary leaves
   the allow path blind to its own source of truth.

## Decision

Promote the transcript to the primary skill-identity signal and degrade
routing-state to a fallback used only when the transcript cannot be read.

1. **Transcript is the new ground truth.** The active skill is determined
   by scanning the session transcript
   (`~/.claude/transcripts/<session>.jsonl`, tail of up to 64 KB) for the
   most recent of either marker:
   - `{"name":"Skill","input":{"skill":"X"}}` -- Skill tool invocation
   - `<command-name>X</command-name>` -- slash command invocation
   The skill id extracted from the most recent matching marker is the
   authoritative active skill for the identity check. Both Skill tool and
   slash activations are honoured, so `/arthurpower:domain-modeling`
   updates identity immediately, not on the next TTL expiry.

2. **Routing-state is a fallback.** When the transcript cannot be read
   (file missing, unreadable, malformed JSONL, empty), the hook falls
   back to `routing-state.json`. The fallback is a best-effort
   degradation, not the primary path.

3. **Allow path consults the transcript.** The allow path no longer
   trusts a routing-state-only verdict. For every write to a guarded
   path, the hook scans the transcript for the most recent skill
   activation; if the most recent activation disagrees with the
   routing-state (or with the structural layer when the identity layer
   is disabled), the hook blocks. The corroboration branch moves from
   `!AUTHORIZED_SKILLS.has(activeSkill)` to a position that runs
   unconditionally -- allow and block paths both.

4. **`identityCheckDisabled=true` no longer skips the identity layer.**
   When routing-state is missing or expired, the hook now reads the
   transcript directly. If the transcript is also unavailable, the hook
   fails open with a warning on stderr and falls back to the structural
   regex (existing ADR schema / `**Term**: definition.` check) as the
   last line of defence. The structural layer was never authoritative
   on its own -- this decision makes that explicit without changing its
   behaviour.

5. **`pre-tool-skill-routing-sync.ts` is untouched.** The sync hook
   continues to refresh routing-state on Skill tool invocations. The
   primary-signal change does not depend on it, and ADR-0014 scope is
   preserved.

6. **`STATE_TTL_MS` is unchanged.** Transcript promotion does not
   require a longer cache window. The 5-second TTL remains -- it now
   controls routing-state freshness for *fallback* use, not for primary
   identity.

The implementation is contained in `pre-context-write-guard.ts`. No new
hook is added; no hook is removed; the 10-hook set is unchanged.

## Consequences

**Positive:**
- Slash-skill transitions update identity immediately (C1, C4, H2, E5
  smoke cases now block as expected).
- Expired routing-state no longer causes an unauthorised write to pass
  the identity layer (C5, F2 smoke cases now block).
- The allow path is no longer blind -- every guarded write consults the
  same transcript signal as the block path.
- Routing-state remains useful as a fast fallback when the transcript
  is unavailable, so we lose no existing capability.

**Negative / trade-off:**
- Transcript tail scanning (up to 64 KB) runs on every guarded write.
  This is millisecond-scale per call; the hook 5 s timeout accommodates
  it comfortably. Non-guarded paths do not scan (the existing
  `isGuardedFile` short-circuit at the top of the handler is preserved).
- When the transcript tail has been truncated past the most recent skill
  activation (E4 edge case -- long session, 64 KB cap exceeded), the
  identity layer falls back to routing-state, which may itself be stale.
  In the worst case this degrades to the structural-layer fallback; an
  unauthorised skill can still be blocked by the structural regex
  (invalid ADR schema, glossary line missing `**Term**: definition.`),
  but a hand-crafted plausible-looking edit could slip through. This is
  acceptable because (a) the structural layer has been the only defence
  for glossary lines all along, and (b) the failure mode is *no worse*
  than the pre-ADR-0014 status quo.
- The fallback ordering is now: transcript -> routing-state -> structural
  regex. The structural regex remains the last line of defence, not a
  primary signal. This is consistent with ADR-0018 edit-mode leniency
  and ADR-0005 sovereign-skill model.

**Known follow-ups (explicitly out of scope):**
- Subagent / Task cross-agent state inheritance (F1 in the smoke grid):
  the transcript may only record the orchestrating agent skill
  activations; subagent skill activations may not propagate to the
  transcript the guard reads. This is not addressed here and will be
  tracked in a follow-up ADR if smoke shows false ALLOWs in
  subagent-orchestrated flows.
- Transcript marker robustness: the current scan targets two literal
  patterns. If the harness changes its transcript schema, the scan may
  miss markers. This is a coupling cost we accept and will revisit if
  upstream changes the format.

## Considered Options

### Option A: Extend routing-state TTL from 5 s to 5 min (rejected)
- Pros: one-line change; smallest diff; preserves existing hook structure.
- Cons: widens the allow-path blind spot 60x (any slash transition now
  produces a much larger window during which the allow path trusts a
  stale routing-state without corroboration). Treats a *cache* as the
  *ground truth*. Violates the spirit of ADR-0005 even though no
  literal text changes. **Rejected: symptom-only; widens the bug.**

### Option G: Promote transcript to primary signal (adopted)
- Pros: closes the allow-path blind spot; honours both Skill tool and
  slash activations; routing-state remains a useful fallback; no new
  hook, no removed hook, no TTL change; 10-hook set preserved.
- Cons: per-call transcript scan (millisecond-scale); degradation when
  the transcript is truncated past the most recent activation falls back
  to potentially-stale routing-state. **Accepted.**

## Why not A

A reduces the *probability* of a slash-residual mis-identification but
not its *existence*. During the 60x-larger window, an unauthorised skill
can write to `docs/CONTEXT.md` with no transcript check at all -- the
allow path never consults the transcript, regardless of TTL. A is the
cheapest patch on a hook with a structural defect; G is the smallest
change that closes the defect rather than papering over it. ADR-0005
forbids the false-ALLOW class that A widens.

## References

- `arthurpower/hooks/pre-context-write-guard.ts` -- allow-path
  corroboration branch (current dead-in-allow branch at L512);
  identity-check-disabled short-circuit (currently skips transcript).
- `arthurpower/hooks/pre-tool-skill-routing-sync.ts` -- Skill tool
  routing-state sync (ADR-0014, untouched by this decision).
- `arthurpower/hooks/ipc-core.ts:30` -- `STATE_TTL_MS = 5_000` (unchanged).
- `docs/wayfinder/tickets/gh-43-transcript-corroboration.md` -- original
  transcript-corroboration ticket (branch now reachable from allow path).
- Boundary-testing axis1/axis2 smoke grid: SMK-1 (C1), SMK-2 (C5),
  control -- driver-level exit codes recorded in
  `docs/agents/2026-07-29-transcript-primary-skill-identity-smoke.md`.
- ADR-0005 -- write sovereignty for CONTEXT.md / CONTEXT-MAP.md /
  team-glossary.md / `adr/NNNN-*.md`.
- ADR-0014 -- Skill tool routing-state sync hook (the bridge this
  decision does not extend, by design).
- ADR-0018 -- pre-context-write-guard edit-mode leniency (structural
  layer remains last-line-of-defence).
- CLAUDE.md -- "10-hook 不可 regress" (no hook added, removed, weakened,
  or bypassed by this decision).
