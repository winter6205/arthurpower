# 0003. Integrate user-level assets into v0.7.0 scope (cross-harness write)

Date: 2026-07-15
Status: accepted

## Context

arthurpower 是 Claude Code plugin (`~/.claude/plugins/cache/arthurpower-local/arthurpower/`), user-level 资产 (`~/.claude/skills/`, `~/.claude/agents/`) 不归 plugin 管. 14 轮裁决第 11-14 轮找出的 3 个 deferred 资产冲突: (1) `~/.claude/skills/code-review-and-quality/SKILL.md` 缺失, 但 `~/.claude/agents/README.md` L "Three layers" 表明确引用, code-reviewer agent L12 也引用 (悬空依赖). (2) `~/.claude/agents/code-reviewer.md` L67 prose "Do not invoke from another persona" 跟 arthurpower-dispatcher 派 fanout 摩擦. (3) user-level 6 个审查 agent (code-reviewer / quick-reviewer / maintainability-reviewer / project-code-quality-auditor / security-auditor / test-engineer) + v-code-review skill 跨 harness 层无 inventory, arthurpower v0.7.0 引用时决策位置不清. 14 轮裁决建议 deferred 给 V, V 拍板 "纳入", 并选 "arthurpower 实际去改 user-level 资产 (越权)".

## Decision

arthurpower v0.7.0 实际去改 4 项 user-level 资产 (V 明确授权越权):

1. **补建** `~/.claude/skills/code-review-and-quality/SKILL.md` (agents/README L 引用但缺失, 悬空依赖真根因)
2. **改** `~/.claude/agents/code-reviewer.md` L67 prose: 加 "dispatcher (orchestrator) 例外" 说明, 保留原 "persona do not call persona" 硬规则
3. **改** `arthurpower/agents/arthurpower-dispatcher.md`: 不派 code-reviewer (派 quick-reviewer 或直接调 v-code-review CLI), 避免 README 硬规则 friction
4. **新建** `arthurpower/docs/agents/harness-map.md`: 登记 6 user-level agent + v-code-review skill + 3 deferred 处置 inventory + 三体 S1-S6 决策位置表

流程约束 (防越权乱改):

1. 走 `rules/self-evolving.md` 6 步流程 (提炼 -> 定位 -> 剥离 -> 消解 -> 润色 -> 路由并写入), 不凭印象直接 Edit
2. 改前 `.bak` 备份 user-level 资产 (跟 plugin 双副本 sha256 baseline 一致原则)
3. 改完跑 boundary-testing 验 (触发词 / 描述 / agent 行为是否漂移)
4. 回滚: user-level 资产改动若触发问题, 单条 byte-level 还原

## Consequences

**正面**:
- 补 code-review-and-quality skill 解决悬空依赖, 跟 agents/README L 引用对齐
- code-reviewer L67 prose 改 + dispatcher 不派 code-reviewer 解决 orchestrator-vs-persona 边界
- harness-map.md 提供跨 harness 层 inventory + 决策位置表, 后续 v0.7.0+ 实施有 SSOT
- 三体 S1-S6 决策位置分工落地 (改前 ACR / 改后 code-review + audit-agent / pre-merge maintainability-reviewer)
- 一站式收口 user-level 资产, 避免 v0.7.0 实施时再补

**负面**:
- **越权**: user-level 资产 (`~/.claude/skills/`, `~/.claude/agents/`) 不归 arthurpower plugin 管, 跨治理边界
- arthurpower 职责面拓宽 (从 plugin 内变 harness 层 cross-scope)
- 越权改完触发 Claude Code 启动错误风险 (回滚需要 .bak 还原)

**CLAUDE.md 合规**:
- 符合 "全权委托模式" (V 明确授权越权)
- 跟 `serena.md` "不删已有功能代码除非 V 明确要求" 一致 (V 现在明确要求)
- 跟 `self-evolving.md` 6 步流程一致 (防越权乱改)

## Considered Options

### Option A: arthurpower 实际去改 user-level 资产 (本 ADR 采纳, V "纳入" 拍板)
- Pros: 一站式收口, 解决悬空依赖 + orchestrator friction + inventory 缺失
- Cons: 越权, 职责面拓宽, 越权改错风险

### Option B: 仅在 arthurpower 文档登记 inventory (第 1 轮 AskUserQuestion 选项 a, V 否决)
- Pros: 不越权, 职责清晰
- Cons: 悬空依赖不解决, orchestrator friction 不解决, inventory 改完脱节

### Option C: 仅 inventory + Phase 1 加 user-level 变更建议清单 (不强改) (第 1 轮选项 c, V 否决)
- Pros: 平衡
- Cons: 同 B, 不解决实质问题

## Why not B/C

未来 agent 重提时参考: V 已选 A (实际越权改) 而非 B/C (仅 inventory). 选 B/C 留 3 个 deferred 问题: (1) 悬空依赖 code-review-and-quality skill 缺失; (2) code-reviewer L67 prose vs dispatcher 摩擦; (3) inventory 缺失. 选 A 用 self-evolving 6 步 + .bak 备份 + boundary-testing 验把越权风险控住, 一次性收口.

## 跨引

- `docs/spec/v0.7.0-patch-plans.md` §2: user-level 4 项纳入详细落地步骤
- `docs/spec/v0.7.0-decisions.md` §4 第 11-14 轮: 5 个冲突/失误盘点 + 重新裁决
- `docs/spec/v0.7.0-main-plan.md` §3 Phase 1 步骤 12: 落地时机
- `agents/README.md` L "Three layers": 引用 code-review-and-quality skill 的 SSOT
