// ============================================
// 打字肉鸽 - affixV2 附魔层 · mark / ally 附魔单元测试
// ============================================
// 覆盖：applyEnchantToEffect 模板行为（并行挂载 + 宿主同 scope 继承 + doubleIfMatch B 不重复挂）·
//       getEnchantDisplay / listEnchantIds 注册。

import { describe, it, expect } from 'vitest'
import {
  applyEnchantToEffect,
  getEnchantDisplay,
  listEnchantIds,
  type EnchantSpec,
} from '../../../src/data/affixV2Enchant'
import { resolveEffect, type ResolveContext } from '../../../src/systems/affixV2Effect'
import type { EffectSpec, TargetSelector } from '../../../src/data/affixV2Trigger'

const MARK: EnchantSpec = { id: 'mark' }
const ALLY: EnchantSpec = { id: 'ally' }
const ETERNAL: EnchantSpec = { id: 'eternal' }
const SCOPE: TargetSelector = { type: 'matched_resource', resource: 'score' }

/** resolveEffect 用 ctx · resolveSelector：self → [host]，其它 → [host, other] */
function makeCtx(over: Partial<ResolveContext> = {}): ResolveContext {
  return {
    instanceId: 'inst_1',
    skillId: 'skill_1',
    key: 'K',
    skillResource: 'score',
    skillResourceLv1Base: 11,
    resourceLv1Base: (r) => ({ score: 11, time: 0.2, gold: 3, shield: 5 } as Record<string, number>)[r] ?? 1,
    nowMs: 1000,
    isCrit: false,
    currentWordLength: 5,
    hostSkillLevel: 1,
    getPlayerResource: () => 0,
    resolveSelector: (sel) => (sel.type === 'self' ? ['skill_1'] : ['skill_1', 'skill_2']),
    ...over,
  }
}

describe('mark / ally 已注册', () => {
  it('listEnchantIds 含 mark 与 ally', () => {
    const ids = listEnchantIds()
    expect(ids).toContain('mark')
    expect(ids).toContain('ally')
  })

  it('display 返回中英文名', () => {
    expect(getEnchantDisplay(MARK, 'zh').name).toBe('瞩目')
    expect(getEnchantDisplay(MARK, 'en').name).toBe('Focal')
    expect(getEnchantDisplay(ALLY, 'zh').name).toBe('聚众')
    expect(getEnchantDisplay(ALLY, 'en').name).toBe('Rallying')
  })
})

describe('eternal 附魔 · 移除使用次数限制（effect 不变）', () => {
  it('listEnchantIds 含 eternal · display 中英文名', () => {
    expect(listEnchantIds()).toContain('eternal')
    expect(getEnchantDisplay(ETERNAL, 'zh').name).toBe('永恒')
    expect(getEnchantDisplay(ETERNAL, 'en').name).toBe('Eternal')
  })

  it('applyEnchantToEffect 不改宿主产出（doubleIfMatch/parallel 均 noop）', () => {
    const host: EffectSpec = { kind: 'gain_resource', resource: 'score', ratio: 1 }
    const enchanted = resolveEffect(applyEnchantToEffect(host, ETERNAL), makeCtx())
    const plain = resolveEffect(host, makeCtx())
    expect(enchanted.resourceProduced).toEqual(plain.resourceProduced)   // 产出一致 = effect 未被修饰
  })
})

describe('mark 附魔 · 并行 apply_mark', () => {
  it('宿主无 selector → 并行 apply_mark fallback self', () => {
    const host: EffectSpec = { kind: 'gain_resource', resource: 'score', ratio: 0.1 }
    const out = applyEnchantToEffect(host, MARK)
    expect(out.kind).toBe('composite')
    if (out.kind !== 'composite') return
    expect(out.effects[0]).toEqual(host)
    expect(out.effects[1]).toEqual({ kind: 'apply_mark', selector: { type: 'self' } })
  })

  it('宿主带 selector → 并行 apply_mark 继承宿主同 scope', () => {
    const host: EffectSpec = { kind: 'add', ratio: 0.5, selector: SCOPE }
    const out = applyEnchantToEffect(host, MARK)
    expect(out.kind).toBe('composite')
    if (out.kind !== 'composite') return
    expect(out.effects[1]).toEqual({ kind: 'apply_mark', selector: SCOPE })
  })

  it('宿主已是 apply_mark → B：返回原 effect 不变（不重复挂）', () => {
    const host: EffectSpec = { kind: 'apply_mark', selector: SCOPE }
    const out = applyEnchantToEffect(host, MARK)
    expect(out).toEqual(host)
    expect(out.kind).not.toBe('composite')
  })
})

describe('ally 附魔 · 并行 apply_ally', () => {
  it('宿主带 selector → 并行 apply_ally 继承宿主同 scope', () => {
    const host: EffectSpec = { kind: 'multiply', amount: 0.2, selector: SCOPE }
    const out = applyEnchantToEffect(host, ALLY)
    expect(out.kind).toBe('composite')
    if (out.kind !== 'composite') return
    expect(out.effects[1]).toEqual({ kind: 'apply_ally', selector: SCOPE })
  })

  it('宿主已是 apply_ally → B：返回原 effect 不变', () => {
    const host: EffectSpec = { kind: 'apply_ally', selector: SCOPE }
    const out = applyEnchantToEffect(host, ALLY)
    expect(out).toEqual(host)
  })

  it('apply_ally 宿主被 mark 附魔 → 继承 apply_ally 的 scope', () => {
    const host: EffectSpec = { kind: 'apply_ally', selector: SCOPE }
    const out = applyEnchantToEffect(host, MARK)
    expect(out.kind).toBe('composite')
    if (out.kind !== 'composite') return
    expect(out.effects[1]).toEqual({ kind: 'apply_mark', selector: SCOPE })
  })
})

describe('rr 附魔 · 并行 convert_resource（无 scope）', () => {
  const RR: EnchantSpec = { id: 'rr', from: 'score', to: 'gold' }

  it('display 返回中英文名', () => {
    expect(getEnchantDisplay(RR, 'zh').name).toBe('回流')
    expect(getEnchantDisplay(RR, 'en').name).toBe('Refluent')
    expect(listEnchantIds()).toContain('rr')
  })

  it('宿主任意 effect → 并行 convert_resource{from,to}（忽略 scope）', () => {
    const host: EffectSpec = { kind: 'add', ratio: 0.5, selector: SCOPE }
    const out = applyEnchantToEffect(host, RR)
    expect(out.kind).toBe('composite')
    if (out.kind !== 'composite') return
    expect(out.effects[1]).toEqual({ kind: 'convert_resource', from: 'score', to: 'gold', ratio: 0.1 })
  })

  it('宿主已是同向 convert_resource → ratio ×2（不并行）', () => {
    const host: EffectSpec = { kind: 'convert_resource', from: 'score', to: 'gold', ratio: 0.3 }
    const out = applyEnchantToEffect(host, RR)
    expect(out).toEqual({ kind: 'convert_resource', from: 'score', to: 'gold', ratio: 0.6 })
  })

  it('宿主 convert_resource 但方向不同 → 并行（不 double）', () => {
    const host: EffectSpec = { kind: 'convert_resource', from: 'time', to: 'shield', ratio: 0.3 }
    const out = applyEnchantToEffect(host, RR)
    expect(out.kind).toBe('composite')
  })
})

describe('supplant 附魔 · 并行 consume_skill', () => {
  const SUPPLANT: EnchantSpec = { id: 'supplant' }

  it('display 返回中英文名', () => {
    expect(getEnchantDisplay(SUPPLANT, 'zh').name).toBe('取代')
    expect(getEnchantDisplay(SUPPLANT, 'en').name).toBe('Supplant')
    expect(listEnchantIds()).toContain('supplant')
  })

  it('宿主带多目标 selector → consume_skill 用该 scope，allowSelf=false', () => {
    const host: EffectSpec = { kind: 'add', ratio: 0.5, selector: SCOPE }
    const out = applyEnchantToEffect(host, SUPPLANT)
    expect(out.kind).toBe('composite')
    if (out.kind !== 'composite') return
    expect(out.effects[1]).toEqual({ kind: 'consume_skill', selector: SCOPE, ratio: 0.5, allowSelf: false })
  })

  it('宿主无 selector → scope fallback self，allowSelf=true', () => {
    const host: EffectSpec = { kind: 'gain_resource', resource: 'score', ratio: 0.1 }
    const out = applyEnchantToEffect(host, SUPPLANT)
    expect(out.kind).toBe('composite')
    if (out.kind !== 'composite') return
    expect(out.effects[1]).toEqual({ kind: 'consume_skill', selector: { type: 'self' }, ratio: 0.5, allowSelf: true })
  })

  it('宿主已是 consume_skill → ratio ×2', () => {
    const host: EffectSpec = { kind: 'consume_skill', selector: SCOPE, ratio: 0.4 }
    const out = applyEnchantToEffect(host, SUPPLANT)
    expect(out).toEqual({ kind: 'consume_skill', selector: SCOPE, ratio: 0.8 })
  })

  it('self-fallback supplant → resolveEffect 真的移除宿主自身', () => {
    const host: EffectSpec = { kind: 'gain_resource', resource: 'score', ratio: 0.1 }
    const effect = applyEnchantToEffect(host, SUPPLANT)
    const result = resolveEffect(effect, makeCtx())
    expect(result.skillsRemoved.map(r => r.targetSkillId)).toEqual(['skill_1'])
  })

  it('多目标 supplant → resolveEffect 排除宿主，移除他者', () => {
    const host: EffectSpec = { kind: 'add', ratio: 0.5, selector: { type: 'all_skills' } }
    const effect = applyEnchantToEffect(host, SUPPLANT)
    const result = resolveEffect(effect, makeCtx())
    expect(result.skillsRemoved.map(r => r.targetSkillId)).toEqual(['skill_2'])
  })
})
