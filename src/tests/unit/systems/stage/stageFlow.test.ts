// ============================================
// 打字肉鸽 - stageFlow 单元测试
// ============================================
// Story 42.1: 12-Stage Cycle — (battle-shop)×5 → ritual → (battle-shop)×5 → boss
// Elite: position 5 in cycle

import { describe, it, expect } from 'vitest'
import {
  CYCLE_LENGTH,
  STAGE_TIME_LIMITS,
  getPositionInCycle,
  isSecondHalf,
  isRitualNode,
  isEliteNode,
  isBossNode,
  getStageType,
  getBattleNumber,
  getTimeLimit,
  getCycleForStage,
  getNextBattleNode,
} from '../../../../src/systems/stage/stageFlow'

describe('stageFlow', () => {
  describe('CYCLE_LENGTH', () => {
    it('每 Cycle 12 关', () => {
      expect(CYCLE_LENGTH).toBe(12)
    })
  })

  describe('STAGE_TIME_LIMITS', () => {
    it('标准关 30 秒', () => {
      expect(STAGE_TIME_LIMITS.standard).toBe(30)
    })

    it('精英关 30 秒', () => {
      expect(STAGE_TIME_LIMITS.elite).toBe(30)
    })

    it('Boss 关 60 秒', () => {
      expect(STAGE_TIME_LIMITS.boss).toBe(60)
    })

    it('仪式关 0 秒', () => {
      expect(STAGE_TIME_LIMITS.ritual).toBe(0)
    })
  })

  describe('getPositionInCycle()', () => {
    it('第 1 关 → 位置 1', () => {
      expect(getPositionInCycle(1)).toBe(1)
    })

    it('第 12 关 → 位置 12', () => {
      expect(getPositionInCycle(12)).toBe(12)
    })

    it('第 13 关 → 位置 1（第二周期）', () => {
      expect(getPositionInCycle(13)).toBe(1)
    })
  })

  describe('isRitualNode()', () => {
    it('位置 6 是仪式节点', () => {
      expect(isRitualNode(6)).toBe(true)
      expect(isRitualNode(18)).toBe(true) // 第二周期
    })

    it('其他位置不是仪式节点', () => {
      expect(isRitualNode(1)).toBe(false)
      expect(isRitualNode(5)).toBe(false)
      expect(isRitualNode(12)).toBe(false)
    })
  })

  describe('isEliteNode()', () => {
    it('位置 5 是精英节点', () => {
      expect(isEliteNode(5)).toBe(true)
      expect(isEliteNode(17)).toBe(true) // 第二周期
    })

    it('其他位置不是精英节点', () => {
      expect(isEliteNode(1)).toBe(false)
      expect(isEliteNode(4)).toBe(false)
      expect(isEliteNode(6)).toBe(false)
      expect(isEliteNode(12)).toBe(false)
    })
  })

  describe('isBossNode()', () => {
    it('位置 12 是 Boss 节点', () => {
      expect(isBossNode(12)).toBe(true)
      expect(isBossNode(24)).toBe(true)
    })

    it('其他位置不是 Boss 节点', () => {
      expect(isBossNode(1)).toBe(false)
      expect(isBossNode(6)).toBe(false)
      expect(isBossNode(11)).toBe(false)
    })
  })

  describe('getStageType()', () => {
    it('位置 1-4 为 standard', () => {
      expect(getStageType(1)).toBe('standard')
      expect(getStageType(2)).toBe('standard')
      expect(getStageType(3)).toBe('standard')
      expect(getStageType(4)).toBe('standard')
    })

    it('位置 5 为 elite', () => {
      expect(getStageType(5)).toBe('elite')
    })

    it('位置 6 为 ritual', () => {
      expect(getStageType(6)).toBe('ritual')
    })

    it('位置 7-11 为 standard（除位置无特殊）', () => {
      expect(getStageType(7)).toBe('standard')
      expect(getStageType(8)).toBe('standard')
      expect(getStageType(9)).toBe('standard')
      expect(getStageType(10)).toBe('standard')
      expect(getStageType(11)).toBe('standard')
    })

    it('位置 12 为 boss', () => {
      expect(getStageType(12)).toBe('boss')
    })

    it('第二周期同理', () => {
      expect(getStageType(17)).toBe('elite')  // 位置 5
      expect(getStageType(18)).toBe('ritual') // 位置 6
      expect(getStageType(24)).toBe('boss')   // 位置 12
    })
  })

  describe('isSecondHalf()', () => {
    it('位置 1-6 不是后半段', () => {
      expect(isSecondHalf(1)).toBe(false)
      expect(isSecondHalf(6)).toBe(false)
    })

    it('位置 7-12 是后半段', () => {
      expect(isSecondHalf(7)).toBe(true)
      expect(isSecondHalf(12)).toBe(true)
    })
  })

  describe('getCycleForStage()', () => {
    it('前 12 关属于 Cycle 1', () => {
      expect(getCycleForStage(1)).toBe(1)
      expect(getCycleForStage(12)).toBe(1)
    })

    it('13-24 关属于 Cycle 2', () => {
      expect(getCycleForStage(13)).toBe(2)
      expect(getCycleForStage(24)).toBe(2)
    })
  })

  describe('getBattleNumber()', () => {
    it('位置 1-5 → battle 1-5', () => {
      expect(getBattleNumber(1)).toBe(1)
      expect(getBattleNumber(5)).toBe(5)
    })

    it('位置 7-12 → battle 6-11', () => {
      expect(getBattleNumber(7)).toBe(6)
      expect(getBattleNumber(12)).toBe(11)
    })
  })

  describe('getTimeLimit()', () => {
    it('标准关返回 30 秒', () => {
      expect(getTimeLimit(1)).toBe(30)
    })

    it('精英关返回 30 秒', () => {
      expect(getTimeLimit(5)).toBe(30)
    })

    it('Boss 关返回 60 秒', () => {
      expect(getTimeLimit(12)).toBe(60)
    })

    it('仪式关返回 0 秒', () => {
      expect(getTimeLimit(6)).toBe(0)
    })
  })

  describe('getNextBattleNode()', () => {
    it('每关 +1', () => {
      expect(getNextBattleNode(1)).toBe(2)
      expect(getNextBattleNode(11)).toBe(12)
      expect(getNextBattleNode(12)).toBe(13)
    })
  })
})
