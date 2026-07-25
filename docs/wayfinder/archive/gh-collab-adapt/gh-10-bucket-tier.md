# Ticket gh-10: Bucket/promotion tier + link-skills.sh

## Status

**状态**: OPEN
**类型**: task（HITL or AFK）
**Map**: [baseline-github-collab-adapt](../baseline-github-collab-adapt.md)
**Blocked by**: gh-08

## Question

如何把 upstream 的 6 桶 promotion 纪律（engineering/productivity promoted；misc/personal/in-progress/deprecated 不发布）落到 Arthurpower 的 flat `skills/` 目录？

## Implementation notes

**改动范围**（synthesizer 推荐 #7）:

1. **frontmatter 加 `bucket:`** — 每个 `arthurpower/skills/*/SKILL.md` 加 `bucket: <promoted|deprecated|in-progress>`（或等价分类）
   - 29 个现有 skill 需分类——大部分 promoted，少数可能 deprecated/in-progress（待 grilling 确认分类）

2. **`scripts/link-skills.sh`** — 新建（wholesale port from upstream）:
   - find 所有 promoted SKILL.md（排除 deprecated/in-progress）
   - 软链到 `~/.claude/skills/arthurpower/` + `~/.agents/skills/arthurpower/`
   - 拒绝 dest 已是 repo 软链的情况
   - Windows 兼容（Arthurpower 在 win32——需确认 symlink 策略，可能用 junction 或 copy）

3. **top-level README 镜像** — `README.md` Reference 段镜像 bucket 结构（promoted/deprecated 分组）

4. **CLAUDE.md / AGENTS.md 桶纪律段** — 文档化 promotion 规则

**关键模糊点**（gh-07 grilling 应处理）:
- Arthurpower 的 29 个 skill 如何分桶？upstream 的 engineering/productivity 二分在 Arthurpower 语境下是否适用？
- Windows symlink 策略——upstream 的 link-skills.sh 是 POSIX，Arthurpower 主开发环境是 win32
- 是否影响 plugin 发布边界（marketplace.json 的 skills 数组）？

**参考源**: `the upstream skills repo/AGENTS.md` line 1-25 + `scripts/link-skills.sh`

**验证**:
- 跑 link-skills.sh → 只链 promoted skill
- deprecated skill 不出现在 README / plugin.json

## Resolution

待实施后填写。

## Related

- [gh-08 改造次序决策](gh-08-sequencing.md)
- [gh-03 upstream repo-level 工程纪律](gh-03-baseline-repo-conventions.md) — bucket 纪律来源
- [gh-17 docs-page writing reference](gh-17-docs-page-writing-ref.md) — promoted skill 的 docs 页
