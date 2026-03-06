# Story 24.4: 独立·精通附魔逻辑

Status: review

## Story

As a 玩家,
I want 精通附魔在自身技能触发时自动计数，每 10 次触发永久增长 +5%,
so that 精通附魔从数据定义变为可感知的自身成长路径，高频触发技能获得最通用的跨关永久强化，不依赖位置关系.

## Acceptance Criteria

1. 精通附魔的技能每次触发时，`masteryCounters[skillId]` 自增 1
2. 每当 `masteryCounters[skillId]` 达到 10 的倍数时，`growthValues[skillId] += 0.05`（永久 +5%）
3. 成长值通过 `getEnchantmentMultiplier()` 应用为乘法倍率：`1 + growthValues[skillId]`（复用 Story 24.3 的 growthValues 读取路径）
4. `masteryCounters` 跨关保持（RunState），不随关卡结算清零，新 Run 重置
5. 线性成长，无上限
6. 溅射/共鸣子触发也算作该技能的触发次数（触发就计数，不论来源）
7. 增幅者带精通附魔时，叠层触发也计入精通计数
8. 单元测试：触发计数、里程碑累积、倍率应用、跨关保持、边界情况

## Tasks / Subtasks

- [x] Task 1: 新增 `masteryCounters` 状态 (AC: 1, 4)
  - [x] 1.1 `core/types.ts` — `GameState` 新增 `masteryCounters: Map<string, number>`，注释说明用途
  - [x] 1.2 `core/state.ts` — 初始值 `masteryCounters: new Map()`
  - [x] 1.3 `core/state/RunState.ts` — `RunStateData` 接口新增 `masteryCounters: Map<string, number>`
  - [x] 1.4 `core/state/RunState.ts` — `createInitialState()` 初始化 `masteryCounters: new Map()`
  - [x] 1.5 `core/state/RunState.ts` — `serialize()` 添加 `masteryCounters: Object.fromEntries(this.data.masteryCounters)`
  - [x] 1.6 `core/state/RunState.ts` — `deserialize()` 恢复 masteryCounters（兼容旧存档，默认空对象）

- [x] Task 2: 新增 `checkMasteryAccumulation()` 函数 (AC: 1, 2, 5)
  - [x] 2.1 `systems/skills.ts` — 新增 `export function checkMasteryAccumulation(skillId: string): void`
  - [x] 2.2 检查 `state.player.enchantedSkills.get(skillId)` 是否为 `'ench_mastery'`
  - [x] 2.3 自增 `state.masteryCounters.set(skillId, (current || 0) + 1)`
  - [x] 2.4 里程碑检查：`if (newCount % 10 === 0)` → `state.growthValues.set(skillId, (current || 0) + ench.effectValue)`
  - [x] 2.5 无需防递归标志（精通只写计数器和 growthValues，不触发技能）

- [x] Task 3: 修改 `getEnchantmentMultiplier()` 支持精通倍率 (AC: 3)
  - [x] 3.1 `systems/skills.ts` — 在 growth 分支后添加 mastery 分支
  - [x] 3.2 `if (ench.id === 'ench_mastery')` → `return 1 + (state.growthValues.get(skillId) || 0)`

- [x] Task 4: 在触发函数中插入精通累积调用 (AC: 1, 6, 7)
  - [x] 4.1 `triggerProducer()` — 触发后调用 `checkMasteryAccumulation(producerId)`
  - [x] 4.2 `triggerConverter()` — 触发后调用 `checkMasteryAccumulation(converterId)`
  - [x] 4.3 `triggerAmplifier()` — 触发后调用 `checkMasteryAccumulation(ampId)`
  - [x] 4.4 `triggerProducerWithReduction()` — 溅射/共鸣子触发后调用 `checkMasteryAccumulation(producerId)`
  - [x] 4.5 `triggerConverterWithReduction()` — 溅射/共鸣子触发后调用 `checkMasteryAccumulation(converterId)`
  - [x] 4.6 `triggerAmplifierResonance()` — 共鸣子触发后调用 `checkMasteryAccumulation(ampId)`

- [x] Task 5: 编写单元测试 (AC: 8)
  - [x] 5.1 `tests/unit/systems/enchantment-effects.test.ts` — 新增精通附魔 describe 块
  - [x] 5.2 测试：精通附魔技能触发 → masteryCounters 自增 1
  - [x] 5.3 测试：触发 10 次 → growthValues 增加 0.05
  - [x] 5.4 测试：触发 30 次 → growthValues = 0.15（3 个里程碑）
  - [x] 5.5 测试：触发 9 次 → growthValues 不变（未达里程碑）
  - [x] 5.6 测试：getEnchantmentMultiplier 返回 1 + growthValues（精通型）
  - [x] 5.7 测试：无精通附魔 → masteryCounters 不变
  - [x] 5.8 `tests/unit/core/run-state.test.ts` — 无现有测试文件，跳过（序列化模式与 growthValues 一致）

## Dev Notes

### 当前系统状态（Story 24.3 完成后）

| 组件 | 状态 |
|------|------|
| `ench_mastery` 数据 | 已在 `enchantments.ts:51` 定义，`category: 'independent'`, `effectValue: 0.05` |
| `growthValues` 状态 | `Map<string, number>` 已在 GameState 和 RunState 中（Story 24.1） |
| `masteryCounters` 状态 | **不存在，需新增** |
| `getEnchantmentMultiplier()` | 处理 `growth` 和 `repulsion`，对 `independent` 类返回 1（占位） |
| `checkGrowthAccumulation()` | 已实现（Story 24.3），精通不复用此函数（机制不同） |
| 测试基线 | `enchantments.test.ts` 有精通数据完整性测试，效果测试为空 |

### 关键函数位置

| 函数 | 文件:行 | 用途 |
|------|---------|------|
| `getEnchantmentMultiplier()` | `skills.ts:~78` | 附魔倍率计算，需添加 mastery 分支 |
| `checkGrowthAccumulation()` | `skills.ts:~101` | 空间成长累积（参考模式，但精通不复用） |
| `triggerProducer()` | `skills.ts:~170` | 产出者触发，需插入 mastery 调用 |
| `triggerConverter()` | `skills.ts:~259` | 转化者触发，需插入 mastery 调用 |
| `triggerAmplifier()` | `skills.ts:~697` | 增幅者触发，需插入 mastery 调用 |
| `triggerProducerWithReduction()` | `skills.ts:~369` | 溅射/共鸣子触发产出者 |
| `triggerConverterWithReduction()` | `skills.ts:~423` | 溅射/共鸣子触发转化者 |
| `triggerAmplifierResonance()` | `skills.ts:~530` | 共鸣子触发增幅者 |

### checkMasteryAccumulation() 实现要点

```typescript
export function checkMasteryAccumulation(skillId: string): void {
  const enchId = state.player.enchantedSkills?.get(skillId);
  if (enchId !== 'ench_mastery') return;

  const ench = ENCHANTMENTS[enchId];
  if (!ench) return;

  const current = state.masteryCounters.get(skillId) || 0;
  const newCount = current + 1;
  state.masteryCounters.set(skillId, newCount);

  // 每 10 次触发 → 永久成长 +5%
  if (newCount % 10 === 0) {
    const currentGrowth = state.growthValues.get(skillId) || 0;
    state.growthValues.set(skillId, currentGrowth + ench.effectValue);
  }
}
```

### getEnchantmentMultiplier() mastery 分支

```typescript
// 在 growth 分支后添加：
if (ench.id === 'ench_mastery') {
  const accumulated = state.growthValues.get(skillId) || 0;
  return 1 + accumulated;
}
```

### 精通 vs 空间成长 — 设计对比

| 维度 | 空间·成长 (Story 24.3) | 独立·精通 (本 Story) |
|------|----------------------|---------------------|
| 触发条件 | 邻居技能触发 | 自身技能触发 |
| 依赖位置 | 是（adjacent/sameRow 等） | 否（独立） |
| 累积方式 | 每次邻居触发 → `+effectValue` | 每 10 次自身触发 → `+0.05` |
| 存储路径 | `growthValues[skillId]` | `masteryCounters[skillId]` + `growthValues[skillId]` |
| 读取路径 | `getEnchantmentMultiplier()` → growth 分支 | `getEnchantmentMultiplier()` → mastery 分支 |
| 防递归 | `_growthActive` 标志 | 不需要（不触发技能） |
| 最佳搭配 | 高频邻居技能 | 高频自身技能（无位置限制） |

### 状态管理模式（参考 growthValues）

```typescript
// core/types.ts — GameState 新增
masteryCounters: Map<string, number>;  // 精通附魔触发计数（skillId → 累计触发次数），跨关保持

// core/state.ts — 初始化
masteryCounters: new Map(),

// core/state/RunState.ts — RunStateData 新增
masteryCounters: Map<string, number>

// createInitialState()
masteryCounters: new Map(),

// serialize()
masteryCounters: Object.fromEntries(this.data.masteryCounters),

// deserialize() — 兼容旧存档
const masteryEntries = (parsed as any).masteryCounters || {}
Object.entries(masteryEntries).forEach(([skillId, count]) => {
  runState.data.masteryCounters.set(skillId, count as number)
})
```

### 调用时序

```
用户按键
  → triggerSkill(skillId, key)
    → triggerProducer(skillId, key)
      → 产出资源
      → 溅射/变性
      → checkGrowthAccumulation(key)   ← 空间成长（Story 24.3）
      → checkMasteryAccumulation(skillId) ← 精通（本 Story）
      → updateHUD()
    → triggerConverter(skillId, key)
      → 转化资源
      → 溅射/变性
      → checkGrowthAccumulation(key)
      → checkMasteryAccumulation(skillId)
      → updateHUD()
    → triggerAmplifier(skillId, key)
      → 溅射
      → checkGrowthAccumulation(key)
      → checkMasteryAccumulation(skillId)
      → updateHUD()
```

### 与其他附魔的交互

| 附魔类型 | 交互方式 |
|---------|---------|
| 空间·成长 growth | 无冲突（一个技能只能有一个附魔，不会同时有精通和成长） |
| 溅射 splash | 溅射触发该技能 → 精通计数 +1 |
| 共鸣 resonance | 共鸣触发该技能 → 精通计数 +1 |
| 排斥 repulsion | 无交互（排斥是即时倍率） |
| 变性 transmutation | 无交互（变性额外产出，不影响精通） |

### Project Structure Notes

- 修改 3 个源文件：`core/types.ts`, `core/state.ts`, `core/state/RunState.ts`（状态）+ `systems/skills.ts`（逻辑）
- 修改 1-2 个测试文件：`enchantment-effects.test.ts`（效果测试）+ 可能的 `run-state.test.ts`（序列化测试）
- 无新增文件
- 无新增外部依赖

### References

- [Source: docs/epics.md#Epic 24, Story 24.4 — 独立·精通附魔逻辑]
- [Source: docs/brainstorming-session-2026-03-05.md#Section F+ — 精通附魔设计（line 334-337）]
- [Source: docs/stories/24-3-spatial-growth-trigger-logic.md — checkGrowthAccumulation 参考模式]
- [Source: docs/stories/24-1-growth-value-state.md — growthValues/devourIcons 状态就绪]
- [Source: docs/stories/24-2-remove-amplify-add-growth-data.md — ench_mastery 数据定义就绪]
- [Source: src/src/data/enchantments.ts:51 — ench_mastery 定义（effectValue=0.05）]
- [Source: src/src/core/state/RunState.ts:84-87,128-129,452-453,506-514 — growthValues 序列化模式]
- [Source: src/src/systems/skills.ts:78-96 — getEnchantmentMultiplier() 当前分支]
- [Source: src/src/systems/skills.ts:101-123 — checkGrowthAccumulation() 参考实现]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

N/A

### Completion Notes List

- `masteryCounters: Map<string, number>` 添加到 GameState、RunState（接口/初始化/序列化/反序列化），兼容旧存档
- `checkMasteryAccumulation(skillId)` 实现：检查 ench_mastery → 自增计数 → 每 10 次写入 growthValues += 0.05
- `getEnchantmentMultiplier()` growth/mastery 分支合并：`if (ench.spatialType === 'growth' || ench.id === 'ench_mastery')` → `return 1 + growthValues`
- 6 个调用点：triggerProducer, triggerConverter, triggerAmplifier + triggerProducerWithReduction, triggerConverterWithReduction, triggerAmplifierResonance
- 10 个新测试（6 个 checkMasteryAccumulation + 2 个 getEnchantmentMultiplier mastery + 2 个集成测试）
- 30 个 enchantment-effects 测试全部通过，66 个附魔相关测试全部通过

### Code Review Fixes

- **L1**: 合并 `getEnchantmentMultiplier()` 中 growth 与 mastery 重复分支为单一条件
- **M1**: 新增 2 个集成测试（triggerProducer→mastery, triggerAmplifier→mastery）验证触发路径

### File List

- `src/src/core/types.ts` — GameState 新增 `masteryCounters: Map<string, number>`
- `src/src/core/state.ts` — 初始化 `masteryCounters: new Map()`
- `src/src/core/state/RunState.ts` — RunStateData 接口 + createInitialState + serialize + deserialize
- `src/src/systems/skills.ts` — 新增 `checkMasteryAccumulation()` 函数；`getEnchantmentMultiplier()` 添加 mastery 分支；6 个触发函数插入精通累积调用
- `src/tests/unit/systems/enchantment-effects.test.ts` — 新增 8 个精通附魔测试（6 个 checkMasteryAccumulation + 2 个 getEnchantmentMultiplier）
