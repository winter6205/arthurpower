# Verifier Agents Provenance Audit — 2026-07-23

## 背景

对 arthurpower 6 个 verifier agent（S1–S6）的 `## Reference` → `Provenance` 行做权威来源核对。
目的：验证引用是否真实、归属是否正确、概念是否忠实于原文。S5（complexity-anti-drift）由用户自行维护，排除在外。

## 核对方法

每个 agent 派一个子代理，用 web_search / web_fetch / arXiv 直查对照真实书籍、论文、文档。
结构化 JSON 返回：每条引用的 verdict（VERIFIED / PARTIAL / WRONG / UNVERIFIABLE）+ 正确归属 + 证据 URL。

## 发现汇总

### S1 bounded-context-guardian

| 引用 | 判定 | 说明 |
|---|---|---|
| Parnas 1972 CACM | VERIFIED | 全名 "On the Criteria To Be Used in Decomposing Systems into Modules"，CACM Vol.15 No.12, 1972。信息隐藏/模块分解。 |
| Simon Brown C4 + Modular Monoliths | VERIFIED | C4 模型 + package-by-component/modular-monolith 确系同一人。 |
| Eric Evans DDD Bounded Contexts | VERIFIED | Bounded Context 是 Evans《Domain-Driven Design》(2003) 的术语。Context Map 在 Ch.14。 |

结论：无伪造，仅缩写精度问题。

### S2 defensive-contract-validator

| 引用 | 判定 | 说明 |
|---|---|---|
| Kent Beck 《TDD: By Example》(2002) | **WRONG** | 书真实，但 "5 boundary classes"（empty/negative/overflow/concurrent/exception）**不在 Beck 书里**。Beck 教 red-green-refactor，不教边界类分类法。伪造归属。 |
| Robert C. Martin SOLID SRP | PARTIAL | SRP 确出自 Martin，但 SRP 讲类内聚/变更理由，与边界测试/覆盖率无关。non-sequitur。 |
| 覆盖率 line≥80% / branch≥70% | **WRONG** | 无权威来源背书。Google Testing Blog (2020) 明确说"没有理想覆盖率数字"，只给 60/75/90 非强制参考。项目约定伪装成权威。 |
| 5 类分类法本身 | ad-hoc | 正统来源是 BVA / Equivalence Partitioning（ISTQB；Craig & Jaskiel 2002）。concurrent 属并发、exception 属错误处理，非边界值类别。 |

结论：最严重——伪造归属 + 无源门槛。

### S3 error-handling-enforcer

| 引用 | 判定 | 说明 |
|---|---|---|
| 《Clean Code》Ch.7 | VERIFIED | Ch.7 = "Error Handling"。准确。 |
| 《Code Complete》Ch.8 | VERIFIED | Ch.8 = "Defensive Programming"。准确。 |
| Amazon Builders' Library "Avoiding Fallback" | **PARTIAL / 立场颠倒** | 真实标题 "Avoiding fallback in distributed systems"（Jacob Gabrielson）。该文主张**根本不要用 fallback**（静态稳定性），而 agent 判据是"fallback 必须带 // EXIT: 注释"——引用立场与判据相反。// EXIT: 是 arthurpower 自创。 |

结论：1 处高严重度立场颠倒。

### S4 test-driven-development

| 引用 | 判定 | 说明 |
|---|---|---|
| Kent Beck "three laws" | **WRONG** | "TDD 三定律"（Three Laws of TDD）是 **Robert C. Martin** 的表述（"The Cycles of TDD", 2014），非 Beck 书内容。Beck 的书是 test-first / red-green-refactor 源头。 |
| Fowler 《Refactoring》2nd ed. | VERIFIED | 2018，行为保持重构。准确。 |
| Google SE@G Ch.12 | VERIFIED | Ch.12 = "Unit Testing"（Erik Kuefler）。但 "no mock 替代真实代码" 的权威论述在 **Ch.13 "Test Doubles"**，非 Ch.12。 |
| 金字塔 ~80/15/5 | PARTIAL | Mike Cohn《Succeeding with Agile》(2009) 提出金字塔**形状**，非固定百分比。SE@G Ch.12 给 ~80/20。15/5 细分无引用，是经验比例。 |
| "feature missing not typo" | 项目约定 | 不可追溯到 Beck/Fowler/SE@G。arthurpower 自创操作化。 |

结论：三定律张冠李戴 + Ch.13 缺失。

### S6 minimal-change-verifier

| 引用 | 判定 | 说明 |
|---|---|---|
| 《The Pragmatic Programmer》Tip 11 DRY | VERIFIED | Tip 11 = "DRY—Don't Repeat Yourself"（1999 第一版）。准确。 |
| Tip 12 Orthogonality | **WRONG** | Tip 12 = "Make It Easy to Reuse"。Orthogonality 是 §8 节标题，对应 **Tip 13** "Eliminate Effects Between Unrelated Things"。编号错误。 |
| arXiv 2603.28592 | VERIFIED | 论文真实：Liu et al. "Debt Behind the AI Boom: A Large-Scale Empirical Study of AI-Generated Code in the Wild"（2026/03/30）。89.3% code smells 统计准确。agent 写的 "AI code rot" 是口语简称，论文框架是 "technical debt"。 |

结论：1 处 Tip 编号错误；arXiv 非伪造。

## 处置

- 核对结果留档于本文件。
- agent 文件内的 Provenance 行已删除（引用无运行时作用，agent 执行判据检查不读文献）。
- Rule source 指针保留（指向 owning skill SKILL.md，有运行时作用）。
- Common LLM failure mode 行保留（操作指导，非文献引用）。

## 未修（超出范围）

- S5（complexity-anti-drift）由用户自行维护。
- agent 命名无角色后缀（属重构）。
- 二级污染：`references/testing-standards.md:17-20` 仍指回死路径。
- 陈旧文档：`docs/Arthuropower_usage.md:51,171`、`claude-md-revision/CLAUDE.md:83`。
