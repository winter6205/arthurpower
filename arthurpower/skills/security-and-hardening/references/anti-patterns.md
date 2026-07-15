# Anti-Patterns

Bad patterns that recur in code reviews. Each entry pairs the symptom with the underlying failure.

- **Secrets in code** — even with `// TODO: move to env`, even in a "private" repo
- **Authentication without authorization** — "logged in" is not "allowed to do this"
- **Trusting framework defaults blindly** — helmet with `unsafe-inline` is a placebo
- **Client-side validation as security** — server must re-validate everything
- **Generic error messages that hide bugs** — "An error occurred" with no logging makes incident response impossible
- **Generic error messages that leak internals** — "SQL error: column users.password_hash does not exist" is an information disclosure
- **Permissive CORS** — `*` with credentials is a misconfiguration; either restrict origin or drop credentials
- **Logging sensitive data** — passwords, tokens, full credit card numbers in logs = breach waiting to happen
- **Raw-HTML or dynamic-code sinks reached by user input** — every instance is an XSS or RCE sink
- **Hashing without pepper or modern algorithm** — MD5/SHA1/single-round SHA256 = no protection