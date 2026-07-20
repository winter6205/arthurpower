---
name: deep-dive-protocol
description: "Use when a long interview, 长访谈, 盘问, 质询, or 深度盘问 is needed to resolve project terms and hard-to-reverse decisions through domain-modeling — then STOP at an explicit operator stop gate before any downstream skill runs."
bucket: engineering
version: 3.0.0
tags: [Interview, Questioning, Alignment, Context, Driver, Requirement, StopGate, 盘问, 质询, 厘清, 澄清, 问清]
related_skills: [domain-modeling, intent-inference]
disable-model-invocation: true
---

# Deep Dive Protocol

## Role

This skill is an **interview driver**, not a planner and not an implementer.

- Resolve terms and hard-to-reverse decisions by driving `domain-modeling` writes.
- End on a **stop gate**: emit the alignment summary, open AskUserQuestion, and wait.
- Do **not** invoke `writing-plans`, `architecture-change-reviewer`, `spec-driven-development`, or any implementation skill from this run.
- The operator chooses and invokes the next skill after the stop gate.

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
- 意图本身尚未推断 → 先走 `intent-inference`

## How to Run

### Step 1: 加载已有语境

1. 读 `docs/CONTEXT.md`；若不存在则读 `docs/CONTEXT-MAP.md`
2. 扫 `docs/adr/` 中与本议题相关的 ADR
3. 文件缺失 → 静默继续，不创建新文件

**Done when:** context files read or confirmed absent.

### Step 2: 运行澄清循环

```
WHILE 用户输入含模糊/未对齐词:
  1. 识别冲突：用户用词 ∩ glossary 已定义词 → 是否矛盾
  2. 若矛盾 → 叫停并让用户选择：使用 glossary 定义 / 更新 glossary / 本次例外
  3. 若缺词 → 调 domain-modeling 写入 CONTEXT.md
  4. 若决策满足 ADR 三条件 → 调 domain-modeling 提议 ADR
  5. 推进访谈，直到本轮意图清晰
```

ADR 三条件同 `domain-modeling`（本体就是它的 driver）：**Hard to reverse** / **Surprising w/o context** / **Real trade-off**。三条件全真才调 domain-modeling 提议 ADR。

**Done when:** no unresolved fuzzy term remains for this round; every new term / ADR went through domain-modeling.

### Step 3: 输出对齐摘要

访谈结束输出：

```text
对齐摘要：
- 触及术语：<新增/更新词条>
- 触及决策：<新增 ADR 编号>
- 候选下一步：<writing-plans | spec-driven-development | stop-here | other>
```

**Done when:** the three-line summary is present in the reply. This step does **not** launch the candidate next skill.

### Step 4: Stop gate (mandatory)

Open **AskUserQuestion** with a short confirmation. Do not bury the question in prose.

Suggested options (adapt labels to the session):

1. **stop-here** — end; operator will invoke the next skill later
2. **deep-dive-protocol** — operator wants another deep-dive pass to continue clarifying (rare; usually stop-here covers this)
3. **domain-modeling** — operator wants to skip the interview and write the resolved terms / ADRs directly through domain-modeling
4. **writing-plans** — operator intends to run writing-plans next (you still do not invoke it)
5. **spec-driven-development** — operator intends to run spec next (you still do not invoke it)
6. **other** — operator will name a different next step

**Done when:** AskUserQuestion has returned an operator selection. After the ack, **stop**. Narrate the chosen next skill name only; do not call the Skill tool on it.

## 与 domain-modeling 的协作

将术语与决策的写入权唯一交给 domain-modeling：

- domain-modeling 是唯一被授权写 `docs/CONTEXT.md` 和 `docs/adr/` 的技能
- 本技能只负责识别术语冲突和决策需求，不直接落盘
- 每识别一个术语缺口 → 立即调 domain-modeling 写入，不批量积攒
- 每识别一个难逆决策 → 立即调 domain-modeling 提议 ADR
- 写入前不替用户做决定；写入后把结果同步回会话

### 接口契约 (Interface contract)

调 domain-modeling 处理单点术语时，**透传 user 选择权**：

- 冲突识别 (哪条 glossary 定义 vs 用户当前用法) → deep-dive 负责
- 写入主权 → 调 domain-modeling，由 domain-modeling 弹 AskUserQuestion 让用户选
- ADR 提议 → 调 domain-modeling，由 domain-modeling 走自己的三条件闸门

deep-dive 自身在 Step 2 不弹 AskUserQuestion (除三条件提示外)。所有 user-facing 选择权交给 domain-modeling 内部处理。

## Verification Checklist

本技能结束前逐项确认：

- [ ] 已读 `docs/CONTEXT.md` 或 `docs/CONTEXT-MAP.md`
- [ ] 触及术语已通过 domain-modeling 落盘到 CONTEXT.md
- [ ] 触及决策已通过 domain-modeling 提议 ADR
- [ ] 已输出对齐摘要
- [ ] 已通过 AskUserQuestion 收到 operator 对 stop gate 的显式 ack
- [ ] 本 run 未自动 invoke `writing-plans` / `architecture-change-reviewer` / `spec-driven-development` / 任何 implementation skill
- [ ] 候选下一步 skill 仅作为名称写出，由 operator 自行触发

## Rationalization Table

| Pressure | Why it sounds right | Counter | Required action |
|----------|---------------------|---------|-----------------|
| "对齐完了，顺手开 writing-plans" | 减少一次往返 | 顺手启动 = 跳过 operator 选择；stop gate 就是为这一刻设的 | 输出摘要 + AskUserQuestion，停 |
| "用户已经说了下一步，不必再问" | 字面已指向 plan | 字面下一步仍可能含未声明假设；ack 是 1 次结构化确认 | 仍开 stop gate；选项预选用户提到的 skill |
| "AskUserQuestion 太重" | 文字问也行 | 文字确认易被淹没；与 intent-inference 纪律一致 | 弹窗，不埋文 |
| "domain-modeling 写完就等于完成" | 写入是硬产出 | 写入是中间产物；session 边界在 stop gate | 写完后仍走 Step 3–4 |
| "我只是建议下一步，不算 invoke" | 建议无害 | 若同时调 Skill tool 就是 invoke；建议只许出现在摘要与 ack 后叙述 | 禁止 Skill tool 调下游 |

## Red Flags - STOP

- 输出对齐摘要后直接调 `writing-plans` / ACR / `spec-driven-development`
- 把确认问题埋在长段文字里而不开 AskUserQuestion
- 替 operator 选择"候选下一步"并自动执行
- 跳过 domain-modeling 直接 Edit CONTEXT.md / ADR
- 在 stop gate 之前宣称"完成 / done / ready for plan"

## References

- `domain-modeling` — 唯一写入主权
- `intent-inference` — 上游意图确认（AskUserQuestion 纪律同源）
- `writing-plans` / `spec-driven-development` — 仅作候选下一步名称，不由本技能 invoke
- `docs/agents/context-contract.md`
- `pre-context-write-guard.cjs`
- Archive of v2.0.0 body: plugin archive snapshot `2026-07-18-deep-dive-stop-gate/v2.0.0-SKILL.md` (outside repo; not loaded at runtime)
