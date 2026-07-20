# 强制工作流规则
> 通用 4 步流程 (原全局 `~/.claude/rules/agent-workflow.md`, 已归档; 内联于此).

## 非平凡任务 4 步流程

1. **计划** — 澄清需求 + 列出方案 + 等待 V 字面指令
2. **实现** — 按计划执行, surgical change, 不顺手优化
3. **验证** — 跑测试 + 端到端实测, 给出"PASS = ..."结论
4. **汇报** — 表格 + 行号 + 实测值, 不堆文字

## 适用判定

- 适用: 跨文件改动 / 新功能 / 架构变更 / Bug fix
- 不适用: 1 行 typo fix / V 明确说"就是这 1 个文件" / 简单查询

---

## 规则 A: 开始任务前强制进行技能检查

**触发**: 任何非平凡任务开始前 (改代码 / 重构 / 加功能 / 解 bug / 审阅).

**强制动作**: 通过 Skill 工具 invoke 相关技能, 不凭印象直接动手.

**检查清单**:

| 场景 | 必 invoke 的技能 |
|------|------------------|
| 接手新项目 / 理解陌生架构 | `codebase-memory` (get_architecture / search_graph) |
| 改前摸调用链 / 找引用 | `serena` (find_symbol / find_referencing_symbols) |
| 全局检索 / 多跳依赖 / 死代码 | `codebase-memory` (trace_path / query_graph / search_graph max_degree=0) |
| 改代码 / 重构 / LSP 精准编辑 | `serena` (replace_symbol_body / insert_* / rename_symbol) |
| 查库 / 框架 / SDK / API 文档 | web MCP tools already enabled (`exa` EN / `minimax-search` CN); cite retrieved snippets; do not invent version-pinned APIs from memory alone |
| 改前先写测试 | `arthurpower:test-driven-development` (transplanted T2; SKILL.md + 5 references in arthurpower skill tree) |
| 新功能 / 创意 / 模糊需求 | `brainstorming` |
| 写 spec / 设计文档 | `spec-driven-development` |
| 解 bug | `arthurpower:systematic-debugging` |
| 大改动 (>20 files) | `dispatching-parallel-agents` |
| 完成前验收 / 多维 audit | `arthurpower:audit` |
| 文档 / ADR | `arthurpower:domain-modeling` |
| 跨多文件 / 多 hook / 多状态改动验 silent bug | 全局 boundary-testing 两轴 agent (`arthurpower:boundary-testing-axis1-agent` proponent / `axis2-agent` skeptic); 6 步 SOP + driver-level smoke |

---

## 规则 B: 工具绑定与动态路由 (Tool Binding & Dynamic Routing)

### 1. 任务分级与工具路由 (Tiered Routing)

| 任务级别 | 判据 | 推荐工具 | 禁忌 |
|----------|------|----------|------|
| **L1 局部/简单** | 单文件修改 / 简单 Bug 修复 / UI 微调 / 配置项微调 / 文档修正 | 原生文件系统工具 (`Grep` / `Glob` / `Read` / `Write`) | 不得强制调用 Serena/Codebase |
| **L2 结构/复杂** | 跨模块重构 / 调用链追踪 / 多态/接口实现查找 / 大型遗留系统分析 / 新增核心业务链路 | **Codebase Memory 先** (全局拓扑/多跳调用/死代码) → **Serena 后** (浅跳引用/精准编辑/LSP 诊断) | 不得降级用原生工具盲改; 不得跳过 Codebase 直接用 Serena 盲改 |

### 2. 前置上下文闭环 (Pre-Execution Context Validation)

- 任何代码变更 (增/删/改/移) 执行前, 必须建立完整的上下文依赖链.
- **L2 任务**: 必须先通过 Codebase/Serena 确认全局拓扑、接口契约和副作用边界.
- **L1 任务**: 必须通过原生 `Read/Grep` 确认局部上下文与变量作用域.

### 3. 熔断与安全降级机制 (Fallback & Halt)

| 熔断类型 | 触发条件 | 强制动作 |
|----------|----------|----------|
| **L2 工具熔断** | L2 任务执行时, Serena/Codebase 不可访问 / 超时 / 查询失败 | 暂停并输出 `[NEED_STRUCTURAL_INFO]` |
| **通用上下文缺失** | 任何任务, 目标文件 / 核心逻辑 / 业务意图无法确认 | 暂停并输出 `[NEED_MORE_INFO]` |

### 4. 业务与结构双轨对齐 (Dual-Track Alignment)

- 涉及**核心业务逻辑变更**时, 除代码结构检索外, 必须查询项目级 Memory (`CLAUDE.md` / `rules/`) 或相关背景文档.
- 目标: "代码拓扑结构" 与 "人类业务规范" 严格对齐.

---

## 跨引

- 项目入口: `CLAUDE.md`
- 全局规则: `~/.claude/rules/*.md` (用户级规则, 跨项目生效)

## When to Read 其他项目规则 (on-demand 提示)

CLAUDE.md 是唯一 always-on 入口（2026-07-20 进一步压缩：`.claude/rules/` 已空）。
所有详细规则在 `docs/rules/`，按任务形状显式 Read：

- **`docs/rules/code-quality.md`** — 改业务代码 / 加测试 / 错误处理 / 重构前
- **`docs/rules/memory.md`** — 写 L1（CLAUDE.md / rules）或 L2（auto memory）前
- **`docs/rules/task-templates.md`** — 接 test-coverage / pr-review / error-handling-fix / refactor-dedup / security-audit / context-loop-upgrade 六类任务时
- **`docs/rules/context-loop.md`** — 涉及 docs/CONTEXT.md 或 docs/adr/*.md 时；domain-modeling 写入时
- **`docs/rules/git.md`** — commit / push / PR / merge / tag 操作前
- **`docs/rules/security.md`** — 高风险模块修改前；安全审计时
- **全局 boundary-testing 两轴 agent** (`arthurpower:boundary-testing-axis1-agent` / `axis2-agent`) — 跨多文件 / 多 hook / 多状态改动前；T6 driver-level smoke 写时

> 加载机制: `.claude/rules/` 已空（2026-07-20 reorg）；`docs/rules/` 下文件不自动加载，须按上表触发条件显式 Read。

- Serena 工具文档: 触发 Skill `serena`
- Codebase Memory 工具文档: 触发 Skill `codebase-memory`