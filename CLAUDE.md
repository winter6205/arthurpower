# Project Instructions

个人偏好放 `CLAUDE.local.md`（不提交）。本文件 = 团队共享约束。

## Coding Principles

Use as default bias, not strict checklist.

- Principle of Least Astonishment：代码行为可预测，少意外副作用。
- Follow Existing Conventions：沿用项目既有风格、目录、命名、接口。
- Keep It Simple：优先最短清楚实现，不提前抽象。
- Explicit over Implicit：意图、类型、边界、错误路径显式。
- Single Responsibility Principle：一个函数 / 类 / 模块一个明确职责。
- Single Source of Truth：业务概念、规则、状态、配置单一权威来源。
- Comments Explain Why：注释只解释原因、约束、边界，不解释显而易见的代码。

## Scope and authorization

代码与可执行配置是行为事实来源；与文档冲突时报告冲突，不静默选择。

未经用户明确授权，不得：push / release / deploy / tag / force push / rebase 公共分支；
修改任务范围外的安全、认证、权限、支付、数据迁移、CI/CD 或生产配置；
删除、跳过或弱化测试；绕过 hooks、lint、测试或其他质量门禁；暴露密钥或凭据。

锁文件变更需显式指令。不得升级 major 版本除非有明确理由。

## Validation

完成 = 跑过 = ground truth。
完成前必须走 `arthurpower:verification-before-completion`，验证失败时报告失败命令、原因和未完成项，不绕过质量门禁。
不得声称未运行的检查已通过。
验证失败时报告失败命令、原因和未完成项，不绕过质量门禁。

## 10-hook 不可 regress

`arthurpower/hooks/hooks.json` 注册的 10 个 hook 是项目身份。
任何弱化、删除、绕过 hook 的变更必须附带 ADR，否则驳回。

## Bucket tier discipline

30 个 skill 全部 promoted（`engineering` / `productivity`）。Promotion 三条件：
(1) frontmatter `bucket:` 为 engineering/productivity；(2) 行为稳定且文档化；
(3) router `using-agent-skills` 有引用。`scripts/link-skills.sh` 只链 promoted skill。

## Skill routing

非平凡任务开始前，通过 Skill 工具 invoke 对应技能：

## On-demand rules

以下文件不自动加载，按任务形状 Read：

- `docs/rules/git.md` — commit / push / PR / merge / tag 操作前
- `docs/rules/security.md` — 高风险模块 / 凭据 / 安全审计
- `docs/rules/workflow.md` — 4 步流程 / 技能检查 / 工具路由详情
- `docs/rules/context-loop.md` — 涉及 CONTEXT.md / ADR 写入时
- `docs/rules/code-quality.md` — 改业务代码 / 加测试 / 重构前
- `docs/rules/task-templates.md` — 6 类任务模板
- `docs/rules/memory.md` — 更新项目记忆前

## Completion

自动 commit。完成后简要报告：改了什么；实际验证及结果；未验证内容及原因；
风险、阻塞项及 Git/发布操作。不输出空字段。
