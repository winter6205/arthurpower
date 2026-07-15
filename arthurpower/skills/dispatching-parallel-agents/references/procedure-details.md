# Procedure — Detailed Steps

### 1. 识别 2+ 真正独立的任务

共享状态判定 — 任意一条命中 = **不能并行**:

- 同一文件被多个 subagent 修改
- 同一数据库 / 同一 config / 同一 lock
- 同一 git branch 的同一 commit
- task B 依赖 task A 的中间产物 (编译产物 / 临时文件 / 内存对象)

### 2. 为每个任务写 self-contained subagent prompt

每个 prompt 必含:

- **ROLE**: `<senior X> with <Y perspective>` (例如 "senior Vue reviewer with production-mindset")
- **SCOPE**: 1 文件 or 1 逻辑任务 (≤ 500 行, subagent.md §500 行规范)
- **PERMISSION**: read-only / write 1 file / write N files in `<scope>` (明确)
- **REFERENCE**: paths or skill names to read first (e.g. `<project-rules>/serena.md`)
- **CONSTRAINTS**: 协作规范: surgical change, no extra work, no 顺手优化, 1 commit = 1 逻辑任务
- **DELIVERABLE**: 结构化输出格式 (下面 §5 模板)
- **OUTPUT RULES**: 无思考独白, 无前言, deliverable IS the output

### 3. 并行 dispatch

**1 条 message, 多个 Agent tool invokes** (不是串行 3 条 message = 错):

```typescript
// ✅ 正确: 1 message, 3 Agent invokes 并行
Agent(subagent_type="general-purpose", description="review demo-site hero", prompt="...")
Agent(subagent_type="general-purpose", description="review multi-agent-cli v5", prompt="...")
Agent(subagent_type="general-purpose", description="review rag-customer-service api", prompt="...")

// ❌ 错: 3 串行 message
// Agent 1 → 等结果 → Agent 2 → 等结果 → Agent 3  ← 这是 sequence, 不是 parallel
```

### 4. 每个 subagent 返回 structured result

必含 verification step (不是"看起来好了"):

- 具体改了哪些行 / 哪些函数
- 跑了哪些 test (命令 + 输出, 不是"tests pass")
- 任何 deviation from scope (顺手优化 / 范围扩张)

### 5. 主代理 cross-check 结果

合成前必查:

- **Scope creep**: subagent 改了 prompt 之外的文件?
- **File conflict**: 2 个 subagent 改了同一文件? (`git diff --stat` 看)
- **Dependency violation**: subagent 引用了另一个 subagent 的 in-flight 输出?
- **协作规范**: 单文件 > 500 行? 含顺手优化? 1 commit 混了多个逻辑任务?

### 6. 应用最终集成 (commit / push / document)

**仅在所有 subagent 完成 + cross-check 通过后** — 不可 subagent 还在跑就开始 commit (race condition)。
