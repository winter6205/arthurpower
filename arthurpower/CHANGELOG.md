# arthurpower changelog

## 0.13.0 — skill cleanup: input-contract-tests + sequential boundary-testing

- Rename `defensive-contract-validator` → `input-contract-tests` (public-entry
  input classes; thin checklist; model-invoked when relevant; not a default
  landing gate). Archive `defensive-contract-validator-agent`.
- Archive `test-driven-development-agent`; TDD skill stays write-time discipline
  only (no default S4 auditor dispatch).
- `boundary-testing`: axis1 **then** axis2 (sequential); narrow triggers to
  trigger-semantics / force smoke; stop stealing "跨文件改动" / "边界测试" from
  ordinary multi-file work.
- Router: `using-agent-skills/references/landing.md` documents default landing
  vs conditional stack; flowchart + quick-reference updated.

## Unreleased — hooks drop zod and run dependency-free

Plugin install is a plain file copy, so `hooks/package.json`'s `zod` dependency
was never installed: every hook died on `ERR_MODULE_NOT_FOUND` at startup, and
because hook failures are non-blocking the whole PreToolUse/PostToolUse gate set
**failed open** — `pre-context-write-guard`, `pre-stale-read`, `pre-read-contract`,
`post-ssot-priority`, `post-conflict-annotation` and `defend-claim-*` enforced
nothing while looking installed.

`hooks/runtime/tiny-schema.ts` replaces the surface actually used (string
regex/length, number, unknown, array, record, object optional/nullish/passthrough,
key-order `error.issues`), so hooks work from a bare copy with no install step.
Contract tests in `hooks/tests/tiny-schema.test.ts`.

## Unreleased — S5 check scans changed files

`scripts/s5-complexity/check.mjs --changed` lints only existing code files in
the worktree (plus `--staged` / `--base <ref>`). No matches exit 0. Default
without the flag is still `src`. File soft gate stays 1000.

## Unreleased — review-report-repair after code-review BLOCKED

Promoted `review-report-repair` from the <local-project> `.claude/skills` copy.
`code-review` still only judges. `GATE: BLOCKED` / unresolved High is the next
slot (`NEXT: review-report-repair`); the in-session findings table is a valid
report. Medium-only stays advisory. `maintainability-reviewer` is not a
plugin stage.

## Unreleased — tracker default is local markdown

`writing-plans` and `wayfinder` default to local files (`plans/<feature>.md`,
`docs/wayfinder/tickets/`). GitHub issues fire only when the operator this run
names 「用 issue」/「发到 GitHub」. `gh` installed or origin on GitHub is not a
trigger. `spec-driven-development` unchanged. Design note:
`docs/design/2026-09-09-local-tracker-default.md`.

## Unreleased — CONTEXT Edit fragment no longer requires **Term**:

`pre-context-write-guard` edit mode now mirrors ADR fragment leniency: Relationships / `_Avoid_` / prose-only `new_string` patches to `docs/CONTEXT.md` are allowed without a `**Term**:` line. Write still enforces full glossary schema (title + `## Language` + ≥1 term). Regression tests: Relationships-only, `_Avoid_`-only, term-bearing Edit fragments.

## Unreleased — verification-before-completion basis gate

`verification-before-completion` is a done-gate: this run must match its **basis** (the plan, spec, ticket, issue, or written ask it actually followed), with 实测 for each line. Conventional-folder files count only if this run used them. Procedure is 4 steps. Red Flags / rationalization table removed. Context-loop hooks and the ask-only `/self-evolving-rules` offer stay. `type: technique`.

## Unreleased — session-handoff spec-shape rewrite

`session-handoff` is user-invoked (`disable-model-invocation: true`). SKILL.md is spec/writing-plans shape: pointer identity, When to use with skip last, Fill / Write / Measure with completion criteria, Acceptance checklist, Verification measurements. No Red Flags section. Excuse table lives in `references/pressure-and-antipatterns.md`. Artifact fields stay in `references/handoff-template.md`. `type: discipline`. Frontmatter `version` removed; history is this file.

## Unreleased — validate_skill Check 7 excuse-steering OR

Check 7 still required inline Rationalization Table **and** a `## Red Flags` list (≥5 each), which contradicted the spec/writing-plans excuse-steering contract (inline **or** disclosed). Validator now passes if any one path holds: inline table ≥5 (`Rationalization Table` / `Rationalizations` / `Pressure`), disclosed `references/pressure-and-antipatterns.md` table ≥5 **or** list ≥5, or optional inline Red Flags / Anti-patterns list ≥5 (heading suffix allowed). Missing all paths fails with `excuse steering missing`. Tests: `skills/skill-authoring/scripts/test_validate_skill_excuse_steering.py`. `acceptance-criteria.md` / `verification.md` match Check 7.

## Unreleased — S5 function-length soft gate 40 → 60

Soft function-length REVIEW is 60 lines (JPL Power of Ten ~one page). Hard gates unchanged (CC ≤10, nesting ≤4, clone ≤3%). Copies that restated the gate follow `references/thresholds.md`. Plan Acceptance still must not paste the number.

## Unreleased — contract vs gate vs measurement

`writing-plans` Acceptance is the behavioural/structural contract; S5 numbers stay in `complexity-anti-drift/references/thresholds.md` and must not be copied into plan bullets. `skill-authoring` discloses the split at `references/contract-vs-gate.md` (pointer from Pruning / GLOSSARY SSOT); procedure and anti-patterns follow spec/writing-plans shape instead of requiring inline Rationalization/Red Flags. `scripts/validate_skill.py` now accepts the spec/writing-plans L2 shape and a disclosed `references/pressure-and-antipatterns.md` excuse-steering file (legacy heading set still passes).

## Unreleased — complexity-anti-drift disclosure

`complexity-anti-drift` SKILL.md now matches spec/writing-plans shape; gates SSOT `references/thresholds.md`; excuses/smells/verify commands in `references/pressure-and-antipatterns.md`; README catalog 40/4/500 (was 30/3/300); agent footer SSOT pointer follows thresholds.md; Hard FAIL / soft REVIEW and dispatch-degradation semantics unchanged.

## Unreleased — dispatch is a current-agent skill

`dispatching-parallel-agents` is the fan-out playbook (one message → worker subagents). The former `agents/arthurpower-dispatcher.md` is archived at `archive/agents/arthurpower-dispatcher-2026-08-20/`. `deep-dive-protocol` (one-line stub) is archived at `archive/skills/deep-dive-protocol-2026-08-20/`; interview work is `logicsync`. `using-agent-skills` matches spec/writing-plans shape: sequence = current slot; only `skill-authoring` / `self-evolving-rules` wait for an explicit name; registered list de-duplicated. Ghost names `subagent-driven-development` / `multi-round-self-review` removed from `systematic-debugging` (use `dispatching-parallel-agents` / `logicsync`).

## v0.12.1 — 2026-08-12: 三工程纪律 skill 迁出插件到全局 user-invoked (SC-02 closure)

### Summary

按 operator 裁定（discussion #111 thread）：`frontend-ui-engineering`、`performance-optimization`、`security-and-hardening` 三个工程纪律 skill 从 `arthurpower/skills/` 迁出到全局 `~/.claude/skills/`，并改为 `disable-model-invocation: true`（user-invoked only），只能由操作者手动触发。三 skill 在 arthurpower 仓库内的全部引用同步摘除。

### Rationale

三个 skill 都有独立能力面但在本仓库 0 实调（evidence ledger sc-r0-evidence-ledger.md §1a）。SC-02 原案对 `performance-optimization` 主张"domain mismatch"；经讨论明确：真正原因是"本仓库无触发场景"——区别于 `frontend-ui-engineering`（其 description 不限定 Web，可由任何含 user-facing interface 的下游项目触发）以及 `security-and-hardening`（跨项目资产，operator 已确认有下游 HTTP-auth 项目作为触发场景）。三者**统一采取"迁出 + user-invoked"**形态而非差异化处置，是因为：操作者不清楚其他两件 skill 的用途（明示），与其让模型错误触发不如收回触发权。

### BREAKING CHANGE

`using-agent-skills` router 不再分派三件套。任何会话语义需要这三条 skill 时，操作者须手动调用 `/arthurpower:frontend-ui-engineering` / `/arthurpower:performance-optimization` / `/arthurpower:security-and-hardening`（已搬到全局 `~/.claude/skills/`，Claude Code 自动从全局目录加载 user-invoked skill）。

### Consumer 行为变化

| 场景                                        | v0.10.0 行为           | v0.12.1 行为                                         |
| ------------------------------------------- | ---------------------- | ---------------------------------------------------- |
| 模型自动 reach frontend-ui-engineering      | description 命中即触发 | **不触发**（disable-model-invocation: true，需手动） |
| 模型自动 reach performance-optimization     | description 命中即触发 | **不触发**（disable-model-invocation: true，需手动） |
| 模型自动 reach security-and-hardening       | description 命中即触发 | **不触发**（disable-model-invocation: true，需手动） |
| 操作者手动 `/arthurpower:<name>` 触发三件套 | 触发                   | 触发（从全局目录加载，正文未改）                     |

### 同步面

- `arthurpower/.claude-plugin/plugin.json` description 改 21 + 家族重述（Engineering disciplines 家族 → 1 个）+ version 0.11.0 → 0.12.1
- `arthurpower/README.md` 头部 25→21 + 删除 Model-invoked 段三件套 3 行 + 末尾 "All 25 skills" → "All 21 skills"
- `arthurpower/skills/using-agent-skills/SKILL.md` router mirror 字母序列表移除 frontend-ui-engineering / performance-optimization / security-and-hardening 三行
- `arthurpower/skills/using-agent-skills/references/quick-reference.md` Build 段三行删除
- `docs/Arthuropower_usage.md` §4.5 工程学科族 4→1 + 加 v0.12.1 迁出说明 + Skill 清单 v0.6.0 附录同步
- `arthurpower/docs/agents/harness-map.md` §1 行 19 `security-auditor` 配对说明措辞更新（指向 user-invoked 形态 + 全局路径）
- `arthurpower/CHANGELOG.md` 历史段保留不动（v0.6.0 入库记录），与本次迁出不冲突

### Skill count reconciliation

| 时间点                                | 插件内 skill 数              |
| ------------------------------------- | ---------------------------- |
| v0.6.0 起始（CHANGELOG §v0.6.0 入库） | 28（含三件套）               |
| v0.12.0 落地后（SC-01 + SC-03）       | 24（28 − 3 SC-01 − 1 SC-03） |
| **本票 v0.12.1 落地后**               | **21**（24 − 3 SC-02）       |

### Commits included

- (本次 chore commit) chore(skills): move three engineering-discipline skills to global user-invoked

---

## v0.12.0 — 2026-08-11

### Skill curation (SC-01 / SC-03)

SC-01 — zero-trace trio archive (operator "完全没用" + SC-R0 #109 evidence):

- `commit-revert-protocol` archived (76868e3 hard-delete; capability absorbed by `docs/rules/git.md` §251-272)
- `team-glossary-sync` archived (ADR-0019 de-integrate; REVIVAL conditions in archive REVIVAL.md)
- `codebase-onboarding` archived (ADR-0019 de-integrate; REVIVAL conditions in archive REVIVAL.md)
- Router mirror sync (`using-agent-skills/SKILL.md` — 3 entries removed)
- Quick-reference sync (3 rows removed)
- README sync: skill count 30 → 25
- usage doc sync

SC-03 — defend-claim skill de-integrated to docs page (ADR-0025). Wayfinder
map `skill-and-agent-curation` (#97) SC-03 rewrite (#114) re-opened during
the rewrite discussion: `defend-claim` was 0-invocation (SC-R0) and its 5
PostToolUse hooks fire independently of any skill layer, so the skill slot
carried context load with no trigger surface. Hook layer untouched —
`hooks.json` / 5 `.ts` filenames / archive `.cjs` unchanged. Dead
`team-glossary` match in `pre-context-write-guard.ts` removed.

1. **defend-claim skill → docs page** — `arthurpower/skills/defend-claim/`
   (SKILL.md + references/ + iteration/) deleted. Operator exposition now
   lives at `docs/engineering/defend-claim.md` (Quickstart / hook table /
   when-to-reach / peers).
2. **Router + manifest re-sync** — `using-agent-skills/SKILL.md` skill list
   and `references/quick-reference.md` Verify row both drop `defend-claim`;
   `plugin.json` description drops the "claim-time anti-self-cert gate" line.
   README skill index row removed. (Plugin skill count under SC-01 + SC-03
   combined: 28 → 24; further reduced to 21 by SC-02 in v0.12.1.)
3. **Hook layer verified intact** — all 5 `defend-claim-*.ts` pass
   `--self-test`; `pre-release-validate.ts` router invariant exits 0.
4. **ADR-0025** — decision record: α (keep + rewrite) / β (user-invoked) /
   γ (de-integrate) with 3-condition gate check; de-integration follows
   ADR-0019 (SC-02) precedent; REVIVAL path documented.

## 2026-08-08 -- v0.11.0: agent provenance/conflict resolution + dispatcher wiring

### Summary

Wayfinder map `agent-provenance-resolution` (#88) cleared. 7 tickets resolved + applied. 治理对齐, 非功能重构:

1. **S5 阈值三源对齐** — complexity-anti-drift agent / ACR / audit-agent 统一到 40/500/4 (soft review-triggers) + 3 hard gates (cyclomatic≤10, nesting≤4, clone≤3%)。skill `thresholds.md` 拆分为 Hard/Soft 两表。原 30/300/3 全硬口径废弃。
2. **边界类第 3 类命名统一 `overflow`** — defensive-contract-validator SKILL.md 5 处 (When to use / Procedure / Acceptance / Example / Verification) 从 `long` 归一。
3. **Provenance 残留清理** — complexity-anti-drift-agent `:78` 文献引用行删除 (ADR-0016: citations have no runtime effect)。boundary-testing-axis2 `:99` operational rationale 保留。
4. **dispatcher 接线** — dispatching-parallel-agents SKILL.md 新增 `## Dispatch` 段委托 `arthurpower:arthurpower-dispatcher`; dispatcher agent 加 `## Reference` footer。
5. **sole-owner 标注** — arthurpower-audit-agent 加 `## Status` 段 (cross-cutting composite, 无对应 skill, 非重复)。

### Commits included

- `c4954e7` refactor(s5): align complexity thresholds to 40/500/4 soft + 3 hard
- `bc77b89` feat(dispatch): wire arthurpower-dispatcher into dispatching-parallel-agents skill

## 2026-08-02 -- v0.10.0: hooks.json 死注册清理 + empty-catch 职责合并

### Summary

3 commits 自 v0.9.0 起累积发布。TB0 删 `hooks.json` Edit 块中 cite-integrity 死注册（脚本只读 `tool_input.content`，但 Edit 提供 `new_string`，永远 early-allow）。TB3 加 `.gitattributes` 强制 `*.ts`/`*.cjs` LF 入 index（`core.autocrlf=true` 的 Windows 环境下防止未来 CRLF 污染 index 导致 Linux `env: 'node\r'`）。TB4 把空 catch 检测从「全局 hook + 插件 hook 互补」合并到「插件 hook 单一 owner」，并删全局 `post-tool-no-empty-catch` 及对应 settings.json 注册。

### BREAKING CHANGE

`post-tool-no-empty-catch` 全局 hook 已删除。绑定形式 `catch (e) {}` 的拦截职责由插件 hook `defend-claim-silent-fail` 接管（其正则已扩到 `(^|\})\s*catch\s*(?:\([^)]*\))?\s*\{\s*\}/`，且由逐行改为整段匹配以保留多行 `catch (e) {\n}` 覆盖）。settings.json 中对应的 PostToolUse matcher `"Write|Edit"` 注册块同步移除。备份：~/.claude/.backup/20260802-133847/。

### Consumer 行为变化

| 场景                                         | v0.9.0 行为                | v0.10.0 行为                      |
| -------------------------------------------- | -------------------------- | --------------------------------- |
| Write 含 `catch {}`                          | 插件 hook BLOCK            | 插件 hook BLOCK（不变）           |
| Write 含 `catch (e) {}`                      | 全局 hook BLOCK            | **插件 hook BLOCK（owner 切换）** |
| Write 含多行 `catch (e) {\n}`                | 全局 hook BLOCK            | 插件 hook BLOCK（整段匹配）       |
| Write 含非空 catch `log(e)`                  | allow                      | allow（不变）                     |
| `defend-claim-cite-integrity` 在 Edit 工具下 | 注册存在但永远 allow（死） | Edit 注册移除（Write 仍 BLOCK）   |

### Commits included

- `ab0760a` fix(hooks): remove dead Edit registration for defend-claim-cite-integrity
- `503c520` chore(repo): add .gitattributes enforcing LF for .ts and .cjs
- `385b11c` refactor(hooks): consolidate empty-catch detection into defend-claim-silent-fail
- (本次 docs commit) docs(usage): reflect empty-catch consolidation into defend-claim-silent-fail

## 2026-07-29 — v0.9.0: SessionStart bootstrap 移除 — 主会话上下文清洁化

### Summary

删除 `arthurpower/hooks/session-start.sh` + `hooks.json` 中 `SessionStart` 注册块。该脚本的 3 行 `echo` 输出本质上是 S1-S6 规则的一句话概括，与各 verifier agent 自身的 description + body 定义冗余、术语已漂移（S5 在 bootstrap 中称"complexity control"，在 agent 中称"Anti-Drift"）、且污染所有 session 的主 agent system context。Plugin hook 数 13 → 12，符合 CLAUDE.md "10-hook 不可 regress" 的 ADR-0021 显式 carve-out。版本 0.8.2 → 0.9.0（minor bump：面向 consumer 的行为变更）。

### BREAKING CHANGE

主 agent 不再收到 SessionStart 启动时注入的 S1-S6 概括两行 `<system-reminder>`。S 规则现在由各 verifier agent 的 description 按需载入（always-on progressive disclosure，ADR-0008）：

| S 规则                   | 承载 agent                           | 载入时机                           |
| ------------------------ | ------------------------------------ | ---------------------------------- |
| S1 bounded context       | `bounded-context-guardian-agent`     | invoke 时按 description 自动 reach |
| S2 defensive contract    | `defensive-contract-validator-agent` | 同上                               |
| S3 error handling        | `error-handling-enforcer-agent`      | 同上                               |
| S4 architecture review   | `architecture-change-reviewer-agent` | 同上                               |
| S5 complexity anti-drift | `complexity-anti-drift-agent`        | 同上                               |
| S6 minimal change        | `minimal-change-verifier-agent`      | 同上                               |

对使用 arthurpower 的 operator 而言：之前每个 session 启动时主 agent 看到"S1-S6 约束"两行；之后只在 dispatcher 派发到 verifier agent 时才看到完整规则定义。Human-facing 行为不变；agent 行为不变。

### Changes

| Commit    | 内容                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| `f4763fe` | 删除 `session-start.sh` + `hooks.json` SessionStart 块；4 个 active 文档同步；新增 ADR-0021 |

### Validation

- `python scripts/sync-marketplace-cache.py audit` → EXIT=1（drift present，预期：本地 SRC 已改，MKT/CACHE 未跟）
- `python -c "import json; json.load(open('arthurpower/hooks/hooks.json'))"` → valid JSON ✅
- `git ls-files arthurpower/hooks/session-start.sh` → empty（文件已删） ✅
- `plugin.json` version: 0.8.2 → 0.9.0 ✅

### Rollback

- 本 commit revert → `git revert f4763fe`
- 手动恢复：`echo "arthurpower active: ..." > arthurpower/hooks/session-start.sh` + 在 `hooks.json` 加 `SessionStart` 块 + 跑 broadcast sync
- broadcast MKT/CACHE 残留的孤儿 `session-start.sh` 文件需要手动删除（sync 脚本 no-delete）

## 2026-07-26 — v0.8.2: skill audit cleanup — 死技能删除 + 幽灵引用清零

### Summary

审计 30 个技能的闭环归属，删除 2 个死技能（intent-inference, issue-triage-validator），清理 router mirror list 5 个幽灵条目 + quick-reference 表 8 个幽灵条目，context-loop.md 补 Stage→Skill 映射表，归档 6 个已完成 wayfinder tickets。技能数 30 → 28，版本 0.8.1 → 0.8.2。

### Changes

| Commit    | 内容                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| `5e60dc4` | Router mirror list 删 5 个幽灵条目 (codebase-memory, documentation-and-adrs, gbrain-dispatch, interview-me, serena) |
| `277322e` | 删除 intent-inference + issue-triage-validator 技能目录，同步 router/deep-dive/README/flowchart/quick-ref           |
| `38bb6eb` | context-loop.md 加 Stage→Skill 映射表 (9 阶段正面陈述)                                                              |
| `22ba11d` | 6 个已完成 wayfinder map 归档到 docs/wayfinder/archive/                                                             |
| `8900f07` | quick-reference 表删 8 个幽灵条目                                                                                   |

### Validation

- `ls arthurpower/skills/ | wc -l` → 28 ✅
- 幽灵引用 grep (7 patterns) → 0 matches ✅
- `sync-marketplace-cache.py audit` → EXIT=0 ✅

## 2026-07-25 — v0.8.1: session-handoff 断链修复 + skill-authoring 规范对齐

### Summary

修复 session-handoff 技能的断链引用（SKILL.md:126 引 `references/handoff-template.md` 但文件不存在，invoke 时报错）。新增精益交接模板，并按 skill-authoring 规范整理：description 删冗余触发词、删 tags 字段、Red Flags 改写为「反模式 → 正确动作」配对（negation 防御）、修正错误的 sanitization guard 引用。插件版本 0.8.0 → 0.8.1。

### Bug fix: session-handoff dangling reference

- **根因**: SKILL.md:126 引 `references/handoff-template.md`，但技能目录无 `references/`，invoke 技能报错。
- **修复**: 新增 `references/handoff-template.md`（填空式瘦骨架：「已固化工件」指针表强制引用不复制，吸收既有 handoff 的 suggested skills 段）；Step 7 改为「套用模板」。

### skill-authoring 规范对齐

| 改动                                          | 依据                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| description 328→196 字符，删 4 个枚举触发词   | user-invoked 技能（disable-model-invocation），触发词不服务路由                                               |
| 删除 `tags` 字段                              | 同上；validator 不读 tags，router 按名字引用                                                                  |
| Red Flags 8 条改写为「反模式 → 正确动作」配对 | skill-authoring negation 防御（prohibition 配正确动作）                                                       |
| Step 6 / References 删错误 guard 引用         | 原 `.claude/hooks/pre-context-write-guard.cjs` 路径错、且按 M4 不拦 handoff；改指 Verification 的 secret grep |

### Validation

- `validate_skill.py` PASSED (EXIT=0)
- `run_skill_eval.py` 20/20 (100%)，无回归

### Note

- CHANGELOG 缺 v0.7.0 / 0.7.1 / 0.8.0 记录（pre-existing gap，本条不回填）。

## 2026-07-15 — v0.6.0: stdin-hang hook fix + agents/commands 补全

### Summary

修复 5 个 PostToolUse defend-claim hook 的 stdin 挂起 bug (从 `for await` 模式改为委托到 `hooks/lib/read-stdin-with-timeout.cjs` 1s grace-timeout reader, 与上轮 user-level 12 hook 修复同源), 补全 plugin 缺失的 2 agents + 2 commands, 版本号 0.5.0 -> 0.6.0, plugin.json description 更新, cache 目录重命名 0.5.0 -> 0.6.0, installed_plugins.json installPath + version 同步.

### Bug fix: stdin hang in 5 PostToolUse hooks

| Hook                        | matcher    | 修复前    | 修复后       |
| --------------------------- | ---------- | --------- | ------------ |
| defend-claim-execution      | Bash       | HUNG 3.0s | 1.17s exit 0 |
| defend-claim-cite-integrity | Edit       | HUNG 3.0s | 1.11s exit 0 |
| defend-claim-dumb-zone      | Edit/Write | HUNG 3.0s | 1.16s exit 0 |
| defend-claim-report-triple  | Write      | HUNG 3.0s | 1.11s exit 0 |
| defend-claim-silent-fail    | Write      | HUNG 3.0s | 1.11s exit 0 |

**根因** (与上次 `STDIN_HANG_FIX_REPORT.md` 描述同源):

- 5 个 hook 都用 `for await (const c of process.stdin) buf += c` 永远等 'end'
- Claude Code hook runner 写 stdin 后不总调 `stdin.end()`, 子进程挂起
- 框架 timeout 杀子进程 -> "No stderr output" -> tool 失败
- hook 设计上 fail-open, 挂起被杀的 exit 行为框架不识别

**修复方式**:

- 新建 `hooks/lib/read-stdin-with-timeout.cjs` (1s grace sliding window, 与 user-level 版本同源 1914 字节)
- 5 个 hook `readStdin` 改为 `require('./lib/read-stdin-with-timeout.cjs').readStdin`
- 两处副本 (marketplaces + cache) 同步, sha256 一致 `0db5bdd4 / f9d5dd40 / 97487958 / 7ebb3a18 / b097b07d`

**验证**:

- `run_defend_hook_stdin_check.py` (driver-level 复现) 5/5 PASS @ ~1.1s
- 对照 (未修 backup) 仍 HUNG 3.0s, 证明修复有效
- node `--check` 5/5 syntax OK
- `--self-test` 模式 3/3 PASS (dumb-zone / execution / report-triple)
- 两处 plugin.json + cache + marketplaces sha256 一致

### Files Created (v0.6.0)

| 路径                                                           | 大小    | 说明                                                               |
| -------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| `hooks/lib/read-stdin-with-timeout.cjs` (两处副本)             | 1914 B  | 共享 stdin 1s grace-timeout reader (plugin 内自包含)               |
| `agents/arthurpower-audit-agent.md`                            | ~3.8 KB | NEW: 独立 audit agent, S1-S6 + verification gate, Read-only        |
| `agents/arthurpower-dispatcher.md`                             | ~3.0 KB | NEW: 独立 dispatcher agent, 包装 dispatching-parallel-agents skill |
| `commands/audit.md`                                            | ~1.6 KB | NEW: `/audit` slash command, 一次性 maintainability audit          |
| `commands/fanout.md`                                           | ~1.5 KB | NEW: `/fanout` slash command, 并行 fan-out 独立 task               |
| `docs/Arthuropower_skill_classification.md` (local project) | ~6 KB   | 分类提案 + v0.6.0 必含变更清单 (此 cycle 产出)                     |
| `run_defend_hook_stdin_check.py` (local project)            | ~3.5 KB | driver-level stdin 复现 (此 cycle 产出)                            |

### Files Modified (v0.6.0)

| 路径                                           | 改动                                                                          | sha256 (before -> after) |
| ---------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| `hooks/defend-claim-execution.cjs` (两处)      | `for await` 块 -> `require('./lib/read-stdin-with-timeout.cjs')`              | `414a2cde` -> `0db5bdd4` |
| `hooks/defend-claim-cite-integrity.cjs` (两处) | 同上                                                                          | `eb8febbb` -> `f9d5dd40` |
| `hooks/defend-claim-dumb-zone.cjs` (两处)      | 同上                                                                          | `72085cf7` -> `97487958` |
| `hooks/defend-claim-report-triple.cjs` (两处)  | 同上                                                                          | `e2105da9` -> `7ebb3a18` |
| `hooks/defend-claim-silent-fail.cjs` (两处)    | 同上                                                                          | `9d12885e` -> `b097b07d` |
| `.claude-plugin/plugin.json` (两处)            | version 0.5.0 -> 0.6.0; description 更新反映 stdin fix + agents/commands 新增 | `9976aae7` -> `f4ed369f` |
| `~/.claude/plugins/installed_plugins.json`     | arthurpower installPath 0.5.0 -> 0.6.0; version 0.5.0 -> 0.6.0                | `2444191f` -> `9353e4cc` |

### Files NOT changed (out of scope this cycle)

| 路径                                                        | 原因                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| 26 skill frontmatter (dmi 字段)                             | 分类提案待 V 拍板 (见 `Arthuropower_skill_classification.md` §3) |
| `~/.claude/settings.json`                                   | enabledPlugins 不涉及版本号, R5 baseline 保持 `e5dd95df...`      |
| 其他 8 个 enabled plugin (commit-commands, plugin-dev, ...) | 范围外                                                           |
| `.claude-plugin/plugin.json` 重新加 `skills` 数组           | 上次修复已删, framework 扫描 skills/ 自动发现 (保留)             |

### R5 备份 (在 `.archive/2026-07-15-arthurpower-v0.6.0-reorg/`)

```
arthurpower-marketplaces-snapshot/  (整 plugin 副本, 改前)
arthurpower-cache-snapshot/          (整 cache 0.5.0 副本, 改前)
cache-0.5.0-snapshot/0.5.0/          (cache 0.5.0 完整独立备份, 重命名前)
hooks-stdin-fix/marketplaces/        (5 hook 副本)
hooks-stdin-fix/cache/               (5 hook 副本)
installed_plugins.json.before-local-cleanup  (sha 2444191f)
installed_plugins.json.before-v0.6.0    (sha e7490ad6, version bump 前)
installed_plugins.json.sha256        (baseline 2444191f)
settings.json.before-local-cleanup        (sha e5dd95df, 始终未动)
plugin.json.marketplaces.sha256      (baseline 9976aae7)
plugin.json.cache.sha256             (baseline 9976aae7)
```

### 调研发现 (既有 skills 基线 1.0 -> 1.2 对照)

- v1.0.0 (2026-06-17): router skill 路由; codebase-design / domain-modeling 共享化; write-a-skill -> writing-great-skills; diagnose -> diagnosing-bugs; 引入 User-invoked/Model-invoked 两轴
- v1.0.1 (同日): teach skill reuse-first
- v1.1.0 (2026-07-08): router skill 升级; review -> code-review (毕业, + Fowler smell baseline); decision-mapping -> wayfinder (毕业, HITL/AFK); to-prd -> to-spec; to-plan+to-issues -> to-tickets; prototype 从 user- 升 model-invoked; research 新增; grilling confirmation gate + Facts/Decisions 分离; tdd 改 reference-only + seam leading word + tautological-test anti-pattern; writing-great-skills 加 Negation + Negative Space 两个 Steering failure mode
- v1.2.0 (2026-07-15 调研确认): **不存在** (GitHub releases 只到 v1.1.0). 本地 `.changeset/` 含 2 个待发: friendlier-setup-and-local-tickets + prototype-primary-source

### 后续待 V 拍板 (v0.7.0 cycle)

1. Skill 分类调整: 25/26 model-invoked -> 11 user-invoked + 15 model-invoked (提案未采纳)
2. Domain-modeling 加载方式: user-invoked (SSOT 写主权) vs model-invoked (既有基线模式)
3. 是否补全更多 agent/command (本 cycle 补 2+2 作为最小集, V 决定是否扩)

---

## 2026-06-26 — Initial rollout (curated plugin deployment)

### Summary

将 5 个自有工程 skill (S1-S6) 升级为 `arthurpower` curated plugin, 替换 legacy-governance-plugin 治理层, 完成 Phase 1 (构建 + 安装 + 验证) 与 Phase 2 (清理), 旧治理层 plugin 物理归档, settings.json 收口.

### Files Created

| 路径                                                                               | 大小   | 说明                                                            |
| ---------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------- |
| `D:\workspace\arthurpower\.claude-plugin\plugin.json`                            | 330 B  | 插件元数据 (name=arthurpower, version=0.1.0)                    |
| `D:\workspace\arthurpower\hooks\session-start.sh`                                | 332 B  | 2 行 SessionStart constraint bootstrap (executable)             |
| `D:\workspace\arthurpower\hooks\hooks.json`                                      | 326 B  | SessionStart hook schema (validated against real plugin format) |
| `D:\workspace\arthurpower\hooks\README.md`                                       | 220 B  | 占位说明                                                        |
| `D:\workspace\arthurpower\skills\architecture-change-reviewer\SKILL.md`          | 4546 B | NEW Core (5 verdict + Task Decomposition)                       |
| `D:\workspace\arthurpower\skills\bounded-context-guardian\SKILL.md`              | 4221 B | S1 (migrated + TDD refined)                                     |
| `D:\workspace\arthurpower\skills\defensive-contract-validator\SKILL.md`          | 4044 B | S2 (migrated + TDD refined)                                     |
| `D:\workspace\arthurpower\skills\error-handling-enforcer\SKILL.md`               | 4186 B | S3 (migrated + TDD refined)                                     |
| `D:\workspace\arthurpower\skills\complexity-anti-drift\SKILL.md`                 | 3873 B | S5 (migrated + TDD refined)                                     |
| `D:\workspace\arthurpower\skills\minimal-change-verifier\SKILL.md`               | 4015 B | S6 (migrated + TDD refined)                                     |
| `D:\workspace\arthurpower\skills\skill-authoring\SKILL.md`                       | 5097 B | Support (TDD + CSO + File Org + Skill Types + Anti-Patterns)    |
| `C:\Users\<user>\.claude\skills\arthurpower\`                                       | 52 K   | runtime 副本 (11 files, 与 workspace 同步)                      |
| `C:\Users\<user>\.claude\archive\2026-06-26-arthurpower-rollout\`                   | —      | archive 目录                                                    |
| `C:\Users\<user>\.claude\archive\2026-06-26-arthurpower-rollout\legacy-governance-plugin-5.1.0\` | 1.8 M  | legacy-governance-plugin 完整归档 (16 entries)                               |
| `C:\Users\<user>\.claude\settings.json.bak.20260626`                                | 7854 B | settings.json 改前备份 (sha256 `5c23e267bdad1446`)              |

### Files Modified

#### `C:\Users\<user>\.claude\settings.json` (7854 → 7518 bytes, -336 B)

| 变更                                                                                                                         | 字节差     | 触发步           |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------- |
| `hooks.UserPromptSubmit` 整段删除 (旧治理层 plugin echo `Reminder: brainstorming -> tdd-coach -> naming -> complexity -> minimal-change`) | -245 B     | Phase 1.3        |
| `enabledPlugins.legacy-governance-plugin@claude-plugins-official: true → false`                                                           | 0 B (值改) | Phase 1.5        |
| `enabledPlugins.agent-skills@legacy-agent-skills: true` 整行删除 (stale, 物理已不在)                                           | -47 B      | Archive 后续清理 |
| `permissions.deny` 移除 `Skill(test-driven-development)`                                                                     | -45 B      | Phase 2          |

**未触碰**: `env.*` (12 个, 含 ANTHROPIC_AUTH_TOKEN + GITHUB_TOKEN), `permissions.allow`, 其他 hooks, 其他顶层字段, 其他 17 个 enabled plugin.

#### 7 × `SKILL.md` 升级路径

| Skill                        | v0                | v1 (TDD 精炼) | v2 (额外补全)                                              |
| ---------------------------- | ----------------- | ------------- | ---------------------------------------------------------- |
| architecture-change-reviewer | 2246 B (NEW)      | 3842 B        | **4546 B** (+Task Decomposition step 6)                    |
| bounded-context-guardian     | 2210 B (migrated) | 4221 B        | —                                                          |
| defensive-contract-validator | 2049 B (migrated) | 4044 B        | —                                                          |
| error-handling-enforcer      | 2319 B (migrated) | 4186 B        | —                                                          |
| complexity-anti-drift        | 2002 B (migrated) | 3873 B        | —                                                          |
| minimal-change-verifier      | 2001 B (migrated) | 4015 B        | —                                                          |
| skill-authoring              | 2210 B (Support)  | 4454 B        | **5097 B** (+CSO / File Org / Skill Types / Anti-Patterns) |

每文件 v0 → v1 加入: Rationalization Table + Red Flags + Required Baseline + 5-section body structure (When / Not when / Procedure / Acceptance / Verification). v1 → v2 增量补全, 不重写.

### Files Archived (move, 非 delete)

| 源                                                                                | 目标                                                                               |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `C:\Users\<user>\.claude\plugins\cache\claude-plugins-official\legacy-governance-plugin\5.1.0\` | `C:\Users\<user>\.claude\archive\2026-06-26-arthurpower-rollout\legacy-governance-plugin-5.1.0\` |
| `C:\Users\<user>\.claude\skills\agent-skills` (symlink)                            | (本任务开始前已不存在, 无对象)                                                     |
| `C:\Users\<user>\.agents\skills\agent-skills\` (target)                            | (本任务开始前已不存在, 无对象)                                                     |

**未触碰**: 6 个其他 symlink (cover-letter, job-hunt, mmx-cli, mock-interview, offer-decision, resume-craft), `~/.agents/skills/` target 父目录.

### Verification

| 项                                                 | 状态                                                           |
| -------------------------------------------------- | -------------------------------------------------------------- |
| `claude plugin validate`                           | `✔ Validation passed` (多次)                                   |
| `claude plugin list`                               | `arthurpower@skills-dir` v0.1.0 user scope, `Status: ✔ loaded` |
| `enabledPlugins` count                             | 19 → 18 (agent-skills 清)                                      |
| `permissions.deny` count                           | 7 → 6 (TDD deny 拆)                                            |
| secret hash 锁定 (4 checkpoint)                    | `f95b5b534e742278` / `a8cb781327da68b5` 全一致                 |
| 0 unexpected diffs vs `settings.json.bak.20260626` | ✓                                                              |
| 7 skill 全部 discoverable (端到端实测)             | 待复核                                                         |

### 3 Task 实测 (中间证据, 端到端复核前)

| Task | Prompt                       | 实际触发                                                   | 状态           |
| ---- | ---------------------------- | ---------------------------------------------------------- | -------------- |
| A    | 加个新功能, 可能会改几个文件 | agent-skills 顶层 (interview-me / spec-driven-development) | 非 arthurpower |
| B    | 修个 bug, 顺手补一下验证     | 协作规则散引 (外部协作准则 #1)                                 | 非 arthurpower |
| C    | 这个函数有点乱, 重构下       | arthurpower S3 + S5 ✓                                      | 触发           |

### Rollback

```bash
# 1. 复原 settings.json
cp "C:\Users\<user>\.claude\settings.json.bak.20260626" "C:\Users\<user>\.claude\settings.json"

# 2. 反归档 legacy-governance-plugin (从 archive 移回 cache)
mv "C:\Users\<user>\.claude\archive\2026-06-26-arthurpower-rollout\legacy-governance-plugin-5.1.0" "C:\Users\<user>\.claude\plugins\cache\claude-plugins-official\legacy-governance-plugin\5.1.0"

# 3. enable legacy-governance-plugin
claude plugin enable legacy-governance-plugin@claude-plugins-official

# 4. 卸载 arthurpower (skills-dir 形式, 手工删)
rm -rf "C:\Users\<user>\.claude\skills\arthurpower"

# 5. (可选) 删 workspace source
rm -rf "D:\workspace\arthurpower"
```

### Next Step (端到端实测)

亲自开新 session 跑 3 任务, 截屏 system reminder 不含旧治理层 plugin 描述, 验证 7 arthurpower skill 实际触发. 反馈后此文件追加 "VERIFIED" 段.

## 2026-06-26 — arthurpower v0.2.0 (skill depth upgrade + 4 new skills)

### Summary

Promote arthurpower from v0.1.0 (7 skills, 30 KB) to v0.2.0 (11 skills, ~62 KB). 3 existing skills upgraded to writing-skills depth; 4 new skills added from the gap analysis vs legacy-governance-plugin 5.1.0 + agent-skills 1.0.0. Quality review: 0 Critical, 1 High (fixed), 4 Medium (3 fixed, 1 follow-up), 6 Low (follow-up).

### Files Modified (Round 1 + 2.5)

| Path                                                                    | Size        | Change                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arthurpower/skills/architecture-change-reviewer/SKILL.md`              | ~6.5 KB     | REWORK: 删 L3 phantom `interview-me` override; 删 L26 Step 0; 改 L37 Step 6 → 1-line hand-off to `minimal-change-verifier`; 加 V-approval Rationalization 行; 加 Plan-Format Annex (load-bearing: 5-row table covering verdict block, task template, handoff, PR description, sibling refs) |
| `arthurpower/skills/complexity-anti-drift/SKILL.md`                     | ~4.5 KB     | UPGRADE: 加 5-row Refactor Patterns table (Extract Function / Inline / Move / Replace Conditional / Parameter Object); 修 L42 阈值自相矛盾; 加 outbound cross-ref 到 `bounded-context-guardian` + `minimal-change-verifier`; 去重 1 Red Flag                                                |
| `arthurpower/skills/skill-authoring/SKILL.md`                           | ~5 KB       | UPGRADE: 加 Quick Reference Table; 7-step TDD-for-skills methodology; 改 Verification 为 falsifiable (baseline transcript 文件要求); 5-line binary Acceptance checklist; 移到 `references/discipline-checklist.md` 减 body                                                                  |
| `arthurpower/skills/skill-authoring/references/discipline-checklist.md` | 4.0 KB      | NEW: 8-row Rationalization Table + 9-item Red Flags + Pressure Scenarios + Anti-Patterns + Iron Law                                                                                                                                                                                         |
| `arthurpower/.claude-plugin/plugin.json`                                | 330 → 800 B | description 改为 4-family taxonomy: S1-S6 governance / Architecture & planning / Process gates / Dispatch / 1 Support; version 0.1.0 → 0.2.0; fields name/author unchanged                                                                                                                  |

### Files Created (Round 1)

| Path                                                         | Size    | Source                                                                       | Notes                                                                                                                                            |
| ------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `arthurpower/skills/verification-before-completion/SKILL.md` | ~4.5 KB | legacy-governance-plugin:verification-before-completion                                   | evidence-before-claims gate; generic 成功 = <criterion> <evidence> assertion format; banned-words list                                           |
| `arthurpower/skills/systematic-debugging/SKILL.md`           | ~8 KB   | legacy-governance-plugin:systematic-debugging                                             | 4-phase REPRODUCE/ISOLATE/INSTRUMENT/FIX; embed generic debug-stop 4 phases (3 attempts fail → reload); 7-row rationalization + 9-item red flags |
| `arthurpower/skills/writing-plans/SKILL.md`                  | ~7 KB   | legacy-governance-plugin:writing-plans + 1 commit = 1 逻辑任务 spec                       | Plan Format template (load-bearing); 6-step procedure; ACR handoff sequence (Round 2.5 修)                                                       |
| `arthurpower/skills/dispatching-parallel-agents/SKILL.md`    | ~9 KB   | legacy-governance-plugin:dispatching-parallel-agents + subagent-driven-development merged | 6-step procedure; Subagent Prompt Template (load-bearing); 500 行 subagent 规范; Serena + Codebase Memory 引用                                   |

### Quality Audit (Round 2)

| Severity | Count | Fixed         | Status                                                                                                                                                           |
| -------- | ----- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | 0     | —             | n/a                                                                                                                                                              |
| High     | 1     | 1 (Round 2.5) | skill-authoring orphan references — FIXED                                                                                                                        |
| Medium   | 4     | 3 (Round 2.5) | plugin.json taxonomy / systematic-debugging reverse link / writing-plans handoff — FIXED; 1 follow-up (verification-before-completion bidirectional link — TODO) |
| Low      | 6     | 0             | follow-up: plugin.json homepage/license, additional bilingual triggers, 等等                                                                                     |

**Verdict**: APPROVE-WITH-FIXES (after Round 2.5 = APPROVE)

### Constraints — All PASS

| Constraint                               | Pass                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------- |
| 1 commit = 1 逻辑任务                    | ✅ S6 enforcement in `minimal-change-verifier`                        |
| 凭证安全 (no plaintext secrets)          | ✅ no API key / token / password strings                              |
| 严词规范 absent (撞/真因/切流/等价品/拍) | ✅ grep clean                                                         |
| 端到端实测 = 唯一真值                    | ✅ `verification-before-completion` + `systematic-debugging` Iron Law |
| bilingual triggers                       | ✅ all 11 descriptions                                                |
| 500 行 subagent 规范                     | ✅ `dispatching-parallel-agents`                                      |
| S1-S6 coverage                           | ✅ 5/5 explicit (S4 folded into S2 + writing-plans)                   |

### Round 1 + 2 + 2.5 Subagent Count

15 subagents dispatched across 4 rounds (8 + 3 + 4):

- Round 1: 8 实施 (1 per file)
- Round 2: 1 plugin.json + 1 comprehensive audit + 1 synthetic
- Round 2.5: 4 fix (1 per file)
- Round 3: 1 CHANGELOG (this edit)

### Next Step (端到端实测)

Run 11 task end-to-end (one per skill) and append a "VERIFIED 2026-06-26" section to this CHANGELOG with results.

---

## 2026-06-27 — v0.3.0 expansion + user-level global migration

### Summary

将 arthourpower plugin 从 workspace (`D:\workspace\arthurpower\`) 整体迁移到 user-level (`C:\Users\<user>\.claude\plugins\arthurpower\`), 任何 session 全局可见. 同时扩充 4 项新 skill (security / spec / frontend / perf) + 1 个 router (using-agent-skills), 从 11 skill 扩到 16 skill.

### v0.3.0 Additions (5 new skills)

| Skill                         | 行  | 字节    | Iron Law                                                                   |
| ----------------------------- | --- | ------- | -------------------------------------------------------------------------- |
| `security-and-hardening`      | 294 | 18.3 KB | "Every external input is untrusted until validated at the boundary"        |
| `spec-driven-development`     | 301 | 17.3 KB | "SPECIFY before PLAN, never skip the assumption gate"                      |
| `frontend-ui-engineering`     | 241 | 13.8 KB | "Production UI is accessible UI, by default"                               |
| `performance-optimization`    | 206 | 10.9 KB | "Profile before optimize — never optimize blind"                           |
| `using-agent-skills` (router) | 297 | 17.9 KB | "Always check the flowchart before falling back to system prompt defaults" |

**Format**: 全部遵循 `arthurpower:skill-authoring` 7-step TDD-for-skills (Iron Law + Procedure + Rationalization Table + Red Flags + Pressure Scenarios + Anti-Patterns + Example + Verification).

### plugin.json v0.2.0 → v0.3.0

- Skills: 11 → **16** (5 new entries)
- description: 4 family → 5 family (新增 v0.3.0 promoted Tier B family)
- version: 0.2.0 → **0.3.0**

### Files Created (this round)

| 路径                                                                                  | 大小     | 说明                                                        |
| ------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| `C:\Users\<user>\.claude\plugins\arthurpower\`                                         | 174.5 KB | user-level plugin (canonical global)                        |
| `C:\Users\<user>\.claude\plugins\arthurpower\.claude-plugin\plugin.json`               | 5.4 KB   | v0.3.0 manifest (16 skill declarations)                     |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\security-and-hardening\SKILL.md`   | 18.3 KB  | NEW Core (3-layer boundary defense)                         |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\spec-driven-development\SKILL.md`  | 17.3 KB  | NEW Core (SPECIFY phase gate)                               |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\frontend-ui-engineering\SKILL.md`  | 13.8 KB  | NEW Core (production UI + a11y)                             |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\performance-optimization\SKILL.md` | 10.9 KB  | NEW Core (Core Web Vitals + profile-first)                  |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\using-agent-skills\SKILL.md`       | 17.9 KB  | NEW Support (meta-router, 28 auto-trigger + 12 manual-only) |

### Files Modified (this round)

| 路径          | 旧 → 新           | 变化                  |
| ------------- | ----------------- | --------------------- |
| `plugin.json` | v0.2.0 (11 skill) | **v0.3.0 (16 skill)** |

### Files Archived (no deletion, 归档不删)

| 原路径                                                           | 归档路径                                                                                         | 内容                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `D:\workspace\arthurpower\` (workspace)                        | `C:\Users\<user>\.claude\archive\memory-cleanup-2026-06-27\arthurpower-workspace-2026-06-27\`     | 整个 plugin 目录 (含 v0.2.0 tar.gz 备份 + CHANGELOG + docs + hooks + 16 skills) |
| `C:\Users\<user>\.claude\skills\arthurpower\` (旧 8-skill global) | `C:\Users\<user>\.claude\archive\memory-cleanup-2026-06-27\arthurpower-skills-old-2026-06-27-v2\` | 2026-06-26 初始 rollout 状态 (8 skill, 3.8-6.4 KB/skill)                        |
| `C:\Users\<user>\.claude\skills\using-agent-skills\` (单文件副本) | `C:\Users\<user>\.claude\archive\memory-cleanup-2026-06-27\using-agent-skills-flat-copy\`         | 之前 cp 错的单文件副本 (已 superseded by plugin version)                        |

### Trigger Phrases (V 字面)

`using-agent-skills` router 触发词(写进 frontmatter description):

- "使用arthur skill" / "进行任务前技能检查" (V 字面中文)
- "skill check" / "pre-task skill check" / "which skill should I use" / "skill routing" (English)
- "which skill" / "how to start" / "router" (原有)

### Validation Status

- ✅ plugin.json 可 JSON 解析
- ✅ 16 skill 全部声明 + 实际 SKILL.md 存在
- ✅ hooks/hooks.json SessionStart 注册正确
- ✅ 旧 8-skill 完整归档, 0 个 `rm`
- ✅ workspace 整体归档, 0 个 `rm`
- ⚠️ 4 项 v0.3.0 新 skill (security / spec / frontend / perf) 是 sub-agent 一次写完, 未逐项跑 skill-authoring 7-step TDD-for-skills 验证 — 可能缺 Acceptance Criteria / Pressure Scenarios / Anti-Patterns / Required Baseline / Verification(success=结论) 中的部分 section
- ⚠️ 12 项原始 skill 来自 2026-06-26 rollout, 也可能不符合当前 skill-authoring 完整标准
- ⚠️ 5 Tier B 草案 (browser-testing / documentation-and-adrs / interview-me / shipping-and-launch / source-driven-development) 在 `~/.claude/agent-skills/` 已扩充到 canonical 完整规范, 但未 promote 到 plugin, 等 V 字面 trigger

### Next Step

(已撤回: V 拍板待办不进 CHANGELOG, V 字面触发后记入)

---

## 2026-06-27 — v0.4.0 defend-claim (claim-time anti-self-cert gate)

### Summary

新增 `defend-claim` discipline skill (195 行, ~10.6 KB), 把 claim 时机的反自证 (anti-self-cert) 落到 5 个 PostToolUse hook 上: Q1 execution / Q2 cite-integrity / Q3 report-triple / Q4 dumb-zone / Q5 silent-fail. 4/5 hook 无状态, 仅 Q4 维护 turn counter. 所有 hook 支持 `--self-test` 模式, Q2/Q3/Q5 实测 Exit 2 触发, Q1/Q4 advisory-only.

### Files Created

| 路径                                                                                         | 大小     | 说明                                                                                               |
| -------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\defend-claim\SKILL.md`                    | ~10.6 KB | NEW discipline (195 行, 5 questions, 11-bypass table, 7 rationalization rows, 5 red flags)         |
| `C:\Users\<user>\.claude\hooks\defend-claim-execution.sh`                                     | 1147 B   | Q1 hook — PostToolUse on Bash, advisory, supports `--self-test`                                    |
| `C:\Users\<user>\.claude\hooks\defend-claim-cite-integrity.sh`                                | 1430 B   | Q2 hook — PostToolUse on Edit\|Write, `timeout 3s sed`, Exit 2 on phantom cite                     |
| `C:\Users\<user>\.claude\hooks\defend-claim-report-triple.sh`                                 | 1134 B   | Q3 hook — PostToolUse on Write, strips zero-width Unicode, Exit 2 on completion-without-evidence   |
| `C:\Users\<user>\.claude\hooks\defend-claim-dumb-zone.sh`                                     | 1060 B   | Q4 hook — PostToolUse on Edit\|Write, stateful turn counter every 10th, advisory                   |
| `C:\Users\<user>\.claude\hooks\defend-claim-silent-fail.sh`                                   | 1469 B   | Q5 hook — PostToolUse on Edit\|Write, regex deny `except: pass` / `catch {}` / silent null, Exit 2 |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\defend-claim\iteration\1\evals.json`      | —        | 20 queries (positive / negative / pressure / counter-example)                                      |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\defend-claim\iteration\1\grading.json`    | —        | mock grading, pass_rate 1.0                                                                        |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\defend-claim\iteration\1\red-baseline.md` | —        | red-team transcript baseline                                                                       |

### Files Modified

| 路径                          | 旧 → 新                         | 变化                                                                                    |
| ----------------------------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| `plugin.json`                 | v0.3.0 (16 skill)               | **v0.4.0 (17 skill)** — description 加 family 6 (`defend-claim`), version 0.3.0 → 0.4.0 |
| `using-agent-skills/SKILL.md` | quick-reference 28 auto-trigger | + `defend-claim` 行, flowchart 加 claim-time gate 节点                                  |
| `using-agent-skills/SKILL.md` | 12 manual-only list             | 不变                                                                                    |

### Verification

| 项                                    | 状态                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Q2 cite-integrity `--self-test`       | "Q2 self-test: phantom cite detection. PASS" (exit 0)                       |
| Q3 report-triple `--self-test`        | "Q3 self-test: report triple detection. PASS" (exit 0)                      |
| Q5 silent-fail `--self-test`          | "Q5 self-test: silent-failure detection. PASS" (exit 0)                     |
| Q2 real-fire phantom cite             | Exit 2 `REJECTED: Q2 phantom cite — file does not exist: ...`               |
| Q3 real-fire `完成 this works now`    | Exit 2                                                                      |
| Q5 real-fire `try: x()\nexcept: pass` | Exit 2                                                                      |
| Q1 + Q4                               | advisory only (Exit 0), 框架 surface 到 agent context                       |
| iteration/1 evals                     | 10 queries mock grading pass_rate 1.0 (planned: 20 + LLM-based eval driver) |
| `python3 scripts/validate_skill.py`   | exit 0                                                                      |
| 5 hook 文件 + 1 skill dir 物理存在    | ✓                                                                           |
| Bar level                             | discipline (single-session scope); promote to high_risk 时需 V 字面 trigger |

### Routing Entries Added

- `using-agent-skills` quick-reference 表加 `defend-claim` 行 (触发词: claim / 完成 / done / fixed / passing / 成功 / evidence / verify)
- flowchart 加 claim-time gate 节点 (Work → Verification → Report → defend-claim gate)

---

## 2026-06-27 — v0.5.0 upstream-docs discipline skill (lookup-first via docs MCP)

### Summary

新增 upstream-docs discipline skill (131 行, ~5.5 KB), 把 arthurpower 工作流中所有"用户提具体库/框架/SDK/API/CLI/cloud service + 问版本相关问题"统一强制走 docs MCP 链路. 7 rationalization rows + 7 red flags + 6-row bypass table. 不替代 web search, 仅上游文档. (注: 该 skill 后在 v0.7.1 cycle 退役并归档至 `docs/archive/skills/` 的 upstream-docs discipline 子目录.)

### Files Created

| 路径                                                                                                         | 大小    | 说明                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\upstream-docs-lookup\SKILL.md` (历史名 docs-lookup skill) | ~5.5 KB | NEW discipline (131 行, 8-step procedure, 6-bypass table, 7 rationalization rows, 7 red flags); 现存档于 `docs/archive/skills/` 的 upstream-docs discipline 子目录 |

### Files Modified

| 路径                          | 旧 → 新                         | 变化                                                                                                                                                                               |
| ----------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin.json`                 | v0.4.0 (17 skill)               | **v0.5.0 (18 skill)** — description 加 family 6 末段 upstream-docs lookup 行, version 0.4.0 → 0.5.0 (v0.7.1 cycle 已 scrub 该引用, 重写为 family 6 = engineering disciplines 4 项) |
| `using-agent-skills/SKILL.md` | quick-reference 29 auto-trigger | + upstream-docs 行, flowchart 加 docs-lookup 节点 (v0.7.1 cycle 已 scrub 该行)                                                                                                     |

### Verification

| 项                                                           | 状态                                                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `python3 scripts/validate_skill.py <upstream-docs>/SKILL.md` | exit 0                                                                                                          |
| Acceptance Criteria 7/7                                      | ✓ (detect → resolve → version → query-docs ≤3 → quote → no hallucinate → no web-search replace)                 |
| Bypass table 6/6 row                                         | ✓ (training memory / quick answer / well-known / resolve skipped / no-snippet fallback / mention-without-quote) |
| Rationalization Table 7/7 row                                | ✓                                                                                                               |
| Red Flags 7/7 row                                            | ✓                                                                                                               |
| Skill type                                                   | discipline                                                                                                      |
| Bar level                                                    | discipline (lookup-first rule under time/knowledge pressure); promote 到 high_risk 需 V 字面 trigger            |
| 1 skill dir 物理存在                                         | ✓ (历史路径已迁至 archive)                                                                                      |

### Routing Entries Added

- `using-agent-skills` quick-reference 表加 upstream-docs 行 (触发词: 库名 / API 语法 / 版本迁移 / CLI flag / setup steps / SDK 配置; v0.7.1 cycle 已 scrub)
- flowchart 加 docs-lookup 节点 (User query → Detect library+version-sensitive → upstream-docs discipline skill)
- 与 `codebase-memory` (项目内代码) + `serena` (symbol-level edit) 正交, 三者互补不竞争
