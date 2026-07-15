#!/usr/bin/env bash
# pre-tool-guard.sh — PreToolUse hook for Bash commands.
#
# Settings.json `permissions.deny` already covers high-frequency
# dangerous patterns (git commit --no-verify, git push --force, rm -rf,
# reset --hard, clean -f, secret reads). This hook ONLY adds what
# settings.json cannot express:
#   1. Anti-tampering: block edits to .claude/hooks/, .git/hooks/,
#      .husky/, pre-commit, lint-staged configs.
#   2. Allow rm -rf against external temp paths (/tmp, $TMPDIR) when
#      ALL targets are external — overrides settings.json's blanket
#      `Bash(rm -rf:*)` deny for the legitimate "clean /tmp" workflow.
#
# Single source of truth: settings.json deny list. This hook is the
# second line of defence only.

# --- Windows portability ---
# `set -u` is intentionally OFF: external env vars ($TMPDIR, $TEMP, $TMP)
# are NOT defined on Windows Git Bash by default. Using them directly
# would crash the hook with "unbound variable" and deny the user's Bash
# call (the failure mode that produced 0.11.1 hook-fix). Bind defaults
# up front and reference the locals from here on.
TMPDIR_DEFAULT="${TMPDIR:-/tmp}"
TEMP_DEFAULT="${TEMP:-${TMP:-${TMPDIR_DEFAULT}}}"

set -eo pipefail

INPUT="$(cat)"
COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"

block() {
  echo "BLOCKED: $1" >&2
  exit 2
}

[ -z "$COMMAND" ] && exit 0

# Normalize whitespace for safer matching.
NORMALIZED="$(printf '%s' "$COMMAND" | tr '\n' ' ' | sed -E 's/[[:space:]]+/ /g')"

# (Settings.json `permissions.deny` already covers git commit --no-verify,
# git push --force/-f, reset --hard, clean -f. Skipping redundant rules.)

# Anti-tampering: block edits to hook-related paths.
# settings.json `Bash(...)` deny cannot intercept edits to .claude/hooks/
# because the rule pattern would need to enumerate every variant.
# Excludes pure read/exec commands (`cat`, `bash -n`, `python -c`, etc.)
# by requiring the verb be a write-class mutation: rm, mv (move),
# chmod, sed -i, perl -pi, write-helper python/node scripts.
if printf '%s' "$NORMALIZED" | grep -Eq '(^|[^a-z])(rm|mv|chmod)[[:space:]]+[^;|&]*(\.git/hooks|\.husky|pre-commit|lint-staged|\.claude/hooks)'; then
  block "removing/moving/chmod-ing hook paths is blocked."
fi
if printf '%s' "$NORMALIZED" | grep -Eq '(sed[[:space:]]+-i|perl[[:space:]]+-pi)[^;|&]*(\.git/hooks|\.husky|pre-commit|lint-staged|\.claude/hooks)'; then
  block "in-place editing hook paths is blocked."
fi
if printf '%s' "$NORMALIZED" | grep -Eq '(rm|mv|chmod).*-r[^;|&]*(\.git/hooks|\.husky|pre-commit|lint-staged|\.claude/hooks)'; then
  block "recursive rm/mv/chmod on hook paths is blocked."
fi

# Allow `rm -rf` against external temp paths ONLY when ALL targets are
# external — overrides settings.json `Bash(rm -rf:*)` blanket deny for
# the legitimate "clean /tmp" workflow. Any project-internal rm -rf
# falls through to settings.json deny.
#
# Use the bound defaults (TMPDIR_DEFAULT, TEMP_DEFAULT) instead of
# referencing $TMPDIR / $TEMP / $TMP directly — those env vars are
# commonly unset on Windows Git Bash and would crash the hook.
if printf '%s' "$NORMALIZED" | grep -Eq 'rm[[:space:]]+(-[[:alnum:]]*r[[:alnum:]]*f|-[[:alnum:]]*f[[:alnum:]]*r)'; then
  TARGETS=$(printf '%s' "$NORMALIZED" | sed -E 's/.*rm[[:space:]]+-[A-Za-z]*[rR][A-Za-z]*[fF][A-Za-z]*[[:space:]]+//; s/[;|&].*//')
  EXTERNAL_OK=1
  HAS_TARGET=0
  for t in $TARGETS; do
    HAS_TARGET=1
    t_norm=$(printf '%s' "$t" | sed -E 's:/*$::')
    case "$t_norm" in
      /tmp/*|/var/tmp/*|"${TMPDIR_DEFAULT}"/*|"${TEMP_DEFAULT}"/*) continue ;;
      *) EXTERNAL_OK=0; break ;;
    esac
  done
  if [ "$HAS_TARGET" -eq 1 ] && [ "$EXTERNAL_OK" -eq 1 ]; then
    exit 0  # all targets are external temp paths — explicitly allow
  fi
  # Otherwise fall through to settings.json's `Bash(rm -rf:*)` deny.
fi

# (Settings.json `Read(.env)`, `Read(**/*.pem)`, etc. deny list already
# covers secret reads. Skipping redundant rule.)

exit 0