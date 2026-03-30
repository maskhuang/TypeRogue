// ============================================
// 打字肉鸽 - 升华系统单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import type { AffixSkillInstance, SkillRuntimeState } from '../../../src/data/affixes'
import { EnchantmentType } from '../../../src/data/affixes'
import {
  ASCEND_BASE_THRESHOLD,
  ASCEND_GROWTH_RATE,
  getAscendThreshold,
  canAscend,
  executeAscend,
  getAscendBaseScale,
} from '../../../src/data/affixTrigger'

function makeSkill(overrides?: Partial<AffixSkillInstance>): AffixSkillInstance {
  return {
    id: 'test_skill',
    name: '测试技能',
    icon: '⚔️',
    resource: 'base',
    baseValues: [5, 8, 12] as [number, number, number],
    level: 3,
    rarity: 0 as 0,
    affixes: [],
    enchantmentIds: [EnchantmentType.ApprenticeNeighbor],
    ...overrides,
  }
}

function makeRuntimeState(overrides?: Partial<SkillRuntimeState>): SkillRuntimeState {
  return {
    skillId: 'test_skill',
    chargeAccumulated: 0,
    currentDecayMult: 1,
    mirrorCopiedAffix: null,
    mirrorCopiedAffixes: [],
    triggerCount: 0,
    amplifyStacks: 0,
    apprenticeAccumulated: 0,
    questStacks: 0,
    questCompletions: 0,
    questTransformed: false,
    ...overrides,
  }
}

describe('升华系统 (Apprentice Ascension)', () => {
  describe('getAscendThreshold', () => {
    it('Lv.3→4: 阈值 = 0.5', () => {
      expect(getAscendThreshold(3)).toBeCloseTo(0.5)
    })

    it('Lv.4→5: 阈值 = 1.0（翻倍）', () => {
      expect(getAscendThreshold(4)).toBeCloseTo(1.0)
    })

    it('Lv.5→6: 阈值 = 2.0（再翻倍）', () => {
      expect(getAscendThreshold(5)).toBeCloseTo(2.0)
    })

    it('常量正确', () => {
      expect(ASCEND_BASE_THRESHOLD).toBe(0.5)
      expect(ASCEND_GROWTH_RATE).toBe(1.6)
    })
  })

  describe('canAscend', () => {
    it('有学徒附魔 + Lv.3 + 足够 EXP → true', () => {
      const skill = makeSkill({ level: 3 })
      const rt = makeRuntimeState({ apprenticeAccumulated: 0.5 })
      expect(canAscend(skill, rt)).toBe(true)
    })

    it('无学徒附魔 → false', () => {
      const skill = makeSkill({ enchantmentIds: [], level: 3 })
      const rt = makeRuntimeState({ apprenticeAccumulated: 1.0 })
      expect(canAscend(skill, rt)).toBe(false)
    })

    it('等级不足 (Lv.2) → false', () => {
      const skill = makeSkill({ level: 2 })
      const rt = makeRuntimeState({ apprenticeAccumulated: 1.0 })
      expect(canAscend(skill, rt)).toBe(false)
    })

    it('EXP 不足 → false', () => {
      const skill = makeSkill({ level: 3 })
      const rt = makeRuntimeState({ apprenticeAccumulated: 0.3 })
      expect(canAscend(skill, rt)).toBe(false)
    })

    it('EXP 恰好等于阈值 → true', () => {
      const skill = makeSkill({ level: 3 })
      const rt = makeRuntimeState({ apprenticeAccumulated: 0.5 })
      expect(canAscend(skill, rt)).toBe(true)
    })

    it('Lv.4 需要更高阈值', () => {
      const skill = makeSkill({ level: 4 })
      const rt = makeRuntimeState({ apprenticeAccumulated: 0.5 })
      expect(canAscend(skill, rt)).toBe(false) // 需要 1.0
      rt.apprenticeAccumulated = 1.0
      expect(canAscend(skill, rt)).toBe(true)
    })

    it('资源专精附魔也算学徒附魔', () => {
      const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeResBase], level: 3 })
      const rt = makeRuntimeState({ apprenticeAccumulated: 0.5 })
      expect(canAscend(skill, rt)).toBe(true)
    })

    it('观摩附魔也算学徒附魔', () => {
      const skill = makeSkill({ enchantmentIds: [EnchantmentType.ApprenticeNeighbor], level: 3 })
      const rt = makeRuntimeState({ apprenticeAccumulated: 0.5 })
      expect(canAscend(skill, rt)).toBe(true)
    })
  })

  describe('executeAscend', () => {
    it('level +1', () => {
      const skill = makeSkill({ level: 3 })
      const rt = makeRuntimeState({ apprenticeAccumulated: 0.6 })
      executeAscend(skill, rt)
      expect(skill.level).toBe(4)
    })

    it('扣减阈值，保留余量', () => {
      const skill = makeSkill({ level: 3 })
      const rt = makeRuntimeState({ apprenticeAccumulated: 0.7 })
      executeAscend(skill, rt)
      expect(rt.apprenticeAccumulated).toBeCloseTo(0.2) // 0.7 - 0.5 = 0.2
    })

    it('连续升华', () => {
      const skill = makeSkill({ level: 3 })
      const rt = makeRuntimeState({ apprenticeAccumulated: 1.8 })
      executeAscend(skill, rt)
      expect(skill.level).toBe(4)
      expect(rt.apprenticeAccumulated).toBeCloseTo(1.3) // 1.8 - 0.5

      // 第二次升华 (Lv.4→5, 阈值 1.0)
      executeAscend(skill, rt)
      expect(skill.level).toBe(5)
      expect(rt.apprenticeAccumulated).toBeCloseTo(0.3) // 1.3 - 1.0
    })
  })

  describe('getAscendBaseScale', () => {
    it('Lv.1~3 → 1', () => {
      expect(getAscendBaseScale(1)).toBe(1)
      expect(getAscendBaseScale(2)).toBe(1)
      expect(getAscendBaseScale(3)).toBe(1)
    })

    it('Lv.4 → 1.6', () => {
      expect(getAscendBaseScale(4)).toBeCloseTo(1.6)
    })

    it('Lv.5 → 1.6²', () => {
      expect(getAscendBaseScale(5)).toBeCloseTo(1.6 * 1.6)
    })

    it('Lv.6 → 1.6³', () => {
      expect(getAscendBaseScale(6)).toBeCloseTo(Math.pow(1.6, 3))
    })
  })
})
