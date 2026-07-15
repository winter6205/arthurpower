# Context Contract — 下游技能如何消费 CONTEXT.md / ADR

> 本文件定义"读侧契约": 下游技能在 read CONTEXT.md / ADR 时必须遵守的规则.
> 写侧契约在 `.claude/skills/domain-modeling/SKILL.md`.

---

## 1. 文件位置约定

| 类型 | 单语境 (默认) | 多语境 (monorepo / 多领域) |
|------|--------------|---------------------------|
| 词汇表 | `<root>/docs/CONTEXT.md` | `<root>/docs/CONTEXT-MAP.md` → 各 `<ctx>/docs/CONTEXT.md` |
| 决策记录 | `<root>/docs/adr/NNNN-slug.md` | 各 `<ctx>/docs/adr/NNNN-slug.md` |
| 契约本身 | `<root>/docs/agents/context-contract.md` | 同左 |

判定: `docs/CONTEXT-MAP.md` 存在 → 多语境; 否则 → 单语境.

---

## 2. 探索前必读 (强制)

任何下游技能在开始工作前必须:

```
1. 读 docs/CONTEXT.md (或经 CONTEXT-MAP.md 路由到对应子语境)
2. 扫 docs/adr/ 中触及区的 ADR
3. IF 文件均不存在 → 静默继续, 不提示创建 (避免无关任务里强行要求脚手架)
```

**"静默继续"是刻意的**: 不在陌生任务里强制 setup, 让术语缺位本身成为写侧触发器.

---

## 3. 词汇消费规则

| 规则 | 示例 |
|------|------|
| 输出命名用 CONTEXT.md 定义的词 | glossary 定 `Customer`, 不漂移到 `User` / `Account` |
| 通用编程概念不入 glossary | `function` / `array` / `loop` 不收录 |
| 武断选词 + 其余列 `_Avoid_` | `**Term**: 定义` + `_Avoid_: 同义词列表` |
| 定义 ≤ 2 句 | 简洁即正义, 详情走 ADR 或 reference |

---

## 4. ADR 消费规则 + 冲突护栏

**冲突处理协议** (硬约束):

```text
IF 你的输出违背某 ADR →
  显式标注, 不静默覆盖:
  > Contradicts ADR-NNNN (slug) — but worth reopening because <具体理由>
```

**禁止**: 静默覆盖 / 重提已被否决的方案 / 用"我觉得更好"绕过.

**允许**: 显式标注 + 提请 reopen + 走 `arch-improve` 评审流程.

---

## 5. 词汇缺位信号 (写侧触发器)

```
IF 你需要某个概念但 glossary 没有 →
  这是信号, 二选一:
    (a) 你在发明项目不用的词 → 改用 glossary 已有词
    (b) 项目真缺这个概念 → 标记给 domain-modeling 补写
  不可: 自创术语绕过
```

---

## 6. ADR 缺位信号

```
IF 触及区的决策"难逆 ∩ 无 ctx 会困惑 ∩ 真权衡" 三条件都满足
   但 docs/adr/ 没有相关记录 →
  标记给 domain-modeling 提议 ADR
```

---

## 7. 跨引

- 写侧契约: `.claude/skills/domain-modeling/SKILL.md`
- 词汇格式: `.claude/skills/domain-modeling/CONTEXT-FORMAT.md`
- ADR 格式: `.claude/skills/domain-modeling/ADR-FORMAT.md`
- 写入驱动: `.claude/skills/deep-dive-protocol/SKILL.md`
- 物理护栏: `.claude/hooks/pre-context-write-guard.sh`