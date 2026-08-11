# Arthurpower 技能体系 - 结构化使用文档

> 版本: v0.6.0 (2026-07-15)
> 适用: Claude Code 2.1.206 + arthurpower@arthurpower-local plugin
> 阅读对象: V (体系设计者与唯一权限持有者)
> 目的: 一份文档说清整个体系的设计思路 + 每个组件的触发方式 + 使用方法

---

## 目录

1. [整体设计思路](#1-整体设计思路)
2. [四大组件总览](#2-四大组件总览)
3. [触发机制详解](#3-触发机制详解)
4. [Skill 目录 - 26 个技能](#4-skill-目录---26-个技能)
5. [Agent 目录 - 2 个独立代理](#5-agent-目录---2-个独立代理)
6. [Command 目录 - 2 个斜杠命令](#6-command-目录---2-个斜杠命令)
7. [Hook 目录 - 物理执行层](#7-hook-目录---物理执行层)
8. [日常使用速查](#8-日常使用速查)
9. [常见问题](#9-常见问题)

---

## 1. 整体设计思路

### 1.1 体系定位

arthurpower 是一套**工程约束插件**(engineering constraint plugin), 不是功能插件。它的目标不是"让 Claude 能做更多事", 而是"让 Claude 做事时**不违反工程规范**"。核心矛盾: LLM 天然倾向快速产出代码, 但会跳过测试、吞异常、超复杂度、跨模块泄漏实现细节。arthurpower 用四层组件把这个倾向压住。

### 1.2 四层防御 + 一个主权

整个体系围绕一个核心信念: **完成 = 证据, 不是声明**。一句话决定 (`defend-claim` 体系): Claude 说"修好了"必须附实测证据(原始 exit code / stdout / sha256), 否则视为 phantom claim。这是整套体系的"心跳"。

| 层 | 组件 | 职责 | 触发时机 |
|----|------|------|---------|
| **L1 约束声明** | `CLAUDE.md` + `rules/*.md` | 静态规则, 每次会话加载 | session 启动 |
| **L2 技能注入** | 26 个 skill | 把规范变成可执行流程 | 按需(model 自动 reach 或人 `/` 触发) |
| **L3 物理拦截** | 12 user hook + 5 plugin hook | 框架级 exit 2 阻断 | 每次 tool call |
| **L4 独立代理** | 2 agent | 隔离上下文跑重活 | 主线程派发 |
| **主权闸门** | `domain-modeling` skill | 唯一可写 CONTEXT.md/ADR | 显式触发 |

### 1.3 六大治理族 (S1-S6)

26 个 skill 的"骨架"是 6 条二元判据, 每条对应一个 S 编号。这是 Parnas 1972 / Kent Beck / Robert Martin 几十年工程经验压缩成的可机器断言规则:

| 编号 | 规范 | 对应 skill | 二元判据核心 |
|------|------|-----------|-------------|
| S1 | 限界上下文 | bounded-context-guardian | 顶层目录不含 controllers/services/repositories; 无循环 import |
| S2 | 防御契约 | defensive-contract-validator | 空/负/超长/并发/异常 5 类边界都测 |
| S3 | 显式错误处理 | error-handling-enforcer | 无空 catch; 失败抛类型化异常不返回 null |
| S4 | 测试即规约 | (规则在 rules/s4-spec-as-test.md) | 测试先于实现 commit |
| S5 | 抗劣化简洁 | complexity-anti-drift | 圈复杂度≤10/函数; 嵌套≤4; 函数≤30 行 |
| S6 | 最小变更 | minimal-change-verifier | 1 commit = 1 逻辑任务; diff scope = 任务 scope |

**关键**: S1-S6 是**二元判据**(任一未通过 = FAIL), 不是"建议"。LLM 写的代码默认违反其中 2-3 条, 所以需要 skill + hook 双保险。

### 1.4 与 the baseline author skills 的关系

arthurpower 借鉴了 the baseline skills repo 仓库的两个核心设计:
1. **两轴分类**: User-invoked (`disable-model-invocation: true`, 人 `/` 触发, 零 context load) vs Model-invoked (描述含 rich trigger, 模型自动 reach)
2. **skill-authoring 规范**: 整套移植 the baseline 的 writing-great-skills (改 name + author, 主体一字不改)

但 arthurpower 保留了 the baseline 没有的: **hook 物理拦截层** + **defend-claim 证据体系** + **S1-S6 二元判据**。the baseline 靠 prompt 约束, arthurpower 靠 hook 物理阻断 - 这是两者的本质差异。

### 1.5 加载分布现状 (v0.6.0)

| 加载方式 | 数量 | 机制 |
|---------|------|------|
| Model-invoked (模型自动 reach) | 25 个 skill | description 含 "Use when..." rich trigger |
| User-invoked (人 `/` 触发) | 1 个 skill (skill-authoring) | `disable-model-invocation: true` |
| Command (人 `/` 触发) | 2 个 (/audit /fanout) | commands/*.md, 文件名即命令名 |
| Agent (主线程派发) | 2 个 | Task tool + subagent_type |
| Hook (物理拦截) | 5 plugin + 12 user | settings.json + hooks.json |

> **注意**: 当前 25/26 skill 是 model-invoked, 分类偏斜。完整分类调整提案见 `docs/Arthuropower_skill_classification.md` (待 V 拍板)。

---

## 2. 四大组件总览

### 2.1 组件对比表

| 组件 | 文件位置 | 触发者 | 物理形式 | 典型用途 |
|------|---------|--------|---------|---------|
| **Skill** | `skills/<name>/SKILL.md` | 模型自动 reach **或** 人 `/plugin:skill` | 注入 body 到当前 Claude | 规范流程(诊断/计划/审计) |
| **Command** | `commands/<name>.md` | 人 `/name` | 注入 body 到当前 Claude | 一次性入口(/audit) |
| **Agent** | `agents/<name>.md` | 主 Claude 用 Task tool 派发 | spawn 隔离 Claude 实例 | 重活隔离(audit/dispatch) |
| **Hook** | `hooks/*.cjs` + settings.json | 框架每次 tool call 自动跑 | 独立子进程, exit 2 阻断 | 物理拦截(空 catch/phantom cite) |

### 2.2 物理路径

```
C:\Users\<user>\.claude\plugins\marketplaces\arthurpower-local\plugins\arthurpower\
├── .claude-plugin\plugin.json          # 插件清单 (name/version/description)
├── skills\                              # 26 个技能目录
│   └── <skill-name>\SKILL.md
├── agents\                              # 2 个独立代理
│   ├── arthurpower-audit-agent.md
│   └── arthurpower-dispatcher.md
├── commands\                            # 2 个斜杠命令
│   ├── audit.md
│   └── fanout.md
├── hooks\                               # 5 个 PostToolUse + PreToolUse 闭环 gates
│   ├── hooks.json                       # hook 注册清单
│   ├── defend-claim-*.cjs (5 个)
│   └── lib\read-stdin-with-timeout.cjs  # 共享 stdin 读取器
├── SKILL.md                             # plugin 根 umbrella skill
├── CHANGELOG.md
└── docs\                                # 设计文档

C:\Users\<user>\.claude\hooks\            # user-level 12 hook (与 plugin 分离)
├── pre-context-write-guard.cjs          # CONTEXT.md 写入主权
├── pre-stale-read.cjs                   # 过期读守卫
├── pre-read-contract.cjs                # 读侧契约
├── ... (共 12 个)
└── lib\read-stdin-with-timeout.cjs      # user-level 共享 stdin 读取器
```

> **两处副本**: framework 校验读 `marketplaces\` 副本, 运行用 `cache\arthurpower-local\arthurpower\0.6.0\` 副本。两处必须完全一致(改时同步)。

---

## 3. 触发机制详解

### 3.1 三种调用形式 (核心, 务必理解)

| 调用形式 | 谁触发 | 写法 | 对 disable-model-invocation: true |
|---------|--------|------|-----------------------------------|
| **Skill tool call** | Claude 主 AI 主动调 | 代码里 `Skill(arthurpower:foo)` | **拒绝**(报错 "cannot be used with Skill tool") |
| **Slash command** | **人手动输入** | 输入框敲 `/arthurpower:foo` | **正常触发** ✓ |
| **模型自动 reach** | 模型读 description 匹配 | 无显式调用, 模型自己决定 | 需要 disable 为 false |

**关键区分**:
- `disable-model-invocation: true` 屏蔽的是 **Skill tool call + 模型自动 reach**, 但**不屏蔽** slash command
- 想给 Claude 主动调的 skill -> 设 `disable-model-invocation: false` (或省略)
- 想只让人调的 skill -> 设 `disable-model-invocation: true` + 人用 `/arthurpower:skill-name`

### 3.2 plugin skill 的命名空间

plugin 里的 skill 自动加 plugin 名前缀:
- skill 目录名 `skill-authoring` -> 调用名 `arthurpower:skill-authoring`
- slash 形式 `/arthurpower:skill-authoring`
- 这是为了避免和其它 plugin 同名 skill 冲突

### 3.3 各组件触发对照

| 我想做... | 触发方式 | 示例 |
|----------|---------|------|
| 让 Claude 自动用某规范 | 什么都不做, 描述匹配就 reach | "这个函数太长了" -> 模型自动 reach complexity-anti-drift |
| 我手动启动一个规范流程 | 输入 `/arthurpower:skill-name` | `/arthurpower:writing-plans` |
| 我跑一次性审计 | 输入 `/audit` | `/audit src/auth/` |
| 我派隔离代理跑重活 | 让 Claude "用 audit agent 审" | Claude 自动 Task(arthurpower-audit-agent) |
| 物理阻止违规 | 什么都不做, hook 自动拦 | 写空 catch -> PostToolUse hook exit 2 阻断 |

---

## 4. Skill 目录 - 26 个技能

> 触发方式列: **M** = Model-invoked (模型自动 reach + 人可 `/`); **U** = User-invoked (仅人 `/` 触发, 模型不可 reach)

### 4.1 S1-S6 治理族 (6 个, 工程规范核心)

| Skill | 触发 | 使用方法 |
|-------|------|---------|
| **bounded-context-guardian** | M | 切模块/重构跨文件/检测循环 import 时模型自动 reach。检查顶层目录无 controllers/services, 无反向依赖 |
| **defensive-contract-validator** | M | 加公共 API/修 bug/引依赖时 reach。给代码出 5 类边界测试(空/负/超长/并发/异常) |
| **error-handling-enforcer** | M | 改错误处理/加 try-catch/返回 null 时 reach。强制类型化异常, 禁空 catch |
| **complexity-anti-drift** | M | 函数超 30 行/10 分支/4+ 嵌套时 reach。给重构模式(提取 helper) |
| **minimal-change-verifier** | M | 准备 commit/拆 commit/加依赖时 reach。验 1 commit=1 任务, diff scope=任务 scope |
| *(S4 测试即规约)* | - | 规则在 `rules/s4-spec-as-test.md`, 无独立 skill, 由 defensive-contract-validator 覆盖 |

### 4.2 架构与计划族 (4 个)

| Skill | 触发 | 使用方法 |
|-------|------|---------|
| **architecture-change-reviewer** | M | 加新功能/新模块/跨模块重构(3+ 文件)前 reach。5-verdict 前置 gate (approve/reject/needs-info/split/defer) |
| **writing-plans** | M | 新项目/加功能/跨文件改动/多步变更时 reach。把工作拆成有序可验证任务 |

### 4.3 流程门族 (4 个)

| Skill | 触发 | 使用方法 |
|-------|------|---------|
| **verification-before-completion** | M | 要声明完成/done/fixed/成功前 reach。强制证据(原始 exit code/stdout/sha256) |
| **systematic-debugging** | M | 调试测试失败/build break/运行时错误/flaky/挂起时 reach。4 阶段根因定位 |
| **defend-claim** | M | 要报告完成/成功/已验证前, 或 git commit/push 前 reach。Q1 证据(实测) + Q2 引用真实 + Q3 报告三元组 + Q4 实体一致 + Q5 无静默失败 |
| **deep-dive-protocol** | M | 需求模糊/要盘问/质询时 reach。会话中每解析术语写 CONTEXT.md, 每识别难逆决策提 ADR |

### 4.4 调度族 (1 个)

| Skill | 触发 | 使用方法 |
|-------|------|---------|
| **dispatching-parallel-agents** | M | 2+ 独立任务无共享可变状态/要上下文隔离/批量审多文件时 reach。派并行子代理 |

### 4.5 工程学科族 (1 个, v0.3.0 晋升)

| Skill | 触发 | 使用方法 |
|-------|------|---------|
| **spec-driven-development** | M | 新项目/功能无 spec/需求模糊/跨文件跨天时 reach。SPECIFY 阶段产出可验证 spec |

> v0.12.0 起 frontend-ui-engineering / performance-optimization / security-and-hardening 三个工程纪律 skill 迁出本插件到全局 `~/.claude/skills/` 并标记为 user-invoked（`disable-model-invocation: true`），需操作者手动触发。详见 arthurpower/CHANGELOG.md v0.12.0 条目。

### 4.6 上下文工程族 (4 个)

| Skill | 触发 | 使用方法 |
|-------|------|---------|
| **domain-modeling** | M | **唯一**可写 docs/CONTEXT.md + 提议 ADR。术语歧义/难逆决策时 reach |
| **session-handoff** | M | session 要结束/新 agent 继续/token 压力时 reach。压缩线程成交接文档 |
| **intent-inference** | M | 请求模糊/欠指定/混合多目标时 reach。推断意图 + 确认问题, 交接给 deep-dive-protocol |

### 4.7 路由与元族 (2 个)

| Skill | 触发 | 使用方法 |
|-------|------|---------|
| **using-agent-skills** | M | 新 session/切任务/不知用哪个 skill 时 reach。路由 flowchart 分发到匹配 skill |
| **issue-triage-validator** | M | 收到外部请求流/外部 PR/支持项要分类时 reach。决定 category/state/owner/next action |

### 4.8 支持族 (1 个, User-invoked)

| Skill | 触发 | 使用方法 |
|-------|------|---------|
| **skill-authoring** | **U** | **人输入 `/arthurpower:skill-authoring`**。写/编辑 skill 的规范参考(the baseline writing-great-skills 移植)。**注意**: 不能用 `Skill(arthurpower:skill-authoring)` tool call, 会被 disable-model-invocation 拒绝 |

---

## 5. Agent 目录 - 2 个独立代理

> Agent = Task tool 派发的隔离 Claude 实例。主线程派发, 不污染主上下文。触发: 主 Claude 识别场景后用 Task tool, 或 V 说"用 X agent"。

### 5.1 arthurpower-audit-agent

| 项 | 值 |
|----|----|
| 触发 | V 说"audit this change"/"run S1-S6 check"/"maintainability review", 或主 Claude 识别要隔离审计 |
| 调用 | Task(arthurpower-audit-agent) (主 Claude 派发) |
| 工具 | Read, Grep, Glob, Bash (只读, 不改源) |
| 职责 | 对 diff/改动文件集跑 S1-S6 + verification-before-completion, 返回每规则 PASS/FAIL + file:line 证据 |
| 与 /audit 关系 | /audit 是命令入口, 这个 agent 是隔离执行体。/audit 内部派发这个 agent |
| 使用场景 | commit 前审计 / refactor 后 scope 审计 / PR review |

### 5.2 arthurpower-dispatcher

| 项 | 值 |
|----|----|
| 触发 | V 说"fan out"/"dispatch parallel agents"/"run these in parallel", 或主 Claude 识别 2+ 独立检查 |
| 调用 | Task(arthurpower-dispatcher) |
| 工具 | Read, Grep, Glob, Bash, Agent (能再派子代理) |
| 职责 | 把独立任务 fan-out 到并行子代理, 合并 PASS/FAIL 结果。包装 dispatching-parallel-agents skill |
| 使用场景 | "S1 查 module A; S3 查 module B; S5 查 module C" 并行 |
| 门控 | 仅当 2+ 任务无共享可变状态 + 无序依赖 + 合并可交换时才 fan-out, 否则串行 |

---

## 6. Command 目录 - 2 个斜杠命令

> Command = 人手动 `/name` 触发, 注入 body 到当前 Claude。文件名即命令名。

### 6.1 /audit

| 项 | 值 |
|----|----|
| 触发 | 人输入 `/audit [可选: 文件或目录]` |
| 参数 | `[optional: file or directory to scope the audit]` |
| 工具 | Read, Grep, Glob, Bash |
| 职责 | 对当前 diff(或指定文件/目录)跑 S1-S6 + verification gate, 返回每规则 PASS/FAIL + 证据 |
| 内部 | 派发 arthurpower-audit-agent 隔离执行 |
| 使用 | `/audit` (当前 diff) / `/audit src/auth/` (scope 到模块) / PR review 时 `/audit` |

### 6.2 /fanout

| 项 | 值 |
|----|----|
| 触发 | 人输入 `/fanout <check1; check2; ...>` |
| 参数 | `<check1; check2; ...>` (分号分隔独立任务) |
| 工具 | Read, Grep, Glob, Bash, Agent |
| 职责 | 派 N 个独立 arthurpower 检查到并行子代理, 合并 PASS/FAIL |
| 内部 | 派发 arthurpower-dispatcher |
| 使用 | `/fanout S1 check on src/auth/; S3 check on src/api/; S5 check on src/db/` |
| 不适用 | 任务互相依赖(B 需要 A 结果) / 单任务 / 共享可变状态 |

---

## 7. Hook 目录 - 物理执行层

> Hook = 框架每次 tool call 自动跑的独立子进程。exit 2 = 阻断 tool, exit 0 = 放行。这是唯一能**物理阻止** Claude 违规的层(prompt 约束长会话会被忽略, hook 不会)。

### 7.1 plugin hook (5 个, 在 plugin hooks.json)

| Hook | 事件 | matcher | 职责 | exit 2 条件 |
|------|------|---------|------|------------|
| **defend-claim-execution** | PostToolUse | Bash | Q1 执行捕获: curl/pytest/npm test 等执行后检查 tool_response 是否捕获 | 仅 advisory(不阻断), 提示捕获 stdout/stderr/exit code |
| **defend-claim-cite-integrity** | PostToolUse | Edit/Write | Q2 引用真实: 检查代码里 `file:line` 引用的文件/行是否真实存在 | 引用的文件不存在或行号越界 -> REJECTED |
| **defend-claim-report-triple** | PostToolUse | Write | Q3 报告三元组: 源码文件含"完成/成功/done/fixed"等叙事词时, 必须含 action-verb+artifact+outcome | 叙事词无证据三元组 -> REJECTED |
| **defend-claim-dumb-zone** | PostToolUse | Edit/Write | Q4 实体一致: 每 10 turn 提示重新 grep 引用实体检测漂移 | 仅 advisory(每 10 turn), 不阻断 |
| **defend-claim-silent-fail** | PostToolUse | Write | Q5 无静默失败: 检测 `except: pass` / `catch {}` / `=> null;` | 空 except:pass / 空 catch{} -> REJECTED; null return -> warning |

### 7.2 user-level hook (12 个, 在 ~/.claude/hooks/, settings.json 注册)

> 这些不在 arthurpower plugin 里, 但属于同一个体系(context-loop 闭环)。改它们改 settings.json + 文件, 不改 plugin。

| Hook | 事件 | 职责 |
|------|------|------|
| **pre-context-write-guard** | PreToolUse Write/Edit/Bash | CONTEXT.md/CONTEXT-MAP.md/team-glossary.md/ADR 只能 domain-modeling 写, 其它 skill 写 -> BLOCKED |
| **pre-stale-read** | PreToolUse Write/Edit/Bash | 读 CONTEXT.md 前检查 mtime 是否过期, 过期 -> advisory 提示先读 |
| **pre-read-contract** | PreToolUse Write/Edit/Bash | 读侧契约: 非平凡任务前必读 CONTEXT.md + ADR |
| **post-ssot-priority** | PostToolUse Write/Edit/Bash | SSOT 优先级: 同事实多处记载时提示单一事实源 |
| **post-conflict-annotation** | PostToolUse .* | 输出与 ADR 矛盾时强制标注 "Contradicts ADR-NNNN" |
| **post-tool-no-empty-catch** | (已删除) | 空 catch 检测已合并进 plugin defend-claim-silent-fail |
| **post-push-task-end** | PostToolUse Bash | git push 后提示任务收尾 |
| **pre-tool-s1-bounded-context** | PreToolUse Bash | S1 限界上下文检查 |
| **pre-tool-supply-chain** | PreToolUse Bash | 供应链检查(新依赖) |
| **pre-tool-s2-test-gate** | PreToolUse Write/Edit | S2 测试门(红测试先于实现) |
| **token-counter** | PreToolUse .* | token 计数提醒 |
| **lifecycle-hook** | PreToolUse .* | 生命周期追踪 |

### 7.3 共享 stdin 读取器

`hooks/lib/read-stdin-with-timeout.cjs` (plugin 副本) + `~/.claude/hooks/lib/` (user 副本):
- 1s grace sliding window 读 stdin
- 解决 Claude Code hook runner 不调 stdin.end() 导致的挂起 bug
- 5 plugin hook + 12 user hook 都委托它
- **新 hook 必须默认用它**, 不要重新写 `for await` 模式

---

## 8. 日常使用速查

### 8.1 我想... -> 用什么

| 我想... | 用什么 | 触发 |
|--------|--------|------|
| 不知用哪个 skill | using-agent-skills | 模型自动 reach, 或 `/arthurpower:using-agent-skills` |
| 需求模糊要澄清 | deep-dive-protocol | 模型自动 reach |
| 写新功能前规划 | writing-plans | 模型自动 reach |
| 跨模块重构前置 gate | architecture-change-reviewer | 模型自动 reach |
| 调 bug | systematic-debugging | 模型自动 reach |
| 声明完成前要证据 | verification-before-completion / defend-claim | 模型自动 reach |
| 一次性审计 | /audit | 人输入 `/audit` |
| 并行跑多个检查 | /fanout | 人输入 `/fanout a; b; c` |
| 写新 skill | skill-authoring | **人输入 `/arthurpower:skill-authoring`** (唯一 user-invoked) |
| session 交接 | session-handoff | 模型自动 reach |
| 派隔离代理审计 | arthurpower-audit-agent | 让 Claude "用 audit agent" |

### 8.2 常见违规 -> hook 怎么拦

| Claude 想做... | 被哪个 hook 拦 |
|---------------|--------------|
| 写空 `catch {}` / `catch (e) {}` | defend-claim-silent-fail (plugin, 已合并) |
| 写 `except: pass` | defend-claim-silent-fail (plugin) |
| 报告"完成"但无证据 | defend-claim-report-triple (plugin) + defend-claim (skill) |
| 引用不存在的 file:line | defend-claim-cite-integrity (plugin) |
| 写 CONTEXT.md 绕过 domain-modeling | pre-context-write-guard (user) |
| commit 混 refactor+feat | (S6 minimal-change-verifier skill, 无 hook 物理拦) |

### 8.3 典型工作流

**新功能开发**:
```
1. (模型自动) intent-inference -> 推断意图
2. (模型自动) deep-dive-protocol -> 澄清需求, 写 CONTEXT.md
3. (模型自动) writing-plans -> 拆任务
4. (模型自动) spec-driven-development -> 写 spec
5. (模型自动) architecture-change-reviewer -> 前置 gate
6. 实现时: bounded-context-guardian + defensive-contract-validator + complexity-anti-drift 自动 reach
7. (模型自动) verification-before-completion + defend-claim -> 完成前要证据
8. 人输入 /audit -> commit 前审计
```

**调试 bug**:
```
1. (模型自动) systematic-debugging -> 4 阶段根因
2. (模型自动) defensive-contract-validator -> 补边界测试
3. (模型自动) verification-before-completion -> 修复后要证据
```

**session 交接**:
```
1. (模型自动) session-handoff -> 压缩成交接文档
2. 新 session 读 docs/handoff/ 继续
```

---

## 9. 常见问题

### Q1: `/arthurpower:skill-authoring` 和 `Skill(arthurpower:skill-authoring)` 有什么区别?

- `/arthurpower:skill-authoring` = **人手动输入**的 slash command, 正常触发 ✓
- `Skill(arthurpower:skill-authoring)` = Claude 主 AI 用 Skill tool 调, 被 `disable-model-invocation: true` **拒绝**(报错 "cannot be used with Skill tool")
- skill-authoring 是 user-invoked, 只能人 `/` 触发

### Q2: 为什么大多数 skill 不用 `/` 触发?

25/26 skill 是 model-invoked, description 含 "Use when..." rich trigger, 模型读 description 自动 reach。人不需要手动 `/`, 模型会自己选。只有 skill-authoring 是 user-invoked(刻意设计: 写 skill 是元操作, 不应被模型自动触发干扰主任务)。

### Q3: hook 报 "No stderr output" 怎么办?

这是子会话偶发的时序问题(hook 链路里某个 hook 偶发挂起, 框架 timeout 后 stderr 空)。当前会话通常不复现。若频繁出现, 检查 hook 是否还用旧的 `for await` 模式(应已全委托 `hooks/lib/read-stdin-with-timeout.cjs`)。

### Q4: 改 plugin 后不生效?

两处副本必须同步:
- `marketplaces\arthurpower-local\plugins\arthurpower\` (framework 校验读)
- `cache\arthurpower-local\arthurpower\0.6.0\` (运行用)
- 改完跑 `claude plugin list` 看 Status 是否 ✔ enabled
- 若 failed to load, 跑 `claude plugin list` CLI(TUI /plugin 看不到错误详情)

### Q5: 怎么加新 skill?

1. `mkdir skills/<new-skill>/`
2. 写 `SKILL.md` (参照 skill-authoring 规范)
3. frontmatter 决定加载方式:
   - 模型自动 reach: 省略 disable-model-invocation, description 写 "Use when..."
   - 仅人触发: `disable-model-invocation: true`, 人用 `/arthurpower:<new-skill>`
4. framework 自动扫描 skills/ 目录发现, **不用**改 plugin.json 的 skills 字段(那字段 schema 非法, 会让整个 plugin failed to load)
5. 两处副本同步

### Q6: 怎么加新 hook?

1. 写 `hooks/<name>.cjs`, **必须** `require('./lib/read-stdin-with-timeout.cjs').readStdin`
2. 在 `hooks/hooks.json` 注册(plugin hook) 或 `settings.json` 的 hooks 段(user hook)
3. 两处副本同步
4. 跑 driver-level 复现验证(must use manual poll, not communicate())

### Q7: agent 和 skill 怎么选?

- **skill**: 注入 body 到当前 Claude, 共享上下文, 适合规范流程(诊断/计划)
- **agent**: spawn 隔离 Claude 实例, 独立上下文, 适合重活(audit 全代码库)或要并行(dispatcher)
- 重活用 agent 避免污染主线程; 轻量规范用 skill

---

## 附录: 文件清单 (v0.6.0)

### Skill (28)

> v0.6.0 起点快照含三件套 commit-revert-protocol / team-glossary-sync / codebase-onboarding / frontend-ui-engineering / performance-optimization / security-and-hardening 与 defend-claim skill。

architecture-change-reviewer / bounded-context-guardian / codebase-onboarding / commit-revert-protocol / complexity-anti-drift / deep-dive-protocol / defend-claim / defensive-contract-validator / dispatching-parallel-agents / domain-modeling / error-handling-enforcer / frontend-ui-engineering / intent-inference / issue-triage-validator / minimal-change-verifier / performance-optimization / security-and-hardening / session-handoff / skill-authoring (U) / spec-driven-development / systematic-debugging / team-glossary-sync / using-agent-skills / verification-before-completion / writing-plans

> 注：v0.12.x 起 SC-01 归档 commit-revert-protocol / team-glossary-sync / codebase-onboarding；SC-03 defend-claim skill 拆到 docs page (ADR-0025, hooks 保留)；SC-02 frontend-ui-engineering / performance-optimization / security-and-hardening 迁出至全局 user-invoked。intent-inference / issue-triage-validator 为历史漂移残留（76868e3 已删），归 SC-05 清理。

### Agent (2)
arthurpower-audit-agent / arthurpower-dispatcher

### Command (2)
/audit / /fanout

### Hook (5 plugin + 12 user)
plugin: defend-claim-execution / -cite-integrity / -dumb-zone / -report-triple / -silent-fail
user: pre-context-write-guard / pre-stale-read / pre-read-contract / post-ssot-priority / post-conflict-annotation / post-push-task-end / pre-tool-s1-bounded-context / pre-tool-supply-chain / pre-tool-s2-test-gate / token-counter / lifecycle-hook

### 相关文档
- `docs/version_diff.md` - the baseline 1.0/1.1/1.2 调研
- `docs/Arthuropower_skill_classification.md` - 分类提案(待 V 拍板)
- `docs/Regress_v060_report.md` - v0.6.0 回归报告
- `CHANGELOG.md` - 完整变更历史
- `~/.claude/CLAUDE.md` + `rules/*.md` - L1 静态规则层
