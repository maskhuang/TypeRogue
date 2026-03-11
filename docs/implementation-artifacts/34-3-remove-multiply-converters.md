# Story 34.3: 移除乘算转化者

Status: done

## Story

As a 玩家,
I want 乘算不再作为独立转化者购买，而是通过「乘算化」附魔将加算转化者升格为乘算转化者,
so that 乘算来源统一由附魔数量控制（天然稀缺），避免乘算转化者泛滥导致的数值膨胀.

## Acceptance Criteria

1. **AC1 — 删除乘算转化者:** 从 `CONVERTERS` 中删除所有 37 个 `formula: 'multiply'` 的转化者，ID 加入 `DELETED_SKILL_IDS`
2. **AC2 — 抽取池调整:** `drawConverterPool()` 从剩余 37 个 add 转化者中抽取，抽取数量从 31 调整为 20（37 中抽 20，保留随机性）
3. **AC3 — 乘算化附魔扩展到转化者:** `ench_multiply` 附魔可附加到转化者上，将 `formula` 从 `'add'` 改为 `'multiply'`，k 值从预定义映射表获取
4. **AC4 — k 值映射表:** `ench_multiply.converterMultiplyK` 映射 `${source}_${target}` → 乘算 k 值（从旧乘算转化者数值导出），确保各源→目标组合合理
5. **AC5 — 存档兼容:** 存档加载时 `DELETED_SKILL_IDS` 过滤，玩家已持有的乘算转化者静默移除
6. **AC6 — UI 清理:** 商店/技能列表不再显示已删除的乘算转化者

## Tasks / Subtasks

- [x] **Task 1: 删除 36 个乘算转化者** (AC: 1)
  - [x] 1.1 从 `data/converters.ts` 的 `CONVERTERS` 对象中移除所有 `formula: 'multiply'` 条目（实际 36 个，非 37）
  - [x] 1.2 在 `data/skills.ts` 的 `DELETED_SKILL_IDS` 中追加 36 个旧 multiply 转化者 ID
  - [x] 1.3 检查 `demo/demo-config.ts` — 无乘算转化者引用，无需变更
  - [x] 1.4 检查 `systems/shop.ts` — 使用 converterPool 过滤，天然兼容

- [x] **Task 2: 调整抽取池** (AC: 2)
  - [x] 2.1 `drawConverterPool()` 默认参数从 `count = 31` 改为 `count = 20`
  - [x] 2.2 `main.ts` 无需改动（使用默认参数）
  - [x] 2.3 `core/types.ts` 注释 `converterPool` 更新为 "38 抽 20"

- [x] **Task 3: 扩展 ench_multiply 到转化者** (AC: 3, 4)
  - [x] 3.1 在 `EnchantmentDefinition` 中新增 `converterMultiplyK?: Record<string, number>`
  - [x] 3.2 在 `ench_multiply` 定义中填充 36 个 `converterMultiplyK` 映射
  - [x] 3.3 保留 `ConverterFormula = 'add' | 'multiply'` 类型供 effectiveFormula 使用
  - [x] 3.4 `getConverterDesc()` 新增 `multiplyOverride` 参数（避免 data 层交叉引用）
  - [x] 3.5 `getSkillDisplayInfo()` 解析 ench_multiply → 传递 multiplyOverride 到 getConverterDesc

- [x] **Task 4: triggerConverter 乘算化分支** (AC: 3)
  - [x] 4.1 检测 `ench_multiply` 附魔 → `effectiveFormula = 'multiply'`, `effectiveK` 从映射表获取
  - [x] 4.2 使用 `effectiveFormula`/`effectiveK` 代替 `conv.formula`/`k`
  - [x] 4.3 资源写入逻辑不变（已有 add/multiply 分支）
  - [x] 4.4 反馈显示使用 `effectiveFormula` 切换 +N/×N

- [x] **Task 5: 测试** (AC: 1-6)
  - [x] 5.1 `converters.test.ts`: 总数 74→38，formula 全部 'add'，新增 multiplyOverride 测试
  - [x] 5.2 `converter-trigger.test.ts`: 移除旧乘算触发，新增 3 个 ench_multiply 交互测试
  - [x] 5.3 `enchantments.test.ts`: 新增 ench_multiply 测试组（converterMultiplyK 36 键、k>0、关键值校验）
  - [x] 5.4 `iconRegistry.test.ts`: 总数 328→292（减 36 个乘算转化者）
  - [x] 5.5 `producer-trigger.test.ts`: 无变更

- [x] **Task 6: 存档兼容与 UI 验证** (AC: 5, 6)
  - [x] 6.1 确认 `RunState.deserialize()` 过滤 `DELETED_SKILL_IDS`（L562, L569）
  - [x] 6.2 确认 `systems/shop.ts` L227 使用 `converterPool.filter(id => id in CONVERTERS)`
  - [x] 6.3 确认 `getSkillDisplayInfo()` 乘算化转化者显示 ✖️ 图标 + ×N 描述

## Dev Notes

### 要删除的 37 个乘算转化者（CRITICAL — 完整列表）

**base 源（5 个）:**
| ID | 名称 | 目标 | k |
|----|------|------|---|
| `conv_base_score_mul` | 加冕 | score | 0.005 |
| `conv_base_mult_mul` | 引爆 | multiplier | 0.008 |
| `conv_base_time_mul` | 再生 | time | 0.005 |
| `conv_base_fragment_mul` | 刻字 | fragment | 0.003 |
| `conv_base_mutagen_mul` | 感染 | mutagen | 0.003 |

**score 源（5 个）:**
| ID | 名称 | 目标 | k |
|----|------|------|---|
| `conv_score_base_mul` | 奠基 | base | 0.0006 |
| `conv_score_mult_mul` | 膨胀 | multiplier | 0.00012 |
| `conv_score_time_mul` | 预言 | time | 0.00008 |
| `conv_score_fragment_mul` | 编纂 | fragment | 0.0003 |
| `conv_score_mutagen_mul` | 增殖 | mutagen | 0.0003 |

**multiplier 源（5 个）:**
| ID | 名称 | 目标 | k |
|----|------|------|---|
| `conv_mult_base_mul` | 雷铸 | base | 0.3 |
| `conv_mult_score_mul` | 陨落 | score | 0.04 |
| `conv_mult_time_mul` | 延曦 | time | 0.05 |
| `conv_mult_fragment_mul` | 顿悟 | fragment | 0.2 |
| `conv_mult_mutagen_mul` | 共生 | mutagen | 0.2 |

**time 源（5 个）:**
| ID | 名称 | 目标 | k |
|----|------|------|---|
| `conv_time_base_mul` | 时斩 | base | 0.015 |
| `conv_time_score_mul` | 时运 | score | 0.002 |
| `conv_time_mult_mul` | 时暴 | multiplier | 0.003 |
| `conv_time_fragment_mul` | 沉思 | fragment | 0.01 |
| `conv_time_mutagen_mul` | 潜伏 | mutagen | 0.01 |

**gold 源（6 个）:**
| ID | 名称 | 目标 | k |
|----|------|------|---|
| `conv_gold_base_mul` | 镀金 | base | 0.04 |
| `conv_gold_score_mul` | 悬赏 | score | 0.005 |
| `conv_gold_mult_mul` | 投机 | multiplier | 0.008 |
| `conv_gold_time_mul` | 朝贡 | time | 0.005 |
| `conv_gold_fragment_mul` | 投稿 | fragment | 0.03 |
| `conv_gold_mutagen_mul` | 腐金 | mutagen | 0.003 |

**fragment 源（5 个）:**
| ID | 名称 | 目标 | k |
|----|------|------|---|
| `conv_fragment_base_mul` | 构词 | base | 0.003 |
| `conv_fragment_score_mul` | 笔锋 | score | 0.004 |
| `conv_fragment_mult_mul` | 文锋 | multiplier | 0.006 |
| `conv_fragment_time_mul` | 篆刻 | time | 0.004 |
| `conv_fragment_gold_mul` | 版税 | gold | 0.003 |

**mutagen 源（6 个）:**
| ID | 名称 | 目标 | k |
|----|------|------|---|
| `conv_mutagen_base_mul` | 寄生 | base | 0.003 |
| `conv_mutagen_score_mul` | 蜕化 | score | 0.004 |
| `conv_mutagen_mult_mul` | 异变 | multiplier | 0.006 |
| `conv_mutagen_time_mul` | 休眠 | time | 0.004 |
| `conv_mutagen_gold_mul` | 腐金 | gold | 0.003 |

### converterMultiplyK 映射表（CRITICAL — 从旧乘算转化者 k 值导出）

key 格式: `${source}_${target}`，值为旧乘算转化者的 k 值。

```typescript
converterMultiplyK: {
  // base 源
  base_score: 0.005,  base_multiplier: 0.008,  base_time: 0.005,
  base_fragment: 0.003,  base_mutagen: 0.003,
  // score 源
  score_base: 0.0006,  score_multiplier: 0.00012,  score_time: 0.00008,
  score_fragment: 0.0003,  score_mutagen: 0.0003,
  // multiplier 源
  multiplier_base: 0.3,  multiplier_score: 0.04,  multiplier_time: 0.05,
  multiplier_fragment: 0.2,  multiplier_mutagen: 0.2,
  // time 源
  time_base: 0.015,  time_score: 0.002,  time_multiplier: 0.003,
  time_fragment: 0.01,  time_mutagen: 0.01,
  // gold 源
  gold_base: 0.04,  gold_score: 0.005,  gold_multiplier: 0.008,
  gold_time: 0.005,  gold_fragment: 0.03,  gold_mutagen: 0.003,
  // fragment 源
  fragment_base: 0.003,  fragment_score: 0.004,  fragment_multiplier: 0.006,
  fragment_time: 0.004,  fragment_gold: 0.003,
  // mutagen 源
  mutagen_base: 0.003,  mutagen_score: 0.004,  mutagen_multiplier: 0.006,
  mutagen_time: 0.004,  mutagen_gold: 0.003,
}
```

> **注意：** 没有 gold→gold、fragment→fragment 等同源组合（当前转化者 source ≠ target）。Story 34.4 将解除此限制。

### triggerConverter 乘算化逻辑插入点

现有 `triggerConverter()` 在 `systems/skills.ts` ~L598-707。结构与 triggerProducer 类似：

```
当前计算流程：
1. k = getConverterK(id, level)          // 等级系数
2. sourceVal = getSourceValue(source)     // 读取源资源值
3. enchMult = getEnchantmentMultiplier()  // 附魔乘数
4. ampBonus = getAmplifierBonus()         // 增幅者加成
5. relicMult = getRelicSkillMultiplier()  // 遗物乘数
6. totalMult = enchMult × relicMult × fittestMult
7. formula 分支:
   - add:      delta = sourceVal × amplifiedK × totalMult
   - multiply: delta = target × (factor - 1) × totalMult
8. 资源写入 + 反馈

新增乘算化逻辑（在步骤 1 之后）：
1b. 检测 enchantedSkills.get(converterId) === 'ench_multiply'
    → isMultiplyEnchanted = true
    → multiplyK = ench_multiply.converterMultiplyK[source + '_' + target]
    → effectiveFormula = 'multiply'
    → effectiveK = multiplyK (替代 k)
    （否则 effectiveFormula = conv.formula, effectiveK = k）

步骤 7 使用 effectiveFormula 代替 conv.formula, effectiveK 代替 k
```

### Story 34.2 的 effectiveOperator 模式（复用参考）

triggerProducer 已实现相同模式：
```typescript
// 乘算化附魔检测（Story 34.2）
const enchantedId = state.player.enchantedSkills?.get(producerId);
const isMultiplyEnchanted = enchantedId === 'ench_multiply';
let effectiveOperator = prod.operator;
let effectiveBaseValue = baseValue;
if (isMultiplyEnchanted) {
  const mv = ENCHANTMENTS['ench_multiply']?.multiplyValues;
  if (mv && mv[prod.resource]) {
    effectiveBaseValue = mv[prod.resource][level - 1];
    effectiveOperator = 'multiply';
  }
}
```

转化者使用相同模式，但字段名不同：
- `effectiveFormula` 代替 `effectiveOperator`
- `effectiveK` 代替 `effectiveBaseValue`
- 查 `converterMultiplyK[source_target]` 代替 `multiplyValues[resource][level-1]`

### getSkillDisplayInfo 转化者描述

`data/skills.ts` 的 `getSkillDisplayInfo()` 已有转化者分支（~L78-83）。需要：
1. 检测 `ench_multiply` 附魔
2. 传递乘算化信息到 `getConverterDesc()`（类似 Story 34.2 对 `getProducerDesc()` 的 `multiplyOverride` 重构）
3. 乘算化转化者图标显示 ✖️

### 关键代码位置

| 组件 | 文件 | 行号/函数 |
|------|------|----------|
| CONVERTERS 对象 | `src/src/data/converters.ts` | 37 个 multiply 条目 |
| drawConverterPool() | `src/src/data/converters.ts` | ~L111 |
| getConverterK() | `src/src/data/converters.ts` | ~L121 |
| getConverterDesc() | `src/src/data/converters.ts` | ~L134 |
| triggerConverter() | `src/src/systems/skills.ts` | ~L598-707 |
| DELETED_SKILL_IDS | `src/src/data/skills.ts` | L15-31 |
| getSkillDisplayInfo() | `src/src/data/skills.ts` | ~L53-77（转化者分支 ~L78-83）|
| ench_multiply 定义 | `src/src/data/enchantments.ts` | L71-87 |
| EnchantmentDefinition | `src/src/core/types.ts` | ~L110-122 |
| ConverterFormula 类型 | `src/src/core/types.ts` | ~L59 |
| converterPool 状态 | `src/src/core/state.ts` | L55 |
| converterPool 初始化 | `src/src/main.ts` | L162 |
| iconRegistry 动态聚合 | `src/src/data/iconRegistry.ts` | getAllIconEntries() |
| converters.test.ts | `tests/unit/data/converters.test.ts` | 计数: 74→37 |
| converter-trigger.test.ts | `tests/unit/systems/converter-trigger.test.ts` | 移除乘算测试 + 新增 ench_multiply 测试 |
| iconRegistry.test.ts | `tests/unit/data/iconRegistry.test.ts` | 计数: 328→291 |

### 不在本 Story 范围内

- ❌ 同源转化（source = target，Story 34.4）
- ❌ 商店池权重调整（Story 34.5）
- ❌ 乘算化 UI 状态展示（Story 34.6）
- ❌ 数值平衡调优（Story 34.7）
- ❌ ConverterFormula 类型精简（保留 'multiply' 类型供 effectiveFormula 使用）

### Project Structure Notes

- `data/` 层为纯数据定义 → 转化者删除和 ench_multiply 扩展在此
- `core/` 层为类型定义 → EnchantmentDefinition 扩展 converterMultiplyK
- `systems/` 层为游戏逻辑 → triggerConverter 乘算化分支在此
- 依赖方向：`data → core → systems → scenes`，严禁反向引用
- Story 34.2 已建立 `effectiveOperator` 模式，本 Story 复用相同模式
- iconRegistry 动态聚合 CONVERTERS 对象 → 删除转化者后自动反映到注册表
- `getConverterDesc()` 不应直接 import `ENCHANTMENTS`（Story 34.2 Code Review M2 教训），应在 `getSkillDisplayInfo()` 中解析后传递

### References

- [Source: docs/stories/epic-34-skill-affix-refactor.md#Story 34.3 — 验收标准]
- [Source: docs/design/affix-skill-system.md — 方案 A/B 对比及 k 值表]
- [Source: docs/implementation-artifacts/34-2-multiply-to-enchantment.md — effectiveOperator 模式参考]
- [Source: src/src/data/converters.ts — 74 个转化者定义 + drawConverterPool]
- [Source: src/src/systems/skills.ts ~L598-707 — triggerConverter 计算流程]
- [Source: src/src/data/enchantments.ts L71-87 — ench_multiply 定义]
- [Source: docs/project-context.md#Skill System Rules — 触发计算顺序]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- 实际乘算转化者数量为 36（非 story 原始标注的 37），原因：score→gold 和 time→gold 只有 add 无 multiply 版本
- 剩余加算转化者 38 个（非 37），drawConverterPool 默认改为 20
- `ConverterFormula` 类型保留 `'add' | 'multiply'` 供 effectiveFormula 使用，不做精简
- `getConverterDesc()` 新增 `multiplyOverride` 参数（与 Story 34.2 的 `getProducerDesc` 模式一致），避免 data 层交叉引用 ENCHANTMENTS
- `converterMultiplyK` 共 36 个键值对，覆盖所有 source≠target 组合（排除 score→gold 和 time→gold 的 multiply 形式，因原数据中不存在）
- icon 注册表总数从 328 降至 292
- 📜 图标重复（conv_score_gold_add vs boss_scroll）为 pre-existing 问题
- 112/113 测试通过，1 个失败为 pre-existing icon 重复

### Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 (Code Review) — 2026-03-11
**Result:** Approved with fixes applied

**Findings (2 MEDIUM, 3 LOW):**
- **M1 (FIXED):** Level scaling lost for ench_multiply converters — `effectiveK = cmk[mapKey]` bypassed level growth. Fixed: apply `growthFactors[level]` to converterMultiplyK value (consistent with producer pattern). Files: `systems/skills.ts`, `data/skills.ts`
- **M2 (FIXED):** Display icon ✖️ shown via `isMultEnchConv` even when multiply fallback to add (2 converters without converterMultiplyK entry). Fixed: use `convMultiplyOverride` for icon check. File: `data/skills.ts:114`
- **L1 (FIXED):** Comment "37 个加算转化者" → "38 个". File: `data/converters.ts:4`
- **L2 (FIXED):** Added Lv2 + ench_multiply test to verify level scaling. File: `converter-trigger.test.ts`
- **L3 (NOT FIXED):** Truthiness check `cmk[mapKey]` treats k=0 as absent — all values > 0, no practical impact.

**Tests:** 113/114 pass (1 pre-existing icon duplicate 📜)

### File List

1. `src/src/data/converters.ts` — 删除 36 个乘算转化者，更新 drawConverterPool 默认参数和注释
2. `src/src/data/skills.ts` — DELETED_SKILL_IDS 追加 36 个乘算转化者 ID，getSkillDisplayInfo 增加转化者乘算化处理
3. `src/src/data/enchantments.ts` — ench_multiply 增加 converterMultiplyK 映射表（36 个键值对）
4. `src/src/core/types.ts` — EnchantmentDefinition 增加 converterMultiplyK 字段，converterPool 注释更新
5. `src/src/systems/skills.ts` — triggerConverter 增加 effectiveFormula/effectiveK 乘算化分支
6. `src/tests/unit/data/converters.test.ts` — 重写：38 个转化者、formula 全 add、multiplyOverride 测试
7. `src/tests/unit/systems/converter-trigger.test.ts` — 重写：移除旧乘算测试，新增 ench_multiply 交互测试
8. `src/tests/unit/data/enchantments.test.ts` — 新增 ench_multiply 测试组（converterMultiplyK）
9. `src/tests/unit/data/iconRegistry.test.ts` — 总数 328→292
10. `docs/implementation-artifacts/sprint-status.yaml` — 34-3 状态更新
11. `docs/implementation-artifacts/34-3-remove-multiply-converters.md` — 本 story 文件
