# 2026-08-12 implementer-agent 注册留档

## 问题诊断

全局 CLAUDE.md 的执行偏好段声明「子代理按编译耦合边界拆分派发，探索与实施均派」，但只有 `Explore`（read-only）是具名 agent type。模型看到「探索」能映射到 `Explore`，看到「实施」却找不到具名目标，于是默认由 main 自跑实施 —— 与「实施也派发」的意图不一致。

根因：**dispatch 规则没有为实施钉一个 write-capable 的具名 agent**。

## 变更

| 文件                              | 变更                                                              |
| --------------------------------- | ----------------------------------------------------------------- |
| `~/.claude/agents/implementer.md` | 新建 implementer agent（1 逻辑任务 / 1 模块作用域）               |
| `~/.claude/CLAUDE.md` 执行偏好段  | 派发描述补齐：「探索派 Explore（read-only），实施派 implementer」 |
| `~/.claude/agents/README.md`      | persona 表新增 implementer 行                                     |

## 职责边界

| 做                                                                   | 不做                                            |
| -------------------------------------------------------------------- | ----------------------------------------------- |
| 在指定模块内实现 1 个逻辑任务（feature / bug fix / refactor）        | 超出指定作用域的相邻清理（独立任务）            |
| 写代码 + 配套测试，遵循 TDD（`arthurpower:test-driven-development`） | 跨模块大改（按模块各派 1 个 implementer）       |
| 返回可验证证据（真实命令 + 输出 + exit code）                        | 逐字转述（paraphrased output 不算证据）         |
| 先读项目规则（CLAUDE.md / code-quality / test）再动手                | 从另一个 persona 被调用（persona 不调 persona） |

## 反冗余设计（SSOT 指针式）

implementer.md **不重述** CLAUDE.md / rules 的内容，只做三处指针：

- TDD 细节 → 指向 `arthurpower:test-driven-development` skill
- 编码规范 → 指向 `.claude/rules/code-quality.md` / `test.md`
- 完成门 → 由主线程在 commit 前走 `arthurpower:code-review`

避免规则漂移：agent body 保持薄（1685B，远 ≤4KB），纪律靠指针引用而不是复制粘贴。

## 验证状态

- File existence：三个文件均落盘 ✅
- Frontmatter：`name` / `description` 字段匹配 `test-engineer.md` 风格 ✅
- Generics grep suite（no-meta-specific 6 项）对三个更新文件：0/0/0/0/0/0 全绿 ✅
- Agent 注册：重启 session 后 `subagent_type: "implementer"` 不再报 not found ✅（本 session 的 Agent 工具已出现 implementer 类型）

## 后续观察

- implementer 首次真实派发（跨模块写动作）后，核对「作用域保持」与「证据回执」是否符合契约；不满足再回来调 agent body。
- 若实施派发频率高，可考虑 `implementer` 进入插件路由表；目前只在全局 CLAUDE.md 派发描述中出现。
