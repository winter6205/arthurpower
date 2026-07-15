---
name: commit-revert-protocol
description: Use when a commit must be rolled back, a bad change was pushed, a feature toggle must disable a commit, or an ADR is superseded. Drives the revert decision (revert vs reset vs ADR supersede), executes the reversible action, and records the supersession chain so history stays auditable.
version: 1.0.0
tags: [revert, rollback, supersede, history, audit, git, 撤回, 撤了, 撤销, 推翻, 还原]
related_skills: [domain-modeling, verification-before-completion, using-agent-skills, systematic-debugging]
type: discipline
disable-model-invocation: true
---

# Commit Revert Protocol

## When to use

- 一个 commit 引入缺陷，必须回滚
- 错误改动已 push，需要安全撤销
- 一个 feature toggle 需要禁用某 commit 的影响
- 一个 ADR 被新决策推翻，需要 supersede
- 回滚后必须保持历史可审计

## When not to use

- 改动仅在本地未 commit -> 直接 reset，无需协议
- 改动是文档 typo -> 直接修，不需要走协议
- 回滚会破坏下游依赖且无安全网 -> 先建安全网再走协议
- 用户只想看 diff 不想撤销 -> 不触发本技能

## Procedure

### Step 1: 决策回滚方式

| 场景 | 方式 | 可逆性 |
|------|------|--------|
| 已 push 的 commit | `git revert <sha>` 生成反向 commit | 完全可逆，历史保留 |
| 未 push 的本地 commit | `git reset --soft <sha>` 保留改动 | 改动保留在工作区 |
| ADR 被推翻 | 改 Status 为 `superseded by NNNN`，新建 ADR | 决策链可追溯 |
| feature toggle | 保留 commit，在配置层关闭 | 改动存在但 disabled |

**禁止** `git reset --hard` 已 push 的 commit（破坏他人历史，不可逆）。

### Step 2: 影响面检查

- `git log --oneline <sha>..HEAD` 列出被影响的后续 commit
- 检查后续 commit 是否依赖被回滚 commit 的接口
- 若有依赖 -> 走 Step 3 多 commit 回滚，不跳过中间

### Step 3: 多 commit 回滚

- 按反序逐个 revert
- 每个 revert 单独 commit（1 revert = 1 commit，符合 S6）
- 中间任一 revert 冲突 -> 停止，转 `systematic-debugging`

### Step 4: 验证回滚效果

- 跑受影响模块的测试套件
- 确认缺陷已消失
- 确认未引入新缺陷（回归测试）

### Step 5: 记录 supersession 链

- 在 commit message 中引用原 commit SHA
- 若涉及 ADR，由 `domain-modeling` 改 Status 为 `superseded by NNNN`
- 不删原 ADR 文件（保持决策链）

### Step 6: 通知下游

- 若改动已 push 到共享分支，告知协作者
- 若有 CI/CD，确认 pipeline 反映回滚后状态

## Acceptance Criteria

- [ ] Step 1 已选定回滚方式并说明理由
- [ ] 已 push 的 commit 用 `git revert` 而非 `git reset --hard`
- [ ] 影响面检查列出后续 commit
- [ ] 多 commit 回滚按反序逐个单独 commit
- [ ] 回滚后测试套件通过
- [ ] commit message 引用原 commit SHA
- [ ] 涉及 ADR 的 supersession 由 `domain-modeling` 落盘
- [ ] 原 ADR 文件未被删除

## Verification

```
Skill type: discipline
Bar level:  discipline
```

### Rationalization Table

| Pressure | Why it sounds right | Counter-evidence | Required action |
|----------|---------------------|------------------|-----------------|
| "直接 reset --hard 干净" | 一步到位 | 已 push 的 hard reset 破坏他人历史且不可逆 | 用 git revert |
| "revert 多个 commit 太慢" | 逐个 revert 繁琐 | 跳过中间 commit 会丢失依赖关系 | 按反序逐个 revert |
| "回滚完不必跑测试" | 反向 commit 不会有 bug | 反向 commit 可能误删后续依赖 | 跑受影响模块测试 |
| "删掉坏 commit 更清爽" | 历史干净 | 历史必须可审计，删 commit 破坏审计链 | 用 revert 保留历史 |
| "ADR 推翻就删文件" | 减少混乱 | 决策链断裂，未来无法理解演进 | 改 Status superseded |
| "回滚后不必通知协作者" | 他们自己会 pull | 静默回滚导致协作者基于旧状态工作 | 主动告知 |

### Red Flags - STOP

- 对已 push 的 commit 用 `git reset --hard`
- 跳过中间 commit 直接 revert 最早的
- 回滚后不跑测试就宣告完成
- 删除原 commit 或原 ADR 文件
- ADR supersession 不通过 `domain-modeling` 自己改
- commit message 不引用原 SHA
- 回滚引入新缺陷但未走 `systematic-debugging`
- 静默回滚共享分支不通知协作者

## References

- `domain-modeling`：ADR supersession 唯一写入主权
- `verification-before-completion`：回滚效果验证
- `systematic-debugging`：revert 冲突时转调试
- `using-agent-skills`：回滚后路由到下一步
- Git revert vs reset: `git help revert`
