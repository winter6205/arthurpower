# Source-Item Coverage Map

> Maps each of the 12 source items (V1-V5 + L1-L7) to the Q question that defends it. Loaded on demand from `defend-claim/SKILL.md` §Cross-References.

| Source | Axis | Question |
| --- | --- | --- |
| 读≠跑 | execution | Q1 |
| status≠在用 | execution | Q1 + Q2 |
| 负声明不可信 | provenance | Q2 |
| 文档当前值是快照 | provenance | Q2 |
| 第三方报告≠现状 | provenance | Q2 + Q3 |
| 幻觉 API/包名 | execution | Q1 + Q5 |
| 上下文衰减 | process | Q4 |
| 供应链投毒 | execution | Q1 |
| 硬编码密钥 | execution | Q1 |
| 同义反复测试 | report | Q3 |
| 静默失败 | code-shape | Q5 |
| 凭记忆写 API | process | Q1 + Q3 |

**Out of scope** (use existing skills): S1-S6 maintainability (`arthurpower:minimal-change-verifier`); debug-flow (`arthurpower:systematic-debugging`); evidence capture for known-good work (`arthurpower:verification-before-completion`). This skill is *only* the claim-defensibility layer between work and report.
