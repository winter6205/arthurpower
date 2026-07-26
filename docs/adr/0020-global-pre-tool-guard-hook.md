# 0020. Consolidating `pre-tool-guard` into a single global TypeScript hook

Date: 2026-07-26
Status: accepted

## Gate check

1. **Hard to reverse**: yes. Reversing means recreating 12 project-local
   `pre-tool-guard.sh` scripts (from the archive), re-registering each in its
   project `.claude/settings.json`, and removing the global registration plus
   the global `.ts`. That is a 12-repo migration, not a one-line revert.
2. **Surprising without context**: yes. A future maintainer opening any project
   would find no project-local guard hook and ask "where did the anti-tamper
   protection go?" — and separately, "why does the TS hook only run from the
   global hooks directory?" Without this ADR, the natural response is to
   re-add a project-local `.sh`, silently re-introducing the divergence this
   decision removes.
3. **Real trade-off**: yes. Four defensible options existed (global TS; keep
   per-project `.sh`; fix each `.sh` in place; move into the plugin). Each has
   distinct downsides, enumerated below.

All three conditions pass; ADR is recorded.

## Context

`pre-tool-guard.sh` was a PreToolUse/Bash hook acting as the second line of
defence behind the settings.json `permissions.deny` list: it blocks
write-class mutations (`rm`/`mv`/`chmod`/`sed -i`/`perl -pi`) against hook and
gate config paths (`.claude/hooks`, `.git/hooks`, `.husky`, `pre-commit`,
`lint-staged`), and carries an `rm -rf` external-temp allowlist. The
settings.json deny list stays the single source of truth; the hook only adds
what a deny rule cannot express.

Three problems surfaced:

1. **cwd-drift bug.** Every project registered the hook with a bare relative
   path — `bash .claude/hooks/pre-tool-guard.sh`. It was the only hook on the
   machine using a relative path (all global hooks use absolute paths; plugin
   hooks use `${CLAUDE_PLUGIN_ROOT}`). When the hook process's cwd was not the
   project root at session startup, the relative path failed to resolve and
   bash reported `No such file or directory` — a non-blocking error that meant
   the anti-tamper guard silently did not run for that call.
2. **Version divergence.** The same hook had been copied into 12 projects and
   drifted: the archived `.sh` files are 5 distinct sizes (1894 / 1948 / 2029
   / 3977 / 4065 bytes). "Every project is different" was literally true.
3. **Runtime constraint on a TS port.** The hook runtime (`defineHook` + zod)
   only resolves `zod` from within the global hooks tree (`~/.claude/hooks/`);
   the project root and the plugin directory have no zod and `NODE_PATH` is
   empty. A TypeScript port therefore cannot live in a project-local
   `.claude/hooks/` — it would fail to import and fail open, never blocking.
   The TS version is structurally forced to live globally.

This decision interacts with two prior ADRs:

- **ADR-0009** (`settings.json` not tracked): the global
  `~/.claude/settings.json` is machine state and is never committed. The global
  registration this ADR adds lives there and is therefore not version-controlled
  — consistent with ADR-0009, and the reason the registration is a per-machine
  surgical edit rather than a commit.
- **ADR-0015** (zod sole runtime dependency): the TS hook uses zod at the
  `defineHook` choke point only; this ADR adds no new runtime dependency.

The 10 arthurpower identity hooks at `arthurpower/hooks/hooks.json` are **not**
touched (CLAUDE.md "10-hook 不可 regress"). `pre-tool-guard.sh` was a
project-local hook in `.claude/settings.json`, never one of the 10.

## Decision

Consolidate the guard into one global TypeScript hook and retire every
project-local copy.

1. **Single global hook.** Deploy `~/.claude/hooks/pre-tool-guard.ts` — a
   faithful TS port of the `.sh` (R1–R4 regexes, the external-temp allowlist,
   whitespace normalization, fail-open on bad input) — and register it once in
   the global `~/.claude/settings.json` under `PreToolUse`/`Bash` with an
   absolute path: `node --experimental-strip-types
   C:/Users/<user>/.claude/hooks/pre-tool-guard.ts`. The absolute path removes
   the cwd-drift failure mode at the root.
2. **Retire project-local registrations.** Remove the
   `bash .claude/hooks/pre-tool-guard.sh` registration from all 12 projects
   (Arthurpower, arthur, 规范, 新建文件夹/arthur, 归档旧版智能助手/{arthur_v0,
   arthur2, Arthur, 3/arthur}, <local-project>, tpl-test, v-code-review, and the
   v-code-review observability-dashboard worktree). Where the registration was
   the project's only hook, the now-empty `hooks` block is dropped.
3. **Archive, do not delete.** Move the 12 superseded `.sh` files to
   `~/.claude/hooks/archive/pre-tool-guard/`, renamed with per-project
   provenance tags. They remain recoverable; nothing is destroyed.
4. **Override escape hatch.** Add `ARTHUR_TOOL_GUARD_ALLOW=1`, mirroring the
   sibling hooks' `ARTHUR_FS_GUARD_ALLOW` / `ARTHUR_PIP_ALLOW`, for authorized
   maintenance that must touch hook paths.

**Preserved (explicit non-changes):** the settings.json `permissions.deny`
list stays the SSOT; the 10 plugin identity hooks are untouched; other project
hooks (`PostToolUse` etc.) are untouched; the `.sh` files are archived, not
deleted.

## Consequences

**Positive:**
- One source of truth. All projects share one guard; the 5-way version
  divergence is gone.
- cwd-drift bug eliminated — the absolute path resolves regardless of the hook
  process's working directory.
- TS runtime benefits: zod-validated input, structured `permissionDecision`
  deny output, fail-open on malformed input, one place to maintain.
- The guard was verified live during deployment: it intercepted two of the
  migration's own maintenance commands (an `mv` and a `git add` that touched
  `.claude/hooks` paths), proving it runs and blocks in-session.

**Negative / trade-off:**
- The guard now applies uniformly to every project; per-project customization
  requires the override env var, not a local edit.
- Substring matching (faithful to the `.sh`) can false-positive on echoed
  strings — e.g. an `echo` containing `rm .claude/hooks/...` is blocked. This
  is inherited behaviour, not a regression.
- The override env var does not propagate from an inline command to the hook
  process (the hook is spawned by Claude Code, not the command's shell).
  Authorized maintenance that touches hook paths must run through a script file
  invoked as `bash <script>` (top-level verb is `bash`, not rm/mv/chmod), or
  set the env var at session scope.
- The global registration is untracked machine state (ADR-0009) — it is not
  version-controlled and must be reproduced per machine.

## Considered Options

### Option A: Single global TS hook (adopted)
- Pros: one SSOT; absolute path kills cwd drift; TS runtime (zod, structured
  deny, fail-open); matches how every other global hook is registered.
- Cons: applies to all projects; registration is untracked machine state
  (ADR-0009); TS is structurally confined to the global hooks dir (zod).

### Option B: Keep per-project `.sh` (status quo, rejected)
- Pros: no migration; per-project independence.
- Cons: leaves the cwd-drift bug in every project; the 5-way version drift
  continues; 12 copies to maintain. This is precisely the "every project is
  different" problem the user asked to end.

### Option C: Fix each `.sh` in place with absolute paths (rejected)
- Pros: smallest change; keeps bash; per-project copies retained.
- Cons: fixes cwd drift but not divergence — still 12 copies to keep in sync;
  still bash (no zod validation / structured deny); absolute paths hard-code
  each project location, breaking on move.

### Option D: Move the guard into the plugin `hooks.json` (rejected)
- Pros: version-controlled with the plugin; reaches all plugin users.
- Cons: the guard is machine/personal defence, not plugin product surface;
  coupling it to the plugin release cycle is wrong; the plugin's 10-hook
  identity is a curated set (CLAUDE.md rule) and adding a personal guard there
  muddies it.

## Why not B/C/D

**B is the problem being solved** — it preserves both the cwd-drift bug and
the version divergence across 12 copies.

**C fixes one symptom (cwd drift) but not the divergence**, and keeps the
weaker bash runtime. It is the minimal-change option, but the user's explicit
requirement was consistency across projects, which C cannot deliver.

**D misplaces a personal defence into shared product surface** and tangles
with the curated 10-hook plugin identity.

**A is the only option that delivers cross-project consistency, eliminates the
cwd-drift bug, and upgrades to the zod runtime** — and it is forced by the
zod-resolution constraint, which makes a project-local TS port impossible.

## References

- ADR-0009 — `settings.json` not tracked (global registration is untracked machine state)
- ADR-0015 — zod sole runtime dependency (TS hook uses zod at the `defineHook` choke point only)
- `docs/rules/context-loop.md` §2.2 — the 3-condition ADR gate this decision satisfies
- `CLAUDE.md` — "10-hook 不可 regress" (the 10 plugin hooks are untouched; `pre-tool-guard` was project-local, not one of the 10)
- Code review: dual-axis (Standards + Spec) review of `pre-tool-guard.ts`, GATE: PASS (0 High); Spec axis confirmed R1–R4 regex / allowlist / normalization parity with the `.sh`
- Archive: `~/.claude/hooks/archive/pre-tool-guard/` (12 files, provenance-tagged)
- Migration commits: Arthurpower `810f3c3`, arthur `08f642a`, 归档-arthur_v0 `ba54a34`, 归档-arthur2 `659a33e`, <local-project> `cb3cd3f`, tpl-test `464485d`, v-code-review `558e839`
