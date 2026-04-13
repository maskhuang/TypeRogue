# data/ ↔ data-json/ 同步规则

Story 57.1 建立的规范。Godot 迁移期间两端共享事实来源。

## 目录分工

| 目录 | 角色 | 谁可以改 |
|------|------|---------|
| `src/src/data/*.ts` | 运行时类型 + 运行时函数 + enum | 人（写代码） |
| `src/src/data/schemas/*.schema.ts` | zod schema + 类型推导 + 加载校验 | 人（手写） |
| `src/data-json/*.json` | 纯数据事实来源 | **只由 `npm run data:extract` 生成** |
| `src/scripts/data-extract/extract.ts` | 抽取脚本 | 人（维护数据源清单） |

## 拆分原则

**数据 → JSON**：字面量常量、数值表、名称/描述、静态查找表。

**运行时 → TS**：
- 函数定义
- enum（运行时类型标识）
- interface / type（类型声明）
- mutable 状态（如 `AFFIX_WEIGHTS` 由 `rollAffixWeights(rng)` 生成）
- 含函数引用的结构（如 `BOSS_MODIFIER_REGISTRY` 的 apply/cleanup）

**边缘情况**（见 Story 57.1 实施经验）：
- 纯函数/无数据的 `.ts` 文件（如 `wordPacks.ts`、`restEvents.ts`）：**不抽**，整个文件保持运行时
- 含 `Set<...>` 的表：Set 不能 JSON 序列化，**不抽**（或在 extract 里转成 Array）
- 含 enum keys 的 `Record<EnumType, ...>`：JSON 化后 keys 是 string，schema 用 `z.record(z.string(), ...)`，运行时 `as Record<EnumType, ...>` cast 回来

## 新增数据必须先动 JSON（纪律）

从 Story 57.1 完成起：

1. 编辑 `src/src/data/*.ts` 加静态数据：
   - 是运行时函数？→ 直接写 ts，结束
   - 是静态数据？→ **先写 TS 字面量**，然后：
     1. 跑 `npm run data:extract`，JSON 被更新
     2. 如有新字段/新字段类型，更新对应 `schemas/*.schema.ts`
     3. 改 ts 让常量引用 `XXX_DATA.field as Type`（见现有样板）
     4. 跑 `npm run test:run` 验证零回归

2. 提交时 `data-json/*.json` 变化要和 `schemas/*.schema.ts` + `data/*.ts` 一起提交

## 抽取脚本运行器

使用 **vite-node** 而非 tsx。原因：项目中 `effects/sound.ts` 等模块在 module init 时使用 `import.meta.env.BASE_URL`（vite 专属），tsx 纯 Node 环境下会崩。vite-node 提供完整 vite env。

```json
"data:extract": "vite-node scripts/data-extract/extract.ts"
```

## 当前覆盖范围（Story 57.1 完成态）

| 源文件 | JSON 输出 | 状态 |
|--------|-----------|------|
| `keyboardTopology.ts` | `keyboardTopology.json` | ✓ 5 张表 |
| `classes.ts` | `classes.json` | ✓ 3 职业定义 |
| `tutorialSteps.ts` | `tutorialSteps.json` | ✓ L0~L5 + demo |
| `words.ts` | `words.json` | ✓ WORD_POOL |
| `bossModifiers.ts` | `bossModifiers.json` | ✓ BOSS_MODIFIER_META + IDs |
| `skills.ts` | `skills.json` | ✓ DELETED_*_IDS |
| `relics.ts` | `relics.json` | ✓ RELICS + MAX_RELIC_SLOTS + DELETED_RELIC_IDS |
| `affixes.ts` | `affixes.json` | ✓ 23 张静态表 |
| `wordPacks.ts` | — | SKIP（纯运行时） |
| `restEvents.ts` | — | SKIP（纯运行时） |

## 未来 Godot 端消费

Godot 4 C# 端启动时：
1. `DataLoader.cs` 读取 `data/*.json`（从本仓库 `src/data-json/` 同步到 Godot 项目 `data/` 目录）
2. `System.Text.Json` 反序列化到 C# DTO 类
3. DTO 字段命名用 `[JsonPropertyName("camelCaseName")]` 显式映射

同步机制：`tools/sync-godot-data.ts`（57.4 实现），CI 中每次构建前跑一次。

## 历史：Story 57.1 关键决策

- 依赖：`zod@4` + `vite-node`（vite 自带），用 `--legacy-peer-deps` 绕开项目既有 peer dep 冲突
- 测试基线：项目主线有 531 pre-existing 失败（来自 epic 34/35/45/46/47/52 等内容扩展的测试维护遗债），本 Story 以零回归为 AC 标准而非"全绿"
- schema 校验在 dev 模式做一次 `parse()`，prod 模式跳过节省冷启动
- 不破坏现有 TS 代码：所有调用方代码不需要改动，因为常量名和类型结构不变，仅数据来源从字面量变为 JSON → schema 链
