#!/usr/bin/env bash
# scripts/bootstrap.sh - idempotent project setup (9 steps + optional --from-git clone)
# Usage:
#   bash scripts/bootstrap.sh                     # local template assumed already copied
#   bash scripts/bootstrap.sh --from-git <url>    # clone + cp template first, then 9 steps
#
# Steps:
#   0. --from-git: clone + cp template (if requested)
#   1. git init (if not)
#   2. git config core.hooksPath .githooks (if not)
#   3. Verify .evals/ exists
#   4. Verify docs/CONTEXT.md exists
#   5. Verify docs/handoff/ exists
#   6. Run .evals/run.sh --all baseline (10/10)
#   7. Verify 5 context-闭环 hook files exist (assets, not registration)
#   8. Verify 3 critical rule files exist (context-loop / boundary-testing / self-evolving)
#   9. Report hook registration state (informational, per Option A)
#
# Idempotent: each step checks existing and skips if present.
# Exit code: 0 on full success, 1 if baseline eval fails, 2 if structure missing.
set -euo pipefail

GIT_SOURCE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --from-git) GIT_SOURCE="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *) echo "[bootstrap] unknown arg: $1" >&2; exit 2 ;;
  esac
done

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Step 0: --from-git clone + cp template (optional)
if [ -n "$GIT_SOURCE" ]; then
  step 0 "clone + cp template from $GIT_SOURCE"
  case "$GIT_SOURCE" in
    http*|git@*) GIT_URL="$GIT_SOURCE" ;;
    */*) GIT_URL="https://github.com/${GIT_SOURCE}.git" ;;
    *) GIT_URL="$GIT_SOURCE" ;;
  esac
  CLONE_TMP="$(mktemp -d 2>/dev/null || echo "/tmp/arthur-tpl-bootstrap-$$")"
  mkdir -p "$CLONE_TMP"
  if git clone --depth=1 "$GIT_URL" "$CLONE_TMP" 2>&1 | sed 's/^/[bootstrap]   /'; then
    # cp template into project (incremental, PROTECTED skipped)
    bash "$(dirname "$0")/update.sh" --from "$CLONE_TMP" \
      || echo "[bootstrap] WARN: update.sh reported diffs (PROTECTED preserved, safe to continue)"
    ok "template cloned + gap-filled from $GIT_URL"
  else
    rm -rf "$CLONE_TMP"
    fail "git clone failed for $GIT_URL - set --from-git <valid-url> or pre-copy template locally" 1
  fi
  rm -rf "$CLONE_TMP"
fi

step() {
  echo ""
  echo "[bootstrap] step $1: $2"
}

ok() {
  echo "[bootstrap] OK: $1"
}

skip() {
  echo "[bootstrap] SKIP: $1"
}

fail() {
  echo "[bootstrap] FAIL: $1" >&2
  exit "${2:-1}"
}

# Step 1: git init
step 1 "git init"
if [ -d .git ]; then
  skip ".git already exists"
else
  git init >/dev/null 2>&1 && ok "git init" || fail "git init failed"
fi

# Step 2: git config core.hooksPath
step 2 "git config core.hooksPath .githooks"
CURRENT_HOOKS=$(git config --get core.hooksPath 2>/dev/null || echo "")
if [ "$CURRENT_HOOKS" = ".githooks" ]; then
  skip "core.hooksPath already .githooks"
elif [ -d .githooks ]; then
  git config core.hooksPath .githooks && ok "set core.hooksPath=.githooks" \
    || fail "git config core.hooksPath failed"
else
  fail ".githooks/ directory missing — template corrupt"
fi

# Step 3: .evals/ exists
step 3 "verify .evals/ exists"
if [ -d .evals ] && [ -f .evals/run.sh ] && [ -d .evals/tasks ]; then
  skip ".evals/ scaffold present"
else
  fail ".evals/ missing — template corrupt (re-copy template)"
fi

# Step 4: docs/CONTEXT.md exists
step 4 "verify docs/CONTEXT.md exists"
if [ -f docs/CONTEXT.md ]; then
  skip "docs/CONTEXT.md present"
else
  fail "docs/CONTEXT.md missing — template corrupt"
fi

# Step 5: docs/handoff/ exists
step 5 "verify docs/handoff/ exists"
if [ -d docs/handoff ]; then
  skip "docs/handoff/ present"
else
  fail "docs/handoff/ missing — template corrupt"
fi

# Step 6: Run baseline eval (10/10)
step 6 "run .evals/run.sh --all baseline (10/10)"
if [ -x .evals/run.sh ]; then
  bash .evals/run.sh --all && ok "baseline eval 10/10 pass" \
    || fail "baseline eval failed — fix and re-run"
else
  bash .evals/run.sh --all && ok "baseline eval 10/10 pass" \
    || fail "baseline eval failed — fix and re-run"
fi

# Step 7: verify 5 context-闭环 hook files exist (assets, not registration)
# These are the hook FILES (.cjs) that ship with the plugin. Registration is
# handled by setup-arthurpower skill (NOT auto-registered to avoid double-run
# with user-level ~/.claude/settings.json).
step 7 "verify 5 context-闭环 hook files exist"
HOOKS_DIR="arthurpower/hooks"
REQUIRED_HOOKS="pre-context-write-guard.cjs pre-stale-read.cjs pre-read-contract.cjs post-ssot-priority.cjs post-conflict-annotation.cjs"
MISSING_HOOKS=""
for hook in $REQUIRED_HOOKS; do
  if [ ! -f "$HOOKS_DIR/$hook" ]; then
    MISSING_HOOKS="$MISSING_HOOKS $hook"
  fi
done
if [ -z "$MISSING_HOOKS" ]; then
  skip "5 hook files present (assets for setup-arthurpower skill)"
else
  fail "missing hook files:$MISSING_HOOKS — template corrupt (re-copy)"
fi

# Step 8: verify critical rule files exist (all on-demand under docs/rules/)
step 8 "verify critical rule files exist"
DOCS_RULES_DIR="docs/rules"
REQUIRED_RULES="git.md workflow.md security.md context-loop.md"
MISSING_RULES=""
for rule in $REQUIRED_RULES; do
  if [ ! -f "$DOCS_RULES_DIR/$rule" ]; then
    MISSING_RULES="$MISSING_RULES docs/rules/$rule"
  fi
done
if [ -z "$MISSING_RULES" ]; then
  skip "critical rule files present"
else
  fail "missing rule files:$MISSING_RULES — template corrupt"
fi

# Step 9: report hook registration status (informational, not fail)
# Per Option A (方案 A), templates does NOT auto-register .cjs hooks. setup-arthurpower
# skill handles registration with dedup detection. Report current state for operator visibility.
step 9 "report hook registration state"
TPL_HOOK_COUNT=$(python3 -c "
import json, re
try:
    with open('.claude/settings.json', 'rb') as f:
        data = f.read()
    m = re.search(b'\"hooks\":\\s*(\\{.*?\\n  \\})', data, re.DOTALL)
    if not m:
        print('?')
    else:
        hooks = json.loads(m.group(1))
        pre = sum(len(e.get('hooks', [])) for e in hooks.get('PreToolUse', []))
        post = sum(len(e.get('hooks', [])) for e in hooks.get('PostToolUse', []))
        print(f'{pre} pre + {post} post (template-level)')
except Exception as e:
    print(f'? ({e})')
")
ok "template-level hook count: $TPL_HOOK_COUNT (per Option A, 5 .cjs hooks are registered by setup-arthurpower skill with dedup detection)"

echo ""
echo "[bootstrap] SUCCESS: all 9 steps complete"
echo "[bootstrap] Next: review hook registration via setup-arthurpower skill (user-level dedup detection)"
exit 0