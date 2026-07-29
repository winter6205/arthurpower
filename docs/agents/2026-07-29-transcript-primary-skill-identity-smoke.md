# Transcript-primary skill-identity smoke - ADR-0022 实测留档

**日期**: 2026-07-29
**类型**: Hook identity-layer 修复实测（driver-level + 真实 FS）
**严重度**: 高（allow-path 安全盲区，违反 ADR-0005 写 authority）
**状态**: 已修复 + 已实测 + ADR-0022 已落盘

## 关联

- ADR: `docs/adr/0022-transcript-primary-skill-identity.md`
- 改动: `arthurpower/hooks/pre-context-write-guard.ts` + `arthurpower/hooks/tests/pre-context-write-guard.test.ts`
- 依赖 ADR: ADR-0005（写 authority）/ ADR-0014（routing-sync bridge）/ ADR-0018（edit-mode leniency）

## 根因（一句话）

`pre-context-write-guard.ts` 的 gh-43 transcript 兜底只在 **block 路径**触发；**allow 路径**（routing-state.skill 命中白名单）完全不查 transcript，routing-state 过期（`identityCheckDisabled=true`）时身份层整个跳过、结构层变成事实 authority。

两个缺陷叠加，使 slash 切换 skill 后残留的旧 skill 名被 allow 路径盲信。

## 选型（A vs G）

| 方案 | 改动 | 致命点 | 结论 |
|------|------|--------|------|
| A（TTL 5s->5min） | 1 行 | 把 allow 路径盲区窗口放大 60x；slash 切换后 5min 内非授权 skill 写 CONTEXT.md 误 allow | **reject** |
| G（transcript 主信号） | ~30 行 + 测试 | transcript 可读时以最近激活为准，routing-state 降级 fallback；allow 路径也查 | **accept** |

选型由 boundary-testing axis1（22 条场景）+ axis2（真实 FS exit code）验证。

## 实测证据（driver-level，真实 FS + 真实 JSON + 真实 cwd）

### 修复前（master，axis2 跑）

| 场景 | routing-state | transcript 最近激活 | ADR-0005 期望 | master 实测 | stderr 含 transcript？ |
|------|---------------|-------------------|-------------|------------|----------------------|
| SMK-1 (C1) | domain-modeling（新鲜） | `/arthurpower:code-review` | BLOCK | **ALLOW (exit 0)** | 无 |
| SMK-2 (C5) | 过期（TTL 5s） | `/arthurpower:tdd-protocol` | BLOCK | **ALLOW (exit 0)** | 无 |
| 对照 | code-review（非授权） | `/arthurpower:domain-modeling` | ALLOW | ALLOW (exit 0) | 有（gh-43 override） |

对照证明 transcript 仅 block 路径查；allow 路径完全跳过。

### 修复后（G 方案落盘 + ordering 修正）

| 场景 | 期望 | 实测 | 证据 |
|------|------|------|------|
| SMK-1 (C1) | BLOCK | **exit 2** | `identity from transcript: "code-review"` + BLOCKED active skill "code-review" |
| SMK-2 (C5) | BLOCK | **exit 2** | `identity from transcript: "tdd-protocol"` + BLOCKED active skill "tdd-protocol" |
| Control 合法 domain-modeling | ALLOW | **exit 0** | `identity from transcript: "domain-modeling"` |
| Control gh-43 override（routing=code-review，transcript=domain-modeling） | ALLOW | **exit 0** | `identity from transcript: "domain-modeling"` |
| Control 双不可读 fail-open | ALLOW | **exit 0** | `routing-state + transcript both unreadable; identity check skipped` |
| C6 readable 但无激活标记 | BLOCK | **exit 2** | `transcript readable but no skill activation; blocking non-authorized` |

## code-review 抓出的 ordering bug（High，已修）

初版实现把 `identityCheckDisabled = activeSkill === null` 计算在 `'__none__'` override 之前。当 transcript 可读但无激活标记时，`activeSkill` 被改成 `'__none__'`，但 `identityCheckDisabled` 仍为 `true`（基于改之前的 null），导致走 fail-open 分支而不是 block--与 C5 同形状的 regression。

**实证**（verify-cr.mjs）：
- 修复前：`exit 0`，stderr `routing-state + transcript both unreadable; identity check skipped`（误报）
- 修复后：`exit 2`，stderr `transcript readable but no skill activation; blocking non-authorized` + BLOCKED

**修正**：`identityCheckDisabled = activeSkill === null && !transcript.readable`（transcript 可读时不进 fail-open）；`__none__` sentinel 由 `transcriptHasMarker` boolean 替代。

## 单元测试

`tests/pre-context-write-guard.test.ts` 加 3 条失败测试（TDD red->green）：

| 测试 | 场景 | 期望 |
|------|------|------|
| C1 | routing-state=domain-modeling + transcript 最近=code-review slash (Write) | block (exit 2) |
| C5 | routing-state 过期 + transcript 最近=tdd-protocol slash (Edit glossary) | block (exit 2) |
| C6 | transcript 可读但无激活标记 (Write) | block (exit 2) |

全套 **24/24 绿**，21 条原测试无回归。

## 关键 file:line 证据

| 项 | file:line | 状态 |
|----|-----------|------|
| `readLatestSkillFromTranscript`（替代 `transcriptCorroborates`） | `pre-context-write-guard.ts:247` | 新增，返回 `{readable, skill}` |
| transcript 主信号判定 | `pre-context-write-guard.ts:462-482` | routing-state 降级 fallback |
| `identityCheckDisabled` 重算（ordering 修正） | `pre-context-write-guard.ts:481` | `&& !transcript.readable` |
| allow 路径查 transcript（修盲区） | `pre-context-write-guard.ts:514` | 不再 routing-state 单点决定 |
| C1/C5/C6 测试 | `pre-context-write-guard.test.ts:296-369` | red->green |
| 签名 mock helper | `pre-context-write-guard.test.ts:283` | 镜像 ipc-core 算法 |

## 未验证 / 遗留

- F1 subagent 跨 agent 状态继承：transcript 可能只含主 agent 记录，G 无法完全识别 subagent 是否继承主 agent skill 激活。留待后续 ADR（ADR-0022 Consequences 已记）。
- E4 transcript 64KB 截断：降级到 routing-state（可能 stale），最坏退到结构层。边界，不优于现状。
- plugin 镜像副本（`~/.claude/plugins/...`）未 apply：仓库是工作副本，发布流程归 V。

## 后续动作

1. ✅ ADR-0022 落盘（domain-modeling 写 authority）
2. ✅ hook + 测试修复 + ordering bug 修正
3. ✅ verification-before-completion gate PASS
4. ⬜ plugin 镜像副本 apply（发布流程，本次不做）
5. ⬜ F1 subagent 继承问题（后续 ADR）
