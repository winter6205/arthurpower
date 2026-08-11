# Quick Reference Table (router-reachable skills)

| Phase | Skill | Trigger |
|-------|-------|---------|
| Meta | skill-authoring | "creating SKILL.md", "edit router skill" |
| Meta | self-evolving-rules | "记住 X", "以后 X", "规则是 X" |
| Meta | dispatching-parallel-agents | "parallel subagent", "concurrent dispatch" |

| Build | bounded-context-guardian | "拆模块", "circular import" |
| Build | defensive-contract-validator | "加接口", "修个 bug", "补验证" |
| Build | error-handling-enforcer | "改错误处理", "加 try-catch" |
| Build | complexity-anti-drift | "重构", "减复杂度", "拆函数" |
| Build | minimal-change-verifier | "提交前", "准备 commit", "1 commit" |
| Build | test-driven-development | "write failing test first", "TDD" |
| Build | frontend-ui-engineering | "build component", "UI", "design tokens" |
| Build | performance-optimization | "slow LCP", "bundle size", "N+1 query" |
| Build | security-and-hardening | "add endpoint", "auth flow", "secret handling" |
| Build | codebase-onboarding | "onboarding", "newcomer guide", "learning path" |
| Verify | systematic-debugging | "修 bug", "系统调试" |
| Verify | verification-before-completion | Pre-merge acceptance |
| Verify | defend-claim | "Q1 evidence", "raw exit code", "before commit" |
| Verify | commit-revert-protocol | "rollback", "supersede ADR", "revert commit" |
| Review | arthurpower:code-review | "review", "PR", "审代码", "dual-axis" |
| Review | boundary-testing | "边界测试", "boundary test", "跨文件改动", "跨 hook 状态", "实施前验证", "force smoke" |

## Defining (early-stage)

| Phase | Skill | Trigger |
|-------|-------|---------|
| Defining | spec-driven-development | "new project", "no spec yet", "multi-file scope" |
| Defining | deep-dive-protocol | "vague request", "under-specified", "don't know what you want" |
| Defining | wayfinder | "rough concept", "too big for one session", "need variants" |

## Team SSOT

| Phase | Skill | Trigger |
|-------|-------|---------|
| SSOT | domain-modeling | "glossary", "ADR", "CONTEXT.md" |
| SSOT | team-glossary-sync | "team-level term", "docs/team-glossary.md" |

## Setup / bootstrap

| Phase | Skill | Trigger |
|-------|-------|---------|
| Setup | setup-arthurpower | "bootstrap project", "first-time setup" |
| Setup | wayfinder | "multi-session plan", "decision tickets", "tracker map" |

## User-invoked gates

`disable-model-invocation: true` — user-invoked skills; operator triggers via Skill tool / slash; description not auto-matched.

| Phase | Skill | Trigger |
|-------|-------|---------|
| Plan | writing-plans | After ACR verdict:yes |

## Model-invoked gates

`disable-model-invocation: false` — model-invoked skills; the model auto-matches on the description. ACR is model-invoked under ADR-0010; the 5-line verdict still blocks on no/unclear.

| Phase | Skill | Trigger |
|-------|-------|---------|
| Plan | architecture-change-reviewer | "multi-file change", "new module", "cross-module refactor" |

## Restricted

| Phase | Skill | Trigger |
|-------|-------|---------|
