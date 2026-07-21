# SPEC: Skill Boundary Alignment v1 (wayfinder / spec-driven-development / writing-plans)

> 输入来源：本会话上文"4 件事的边界"梳理 + `docs/CONTEXT.md` L83-84 / L131-141 / L184-188 已存在的术语段 + `docs/adr/0002` / `0007` / `0010` / `0011` / `0012` / `0014`。
> 本 spec = SPECIFY 阶段产物。拆票归 `writing-plans`（ADR-0007 §Decision 2）；本文件不拆 tracer bullet。
> 落点依 `arthurpower:spec-driven-development` §Procedure Step 2 = `specs/<feature>.md`。
> 本 spec 的 verdict SSOT = 本文件 §7（verdict 段），非 PR description（ADR-0007 §Decision 3）。

---

## 1. Objective

把 `wayfinder` / `spec-driven-development` / `writing-plans` 三个 skill 的输入 / 输出契约钉死成 SKILL.md 的固定段，**消除当前 skill 集里"边界靠口头、契约靠引用"的不一致**。

具体三件事：

1. **每个 skill 加 §Input / §Output 两段**（统一 3 段固定格式：prose + table + "does NOT" / "explicit non-outputs"）。
2. **改后总行数不净增**（保留量 ≤ 退役量）——避免 skill 越加越大。
3. **每个 skill 改后跑 `validate_skill.py` + `driver.py` 双层验证**（CONTEXT.md L38 三层验证体系第 1 层 + 第 3 层）。

**范围收敛（operator 2026-07-21 拍定）**：
- ✅ 改 3 个 skill：`wayfinder` / `spec-driven-development` / `writing-plans`。
- ✅ 退役旧段到 `docs/archive/skill-reorg-2026-07-21/<skill>.md`。
- ❌ **不新建任何 skill**。
- ❌ **不写新 ADR**——边界升级是文档级变更，3-condition gate 不触发（CONTEXT.md L77-79 三体分工 + ADR-0007 已固化）。
- ❌ **不改 `CONTEXT.md` 任何术语**——已有 L184-188 wayfinder handoff 段、L131-141 tracer bullet 段、L83-84 router 段全部 exact copy。
- ❌ **不改 9-stage 表格 / 任何 hook 逻辑 / `using-agent-skills` router**。

**核心待验证命题**：三个 SKILL.md 改后，**单段不超过 30 行**（S5 anti-drift 阈值）+ **总行数不净增**（F1 软目标）。这两条是 machine-assertable 的 grep / wc 验证项，不是主观断言。

---

## 2. Tech Stack

- 纯 Markdown 接线：编辑 3 个 SKILL.md，按 D2a/b/c 三档处置（D2a 保留 / D2b 替换 / D2c 退役）。
- 退役落 `docs/archive/skill-reorg-2026-07-21/<skill>.md`（对齐 `docs/archive/acr-reorg-2026-07-18/` 先例）。
- 验证用 `validate_skill.py` + `driver.py`（CONTEXT.md L38 已固化）。
- 无新依赖、无代码、无 hook、无 lockfile 变更。

---

## 3. Commands

本 spec 不引入新命令。复用现有：
- `/wayfinder` → `arthurpower:wayfinder`（不触发 router invariant；本 effort 是文档级补 §Input/Output，**不**改变 flow-placement）。
- `/spec-driven-development` → 同名 skill。
- `writing-plans` 由 spec-driven-development Step 5 自动 handoff，不直接命令唤起。

---

## 4. Project Structure

受影响文件（3 个 skill 改 + 1 个归档目录 + 1 个新 spec）：

```
arthurpower/skills/wayfinder/SKILL.md                        ± §Input / §Output（D2a/b/c 三档）
arthurpower/skills/spec-driven-development/SKILL.md           ± §Input / §Output（D2a/b/c 三档）
arthurpower/skills/writing-plans/SKILL.md                     ± §Input / §Output（D2a/b/c 三档）
docs/archive/skill-reorg-2026-07-21/wayfinder.md              新建（D2c 退役段只读 SSOT）
docs/archive/skill-reorg-2026-07-21/spec-driven-development.md 新建（D2c 退役段只读 SSOT）
docs/archive/skill-reorg-2026-07-21/writing-plans.md          新建（D2c 退役段只读 SSOT）
specs/skill-boundary-alignment-v1.md                          本文件
```

**不触发 router invariant**（CONTEXT.md L169-170）：给现有 skill 加段 ≠ add/rename/remove/flow-placement；不新增 skill，故无需同步 `using-agent-skills`。

**退役落 2 commit**（F3 硬约束 + CONTEXT.md L118-120 atomic-commit ordering）：
- commit 1：归档到 `docs/archive/skill-reorg-2026-07-21/<skill>.md`（顶部写 "why retired: <reason> + superseded by: <new-section>"，F4 硬约束）。
- commit 2：主 SKILL.md 删除对应段。
- **禁止 squash-reorder**——中间状态（主 SKILL.md 已删 / 归档未 commit）会丢追溯链。

---

## 5. Code Style

### 5.1 §Input 段统一模板（3 段固定结构，G2）

```markdown
## Input

<1 段 prose 说明本 skill 的主输入 + 来源>

| Input source | 形态 | 消费方式 |
|---|---|---|
| <source A> | <file / artifact / inline> | <how this skill uses it> |
| <source B> | ... | ... |

**What this skill does NOT consume**：<1 段列明确的"非输入"，避免下游误传>
```

### 5.2 §Output 段统一模板（3 段固定结构，G3）

```markdown
## Output

<1 段 prose 说明本 skill 的主产物 + 落点>

| Artifact | 落点 | 下游消费者 |
|---|---|---|
| <artifact A> | <file path> | <which next skill consumes> |
| <artifact B> | ... | ... |

**Explicit non-outputs**：<1 段列"本 skill 不产什么"，避免上游 / 下游误以为会产>
```

### 5.3 行数 / 引用纪律（G1 / F2）

- §Input / §Output 段**单段不超过 30 行**（S5 阈值）；超出时**强制**把内容移到 `references/input-output.md`，SKILL.md 留 markdown link（CONTEXT.md L116-117 link vs @import 段）。
- 段内**只写本 skill 独有**的契约；其余内容**指 CONTEXT.md / ADR 编号**，不复述（避免重复 → 大）。
- 3 个 skill 改后**总行数不净增**（F1 软目标：`wc -l` 改前 vs 改后，退役量 ≥ 新增量）。

---

## 6. Testing Strategy

三层验证（CONTEXT.md L38）+ 1 个实证断言：

1. **静态结构**：`validate_skill.py` 验改后 3 个 SKILL.md frontmatter / 段 / 长度合规。
2. **文件内容**：`driver.py` 断言每个 SKILL.md：
   - 含 `## Input` 段（grep count ≥ 3，每个 skill 1 个）
   - 含 `## Output` 段（grep count ≥ 3）
   - 单段不超过 30 行（`awk` / Python 行数检查）
   - 总行数不净增（`wc -l` 改前 vs 改后，机器可读阈值）
3. **退役追溯**：`driver.py` 断言 `docs/archive/skill-reorg-2026-07-21/<skill>.md` 各含 "why retired" 段 + "superseded by" 引用。
4. **实证（可选）**：跑一次 wayfinder chart → spec-driven-development → writing-plans 完整链路，断言 §Input/Output 段的描述跟实际数据流一致。

**不跑**：`run_skill_eval.py` 动态响应层——本 effort 是文档级，不改 skill 行为响应，eval 不适用。

---

## 7. Architecture Change Reviewer (5-line verdict)

SSOT = 本文件（本节），非 PR description（ADR-0007 §Decision 3）。

| Verdict | 决议 | 理由 |
|---|---|---|
| **bounded-context-guardian** | yes | 3 个 skill 都在 `engineering` bucket（CONTEXT.md L165-189），跨上下文无 leak |
| **defensive-contract-validator** | yes | §Input 段 table 列输入形态 + 消费方式；§Output 段 table 列产物 + 落点 + 下游；契约覆盖完整 |
| **error-handling-enforcer** | yes | 退役落 2 commit（F3）；归档写 why retired（F4）；无静默吞错 |
| **complexity-anti-drift** | yes | 单段 ≤ 30 行（F2）；3 段固定结构（G2/G3）防止段内膨胀 |
| **minimal-change-verifier** | yes | 1 spec = 1 commit scope；3 skill + 3 归档 = 6 文件 max；无 scope creep |

**整体决议**：所有 5 verdict = yes，本 spec 可进入 handoff-to-writing-plans 阶段（Step 5）。

---

## 8. Success Criteria（二元可断言）

| # | 判据 | 断言方式 |
|---|---|---|
| **SC-1** | 3 个 SKILL.md 各自新增 `## Input` 段 | `grep -c '^## Input$' arthurpower/skills/{wayfinder,spec-driven-development,writing-plans}/SKILL.md` ≥ 3 |
| **SC-2** | 3 个 SKILL.md 各自新增 `## Output` 段 | `grep -c '^## Output$' ...` ≥ 3 |
| **SC-3** | §Input 段含"does NOT consume"子段 | `grep -c 'does NOT consume' ...` ≥ 3 |
| **SC-4** | §Output 段含"Explicit non-outputs"子段 | `grep -c 'Explicit non-outputs' ...` ≥ 3 |
| **SC-5** | §Input 段单段 ≤ 30 行 | `awk '/^## Input$/,/^## /' <file> \| wc -l` ≤ 30 × 3 files |
| **SC-6** | §Output 段单段 ≤ 30 行 | 同 SC-5 |
| **SC-7** | 3 个 SKILL.md 总行数改后 ≤ 改前 | `wc -l` 改前 vs 改后，差值 ≤ 0（F1 软目标） |
| **SC-8** | `docs/archive/skill-reorg-2026-07-21/<skill>.md` 各含 "why retired" 段 | `grep -c 'why retired' ...` ≥ 3 |
| **SC-9** | `docs/archive/skill-reorg-2026-07-21/<skill>.md` 各含 "superseded by" 段 | `grep -c 'superseded by' ...` ≥ 3 |
| **SC-10** | `validate_skill.py` 跑 3 个 SKILL.md 全 PASS | exit 0 |
| **SC-11** | 不写新 ADR | `ls docs/adr/ \| wc -l` 改后 = 改前（当前 13 个，假设无其他 effort 并行） |
| **SC-12** | 不新建 skill | `ls arthurpower/skills/ \| wc -l` 改后 = 改前 |
| **SC-13** | `using-agent-skills` router 文档不动 | git diff 范围不含该文件 |

---

## 9. Boundaries

按 `wayfinder handoff` 边界（CONTEXT.md L187-188）+ 9-stage 表格（CONTEXT.md 第 7 行）：

| 边界类 | 内容 |
|---|---|
| **Always**（永远在 scope） | 改 3 个 SKILL.md；落 2 commit 退役纪律；跑三层验证 |
| **Ask first**（变更前必问） | 退役任何已正确段（除非与新契约冲突）；F1 总行数硬约束 vs 软目标的边界（运营拍板） |
| **Never**（明确不在 scope） | 改 `CONTEXT.md`；改 9-stage 表格；改任何 ADR；改任何 hook；改 `using-agent-skills` router；新建任何 skill；写新 ADR |

**Handoff to writing-plans**：本 spec 通过 ACR 5-line verdict gate（§7 全 yes）后，路由到 `writing-plans`，由其拆 tracer bullet（per-ticket loop 见 ADR-0012：`TDD → code-review → verification → commit`）。

---

## 10. Open Questions

| # | 问题 | 待决时机 |
|---|---|---|
| **OQ-1** | F1（总行数不净增）若 3 个 skill 改后仍净增，是硬约束还是软目标？ | operator 拍板（已标软目标，§5.3 写明） |
| **OQ-2** | D2a 保留段如果与新 §Input/Output 段**部分**重复（如 wayfinder "Plan, don't do" 跟新 §Output 段有交叠），走 D2b 替换还是 D2c 退役？ | writing-plans 阶段 per-bullet 拍 |
| **OQ-3** | 退役段归档格式是否需要 frontmatter（与 SKILL.md frontmatter 对齐）？ | writing-plans 阶段 per-bullet 拍 |
| **OQ-4** | 本 spec 实施后，下一轮 effort 是否同步清理 `using-agent-skills` quick-reference.md（CONTEXT.md L83-84 router 段已有 3 选 1）？ | 下一 effort（**不在本 spec**） |

---

## 11. Handoff

本 spec 完成后路由到 `arthurpower:writing-plans`（spec-driven-development Step 5）。handoff 链接附在 PR body（不替代本 spec 自身 SSOT）。

**实施阶段（writing-plans）预估 tracer bullet 数**：3-5 条（每 skill 1-2 条 = 改 SKILL.md + 落归档），per-bullet 走 per-ticket loop（ADR-0012）。
