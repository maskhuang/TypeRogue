// ============================================
// 打字肉鸽 - 打字/输入系统遗物行为测试 (Story 36.2)
// ============================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { state } from '../../../../src/core/state'
import { RELICS } from '../../../../src/data/relics'
import {
  canAutocomplete,
  checkSpeedRelics,
  hasGlassCannon,
  resetTypingRelicState,
  trackWord,
  isRepeatWord,
  initTypingRelicBehaviors,
  recordKeypressForTaiko,
  checkTaikoHit,
  getTaikoBonus,
  startTaikoSpawner,
  stopTaikoSpawner,
  resetTaikoState,
} from '../../../../src/systems/relics/TypingRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'

// === 辅助：清理遗物 + 状态 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
  resetTypingRelicState()
}

describe('打字/输入系统遗物行为 (Story 36.2)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
  })

  // =====================
  // AC1: 减速津贴
  // =====================
  describe('减速津贴 (decelerate_reward)', () => {
    beforeEach(() => {
      state.player.relics.add('decelerate_reward')
    })

    it('第一个词无奖励（无上一个词数据）', () => {
      const result = checkSpeedRelics(3.0)
      expect(result.timeBonus).toBe(0)
      expect(result.goldBonus).toBe(0)
    })

    it('当前词比上个词慢时 +0.5s', () => {
      checkSpeedRelics(2.0) // 第一个词
      const result = checkSpeedRelics(3.0) // 更慢
      expect(result.timeBonus).toBe(0.5)
    })

    it('当前词比上个词快时无奖励', () => {
      checkSpeedRelics(3.0) // 第一个词
      const result = checkSpeedRelics(2.0) // 更快
      expect(result.timeBonus).toBe(0)
    })

    it('用时相同时无奖励', () => {
      checkSpeedRelics(3.0)
      const result = checkSpeedRelics(3.0)
      expect(result.timeBonus).toBe(0)
    })

    it('未持有时无效果', () => {
      state.player.relics.delete('decelerate_reward')
      checkSpeedRelics(2.0)
      const result = checkSpeedRelics(4.0)
      expect(result.timeBonus).toBe(0)
    })

    it('关开始时重置上词用时', () => {
      checkSpeedRelics(2.0) // 记录上词
      resetTypingRelicState()
      const result = checkSpeedRelics(5.0) // 新关第一个词
      expect(result.timeBonus).toBe(0) // 无上词数据
    })
  })

  // =====================
  // AC2: 加速奖金
  // =====================
  describe('加速奖金 (accelerate_reward)', () => {
    beforeEach(() => {
      state.player.relics.add('accelerate_reward')
    })

    it('第一个词无奖励', () => {
      const result = checkSpeedRelics(2.0)
      expect(result.goldBonus).toBe(0)
    })

    it('当前词比上个词快时 +2 金币', () => {
      checkSpeedRelics(3.0)
      const result = checkSpeedRelics(2.0)
      expect(result.goldBonus).toBe(2)
    })

    it('当前词比上个词慢时无奖励', () => {
      checkSpeedRelics(2.0)
      const result = checkSpeedRelics(3.0)
      expect(result.goldBonus).toBe(0)
    })

    it('用时相同时无奖励', () => {
      checkSpeedRelics(2.0)
      const result = checkSpeedRelics(2.0)
      expect(result.goldBonus).toBe(0)
    })

    it('未持有时无效果', () => {
      state.player.relics.delete('accelerate_reward')
      checkSpeedRelics(3.0)
      const result = checkSpeedRelics(1.0)
      expect(result.goldBonus).toBe(0)
    })
  })

  // =====================
  // 双遗物交互
  // =====================
  describe('减速+加速 双持', () => {
    beforeEach(() => {
      state.player.relics.add('decelerate_reward')
      state.player.relics.add('accelerate_reward')
    })

    it('快 → 只给加速奖金', () => {
      checkSpeedRelics(3.0)
      const result = checkSpeedRelics(2.0)
      expect(result.timeBonus).toBe(0)
      expect(result.goldBonus).toBe(2)
    })

    it('慢 → 只给减速津贴', () => {
      checkSpeedRelics(2.0)
      const result = checkSpeedRelics(3.0)
      expect(result.timeBonus).toBe(0.5)
      expect(result.goldBonus).toBe(0)
    })
  })

  // =====================
  // AC3: 小助手
  // =====================
  describe('小助手 (little_helper)', () => {
    beforeEach(() => {
      state.player.relics.add('little_helper')
    })

    it('首次出现的词不可补全', () => {
      state.player.word = 'FIRE'
      state.player.index = 1
      expect(canAutocomplete()).toBe(false)
    })

    it('重复词且打完首字母可补全', () => {
      trackWord('FIRE')
      state.player.word = 'FIRE'
      state.player.index = 1
      expect(canAutocomplete()).toBe(true)
    })

    it('重复词未打首字母不可补全', () => {
      trackWord('FIRE')
      state.player.word = 'FIRE'
      state.player.index = 0
      expect(canAutocomplete()).toBe(false)
    })

    it('单词追踪大小写无关', () => {
      trackWord('fire')
      state.player.word = 'FIRE'
      state.player.index = 1
      expect(canAutocomplete()).toBe(true)
    })

    it('关开始时重置已见单词', () => {
      trackWord('FIRE')
      resetTypingRelicState()
      expect(isRepeatWord('FIRE')).toBe(false)
    })

    it('未持有小助手时不可补全', () => {
      state.player.relics.delete('little_helper')
      trackWord('FIRE')
      state.player.word = 'FIRE'
      state.player.index = 1
      expect(canAutocomplete()).toBe(false)
    })
  })

  // =====================
  // AC4: 太鼓节拍 (rhythm_adapt)
  // =====================
  describe('太鼓节拍 (rhythm_adapt)', () => {
    beforeEach(() => {
      state.player.relics.add('rhythm_adapt')
    })

    afterEach(() => {
      resetTaikoState()
    })

    it('未持有遗物时 checkTaikoHit 返回 1', () => {
      state.player.relics.delete('rhythm_adapt')
      expect(checkTaikoHit()).toBe(1)
      expect(getTaikoBonus()).toBe(0)
    })

    it('无小球时 checkTaikoHit 返回 1', () => {
      expect(checkTaikoHit()).toBe(1)
      expect(getTaikoBonus()).toBe(0)
    })

    it('recordKeypressForTaiko 不抛错', () => {
      expect(() => recordKeypressForTaiko()).not.toThrow()
    })
  })

  // =====================
  // AC5: 回归基本功 (原玻璃大炮)
  // =====================
  describe('回归基本功 (glass_cannon_v2)', () => {
    it('持有时 hasGlassCannon 返回 true', () => {
      state.player.relics.add('glass_cannon_v2')
      expect(hasGlassCannon()).toBe(true)
    })

    it('未持有时返回 false', () => {
      expect(hasGlassCannon()).toBe(false)
    })

    it('遗物数据存在且 behaviorType 正确', () => {
      const relic = RELICS['glass_cannon_v2']
      expect(relic).toBeDefined()
      expect(relic.behaviorType).toBe('glass_cannon')
      expect(relic.category).toBe('risk-reward')
      expect(relic.name).toBe('薇姬')
      expect(relic.archiveCode).toBe('Ptro-HAY-001')
    })
  })

  // =====================
  // 行为注册
  // =====================
  describe('initTypingRelicBehaviors', () => {
    it('注册 5 个打字遗物行为', () => {
      initTypingRelicBehaviors()
      const registered = getRegisteredBehaviors()
      expect(registered).toContain('decelerate_reward')
      expect(registered).toContain('accelerate_reward')
      expect(registered).toContain('autocomplete')
      expect(registered).toContain('rhythm_adapt')
      expect(registered).toContain('glass_cannon')
    })
  })

  // =====================
  // 遗物数据验证
  // =====================
  describe('遗物数据完整性', () => {
    const TYPING_RELICS = ['decelerate_reward', 'accelerate_reward', 'little_helper', 'rhythm_adapt', 'glass_cannon_v2']

    it('所有 5 个打字遗物存在', () => {
      for (const id of TYPING_RELICS) {
        expect(RELICS[id], `${id} should exist`).toBeDefined()
      }
    })

    it('所有打字遗物 subsystem = typing', () => {
      for (const id of TYPING_RELICS) {
        expect(RELICS[id].subsystem).toBe('typing')
      }
    })

    it('所有打字遗物有 behaviorType', () => {
      for (const id of TYPING_RELICS) {
        expect(RELICS[id].behaviorType).toBeTruthy()
      }
    })

    it('图标唯一', () => {
      const icons = TYPING_RELICS.map(id => RELICS[id].icon)
      expect(new Set(icons).size).toBe(TYPING_RELICS.length)
    })
  })
})
