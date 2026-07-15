# Example: 1 message 3 subagent parallel review

1 个 1 message 3 subagent parallel review 完整示例, 展示 6 步流程 (识别独立任务 → 写 3 个 prompt → 1 message parallel → structured result → cross-check → 集成).

```typescript
// 场景: workspace 3 个独立模块各 1 份代码审查请求同时落地, 3 个文件零共享状态

// Step 1 — 识别 3 个真正独立任务
//   A: demo-site/src/components/Hero.vue (Vue 3 SFC, 1 文件)
//   B: multi-agent-cli/multi_agent_cli/v5/run.py (Python 3.12, 1 文件)
//   C: project-rag-customer-service/src/api/orders.py (FastAPI, 1 文件)
//   独立性: 不同文件, 无共享 state / config / branch, 无 in-flight 依赖. ✅ 真正独立.

// Step 2 — 写 3 个 self-contained subagent prompt (each 含 ROLE / SCOPE / PERMISSION / REFERENCE / CONSTRAINTS / DELIVERABLE / OUTPUT RULES 7 项)

// Step 3 — 1 条 message 派发 3 个 subagent 并行 (NOT 3 串行 message)
Agent(subagent_type="general-purpose", description="review Hero.vue", prompt="<Subagent 1 prompt>")
Agent(subagent_type="general-purpose", description="review run.py", prompt="<Subagent 2 prompt>")
Agent(subagent_type="general-purpose", description="review orders.py", prompt="<Subagent 3 prompt>")

// Step 4 — 每个 subagent 返回 structured result (issues + test exit code + output summary)
//   Subagent 1: 3 issues, pnpm test exit 0 (12/12 pass)
//   Subagent 2: 5 issues, pytest exit 0 (18/18 pass)
//   Subagent 3: 2 issues, pytest exit 0 (9/9 pass)

// Step 5 — 主代理 cross-check (合成前必跑)
git diff --stat  # 0 文件改动 (review 不 commit, 应为空)
git diff --name-only | sort | uniq -d  # 0 重复 (无 file conflict)
git log -1 --format=%s  # 0 commit (review ≠ fix)
// cross-check 通过: scope creep = 0, file conflict = 0, dependency violation = 0, 协作规范 = 全过

// Step 6 — 集成 (apply review feedback → 后续 commit, 每项 1 commit per S6)
// 对每个 subagent 的 deliverable, 主代理集成 = 按 issue 拆 follow-up task (1 issue 1 follow-up), 不直接 commit review 结果
```

注释: 上例展示了 dispatching-parallel-agents 完整 6 步流程: 识别独立任务 → 写 3 个 self-contained prompt → 1 message parallel → structured result → cross-check → 集成. ROLE / SCOPE / PERMISSION / REFERENCE / CONSTRAINTS / DELIVERABLE / OUTPUT RULES 7 项必含. ready to adapt: 任何 2+ 独立 review / refactor / test 任务都可按这个模式 dispatch.
