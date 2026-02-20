# Story 11.1: Modifier 接口与注册中心

Status: done

## Story

As a 开发者,
I want 一个统一的 Modifier 接口和 ModifierRegistry，作为效果管道的数据层,
so that 所有技能和遗物效果可以用统一的数据结构表达，为后续管道计算和迁移奠定基础。

## Acceptance Criteria

1. 定义 `Modifier` 接口，包含 id, source, layer, trigger, phase, condition, effect, behavior, priority
2. 定义 `ModifierCondition` 接口，支持 12 种条件原语（见设计文档方向 A）
3. 定义 `ModifierEffect` 和 `ModifierBehavior` 类型
4. 实现 `ModifierRegistry` 类：register(modifier), unregister(id), getByTrigger(trigger), getBySource(sourceId), getAll(), clear()
5. 批量操作：registerMany(modifiers), unregisterBySource(sourceId)
6. 注册中心可按 trigger + phase 过滤查询，并按 priority 排序返回
7. 所有新代码有单元测试，覆盖注册/查询/移除/批量操作
8. 不修改任何现有技能或遗物代码（纯新增）
9. 所有现有 1402 个测试通过，零回归

## Tasks / Subtasks

- [x] Task 1: 定义 Modifier 类型系统 (AC: #1, #2, #3)
  - [x] 1.1 在 `src/src/systems/modifiers/ModifierTypes.ts` 中定义所有类型
  - [x] 1.2 导出 ModifierLayer, ModifierPhase, ModifierTrigger, ModifierEffectType 等枚举/联合类型
  - [x] 1.3 定义 ModifierCondition 接口（12 种条件原语）
  - [x] 1.4 定义 ModifierEffect 接口（数值效果）
  - [x] 1.5 定义 ModifierBehavior 类型（行为效果）
  - [x] 1.6 定义完整 Modifier 接口

- [x] Task 2: 实现 ModifierRegistry (AC: #4, #5, #6)
  - [x] 2.1 创建 `src/src/systems/modifiers/ModifierRegistry.ts`
  - [x] 2.2 实现 register(modifier) — 重复 id 覆盖
  - [x] 2.3 实现 unregister(id) — 按 id 移除
  - [x] 2.4 实现 getByTrigger(trigger, phase?) — 按触发类型查询，可选按 phase 过滤
  - [x] 2.5 实现 getBySource(sourceId) — 按来源查询
  - [x] 2.6 实现 registerMany(modifiers) 和 unregisterBySource(sourceId)
  - [x] 2.7 查询结果按 priority 升序排序
  - [x] 2.8 实现 getAll(), has(), count(), clear()

- [x] Task 3: 模块导出 (AC: #8)
  - [x] 3.1 创建 `src/src/systems/modifiers/index.ts` 统一导出

- [x] Task 4: 单元测试 (AC: #7, #9)
  - [x] 4.1 创建 `src/tests/unit/systems/modifiers/ModifierRegistry.test.ts`
  - [x] 4.2 测试 register/unregister 基本操作
  - [x] 4.3 测试 id 唯一性校验（重复注册覆盖旧值）
  - [x] 4.4 测试 getByTrigger 查询和 phase 过滤
  - [x] 4.5 测试 getBySource 查询
  - [x] 4.6 测试 registerMany/unregisterBySource 批量操作
  - [x] 4.7 测试 priority 排序（getByTrigger, getBySource, getAll 三处）
  - [x] 4.8 测试 clear()
  - [x] 4.9 全部 1422 个测试通过（+20 新增），零回归

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

### Modifier 接口定义参考

```typescript
// === 层级 ===
type ModifierLayer = 'base' | 'enhance' | 'global'

// === 阶段 ===
type ModifierPhase = 'before' | 'calculate' | 'after'

// === 触发事件类型 ===
// 复用 EventBus 已有事件 + 新增
type ModifierTrigger =
  | 'on_skill_trigger'      // 技能触发时
  | 'on_correct_keystroke'   // 正确击键时
  | 'on_error'               // 打错时
  | 'on_word_complete'       // 完成词语时
  | 'on_combo_break'         // 连击中断时
  | 'on_battle_start'        // 战斗开始
  | 'on_battle_end'          // 战斗结束

// === 效果类型 ===
type ModifierEffectType = 'score' | 'multiply' | 'time' | 'gold' | 'shield'

interface ModifierEffect {
  type: ModifierEffectType
  value: number
  stacking: 'additive' | 'multiplicative'
}

// === 行为类型 ===
type ModifierBehavior =
  | { type: 'intercept' }                        // 拦截事件（如 shield）
  | { type: 'trigger_adjacent' }                 // 触发相邻技能（如 echo）
  | { type: 'buff_next_skill'; multiplier: number } // 增强下一个技能（如 ripple）
  | { type: 'trigger_skill'; targetSkillId: string } // 触发指定技能（如 mirror）

// === 条件系统（12 种原语） ===
type ModifierCondition =
  // 战斗状态
  | { type: 'combo_gte'; value: number }
  | { type: 'combo_lte'; value: number }
  | { type: 'no_errors' }
  | { type: 'random'; probability: number }
  // 位置
  | { type: 'adjacent_skills_gte'; value: number }
  | { type: 'adjacent_empty_gte'; value: number }
  | { type: 'adjacent_has_type'; skillType: string }
  // 词语
  | { type: 'word_length_gte'; value: number }
  | { type: 'word_length_lte'; value: number }
  | { type: 'word_has_letter'; letter: string }
  // 上下文
  | { type: 'skills_triggered_this_word'; value: number }
  | { type: 'nth_word'; value: number }

// === 完整 Modifier 接口 ===
interface Modifier {
  id: string                    // 唯一标识，如 'skill:burst:score' 或 'relic:magnet:word_bias'
  source: string                // 来源标识，如 'skill:burst' 或 'relic:magnet'
  sourceType: 'skill' | 'relic' | 'passive' | 'letter'
  layer: ModifierLayer
  trigger: ModifierTrigger
  phase: ModifierPhase
  condition?: ModifierCondition
  effect?: ModifierEffect       // 数值效果（和 behavior 二选一或都有）
  behavior?: ModifierBehavior   // 行为效果
  priority: number              // 越小越先执行，默认 100
}
```

### 与现有系统的关系

**本 Story 只做纯新增，不改现有代码：**
- 现有 `skills.ts` 的 switch/case → Story 11.5 迁移
- 现有 `RelicEffects.ts` 的 calculate() → Story 11.6 迁移
- 现有 `RelicTypes.ts` 的 RelicEffect/RelicModifiers → 保留兼容，11.6 统一

**已有的可参考模式：**
- `RelicEffects.calculate(relics, triggerType, context)` → 类似 ModifierRegistry.getByTrigger()
- `RelicCondition` 接口 → 扩展为 ModifierCondition（12 种原语 vs 现有 3 种）
- `RelicModifiers` → 未来被 EffectPipeline 的输出替代（Story 11.2）
- `SynergyState` → wordSkillCount 等字段将成为条件上下文

### ModifierRegistry API 设计

```typescript
class ModifierRegistry {
  // 注册
  register(modifier: Modifier): void
  registerMany(modifiers: Modifier[]): void

  // 移除
  unregister(id: string): void
  unregisterBySource(source: string): void

  // 查询（返回按 priority 升序排序的数组）
  getByTrigger(trigger: ModifierTrigger, phase?: ModifierPhase): Modifier[]
  getBySource(source: string): Modifier[]
  getAll(): Modifier[]

  // 工具
  has(id: string): boolean
  count(): number
  clear(): void
}
```

**ID 命名约定：**
- 技能: `skill:{skillId}:{effect}` → 如 `skill:burst:score`, `skill:echo:chain`
- 遗物: `relic:{relicId}:{effect}` → 如 `relic:magnet:word_bias`, `relic:glass_cannon:damage`
- 字母: `letter:{key}:upgrade` → 如 `letter:e:upgrade`

**Source 命名约定：**
- 技能: `skill:{skillId}` → 如 `skill:burst`
- 遗物: `relic:{relicId}` → 如 `relic:magnet`
- 字母: `letter:{key}` → 如 `letter:e`

### Project Structure Notes

**新增文件（3 个）：**
```
src/src/systems/modifiers/
├── ModifierTypes.ts        # 所有类型定义
├── ModifierRegistry.ts     # 注册中心实现
└── index.ts                # 统一导出

src/tests/unit/systems/modifiers/
└── ModifierRegistry.test.ts  # 单元测试
```

**不修改的文件：**
- `src/src/core/types.ts` — 不添加 Modifier 类型（放在独立模块中）
- `src/src/systems/skills.ts` — 不改（Story 11.5）
- `src/src/systems/relics/` — 不改（Story 11.6）
- `src/src/data/skills.ts` — 不改（Story 11.5）
- `src/src/data/relics.ts` — 不改（Story 11.6）

### 测试模式参考

参考 `src/tests/unit/systems/relics/RelicSystem.test.ts` 的模式：

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import type { Modifier } from '../../../../src/systems/modifiers/ModifierTypes'

// 测试工厂函数
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

describe('ModifierRegistry', () => {
  let registry: ModifierRegistry

  beforeEach(() => {
    registry = new ModifierRegistry()
  })

  // ... tests
})
```

### References

- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#方向 A — Modifier 接口定义]
- [Source: docs/epics.md#Epic 11, Story 11.1]
- [Source: src/src/systems/relics/RelicTypes.ts — 现有 RelicEffect/RelicCondition 接口]
- [Source: src/src/systems/relics/RelicEffects.ts — 现有效果处理模式]
- [Source: src/src/systems/skills.ts — 需要被替换的 switch/case]
- [Source: src/src/core/constants.ts — ADJACENT_KEYS, SKILL_EFFECTS]
- [Source: src/src/core/events/EventBus.ts — GameEvents 事件类型]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 定义了完整的 Modifier 类型系统：7 个类型/接口（ModifierLayer, ModifierPhase, ModifierTrigger, ModifierSourceType, ModifierEffectType, ModifierEffect, ModifierBehavior, ModifierCondition, Modifier）
- ModifierCondition 支持 12 种条件原语（4 战斗状态 + 3 位置 + 3 词语 + 2 上下文）
- ModifierBehavior 支持 4 种行为类型（intercept, trigger_adjacent, buff_next_skill, trigger_skill）
- 实现 ModifierRegistry：register/unregister/getByTrigger/getBySource/registerMany/unregisterBySource/getAll/has/count/clear
- 重复 id 注册采用覆盖策略（简单可靠）
- 所有查询结果按 priority 升序排序
- 返回值为独立副本，修改不影响内部状态
- 20 个新增单元测试，全部 1422 个测试通过，零回归
- 纯新增代码，未修改任何现有文件

### File List

- `src/src/systems/modifiers/ModifierTypes.ts` — Modifier 类型定义（新增）
- `src/src/systems/modifiers/ModifierRegistry.ts` — 注册中心实现（新增）
- `src/src/systems/modifiers/index.ts` — 模块导出（新增）
- `src/tests/unit/systems/modifiers/ModifierRegistry.test.ts` — 单元测试（新增）
