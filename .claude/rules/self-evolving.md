---
name: self-evolving
description: 记忆整理 (新增/合并/归档/重写/迁移/清理/配置同步) + 写 L1/L2/skill 必先走 self-evolving 6 流程 + Step 7 知识提取 + post-iteration regression-test
type: feedback
provenance: V 字面 "使用自我迭代技能整理了吗" trigger; 审计未走 self-evolving, 纠错立新规则; 2026-07-13 合并入 self-evolving.md 规则文件 (skill 已归档到 archive.sh.bak/self-evolving-rules-skill/)
---

## self-evolving-rules 加载规则

**触发范围** (V 字面 trigger 综合): 任何以下 7 类记忆整理 + 写 L1 / L2 / skill 任务，第一步调 Skill 工具 invoke `self-evolving-rules`：

| 场景 | 触发词 |
|------|--------|
| 新增 | "新增 memory" / "写新规则" / "加一条规则" |
| 合并 | "合并多个 memory" / "整合碎片" / "dedup" |
| 归档 | "归档 / archive / 废弃" / "标 SUPERSEDED" / "标 ARCHIVED" |
| 重写 | "重写规则" / "改 wording" / "修订现有" |
| 迁移 | "跨层移动" / "从 L1 移到 rules/" / "auto memory 升级" |
| 清理 | "清理陈旧" / "整合 memory" / "删旧文件" |
| 配置同步 | "L1 + auto memory + rules/ 三层同步" / "索引更新" |

Claude Code 端 — `Skill` 工具是唯一加载入口. 不允许凭印象直接 Edit/Write memory 文件而不先 invoke skill.

> **2026-07-13 状态变更**: 原 `D:\workspace\data\skills\self-evolving-rules\` skill 已**合并入本规则文件**（备份在 `archive.sh.bak/self-evolving-rules-skill/`）。理由：skill 形式与 Arthurpower context-loop 写入主权 + `no-meta-specific` Strip 标准 + boundary-testing 纪律三处冲突，且本规则已能驱动主 agent 完成 6 步流程。Step 7 知识提取与 Post-iteration regression-test 是唯一**未重复**的内容，已落入本规则文件。

**6 步流程** (skill 内置): 提炼 → 定位 → 剥离 → 消解 → 润色 → 路由并写入

### Step 7 知识提取（迭代完成后派子代理）

完成 Step 6 写盘后执行。**不是每次迭代都跑**（见 §跳过条件）。

**子代理职责**: 只提取 candidates，**不写任何文件**。每 candidate 含 4 字段：

| 字段 | 含义 |
|------|------|
| 知识描述 | 一句话总结学到了什么 |
| 证据 | 文件路径 + 行号（含 before/after 对比）|
| 适用范围 | 项目特定 / 通用 / 跨工具 |
| 发展性评级 | 高 / 中 / 低 |

**判断标准 = 发展性的有用知识**:

- **保留（高/中）**: 跨场景可复用 / agent 当前不知道但应该知道 / 可推广到 L1/rules/memory/skill / 不与已有规则冲突
- **丢弃（低）**: 项目特定配置 / 一次性修复 / 临时调试结果 / 跟已知规则重复

**子代理 prompt 模板**:

```markdown
扫描以下改动文件，提取发展性有用知识 candidates。**只提取不写文件**。

改动文件: {files}
改动类型: {改写/删除/新增}

每 candidate 输出:
- 知识描述
- 证据（文件 + 行号 + before/after）
- 适用范围（项目特定 / 通用 / 跨工具）
- 发展性评级（高/中/低）

保留: reusable patterns / 通用反模式 / 新发现耦合 / 跨工具技巧
丢弃: 项目特定配置 / 一次性修复 / 临时调试结果

≤ 10 candidates。返回 JSON。
```

**主 agent 过滤判断流程**:

1. 收 candidates 报告
2. 按发展性评级分组（高/中/低）
3. 评级 = 高：触发新迭代（走 6 步流程）
4. 评级 = 中：合并到下一次 self-evolving 触发
5. 评级 = 低：丢弃，不入迭代队列

**跳过条件**（以下任一为真则不执行 Step 7）:

- 改动 < 3 处（不值得迭代）
- 改动完全是局部 bug fix（无 reusable 价值）
- 改动是机械 follow 已存在 skill（已有规则覆盖）
- Step 6 已写盘但未触发 subagent（此时 Step 7 也跳过）

### Post-iteration regression-test

规则改动写入 L1/L2/auto memory 完毕后，**如果项目有 `.evals/`**，跑：

```bash
bash .evals/run.sh
```

确认 baseline 仍 N/N pass。**Fail = 立即回滚规则，重写**。规则改了 → 可能影响 skill 触发 / 行为 → 必须验过 baseline 才算"可持续进化闭环"实装。无 `.evals/` 的项目跳过此步。

**boundary-testing 强制要求**: 沉淀经验类任务（hook / skill / rules / settings.json 改动）**伴随工程实施**时，必须走 boundary-testing-protocol 的 6 步流程验 silent bug。仅靠子代理 smoke 不充分（详见 `boundary-testing-protocol.md`）。

**优先级阶梯** (冲突时按高→低):
1. Managed / 企业策略 — 最高优先级, 不冲突
2. V 显式新指令或更新纠正 — 覆盖更旧结论
3. 作用域具体度 — 项目级覆盖用户级
4. 仍矛盾 — 改写成一条清晰规则，不留副本

## 反模式

- ❌ 凭印象直接 Edit / Write auto memory 文件
- ❌ 在 audit / 整理任务里凭 prompt 的 required sections 走，不 invoke skill
- ❌ "顺便改一下" 顺便 + 多文件改动（违反 Surgical Changes）
- ❌ 加权威自证标签: verbatim / locked / 严守 / 一字不改 / 红线 / 必走 / 硬性 (skill / 产物内禁止, meta-definitional·目标清单)

> 本段的 verbatim / locked / 红线 / 必走 / 硬性 字面引用属必要豁免（反模式段必须字面列出禁词清单），不构成实际违例。`V 字面` 字面引用属必要豁免（出处声明需引用 V 字面 trigger 原文）。

## V 字面真出处

- V 字面 trigger: "你使用自我迭代技能整理了吗，有回答有，没有回答没有"; P1-P5 audit 未走 self-evolving, 纠错立新规则
- V "以后 X" / "启动自我迭代技能" / "规则是 X" 触发词立约 (auto memory `self-evolving-session-2026-06-17.md` + `feedback-skill-authoring-no-inner-monologue.md`)
- 早期: V "记住 X" / "规则沉淀" / "V 纠正" / "规则矛盾" / "规则过期" 触发词立约 (skill SKILL.md "触发词" 段)

## 跨引

- `~/.claude/CLAUDE.md` §"自迭代结束触发" (L132-139) — session 结束触发词, 已扩展含 memory 整理 7 类
- `~/.claude/CLAUDE.md` §"不写非标准化东西" (L141-143) — 引用本专题文件
- `~/.claude/projects/D--Claude-code/memory/self-evolving-session-2026-06-17.md` — V 字面原始 session 记录
- `~/.claude/projects/D--Claude-code/memory/self-evolving-think-depth-2026-06-17.md` — V 字面思考强度段 (UPDATE)
- `~/.claude/projects/D--Claude-code/memory/feedback-commit-per-logical-task.md` — 上一次走 self-evolving 6 步的范例
- `~/.claude/rules/boundary-testing-protocol.md` — 沉淀经验类任务（hook / skill / rules / settings.json 改动）**伴随工程实施**时，**必须**走 boundary-testing-protocol 的 6 步流程验 silent bug。仅靠子代理 smoke 不充分。

## 来源

- 从 `~/.claude/CLAUDE.md` §"自迭代结束触发" (L132-139) + §"不写非标准化东西" (L143) 拆出 + V 字面 trigger 扩展覆盖范围
- 出处: V 字面 "使用自我迭代技能整理了吗" + "完全授权" audit
- 2026-07-13: 原 skill 内容做去重对比后保留独有 3 段（Step 7 + Step 7 跳过条件 + Post-iteration regression-test），删除 skill 目录（备份在 `archive.sh.bak/self-evolving-rules-skill/`）