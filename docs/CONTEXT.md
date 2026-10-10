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

**测试三级语义**: 仓库里"测试"一词指三种不同对象, 按语义严格区分, 不混淆. (1) **元测试 (evals)**: detector / rule / hook 改动的 10-30 条触发语义样例 (A 阳性 / B 否定 / C 歧义 / D 域外 / E 反语义), 由 `boundary-testing-axis1` 起草、`boundary-testing-axis2` driver 验收. (2) **边界测试 (S2 input coverage)**: 产品代码 diff 的 5 类输入覆盖 (empty / negative / overflow / concurrent / exception) 验证, 由 `defensive-contract-validator-agent` 只验证不编写. (3) **产品测试 (product tests)**: 代码的单测 / 集成 / E2E, 唯一会写它的 persona 是全局 `test-engineer`. 三者的触发者都是 main, 但产出/验证/编写主权互斥. 撞名后果: 误把元测试当产品测试 (TDD skill L140-142 旧病), 或把边界测试当编写. 本词条是对 OD-00 B(a)/B(b) 决议 (map #96) 的词汇落盘.
_Avoid_: 用同一"测试"词指代元测试 / 边界测试 / 产品测试三者而不声明层级; 让 subagent 越权"写"本属验证或探测的测试类.

**状态边界清单**: 在 skill 的 references/ 文档里加一个两栏 checklist (有状态化步骤打勾 + 无状态化前提打勾), 写 skill 时按需查, 不分两套 skill 模板.
_Avoid_: 按有/无状态硬切两套 skill, 双模板.

**agent vs skill 物理分辨**: 看主对话里的 tool call 名字 - Task tool + subagent_type 字段 -> agent (隔离 Claude 实例); Skill tool + skill 名 -> skill (注入 body 到当前 Claude); Bash/Read/Edit -> 主 Claude 自己. 没有 Task tool = 没有 spawn.
_Avoid_: 看名字像不像, 看 .md 文件名猜.

---

**三层验证体系**: skill 编写后的验证分三层, 各管各不重叠. (1) 静态结构 = `validate_skill.py` 验 SKILL.md 格式合规 (frontmatter / 段 / 长度 / no-meta-specific), 写完手动跑. (2) 动态响应 = `run_skill_eval.py` + `evals.json` 验 skill 触发后产出对不对 (rubric must_include / must_not 跟响应文本 match). (3) 文件内容 = `driver.py` 验 SKILL.md 真实文件含/不含规范关键词 (读真文件 keyword match). 三层互补不冲突.
_Avoid_: validator 当运行时门禁, driver 当真实路由, dry-run 当真实 subagent.

**移植 vs 蒸馏**: 移植 = 整套拉别人 skill (SKILL.md + GLOSSARY.md 等) 改 name + author 加自己署名, 主体一字不改. 蒸馏 = 按自己规范重写, 取长补短加自己独有的. 本 session skill-authoring 走移植 (upstream writing-great-skills 骨架 + Eval System 段), hook-development 走蒸馏 (官方 712 行压缩成 arthurpower 风格 + V 踩坑纪律).
_Avoid_: 移植当蒸馏 (假装重写实际抄), 蒸馏当移植 (假装抄实际丢精华).

**reference skill**: disable-model-invocation: true 的 skill, 主体是 flat reference (术语 / 概念 / 规则), 不是 procedural 指令. upstream writing-great-skills 是典型 reference skill. validator 对 reference skill 豁免 procedure 段必填 (When to use / Procedure / Acceptance Criteria / Verification) 和 Skill type / Bar level 声明.
_Avoid_: reference skill 强必填 procedure 段, reference skill 当 discipline skill 验.
**plugin 三段注册机制**: Claude Code 2.1.206 启动按 `known_marketplaces.json` → `installed_plugins.json` → `settings.json enabledPlugins` 三段判定加载。框架校验读 `marketplaces/<marketplace>/plugins/<plugin>/.claude-plugin/plugin.json`，cache 是 installPath，二者都得合规。
_Avoid_: 只改 settings.json enabledPlugins 就期望 plugin work; 只改 cache 副本忘了 marketplaces 副本.

**plugin skills 字段路径格式**: `plugin.json` `skills` 字段接受 `./skills/<name>` 平铺或 `./skills/<bucket>/<name>` 分桶两种相对目录路径。裸名 / 不含 `./` 写法 → framework `Validation errors: skills: Invalid input` + plugin failed to load。
_Avoid_: 写裸 skill 名或不含 `./` 的相对路径; 把"删字段后能 work"误读为"数组 schema 不支持".

**plugin load error 可观测性**: `/reload-plugins` 和 TUI `/plugin` 只显示 "1 error during load" 计数, 不显示错误详情 (TUI 输出空). 但 CLI `claude plugin list` 输出每个 plugin 的 Status + Error 字段 (含 manifest 路径和 `Validation errors: <field>: <reason>`), 是排查 plugin failed to load 的唯一可靠入口.
_Avoid_: 在 TUI 里反复 `/plugin` 找错误详情 (空输出); 看到 "/reload-plugins: 1 error" 就猜根因不跑 `claude plugin list`.

**plugin cache 孤儿标记**: framework 把无法正确映射的 cache 条目标记 `.orphaned_at` (内容是毫秒时间戳). 该标记存在于 `cache/<marketplace>/<plugin>/<version>/.orphaned_at`. 修好 manifest 后需手动删 `.orphaned_at`, 否则 framework 可能继续把条目当孤儿不重新评估.
_Avoid_: 改了 manifest 就期望 framework 自动重新加载, 不检查 `.orphaned_at` 是否残留.

**marketplace.json source 字段双格式**: 官方 marketplace.json 里远程 plugin 用对象格式 `{source: "git-subdir", url, path, ref, sha}`, 本地 plugin 用字符串格式 `"./plugins/<name>"` (跟 agent-sdk-dev 一致). 两种格式 framework 都认. known_marketplaces.json 的 marketplace-level source 用 `{source: "directory", path: "..."}` (绝对路径), 用 `"local"` 会让 CLI 启动挂死 (issue #25693).
_Avoid_: 用 `source: "local"` (挂死 bug); marketplace.json 本地 plugin 用对象格式.

**MCP 三层定义 + 审批分离**: MCP 配置分定义层（`~/.claude.json.mcpServers` / `.mcp.json`）与审批层（settings.json `enabledMcpjsonServers`）；定义 ≠ 审批，有定义无审批 = Pending approval 不启。
_Avoid_: 把 enabledMcpjsonServers 写进 .mcp.json 或 .claude.json.mcpServers; 以为 .mcp.json 定义了就自动启.

**MCP server 三 scope 存储位置**: User scope → `~/.claude.json.mcpServers`；Local scope → `~/.claude.json.projects.<path>.mcpServers`；Project scope → `<project>/.mcp.json`。注意 "local" 在 MCP scope（home 目录）跟 settings local scope（项目目录 .claude/settings.local.json）是两个不同文件。
_Avoid_: 把 Local scope MCP 写到 .claude/settings.local.json; 混淆 MCP local scope 跟 settings local scope.

**enabledMcpjsonServers 合并语义**: `enabledMcpjsonServers` 在多 scope 间**合并**而非替换（官方："Arrays are merged across all settings scopes"）。项目级无法用 `enabledMcpjsonServers=[]` 取消全局已启 server；项目内禁用只能走 `deniedMcpServers`（denylist，优先于 allowlist）。
_Avoid_: 用项目级 enabledMcpjsonServers=[] 或省略某 server 来禁用它; 用 `disabledMcpjsonServers`（v2.1.206 bug 字段，issue #58874 closed as not planned，不生效）.

**deniedMcpServers vs disabledMcpjsonServers**: `disabledMcpjsonServers` 是 bug 字段（v2.1.206 实测不生效，issue #58874 closed as not planned）。`deniedMcpServers` 是**对象数组** `[{ "serverName": "X" }]`，denylist 优先于 allowlist。项目内禁全局 server 必须用 `deniedMcpServers` 对象数组格式。
_Avoid_: 用 disabledMcpjsonServers (bug 字段); 给 deniedMcpServers 用字符串数组; 把两者视为等价.

**MCP 启动状态四态**: /mcp 显示 server 状态有 4 种: ✔ connected (定义+批准+启动成功), ◯ connecting… (启动中, npx 首次下载/OAuth 远程认证会慢, 非错误), ✘ Failed to connect (启动失败, 如 OAuth 未授权 / 命令不存在 / 网络不通), ⏸ Pending approval (有定义但未批准, untrusted folder 中 enabledMcpjsonServers 被 ignore). 用 `claude mcp get <name>` 看单 server 真状态 (含 Scope + Status + 错误原因), 比 /mcp TUI 详细.
_Avoid_: 把 connecting… 当错误 (npx 首次启动正常慢); 不区分 Failed to connect (启动失败) 跟 Pending approval (未批准).

**三体 S1-S6 决策位置分工**: S1–S6 由时点 + 作用域分工：改前 ACR gate、改后预 commit code-review (ADR-0017: dual-subagent 编排) / audit-agent、pre-merge maintainability-reviewer，不合并成一体。详见 `docs/adr/0002` + `docs/adr/0007` + `docs/adr/0017`。
_Avoid_: 三体合并成一个 skill; 把 audit-agent 当通用项目审查; 把 code-review 当 S1-S6 规范审计.

**独立智能体 CLI vs Task subagent**: 两种不同机制. 独立智能体 CLI = 调本地 exe 的 Bash 流程 (如 `v-code-review` 调 `OCR_BIN` exe, OpenCodeReview fork, 内部 AI 审查, 分类 High/Medium), 主 Claude 自己跑 Bash. Task subagent = Task/Agent tool + subagent_type 字段 spawn 隔离 Claude 实例 (如 `arthurpower-audit-agent` / `standards-reviewer-agent` / `spec-reviewer-agent`, 独立 context + 独立 tool 权限). 触发词区分 (ADR-0017 后): "审代码/审 PR/review" 走 `arthurpower:code-review` (dual-subagent 编排, 并行 dispatch standards-reviewer + spec-reviewer); `v-code-review` 锁定为手动 slash (`disable-model-invocation: true`, 不再自动触发); "audit/S1-S6/审计" 走 audit-agent subagent.
_Avoid_: 把 v-code-review 当 Task subagent (它是 Bash 调 exe); 把 arthurpower-audit-agent 当 CLI (它是 Task subagent); 期望 v-code-review 自动触发 (它已锁定手动); 把 arthurpower:code-review 当 CLI wrapper (它是 dual-subagent 编排).

**router 规模路由分支 + decision ticket**: `using-agent-skills` router 增设 3 选 1：scope 已定单 session → deep-dive-protocol；scope 已定多 session → ACR + writing-plans；scope 未定多 session → 三步组合（即 wayfinder 职能，不叫 wayfinder，因为是 routing 决策不是 procedural skill）。详见 ADR-0007。
_Avoid_: 新建独立 wayfinder skill 替代 router 分支 (v0.7.0 最小变更); 把 router 分支当 procedural skill; decision ticket 跟 implementation ticket 混.

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

**Interview-engine substitution (Interpretation 2)**: operator 说"把 A 与 B 替换"且 A 是多 session 编排（map/ticket/fog/frontier）、B 是单 session 访谈写驱动时，默认只换 A 体内的访谈原语调用链，**不**删 A 的编排壳、**不**让 B 吞掉 multi-session 职责。证据：`plans/wayfinder-to-deep-dive.md` + `evals/run-wayfinder-swap.py`。
_Avoid_: 字面整 skill 对删对换; 把 deep-dive 当 wayfinder 全职能替代; 未 ADR 覆盖前新建 plugin `arthurpower:wayfinder`.

**AMBIGUITY_RE (L5)**: `validate_skill.py` 对 SKILL.md 硬失败的中文歧义复合词检查（`撞名|真因|切流|等价品|拍板`），与 no-meta grep #6 对齐。详见 `docs/adr/0006`。
_Avoid_: 单字 `拍`/`撞` (FP); 11 准过词进 RE; 把 validator 当 hook D2.

**PR review thread loop**: 评审者的反馈可能多轮收敛 ("drop @" → "需要 link 但不要 @" → markdown link 接受). 每轮 = 1 个 atomic commit + reply + resolve, 不允许 squash 轮次; 每轮 reviewer 迭代是独立 atomic task, 跨轮 commit 必须保持可逐 round revert. 落地证据: PR #4 三轮 review 走完 CLAUDE.md L154-155 row; merge commit `991d144` 保留 13 个 atomic 历史.
_Avoid_: 把多轮 review 折成一个 "fix" commit (丢失 reviewer 决策链); resolve 线程前不 reply; reply 后忘记 push (reviewer 看不到新 commit).

**hook lib dep as silent enabler**: hook 内部 `require('./lib/<dep>.cjs')` 而 `<dep>` 不存在时，顶层 try/catch fail-open 吞 crash，子代理 + driver 都只看 exit 0；识别靠 fault-injection（删 lib 重跑）。修复：copy lib 依赖文件 + driver 加 "no-state + missing-lib" 反向 case。
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

**tracer bullet**: writing-plans 拥有的最小垂直可交付条目（1 tag + 1 commit + 端到端 demoable），其它 skill 只消费不拆票。详见 `docs/adr/0007`。
_Avoid_: 在 ACR 或其它 skill body 拆票; 把 horizontal split 当 tracer bullet; 把 wide mechanical refactor 硬塞单个 bullet.

**expand-contract 例外**: tracer bullet 主轴的唯一例外, 处理 blast radius 跨整个仓库的 mechanical refactor (rename column / retype shared symbol 等). 序列 = expand (新形式并列旧形式, 不断绿) → migrate (按 batch 拆多个 tracer bullet, 每批一票) → contract (旧形式 0 caller 后删, 独立一票). expand / contract 本身不是 tracer bullet, 是让中间批次能独立绿的 rails.
_Avoid_: 把整库 refactor 硬塞单 bullet (中间状态一定 break); migrate batch 之间不按 blast radius 拆 (粒度过粗或过细); contract 跟最后一 migrate 合成 1 commit (丢回滚粒度).

**ACR gate-only**: `architecture-change-reviewer` 只产改前 5-line verdict（放行/拦下），不拆票、不写 acceptance——拆票归 writing-plans。详见 `docs/adr/0002` + `docs/adr/0007`。
_Avoid_: ACR 拆票 / ACR 写 acceptance / ACR 改后审查 / 把 ACR 当 planning skill.

**verdict SSOT = plans/<feature>.md**: ACR 5-line verdict 的唯一 canonical 落点是 `plans/<feature>.md`（Verification 不扫 PR description）。详见 `docs/adr/0007`。
_Avoid_: verdict 落 PR description; verdict 只在 chat; PR + plan 双份却无单点证据.

---

**arthurpower-afk**: 独立仓 `winter6205/arthurpower-afk`（plugin id `arthurpower-afk`）。产品职责（S1 verdict 2026-07-17 锁定）：closed-map 批执行 + 可配 auto-merge + 事件驱动 post-push hook 全套 Q1/Q2/Q3 ritual。Hard non-overlap：不重开 map 目的地，不写 planning tickets，不替 operator 决策 ADR。
_Avoid_: 把 AFK 产品计划写进 arthurpower `plans/`; 把 AFK ops（CI / ubuntu-portable evals / AFK `.evals/run.sh`）当成 arthurpower open work; 混淆 AFK 与半自动 session ritual.

**auto-template**: 历史别名，本任务实际交付 = 独立仓 `arthurpower-afk`（S2/S3 verdict 锁定，见原 plan `auto-template.md`）。新 session 在 handoff / auto-memory 看到 `auto-template` 字样必须映射到 `arthurpower-afk`，不重开 greenfield workstream。
_Avoid_: 当成独立产品名; 在 arthurpower `plans/` 重写 auto-template 计划; AFK 交付后把"next = auto-template"记忆指针当 open main task.

**always-on load**: Claude Code 每个 session 自动注入的指令集合（system prompt + 全局/项目 CLAUDE.md + @import rules + auto-loaded CONTEXT）；frontier 经验约 150-200 条指令可稳定遵循，本仓库 Arthurpower session 实测 always-on 在数千指令量级。
_Avoid_: 把 skill body / on-demand Read 算进 always-on；只用行数代替指令条数当预算。

**progressive disclosure**: CLAUDE.md 只放全任务通用的 WHY/WHAT/HOW 与细节文件指针，任务形指令放独立 md 由模型按需 Read；prefer `file:line` 指针，不贴易过期代码片段。
_Avoid_: 把全部规范塞进 CLAUDE.md；把 @import 当 markdown link（@import 真注入，link 不注入）。

**linter-as-LLM**: 用 CLAUDE.md / rules 散文让模型记住格式、风格、提交约定，而不是用 hook / formatter / secret-scan 做确定性门禁（never send an LLM to do a linter's job）。
_Avoid_: 把语义判断（高风险区域、是否无关重构）硬塞进 hook。

**instruction budget**: 模型在单次上下文里能稳定遵循的指令条数上限；超预算后遵循质量整体下降，不是只忽略尾部新指令。
_Avoid_: 只砍新加指令不审既有 always-on；把 system prompt ~50 条排除在预算外。

---

### GitHub Collaboration (upstream alignment, fusion 2026-07-20)

**upstream**: the external skills repo whose practices were fused into arthurpower (bucket tier, skill linking, router invariant, merge-conflict loop).

**router invariant**: promoted skill 的 add / rename / remove / flow-placement 变化，必须在同一 commit 同步 router skill (`arthurpower:using-agent-skills`) 的 SKILL.md；违反 = "a router that lies"。
_Avoid_: router 与 skill 分离维护；靠 reminder 提醒同步；新 skill 加完不更新 router。

**throwaway from day 1**: 设计问题用一次性代码验证时（state model / UI 长啥样），保留答案（decision snippet），删除代码；工作在 `prototype/<name>` 分支，从 implementing ticket 附 context pointer。
_Avoid_: prototype 代码合入 main；长期保留 prototype 分支；只删代码不留答案。

**AGENT-BRIEF**: 把外部 issue/PR 转成 agent-ready 时，在 PR 评论附的 brief 模板（问题描述 + 复现步骤 + 期望行为）。让 agent pickup 时无需再问。
_Avoid_: agent pickup 时再追问细节；brief 与 issue 描述重复；brief 写成大段散文。

**ready-for-agent**: issue/PR state machine 5 角色之一（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）；AGENT-BRIEF 附完 + 标签打好，等 `/implement` pickup。
_Avoid_: 标签打上但 brief 缺失；brief 附完但没打标签；与"needs-triage"混用。

**context pointer**: 从 implementing ticket / spec / wayfinder map 指向 throwaway artifact（handoff file / prototype branch / research markdown）的链接；保留跨 artifact 的追溯链。
_Avoid_: 用裸 branch name 不带 ticket 引用；throwaway 完成后不删 pointer 导致悬空链接；pointer 写成 prose 散文。

**issue lifecycle**: tracker 选择（GitHub issues 主路径 / 本地 markdown fallback）+ issue 产生位置（wayfinder map / spec / plans / triage）+ 追踪位置（ticket status / git log / state machine / PR thread）的统一规范。
_Avoid_: tracker 选择散落各 skill；issue 在 file-based 与 GitHub 之间不声明；产生位置与追踪位置不一致。

**wayfinder handoff**: wayfinder map clears 后的标准交接路径。默认 = `spec-driven-development`（wayfinder 产出 decision，spec 产出 executable spec，两者互补非重复）；可跳过 spec 当且仅当 grilling ticket Resolution 已含全 5 段（Problem / Solution / Implementation Decisions / Testing Decisions / Out of Scope）；交接前必走 `AskUserQuestion` stop gate（类比 `deep-dive-protocol`），handoff 目标是 operator 决定不是 agent 推断。Cross-ref `arthurpower/skills/wayfinder` §Handoff + `arthurpower/skills/spec-driven-development` §Input contract + `docs/wayfinder/tickets/gh-22-handoff-contract.md`。
_Avoid_: 自动推断 handoff 目标；跳过 stop gate；grilling Resolution 不完整时强行跳 spec；把"map clear = 直接 implement"当默认路径（会丢 spec collapse 的细节）。

---

### Hook 三层拓扑与迁移 (2026-07-22)

**三层 hook 拓扑 (L1/L2/L3)**: L1 = 项目仓库 SSOT (`arthurpower/hooks/`, `hooks.json` 用 `${CLAUDE_PLUGIN_ROOT}` 引用); L2 = 插件部署层 (marketplace + cache, 由 `sync-marketplace-cache.py` 从 L1 同步, no-delete); L3 = 全局共享 hook (`~/.claude/hooks/`, `settings.json` 用绝对路径接线). 三层各有独立 git remote. L1/L3 重叠 hook 只应在 L1 注册, L3 只放真正全局通用的 hook (lifecycle-hook, token-counter, pre-fs-guard 等).
_Avoid_: L3 settings.json 重复注册插件 hook (导致双跑); 把 L3 当 L1 的备份; 在 L3 放插件专有 hook.

**defineHook runtime**: hook 系统的共享 TS 运行时 (`runtime/defineHook.ts`), 用 zod schema 做 stdin envelope 校验 + 类型推导, `safeParse` fail-open (解析失败 exit 0 放行). 所有 `.ts` hook 通过 `import { defineHook } from './runtime/defineHook.ts'` 接入. ADR-0015 批准 zod 为唯一运行时依赖.
_Avoid_: 手写 stdin 解析 (7 种旧实现已统一); 在 hook 里直接 `require('zod')` (应走 defineHook); 把 defineHook 当可选装饰 (它是唯一入口).

**hook 双跑 (double-fire)**: 同一 hook 同时在插件层 (`hooks.json`) 和全局层 (`settings.json`) 注册, 每次工具调用执行两遍. 根因: L3 全局 `settings.json` 引用了和 L1 插件重叠的 hook. 修复 (2026-07-22): `settings.json` 只保留 L3 独有 hook, 插件 hook 由 `hooks.json` 独占.
_Avoid_: 在 settings.json 和 hooks.json 同时注册同一 hook; 把双跑当"冗余保护"; 迁移后不清理 settings.json 旧条目.

**sync no-delete**: `sync-marketplace-cache.py` 的设计约束 — 同步只增不删, 目标端 (MKT/CACHE) 的孤儿文件不会被自动清理. `audit` 报 drift 但 `sync` 不修; 孤儿 (如迁移后残留的 `.cjs`) 需手动删除.
_Avoid_: 期望 sync 自动清理旧文件; 把 audit exit 1 当 sync 失败; 不清理孤儿就期望 audit 通过.

**orphaned hook**: MKT/CACHE 中存在但 `hooks.json` 不再引用的 hook 文件 (通常是 `.cjs→.ts` 迁移后残留). 不影响运行 (hooks.json 不引用就不执行), 但占空间且 audit 报 drift. 需手动清理.
_Avoid_: 把 orphaned hook 当"备份"; 不清理 orphaned hook 就期望 audit 通过; 把 sync no-delete 当 bug.

**CJS→ESM hook 迁移**: 插件 hook 从 `.cjs` (CommonJS `require`/`module.exports`) 迁到 `.ts` (ESM `import`/`export`, `node --experimental-strip-types` 直跑). 迁移不改行为逻辑, 只统一格式 + 接入 defineHook runtime. 旧 `.cjs` 归档到 `archive/`, `hooks.json` 命令加 `--experimental-strip-types` 标志.
_Avoid_: 迁移时改行为逻辑 (只改格式); 不归档旧 `.cjs` 直接删; 忘了更新 hooks.json 命令格式.

---

## Flagged ambiguities

- **"通用型 / 任务型" 分类**: V 提的工程师观点. 本 session 核对原文 = 既有 skill 编写规范的 SKILL.md + GLOSSARY.md. 既有口径用 **model-invoked vs user-invoked** (context load vs cognitive load trade-off) 分类, 不是"通用型/任务型". 决议: resolved, 用 invocation 分类替代之前的"通用型/任务型"猜测.
- **"官方 Skill 编写 vs 自研 skill-authoring"**: V 字面拍板 = 用既有 writing-great-skills 规范整套移植替换 arthurpower 老 skill-authoring (改 name + author 加署名, 主体不改), 加 Eval System 段. 决议: resolved, 不再双轨, 直接用既有基线 + arthurpower Eval System.
- **auto-template vs arthurpower-afk**: 早期 handoff 把 "全自动模板仓库创建并编写" 任务命名为 auto-template; S2/S3 verdict 锁定实际交付 = 独立仓 `arthurpower-afk`. 决议: resolved, auto-template 是 arthurpower-afk 的历史别名, 不作 SSOT 名.

---

## Operational Log

新 session 事件落 `docs/handoff/<date>.md`，由 V 主动注入上下文。