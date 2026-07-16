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

---

## 通用 SOP (跨引全局)

通用 6 步流程 + 5 类别样例模板 + Case 1/2 见 `@~/.claude/rules/boundary-testing-protocol.md`。
本文件只保留 **项目特定增量**: 漏洞类别 D (byte-level settings) + Case 3 (GITHUB_TOKEN sha256) + R5 引用。

## 3 个踩坑案例（来自 2026-07-13 D/F hook 实施）
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

- R5 byte-level 编辑纪律：`@~/.claude/CLAUDE.md` §"AI 易错点"
- skill-authoring 12 项硬约束：`arthurpower:skill-authoring`
- 场景测试迭代流程：`D:/workspace/projects/SCENARIO_EVAL_REPORT.md` §"1. Goal"
- self-evolving-rules：`arthurpower:self-evolving-rules` (user-invoked; marketplace + cache under arthurpower-local)