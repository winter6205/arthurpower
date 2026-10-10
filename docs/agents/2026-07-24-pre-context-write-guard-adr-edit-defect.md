# Hook Guard Defect — pre-context-write-guard blocks Edit on existing ADRs

**日期**: 2026-07-24
**类型**: Hook guard 不对称缺陷（asymmetry）
**严重度**: 中（功能性阻断，非安全/数据风险）
**状态**: 已记录，待独立 ADR + ticket 修复

## 问题诊断

`arthurpower/hooks/pre-context-write-guard.ts` 中 `validateAdr`（L299-327）**没有 `mode` 参数**，对 ADR 文件的 `Write/Edit/MultiEdit` 一律跑全量 5-check：

- `hasTitle` — 要求 `^#\s+NNNN\.\s+.+`
- `hasDate` — 要求 `Date: YYYY-MM-DD` 行
- `hasStatus` — 枚举 `proposed | accepted | deprecated | superseded by NNNN`
- 三章节互斥检查（任一出现则全部要求）

而 `validateContext`（L284-297）显式区分 `mode='edit'` vs `mode='write'`：

- `mode='edit'`（Edit/MultiEdit）→ 仅跑 fragment 级 `hasTerm` 检查
- `mode='write'`（Write）→ 全量 3-check

## 触发路径

handler（约 L528-536）对 ADR 文件调用 `validateAdr(content, number)`，**未按 toolName 传 mode**：

```
checkAdrUniqueness(filePath, adrMatch[2]);  // L533
validateAdr(content, adrMatch[2]);           // L534
```

对比 CONTEXT.md 分支（L515-526）有 mode 判断：

```
const mode = (toolName === 'Edit' || toolName === 'MultiEdit') ? 'edit' : 'write';  // L523
validateContext(content, label, mode);                                            // L524
```

`content` 提取优先级（L402-417）固定为 `content > new_string > edits`：

- **Write** 工具：`content` = 完整文件 → 含标题/Date/Status/章节 → **通过**
- **Edit** 工具：`content` 为空 → 落到 `new_string` fragment（如 `Date: ...\nStatus: accepted`）→ 缺标题行 → **block**，报错 `ADR 标题行缺少 NNNN. 前缀`

## 影响

任何对已存在 ADR 的 Edit（fragment 级 patch，不含标题行）都被 block；只有 Write（全文件覆写）能通过。这使正常编辑既有 ADR（翻转 Status、补充注解、加 `> Contradicts ADR-NNNN` 标注）必须用 Write 工具而非 Edit——违反工具语义（Edit 用于 surgical patch，Write 用于 full overwrite）。

非破坏性但每次 Edit 都需重写整文件，容易引入 diff 噪音，且触发更大的 diff 审查面。

## 临时绕过（非 bypass hook）

用 **Write 全文件覆写** 代替 Edit。guard 对 Write 的完整文件内容照常跑 validateAdr 全量校验——**hook 仍在运行，不是绕过**：

1. `Read` 整个 ADR
2. 复制原文到目标位置，本地修改需改字段
3. 用 `Write` 工具整文件覆写（需保证含 `# NNNN. ...` 标题、Date、Status）
4. guard 跑 5-check → 通过

代价：每次 Edit 退化为 Write，diff 噪音 ↑，未来如发生 ADR 章节顺序调整，写错概率 ↑。

## 正确修复方向

给 `validateAdr` 加 `mode='edit'` 宽松分支，**镜像** `validateContext` 的处理：

- `mode='edit'`（Edit/MultiEdit）→ 只校验 fragment 内**出现的字段合法性**（如 `Status:` 值在枚举内、`Date:` 格式正确），不要求标题行、不要求章节完整性
- `mode='write'`（Write）→ 保留全量 5-check 不变

handler ADR 分支（L528-536）需补 mode 判断（同 L523 写法）：

```
const mode = (toolName === 'Edit' || toolName === 'MultiEdit') ? 'edit' : 'write';
validateAdr(content, adrMatch[2], mode);
```

**纪律注意**：此修复属 10-hook 变更，按 `arthurpower/CLAUDE.md` §"10-hook 不可 regress" 需独立 ADR + ticket，不得混入其他任务。

## 发现场景

2026-07-24，实施 `plans/code-review-dual-subagent.md` 的 T1（accept ADR-0017 + 注解 ADR-0002 superseded）时，Edit 两个 ADR 均被 block：

- ADR-0017：`Status: proposed` → `Status: accepted` 的 Edit 被 block（缺标题行）
- ADR-0002：补 `> Superseded by ADR-0017` 注解的 Edit 被 block（缺标题行）

改用 Write 整文件覆写后通过。本次留档是为后续独立修复任务留痕。

## 关键 file:line 证据

| 项 | file:line | 状态 |
|----|-----------|------|
| `validateContext` mode 参数声明 | `pre-context-write-guard.ts:284` | 已实现 |
| `validateContext` edit 分支 | `pre-context-write-guard.ts:287-290` | 已实现 |
| `validateContext` write 分支 | `pre-context-write-guard.ts:291-296` | 已实现 |
| `validateAdr` 签名（无 mode） | `pre-context-write-guard.ts:299` | **缺陷点** |
| `validateAdr` 5-check 主体 | `pre-context-write-guard.ts:299-327` | 全量，无 edit 放宽 |
| handler content 提取优先级 | `pre-context-write-guard.ts:402-417` | content > new_string > edits |
| handler CONTEXT.md mode 分支 | `pre-context-write-guard.ts:521-524` | 已实现 |
| handler ADR 分支（无 mode） | `pre-context-write-guard.ts:528-536` | **缺陷点** |

## 后续动作

1. **新 ticket**：开独立 ticket 跟踪 `validateAdr` mode='edit' 放宽修复
2. **新 ADR**：按 10-hook 变更纪律，先开 ADR 说明回归风险 + 修复方向 + 单元测试范围（Edit fragment 合法性校验 + Write 全量校验回归）
3. **本留档**：作为 ticket 引用源（不留 commit，避免与其他任务争 index lock）