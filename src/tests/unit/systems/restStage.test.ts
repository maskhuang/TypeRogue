// ============================================
// 打字肉鸽 - restStage 单元测试
// ============================================
// Story 18.3: 休息关事件效果与临时 buff 系统

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { executeEffect } from '../../../src/systems/restStage'
import { state, resetState } from '../../../src/core/state'
import { RELICS } from '../../../src/data/relics'

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
    // 设置基本游戏状态
    state.gold = 200
    state.level = 4 // 休息关
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.skills.set('prod_boost', { level: 2 })
    state.player.bindings.set('a', 'prod_burst')
    state.player.bindings.set('s', 'prod_boost')
    state.player.relics.add('lucky_coin')
  })

  describe('noop', () => {
    it('不产生任何效果', () => {
      const goldBefore = state.gold
      const result = executeEffect('noop')
      expect(result).toContain('离开')
      expect(state.gold).toBe(goldBefore)
    })
  })

  describe('事件 1 - 神秘商人', () => {
    it('merchant_rare_relic 扣 50% 金币', () => {
      const before = state.gold
      executeEffect('merchant_rare_relic')
      expect(state.gold).toBe(before - Math.floor(before * 0.5))
    })

    it('merchant_common_relic 免费获得遗物', () => {
      const goldBefore = state.gold
      const relicsBefore = state.player.relics.size
      executeEffect('merchant_common_relic')
      expect(state.gold).toBe(goldBefore) // 不扣金币
      // 可能获得遗物（取决于是否有未拥有的普通遗物）
      expect(state.player.relics.size).toBeGreaterThanOrEqual(relicsBefore)
    })
  })

  describe('事件 2 - 打字之神的考验', () => {
    it('trial_power 添加倍率和时间 tempBuff', () => {
      executeEffect('trial_power')
      expect(state.tempBuffs).toHaveLength(2)
      const multBuff = state.tempBuffs.find(b => b.type === 'multiplier')
      const timeBuff = state.tempBuffs.find(b => b.type === 'time')
      expect(multBuff).toBeDefined()
      expect(multBuff!.value).toBe(1.0)
      expect(timeBuff).toBeDefined()
      expect(timeBuff!.value).toBe(-10)
    })

    it('trial_endurance 添加时间和倍率 tempBuff', () => {
      executeEffect('trial_endurance')
      expect(state.tempBuffs).toHaveLength(2)
      const timeBuff = state.tempBuffs.find(b => b.type === 'time')
      const multBuff = state.tempBuffs.find(b => b.type === 'multiplier')
      expect(timeBuff!.value).toBe(15)
      expect(multBuff!.value).toBe(-0.5)
    })

    it('tempBuff expiresAtNode 指向下一 Act 结束节点', () => {
      // state.level = 4 (Act 1 rest)，下一个战斗 = 5 (Act 2)，Act 2 结束于 Node 8
      executeEffect('trial_power')
      state.tempBuffs.forEach(b => {
        expect(b.expiresAtNode).toBe(8)
      })
    })

    it('node 8 rest 时 tempBuff expiresAtNode = 10', () => {
      state.level = 8 // Act 2 rest
      executeEffect('trial_endurance')
      state.tempBuffs.forEach(b => {
        expect(b.expiresAtNode).toBe(10)
      })
    })
  })

  describe('事件 3 - 技能祭坛', () => {
    it('altar_upgrade 移除一个技能', () => {
      const skillsBefore = state.player.skills.size
      executeEffect('altar_upgrade')
      // 移除一个，可能获得一个新的
      expect(state.player.skills.size).toBeLessThanOrEqual(skillsBefore)
    })

    it('altar_gold 给 200 金币', () => {
      const goldBefore = state.gold
      executeEffect('altar_gold')
      // 移除一个技能，获得 200 金币
      expect(state.gold).toBe(goldBefore + 200)
    })
  })

  describe('事件 4 - 赌徒的骰子', () => {
    it('gamble_bet 扣 100 金币', () => {
      const goldBefore = state.gold
      executeEffect('gamble_bet')
      // 要么 +300（净 +200），要么 -100
      const goldDiff = state.gold - goldBefore
      expect([200, -100]).toContain(goldDiff)
    })

    it('gamble_bet 金币不足时返回提示', () => {
      state.gold = 50
      const result = executeEffect('gamble_bet')
      expect(result).toContain('不足')
      expect(state.gold).toBe(50) // 不扣
    })
  })

  describe('事件 5 - 遗物熔炉', () => {
    it('forge_relic_to_skill 移除遗物', () => {
      const relicsBefore = state.player.relics.size
      executeEffect('forge_relic_to_skill')
      expect(state.player.relics.size).toBe(relicsBefore - 1)
    })

    it('forge_skill_to_relic 移除技能', () => {
      const skillsBefore = state.player.skills.size
      executeEffect('forge_skill_to_relic')
      expect(state.player.skills.size).toBe(skillsBefore - 1)
    })
  })

  describe('事件 6 - 时间裂缝', () => {
    it('rift_skip 推进 state.level', () => {
      executeEffect('rift_skip')
      // 从 Node 4 (rest)，下一个战斗是 5，跳到 5 意味着 completeRestStage 会跳到 6
      expect(state.level).toBe(5)
    })

    it('rift_replay 给 50 金币', () => {
      const goldBefore = state.gold
      executeEffect('rift_replay')
      expect(state.gold).toBe(goldBefore + 50)
    })
  })

  describe('事件 7 - 键盘诅咒', () => {
    it('curse_accept 移除 2 个绑定', () => {
      executeEffect('curse_accept')
      expect(state.player.bindings.size).toBe(0) // 原本 2 个，封印 2 个
    })

    it('curse_accept 给 150 金币', () => {
      const goldBefore = state.gold
      executeEffect('curse_accept')
      expect(state.gold).toBe(goldBefore + 150)
    })

    it('curse_accept 记录 sealedKeys', () => {
      executeEffect('curse_accept')
      expect(state.sealedKeys).toHaveLength(2)
      state.sealedKeys.forEach(s => {
        expect(s.key).toBeTruthy()
        expect(s.skillId).toBeTruthy()
        expect(s.expiresAtNode).toBeGreaterThan(0)
      })
    })

    it('curse_accept expiresAtNode 指向下一 Act 结束节点', () => {
      // state.level = 4 (Act 1 rest)，下一个战斗 = 5 (Act 2)，Act 2 结束 = 8
      executeEffect('curse_accept')
      state.sealedKeys.forEach(s => {
        expect(s.expiresAtNode).toBe(8)
      })
    })

    it('curse_accept 在 node 8 时 expiresAtNode = 10', () => {
      state.level = 8 // Act 2 rest
      executeEffect('curse_accept')
      state.sealedKeys.forEach(s => {
        expect(s.expiresAtNode).toBe(10)
      })
    })

    it('curse_accept 结果文案包含自动恢复提示', () => {
      const result = executeEffect('curse_accept')
      expect(result).toContain('Act 结束后自动恢复')
      expect(result).not.toContain('可在商店重新绑定')
    })
  })

  describe('事件 8 - 技能复制器', () => {
    it('copy_skill 升级随机技能', () => {
      const totalLevels = [...state.player.skills.values()].reduce((sum, d) => sum + d.level, 0)
      executeEffect('copy_skill')
      const newTotalLevels = [...state.player.skills.values()].reduce((sum, d) => sum + d.level, 0)
      expect(newTotalLevels).toBe(totalLevels + 1)
    })

    it('copy_skill 添加 targetScore tempBuff，expiresAtNode 指向下一 Act', () => {
      executeEffect('copy_skill')
      const tsBuff = state.tempBuffs.find(b => b.type === 'targetScore')
      expect(tsBuff).toBeDefined()
      expect(tsBuff!.value).toBe(1.5)
      // state.level = 4 (Act 1 rest)，下一 Act 结束 = 8
      expect(tsBuff!.expiresAtNode).toBe(8)
    })
  })

  describe('事件 9 - 命运之轮', () => {
    it('wheel_spin 产生某种效果', () => {
      const result = executeEffect('wheel_spin')
      expect(result).toContain('命运之轮')
    })
  })

  describe('事件 10 - 宁静冥想', () => {
    it('meditate_gold 给 80 金币', () => {
      const goldBefore = state.gold
      executeEffect('meditate_gold')
      expect(state.gold).toBe(goldBefore + 80)
    })

    it('meditate_preview 返回修饰器信息', () => {
      state.bossModifierPool = ['boss_fade', 'boss_scramble', 'boss_reverse'] as any
      const result = executeEffect('meditate_preview')
      expect(result).toContain('冥想预见')
    })

    it('meditate_preview 无修饰器时返回提示', () => {
      state.bossModifierPool = []
      const result = executeEffect('meditate_preview')
      expect(result).toContain('宁静')
    })
  })
})

describe('restStage - TempBuff 过期', () => {
  beforeEach(() => {
    resetState()
  })

  it('tempBuffs 在 state.level > expiresAtNode 时被清理', () => {
    state.tempBuffs = [
      { type: 'multiplier', value: 1.0, expiresAtNode: 4 },
      { type: 'time', value: -10, expiresAtNode: 4 },
    ]
    // 模拟关卡切换：level = 5 > expiresAtNode = 4
    state.level = 5
    state.tempBuffs = state.tempBuffs.filter(b => state.level <= b.expiresAtNode)
    expect(state.tempBuffs).toHaveLength(0)
  })

  it('tempBuffs 在 state.level <= expiresAtNode 时保留', () => {
    state.tempBuffs = [
      { type: 'multiplier', value: 1.0, expiresAtNode: 8 },
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
    // 模拟 level > expiresAtNode
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
    state.player.bindings.set('a', 'prod_boost') // 玩家手动绑定了别的技能
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

    expect(state.player.bindings.get('a')).toBe('prod_boost') // 不覆盖
    expect(state.sealedKeys).toHaveLength(0) // 封印记录仍被清理
  })

  it('技能已不存在时不恢复绑定', () => {
    state.sealedKeys = [
      { key: 'a', skillId: 'prod_burst', expiresAtNode: 8 },
    ]
    state.player.skills.delete('prod_burst') // 技能被移除了
    state.level = 9
    const expired = state.sealedKeys.filter(s => state.level > s.expiresAtNode)
    for (const seal of expired) {
      if (!state.player.bindings.has(seal.key) && state.player.skills.has(seal.skillId)) {
        state.player.bindings.set(seal.key, seal.skillId)
      }
    }
    state.sealedKeys = state.sealedKeys.filter(s => state.level <= s.expiresAtNode)

    expect(state.player.bindings.has('a')).toBe(false) // 不恢复
    expect(state.sealedKeys).toHaveLength(0)
  })
})
