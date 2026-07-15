# Plan Format

Use this canonical template. The template is load-bearing — adapt only by adding fields, never by removing or renaming the numbered list.

```markdown
# Plan: <feature name>

**Goal:** <one sentence: what this builds>
**Architecture:** <2-3 sentences: approach>
**Tech Stack:** <key libraries / frameworks>
**Spec link:** <path or "none">

## Tasks (ordered by dependency)

1. **<task name>** — affects: <files>
   - Acceptance: <binary yes/no check, with the exact command or test>
   - Commit: 1 commit = this 1 task
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
- parallelization surface: <which tasks can run concurrently>
```