// ============================================
// 打字肉鸽 - affixV2 Equipped Registry + Battle Hook 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import {
  equipAffixV2,
  unequipAffixV2,
  getEquippedOnSkill,
  listAllEquipped,
  clearAllEquipped,
  hookOnSkillFire,
  hookOnKey,
  hookOnWordEnd,
  hookOnBattleStart,
  hookOnBattleEnd,
  getGhostLog,
  clearGhostLog,
} from '../../../src/systems/affixV2Equipped'
import { resetAllAffixV2State, getInstanceState, peekInstanceState } from '../../../src/systems/affixV2State'
import type { FireEvent } from '../../../src/systems/fireFilter'

const baseResourceLv1 = (r: string) => ({ score: 11, time: 0.2, gold: 3, shield: 5 } as Record<string, number>)[r] ?? 1
const fullResource = () => 100
const NOW = 1000

beforeEach(() => {
  clearAllEquipped()
  resetAllAffixV2State()
  clearGhostLog()
})

describe('V2 Equipped Registry', () => {
  it('equip + getEquippedOnSkill', () => {
    equipAffixV2('skill_1', 'K', 'feed')
    const equipped = getEquippedOnSkill('skill_1')
    expect(equipped.length).toBe(1)
    expect(equipped[0].defId).toBe('feed')
  })

  it('多 instance 装 same skill', () => {
    equipAffixV2('skill_1', 'K', 'feed')
    equipAffixV2('skill_1', 'K', 'charge')
    expect(getEquippedOnSkill('skill_1').length).toBe(2)
  })

  it('unequip 准确移除', () => {
    const id = equipAffixV2('skill_1', 'K', 'feed')
    expect(getEquippedOnSkill('skill_1').length).toBe(1)
    unequipAffixV2(id)
    expect(getEquippedOnSkill('skill_1').length).toBe(0)
  })

  it('clearAllEquipped 全清', () => {
    equipAffixV2('s1', 'K', 'feed')
    equipAffixV2('s2', 'L', 'charge')
    expect(listAllEquipped().length).toBe(2)
    clearAllEquipped()
    expect(listAllEquipped().length).toBe(0)
  })
})

describe('hookOnSkillFire · pilot 1 feed', () => {
  // feed: on_word_end + gain_resource — 不会被 skill fire 触发（只词末触发）
  it('feed 在 skill fire 不触发（trigger=on_word_end）', () => {
    equipAffixV2('skill_1', 'K', 'feed')
    const fireEvent: FireEvent = {
      sourceAffixId: 'feed',
      sourceSkillId: 'skill_1',
      sourceKey: 'K',
      sourceResource: 'score',
      isCrit: false,
      stackState: 'none',
      amount: 1,
      timestamp: NOW,
    }
    const r = hookOnSkillFire('skill_1', fireEvent, baseResourceLv1, fullResource, NOW)
    expect(r.length).toBe(0)
  })
})

describe('hookOnSkillFire · pilot 2 charge (on_self_fire)', () => {
  it('自触发时 base 累加', () => {
    equipAffixV2('skill_1', 'K', 'charge')
    const fireEvent: FireEvent = {
      sourceAffixId: 'charge',
      sourceSkillId: 'skill_1',
      sourceKey: 'K',
      sourceResource: 'score',
      isCrit: false,
      stackState: 'none',
      amount: 1,
      timestamp: NOW,
    }
    const r = hookOnSkillFire('skill_1', fireEvent, baseResourceLv1, fullResource, NOW)
    expect(r.length).toBe(1)
    // ghost log 记录
    expect(getGhostLog().length).toBe(1)
  })
})

describe('hookOnKey · hand_clap (on_key + stack)', () => {
  it('每键 stack +1，第 8 键释放 + reset', () => {
    const id = equipAffixV2('skill_1', 'K', 'hand_clap')
    // 8 次按键触发
    for (let i = 0; i < 8; i++) {
      hookOnKey(NOW + i, baseResourceLv1, fullResource)
    }
    const state = peekInstanceState(id)!
    expect(state.affixKeyCount).toBe(8)
    expect(state.stacks).toBe(0)   // 已释放并 reset
    // ghost log 应有 8 个条目（每键触发）
    expect(getGhostLog().length).toBe(8)
  })

  it('其他不在 on_key 上的 pilot 不触发', () => {
    equipAffixV2('skill_1', 'K', 'feed')           // on_word_end
    equipAffixV2('skill_2', 'L', 'piloerection')   // passive
    hookOnKey(NOW, baseResourceLv1, fullResource)
    // 但 affixKeyCount 还是累加（hook 跑所有 instance）
    const ghostLogLen = getGhostLog().length
    expect(ghostLogLen).toBe(0)  // 因为 trigger 不命中，不会进 log
    // 注：affixKeyCount 累加在 hook 内部完成，记录在 state 上
    expect(getInstanceState(listAllEquipped()[0].instanceId).affixKeyCount).toBe(1)
  })
})

describe('hookOnWordEnd · feed', () => {
  it('词末 trigger 命中，产出资源', () => {
    equipAffixV2('skill_1', 'K', 'feed')
    const results = hookOnWordEnd(NOW, 5, baseResourceLv1, fullResource)
    expect(results.length).toBe(1)
    expect(results[0].result.resourceProduced[0].amount).toBeCloseTo(1.1, 5)
  })

  it('pacing 词末 + shield 高 → 走 else 路径', () => {
    equipAffixV2('skill_1', 'K', 'pacing')
    const results = hookOnWordEnd(NOW, 5, baseResourceLv1, () => 100)
    expect(results[0].result.resourceProduced[0].amount).toBeCloseTo(0.55, 5)  // 0.05 × 11
  })

  it('pacing 词末 + shield 低 → 走 then 路径', () => {
    equipAffixV2('skill_1', 'K', 'pacing')
    const lowShield = (r: string) => r === 'shield' ? 1 : 100
    const results = hookOnWordEnd(NOW, 5, baseResourceLv1, lowShield)
    expect(results[0].result.resourceProduced[0].amount).toBeCloseTo(3.3, 5)  // 0.3 × 11
  })
})

describe('hookOnBattleStart / hookOnBattleEnd', () => {
  it('battle start 清 state + ghost log', () => {
    equipAffixV2('skill_1', 'K', 'feed')
    hookOnWordEnd(NOW, 5, baseResourceLv1, fullResource)
    expect(getGhostLog().length).toBe(1)

    hookOnBattleStart()
    expect(getGhostLog().length).toBe(0)
    expect(peekInstanceState(listAllEquipped()[0].instanceId)).toBeUndefined()
  })

  it('battle end 也清 state（但 equipped 保留）', () => {
    equipAffixV2('skill_1', 'K', 'charge')
    const fireEvent: FireEvent = {
      sourceAffixId: 'charge', sourceSkillId: 'skill_1', sourceKey: 'K',
      sourceResource: 'score', isCrit: false, stackState: 'none', amount: 1, timestamp: NOW,
    }
    hookOnSkillFire('skill_1', fireEvent, baseResourceLv1, fullResource, NOW)
    const id = listAllEquipped()[0].instanceId
    expect(peekInstanceState(id)?.cumulativeBaseAdd).toBeGreaterThan(0)

    hookOnBattleEnd()
    expect(peekInstanceState(id)).toBeUndefined()
    expect(listAllEquipped().length).toBe(1)  // equipped 不清
  })
})

describe('Ghost log · 验证 resolve 结果记录', () => {
  it('每次 hook 触发 + 命中都加 log 条目', () => {
    equipAffixV2('skill_1', 'K', 'feed')
    hookOnWordEnd(NOW, 5, baseResourceLv1, fullResource)
    hookOnWordEnd(NOW + 100, 6, baseResourceLv1, fullResource)
    hookOnWordEnd(NOW + 200, 4, baseResourceLv1, fullResource)
    expect(getGhostLog().length).toBe(3)
    expect(getGhostLog()[0].defId).toBe('feed')
    expect(getGhostLog()[0].trigger).toBe('on_word_end')
  })
})
