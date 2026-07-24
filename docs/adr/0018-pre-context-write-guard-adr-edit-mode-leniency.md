# 0018. pre-context-write-guard ADR edit-mode leniency

Date: 2026-07-24
Status: accepted

## Context

`pre-context-write-guard.ts` enforces ADR schema at PreToolUse (Write/Edit/MultiEdit). `validateContext()` (L284-297) discriminates `mode='edit'` (fragment-level `hasTerm` only) vs `mode='write'` (full 3-check). `validateAdr()` (L299-327) lacked this discrimination — it always ran the full 5-check (title `# NNNN.`, Date, Status enum, 3 optional headings) against `content`.

For Edit/MultiEdit tool calls, `content` is the diff fragment (`new_string`), which lacks the title line. Every Edit on an existing ADR was blocked with `ADR 标题行缺少 NNNN. 前缀` — including legitimate operations like flipping `Status: proposed` → `Status: accepted`. The only workaround was Write (full-file overwrite), which defeats the purpose of Edit (surgical patch).

Discovered 2026-07-24 implementing `plans/code-review-dual-subagent.md` T1 (accept ADR-0017 + annotate ADR-0002). Defect log: `docs/agents/2026-07-24-pre-context-write-guard-adr-edit-defect.md`.

Per CLAUDE.md "10-hook 不可 regress" + issue #68: this hook-weakening change requires its own ADR.

## Decision

Mirror `validateContext`'s edit-mode pattern:

1. Add `mode: 'write' | 'edit'` parameter to `validateAdr` (required, no default — mirrors `validateContext`).
2. `mode='write'`: full 5-check, byte-for-byte unchanged.
3. `mode='edit'`: early-dispatch to `validateAdrFragment(content)` — validate only fields PRESENT in the fragment (any `Status:` line must match the enum; any `Date:` line must match the format). No title/heading requirement (file-level checks irrelevant to a diff fragment; the full file was validated at creation time).
4. Handler ADR branch: `const mode = (toolName === 'Edit' || toolName === 'MultiEdit') ? 'edit' : 'write'` — exact mirror of the CONTEXT branch.
5. Hoist Status/Date regexes to module-level consts (SSOT; shared by write and edit paths).

Test: 21 driver-level cases (node:test, zero new deps) covering all 5 boundary classes (empty/negative/overflow/concurrent/exception) per specs/hook-definehook-runtime.md §6.

## Consequences

**Positive:**
- Edit/MultiEdit on existing ADRs unblocked (the bug fix).
- Fragment-level enforcement preserved: invalid Status/Date in a fragment still blocks.
- Write-path full validation unchanged (no regression).
- Driver-level test suite (21 cases) is the first executable test for this hook.

**Negative / trade-off:**
- Edit mode does not validate the title line (by design — fragments are inherently incomplete; the file-level gate is at Write/creation time).
- node:test chosen over vitest (zero lockfile change; vitest toolchain belongs to issue #47 scope).

**Tech-debt NOTE (ACR override record):**
- The guard file is 575 lines (post-change; pre-existing was 547), exceeding the complexity-anti-drift soft REVIEW trigger (500 lines). The ACR gate returned `no` on this dimension; overridden on the grounds of the charter's diff-scoped principle ("pre-existing violations are tech-debt notes, not failures"; file-size is a soft REVIEW trigger, not a hard FAIL gate). The diff itself meets all hard gates (CC ≤ 10, nesting ≤ 4, zero clone). Follow-up: split the guard into responsibility-focused modules (separate ticket).

## Considered Options

### Option A: Mirror validateContext (adopted)
- Pros: consistent pattern; fragment-level enforcement preserved; minimal diff
- Cons: none material

### Option B: Fragment-level full validation (require title in fragment)
- Pros: stricter
- Cons: impossible — fragments are inherently incomplete; requiring the title line in every Edit fragment defeats the purpose of Edit

### Option C: Skip ADR validation entirely in edit mode
- Pros: simplest
- Cons: weakens the hook (invalid Status/Date in fragments would pass); violates 10-hook discipline

## Why not B/C

B is impossible: a diff fragment (new_string) is inherently incomplete — it cannot contain the full title line without also being the entire file, which defeats the purpose of Edit. C weakens the hook: invalid Status/Date values in fragments would pass unchecked, violating the 10-hook no-regress discipline. A is the only option that preserves both Edit usability and fragment-level enforcement.