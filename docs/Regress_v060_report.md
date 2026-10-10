# 回归测试报告: arthurpower v0.6.0 升级 (2026-07-15)

> 范围: 5 hook stdin fix + 2 agents + 2 commands 新增 + plugin.json v0.5.0 → v0.6.0 + installed_plugins.json 同步
> 方法: driver-level 复现 (Python subprocess + manual poll) + framework 视角 (`claude plugin list`/`details`) + R5 byte-level sha256 baseline 对比 + node `--check` + JSON valid
> 备份基线: `.archive/2026-07-15-arthurpower-v0.6.0-reorg/` (含整 plugin 副本 + 5 hook 副本 + installed_plugins.json before)

---

## 1. 修复证据: 5 hook stdin-hang

### 修复前 (driver-level, real open-stdin 条件, manual poll)

| Hook | matcher | 实测 |
|------|---------|------|
| defend-claim-execution | Bash | HUNG 3.0s |
| defend-claim-cite-integrity | Edit | HUNG 3.0s |
| defend-claim-dumb-zone | Edit/Write | HUNG 3.0s |
| defend-claim-report-triple | Write | HUNG 3.0s |
| defend-claim-silent-fail | Write | HUNG 3.0s |

**复现脚本**: `run_defend_hook_stdin_check.py` (含触发 readStdin 的 payload 变体 `/tmp/test_real_hang2.py`).
**对照**: 备份里的原始 hook (`archive/.../hooks-stdin-fix/cache/defend-claim-execution.cjs`) 仍 HUNG 3.0s — 证明修复非平凡.

### 修复后

| Hook | elapsed | exit | 验证方式 |
|------|---------|------|---------|
| defend-claim-execution | 1.17s | 0 | test_real_hang2.py + driver + self-test + node --check |
| defend-claim-cite-integrity | 1.11s | 0 | 同上 |
| defend-claim-dumb-zone | 1.16s | 0 | 同上 |
| defend-claim-report-triple | 1.11s | 0 | 同上 |
| defend-claim-silent-fail | 1.11s | 0 | 同上 |
| **5/5 PASS** | 均在 1.1s grace 内 | exit 0 | — |

**根因** (与 `STDIN_HANG_FIX_REPORT.md` 同源):
- 旧 `for await (const c of process.stdin) buf += c` 永远等 'end' 事件
- Claude Code hook runner 写 stdin 后不总调 `stdin.end()`, 子进程挂起到框架 timeout
- timeout 后 stderr 空 → "No stderr output" → tool 失败 (跟 fail-open 设计矛盾)

**修复**: 委托到 `hooks/lib/read-stdin-with-timeout.cjs` (1s grace sliding window, 与 user-level 12 hook 修复同源 1914 字节).

---

## 2. 回归 (framework 视角)

### 2.1 `claude plugin list` (framework 加载状态)

```
arthurpower@arthurpower-local
  Version: 0.6.0
  Status: ✔ enabled      (v0.5.0 → v0.6.0 保持 enabled, 无 error)
```

其它 2 plugin 不受影响: `commit-commands@claude-plugins-official` + `plugin-dev@claude-plugins-official` 仍 enabled.

### 2.2 `claude plugin details arthurpower`

```
Skills (28)  = 26 原 skill + audit + fanout  (commands 计入 skill registry 是 framework 默认行为)
Agents (2)   arthurpower-audit-agent, arthurpower-dispatcher
Hooks (2)    SessionStart, PostToolUse   (5 defend-claim hook + session-start.sh 全在)
MCP servers (0)
LSP servers (0)
```

### 2.3 10 项回归清单

| # | 验证项 | 结果 | 证据 |
|---|--------|------|------|
| 1 | installed_plugins.json JSON valid + arthurpower installPath 0.6.0 | PASS | `e7490ad6 → 9353e4cc` |
| 2 | 两处 plugin.json JSON valid + version 0.6.0 + description 反映 stdin fix | PASS | `9976aae7 → f4ed369f` |
| 3 | settings.json sha256 = baseline `e5dd95df...` (R5 必查) | PASS | 未动 |
| 4 | `claude plugin list` 显示 v0.6.0 ✔ enabled | PASS | framework 视角 |
| 5 | 5 hook driver-level (real open-stdin) 5/5 ~1.1s | PASS | test_real_hang2.py |
| 6 | 3 hook `--self-test` mode 全 PASS | PASS | Q1/Q3/Q4 self-test |
| 7 | `node --check` 5 hook × 2 副本 = 10 文件 | PASS | syntax 全过 |
| 8 | agent/command YAML frontmatter 合规 | PASS | agents 需 name+description; commands 只需 description |
| 9 | 26 原 skill 仍可被发现 (skills/ 目录扫描) | PASS | `ls skills/ = 26` |
| 10 | 两处副本完全一致 (hooks/agents/commands/plugin.json/CHANGELOG) | PASS | `diff -r` 一致 |

**总: 10/10 PASS**

---

## 3. 完整改动清单 (与备份对比)

### 新增 (3 类, 7 文件)

| 文件 | 大小 | 用途 |
|------|------|------|
| `hooks/lib/read-stdin-with-timeout.cjs` × 2 副本 | 1914 B | 共享 stdin 1s grace-timeout reader |
| `agents/arthurpower-audit-agent.md` × 2 副本 | 3290 B | 独立 audit agent (S1-S6 + verification gate) |
| `agents/arthurpower-dispatcher.md` × 2 副本 | 2522 B | 独立 dispatcher agent (parallel fan-out) |
| `commands/audit.md` × 2 副本 | 1664 B | `/audit` slash command |
| `commands/fanout.md` × 2 副本 | 1497 B | `/fanout` slash command |
| `run_defend_hook_stdin_check.py` (local project) | ~3.5 KB | driver-level 复现脚本 |
| `fix_installpath.py` (local project) | ~0.7 KB | R5 byte-level fix 脚本 |
| `docs/Regress_v060_report.md` (local project) | (本文件) | 回归报告 |

### 修改 (5 类, 16 文件)

| 文件 | 改动 | sha256 (before → after) |
|------|------|-------------------------|
| `hooks/defend-claim-execution.cjs` × 2 | for-await → require lib | `414a2cde → 0db5bdd4` |
| `hooks/defend-claim-cite-integrity.cjs` × 2 | 同上 | `eb8febbb → f9d5dd40` |
| `hooks/defend-claim-dumb-zone.cjs` × 2 | 同上 | `72085cf7 → 97487958` |
| `hooks/defend-claim-report-triple.cjs` × 2 | 同上 | `e2105da9 → 7ebb3a18` |
| `hooks/defend-claim-silent-fail.cjs` × 2 | 同上 | `9d12885e → b097b07d` |
| `.claude-plugin/plugin.json` × 2 | version + description | `9976aae7 → f4ed369f` |
| `~/.claude/plugins/installed_plugins.json` | installPath + version 0.5.0 → 0.6.0 | `e7490ad6 → 9353e4cc` |
| `CHANGELOG.md` × 2 | 新增 v0.6.0 段 (头部) | (新增 ~6 KB) |
| `cache/.../0.5.0/` → `cache/.../0.6.0/` | 目录重命名 | — |

### 未动 (out of scope)

- `~/.claude/settings.json` (sha256 `e5dd95df...` baseline 保持)
- 26 skill frontmatter (dmi 字段, 分类提案待 V 拍板)
- 其它 2 plugin (commit-commands, plugin-dev)
- 已有 28 user-level hook (`~/.claude/hooks/`, 之前已修)

---

## 4. R5 完整性

| 必查项 | 状态 |
|--------|------|
| 改前 byte-level sha256 baseline | ✓ (`.archive/2026-07-15-arthurpower-v0.6.0-reorg/installed_plugins.json.sha256` + `plugin.json.{marketplaces,cache}.sha256`) |
| 改后 sha256 与预期一致 | ✓ (5 hook + plugin.json × 2 + installed_plugins.json) |
| 两处副本完全一致 (marketplaces vs cache) | ✓ (`diff -r` 5 目录全等) |
| settings.json 未动 | ✓ (`e5dd95df...` baseline 保持) |
| 备份保留 (按 R5 不删) | ✓ (`marketplaces-snapshot` + `cache-snapshot` + `cache-0.5.0-snapshot` + 3 份 .bak json) |

---

## 5. 完整回滚路径 (若需回退 v0.6.0 → v0.5.0)

```bash
# 1. 重命名 cache 目录 0.6.0 → 0.5.0
mv ~/.claude/plugins/cache/arthurpower-local/arthurpower/0.6.0 \
   ~/.claude/plugins/cache/arthurpower-local/arthurpower/0.5.0

# 2. 恢复 installed_plugins.json (byte-level)
python3 -c "
import re
p = r'C:\Users\<user>\.claude\plugins\installed_plugins.json'
with open(p,'rb') as f: d=f.read()
d = d.replace(b'arthurpower\\\\0.6.0', b'arthurpower\\\\0.5.0', 1)
d = d.replace(b'\"version\": \"0.6.0\"', b'\"version\": \"0.5.0\"', 1)
with open(p,'wb') as f: f.write(d)
print('installed_plugins.json rolled back')
"

# 3. 恢复两处 plugin.json (从 .archive)
ARCHIVE=~/.claude/plugins/.archive/2026-07-15-arthurpower-v0.6.0-reorg
cp "$ARCHIVE/arthurpower-marketplaces-snapshot/.claude-plugin/plugin.json" \
   ~/.claude/plugins/marketplaces/arthurpower-local/plugins/arthurpower/.claude-plugin/plugin.json
cp "$ARCHIVE/arthurpower-cache-snapshot/.claude-plugin/plugin.json" \
   ~/.claude/plugins/cache/arthurpower-local/arthurpower/0.5.0/.claude-plugin/plugin.json

# 4. 恢复 5 hook (从 .archive/hooks-stdin-fix)
ARCHIVE_HOOKS=$ARCHIVE/hooks-stdin-fix
for h in defend-claim-execution defend-claim-cite-integrity defend-claim-dumb-zone \
         defend-claim-report-triple defend-claim-silent-fail; do
  cp "$ARCHIVE_HOOKS/marketplaces/${h}.cjs" \
     ~/.claude/plugins/marketplaces/arthurpower-local/plugins/arthurpower/hooks/${h}.cjs
  cp "$ARCHIVE_HOOKS/cache/${h}.cjs" \
     ~/.claude/plugins/cache/arthurpower-local/arthurpower/0.5.0/hooks/${h}.cjs
done

# 5. 删新增的 hooks/lib/, agents/, commands/ (v0.5.0 没有)
rm -rf ~/.claude/plugins/.../hooks/lib
rm -rf ~/.claude/plugins/.../agents
rm -rf ~/.claude/plugins/.../commands

# 6. /reload-plugins 验证
# 7. claude plugin list 确认 v0.5.0 enabled
```

**完成性**: 此回滚路径**未测试** (回滚破坏本次升级目的, 除非 V 字面要求). 若需执行, 建议先在 .archive/ 整 plugin 副本上 dry-run.

---

## 6. 后续待 V 拍板 (本次未做, 提案已落盘)

1. **Skill 分类调整** (25 model-invoked → 11 user-invoked + 15 model-invoked)
2. **domain-modeling 加载方式** (user-invoked 配合 SSOT 写主权, vs model-invoked 模式)
3. **是否补全更多 agent/command** (本 cycle 补 2+2 最小集, V 决定是否扩到完整 6-family 体系)

---

## 7. 验证证据收集点

| 验证 | 命令/位置 |
|------|----------|
| hook driver 复现 | `python run_defend_hook_stdin_check.py <hook>` |
| 真实 open-stdin 测试 | `python /tmp/test_real_hang2.py <hook>` |
| plugin 加载状态 | `claude plugin list` |
| plugin 详情 | `claude plugin details arthurpower` |
| reload | `/reload-plugins` (TUI) |
| byte-level baseline | `.archive/2026-07-15-arthurpower-v0.6.0-reorg/*.sha256` |
| plugin changelog | `marketplaces/.../arthurpower/CHANGELOG.md` 头部 v0.6.0 段 |
| skills 列表 | `claude plugin details arthurpower` Skills (28) |
