# Task Templates — 5 个通用任务形状

> 用途: 把"含改代码"的任务形状做成可复用 prompt 模板, 避免每次重新发明 SOP.
> 触发: 用户发起"测试覆盖率 / PR 审查 / 错误处理 / 重构 / 安全审计"任意一项时, 按对应模板生成任务 prompt.
> 通用化: 模板中的 `{owner/repo}` / `{数量}` / `{作者}` / `{base_branch}` 必须在任务开始前替换为实际值.

---

## 0. 所有"需要改代码"任务的通用尾巴

任何 1-5 的任务, 在末尾追加:

```markdown
Git 工作流:
- 从 `{base_branch}` 创建独立分支, 命名为 `{fix|test|refactor}/<短名>`.
- 不直接 commit / push 到主分支.
- 使用小而清晰的 conventional commits.
- 基础验证通过后创建 PR.
- 检查并修复与本次改动相关的 CI / 评审问题.
- 最终报告: 发现 / 修改内容 / 测试结果 / 已知风险 / PR 链接.
- PR 由人类最终审核和合并.
```

最通用的一句话:

```text
在独立分支完成任务, 保持修改聚焦, 补充测试并运行项目质量检查;
不要直接修改主分支, 完成后创建 PR, 等待人类审核合并.
```

---

## 1. 测试覆盖率提升 (test-coverage)

```markdown
分析 `{owner/repo}` 的测试覆盖率, 并为覆盖率最低 / 适合单元测试的模块补充测试.

要求:
- 先运行项目现有的覆盖率命令, 记录修改前数据.
- 优先选择覆盖率最低且非纯交互式的 `{数量}` 个模块.
- 重点覆盖错误分支 / 边界条件 / 未初始化状态, 不写只为刷数字的测试.
- 原则上只修改测试; 如必须修改生产代码, 先说明原因.
- 运行相关测试 / race test / lint / typecheck / build.
- 汇报每个模块修改前后的覆盖率.
- 通用 Git 工作流尾巴见 §0.
```

### 适用场景

- eval 报告覆盖率 < 阈值
- 新增模块无对应测试
- S2 防御契约未覆盖的边界

---

## 2. 最近 PR / Commit 代码审查 (pr-review)

```markdown
审查 `{owner/repo}` 中由 `{作者}` 创建的最近 `{数量}` 个 PR.

要求:
- 只审查该作者的 PR, 不审查其他贡献者的 PR.
- 阅读完整 diff / 相关上下文 / 测试 / 评审评论.
- 检查 bug / 边界情况 / 并发 / 安全 / 错误处理 / 兼容性 / 可维护性.
- 按严重程度列出问题, 提供文件 / 代码位置 / 原因 / 修改建议.
- 如果没有 PR, 则审查该作者最近 `{数量}` 个 commit.
- 本任务只输出审查报告, 不自动修改代码; 如需修复, 等确认后再创建分支和 PR.
```

### 适用场景

- 同事提交 PR 后要求评审
- 外部贡献者 merge 前审查
- 团队代码质量抽检

---

## 3. 错误处理审查与修复 (error-handling-fix)

```markdown
审查 `{owner/repo}` 的错误处理, 修复错误被静默吞掉 / 未正确返回 / 未记录 / 资源清理失败的问题.

重点检查:
- 被忽略的 error / 异常 / Promise rejection.
- 文件写入 / flush / close / 网络请求 / 子进程错误.
- defer / finally / context cancel / 资源释放.
- 失败后仍继续执行导致的数据损坏或状态不一致.
- 重复报错 / 敏感信息泄露 / 缺少上下文的错误信息.

要求:
- 优先修复可能导致数据丢失 / 错误成功状态 / 安全问题的路径.
- 保持现有错误处理风格, 避免无关重构.
- 为每个修复增加失败场景测试.
- 通用 Git 工作流尾巴见 §0.
```

### 适用场景

- S3 显式错误处理规范违反
- 生产事故复盘
- 错误监控告警后根因定位

---

## 4. 重复代码重构 (refactor-dedup)

```markdown
查找 `{owner/repo}` 中重复或高度相似的代码, 并将确认重复的逻辑重构为共享工具.

要求:
- 先列出重复位置 / 调用关系 / 适合的共享归属模块.
- 只合并语义真正一致的逻辑, 不强行抽象偶然相似代码.
- 保持外部接口和运行行为不变.
- 避免循环依赖 / 错误的包层级 / 过度通用化.
- 将原有测试迁移或补充到共享实现, 并验证所有调用方.
- 运行相关测试 / lint / typecheck / build.
- 通用 Git 工作流尾巴见 §0.
```

### 适用场景

- jscpd 报告克隆率 > 3%
- 同一处业务规则在 N 个文件复制
- 抽象意图明显但未抽出

---

## 5. 安全审计与关键修复 (security-audit)

```markdown
对 `{owner/repo}` 进行安全审计, 检查以下问题:
- 硬编码 API Key / 密码 / Token / 其他凭据.
- SQL / 命令 / 路径 / 模板注入.
- 未验证的用户输入和路径穿越.
- 不安全或存在已知漏洞的依赖.
- 过度宽松的 CORS / Host / 网络监听配置.
- 暴露的 debug / pprof / 管理 / 内部端点.
- 缺少认证 / 授权 / 访问控制.
- 敏感数据被记录 / 缓存 / 返回给客户端.

要求:
- 排除 `{测试夹具或故意漏洞目录}`, 不要把演示数据当成生产漏洞.
- 不输出真实密钥内容, 只报告文件位置和类型.
- 按 Critical / High / Medium / Low 分类, 说明攻击条件和影响.
- 只修复确认的 Critical / High 问题, 避免无关重构.
- 为安全修复增加回归测试, 运行 secret / SAST / 依赖扫描 / lint / build.
- 输出完整审计报告, 记录已修复 / 未修复 / 未发现问题的类别.
- 通用 Git 工作流尾巴见 §0.
```

### 适用场景

- 上线前安全 gate
- 第三方依赖 CVE 通报后
- 满足合规审计要求

---

## 6. context-闭环升级任务 (context-loop-upgrade)

**触发**: 升级 context-闭环 hook / rule / skill 时 (如新增 advisory hook / 改 SSOT 优先级 / 加 ADR 冲突检测).

**强制动作**: 走 `boundary-testing` skill 的 6 步流程, 不跳 driver-level smoke.

**任务步骤**: 走 `@.claude/rules/boundary-testing-protocol.md` 的 6 步流程 (成功标准 → 样例 → 子代理 smoke → 主 agent driver smoke → A/B gate → 变更记录). 不跳 driver-level smoke.

**关键约束**:
- hook 文件零依赖 Node CJS (只用 `node:fs` / `node:path` / `node:os`)
- Windows 路径兼容 (`[/\\]` 正则, 不写死 `/`)
- fail-open (任何错误 `exit 0` + `daemon.log`, 不阻断用户)
- state 文件原子写入 (temp + `renameSync`, 处理 Windows EEXIST)
- 不修改 settings.json secret 字段 (byte-level `rb + regex + wb`)

**完成性声明规则** (boundary-testing-protocol §经验启示):
- 完成与否由用户判断, 不由主 agent 自评
- 禁止包装未完成为"成功"
- 逐项列举未完成 / 未触达项 (含 deferred / infra-gap / 未做修复的 bug)

---

## 7. 与现有规则的关系

| 现有规则 | 关系 |
|---|---|
| `.claude/rules/git.md` | §0 通用尾巴已纳入 (独立分支 / PR / 等待审核), 不重复 |
| `.claude/rules/code-quality.md` | 模板 1/3/4 共用 §测试规范 + §最小变更原则 |
| `.claude/rules/security-boundaries.md` | 模板 5 是其工程化版本, 不冲突 |
| `.claude/rules/memory.md` | 模板任务结束后走 task-end ritual (Q1/Q2/Q3) |
| `.claude/rules/workflow.md` | 任务开始前走 §规则 A 技能检查 |

---

## 8. 使用方式

1. 识别任务形状 → 选对应模板编号 (1-6, 含 §6 context-闭环升级).
2. 把 `{占位符}` 替换为实际值.
3. 模板 0 的 Git 工作流尾巴必须追加.
4. 任务期间遵守 `code-quality.md` + `git.md` 的所有不变量.
5. 任务结束走 `memory.md` §3 层记忆 + task-end ritual.