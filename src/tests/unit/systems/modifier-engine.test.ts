// Story 59.4 — ModifierEngine 单元测试
//
// 覆盖原始 AC4 + code-review F1/F2/F3/M2/L1 的修复保护。

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EVALUATION_ORDER,
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

/** Host 工厂，支持指定 scope 覆盖（用于跨 scope 测试）。 */
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
    const mods = [
      additive('a', 5),
      multiplicative('m', 2),
      conditional('yes', (ctx) => ctx.baseValue === 30, 100),
    ]
    expect(engine.resolve(10, mods, 'score')).toBe(130)
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

// ---- F3 regression: priority 测试必须用 order-capturing fixture，不能用可交换的 additive ----
describe('priority ordering (F3 regression)', () => {
  const engine = new ModifierEngine()

  it('同 kind 多 modifier 按 priority 升序应用（order-capturing fixture）', () => {
    const order: string[] = []
    const probe = (id: string, priority: number): EngineModifier => ({
      id,
      source: 'skill',
      kind: 'additive',
      scope: 'score',
      priority,
      apply(ctx) {
        order.push(id)
        return { value: ctx.baseValue, applied: true }
      },
    })
    // 乱序传入：priority=5 的先执行，priority=10 的次之
    engine.resolve(0, [probe('p10', 10), probe('p5', 5)], 'score')
    expect(order).toEqual(['p5', 'p10'])
  })

  it('undefined priority 默认 100，显式 priority=50 先于它', () => {
    const order: string[] = []
    const probe = (id: string, priority?: number): EngineModifier => ({
      id,
      source: 'skill',
      kind: 'additive',
      scope: 'score',
      priority,
      apply(ctx) {
        order.push(id)
        return { value: ctx.baseValue, applied: true }
      },
    })
    engine.resolve(0, [probe('no-prio'), probe('p50', 50)], 'score')
    expect(order).toEqual(['p50', 'no-prio'])
  })

  it('M5: 相等 priority 按输入顺序 (stable sort) tie-break', () => {
    const order: string[] = []
    const probe = (id: string): EngineModifier => ({
      id,
      source: 'skill',
      kind: 'additive',
      scope: 'score',
      priority: 100,
      apply(ctx) {
        order.push(id)
        return { value: ctx.baseValue, applied: true }
      },
    })
    engine.resolve(0, [probe('first'), probe('second'), probe('third')], 'score')
    expect(order).toEqual(['first', 'second', 'third'])
  })
})

// ---- F1 regression: NaN / Infinity / 非 number 守卫 ----
describe('F1 regression: finite guard', () => {
  const engine = new ModifierEngine()
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // prod 模式下我们期望 warn+continue；vi.stubEnv 控制 import.meta.env.DEV
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('DEV', '')
  })
  afterEach(() => {
    warnSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  it('baseValue 非 finite 直接 throw', () => {
    expect(() => engine.resolve(NaN, [], 'score')).toThrow(/must be finite/)
    expect(() => engine.resolve(Infinity, [], 'score')).toThrow(/must be finite/)
    expect(() => engine.resolve(-Infinity, [], 'score')).toThrow(/must be finite/)
  })

  it('modifier 返回 NaN 时 prod 模式 warn + 保留上一步 value', () => {
    const nanMod: EngineModifier = {
      id: 'nan-mod',
      source: 'skill',
      kind: 'additive',
      scope: 'score',
      apply: () => ({ value: NaN, applied: true }),
    }
    const mods = [additive('good', 5), nanMod, additive('after', 10)]
    // base=10, +5 → 15, NaN skipped → 15, +10 → 25
    expect(engine.resolve(10, mods, 'score')).toBe(25)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('nan-mod'))
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('non-finite'))
  })

  it('modifier 返回 Infinity 时被丢弃', () => {
    const infMod: EngineModifier = {
      id: 'inf-mod',
      source: 'relic',
      kind: 'multiplicative',
      scope: 'score',
      apply: () => ({ value: Infinity, applied: true }),
    }
    // base=10, +5 → 15, Infinity skipped → 15
    expect(engine.resolve(10, [additive('a', 5), infMod], 'score')).toBe(15)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('modifier 返回 0 × Infinity = NaN 的中间态被丢弃', () => {
    const badMul: EngineModifier = {
      id: 'bad-mul',
      source: 'affix',
      kind: 'multiplicative',
      scope: 'score',
      apply: (ctx) => ({ value: ctx.baseValue * Infinity, applied: true }),
    }
    // base=0, *Inf = NaN → skipped → 0
    expect(engine.resolve(0, [badMul], 'score')).toBe(0)
  })

  it('modifier 返回非 number（TS cast 绕过）时被丢弃', () => {
    const weirdMod: EngineModifier = {
      id: 'weird',
      source: 'skill',
      kind: 'additive',
      scope: 'score',
      apply: () => ({ value: 'broken' as unknown as number, applied: true }),
    }
    expect(engine.resolve(10, [weirdMod], 'score')).toBe(10) // 保留 baseValue
    expect(warnSpy).toHaveBeenCalled()
  })

  it('applied=false 的非 finite value 不触发 warn（被 applied 分支吞掉）', () => {
    const skippedMod: EngineModifier = {
      id: 'skipped-nan',
      source: 'wordpack',
      kind: 'conditional',
      scope: 'score',
      apply: () => ({ value: NaN, applied: false }),
    }
    expect(engine.resolve(10, [skippedMod], 'score')).toBe(10)
    expect(warnSpy).not.toHaveBeenCalled()
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
    const result = engine.resolve(0, mods, 'score')
    expect(result).toBe(100)
  })

  // ---- F2 regression: dedup 只在同 scope 内生效 ----
  it('F2: Meta host 用错误 scope 声明时 override 失效（文档化行为）', () => {
    // metaHost 以为能 override，但用了 scope='timer'，被 scope 过滤丢弃
    const metaHost = host([
      { ...additive('shared', 999), scope: 'timer' }, // wrong scope
    ])
    const runHost = host([additive('shared', 1)]) // scope='score'
    const mods = engine.collectActive([metaHost, runHost], 'score')
    expect(mods).toHaveLength(1)
    // Meta 的 scope='timer' 被 scope 过滤丢弃，run 的 shared 未被 dedup
    // 结果是 run 的 shared（delta=1），override 静默失效
    const result = engine.resolve(0, mods, 'score')
    expect(result).toBe(1)
  })
})

describe('契约断言', () => {
  const engine = new ModifierEngine()

  it('L1: EVALUATION_ORDER 被直接 export 且值固定', () => {
    // 直接对导出常量断言，比观察行为更强
    expect(EVALUATION_ORDER).toEqual(['additive', 'multiplicative', 'conditional', 'transform'])
  })

  it('EVALUATION_ORDER 的 runtime 执行顺序与导出常量一致', () => {
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
    engine.resolve(
      0,
      [mk('transform'), mk('conditional'), mk('multiplicative'), mk('additive')],
      'score',
    )
    expect(order).toEqual([...EVALUATION_ORDER])
  })

  it('resolve 对输入 modifiers 是纯函数（不修改原数组）', () => {
    const mods: EngineModifier[] = [multiplicative('m', 2), additive('a', 5)]
    const snapshot = mods.map((m) => m.id)
    engine.resolve(10, mods, 'score')
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

  // ---- M2: 纯性契约的 fixture（非强制，只是发现违反时给 signal） ----
  it('M2: 同一 modifier 对相同 ctx 多次调用应返回相同结果', () => {
    // 纯 modifier：可以安全地多次调用
    const pure = additive('pure', 7)
    const ctx: EngineModifierContext = { scope: 'score', baseValue: 10 }
    const r1 = pure.apply(ctx)
    const r2 = pure.apply(ctx)
    expect(r1).toEqual(r2)
    expect(r1.value).toBe(17)
  })
})
