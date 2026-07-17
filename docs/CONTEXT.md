# Arthurpower - 领域词汇表

> 本文件是项目领域词汇的**单一事实源 (SSOT)**.
> 仅 `domain-modeling` 技能可写; 其他技能按 `docs/agents/context-contract.md` 消费.

---

## Language

**对照分析**: 在 Claude Code 生态里把 arthurpower 自研技能与官方同类技能并排读取, 按"怎么用比较好"标尺评判差异.
_Avoid_: 通用对比, 规范审计.

**对比标尺**: 用 V 实测工作流数据 (Skill 工具调用统计 / 跨项目 grep) + 内容实测 (Read SKILL.md / agent.md 全文) 两个证据源, 判定"哪个对 V 日常更好用". 不只看规范出处.
_Avoid_: 纯合规审计, 凭印象.

**反向吸收**: 是否值得把官方能力 (如 plugin-validator 的 10 步结构校验流程) 借鉴进 arthurpower 自研, 取长补短, 不替换.
_Avoid_: 替换, 覆盖.

**触及报告**: 当用户说"分析后给报告"或"对比后给结论"时, 先 Read 真实内容 + 落盘触及术语到 CONTEXT.md, 再写报告; 报告不是最终决断, 是下一个动作的输入.
_Avoid_: 凭印象报告, 跳过术语落盘.

**Skill 触发机制**: Claude Code 的 skill 触发由 Claude (主 AI) 自己根据 description (已经在 always-on context 里) 做自然语言匹配, 不是向量检索也不是脚本搜索; 触发后是 Skill tool 注入 body 到当前 Claude, 还是 Task tool spawn 隔离 subagent, 取决于 skill 还是 agent.
_Avoid_: 脚本匹配, 嵌入搜索, 被动触发.

**有状态化技能**: 同一输入在不同 session 跑出不同输出, 因为依赖持久化状态 (文件 / mtime / session_id / git state / 跨 session 持有引用); 典型例子: hook 读 .claude/*.local.md、deep-dive 写 CONTEXT.md、commit 检查读当前 diff.
_Avoid_: 无状态, 纯函数.

**无状态化技能**: 同一输入在任意 session 输出等效, 不依赖本地运行环境状态; 典型例子: defensive-contract-validator 给一段代码出测试、minimal-change-verifier 仅看当前 diff 出"是否规范".
_Avoid_: 状态耦合, 跨 session 副作用.

**状态边界清单**: 在 skill 的 references/ 文档里加一个两栏 checklist (有状态化步骤打勾 + 无状态化前提打勾), 写 skill 时按需查, 不分两套 skill 模板.
_Avoid_: 按有/无状态硬切两套 skill, 双模板.

**agent vs skill 物理分辨**: 看主对话里的 tool call 名字 - Task tool + subagent_type 字段 -> agent (隔离 Claude 实例); Skill tool + skill 名 -> skill (注入 body 到当前 Claude); Bash/Read/Edit -> 主 Claude 自己. 没有 Task tool = 没有 spawn.
_Avoid_: 看名字像不像, 看 .md 文件名猜.

---

**三层验证体系**: skill 编写后的验证分三层, 各管各不重叠. (1) 静态结构 = `validate_skill.py` 验 SKILL.md 格式合规 (frontmatter / 段 / 长度 / no-meta-specific), 写完手动跑. (2) 动态响应 = `run_skill_eval.py` + `evals.json` 验 skill 触发后产出对不对 (rubric must_include / must_not 跟响应文本 match). (3) 文件内容 = `driver.py` 验 SKILL.md 真实文件含/不含规范关键词 (读真文件 keyword match). 三层互补不冲突.
_Avoid_: validator 当运行时门禁, driver 当真实路由, dry-run 当真实 subagent.

**移植 vs 蒸馏**: 移植 = 整套拉别人 skill (SKILL.md + GLOSSARY.md 等) 改 name + author 加自己署名, 主体一字不改. 蒸馏 = 按自己规范重写, 取长补短加自己独有的. 本 session skill-authoring 走移植 (the baseline author writing-great-skills 骨架 + Eval System 段), hook-development 走蒸馏 (官方 712 行压缩成 arthurpower 风格 + V 踩坑纪律).
_Avoid_: 移植当蒸馏 (假装重写实际抄), 蒸馏当移植 (假装抄实际丢精华).

**reference skill**: disable-model-invocation: true 的 skill, 主体是 flat reference (术语 / 概念 / 规则), 不是 procedural 指令. the baseline author writing-great-skills 是典型 reference skill. validator 对 reference skill 豁免 procedure 段必填 (When to use / Procedure / Acceptance Criteria / Verification) 和 Skill type / Bar level 声明.
_Avoid_: reference skill 强必填 procedure 段, reference skill 当 discipline skill 验.
**plugin 三段注册机制**: Claude Code 2.1.206 启动时按 `known_marketplaces.json` -> `installed_plugins.json` -> `settings.json enabledPlugins` 三段判定 plugin 是否加载. 缺任一段 -> plugin 静默忽略, Skill tool 返回 Unknown. 已启用 plugin 物理文件在 `cache/<marketplace>/<plugin>/<version>/` 下 (installPath 指向 cache), 但 framework 校验 plugin.json 读的是 `marketplaces/<marketplace>/plugins/<plugin>/.claude-plugin/plugin.json` -- 两处副本都得合规.
_Avoid_: 只改 settings.json enabledPlugins 就期望 plugin work; 只改 cache 副本忘了 marketplaces 副本 (校验读的是后者).

**plugin skills 字段路径格式**: plugin.json 的 `skills` 字段接受**相对目录路径**字符串数组. 合法格式分两阶段: 平铺阶段 = `./skills/<skill-name>`; 分桶阶段 = `./skills/<bucket>/<skill-name>`. 不接受裸 skill 名或不含 `./` 的路径, 这两种写法会被 framework 报 `Validation errors: skills: Invalid input` + `Path not found` 并让整个 plugin failed to load. 删字段后 framework 回退目录扫描也 work, 但若分桶后要排除 in-progress / deprecated 桶, 必须用显式数组做 curated allowlist.
_Avoid_: 在 plugin.json 写裸 skill 名 (如 `"bounded-context-guardian"`); 写不含 `./` 的相对路径 (如 `"skills/<name>"`); 看到 "删 `skills` 字段后 plugin work" 就总结 "数组 schema 不支持" (实际是路径格式错, 数组本身合法).

**plugin load error 可观测性**: `/reload-plugins` 和 TUI `/plugin` 只显示 "1 error during load" 计数, 不显示错误详情 (TUI 输出空). 但 CLI `claude plugin list` 输出每个 plugin 的 Status + Error 字段 (含 manifest 路径和 `Validation errors: <field>: <reason>`), 是排查 plugin failed to load 的唯一可靠入口.
_Avoid_: 在 TUI 里反复 `/plugin` 找错误详情 (空输出); 看到 "/reload-plugins: 1 error" 就猜根因不跑 `claude plugin list`.

**plugin cache 孤儿标记**: framework 把无法正确映射的 cache 条目标记 `.orphaned_at` (内容是毫秒时间戳). 该标记存在于 `cache/<marketplace>/<plugin>/<version>/.orphaned_at`. 修好 manifest 后需手动删 `.orphaned_at`, 否则 framework 可能继续把条目当孤儿不重新评估.
_Avoid_: 改了 manifest 就期望 framework 自动重新加载, 不检查 `.orphaned_at` 是否残留.

**marketplace.json source 字段双格式**: 官方 marketplace.json 里远程 plugin 用对象格式 `{source: "git-subdir", url, path, ref, sha}`, 本地 plugin 用字符串格式 `"./plugins/<name>"` (跟 agent-sdk-dev 一致). 两种格式 framework 都认. known_marketplaces.json 的 marketplace-level source 用 `{source: "directory", path: "..."}` (绝对路径), 用 `"local"` 会让 CLI 启动挂死 (issue #25693).
_Avoid_: 用 `source: "local"` (挂死 bug); marketplace.json 本地 plugin 用对象格式.

**MCP 三层定义 + 审批分离**: MCP server 配置分定义层和审批层, 两层文件不同. (1) 定义层: `~/.claude.json.mcpServers` (user scope, 所有项目共享) + `~/.claude.json.projects.<path>.mcpServers` (local scope, 按项目路径隔离) + `<project>/.claude/.mcp.json` (project scope, git 共享). (2) 审批层: settings.json 系列的 `enabledMcpjsonServers` (白名单 approve). 定义和审批不在同一文件 - 定义在 .claude.json/.mcp.json, 审批在 settings.json. 一个 server 有定义但无审批 = Pending approval (不启).
_Avoid_: 把 enabledMcpjsonServers 写进 .mcp.json 或 .claude.json.mcpServers (字段不属于那); 以为 .mcp.json 定义了就自动启 (还得 enabledMcpjsonServers approve).

**MCP server 三 scope 存储位置**: 官方 MCP 文档 scope 表: User scope (所有项目共享) 存 `~/.claude.json` 顶层 mcpServers; Local scope (当前项目, 私有) 存 `~/.claude.json.projects.<path>.mcpServers` (按项目路径嵌套, Local scope 也写在 ~/.claude.json 不是项目目录); Project scope (git 共享) 存 `<project>/.mcp.json`. "local" 一词歧义: MCP local scope 在 ~/.claude.json (home 目录), 通用 local settings 在 .claude/settings.local.json (项目目录), 两者不同文件.
_Avoid_: 把 Local scope MCP 写到 .claude/settings.local.json (那是 settings 不是 mcpServers); 混淆 MCP local scope 跟 settings local scope.

**enabledMcpjsonServers 合并语义 + 项目级覆盖失效**: settings.json 系列的 `enabledMcpjsonServers` 数组在多 scope 间是**合并**不是替换 (官方 settings 文档: "Arrays are merged across all settings scopes"). 后果: 用户级 settings.json enabledMcpjsonServers=[A,B,C] + 项目级 settings.local.json enabledMcpjsonServers=[D] -> 合并 = [A,B,C,D]. 项目级无法用 enabledMcpjsonServers "取消" 用户级已 approve 的 server (合并只会加不会减). 想在项目内禁用全局已启的 server, 只能用 `deniedMcpServers` (denylist, 优先于 allowlist).
_Avoid_: 试图用项目级 enabledMcpjsonServers=[] 或不列某 server 来禁用它 (合并语义下无效); 试图用 `disabledMcpjsonServers` (v2.1.206 bug 字段, issue #58874, closed as not planned, 不生效).

**deniedMcpServers vs disabledMcpjsonServers**: 两个易混字段, 格式和效力完全不同. `disabledMcpjsonServers` = 字符串数组 `["X"]`, 官方说 "reject from .mcp.json", 但 v2.1.206 实测不生效 (issue #58874 bug, closed as not planned). `deniedMcpServers` = **对象数组** `[{ "serverName": "X" }]`, 官方 managed-mcp 文档承诺 "denylist always merges from every source" + "Nothing overrides a denylist match" + 优先于 allowlist. 格式错 (字符串 vs 对象) 或选错字段都会让禁用静默失效. 项目内禁全局已启 server 必须用 deniedMcpServers (对象数组).
_Avoid_: 用 disabledMcpjsonServers (bug 字段); 用字符串数组格式给 deniedMcpServers (必须对象数组); 以为 disabledMcpjsonServers 跟 deniedMcpServers 等价.

**MCP 启动状态四态**: /mcp 显示 server 状态有 4 种: ✔ connected (定义+批准+启动成功), ◯ connecting… (启动中, npx 首次下载/OAuth 远程认证会慢, 非错误), ✘ Failed to connect (启动失败, 如 OAuth 未授权 / 命令不存在 / 网络不通), ⏸ Pending approval (有定义但未批准, untrusted folder 中 enabledMcpjsonServers 被 ignore). 用 `claude mcp get <name>` 看单 server 真状态 (含 Scope + Status + 错误原因), 比 /mcp TUI 详细.
_Avoid_: 把 connecting… 当错误 (npx 首次启动正常慢); 不区分 Failed to connect (启动失败) 跟 Pending approval (未批准).

**三体 S1-S6 决策位置分工**: arthurpower 体系里 3 个资产都审 S1-S6, 靠**时点 + 作用域**分工不合并. (1) 改前 plan gate = `arthurpower:architecture-change-reviewer` skill (5 verdict: S1-S3+S5+S6); (2) 改后预 commit 通用审查 = `arthurpower:code-review` skill (调 v-code-review CLI, 双维度 + Fowler smell, 通用 Git diff); (3) 改后预 commit arthurpower 自身审计 = `arthurpower-audit-agent` agent (S1-S6 6 规范, 限 plugin 自身); (4) pre-merge 第三段 = `maintainability-reviewer` user agent (S1-S6 6 规范, 通用项目). 同职能跨 harness 层靠作用域区分.
_Avoid_: 三体合并成一个 skill; 把 audit-agent 当通用项目审查 (它限 arthurpower 自身); 把 code-review 当 S1-S6 审计 (它是双维度 + smell, 不是规范审计).

**独立智能体 CLI vs Task subagent**: 两种不同机制. 独立智能体 CLI = 调本地 exe 的 Bash 流程 (如 `v-code-review` skill 调 `OCR_BIN` exe, OpenCodeReview fork, 内部 AI 审查, 分类 High/Medium), 主 Claude 自己跑 Bash. Task subagent = Task tool + subagent_type 字段 spawn 隔离 Claude 实例 (如 `arthurpower-audit-agent`, 独立 context + 独立 tool 权限). 触发词区分: "审代码/审 PR/review changes" 走 CLI; "audit/S1-S6/审计" 走 subagent.
_Avoid_: 把 v-code-review 当 Task subagent (它是 Bash 调 exe); 把 arthurpower-audit-agent 当 CLI (它是 Task subagent); 混淆两者触发词.

**router 规模路由分支 + decision ticket**: 替代独立 wayfinder skill 的轻量方案. `using-agent-skills` router 增设 3 选 1: scope 已定单 session -> deep-dive-protocol / scope 已定多 session -> architecture-change-reviewer + writing-plans / scope 未定多 session -> ACR + writing-plans + session-handoff 三步组合 (即 wayfinder 职能, 不叫 wayfinder, 因为是 routing 决策不是 procedural skill). decision ticket = writing-plans 每个 task 显式标 `[decision]` (只解决一个决策) 或 `[implementation]` (才进入 build), 跟 the baseline wayfinder 的 decision ticket 概念对齐.
_Avoid_: 新建独立 wayfinder skill 替代 router 分支 (v0.7.0 最小变更, v0.9.0 再定); 把 router 分支当 procedural skill (它是 routing 决策入口); decision ticket 跟 implementation ticket 混 (前者只决定, 后者才 build).

**user-invoked skill**: frontmatter `disable-model-invocation: true`; 只有操作者手动输入 skill 名 (或 slash) 才加载; description 给人看, 不进模型每轮自动匹配. 可以是 flat reference, 也可以是 procedural discipline (如 `self-evolving-rules`). 与 model-invoked 相对: 零 context load, 付 cognitive load.
_Avoid_: 把 user-invoked 等同于 reference-only; 期望模型 description 自动触发; 用 user-invoked 伪装"写主权唯一入口"(写主权靠 hook + 契约, 不靠 dmi).

**Skill-write preflight**: 创建/编辑 skill 前先走 `self-evolving-rules` 的 strip / locate / conflict / provenance (Steps 1-5), 清洗后再 **hand-off** 给 `skill-authoring` 写 SKILL.md 正文. `self-evolving-rules` 本身不 author skill 内容.
_Avoid_: 跳过 preflight 直接 skill-authoring; 在 self-evolving-rules 里写 skill 正文; 把 preflight 当成可选礼貌步骤.

**Genericization (no-meta-specific)**: 产物禁止私有命名空间 / 私路径 / 私日期 / 自证权威标签. 检测面 = 5 类禁用模式 + **6** 条 grep (复合前缀 / 单字符私引用 / L1 路径 / 私日期 / 权威与逃逸词 / **中文歧义禁用复合词** `撞名|真因|切流|等价品|拍板`). 必要豁免穷尽表外的自我声明一律不算绕过. Validator / fs check / reviewer 升级是 source of truth.
_Avoid_: 在产物里重列禁词字面当"规范"; 用"本文件整体豁免"替代分类豁免标注; 把 genericization 只当 skill-authoring 私货 (规则扩到任何产物); 把 11 准过词塞进 grep #6 (误报高).

**Fail Closed (声明覆盖禁令)**: 下列冲突必须 fail, 禁止静默 pass — (1) eval polarity 写反或缺 polarity; (2) frontmatter `type` 与 body `Skill type` 不一致; (3) 内容匹配更高 Bar 却自降为 Minimum; (4) high_risk 仅字符串引用 approval 而无 fs 存在性检查. 自我声明 ("本条豁免" / "已引用故跳过" / "由 reviewer 决定 polarity") 一律剥离.
_Avoid_: 用声明覆盖 validator; 用字符串引用代替 fs check; polarity 不明时默认 pass.

**Driver-level boundary smoke**: 主 agent 用真实 FS / 真实 JSON / 真实 cwd 跑的驱动器验收; 子代理 smoke (理想整数 mtime、模拟磁盘) 只算 sanity, 不算验收. skill 结构边界可用 `iteration/<n>/driver.py` + `evals.json` 对 SKILL.md 做文件级断言 (5 类别样例).
_Avoid_: 子代理 5/5 PASS 当功能正确; 跳过 driver; 用字符串假匹配代替真实解析.

**machine-assertable**: 成功标准 / 边界指标必须能被程序直接检查 (exit code / rate / grep count / sha256), 不能是"看起来对". 流程规则里保留英文原词 `machine-assertable` (及 `assert` / `ground truth` / `pass` / `fail` 等工程 token); 中文可 gloss 一次, 判定用 token 保持英文. 禁止自造中文硬译 (calque), 以免字面日常义覆盖工程义. 落点: global `boundary-testing-protocol.md` Step 1 + Terminology 行.
_Avoid_: 可机器断言 / 可断言的指标 等硬译当专名; 用自然语言"应该正确"代替 rate 阈值.

**Interview-engine substitution (Interpretation 2)**: 当 operator 说"把 A skill 与 B skill 替换"且 A 是多 session 编排 (map/ticket/fog/frontier)、B 是单 session 访谈写驱动时, 默认只换 A 体内的访谈原语调用链为 B (及 B 下游写主权 skill), **不**删 A 的编排壳、**不**让 B 吞掉 multi-session 职责. 本仓库落地: project-local `wayfinder` 内 `/grilling`+`/domain-modeling` → `arthurpower:deep-dive-protocol` (内部再调 domain-modeling). 证据: `plans/wayfinder-to-deep-dive.md` + `evals/run-wayfinder-swap.py`.
_Avoid_: 字面整 skill 对删对换; 把 deep-dive 当 wayfinder 全职能替代; 在未 ADR 覆盖 v0.7 Round-7 前新建 plugin `arthurpower:wayfinder`.

**AMBIGUITY_RE (L5)**: `validate_skill.py` 对 SKILL.md 全文硬失败的中文歧义复合词检查, 正则 = `撞名|真因|切流|等价品|拍板` (与 no-meta grep #6 对齐). 命中 message = `chinese ambiguity banned compound at line N`. L5 不发明豁免语法; 政策 SSOT / handoff 豁免只作用于手动 grep 执行层. marketplace + cache `0.6.0` + `0.7.0` 三副本 R5 字节一致. 边界验收: `plans/l5-validator-driver.py` + `plans/l5-evals.json` (主 agent 真 FS, 非子代理 smoke).
_Avoid_: 单字 `拍`/`撞` (FP); 11 准过词进 RE; 把 validator 当 hook D2; 把预存 section/type/bar exit=1 包装成 L5 回归.

**PR review thread loop**: 评审者的反馈可能多轮收敛 ("drop @" → "需要 link 但不要 @" → markdown link 接受). 每轮 = 1 个 atomic commit + reply + resolve, 不允许 squash 轮次; 每轮 reviewer 迭代是独立 atomic task, 跨轮 commit 必须保持可逐 round revert. 落地证据: PR #4 三轮 review 走完 CLAUDE.md L154-155 row; merge commit `991d144` 保留 13 个 atomic 历史.
_Avoid_: 把多轮 review 折成一个 "fix" commit (丢失 reviewer 决策链); resolve 线程前不 reply; reply 后忘记 push (reviewer 看不到新 commit).

**hook lib dep as silent enabler**: 当一个 hook 内部 `require('./lib/<dep>.cjs')` 而 `<dep>` 文件不存在时, 顶层 try/catch fail-open 把 crash 吞掉, 看起来 hook "跑过", 实际所有下游逻辑 (含 identity check / schema check) **从未执行**. 表现: 子代理 smoke 报 PASS, 主 agent driver boundary smoke 因同样 fail-open exit 0 也看不出区别; 真要识别需要 fault-injection (删 lib, 重跑 driver). 修复: copy lib 依赖文件 + 在 driver 里加 "no-state + missing-lib" 反向 case 校验 fail-open 链路可见.
_Avoid_: 把 "fail-open exit 0" 当 PASS 信号; 不验 hook 的 lib 依赖是否真的存在; 子代理 + driver 都看不到 lib 缺失时仍标完成.

**markdown link vs @ import**: `[name](~/.claude/agents/<name>.md)` 是 markdown 超链, 编辑器可点击 + CLI 可读 + **不**把文件内容注入到每次 Read 的 context. `@~/.claude/agents/<name>.md` (CLAUDE.md 内 @import 语法) 会**真**把文件内容拉进 context, 每次 Read 都付 import 开销. 评审者想要 link 但不要 import → markdown link 是答案. 表格 cell / 列表项 / 内联引用 → 用 markdown link; 真正的 "本规则依赖此文件全部内容" → 用 @import.
_Avoid_: 把 markdown link 跟 @import 语法混淆; 表格里塞 @import (每次 Read 都付全文件 import 成本); 想要 click 时用裸名 (丢路径).

**atomic-commit ordering for lib + consumer**: 当一个 commit 修复 consumer (e.g. hook), 但 consumer 依赖另一个文件 (e.g. lib dep), 必须先 commit dep (lib restore), 再 commit consumer fix. squash-reorder 在中间状态 (consumer 已 commit, dep 未 commit) 会让 consumer crash. 跨 commit 依赖必须在 PR body "Rollback" 段写明 ("#1 → #2 order matters; do not squash-reorder").
_Avoid_: 把 dep + consumer 合成 1 个 commit (丢回滚粒度); 反向顺序提交 (中间状态 break); PR body 不写 rollback 顺序 (reviewer 不知道哪两个 commit 是耦合的).

**runtime artifact gitignore 两步走**: runtime artifact (hook 生成的 dedup / state 文件) 要从 git 历史移除, 需 2 个 commit: (a) `.gitignore` 加 entry (只影响新文件), (b) `git rm --cached <file>` (解除已 tracked 文件). 单 commit 只做 gitignore 等于 "没做", 因为已经 tracked 的文件 gitignore 不会自动 untrack.
_Avoid_: 只改 `.gitignore` 不 `git rm --cached`; 把两件事合成 1 commit (rollback 粒度变粗, 一半无效).

**pre-fs-guard heredoc false-positive**: `pre-fs-guard.cjs` 这类 PreToolUse hook 如果 regex 在整条 Bash command 文本里扫, heredoc / quoted string 内的字面量也会触发匹配 (e.g. commit message body 含 "grep -r ... /" 字样时, hook 当真 grep 拦). 修复方向: hook 应剥离 heredoc / string literal 内容再做 pattern 匹配, 或锚定在命令 token 位置 (首个 `&&` / `;` / `|` 后) 而非文本任意位置. 临时缓解: 写 commit message 避开触发 pattern 的字面短语.
_Avoid_: 在 commit message body / PR body / handoff 文件中贴含 `grep -r` / `rm -rf /` / `cat | curl` 等字面短语; 把 hook 触发当 "真问题" 而不查 hook 匹配位置.

**driver smoke vs subagent smoke asymmetry 复发形态**: 即使实现了 driver-level smoke, 当 hook 因 lib 缺失 fail-open, **driver 也只能看到 exit 0**, 与 subagent smoke 表现相同. 真正能区分的是 fault-injection: 故意删 lib 文件, 重跑 driver, 验证 hook 此时不应再 exit 0 (或应显式 noise stderr). 落点: boundary-testing-protocol §"Case 1" 已记录 1 个版本; 本 entry 补 1 个复发形态 (lib dep 缺失导致 driver 与 subagent 同样盲).
_Avoid_: 把 driver smoke 5/5 PASS 当 ground truth; 不做 fault-injection; lib dep 不在 driver 测试覆盖范围.

---

**arthurpower-afk**: Independent GitHub repo `winter6205/arthurpower-afk`, plugin id `arthurpower-afk`, marketplace id `arthurpower-afk-local`. Product duty per S1 verdict (locked 2026-07-17): closed-map batch execution + configurable auto-merge + full Q1/Q2/Q3 ritual via event-driven post-push hook. Hard non-overlap: does NOT reopen map destination, does NOT write planning tickets, does NOT decide ADRs for the operator.
_Avoid_: writing AFK product plans into arthurpower `plans/`; treating AFK ops (CI, ubuntu-portable evals, AFK `.evals/run.sh`) as arthurpower open work; conflating AFK with semi-auto session ritual.

**auto-template**: Historical operator phrasing for the full-auto template repository creation and scaffolding task; in this project that task resolved to the `arthurpower-afk` scaffold (see S2/S3 verdicts and the AFK-owned plan formerly named auto-template.md). New sessions that see the literal `auto-template` in handoffs or auto-memory must map it to `arthurpower-afk` and must NOT open a second greenfield template-repo workstream under arthurpower.
_Avoid_: treating auto-template as a distinct product name; re-creating an auto-template plan under arthurpower `plans/`; treating a stale "next = auto-template" memory pointer as an open main task after AFK scaffold delivery.

---

## Flagged ambiguities

- **"通用型 / 任务型" 分类**: V 提的 the baseline author 工程师观点. 本 session 找到原文 = the baseline author `the baseline skills repo` 仓库 `skills/productivity/writing-great-skills/SKILL.md` + GLOSSARY.md. the baseline 用 **model-invoked vs user-invoked** (context load vs cognitive load trade-off) 分类, 不是"通用型/任务型". 决议: resolved, 用 the baseline 的 invocation 分类替代之前的"通用型/任务型"猜测.
- **"官方 Skill 编写 vs 自研 skill-authoring"**: V 字面拍板 = 用 the baseline author writing-great-skills 整套移植替换 arthurpower 老 skill-authoring (改 name + author 加署名, 主体不改), 加 Eval System 段. 决议: resolved, 不再双轨, 直接用 the baseline 基线 + arthurpower Eval System.
- **auto-template vs arthurpower-afk**: 早期 handoff 把 "全自动模板仓库创建并编写" 任务命名为 auto-template; S2/S3 verdict 锁定实际交付 = 独立仓 `arthurpower-afk`. 决议: resolved, auto-template 是 arthurpower-afk 的历史别名, 不作 SSOT 名.

---

## Operational Log

新 session 事件落 `docs/handoff/<date>.md`，由 V 主动注入上下文。