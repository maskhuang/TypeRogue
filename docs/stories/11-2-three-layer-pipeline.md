# Story 11.2: 三层计算管道

Status: done

## Story

As a 开发者,
I want 一个 EffectPipeline 类，按 before → calculate → after 三阶段处理 ModifierRegistry 中的修饰器,
so that 所有数值计算可以通过统一管道完成，为后续技能和遗物迁移提供计算引擎。

## Acceptance Criteria

1. `EffectPipeline.resolve(registry, trigger, context)` 返回 `PipelineResult`
2. Phase 1 (before): 收集 phase='before' 的修饰器，若任一行为为 `intercept` 则设 `intercepted=true`，终止后续计算
3. Phase 2 (calculate): 三层计算 — `Σ(base效果) × Π(enhance修饰) × Π(global修饰)`，按 effect.type 分组独立计算（score、multiply、time、gold、shield 各自独立）
4. Phase 3 (after): 收集 phase='after' 的行为修饰器，返回待执行的 `pendingBehaviors` 列表（不在本 Story 执行，留给 11.4）
5. 同 phase 同 layer 内按 priority 升序排序（已由 ModifierRegistry 保证）
6. 条件评估：本 Story 中条件始终视为满足（`condition` 字段忽略），条件系统在 Story 11.3 实现后插入
7. 单元测试：纯 base、base+enhance、三层叠加、拦截终止、链式触发收集、多 effect.type 独立计算
8. 不修改任何现有技能或遗物代码（纯新增）
9. 所有现有测试通过，零回归

## Tasks / Subtasks

- [x] Task 1: 定义 PipelineResult 和 PipelineContext 类型 (AC: #1, #3, #4)
  - [x] 1.1 在 `ModifierTypes.ts` 中新增 `EffectAccumulator` 类型：按 ModifierEffectType 分组的数值结果
  - [x] 1.2 定义 `PipelineResult` 接口：`{ intercepted: boolean; effects: EffectAccumulator; pendingBehaviors: ModifierBehavior[] }`
  - [x] 1.3 定义 `PipelineContext` 接口：传入的上下文（目前为空壳，11.3 条件系统使用）

- [x] Task 2: 实现 EffectPipeline 类 (AC: #1, #2, #3, #4, #5, #6)
  - [x] 2.1 创建 `src/src/systems/modifiers/EffectPipeline.ts`
  - [x] 2.2 实现 `resolve(registry, trigger, context?)` 静态方法
  - [x] 2.3 实现 Phase 1 (before): 从 registry.getByTrigger(trigger, 'before') 收集，检查 behavior.type === 'intercept'，若有则 intercepted=true 并返回
  - [x] 2.4 实现 Phase 2 (calculate): 从 registry.getByTrigger(trigger, 'calculate') 收集，按 layer 分组
  - [x] 2.5 实现三层计算：base 层 effect.value 加法求和；enhance 层 effect.value 乘法累积；global 层 effect.value 乘法累积
  - [x] 2.6 按 effect.type（score/multiply/time/gold/shield）分别独立计算，每种类型各自走三层流程
  - [x] 2.7 实现 Phase 3 (after): 从 registry.getByTrigger(trigger, 'after') 收集 behavior，加入 pendingBehaviors
  - [x] 2.8 条件跳过：当 modifier.condition 存在时目前无视（始终通过），预留 ConditionEvaluator 插入点

- [x] Task 3: 模块导出 (AC: #8)
  - [x] 3.1 更新 `src/src/systems/modifiers/index.ts` 导出 EffectPipeline 和新类型

- [x] Task 4: 单元测试 (AC: #7, #9)
  - [x] 4.1 创建 `src/tests/unit/systems/modifiers/EffectPipeline.test.ts`
  - [x] 4.2 测试空 registry → 返回零值结果，intercepted=false
  - [x] 4.3 测试纯 base 层：单个 score 效果，多个 score 效果加法叠加
  - [x] 4.4 测试 base+enhance：base Σ=15，enhance ×1.5 → 最终 22.5
  - [x] 4.5 测试三层叠加：base Σ=10，enhance ×2，global ×1.5 → 最终 30
  - [x] 4.6 测试拦截终止：before 阶段有 intercept → intercepted=true，effects 全为零
  - [x] 4.7 测试 after 阶段：收集 pendingBehaviors（trigger_adjacent, buff_next_skill 等）
  - [x] 4.8 测试多 effect.type 独立计算：score 和 time 各自独立三层
  - [x] 4.9 测试无匹配 trigger → 返回零值结果
  - [x] 4.10 测试带 condition 的 modifier 目前始终通过（不被过滤）
  - [x] 4.11 全部 1437 个测试通过（+15 新增），零回归

## Dev Notes

### 核心设计（来自头脑风暴文档方向 A）

**三层修饰叠加模型：**
```
Layer 1: BASE（基础层）— 技能本体效果，加法叠加
Layer 2: ENHANCE（增强层）— 被动技能+相邻效果，乘法叠加
Layer 3: GLOBAL（全局层）— 遗物+状态条件，乘法叠加

最终值 = Σ(base效果) × Π(enhance修饰) × Π(global修饰)
```

**三阶段处理流程：**
```
Phase 1: BEFORE — 行为拦截（shield 阻止掉连击等）
Phase 2: CALCULATE — 三层数值计算
Phase 3: AFTER — 触发链式效果（echo、ripple 等）
```

### EffectPipeline API 设计

```typescript
// === 输出类型 ===
interface EffectAccumulator {
  score: number    // 最终分数加成
  multiply: number // 最终倍率加成
  time: number     // 最终时间加成
  gold: number     // 最终金币加成
  shield: number   // 最终护盾数
}

interface PipelineResult {
  intercepted: boolean           // Phase 1 是否拦截
  effects: EffectAccumulator     // Phase 2 计算结果
  pendingBehaviors: ModifierBehavior[]  // Phase 3 待执行行为
}

// === 上下文（预留给 11.3 条件系统） ===
interface PipelineContext {
  // 目前为空，11.3 将添加:
  // combo, wordLength, adjacentSkills, wordSkillCount, etc.
}

// === 管道 ===
class EffectPipeline {
  static resolve(
    registry: ModifierRegistry,
    trigger: ModifierTrigger,
    context?: PipelineContext
  ): PipelineResult
}
```

### 三层计算详细逻辑

对每种 `ModifierEffectType`（score/multiply/time/gold/shield）独立计算：

```typescript
// 1. 收集 phase='calculate' 的修饰器，按 layer 分组
const baseMods = mods.filter(m => m.layer === 'base')
const enhanceMods = mods.filter(m => m.layer === 'enhance')
const globalMods = mods.filter(m => m.layer === 'global')

// 2. 对每种 effect.type 独立计算
for (const effectType of ['score', 'multiply', 'time', 'gold', 'shield']) {
  // Base 层：加法求和
  let baseSum = 0
  for (const mod of baseMods) {
    if (mod.effect?.type === effectType) baseSum += mod.effect.value
  }

  // Enhance 层：乘法累积（每个 enhance 值表示乘数，如 1.5 表示 ×1.5）
  let enhanceProduct = 1
  for (const mod of enhanceMods) {
    if (mod.effect?.type === effectType) enhanceProduct *= mod.effect.value
  }

  // Global 层：乘法累积
  let globalProduct = 1
  for (const mod of globalMods) {
    if (mod.effect?.type === effectType) globalProduct *= mod.effect.value
  }

  // 最终值
  result[effectType] = baseSum * enhanceProduct * globalProduct
}
```

**关键点：**
- 如果某层没有该 effect.type 的修饰器，base 默认为 0，enhance/global 默认为 1
- base 层是加法（0 + 5 + 3 = 8），enhance/global 是乘法（1 × 1.5 × 2 = 3）
- 没有 base 层效果时（baseSum=0），任何乘法都是 0 — 这是正确的设计（没有基础就没有加成）

### 与现有系统的关系

**本 Story 只做纯新增，不改现有代码：**
- 现有 `skills.ts` 的 switch/case → Story 11.5 迁移
- 现有 `RelicEffects.ts` 的 calculate() → Story 11.6 迁移
- 条件评估 → Story 11.3 实现 ConditionEvaluator
- 行为执行 → Story 11.4 实现 BehaviorExecutor

**预留接口：**
- `PipelineContext` 目前为空接口，11.3 将扩展字段
- `pendingBehaviors` 只收集不执行，11.4 将实现 BehaviorExecutor
- 条件判断预留注释 `// TODO: 11.3 ConditionEvaluator.evaluate(mod.condition, context)`

### 已有的 Modifier 类型（来自 11.1）

```typescript
type ModifierLayer = 'base' | 'enhance' | 'global'
type ModifierPhase = 'before' | 'calculate' | 'after'
type ModifierTrigger = 'on_skill_trigger' | 'on_correct_keystroke' | 'on_error' | 'on_word_complete' | 'on_combo_break' | 'on_battle_start' | 'on_battle_end'
type ModifierEffectType = 'score' | 'multiply' | 'time' | 'gold' | 'shield'

interface ModifierEffect {
  type: ModifierEffectType
  value: number
  stacking: 'additive' | 'multiplicative'  // 本 Story 暂不使用 stacking 字段，三层模型已隐含叠加方式
}

type ModifierBehavior =
  | { type: 'intercept' }
  | { type: 'trigger_adjacent' }
  | { type: 'buff_next_skill'; multiplier: number }
  | { type: 'trigger_skill'; targetSkillId: string }
```

### Project Structure Notes

**新增文件（1-2 个）：**
```
src/src/systems/modifiers/
├── ModifierTypes.ts        # 新增 EffectAccumulator, PipelineResult, PipelineContext
├── EffectPipeline.ts       # 三层计算管道实现（新增）
├── ModifierRegistry.ts     # 不修改
└── index.ts                # 更新导出

src/tests/unit/systems/modifiers/
├── ModifierRegistry.test.ts  # 不修改
└── EffectPipeline.test.ts    # 单元测试（新增）
```

**不修改的文件：**
- `src/src/systems/skills.ts` — 不改（Story 11.5）
- `src/src/systems/relics/` — 不改（Story 11.6）
- `src/src/core/types.ts` — 不改
- `src/src/systems/modifiers/ModifierRegistry.ts` — 不改

### 测试模式参考

沿用 11.1 的测试模式：

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'
import type { Modifier } from '../../../../src/systems/modifiers/ModifierTypes'

function createTestModifier(overrides: Partial<Modifier> = {}): Modifier {
  return {
    id: 'test:mod:1',
    source: 'test:mod',
    sourceType: 'skill',
    layer: 'base',
    trigger: 'on_skill_trigger',
    phase: 'calculate',
    priority: 100,
    effect: { type: 'score', value: 5, stacking: 'additive' },
    ...overrides,
  }
}

describe('EffectPipeline', () => {
  let registry: ModifierRegistry

  beforeEach(() => {
    registry = new ModifierRegistry()
  })

  // ... tests
})
```

### References

- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#方向 A — 三层修饰叠加模型]
- [Source: docs/epics.md#Epic 11, Story 11.2]
- [Source: docs/stories/11-1-modifier-interface-registry.md — 11.1 完成笔记]
- [Source: src/src/systems/modifiers/ModifierTypes.ts — Modifier 类型定义]
- [Source: src/src/systems/modifiers/ModifierRegistry.ts — 注册中心 API]
- [Source: src/src/systems/skills.ts — 当前 triggerSkill() switch/case]
- [Source: src/src/systems/relics/RelicEffects.ts — 当前遗物效果计算模式]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 在 ModifierTypes.ts 中新增 3 个类型：EffectAccumulator（5 种 effect.type 的数值结果）、PipelineResult（intercepted + effects + pendingBehaviors）、PipelineContext（空壳预留 11.3）
- 实现 EffectPipeline.resolve() 静态方法，三阶段处理：
  - Phase 1 (before): 遍历 before 修饰器，发现 intercept 行为立即返回 intercepted=true
  - Phase 2 (calculate): 按 effect.type 独立走三层计算 — base 加法 → enhance 乘法 → global 乘法
  - Phase 3 (after): 收集 behavior 到 pendingBehaviors 列表
- 条件字段暂时忽略（始终通过），预留 3 处 TODO 注释供 11.3 插入 ConditionEvaluator
- 13 个新增单元测试覆盖：空 registry、纯 base、base+enhance、三层叠加、多 enhance 累积、拦截终止、非拦截 before、after 行为收集、多 effect.type 独立、无匹配 trigger、条件忽略、无 base 时结果为零
- 全部 1437 个测试通过（1422 existing + 15 new），零回归
- Code review 补充 2 个测试：effect+behavior 共存验证、多 before 修饰器混合 intercept
- 纯新增代码，未修改任何现有技能或遗物文件

### File List

- `src/src/systems/modifiers/ModifierTypes.ts` — 新增 EffectAccumulator, PipelineResult, PipelineContext 类型（修改）
- `src/src/systems/modifiers/EffectPipeline.ts` — 三层计算管道实现（新增）
- `src/src/systems/modifiers/index.ts` — 更新导出（修改）
- `src/tests/unit/systems/modifiers/EffectPipeline.test.ts` — 单元测试（新增）
