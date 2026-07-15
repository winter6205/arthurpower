# Rationalization Table

Excuses developers give when skipping security. Each row pairs the rationalization with the actual outcome.

| Excuse | Reality |
|--------|---------|
| "The framework handles security" | Frameworks provide primitives, not guarantees. Misuse is the rule, not the exception. Read the docs, configure correctly, test the boundary. |
| "This is internal, security doesn't matter" | Internal tools get compromised. Attackers target the weakest link. Insider threats exist. Compliance auditors exist. |
| "We'll add security later" | Security retrofit is 10x harder than building it in. "Later" becomes "never" or "after the breach". |
| "No one would try to exploit this" | Automated scanners find exposed endpoints 24/7. Security by obscurity is not security. |
| "It's just a prototype" | Prototypes become production. Day-one security habits beat day-100 retrofits. |
| "Client-side validation is enough" | Client code is in attacker hands. Server-side validation is the only security boundary. |
| "We hashed the password, we're done" | Hashing without salt rounds ≥ 12, pepper, or proper algorithm choice = weak protection. `md5(password)` is not hashing. |
| "The user is authenticated, they can do anything" | Authentication ≠ authorization. Logged-in users still need per-resource permission checks. OWASP #1. |