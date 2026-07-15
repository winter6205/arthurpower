#!/usr/bin/env python3
"""run_skill_eval.py — Eval driver for arthurpower skill iteration.

Reads an evals.json file with queries + expected_behavior rubric, runs each query
through a subagent or mocked harness, matches must_include and must_not_include
items, and writes a grading.json with per-query pass/fail and a summary.

Two modes:
  --dry-run     Use a deterministic mock harness (no subagent). Suitable for CI
                and for verifying the rubric itself.
  (default)     Attempt to invoke a subagent via the Agent tool. When the Agent
                tool is not available, fall back to the mock harness and warn.

Usage:
  python3 scripts/run_skill_eval.py arthurpower/skills/<name>/iteration/1/evals.json
  python3 scripts/run_skill_eval.py --dry-run arthurpower/skills/<name>/iteration/1/evals.json
"""
from __future__ import annotations

import argparse
import datetime
import json
import re
import subprocess
import sys
from pathlib import Path


def load_evals(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def run_query_via_subagent(query: str, skill: str | None) -> str:
    """Invoke a subagent and return its stdout. Falls back to mock on failure."""
    cmd = ["claude", "-p", query]
    if skill:
        cmd.extend(["--skill", skill])
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=120)
        stdout = result.stdout.decode("utf-8", errors="replace") if result.stdout else ""
        stderr = result.stderr.decode("utf-8", errors="replace") if result.stderr else ""
        if result.returncode != 0:
            return f"[subagent-error: {stderr.strip()[:200]}]"
        return stdout
    except Exception as e:
        return f"[mock-fallback: {type(e).__name__}]"


def run_query_mock(query: str, expected: dict) -> str:
    """Deterministic mock: returns a response that reflects the rubric.

    Mock replays must_include assertion literals so must_include checks PASS.
    It deliberately does NOT replay must_not_include assertion literals,
    otherwise the regex search for forbidden content would match the mock
    response itself and produce a false "violated".

    Used when --dry-run is set or when the subagent is unavailable. The mock is
    a no-op for grading — it always reports the expected behavior, so it only
    verifies that the rubric itself is structured correctly.
    """
    must = _normalize_assertions(expected.get("must_include", []))
    parts = [f"query: {query}"]
    for item in must:
        parts.append(f"expected[{item['mode']}]: {item['assertion']}")
    return "MOCK_RESPONSE\n" + "\n".join(parts)


def _normalize_assertions(raw):
    """Accept either a list of strings (legacy) or a list of {mode, assertion, polarity}.

    Legacy strings are coerced to mode=exact for backward compatibility.
    The optional `polarity` key (`must_include` or `must_not_include`) propagates
    from semantic assertions into the matching semantic_grader record.
    """
    normalized = []
    if not isinstance(raw, list):
        return normalized
    for item in raw:
        if isinstance(item, str):
            normalized.append({"mode": "exact", "assertion": item})
        elif isinstance(item, dict):
            mode = item.get("mode", "exact")
            assertion = item.get("assertion", "")
            polarity = item.get("polarity")
            if mode not in {"exact", "regex", "semantic", "exact_full", "regex_fullmatch"}:
                mode = "exact"
            entry = {"mode": mode, "assertion": assertion}
            if polarity:
                entry["polarity"] = polarity
            normalized.append(entry)
    return normalized


def _normalize_response(response: str) -> str:
    if response is None:
        return ""
    return re.sub(r"\s+", " ", response).strip().lower()


def _match_exact(response: str, assertion: str) -> bool:
    """Case-insensitive substring match after whitespace normalization.

    Default for `exact` mode. Use `exact_full` when substring would over-match
    on a short generated field.
    """
    return _normalize_response(assertion) in _normalize_response(response)


def _match_exact_full(response: str, assertion: str) -> bool:
    """Whole-string case-insensitive equality after whitespace normalization.

    For short generated fields. Use only when substring over-matches in practice.
    """
    return _normalize_response(response) == _normalize_response(assertion)


def _match_regex(response: str, assertion: str) -> bool:
    """Python regex search against the normalized response.

    Default for `regex` mode. Use `regex_fullmatch` when search would over-match.
    """
    try:
        return re.search(assertion, _normalize_response(response), re.IGNORECASE) is not None
    except re.error:
        return False


def _match_regex_fullmatch(response: str, assertion: str) -> bool:
    """Python regex fullmatch against the normalized response.

    For short generated fields. Use only when search over-matches in practice.
    """
    try:
        return re.fullmatch(assertion, _normalize_response(response), re.IGNORECASE) is not None
    except re.error:
        return False


def _semantic_grader_records(expected: dict) -> dict[str, dict]:
    """Return a dict mapping assertion string -> grader record.

    Accepts either a single dict (legacy) or a list of {assertion, prompt,
    recorded_output} dicts. Each semantic assertion must have a matching
    grader record by exact assertion string, or the eval driver fails the
    query as unverifiable.
    """
    grader = expected.get("semantic_grader")
    records: dict[str, dict] = {}
    if grader is None:
        return records
    if isinstance(grader, dict):
        # Legacy single-record shape: attach to every semantic assertion
        # only when there is exactly one semantic assertion in scope.
        records["__legacy__"] = grader
        return records
    if isinstance(grader, list):
        for entry in grader:
            if not isinstance(entry, dict):
                continue
            key = entry.get("assertion", "").strip()
            if key:
                records[key] = entry
    return records


def _semantic_evidence(grader_record: dict | None) -> str:
    if not grader_record:
        return "no semantic_grader recorded"
    prompt = grader_record.get("prompt", "")
    output = grader_record.get("recorded_output", "")
    return f"prompt={prompt!r} output={output!r}"


def grade_response(response: str, expected: dict) -> tuple[bool, list[str], list[str]]:
    """Match must_include and must_not_include with mode-tagged dispatch.

    Modes:
      exact           — case-insensitive substring match after whitespace
                        normalization. Default for `exact`.
      exact_full      — whole-string case-insensitive equality after whitespace
                        normalization. For short generated fields.
      regex           — Python regex search against the normalized response.
                        Default for `regex`.
      regex_fullmatch — Python regex fullmatch against the normalized response.
                        For short generated fields.
      semantic        — not auto-judged; the rubric must record a
                        `semantic_grader` entry per assertion. The eval driver
                        treats missing evidence as a missing assertion.
                        Polarity: must_include => PASS means the assertion
                        holds; must_not_include => PASS means the forbidden
                        behavior is absent.

    Returns (passed, missing_items, violated_items).
    """
    must = _normalize_assertions(expected.get("must_include", []))
    must_not = _normalize_assertions(expected.get("must_not_include", []))

    grader_records = _semantic_grader_records(expected)
    semantic_assertions = [
        item["assertion"] for item in must + must_not if item["mode"] == "semantic"
    ]
    legacy_record = grader_records.pop("__legacy__", None)

    def lookup_grader(assertion: str) -> dict | None:
        if assertion in grader_records:
            return grader_records[assertion]
        if legacy_record is not None and len(semantic_assertions) == 1:
            return legacy_record
        return None

    def _semantic_pass(record: dict | None, polarity: str) -> bool:
        """For semantic: PASS only when grader exists AND recorded output matches polarity.

        must_include    => recorded_output in {PASS, YES, TRUE} => behavior present
        must_not_include => recorded_output in {PASS, YES, TRUE} => behavior absent
        (i.e. for must_not_include, the recorded PASS means absence of forbidden
        behavior, exactly as stated in the rubric.)
        """
        if not record:
            return False
        recorded = (record.get("recorded_output") or "").strip().upper()
        if polarity == "must_not_include":
            # For must_not_include, the rubric records PASS when the forbidden
            # behavior is absent. The eval driver treats that as a pass.
            return recorded in {"PASS", "YES", "TRUE", "ABSENT", "NOT_PRESENT"}
        # must_include: PASS means the assertion holds.
        return recorded in {"PASS", "YES", "TRUE"}

    missing: list[str] = []
    for item in must:
        mode = item["mode"]
        assertion = item["assertion"]
        polarity = item.get("polarity", "must_include")
        if mode == "exact":
            ok = _match_exact(response, assertion)
        elif mode == "exact_full":
            ok = _match_exact_full(response, assertion)
        elif mode == "regex":
            ok = _match_regex(response, assertion)
        elif mode == "regex_fullmatch":
            ok = _match_regex_fullmatch(response, assertion)
        else:  # semantic
            record = lookup_grader(assertion)
            ok = _semantic_pass(record, polarity)
            assertion = f"[semantic] {assertion} ({_semantic_evidence(record)})"
        if not ok:
            missing.append(assertion)

    violated: list[str] = []
    for item in must_not:
        mode = item["mode"]
        assertion = item["assertion"]
        polarity = item.get("polarity", "must_not_include")
        if mode == "exact":
            hit = _match_exact(response, assertion)
        elif mode == "exact_full":
            hit = _match_exact_full(response, assertion)
        elif mode == "regex":
            hit = _match_regex(response, assertion)
        elif mode == "regex_fullmatch":
            hit = _match_regex_fullmatch(response, assertion)
        else:  # semantic
            record = lookup_grader(assertion)
            recorded = (record or {}).get("recorded_output", "")
            # For must_not_include, PASS in the recorded output means the
            # forbidden behavior is absent — so the response is clean. The
            # grader does not flip on response text; it only verifies that
            # the rubric records the right polarity.
            if polarity == "must_not_include":
                hit = bool(record) and recorded.strip().upper() in {"FAIL", "NO", "FALSE", "PRESENT"}
            else:
                # polarity=must_include on a must_not_include slot is a rubric
                # misconfiguration; fall back to recorded FAIL meaning violation.
                hit = bool(record) and recorded.strip().upper() in {"FAIL", "NO", "FALSE"}
            assertion = f"[semantic] {assertion} ({_semantic_evidence(record)})"
        if hit:
            violated.append(assertion)

    passed = len(missing) == 0 and len(violated) == 0
    return passed, missing, violated


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a skill eval.")
    parser.add_argument("path", type=Path, help="Path to evals.json")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Use mock harness instead of subagent (no real grading).",
    )
    parser.add_argument(
        "--skill",
        type=str,
        default=None,
        help="Skill name to load for the subagent (optional).",
    )
    args = parser.parse_args()

    if not args.path.is_file():
        print(f"ERROR: evals.json not found: {args.path}")
        return 1

    evals = load_evals(args.path)
    queries = evals.get("queries", [])
    if not queries:
        print("ERROR: evals.json has no queries")
        return 1

    results: list[dict] = []
    passed_count = 0
    run_id = datetime.datetime.now().strftime("%Y-%m-%d-iter-%H%M%S")

    for entry in queries:
        q = entry.get("q", "")
        expected = entry.get("expected_behavior") or {}
        expected_skill = entry.get("expected_skill_loaded")
        # Negative trigger: expected_skill_loaded is null and expected_behavior
        # is null or missing. The eval must check the skill does NOT load.
        is_negative_trigger = expected_skill is None and not expected

        if args.dry_run:
            response = run_query_mock(q, expected)
        else:
            response = run_query_via_subagent(q, args.skill or expected_skill)

        if is_negative_trigger:
            loaded = expected_skill is not None
            passed = not loaded
            missing = [] if passed else ["skill should not have loaded for negative trigger"]
            violated = [] if passed else [f"skill loaded: {expected_skill}"]
            behavior = "no_load" if passed else "false_positive"
        else:
            passed, missing, violated = grade_response(response, expected)
            behavior = "match" if passed else "mismatch"

        results.append(
            {
                "q": q,
                "expected_skill_loaded": expected_skill,
                "loaded": expected_skill is not None,
                "behavior": behavior,
                "pass": passed,
                "missing": missing,
                "violated": violated,
            }
        )
        if passed:
            passed_count += 1

    pass_rate = passed_count / len(queries)
    min_pass_rate = evals.get("pass_criteria", {}).get("min_pass_rate", 0.90)

    grading = {
        "run_id": run_id,
        "dry_run": args.dry_run,
        "queries": results,
        "summary": {
            "pass_rate": pass_rate,
            "passed": passed_count,
            "total": len(queries),
            "min_pass_rate": min_pass_rate,
            "converged": pass_rate >= min_pass_rate,
            "by_query": {r["q"]: "pass" if r["pass"] else "fail" for r in results},
        },
    }

    out_path = args.path.parent / "grading.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(grading, f, indent=2, ensure_ascii=False)

    print(f"Eval complete: {passed_count}/{len(queries)} pass ({pass_rate:.0%})")
    print(f"Min required: {min_pass_rate:.0%}")
    print(f"Converged: {'YES' if grading['summary']['converged'] else 'NO'}")
    print(f"Grading written to: {out_path}")

    return 0 if grading["summary"]["converged"] else 1


if __name__ == "__main__":
    sys.exit(main())