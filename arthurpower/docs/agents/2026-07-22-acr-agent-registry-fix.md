# ACR agent 注册修复

> **Date**: 2026-07-22
> **Status**: landed (agent file created; session reload required to activate)
> **Scope**: `agents/architecture-change-reviewer-agent.md` (新增)

## 问题

`arthurpower:architecture-change-reviewer` 在插件里仅有 **skill** 形态（`skills/architecture-change-reviewer/SKILL.md`），没有 **agent** 形态。

Agent tool 的 `subagent_type` 只认 `agents/*.md`，不认 `skills/*/SKILL.md`。所以当 workflow 或主代理尝试以 `subagent_type: "arthurpower:architecture-change-reviewer"` 派发时，触发：

```
Error: Agent type 'arthurpower:architecture-change-reviewer' not found.
Available agents: ... bounded-context-guardian-agent, complexity-anti-drift-agent, ...
```

插件的 5 个 Core Skill 都同时有 skill + agent 双形态：

| Core Skill | skill | agent |
|---|---|---|
| bounded-context-guardian | ✅ | ✅ `bounded-context-guardian-agent.md` |
| input-contract-tests | ✅ | ✅ `input-contract-tests.md` |
| error-handling-enforcer | ✅ | ✅ `error-handling-enforcer-agent.md` |
| complexity-anti-drift | ✅ | ✅ `complexity-anti-drift-agent.md` |
| minimal-change-verifier | ✅ | ✅ `minimal-change-verifier-agent.md` |

但 ACR（它们的编排者）只有 skill 形态 — 注册空洞。

## 修复

创建 `agents/architecture-change-reviewer-agent.md`（3173 bytes），与 5 个 Core Skill agent 形态对齐。

### 职责边界（严格定义，避免与 skill 重复）

| ACR 做 | ACR 不做 |
|---|---|
| 读计划/diff → 5 维度各写一行 yes/no/unclear | 改任何源文件（read-only） |
| 整体 `BLOCKED` 或 `PASS — hand to writing-plans` | 写计划（writing-plans 的事） |
| 冲突时指出排序（先拆后提交） | 拆任务（writing-plans 的事） |
| 兜底 `git diff --stat` 枚举文件 | 跑 5 个 Core Skill 子代理（ACR 评的是计划，不是代码） |

### 反模糊设计

- 不重复 skill 已有的内容：`When to use`、`Rationalization Table`、`Red Flags`、`Acceptance Criteria` 都不进 agent 文件
- 每个维度只问一个问题，不写多段落解释
- `unclear` 不是软通过 — 无法用证据支撑的 verdict 就是 `no`
- 不写 "probably" / "should" / "looks good" — 只允许 yes / no / unclear
- 不重复 frontmatter `description` 已经说过的触发条件

### 格式

严格对齐 `bounded-context-guardian-agent.md`：

```yaml
---
name: architecture-change-reviewer-agent
description: Use this agent as a pre-implementation gate ...
tools: Read, Grep, Glob, Bash
color: orange
---
```

## 验证

- ✅ 文件存在 + 命名格式合规（`*-agent.md` 后缀）
- ✅ frontmatter 可解析（`name` / `description` / `tools` / `color` 齐全）
- ⚠️ 当前 session 的 Agent tool 仍报 `not found`：Claude Code 在 session 启动时缓存插件 agent 注册表，新文件需要**重启 session** 或**重新加载插件**才能生效

## 下一步

重启 Claude Code session 后，`subagent_type: "arthurpower:architecture-change-reviewer-agent"` 可正常派发。

## 备选路径（未选）

**选二：改 dispatch 侧** — 把派发 ACR 的代码从 Agent tool 改成 Skill tool（in-process 执行，不做 context isolation）。

不选理由：插件惯例是"5 个 Core Skill 都有双形态"，ACR 作为它们的编排者理应同样可独立派发 — 这与现有对称性一致，避免为 ACR 单独引入一种例外模式。
