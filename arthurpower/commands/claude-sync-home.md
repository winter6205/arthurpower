---
description: Audit local ~/.claude sync state before operator-led push or pull preparation.
allowed-tools: Read, Bash
argument-hint: [status-only]
---

# /claude-sync-home

Inspect the local `~/.claude/` data-repo state without changing it.

## When to use

- After local `~/.claude/` edits, during methodology §① push preparation.
- After a remote data-repo update, during methodology §③ pull preparation.

## What it does

Runs only these read-only checks:

```bash
git -C ~/.claude status --short
git -C ~/.claude log --oneline origin/master ^master
git -C ~/.claude diff --stat
```

It does not inspect or print `settings.json` diffs; ADR-0009 keeps that file out of this audit.

## Output

Print three checklist blocks:

### §① Local change audit

- [ ] Local changed-file status captured.
- [ ] Local diff scope captured.
- [ ] Changed files are ready for operator review.

### §① Operator handoff

- [ ] Any commit decision remains with the operator.
- [ ] no push: this command does not send changes anywhere.
- [ ] push 永远 operator; 本命令不代 push.

### §③ Remote update audit

- [ ] Remote-versus-local commit gap captured.
- [ ] Any fast-forward pull decision remains with the operator.
- [ ] Conflicts or unexpected local work are reported for operator handling.

## Sub-commands

A-1 is status-only. This command only has the audit/status segment and does not accept commit or push sub-commands.
