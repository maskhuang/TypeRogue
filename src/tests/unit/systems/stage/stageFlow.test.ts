// ============================================
// 打字肉鸽 - stageFlow 单元测试
// ============================================
// Story 18.1: 10 节点关卡流程辅助

import { describe, it, expect } from 'vitest'
import {
  STAGE_TIME_LIMITS,
  TOTAL_NODES,
  getStageType,
  getActForNode,
  getBattleNumber,
  isRestNode,
  isEliteNode,
  isBossNode,
  getTimeLimit,
  getNextBattleNode,
  getEliteModifierIndex,
  hasRestAfter,
} from '../../../../src/systems/stage/stageFlow'

describe('stageFlow', () => {
  describe('STAGE_TIME_LIMITS', () => {
    it('标准关 30 秒', () => {
      expect(STAGE_TIME_LIMITS.standard).toBe(30)
    })

    it('精英关 45 秒', () => {
      expect(STAGE_TIME_LIMITS.elite).toBe(45)
    })

    it('Boss 关 60 秒', () => {
      expect(STAGE_TIME_LIMITS.boss).toBe(60)
    })

    it('休息关 0 秒', () => {
      expect(STAGE_TIME_LIMITS.rest).toBe(0)
    })
  })

  describe('TOTAL_NODES', () => {
    it('总节点数为 10', () => {
      expect(TOTAL_NODES).toBe(10)
    })
  })

  describe('getStageType()', () => {
    it('节点 1, 2 为 standard', () => {
      expect(getStageType(1)).toBe('standard')
      expect(getStageType(2)).toBe('standard')
    })

    it('节点 3 为 elite', () => {
      expect(getStageType(3)).toBe('elite')
    })

    it('节点 4 为 rest', () => {
      expect(getStageType(4)).toBe('rest')
    })

    it('节点 5 为 standard', () => {
      expect(getStageType(5)).toBe('standard')
    })

    it('节点 6 为 elite', () => {
      expect(getStageType(6)).toBe('elite')
    })

    it('节点 7 为 standard', () => {
      expect(getStageType(7)).toBe('standard')
    })

    it('节点 8 为 rest', () => {
      expect(getStageType(8)).toBe('rest')
    })

    it('节点 9 为 elite', () => {
      expect(getStageType(9)).toBe('elite')
    })

    it('节点 10 为 boss', () => {
      expect(getStageType(10)).toBe('boss')
    })

    it('无效节点返回 standard', () => {
      expect(getStageType(0)).toBe('standard')
      expect(getStageType(11)).toBe('standard')
    })
  })

  describe('getActForNode()', () => {
    it('Act 1: 节点 1-4', () => {
      expect(getActForNode(1)).toBe(1)
      expect(getActForNode(2)).toBe(1)
      expect(getActForNode(3)).toBe(1)
      expect(getActForNode(4)).toBe(1)
    })

    it('Act 2: 节点 5-8', () => {
      expect(getActForNode(5)).toBe(2)
      expect(getActForNode(6)).toBe(2)
      expect(getActForNode(7)).toBe(2)
      expect(getActForNode(8)).toBe(2)
    })

    it('Act 3: 节点 9-10', () => {
      expect(getActForNode(9)).toBe(3)
      expect(getActForNode(10)).toBe(3)
    })

    it('无效节点返回 1', () => {
      expect(getActForNode(0)).toBe(1)
    })
  })

  describe('getBattleNumber()', () => {
    it('标准/精英/Boss 节点有战斗编号 1-8', () => {
      expect(getBattleNumber(1)).toBe(1)
      expect(getBattleNumber(2)).toBe(2)
      expect(getBattleNumber(3)).toBe(3)
      expect(getBattleNumber(5)).toBe(4)
      expect(getBattleNumber(6)).toBe(5)
      expect(getBattleNumber(7)).toBe(6)
      expect(getBattleNumber(9)).toBe(7)
      expect(getBattleNumber(10)).toBe(8)
    })

    it('休息关无战斗编号（返回 0）', () => {
      expect(getBattleNumber(4)).toBe(0)
      expect(getBattleNumber(8)).toBe(0)
    })
  })

  describe('isRestNode()', () => {
    it('节点 4 和 8 为休息关', () => {
      expect(isRestNode(4)).toBe(true)
      expect(isRestNode(8)).toBe(true)
    })

    it('其他节点不是休息关', () => {
      expect(isRestNode(1)).toBe(false)
      expect(isRestNode(3)).toBe(false)
      expect(isRestNode(10)).toBe(false)
    })
  })

  describe('isEliteNode()', () => {
    it('节点 3, 6, 9 为精英关', () => {
      expect(isEliteNode(3)).toBe(true)
      expect(isEliteNode(6)).toBe(true)
      expect(isEliteNode(9)).toBe(true)
    })

    it('其他节点不是精英关', () => {
      expect(isEliteNode(1)).toBe(false)
      expect(isEliteNode(4)).toBe(false)
      expect(isEliteNode(10)).toBe(false)
    })
  })

  describe('isBossNode()', () => {
    it('节点 10 为 Boss 关', () => {
      expect(isBossNode(10)).toBe(true)
    })

    it('其他节点不是 Boss 关', () => {
      expect(isBossNode(1)).toBe(false)
      expect(isBossNode(9)).toBe(false)
    })
  })

  describe('getTimeLimit()', () => {
    it('标准关返回 30 秒', () => {
      expect(getTimeLimit(1)).toBe(30)
      expect(getTimeLimit(2)).toBe(30)
      expect(getTimeLimit(5)).toBe(30)
      expect(getTimeLimit(7)).toBe(30)
    })

    it('精英关返回 45 秒', () => {
      expect(getTimeLimit(3)).toBe(45)
      expect(getTimeLimit(6)).toBe(45)
      expect(getTimeLimit(9)).toBe(45)
    })

    it('Boss 关返回 60 秒', () => {
      expect(getTimeLimit(10)).toBe(60)
    })

    it('休息关返回 0 秒', () => {
      expect(getTimeLimit(4)).toBe(0)
      expect(getTimeLimit(8)).toBe(0)
    })
  })

  describe('getNextBattleNode()', () => {
    it('标准节点下一个为相邻节点', () => {
      expect(getNextBattleNode(1)).toBe(2)
      expect(getNextBattleNode(2)).toBe(3)
    })

    it('跳过休息关（节点 3 → 5）', () => {
      expect(getNextBattleNode(3)).toBe(5)
    })

    it('跳过休息关（节点 7 → 9）', () => {
      expect(getNextBattleNode(7)).toBe(9)
    })

    it('节点 5 → 6', () => {
      expect(getNextBattleNode(5)).toBe(6)
    })

    it('节点 6 → 7', () => {
      expect(getNextBattleNode(6)).toBe(7)
    })

    it('节点 9 → 10', () => {
      expect(getNextBattleNode(9)).toBe(10)
    })

    it('节点 10 后通关（返回 -1）', () => {
      expect(getNextBattleNode(10)).toBe(-1)
    })
  })

  describe('getEliteModifierIndex()', () => {
    it('节点 3 → 修饰器 A (index 0)', () => {
      expect(getEliteModifierIndex(3)).toBe(0)
    })

    it('节点 6 → 修饰器 B (index 1)', () => {
      expect(getEliteModifierIndex(6)).toBe(1)
    })

    it('节点 9 → 修饰器 C (index 2)', () => {
      expect(getEliteModifierIndex(9)).toBe(2)
    })

    it('非精英关返回 -1', () => {
      expect(getEliteModifierIndex(1)).toBe(-1)
      expect(getEliteModifierIndex(4)).toBe(-1)
      expect(getEliteModifierIndex(10)).toBe(-1)
    })
  })

  describe('hasRestAfter()', () => {
    it('节点 3 后有休息关', () => {
      expect(hasRestAfter(3)).toBe(true)
    })

    it('节点 7 后有休息关', () => {
      expect(hasRestAfter(7)).toBe(true)
    })

    it('节点 1 后无休息关', () => {
      expect(hasRestAfter(1)).toBe(false)
    })

    it('节点 9 后无休息关', () => {
      expect(hasRestAfter(9)).toBe(false)
    })

    it('节点 10 后无休息关（超出范围）', () => {
      expect(hasRestAfter(10)).toBe(false)
    })
  })
})
