// ============================================
// 打字肉鸽 - 新 Affix 系统 · evaluateTrigger 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { evaluateTrigger, type TriggerContext } from '../../../src/systems/affixV2Trigger'
import type { TriggerSpec } from '../../../src/data/affixV2Trigger'
import type { FireEvent } from '../../../src/systems/fireFilter'

const fakeEvent: FireEvent = {
  sourceAffixId: 'pant_hoot',     // section=vocal
  sourceSkillId: 'skill_2',
  sourceKey: 'L',
  sourceResource: 'score',
  isCrit: false,
  stackState: 'none',
  amount: 1,
  timestamp: 0,
}

describe('evaluateTrigger · passive', () => {
  it('恒返 true', () => {
    expect(evaluateTrigger({ type: 'passive' }, {})).toBe(true)
  })
})

describe('evaluateTrigger · on_key', () => {
  it('恒返 true（调用方应只在 key down 调用）', () => {
    expect(evaluateTrigger({ type: 'on_key' }, {})).toBe(true)
  })
})

describe('evaluateTrigger · on_word_end', () => {
  it('isWordEnd=true → true', () => {
    expect(evaluateTrigger({ type: 'on_word_end' }, { isWordEnd: true })).toBe(true)
  })

  it('isWordEnd=false / 未传 → false', () => {
    expect(evaluateTrigger({ type: 'on_word_end' }, { isWordEnd: false })).toBe(false)
    expect(evaluateTrigger({ type: 'on_word_end' }, {})).toBe(false)
  })
})

describe('evaluateTrigger · on_self_fire', () => {
  it('event 存在 → true（hook 层保证只迭代自身 skill 的 affix）', () => {
    expect(evaluateTrigger({ type: 'on_self_fire' }, { event: fakeEvent })).toBe(true)
  })

  it('缺 event → false', () => {
    expect(evaluateTrigger({ type: 'on_self_fire' }, {})).toBe(false)
  })
})

describe('evaluateTrigger · on_fire(filter)', () => {
  it('无 filter → 任何 event 都命中', () => {
    expect(evaluateTrigger(
      { type: 'on_fire' },
      { event: fakeEvent, selfKey: 'K' },
    )).toBe(true)
  })

  it('tag filter 命中', () => {
    expect(evaluateTrigger(
      { type: 'on_fire', filter: { tag: 'vocal' } },
      { event: fakeEvent, selfKey: 'K' },
    )).toBe(true)
  })

  it('tag filter 不命中', () => {
    expect(evaluateTrigger(
      { type: 'on_fire', filter: { tag: 'agonistic' } },
      { event: fakeEvent, selfKey: 'K' },
    )).toBe(false)
  })

  it('resource filter 命中', () => {
    expect(evaluateTrigger(
      { type: 'on_fire', filter: { resource: 'score' } },
      { event: fakeEvent, selfKey: 'K' },
    )).toBe(true)
  })

  it('缺 event → false', () => {
    expect(evaluateTrigger(
      { type: 'on_fire', filter: { tag: 'vocal' } },
      { selfKey: 'K' },
    )).toBe(false)
  })
})

describe('evaluateTrigger · every_n_keys', () => {
  it('count === n → true', () => {
    expect(evaluateTrigger({ type: 'every_n_keys', n: 5 }, { affixKeyCount: 5 })).toBe(true)
  })

  it('count 是 n 的倍数 → true', () => {
    expect(evaluateTrigger({ type: 'every_n_keys', n: 3 }, { affixKeyCount: 9 })).toBe(true)
    expect(evaluateTrigger({ type: 'every_n_keys', n: 3 }, { affixKeyCount: 12 })).toBe(true)
  })

  it('count 不是倍数 → false', () => {
    expect(evaluateTrigger({ type: 'every_n_keys', n: 5 }, { affixKeyCount: 3 })).toBe(false)
    expect(evaluateTrigger({ type: 'every_n_keys', n: 5 }, { affixKeyCount: 7 })).toBe(false)
  })

  it('count <= 0 → false', () => {
    expect(evaluateTrigger({ type: 'every_n_keys', n: 5 }, { affixKeyCount: 0 })).toBe(false)
    expect(evaluateTrigger({ type: 'every_n_keys', n: 5 }, {})).toBe(false)
  })
})

describe('evaluateTrigger · Phase 2 占位', () => {
  it('on_window_mode 暂返 false', () => {
    const spec: TriggerSpec = { type: 'on_window_mode', pattern: 'rhythm_stable' }
    expect(evaluateTrigger(spec, {})).toBe(false)
  })

  it('on_sequence 暂返 false', () => {
    const spec: TriggerSpec = { type: 'on_sequence', pattern: 'crit*3' }
    expect(evaluateTrigger(spec, {})).toBe(false)
  })

  it('one_per_window 暂返 false', () => {
    const spec: TriggerSpec = { type: 'one_per_window', n: 10, inner: { type: 'on_key' } }
    expect(evaluateTrigger(spec, {})).toBe(false)
  })
})

describe('evaluateTrigger · on_resource_consumed', () => {
  it('无被消耗资源 → false', () => {
    expect(evaluateTrigger({ type: 'on_resource_consumed' }, {})).toBe(false)
  })

  it('任意资源被消耗（无 filter）→ true', () => {
    expect(evaluateTrigger({ type: 'on_resource_consumed' }, { consumedResource: 'gold' })).toBe(true)
    expect(evaluateTrigger({ type: 'on_resource_consumed' }, { consumedResource: 'shield' })).toBe(true)
  })

  it('resource filter 命中才触发', () => {
    const spec: TriggerSpec = { type: 'on_resource_consumed', resource: 'shield' }
    expect(evaluateTrigger(spec, { consumedResource: 'shield' })).toBe(true)
    expect(evaluateTrigger(spec, { consumedResource: 'gold' })).toBe(false)
    expect(evaluateTrigger(spec, {})).toBe(false)
  })
})

describe('evaluateTrigger · on_skill_consumed', () => {
  it('无被取代技能 → false', () => {
    expect(evaluateTrigger({ type: 'on_skill_consumed' }, {})).toBe(false)
  })

  it('有技能被取代（全局观察者，无 scope）→ true', () => {
    expect(evaluateTrigger({ type: 'on_skill_consumed' }, { consumedSkillId: 'skill_x' })).toBe(true)
  })
})
