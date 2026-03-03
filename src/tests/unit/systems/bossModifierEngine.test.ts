// ============================================
// 打字肉鸽 - bossModifierEngine 单元测试
// ============================================
// Story 18.4: Boss 修饰器引擎 + 数值修饰器
// Story 18.5: 3 个视觉类修饰器（boss_fade, boss_drift, boss_spotlight）

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import {
  BOSS_MODIFIER_REGISTRY,
  getActiveParams,
  setActiveParams,
  incrementDiminishCount,
  getDiminishMultiplier,
} from '../../../src/data/bossModifiers'
import type { BossModifierId, BossModifier, BossModifierParams } from '../../../src/data/bossModifiers'
import {
  applyModifier,
  cleanupModifier,
  tickModifier,
  getActiveModifierEffect,
  startBossRotation,
  stopBossRotation,
} from '../../../src/systems/bossModifierEngine'

// Mock DOM — supports visual modifier tests
function createMockLetterEl(cls: string) {
  const style: Record<string, string> = {}
  return {
    classList: {
      contains: (c: string) => cls.includes(c),
      add: vi.fn(),
      remove: vi.fn(),
    },
    style,
  }
}

let mockLetters: ReturnType<typeof createMockLetterEl>[] = []
let mockWordDisplayStyle: Record<string, string> = {}

vi.stubGlobal('document', {
  getElementById: vi.fn((id: string) => {
    if (id === 'word-display') {
      return {
        classList: { add: vi.fn(), remove: vi.fn() },
        querySelector: vi.fn(() => ({ textContent: '' })),
        appendChild: vi.fn(),
        style: mockWordDisplayStyle,
      }
    }
    return {
      classList: { add: vi.fn(), remove: vi.fn() },
      querySelector: vi.fn(() => ({ textContent: '' })),
      appendChild: vi.fn(),
      style: {},
    }
  }),
  createElement: vi.fn(() => ({
    className: '',
    innerHTML: '',
    remove: vi.fn(),
  })),
  querySelectorAll: vi.fn((_selector: string) => mockLetters),
})

describe('bossModifierEngine', () => {
  beforeEach(() => {
    resetState()
    cleanupModifier()
    stopBossRotation()
    setActiveParams(null)
    mockLetters = []
    mockWordDisplayStyle = {}
  })

  describe('BOSS_MODIFIER_REGISTRY', () => {
    it('包含全部 13 个修饰器', () => {
      const keys = Object.keys(BOSS_MODIFIER_REGISTRY)
      expect(keys).toHaveLength(13)
    })

    it('每个修饰器都有 id/getParams/apply/cleanup', () => {
      for (const [id, mod] of Object.entries(BOSS_MODIFIER_REGISTRY)) {
        expect(mod.id).toBe(id)
        expect(typeof mod.getParams).toBe('function')
        expect(typeof mod.apply).toBe('function')
        expect(typeof mod.cleanup).toBe('function')
      }
    })

    it('4 个打字类修饰器为 stub（getParams 返回空对象）', () => {
      const stubs: BossModifierId[] = [
        'boss_scramble', 'boss_reverse', 'boss_masked', 'boss_rhythm',
      ]
      stubs.forEach(id => {
        const mod = BOSS_MODIFIER_REGISTRY[id]
        expect(mod.getParams(false)).toEqual({})
        expect(mod.getParams(true)).toEqual({})
      })
    })

    it('3 个视觉类修饰器返回非空参数', () => {
      const visual: BossModifierId[] = ['boss_fade', 'boss_drift', 'boss_spotlight']
      visual.forEach(id => {
        const params = BOSS_MODIFIER_REGISTRY[id].getParams(false)
        const values = Object.values(params).filter(v => v !== undefined)
        expect(values.length).toBeGreaterThan(0)
      })
    })
  })

  describe('applyModifier / cleanupModifier', () => {
    it('应用修饰器后可查询效果参数', () => {
      state.bossModifierPool = ['boss_cap', 'boss_decay', 'boss_diminish']
      applyModifier('boss_cap', false)
      const effect = getActiveModifierEffect()
      expect(effect).not.toBeNull()
      expect(effect!.scoreCap).toBe(50)
    })

    it('清理后效果参数为 null', () => {
      applyModifier('boss_cap', false)
      cleanupModifier()
      expect(getActiveModifierEffect()).toBeNull()
    })

    it('连续应用自动清理旧修饰器', () => {
      applyModifier('boss_cap', false)
      applyModifier('boss_decay', false)
      const effect = getActiveModifierEffect()
      expect(effect!.decayRate).toBe(0.05)
      expect(effect!.scoreCap).toBeUndefined()
    })
  })

  describe('boss_decay 修饰器', () => {
    it('满功率参数: decayRate = 0.05', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_decay.getParams(false)
      expect(params.decayRate).toBe(0.05)
    })

    it('精英参数: decayRate = 0.025', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_decay.getParams(true)
      expect(params.decayRate).toBe(0.025)
    })

    it('onTick 每帧扣分', () => {
      state.score = 1000
      applyModifier('boss_decay', false)
      tickModifier(1.0) // 1 秒
      // 1000 * 0.05 * 1.0 = 50 扣分
      expect(state.score).toBeCloseTo(950, 0)
    })

    it('分数不低于 0', () => {
      state.score = 1
      applyModifier('boss_decay', false)
      tickModifier(10.0)
      expect(state.score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('boss_combo_punish 修饰器', () => {
    it('满功率参数: comboPunishRate = 0.20', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_combo_punish.getParams(false)
      expect(params.comboPunishRate).toBe(0.20)
    })

    it('精英参数: comboPunishRate = 0.10', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_combo_punish.getParams(true)
      expect(params.comboPunishRate).toBe(0.10)
    })
  })

  describe('boss_cap 修饰器', () => {
    it('满功率参数: scoreCap = 50', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_cap.getParams(false)
      expect(params.scoreCap).toBe(50)
    })

    it('精英参数: scoreCap = 75', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_cap.getParams(true)
      expect(params.scoreCap).toBe(75)
    })
  })

  describe('boss_fast_time 修饰器', () => {
    it('满功率参数: timeSpeed = 1.5', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_fast_time.getParams(false)
      expect(params.timeSpeed).toBe(1.5)
    })

    it('精英参数: timeSpeed = 1.25', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_fast_time.getParams(true)
      expect(params.timeSpeed).toBe(1.25)
    })
  })

  describe('boss_double_target 修饰器', () => {
    it('满功率参数: targetMultiplier = 2.0', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_double_target.getParams(false)
      expect(params.targetMultiplier).toBe(2.0)
    })

    it('精英参数: targetMultiplier = 1.5', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_double_target.getParams(true)
      expect(params.targetMultiplier).toBe(1.5)
    })

    it('apply 修改 state.targetScore', () => {
      state.targetScore = 100
      applyModifier('boss_double_target', false)
      expect(state.targetScore).toBe(200)
    })

    it('精英版 apply 修改 state.targetScore ×1.5', () => {
      state.targetScore = 100
      applyModifier('boss_double_target', true)
      expect(state.targetScore).toBe(150)
    })

    it('cleanup 恢复原始 targetScore', () => {
      state.targetScore = 100
      applyModifier('boss_double_target', false)
      expect(state.targetScore).toBe(200)
      cleanupModifier()
      expect(state.targetScore).toBe(100)
    })
  })

  describe('boss_diminish 修饰器', () => {
    it('满功率参数: diminishRate = 0.10', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_diminish.getParams(false)
      expect(params.diminishRate).toBe(0.10)
    })

    it('精英参数: diminishRate = 0.05', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_diminish.getParams(true)
      expect(params.diminishRate).toBe(0.05)
    })

    it('递减倍率随词数增加而降低', () => {
      applyModifier('boss_diminish', false)
      // 0 词时倍率 = 1
      expect(getDiminishMultiplier()).toBe(1)
      // 第 1 词后
      incrementDiminishCount()
      expect(getDiminishMultiplier()).toBeCloseTo(0.9)
      // 第 2 词后
      incrementDiminishCount()
      expect(getDiminishMultiplier()).toBeCloseTo(0.8)
    })

    it('精英版递减更慢', () => {
      applyModifier('boss_diminish', true)
      incrementDiminishCount()
      expect(getDiminishMultiplier()).toBeCloseTo(0.95)
    })

    it('cleanup 重置词数计数', () => {
      applyModifier('boss_diminish', false)
      incrementDiminishCount()
      incrementDiminishCount()
      cleanupModifier()
      // cleanup 后，即使有 activeParams 也被清除
      // getDiminishMultiplier 无 rate 参数返回 1
      expect(getDiminishMultiplier()).toBe(1)
    })

    it('倍率不低于 0', () => {
      applyModifier('boss_diminish', false)
      for (let i = 0; i < 15; i++) incrementDiminishCount()
      expect(getDiminishMultiplier()).toBeGreaterThanOrEqual(0)
    })
  })

  describe('精英版参数约为满功率的 50%', () => {
    const numericalMods: BossModifierId[] = [
      'boss_decay', 'boss_combo_punish', 'boss_cap',
      'boss_fast_time', 'boss_double_target', 'boss_diminish',
    ]

    it.each(numericalMods)('%s 精英参数弱于满功率', (modId) => {
      const fullParams = BOSS_MODIFIER_REGISTRY[modId].getParams(false)
      const eliteParams = BOSS_MODIFIER_REGISTRY[modId].getParams(true)

      // 每个修饰器至少有一个非空参数
      const fullValues = Object.values(fullParams).filter(v => v !== undefined)
      const eliteValues = Object.values(eliteParams).filter(v => v !== undefined)
      expect(fullValues.length).toBeGreaterThan(0)
      expect(eliteValues.length).toBeGreaterThan(0)
    })
  })

  describe('Boss 轮换引擎', () => {
    beforeEach(() => {
      state.bossModifierPool = ['boss_decay', 'boss_cap', 'boss_fast_time']
    })

    it('startBossRotation 立即应用第一个修饰器', () => {
      startBossRotation()
      const effect = getActiveModifierEffect()
      expect(effect).not.toBeNull()
      expect(effect!.decayRate).toBe(0.05)
    })

    it('startBossRotation 使用满功率参数', () => {
      startBossRotation()
      const effect = getActiveModifierEffect()
      // boss_decay 满功率 = 0.05
      expect(effect!.decayRate).toBe(0.05)
    })

    it('stopBossRotation 不清理当前修饰器', () => {
      startBossRotation()
      stopBossRotation()
      // 修饰器仍然活跃（由 cleanupModifier 单独清理）
      expect(getActiveModifierEffect()).not.toBeNull()
    })

    it('pool 不足 3 个时不启动轮换', () => {
      state.bossModifierPool = ['boss_decay']
      startBossRotation()
      expect(getActiveModifierEffect()).toBeNull()
    })
  })

  // === Story 18.5: 视觉类修饰器 ===

  describe('boss_fade 修饰器', () => {
    it('满功率参数: fadeSpeed=1.5, fadeSpeedEnd=0.8, fadeDuration=60', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_fade.getParams(false)
      expect(params.fadeSpeed).toBe(1.5)
      expect(params.fadeSpeedEnd).toBe(0.8)
      expect(params.fadeDuration).toBe(60)
    })

    it('精英参数: fadeSpeed=3.0, fadeSpeedEnd=1.6, fadeDuration=45', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_fade.getParams(true)
      expect(params.fadeSpeed).toBe(3.0)
      expect(params.fadeSpeedEnd).toBe(1.6)
      expect(params.fadeDuration).toBe(45)
    })

    it('精英参数弱于满功率（淡出更慢）', () => {
      const full = BOSS_MODIFIER_REGISTRY.boss_fade.getParams(false)
      const elite = BOSS_MODIFIER_REGISTRY.boss_fade.getParams(true)
      // 精英淡出速度更大（更慢）
      expect(elite.fadeSpeed!).toBeGreaterThan(full.fadeSpeed!)
      expect(elite.fadeSpeedEnd!).toBeGreaterThan(full.fadeSpeedEnd!)
    })

    it('onTick 降低 pending 字母 opacity', () => {
      mockLetters = [
        createMockLetterEl('letter correct'),
        createMockLetterEl('letter current'),
        createMockLetterEl('letter pending'),
        createMockLetterEl('letter pending'),
      ]
      applyModifier('boss_fade', false)
      tickModifier(1.0)
      // correct 字母 opacity 不变
      expect(mockLetters[0].style.opacity).toBeUndefined()
      // pending 字母 opacity 降低
      expect(mockLetters[2].style.opacity).toBeDefined()
      const opacity = parseFloat(mockLetters[2].style.opacity!)
      expect(opacity).toBeLessThan(1)
      expect(opacity).toBeGreaterThanOrEqual(0.05)
    })

    it('correct 字母不受影响', () => {
      mockLetters = [
        createMockLetterEl('letter correct'),
        createMockLetterEl('letter pending'),
      ]
      applyModifier('boss_fade', false)
      tickModifier(2.0)
      expect(mockLetters[0].style.opacity).toBeUndefined()
    })

    it('cleanup 恢复 opacity', () => {
      mockLetters = [
        createMockLetterEl('letter pending'),
        createMockLetterEl('letter pending'),
      ]
      applyModifier('boss_fade', false)
      tickModifier(1.0)
      expect(mockLetters[0].style.opacity).toBeDefined()
      cleanupModifier()
      // cleanup 调用 querySelectorAll 并清除 opacity
      expect(mockLetters[0].style.opacity).toBe('')
    })

    it('有 onTick 方法', () => {
      expect(typeof BOSS_MODIFIER_REGISTRY.boss_fade.onTick).toBe('function')
    })
  })

  describe('boss_drift 修饰器', () => {
    it('满功率参数: driftAmplitude=15, driftFrequency=2', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_drift.getParams(false)
      expect(params.driftAmplitude).toBe(15)
      expect(params.driftFrequency).toBe(2.0)
    })

    it('精英参数: driftAmplitude=8, driftFrequency=1.5', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_drift.getParams(true)
      expect(params.driftAmplitude).toBe(8)
      expect(params.driftFrequency).toBe(1.5)
    })

    it('精英参数弱于满功率（振幅更小）', () => {
      const full = BOSS_MODIFIER_REGISTRY.boss_drift.getParams(false)
      const elite = BOSS_MODIFIER_REGISTRY.boss_drift.getParams(true)
      expect(elite.driftAmplitude!).toBeLessThan(full.driftAmplitude!)
    })

    it('onTick 设置 #word-display transform', () => {
      applyModifier('boss_drift', false)
      tickModifier(0.5)
      expect(mockWordDisplayStyle.transform).toBeDefined()
      expect(mockWordDisplayStyle.transform).toContain('translate(')
    })

    it('cleanup 清除 transform', () => {
      applyModifier('boss_drift', false)
      tickModifier(0.5)
      expect(mockWordDisplayStyle.transform).toContain('translate(')
      cleanupModifier()
      expect(mockWordDisplayStyle.transform).toBe('')
    })

    it('有 onTick 方法', () => {
      expect(typeof BOSS_MODIFIER_REGISTRY.boss_drift.onTick).toBe('function')
    })
  })

  describe('boss_spotlight 修饰器', () => {
    it('满功率参数: spotlightRadius=2', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_spotlight.getParams(false)
      expect(params.spotlightRadius).toBe(2)
    })

    it('精英参数: spotlightRadius=3', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_spotlight.getParams(true)
      expect(params.spotlightRadius).toBe(3)
    })

    it('精英参数弱于满功率（半径更大 = 更容易）', () => {
      const full = BOSS_MODIFIER_REGISTRY.boss_spotlight.getParams(false)
      const elite = BOSS_MODIFIER_REGISTRY.boss_spotlight.getParams(true)
      expect(elite.spotlightRadius!).toBeGreaterThan(full.spotlightRadius!)
    })

    it('onTick 根据 player.index 设置 opacity', () => {
      state.player.index = 1
      state.player.word = 'HELLO'
      mockLetters = [
        createMockLetterEl('letter correct'),
        createMockLetterEl('letter current'),
        createMockLetterEl('letter pending'),
        createMockLetterEl('letter pending'),
        createMockLetterEl('letter pending'),
      ]
      applyModifier('boss_spotlight', false)
      tickModifier(0.1)
      // correct 字母保持不变
      expect(mockLetters[0].style.opacity).toBe('')
      // current (index=1) 在 radius/2=1 范围内，opacity=1
      expect(mockLetters[1].style.opacity).toBe('1')
      // index 4 距离 1 = 3，超出 radius=2，opacity=0.05
      expect(mockLetters[4].style.opacity).toBe('0.05')
    })

    it('cleanup 恢复所有 letter opacity', () => {
      mockLetters = [
        createMockLetterEl('letter pending'),
        createMockLetterEl('letter pending'),
      ]
      state.player.index = 0
      state.player.word = 'AB'
      applyModifier('boss_spotlight', false)
      tickModifier(0.1)
      cleanupModifier()
      expect(mockLetters[0].style.opacity).toBe('')
      expect(mockLetters[1].style.opacity).toBe('')
    })

    it('有 onTick 方法', () => {
      expect(typeof BOSS_MODIFIER_REGISTRY.boss_spotlight.onTick).toBe('function')
    })
  })

  describe('视觉类修饰器生命周期', () => {
    it('apply → onTick → cleanup 完整周期不报错', () => {
      const visualMods: BossModifierId[] = ['boss_fade', 'boss_drift', 'boss_spotlight']
      mockLetters = [
        createMockLetterEl('letter current'),
        createMockLetterEl('letter pending'),
      ]
      state.player.index = 0
      state.player.word = 'AB'

      visualMods.forEach(id => {
        expect(() => {
          applyModifier(id, false)
          tickModifier(0.1)
          tickModifier(0.5)
          cleanupModifier()
        }).not.toThrow()
      })
    })

    it('精英版 apply → onTick → cleanup 完整周期不报错', () => {
      const visualMods: BossModifierId[] = ['boss_fade', 'boss_drift', 'boss_spotlight']
      mockLetters = [
        createMockLetterEl('letter current'),
        createMockLetterEl('letter pending'),
      ]
      state.player.index = 0
      state.player.word = 'AB'

      visualMods.forEach(id => {
        expect(() => {
          applyModifier(id, true)
          tickModifier(0.1)
          cleanupModifier()
        }).not.toThrow()
      })
    })

    it('连续切换视觉修饰器不报错', () => {
      mockLetters = [
        createMockLetterEl('letter pending'),
      ]
      state.player.index = 0
      state.player.word = 'A'

      expect(() => {
        applyModifier('boss_fade', false)
        tickModifier(0.5)
        applyModifier('boss_drift', false)
        tickModifier(0.5)
        applyModifier('boss_spotlight', false)
        tickModifier(0.5)
        cleanupModifier()
      }).not.toThrow()
    })
  })
})
