# 2026-09-09 — Tracker default is local markdown

## Decision

`writing-plans` and `wayfinder` store artifacts as local markdown by default.
GitHub issues are an opt-in projection: only when the operator this run names
「用 issue」or「发到 GitHub」. A GitHub remote or a working `gh` is not a trigger.

`spec-driven-development` is unchanged. Its contract is already `specs/<feature>.md`.

## Why

GitHub publish was fused into `writing-plans` (gh-08 / gh-16) as the _main_
path. That made `gh` availability the switch, so a configured laptop always
opened issues. The contracts (plan file, map, tickets, handoff) do not need
GitHub. Wayfinder still needs _a_ tracker; local `docs/wayfinder/tickets/`
is that tracker unless the operator asks for GitHub.

## What changed

- `skills/writing-plans/SKILL.md` — `## Tracker` routes to local; pointer to
  `references/tracker.md` is opt-in only.
- `skills/writing-plans/references/tracker.md` — default section + GitHub
  `gh` steps kept as the opt-in branch.
- `skills/wayfinder/SKILL.md` — default `docs/wayfinder/tickets/`; input
  accepts a local path as well as a GitHub URL/number.

## Out of scope

No second plugin, no parallel skill edition, no local assignee/frontier
protocol beyond the existing `docs/wayfinder/tickets/` convention, no
`spec-driven-development` edit.
