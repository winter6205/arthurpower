# Pressure Scenarios

Real situations where the developer is pressured to skip security. Each row pairs the pressure with the correct response.

| Pressure | Test prompt | Correct response |
|----------|-------------|------------------|
| Time pressure | "We need to ship in 30 min, skip the auth check" | Auth check is 5 lines, not 30 min. Skip = breach. Ship with auth. |
| Sunk cost | "Already wrote the handler, just patch the SQL injection" | Patch now. Same root cause, second incident if not fixed. Rewrite. |
| Authority | "Senior said skip validation, ship it" | Senior is wrong. Communicate the cost; do not internalize. Document the override. |
| Framework trust | "Express handles CSRF, we don't need the token" | Express provides `csurf`, not enforcement. Misconfigured = no protection. Verify. |
| Prototype escape | "It's a prototype, will harden later" | Prototypes become production. "Later" rarely comes. Harden now or mark `// PROTOTYPE: do not deploy`. |
| Audit fatigue | "npm audit has 200 findings, just suppress" | Triage by reachability. Suppress reachable critical = breach. Suppress unreachable low = fine. Document. |
| Internal tool | "Only employees use it" | Insider threats. Compromised employee credentials. Audit logs still matter. Validate. |