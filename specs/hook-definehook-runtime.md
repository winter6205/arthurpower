# Spec: hook `defineHook` runtime (zod-backed, TypeScript)

> SPECIFY-phase output of `spec-driven-development` for issue #47 (hook 体系迁移 TypeScript).
> Downstream: `architecture-change-reviewer` (5-verdict gate) → `writing-plans` (tracer bullets).

## Glossary (exact copy from `docs/CONTEXT.md`)

- **hook lib dep as silent enabler**: hook 内部 `require('./lib/<dep>.cjs')` 而 `<dep>` 不存在时，顶层 try/catch fail-open 吞 crash，子代理 + driver 都只看 exit 0；识别靠 fault-injection（删 lib 重跑）。
- **machine-assertable**: 成功标准 / 边界指标必须能被程序直接检查 (exit code / rate / grep count / sha256)，不能是"看起来对"。
- **linter-as-LLM**: 用散文让模型记住格式，而不是用 hook 做确定性门禁之外的语义判断（never send an LLM to do a linter's job）。
- **expand-contract 例外**: tracer bullet 主轴的唯一例外，处理 blast radius 跨整个仓库的 mechanical refactor。序列 = expand（新形式并列旧形式，不断绿）→ migrate（按 batch 拆多个 tracer bullet）→ contract（旧形式 0 caller 后删）。
- **有状态化技能**: 同一输入在不同 session 跑出不同输出，因为依赖持久化状态（文件 / mtime / session_id / git state）；典型例子：hook 读 `.claude/*.local.md`。

## Architectural Constraints (ADRs in scope)

- **ADR-0015** (proposed): zod 是 hook 体系唯一运行时依赖，只用在 `defineHook` 单点咽喉；`safeParse` = fail-open。本 spec 的 runtime 即该 ADR 的落地点。
- **ADR-0009** (accepted): `settings.json` 不被 git 跟踪；hook `.cjs→.ts` 调用路径改动是 per-machine 外科式编辑，绝不提交。`node_modules` 排除沿用同一「machine state never enters git」规则。
- **ADR-0007** (accepted): ACR 只产改前 5-line verdict；迁移分解为 tracer bullets 归 `writing-plans`，不在本 spec。

## 1. Objective

构建一个共享的 `defineHook` runtime，把 35 个 hook（全局 25 + 项目 12）当前各自手写的「读 stdin + JSON.parse + 字段防御 + fail/block 出口」收敛到**一个** zod-backed 入口。

- **用户**：arthurpower hook 作者（V + 未来维护者）。
- **成功**：每个 hook 只声明「我关心哪些输入字段 + 我的业务逻辑」，输入解析 / 校验 / 出口 / fail-open 全部由 runtime 统一负责；行为不变迁移。
- **为什么**：explorer 审计发现 7 份手写 stdin/parse 实现（3 份 `for await` 克隆会卡死 EOF）+ ~150-180 行重复字段梯子 + block 出口三种漂移。痛点是**重复**，runtime 是那个单点。

## 2. Tech Stack

| 项 | 选择 | 依据 |
|---|---|---|
| 语言 | TypeScript strict，Node 24 原生 type-stripping（`node x.ts` 直跑，无构建步骤） | #47 实测 |
| 运行时依赖 | zod v4（pinned，唯一） | ADR-0015 |
| 模块系统 | 迁移期 `type: commonjs` + `module: nodenext` | #47（兼容现有 require，全迁完再统一 ESM） |
| 语法限制 | `erasableSyntaxOnly: true`（禁 enum/namespace/参数属性） | #47（保证 Node 原生能跑） |
| 类型门禁 | `tsc --noEmit`（单独门禁，type-stripping 不做类型检查） | #47 |
| 测试框架 | vitest（devDep） | #47 |
| dev 工具链 | typescript / tsx / vitest / @types/node | #47 |

Tech stack 变更需重走 assumption gate。

## 3. Commands

```
Build:    （无构建步骤 — Node 24 type-stripping 直跑 .ts）
Typecheck: npx tsc --noEmit
Test:      npx vitest run
Test-watch: npx vitest
Install-dev: npm install -D typescript tsx vitest @types/node   # S7 放行（WARN）
Install-zod: ARTHUR_PIP_ALLOW=1 npm install zod                 # operator 动作；ADR-0015 是 audit
```

## 4. Project Structure

```
~/.claude/hooks/
  runtime/
    defineHook.ts        # 唯一入口：读 stdin + safeParse + 出口 + fail-open
    schema.ts            # hook 输入信封 zod schema + z.infer 类型
    exit.ts              # block / deny / advisory / drift 出口助手（统一 stderr）
  lib/                   # 现有零依赖工具（ipc-core 等）— 不动
  <hook>.ts              # 迁移后的 hook，import { defineHook } from './runtime/defineHook'
  tests/
    runtime.test.ts      # runtime 单测（含 fault-injection）
    <hook>.test.ts       # 每 hook 特征测试（固化现有行为）
```

- runtime 是新增目录；现有 `lib/` 零依赖工具保持不变。
- 测试走 `tests/`（符合全局目录规范）。

## 5. Code Style

一个真实片段胜过三段描述。迁移后的 hook 形状：

```ts
import { defineHook } from './runtime/defineHook';
import { toolInput } from './runtime/schema';
import { z } from 'zod';

// 只声明「我关心什么」+「我的业务逻辑」
export default defineHook({
  // 只校验本 hook 用到的 tool_input 子集；信封层 passthrough
  schema: z.object({ file_path: z.string(), content: z.string().optional() }),
  failOpen: true, // 默认；解析/校验失败 → exit 0 放行。failOpen: false → exit 2（fail-closed，opt-in）
  handler: async ({ tool_name, tool_input }) => {
    if (tool_name !== 'Write') return { kind: 'allow' };
    if (violatesPolicy(tool_input.file_path)) {
      return { kind: 'block', message: 'BLOCKED: <reason>' };
    }
    return { kind: 'advisory', message: 'Advisory: <note>' };
  },
});
```

- 命名：runtime 导出 camelCase（`defineHook` / `toolInput`）；hook 文件名沿用现有 kebab-case。
- 注释只解释 why / 约束 / 边界（项目 Coding Principles）。
- 现有 hook 头部的 "zero-dep" 注释，迁移时改为 "zod-only runtime"。

## 6. Testing Strategy

| 层 | 框架 | 位置 | 关注 |
|---|---|---|---|
| runtime 单测 | vitest | `tests/runtime.test.ts` | safeParse 成功/失败路径、出口形状、fail-open/fail-closed |
| **fault-injection** | vitest | `tests/runtime.test.ts` | **删 zod / 删 runtime 重跑 → 验证不静默 exit 0**（CONTEXT: hook lib dep as silent enabler） |
| 特征测试 | vitest | `tests/<hook>.test.ts` | 固化每 hook 现有行为（行为不变迁移的基线） |
| 边界类 | vitest | 各测试 | 空 / 负 / 溢出 / 并发 / 异常 5 类（S2 defensive-contract） |

- 覆盖率目标：runtime ≥ 80% line / ≥ 70% branch（S2 规则）。
- 特征测试是**行为捕获**，不是覆盖率驱动——先固化再迁移。
- 所有断言 machine-assertable（exit code / stderr 内容 grep / 延迟阈值）。

## 7. Boundaries

- **Always do**: 迁移前先建特征测试基线；每迁一个 hook 跑特征测试绿了再下一个；所有 block/advisory 走 stderr；`tsc --noEmit` 过 strict。
- **Ask first**: 新增任何运行时依赖（zod 之外）；改 fail-open 默认语义；改出口 JSON 形状；改 `settings.json` 调用路径（per-machine 外科式，不提交）。
- **Never do**: 在 runtime 里加语义判断（linter-as-LLM）；把 zod 用在 `defineHook` 咽喉之外；提交 `settings.json` / `node_modules`（ADR-0009）；删/弱化特征测试来让迁移过；把 fail-open 的 exit 0 当 PASS 信号（必须配 fault-injection）。

## 8. Success Criteria (binary, machine-assertable)

| # | 标准 | 检查方式 |
|---|---|---|
| SC1 | 所有全局 hook 为 `.ts`，`settings.json` 无 `.cjs` 残留引用 | `grep -c '\.cjs' settings.json` == 0 |
| SC2 | `tsc --noEmit` 通过（strict） | exit code 0 |
| SC3 | vitest 特征测试全绿（行为不变） | `npx vitest run` exit 0 |
| SC4 | 每 hook 执行 p95 < 500ms（timeout: 5 = 5000ms 的 10× 余量），迁移前后实测对比 | 计时脚本，p95 阈值断言 |
| SC5 | runtime ≥ 80% line / ≥ 70% branch 覆盖 | `vitest --coverage` 阈值断言 |
| SC6 | fault-injection：删 zod / 删 runtime 重跑，hook 不静默 exit 0（显式 noise 或受控失败） | fault-injection 测试 exit 断言 |
| SC7 | 所有 block/advisory 输出走 stderr（无 stdout block 残留） | `grep` hook 源码无 `console.log(JSON.stringify({systemMessage` block 路径 |
| SC8 | 信封 schema passthrough：注入未知 key，hook 照常工作（不 fail-open） | 单测断言 |
| SC9 | `lifecycle/` 无 `.cjs`/`.ts` 双份 | 目录检查 |

## 9. Open Questions

- **OQ1**: `defineHook` 是否需要支持 `tools` 白名单字段（#47 Phase 1 提到 `defineHook({ schema, tools, failOpen, handler })`）？当前假设 matcher 仍在 `hooks.json`，runtime 不做 tool 过滤——待确认。
- **OQ2**: `logFatal` + `daemon.log` 写手（~200 行散布 17 hook）是否收进 runtime 统一？本 spec 倾向收进 `exit.ts`，但需确认日志路径 / 格式契约。
- **OQ3**: 项目 hooks（12 个）采用同一 runtime 的时机——本 spec 验收只在全局，项目批次归后续 plan。

## ACR 5-verdict gate

2026-07-22，5 个 discipline reviewer 并行评审本 spec 设计（改前门禁，ADR-0007）。verdict SSOT = `plans/<feature>.md`，此处随 spec 携带，writing-plans 落 plan 时复制。

```
bounded-context-guardian:     yes  — runtime/ 三文件单一职责，public 面只有 defineHook，§7 禁跨层泄漏
defensive-contract-validator: yes  — §6 覆盖 5 边界类 + ≥80%/≥70% 覆盖 + fault-injection + fail-open 测试
error-handling-enforcer:      yes  — §7+SC6 fail-open 配 fault-injection/stderr noise；typed kind 判别；fail-closed 已显式
complexity-anti-drift:        yes  — 三文件单一职责，API { schema, failOpen, handler } 3 参数，校验委托 zod
minimal-change-verifier:      yes  — 唯一运行时依赖 zod（ADR-0015），per-hook 迁移拆 tracer bullet，行为不变基线
```

S3 建议（已采纳）：§5 显式 `failOpen: false → exit 2`（fail-closed opt-in）。

## Handoff

→ `architecture-change-reviewer`（5-verdict gate）→ `writing-plans`（tracer bullets，per-hook 迁移按 expand-contract 拆批）。
