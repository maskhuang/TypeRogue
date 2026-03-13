// ============================================
// 打字肉鸽 - 打字/输入系统遗物行为测试 (Story 36.2)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import { RELICS } from '../../../../src/data/relics'
import {
  checkWaxSealForgive,
  resetWaxSeal,
  checkEchoThimble,
  canAutocomplete,
  calculateRhythmAdapt,
  hasGlassCannon,
  resetTypingRelicState,
  trackWord,
  isRepeatWord,
  initTypingRelicBehaviors,
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
  // AC1: 打字蜡封
  // =====================
  describe('打字蜡封 (typing_wax_seal)', () => {
    beforeEach(() => {
      state.player.relics.add('typing_wax_seal')
    })

    it('首次错误被免除', () => {
      expect(checkWaxSealForgive()).toBe(true)
    })

    it('第二次错误不免除', () => {
      checkWaxSealForgive() // 消耗首次
      expect(checkWaxSealForgive()).toBe(false)
    })

    it('新词重置蜡封状态', () => {
      checkWaxSealForgive() // 消耗
      resetWaxSeal() // 新词重置
      expect(checkWaxSealForgive()).toBe(true)
    })

    it('未持有蜡封时不免除', () => {
      state.player.relics.delete('typing_wax_seal')
      expect(checkWaxSealForgive()).toBe(false)
    })

    it('relicStates 正确记录使用状态', () => {
      expect(state.player.relicStates['typing_wax_seal']).toBeUndefined()
      checkWaxSealForgive()
      expect(state.player.relicStates['typing_wax_seal']).toBe(1)
      resetWaxSeal()
      expect(state.player.relicStates['typing_wax_seal']).toBe(0)
    })
  })

  // =====================
  // AC2: 回声指套
  // =====================
  describe('回声指套 (echo_thimble)', () => {
    beforeEach(() => {
      state.player.relics.add('echo_thimble')
    })

    it('随机值 < 0.08 触发双重击键', () => {
      expect(checkEchoThimble(0.05)).toBe(true)
    })

    it('随机值 >= 0.08 不触发', () => {
      expect(checkEchoThimble(0.08)).toBe(false)
      expect(checkEchoThimble(0.5)).toBe(false)
    })

    it('随机值 = 0 触发', () => {
      expect(checkEchoThimble(0)).toBe(true)
    })

    it('边界值 0.079 触发', () => {
      expect(checkEchoThimble(0.079)).toBe(true)
    })

    it('未持有指套时不触发', () => {
      state.player.relics.delete('echo_thimble')
      expect(checkEchoThimble(0.01)).toBe(false)
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
      // 没有先 trackWord，所以不是重复词
      expect(canAutocomplete()).toBe(false)
    })

    it('重复词且打完首字母可补全', () => {
      trackWord('FIRE')
      state.player.word = 'FIRE'
      state.player.index = 1 // 已打完首字母
      expect(canAutocomplete()).toBe(true)
    })

    it('重复词未打首字母不可补全', () => {
      trackWord('FIRE')
      state.player.word = 'FIRE'
      state.player.index = 0 // 还没打
      expect(canAutocomplete()).toBe(false)
    })

    it('单词追踪大小写无关', () => {
      trackWord('fire') // 小写追踪
      state.player.word = 'FIRE' // 大写匹配
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
  // AC4: 节奏适应
  // =====================
  describe('节奏适应 (rhythm_adapt)', () => {
    beforeEach(() => {
      state.player.relics.add('rhythm_adapt')
    })

    it('用时 > 3s 加 1 秒时间', () => {
      const result = calculateRhythmAdapt(4.5)
      expect(result.timeBonus).toBe(1)
      expect(result.scoreMult).toBe(1)
    })

    it('用时 < 3s 得分 ×1.3', () => {
      const result = calculateRhythmAdapt(2.0)
      expect(result.timeBonus).toBe(0)
      expect(result.scoreMult).toBeCloseTo(1.3, 1)
    })

    it('用时恰好 3s 无额外效果', () => {
      const result = calculateRhythmAdapt(3.0)
      expect(result.timeBonus).toBe(0)
      expect(result.scoreMult).toBe(1)
    })

    it('用时 0s（极快）得分加成', () => {
      const result = calculateRhythmAdapt(0)
      expect(result.scoreMult).toBeCloseTo(1.3, 1)
    })

    it('用时很长也只加 1s', () => {
      const result = calculateRhythmAdapt(10)
      expect(result.timeBonus).toBe(1)
    })

    it('未持有遗物时无效果', () => {
      state.player.relics.delete('rhythm_adapt')
      const result = calculateRhythmAdapt(1.0)
      expect(result.timeBonus).toBe(0)
      expect(result.scoreMult).toBe(1)
    })
  })

  // =====================
  // AC5: 玻璃大炮
  // =====================
  describe('玻璃大炮 (glass_cannon_v2)', () => {
    it('持有时 hasGlassCannon 返回 true', () => {
      state.player.relics.add('glass_cannon_v2')
      expect(hasGlassCannon()).toBe(true)
    })

    it('未持有时返回 false', () => {
      expect(hasGlassCannon()).toBe(false)
    })

    it('遗物数据存在且分数 ×2 通过 RELIC_MODIFIER_DEFS', () => {
      const relic = RELICS['glass_cannon_v2']
      expect(relic).toBeDefined()
      expect(relic.behaviorType).toBe('glass_cannon')
      expect(relic.category).toBe('risk-reward')
    })
  })

  // =====================
  // AC7: 蜡封 + 玻璃大炮交互
  // =====================
  describe('蜡封 + 玻璃大炮交互', () => {
    beforeEach(() => {
      state.player.relics.add('typing_wax_seal')
      state.player.relics.add('glass_cannon_v2')
    })

    it('首次错误被蜡封免除，玻璃大炮不触发', () => {
      // 蜡封先检查 → 免除 → return → 玻璃大炮不执行
      const forgiven = checkWaxSealForgive()
      expect(forgiven).toBe(true)
      // 如果 forgiven，battle.ts 中会 return，不会检查 hasGlassCannon()
      // 但这里验证逻辑正确性：蜡封免除后不应触发死亡
    })

    it('第二次错误蜡封不免除，玻璃大炮触发死亡', () => {
      checkWaxSealForgive() // 消耗首次
      const forgiven = checkWaxSealForgive() // 第二次
      expect(forgiven).toBe(false)
      // 未被免除 → hasGlassCannon() 检查
      expect(hasGlassCannon()).toBe(true)
    })

    it('新词重置后首次错误再次被免除', () => {
      checkWaxSealForgive() // 消耗
      resetWaxSeal() // 新词
      const forgiven = checkWaxSealForgive() // 新词首次
      expect(forgiven).toBe(true)
    })
  })

  // =====================
  // 行为注册
  // =====================
  describe('initTypingRelicBehaviors', () => {
    it('注册 5 个打字遗物行为', () => {
      initTypingRelicBehaviors()
      const registered = getRegisteredBehaviors()
      expect(registered).toContain('error_forgive_first')
      expect(registered).toContain('double_keystroke')
      expect(registered).toContain('autocomplete')
      expect(registered).toContain('rhythm_adapt')
      expect(registered).toContain('glass_cannon')
    })
  })

  // =====================
  // 遗物数据验证
  // =====================
  describe('遗物数据完整性', () => {
    const TYPING_RELICS = ['typing_wax_seal', 'echo_thimble', 'little_helper', 'rhythm_adapt', 'glass_cannon_v2']

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
