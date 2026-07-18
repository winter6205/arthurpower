# Quick Reference Table (router-reachable skills)

| Phase | Skill | Trigger |
|-------|-------|---------|
| Meta | skill-authoring | "creating SKILL.md", "edit router skill" |
| Meta | self-evolving-rules | "记住 X", "以后 X", "规则是 X" |
| Meta | dispatching-parallel-agents | "parallel subagent", "concurrent dispatch" |
| Meta | codebase-memory | "explore architecture", "trace call chain" |
| Meta | serena | "LSP edit", "replace_symbol_body" |
| Meta | gbrain-dispatch | "GBrain KB", "read page" |
| Build | bounded-context-guardian | "拆模块", "circular import" |
| Build | defensive-contract-validator | "加接口", "修个 bug", "补验证" |
| Build | error-handling-enforcer | "改错误处理", "加 try-catch" |
| Build | complexity-anti-drift | "重构", "减复杂度", "拆函数" |
| Build | minimal-change-verifier | "提交前", "准备 commit", "1 commit" |
| Verify | systematic-debugging | "修 bug", "系统调试" |
| Verify | verification-before-completion | Pre-merge acceptance |
| Review | code-review-and-quality | "review", "PR", "5-axis" |

## User-invoked gates

`disable-model-invocation: true` — user-invoked skills; operator triggers via Skill tool / slash; description not auto-matched.

| Phase | Skill | Trigger |
|-------|-------|---------|
| Plan | architecture-change-reviewer | "加个新功能", "multi-file change" |
| Plan | writing-plans | After ACR verdict:yes |

## Restricted

| Phase | Skill | Trigger |
|-------|-------|---------|
| Restricted | browser-testing-with-devtools | "browser test", "Chrome DevTools", "DOM inspect" |
| Restricted | documentation-and-adrs | "ADR", "decision record", "write docs" |
| Restricted | interview-me | "interview me", "grill me", "stress-test thinking" |
| Restricted | shipping-and-launch | "pre-launch checklist", "rollback", "production" |
| Restricted | source-driven-development | "official docs", "framework code", "verified code" |
