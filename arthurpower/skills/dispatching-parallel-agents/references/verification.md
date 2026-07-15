# Verification (runnable)

```bash
# 1. 没有文件被 2+ subagent 改
git diff --stat  # 每文件应该只出现 1 次 (除非 user 明确接受 merge conflict)

# 2. Commit 历史按依赖序, 不是派单序
git log --oneline  # 不应该看到 "dispatched 3 subagents in 1 commit"

# 3. 每个 subagent 的 deliverable 文件存在且匹配 scope
ls -la <each subagent's claimed output path>

# 4. 报告含 assertion
echo "成功 = N subagents dispatched, N results synthesized, 0 conflicts"
```

**人工 cross-check** (必跑, 不是可选):

| 检查项 | 命令 | 期望 |
|--------|------|------|
| Scope creep | `git diff --stat <subagent_dir>` | 只列出 SCOPE 内文件 |
| File conflict | `git diff --name-only | sort | uniq -d` | 无重复 (除非 user 接受) |
| Commit 原子性 | `git log -1 --format=%s` | 含 1 个 Conventional Commit 前缀 |
| Test 真的跑过 | 看 deliverable 里的 test command + exit code, **不是** "tests pass" |
