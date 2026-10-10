# Arthurpower

A Claude Code plugin: a skill router plus reviewer agents for spec, TDD,
review, and verification.

Status: in personal use, version `0.13.0`. MIT.

## Install

Add the marketplace once, then install the plugin:

```bash
claude plugin marketplace add winter6205/arthurpower
claude plugin install arthurpower@arthurpower
```

Or, from inside a Claude Code session:

```
/plugin marketplace add winter6205/arthurpower
/plugin install arthurpower@arthurpower
```

This repository is not in Anthropic's official marketplace, so the add step is
required. Start a new session after installing.

To work on the skills themselves without the plugin path, link them into
`~/.claude/skills` and `~/.agents/skills`:

```bash
bash scripts/link-skills.sh          # add --dry-run to preview
```

`scripts/link-skills.sh` is a maintainer convenience: it reads each skill's
`bucket:` frontmatter, links `engineering` and `productivity`, and skips the
rest. Each link points back into the clone, so `git pull` keeps them current.

Nothing else is required. `CLAUDE.md` and `.claude/settings.json` are this
repository's own dogfood — they do not affect an installed plugin. Put personal
preferences in `CLAUDE.local.md`, which `.gitignore` excludes.

## What it actually does

- **Numeric gates, not advice.** Five of the six S-rules
  ship a dedicated skill — S1 `bounded-context-guardian`, S2
  `input-contract-tests`, S3 `error-handling-enforcer`, S5
  `complexity-anti-drift`, S6 `minimal-change-verifier` — each written as a
  checklist whose verdict is checkable rather than tonal. Four of them have a
  paired verifier sub-agent that returns `PASS/FAIL` with `file:line` evidence.
  S5 fails at cyclomatic complexity > 10 and nesting > 4, fires a soft review at
  a 60-line function, a 5-parameter function or a 1000-line file, and adds a
  ≤ 3% clone-rate gate you wire up through jscpd yourself:
  [thresholds.md](arthurpower/skills/complexity-anti-drift/references/thresholds.md).
- **S4 lives in review, not in a skill.** S4 (test-as-spec) is graded inside
  `code-review`'s Spec axis by `spec-reviewer-agent`, against
  [spec-as-test.md](arthurpower/skills/code-review/references/spec-as-test.md).
  There is no standalone S4 skill and no CI test gate in this repository.
- **The router invariant is machine-checked, not written down.**
  `arthurpower/hooks/pre-release-validate.ts` enforces the rule from
  [ADR-0011](docs/adr/0011-fusion-approach-for-github-collab-adaptation.md):
  adding, renaming, or removing a promoted skill must update the
  `using-agent-skills` router in the same commit, or the hook reports
  `[FAIL] router:missing-file` / `[FAIL] router:missing-reference`.
- **Two invocation classes are a deliberate context budget.** 7 skills are
  user-invoked (`disable-model-invocation: true`): zero context cost, but you
  have to remember they exist. 16 are model-invoked: their description sits in
  the window every turn so the agent can fire them. The full split is catalogued
  in [arthurpower/README.md](arthurpower/README.md).
- **Review is an orchestrated gate.** `code-review` dispatches
  `standards-reviewer-agent` and `spec-reviewer-agent` in parallel over a pinned
  diff, grades findings High/Medium/Low, and emits `GATE: BLOCKED`, which hands
  off to `review-report-repair` instead of letting a patch stack.

## Requirements

- Claude Code with plugin and marketplace support.
- Node.js that can run TypeScript directly. 11 of the 13 hook commands pass
  `--experimental-strip-types`; the other 2 call `node <file>.ts` and rely on
  type stripping being enabled by default. The hooks use erasable syntax only
  (no `enum`, `namespace`, or parameter properties), so no transform is needed.
  Verified on Node v24.21.0.
- No package installation. `arthurpower/hooks/package.json` declares zero
  dependencies, and the hooks validate against
  `arthurpower/hooks/runtime/tiny-schema.ts` instead of a schema library.

## Try it

With the plugin installed, ask for the router by name in a Claude Code session:
`using-agent-skills`. It maps incoming work to a skill and reports which skills
the run activated. The entry points most people reach for next are
`code-review` (after a diff exists), `architecture-change-reviewer` (before a
multi-file change), and `systematic-debugging` (when something fails).

`using-agent-skills` is model-invoked, so the agent can also fire it on its own
when it is unsure which skill applies.

## Tests

Two suites, no install step, both run here on Node v24.21.0. From the plugin
directory:

```bash
cd arthurpower/hooks && npm test            # 54 tests — hook trigger semantics
```

From the repository root:

```bash
node --test "arthurpower/scripts/s5-complexity/*.test.mjs"   # 37 tests
```

`npm test` runs `node --test "tests/**/*.test.ts"`, which covers exit-code
contracts, state-key isolation, and fail-open consistency — not the schema
runtime alone. The S5 runner's own tests cover target resolution and rule
scoping; running `check.mjs` against real code needs `eslint` and
`typescript-eslint` in the **project you lint**, not in this repository. Run it
with that project as the working directory:

```bash
S5=/path/to/arthurpower/arthurpower/scripts/s5-complexity/check.mjs
node "$S5" --changed   # ratchet over diff-touched functions
node "$S5" src         # full audit
```

The runner covers TypeScript and JavaScript only, and no hook invokes it: none of
the 13 `hooks.json` commands call `check.mjs`, so it runs when you call it or when
the `complexity-anti-drift` skill tells the agent to.

## Known state

- No CI runs the tests. The only workflow is
  `.github/workflows/claude.yml`, which answers `@claude` mentions; the CI-side
  S4 red-test gate is documented as not enabled in
  [docs/rules/git.md](docs/rules/git.md).
- Not listed in Anthropic's official marketplace. Install by adding this
  GitHub repository as a marketplace, then installing `arthurpower@arthurpower`.
- One eval check is red at this commit:
  `arthurpower/skills/skill-authoring/evals/driver.py:255` asserts that no
  `SKILL.md` may contain the concept `Procedure`, while
  `arthurpower/skills/skill-authoring/scripts/validate_skill.py:33` *requires*
  `## Procedure` as an L2 section and 20 shipped skills have one. The two checks
  contradict each other; the driver assertion is the stale side.
- Both eval drivers run from a clone. `arthurpower/scripts/run_skill_eval.py`
  resolves skills next to itself, and
  `arthurpower/skills/skill-authoring/scripts/run_skill_eval.py --dry-run` grades
  offline; the two usage examples in
  `arthurpower/skills/skill-authoring/references/eval-system.md:117` and
  `arthurpower/skills/skill-authoring/references/verification.md:60` are joined
  with a space and must be joined with `/`. No `evals.json` fixture ships, so a
  grading run needs one written against the documented layout
  `arthurpower/skills/<name>/iteration/<n>/evals.json`; out of the box the shipped
  skills are checked by `validate_skill.py`'s 13 structural checks only.

## Layout

```
arthurpower/              the plugin
  .claude-plugin/         plugin manifest
  skills/                 23 skills, two promoted buckets
  hooks/                  hooks.json + 12 .ts hooks + lib/ runtime/ tests/ archive/
  agents/                 10 reviewer sub-agents
  commands/               /audit, /fanout
  scripts/                bootstrap.sh, update.sh, s5-complexity/
  docs/                   harness map, design reports, review records
docs/                     design record for this repository
  adr/                    24 architecture decision records (numbering skips 0013)
  rules/                  the rule text the skills encode
  CONTEXT.md              domain vocabulary (single source of truth)
specs/                    written specs behind the hook-runtime and dispatch changes
scripts/                  link-skills.sh (symlink installer);
                          sync-marketplace-cache.py — maintainer-local SRC/MKT/CACHE
                          audit for developing this plugin, not part of the install
.claude-plugin/           marketplace manifest (see Install)
```

`hooks.json` wires 13 commands over 11 of the 12 hook files;
`defend-claim-report-triple.ts` keeps its `--self-test` entry point but was
dropped from the wiring in v0.13.0.

## Documentation

- [arthurpower/README.md](arthurpower/README.md) — every skill, by bucket and
  invocation class, plus the S5 runner's gates.
- [arthurpower/CHANGELOG.md](arthurpower/CHANGELOG.md) — release notes.
- [docs/CONTEXT.md](docs/CONTEXT.md) — the vocabulary the ADRs use.
- [arthurpower/docs/agents/harness-map.md](arthurpower/docs/agents/harness-map.md)
  — which agent, hook, and skill owns which gate.
- [arthurpower/skills/code-review/references/protocol.md](arthurpower/skills/code-review/references/protocol.md)
  — the two-axis review protocol and severity gate.

## License

MIT — see [LICENSE](LICENSE).
