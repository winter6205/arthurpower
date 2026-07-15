#!/usr/bin/env python3
"""validate_skill.py — Structural validator for arthurpower SKILL.md files.

Checks (the baseline author baseline + arthurpower engineering):
  1. Frontmatter parses as YAML (or simplified fallback).
  2. `name` matches ^[a-z0-9-]+$.
  3. `description` starts with "This skill should be used when" (hard fail otherwise).
  4. `description` length <= 400 Unicode characters; soft warning if no quoted concrete trigger phrases.
  5. Required L2 sections present: When to use, When not to use, Procedure, Acceptance Criteria, Verification.
  6. Skill type and bar level are declared in the Verification section (or via frontmatter `type:` key).
  7. Discipline skills include Rationalization Table (>= 5 rows) and Red Flags (>= 5 items).
  8. Body length <= 10000 Unicode characters (hard fail).
  9. No private-prefix namespace bindings (compound, standalone, L1 path, date, or authority labels).
 10. Markdown fenced code blocks are balanced.
 11. If body declares bar that contradicts content (e.g. Minimum declared but Rationalization Table
     or Red Flags present), validator upgrades to Discipline and re-checks.
 12. If both frontmatter `type:` and body `Skill type:` are present, they must match. Mismatch is error.
 13. For high_risk bar skills, iteration/<n>/approval.md file must exist on disk.

Exit code: 0 on pass, 1 on any violation (hard fail). Warnings do not change exit code.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


REQUIRED_SECTIONS = [
    "## When to use",
    "## When not to use",
    "## Procedure",
    "## Acceptance Criteria",
    "## Verification",
]

PREFIX_BYTES = "\x56\x20"  # V + space (private-prefix marker)

COMPOUND_PATTERNS = [
    f"{PREFIX_BYTES}字面",
    f"{PREFIX_BYTES}协作",
    f"{PREFIX_BYTES}严词",
    f"{PREFIX_BYTES}端到端",
    f"{PREFIX_BYTES}红线",
    f"{PREFIX_BYTES}6/",
    f"{PREFIX_BYTES}debug",
    f"{PREFIX_BYTES}凭据",
    f"{PREFIX_BYTES}必先",
    f"{PREFIX_BYTES}严守",
    f"{PREFIX_BYTES}严抓",
    f"{PREFIX_BYTES}适配",
    f"{PREFIX_BYTES}禁用词",
]

STANDALONE_RE = re.compile(rf"(?<!\w){re.escape(PREFIX_BYTES)}(?!\w)")
L1_PATH_RE = re.compile(r"~/\.claude/(CLAUDE|rules|settings|memory|projects|plugins)/")
DATE_RE = re.compile(rf"{re.escape(PREFIX_BYTES)}\s*[0-9]+[/-][0-9]+")

# Authority labels: verbatim, locked, blocked (contains "locked" substring),
# and other self-certifying markers.
# "blocked" is included because it contains the substring "locked".
AUTHORITY_RE = re.compile(r"verbatim|locked|严守|红线|必走|硬性|一字不改")


def split_frontmatter(text: str) -> tuple[str, str]:
    """Return (frontmatter_block, body)."""
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end == -1:
        return "", text
    body_start = end + len("\n---")
    if body_start < len(text) and text[body_start] == "\n":
        body_start += 1
    return text[3:end], text[body_start:]


def parse_simple_frontmatter(front: str) -> dict[str, str | bool]:
    """Minimal YAML-like parser for `key: value` lines."""
    result: dict[str, str | bool] = {}
    for line in front.splitlines():
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$", line)
        if not m:
            continue
        key, value = m.group(1), m.group(2).strip()
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        # Minimal boolean support for reference-skill marker.
        if value.lower() in ("true", "yes"):
            result[key] = True
        elif value.lower() in ("false", "no"):
            result[key] = False
        else:
            result[key] = value
    return result


def count_table_rows(section_text: str) -> int:
    """Count data rows in a markdown table."""
    rows = 0
    for line in section_text.splitlines():
        if line.lstrip().startswith("|") and line.rstrip().endswith("|"):
            stripped = line.strip()
            if re.match(r"^\|[\s\-:|]+\|$", stripped):
                continue
            rows += 1
    return rows


VALID_TYPES = {"discipline", "technique", "pattern", "reference"}
VALID_BARS = {"minimum", "discipline", "high_risk"}


def extract_declared_skill_type(body: str) -> str | None:
    """Find `Skill type: <value>` in body."""
    m = re.search(r"^Skill\s+type\s*:\s*([a-z_]+)\s*$", body, re.MULTILINE | re.IGNORECASE)
    if not m:
        return None
    val = m.group(1).strip().lower()
    return val if val in VALID_TYPES else None


def extract_declared_bar(body: str) -> str | None:
    """Find `Bar level: <value>` in body."""
    m = re.search(r"^Bar\s+level\s*:\s*([a-z_]+)\s*$", body, re.MULTILINE | re.IGNORECASE)
    if not m:
        return None
    val = m.group(1).strip().lower()
    return val if val in VALID_BARS else None


def extract_section(body: str, heading: str) -> str:
    """Return text of a section starting at the heading, until next ## heading."""
    start = body.find(heading)
    if start == -1:
        return ""
    rest = body[start + len(heading):]
    next_h2 = re.search(r"^## ", rest, re.MULTILINE)
    end = next_h2.start() if next_h2 else len(rest)
    return rest[:end]


def count_red_flags(body: str) -> int:
    """Count list items in Red Flags section."""
    section = extract_section(body, "## Red Flags")
    if not section:
        m = re.search(r"^## Red Flags?", body, re.MULTILINE)
        if not m:
            return 0
        section = extract_section(body, m.group(0))
    return len(re.findall(r"^\s*-\s+", section, re.MULTILINE))


def count_fence_balance(text: str) -> tuple[int, int]:
    """Return (open_count, close_count) for ``` fences."""
    open_count = 0
    close_count = 0
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            if open_count == close_count:
                open_count += 1
            else:
                close_count += 1
    return open_count, close_count


def find_line(text: str, needle: str) -> int:
    """Return 1-based line number of first occurrence of needle in text."""
    for i, line in enumerate(text.splitlines(), start=1):
        if needle in line:
            return i
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a SKILL.md file.")
    parser.add_argument("path", type=Path, help="Path to SKILL.md")
    args = parser.parse_args()

    path: Path = args.path
    if not path.is_file():
        print(f"ERROR: file not found: {path}")
        return 1

    text = path.read_text(encoding="utf-8")
    front, body = split_frontmatter(text)

    violations: list[str] = []
    warnings: list[str] = []

    # Check 1: frontmatter exists.
    if not front:
        violations.append("frontmatter missing or malformed (no --- delimiters)")

    fm = parse_simple_frontmatter(front) if front else {}

    # Coerce parsed frontmatter values for typing convenience.
    name = str(fm.get("name", ""))
    desc = str(fm.get("description", ""))

    # Check 2: name.
    if not re.fullmatch(r"[a-z0-9-]+", name):
        violations.append(f"name '{name}' must match ^[a-z0-9-]+$")

    # Check 3: description starts with a recognised opener.
    # Accepted forms:
    #   - "This skill should be used when..." (preferred, Anthropic style)
    #   - "Reference for..." (the baseline author's writing-great-skills opener)
    #   - "Use when..." (legacy arthurpower opener, deprecated but accepted for back-compat)
    accepted_openers = ("This skill should be used when", "Reference for", "Use when")
    if not any(desc.startswith(op) for op in accepted_openers):
        violations.append(
            f"description must start with one of: {list(accepted_openers)}"
        )

    # Check 4: description length <= 400 Unicode chars.
    desc_len = len(desc)
    if desc_len > 400:
        violations.append(f"description length {desc_len} > 400 Unicode chars")

    # Soft warning: no quoted trigger phrases.
    if desc and not re.search(r'"[^"]{3,}"', desc):
        warnings.append("description lacks concrete trigger phrases (quoted phrases such as \"create a hook\")")

    # Reference-skill detection: drives the exemptions below.
    is_reference = fm.get("disable-model-invocation", False) is True

    # Check 5: required sections.
    # Reference skills (disable-model-invocation: true) are exempt from
    # procedure-section requirements — they are flat reference content,
    # not procedural instructions. See the baseline author writing-great-skills.
    if is_reference:
        # Reference skills: warn if missing, don't fail.
        for section in REQUIRED_SECTIONS:
            if section not in body:
                warnings.append(
                    f"reference skill: optional section missing (non-blocking): {section}"
                )
    else:
        for section in REQUIRED_SECTIONS:
            if section not in body:
                violations.append(f"required section missing: {section}")

    # Check 6: skill type and bar level must be declared.
    frontmatter_type = fm.get("type", "").strip().lower() or None
    if frontmatter_type and frontmatter_type not in VALID_TYPES:
        violations.append(
            f"frontmatter type '{frontmatter_type}' must be one of {sorted(VALID_TYPES)}"
        )
    body_type = extract_declared_skill_type(body)
    body_bar = extract_declared_bar(body)

    # Reference skills (the baseline author style) do not require Skill type or
    # Bar level declarations — those are discipline / arthurpower-era
    # classifications that reference skills don't need.
    if is_reference:
        # Skip Skill type and Bar level requirement for reference skills.
        pass
    else:
        if not frontmatter_type and not body_type:
            violations.append("Skill type not declared: add frontmatter `type:` or body `Skill type:` line")
        if frontmatter_type and body_type and frontmatter_type != body_type:
            violations.append(
                f"frontmatter type '{frontmatter_type}' conflicts with body Skill type '{body_type}' "
                "(must match when both are present)"
            )
        if not body_bar:
            violations.append("Bar level not declared: add body `Bar level:` line in Verification section")

    effective_type = frontmatter_type or body_type

    # Check 7: discipline skills require Rationalization Table + Red Flags.
    rt_section = extract_section(body, "## Rationalization Table")
    rf_count = count_red_flags(body)
    is_discipline_by_type = effective_type == "discipline"
    is_discipline_by_content = bool(rt_section) and rt_section.strip()
    is_discipline = is_discipline_by_type or is_discipline_by_content

    if is_discipline:
        rt_rows = count_table_rows(rt_section) if rt_section else 0
        if not rt_section:
            violations.append("discipline skill: Rationalization Table section missing")
        elif rt_rows < 5:
            violations.append(f"discipline skill: Rationalization Table has {rt_rows} rows (< 5)")
        if rf_count < 5:
            violations.append(f"discipline skill: Red Flags list has {rf_count} items (< 5)")
        if body_bar == "minimum":
            violations.append(
                "bar downgrade: declared Bar level=minimum but discipline content present "
                "(Rationalization Table or Red Flags) — upgrade to discipline"
            )

    # Check 8: body character count <= 10000 (HARD fail).
    body_chars = len(body)
    body_lines = body.count("\n")
    if body_chars > 10000:
        violations.append(f"body has {body_chars} chars (> 10000 hard limit)")
    elif body_lines > 500 and body_chars <= 10000:
        warnings.append(f"body has {body_lines} lines (> 500) but {body_chars} chars (<= 10000); line count is deprecated")

    # Check: high_risk bar requires iteration/<n>/approval.md reference in body.
    if body_bar == "high_risk" and "iteration/" not in body and "approval.md" not in body:
        violations.append(
            "high_risk bar: must reference iteration/<n>/approval.md in body (operator approval evidence)"
        )

    # Check: high_risk bar additionally requires approval.md file on disk.
    if body_bar == "high_risk":
        skill_dir = path.parent
        approval_glob = list(skill_dir.glob("iteration/*/approval.md"))
        if not approval_glob:
            violations.append(
                "high_risk bar: iteration/<n>/approval.md file must exist on disk "
                "(not merely a textual reference in the body)"
            )

    # Check: Genericization — private-prefix namespace bindings.
    for pat in COMPOUND_PATTERNS:
        if pat in text:
            ln = find_line(text, pat)
            violations.append(f"compound private-prefix '{pat.strip()}' at line {ln}")
    if STANDALONE_RE.search(text):
        ln = next((i for i, line in enumerate(text.splitlines(), 1) if STANDALONE_RE.search(line)), 0)
        violations.append(f"standalone private-prefix at line {ln}")
    if L1_PATH_RE.search(text):
        ln = next((i for i, line in enumerate(text.splitlines(), 1) if L1_PATH_RE.search(line)), 0)
        violations.append(f"L1 private path at line {ln}")
    if DATE_RE.search(text):
        ln = next((i for i, line in enumerate(text.splitlines(), 1) if DATE_RE.search(line)), 0)
        violations.append(f"private date clause at line {ln}")

    # Authority labels (incl. "blocked" for its "locked" substring).
    if AUTHORITY_RE.search(text):
        ln = next((i for i, line in enumerate(text.splitlines(), 1) if AUTHORITY_RE.search(line)), 0)
        violations.append(f"authority label at line {ln}")

    # Fence balance.
    open_count, close_count = count_fence_balance(text)
    if open_count != close_count:
        violations.append(f"markdown fence imbalance: {open_count} open, {close_count} close")

    # Report.
    if violations:
        print(f"VALIDATION FAILED for {path}")
        for v in violations:
            print(f"  - {v}")
        print(f"\n{len(violations)} violation(s)")
        return 1

    print(f"VALIDATION PASSED for {path}")
    print(f"  name: {name}")
    print(f"  description: {desc_len} chars")
    print(f"  body chars: {body_chars}")
    print(f"  body lines: {body_lines}")
    for w in warnings:
        print(f"  WARNING: {w}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
