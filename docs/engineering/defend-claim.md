# defend-claim — the deny gate

> De-integrated from the skill layer to this docs page (ADR-0025). The five
> PostToolUse hooks still fire; only the navigation surface changed.

## Quickstart

You do not install or invoke this as a skill. The gate lives in five
PostToolUse hooks registered in `arthurpower/hooks/hooks.json`. They fire
automatically on every relevant tool call:

```bash
# Prove each hook is armed (exit 0 = armed)
bash ~/.claude/hooks/defend-claim-execution.ts --self-test
bash ~/.claude/hooks/defend-claim-cite-integrity.ts --self-test
bash ~/.claude/hooks/defend-claim-report-triple.ts --self-test
bash ~/.claude/hooks/defend-claim-dumb-zone.ts --self-test-reset && bash ~/.claude/hooks/defend-claim-dumb-zone.ts --self-test
bash ~/.claude/hooks/defend-claim-silent-fail.ts --self-test
```

If you want the *soft* counterpart (running the evidence, writing the
`PASS =` line), use `arthurpower:verification-before-completion`.

## Source of truth

There is no SKILL.md for this discipline — the hook layer is the source of
truth. The operator-facing exposition lives on this page. The five hooks:

| Q | Hook file | Tool | What it denies |
|---|-----------|------|----------------|
| Q1 | `arthurpower/hooks/defend-claim-execution.ts` | Bash | claims without a raw execution record (advisory, exit 0) |
| Q2 | `arthurpower/hooks/defend-claim-cite-integrity.ts` | Write | phantom cites — `path:line` / SHA / status that doesn't exist (exit 2) |
| Q3 | `arthurpower/hooks/defend-claim-report-triple.ts` | Write | completion claims lacking an action-verb triple (exit 2) |
| Q4 | `arthurpower/hooks/defend-claim-dumb-zone.ts` | Edit \| Write | claims against a stale session entity state (advisory, exit 0) |
| Q5 | `arthurpower/hooks/defend-claim-silent-fail.ts` | Edit \| Write | empty-catch / silent-null that defeats a downstream claim (exit 2) |

## What it does

**One-sentence job:** deny completion claims that lack physical evidence, at
the moment the claim is written.

The defining constraint: `defend-claim` is a **machine-layer gate**, not a
protocol. The five hooks sit on `PostToolUse` and read the actual tool result
(exit code, bytes, cite targets). When a claim is unsupported they **deny** —
exit code 2 feeds the denial back to the model as a system message, so the
claim is not delivered to the user. There is no room for "partially works";
a claim either carries its evidence or it is rejected.

The verdict surface is a triple — `ASSERT` (all Q pass), `QUALIFY`
(1 Q fails in non-load-bearing scope), `REJECT` (Q1/Q2 fail, or 2+ fail).

## When to reach for it

**Invocation mode: never invoked as a skill.** The hooks fire on their own;
there is nothing to reach for at claim time. You reach for this page when you
want to *understand* why a claim was denied, or to re-verify the gate is
armed.

**Trigger boundary** — the gate answers one question: "does this completion
claim have physical evidence right now?" It is not:
- the evidence-capture protocol → that is `arthurpower:verification-before-completion`
  (run the test, capture the output, write the `PASS =` line),
- code-quality / structural / maintainability defense → `arthurpower:minimal-change-verifier`
  (S1-S6),
- debug-flow → `arthurpower:systematic-debugging`.

When a claim is denied, the next move is the verification skill, not a
defense of the claim: run the evidence, produce the `PASS =` line, re-write.

## Where it fits

**Role:** standalone hook layer, active on every run. Not a chain step, not
a setup artifact — it is always on.

Neighbours:
- `arthurpower:verification-before-completion` — the soft partner that
  produces the evidence `defend-claim` demands. Run it *before* the claim.
- `arthurpower:minimal-change-verifier` — S1-S6 structural defense; different
  axis (maintainability vs. claim honesty).

See the [`using-agent-skills`](../../arthurpower/skills/using-agent-skills/SKILL.md) router for the full system map.
