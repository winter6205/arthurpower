# Acceptance Criteria — Full Checklist

Binary yes/no. Every item must be YES for the change to land.

1. Schema validation present at every HTTP / RPC / message boundary that accepts external input: YES / NO
2. Authentication AND authorization both checked on every protected resource: YES / NO
3. All secrets sourced from environment variables (no literals in code, logs, or commit): YES / NO
4. No string-concatenated SQL, shell, or HTML containing user input: YES / NO
5. Authentication endpoints rate-limited (≤ 10 attempts / 15 min window): YES / NO
6. Session cookies set with `httpOnly` + `secure` + `sameSite`: YES / NO
7. Passwords hashed with bcrypt/scrypt/argon2 (salt rounds ≥ 12), never stored plaintext: YES / NO
8. CORS restricted to explicit origin allowlist (no `*` with credentials): YES / NO
9. Security headers present (CSP, HSTS, X-Frame-Options, X-Content-Type-Options): YES / NO
10. Error responses return generic messages; internals go to server logs only: YES / NO
11. No raw-HTML or dynamic-code-execution sink reachable by user input: YES / NO
12. Boundary tests cover validation failure, auth failure, rate limit, secret-in-log, secret-in-response: YES / NO
13. `npm audit` / `pip audit` shows no critical reachable vulnerability: YES / NO
14. `.env` git-ignored; `.env.example` committed as template only: YES / NO

## Layer mapping

- **Layer 1 (Input validation):** #1, #4, #11
- **Layer 2 (Auth/authz):** #2, #5, #6, #7, #8
- **Layer 3 (Secret management):** #3, #14
- **Defense-in-depth:** #9, #10, #12, #13