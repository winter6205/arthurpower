---
name: session-handoff
description: Use when a session is ending, a new agent must continue the same task, or the operator mentions session continuity, cross-session relay, token pressure, or next-agent pickup. Compresses the live thread into a project-local handoff document in docs/handoff/ and references already-committed artifacts instead of duplicating them.
version: 1.0.0
tags: [handoff, cross-session, continuity, relay, next-agent, 接班人, 交接, 下一棒, 接力, 续做]
related_skills: [using-agent-skills, domain-modeling, verification-before-completion]
type: discipline
disable-model-invocation: true
---

# Session Handoff

## When to use

- 用户说 "session 要断了"、"跨 session 接力"、"下个 agent 继续"、"交接"、"token 触顶"
- 会话结束时有未完成任务，必须被另一个 session 接力
- 任务跨多个 session，需要轻量连续性 artifact
- 长调试或实现线程需要为下个 agent 做摘要

## When not to use

- 当前会话已无未完成任务
- 单 session 任务已在本会话完成
- 用户显式说 "不需要交接" 或 "do not write a handoff"
- 仅剩一个可立即完成的一行 fix，下一步显而易见
- formal spec / plan / ADR 已完整 capture full state

## Procedure

### Step 1: 识别当前 live 状态

- 当前任务名 + 一句话目标
- 为什么这事重要（业务或技术理由）
- 下个 agent 最关键的下一步动作（作为 `[NEXT]` 标记）

### Step 2: 引用已固化工件

| 类型 | 引用路径（不复制 inline） |
|------|------------------------|
| 领域词汇 | `docs/CONTEXT.md` |
| 决策记录 | `docs/adr/NNNN-slug.md` |
| 计划文件 | `plans/<feature>.md` |
| issue/外部链接 | 原始 URL |

### Step 3: 摘要本轮进展

- 仅列出本 session 变更
- 每个变更：文件路径 + 一行效果
- 已 commit 的变更指向 commit SHA

### Step 4: capture 已验证状态

- 跑过的命令 + exit code / output marker
- 已通过测试 + 已失败测试 + 为什么期望或预期外

### Step 5: 列出 open blockers + next steps

- 每个 next step 是 concrete action，不是模糊意图
- 第一个 next step 标记 `[NEXT]`

### Step 6: 脱敏

- 移除 API key、token、password、credential
- 用环境变量名（`GITHUB_TOKEN`、`MINIMAX_API_KEY`）代替值
- 完整脱敏走 `pre-context-write-guard.cjs`（如可用）

### Step 7: 写入 handoff 文件

写入 `docs/handoff/YYYY-MM-DD-<slug>.md`，slug 匹配任务名。

### Step 8: 验证可消费

- 以下个 agent 视角读回
- 确认 `[NEXT]` step 在一个 session 内可执行
- 确认无 secret 出现在文件中

## Acceptance Criteria

- [ ] handoff 文件存在 `docs/handoff/YYYY-MM-DD-<slug>.md`
- [ ] 文件含恰好一个 `[NEXT]` step
- [ ] 所有已固化工件引用而非 inline 复制
- [ ] 无 API key / token / password / credential 值出现
- [ ] 本轮变更列出文件路径 + 一行效果
- [ ] 已验证状态含至少一个命令或测试结果 + exit marker
- [ ] 新 agent 可在 8 分钟内理解

## Verification

```
Skill type: discipline
Bar level:  discipline
```

```bash
test -f docs/handoff/YYYY-MM-DD-<slug>.md && echo "OK: handoff present"
grep -c "\[NEXT\]" docs/handoff/YYYY-MM-DD-<slug>.md | grep -q "^1$" && echo "OK: one next step"
grep -Eiq "(api[_-]?key|token|password|secret|credential|bearer)" docs/handoff/YYYY-MM-DD-<slug>.md && echo "FAIL: secret found" || echo "OK: no secret"
```

### Rationalization Table

| Rationalization | Why it sounds right | Counter-evidence | Required action |
|-----------------|---------------------|------------------|-----------------|
| "I will just leave it in chat history" | Chat is searchable | Next agent lacks context and must rebuild from scrollback | Write the handoff file |
| "The plan already covers everything" | Plans are durable | Plans describe intent, not live verified state | Add handoff with current blockers |
| "Copying the ADR content to handoff is safer" | More detail feels more complete | Duplication drifts; SSOT is the committed ADR file | Reference the ADR path |
| "Embedding the token saves time" | Next agent will need it | Credential values never belong in documents | Use env var name only |
| "One vague next step is enough" | Details can be discovered later | Vague steps force the next agent to replan | Make `[NEXT]` concrete and executable |
| "OS temp directory keeps the repo clean" | Temporary files avoid clutter | Handoffs must be discoverable in the project tree | Write to `docs/handoff/` |

### Red Flags — STOP

- 将 secret / credential 值写入 handoff 文件
- 完整复制 ADR / spec / plan 内容而非引用路径
- 将 handoff 留在 OS 临时目录而非 `docs/handoff/`
- 多于一个 `[NEXT]` step，或完全无 `[NEXT]` step
- "下个 agent 自己摸索 X" — handoff 必须写具体动作
- handoff 文件超过 300 行 — 将细节推回引用的 artifacts
- 未 capture 已验证状态（tests / commands / exit codes）
- 在用户确认 session 即将结束前就写 handoff

## References

- Handoff template: `references/handoff-template.md`
- Context SSOT: `docs/CONTEXT.md`
- Decision records: `docs/adr/NNNN-slug.md`
- Sanitization guard: `.claude/hooks/pre-context-write-guard.cjs`