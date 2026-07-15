---
name: setup-arthurpower
description: "Arthurpower 体系结构声明入口 — 一次性 setup. Auto-detects project mode (fresh / old-repo / intermediate) and runs the right flow: fresh → bootstrap from GitHub template, old-repo → incremental gap-fill (existing CLAUDE.md / docs/ preserved, only missing pieces added). Registers 5 context-闭环 hooks + pre-fs-guard WITH dedup detection (扫描用户级 ~/.claude/settings.json 避免双重注册 — 干净环境注册项目级 / 部分重叠补缺 / 全重叠跳过). Use when bootstrapping a new project on Arthurpower, or when migrating an existing repo into the Arthurpower spec without deleting user content. Triggers on: 初始化项目, setup, 新项目脚手架, context setup, 接入 arthurpower, project migration."
version: 3.0.0
tags: [Setup, Bootstrap, ContextMap, Contract, OneShot, Hooks, Dedupe, Migration, GithubPull]
author: Arthurpower
related_skills: [domain-modeling, deep-dive-protocol, boundary-testing, self-evolving-rules]
---

# Setup Arthurpower — 结构声明入口 (一次性)

## Overview

初始化钩子, 在项目首次接入或迁移时运行一次. 它不写业务术语, 只声明**结构**: 在哪里读 / 在哪里写 / 谁消费.

**核心承诺**:
- **双模式适配**: 自动检测 fresh (无 `CLAUDE.md`) / old-repo (已有 `CLAUDE.md` 等) / intermediate, 跑对应流程
- **不删旧内容**: 旧仓库接入时, 只补缺的 (`.claude/rules/` `.claude/hooks/` `.claude/skills/` `docs/CONTEXT.md` `scripts/` `.evals/`), 不动 `CLAUDE.md` / `CLAUDE.local.md` / 已有 `docs/` 内容
- **GitHub pull**: 默认模板源 = `<owner>/<repo>` GitHub 仓, 通过 `scripts/update.sh --from-git` 拉取
- **5 hook dedup**: 默认注册 5 个 context-闭环 hook + pre-fs-guard, 按用户级是否已有同名 hook 三分支决策 (干净 / 部分重叠 / 全重叠)

## When to Use

- 新项目首次接入 Arthurpower
- 现有项目迁移到 Arthurpower 规范 (保留旧内容)
- 项目已有部分 Arthurpower 资产但缺关键部件, 增量补齐
- 多语境项目需要切换为 `CONTEXT-MAP.md` 模式

## When NOT to Use

- 已完整初始化过 (检查 `docs/agents/context-contract.md` + `.claude/skills/domain-modeling/` + `.evals/run.sh` 三个全有)
- 只想补 glossary 词 → 走 `domain-modeling`
- 只想访谈对齐术语 → 走 `deep-dive-protocol`

## How to Run

### Step 0: Mode Detection (新增)

读项目根, 判断 3 种模式:

| 检测条件 | 模式 | 后续流程 |
|---------|------|---------|
| 无 `CLAUDE.md` 且无 `.claude/` | **fresh** | Step 1 → Step 6 (GitHub pull bootstrap) → Step 1-5 |
| 有 `CLAUDE.md` (或 `docs/CONTEXT.md` / `.claude/`) | **old-repo** | Step 1-4 skip / 已有则保留 → Step 5 dedup 注册 → Step 6 update (可选) |
| 部分有 (有 `CLAUDE.md` 但缺 `.claude/rules/` 等) | **intermediate** | Step 0.5 gap-fill → Step 5 dedup → Step 6 update (可选) |

**判断依据不要靠文件清单**: 任意一个核心标记文件 (`CLAUDE.md` / `docs/CONTEXT.md` / `.claude/settings.json`) 存在 → 视为 old-repo 或 intermediate, 绝不删旧文件.

### Step 0.5: Gap-Fill (intermediate 模式专用)

对 old-repo / intermediate, 列出已有 vs 缺, 只补缺:

```bash
declare -a REQUIRED=(
  ".claude/rules/context-loop.md"
  ".claude/rules/boundary-testing-protocol.md"
  ".claude/rules/self-evolving.md"
  ".claude/hooks/pre-context-write-guard.cjs"
  ".claude/hooks/pre-stale-read.cjs"
  ".claude/hooks/pre-read-contract.cjs"
  ".claude/hooks/post-ssot-priority.cjs"
  ".claude/hooks/post-conflict-annotation.cjs"
  ".claude/hooks/pre-fs-guard.cjs"
  ".claude/skills/domain-modeling/SKILL.md"
  ".claude/skills/setup-arthurpower/SKILL.md"
  "docs/CONTEXT.md"
  "docs/agents/context-contract.md"
  "scripts/bootstrap.sh"
  "scripts/update.sh"
  ".evals/run.sh"
)
for f in "${REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    echo "[gap-fill] MISSING: $f (will pull from template)"
    PULL_LIST+=("$f")
  fi
done
```

非空 PULL_LIST 调 `scripts/update.sh --from-git <owner>/<repo> --only "${PULL_LIST[@]}"` (update.sh Step 5b 增量).

**PROTECTED 永不覆盖** (即使 `--force`): `CLAUDE.md`, `CLAUDE.local.md`, `docs/CONTEXT.md`, `.claude/settings.local.json`, `.claude/settings.json`, `docs/handoff/*`.

### Step 1: 探测项目语境

```
问用户 (或从 package.json / Cargo.toml / pyproject.toml 推断):
  - 单仓单语境 (默认) → CONTEXT.md
  - 单仓多语境 (monorepo) → CONTEXT-MAP.md + 各 <ctx>/docs/CONTEXT.md
```

### Step 2: 创建目录

```bash
mkdir -p docs/agents docs/adr
# monorepo: mkdir -p src/<ctx>/docs/CONTEXT.md (Step 5b 决策为干净环境后)
```

### Step 3: 写入 context-contract.md

复制模板版 `docs/agents/context-contract.md` 到项目根.

### Step 4: 写入占位 CONTEXT.md 或 CONTEXT-MAP.md

单语境占位 (H1 标题用 V 拍板的项目名, **不要事后通过 Edit 改 H1**, 那会被 pre-context-write-guard 拦截):

```markdown
# <项目名> — 领域词汇表

> 本文件是项目领域词汇的**单一事实源 (SSOT)**.
> 仅 `domain-modeling` 技能可写; 其他技能按 `docs/agents/context-contract.md` 消费.

---

## Language

<!-- domain-modeling 会逐词添加 -->

---

## Flagged ambiguities

<!-- domain-modeling 会记录 -->
```

多语境:

```markdown
# CONTEXT Map

| Context | Path | Owner |
|---|---|---|
| <ctx-1> | src/<ctx-1>/docs/CONTEXT.md | @<team> |
```

### Step 5: 注册物理护栏 (按需, 避免双重)

**核心原则**: Claude Code 的 hook 是从用户级 + 项目级**叠加收集**而非 fallback, 同 matcher 重复注册会跑两次 (产生 systemMessage 重复 + state 文件读写竞态). 所以 hook 注册必须按环境分支.

**Step 5a: 探测用户级是否已注册**

读取 `~/.claude/settings.json` 的 `hooks.PreToolUse` + `PostToolUse` 列表, 看是否含同名 hook 文件名. 默认检测 6 个 hook (5 context-闭环 + pre-fs-guard):

| Hook | 触发 | 职责 |
|------|------|------|
| `pre-context-write-guard.cjs` | PreToolUse Write/Edit/MultiEdit/Bash | CONTEXT.md / ADR 写入主权 + Bash 3-regex |
| `pre-stale-read.cjs` | PreToolUse Write/Edit/MultiEdit/Bash (src/) | CONTEXT.md mtime 过期 → advisory |
| `pre-read-contract.cjs` | PreToolUse Write/Edit/MultiEdit/NotebookEdit/Bash (src/) | 写 src/ 前未读 CONTEXT.md → advisory |
| `post-ssot-priority.cjs` | PostToolUse Write/Edit/MultiEdit/Bash | team/project/sub-context 术语冲突 → stderr POST-FIX WARNING |
| `post-conflict-annotation.cjs` | PostToolUse Write/Edit/MultiEdit/Bash (tool_name 白名单) | skill 输出矛盾 ADR → advisory |
| `pre-fs-guard.cjs` | PreToolUse Bash | 拦 `find /` / `grep -r /` / 尾随 `&` (2026-07 find.exe handle leak 防护) |

**Step 5b: 三种决策**

| 场景 | 判定 | 动作 |
|------|------|------|
| 用户级**全无**同名 hook | 干净环境 (CI / Docker / 新机器) | 注册全部 6 hook 到 `.claude/settings.json` |
| 用户级**已有**部分同名 | 部分干净 | 只注册用户级**没有**的 hook |
| 用户级**全有**同名 hook | 与现有用户级环境重叠 | 跳过项目级注册, 提示"已由用户级提供" |

**Step 5c: 项目级注册片段** (只在场景 1+2 才用)

`.claude/settings.json` `hooks` 追加:

```json
"PreToolUse": [
  {
    "matcher": "Write|Edit|MultiEdit|Bash",
    "hooks": [
      {"type": "command", "command": "node .claude/hooks/pre-context-write-guard.cjs", "timeout": 5},
      {"type": "command", "command": "node .claude/hooks/pre-stale-read.cjs", "timeout": 5},
      {"type": "command", "command": "node .claude/hooks/pre-read-contract.cjs", "timeout": 5}
    ]
  },
  {
    "matcher": "Bash",
    "hooks": [
      {"type": "command", "command": "node .claude/hooks/pre-fs-guard.cjs", "timeout": 5}
    ]
  }
],
"PostToolUse": [
  {
    "matcher": "Write|Edit|MultiEdit|Bash",
    "hooks": [
      {"type": "command", "command": "node .claude/hooks/post-ssot-priority.cjs", "timeout": 5},
      {"type": "command", "command": "node .claude/hooks/post-conflict-annotation.cjs", "timeout": 5}
    ]
  }
]
```

**Step 5d: 字节级操作纪律 (R5)**

settings.json 含 secret 字段时必须 byte-level (rb + regex + wb). 用 `Edit` 工具精准追加, 不 `Write` 整文件. 改后 `python3 -m json.tool` 校验 JSON 完整.

**Step 5e: 验证**

```bash
bash .evals/run.sh --all   # 必须 10/10 (hook 行为正确)
python3 -c "import json; print(json.load(open('.claude/settings.json'))['hooks'])"
```

### Step 6: GitHub Pull (新增)

模板规范演进同步. 默认源 = `<owner>/<repo>` GitHub 仓.

```bash
# 拉取最新模板规范到本项目 (增量, 不覆盖 PROTECTED)
bash scripts/update.sh --from-git <owner>/<repo>

# 仅拉取指定文件 (gap-fill 模式)
bash scripts/update.sh --from-git <owner>/<repo> --only .claude/rules/ scripts/

# 本地模板路径 (开发用)
ARTHUR_TEMPLATE=/path/to/local/arthur-tpl bash scripts/update.sh

# 强制覆盖 (会破坏 PROTECTED 之外的本地定制)
bash scripts/update.sh --from-git <owner>/<repo> --force
```

`update.sh` 自动:
1. `git clone --depth=1 <url> .arthur-tpl-cache/` (临时目录)
2. sha256 比对每文件
3. SAME → skip / DIFF → skip (默认) 或 warn `--force` / MISSING → copy
4. PROTECTED (`CLAUDE.md`, `CLAUDE.local.md`, `docs/CONTEXT.md`, `.claude/settings.json`, `.claude/settings.local.json`, `docs/handoff/*`) 永不覆盖
5. 清理临时 clone

## Verification Checklist

### Fresh / Intermediate 模式必查

- [ ] `docs/agents/context-contract.md` 存在
- [ ] `docs/CONTEXT.md` 或 `docs/CONTEXT-MAP.md` 存在 (含 SSOT 头注释, H1 标题是正确项目名, **不在 setup 阶段 Edit H1**)
- [ ] `docs/adr/` 目录存在 (空目录也 OK)
- [ ] 6 个 hook 文件存在于 `.claude/hooks/` (pre-context-write-guard / pre-stale-read / pre-read-contract / post-ssot-priority / post-conflict-annotation / pre-fs-guard)
- [ ] **hook 注册按需** (Step 5b 三分支)
- [ ] `domain-modeling` + `deep-dive-protocol` + `setup-arthurpower` + `self-evolving-rules` 在 `.claude/skills/`
- [ ] `.claude/rules/context-loop.md` 存在
- [ ] `.claude/rules/boundary-testing-protocol.md` 存在 (跨多文件/多 hook 改动必走 6 步流程)
- [ ] `.claude/rules/self-evolving.md` 存在 (规则沉淀 6 步流程)
- [ ] `scripts/bootstrap.sh` + `scripts/update.sh` 存在 + 可执行
- [ ] `.evals/run.sh --all` 10/10 PASS

### Old-repo 模式必查 (增量接入, 不删旧)

- [ ] Step 0 检测正确 (有 CLAUDE.md → old-repo)
- [ ] Step 0.5 gap-fill 列出 PULL_LIST, 调 update.sh
- [ ] **现有 `CLAUDE.md` 未被修改** (sha256 before == sha256 after)
- [ ] **现有 `docs/` 全部文件未被修改** (除 `docs/CONTEXT.md` 因 gap-fill 创建, `docs/agents/context-contract.md` 因 gap-fill 创建)
- [ ] **现有任何文件未删除**
- [ ] 新增的 hook / rules / skills 通过 update.sh 拉取, sha256 与模板一致
- [ ] `.claude/settings.json` 经 Step 5 dedup 决策后只追加必要的 hook
- [ ] `.evals/run.sh --all` 在 old-repo 模式下应至少 5/10 (因旧项目结构可能不符合全部 10 task 假设)

### Setup 完成语义

成功 = fresh 模式跑过 `.evals/run.sh --all` 10/10 + 6 hook 全在; old-repo 模式现有文件零改动 + 缺的资产通过 update.sh 增量补齐 + dedup 决策正确执行.

## References

- 模板仓: https://github.com/<owner>/<repo> (含 `scripts/bootstrap.sh` + `scripts/update.sh`)
- 读侧契约: `docs/agents/context-contract.md`
- 写侧主权: `.claude/skills/domain-modeling/SKILL.md`
- 物理护栏: `.claude/hooks/pre-context-write-guard.cjs` (5 个 context-闭环 hook 的根)
- 规则层: `.claude/rules/context-loop.md`
- 边界测试 SOP: `.claude/rules/boundary-testing-protocol.md`
- v2.0.0 设计依据: `<local-scratch>/<template-repo>/.claude/skills/setup-arthurpower/SKILL.md`
- v3.0.0 changelog: 从 v2.0.0 升级, 新增 Step 0 mode detection + Step 0.5 gap-fill + Step 6 GitHub pull; 集成 pre-fs-guard (v2 漏) + post-ssot-priority / post-conflict-annotation 修复版; Verification Checklist 拆 fresh / old-repo 双分支