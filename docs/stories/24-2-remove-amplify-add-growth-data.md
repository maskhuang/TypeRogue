# Story 24.2: 移除增幅附魔，新增成长附魔数据

Status: done

## Story

As a 玩家,
I want 附魔池中的静态增幅附魔被替换为动态成长附魔，并新增精通与吞噬两个独立附魔,
so that 附魔选择从"放了就有"的静态加成，转变为"用得多才涨"的动态成长策略，为无尽模式的 build 对抗难度攀升提供核心解答.

## Acceptance Criteria

1. 移除 6 个 `ench_amplify_*` 附魔定义（吸附/列阵/立柱/握拳/聚指/引力）
2. `SpatialEffectType` 移除 `'amplify'`，新增 `'growth'`
3. 新增 6 个空间·成长附魔（`category: 'spatial'`, `spatialType: 'growth'`）：

| ID | 名称 | icon | 位置关系 | effectValue | 描述 |
|---|---|---|---|---|---|
| `ench_growth_adjacent` | 汲取 | 🌱 | Adjacent | 0.03 | 相邻技能触发时，自身永久 +3% |
| `ench_growth_sameRow` | 感染 | 🌱📡 | SameRow | 0.02 | 同行技能触发时，自身永久 +2% |
| `ench_growth_sameColumn` | 脉冲 | 🌱📌 | SameColumn | 0.04 | 同列技能触发时，自身永久 +4% |
| `ench_growth_sameHand` | 渗透 | 🌱🤝 | SameHand | 0.01 | 同手技能触发时，自身永久 +1% |
| `ench_growth_sameFinger` | 贯通 | 🌱👆 | SameFinger | 0.05 | 同指技能触发时，自身永久 +5% |
| `ench_growth_symmetric` | 共振 | 🌱🪞 | Symmetric | 0.06 | 对称位技能触发时，自身永久 +6% |

4. `EnchantmentCategory` 新增 `'independent'`（为精通和吞噬使用）
5. 新增独立·精通附魔：

| ID | 名称 | icon | category | effectValue | 描述 |
|---|---|---|---|---|---|
| `ench_mastery` | 精通 | 📈 | independent | 0.05 | 每触发 10 次，自身永久 +5% |

6. 新增独立·吞噬附魔：

| ID | 名称 | icon | category | effectValue | 描述 |
|---|---|---|---|---|---|
| `ench_devour` | 吞噬 | 🦷 | independent | 0.20 | 触发 N 次后吞噬相邻弱技能，每图标 +20% |

7. 附魔总数从当前 29 变为 31（-6 amplify + 6 growth + 1 mastery + 1 devour）
8. 所有附魔 id 与 key 匹配，必要字段非空
9. 现有附魔数据测试更新并通过
10. `skills.ts` 中 `getEnchantmentMultiplier()` 的 `amplify` 分支移除（替换为返回 1 的占位，触发逻辑在 Story 24.3 实现）

## Tasks / Subtasks

- [x] Task 1: 类型更新 (AC: 2, 4)
  - [x] 1.1 `core/types.ts` — `SpatialEffectType` 移除 `'amplify'`，新增 `'growth'`
  - [x] 1.2 `core/types.ts` — `EnchantmentCategory` 新增 `'independent'`

- [x] Task 2: 移除 amplify 附魔数据 (AC: 1)
  - [x] 2.1 `data/enchantments.ts` — 删除 6 个 `ench_amplify_*` 条目
  - [x] 2.2 `data/enchantments.ts` — 更新注释（计数、分类说明）

- [x] Task 3: 新增 growth 附魔数据 (AC: 3)
  - [x] 3.1 `data/enchantments.ts` — 在原 amplify 位置添加 6 个 `ench_growth_*` 条目
  - [x] 3.2 每个使用 `category: 'spatial'`, `spatialType: 'growth'`, 对应的 `positionRelation` 和 `effectValue`

- [x] Task 4: 新增独立附魔数据 (AC: 4, 5, 6)
  - [x] 4.1 `data/enchantments.ts` — 添加 `ench_mastery`（`category: 'independent'`, `effectValue: 0.05`）
  - [x] 4.2 `data/enchantments.ts` — 添加 `ench_devour`（`category: 'independent'`, `effectValue: 0.20`）

- [x] Task 5: 移除 amplify 触发逻辑 (AC: 10)
  - [x] 5.1 `systems/skills.ts` — `getEnchantmentMultiplier()` 中移除 `spatialType === 'amplify'` 分支
  - [x] 5.2 确认 repulsion 分支不受影响

- [x] Task 6: 更新测试 (AC: 7, 8, 9)
  - [x] 6.1 `tests/unit/data/enchantments.test.ts` — 更新总数 29→31，更新分类计数
  - [x] 6.2 移除 amplify 附魔相关的数据断言，新增 growth/mastery/devour 断言
  - [x] 6.3 `tests/unit/systems/enchantment-effects.test.ts` — 移除 amplify 效果测试
  - [x] 6.4 `tests/unit/systems/amplifier-enchantment.test.ts` — 移除 amplify 附魔 + 增幅者联动测试
  - [x] 6.5 新增 growth 附魔数据完整性测试（6 个、字段验证、位置关系覆盖）
  - [x] 6.6 新增 mastery/devour 数据完整性测试

## Dev Notes

### 当前附魔系统状态（开发前）

最近一次提交 `b166364` 已删除 4 个旧独立附魔（先手/终幕/一刀/渴血），移除了 `'independent'` 类别和 `decayCounters` 机制。当前状态：

| 类别 | 数量 |
|------|------|
| 空间·增幅 amplify | 6 |
| 空间·溅射 splash | 6 |
| 空间·共鸣 resonance | 6 |
| 空间·排斥 repulsion | 6 |
| 变性 transmutation | 5 |
| **合计** | **29** |

### 本 Story 后的附魔总表

| 类别 | 数量 | 变化 |
|------|------|------|
| ~~空间·增幅 amplify~~ | ~~6~~ | **移除** |
| **空间·成长 growth** | **6** | **新增，替代增幅** |
| 空间·溅射 splash | 6 | 不变 |
| 空间·共鸣 resonance | 6 | 不变 |
| 空间·排斥 repulsion | 6 | 不变 |
| 变性 transmutation | 5 | 不变 |
| **独立·精通** | **1** | **新增** |
| **独立·吞噬** | **1** | **新增** |
| **合计** | **31** | +2 |

### 成长附魔设计逻辑

成长附魔与其他空间附魔的三角关系：
- **成长** → 旁边放高频技能，吸收触发能量，跨关变强（动态长期收益）
- **共鸣** → 旁边放高频技能，被动触发，即时收益
- **排斥** → 旁边留空位，单次更强，静态收益

effectValue 设计：条件越难满足 → 单次成长率越高 → 但触发频率低 → 总成长速度趋近。

### 本 Story 只做数据定义

- **不实现**触发逻辑（Story 24.3）
- **不实现**精通的触发计数（Story 24.4）
- **不实现**吞噬的图标判定和吞噬执行（Story 24.5）
- **不实现** UI 适配（Story 24.6）
- `getEnchantmentMultiplier()` 中 growth 附魔暂时返回 1（无效果），等 Story 24.3 实现

### 类型变更详细说明

```typescript
// core/types.ts 修改
export type EnchantmentCategory = 'spatial' | 'transmutation' | 'independent';
export type SpatialEffectType = 'growth' | 'splash' | 'resonance' | 'repulsion';
// 'amplify' 移除, 'growth' 新增
```

### skills.ts 中 amplify 分支的处理

当前 `getEnchantmentMultiplier()` 有 amplify 分支：

```typescript
if (ench.spatialType === 'amplify' && triggerKey && ench.positionRelation) {
  const related = getKeysWithRelation(triggerKey, ench.positionRelation);
  const skillCount = related.filter(k => state.player.bindings.has(k)).length;
  return 1 + skillCount * ench.effectValue;
}
```

本 Story 直接删除此分支。growth 触发逻辑在 Story 24.3 中以完全不同的方式实现（不是倍率计算，而是累积 growthValues 到 RunState）。

### 受影响的测试文件

| 测试文件 | 影响 |
|---------|------|
| `tests/unit/data/enchantments.test.ts` | 总数 29→31, 移除 amplify 断言, 新增 growth/mastery/devour 断言 |
| `tests/unit/systems/enchantment-effects.test.ts` | 移除 amplify 倍率测试（第一个 describe 块） |
| `tests/unit/systems/amplifier-enchantment.test.ts` | 移除 amplify 附魔+增幅者联动测试 |

### ench_mastery 和 ench_devour 的数据结构

精通和吞噬不需要 `spatialType` 或 `positionRelation`（非空间型），但需要 `category: 'independent'`。它们的 `effectValue` 含义：
- `ench_mastery`: `effectValue: 0.05` — 每 10 次触发增加 5% 成长值
- `ench_devour`: `effectValue: 0.20` — 每个吞噬图标增加 20% 基础效果

### Project Structure Notes

- 修改 3 个文件：`core/types.ts`（类型）, `data/enchantments.ts`（数据）, `systems/skills.ts`（移除 amplify 分支）
- 修改 3 个测试文件：enchantments 数据测试 + 2 个效果测试
- 无新增文件
- 无新增外部依赖

### References

- [Source: docs/epics.md#Epic 24, Story 24.2 — 移除增幅附魔，新增成长附魔数据]
- [Source: docs/brainstorming-session-2026-03-05.md#Section F+ — 成长附魔详细设计]
- [Source: src/src/data/enchantments.ts — 当前 29 个附魔定义]
- [Source: src/src/core/types.ts:71-84 — EnchantmentCategory/SpatialEffectType/EnchantmentDefinition]
- [Source: src/src/systems/skills.ts — getEnchantmentMultiplier() amplify 分支]
- [Source: docs/stories/24-1-growth-value-state.md — 前置 Story，growthValues/devourIcons 已就绪]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

N/A

### Completion Notes List

- 6 amplify 附魔已移除，6 growth 附魔已替代，mastery/devour 已新增
- `SpatialEffectType` 从 `amplify|splash|resonance|repulsion` 变为 `growth|splash|resonance|repulsion`
- `EnchantmentCategory` 新增 `'independent'` 类别
- `getEnchantmentMultiplier()` 的 amplify 分支已移除，growth 暂返回 1（Story 24.3 实现）
- 45 个附魔相关测试全部通过（24 数据 + 10 效果 + 11 增幅者联动）
- 全局测试中的失败项为 pre-existing（producer/converter/shop-act-weight），与本 Story 无关

### Code Review Fixes (2026-03-06)

- **M1 修复:** `ench_devour` 添加 `positionRelation: Adjacent`，消除分类与描述矛盾；测试拆分为精通/吞噬分别断言
- **M2 修复:** 新增 growth 附魔占位行为测试（验证 multiplier 返回 1，文档化 Story 24.3 依赖）
- **M3 修复:** `amplifier-enchantment.test.ts:159` 注释移除过期 "amplify" 引用
- **L1/L2 保留:** devour "N" 阈值和 mastery "10次" 阈值为设计决策，由 Story 24.4/24.5 定义
- 修复后 47 tests 通过（25 数据 + 11 效果 + 11 增幅者联动）

### File List

- `src/src/core/types.ts` — SpatialEffectType/EnchantmentCategory 类型更新
- `src/src/data/enchantments.ts` — 附魔数据：-6 amplify +6 growth +2 independent = 31 总；devour 添加 positionRelation
- `src/src/systems/skills.ts` — 移除 amplify 分支
- `src/tests/unit/data/enchantments.test.ts` — 完全重写（25 tests）
- `src/tests/unit/systems/enchantment-effects.test.ts` — 移除 amplify 测试块，新增 growth 占位测试（11 tests）
- `src/tests/unit/systems/amplifier-enchantment.test.ts` — 移除 amplify+增幅者联动测试，修复过期注释（11 tests）
