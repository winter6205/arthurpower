# 归档的 .cjs hooks

这些 `.cjs` hook 已被同名 `.ts` 版本替代（2026-07-22 迁移）。

迁移原因：
- 统一使用 `defineHook` runtime（类型安全、结构化输出）
- 与 L3 全局 hooks（`<workspace>/data/hooks/`）保持一致
- 支持 `node --experimental-strip-types` 直接运行

保留的 `.cjs`（未迁移）：
- `pre-release-validate.cjs` — L1 独有，L3 无对应版本
- `pre-tool-skill-routing-sync.cjs` — L1 独有，L3 无对应版本

如需回滚，将 `.cjs` 移回 `hooks/` 并更新 `hooks.json` 命令即可。
