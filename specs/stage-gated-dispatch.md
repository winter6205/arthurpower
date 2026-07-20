# SPEC: Stage-Gated Dispatch（环节门禁派发）

> 输入来源：`docs/plans/stage-gated-dispatch-design.md`（wayfinder chart 产出）。
> 本 spec = SPECIFY 阶段产物。拆票归 `writing-plans`（ADR-0007）；本文件不拆 tracer bullet。
> 落点依 `arthurpower:spec-driven-development` = `specs/<feature>.md`（非根目录 SPEC.md）。

---

## 1. Objective

让主代理在识别到任务的**验证/审查环节**时，把该环节派给对应的**现有** S1-S6
verifier 子代理，而非在主线程自跑。机制 = 在每个 S1-S6 skill 的 procedure 顶部
加一段 `## Dispatch` 软指令（**单一权威**，router 不复述）。

**范围收敛（operator 2026-07-21 拍定）**：
- ✅ 定义派发 seam 契约（`## Dispatch` 约定）。
- ✅ 给 6 个现有 S1-S6 verifier agent 接线（经其 skill）。
- ❌ **不新建任何 agent**（implementer / 定义 / 规划环节暂不强加专属 agent）。
- ❌ 不动 10-hook 集（软触发，无 ADR）。

核心待验证命题：**软派发第二跳（skill 加载 → 模型派 agent）能否在真实任务里稳定触发？**
这是本 spec 的第一验证目标，不是假设。

## 2. Tech Stack

- 纯 Markdown 接线：编辑 `arthurpower/skills/<s1-s6>/SKILL.md`，加 `## Dispatch` 段。
- 派发走 Claude Code 原生 Agent 工具 + `subagent_type: "arthurpower:<agent>"`。
- 无新依赖、无代码、无 hook、无 lockfile 变更。

## 3. Commands

本 spec 不引入新命令。复用现有：
- `/audit` → `arthurpower-audit-agent`（已硬接线，不变）。
- `/fanout` → `arthurpower-dispatcher`（已硬接线，不变）。

## 4. Project Structure

受影响文件（全部 additive，加段不改既有逻辑）：

```
arthurpower/skills/bounded-context-guardian/SKILL.md      + ## Dispatch → bounded-context-guardian-agent
arthurpower/skills/defensive-contract-validator/SKILL.md  + ## Dispatch → defensive-contract-validator-agent
arthurpower/skills/error-handling-enforcer/SKILL.md       + ## Dispatch → error-handling-enforcer-agent
arthurpower/skills/test-driven-development/SKILL.md       + ## Dispatch → test-driven-development-agent
arthurpower/skills/complexity-anti-drift/SKILL.md         + ## Dispatch → complexity-anti-drift-agent
arthurpower/skills/minimal-change-verifier/SKILL.md       + ## Dispatch → minimal-change-verifier-agent
specs/stage-gated-dispatch.md                             本文件
```

**不触发 router invariant**：给现有 skill 加段 ≠ add/rename/remove/flow-placement
（router invariant 只约束这四种）；不新增 skill，故无需同步 `using-agent-skills`。

## 5. Code Style

`## Dispatch` 段统一模板（只此一份约定，各 skill 按填）：

```markdown
## Dispatch

本环节由 `arthurpower:<agent-name>` 承接。识别到 <触发时机> 时，用 Agent 工具以
`subagent_type: "arthurpower:<agent-name>"` 派发，而非在主线程自跑。
派发时传：diff 范围 + 本 skill 判据 + 证据格式（file:line + PASS/FAIL）。
软触发：应当派，非必须派；偶发主线程自跑属可接受降级，不视为违规。
```

- 放在 `## Procedure` 之**首**（提高第二跳命中率）。
- 派发指令**只写 skill**；router / 其它文件不复述（杜绝第二份映射 → 无 drift）。

## 6. Testing Strategy

沿用三层验证体系（CONTEXT.md），加一个实证 prototype：

1. **Prototype（第一 tracer bullet，HITL）**：先只给 `bounded-context-guardian`
   一个 skill 加 `## Dispatch`，跑一个真实多文件重构任务，**观察模型是否真的
   派出 `bounded-context-guardian-agent`**（看主对话有无 Task tool + subagent_type）。
   派了 → 命题成立，铺开到其余 5 个；没派 → 调整指令措辞/位置再验，**不铺开**。
2. **静态结构**：`validate_skill.py` 验改后 SKILL.md 格式合规。
3. **文件内容**：`driver.py` 断言 6 个 SKILL.md 各含 `## Dispatch` + 对应 agent 名
   （machine-assertable：grep count ≥ 6）。
4. **动态响应**（可选）：`run_skill_eval.py` 加一条 rubric，验 skill 触发后产出
   含派发意图。

## 7. Boundaries

**Always**
- 派发指令只写 skill 一处（单一权威）。
- 接线是 additive：三体 S1-S6 时点/作用域分区**不动**（CONTEXT.md 硬约束）。
- 先 prototype 验证一个，再铺开（不盲目铺 6 个）。

**Ask first**
- 若 prototype 证明软派发命中率低到不可用，是否升级为 hook 硬触发（需 ADR，碰 10-hook 集）——**先问 operator**。
- 是否给实现/定义/规划环节补专属 agent（本期明确不做，重启需 operator 点头）。

**Never**
- 不新建 agent（本期）。
- 不动 / 不弱化 / 不绕过 10-hook 集。
- 不改 `dispatching-parallel-agents` 的 Restricted 状态。
- 不在 router 里加 agent 映射表（避免第二份映射）。
- 不把三体 S1-S6 合并成一体。

## 8. Success Criteria（binary，machine-assertable）

- [ ] `## Dispatch` 模板约定写入本 spec 并被 6 个 skill 引用（grep `## Dispatch` 于 6 个 SKILL.md，count = 6）。
- [ ] 每个 `## Dispatch` 段的 `subagent_type` 值 == 该 skill 对应的现有 agent 名（driver.py 逐文件断言）。
- [ ] Prototype 实证：`bounded-context-guardian` 接线后，真实任务触发 Task tool + `subagent_type: "arthurpower:bounded-context-guardian-agent"`（观察主对话 tool call，yes/no）。
- [ ] `validate_skill.py` 对 6 个改后 SKILL.md 全 exit 0。
- [ ] router（`using-agent-skills`）**零改动**（git diff 该文件为空）。
- [ ] 无新增 agent 文件（`arthurpower/agents/` 文件数不变）。

## 9. Open Questions

- **软派发命中率**：prototype 若显示模型频繁跳过派发，是否需要更强的指令措辞，
  或（经 operator 同意 + ADR）升级为 hook 硬触发？——本期只验证，不预设答案。
- **实现/定义/规划环节**：是否最终需要专属 agent？本期明确 out，留待后续 wayfinder
  重开目的地时再议。
- **T1 之外的接线**（audit-agent / dispatcher 已在 command 硬接线）是否也需要 skill 侧
  软接线？本期不做，避免与 command 路径重复。

---

## Glossary（逐字摘自 `docs/CONTEXT.md`，不重定义）

**Skill 触发机制**: Claude Code 的 skill 触发由 Claude (主 AI) 自己根据 description (已经在 always-on context 里) 做自然语言匹配, 不是向量检索也不是脚本搜索; 触发后是 Skill tool 注入 body 到当前 Claude, 还是 Task tool spawn 隔离 subagent, 取决于 skill 还是 agent.

**agent vs skill 物理分辨**: 看主对话里的 tool call 名字 - Task tool + subagent_type 字段 -> agent (隔离 Claude 实例); Skill tool + skill 名 -> skill (注入 body 到当前 Claude); Bash/Read/Edit -> 主 Claude 自己. 没有 Task tool = 没有 spawn.

**三体 S1-S6 决策位置分工**: S1–S6 由时点 + 作用域分工：改前 ACR gate、改后预 commit code-review / audit-agent、pre-merge maintainability-reviewer，不合并成一体。详见 `docs/adr/0002` + `docs/adr/0007`。

**router invariant**: promoted skill 的 add / rename / remove / flow-placement 变化，必须在同一 commit 同步 router skill (`arthurpower:using-agent-skills`) 的 SKILL.md；违反 = "a router that lies"。

**linter-as-LLM**: 用 CLAUDE.md / rules 散文让模型记住格式、风格、提交约定，而不是用 hook / formatter / secret-scan 做确定性门禁（never send an LLM to do a linter's job）。

**machine-assertable**: 成功标准 / 边界指标必须能被程序直接检查 (exit code / rate / grep count / sha256), 不能是"看起来对".

**三层验证体系**: skill 编写后的验证分三层, 各管各不重叠. (1) 静态结构 = `validate_skill.py` 验 SKILL.md 格式合规; (2) 动态响应 = `run_skill_eval.py` + `evals.json` 验 skill 触发后产出对不对; (3) 文件内容 = `driver.py` 验 SKILL.md 真实文件含/不含规范关键词.

**tracer bullet**: writing-plans 拥有的最小垂直可交付条目（1 tag + 1 commit + 端到端 demoable），其它 skill 只消费不拆票。详见 `docs/adr/0007`。

## Architectural Constraints（在范围内 ADR）

- **ADR-0007**：ACR gate-only；tracer bullet 归 `writing-plans`（本 spec 不拆票）；
  verdict SSOT = `plans/<feature>.md`。
- **ADR-0008 §5**：linter-as-LLM 禁令只针对**确定性**检查；"何时派发"是语义判断，
  留在 skill 散文（软触发）合规。
- **ADR-0010**：ACR 已 model-invoked；与本 spec 正交，记录在案。
- **CLAUDE.md「10-hook 不可 regress」**：本 spec 不碰 hook；若未来升级硬触发需附 ADR。
