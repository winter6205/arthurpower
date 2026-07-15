# Red Flags — Stop and Start Over

If any of these appear in a diff, halt and fix before merging. Each is an independently blocking defect.

- User input concatenated into SQL, shell commands, or HTML without escaping
- Secret, API key, password, or token literal in source code or commit history
- Endpoint with no authentication or authorization check on a protected resource
- CORS configured to `*` or origins list contains broad wildcards
- No rate limiting on authentication endpoints (login, password reset, token exchange)
- Stack trace, internal error, or environment detail returned in HTTP response
- Raw-HTML injection sink reached by user input (DOM `.innerHTML` assignment, React raw-HTML prop, server-side template with `|safe` on user data, or any dynamic-code-execution sink)
- Password stored as MD5/SHA1 hash, or with no salt, or with salt rounds < 10
- `localStorage` used to store auth tokens or session identifiers
- `npm audit` / `pip audit` shows critical vulnerability in a reachable code path
- `.env` file containing real secrets tracked in git (not just `.env.example`)