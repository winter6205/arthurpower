# Step 7 — knowledge extraction after write

Run only after Steps 1–6 finish writing. Skip when any skip condition holds.

## Subagent role

- Extract candidates only. **Write no files.**
- At most 10 candidates per run.
- Each candidate has four fields:

| Field | Meaning |
|-------|---------|
| description | One sentence: what was learned |
| evidence | Path + line numbers, with before/after |
| scope | project-specific / general / cross-tool |
| rating | high / medium / low |

## Keep vs drop

**Keep (high / medium)** when the learning is:

- reusable across scenarios
- something the agent should know but does not yet
- promotable into CLAUDE.md / rules / auto memory / a skill
- not already covered by an existing rule

**Drop (low)** when it is:

- project-specific config
- a one-off fix
- temporary debug output
- a restatement of a known rule

## Skip conditions (any one → skip Step 7)

- fewer than 3 edit sites
- purely local bug fix with no reusable value
- mechanical follow-through of an existing skill
- Step 6 wrote files but no subagent was involved

## Subagent prompt template

```markdown
Scan the changed files and extract reusable knowledge candidates.
Write no files.

Changed files: {files}
Change kind: {edit | delete | create}

For each candidate return:
- description
- evidence (path + lines + before/after)
- scope (project-specific | general | cross-tool)
- rating (high | medium | low)

Keep: reusable patterns, general anti-patterns, new couplings, cross-tool techniques
Drop: project config, one-off fixes, temporary debug

At most 10 candidates. Return JSON.
```

## Main-agent filter

1. Receive the candidate report.
2. Group by rating.
3. high → start a new 6-step iteration.
4. medium → queue for the next self-evolving run.
5. low → drop.
6. Report counts: high / medium / low.
