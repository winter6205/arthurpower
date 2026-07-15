# 0001. Keep domain-modeling as model-invoked (loading mode)

Date: 2026-07-15
Status: accepted

## Context

`docs/context-loop-refactor.md` D2 修复将 `domain-modeling` 立为 arthurpower 体系唯一被授权写 `docs/CONTEXT.md` / `docs/adr/` 的技能, 写入主权即写入入口唯一. 但 D2 同句写 "frontmatter 强制 `disable-model-invocation: false` 但写入入口唯一并存", 留 model-invoked + 写主权并存的 design 立约. v0.7.0 升级前 14 轮裁决中, 子代理 C 提案把 domain-modeling 改为 user-invoked (理由: 写主权 = 重要 = 必须显式 human gate), 子代理 D 提案维持 model-invoked. 冲突未决, 需 ADR 锁.

## Decision

维持 `domain-modeling` 加载方式 = `model-invoked` (frontmatter `disable-model-invocation: false`). 写主权通过三层保障, 不靠 dmi 字段:

1. 文档契约 (`docs/context-loop.md` §2.1 only domain-modeling may write)
2. 物理拦截 (`pre-context-write-guard.cjs` PreToolUse hook, 装上时 exit 2 拒收其他技能对 CONTEXT.md 的写)
3. Discipline (其他 skill 不碰 CONTEXT.md, 跟 context-loop §2.1 立约一致)

`domain-modeling` SKILL.md body 显式声明 "Loading: model-invoked / Write authority: unique / Enforced by: (a) body discipline (b) pre-context-write-guard hook (c) other skills must not touch CONTEXT.md" 段, 让约束可见, 防后续子代理重复提案 user-invoked 误推.

## Consequences

**正面**:
- deep-dive-protocol / arch-improve / setup-arthurpower 等 skill 在需写术语/ADR 时可直接调 domain-modeling, 链路顺畅 (model auto-reach)
- 跟 the baseline `domain-modeling` 加载方式一致 (the baseline 也是 model-invoked, description 显式支持其他 skill 触发)
- 写入主原语跟加载方式解耦, 避免 user-invoked 把"唯一入口"设计破坏

**负面**:
- 模型在不需要时也可能 reach domain-modeling (false positive), 但 verify (CONTEXT-FORMAT schema 校验) 能兜底
- 写主权失去 user-invoked 那层"每次写都有人在场"的可观测性; 缓解: SKILL.md body 显式声明 + Operational Log 段记录每次写事件

**跟现有立约的关系**:
- 跟 `context-loop-refactor.md` D2 立约一致 (model + 唯一写入入口并存)
- 跟 `context-loop.md` §2.1 立约一致 (only domain-modeling may write)
- 子代理 C 的"user-invoked"提案被否决, 防止后续 agent 重新提案

## Considered Options

### Option A: model-invoked (本 ADR 采纳)
- Pros: 链接顺畅, 跟 the baseline 对齐, 写主权靠 hook + discipline 三层保证
- Cons: 失去 user-gate 可观测性, 模型可能误触发

### Option B: user-invoked (子代理 C 提案, 否决)
- Pros: 写主权显式 human gate, 每次写入可观测
- Cons: 破坏"唯一入口"设计 (deep-dive / arch-improve 调 domain-modeling 时必须显式), 跟 the baseline 不一致, 跟 design 立约冲突

## Why not user-invoked

未来 agent 重提时参考: 子代理 C 论据是 "写主权 = 重要 = 必须 human gate", 隐含假设 user-invoked 是写主权的必要条件. 这假设是错的——写主权由 3 层保障 (文档契约 + hook 物理拦截 + discipline), 跟加载方式无关. user-invoked 反而让"其他 skill 调 domain-modeling 写"路径断裂, 破坏 context-loop 的"唯一写入入口"设计.
