# 0005. Use skill-only self-evolving procedure

Date: 2026-07-16
Status: accepted

## Context

ADR-0004 restored `arthurpower:self-evolving-rules` as a user-invoked skill and retained `.claude/rules/self-evolving.md` as a governance copy. The skill was the executable procedure, while the rule mirrored its triggers and process.

The dual form introduced drift risk: changing one copy without synchronizing the other created two maintenance surfaces. The rule also accumulated process and iteration residue, including status parentheticals, migration chatter, and self-certifying wrappers that the skill's strip checklist should detect instead of preserving in live policy.

The operator therefore archived the rule form from the global and project live rule locations. The runnable entry point is the skill only. Marketplace, cache, and user-skill copies have matching `SKILL.md` content; all use `disable-model-invocation: true`. The retired rule copies remain under an archive directory for traceability.

This decision passes the ADR gate:

1. **Hard to reverse**: yes. Reinstating the rule form would require resynchronizing at least four referenced copies and restoring their live pointers.
2. **Surprising without context**: yes. ADR-0004 describes a dual form, while the live rule is now absent; the reversal needs an explicit record.
3. **Real trade-off**: yes. Keeping both forms reduces invocation friction but permits drift; skill-only removes drift but requires manual invocation. Skill-only is selected.

## Decision

1. Retire `self-evolving.md` entirely from the global and project live rule sets. The runnable entry point is `arthurpower:self-evolving-rules` only.
2. Make the skill the single source of truth for the procedure, including the 6+1 steps, Step 7 extraction, routing, and the ride-along boundary-testing note. No project rule mirrors the procedure.
3. Keep the global `CLAUDE.md` and project `.claude/rules/git.md` pointers aimed at the skill, not at a rule path.
4. Partially reverse ADR-0004 point 3, which established the dual form. ADR-0004 remains `accepted` because its user-invoked loading choice still stands; only the dual-form clause is reversed here.
5. Retain archived rule copies for historical traceability. Do not restore them as live policy.

## Consequences

**Positive**:

- One executable SSOT removes synchronization drift between rule and skill.
- User-invoked loading adds zero always-on context load.
- The strip checklist, including its process-residue bullet, is the single live cleanliness control.

**Negative**:

- The operator must invoke `/self-evolving-rules`; phrases such as “记住 X” do not auto-load it.
- New sessions have no always-on rule prompt. The CLAUDE.md pointer mitigates discovery but does not replace invocation.

**Relation to existing ADRs**:

- Partially reverses ADR-0004 point 3; ADR-0004's user-invoked loading decision remains active.
- Complements ADR-0001: domain-modeling remains model-invoked, while this skill has a different job and loading mode.
- Complements ADR-0003: the self-evolving 6-step procedure remains required for the applicable user-level writes, and is now invoked through the skill.

## Considered Options

### Option A: Keep dual form (rejected)

This preserves an always-available project reminder, but retains two maintenance surfaces and leaves process residue in live rules. Drift and duplicated governance outweigh the convenience.

### Option B: Skill-only and retire the rule (accepted)

This provides one executable SSOT, clean live pointers, zero always-on load, and a testable skill artifact. Manual invocation is the accepted cost.

### Option C: Rule-only and archive the skill (rejected)

This loses Skill tool loading and the skill-level boundary-testing surface. Those were the reasons ADR-0004 rejected rule-only operation.
