# arthurpower

A Claude Code plugin that turns engineering constraints into things an agent can
be held to: 23 skills, 13 `PreToolUse`/`PostToolUse` hook commands, and 10
reviewer sub-agents, with no runtime dependencies.

Status: in active personal use, version `0.13.0`. The plugin is the product;
the rest of this repository is the design record behind it.

## What it actually does

- **Governance skills, not generic advice.** Six rules (S1 bounded context, S2
  input contracts, S3 error handling, S5 complexity thresholds, S6 minimal
  change) each get a skill with a numeric gate and a verdict format — e.g.
  `complexity-anti-drift` fails at cyclomatic > 10 and nesting > 4, warns at
  60-line functions and a 1000-line file, and adds a ≤ 3% clone-rate gate you
  wire up through jscpd yourself.
- **The rules are machine-checked, not just written down.**
  `hooks/pre-release-validate.ts` enforces the router invariant from ADR-0011:
  adding, renaming, or removing a promoted skill must update the
  `using-agent-skills` router in the same commit, and the hook reports
  `[FAIL] router:missing-file` / drift otherwise.
  `arthurpower/scripts/s5-complexity/` is a standalone runner that prints the
  ESLint-backed S5 gates against a diff.
- **Two invocation classes are a deliberate context budget.** A user-invoked
  skill (`disable-model-invocation: true`) costs zero context but spends
  cognitive load — you have to remember it exists. A model-invoked skill keeps
  its description in the window every turn. The README in `arthurpower/` lists
  every skill under its class.
- **Review is an orchestrated gate, not a suggestion.** `code-review` dispatches
  `standards-reviewer` and `spec-reviewer` in parallel over a pinned diff,
  grades findings High/Medium/Low, and emits `GATE: BLOCKED`, which hands off to
  `review-report-repair` rather than letting a patch stack.

## Requirements

- Claude Code with plugin and marketplace support.
- Node.js able to run TypeScript directly — the hooks are `.ts` files invoked as
  `node --experimental-strip-types "<hook>.ts"`. Verified on Node 24.
- No package installation. `arthurpower/hooks/package.json` declares zero
  dependencies; the test suite runs against `hooks/runtime/tiny-schema.ts`
  instead of a validation library.

## Install

Clone and register this repository as a local marketplace source:

```bash
git clone https://github.com/winter6205/arthurpower.git
```

The marketplace manifest is at the repository root (`marketplace.json`) and
points at the plugin directory `./arthurpower`, whose own manifest is
`arthurpower/.claude-plugin/plugin.json`.

To work on the skills themselves without going through the plugin install path,
link every promoted skill into your harness directories (`~/.claude/skills` and
`~/.agents/skills`):

```bash
bash scripts/link-skills.sh          # add --dry-run to preview
```

`scripts/link-skills.sh` is a maintainer convenience for a working checkout: it
reads the `bucket:` frontmatter of each skill, links only `engineering` and
`productivity`, and skips the rest. Each link points back into the clone, so
`git pull` keeps installed skills current.

## Try it

```
Skill(arthurpower:using-agent-skills)
```

That skill is the router: it maps incoming work to a skill and reports which
skills this run activated. From there the entry points most people reach for are
`code-review` (after a diff exists), `architecture-change-reviewer` (before a
multi-file change), and `systematic-debugging` (when something fails).

## Tests

From the plugin directory:

```bash
cd arthurpower/hooks && npm test
```

54 tests, no install step required. `npm test` runs `node --test
"tests/**/*.test.ts"`, which covers hook trigger semantics — exit-code
contracts, state-key isolation, fail-open consistency — rather than the schema
library alone.

## Layout

```
arthurpower/              the plugin
  .claude-plugin/         manifest
  skills/                 23 skills, two promoted buckets
  hooks/                  hooks.json + 12 .ts hooks + tests/
  agents/                 10 reviewer sub-agents
  commands/               /audit, /fanout, and two sync commands
  scripts/                bootstrap.sh, update.sh, s5-complexity/
  docs/                   harness map, design reports, review records
docs/                     design record for this repository
  adr/                    24 architecture decision records
  rules/                  the rule text the skills encode
  CONTEXT.md              domain vocabulary (single source of truth)
scripts/link-skills.sh    developer symlink installer
marketplace.json          plugin registration manifest
```

`docs/adr/` is where the non-obvious decisions live.

## License

MIT — see [LICENSE](LICENSE).
