---
name: security-and-hardening
description: Use when adding an endpoint, handler, RPC, web form, auth flow, file upload, third-party API integration, or secret-handling code path, or when input validation, authentication, authorization, rate limiting, secret management, CORS, or security headers are missing or assumed.
bucket: engineering
---

# Security and Hardening

Every external input is hostile until validated at the system boundary. Every secret is a liability until removed from code. Every authorization check is mandatory until proven redundant. This skill enforces the **3-layer boundary**: input validation, auth/authz, secret management.

## When to use

- Adding a new API endpoint, CLI command, RPC handler, or web form
- Implementing or modifying authentication or authorization logic
- Storing, transmitting, or logging sensitive data (passwords, tokens, PII, payment info)
- Integrating with a third-party API or webhook
- Adding a file upload handler or accepting user-uploaded content
- Reviewing a PR whose diff touches input, auth, secrets, or external calls
- Adding a new dependency that handles crypto, auth, or session state
- Triaging `npm audit` / `pip audit` / equivalent findings

## When NOT to use

- Pure UI work with no input handling or auth boundary
- Generated code (codegen output, vendored libraries) — audit upstream instead
- Pure declarative config (yaml/json with no code path)
- No-behavior-change formatting or refactoring
- Prototype code explicitly marked `// PROTOTYPE: do not deploy` and never shipped

## Procedure

1. **Identify every input boundary** the new code crosses. Enumerate explicitly: HTTP request body, query string, path params, headers, cookies, uploaded files, third-party API responses, env vars, DB rows written by another process. If you cannot enumerate, you have not yet understood the code.

2. **Validate at the boundary, not downstream.** Use a schema (zod, joi, pydantic, serde) at the edge. Reject malformed input with a typed error before it reaches business logic. Never trust client-side validation as a security boundary — client code is in attacker hands.

3. **Apply the 3-layer boundary system.**
   - **Layer 1 — Input validation:** schema-validate, length-bound, type-narrow, encode-on-output. SQL/NoSQL/command/HTML all parameterized or escaped.
   - **Layer 2 — Auth/authz:** every protected resource checks *who* (authentication) and *whether* (authorization). Authentication without authorization = broken access control (OWASP #1).
   - **Layer 3 — Secret management:** secrets in env vars only. Never in code, never in logs, never in version control. Rotate on exposure.

4. **Use the framework's security primitives — correctly.** Helmet, CSRF tokens, parameterized ORMs, httpOnly+secure+sameSite cookies, CSP, HSTS, password hashing (bcrypt/scrypt/argon2 with salt rounds ≥ 12). Frameworks provide tools, not guarantees. Misconfigured helmet with `unsafe-inline` is not a security header.

5. **Apply the principle of least privilege.** Default-deny. Authenticated user owns resource X → only user X can read/write X. Admin actions require admin role check, not "is logged in" check. Service tokens get the minimum scope required, not "full access".

6. **Pre-commit secret scan.** `git diff --cached | grep -iE "password|secret|api_key|token|private_key"`. If a real secret is found, rotate it — git history rewrite is not sufficient remediation, the secret is already exposed.

7. **Triage audit findings by reachability, not severity alone.** A critical CVE in an unreachable code path is lower priority than a moderate CVE in a hot path. Document the deferral with a review date.

## Acceptance Criteria

Binary yes/no. Every item must be YES for the change to land. Full checklist in `references/acceptance-criteria.md` (14 items).

- Schema validation present at every external-input boundary: YES / NO
- Auth AND authz both checked on every protected resource: YES / NO
- Secrets in env vars only (no literals in code, logs, commit): YES / NO
- No SQL/shell/HTML string-concatenation with user input: YES / NO
- Auth endpoints rate-limited (≤ 10 / 15 min): YES / NO
- Session cookies: `httpOnly` + `secure` + `sameSite`: YES / NO
- Passwords hashed (bcrypt/scrypt/argon2, salt rounds ≥ 12): YES / NO
- CORS restricted to explicit origin allowlist (no `*` w/ credentials): YES / NO
- Security headers present (CSP, HSTS, X-Frame-Options, X-Content-Type-Options): YES / NO
- Generic error responses; internals go to server logs only: YES / NO
- No raw-HTML or dynamic-code-execution sink reachable by user input: YES / NO
- Boundary tests cover validation/auth/rate-limit/secret-in-log/secret-in-response: YES / NO
- No critical reachable vulnerability (`npm audit` / `pip audit`): YES / NO
- `.env` git-ignored; `.env.example` committed as template: YES / NO

## Verification

Run these commands; full script in `references/verification-commands.md`.

```bash
git diff --cached | grep -iE "password|secret|api_key|token|private_key" && exit 1 || echo "PASS"
grep -rIE "(password|api_key|token|secret)\s*=\s*['\"][A-Za-z0-9+/=]{16,}" --include="*.{ts,js,py,go,java}" --exclude-dir={node_modules,.venv,.git} . && exit 1 || echo "PASS"
grep -rIE "(\.innerHTML\s*=|v-html\s*=|dangerouslySetInnerHTML)" --include="*.{ts,tsx,js,jsx,vue}" src/ && exit 1 || echo "PASS"
git ls-files | grep -E "^\.env$" && exit 1 || echo "PASS"
test -n "$(find tests/ -type f \( -name "*security*" -o -name "*auth*" -o -name "*boundary*" \) | head -1)" && echo "PASS" || exit 1
```

## Rationalization Table

Full table in `references/rationalization-table.md` (8 rows: framework-trust, internal-tool, retrofit-later, obscurity, prototype, client-side-only, weak-hash, auth-equals-authz).

## Red Flags — Stop and Start Over

Full list in `references/red-flags.md` (11 items: SQL/shell concat, secret literals, missing authz, wildcard CORS, no rate limit, stack-trace leak, raw-HTML sink, weak hash, localStorage auth, reachable CVE, .env tracked).

See `references/pressure-scenarios.md` for the canonical Pressure / Test prompt / Correct response table, and `references/anti-patterns.md` for the expanded bad-pattern list.

## Required Baseline

**Zero tolerance**: code lands with all 3 boundary layers enforced (input validation, auth/authz, secret management), or it does not land. No "TODO: add validation". No "we'll rotate the key next sprint". No `localStorage` auth tokens. No `*` CORS with credentials. No critical-severity reachable CVEs.

## Example

See `references/example-3-layer-boundary.md` for a concrete login-endpoint walkthrough mapping to 3 procedure steps, 3 OWASP classes, 7 boundary tests.

## Differentiation from S2

See `references/differentiation-from-s2.md`. Composes with S2 (5-class function boundary tests) and adds 3-layer system defense.

## Related Skills

- `defensive-contract-validator` (S2) — 5-class boundary tests on public functions
- `error-handling-enforcer` (S3) — typed errors, no empty catch
- `minimal-change-verifier` (S6) — security fix is a fix, not a refactor
- `architecture-change-reviewer` — security impact of architectural changes
- `verification-before-completion` — evidence before claims; security claims need attack-scenario proof
