---
name: intent-inference
description: Use when a request is vague, under-specified, or mixes multiple goals and the true intent must be inferred before any skill runs. Produces a one-paragraph inferred intent plus an explicit confirmation question, then hands off to deep-dive-protocol for term resolution.
bucket: engineering
version: 1.0.0
tags: [intent, clarification, pre-route, disambiguation, requirement, 想清楚, 想明白, 先理清, 模糊, 欠规格, 说不清]
related_skills: [deep-dive-protocol, using-agent-skills, domain-modeling, spec-driven-development]
type: discipline
---

# Intent Inference

## When to use

- 用户请求模糊、欠规格或同时夹带多个目标
- 请求里有隐含假设未被声明
- 任何 arthurpower skill 启动前，意图本身需要先澄清
- 用户说 "帮我搞定 X" 但 X 边界不清
- 用户的字面请求与可能的真目标存在偏差

## When not to use

- 需求精确，可直接 implement
- 用户已显式列出验收标准
- 单文件微调，无歧义
- 用户明确说 "别推断，按字面干"

## Procedure

### Step 1: 解析字面请求

- 提取动词、宾语、约束、隐含时限
- 标记每个词为已知 / 未知 / 假设

### Step 2: 推断真意图

从字面请求反推可能的真实目标：

| 信号 | 可能真意图 |
|------|-----------|
| "让代码快一点" | 性能瓶颈定位 + 优化方向选择 |
| "这个功能不对" | bug 复现 + 根因定位 |
| "加个测试" | 防回归覆盖 + 验收点固化 |
| "重构一下" | 结构性问题诊断 + 安全网建立 |

推断结果写成一句话："我推断你的真实意图是 X，因为 Y。"

### Step 3: 列显式确认问题

- 推断必须配套一个 yes/no 或多选确认问题
- 确认问题须可在 30 秒内回答
- 若推断有多个候选，列出 top-2 并让用户选

### Step 4: 触发弹出确认

使用 AskUserQuestion 弹出确认，而非把问题埋在文字里。每个选项含一句话说明 trade-off。

### Step 5: 推进到下游

- 确认后，把澄清后的意图交给 `deep-dive-protocol` 做术语解析
- 若涉及硬决策，由 `deep-dive-protocol` 驱动 `domain-modeling` 落 ADR
- 本技能不直接写 CONTEXT.md / ADR / 代码

## Acceptance Criteria

- [ ] 输出一句话推断意图 + 推断理由
- [ ] 输出至少一个可 30 秒内回答的确认问题
- [ ] 确认问题通过 AskUserQuestion 弹窗呈现
- [ ] 多候选场景列出 top-2 并标 trade-off
- [ ] 确认后明确指向下游 skill（deep-dive-protocol 或其他）
- [ ] 不直接落盘任何 CONTEXT.md / ADR / 代码

## Verification

```
Skill type: discipline
Bar level:  discipline
```

### Rationalization Table

| Pressure | Why it sounds right | Counter-evidence | Required action |
|----------|---------------------|------------------|-----------------|
| "用户说得够清楚了，直接干" | 减少往返 | 字面请求常隐含未声明假设，跳过推断导致返工 | 先输出推断 + 确认问题 |
| "推断意图浪费时间" | 用户要的是行动 | 错误的意图导致完全错误的行动，成本更高 | 推断是 1 次往返，返工是 N 次 |
| "把确认问题写在回复里就行" | 文字也能问 | 文字问题易被忽略或淹没，用户不知道要回答 | 用 AskUserQuestion 弹窗强制结构化确认 |
| "多个候选都试一下" | 并行探索 | 多个方向并行浪费 token 且产出混乱 | 列 top-2 让用户选一个 |
| "意图清晰就不必确认" | 看起来无歧义 | 表面清晰常掩盖深层假设分歧 | 即使自信也输出一句话推断供纠偏 |
| "直接调 deep-dive-protocol" | 它也能问 | deep-dive 解析术语，不推断高层意图 | 本技能先定意图，再交 deep-dive 定术语 |

### Red Flags - STOP

- 跳过推断直接 implement 字面请求
- 把确认问题埋在长段文字里而非弹窗
- 列超过 top-2 候选让用户选（决策疲劳）
- 推断无理由，只给结论
- 确认问题需要超过 30 秒才能回答
- 直接写 CONTEXT.md / ADR / 代码（越权）
- 多个候选都并行启动（资源浪费）
- 假装确认通过，实际按自己推断干

## References

- `deep-dive-protocol`：意图确认后接术语解析
- `using-agent-skills`：意图确认后的路由决策
- `domain-modeling`：术语与 ADR 写入主权
- `spec-driven-development`：意图固化为 spec
