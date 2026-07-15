# arthurpower v0.7.0 spec

> arthurpower plugin v0.6.0 -> v0.7.0 改造的结构化方案文档集.
> 来源: 14 轮 adversarial self-review 裁决 + 4 份并行子代理调研 + V 拍板.
> 生成日期: 2026-07-15.

---

## 阅读顺序

| # | 文件 | 用途 | 谁读 |
|---|------|------|------|
| 1 | **`v0.7.0-main-plan.md`** | 主计划: 5 项核心改造 + Phase 1-5 实施路线 | V 审阅 + 实施者执行 |
| 2 | **`v0.7.0-patch-plans.md`** | 额外修补计划: rules 优化 + user-level 纳入 + 沉淀更正 | V 审阅 + 实施者执行 |
| 3 | `v0.7.0-decisions.md` | 决策记录: 14 轮裁决详记 + V 拍板 + 关键裁定 | 实施前读 (避免凭印象改) |
| 4 | `v0.7.0-research.md` | 调研支撑: 4 份子代理报告 + the baseline 8 主题演进 | 有疑问时溯源 |
| 5 | `v0.7.0-handoff.md` | 下个 session 交接 | 下个 session 第一句话读 |

**快速入门** (5 分钟): 读 `v0.7.0-main-plan.md` §1 TL;DR + §2 核心改造 5 项.

**实施前必读**: `v0.7.0-decisions.md` §6 关键裁定 (3 个高优先级: plugin.json 路径格式 / domain-modeling 加载 / 三体 S1-S6 分工).

---

## 主计划 vs 额外修补计划

### 主计划 (`v0.7.0-main-plan.md`)

arthurpower plugin **自身核心改造**, 5 项:

1. **分类调整**: 25 model + 1 user -> 9 user + 17 model (5 轮裁决)
2. **新增 code-review skill**: v-code-review CLI 集成 + 双维度 + Fowler smell (V 赞同)
3. **wayfinder router 分支**: 规模路由 + writing-plans decision ticket (V 采纳)
4. **domain-modeling 加载**: 维持 model-invoked (design 立约)
5. **6-bucket 组织法路线**: v0.8.0 引入, v1.0.0 publish

Phase 路线: v0.7.0 (分类 + 新 skill) -> v0.8.0 (6-bucket) -> v0.9.0 (wayfinder skill + docs) -> v1.0.0 (publish).

### 额外修补计划 (`v0.7.0-patch-plans.md`)

3 个独立配套修补, 跟主计划 Phase 1 并行或紧跟:

1. **rules 优化** (子代理 #7 报告):
   - 新建 `rules/code-review-protocol.md` (高优先级, V 赞同同 cycle)
   - 修 4 处 stale (3 处悬空跨引 + 1 处 skill 名错配, V "是的")
   - context-loop.md §2.1 补充段 (中优先级)
   - 其余 rules 优化推 v0.8.0+ (低优先级)
2. **user-level 资产纳入** (V "纳入", 越权授权):
   - 补 `code-review-and-quality` skill (悬空依赖真根因)
   - 改 code-reviewer agent L67 (dispatcher 例外)
   - 改 arthurpower-dispatcher (不派 code-reviewer)
   - 建 harness-map.md (inventory + 三体 S1-S6 决策位置表)
3. **CONTEXT.md L50 沉淀更正** (走 self-evolving):
   - "skills 字段 schema 不接受数组" (错) -> "接受相对路径数组, 格式分两阶段"

---

## V 拍板 (本 session)

| # | 拍板 | 落地 |
|---|------|------|
| 1 | wayfinder 方案采纳 | main-plan §2.3 |
| 2 | domain-modeling model-invoked | main-plan §2.4 |
| 3 | code-review skill + rule 同 cycle 立好 (赞同) | main-plan §2.2 + patch-plans §1.1 |
| 4 | 3 处悬空跨引 + 1 处 skill 名错配本次修 (是的) | patch-plans §1.2 |
| 5 | Deferred 3 项 user-level 资产纳入 (纳入, 越权) | patch-plans §2 |

---

## 待 V 字面 "执行" (实施未启动)

本 spec 是**计划交付** (V 第一轮拍板 "只出方案"). V 已拍板 3 项决策点, 但**实施未启动**.

**实施触发**: V 字面 "执行 v0.7.0" / "改 v0.7.0 分类" / "开始实施 Phase 1".

**实施顺序**: 按 `v0.7.0-main-plan.md` §3 Phase 1 步骤 1-17, 每步走前读 `v0.7.0-decisions.md` 对应裁决.

---

## 旧文件 (保留历史, 不删)

- `docs/refactor-plan-v0.7.md` -- 本次拆分源 (1100+ 行, 决策 + 调研 + 修补全堆一起, 已拆到本 spec/)
- `docs/handoff/2026-07-15-arthurpower-v0.6.0-upgrade.md` -- 上 session (v0.6.0) 交接
- `docs/Arthuropower_skill_classification.md` -- v0.5.0 分类提案
- `docs/version_diff.md` -- v1.0/1.0.1/1.1/1.2 changeset 调研

---

## 关键裁定 (3 个高优先级, 实施前必读 `v0.7.0-decisions.md` §6)

1. **plugin.json skills 字段路径格式** (实测裁定): 合法 = `./skills/<name>` (平铺) 或 `./skills/<bucket>/<name>` (分桶); 不合法 = 裸名 / 无 `./`. 删字段后回退目录扫描也 work.
2. **domain-modeling 加载方式** (冲突仲裁): 维持 model-invoked (design 立约 + the baseline 对齐), 写主权靠 hook + discipline 三层保证.
3. **三体 S1-S6 决策位置分工** (V 让找的冲突解决): 改前 ACR / 改后 code-review + audit-agent / pre-merge maintainability-reviewer, 靠作用域 + 时点分工.

---

## 成功标准 (Phase 1 验收)

- arthurpower@arthurpower-local v0.7.0 enabled, `claude plugin list` ✔
- 27 skill 全在 registry (26 + code-review)
- 9 user + 17 model 分类生效, description trigger 无漂移
- rules/code-review-protocol.md + 4 处 stale 修完
- user-level 4 项纳入
- boundary-testing 6 步全 PASS
- plugin 双副本 sha256 一致
- context-loop-refactor.md §1.2 L37 drift 兑现
