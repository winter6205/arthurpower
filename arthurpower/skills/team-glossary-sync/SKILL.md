---
name: team-glossary-sync
description: Use when the same term carries different meanings across projects or team members and a team-level SSOT must be established. Drives the lifecycle of docs/team-glossary.md from propose, conflict detect, merge, to deprecate; writes via domain-modeling so the team-level SSOT stays under the same write authority as project-level CONTEXT.md.
version: 1.0.0
tags: [glossary, team, multi-project, ssot, conflict-resolution, 统一术语, 术语冲突, 团队词汇, 对齐词义, 权威定义]
related_skills: [domain-modeling, deep-dive-protocol, setup-arthurpower, bounded-context-guardian]
type: discipline
disable-model-invocation: true
---

# Team Glossary Sync

## When to use

- 同一术语在项目 A 与项目 B 中含义不同（如 "Account" 在 billing vs auth）
- 多个团队成员对同一词有不同定义
- 组织级 glossary 已存在或应存在
- 新成员 onboarding 时需要"我们这边 X 是指什么" 的权威表
- 跨项目 PR review 出现术语冲突

## When not to use

- 单一项目、单一团队 → 走 `domain-modeling` + 项目级 CONTEXT.md
- 两个完全无关项目 → 不强制统一
- 团队只有 1 人 → 无团队级词汇需要 sync
- 临时 debug 词汇 → 不入 team glossary

## Procedure

### Step 1: 决定是否需要 team-level SSOT

判定条件（任一满足即升级）：

- 同一词在 ≥ 2 个项目中有不同定义
- ≥ 2 个团队成员对同一词表达过不同含义
- 组织级 glossary 文档存在或应该存在

不满足 → 留在项目级 CONTEXT.md。

### Step 2: 读 `docs/team-glossary.md`（如存在）

- 若不存在，先由 `domain-modeling` 落空骨架（schema 校验由 `pre-context-write-guard.cjs` 守护）
- 若存在，扫现有词条标记冲突候选

### Step 3: 冲突检测

对每个候选词：
- 列出项目 A 定义 / 项目 B 定义 / 共同点 / 差异点
- 决定：(a) 统一为一个定义、(b) 保留两个定义但标注 scope、(c) 标记 deprecated 并引入新词

### Step 4: 提议合并条目

提议条目格式：

```markdown
**Term**: <canonical name>. _Avoid_: <synonyms to retire>.
项目级 override 见 docs/CONTEXT.md（project-specific override）。
```

通过 `domain-modeling` 落盘（唯一写入主权）。

### Step 5: 写入 `docs/team-glossary.md`

- 文件路径：`docs/team-glossary.md`
- 写护栏：`pre-context-write-guard.cjs` 已扩展到 team-glossary（V10 扩展）
- 文件 schema：与 CONTEXT.md 同（title + `## Language` + ≥ 1 条 `**Term**: def.`）

### Step 6: 跨项目通知

- 在每个项目的 `docs/CONTEXT.md` 加一行 `_TeamRef_: <term> → team-glossary.md`
- 不复制 team-glossary 条目到项目 CONTEXT.md（避免 duplication drift）

### Step 7: 状态追踪

每个 team-glossary 条目记录：
- `Last reviewed`: YYYY-MM-DD
- `Owner`: 团队负责人或未指定
- `Status`: `active` / `deprecated`

## Acceptance Criteria

- [ ] 已在 Step 1 完成"是否真的需要 team-level"的判定
- [ ] 冲突检测列出至少 top-2 候选定义与差异点
- [ ] 写入路径走 `domain-modeling`（唯一写入主权）
- [ ] `docs/team-glossary.md` 通过 `pre-context-write-guard.cjs` schema 校验
- [ ] 项目级 `docs/CONTEXT.md` 通过 `_TeamRef_` 引用而非复制
- [ ] 每个条目含 Last reviewed / Owner / Status
- [ ] 没有任何条目被静默丢弃

## Verification

```
Skill type: discipline
Bar level:  discipline
```

### Rationalization Table

| Pressure | Why it sounds right | Counter-evidence | Required action |
|----------|---------------------|------------------|-----------------|
| "每个项目单独定义就够了" | 项目独立性 | 跨项目 PR review 会卡在同一词的含义上 | 升级到 team-glossary |
| "复制 team-glossary 到每个 CONTEXT.md 方便" | 减少跳转 | 复制必漂移，team-glossary 改了项目里没改 | 用 `_TeamRef_` 引用 |
| "团队小不需要 SSOT" | 看起来冗余 | 团队规模变动时无历史可参考 | 即使 2 人也建空骨架 |
| "冲突时让两边各自保留" | 避免争议 | 同一术语两种定义 = 永远争议 | 决策保留 / 统一 / 废弃 |
| "team-glossary 由 PMO 维护就行" | 责任分离 | PMO 不懂技术上下文 | 走 domain-modeling，PMO 走 review |
| "直接写 CONTEXT.md 不必新建文件" | 减少文件 | CONTEXT.md 是项目级，跨项目共享会污染 | 新建 `docs/team-glossary.md` |

### Red Flags - STOP

- 跳过判定直接建 team-glossary
- 跳过 `domain-modeling` 自己写 team-glossary.md（违反写入主权）
- 把 team-glossary 条目复制到项目 CONTEXT.md（duplication drift）
- 冲突检测只列一个候选就决议
- 团队只有 1 人时仍建 team-glossary（空跑）
- 写入路径绕开 `pre-context-write-guard.cjs` schema 校验
- `Last reviewed` / `Owner` / `Status` 字段缺漏
- 删除冲突方而非合并（loss of context）

## References

- `domain-modeling`：team-glossary.md 唯一写入主权
- `deep-dive-protocol`：术语冲突识别驱动
- `setup-arthurpower`：首次建立 team-glossary 骨架
- `bounded-context-guardian`：项目级 vs team-level 边界校验
- `pre-context-write-guard.cjs`：team-glossary.md schema 护栏（V10 扩展）