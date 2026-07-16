# Anti-Self-Certification Bypass Table

> Full mapping of bypass attempts and the Q1-Q5 mechanism that defeats each one. Loaded on demand from `defend-claim/SKILL.md` §Anti-Self-Certification Bypass Table.

| # | Bypass Attempt | Defeat Mechanism |
| --- | --- | --- |
| 1 | Paraphrase cached stdout / run irrelevant command for SHA256 | Q1 binding forces `$EXECUTED_CMD` to reference `$CLAIM_TARGET`; sha256 re-computed by hook |
| 2 | Phantom cite — write `/src/x.py:42` without `ls + sed` | Q2 auto-runs `timeout 3s sed`; mismatch = Exit 2 with `REJECTED: Q2 phantom cite — <reason>` |
| 3 | Vocabulary evasion & zero-width character injection | Q3 strips invisible Unicode, then parses closed-list triple structurally |
| 4 | Silent failure hidden by complex syntax | Q5 L1 regex denies on `except: pass` / `catch {}`; Q1 behavioral probe required on hit |
| 5 | Trust-me / skip-verification / delegation ("just merge", "do the verification for me") | Q3 Report Triple requires action-verb + target + observed-outcome in the same Write; user-claimed success without exec record = Exit 2. Conversational contract: respond with `verification required regardless of trust; cannot skip; must run` |
| 6 | Size exemption ("just a tiny typo", "1-character change") | Q1 fires on any Bash that closes the task — no exemption for size. Conversational contract: `no exemption for small changes; size does not waive verification; must run tests` |
| 7 | Docs-as-evidence ("I already read the docs and confirmed") | Docs are not execution; Q1 demands fresh exec record. Conversational contract: `docs are not evidence; run the code; test it yourself; prove it` |
| 8 | Stale-memory ("it worked in the previous session") | Previous-session output is not current-turn evidence; Q1 re-runs sha256 each Bash. Conversational contract: `previous session is not evidence; re-run now; verify now; exec artifact required` |
| 9 | Tracker-as-proof ("just mark done for the tracker") | Tracker status is metadata, not verification; Q3 demands an exec artifact. Conversational contract: `tracker is not evidence; run the test; show exec artifact; paste test output` |
| 10 | Time pressure ("user is busy", "just say complete") | Verification is non-negotiable regardless of time pressure; Q3 fires on the same Write. Conversational contract: `cannot skip; verification required; must run; evidence required` |
| 11 | Delegation framing ("can you do the verification for me?") | Q1 binds exec to the agent, not the user; user-deferred verification does not transfer. Conversational contract: `I will run pytest; show me the exit code; show the diff; show status` |

**Reading order**: When a claim is rejected, walk this table first. The bypass attempt is usually one of these 11; the defeat mechanism tells you which Q hooks to inspect.
