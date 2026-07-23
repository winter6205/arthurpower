# 0002. Create arthurpower:code-review skill in v0.7.0

Date: 2026-07-15
Status: accepted
Superseded by: ADR-0017 (mechanism portion — CLI wrapper → dual parallel sub-agents). Content decisions (two axes, Fowler 12, severity gating, three-body time-point partition) remain valid.

## Context

v0.6.0 的 26 个 skill 中无 code-review skill, 只有 `architecture-change-reviewer` (改前 5-verdict gate, 非 改后代码审查). `context-loop-refactor.md` §1.2 L37 列了 `code-review-protocol` 在 12 项原生技能清单, 但 v0.6.0 实际不存在 (design 文档 vs 实现的 drift). 14 轮裁决中前 6/9 轮误把 v-code-review 调用规约塞 writing-plans/ACR acceptance, V 反馈指出 v-code-review 是独立智能体 CLI (调本地 exe, 不是 Task subagent), 不该融到 writing-plans, 应该融到别的技能或新建. arthurpower 无 code-review skill 但已有 V 已装的 user-level v-code-review CLI 工具, 缺的是 plugin 自己的 code-review skill 来承载 CLI 集成规约 + 双维度审查 + Fowler smell baseline.

## Decision

v0.7.0 新建 `arthurpower:code-review` skill (plugin 内), 一次性立好 (不经 v0.9.0). skill body 含:

1. v-code-review CLI 调用规约 (build / `review --audience agent` / 分类 High/Medium / exit 0)
2. 双维度审查标准: **标准** (仓库编码规范) + **规范** (需求忠实度)
3. Fowler smell baseline 12 项: Mysterious Name / Duplicated Code / Feature Envy / Data Clumps / Primitive Obsession / Repeated Switches / Shotgun Surgery / Divergent Change / Speculative Generativity / Message Chains / Middle Man / Refused Bequest
4. verdict 解析: High 必修 / Medium 应修 / Low 选改
5. 三体 S1-S6 决策位置注释 (改前 ACR / 改后 code-review + audit-agent / pre-merge maintainability-reviewer)

决策位置 = 改后预 commit (调 exe). 触发词作用域去重: arthurpower:code-review description 不含 "审计/S1-S6/maintainability" (留 audit-agent).

跟 `rules/code-review-protocol.md` (user-level rule, 同 cycle 立, V 赞同) 关系: rule 是 SSOT 判定标准 (怎么算好代码), skill 是执行入口 (怎么跑审查). skill body 引用 rule, 不重复.

跟 `context-loop-refactor.md` §1.2 L37 drift 关系: v0.7.0 新建 code-review skill 兑现 design 文档的 code-review-protocol 引用, 不再是 drift.

## Consequences

**正面**:
- 补 arthurpower 改后代码审查缺口 (原只有改前 ACR gate)
- v-code-review CLI 集成规约落到 plugin skill, 不再散落 user-level
- 三体 S1-S6 决策位置分工明确 (ACR 改前 / code-review 改后通用 / audit-agent 改后限 arthurpower / maintainability-reviewer pre-merge 第三段)
- context-loop-refactor.md §1.2 L37 drift 由 v0.7.0 新 skill 兑现
- 跟 the baseline v1.1 code-review skill 对齐 (双维度 + Fowler smell baseline)

**负面**:
- v0.7.0 scope 扩 (新增 skill 比"集成现有 CLI"风险高), 必走 boundary-testing 验触发漂移
- v-code-review 是 user-level CLI, plugin skill 跟它耦合 (exe 路径 / build 依赖), 跨 harness 层

**v0.9.0 不再需要**: 原方案 v0.9.0 才新增 code-review skill, v0.7.0 一次性立好后 v0.9.0 只剩 wayfinder skill 新增.

## Considered Options

### Option A: v0.7.0 新建 arthurpower:code-review skill (本 ADR 采纳, V 赞同)
- Pros: CLI 集成规约 + 双维度 + smell baseline 有归宿; 跟 the baseline 对齐; drift 兑现; 时点对 (改后预 commit)
- Cons: v0.7.0 scope 扩 + 跨 harness 层耦合

### Option B: 蒸馏到 writing-plans acceptance (第 6/9 轮误判, V 反馈否决)
- Pros: 不扩 scope
- Cons: 时点错位 (writing-plans 是 plan 决策时, code-review 是改后预 commit); V 反馈"v-code-review 不融 writing-plans"

### Option C: 蒸馏到 ACR verification (第 6/9 轮误判, 否决)
- Pros: 不扩 scope
- Cons: 时点错位 (ACR 是改前 gate, 不该有改后审查); 违反"改前 ≠ 改后"边界

### Option D: 融到 v-code-review SKILL.md (第 9 轮误判, V 反馈否决)
- Pros: 不新建 skill
- Cons: v-code-review 是 CLI 流程 skill (调 exe), 不是审查逻辑归宿; 跨 user-level 治理边界; V 反馈"v-code-review 是独立智能体 CLI"

## Why not B/C/D

未来 agent 重提时参考: 第 6/9 轮把 v-code-review 塞 writing-plans/ACR/v-code-review SKILL.md 是时点错位 + 越权. v-code-review 是独立智能体 CLI (调 exe, 不是 Task subagent), 不该融到 plan 决策时点 (writing-plans) 或改前 gate (ACR) 或 user-level CLI 流程 skill (v-code-review SKILL.md). 新建 plugin 自己的 code-review skill 承载 CLI 集成规约 + 双维度 + smell baseline, 时点对 (改后预 commit), 跟 ACR (改前) + audit-agent (改后限 arthurpower) + maintainability-reviewer (pre-merge) 三体分工.
