# skill-authoring — Discipline Checklist (References)

## Overview

This file is the canonical Rationalization Table + Red Flags + Pressure Scenarios for `skill-authoring` (the arthurpower meta-skill). Read alongside the main SKILL.md.

## Rationalization Table (canonical, 8 rows)

| Excuse | Reality |
|--------|---------|
| "Skill is obviously clear" | Clear to you ≠ clear to other agents. Test with 3+ pressure scenarios. |
| "It's just a reference" | References can have gaps. Test retrieval. |
| "Testing is overkill" | Untested skills have issues. Always. 15 min testing saves hours. |
| "I'll test if problems emerge" | Problems = agents can't use skill. Test BEFORE deploying. |
| "Too tedious to test" | Less tedious than debugging a bad skill in production. |
| "I'm confident it's good" | Overconfidence guarantees issues. Test anyway. |
| "Academic review is enough" | Reading ≠ using. Test application scenarios. |
| "No time to test" | Deploying untested wastes more time fixing later. |

## Red Flags — STOP and Start Over (canonical, 9 items)

- Skill body > 5 KB without a separate heavy-reference file
- Description doesn't start with "Use when..." (3rd person, no workflow summary)
- Acceptance criteria use "should" / "probably" / "looks good" (must be binary yes/no)
- Procedure step uses narrative storytelling ("In session 2025-10-03, we found...")
- No Rationalization Table for discipline skills
- Rationalization Table < 5 rows
- Red Flags < 5 items
- Verification is unfalsifiable ("agent seems to use it")
- Skill is multi-language (example-js.js, example-py.py, example-go.go) — pick one excellent example

## Pressure Scenarios (must test before deploy)

For discipline skills (rules/requirements), test with:
- Time pressure: "We need to ship in 30 min, just commit it"
- Sunk cost: "Already spent 1 hour on this skill, skip testing"
- Authority: "Senior said looks good, that's approval"
- Scope creep: "I'll add 2 more sections while I'm at it"
- Exhaustion: hour 4 of debug, "good enough, ship it"
- Combined: time + authority + exhaustion

## Anti-Patterns (forbidden)

- Narrative Example ("In session 2025-10-03...")
- Multi-Language Dilution (5 examples, mediocre quality)
- Code in Flowcharts
- Generic Labels (helper1, step3, pattern4)
- Follows the writing-skills methodology without adaptation (distill + adapt, do not copy)
- Internal monologue ("Let me think about this carefully...")
- @ links to other skills (force-loads, burns context)

## The Iron Law

NO SKILL WITHOUT A FAILING TEST FIRST. This applies to NEW skills AND EDITS to existing skills. Write skill before testing? Delete it. Start over.