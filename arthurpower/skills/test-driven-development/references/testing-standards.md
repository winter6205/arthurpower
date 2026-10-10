# 测试规范

## 强制

- 任何行为变更必考虑 + 包含相应测试
- 新增功能必有对应测试
- Bug fix 必带回归测试

## 路径

- 单元测试 → `tests/unit/` (或 `__tests__/unit/`)
- 集成测试 → `tests/integration/`
- E2E 测试 → `tests/e2e/`
- 文件名禁 phase / version / date 标签

## 跨引

- Write-time RED → GREEN discipline → [`../SKILL.md`](../SKILL.md)
- Review test evidence against applicable spec acceptance points → [`../../code-review/references/spec-as-test.md`](../../code-review/references/spec-as-test.md)
- Code-review Spec axis → [`../../code-review/references/protocol.md`](../../code-review/references/protocol.md)
