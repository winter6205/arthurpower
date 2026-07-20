---
name: domain-modeling
description: "Use when another skill needs to write project terminology, or the user requests glossary alignment, an ADR, or decision persistence. Handles ambiguous or overloaded terms and hard-to-reverse decisions."
bucket: engineering
version: 2.0.0
tags: [Context, Glossary, ADR, Domain, SSOT, WritePrimitive]
author: Arthurpower
related_skills: [deep-dive-protocol, bounded-context-guardian, spec-driven-development]
---

# Domain Modeling — 词汇与 ADR 写入主原语

## Overview

Arthurpower context closed-loop 的**唯一写入主权者**. 仅本技能被授权直接修改 `docs/CONTEXT.md` (单语境) 或 `docs/CONTEXT-MAP.md` (多语境), 并提议 ADR. 其他技能均为消费者 (READ) 或驱动者 (DRIVE).

**Loading: model-invoked.** Frontmatter omits `disable-model-invocation`, so the model and other skills can reach this skill.

**Write authority: unique.** This is the sole skill permitted to write `docs/CONTEXT.md`, `docs/CONTEXT-MAP.md`, team glossary entries, or proposed ADRs.

**Enforced by:** (a) `SKILL.md` body discipline, (b) the `pre-context-write-guard.cjs` PreToolUse hook, and (c) other skills must not touch `CONTEXT.md`, context maps, team glossaries, or ADR files directly.

**Triggered when:** another skill needs to write terminology, or the user requests glossary alignment, an ADR, or decision persistence (`记决策`).

## When to use

- 用户用词与已有 glossary 冲突 (`Customer` vs `User`)
- 词义模糊 / 过载 / 边界不明
- 用户陈述与代码行为矛盾
- 触及区决策满足 ADR 三条件 (见 §ADR 段)

## When not to use

- 通用编程概念 (function / array / loop) → 不入 glossary
- 一次性 debug 信息 → 走 session memory
- 易逆的小决策 → 走 commit message

## Procedure

1. **冲突检测**: 比对用户用词与 `docs/CONTEXT.md` 已定义词
2. **决议**: 显式问 "glossary 定义 X, 你却指 Y, 哪个对?"
3. **即时落盘**: 解析出术语后, 立即写 `docs/CONTEXT.md` (按 CONTEXT-FORMAT.md schema)
4. **ADR 闸门**: 满足三条件才提议 ADR (见下)

## ADR 三条件闸门

仅当 **三条件全真** 才提议写 ADR:

| 条件 | 含义 | 缺则 |
|------|------|------|
| Hard to reverse | 改主意代价大 | 易逆就逆, 不记 |
| Surprising w/o ctx | 未来读者困惑"为啥这么干" | 不困惑不必记 |
| Real trade-off | 真有备选且选了特定理由 | 无备选无记价值 |

### ADR 落盘步骤 (本技能即写入主权)

1. 扫 `docs/adr/` 取最大号 + 1 (防撞号)
2. 按 `ADR-FORMAT.md` 模板写 `docs/adr/NNNN-slug.md`
3. Status 流转: `proposed` → `accepted` → `deprecated` / `superseded by NNNN`
4. 物理护栏 `pre-context-write-guard.cjs` 自动校验 schema, 失败 exit 2 拒收

### ADR 撤回协议

被 `code-review-protocol` 或 `deep-dive-protocol` 推翻时, **不删原文件** — 改 Status 为 `superseded by NNNN`, 保持决策链可追溯.

## 写入主原语关系

| 角色 | 技能 | 关系 |
|------|------|------|
| 写入主原语 | `domain-modeling` (本技能) | 唯一被授权 |
| 写入驱动者 | `deep-dive-protocol` | 把访谈产出落到本技能 |
| 写入接管 | `code-review-protocol` (issue-intake 段) | 外部 issue 流汇入 |
| 读取契约 | 项目级 `docs/agents/context-contract.md` | 下游消费规则 |

**单一写入入口设计**: 多技能各自改 glossary 会导致词汇分裂. 本技能把"写词汇"收敛到单一主权.

## Physical Guardrail

`pre-context-write-guard.cjs` 在 PreToolUse Write/Edit/MultiEdit 阶段校验:

- `docs/CONTEXT.md` / `CONTEXT-MAP.md`: 必须有 `# ... — 领域词汇表` 标题 + `## Language` 段 + ≥ 1 条 `**Term**: 定义.` 词条 + 不含通用编程词
- `docs/adr/NNNN-slug.md`: 文件名 NNNN 与标题 `# NNNN. ...` 一致 + Date/Status/Context/Decision/Consequences 段齐全

校验失败 → exit 2 + JSON systemMessage 提示走本技能落盘.

## Multi-Level SSOT

When the same term has different meanings across projects or team members,
introduce a second-level SSOT in addition to the project-level `docs/CONTEXT.md`.

### When to introduce team-level SSOT

- The same word has different meaning in project A vs project B (e.g. "Account" in billing vs auth).
- Multiple team members use the same word to mean different things.
- An organization-wide glossary exists or should exist.

### File layout

- Project-level: `docs/CONTEXT.md` (existing, single-context)
- Team-level: `docs/team-glossary.md` (new, multi-project)
- Multi-context project: `docs/CONTEXT-MAP.md` (existing, points to sub-contexts)

### Authority precedence (highest wins)

1. Team-level `docs/team-glossary.md` (organization-wide)
2. Project-level `docs/CONTEXT.md` (project-specific override)
3. Sub-context per bounded context

When in doubt, prefer the higher level unless the project context explicitly overrides.

### When NOT to introduce team-level SSOT

- A single project with a single team: project-level CONTEXT.md is enough.
- Two unrelated projects: keep them isolated; do not force team-level unification.
- A team of 1: no team-level vocabulary to sync.

### Write protocol

Team-level glossary entries are written by `domain-modeling` only, same as
project-level. Both are protected by the same `pre-context-write-guard.cjs`
hook (the hook must be extended to recognize team-level files).

## Acceptance Criteria

- [ ] 定义 ≤ 2 句
- [ ] 武断选词, `_Avoid_` 列同义词
- [ ] 不收通用编程概念
- [ ] 文件存在且被 git 跟踪
- [ ] ADR 三条件全真才提议

## Verification

Skill type: technique
Bar level: minimum

- Confirm the target file is a context artifact governed by this skill.
- Confirm the PreToolUse guard accepted the write.
- Confirm no other skill directly mutated a governed context artifact.

## References

- 项目级词汇格式契约: in-bundle `CONTEXT-FORMAT.md` (本技能随附, 反映 `pre-context-write-guard.cjs` 校验的 schema)
- 项目级 ADR 格式契约: in-bundle `ADR-FORMAT.md` (本技能随附, 反映 arthurpower `docs/adr/0001-0011` 实际结构)
- 读侧契约: 项目内 `docs/agents/context-contract.md`
- 物理护栏: `C:/Users/dev/.claude/hooks/pre-context-write-guard.cjs`