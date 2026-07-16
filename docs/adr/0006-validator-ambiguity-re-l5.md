# 0006. Land AMBIGUITY_RE in validate_skill.py (L5)

Date: 2026-07-17
Status: accepted

## Context

L4 closed the human/agent grep #6 surface in `no-meta-specific.md` for five Chinese ambiguous compounds (`撞名|真因|切流|等价品|拍板`) but deliberately deferred runtime enforcement so the docs-only commit would not mix with validator edits. Without a validator check, a skill author can still ship those compounds in SKILL.md if nobody runs the manual grep.

L5 is the deferred machine gate: extend `skill-authoring/scripts/validate_skill.py` Genericization checks with `AMBIGUITY_RE`, keep marketplace and cache copies byte-identical (R5), and prove behavior with a driver-level boundary harness rather than subagent smoke alone.

This decision passes the ADR gate:

1. **Hard to reverse**: yes. Removing the check reopens a known bypass; changing the regex or adding exemptions affects every skill write path that uses the validator.
2. **Surprising without context**: yes. L4 Resolution and the L-scope map leave "validator sync" as a separate ticket; future readers need why only five compounds, why no path-based exemptions in the validator, and why three binary copies must match.
3. **Real trade-off**: yes. Options were (A) leave grep-only, (B) validator hard-fail with no exemptions, (C) full D2 hook / path-aware exemptions / expand to 11 allowed-list words. B was selected for L5.

## Decision

1. Add `AMBIGUITY_RE = re.compile(r"撞名|真因|切流|等价品|拍板")` to marketplace `validate_skill.py` and hard-fail with `chinese ambiguity banned compound at line N`.
2. Keep the pattern aligned with no-meta grep #6 (compound forms only; not single-character 拍/撞; not the 11 high-FP 准过词).
3. Do **not** add validator-side path exemptions or teaching-quote exemptions in L5. Manual grep #6 retains its execution-layer skip policy (policy SSOT / handoff / grep block / `[引文]`); the validator only sees one SKILL.md path.
4. Enforce R5 byte parity across marketplace + cache `0.6.0` + cache `0.7.0` after the edit.
5. Accept L5 only after main-agent driver smoke (`plans/l5-validator-driver.py` + `plans/l5-evals.json`) meets TP ≥ 95% and FP ≤ 5% on the ambiguity marker axis.

## Consequences

**Positive**:

- Skill writes cannot bypass the five banned compounds when the structural validator runs.
- Regex and grep #6 stay one mental model.
- Driver artifacts live in project git; plugin copies stay outside git but are sha-evidenced.

**Negative**:

- Clean historical teaching quotes of banned forms inside SKILL.md would also fail (no L5 exemption syntax).
- Several older skills still fail the validator for unrelated pre-existing reasons (missing sections / type / bar / body length); those are not L5 regressions and must not be packaged as L5 failures.

**Relation to existing ADRs**:

- Complements ADR-0002 / skill-authoring structural validation layer.
- Does not change ADR-0001 write authority or ADR-0005 skill-only self-evolving procedure.
- Explicitly defers D2 hook and broader D3/D4 schema work.

## Considered Options

### Option A: Grep-only (rejected for L5 goal)

Keeps L4 docs gate only. Skill authors can still land banned compounds if grep is skipped.

### Option B: Validator hard-fail, five compounds, no exemption parser (accepted)

Minimal machine gate matching L4 regex. Clear failure message. Cache parity required.

### Option C: Hook + path-aware exemptions + 11-word expansion (rejected for this cycle)

Higher FP risk on 准过词; larger surface; out of L5 scope map.

## Evidence pointers

- Plan: `plans/L5-validator-ambiguity.md`
- Verification: `plans/l5-verification.md`
- Driver: `plans/l5-validator-driver.py` + `plans/l5-evals.json`
- Project commit (plans only): `3069fcd`
