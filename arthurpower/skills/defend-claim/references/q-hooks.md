# Q1-Q5 Hook Reference

> Full Q-hook detail: hook path, logic, fail-action, self-test command, real-fire example for each of the five questions. Loaded on demand from `defend-claim/SKILL.md` §Procedure (5 Questions).

---

## Q1 — Execution Captured

*Did you RUN it and capture raw exit/output bytes — not read, not re-state?*

- **Hook**: `defend-claim-execution.sh` (PostToolUse on Bash) — supports `--self-test`
- **Logic**: Read `.tool_input.command` from the PostToolUse payload. If the command matches `curl | wget | pytest | npm test | python -m test | go test | docker ps`, check `.tool_response` (the Claude Code PostToolUse result field, not `tool_output` or `tool_result`). If `.tool_response` is missing or empty, emit a `hookSpecificOutput.additionalContext` advisory; otherwise silent pass.
- **Fail-action**: `Exit 0` always (Q1 is advisory, not blocking). Advisory format: `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[defend-claim Q1 Advisory] ..."}}`
- **Self-test**: `bash ~/.claude/hooks/defend-claim-execution.sh --self-test` → "Q1 self-test: POST-EDIT output capture detection. PASS"
- **Real-fire**: `{"tool_input":{"command":"curl ..."},"tool_response":"<output>"}` → silent. `{"tool_input":{"command":"curl ..."}}` (no `tool_response`) → emits advisory. `{"tool_input":{"command":"ls /tmp"},"tool_response":"..."}` → silent (non-matching command bypasses the check).

---

## Q2 — Cite Physically Exists

*Does each cited artifact PHYSICALLY EXIST and MATCH the claim — verified right now?*

- **Hook**: `defend-claim-cite-integrity.sh` (PostToolUse on Edit|Write) — supports `--self-test`
- **Logic**: Regex extract `path:line` (multi-level paths only); run `timeout 3s sed -n "${line}p" "${path}"` to verify file+line exist; mismatch → `REJECTED: Q2 phantom cite — <reason>` and `Exit 2`.
- **Fail-action**: `Exit 2` (denied) on phantom cite; `Exit 0` on pass
- **Self-test**: `bash ~/.claude/hooks/defend-claim-cite-integrity.sh --self-test` → "Q2 self-test: phantom cite detection. PASS"
- **Real-fire**: `/some/nonexistent/dir/file.py:99` → `REJECTED: Q2 phantom cite — file does not exist: ...` exit 2

---

## Q3 — Structural Report Triple

*Is the success criterion stated as a triple — (action-verb, target-artifact, observed-outcome) — that parses mechanically?*

- **Hook**: `defend-claim-report-triple.sh` (PostToolUse on Write) — supports `--self-test`
- **Logic**: Strip all zero-width and invisible Unicode; detect completion keywords (完成 / done / fixed / passing / 成功 / completed / 已验证 / 已修复); require action-verb evidence (ran/built/tested/grepped/curl/executed/verified/confirmed/passed/exit.code/sha256/HTTP.200/grep.matched); mismatch → `REJECTED: Q3 ...` and `Exit 2`.
- **Fail-action**: `Exit 2` (denied) when completion claim lacks action evidence
- **Self-test**: `bash ~/.claude/hooks/defend-claim-report-triple.sh --self-test` → "Q3 self-test: report triple detection. PASS"
- **Real-fire**: `完成 this works now` → exit 2. `完成 ran pytest tests/ — exit 0` → exit 0.

---

## Q4 — Session Entity Consistency

*Do referenced entities still match current session state — not a stale mental model?*

- **Hook**: `defend-claim-dumb-zone.sh` (PostToolUse on Edit|Write) — supports `--self-test` and `--self-test-reset`
- **Logic**: Increment `~/.claude/hooks/.dc-turn-counter` per Edit/Write; on every 10th, emit named-entity checklist advisory. This is the only stateful hook in v0.5.0 (4 of 5 are stateless).
- **Fail-action**: `Exit 0` (advisory only); framework surfaces the message to agent context
- **Self-test**: `bash ~/.claude/hooks/defend-claim-dumb-zone.sh --self-test-reset && bash ~/.claude/hooks/defend-claim-dumb-zone.sh --self-test` → "Q4 self-test: dumb-zone counter. PASS"

---

## Q5 — Code-Shape Lint

*Did the change introduce empty-catch / silent-null-return that defeats a downstream claim?*

- **Hook**: `defend-claim-silent-fail.sh` (PostToolUse on Edit|Write) — supports `--self-test`
- **Logic**: Regex scan for `except:\s*pass` (Python) / `catch\s*\{\s*\}` (JS/TS) / `=>\s*null\s*;` (silent null return); print `[SYSTEM INJECTION] Require Q1 behavioral probe` when L1 hits.
- **Fail-action**: `Exit 2` (denied) on `except:\s*pass` or `catch\s*\{\s*\}`; `Exit 0` advisory on silent null
- **Self-test**: `bash ~/.claude/hooks/defend-claim-silent-fail.sh --self-test` → "Q5 self-test: silent-failure detection. PASS"
- **Real-fire**: `try:\n    x()\nexcept:\n    pass\n` → exit 2. `def foo():\n    return 1\n` → exit 0.
