# Arthurpower - 工作目录 (技能仓库镜像)

> 本目录是 arthurpower plugin 的**工作副本**。改 plugin 在这里改、在这里验证；PR 合入仓库后，才由 V apply 到 `~/.claude/plugins/` 真正运行实例。
>
> **绝不修改** `~/.claude/plugins/marketplaces/` 与 `~/.claude/plugins/cache/` - 那是 framework 运行时读的真值。

---

## 目录结构

```
Arthurpower/
├── arthurpower/              # plugin 源 (marketplaces/.../plugins/arthurpower/ 的副本)
│   ├── .claude-plugin/plugin.json   # plugin manifest (framework 校验源)
│   ├── agents/               # 2 个 agent (audit / dispatcher)
│   ├── commands/             # /audit, /fanout
│   ├── docs/                 # plugin 内文档 (harness-map / 设计报告)
│   ├── hooks/                # SessionStart + 5 PostToolUse defend-claim hooks + lib/
│   ├── scripts/run_skill_eval.py
│   ├── skills/               # 27 skills (6 families)
│   ├── SKILL.md, CHANGELOG.md
├── marketplace.json          # plugin 顶层注册 (marketplaces/.../.claude-plugin/marketplace.json 副本)
├── known_marketplaces.json   # 用户级 marketplace 注册表副本 (参考)
├── docs/                     # 项目级文档
│   ├── CONTEXT.md            # 领域词汇 SSOT (domain-modeling 写主权)
│   ├── adr/                  # 3 个 ADR (0001-0003)
│   ├── agents/context-contract.md   # 读侧契约 (setup-arthurpower 产物)
│   ├── handoff/              # 8 个 session handoff
│   ├── spec/                 # v0.7.0 spec (6 文件)
│   ├── plans/                # hook-development 蒸馏计划
│   └── *.md                  # 设计/审阅/回归报告
├── evals/                    # 验证脚本 + evals.json
│   ├── run_v070_skill_eval.py + v070_skill_evals.json     # 32 静态契约
│   ├── run_hook_scenario.py + hook_scenario_evals.json    # 30 hook 边界
│   ├── run_context_scenario.py + context_scenario_evals.json  # 30 context 闭环
│   ├── run_stdin_hang_scenario.py                         # 24 stdin-hang
│   ├── run_scenario_eval.py + scenario_evals.json         # 旧 baseline
│   ├── validate_12constraints.py                          # 12 约束静态校验
│   └── scenario_grading_final.json
├── hooks/                    # 项目级物理护栏源码 (v0.7.0 修复版)
│   ├── pre-context-write-guard.cjs   # CONTEXT.md / ADR 写主权护栏
│   └── pre-fs-guard.cjs              # 禁写区 FS 护栏
└── project-reports/          # 历史 eval 报告 + 调试脚本 (证据存档)
```

---

## 工作流

1. **改 plugin**: 在 `arthurpower/` 下编辑
2. **验证**: 在 `evals/` 跑脚本 (`python evals/run_v070_skill_eval.py evals/v070_skill_evals.json` 等)
3. **PR**: 提交到仓库
4. **apply**: V 审通过后，由 V 把改动 apply 到 `~/.claude/plugins/marketplaces/arthurpower-local/...` + `~/.claude/plugins/cache/arthurpower-local/arthurpower/0.7.0/` (两处副本，framework 校验读 marketplaces 副本，installPath 指向 cache 副本)

---

## setup-arthurpower

首次接入新项目时跑 `Skill(arthurpower:setup-arthurpower)`，会在项目根创建读侧契约 + 物理护栏。本目录已含从 <local-project> 迁移的 `docs/agents/context-contract.md`，可跳过 setup 或重跑覆盖。

## 参考来源

- v0.7.0 完成交接: `docs/handoff/2026-07-15-arthurpower-v0.7.0-phase-b-complete.md`
- 领域词汇: `docs/CONTEXT.md`
- 验证基线: `evals/v070_skill_evals.json` (32 case ×3 稳定 100%)
