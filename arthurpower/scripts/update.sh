#!/usr/bin/env bash
# scripts/update.sh - pull template evolution into this project (incremental, non-destructive)
# Usage:
#   bash scripts/update.sh                                    # local template auto-resolve
#   bash scripts/update.sh --from <template-path>             # explicit local path
#   bash scripts/update.sh --from-git <url-or-owner/repo>     # git clone --depth=1
#   bash scripts/update.sh --from-git <url> --only <paths...> # gap-fill specific files
#   bash scripts/update.sh --force                            # overwrite customized (still respects PROTECTED)
#
# Strategy:
#   - Default template source: $ARTHUR_TEMPLATE_GIT, $ARTHUR_TEMPLATE, or a sibling checkout
#   - --from-git: git clone --depth=1 <url> to temp dir, use as template
#   - Compare each template file with local copy via sha256
#   - If local missing -> copy (new file)
#   - If local differs -> skip with warning (user customized)
#   - If template unchanged -> skip
#   - User can pass --force to overwrite customized files (dangerous)
#   - --only <paths...>: only consider those paths (gap-fill mode)
#
# Always-protected files (never overwritten even with --force):
#   - .claude/settings.local.json (MCP perms, project-specific)
#   - .claude/settings.json (setup-arthurpower registers 5 context-闭环 hooks
#     WITH dedup detection per Option A; auto-overwrite risks clobbering
#     user-level ~/.claude/settings.json dedup decisions)
#   - CLAUDE.local.md (personal local layer)
#   - CLAUDE.md (project-level spec, user-authored)
#   - docs/CONTEXT.md (project-specific domain language)
#   - docs/handoff/*.md (project-specific session history)
set -euo pipefail

TEMPLATE="${ARTHUR_TEMPLATE:-}"
GIT_SOURCE=""
FORCE=0
ONLY_MODE=0
ONLY_PATHS=()

# Default GitHub source (V's template repo)
DEFAULT_GIT="${ARTHUR_TEMPLATE_GIT:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    --from) TEMPLATE="$2"; shift 2 ;;
    --from-git)
      GIT_SOURCE="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --only) ONLY_MODE=1; shift; while [ $# -gt 0 ] && [[ "$1" != --* ]]; do ONLY_PATHS+=("$1"); shift; done ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0 ;;
    *) echo "[update] unknown arg: $1" >&2; exit 2 ;;
  esac
done

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PROJECT_ROOT="$(pwd)"

# Temporary clone dir (cleaned on exit)
CLONE_TMP=""
cleanup() {
  if [ -n "$CLONE_TMP" ] && [ -d "$CLONE_TMP" ]; then
    rm -rf "$CLONE_TMP"
    echo "[update] cleaned temp clone $CLONE_TMP"
  fi
}
trap cleanup EXIT

# Resolve template source: --from-git takes priority, then --from / $ARTHUR_TEMPLATE, then local auto
if [ -n "$GIT_SOURCE" ]; then
  # Normalize owner/repo shorthand to full URL
  case "$GIT_SOURCE" in
    http*|git@*) GIT_URL="$GIT_SOURCE" ;;
    */*) GIT_URL="https://github.com/${GIT_SOURCE}.git" ;;
    *) GIT_URL="$GIT_SOURCE" ;;
  esac
  CLONE_TMP="$(mktemp -d 2>/dev/null || echo "/tmp/arthur-tpl-clone-$$")"
  mkdir -p "$CLONE_TMP"
  echo "[update] cloning $GIT_URL -> $CLONE_TMP"
  if git clone --depth=1 "$GIT_URL" "$CLONE_TMP" 2>&1 | sed 's/^/[update]   /'; then
    TEMPLATE="$CLONE_TMP"
  else
    echo "[update] ERROR: git clone failed for $GIT_URL" >&2
    echo "[update] fallback: set --from <local-path> or ARTHUR_TEMPLATE env var" >&2
    exit 1
  fi
elif [ -z "$TEMPLATE" ]; then
  for cand in "../arthur-tpl" "../../arthur-tpl" "$HOME/arthur-tpl"; do
    if [ -d "$cand" ] && [ -f "$cand/CLAUDE.md" ]; then
      TEMPLATE="$cand"
      break
    fi
  done
fi

if [ -z "$TEMPLATE" ] || [ ! -d "$TEMPLATE" ]; then
  echo "[update] ERROR: template source not found." >&2
  echo "[update] Set ARTHUR_TEMPLATE env var, pass --from <path>, or --from-git <url>" >&2
  echo "[update] Example: bash scripts/update.sh --from-git <owner>/<template-repo>" >&2
  exit 1
fi

echo "[update] template source: $TEMPLATE"

# Always-protected files (never overwritten even with --force)
PROTECTED=(
  ".claude/settings.local.json"
  ".claude/settings.json"
  "CLAUDE.md"
  "CLAUDE.local.md"
  "docs/CONTEXT.md"
)
# Protect all handoff docs
while IFS= read -r f; do
  PROTECTED+=("$f")
done < <(find docs/handoff -type f -name "*.md" 2>/dev/null || true)
# .claude/settings.json is protected because setup-arthurpower skill registers
# 5 context-闭环 hooks WITH dedup detection (per Option A). Auto-overwriting
# during update would either (a) clobber user's dedup-tailored registration, or
# (b) re-introduce double-registration with user-level ~/.claude/settings.json.

is_protected() {
  local target="$1"
  for p in "${PROTECTED[@]}"; do
    if [ "$target" = "$p" ]; then return 0; fi
  done
  return 1
}

ADDED=0; UPDATED=0; SKIPPED=0; PROTECTED_SKIP=0; ONLY_SKIP=0

# Get project root (where this script lives' parent.. = scripts/, parent = project root)

# Files to consider (exclude .git, results, etc.)
cd "$TEMPLATE"
ALL_FILES=$(find . -type f \
  -not -path "./.git/*" \
  -not -path "./.evals/results/*" \
  -not -path "*/__pycache__/*" \
  -not -name "*.pyc" \
  -not -name ".DS_Store")

# Filter by --only paths if set (gap-fill mode)
if [ "$ONLY_MODE" = "1" ]; then
  FILTERED=""
  for relpath in $ALL_FILES; do
    rel="${relpath#./}"
    for only in "${ONLY_PATHS[@]}"; do
      case "$rel" in
        "$only"|"$only"/*) FILTERED="$FILTERED $relpath" ;;
      esac
    done
  done
  ALL_FILES=$(echo "$FILTERED" | xargs -n1)
  [ -z "$ALL_FILES" ] && { echo "[update] --only: no files matched ${ONLY_PATHS[*]}"; exit 0; }
fi

echo "$ALL_FILES" | while IFS= read -r relpath || [ -n "$relpath" ]; do
    [ -z "$relpath" ] && continue
    # Strip leading "./"
    rel="${relpath#./}"
    target="$PROJECT_ROOT/$rel"
    target_dir="$(dirname "$target")"

    if is_protected "$rel"; then
      # PROTECTED is for OLD content (preserve user customization).
      # If target doesn't exist yet, this is a FRESH create - allow it.
      if [ ! -f "$target" ]; then
        mkdir -p "$target_dir"
        cp "$relpath" "$target"
        echo "[update] ADDED:  $rel (fresh create, would otherwise be PROTECTED)"
      else
        echo "[update] PROTECTED: $rel (skipped - existing user content preserved)"
      fi
      continue
    fi

    if [ ! -f "$target" ]; then
      mkdir -p "$target_dir"
      cp "$relpath" "$target"
      echo "[update] ADDED: $rel"
      continue
    fi

    SRC_HASH=$(sha256sum "$relpath" | cut -d' ' -f1)
    DST_HASH=$(sha256sum "$target" | cut -d' ' -f1)
    if [ "$SRC_HASH" = "$DST_HASH" ]; then
      echo "[update] SAME:   $rel"
      continue
    fi

    if [ "$FORCE" = "1" ]; then
      cp "$relpath" "$target"
      echo "[update] FORCE:  $rel (overwritten)"
    else
      echo "[update] DIFF:   $rel (local differs - skip, use --force to overwrite)"
    fi
done

cd "$PROJECT_ROOT"

echo ""
echo "[update] done. re-run bash scripts/bootstrap.sh to apply any new deps."