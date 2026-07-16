---
name: dispatching-parallel-agents
description: Use when 2+ independent tasks can run without shared mutable state, when context isolation is needed between tasks, when parallel subagent dispatch is requested, when batch review of multiple files is required, or when the user requests fan-out across independent investigations.
---

# Dispatching Parallel Agents

## When to use

- **2+ 真正独立的任务** (无共享文件 / 共享 DB / 共享 config)
- **单 agent context 爆炸** (调查 6 个 test 文件失败 = 拆分)
- **并行审查不同文件** (spec 合规 + code quality 两阶段, 文件不重叠)
- **独立探索陌生代码** (摸 3 个未熟悉的 module, 各派 1 个 subagent)
- **批量修复 N 个同类 bug** (N 个独立 file, N 个 subagent 并行)

## When not to use

- **任务间有依赖** (task B 读 task A 的输出 → 必须 sequence, 不是 parallel)
- **单 trivial 任务** (subagent setup cost > 任务本身)
- **user 明确说顺序跑** ("先 X 再 Y" → 不要自作主张 dispatch)
- **subagent 会并发改同一文件** (conflict 风险, 走 sequence)

## Procedure

1. **Identify independent tasks** — confirm no shared mutable state, no cross-task file overlap, no dependency on peer outputs.
2. **Write 7-field subagent prompts** — ROLE / SCOPE / PERMISSION / REFERENCE / CONSTRAINTS / DELIVERABLE / OUTPUT RULES.
3. **Parallel dispatch in 1 message** — multiple Agent invokes in a single message, not sequential.
4. **Collect structured results** — each subagent returns verifiable output (test results, file paths, diff stats).
5. **Cross-check** — run scope-creep / file-conflict / commit-atomicity checks before integration.
6. **Integrate** — final commit only after all subagents complete and cross-check passes.

See [`references/procedure-details.md`](references/procedure-details.md) for the full 6-step workflow expansion.

## Subagent Prompt Template

Inline skeleton (full template in `references/prompt-template.md`):

```
ROLE:        <subagent identity + model>
SCOPE:       ≤ 1 file OR ≤ 1 logical task, ≤ 500 lines
PERMISSION:  <allowed tools + read/write/edit scopes>
REFERENCE:   <paths / docs / runnable commands the subagent must read first>
CONSTRAINTS: <anti-patterns to avoid, e.g. no scope creep, no premature optimization>
DELIVERABLE: <concrete artifact: test pass, file diff, structured report>
OUTPUT:      <format + return-path: file location, JSON shape, exact token string>
```

**关键**: ROLE / SCOPE / PERMISSION 三项缺失任意一项 = subagent 必失败或 scope 漂移。CONSTRAINTS 缺失 = 顺手优化反模式。

## Acceptance Criteria

- [ ] 2+ 任务真正独立 (无共享状态 / 共享文件)
- [ ] 每个 subagent 有 explicit scope (1 文件 or 1 逻辑任务, ≤ 500 行)
- [ ] Subagents **真正并行 dispatch** (1 message, 多个 Agent invokes, 不是串行)
- [ ] 每个 subagent 输出 structured + verifiable (有 test 输出, 不是"看起来好")
- [ ] 主代理 cross-check 过 (scope creep / file conflict / 协作规范)
- [ ] Final integration (commit) 在所有 subagent 完成 + cross-check 后

## Example

See [`references/example.md`](references/example.md) for a full 6-step walkthrough: 1 message 3 subagent parallel review across 3 unrelated files, with cross-check bash commands and integration pattern.

## Verification

```
Skill type: discipline
Bar level:  discipline
```

Inline smoke check:

```bash
git diff --stat HEAD && pytest tests/ -q --co | tail -5
```

Then run the manual cross-check table (scope creep / file conflict / commit atomicity / test exit code) per [`references/verification.md`](references/verification.md).

**Acceptance command**: `echo "PASS = N subagents dispatched, N results synthesized, 0 conflicts"`

## Rationalization Table

| 想偷懒 / 跳步 | 实际后果 | Corrective action |
|---------------|----------|-------------------|
| "trivial 任务也派 subagent" | Setup cost > 任务本身. 主代理 30 秒搞定, subagent 5 分钟起 | Sequence, 不要 dispatch |
| "Subagent 能读其他 subagent 的输出" | Cross-subagent 依赖 = sequential, 不是 parallel. 派单 = 假并行 | 改成 sequence |
| "派 10 个 subagent 加速" | 10 subagents = 10× context cost. unless explicit user requirement, 2-3 ceiling | 2-3 subagents |
| "Subagent 不读源码直接改" | Blind work = 必出错. 子代理没看代码 = 凭印象改 | 强制 REFERENCE 段 |
| "我不 cross-check 直接合" | Cross-check = integration step. 跳过 = 静默 conflict 落地 | 走 §5 cross-check |
| "user 说 dispatch, 不用验证" | user dispatch request = dispatch permission, 不是允许跳过 verification | 跑 Verification 4 条 |

## Red Flags

- 2+ subagents 编辑同一文件 (conflict 必发)
- Subagent scope > 500 行 OR > 1 逻辑任务 OR 顺手优化 (scope creep)
- Subagent prompt 缺 PERMISSION / SCOPE / REFERENCE (任一缺失 = subagent 迷失或漂移)
- Subagent 输出无 verification step ("看起来好" / "应该 work" 都是失败模式)
- 主代理跳过 cross-check (无 `git diff --stat` 就 commit)
- "I'll just merge the subagent outputs" — 不合成 = 不集成 = 表面完成
- 并行 dispatch 后立刻 commit (subagent 可能 in-flight)
- Subagent prompt 含 "think aloud" / "explain your approach" — preamble 禁
- "I'll dispatch 5 subagents to be safe" — 5 = 浪费, 2-3 顶到天

## Required Baseline

**Zero tolerance** — subagent scope = 1 文件 or 1 逻辑任务, parallel 仅当真正独立, cross-check 在 integration 前。

VERIFICATION = "PASS = N subagents dispatched, N results synthesized, 0 conflicts, 全部 subagent ≤ 500 行 scope, 主代理 cross-check 通过"