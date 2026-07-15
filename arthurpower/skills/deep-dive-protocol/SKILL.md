---
name: deep-dive-protocol
description: "Use when a long interview, 长访谈, 盘问, 质询, or 深度盘问 is needed to resolve project terms and hard-to-reverse decisions through domain-modeling."
version: 2.0.0
tags: [Interview, Questioning, Alignment, Context, Driver, Requirement, 盘问, 质询, 厘清, 澄清, 问清]
related_skills: [domain-modeling, spec-driven-development, verification-before-completion]
disable-model-invocation: true
---

# Deep Dive Protocol

## When to Use

命中以下任一场景即启动本技能：

- 新需求模糊，需要澄清起点
- 术语在会话中漂移
- 多人协作术语未对齐
- 重构前需要确认问题域
- 启动任何 vertical slice 前

## When NOT to Use

出现以下任一情况则跳过本技能：

- 需求精确，可直接 implement
- 单文件微调，无歧义
- 用户明确说"别问了，直接干"

## How to Run

### Step 1: 加载已有语境

1. 读 `docs/CONTEXT.md`；若不存在则读 `docs/CONTEXT-MAP.md`
2. 扫 `docs/adr/` 中与本议题相关的 ADR
3. 文件缺失 → 静默继续，不创建新文件

### Step 2: 运行澄清循环

```
WHILE 用户输入含模糊/未对齐词:
  1. 识别冲突：用户用词 ∩ glossary 已定义词 → 是否矛盾
  2. 若矛盾 → 叫停并让用户选择：使用 glossary 定义 / 更新 glossary / 本次例外
  3. 若缺词 → 调 domain-modeling 写入 CONTEXT.md
  4. 若决策满足 ADR 三条件 → 调 domain-modeling 提议 ADR
  5. 推进访谈，直到本轮意图清晰
```

ADR 三条件：难逆 / 跨模块 / 影响接口或契约。

### Step 3: 输出对齐摘要

访谈结束输出：

```text
对齐摘要：
- 触及术语：<新增/更新词条>
- 触及决策：<新增 ADR 编号>
- 待办：<下一步 skill 入口>
```

## 与 domain-modeling 的协作

将术语与决策的写入权唯一交给 domain-modeling：

- domain-modeling 是唯一被授权写 `docs/CONTEXT.md` 和 `docs/adr/` 的技能
- 本技能只负责识别术语冲突和决策需求，不直接落盘
- 每识别一个术语缺口 → 立即调 domain-modeling 写入，不批量积攒
- 每识别一个难逆决策 → 立即调 domain-modeling 提议 ADR
- 写入前不替用户做决定；写入后把结果同步回会话

## Verification Checklist

本技能结束前逐项确认：

- [ ] 已读 `docs/CONTEXT.md` 或 `docs/CONTEXT-MAP.md`
- [ ] 触及术语已通过 domain-modeling 落盘到 CONTEXT.md
- [ ] 触及决策已通过 domain-modeling 提议 ADR
- [ ] 已输出对齐摘要
- [ ] 下一步 skill 入口已明确

## References

- `domain-modeling`
- `docs/agents/context-contract.md`
- `spec-driven-development`
- `writing-plans`
- `pre-context-write-guard.cjs`
