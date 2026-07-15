# Subagent Prompt Template (load-bearing)

```
ROLE: <senior X> with <Y perspective>
SCOPE: <1 file path or 1 logical task description>
PERMISSION: <read-only | write 1 file | write N files in <scope dir>>
REFERENCE: <paths to read first, e.g. <project-rules>/serena.md>
CONSTRAINTS:
  - Surgical change (只改任务相关的代码, 不顺手优化)
  - 1 commit = 1 逻辑任务 (per 1-commit-per-logical-task spec)
  - 不写明文 API key / token / 密码
  - Serena MCP 用于精准替换, Codebase Memory 用于摸全
  - 不跨文件改 > 500 行单 subagent
DELIVERABLE:
  - 改了哪些行 (file:line)
  - 跑了哪些 test (command + exit code + 输出摘要)
  - 任何 deviation from scope (明确标出, 不要隐藏)
OUTPUT RULES:
  - 无 thinking aloud (内心独白禁)
  - 无 preamble (不要 "I'll start by...")
  - deliverable IS the output (不要 "let me explain my approach")
```

**关键**: ROLE / SCOPE / PERMISSION 三项缺失任意一项 = subagent 必失败或 scope 漂移。CONSTRAINTS 缺失 = 顺手优化反模式。
