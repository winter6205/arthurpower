# Plan Format

Use this canonical template. The template is load-bearing — adapt only by adding fields, never by removing or renaming the numbered list.

```markdown
# Plan: <feature name>

**Goal:** <one sentence: what this builds>
**Architecture:** <2-3 sentences: approach>
**Tech Stack:** <key libraries / frameworks>
**Spec link:** <path or "none">

## Tasks (ordered by dependency)

Each numbered item is one tracer bullet: vertical slice, one tag, one commit, binary acceptance.

1. **<task name>** — affects: <files>
   - Acceptance: <binary yes/no check, with the exact command or test> (what this tracer bullet delivers end-to-end)
   - Commit: 1 commit = this 1 task (this tracer bullet = this commit)
   - Status: [ ] pending / [x] done

2. [<parallel>] **<task name>** — affects: <files>
   - Acceptance: <binary yes/no check>
   - [blocks: T1]

3. **<task name>** — affects: <files>
   - Acceptance: <binary yes/no check>
   - [blocks: T1, T2]

## Cross-references
- architecture-change-reviewer verdict: <yes/no per Core Skill>
- affected S1-S6 skills: <list, e.g. S2 defensive-contract, S6 minimal-change>
- parallelization surface: which tracer bullets can run concurrently
```