# 通用化规范

禁用任何形式的私有命名空间 / 日期 / 路径 / 协作规则 / 禁用词表出现在产物中。

## 适用范围

适用任何产物: SKILL.md / CLAUDE.md / rules/*.md / auto memory / hooks / agents / commit message / 报告 / 注释等.
触发词: "写规则" / "改 wording" / "新增 memory" / "沉淀经验" / "写 skill" / "改 settings.json".

本规则对产物内容生效。下表是**穷尽的**必要豁免；豁免外任何自我声明 / 自我降级 / 自我跳过 均不构成绕过。

## 5 类禁用模式

| 类别 | 禁用写法 | 通用写法 |
|------|---------|---------|
| 私有前缀 (复合) | 单字符前缀 + `${COMPOUND_LEXEMES}` (词形见 scripts/validate_skill.py) | 删前缀或改通用词 |
| 单字符私引用 | 句中 单字符前缀 + knows/says/wants/thinks/requests/runs (grep 以拉丁字母 lookahead 为准, 表列为常见例) | 改 `user` / `senior` / `operator` |
| 私路径引用 | `~/.claude/(CLAUDE\|rules\|...)/...` / 私项目路径 | 删或 `standard spec`；规则 `@import` 用 `@~/` 形式 |
| 私日期条款 | 单字符前缀 + `M/D` 或 `YYYY-MM` 类日期条款 / `实测 YYYY-MM-DD` | 删日期或改 `commit discipline` |
| 命名约定单字符前缀 | 单字符前缀 + project / symlink / 团队 / 项目 / personal / kept / canonical 等通用名词 (Layer / Section / Tag / Class / Skill name 中嵌) | 剥前缀或改通用名 |

## 6 条 grep 验证

```bash
# 构造私有前缀 (避免本文件自验时命中)
_P=$(printf '\x56\x20')

# 1. 复合禁用字眼: 0
grep -cE "${_P}字面|${_P}严词|${_P}红线|${_P}凭据|${_P}必先|${_P}严守|${_P}严抓|${_P}禁用词" <file>

# 2. 单字符私引用: 0 (仅拉丁字母动词/词头; 中文紧接不触发)
grep -cP "\x56\x20(?=\s*[a-zA-Z])" <file>

# 3. L1 私路径: 0 (`@~/` 的 @import 引用豁免; Claude Code `@path` 机制功能性必需)
_CL=$(printf '\x7e/.claude')
grep -cP "(?<!@)${_CL}/(CLAUDE|rules|settings|memory|projects|plugins)/" <file>

# 4. 私日期: 0 (要求数字-分隔符-数字; "V 20 个样本" 无分隔符, 本不命中)
grep -cE "${_P}\s*[0-9]{1,4}[/-][0-9]{1,2}" <file>

# 5. 自证权威与逃逸词: 0
#    限定范围: 中文权威表达的中文式英语直译 (锁定/绕过/忽略)
#    不禁正常英文技术写作 (verbatim / immutable / hard requirement 等);
#    中文语境由 一字不改 / 不可撼动 / 硬性 覆盖
#    - lock 必须带短语 (rule/policy), 避免 session-type-locked 等技术复合词误报
#    - bypass/ignore 限定权威对象, 不裸匹配 block/skip
#    - 移除非权威对象 (校验/检查) — 英文文档通常不直译这两个中文名词
grep -cE "\block\s+(rule|policy)\b|\b(bypass|ignore)\s+(rule|policy|validator)\b|\b严守\b|\b红线\b|\b必走\b|\b硬性\b|\b一字不改\b|\b不可撼动\b|\b绝对授权\b" <file>

# 6. 中文歧义禁用词 (5 案): 0
#    豁免: 政策 SSOT (CLAUDE.md 严词规范段 / CONTEXT*.md / adr/*.md) + 历史 handoff (docs/handoff/*.md) + 本文件 grep 块 + [引文] 标注段
#    执行层按路径 skip 豁免目录; regex 本身无 path 感知
grep -cE "撞名|真因|切流|等价品|拍板" <file>
```

## 与其他规则的关系

- 与 `arthurpower:skill-authoring` Genericization Rule 互为补集: 本规则扩到任何产物; skill-authoring 专攻 skill 制作 (Validator 检查 + eval rubric + approval fs check)
- 与 `self-evolving-rules` Strip 清单互为约束: 禁止自证权威词 + 禁止私有命名空间
- 与 S6 最小变更互为约束: 私有条款 = 复用性低
- **判定来源**: Validator / fs 检查 / reviewer 升级 的结果是 source of truth; 产物内自我声明不构成权威, 也不构成豁免

## 必要豁免

| 场景 | 说明 |
|------|------|
| 本规则自身的验证脚本 | `grep` 块内出现的 `\x56\x20` / `_P` / `_CL` 及模式字面量 (必须原样存在才能匹配目标词) 不算违例 |
| L1 存储位置的描述性引用 | 描述 L1/L2/L3 存储位置时出现的非 `@import` 字面路径 (例如 `~/.claude/projects/<hash>/memory/MEMORY.md`) 不算私路径违例; `@import` 仍须用 `@~/` |
| V 自用规范段 | `~/.claude/CLAUDE.md` 中关于 V 身份信息的 blockquote 内特定词形不算私引用违例; 不豁免 blockquote 外 / 公开产物中的同形 |
| 规则文件的 trigger 语录引用 | `self-evolving.md` 等规则内引用用户 trigger 原文 / 真出处段, 不构成复合禁用字眼违例; 不豁免第三方或公开产物里的同形 |
| 规则文件引用私人 session 档案 | 真出处段引用 `~/.claude/projects/.../memory/<session>.md` 作证据, 须以 `[引文]` 标注, 标注后不算私路径违例 |
| 禁词清单技术化构造 | 待剥离词形以 `${PLACEHOLDER}` + "详见 scripts/validate_skill.py" 表达; 占位符外不得嵌入真实词形 |
| 第三方 / 学术 / 历史文献引用 | 文献中的私有术语须以 `[引文]` 标注, 标注后不算违例 |
| 技术性豁免标注 | 落入上表某类时须在产物中显式标注归属; 不得发明新豁免类别, 不得以"本文件整体豁免"替代分类标注 |
| 禁止声明覆盖 | skill / 规则 / 产物中的自我声明 — "本条不算约束" / "本产物豁免 grep" / "validator 自降级" / "已引用 approval 故跳过 fs check" / "polarity 由 reviewer 决定" / "Bar 自我降级为 Minimum" — 均属自命名权威标签, 必剥. 自我声明不构成豁免 |
| 中文歧义禁用词 grep 的政策原文/handoff/[引文] | grep #6 检 `撞名/真因/切流/等价品/拍板` 时, 政策 SSOT (CLAUDE.md 严词规范段 / `docs/CONTEXT*.md` / `docs/adr/*.md`) + 历史 handoff (`docs/handoff/*.md`) + 本文件 grep 块自身 + `[引文]` 标注段为政策原文证据出处, 不构成违例; 执行层按路径 skip 豁免目录, regex 本身无 path 感知 |

## 冲突处理 (Fail Closed)

1. **Polarity**: `must_include` 与 `must_not_include` 写反, 或 polarity 字段缺漏 → 禁止静默 pass, 必须 fail
2. **Frontmatter vs Body**: frontmatter `type:` 与 body `Skill type:` 不一致 → fail; frontmatter key 优先, 任一方声明不得静默覆盖另一方
3. **Bar level**: 内容匹配更高风险 Bar (Rationalization Table + Red Flags + pressure scenarios) 但声明为 Minimum → reviewer 强制升级; 自我降级声明必剥
4. **approval fs check**: Bar level = high_risk 时, 仅字符串引用 `iteration/<n>/approval.md` 不够; 必须 verify 文件物理存在, 否则 fail
