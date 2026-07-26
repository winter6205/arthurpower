# Autonomous Coding Loop 使用手册

目标：在 winter6205/arthurpower 接通 claude-code-action，`@claude` 触发后，由 agent 在 GitHub runner（沙箱α）中审查或修复；人创建 PR 并由人 merge，全程直连 operator 的国产 Anthropic 兼容上游。

## 三门用法

三门入口均为全手动、按需触发，不使用 webhook 或 label 自动触发：

- **a 门：PR review comment**：在 PR 的 review comment 中写 `@claude <任务>`。
- **b 门：Issue**：在 issue 评论或标题中写 `@claude <任务>`。
- **c 门：本地 Claude Code CLI**：直接在本地使用 Claude Code CLI；此入口已具备，不依赖 CI。

## 三档改动分级表

下表是 agent 可读契约的唯一事实来源（SSOT），源自计划 A3 决策：

| 档位 | 范围 | Action 行为 |
| --- | --- | --- |
| 放手改 | lint/格式化/typo/依赖升级/补测试/有明确报错的 bug | 允许直接改 + 提交分支 |
| 只审 | 业务逻辑/算法/数据结构 | 仅评论建议，不改代码 |
| 只提醒 | 安全/认证/权限/支付/数据迁移 | 仅提醒，禁开 PR |

> 契约 SSOT = 仓库 `CLAUDE.md` §Skill routing（CI 中 Claude Code 自动加载）；本表为人类可读副本，改动须与 CLAUDE.md 同步。

## Secret 配置（operator-only）

只在 GitHub 仓库设置中配置 secret，永远不要把 key 明文写入仓库、日志或评论。进入 **GitHub repo Settings → Secrets and variables → Actions**，添加以下两个变量：

- `ANTHROPIC_API_KEY`：上游原生 key。
- `ANTHROPIC_BASE_URL`：上游端点。

workflow 通过 step env 透传 `ANTHROPIC_BASE_URL`；action.yml 的事实核查支持该配置。文档只引环境变量名，不记录任何 secret 值。

## 人 merge 纪律

claude-code-action 的构造不能 merge 或 rebase；官方 capabilities 明示 “Cannot merge branches, rebase”。默认也不自动创建 PR：Claude 提交到分支并给出 PR 创建链接，人点击创建，人执行 merge。auto-merge 永不启用。

## 沙箱α与β

当前使用沙箱α：GitHub runner 是一次性容器，满足现阶段需要。更强隔离的沙箱β推迟到“开放给外部贡献者”时再处理。

## 上游连通前提与已知风险

runner 在海外，必须能连接 operator 的国产上游端点。另一个已知风险是 gateway 对 Anthropic 特性的透传可能存在 caveat。两项都由 B2 端到端 smoke 实测确认（见下方实测状态占位）。

## 实测状态（operator 填）

- **B2 端到端 smoke** = 待 operator 实测（`@claude` 触发 → 响应/开 PR/上游连通，附 Actions run 链接）。
- **C1 hooks-in-CI 观测** = 待 operator 从一次真实 run 日志确认 arthurpower 10-hook 是否在 CI 触发（fresh runner 未装 plugin，大概率不触发；只观测不改 hook）。

计划 = `plans/autonomous-coding-loop.md`；AFK 边界裁决 = 该计划 A1。
