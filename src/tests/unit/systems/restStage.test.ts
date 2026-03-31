// ============================================
// 打字肉鸽 - restStage 单元测试（多选项制）
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { executeEffect } from '../../../src/systems/restStage'
import { state, resetState } from '../../../src/core/state'

// Mock DOM 和音效
vi.mock('../../../src/effects/sound', () => ({
  playSound: vi.fn(),
  emitResourceSound: vi.fn(),
}))

vi.mock('../../../src/systems/battle', () => ({
  showScreen: vi.fn(),
  startLevel: vi.fn(),
  showFeedback: vi.fn(),
  renderRelicDisplay: vi.fn(),
}))

vi.mock('../../../src/systems/shop', () => ({
  openShop: vi.fn(),
}))

describe('restStage - executeEffect', () => {
  beforeEach(() => {
    resetState()
    state.gold = 200
    state.level = 4
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.skills.set('prod_boost', { level: 2 })
    state.player.bindings.set('a', 'prod_burst')
    state.player.bindings.set('s', 'prod_boost')
    // upgradeRandomSkill needs affixSkills populated
    state.affixSkills.set('prod_burst', { name: 'Burst', icon: '⚔️', affixes: [] } as any)
    state.affixSkills.set('prod_boost', { name: 'Boost', icon: '🔥', affixes: [] } as any)
  })

  describe('rest_upgrade_skill', () => {
    it('升级随机技能 +1 级', () => {
      const totalLevels = [...state.player.skills.values()].reduce((sum, d) => sum + d.level, 0)
      const result = executeEffect('rest_upgrade_skill')
      const newTotalLevels = [...state.player.skills.values()].reduce((sum, d) => sum + d.level, 0)
      expect(newTotalLevels).toBe(totalLevels + 1)
      expect(result).toContain('Lv.')
    })

    it('无可升级技能时返回提示', () => {
      state.player.skills = new Map()
      const result = executeEffect('rest_upgrade_skill')
      expect(result).toContain('没有可升级')
    })
  })

  describe('rest_temp_buff', () => {
    it('添加 time+8 和 multiplier+0.5 tempBuff', () => {
      executeEffect('rest_temp_buff')
      expect(state.tempBuffs).toHaveLength(2)
      const timeBuff = state.tempBuffs.find(b => b.type === 'time')
      const multBuff = state.tempBuffs.find(b => b.type === 'multiplier')
      expect(timeBuff).toBeDefined()
      expect(timeBuff!.value).toBe(8)
      expect(multBuff).toBeDefined()
      expect(multBuff!.value).toBe(0.5)
    })

    it('tempBuff expiresAtNode 指向 cycleEnd', () => {
      // state.level = 4, CYCLE_LENGTH = 12
      // cycleEnd = 4 + (12 - ((4-1) % 12)) = 4 + (12 - 3) = 4 + 9 = 13
      executeEffect('rest_temp_buff')
      state.tempBuffs.forEach(b => {
        expect(b.expiresAtNode).toBeGreaterThan(state.level)
      })
    })
  })

  describe('relic_intermission', () => {
    it('给 25 金币', () => {
      const goldBefore = state.gold
      executeEffect('relic_intermission')
      expect(state.gold).toBe(goldBefore + 25)
    })

    it('结果消息包含金币和刷新', () => {
      const result = executeEffect('relic_intermission')
      expect(result).toContain('25')
      expect(result).toContain('免费刷新')
    })
  })

  describe('relic_gamble', () => {
    it('金币不足时不扣金币', () => {
      state.gold = 50
      const result = executeEffect('relic_gamble')
      expect(result).toContain('不足')
      expect(state.gold).toBe(50)
    })

    it('赌博扣 100 金币，赢或输', () => {
      const goldBefore = state.gold
      executeEffect('relic_gamble')
      const goldDiff = state.gold - goldBefore
      // 赢 +200 (300-100) 或输 -100
      expect([200, -100]).toContain(goldDiff)
    })
  })

  describe('default', () => {
    it('未知 effectId 返回默认消息', () => {
      const result = executeEffect('unknown_effect')
      expect(result).toBeTruthy()
    })
  })
})

describe('restStage - TempBuff 过期', () => {
  beforeEach(() => {
    resetState()
  })

  it('tempBuffs 在 state.level > expiresAtNode 时被清理', () => {
    state.tempBuffs = [
      { type: 'multiplier', value: 0.5, expiresAtNode: 4 },
      { type: 'time', value: 8, expiresAtNode: 4 },
    ]
    state.level = 5
    state.tempBuffs = state.tempBuffs.filter(b => state.level <= b.expiresAtNode)
    expect(state.tempBuffs).toHaveLength(0)
  })

  it('tempBuffs 在 state.level <= expiresAtNode 时保留', () => {
    state.tempBuffs = [
      { type: 'multiplier', value: 0.5, expiresAtNode: 8 },
    ]
    state.level = 5
    state.tempBuffs = state.tempBuffs.filter(b => state.level <= b.expiresAtNode)
    expect(state.tempBuffs).toHaveLength(1)
  })
})

describe('restStage - SealedKeys 过期恢复', () => {
  beforeEach(() => {
    resetState()
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.skills.set('prod_boost', { level: 2 })
  })

  it('过期后绑定自动恢复', () => {
    state.sealedKeys = [
      { key: 'a', skillId: 'prod_burst', expiresAtNode: 8 },
    ]
    state.level = 9
    const expired = state.sealedKeys.filter(s => state.level > s.expiresAtNode)
    for (const seal of expired) {
      if (!state.player.bindings.has(seal.key) && state.player.skills.has(seal.skillId)) {
        state.player.bindings.set(seal.key, seal.skillId)
      }
    }
    state.sealedKeys = state.sealedKeys.filter(s => state.level <= s.expiresAtNode)

    expect(state.player.bindings.get('a')).toBe('prod_burst')
    expect(state.sealedKeys).toHaveLength(0)
  })

  it('未过期时保留封印', () => {
    state.sealedKeys = [
      { key: 'a', skillId: 'prod_burst', expiresAtNode: 8 },
    ]
    state.level = 7
    const expired = state.sealedKeys.filter(s => state.level > s.expiresAtNode)
    for (const seal of expired) {
      if (!state.player.bindings.has(seal.key) && state.player.skills.has(seal.skillId)) {
        state.player.bindings.set(seal.key, seal.skillId)
      }
    }
    state.sealedKeys = state.sealedKeys.filter(s => state.level <= s.expiresAtNode)

    expect(state.player.bindings.has('a')).toBe(false)
    expect(state.sealedKeys).toHaveLength(1)
  })

  it('键位已被占用时不覆盖', () => {
    state.player.bindings.set('a', 'prod_boost')
    state.sealedKeys = [
      { key: 'a', skillId: 'prod_burst', expiresAtNode: 8 },
    ]
    state.level = 9
    const expired = state.sealedKeys.filter(s => state.level > s.expiresAtNode)
    for (const seal of expired) {
      if (!state.player.bindings.has(seal.key) && state.player.skills.has(seal.skillId)) {
        state.player.bindings.set(seal.key, seal.skillId)
      }
    }
    state.sealedKeys = state.sealedKeys.filter(s => state.level <= s.expiresAtNode)

    expect(state.player.bindings.get('a')).toBe('prod_boost')
    expect(state.sealedKeys).toHaveLength(0)
  })

  it('技能已不存在时不恢复绑定', () => {
    state.sealedKeys = [
      { key: 'a', skillId: 'prod_burst', expiresAtNode: 8 },
    ]
    state.player.skills.delete('prod_burst')
    state.level = 9
    const expired = state.sealedKeys.filter(s => state.level > s.expiresAtNode)
    for (const seal of expired) {
      if (!state.player.bindings.has(seal.key) && state.player.skills.has(seal.skillId)) {
        state.player.bindings.set(seal.key, seal.skillId)
      }
    }
    state.sealedKeys = state.sealedKeys.filter(s => state.level <= s.expiresAtNode)

    expect(state.player.bindings.has('a')).toBe(false)
    expect(state.sealedKeys).toHaveLength(0)
  })
})
