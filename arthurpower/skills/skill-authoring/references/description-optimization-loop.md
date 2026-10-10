# skill-authoring — Description Optimization Loop Reference

## Description Optimization Loop

Description frontmatter decides whether the skill loads. Use a four-step loop, not gut feel.

1. Prepare 20 trigger queries in real query style, covering positive triggers and negative triggers.
2. Score each query on three dimensions: trigger coverage, false-positive risk, length.
3. Run the loop, change description, measure pass rate. At least three iterations.
4. Converge when pass rate reaches >= 18/20, length stays at or below the 400-char hard max, and the last two iterations do not regress.
