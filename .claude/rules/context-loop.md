# Context Loop Rules — 写入主权 + 读侧契约 + ADR 三条件闸门

> 引用基础方法论见 `@~/.claude/rules/context-loop.md` (methodology); 本文件 = Arthurpower 项目落地 (implementation / hooks / 12 defect-to-hook table).

> 引用: 本规则由 `domain-modeling` 与 `setup-arthurpower` 联合维护. 项目级 setup 走 `setup-arthurpower` (一次性).

---

## 1. 写入主权 (唯一)

| 文件 | 唯一写入者 | 其他技能行为 |
|------|-----------|-------------|
| `docs/CONTEXT.md` (单语境) | `domain-modeling` | 调用 domain-modeling 落盘, 不可直接 Edit |
| `docs/CONTEXT-MAP.md` (多语境) | `domain-modeling` | 仅 domain-modeling 写, 业务术语由各子语境 domain-modeling 写子 CONTEXT.md |
| `docs/adr/NNNN-slug.md` | `domain-modeling` (内嵌 ADR 段) | 三条件全真才写, 物理护栏校验 |
| `docs/specs/NNNN-slug.md` | `spec-driven-development` (插件已存在) | 引用 ADR + CONTEXT.md, 不重写 |

**违反写入主权 = 物理 hook 拒收** (走 `pre-context-write-guard.cjs`).

---

## 2. ADR 三条件闸门

```text
[1] Hard to reverse      — 改主意代价大
[2] Surprising w/o ctx   — 未来读者困惑"为啥这么干"
[3] Real trade-off       — 真有备选且选了特定理由

缺任一 → 跳过 (易逆就逆 / 不困惑不必记 / 无备选无记价值)
```

`domain-modeling` ADR 段自检 → 物理 hook 二次校验 → 撞号防护 (扫 `docs/adr/` 最大号 + 1).

---

## 3. 读侧契约

引用 `docs/agents/context-contract.md` (每个 Arthurpower 项目必备).

关键规则:

| 规则 | 落地 |
|------|------|
| 探索前必读 CONTEXT.md + 触及区 ADR | `spec-driven-development` / `writing-plans` / `verification-before-completion` 入口处 |
| 文件缺失 = 静默继续 | 不提示创建, 让术语缺位本身成为写侧触发器 |
| 词汇缺位信号 | 调 domain-modeling 解析, 不自创术语 |
| 冲突标注协议 | `> Contradicts ADR-NNNN — but worth reopening because <理由>` |
| 严禁静默覆盖 | 任何违背 ADR 的输出必须显式标注 |

---

## 4. 12 项致命缺陷的修复落点

| # | 缺陷 | 修复位置 |
|---|------|---------|
| D1 | 缺统一声明入口 | `setup-arthurpower` (一次性 setup) |
| D2 | 写入权限分散 | `domain-modeling` 唯一主权 + `pre-context-write-guard.cjs` 物理护栏 |
| D3 | 无 ADR 子回路 | `domain-modeling` ADR 段 + `docs/adr/` + ADR-FORMAT.md |
| D4 | 读侧消费无契约 | `docs/agents/context-contract.md` |
| D5 | 缺少驱动者 | `deep-dive-protocol` (插件内) |
| D6 | 深化路径缺位 | 插件 `architecture-change-reviewer` 评审 (READ 护栏 + WRITE 提议) |
| D7 | 无冲突标注护栏 | context-contract §4 + 插件 `verification-before-completion` 第 3 项 |
| D8 | 缺失 handoff 桥 | `docs/handoff/<date>.md` (本模板已含) + smart zone 阈值 |
| D9 | 无 schema 自动校验 | `pre-context-write-guard.cjs` |
| D10 | ADR 编号竞态 | `domain-modeling` ADR 段 Step 2 扫最大号 + 1 |
| D11 | ADR 冲突标注无下游闭合 | `verification-before-completion` context-loop 段 + context-contract §4 |
| D12 | 引用点计数不一致 | 19 处引用点已在 `setup-arthurpower` 校验清单中 |

---

## 5. 跨引

- 写入主原语: `.claude/skills/domain-modeling/SKILL.md`
- 写侧驱动者: 插件 `deep-dive-protocol`
- 物理护栏: `.claude/hooks/pre-context-write-guard.cjs` (主) + `.claude/hooks/post-ssot-priority.cjs` (语义层)
- 设置入口: `.claude/skills/setup-arthurpower/SKILL.md`
- 插件主路由: `arthurpower:using-agent-skills` (Rule #4 已绑定 context-loop)
- 插件 Spec 阶段: `arthurpower:spec-driven-development` (含 Context-Loop Pre-Check)
- 插件验收: `arthurpower:verification-before-completion` (含 4 项 FAIL 闸门)

---

## 6. Guardrails and Signals

| 协议 | 落地位置 |
|------|---------|
| 冲突标注 | skill 输出违背 ADR 必须显式 `> Contradicts ADR-NNNN — but worth reopening because <理由>`. 物理护栏: `.claude/hooks/post-conflict-annotation.cjs` |
| 词汇缺位信号 | 技能需要术语但 glossary 缺 → 标记给 domain-modeling 补写, 不可自创 |
| stale-read guard | 任务启动前必读 CONTEXT.md; 写过 src/ 后若 CONTEXT.md 又被改 → `.claude/hooks/pre-stale-read.cjs` advisory |
| read-contract guard | 写 src/ 前若 session 未读 CONTEXT.md → `.claude/hooks/pre-read-contract.cjs` advisory |

**禁止**: 静默覆盖 ADR / 重提被否决方案 / 自创术语绕过 glossary。

---

## 7. Operational Discipline

### 7.1 Concurrent write protection

`.claude/hooks/.locks/` 用于多 session 并发写 context 时的 advisory 锁。
**advisory pattern**: 写锁名 + timestamp → 操作 → 删锁。
**不强制**, 但存在时所有技能必须尊重。

### 7.2 Cross-session handoff

当 session token 用量 > 80% 时, 走 `context-bus` skill 生成 handoff package, 含:
- 当前 task id + goal
- 相关 CONTEXT.md / ADR / SPEC 文件指针
- 待定决策 + 已知阻塞
- 下一步具体动作

接收 session 必先读 handoff package 再继续。

### 7.3 Defensive contract enforcement

任何跨多文件 / 多 hook / 多状态修改, 必走 `.claude/rules/boundary-testing-protocol.md` 的 6 步流程:
成功标准 → 30 样例 → 子代理 smoke → 主 agent driver smoke (真实 FS) → A/B gate → 变更记录。

### 7.4 Override annotation 语法

当 team-glossary 与 project CONTEXT 冲突时, project 端必须显式标注 override:
`**Term**: 项目特有定义 <!-- project-override: 理由 -->`
物理护栏: `.claude/hooks/post-ssot-priority.cjs` 检测此标记决定 hard-block 还是 silent。

---

## 8. Defect-to-rule mapping (12 项缺陷修复落点)

| # | 缺陷 | 修复位置 |
|---|------|---------|
| D1 | 缺统一声明入口 | `setup-arthurpower` (一次性 setup) |
| D2 | 写入权限分散 | `domain-modeling` 唯一主权 + `pre-context-write-guard.cjs` 物理护栏 |
| D3 | 无 ADR 子回路 | `domain-modeling` ADR 段 + `docs/adr/` + ADR-FORMAT.md |
| D4 | 读侧消费无契约 | `docs/agents/context-contract.md` |
| D5 | 缺少驱动者 | `deep-dive-protocol` (插件内) |
| D6 | 深化路径缺位 | 插件 `architecture-change-reviewer` 评审 |
| D7 | 无冲突标注护栏 | `post-conflict-annotation.cjs` + context-contract §4 |
| D8 | 缺失 handoff 桥 | `docs/handoff/<date>.md` + smart zone 阈值 (§7.2) |
| D9 | 无 schema 自动校验 | `pre-context-write-guard.cjs` |
| D10 | ADR 编号竞态 | `domain-modeling` ADR 段 Step 2 扫最大号 + 1 |
| D11 | ADR 冲突标注无下游闭合 | `verification-before-completion` context-loop 段 + context-contract §4 |
| D12 | 引用点计数不一致 | 19 处引用点已在 `setup-arthurpower` 校验清单中 |

**4 个新 hook 增量修复**:
- D_stale_read (mtime 容差 + 排除路径): `pre-stale-read.cjs`
- F_read_contract (session read_paths): `pre-read-contract.cjs`
- C_ssot_priority (team/project/override): `post-ssot-priority.cjs`
- E_conflict_annotation (双通过扫描): `post-conflict-annotation.cjs`