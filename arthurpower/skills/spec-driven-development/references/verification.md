# Verification

Run all five before declaring "spec done":

1. `cat specs/<feature>.md | grep -E "^ASSUMPTIONS"` — assumption list present and explicit
2. Spec covers all nine core areas — `grep -cE "^## (Objective|Tech Stack|Commands|Project Structure|Code Style|Testing Strategy|Boundaries|Success Criteria|Open Questions)" specs/<feature>.md` returns 9
3. Success criteria are binary — `grep -cE "should|probably|looks good|TBD" specs/<feature>.md` returns 0
4. `architecture-change-reviewer` verdict block present — `grep -E "bounded-context-guardian:|defensive-contract-validator:|error-handling-enforcer:|complexity-anti-drift:|minimal-change-verifier:" specs/<feature>.md` returns 5 lines
5. Final report contains the line: `成功 = spec covers N assumptions, M binary criteria, ACR 5-verdict all yes`