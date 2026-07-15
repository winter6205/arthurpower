---
name: issue-triage-validator
description: Use when Arthurpower receives an external request stream, external PR, or inbound support item and must decide category, state, owner, and next action.
version: 1.0.0
tags: [triage, external-pr, state-machine, categorize, verify-claim]
related_skills: [systematic-debugging, domain-modeling, verification-before-completion, defensive-contract-validator, deep-dive-protocol]
type: discipline
---

# issue-triage-validator

## When to use

- 外部 issue 流到达，需要分拣
- 收到外部 PR 或 inbound support item
- 待处理项标记为 unclassified、needs-triage 或 lacks enough information
- 必须 assign category role + state role + owner-ready brief 的工作项
- 在路由到实施 agent 之前需要 verify claim（复现 bug 或 checkout PR 跑测试）

## When not to use

- 待处理项已被正确分类且已有活跃实现 cycle
- 纯文档修正，无行为 claim 需要 verify
- 超出单一可复现 claim 范围，需开放调试 → 路由到 `systematic-debugging`
- 需深度领域建模 → 路由到 `domain-modeling`
- 需对抗性盘问 proposal → 路由到 `deep-dive-protocol`

## Procedure

### 1. 扫描待处理队列

查询 request tracker 或 inbox，筛选：
- `unclassified`
- `needs-triage`
- `needs-info`

按 oldest first 排序，输出编号列表（标题 + 时长 + 当前标签）。

### 2. 收集上下文

对所选 item 收集：
- 原始标题与 body
- 作者、关联 PR、关联 commit、关联讨论
- 已有标签、milestones、prior state changes
- 关联测试、关联源文件、关联文档

### 3. 冗余检查 + prior-rejection 检查

- 搜索重复标题或近重复 body
- 检查 `.out-of-scope/` 或 prior `wontfix` 记录
- 如为 duplicate，路由到 state `duplicate` 并引用原条

### 4. 验证 claim

对所选 item 执行最低限定验证：

| 类型 | 验证方法 |
|------|----------|
| bug report | 按步骤复现，或要求 reporter 提供最小复现步骤 |
| external PR | checkout 分支，跑相关测试套件 |
| enhancement request | 确认功能与项目范围和现有路线图对齐 |
| 无法完成验证 | assign state `needs-info`，列出确切缺失信息 |

### 5. 应用 category + state 角色

Category 角色（三选一）：
- `bug`
- `enhancement`
- `maintenance`
- `out-of-scope`

State 角色（五选一）：
- `needs-info`
- `ready-for-agent`
- `ready-for-human`
- `wontfix`
- `duplicate`

### 6. 输出 triage brief

含以下字段：
- 当前 state
- 谁能接（agent role 或 human role）
- 怎么接（next action + 推荐 skill）
- disclaimer：该 triage 决定为临时性，subject to human review

## Acceptance Criteria

- [ ] 每个 item 被分配恰好一个 category + 一个 state
- [ ] 验证已执行，或明确 defer 并标记 `needs-info`
- [ ] brief 含 state、owner、next action
- [ ] brief 含 disclaimer
- [ ] 没有 item 被静默丢弃

## Verification

```
Skill type: discipline
Bar level:  discipline
```

### Rationalization Table

| Pressure | Why it sounds right | Counter-evidence | Required action |
|----------|---------------------|------------------|-----------------|
| Triage volume is high | Speed matters more than accuracy | A wrong triage wastes a human's time to reclassify | Process the full checklist, not a subset |
| The claim looks obviously true | The title alone is enough to route | Title mismatches body content in 1/4 of real issues | Always run Step 4 verification |
| External PRs are small enough to skip review | A PR is a contribution, not a threat | Malicious PRs hide in small diffs | Run the PR's tests and check out-of-scope first |
| The reporter is a trusted contributor | Their issue should get priority routing | Trusted contributors also file duplicates and false enhancement requests | Apply the same triage checklist regardless of origin |
| A `wontfix` decision seems obvious | The rationale is self-evident | Future contributors may reopen without understanding why | Cite the specific out-of-scope rule or prior ADR |

### Red Flags — STOP

- 跳过 bug 复现因为描述 "看起来明显"
- 在输出 brief 之前就编辑 tracker labels
- 路由到 `ready-for-agent` 未确认 item 可复现或在 scope 内
- 省略 disclaimer 让决策看起来不可撤销
- 把 duplicate 当作已解决，未引用原条目
- 未跑 `.out-of-scope/` 检查直接 close
- 一次 check-in 给多个未关联 item 分配同一个 state（批量 triage shortcut）

## References

- `systematic-debugging`：bug 复现阶段可调用
- `domain-modeling`：术语写入入口
- `verification-before-completion`：验证 claim 阶段可调用
- `deep-dive-protocol`：需求澄清驱动
- `pre-context-write-guard.cjs`：sanitization guard