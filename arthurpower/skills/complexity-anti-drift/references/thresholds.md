# S5 抗劣化简洁 - 详细规范

## 阈值 (Hard gates 任一违规 = FAIL / Soft 任一违规 = REVIEW)

S5 阈值分两档：Hard gates（任一违规 = FAIL）与 Soft review-triggers（任一违规 = REVIEW，非 FAIL）。

### Hard gates（任一违规 = FAIL）

| 指标 | 阈值 | 工具 |
|------|------|------|
| 圈复杂度 | <= 10/函数 | ESLint complexity |
| 嵌套深度 | <= 4 | ESLint max-depth |
| 代码克隆率 | <= 3% | jscpd CI gate |

### Soft review-triggers（任一违规 = REVIEW，非 FAIL）

| 指标 | 阈值 | 工具 |
|------|------|------|
| 参数数量 | <= 4 | ESLint max-params |
| 函数行数 | <= 40 | ESLint max-lines-per-function |
| 文件行数 | <= 500 | ESLint max-lines |

## 出处

《Clean Code》Ch.3 Functions | Robert C. Martin 2000 SOLID | Fowler 《Refactoring》2nd ed. Ch.3

## AI 易违反痛点

LLM 单文件补全倾向把多职责塞进同一函数 (一次生成一个完整 use case handler); 复制粘贴相近代码而非抽象。
