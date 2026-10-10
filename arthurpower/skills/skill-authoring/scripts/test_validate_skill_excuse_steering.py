#!/usr/bin/env python3
"""RED/GREEN tests for Check 7 excuse-steering (OR, not AND)."""
from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

VALIDATOR = Path(__file__).resolve().parent / "validate_skill.py"
SKILLS_ROOT = Path(__file__).resolve().parents[2]


def _run_validator(skill_md: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(VALIDATOR), str(skill_md)],
        capture_output=True,
        text=True,
    )


def _rt_table(rows: int) -> str:
    lines = [
        "## Rationalization Table",
        "",
        "| Excuse | Reality |",
        "| --- | --- |",
    ]
    for i in range(rows):
        lines.append(f"| excuse-{i} | reality-{i} |")
    return "\n".join(lines)


def _skill_body(*, extra: str = "", bar: str = "discipline") -> str:
    return f"""---
name: excuse-steering-fixture
type: discipline
description: This skill should be used when testing excuse steering with the quoted "trigger phrase" for routing.
---

# Excuse Steering Fixture

## When to use

Use when proving the validator Check 7 contract.

## Procedure

1. Run the fixture. Completion: validator invoked.

## Acceptance criteria

- [ ] Fixture ran

## Verification

Skill type: discipline
Bar level:  {bar}

{extra}
"""


class ExcuseSteeringCheck7Tests(unittest.TestCase):
    def test_a_discipline_rt_table_without_red_flags_exits_0(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            skill_dir = Path(tmp)
            skill_md = skill_dir / "SKILL.md"
            skill_md.write_text(_skill_body(extra=_rt_table(5)), encoding="utf-8")
            result = _run_validator(skill_md)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("VALIDATION PASSED", result.stdout)

    def test_b_discipline_with_no_steering_exits_1_excuse_steering(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            skill_dir = Path(tmp)
            skill_md = skill_dir / "SKILL.md"
            skill_md.write_text(_skill_body(extra=""), encoding="utf-8")
            result = _run_validator(skill_md)
            combined = result.stdout + result.stderr
            self.assertEqual(result.returncode, 1, combined)
            self.assertIn("excuse steering", combined.lower())
            self.assertNotEqual(
                combined.count("Red Flags list"),
                combined.count("violation"),
                "failure must not treat Red Flags list as the only path",
            )

    def test_c_disclosed_table_only_list_zero_exits_0(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            skill_dir = Path(tmp)
            refs = skill_dir / "references"
            refs.mkdir()
            (refs / "pressure-and-antipatterns.md").write_text(
                "# Pressure\n\n"
                "| Excuse | Reality |\n"
                "| --- | --- |\n"
                "| a | b |\n"
                "| c | d |\n"
                "| e | f |\n"
                "| g | h |\n"
                "| i | j |\n",
                encoding="utf-8",
            )
            skill_md = skill_dir / "SKILL.md"
            skill_md.write_text(_skill_body(extra=""), encoding="utf-8")
            result = _run_validator(skill_md)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_d_complexity_anti_drift_exits_0(self) -> None:
        skill_md = SKILLS_ROOT / "complexity-anti-drift" / "SKILL.md"
        result = _run_validator(skill_md)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_e_verification_before_completion_no_red_flags_list_failure(self) -> None:
        skill_md = SKILLS_ROOT / "verification-before-completion" / "SKILL.md"
        result = _run_validator(skill_md)
        combined = result.stdout + result.stderr
        self.assertNotIn("Red Flags list", combined)
        if result.returncode != 0:
            self.assertIn("description must start", combined)


if __name__ == "__main__":
    unittest.main()
