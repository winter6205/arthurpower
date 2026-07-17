# Rationalization table + red flags

## Rationalization Table

| Excuse | Why it sounds right | Reality | Required action |
|--------|---------------------|---------|-----------------|
| "The new rule is obviously correct; skip grep" | Saves time | Misses same-topic rules → silent conflict | Always grep all three layers first |
| "I'll write memory directly; skill is overhead" | One-line fix feels trivial | Bypasses strip + routing + provenance | Invoke this skill before any L1/L2 write |
| "Keep both rules; they mostly agree" | Feels safer than deleting | Downstream agents pick at random | Merge to one rule after priority ladder |
| "Promote my inference to a hard constraint" | Confidence feels like evidence | Invented authority without provenance | Tag `[agent inference · unconfirmed]` or drop |
| "Run Step 7 on every tiny edit" | More extraction feels thorough | Noise candidates flood the queue | Honor skip conditions (< 3 sites, local fix) |
| "Accept every high-looking candidate" | Subagent sounded confident | Project-specific junk becomes L1 | Filter by scope + rating before new iteration |
| "Regression tests can wait until later" | Eval suite is slow | Rule change can break skill routing silently | Run `.evals/run.sh` when present; roll back on fail |
| "Engineering change is just docs; skip boundary test" | Hook/rule text is not product code | Silent bugs in hooks ship as discipline | Follow boundary-testing protocol when shipping with code |

## Red Flags — STOP

- Editing CLAUDE.md / rules / auto memory without invoking this skill
- Skipping cross-layer grep before write
- Leaving two conflicting rules after a merge
- Shipping self-certifying wrappers instead of strip
- Step 7 subagent allowed to write files
- Accepting all Step 7 candidates without rating filter
- Claiming iteration done without post-iteration eval when `.evals/` exists
- Mixing skill-authoring (new skill creation) into this memory-evolution flow
