# Boundary Testing Protocol

> **定位**：跨 arthurpower plugin 工程化的可复用 SOP。当实施任何跨多文件、多 hook、多状态、多平台的修改时，用本流程找出 silent bug。
>
> **触发词**：边界测试 / boundary test / 跨文件改动 / 跨 hook 状态 / 子代理报告 / 钩子边界 / hook boundary / 实施前验证 / 端到端验证 / E2E boundary
>
> **不适用**：单行 typo fix / 用户明确说"就改这一处" / 已通过 R5 byte-level 验证的单字段修改

---

## 目标

找出 silent bug、边界条件、跨平台差异、子代理覆盖盲区。在 4 类常见真实漏洞到达生产前拦截：

| 漏洞类别 | 实际案例 | 拦截点 |
|----------|---------|--------|
| **A. 子代理 smoke 不充分** | 子代理报告 5/5 PASS，但用整数 mtime 测，未触发 NTFS 100ns 精度 bug | 主 agent 驱动器级 FS smoke |
| **B. 跨平台精度差** | Python `int(st_mtime * 1000)` vs JS `fs.statSync().mtimeMs` 浮点 vs NTFS 100ns → 比较 `>` 误判 | 10ms 容差或单位对齐 |
| **C. 状态 key 不对齐** | driver 在 tmpdir 跑测试，state JSON key 是 "D:/test"，但 hook 用 `process.cwd()` 算 tmpdir 路径 → 不匹配 | driver 注入 tmp_root 重写 state |
| **D. byte-level settings 编辑破坏 secret** | Edit 工具重写整个文件，GITHUB_TOKEN sha256 改变 → silent auth 失效 | byte-level `rb + regex + wb` + sha256 baseline |

---

## 6 步流程（核心方法论）

### Step 1: 定义成功标准

写下来，作为可断言的指标：

```yaml
success_criteria:
  trigger_accuracy_min: 0.95      # TP rate
  false_trigger_max: 0.05        # FP rate
  negation_boundary_pass: 1.00   # 否定/边界 case 100% 正确
  no_required_behavior_regression: true  # 已通过的样例候选不能变差
```

**关键**：每条指标都要可机器断言。不写"应该正确"——写"TP rate >= 95%"。

### Step 2: 准备 30 样例（5 类别 × 6 个）

**类别模板**（每个分类 6 个 case）：

| 类别 | 用途 | 典型 case 类型 |
|------|------|--------------|
| A 正向控制 | 应该触发 | 直接匹配描述 |
| B 否定/反向 | 不应该触发 | 含 `别/不要/don't` 等否定词 |
| C 歧义/多候选 | 多个候选匹配一个 | 应选对的那一个 |
| D 域外/无匹配 | 完全无关 | 应匹配 0 个 |
| E 反向语义 | 描述词缺但意图存在 | 应能语义匹配 |

**每个 case 必须包含**：输入 + 期望结果 + 类别标签 + 一句话描述。

#### 10-30 个代表性样例（具体模板）

每个边界测试项目必须准备 **10-30 个代表性样例**，覆盖以下 5 类别（每类 2-6 个）。下面是已落地的 3 类样例模板，可直接复用：

##### A 类：正向控制（应该触发）

```yaml
A1:
  input: {tool: "Write", file_path: "docs/CONTEXT.md", content: "# t\n\n## Language\n\n**Foo**: bar.\n"}
  expected: {exit_code: 0, systemMessage: null}
  desc: "legal CONTEXT.md via Write passes"

A2:
  input: {tool: "Bash", command: "echo x > docs/CONTEXT.md"}
  expected: {exit_code: 2, systemMessage: "BLOCKED: ...CONTEXT.md..."}
  desc: "Bash redirect to CONTEXT.md blocked"
```

##### B 类：否定/反向（不应该触发）

```yaml
B1:
  input: {tool: "Write", file_path: "docs/CONTEXT.md", content: "# t\n\n**Foo**: bar.\n"}
  expected: {exit_code: 2, systemMessage: "BLOCKED: ...missing ## Language..."}
  desc: "missing ## Language section blocked"

B2:
  input: {tool: "Bash", command: "rm node_modules/.cache"}
  expected: {exit_code: 0, systemMessage: null}
  desc: "rm of non-context path passes"
```

##### C 类：歧义/多候选（多个候选匹配一个）

```yaml
C1:
  setup:
    team_glossary: {"Account": "billing record"}
    context: {"Account": "auth credential", "_avoid_no_override_marker": true}
  input: {tool: "Write", file_path: "docs/CONTEXT.md", content: "..."}
  expected: {exit_code: 2, systemMessage: "...Account...different meanings..."}
  desc: "team/project conflict without override marker HARD blocks"

C2:
  setup:
    team_glossary: {"Account": "billing record"}
    context: {"Account": "auth credential", "override_marker": "<!-- project-override: auth -->"}
  input: {tool: "Write", file_path: "docs/CONTEXT.md"}
  expected: {exit_code: 0, systemMessage: null}
  desc: "legitimate override with marker silent"
```

##### D 类：域外/无匹配（应匹配 0 个）

```yaml
D1:
  input: {tool: "Write", file_path: "docs/foo.md", content: "any"}
  expected: {exit_code: 0, systemMessage: null}
  desc: "non-context path passes (guard not triggered)"

D2:
  setup: {project: "no CONTEXT.md"}
  input: {tool: "Write", file_path: "src/foo.ts", content: "x"}
  expected: {exit_code: 0, systemMessage: null}
  desc: "no CONTEXT.md -> silent graceful absence"
```

##### E 类：反向语义（描述词缺但意图存在）

```yaml
E1:
  setup: {state: {readMtime: 100, currentMtime: 200}}
  input: {tool: "Write", file_path: "src/foo.ts"}
  expected: {exit_code: 0, systemMessage: "...stale...advisory..."}
  desc: "stale mtime + write src/ -> advisory"

E2:
  input: {tool: "Bash", command: "cp template.ts src/new.ts"}
  expected: {exit_code: 0, systemMessage: "...read docs/CONTEXT.md first..."}
  desc: "Bash cp src/ + no read -> advisory"
```

#### 样例设计自检表（写完 evals.json 后必走）

- [ ] **数量**: 10 ≤ N ≤ 30（少于此数量不构成代表性样本；多于此数量边际收益递减）
- [ ] **类别覆盖**: 5 类别各 ≥ 2 个 case
- [ ] **正负平衡**: 真值 case 数 ≥ 假值 case 数（避免样本偏斜）
- [ ] **自洽性**: 每 case 的 `state + input + expected` 三者不矛盾（例：state 显示"无 record"但 expected 显示"应触发"是矛盾）
- [ ] **边界**: 含空输入、坏 JSON、超长字符串、特殊字符、平台差异（Windows 路径）、并发（如适用）
- [ ] **disc_state 字段**（hook 注入类）：key 路径要么 tmpdir-relative，要么 `~/` 前缀（home-relative），**不要**写死绝对路径
- [ ] **expected_has_msg / expected_exit**: 至少一个被断言；不可两个都 null

### Step 3: 子代理起草 + 子代理 smoke（仅 sanity check）

派子代理实施每个改动。子代理**必须**自己跑一遍 smoke 报告结果。

⚠️ **关键约束**：子代理 smoke **不算验收**。子代理的 smoke 通常：
- 用理想化数据（整数 mtime、无小数）
- 不读真实磁盘
- 不处理 platform-specific 边界
- 不验 side effect

子代理 smoke 通过只能证明"代码不立即崩溃"。**不算功能正确**。

### Step 4: 主 agent 驱动器级 smoke（必跑，**不可跳过**）

主 agent 自己写一个驱动器（Python script），覆盖：

- **真实文件系统**：用 `tempfile.TemporaryDirectory()` + `Path.stat()` 等真实 API
- **真实 JSON 解析**：`json.loads()` 真实解析，不字符串匹配
- **真实 cwd**：`subprocess.run(..., cwd=tmpdir)`，不能用固定路径
- **平台差异显式测**：Windows 路径分隔符、mtime 精度、line ending
- **状态隔离**：每个 case 用独立 tmpdir 或独立 state key
- **并发（如适用）**：多线程同时写 state，验原子性

**失败信号**（看到这些立即停止添加新 case，先修）：
- 子代理说"全 PASS"但驱动器有 FAIL
- 驱动器在 macOS 通过但 Windows FAIL（反之亦然）
- 驱动器在不同 case 间有 state 污染
- 驱动器 FAIL 的 case 集中在某个边界（空、坏 JSON、超长）

### Step 5: A/B 对比 + Step 5 gate 决策

**Step 5 gate**（硬门槛）：**仅当候选版本提升目标指标且无必需行为退化时，才更新实施**。

| 候选结果 | 决策 |
|---------|------|
| TP 升 + FP 降 + 必需行为不退化 | ✅ 采纳 |
| TP 升 + FP 降 + 必需行为退化（如 E_reverse） | ❌ 拒绝，即使 FP 改善 |
| TP 平 + FP 平 | ❌ 不采纳（无价值改动） |
| TP 降或 FP 升 | ❌ 拒绝 |

### Step 6: 变更记录

写一个简短的 changelog：

```markdown
## What changed

### Files created
- <path> — <description>

### Files modified
- <path> — <what + why>

### Files NOT changed (out of scope this cycle)
- <path> — <reason deferred>

## Why

- Bug 1: <one-sentence symptom + root cause + fix>
- Bug 2: ...

## What got better

- <case X>: was FAIL, now PASS (because...)
- <case Y>: was FP, now silent (because...)
```

---

## 3 个踩坑案例（来自 2026-07-13 D/F hook 实施）

### Case 1: 子代理 smoke vs 驱动器级 FS smoke（最关键）

**症状**：子代理实现 D hook（mtime 对比）后报告"5/5 PASS"。但主 agent 跑驱动器级 smoke 时发现 case 2（fresh mtime）误判为 stale。

**根因**：子代理的测试用整数 mtime（如 `record.readMtime = 200`），但 `fs.statSync().mtimeMs` 在 Windows NTFS 上返回 `200.46` 这种浮点数。严格 `>` 比较时浮点大于整数。

**修复**：`currentMtime > record.readMtime + MTIME_TOLERANCE_MS (10)`。

**教训**：**子代理 smoke 用理想数据**（整数、模拟磁盘），**驱动器 smoke 用真实数据**（fs.statSync 浮点、tempdir 真实路径）。两类 smoke 互补不可替代。

### Case 2: state JSON key 与 hook process.cwd() 不匹配

**症状**：D hook 在 driver 中跑测试时 case 1 应触发 advisory 但 silent。

**根因**：driver 在 `tempfile.TemporaryDirectory()` 跑 hook（cwd=tmpdir），但 state JSON 的 key 是 evals.json 里写死的 `"D:/test"`。hook 用 `normalizeSlashes(process.cwd())` 算 key，**两个值不匹配**。

**修复**：driver 在每个 case 启动时把 state JSON 的顶层 key 重写为 `tmp_root`。

**教训**：state 文件按**动态值**（cwd、session_id、project root）索引时，driver 必须**重写 key**，不能假设 evals.json 写死的 key 适用于 tmpdir。

### Case 3: byte-level settings.json 编辑破坏 GITHUB_TOKEN

**症状**：用 Edit 工具改 settings.json 添加 hook entry，结果 GITHUB_TOKEN sha256 改变，下一次 push 走 GitHub 失败。

**根因**：Edit 工具会用新内容重写整个文件，破坏字节级一致性。

**修复**：用 Python byte-level：`rb + regex + wb`。改前 baseline sha256，改后必一致。**绝不用 json.dump / Edit / Write 整文件**。

**教训**：任何包含 secret 字段的配置文件（settings.json、*.env.json、credentials.json），**只能 byte-level 编辑**。Pre-edit sha256 baseline + post-edit 校验必做。

---

## 检查清单（每次跑边界测试必走）

执行前：
- [ ] 成功标准定义（TP/FP/regression 三类指标）
- [ ] 样例设计：含边界（空输入、坏 JSON、超长、特殊字符）
- [ ] 样例自我一致（state + input + expectation 不矛盾）

执行中：
- [ ] 子代理实施 + 子代理 smoke（仅 sanity）
- [ ] **主 agent 驱动器级 smoke 必跑**（真实 FS、真实 JSON、真实 cwd）
- [ ] 跨平台差异显式测（Windows / Linux 至少各 1 个 case）

执行后：
- [ ] A/B 对比 baseline vs 候选
- [ ] Step 5 gate 检查：必需行为不退化
- [ ] 变更记录写齐（文件/原因/改进）

---

## 与其他流程的关系

| 流程 | 关系 |
|------|------|
| **场景测试迭代流程**（Skill routing） | 边界测试是**通用版**，场景测试是其**skill 层应用** |
| **R5 byte-level 编辑纪律** | 边界测试 settings.json 时必走 R5 |
| **Step 5 gate** | 边界测试改动的采纳门槛 |
| **subagent smoke** | 边界测试的快速 sanity 阶段 |
| **driver-level smoke** | 边界测试的严格验收阶段（**必跑，不可跳**） |

---

## 经验启示（精华）

> **子代理 smoke 是必要的但不充分的。**
> 子代理有合理的上下文理解力但缺乏真实执行能力（它写的测试是"如果按我以为的路径执行"）。主 agent 必须独立用真实 API 跑 smoke，因为真实 API 有子代理**想象不到**的边界：NTFS mtime 精度、Windows 路径分隔符、Python int 截断 vs JS float、tmpdir state key 错位。

> **fs/statSync 不可信类型**：永远不要假设文件元数据（mtime、size、ctime）是整数。即使它们在大多数语言里看起来像整数，Node.js 的 `fs.statSync().mtimeMs` 返回浮点 ms。要么用 `Math.floor()` 对齐，要么加 tolerance。

> **state 文件 key 重写是 driver 的责任**：当 hook 用 `process.cwd()` 算 key，driver 在 tmpdir 跑测试时，必须在 case 开始前重写 state 的顶层 key。否则 hook 找不到 record，silent FAIL。

> **byte-level 是 byte-level**：Edit / Write 工具改 settings.json 这种带 secret 的文件会破坏字节级一致性。Pre/post sha256 校验是唯一的护栏。**绝不用 json.dump**。

> **变更记录是可追溯性的核心**：3 个月后看 changelog，应能立即知道"为什么改 / 改了什么 / 哪些样例变好"。变更记录不是文档任务，是工程纪律。

> **完成性声明不能"包装"未完成**：禁止在变更报告 / changelog 中用 ✅ / "成功 = …" / "全 PASS" 等措辞包装 deferred 项、infra-gap 或"目标达成"声明。每一项独立标注 `状态 ∈ {完成, 进行中, deferred, infra-gap}`，deferred 项必标理由与下次 review 触发条件。**完成与否由用户判断，不由主 agent 自评**。

> **已完成 ≠ 全做完**：当前 cycle 的边界测试 PASS 只能证明"本 cycle 改动未引入回归"，不能证明"整个体系无问题"。**逐项列举未完成/未触达项**（含 deferred、infra-gap、未做修复的 bug），而非合并为"成功 = ..." 的一句话总结。

---

## 触发模板（建议复制粘贴）

```markdown
### Run: 边界测试 on <feature>

**目标**：<一句话>
**改动范围**：<文件列表>
**成功标准**：
- TP rate >= <N>
- FP rate <= <N>
- 必需行为不退化

**样例设计**：30 个 (5 类别 × 6)
**驱动器**：<driver 路径>
**运行**：`python <driver> <evals.json>`

**A/B**：
- baseline: <rate>
- candidate: <rate>

**Step 5 gate**：<pass/fail>
**采纳/拒绝**：<理由>
```

---

## References

- 子代理纪律：`D:/workspace/CLAUDE.md` §"子代理纪律"
- R5 byte-level 编辑纪律：`D:/workspace/CLAUDE.md` §"AI 易错点"
- skill-authoring 12 项硬约束：`~/.claude/plugins/arthurpower/skills/skill-authoring/SKILL.md`
- 场景测试迭代流程：`D:/workspace/projects/SCENARIO_EVAL_REPORT.md` §"1. Goal"
- self-evolving-rules：`arthurpower:self-evolving-rules` (user-invoked; marketplace + cache under arthurpower-local; also `~/.claude/skills/self-evolving-rules/`)