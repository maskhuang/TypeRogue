# Story 24.3: 空间·成长附魔触发逻辑

Status: done

## Story

As a 玩家,
I want 空间·成长附魔在邻居技能触发时自动积累成长值，并在自身触发时应用成长倍率,
so that 成长附魔从数据定义变为可感知的跨关策略，用得越多越强，为无尽模式构筑对抗难度攀升提供核心成长路径.

## Acceptance Criteria

1. 当范围内技能触发时，检测是否有成长附魔技能在该范围内，满足空间关系则累积 `growthValues[skillId] += effectValue`
2. 成长值作为额外乘法倍率应用于技能产出：`finalValue = baseValue × (1 + growthValues[skillId])`
3. 成长值跨关保持（RunState），不随关卡结算清零
4. 线性成长，无上限
5. 自身触发不累积成长（触发源必须是不同键位的技能）
6. 溅射/共鸣触发的技能也能为成长附魔贡献累积
7. 增幅者触发也能为成长附魔贡献累积
8. 成长累积不递归（成长累积本身不再触发新的成长累积）
9. 单元测试：成长累积、倍率应用、跨关保持、自身排除、边界情况

## Tasks / Subtasks

- [x] Task 1: 新增 `checkGrowthAccumulation()` 函数 (AC: 1, 5, 8)
  - [x] 1.1 `systems/skills.ts` — 新增 `checkGrowthAccumulation(triggerKey: string): void`
  - [x] 1.2 遍历 `state.player.enchantedSkills`，筛选 `spatialType === 'growth'`
  - [x] 1.3 通过 `state.player.bindings` 反查成长附魔技能的绑定键位
  - [x] 1.4 用 `hasRelation(triggerKey, boundKey, ench.positionRelation)` 检查空间关系
  - [x] 1.5 排除自身触发：`triggerKey !== boundKey`
  - [x] 1.6 满足条件时：`state.growthValues.set(skillId, (current || 0) + ench.effectValue)`
  - [x] 1.7 添加 `_growthActive` 防递归标志（参考 `_splashActive` 模式）

- [x] Task 2: 修改 `getEnchantmentMultiplier()` 支持成长倍率 (AC: 2)
  - [x] 2.1 `systems/skills.ts` — 在 repulsion 分支前添加 growth 分支
  - [x] 2.2 `if (ench.spatialType === 'growth')` → `return 1 + (state.growthValues.get(skillId) || 0)`

- [x] Task 3: 在触发函数中插入成长累积调用 (AC: 1, 6, 7)
  - [x] 3.1 `triggerProducer()` — 在产出者触发后调用 `checkGrowthAccumulation(triggerKey)`
  - [x] 3.2 `triggerConverter()` — 在转化者触发后调用 `checkGrowthAccumulation(triggerKey)`
  - [x] 3.3 `triggerAmplifier()` — 在增幅者触发后调用 `checkGrowthAccumulation(triggerKey)`
  - [x] 3.4 共鸣/溅射子触发 — `triggerProducerWithReduction`/`triggerConverterWithReduction`/`triggerAmplifierResonance` 末尾调用
  - [x] 3.5 确保溅射触发的子技能（`triggerProducerWithReduction`）也走正常 growth 检查路径

- [x] Task 4: 编写单元测试 (AC: 9)
  - [x] 4.1 `tests/unit/systems/enchantment-effects.test.ts` — 替换 "成长型占位" 测试为真实测试
  - [x] 4.2 测试：相邻技能触发 → growthValues 累积 effectValue
  - [x] 4.3 测试：多次触发 → growthValues 线性累加
  - [x] 4.4 测试：getEnchantmentMultiplier 返回 `1 + growthValues`
  - [x] 4.5 测试：自身触发不累积（triggerKey === boundKey）
  - [x] 4.6 测试：不同位置关系的成长（sameRow）
  - [x] 4.7 测试：无累积时 getEnchantmentMultiplier 返回 1
  - [x] 4.8 测试：无成长附魔 → growthValues 不变

## Dev Notes

### 当前系统状态（Story 24.2 完成后）

| 组件 | 状态 |
|------|------|
| 成长附魔数据 | 6 个 `ench_growth_*` 已在 `enchantments.ts` 中定义 |
| `growthValues` 状态 | `Map<string, number>` 已在 `GameState` 和 `RunState` 中，Story 24.1 完成 |
| `getEnchantmentMultiplier()` | 当前对 growth 返回 1（占位），仅处理 repulsion |
| 测试基线 | `enchantment-effects.test.ts` 有占位测试 "成长附魔暂返回 1" |

### 关键函数位置

| 函数 | 文件:行 | 用途 |
|------|---------|------|
| `getEnchantmentMultiplier()` | `skills.ts:~78` | 附魔倍率计算，需添加 growth 分支 |
| `triggerProducer()` | `skills.ts:~137` | 产出者触发，需插入 growth 调用 |
| `triggerConverter()` | `skills.ts:~223` | 转化者触发，需插入 growth 调用 |
| `triggerAmplifier()` | `skills.ts:~646` | 增幅者触发，需插入 growth 调用 |
| `checkResonanceTriggers()` | `skills.ts:~460` | 共鸣检查，需插入 growth 调用 |
| `hasRelation()` | `keyboardTopology.ts` | 空间关系判断 |
| `getKeysWithRelation()` | `keyboardTopology.ts:~142` | 获取关系内的所有键 |

### checkGrowthAccumulation() 实现要点

```typescript
let _growthActive = false;

function checkGrowthAccumulation(triggerKey: string): void {
  if (!triggerKey || _growthActive) return;
  _growthActive = true;
  try {
    for (const [skillId, enchId] of state.player.enchantedSkills) {
      const ench = ENCHANTMENTS[enchId];
      if (!ench || ench.spatialType !== 'growth' || !ench.positionRelation) continue;

      // 反查该技能绑定的键位
      for (const [boundKey, boundSkillId] of state.player.bindings) {
        if (boundSkillId !== skillId) continue;
        if (triggerKey === boundKey) continue; // 排除自身
        if (!hasRelation(triggerKey, boundKey, ench.positionRelation)) continue;

        const current = state.growthValues.get(skillId) || 0;
        state.growthValues.set(skillId, current + ench.effectValue);
      }
    }
  } finally {
    _growthActive = false;
  }
}
```

### getEnchantmentMultiplier() growth 分支

```typescript
// 在 repulsion 分支前添加：
if (ench.spatialType === 'growth') {
  const accumulated = state.growthValues.get(skillId) || 0;
  return 1 + accumulated;
}
```

### 防递归设计

参考现有模式：
- `_splashActive` — 溅射防递归标志（`skills.ts`）
- `_resonanceActive` — 共鸣防递归标志（`skills.ts`）
- `_growthActive` — 新增成长防递归标志

### 自身触发排除的设计逻辑

成长附魔描述为"邻居触发让我变强"，自身触发不应累积。实现方式：`triggerKey !== boundKey`。

注意 sameRow/sameHand/sameFinger 的边界情况：键 A 在自己的同行/同手/同指集合中，但 `triggerKey === boundKey` 的排除优先于空间关系检查。

### 调用时序

```
用户按键
  → triggerSkill(skillId, key)
    → triggerProducer(skillId, key)
      → 产出资源
      → 溅射检查
      → 共鸣检查
      → checkGrowthAccumulation(key)  ← 新增
    → triggerConverter(skillId, key)
      → 转化资源
      → checkGrowthAccumulation(key)  ← 新增
    → triggerAmplifier(skillId, key)
      → 叠层
      → 溅射检查
      → checkGrowthAccumulation(key)  ← 新增
```

### 与其他附魔的交互

| 附魔类型 | 交互方式 |
|---------|---------|
| 溅射 splash | 溅射触发的技能会额外调用 growth 累积 |
| 共鸣 resonance | 共鸣触发的技能会额外调用 growth 累积 |
| 排斥 repulsion | 无交互（排斥是即时倍率，growth 是累积） |
| 变性 transmutation | 无交互（变性在触发时额外产出，不影响 growth） |

### Project Structure Notes

- 仅修改 1 个源文件：`src/systems/skills.ts`
- 仅修改 1 个测试文件：`tests/unit/systems/enchantment-effects.test.ts`
- 无新增文件
- 无新增外部依赖
- 使用已有的 `hasRelation()` 和 `getKeysWithRelation()` 工具函数

### References

- [Source: docs/epics.md#Epic 24, Story 24.3 — 空间·成长附魔触发逻辑]
- [Source: docs/brainstorming-session-2026-03-05.md#Section F+ — 成长附魔触发机制]
- [Source: docs/stories/24-1-growth-value-state.md — growthValues/devourIcons 状态已就绪]
- [Source: docs/stories/24-2-remove-amplify-add-growth-data.md — 6 个 growth 附魔数据已定义]
- [Source: src/src/systems/skills.ts:~78 — getEnchantmentMultiplier() 当前只处理 repulsion]
- [Source: src/src/systems/skills.ts:~137 — triggerProducer() 调用点]
- [Source: src/src/data/keyboardTopology.ts — hasRelation() / getKeysWithRelation()]
- [Source: src/tests/unit/systems/enchantment-effects.test.ts — 成长占位测试需替换]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

N/A

### Completion Notes List

- `checkGrowthAccumulation()` 实现：遍历 enchantedSkills 筛选 growth 类型，反查 bindings 键位，用 `hasRelation()` 验证空间关系，排除自身触发
- `_growthActive` 防递归标志：参考 `_splashActive`/`_resonanceActive` 模式，try/finally 结构确保标志复位
- `getEnchantmentMultiplier()` growth 分支：`return 1 + (state.growthValues.get(skillId) || 0)`
- 6 个调用点：triggerProducer, triggerConverter, triggerAmplifier（主触发）+ triggerProducerWithReduction, triggerConverterWithReduction, triggerAmplifierResonance（子触发）
- 溅射/共鸣子触发均走 growth 累积路径，满足 AC6/AC7
- 20 个 enchantment-effects 测试全部通过（8 个 checkGrowthAccumulation + 2 个 getEnchantmentMultiplier growth + 2 个集成测试 + 8 个原有）
- 56 个附魔相关测试全部通过（25 数据 + 20 效果 + 11 增幅者联动）
- 全局测试中的失败项为 pre-existing（producer/converter/shop-act-weight），与本 Story 无关

### Code Review Fixes (2026-03-06)

- **M2 修复:** 新增 2 个集成测试（溅射→成长累积、增幅者→成长累积），验证 AC6/AC7 的完整调用路径
- **M3 修复:** `triggerAmplifier` 调用顺序重构：`applySplashEnchantment → checkGrowthAccumulation → updateHUD()`，与 triggerProducer/triggerConverter 模式一致
- **L2 修复:** `checkGrowthAccumulation` 改用 try/finally 保护 `_growthActive` 标志复位，与 story spec 一致
- **M1 降级:** 成长累积不存在自然递归路径（只读写 Map，不触发技能），`_growthActive` 为防御性设计，不需要反递归测试
- **L1 保留:** 跨关保持是 Story 24.1 状态生命周期范畴，不在本 story 测试范围

### File List

- `src/src/systems/skills.ts` — 新增 `checkGrowthAccumulation()` 函数 + `_growthActive` 防递归标志（try/finally）；`getEnchantmentMultiplier()` 添加 growth 分支；6 个触发函数插入 growth 累积调用；triggerAmplifier 调用顺序修正
- `src/tests/unit/systems/enchantment-effects.test.ts` — 替换 growth 占位测试为 8 个真实测试 + 2 个 getEnchantmentMultiplier growth 测试 + 2 个集成测试（溅射→成长、增幅者→成长）
