# Differentiation from `defensive-contract-validator` (S2)

`defensive-contract-validator` covers **5-class boundary testing** (empty / negative / long / concurrent / exception) for public functions. This skill covers **3-layer boundary defense** (input validation / auth-authz / secret management) for the *system* as a whole.

| Concern | S2 defensive-contract-validator | security-and-hardening |
|---------|--------------------------------|------------------------|
| **Scope** | Single public function | Whole system / endpoint / integration |
| **Boundary** | Function input/output contract | Trust boundary crossing the system |
| **Test class** | empty / negative / long / concurrent / exception | validation / auth / authz / secret / CORS / rate-limit / injection |
| **Threat model** | Function correctness under edge inputs | Adversary-controlled input / credential / secret |
| **Output** | Tests pass; contract proven | 3 layers enforced; attack surface reduced |

Use **S2** for any public function. Use **security-and-hardening** whenever the diff crosses a trust boundary (user input, auth, external API, secret). They compose: a security-relevant endpoint first applies S2 to its handler functions, then applies the 3-layer system to the endpoint as a whole.