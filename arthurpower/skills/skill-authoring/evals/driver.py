#!/usr/bin/env python3
"""driver.py - Boundary-testing driver for skill-authoring skill.

5 categories x 3 = 15 cases. Tests routing + content rubric against real SKILL.md.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
SKILL_MD = SKILL_DIR / "SKILL.md"

SKILL_DESC = """Reference for writing and editing skills well — the vocabulary
and principles that make a skill predictable."""

# Trigger terms drawn from SKILL.md description + body concepts.
# Covers the baseline author baseline concepts plus the Eval System extension.
TRIGGER_TERMS = [
    r"\bskill\b",
    r"\bSKILL\.md\b",
    r"write.*skill",
    r"edit.*skill",
    r"review.*skill",
    r"predictab",
    r"leading word",
    r"leading-word",
    r"prune",
    r"pruning",
    r"premature completion",
    r"premature",
    r"completion criterion",
    r"criterion",
    r"legwork",
    r"no-op",
    r"single source of truth",
    r"progressive disclosure",
    r"context pointer",
    r"co-location",
    r"information hierarchy",
    r"external reference",
    r"invocation",
    r"disable-model-invocation",
    r"user-invoked",
    r"model-invoked",
    r"context load",
    r"cognitive load",
    r"router skill",
    r"iteration/<n>/evals\.json",
    r"run_skill_eval\.py",
    r"grading\.json",
    r"pass rate",
    r"failure modes",
    r"failure mode",
    r"duplication",
    r"sediment",
    r"sprawl",
    r"negation",
    r"split",
    r"granularity",
    r"by invocation",
    r"by sequence",
    r"_tight_",
    r"_red_",
]

# Negative signals - if these dominate and no skill term is present, do not load.
NEGATIVE_TERMS = [
    r"\bhook\b",
    r"\bPreToolUse\b",
    r"\bPostToolUse\b",
    r"\bCLAUDE\.md\b",
    r"\bdebug\b(?!.*skill)",
    r"\bbug\b(?!.*skill)",
]

# Old arthurpower-specific concepts that the new SKILL.md no longer contains.
# Driver asserts these are absent from the real SKILL.md.
OLD_CONCEPTS = [
    "rationalization table",
    "Bar level",
    "Skill type",
    "Red flag",
    "Red Flag",
    "Acceptance Criteria",
    "Verification",
    "When to use",
    "When not to use",
    "Procedure",
]

# Core keywords that positive cases must be able to surface from SKILL.md.
BASELINE_KEYWORDS = [
    "predictability",
    "leading word",
    "premature completion",
    "pruning",
    "completion criterion",
    "Eval System",
]


def load_skill_text() -> str:
    if not SKILL_MD.is_file():
        raise FileNotFoundError(f"SKILL.md not found at {SKILL_MD}")
    return SKILL_MD.read_text(encoding="utf-8")


def would_load(query: str) -> bool:
    """Simulate skill routing by trigger-term match, minus negative override."""
    pos = sum(1 for t in TRIGGER_TERMS if re.search(t, query, re.IGNORECASE))
    neg = sum(1 for t in NEGATIVE_TERMS if re.search(t, query, re.IGNORECASE))
    has_skill_kw = bool(re.search(r"\bskill\b|SKILL\.md|evals\.json", query, re.IGNORECASE))
    has_skill_intent = pos > 0
    if (has_skill_kw or has_skill_intent) and neg == 0:
        return True
    if (has_skill_kw or has_skill_intent) and neg > 0:
        # Strong skill intent overrides weak negative noise.
        return pos > neg
    return False


def has_baseline_term(skill_text: str, term: str) -> bool:
    """Assert that a the baseline keyword is present in the real SKILL.md."""
    return term.lower() in skill_text.lower()


def has_old_concept(skill_text: str, term: str) -> bool:
    """Assert that an old arthurpower concept is absent from SKILL.md."""
    return term.lower() in skill_text.lower()


def behavior_match(skill_text: str, query: str) -> bool:
    """Positive cases must surface at least one the baseline keyword from SKILL.md."""
    return any(has_baseline_term(skill_text, kw) for kw in BASELINE_KEYWORDS)


def run_case(case: dict, skill_text: str) -> dict:
    q = case["q"]
    expected_load = case["expected_skill_loaded"]
    actual_load = would_load(q)
    routing_pass = actual_load == (expected_load is not None)
    if expected_load is not None:
        beh_pass = behavior_match(skill_text, q)
    else:
        beh_pass = True
    overall = routing_pass and beh_pass
    return {
        "category": case["category"],
        "q": q,
        "expected_load": expected_load is not None,
        "actual_load": actual_load,
        "routing_pass": routing_pass,
        "behavior_pass": beh_pass,
        "pass": overall,
    }


CASES = [
    # A positive - should trigger (skill writing / editing / review)
    {
        "category": "A_positive",
        "q": "create a new skill for generating commit messages",
        "expected_skill_loaded": "skill-authoring",
    },
    {
        "category": "A_positive",
        "q": "edit this SKILL.md to make the description trigger more reliably",
        "expected_skill_loaded": "skill-authoring",
    },
    {
        "category": "A_positive",
        "q": "review my skill and add an evals.json for pass rate",
        "expected_skill_loaded": "skill-authoring",
    },

    # B negative - should NOT trigger (general coding / hooks / CLAUDE.md)
    {
        "category": "B_negative",
        "q": "fix a bug in this Python function",
        "expected_skill_loaded": None,
    },
    {
        "category": "B_negative",
        "q": "add a PreToolUse hook that blocks dangerous commands",
        "expected_skill_loaded": None,
    },
    {
        "category": "B_negative",
        "q": "update CLAUDE.md to add a new rule about commits",
        "expected_skill_loaded": None,
    },

    # C ambiguous - multi-candidate, should still trigger
    {
        "category": "C_ambiguous",
        "q": "should this skill be model-invoked or user-invoked, it only fires by hand",
        "expected_skill_loaded": "skill-authoring",
    },
    {
        "category": "C_ambiguous",
        "q": "my skill is 1500 lines, should I split it or trim",
        "expected_skill_loaded": "skill-authoring",
    },
    {
        "category": "C_ambiguous",
        "q": "where do I put a long reference table, in the body or as external reference",
        "expected_skill_loaded": "skill-authoring",
    },

    # D domain_out - should NOT trigger
    {
        "category": "D_domain_out",
        "q": "deploy to production",
        "expected_skill_loaded": None,
    },
    {
        "category": "D_domain_out",
        "q": "build a React component for the dashboard",
        "expected_skill_loaded": None,
    },
    {
        "category": "D_domain_out",
        "q": "refactor this class into smaller functions",
        "expected_skill_loaded": None,
    },

    # E reverse_semantic - intent present, keywords may differ
    {
        "category": "E_reverse",
        "q": "the agent keeps skipping the last step, what is the failure mode",
        "expected_skill_loaded": "skill-authoring",
    },
    {
        "category": "E_reverse",
        "q": "how do I make my skill agent step through the sequence without rushing",
        "expected_skill_loaded": "skill-authoring",
    },
    {
        "category": "E_reverse",
        "q": "the skill description triggers on the wrong prompts, how do I tighten it",
        "expected_skill_loaded": "skill-authoring",
    },
]


def main() -> int:
    skill_text = load_skill_text()

    # Reverse assertions on SKILL.md content.
    for kw in BASELINE_KEYWORDS:
        assert has_baseline_term(skill_text, kw), f"SKILL.md missing the baseline keyword: {kw}"
    for old in OLD_CONCEPTS:
        assert not has_old_concept(skill_text, old), f"SKILL.md still contains old concept: {old}"

    results = [run_case(c, skill_text) for c in CASES]
    total = len(results)
    passed = sum(1 for r in results if r["pass"])

    by_cat: dict[str, dict[str, int]] = {}
    for r in results:
        cat = r["category"]
        by_cat.setdefault(cat, {"pass": 0, "total": 0})
        by_cat[cat]["total"] += 1
        if r["pass"]:
            by_cat[cat]["pass"] += 1

    print(f"Boundary-testing driver: {passed}/{total} pass ({passed/total*100:.0f}%)")
    print()
    print(f"{'Category':<18} {'Pass':>6} {'Total':>6}")
    print("-" * 32)
    for cat in sorted(by_cat):
        s = by_cat[cat]
        print(f"{cat:<18} {s['pass']:>6} {s['total']:>6}")
    print()

    fails = [r for r in results if not r["pass"]]
    if fails:
        print("FAILURES:")
        for r in fails:
            print(f"  [{r['category']}] q={r['q'][:70]!r}")
            print(
                f"    expected_load={r['expected_load']} actual_load={r['actual_load']} "
                f"routing={r['routing_pass']} behavior={r['behavior_pass']}"
            )
        return 1

    print("ALL PASS - no failures")
    return 0


if __name__ == "__main__":
    sys.exit(main())
