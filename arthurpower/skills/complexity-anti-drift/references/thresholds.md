# S5 抗劣化简洁 - 详细规范

## 阈值 (任一超阈 = FAIL)

| 指标 | 阈值 | 工具 |
|------|------|------|
| 圈复杂度 | <= 10/函数 | ESLint complexity |
| 嵌套深度 | <= 4 | ESLint max-depth |
| 参数数量 | <= 3 | ESLint max-params |
| 函数行数 | <= 30 | ESLint max-lines-per-function |
| 文件行数 | <= 300 | ESLint max-lines |
| 代码克隆率 | <= 3% | jscpd CI gate |

## 出处

《Clean Code》Ch.3 Functions | Robert C. Martin 2000 SOLID | Fowler 《Refactoring》2nd ed. Ch.3

## AI 易违反痛点

LLM 单文件补全倾向把多职责塞进同一函数 (一次生成一个完整 use case handler); 复制粘贴相近代码而非抽象。
