---
description: Audit or explicitly synchronize the plugin source, marketplace, and cache layers.
allowed-tools: Read, Bash
argument-hint: [audit|sync] [optional: --src/--mkt/--cache overrides]
---

# /plugin-broadcast

## When to use

Use after changing `arthurpower/` SRC as preparation for the methodology §②
push+broadcast flow, or after a remote pull as preparation for §④
pull+broadcast.

## What it does

The default mode is read-only audit:

```bash
python scripts/sync-marketplace-cache.py audit
```

Exit code 1 means drift is present. Do not auto-fix an audit result. Use the
explicit `sync` sub-command when the operator wants to write destinations.

## Sub-commands

- `audit` (default) compares SRC, MKT, and CACHE without writing.
- `sync` runs `python scripts/sync-marketplace-cache.py sync [$ARGUMENTS]` and
  is the only write path. Sync no-delete: it never deletes destination files.
- `git push` is always operator-authorized; this command does not push.
- A cache/plugin version mismatch emits `[WARN]` on stderr and is non-blocking.

## Output

Audit reports each mismatch as a row in this form:

```text
[DRIFT] <relative-path> src=<sha256> mkt=<sha256> cache=<sha256>
```

Use `scripts/sync-marketplace-cache.py --help` for the complete flag list,
including `--src`, `--mkt`, and `--cache` overrides.
