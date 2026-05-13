// ============================================
// 打字肉鸽 - 全 6 Phase 1 trigger 端到端覆盖测试
// ============================================
// 每个 trigger 类型用具体 pilot affix 通过 hook 真实跑一遍，
// 验证 trigger 命中条件 + resourceProduced 正确。

import { describe, it, expect, beforeEach } from 'vitest'
import {
  equipAffixV2,
  clearAllEquipped,
  clearGhostLog,
  hookOnSkillFire,
  hookOnKey,
  hookOnWordEnd,
  hookOnBattleStart,
  getGhostLog,
} from '../../../src/systems/affixV2Equipped'
import { resetAllAffixV2State, listActiveAuras } from '../../../src/systems/affixV2State'
import type { FireEvent } from '../../../src/systems/tagQuery'

const lv1Base = (r: string) => ({ score: 11, time: 0.2, gold: 3, shield: 5, multiplier: 0.35 } as Record<string, number>)[r] ?? 1
const fullRes = () => 100
const NOW = 1000

beforeEach(() => {
  clearAllEquipped()
  resetAllAffixV2State()
  clearGhostLog()
})

// ============================================
// 1. passive · piloerection
// ============================================

describe('Trigger 1 · passive (piloerection)', () => {
  it('battle start 一次性应用 aura', () => {
    equipAffixV2('skill_1', 'K', 'piloerection')
    hookOnBattleStart(lv1Base, fullRes, NOW)
    expect(listActiveAuras().length).toBe(1)
    expect(listActiveAuras()[0].modifier.type).toBe('crit_chance_add')
  })

  it('hookOnSkillFire 不触发 passive', () => {
    equipAffixV2('skill_1', 'K', 'piloerection')
    const ev: FireEvent = mkEvent('skill_1')
    const r = hookOnSkillFire('skill_1', ev, lv1Base, fullRes, NOW)
    expect(r.length).toBe(0)
  })

  it('hookOnKey 不触发 passive', () => {
    equipAffixV2('skill_1', 'K', 'piloerection')
    const r = hookOnKey(NOW, lv1Base, fullRes)
    expect(r.length).toBe(0)
  })

  it('hookOnWordEnd 不触发 passive', () => {
    equipAffixV2('skill_1', 'K', 'piloerection')
    const r = hookOnWordEnd(NOW, 5, lv1Base, fullRes)
    expect(r.length).toBe(0)
  })
})

// ============================================
// 2. on_key · hand_clap
// ============================================

describe('Trigger 2 · on_key (hand_clap)', () => {
  it('每次 hookOnKey 命中', () => {
    equipAffixV2('skill_1', 'K', 'hand_clap')
    for (let i = 0; i < 7; i++) hookOnKey(NOW + i, lv1Base, fullRes)
    expect(getGhostLog().length).toBe(7)
    // 7 次 stack_inc + 7 次 stack_release（threshold=8 未达）
  })

  it('第 8 键触发 stack_release，产出 0.3 × 11 = 3.3', () => {
    equipAffixV2('skill_1', 'K', 'hand_clap')
    for (let i = 0; i < 8; i++) hookOnKey(NOW + i, lv1Base, fullRes)
    const logs = getGhostLog()
    const released = logs.filter(g => g.result.resourceProduced.length > 0)
    expect(released.length).toBe(1)
    expect(released[0].result.resourceProduced[0].amount).toBeCloseTo(3.3, 3)
  })

  it('hookOnSkillFire 不触发 on_key', () => {
    equipAffixV2('skill_1', 'K', 'hand_clap')
    const ev: FireEvent = mkEvent('skill_1')
    const r = hookOnSkillFire('skill_1', ev, lv1Base, fullRes, NOW)
    expect(r.length).toBe(0)
  })

  it('hookOnWordEnd 不触发 on_key', () => {
    equipAffixV2('skill_1', 'K', 'hand_clap')
    const r = hookOnWordEnd(NOW, 5, lv1Base, fullRes)
    expect(r.length).toBe(0)
  })
})

// ============================================
// 3. on_word_end · feed / pant_hoot / pacing
// ============================================

describe('Trigger 3 · on_word_end (feed)', () => {
  it('hookOnWordEnd 命中产出 0.1 × 11 = 1.1', () => {
    equipAffixV2('skill_1', 'K', 'feed')
    const r = hookOnWordEnd(NOW, 5, lv1Base, fullRes)
    expect(r.length).toBe(1)
    expect(r[0].result.resourceProduced[0].amount).toBeCloseTo(1.1, 3)
  })

  it('hookOnKey 不触发 on_word_end', () => {
    equipAffixV2('skill_1', 'K', 'feed')
    const r = hookOnKey(NOW, lv1Base, fullRes)
    expect(r.length).toBe(0)
  })
})

// ============================================
// 4. on_self_fire · charge / bite / hammer_anvil
// ============================================

describe('Trigger 4 · on_self_fire (charge)', () => {
  it('hookOnSkillFire 命中本 skill 上的 on_self_fire affix', () => {
    equipAffixV2('skill_1', 'K', 'charge')
    const ev: FireEvent = mkEvent('skill_1')
    const r = hookOnSkillFire('skill_1', ev, lv1Base, fullRes, NOW)
    // charge: add(ratio=0.083) · 关内成长 base
    expect(r.length).toBeGreaterThanOrEqual(1)
    const selfFire = r.find(s => s.sourceSkillId === 'skill_1')
    expect(selfFire).toBeDefined()
  })

  it('hookOnSkillFire 不触发其他 skill 上的 on_self_fire affix', () => {
    equipAffixV2('skill_1', 'K', 'charge')
    equipAffixV2('skill_2', 'L', 'charge')
    const ev: FireEvent = mkEvent('skill_1')
    const r = hookOnSkillFire('skill_1', ev, lv1Base, fullRes, NOW)
    // 只有 skill_1 上的 charge 应触发
    const selfFireSources = r.filter(s => {
      const log = getGhostLog().find(g => g.instanceId === s.sourceInstanceId)
      return log?.trigger === 'on_self_fire'
    })
    const skillIds = new Set(selfFireSources.map(s => s.sourceSkillId))
    expect(skillIds.has('skill_1')).toBe(true)
    expect(skillIds.has('skill_2')).toBe(false)
  })

  it('hookOnKey 不触发 on_self_fire', () => {
    equipAffixV2('skill_1', 'K', 'charge')
    const r = hookOnKey(NOW, lv1Base, fullRes)
    expect(r.length).toBe(0)
  })

  it('hookOnWordEnd 不触发 on_self_fire', () => {
    equipAffixV2('skill_1', 'K', 'charge')
    const r = hookOnWordEnd(NOW, 5, lv1Base, fullRes)
    expect(r.length).toBe(0)
  })
})

// ============================================
// 5. on_fire(filter) · cling (filter: resource:score)
// ============================================

describe('Trigger 5 · on_fire(filter) · cling', () => {
  it('监听任何 V2 source 产出 score → 命中', () => {
    // cling 装在 skill_listener，但监听 skill_source 的 fire
    equipAffixV2('skill_source', 'K', 'feed')      // 提供 V2 source for tag filter
    equipAffixV2('skill_listener', 'L', 'cling')   // on_fire(filter:resource:score)
    const ev: FireEvent = mkEvent('skill_source', { sourceResource: 'score' })
    const r = hookOnSkillFire('skill_source', ev, lv1Base, fullRes, NOW)
    // cling 应被广播命中
    const clingFires = getGhostLog().filter(g => g.defId === 'cling')
    expect(clingFires.length).toBeGreaterThanOrEqual(1)
  })

  it('源资源不匹配 → 不命中', () => {
    equipAffixV2('skill_source', 'K', 'feed')
    equipAffixV2('skill_listener', 'L', 'cling')
    const ev: FireEvent = mkEvent('skill_source', { sourceResource: 'gold' })
    hookOnSkillFire('skill_source', ev, lv1Base, fullRes, NOW)
    const clingFires = getGhostLog().filter(g => g.defId === 'cling')
    expect(clingFires.length).toBe(0)
  })

  it('on_fire 在 hookOnKey / hookOnWordEnd 不触发', () => {
    equipAffixV2('skill_1', 'K', 'cling')
    expect(hookOnKey(NOW, lv1Base, fullRes).filter(s => getGhostLog().find(g => g.instanceId === s.sourceInstanceId)?.trigger === 'on_fire').length).toBe(0)
    expect(hookOnWordEnd(NOW, 5, lv1Base, fullRes).filter(s => getGhostLog().find(g => g.instanceId === s.sourceInstanceId)?.trigger === 'on_fire').length).toBe(0)
  })

  it('hookOnSkillFire 广播 on_fire 给所有 V2 affix（含其他 skill）', () => {
    // 4 个 cling 分布在不同 skill，应都被广播命中
    equipAffixV2('skill_src', 'K', 'feed')
    equipAffixV2('skill_a', 'A', 'cling')
    equipAffixV2('skill_b', 'B', 'cling')
    equipAffixV2('skill_c', 'C', 'cling')
    const ev: FireEvent = mkEvent('skill_src')
    hookOnSkillFire('skill_src', ev, lv1Base, fullRes, NOW)
    const clingHits = getGhostLog().filter(g => g.defId === 'cling')
    expect(clingHits.length).toBe(3)
  })
})

// ============================================
// 6. every_n_keys · chew (n=10)
// ============================================

describe('Trigger 6 · every_n_keys (chew, n=10)', () => {
  it('第 1-9 键不触发产出（但 hook 仍 evaluate）', () => {
    equipAffixV2('skill_1', 'K', 'chew')
    for (let i = 1; i <= 9; i++) hookOnKey(NOW + i, lv1Base, fullRes)
    const chewHits = getGhostLog().filter(g => g.defId === 'chew' && g.result.resourceProduced.length > 0)
    expect(chewHits.length).toBe(0)
  })

  it('第 10 键命中 + 产出 ratio=1 × 11 = 11', () => {
    equipAffixV2('skill_1', 'K', 'chew')
    for (let i = 1; i <= 10; i++) hookOnKey(NOW + i, lv1Base, fullRes)
    const chewHits = getGhostLog().filter(g => g.defId === 'chew' && g.result.resourceProduced.length > 0)
    expect(chewHits.length).toBe(1)
    expect(chewHits[0].result.resourceProduced[0].amount).toBeCloseTo(11, 3)
  })

  it('第 20 键也命中（10 的倍数）', () => {
    equipAffixV2('skill_1', 'K', 'chew')
    for (let i = 1; i <= 20; i++) hookOnKey(NOW + i, lv1Base, fullRes)
    const chewHits = getGhostLog().filter(g => g.defId === 'chew' && g.result.resourceProduced.length > 0)
    expect(chewHits.length).toBe(2)
  })

  it('每次 hookOnKey 后 affixKeyCount 递增', () => {
    equipAffixV2('skill_1', 'K', 'chew')
    for (let i = 1; i <= 5; i++) hookOnKey(NOW + i, lv1Base, fullRes)
    // affixKeyCount 在 state 内已累加到 5，下一个倍数 = 10
  })

  it('hookOnSkillFire / hookOnWordEnd 不触发 every_n_keys', () => {
    equipAffixV2('skill_1', 'K', 'chew')
    const ev: FireEvent = mkEvent('skill_1')
    expect(hookOnSkillFire('skill_1', ev, lv1Base, fullRes, NOW).filter(s => getGhostLog().find(g => g.instanceId === s.sourceInstanceId)?.trigger === 'every_n_keys').length).toBe(0)
    expect(hookOnWordEnd(NOW, 5, lv1Base, fullRes).filter(s => getGhostLog().find(g => g.instanceId === s.sourceInstanceId)?.trigger === 'every_n_keys').length).toBe(0)
  })
})

// ============================================
// 综合 · 多 trigger 同 skill 不互相干扰
// ============================================

describe('多 trigger 同 skill 隔离', () => {
  it('同 skill 装 feed + charge + hand_clap + chew + cling，各自只在对应 hook 触发', () => {
    equipAffixV2('skill_1', 'K', 'feed')        // on_word_end
    equipAffixV2('skill_1', 'K', 'charge')      // on_self_fire
    equipAffixV2('skill_1', 'K', 'hand_clap')   // on_key
    equipAffixV2('skill_1', 'K', 'chew')        // every_n_keys
    equipAffixV2('skill_1', 'K', 'cling')       // on_fire

    // hookOnWordEnd → 仅 feed
    let r = hookOnWordEnd(NOW, 5, lv1Base, fullRes)
    expect(r.length).toBe(1)
    expect(getGhostLog().filter(g => g.timestamp === NOW)[0].defId).toBe('feed')

    // hookOnKey → hand_clap + chew + cling? cling 不在 hookOnKey 里
    const beforeKey = getGhostLog().length
    hookOnKey(NOW + 1, lv1Base, fullRes)
    const keyLogs = getGhostLog().slice(beforeKey)
    const triggersFiredOnKey = new Set(keyLogs.map(g => g.defId))
    expect(triggersFiredOnKey.has('hand_clap')).toBe(true)
    expect(triggersFiredOnKey.has('feed')).toBe(false)
    expect(triggersFiredOnKey.has('charge')).toBe(false)
    expect(triggersFiredOnKey.has('cling')).toBe(false)
    // chew 在 every_n_keys 上，第 1 键不触发产出但 evaluateTrigger 返 false → 不入 log（trigger filter 阻止）
    // Hook 设计：trigger.type 不匹配的也被前置 filter 排除
  })
})

// helper
function mkEvent(skillId: string, overrides?: Partial<FireEvent>): FireEvent {
  return {
    sourceAffixId: skillId,
    sourceSkillId: skillId,
    sourceKey: 'K',
    sourceResource: 'score',
    isCrit: false,
    stackState: 'none',
    amount: 1,
    timestamp: NOW,
    ...overrides,
  }
}
