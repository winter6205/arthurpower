#!/usr/bin/env bash
set -euo pipefail

# NOTE: Dev-only installer for arthurpower maintainers. Not a supported
# installer. Symlinks every promoted skill (bucket: engineering | productivity)
# into the local agent-harness skill directories:
#
#   ~/.claude/skills   — Claude Code
#   ~/.agents/skills   — Codex and other Agent Skills-compatible harnesses
#
# Each link points back into this repo, so `git pull` keeps installed skills
# current. Re-run after adding, removing, or renaming a skill.
#
# Promotion is controlled by the `bucket:` frontmatter key in each SKILL.md.
# Only `engineering` and `productivity` buckets are linked. Skills tagged with
# any other bucket (misc / personal / in-progress / deprecated) are skipped.
#
# Windows symlink caveat: this script uses POSIX `ln -sfn`. Windows native
# symlinks require developer mode or admin. On Windows without WSL/Git-Bash
# providing a `ln` that supports symlinks, the link step will fail. Documented
# as a known gap; workaround = run inside WSL or Git-Bash on Windows.
#
# Usage:
#   bash scripts/link-skills.sh [--dry-run]

REPO="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO/arthurpower/skills"
DESTS=("$HOME/.claude/skills" "$HOME/.agents/skills")

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --help|-h)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *)
      echo "error: unknown argument '$arg'" >&2
      exit 2
      ;;
  esac
done

# Collect skills: parse `bucket:` frontmatter, keep only promoted.
names=()
srcs=()
buckets=()
while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  name="$(basename "$src")"
  # Extract `bucket:` value from the YAML frontmatter (first occurrence).
  bucket="$(awk '
    BEGIN { infm=0 }
    NR==1 && /^---/ { infm=1; next }
    infm==1 && /^---/ { exit }
    infm==1 && /^bucket:/ { sub(/^bucket:[[:space:]]*/, ""); print; exit }
  ' "$skill_md")"
  case "$bucket" in
    engineering|productivity) : ;;  # promoted — link
    *) continue ;;                  # non-promoted — skip
  esac
  names+=("$name")
  srcs+=("$src")
  buckets+=("$bucket")
done < <(find "$SKILLS_DIR" -name SKILL.md -print0)

echo "Discovered ${#names[@]} promoted skill(s):"
for i in "${!names[@]}"; do
  printf "  %s [%s] -> %s\n" "${names[$i]}" "${buckets[$i]}" "${srcs[$i]}"
done
echo

if [ "$DRY_RUN" -eq 1 ]; then
  echo "--dry-run: not creating any links"
  exit 0
fi

for DEST in "${DESTS[@]}"; do
  # If $DEST is a symlink that resolves into this repo, we'd end up writing
  # the per-skill symlinks back into the repo's own skills/ tree. Detect and
  # bail out instead of polluting the working copy.
  if [ -L "$DEST" ]; then
    resolved="$(readlink -f "$DEST")"
    case "$resolved" in
      "$REPO"|"$REPO"/*)
        echo "error: $DEST is a symlink into this repo ($resolved)." >&2
        echo "Remove it (rm \"$DEST\") and re-run; the script will recreate it as a real dir." >&2
        exit 1
        ;;
    esac
  fi

  mkdir -p "$DEST"

  for i in "${!names[@]}"; do
    name="${names[$i]}"
    src="${srcs[$i]}"
    target="$DEST/$name"

    if [ -e "$target" ] && [ ! -L "$target" ]; then
      rm -rf "$target"
    fi

    # Try POSIX symlink first (works on Linux/Mac/WSL/Git-Bash with developer mode).
    # Windows fallback: NTFS directory junction via cmd.exe — works without
    # developer mode or admin rights. Junctions are directory-only (which is
    # exactly what we need: every promoted skill exposes a directory of files).
    if ln -sfn "$src" "$target" 2>/dev/null; then
      echo "linked $name -> $src ($DEST)"
    elif command -v cmd.exe >/dev/null 2>&1 && command -v cygpath >/dev/null 2>&1; then
      rm -rf "$target" 2>/dev/null || true
      if cmd.exe /c "mklink /J \"$(cygpath -w "$target")\" \"$(cygpath -w "$src")\"" >/dev/null 2>&1; then
        echo "linked $name -> $src ($DEST, junction)"
      else
        echo "error: failed to link $target (symlink and junction both failed)" >&2
        exit 1
      fi
    else
      echo "error: failed to link $target (ln -sfn failed and no Windows junction fallback available)" >&2
      exit 1
    fi
  done
done