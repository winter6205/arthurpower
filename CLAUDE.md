# Project Instructions for Claude Code

本文件是本项目的团队共享项目级规范。所有会影响代码、Git、测试、提交、发布、项目记忆和工程决策的行为都必须遵守本文件。

个人偏好不得写入本文件。个人偏好写入 `CLAUDE.local.md`，并确保该文件不提交到 Git。

---

## 不变量 (NEVER / MUST)

NEVER:

1. 在没有用户明确授权的情况下执行 push / release / deploy / tag / force push / rebase public branch
2. 把临时调试代码、无关格式化、无关重构混入功能提交
3. 擅自修改安全、认证、权限、支付、数据迁移、CI/CD、生产配置等高风险区域
4. 删除或跳过测试来让构建通过；不得把失败测试改成跳过
5. 把密钥 / token / cookie / 私钥 / 证书 / 生产数据写入提交信息、日志、测试快照或聊天输出
6. 通过 alias / 脚本 / 临时移动 hooks / 修改 hooks 文件 / 修改权限 / 绕过 lint-staged / husky / pre-commit 等方式规避质量门禁

MUST:

1. 先理解，再修改。先计划，再执行。先验证，再提交。
2. 优先使用只读命令 (`ls` / `find` / `grep` / `rg` / `cat` / `git status` / `git diff` / `git log` / `git show`)。
3. 涉及多文件修改、架构调整、高风险模块、依赖升级时，先输出 Plan + Files expected to change + Validation。
4. 小步提交。每个提交只表达一个意图。
5. 不绕过项目已有的质量门禁。如果 pre-commit / 测试失败，必须报告失败原因并提出修复方案。
6. 用户请求与本规范冲突时，必须说明冲突点并请求用户确认；不得临时绕过。

---

## 可维护性 6 规范 (S1-S6)

详细定义见 @~/.claude/rules/s{1-6}-*.md。本项目评审走 subagent: `@~/.claude/agents/maintainability-reviewer.md`。

---

## 1. 上下文读取顺序

每次开始任务时按需读取：

1. `README.md`
2. 当前任务相关目录下的 `CLAUDE.md`
3. 当前任务相关代码 / 测试 / 配置文件
4. `/memory` 中显示的项目记忆与自动记忆摘要

不要一次性读取所有文件。只读取与当前任务相关的文件，避免污染上下文。

---

## 2. 依赖管理规范

新增依赖前必须说明：

1. 为什么需要新依赖？
2. 是否已有项目依赖可复用？
3. 维护活跃度如何？
4. 包体积或运行时影响如何？
5. 是否引入安全或许可证风险？
6. 是否需要锁文件更新？

不得无理由升级大版本依赖。不得混用包管理器。

---

## 3. 文档规范

当代码行为 / 配置 / 命令 / 环境变量 / API / 迁移步骤发生变化时，必须同步更新文档。文档应说明：

1. 使用方式
2. 示例
3. 限制
4. 错误处理
5. 迁移方式（若适用）

不得让 README / docs / 注释与实际代码行为不一致。

---

## 4. 任务完成汇报格式

完成任务后必须按以下格式汇报：

```text
Summary:
- ...

Changed files:
- ...

Validation:
- ...

Git:
- Branch: ...
- Commit: ...
- Push: not performed unless explicitly requested

Risks / Notes:
- ...
```

如果没有运行测试，必须明确说明原因，不得省略。

### Task-end commit ritual（`~/.claude/` 数据仓）

任务结束前必跑下列命令把 `~/.claude/` 工作树落盘，否则改动不会进入数据仓 SSOT：

```bash
git -C ~/.claude add -A && git -C ~/.claude commit -m "<conventional commit subject>"
```

push 永远手动（CLAUDE.md NEVER #1 = operator-authorized only）。本规则为 reminder，详细 procedure 见 [docs/operations/claude-sync-procedure.md](docs/operations/claude-sync-procedure.md)。

---

## 5. 规范变更流程

本文件是项目级行为规范。修改本文件或 `.claude/rules/*.md` 前必须：

1. 说明修改原因。
2. 说明影响范围。
3. 检查是否与 `.claude/settings.json` / hooks / README / docs 冲突。
4. 单独提交规范变更，不与业务代码混合。

---

## 6. 引用 — 拆分规则

详细规则下沉到 `.claude/rules/`。Always-on `@import` 仅 2 个，其余走 markdown link（不注入，仅可点击 / Read 时才拉）：

- **任务前技能检查 + 工具路由 + 熔断** → @.claude/rules/workflow.md（**最元，所有任务先看**）
- 权限 + 工具使用 + 安全与隐私 → @.claude/rules/security-boundaries.md
- Git workflow + commit + pre-commit → [`.claude/rules/git.md`](.claude/rules/git.md)（commit / push / tag 时按需 Read）
- Memory 三层 + 写入准入 + 维护 → [`.claude/rules/memory.md`](.claude/rules/memory.md)（写 L1/L2/auto memory 时 Read）
- 代码修改 + 测试 + 高风险区域 → [`.claude/rules/code-quality.md`](.claude/rules/code-quality.md)（改业务代码 / 加测试 / 错误处理时 Read）
- 任务模板尾巴 → [`.claude/rules/task-templates.md`](.claude/rules/task-templates.md)（跑 1-5 类任务时 Read）
- 边界测试 SOP（跨 hook / 多状态）→ [`.claude/rules/boundary-testing-protocol.md`](.claude/rules/boundary-testing-protocol.md)（含 Case 3 byte-level）
- 上下文闭环 → [`.claude/rules/context-loop.md`](.claude/rules/context-loop.md)（涉及 CONTEXT / ADR 时 Read）

---

## 7. Agent skills

列出本项目可用的 skills / evals / handoff 协议, 避免每次重发明.

### Skills 路由 (按任务形状)

| 任务形状 | 走 skill |
|---|---|
| 接手陌生项目 / 摸架构 | `codebase-memory` (get_architecture + search_graph) |
| 改前摸调用链 | `serena` (find_referencing_symbols) |
| 跨 session 任务路由 / 不确定走哪条 | `using-agent-skills` (router) |
| 首次 setup 整个项目闭环 | `setup-arthurpower` (D1–D12 一次性) |
| 改前摸调用链 / 范围未定的深挖 | `deep-dive-protocol` |
| 改前架构评审 gate | `architecture-change-reviewer` (ACR gate-only) |
| 多文件规划 (vertical slice) | `writing-plans` (tracer bullet, ACR 之后) |
| 改前写测试 / S2 边界 | `arthurpower:test-driven-development` (红测试先) |
| 改前写测试 / S2 边界 | `defensive-contract-validator` (5 类边界) |
| Bug 修复 | `arthurpower:systematic-debugging` (Phase 1 红线: 先建反馈循环) |
| 写 spec / 设计 | `spec-driven-development` |
| 多 skill 并行 (无共享可变状态) | `dispatching-parallel-agents` |
| 审代码 / 审 PR / 审 commit | `arthurpower:code-review` (v-code-review CLI) |
| 完成前验收 / 防包装 | `arthurpower:verification-before-completion` (4 项 FAIL 闸门) |
| 防御性主张 / 守住一句话 | `defend-claim` |
| 跨 session 记忆 / 规则迭代 | `self-evolving-rules` (6 强制 + 1 可选) |
| Skill 创建 / 优化 | `arthurpower:skill-authoring` / `SkillOpt` |

### Agents (Task subagent, pre-merge 阶段)

| 阶段 | Agent | 用途 |
|---|---|---|
| Pre-merge S1-S6 第三段 | [maintainability-reviewer](~/.claude/agents/maintainability-reviewer.md) | spec + code-quality 都过后的最后一道 S1-S6 审计 |
| Flash lint / 快速正确性 | [quick-reviewer](~/.claude/agents/quick-reviewer.md) | 小 diff 闪审 + lint 风格正确性, 不重做 spec/code-quality 阶段 |

Multi-reviewer order (ACR → code-review + audit-agent → maintainability): see `arthurpower/docs/agents/harness-map.md` §4.

### Eval (regression test for this template)

按需 Read：

- `evals/run_scenario_eval.py` — 场景 eval runner (含 skill / hook / context 三类)
- `evals/scenario_evals.json` — 场景定义
- `evals/v070_skill_evals.json` — v0.7.0 skill eval 定义

跑 baseline: `python evals/run_scenario_eval.py [evals.json] [--matcher current|v5|improved]`

### Domain docs

| path | load-policy | rationale |
|------|-------------|-----------|
| @docs/CONTEXT.md | `auto` | 项目领域语言 + Flagged ambiguities |
| `docs/handoff/<date>.md` | `on-demand` | session 交接；由 V 主动注入 |

### 3 层记忆模型 (where to write)

| 层 | 位置 | 写什么 | 写入触发 |
|---|---|---|---|
| L1 | `~/.claude/CLAUDE.md` + `~/.claude/rules/*.md` | 跨项目通用规则 | 3+ 项目同模式 / 显式升级 |
| L2 | auto memory (session 内) | session learnings | 自动 (L3 compaction) |
| L3 | session context + `docs/` (CONTEXT.md / handoff / CHANGELOG) | 当前任务 + 项目知识 | inline |

**知识查询优先级** (高→低):
1. 代码本身 (最终 ground truth)
2. codebase-memory graph (结构性事实, 自动新鲜)
3. docs/CONTEXT.md / handoff (业务领域语言 + 历史)
4. CLAUDE.md (本文件, 跨项目规则)

### Handoff 写入主权

`docs/handoff/*.md` 仅由 operator 手动触发（`/session-handoff` 或 `/wayfinder`）时生成；main agent cycle 收尾不自产。

---

## 8. ~/.claude/ sync procedure

Procedure for syncing global config to/from project `.claude/` lives at [docs/operations/claude-sync-procedure.md](docs/operations/claude-sync-procedure.md). Manual cp; no script; project-local consumer with independent evolution.
