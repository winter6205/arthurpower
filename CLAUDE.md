# Project Instructions

本文件定义团队共享、跨任务稳定的智能体协作约束。个人偏好放入
`CLAUDE.local.md`，且不得提交。

## Project context

按任务需要读取 `README.md`、`docs/CONTEXT.md`、相关目录中的
`CLAUDE.md`，以及直接相关的代码、测试和配置。不要预读整个仓库。

代码与可执行配置是行为事实来源。它们与文档冲突时，报告冲突，不要
静默选择或顺带修复。

## Scope and authorization

保持最小必要变更。不得混入任务外重构、格式化、调试代码或其他无关改动。

未经用户明确授权，不得：

- commit、push、release、deploy、创建 tag、force push 或 rebase 公共分支；
- 修改任务范围外的安全、认证、权限、支付、数据迁移、CI/CD 或生产配置；
- 删除、跳过或弱化测试以使验证通过；
- 绕过 hooks、lint、测试或其他项目质量门禁；
- 暴露密钥、凭据或生产数据。

当需求、影响范围或高风险变更存在关键歧义时，先说明计划、预计修改范围
和验证方式，等待确认。

## Changes

修改前确认现有行为、调用范围和相关测试。

新增或升级依赖时，优先复用现有依赖；确认维护状态、许可证、安全风险和
运行时影响。使用项目既有包管理器并同步锁文件。未经明确理由不得升级
major 版本。

公共行为、API、配置、命令、环境变量或迁移步骤变化时，同步更新对应文档。

## Validation

运行与变更风险相匹配的最小充分验证，包括适用的测试、lint、类型检查或
构建。

不得声称未运行的检查已经通过。验证失败时报告失败命令、原因和未完成项，
不得绕过质量门禁。

## Bucket tier discipline

Arthurpower 插件当前装载 30 个 skill，全部是 promoted bucket（`engineering`
或 `productivity`）。未 promoted 的桶 (`misc` / `personal` / `in-progress` /
`deprecated`) 在 the baseline 体系中保留给不发版到插件的 skill；Arthurpower 当前
没有任何 skill 落在这些桶里。

- **Promotion 规则**：一个 skill 在以下三条同时满足时被 promote — (1)
  frontmatter 带 `bucket: engineering` 或 `bucket: productivity`；(2)
  行为稳定且文档化（见 `arthurpower/skills/skill-authoring/SKILL.md` 的
  Docs-page 要求，PR4）；(3) 在 router `using-agent-skills` 中有引用
  （PR1 invariant，T2 hook 强制）。
- **`scripts/link-skills.sh` 只链 promoted skill**：脚本读每个 SKILL.md
  的 `bucket:` frontmatter，仅链接 `engineering` / `productivity`，跳过
  其它任何桶。本地 harness（`~/.claude/skills` / `~/.agents/skills`）里
  永远不会出现 non-promoted skill。
- **总览入口**：`arthurpower/README.md` 按 bucket + invocation class
  （User-invoked vs Model-invoked）分组列全部 30 个 skill。

策略来源：ADR-0011 fusion approach 与 gh-10 bucket tier ticket。

## On-demand instructions

仅在相关任务中读取 `.claude/rules/` 下的专项规则。Skills 和 subagents
按其描述按需使用，不在本文件维护目录清单。

- 自动化 divergence（10-hook 护栏 vs the baseline prose 纪律）见 @docs/agents/automation-divergence.md

## Completion

完成后简要报告：

- 改了什么；
- 实际运行的验证及结果；
- 未验证内容及原因；
- 存在时报告风险、阻塞项以及 commit、push、release 等 Git/发布操作。

不要输出空字段或重复显而易见的信息。
