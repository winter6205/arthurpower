# SPEC — 移除 codebase-memory / serena 技能 + 创建 codebase-memory CLI 封装器

> **状态**：待确认  
> **创建日期**：2026-07-25  
> **作者**：Claude + 用户协作  
> **背景**：通过 2 次探索调研 + 网络证据汇总，发现 codebase-memory 与 serena 在本项目中实际使用率极低（codebase-memory 0 次 MCP 工具调用、serena 仅作 Skill 文档读取），但两者仍以 hook 注入、router 注册、Pipeline 叙述的形式产生持续 context 税和决策噪音。

---

## 1. Objective（目标）

将 codebase-memory-mcp 与 serena MCP 从 arthurpower 技能体系中**完全移除**，消除它们产生的 context 税与维护噪音；同时**保留 codebase-memory 二进制能力**作为可手动触发的 CLI 命令，在需要时按需调用。

### 目标用户

- **主要**：用户本人（单人 operator）。CLI 命令由用户在对话中通过 `/codebase-memory` 显式触发，或在终端中直接调用 `cbm` 命令。
- **次要**：未来可能使用本项目技能体系的其他用户（通过 git 拉取后获得更精简的 skill 集合）。

### 验收标准

- [ ] 所有 codebase-memory 的自动注入场景（SessionStart "ALWAYS FIRST"、PreToolUse Grep|Glob 门控）已移除
- [ ] arthurpower skill router（using-agent-skills）不再注册 codebase-memory 与 serena
- [ ] `~/.claude/skills/codebase-memory/SKILL.md` 与 `~/.claude/skills/serena/SKILL.md` 已替换或删除
- [ ] 新的 CLI 封装器 `cbm-cli.py` 可以独立 spawn 二进制完成一次 JSON-RPC 调用后退出
- [ ] 斜杠命令 `/codebase-memory <subcommand>` 可以在 Claude Code 对话中触发
- [ ] 现有 arthurpower 的 10 个 hook 未被修改（项目身份保护）
- [ ] codebase-memory 二进制（269MB exe）未被删除
- [ ] 已建索引数据（SQLite）未被删除
- [ ] `~/.claude.json` 中 MCP server 定义保留（CLI 封装器不走 MCP，留作未来备选）

---

## 2. Commands（命令）

### 2.1 CLI 封装器命令表

CLI 入口：`codebase-memory` （通过 `cbm-cli.py` 实现，可选符号链接 `cbm` 作为别名）

| 命令 | 别名 | 说明 | 对应原 MCP 工具 |
|---|---|---|---|
| `codebase-memory search <pattern>` | `cbm s` | 按名称模式搜索符号（函数/类/路由） | `search_graph` |
| `codebase-memory trace <func> [--depth=N] [--mode=calls\|data_flow\|cross_service]` | `cbm t` | 调用链追踪 | `trace_path` |
| `codebase-memory arch [--aspects=...]` | `cbm a` | 获取项目架构概览 | `get_architecture` |
| `codebase-memory dead` | `cbm d` | 死代码扫描（`max_degree=0` + `exclude_entry_points`） | `search_graph(max_degree=0)` |
| `codebase-memory status` | — | 检查索引状态、最后更新时间、节点/边数 | `index_status` |
| `codebase-memory index [path]` | `cbm i` | 构建/重建项目索引 | `index_repository` |
| `codebase-memory snippet <qualified_name>` | `cbm n` | 获取精确符号源码（含行号范围） | `get_code_snippet` |
| `codebase-memory projects` | `cbm p` | 列出已索引项目 | `list_projects` |
| `codebase-memory --help` | `-h` | 帮助 | — |
| `codebase-memory --version` | `-V` | 版本 | — |

### 2.2 全局参数

| 参数 | 说明 |
|---|---|
| `--project PATH` | 指定项目根目录（默认：当前工作目录） |
| `--timeout SEC` | 进程超时秒数（默认 60） |
| `--binary PATH` | 覆盖默认二进制路径 |

### 2.3 斜杠命令

`/codebase-memory <subcommand>` — 在 Claude Code 对话中触发，自动调用 Bash 执行 `codebase-memory <subcommand>` 并将结果注入当前对话 context。

定义位置：`~/.claude/commands/codebase-memory.md`（全局斜杠命令）

### 2.4 退出码

| 退出码 | 含义 |
|---|---|
| 0 | 成功 |
| 1 | 一般错误 |
| 2 | 二进制缺失或不可执行 |
| 3 | JSON-RPC 协议错误 |
| 4 | 超时 |
| 5 | 索引不存在（需先 `cbm index`） |

---

## 3. Project Structure（项目结构）

### 3.1 删除清单（7 项）

| 路径 | 类型 | 删除原因 |
|---|---|---|
| `~/.claude/hooks/cbm-session-reminder` | bash hook | SessionStart 强制注入 "ALWAYS FIRST"，已无意义 |
| `~/.claude/hooks/cbm-code-discovery-gate` | bash hook | PreToolUse Grep/Glob 门控，依赖 MCP server 常驻 |
| `~/.claude/hooks/cbm-code-discovery-gate.ts` | TS hook | 同上的 TypeScript 版本 |
| `~/.claude/skills/serena/SKILL.md` | skill | serena 完全下线 |
| `~/.claude/skills/codebase-memory/SKILL.md`（旧版） | skill | 被新版本替代 |
| `~/.claude/skills/serena/` （目录） | dir | 整个 skill 目录 |
| arthurpower 内对 codebase-memory 的所有引用 | 文本 | 见 §3.3 |

### 3.2 新增清单（4 项）

| 路径 | 类型 | 说明 |
|---|---|---|
| `~/.claude/hooks/cbm-cli.py` | Python 脚本 | CLI 封装器主入口，spawn 二进制 + JSON-RPC |
| `~/.claude/commands/codebase-memory.md` | Claude Code 斜杠命令定义 | 包装 CLI，自动注入 context |
| `~/.claude/skills/codebase-memory/SKILL.md`（新版） | skill | 极简版：只描述 CLI 用法，不含 MCP 工具参考 |
| `<workspace>\projects\Arthurpower\docs\adr\0019-removing-codebase-graph-from-skill-pipeline.md` | ADR | 固化决策理由 |

### 3.3 编辑清单（5 项）

| 路径 | 编辑内容 |
|---|---|
| `~/.claude/settings.json` | 移除 SessionStart 中 4 个 matcher（startup/resume/clear/compact）对 `cbm-session-reminder` 的引用；移除 PreToolUse 中 `Grep\|Glob` matcher 对 `cbm-code-discovery-gate` 的引用 |
| `arthurpower\skills\using-agent-skills\SKILL.md` | 移除 codebase-memory、serena 在 "Registered skills" 列表中的条目；移除 "Restricted" 标记说明中相关行 |
| `arthurpower\skills\using-agent-skills\references\quick-reference.md` | 移除 codebase-memory 与 serena 的条目 |
| `arthurpower\skills\systematic-debugging\references\when-to-use-detail.md` | 移除 `codebase-memory` / `serena` 在 Phase 2 (isolation) 中的引用，替换为"Grep + Glob + Read 深度组合" |
| `arthurpower\docs\rules\workflow.md` | 更新 L1/L2 路由表，移除"Codebase Memory FIRST"行；移除"不得跳过 Codebase 直接用 Serena 盲改"硬规则 |

### 3.4 不动清单（5 项，明确边界）

| 路径 | 不动原因 |
|---|---|
| `C:\Users\<user>\AppData\Local\Programs\codebase-memory-mcp\codebase-memory-mcp.exe` | CLI 封装器需要调用它 |
| `C:\Users\<user>\AppData\Local\Programs\codebase-memory-mcp\codebase-memory-hermes-stdio-shim.py` | 参考模板，可保留 |
| `~/.claude.json` 中 `mcpServers.codebase-memory-mcp` 条目 | 留作未来备选，CLI 封装器不走 MCP |
| arthurpower 10 个项目身份 hook | CLAUDE.md "10-hook 不可 regress" 保护 |
| 已索引的 SQLite 数据库 | 保留，CLI 可直接查询 |

---

## 4. Code Style（代码风格）

### 4.1 Python 风格（cbm-cli.py）

- **风格**：PEP 8 + 类型注解（`from __future__ import annotations`）
- **依赖**：仅使用 Python 标准库（`subprocess`, `json`, `argparse`, `pathlib`, `sys`）— **不引入第三方依赖**
- **入口**：单一 `main()` 函数 + `if __name__ == "__main__":` 守护
- **错误处理**：定义自定义异常类 `CBMError`（含退出码），避免通用 `except Exception`
- **输出**：
  - **默认输出 JSON**（机器可读，便于 Claude 与下游程序消费）
  - `--human` 时输出人类可读表格 + 缩进（可选，仅调试用）
- **日志**：stderr 输出进度信息（`--verbose` 时启用），stdout 仅承载 JSON 结果
- **Windows 兼容**：使用 `subprocess.Popen` + 显式 `creationflags=subprocess.CREATE_NO_WINDOW`，避免弹出控制台窗口

### 4.2 Markdown 风格（SKILL.md / 斜杠命令）

- 沿用 arthurpower 项目既有 SKILL.md 风格：frontmatter（name、description）+ 简短正文 + 决策表
- 斜杠命令定义：YAML frontmatter + 单段 description（Claude Code 自动注入为 system prompt）

### 4.3 JSON-RPC 通信约定

- **协议版本**：JSON-RPC 2.0
- **传输**：stdin/stdout 双向字节流，UTF-8 编码
- **请求格式**：`Content-Length` 头（参考 LSP 协议），避免粘包
- **初始化**：每次 CLI 调用前先发送 `initialize` 请求，再发送实际 `tools/call`
- **超时**：默认 60s，可通过 `--timeout` 覆盖
- **错误传播**：JSON-RPC error.code → CLI 退出码（见 §2.4）

---

## 5. Testing Strategy（测试策略）

### 5.1 手动 smoke 测试（CLI 封装器）

每个子命令至少跑一次：

```bash
# 帮助
codebase-memory --help
codebase-memory --version

# 状态查询
codebase-memory status
codebase-memory projects

# 搜索
codebase-memory search "login"
codebase-memory search "Auth"

# 调用链追踪
codebase-memory trace "login" --depth=3
codebase-memory trace "authenticate" --mode=calls

# 架构概览
codebase-memory arch

# 死代码
codebase-memory dead

# 源码片段
codebase-memory snippet "module::ClassName"

# 索引（首次或重建）
codebase-memory index .
codebase-memory index /path/to/project

# 人类可读模式（仅调试）
codebase-memory search "login" --human
```

### 5.2 退出码验证

```bash
# 二进制缺失场景
codebase-memory search "x" --binary=/nonexistent  # 期望退出码 2

# 索引不存在场景
cd /tmp/new_project && codebase-memory search "x"  # 期望退出码 5

# 超时场景
codebase-memory search "x" --timeout=1  # 大索引可能触发，期望退出码 4
```

### 5.3 JSON 输出验证

```bash
# 验证输出是合法 JSON 且能被 jq 解析
codebase-memory search "login" | jq .                    # 期望: 解析成功
codebase-memory status | jq '.node_count'                # 期望: 数字字段
codebase-memory arch | jq '.modules | length'            # 期望: 模块数
```

### 5.3 斜杠命令验证

在 Claude Code 对话中输入：

```
/codebase-memory status
/codebase-memory search "login"
```

期望：结果以人类可读格式输出到对话 context。

### 5.4 集成验证

- [ ] 启动新 session，确认 SessionStart 不再注入 "ALWAYS use codebase-memory-mcp FIRST"
- [ ] 在 Claude Code 中执行 Grep，确认 PreToolUse hook 不再 spawn 二进制
- [ ] 检查 arthurpower 10 个 hook 全部仍能正常触发
- [ ] 运行 `arthurpower:verification-before-completion` 流程验证 arthurpower 自身未破

### 5.5 自动化（可选 / 后续）

当前阶段以手动 smoke 为主。后续可考虑：
- 添加 `pytest` 测试套件（但引入新依赖，需用户授权）
- 添加 GitHub Actions CI（但本任务不涉及业务代码 CI）

---

## 6. Boundaries（边界）

### 6.1 Always（总是做）

- 删除前用 `git status` 或文件备份确认要删的就是要删的
- 修改 `settings.json` 前先 Read 全文，保留与本任务无关的 hook
- 改 arthurpower 内文件后跑 `arthurpower:verification-before-completion` 验证
- 引用文件路径用绝对路径或项目相对路径
- 写 ADR 时遵循 `arthurpower/docs/rules/context-loop.md` §2.2 的"三条件"判断（hard to reverse + surprising + ≥2 defensible options）— 本任务三条全部满足

### 6.2 Ask First（先问再做）

- 任何对 arthurpower 10 个项目身份 hook 的修改
- 任何对 `package-lock.json` / `node_modules` 的改动（本任务不涉及）
- 任何对 `~/.claude.json` 中 MCP server 注册的修改（本任务保留不动）
- 任何需要新增 Python 第三方依赖的方案（本 spec 已约束只用标准库）
- 任何对用户全局 `~/.claude/hooks/` 中其他 hook 的修改

### 6.3 Never（永远不做）

- 不删除 codebase-memory 二进制（269MB exe）
- 不删除已索引的 SQLite 数据库
- 不修改 arthurpower 业务代码（30 个 skill 之外的功能代码）
- 不绕过 CLAUDE.md "10-hook 不可 regress" 保护
- 不修改 `package-lock.json` 或 `node_modules`
- 不暴露任何 API key / token / 密码
- 不绕过 `arthurpower:verification-before-completion` 验证

---

## 7. Open Questions（待确认）

**所有问题已在 2026-07-25 会话中解决：**

- [x] **Q1**：CLI 名字 → `codebase-memory`（用户选择长名）
- [x] **Q2**：输出格式 → **默认 JSON（机器可读）**，`--human` 时输出人类可读表格
- [x] **Q3**：斜杠命令位置 → `~/.claude/commands/`（全局）
- [x] **Q4**：新 skill 是否需要 `references/` 子目录 → **不需要**
- [x] **Q5**：首次调用无索引时行为 → **不自动 index，报错提示**（退出码 5）

**额外确认**：
- [x] Serena **完全移除**（无 CLI 命令、无斜杠命令、无按需入口）— 用户明确确认

---

## 8. Out of Scope（不在范围内）

- 替换 codebase-memory 为 CodeGraph / 其他同类工具（用户明确要求完全移除 graph 工具品类）
- 重写 codebase-memory 二进制（用户已确认保留）
- 修改 arthurpower 30 个 skill 的业务逻辑（仅文档/引用层调整）
- 给 CLI 封装器加 CI/CD（用户未要求）
- 给 codebase-memory 加 GUI 或 Web UI
- 处理其他 MCP server（exa / minimax-search / scrapling 不在本任务范围）

---

## 9. References（参考）

- **调研证据**：
  - 本地：`~/.claude/hooks/cbm-session-reminder`、`~/.claude/skills/codebase-memory/SKILL.md`
  - 外部：[DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)、[colbymchenry/codegraph](https://github.com/colbymchenry/codegraph)
  - 历史决策：`docs/handoff/2026-07-14-full-cleanup-catalog.md`、`docs/handoff/2026-07-15-plugin-mcp-cleanup-final.md`、`docs/rules/workflow.md`
- **相关 ADR**：
  - ADR-0001 至 0018：项目历史决策（无 codebase-memory 相关 ADR）
  - 本次新增：0019
- **相关 skill**：
  - `arthurpower:verification-before-completion` — 完成前必走
  - `arthurpower:domain-modeling` — ADR 撰写入口
  - `arthurpower:minimal-change-verifier` — 改动面审查