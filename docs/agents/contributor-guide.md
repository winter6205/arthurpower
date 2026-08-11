# Contributor Guide

This document is the contributor-facing contract for promoting, renaming,
removing, or moving a skill under `arthurpower/skills/`. It exists because
the router file (`arthurpower/skills/using-agent-skills/SKILL.md`) and the
filesystem must stay in lockstep — drift between the two breaks skill
discovery.

## The router re-sync rule

Every commit that promotes, renames, removes, or re-flows a skill MUST
update the router in the **same** commit. Trigger cases:

- **Add** — a new `arthurpower/skills/<name>/SKILL.md` directory. Add the
  skill to `references/quick-reference.md` (correct phase column) and
  reference the name in the router `SKILL.md` body so the substring check
  passes.
- **Rename** — a skill directory is renamed. Update the row in
  `references/quick-reference.md` and replace prose mentions in
  `SKILL.md` (and `references/flowchart.md` if named there).
- **Remove** — a skill directory is removed. Remove its row from
  `references/quick-reference.md` and strip prose mentions. History
  hygiene goes through `docs/rules/git.md` (revert/reset/supersede
  discipline).
- **Flow-placement** — an existing skill moves to a different phase
  (Defining / Build / Verify / Review / SSOT / Setup / Restricted /
  User-invoked / Model-invoked). Update the phase column and the
  corresponding branch in `references/flowchart.md`.

The invariant is enforced by `arthurpower/hooks/pre-release-validate.cjs`
(PreToolUse on `Write|Edit|MultiEdit|Bash`). When drift is detected the
hook emits `[FAIL] router:missing-reference skills/<name>` to stderr
and exits 1 — a non-blocking advisory to the model per
`boundary-testing-protocol.md`. Exit 1 (not 2) is the correct signal:
this is a state check, not a per-call permission gate.

## Docs-page presence (promoted skills)

Per ADR-0011, every promoted skill under `arthurpower/skills/` MUST also
have a docs page reachable from the project's documentation tree. The
exact mechanism (which docs-page-frame pattern is required) will be
enforced by the docs-page-frame extension in **T9** of the
gh-collab-adapt plan. Until T9 lands, contributors must:

- Document the promoted skill in the project README or `docs/` tree.
- Cross-reference the skill name from at least one user-facing doc so
  discoverability does not depend on filesystem scanning alone.
- Note the docs-page location in the skill's own `SKILL.md` `## References`
  section if applicable.

This obligation is recorded here so it is enforceable once the
docs-page-frame hook lands in T9.

## Related

- ADR-0011 fusion approach
- `arthurpower/hooks/pre-release-validate.cjs`
- `arthurpower/skills/using-agent-skills/SKILL.md` (router, 维护纪律 section)
- `arthurpower/skills/using-agent-skills/references/quick-reference.md`