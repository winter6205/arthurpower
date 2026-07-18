# arthurpower changelog

## 2026-07-15 — v0.6.0: stdin-hang hook fix + agents/commands 补全

### Summary

修复 5 个 PostToolUse defend-claim hook 的 stdin 挂起 bug (从 `for await` 模式改为委托到 `hooks/lib/read-stdin-with-timeout.cjs` 1s grace-timeout reader, 与上轮 user-level 12 hook 修复同源), 补全 plugin 缺失的 2 agents + 2 commands, 版本号 0.5.0 -> 0.6.0, plugin.json description 更新, cache 目录重命名 0.5.0 -> 0.6.0, installed_plugins.json installPath + version 同步.

### Bug fix: stdin hang in 5 PostToolUse hooks

| Hook | matcher | 修复前 | 修复后 |
|------|---------|--------|--------|
| defend-claim-execution | Bash | HUNG 3.0s | 1.17s exit 0 |
| defend-claim-cite-integrity | Edit | HUNG 3.0s | 1.11s exit 0 |
| defend-claim-dumb-zone | Edit/Write | HUNG 3.0s | 1.16s exit 0 |
| defend-claim-report-triple | Write | HUNG 3.0s | 1.11s exit 0 |
| defend-claim-silent-fail | Write | HUNG 3.0s | 1.11s exit 0 |

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

| 路径 | 大小 | 说明 |
|------|------|------|
| `hooks/lib/read-stdin-with-timeout.cjs` (两处副本) | 1914 B | 共享 stdin 1s grace-timeout reader (plugin 内自包含) |
| `agents/arthurpower-audit-agent.md` | ~3.8 KB | NEW: 独立 audit agent, S1-S6 + verification gate, Read-only |
| `agents/arthurpower-dispatcher.md` | ~3.0 KB | NEW: 独立 dispatcher agent, 包装 dispatching-parallel-agents skill |
| `commands/audit.md` | ~1.6 KB | NEW: `/audit` slash command, 一次性 maintainability audit |
| `commands/fanout.md` | ~1.5 KB | NEW: `/fanout` slash command, 并行 fan-out 独立 task |
| `docs/version_diff.md` ((local project)) | ~14 KB | the baseline 1.0/1.1/1.2 调研 (此 cycle 产出) |
| `docs/Arthuropower_skill_classification.md` ((local project)) | ~6 KB | 分类提案 + v0.6.0 必含变更清单 (此 cycle 产出) |
| `run_defend_hook_stdin_check.py` ((local project)) | ~3.5 KB | driver-level stdin 复现 (此 cycle 产出) |

### Files Modified (v0.6.0)

| 路径 | 改动 | sha256 (before -> after) |
|------|------|-------------------------|
| `hooks/defend-claim-execution.cjs` (两处) | `for await` 块 -> `require('./lib/read-stdin-with-timeout.cjs')` | `414a2cde` -> `0db5bdd4` |
| `hooks/defend-claim-cite-integrity.cjs` (两处) | 同上 | `eb8febbb` -> `f9d5dd40` |
| `hooks/defend-claim-dumb-zone.cjs` (两处) | 同上 | `72085cf7` -> `97487958` |
| `hooks/defend-claim-report-triple.cjs` (两处) | 同上 | `e2105da9` -> `7ebb3a18` |
| `hooks/defend-claim-silent-fail.cjs` (两处) | 同上 | `9d12885e` -> `b097b07d` |
| `.claude-plugin/plugin.json` (两处) | version 0.5.0 -> 0.6.0; description 更新反映 stdin fix + agents/commands 新增 | `9976aae7` -> `f4ed369f` |
| `~/.claude/plugins/installed_plugins.json` | arthurpower installPath 0.5.0 -> 0.6.0; version 0.5.0 -> 0.6.0 | `2444191f` -> `9353e4cc` |

### Files NOT changed (out of scope this cycle)

| 路径 | 原因 |
|------|------|
| 26 skill frontmatter (dmi 字段) | 分类提案待 V 拍板 (见 `Arthuropower_skill_classification.md` §3) |
| `~/.claude/settings.json` | enabledPlugins 不涉及版本号, R5 baseline 保持 `e5dd95df...` |
| 其他 8 个 enabled plugin (commit-commands, plugin-dev, ...) | 范围外 |
| `.claude-plugin/plugin.json` 重新加 `skills` 数组 | 上次修复已删, framework 扫描 skills/ 自动发现 (保留) |

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

### 调研发现 (the baseline skills repo 1.0 -> 1.2 对照)

- v1.0.0 (2026-06-17): router-skill 路由; codebase-design / domain-modeling 共享化; write-a-skill -> writing-great-skills; diagnose -> diagnosing-bugs; 引入 User-invoked/Model-invoked 两轴
- v1.0.1 (同日): teach skill reuse-first
- v1.1.0 (2026-07-08): router-skill 升级; review -> code-review (毕业, + Fowler smell baseline); decision-mapping -> wayfinder (毕业, HITL/AFK); to-prd -> to-spec; to-plan+to-issues -> to-tickets; prototype 从 user- 升 model-invoked; research 新增; grilling confirmation gate + Facts/Decisions 分离; tdd 改 reference-only + seam leading word + tautological-test anti-pattern; writing-great-skills 加 Negation + Negative Space 两个 Steering failure mode
- v1.2.0 (2026-07-15 调研确认): **不存在** (GitHub releases 只到 v1.1.0). 本地 `.changeset/` 含 2 个待发: friendlier-setup-and-local-tickets + prototype-primary-source
- 详细对照表: `docs/version_diff.md`

### 后续待 V 拍板 (v0.7.0 cycle)

1. Skill 分类调整: 25/26 model-invoked -> 11 user-invoked + 15 model-invoked (提案见 `Arthuropower_skill_classification.md` §2)
2. Domain-modeling 加载方式: user-invoked (SSOT 写主权) vs model-invoked (the baseline 模式)
3. 是否补全更多 agent/command (本 cycle 补 2+2 作为最小集, V 决定是否扩)

---

## 2026-06-26 — Initial rollout (curated plugin deployment)

### Summary

将 5 个自有工程 skill (S1-S6) 升级为 `arthurpower` curated plugin, 替换 legacy-governance-plugin 治理层, 完成 Phase 1 (构建 + 安装 + 验证) 与 Phase 2 (清理), 旧治理层 plugin 物理归档, settings.json 收口.

### Files Created

| 路径 | 大小 | 说明 |
|------|------|------|
| `D:\workspace\arthurpower\.claude-plugin\plugin.json` | 330 B | 插件元数据 (name=arthurpower, version=0.1.0) |
| `D:\workspace\arthurpower\hooks\session-start.sh` | 332 B | 2 行 SessionStart constraint bootstrap (executable) |
| `D:\workspace\arthurpower\hooks\hooks.json` | 326 B | SessionStart hook schema (validated against real plugin format) |
| `D:\workspace\arthurpower\hooks\README.md` | 220 B | 占位说明 |
| `D:\workspace\arthurpower\skills\architecture-change-reviewer\SKILL.md` | 4546 B | NEW Core (5 verdict + Task Decomposition) |
| `D:\workspace\arthurpower\skills\bounded-context-guardian\SKILL.md` | 4221 B | S1 (migrated + TDD refined) |
| `D:\workspace\arthurpower\skills\defensive-contract-validator\SKILL.md` | 4044 B | S2 (migrated + TDD refined) |
| `D:\workspace\arthurpower\skills\error-handling-enforcer\SKILL.md` | 4186 B | S3 (migrated + TDD refined) |
| `D:\workspace\arthurpower\skills\complexity-anti-drift\SKILL.md` | 3873 B | S5 (migrated + TDD refined) |
| `D:\workspace\arthurpower\skills\minimal-change-verifier\SKILL.md` | 4015 B | S6 (migrated + TDD refined) |
| `D:\workspace\arthurpower\skills\skill-authoring\SKILL.md` | 5097 B | Support (TDD + CSO + File Org + Skill Types + Anti-Patterns) |
| `C:\Users\<user>\.claude\skills\arthurpower\` | 52 K | runtime 副本 (11 files, 与 workspace 同步) |
| `C:\Users\<user>\.claude\archive\2026-06-26-arthurpower-rollout\` | — | archive 目录 |
| `C:\Users\<user>\.claude\archive\2026-06-26-arthurpower-rollout\legacy-governance-plugin-5.1.0\` | 1.8 M | legacy-governance-plugin 完整归档 (16 entries) |
| `C:\Users\<user>\.claude\settings.json.bak.20260626` | 7854 B | settings.json 改前备份 (sha256 `5c23e267bdad1446`) |

### Files Modified

#### `C:\Users\<user>\.claude\settings.json` (7854 → 7518 bytes, -336 B)

| 变更 | 字节差 | 触发步 |
|------|--------|--------|
| `hooks.UserPromptSubmit` 整段删除 (旧治理层 plugin echo `Reminder: brainstorming -> tdd-coach -> naming -> complexity -> minimal-change`) | -245 B | Phase 1.3 |
| `enabledPlugins.legacy-governance-plugin@claude-plugins-official: true → false` | 0 B (值改) | Phase 1.5 |
| `enabledPlugins.agent-skills@legacy-agent-skills: true` 整行删除 (stale, 物理已不在) | -47 B | Archive 后续清理 |
| `permissions.deny` 移除 `Skill(test-driven-development)` | -45 B | Phase 2 |

**未触碰**: `env.*` (12 个, 含 ANTHROPIC_AUTH_TOKEN + GITHUB_TOKEN), `permissions.allow`, 其他 hooks, 其他顶层字段, 其他 17 个 enabled plugin.

#### 7 × `SKILL.md` 升级路径

| Skill | v0 | v1 (TDD 精炼) | v2 (额外补全) |
|-------|-----|---------------|----------------|
| architecture-change-reviewer | 2246 B (NEW) | 3842 B | **4546 B** (+Task Decomposition step 6) |
| bounded-context-guardian | 2210 B (migrated) | 4221 B | — |
| defensive-contract-validator | 2049 B (migrated) | 4044 B | — |
| error-handling-enforcer | 2319 B (migrated) | 4186 B | — |
| complexity-anti-drift | 2002 B (migrated) | 3873 B | — |
| minimal-change-verifier | 2001 B (migrated) | 4015 B | — |
| skill-authoring | 2210 B (Support) | 4454 B | **5097 B** (+CSO / File Org / Skill Types / Anti-Patterns) |

每文件 v0 → v1 加入: Rationalization Table + Red Flags + Required Baseline + 5-section body structure (When / Not when / Procedure / Acceptance / Verification). v1 → v2 增量补全, 不重写.

### Files Archived (move, 非 delete)

| 源 | 目标 |
|----|------|
| `C:\Users\<user>\.claude\plugins\cache\claude-plugins-official\legacy-governance-plugin\5.1.0\` | `C:\Users\<user>\.claude\archive\2026-06-26-arthurpower-rollout\legacy-governance-plugin-5.1.0\` |
| `C:\Users\<user>\.claude\skills\agent-skills` (symlink) | (本任务开始前已不存在, 无对象) |
| `C:\Users\<user>\.agents\skills\agent-skills\` (target) | (本任务开始前已不存在, 无对象) |

**未触碰**: 6 个其他 symlink (cover-letter, job-hunt, mmx-cli, mock-interview, offer-decision, resume-craft), `~/.agents/skills/` target 父目录.

### Verification

| 项 | 状态 |
|----|------|
| `claude plugin validate` | `✔ Validation passed` (多次) |
| `claude plugin list` | `arthurpower@skills-dir` v0.1.0 user scope, `Status: ✔ loaded` |
| `enabledPlugins` count | 19 → 18 (agent-skills 清) |
| `permissions.deny` count | 7 → 6 (TDD deny 拆) |
| secret hash 锁定 (4 checkpoint) | `f95b5b534e742278` / `a8cb781327da68b5` 全一致 |
| 0 unexpected diffs vs `settings.json.bak.20260626` | ✓ |
| 7 skill 全部 discoverable (端到端实测) | 待复核 |

### 3 Task 实测 (中间证据, 端到端复核前)

| Task | Prompt | 实际触发 | 状态 |
|------|--------|---------|------|
| A | 加个新功能, 可能会改几个文件 | agent-skills 顶层 (interview-me / spec-driven-development) | 非 arthurpower |
| B | 修个 bug, 顺手补一下验证 | 协作规则散引 (外部协作准则 #1) | 非 arthurpower |
| C | 这个函数有点乱, 重构下 | arthurpower S3 + S5 ✓ | 触发 |

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

亲自开新 session 跑 3 任务, 截屏 system reminder 不含 旧治理层 plugin 描述, 验证 7 arthurpower skill 实际触发. 反馈后此文件追加 "VERIFIED" 段.

## 2026-06-26 — arthurpower v0.2.0 (skill depth upgrade + 4 new skills)

### Summary

Promote arthurpower from v0.1.0 (7 skills, 30 KB) to v0.2.0 (11 skills, ~62 KB). 3 existing skills upgraded to writing-skills depth; 4 new skills added from the gap analysis vs legacy-governance-plugin 5.1.0 + agent-skills 1.0.0. Quality review: 0 Critical, 1 High (fixed), 4 Medium (3 fixed, 1 follow-up), 6 Low (follow-up).

### Files Modified (Round 1 + 2.5)

| Path | Size | Change |
|------|------|--------|
| `arthurpower/skills/architecture-change-reviewer/SKILL.md` | ~6.5 KB | REWORK: 删 L3 phantom `interview-me` override; 删 L26 Step 0; 改 L37 Step 6 → 1-line hand-off to `minimal-change-verifier`; 加 V-approval Rationalization 行; 加 Plan-Format Annex (load-bearing: 5-row table covering verdict block, task template, handoff, PR description, sibling refs) |
| `arthurpower/skills/complexity-anti-drift/SKILL.md` | ~4.5 KB | UPGRADE: 加 5-row Refactor Patterns table (Extract Function / Inline / Move / Replace Conditional / Parameter Object); 修 L42 阈值自相矛盾; 加 outbound cross-ref 到 `bounded-context-guardian` + `minimal-change-verifier`; 去重 1 Red Flag |
| `arthurpower/skills/skill-authoring/SKILL.md` | ~5 KB | UPGRADE: 加 Quick Reference Table; 7-step TDD-for-skills methodology; 改 Verification 为 falsifiable (baseline transcript 文件要求); 5-line binary Acceptance checklist; 移到 `references/discipline-checklist.md` 减 body |
| `arthurpower/skills/skill-authoring/references/discipline-checklist.md` | 4.0 KB | NEW: 8-row Rationalization Table + 9-item Red Flags + Pressure Scenarios + Anti-Patterns + Iron Law |
| `arthurpower/.claude-plugin/plugin.json` | 330 → 800 B | description 改为 4-family taxonomy: S1-S6 governance / Architecture & planning / Process gates / Dispatch / 1 Support; version 0.1.0 → 0.2.0; fields name/author unchanged |

### Files Created (Round 1)

| Path | Size | Source | Notes |
|------|------|--------|-------|
| `arthurpower/skills/verification-before-completion/SKILL.md` | ~4.5 KB | legacy-governance-plugin:verification-before-completion | evidence-before-claims gate; generic 成功 = <criterion> <evidence> assertion format; banned-words list |
| `arthurpower/skills/systematic-debugging/SKILL.md` | ~8 KB | legacy-governance-plugin:systematic-debugging | 4-phase REPRODUCE/ISOLATE/INSTRUMENT/FIX; embed generic debug-stop 4 phases (3 attempts fail → reload); 7-row rationalization + 9-item red flags |
| `arthurpower/skills/writing-plans/SKILL.md` | ~7 KB | legacy-governance-plugin:writing-plans + 1 commit = 1 逻辑任务 spec | Plan Format template (load-bearing); 6-step procedure; ACR handoff sequence (Round 2.5 修) |
| `arthurpower/skills/dispatching-parallel-agents/SKILL.md` | ~9 KB | legacy-governance-plugin:dispatching-parallel-agents + subagent-driven-development merged | 6-step procedure; Subagent Prompt Template (load-bearing); 500 行 subagent 规范; Serena + Codebase Memory 引用 |

### Quality Audit (Round 2)

| Severity | Count | Fixed | Status |
|----------|-------|-------|--------|
| Critical | 0 | — | n/a |
| High | 1 | 1 (Round 2.5) | skill-authoring orphan references — FIXED |
| Medium | 4 | 3 (Round 2.5) | plugin.json taxonomy / systematic-debugging reverse link / writing-plans handoff — FIXED; 1 follow-up (verification-before-completion bidirectional link — TODO) |
| Low | 6 | 0 | follow-up: plugin.json homepage/license, additional bilingual triggers, 等等 |

**Verdict**: APPROVE-WITH-FIXES (after Round 2.5 = APPROVE)

### Constraints — All PASS

| Constraint | Pass |
|------------|------|
| 1 commit = 1 逻辑任务 | ✅ S6 enforcement in `minimal-change-verifier` |
| 凭证安全 (no plaintext secrets) | ✅ no API key / token / password strings |
| 严词规范 absent (撞/真因/切流/等价品/拍) | ✅ grep clean |
| 端到端实测 = 唯一真值 | ✅ `verification-before-completion` + `systematic-debugging` Iron Law |
| bilingual triggers | ✅ all 11 descriptions |
| 500 行 subagent 规范 | ✅ `dispatching-parallel-agents` |
| S1-S6 coverage | ✅ 5/5 explicit (S4 folded into S2 + writing-plans) |

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

| Skill | 行 | 字节 | Iron Law |
|-------|-----|------|----------|
| `security-and-hardening` | 294 | 18.3 KB | "Every external input is untrusted until validated at the boundary" |
| `spec-driven-development` | 301 | 17.3 KB | "SPECIFY before PLAN, never skip the assumption gate" |
| `frontend-ui-engineering` | 241 | 13.8 KB | "Production UI is accessible UI, by default" |
| `performance-optimization` | 206 | 10.9 KB | "Profile before optimize — never optimize blind" |
| `using-agent-skills` (router) | 297 | 17.9 KB | "Always check the flowchart before falling back to system prompt defaults" |

**Format**: 全部遵循 `arthurpower:skill-authoring` 7-step TDD-for-skills (Iron Law + Procedure + Rationalization Table + Red Flags + Pressure Scenarios + Anti-Patterns + Example + Verification).

### plugin.json v0.2.0 → v0.3.0

- Skills: 11 → **16** (5 new entries)
- description: 4 family → 5 family (新增 v0.3.0 promoted Tier B family)
- version: 0.2.0 → **0.3.0**

### Files Created (this round)

| 路径 | 大小 | 说明 |
|------|------|------|
| `C:\Users\<user>\.claude\plugins\arthurpower\` | 174.5 KB | user-level plugin (canonical global) |
| `C:\Users\<user>\.claude\plugins\arthurpower\.claude-plugin\plugin.json` | 5.4 KB | v0.3.0 manifest (16 skill declarations) |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\security-and-hardening\SKILL.md` | 18.3 KB | NEW Core (3-layer boundary defense) |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\spec-driven-development\SKILL.md` | 17.3 KB | NEW Core (SPECIFY phase gate) |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\frontend-ui-engineering\SKILL.md` | 13.8 KB | NEW Core (production UI + a11y) |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\performance-optimization\SKILL.md` | 10.9 KB | NEW Core (Core Web Vitals + profile-first) |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\using-agent-skills\SKILL.md` | 17.9 KB | NEW Support (meta-router, 28 auto-trigger + 12 manual-only) |

### Files Modified (this round)

| 路径 | 旧 → 新 | 变化 |
|------|---------|------|
| `plugin.json` | v0.2.0 (11 skill) | **v0.3.0 (16 skill)** |

### Files Archived (no deletion, 归档不删)

| 原路径 | 归档路径 | 内容 |
|--------|---------|------|
| `D:\workspace\arthurpower\` (workspace) | `C:\Users\<user>\.claude\archive\memory-cleanup-2026-06-27\arthurpower-workspace-2026-06-27\` | 整个 plugin 目录 (含 v0.2.0 tar.gz 备份 + CHANGELOG + docs + hooks + 16 skills) |
| `C:\Users\<user>\.claude\skills\arthurpower\` (旧 8-skill global) | `C:\Users\<user>\.claude\archive\memory-cleanup-2026-06-27\arthurpower-skills-old-2026-06-27-v2\` | 2026-06-26 初始 rollout 状态 (8 skill, 3.8-6.4 KB/skill) |
| `C:\Users\<user>\.claude\skills\using-agent-skills\` (单文件副本) | `C:\Users\<user>\.claude\archive\memory-cleanup-2026-06-27\using-agent-skills-flat-copy\` | 之前 cp 错的单文件副本 (已 superseded by plugin version) |

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

| 路径 | 大小 | 说明 |
|------|------|------|
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\defend-claim\SKILL.md` | ~10.6 KB | NEW discipline (195 行, 5 questions, 11-bypass table, 7 rationalization rows, 5 red flags) |
| `C:\Users\<user>\.claude\hooks\defend-claim-execution.sh` | 1147 B | Q1 hook — PostToolUse on Bash, advisory, supports `--self-test` |
| `C:\Users\<user>\.claude\hooks\defend-claim-cite-integrity.sh` | 1430 B | Q2 hook — PostToolUse on Edit\|Write, `timeout 3s sed`, Exit 2 on phantom cite |
| `C:\Users\<user>\.claude\hooks\defend-claim-report-triple.sh` | 1134 B | Q3 hook — PostToolUse on Write, strips zero-width Unicode, Exit 2 on completion-without-evidence |
| `C:\Users\<user>\.claude\hooks\defend-claim-dumb-zone.sh` | 1060 B | Q4 hook — PostToolUse on Edit\|Write, stateful turn counter every 10th, advisory |
| `C:\Users\<user>\.claude\hooks\defend-claim-silent-fail.sh` | 1469 B | Q5 hook — PostToolUse on Edit\|Write, regex deny `except: pass` / `catch {}` / silent null, Exit 2 |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\defend-claim\iteration\1\evals.json` | — | 20 queries (positive / negative / pressure / counter-example) |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\defend-claim\iteration\1\grading.json` | — | mock grading, pass_rate 1.0 |
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\defend-claim\iteration\1\red-baseline.md` | — | red-team transcript baseline |

### Files Modified

| 路径 | 旧 → 新 | 变化 |
|------|---------|------|
| `plugin.json` | v0.3.0 (16 skill) | **v0.4.0 (17 skill)** — description 加 family 6 (`defend-claim`), version 0.3.0 → 0.4.0 |
| `using-agent-skills/SKILL.md` | quick-reference 28 auto-trigger | + `defend-claim` 行, flowchart 加 claim-time gate 节点 |
| `using-agent-skills/SKILL.md` | 12 manual-only list | 不变 |

### Verification

| 项 | 状态 |
|----|------|
| Q2 cite-integrity `--self-test` | "Q2 self-test: phantom cite detection. PASS" (exit 0) |
| Q3 report-triple `--self-test` | "Q3 self-test: report triple detection. PASS" (exit 0) |
| Q5 silent-fail `--self-test` | "Q5 self-test: silent-failure detection. PASS" (exit 0) |
| Q2 real-fire phantom cite | Exit 2 `REJECTED: Q2 phantom cite — file does not exist: ...` |
| Q3 real-fire `完成 this works now` | Exit 2 |
| Q5 real-fire `try: x()\nexcept: pass` | Exit 2 |
| Q1 + Q4 | advisory only (Exit 0), 框架 surface 到 agent context |
| iteration/1 evals | 10 queries mock grading pass_rate 1.0 (planned: 20 + LLM-based eval driver) |
| `python3 scripts/validate_skill.py` | exit 0 |
| 5 hook 文件 + 1 skill dir 物理存在 | ✓ |
| Bar level | discipline (single-session scope); promote to high_risk 时需 V 字面 trigger |

### Routing Entries Added

- `using-agent-skills` quick-reference 表加 `defend-claim` 行 (触发词: claim / 完成 / done / fixed / passing / 成功 / evidence / verify)
- flowchart 加 claim-time gate 节点 (Work → Verification → Report → defend-claim gate)

---

## 2026-06-27 — v0.5.0 upstream-docs discipline skill (lookup-first via docs MCP)

### Summary

新增 upstream-docs discipline skill (131 行, ~5.5 KB), 把 arthurpower 工作流中所有"用户提具体库/框架/SDK/API/CLI/cloud service + 问版本相关问题"统一强制走 docs MCP 链路. 7 rationalization rows + 7 red flags + 6-row bypass table. 不替代 web search, 仅上游文档. (注: 该 skill 后在 v0.7.1 cycle 退役并归档至 `docs/archive/skills/` 的 upstream-docs discipline 子目录.)

### Files Created

| 路径 | 大小 | 说明 |
|------|------|------|
| `C:\Users\<user>\.claude\plugins\arthurpower\skills\upstream-docs-lookup\SKILL.md` (历史名 docs-lookup skill) | ~5.5 KB | NEW discipline (131 行, 8-step procedure, 6-bypass table, 7 rationalization rows, 7 red flags); 现存档于 `docs/archive/skills/` 的 upstream-docs discipline 子目录 |

### Files Modified

| 路径 | 旧 → 新 | 变化 |
|------|---------|------|
| `plugin.json` | v0.4.0 (17 skill) | **v0.5.0 (18 skill)** — description 加 family 6 末段 upstream-docs lookup 行, version 0.4.0 → 0.5.0 (v0.7.1 cycle 已 scrub 该引用, 重写为 family 6 = engineering disciplines 4 项) |
| `using-agent-skills/SKILL.md` | quick-reference 29 auto-trigger | + upstream-docs 行, flowchart 加 docs-lookup 节点 (v0.7.1 cycle 已 scrub 该行) |

### Verification

| 项 | 状态 |
|----|------|
| `python3 scripts/validate_skill.py <upstream-docs>/SKILL.md` | exit 0 |
| Acceptance Criteria 7/7 | ✓ (detect → resolve → version → query-docs ≤3 → quote → no hallucinate → no web-search replace) |
| Bypass table 6/6 row | ✓ (training memory / quick answer / well-known / resolve skipped / no-snippet fallback / mention-without-quote) |
| Rationalization Table 7/7 row | ✓ |
| Red Flags 7/7 row | ✓ |
| Skill type | discipline |
| Bar level | discipline (lookup-first rule under time/knowledge pressure); promote 到 high_risk 需 V 字面 trigger |
| 1 skill dir 物理存在 | ✓ (历史路径已迁至 archive) |

### Routing Entries Added

- `using-agent-skills` quick-reference 表加 upstream-docs 行 (触发词: 库名 / API 语法 / 版本迁移 / CLI flag / setup steps / SDK 配置; v0.7.1 cycle 已 scrub)
- flowchart 加 docs-lookup 节点 (User query → Detect library+version-sensitive → upstream-docs discipline skill)
- 与 `codebase-memory` (项目内代码) + `serena` (symbol-level edit) 正交, 三者互补不竞争
