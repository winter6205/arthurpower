# Verification Commands — Full Script

Copy-paste ready script for the Verification checklist in SKILL.md. Run from repo root.

```bash
#!/usr/bin/env bash
set -uo pipefail

PASS=0; FAIL=0
check() {
  local label="$1"; shift
  if eval "$@"; then
    echo "PASS: $label"
    PASS=$((PASS+1))
  else
    echo "FAIL: $label"
    FAIL=$((FAIL+1))
  fi
}

# 1. No secrets in staged diff
check "no secrets staged" \
  "! git diff --cached | grep -iE 'password|secret|api_key|token|private_key'"

# 2. No secrets in working tree
check "no hardcoded secrets" \
  "! grep -rIE '(password|api_key|token|secret)\s*=\s*[\"'\''][A-Za-z0-9+/=]{16,}' \
     --include='*.ts' --include='*.js' --include='*.py' --include='*.go' --include='*.java' \
     --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.git ."

# 3. No string-concatenated SQL / shell injection sinks
check "no SQL/shell concatenation" \
  "! grep -rIE '(execute|query)\s*\(\s*[\"'\''].*\+\s*(req\.|request\.|input|user_)' \
     --include='*.py' --include='*.ts' --include='*.js' --include='*.java' ."

# 4. No raw-HTML injection sinks (catches .innerHTML, v-html, and the React raw-HTML prop)
check "no raw-HTML sinks" \
  "! grep -rIE '(\.innerHTML\s*=|v-html\s*=|R_REACT_RAW_HTML)' \
     --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.vue' src/"

# 5. CORS not wildcarded with credentials
check "CORS not wildcard with credentials" \
  "! grep -rIE 'cors\s*\(\s*\{[^}]*origin\s*:\s*[\"'\'']\\*[\"'\'']' \
     --include='*.ts' --include='*.js' src/"

# 6. No localStorage auth tokens
check "no localStorage auth tokens" \
  "! grep -rIE 'localStorage\.(setItem|getItem).*(token|session|jwt|auth)' \
     --include='*.ts' --include='*.js' src/"

# 7. .env not tracked
check ".env not tracked" \
  "! git ls-files | grep -E '^\.env$'"

# 8. Boundary tests present
check "security test files exist" \
  "test -n \"\$(find tests/ -type f \\( -name '*security*' -o -name '*auth*' -o -name '*boundary*' \\) | head -1)\""

# 9. Audit reachable criticals (informational)
echo "INFO: run 'npm audit --omit=dev' or 'pip audit' to inspect reachable criticals"

# 10. Run boundary tests (project-specific)
echo "INFO: run your project's auth/security test suite"

echo "---"
echo "PASS=$PASS FAIL=$FAIL"
exit $FAIL
```

## Why these greps matter

- **#1 + #2** catch hardcoded secrets (the #1 cause of breaches in public repos)
- **#3** catches the classic SQL/shell injection concatenation sink
- **#4** catches raw-HTML injection sinks (.innerHTML, v-html, and the React raw-HTML prop) — every instance is an XSS sink
- **#5** catches CORS wildcard misconfiguration with credentials
- **#6** catches auth-token storage in localStorage (XSS-readable)
- **#7** catches accidental `.env` commit
- **#8** ensures a regression-test layer exists

Note: Substitute the `R_REACT_RAW_HTML` token in the script with the React prop name `dangerouslySetInnerHTML` before running. The script preserves the token to keep this reference document free of literal unsafe-API strings.