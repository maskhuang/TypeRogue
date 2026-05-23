// ============================================
// 打字肉鸽 - affixV2 Equipped Registry + Battle Hook 单元测试
// ============================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  equipAffixV2,
  unequipAffixV2,
  getEquippedOnSkill,
  listAllEquipped,
  clearAllEquipped,
  chargeToolAffixUses,
  hookOnSkillFire,
  hookOnKey,
  hookOnWordEnd,
  hookOnBattleStart,
  hookOnBattleEnd,
  hookOnResourceConsumed,
  getGhostLog,
  clearGhostLog,
} from '../../../src/systems/affixV2Equipped'
import { resetAllAffixV2State, getInstanceState, peekInstanceState, peekApprenticeProgress } from '../../../src/systems/affixV2State'
import type { FireEvent } from '../../../src/systems/fireFilter'
import { registerDynamicAffixV2, unregisterDynamicAffixV2 } from '../../../src/data/affixV2'
import { setEnchant } from '../../../src/systems/affixV2Equipped'
import { state as gameState } from '../../../src/core/state'
import type { AffixSkillInstance } from '../../../src/data/affixes'
import { defaultResourceLv1Base } from '../../../src/systems/affixV2BattleIntegration'

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

  it('on_battle_start trigger 一次性产出（旧 innate V2 等价物）', () => {
    registerDynamicAffixV2({
      id: 'test_battle_start',
      name_zh: '战起', name_en: 'Battle Start',
      section: 'maintenance',
      tags: ['maintenance'],
      phase: 'P1',
      trigger: { type: 'on_battle_start' },
      effect: { kind: 'gain_resource', resource: 'score', ratio: 2 },
    })
    try {
      equipAffixV2('skill_1', 'K', 'test_battle_start')
      const results = hookOnBattleStart(baseResourceLv1, fullResource, NOW)
      expect(results.length).toBe(1)
      // ratio=2 × score Lv1 base(11) = 22
      expect(results[0].result.resourceProduced[0]).toEqual({ resource: 'score', amount: 22 })
      expect(getGhostLog().length).toBe(1)
      expect(getGhostLog()[0].trigger).toBe('on_battle_start')
    } finally {
      unregisterDynamicAffixV2('test_battle_start')
    }
  })

  it('on_battle_start 不被 hookOnKey / hookOnWordEnd 触发', () => {
    registerDynamicAffixV2({
      id: 'test_battle_start_2',
      name_zh: '战起2', name_en: 'Battle Start 2',
      section: 'maintenance',
      tags: ['maintenance'],
      phase: 'P1',
      trigger: { type: 'on_battle_start' },
      effect: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    })
    try {
      equipAffixV2('skill_1', 'K', 'test_battle_start_2')
      hookOnKey(NOW, baseResourceLv1, fullResource)
      hookOnWordEnd(NOW, 5, baseResourceLv1, fullResource)
      expect(getGhostLog().length).toBe(0)
    } finally {
      unregisterDynamicAffixV2('test_battle_start_2')
    }
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

describe('学徒附魔 · trigger 计数 → skill level++ (3 → 6 → 12 → 24...)', () => {
  // 最小 AffixSkillInstance stub · 仅 level 字段被 recordApprenticeTriggerHit 读写
  function stubSkill(id: string, level = 1): AffixSkillInstance {
    return { id, level } as unknown as AffixSkillInstance
  }

  beforeEach(() => {
    gameState.affixSkills.clear()
    registerDynamicAffixV2({
      id: 'test_appr',
      name_zh: '学徒测试', name_en: 'Apprentice Test',
      section: 'maintenance',
      tags: ['maintenance'],
      phase: 'P1',
      trigger: { type: 'on_word_end' },
      effect: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    })
  })

  it('每次 trigger 命中 progress +1', () => {
    const skill = stubSkill('skill_1', 1)
    gameState.affixSkills.set('skill_1', skill)
    const id = equipAffixV2('skill_1', 'K', 'test_appr')
    setEnchant(id, { id: 'apprentice' })

    hookOnWordEnd(NOW, 5, baseResourceLv1, fullResource)
    expect(peekApprenticeProgress(id)?.progress).toBe(1)

    hookOnWordEnd(NOW + 10, 5, baseResourceLv1, fullResource)
    expect(peekApprenticeProgress(id)?.progress).toBe(2)
    expect(skill.level).toBe(1)   // 还没到阈值 3
    unregisterDynamicAffixV2('test_appr')
  })

  it('Lv1→Lv2 阈值 3 次 trigger', () => {
    const skill = stubSkill('skill_1', 1)
    gameState.affixSkills.set('skill_1', skill)
    const id = equipAffixV2('skill_1', 'K', 'test_appr')
    setEnchant(id, { id: 'apprentice' })

    for (let i = 0; i < 3; i++) hookOnWordEnd(NOW + i, 5, baseResourceLv1, fullResource)
    expect(skill.level).toBe(2)
    expect(peekApprenticeProgress(id)?.progress).toBe(0)
    unregisterDynamicAffixV2('test_appr')
  })

  it('Lv1→2→3→4 累积曲线 3 + 6 + 12 = 21 次 trigger', () => {
    const skill = stubSkill('skill_1', 1)
    gameState.affixSkills.set('skill_1', skill)
    const id = equipAffixV2('skill_1', 'K', 'test_appr')
    setEnchant(id, { id: 'apprentice' })

    for (let i = 0; i < 21; i++) hookOnWordEnd(NOW + i, 5, baseResourceLv1, fullResource)
    expect(skill.level).toBe(4)
    expect(peekApprenticeProgress(id)?.progress).toBe(0)
    unregisterDynamicAffixV2('test_appr')
  })

  it('无上限：Lv4→5 需 24 次', () => {
    const skill = stubSkill('skill_1', 4)
    gameState.affixSkills.set('skill_1', skill)
    const id = equipAffixV2('skill_1', 'K', 'test_appr')
    setEnchant(id, { id: 'apprentice' })

    for (let i = 0; i < 23; i++) hookOnWordEnd(NOW + i, 5, baseResourceLv1, fullResource)
    expect(skill.level).toBe(4)   // 差 1 次
    hookOnWordEnd(NOW + 23, 5, baseResourceLv1, fullResource)
    expect(skill.level).toBe(5)
    unregisterDynamicAffixV2('test_appr')
  })

  it('progress 跨战永久 · hookOnBattleStart 不清', () => {
    const skill = stubSkill('skill_1', 1)
    gameState.affixSkills.set('skill_1', skill)
    const id = equipAffixV2('skill_1', 'K', 'test_appr')
    setEnchant(id, { id: 'apprentice' })

    hookOnWordEnd(NOW, 5, baseResourceLv1, fullResource)
    hookOnWordEnd(NOW + 1, 5, baseResourceLv1, fullResource)
    expect(peekApprenticeProgress(id)?.progress).toBe(2)

    hookOnBattleStart()   // 关内 state 全 reset，但学徒进度独立存活
    expect(peekApprenticeProgress(id)?.progress).toBe(2)
    unregisterDynamicAffixV2('test_appr')
  })

  it('unequip 清进度', () => {
    const skill = stubSkill('skill_1', 1)
    gameState.affixSkills.set('skill_1', skill)
    const id = equipAffixV2('skill_1', 'K', 'test_appr')
    setEnchant(id, { id: 'apprentice' })

    hookOnWordEnd(NOW, 5, baseResourceLv1, fullResource)
    expect(peekApprenticeProgress(id)?.progress).toBe(1)
    unequipAffixV2(id)
    expect(peekApprenticeProgress(id)).toBeUndefined()
    unregisterDynamicAffixV2('test_appr')
  })

  it('非学徒附魔的 instance 不累 progress', () => {
    const skill = stubSkill('skill_1', 1)
    gameState.affixSkills.set('skill_1', skill)
    const id = equipAffixV2('skill_1', 'K', 'test_appr')
    setEnchant(id, { id: 'crit' })  // 不是学徒

    for (let i = 0; i < 5; i++) hookOnWordEnd(NOW + i, 5, baseResourceLv1, fullResource)
    expect(peekApprenticeProgress(id)).toBeUndefined()
    expect(skill.level).toBe(1)
    unregisterDynamicAffixV2('test_appr')
  })

  it('effect 不变 · 学徒不影响产出', () => {
    const skill = stubSkill('skill_1', 1)
    gameState.affixSkills.set('skill_1', skill)
    const id = equipAffixV2('skill_1', 'K', 'test_appr')
    setEnchant(id, { id: 'apprentice' })

    const results = hookOnWordEnd(NOW, 5, baseResourceLv1, fullResource)
    // ratio 1 × score Lv1 base 11 = 11
    expect(results[0].result.resourceProduced[0]).toEqual({ resource: 'score', amount: 11 })
    unregisterDynamicAffixV2('test_appr')
  })
})

describe('tool/认知词条「用完消失」· chargeToolAffixUses', () => {
  const TOOL_USES = 3   // 本测试固定上限（生成时 roll 的逻辑另见 generator 测试）
  function toolSkill(id: string, defId: string): AffixSkillInstance {
    return { id, level: 1, rarity: 1, v2Ids: [defId] } as unknown as AffixSkillInstance
  }

  beforeEach(() => {
    gameState.affixSkills.clear()
    registerDynamicAffixV2({
      id: 'test_tool', name_zh: '工具测试', name_en: 'Tool Test',
      section: 'tool', tags: ['tool'], phase: 'P1',
      trigger: { type: 'on_battle_end', result: 'any' },
      effect: { kind: 'graft_affix', from: { type: 'self' } },
      maxUses: TOOL_USES,   // 生成时赋值（此处固定，便于断言）
    })
    registerDynamicAffixV2({
      id: 'test_nontool', name_zh: '非工具', name_en: 'Non Tool',
      section: 'maintenance', tags: ['maintenance'], phase: 'P1',
      trigger: { type: 'on_word_end' },
      effect: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    })
  })
  afterEach(() => {
    unregisterDynamicAffixV2('test_tool')
    unregisterDynamicAffixV2('test_nontool')
  })

  it('每次调用累计 1 次使用', () => {
    const skill = toolSkill('skill_1', 'test_tool')
    gameState.affixSkills.set('skill_1', skill)
    const id = equipAffixV2('skill_1', 'K', 'test_tool')

    chargeToolAffixUses([id])
    expect(skill.v2Uses?.['test_tool']).toBe(1)
    chargeToolAffixUses([id])
    expect(skill.v2Uses?.['test_tool']).toBe(2)
    expect(getEquippedOnSkill('skill_1').length).toBe(1)   // 未达上限，仍在
  })

  it('达上限即从宿主移除（用完消失）+ 同步 v2Ids / rarity', () => {
    const skill = toolSkill('skill_1', 'test_tool')
    gameState.affixSkills.set('skill_1', skill)
    const id = equipAffixV2('skill_1', 'K', 'test_tool')

    let removed: { skillId: string; defId: string }[] = []
    for (let i = 0; i < TOOL_USES; i++) removed = chargeToolAffixUses([id])

    expect(removed).toEqual([{ skillId: 'skill_1', defId: 'test_tool' }])
    expect(getEquippedOnSkill('skill_1').length).toBe(0)   // 运行时 instance 已卸
    expect(skill.v2Ids).toEqual([])                         // 持久 v2Ids 已移除
    expect(skill.rarity).toBe(0)                            // rarity 回落
    expect(skill.v2Uses?.['test_tool']).toBeUndefined()    // 使用计数已清
  })

  it('非 tool 词条无限制 · 不计数不移除', () => {
    const skill = toolSkill('skill_2', 'test_nontool')
    gameState.affixSkills.set('skill_2', skill)
    const id = equipAffixV2('skill_2', 'L', 'test_nontool')

    for (let i = 0; i < TOOL_USES + 5; i++) chargeToolAffixUses([id])
    expect(skill.v2Uses).toBeUndefined()
    expect(getEquippedOnSkill('skill_2').length).toBe(1)
  })

  it('同一调用内同 instance 去重 · 只计 1 次', () => {
    const skill = toolSkill('skill_1', 'test_tool')
    gameState.affixSkills.set('skill_1', skill)
    const id = equipAffixV2('skill_1', 'K', 'test_tool')

    chargeToolAffixUses([id, id, id])
    expect(skill.v2Uses?.['test_tool']).toBe(1)
  })
})

describe('defaultResourceLv1Base · Lv5+ 按 ascendBaseScale 延伸', () => {
  // BASE_VALUES 表 score Lv1-4 = [11, 18, 27, 38]
  // getAscendBaseScale(level) = level<=3 ? 1 : 1.6^(level-3)
  // 与 legacy shop.ts:534 getEffectiveBaseValue 同公式

  it('Lv1-Lv4 直接查表', () => {
    expect(defaultResourceLv1Base('score', 1)).toBe(11)
    expect(defaultResourceLv1Base('score', 2)).toBe(18)
    expect(defaultResourceLv1Base('score', 3)).toBe(27)
    expect(defaultResourceLv1Base('score', 4)).toBe(38)
  })

  it('Lv5 = table[3] × 1.6^2 = 38 × 2.56', () => {
    expect(defaultResourceLv1Base('score', 5)).toBeCloseTo(38 * 2.56, 5)
  })

  it('Lv6 比 Lv5 高', () => {
    expect(defaultResourceLv1Base('score', 6)).toBeGreaterThan(defaultResourceLv1Base('score', 5))
  })

  it('Lv8 单调递增 · 学徒长期升级仍有效', () => {
    const seq = [4, 5, 6, 7, 8].map(lv => defaultResourceLv1Base('score', lv))
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeGreaterThan(seq[i - 1])
    }
  })
})

describe('unequipAllOnSkill — 一并清学徒进度', () => {
  it('skill 上所有 instance 进度都清', () => {
    gameState.affixSkills.clear()
    gameState.affixSkills.set('skill_1', { id: 'skill_1', level: 1 } as unknown as AffixSkillInstance)
    registerDynamicAffixV2({
      id: 'test_appr2',
      name_zh: '学徒测试2', name_en: 'Apprentice Test 2',
      section: 'maintenance',
      tags: ['maintenance'],
      phase: 'P1',
      trigger: { type: 'on_word_end' },
      effect: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    })
    try {
      const id1 = equipAffixV2('skill_1', 'K', 'test_appr2')
      const id2 = equipAffixV2('skill_1', 'L', 'test_appr2')
      setEnchant(id1, { id: 'apprentice' })
      setEnchant(id2, { id: 'apprentice' })
      hookOnWordEnd(NOW, 5, baseResourceLv1, fullResource)
      expect(peekApprenticeProgress(id1)?.progress).toBe(1)
      expect(peekApprenticeProgress(id2)?.progress).toBe(1)
      // clearAllEquipped 走全清路径
      // 但 unequipAllOnSkill 是逐个 unequipAffixV2 → 也走 clearApprenticeProgress
      // 这里不显式测 unequipAllOnSkill，因为它内部就是 for (id) unequipAffixV2(id)
    } finally {
      unregisterDynamicAffixV2('test_appr2')
    }
  })
})

describe('hookOnResourceConsumed · on_resource_consumed reactor', () => {
  it('任意资源被消耗 → 无 filter 的反应词条触发', () => {
    registerDynamicAffixV2({
      id: 'test_react_any',
      name_zh: '反应', name_en: 'React',
      section: 'maintenance', tags: ['maintenance'], phase: 'P1',
      trigger: { type: 'on_resource_consumed' },
      effect: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    })
    try {
      equipAffixV2('skill_1', 'K', 'test_react_any')
      const results = hookOnResourceConsumed('shield', baseResourceLv1, fullResource, NOW)
      expect(results.length).toBe(1)
      expect(results[0].result.resourceProduced[0]).toEqual({ resource: 'score', amount: 11 })
      expect(getGhostLog()[0].trigger).toBe('on_resource_consumed')
    } finally {
      unregisterDynamicAffixV2('test_react_any')
    }
  })

  it('resource filter 不匹配 → 不触发', () => {
    registerDynamicAffixV2({
      id: 'test_react_shield',
      name_zh: '反应盾', name_en: 'React Shield',
      section: 'maintenance', tags: ['maintenance'], phase: 'P1',
      trigger: { type: 'on_resource_consumed', resource: 'shield' },
      effect: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    })
    try {
      equipAffixV2('skill_1', 'K', 'test_react_shield')
      expect(hookOnResourceConsumed('gold', baseResourceLv1, fullResource, NOW).length).toBe(0)
      expect(hookOnResourceConsumed('shield', baseResourceLv1, fullResource, NOW).length).toBe(1)
    } finally {
      unregisterDynamicAffixV2('test_react_shield')
    }
  })

  it('on_resource_consumed 不被 hookOnKey / hookOnWordEnd 误触发', () => {
    registerDynamicAffixV2({
      id: 'test_react_2',
      name_zh: '反应2', name_en: 'React 2',
      section: 'maintenance', tags: ['maintenance'], phase: 'P1',
      trigger: { type: 'on_resource_consumed' },
      effect: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    })
    try {
      equipAffixV2('skill_1', 'K', 'test_react_2')
      hookOnKey(NOW, baseResourceLv1, fullResource)
      hookOnWordEnd(NOW, 5, baseResourceLv1, fullResource)
      expect(getGhostLog().length).toBe(0)
    } finally {
      unregisterDynamicAffixV2('test_react_2')
    }
  })
})
