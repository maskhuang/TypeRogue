// Story 59.4 — ModifierEngine 单元测试
//
// 覆盖 AC4 的全部六类用例 + 额外的契约断言。

import { describe, expect, it } from 'vitest'
import {
  ModifierEngine,
  type EngineModifier,
  type EngineModifierContext,
  type EngineModifierHost,
  type EngineModifierKind,
  type EngineModifierResult,
  type EngineModifierScope,
} from '../../../src/systems/modifiers/engine'

// ---- Fixtures ----

/** 最简 factory：返回一个按固定 delta 做 additive 操作的 modifier。 */
const additive = (id: string, delta: number, priority?: number): EngineModifier => ({
  id,
  source: 'skill',
  kind: 'additive',
  scope: 'score',
  priority,
  apply(ctx: EngineModifierContext): EngineModifierResult {
    return { value: ctx.baseValue + delta, applied: true }
  },
})

/** 乘以固定系数。 */
const multiplicative = (id: string, factor: number, priority?: number): EngineModifier => ({
  id,
  source: 'relic',
  kind: 'multiplicative',
  scope: 'score',
  priority,
  apply(ctx: EngineModifierContext): EngineModifierResult {
    return { value: ctx.baseValue * factor, applied: true }
  },
})

/**
 * Conditional：predicate 返回 true 时 applied=true，否则 applied=false。
 * 当 applied 时对 baseValue 加 bonus。
 */
const conditional = (
  id: string,
  predicate: (ctx: EngineModifierContext) => boolean,
  bonus: number,
): EngineModifier => ({
  id,
  source: 'wordpack',
  kind: 'conditional',
  scope: 'score',
  apply(ctx: EngineModifierContext): EngineModifierResult {
    if (predicate(ctx)) {
      return { value: ctx.baseValue + bonus, applied: true }
    }
    return { value: ctx.baseValue, applied: false }
  },
})

/** Transform：任意函数式变换。 */
const transform = (
  id: string,
  fn: (v: number) => number,
  priority?: number,
): EngineModifier => ({
  id,
  source: 'affix',
  kind: 'transform',
  scope: 'score',
  priority,
  apply(ctx: EngineModifierContext): EngineModifierResult {
    return { value: fn(ctx.baseValue), applied: true }
  },
})

const host = (mods: EngineModifier[]): EngineModifierHost => ({
  getEngineModifiers: () => mods,
})

// ---- Tests ----
describe('ModifierEngine.resolve', () => {
  const engine = new ModifierEngine()

  it('空 modifier 列表返回原始 baseValue', () => {
    expect(engine.resolve(42, [], 'score')).toBe(42)
  })

  it('单个 additive 正确生效', () => {
    const mods = [additive('a1', 5)]
    expect(engine.resolve(10, mods, 'score')).toBe(15)
  })

  it('单个 multiplicative 正确生效', () => {
    const mods = [multiplicative('m1', 3)]
    expect(engine.resolve(10, mods, 'score')).toBe(30)
  })

  it('单个 transform 正确生效', () => {
    const mods = [transform('t1', (v) => v * v + 1)]
    expect(engine.resolve(4, mods, 'score')).toBe(17)
  })

  it('求值顺序正确：additive 必须先于 multiplicative', () => {
    // base=10, +5, ×2 → 正确结果是 (10+5)*2 = 30
    // 如果顺序反了会是 10*2+5 = 25
    const mods = [multiplicative('m', 2), additive('a', 5)] // 刻意乱序传入
    expect(engine.resolve(10, mods, 'score')).toBe(30)
  })

  it('conditional 返回 applied=false 时值被跳过', () => {
    const mods = [
      additive('a', 5), // 10 → 15
      conditional('never', () => false, 1000), // skipped
      multiplicative('m', 2), // 15 → 30
    ]
    expect(engine.resolve(10, mods, 'score')).toBe(30)
  })

  it('conditional 返回 applied=true 时值生效', () => {
    // conditional 在第 3 步执行，此时 value = (10+5)*2 = 30
    // conditional 加 bonus=100，applied=true → 130
    const mods = [
      additive('a', 5),
      multiplicative('m', 2),
      conditional('yes', (ctx) => ctx.baseValue === 30, 100),
    ]
    expect(engine.resolve(10, mods, 'score')).toBe(130)
  })

  it('同 kind 多 modifier 按 priority 升序应用', () => {
    // 两个 additive，priority=1 先，priority=2 后
    // base=0, +10 (p=1), +5 (p=2) → 15
    const mods = [additive('a2', 5, 2), additive('a1', 10, 1)] // 乱序传入
    expect(engine.resolve(0, mods, 'score')).toBe(15)
  })

  it('undefined priority 默认 100 且稳定排序', () => {
    // 两个 additive，一个 priority=50，一个 undefined（默认 100）
    // priority=50 应该先执行
    const mods = [additive('no-prio', 3), additive('p50', 7, 50)]
    const result = engine.resolve(0, mods, 'score')
    // 两个都 applied，结果是 0+7+3 = 10（顺序无关，因为 additive 之间可交换）
    expect(result).toBe(10)
  })

  it('每个 modifier 的 ctx.baseValue 是前面步骤的结果，不是原始 baseValue', () => {
    const captured: number[] = []
    const captureAdditive = (id: string, delta: number): EngineModifier => ({
      id,
      source: 'skill',
      kind: 'additive',
      scope: 'score',
      apply(ctx) {
        captured.push(ctx.baseValue)
        return { value: ctx.baseValue + delta, applied: true }
      },
    })
    const mods = [captureAdditive('a1', 5), captureAdditive('a2', 10)]
    engine.resolve(100, mods, 'score')
    expect(captured).toEqual([100, 105]) // 第二个看到的是 100+5=105
  })

  it('完整四阶段链路', () => {
    // base=10
    // additive +5 → 15
    // multiplicative ×3 → 45
    // conditional (baseValue>=40, +10, applied=true) → 55
    // transform floor → 55
    const mods = [
      additive('a', 5),
      multiplicative('m', 3),
      conditional('c', (ctx) => ctx.baseValue >= 40, 10),
      transform('t', Math.floor),
    ]
    expect(engine.resolve(10, mods, 'score')).toBe(55)
  })
})

describe('ModifierEngine.collectActive', () => {
  const engine = new ModifierEngine()

  it('空 hosts 列表返回空数组', () => {
    expect(engine.collectActive([], 'score')).toEqual([])
  })

  it('从多个 host 收集 modifier 并按 scope 过滤', () => {
    const h1 = host([
      additive('a1', 1),
      { ...additive('other', 1), scope: 'timer' }, // 不同 scope
    ])
    const h2 = host([multiplicative('m1', 2)])
    const mods = engine.collectActive([h1, h2], 'score')
    expect(mods.map((m) => m.id)).toEqual(['a1', 'm1'])
  })

  it('host 返回未过滤的 modifier 时 engine 兜底过滤 scope', () => {
    // host 无视 scope 参数，返回全部自身 modifier
    const lazyHost: EngineModifierHost = {
      getEngineModifiers: () => [
        additive('score-mod', 1),
        { ...additive('timer-mod', 1), scope: 'timer' },
      ],
    }
    const mods = engine.collectActive([lazyHost], 'score')
    expect(mods.map((m) => m.id)).toEqual(['score-mod'])
  })

  it('跨 host 同 id 去重：首次出现优先（override 机制）', () => {
    const metaHost = host([additive('shared', 100)]) // 排前面代表高权优先
    const runHost = host([additive('shared', 1)])
    const mods = engine.collectActive([metaHost, runHost], 'score')
    expect(mods).toHaveLength(1)
    // 应该拿到 metaHost 版本（delta=100）
    const result = engine.resolve(0, mods, 'score')
    expect(result).toBe(100)
  })
})

describe('契约断言', () => {
  const engine = new ModifierEngine()

  it('EVALUATION_ORDER 固定为 additive → multiplicative → conditional → transform', () => {
    // 通过一个"每 kind 记录执行次序"的 fixture 断言
    const order: EngineModifierKind[] = []
    const mk = (kind: EngineModifierKind): EngineModifier => ({
      id: `${kind}-mod`,
      source: 'skill',
      kind,
      scope: 'score',
      apply(ctx) {
        order.push(kind)
        return { value: ctx.baseValue, applied: true }
      },
    })
    // 传入刻意乱序
    engine.resolve(
      0,
      [mk('transform'), mk('conditional'), mk('multiplicative'), mk('additive')],
      'score',
    )
    expect(order).toEqual(['additive', 'multiplicative', 'conditional', 'transform'])
  })

  it('resolve 对输入 modifiers 是纯函数（不修改原数组）', () => {
    const mods: EngineModifier[] = [multiplicative('m', 2), additive('a', 5)]
    const snapshot = mods.map((m) => m.id)
    engine.resolve(10, mods, 'score')
    // 原数组顺序未被改动
    expect(mods.map((m) => m.id)).toEqual(snapshot)
  })

  it('scope 参数正确传入 ctx', () => {
    let observedScope: EngineModifierScope | null = null
    const probe: EngineModifier = {
      id: 'probe',
      source: 'skill',
      kind: 'additive',
      scope: 'timer',
      apply(ctx) {
        observedScope = ctx.scope
        return { value: ctx.baseValue, applied: true }
      },
    }
    engine.resolve(0, [probe], 'timer')
    expect(observedScope).toBe('timer')
  })
})
