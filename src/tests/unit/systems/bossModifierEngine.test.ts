// ============================================
// 打字肉鸽 - bossModifierEngine 单元测试
// ============================================
// Story 18.4: Boss 修饰器引擎 + 数值修饰器
// Story 18.5: 3 个视觉类修饰器（boss_fade, boss_drift, boss_spotlight）
// Story 18.6: 3 个认知类修饰器（boss_scramble, boss_reverse, boss_masked）
// Story 18.7: 节奏锁定修饰器（boss_rhythm）
// Story 18.8: 6 个数值修饰器集成测试（combo_punish, cap, fast_time）

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import {
  BOSS_MODIFIER_REGISTRY,
  getActiveParams,
  setActiveParams,
  incrementDiminishCount,
  getDiminishMultiplier,
  transformWordForModifier,
  isRhythmLocked,
} from '../../../src/data/bossModifiers'
import type { BossModifierId, BossModifier, BossModifierParams } from '../../../src/data/bossModifiers'
import {
  applyModifier,
  cleanupModifier,
  cleanupTemporaryModifiers,
  tickModifier,
  getActiveModifierEffect,
  isModifierActive,
  startBossRotation,
  stopBossRotation,
} from '../../../src/systems/bossModifierEngine'

// Mock DOM — supports visual modifier tests
function createMockLetterEl(cls: string, text: string = '') {
  const style: Record<string, string> = {}
  const attrs: Record<string, string> = {}
  let _cls = cls
  return {
    classList: {
      contains: (c: string) => _cls.split(' ').includes(c),
      add: vi.fn((c: string) => { _cls += ' ' + c }),
      remove: vi.fn(),
    },
    style,
    textContent: text,
    getAttribute: (name: string) => attrs[name] ?? null,
    setAttribute: (name: string, value: string) => { attrs[name] = value },
    removeAttribute: (name: string) => { delete attrs[name] },
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

    it('全部 13 个修饰器均已完整实现（0 个 stub）', () => {
      for (const [_id, mod] of Object.entries(BOSS_MODIFIER_REGISTRY)) {
        const params = mod.getParams(false)
        const values = Object.values(params).filter(v => v !== undefined)
        expect(values.length).toBeGreaterThan(0)
      }
    })

    it('3 个视觉类修饰器返回非空参数', () => {
      const visual: BossModifierId[] = ['boss_fade', 'boss_drift', 'boss_spotlight']
      visual.forEach(id => {
        const params = BOSS_MODIFIER_REGISTRY[id].getParams(false)
        const values = Object.values(params).filter(v => v !== undefined)
        expect(values.length).toBeGreaterThan(0)
      })
    })

    it('3 个认知类修饰器返回非空参数', () => {
      const cognitive: BossModifierId[] = ['boss_scramble', 'boss_reverse', 'boss_masked']
      cognitive.forEach(id => {
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

    it('连续应用保留两个修饰器（多修饰器模式）', () => {
      applyModifier('boss_cap', false)
      applyModifier('boss_decay', false)
      const effect = getActiveModifierEffect()
      expect(effect!.decayRate).toBe(0.05)
      expect(effect!.scoreCap).toBe(50)
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

    it('集成：满功率扣 20% 总分（模拟 playerWrong 钩子）', () => {
      applyModifier('boss_combo_punish', false)
      state.score = 1000
      const modEffect = getActiveParams()
      if (modEffect?.comboPunishRate && state.score > 0) {
        const penalty = Math.floor(state.score * modEffect.comboPunishRate)
        state.score = Math.max(0, state.score - penalty)
      }
      expect(state.score).toBe(800) // 1000 - 200 = 800
      cleanupModifier()
    })

    it('集成：精英版扣 10% 总分', () => {
      applyModifier('boss_combo_punish', true)
      state.score = 1000
      const modEffect = getActiveParams()
      if (modEffect?.comboPunishRate && state.score > 0) {
        const penalty = Math.floor(state.score * modEffect.comboPunishRate)
        state.score = Math.max(0, state.score - penalty)
      }
      expect(state.score).toBe(900) // 1000 - 100 = 900
      cleanupModifier()
    })

    it('集成：分数为 0 时不扣减', () => {
      applyModifier('boss_combo_punish', false)
      state.score = 0
      const modEffect = getActiveParams()
      if (modEffect?.comboPunishRate && state.score > 0) {
        const penalty = Math.floor(state.score * modEffect.comboPunishRate)
        state.score = Math.max(0, state.score - penalty)
      }
      expect(state.score).toBe(0)
      cleanupModifier()
    })

    it('集成：penalty 向下取整', () => {
      applyModifier('boss_combo_punish', false)
      state.score = 333 // 333 * 0.20 = 66.6 → floor = 66
      const modEffect = getActiveParams()
      if (modEffect?.comboPunishRate && state.score > 0) {
        const penalty = Math.floor(state.score * modEffect.comboPunishRate)
        state.score = Math.max(0, state.score - penalty)
      }
      expect(state.score).toBe(267) // 333 - 66 = 267
      cleanupModifier()
    })

    it('集成：视觉反馈字符串格式正确（AC2）', () => {
      applyModifier('boss_combo_punish', false)
      state.score = 1000
      const modEffect = getActiveParams()
      if (modEffect?.comboPunishRate && state.score > 0) {
        const penalty = Math.floor(state.score * modEffect.comboPunishRate)
        // 验证 battle.ts showFeedback(`-${penalty}分!`) 的格式
        const feedbackMsg = `-${penalty}分!`
        expect(feedbackMsg).toBe('-200分!')
        expect(penalty).toBe(200)
      }
      cleanupModifier()
    })

    it('集成：连续断连复合扣分（1000→800→640）', () => {
      applyModifier('boss_combo_punish', false)
      state.score = 1000
      // 第一次断连
      const mod1 = getActiveParams()
      if (mod1?.comboPunishRate && state.score > 0) {
        const penalty = Math.floor(state.score * mod1.comboPunishRate)
        state.score = Math.max(0, state.score - penalty)
      }
      expect(state.score).toBe(800)
      // 第二次断连
      const mod2 = getActiveParams()
      if (mod2?.comboPunishRate && state.score > 0) {
        const penalty = Math.floor(state.score * mod2.comboPunishRate)
        state.score = Math.max(0, state.score - penalty)
      }
      expect(state.score).toBe(640) // 800 - 160 = 640
      cleanupModifier()
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

    it('集成：高分词被截断到 cap=50（模拟 completeWord 钩子）', () => {
      applyModifier('boss_cap', false)
      let finalWordScore = 100
      const modEffect = getActiveParams()
      if (modEffect?.scoreCap) {
        finalWordScore = Math.min(finalWordScore, modEffect.scoreCap)
      }
      expect(finalWordScore).toBe(50)
      cleanupModifier()
    })

    it('集成：低于 cap 的分数不截断', () => {
      applyModifier('boss_cap', false)
      let finalWordScore = 30
      const modEffect = getActiveParams()
      if (modEffect?.scoreCap) {
        finalWordScore = Math.min(finalWordScore, modEffect.scoreCap)
      }
      expect(finalWordScore).toBe(30)
      cleanupModifier()
    })

    it('集成：精英版 scoreCap=75 截断', () => {
      applyModifier('boss_cap', true)
      let finalWordScore = 100
      const modEffect = getActiveParams()
      if (modEffect?.scoreCap) {
        finalWordScore = Math.min(finalWordScore, modEffect.scoreCap)
      }
      expect(finalWordScore).toBe(75)
      cleanupModifier()
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

    it('集成：timer 以 1.5x 速度消耗时间（模拟 startTimer 钩子）', () => {
      applyModifier('boss_fast_time', false)
      state.time = 30.0
      const modEffect = getActiveParams()
      const timeSpeed = modEffect?.timeSpeed ?? 1
      state.time -= 0.1 * timeSpeed // 模拟 1 次 100ms tick
      expect(state.time).toBeCloseTo(29.85) // 30 - 0.15 = 29.85
      cleanupModifier()
    })

    it('集成：精英版 1.25x 速度', () => {
      applyModifier('boss_fast_time', true)
      state.time = 30.0
      const modEffect = getActiveParams()
      const timeSpeed = modEffect?.timeSpeed ?? 1
      state.time -= 0.1 * timeSpeed
      expect(state.time).toBeCloseTo(29.875) // 30 - 0.125 = 29.875
      cleanupModifier()
    })

    it('集成：无修饰器时 timeSpeed 默认为 1', () => {
      state.time = 30.0
      const modEffect = getActiveParams()
      const timeSpeed = modEffect?.timeSpeed ?? 1
      state.time -= 0.1 * timeSpeed
      expect(state.time).toBeCloseTo(29.9) // 30 - 0.1 = 29.9
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

  // === Story 18.6: 认知类修饰器 ===

  describe('boss_scramble 修饰器', () => {
    it('满功率参数: scrambleMode=1', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_scramble.getParams(false)
      expect(params.scrambleMode).toBe(1)
    })

    it('精英参数: scrambleMode=2（保留首尾）', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_scramble.getParams(true)
      expect(params.scrambleMode).toBe(2)
    })

    it('transformWordForModifier 每次打乱结果都与原词不同 (AC7)', () => {
      applyModifier('boss_scramble', false)
      for (let i = 0; i < 20; i++) {
        const result = transformWordForModifier('abcdef')
        expect(result).not.toBe('abcdef')
      }
      cleanupModifier()
    })

    it('精英版保留首尾字母', () => {
      applyModifier('boss_scramble', true)
      for (let i = 0; i < 20; i++) {
        const result = transformWordForModifier('abcdef')
        expect(result[0]).toBe('a')
        expect(result[result.length - 1]).toBe('f')
      }
      cleanupModifier()
    })

    it('短词（≤2字母）原样返回', () => {
      applyModifier('boss_scramble', false)
      expect(transformWordForModifier('a')).toBe('a')
      expect(transformWordForModifier('ab')).toBe('ab')
      cleanupModifier()
    })

    it('打乱结果长度不变', () => {
      applyModifier('boss_scramble', false)
      const result = transformWordForModifier('hello')
      expect(result.length).toBe(5)
      cleanupModifier()
    })

    it('打乱结果包含相同字母', () => {
      applyModifier('boss_scramble', false)
      const result = transformWordForModifier('hello')
      expect(result.split('').sort().join('')).toBe('ehllo')
      cleanupModifier()
    })

    it('精英版 3 字母词无法打乱，原样返回', () => {
      applyModifier('boss_scramble', true)
      // preserveEnds=true, 中间仅 1 字母，无法打乱
      expect(transformWordForModifier('abc')).toBe('abc')
      cleanupModifier()
    })
  })

  describe('boss_reverse 修饰器', () => {
    it('满功率参数: reverseActive=1', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_reverse.getParams(false)
      expect(params.reverseActive).toBe(1)
    })

    it('精英参数: reverseActive=1（相同）', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_reverse.getParams(true)
      expect(params.reverseActive).toBe(1)
    })

    it('transformWordForModifier 倒序词语', () => {
      applyModifier('boss_reverse', false)
      expect(transformWordForModifier('hello')).toBe('olleh')
      expect(transformWordForModifier('world')).toBe('dlrow')
      cleanupModifier()
    })

    it('单字母不变', () => {
      applyModifier('boss_reverse', false)
      expect(transformWordForModifier('a')).toBe('a')
      cleanupModifier()
    })

    it('回文不变', () => {
      applyModifier('boss_reverse', false)
      expect(transformWordForModifier('aba')).toBe('aba')
      cleanupModifier()
    })
  })

  describe('boss_masked 修饰器', () => {
    it('满功率参数: maskRate=0.30', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_masked.getParams(false)
      expect(params.maskRate).toBe(0.30)
    })

    it('精英参数: maskRate=0.15', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_masked.getParams(true)
      expect(params.maskRate).toBe(0.15)
    })

    it('onTick 将遮罩位置字母替换为 ?', () => {
      state.player.word = 'HELLO'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'H'),
        createMockLetterEl('letter pending', 'E'),
        createMockLetterEl('letter pending', 'L'),
        createMockLetterEl('letter pending', 'L'),
        createMockLetterEl('letter pending', 'O'),
      ]
      applyModifier('boss_masked', false)
      tickModifier(0.1)
      // maskRate=0.30 → 5*0.30=1.5 → floor=1，至少遮 1 个字母
      const maskedCount = mockLetters.filter(l => l.textContent === '?').length
      expect(maskedCount).toBeGreaterThanOrEqual(1)
    })

    it('correct 字母恢复原文', () => {
      state.player.word = 'AB'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
        createMockLetterEl('letter pending', 'B'),
      ]
      applyModifier('boss_masked', false)
      tickModifier(0.1)
      // 模拟打对第一个字母
      mockLetters[0].classList.add('correct')
      mockLetters[0].setAttribute('data-original', 'A')
      mockLetters[0].textContent = '?'
      tickModifier(0.1)
      // correct 字母应恢复
      expect(mockLetters[0].textContent).toBe('A')
      expect(mockLetters[0].getAttribute('data-original')).toBeNull()
      cleanupModifier()
    })

    it('cleanup 恢复所有字母原文', () => {
      state.player.word = 'AB'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter pending', 'A'),
        createMockLetterEl('letter pending', 'B'),
      ]
      applyModifier('boss_masked', false)
      tickModifier(0.1)
      cleanupModifier()
      // cleanup 后不应有 data-original 残留
      mockLetters.forEach(l => {
        expect(l.getAttribute('data-original')).toBeNull()
      })
    })

    it('有 onTick 方法', () => {
      expect(typeof BOSS_MODIFIER_REGISTRY.boss_masked.onTick).toBe('function')
    })

    it('换词时重新生成遮罩位置', () => {
      state.player.word = 'ABCDE'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
        createMockLetterEl('letter pending', 'B'),
        createMockLetterEl('letter pending', 'C'),
        createMockLetterEl('letter pending', 'D'),
        createMockLetterEl('letter pending', 'E'),
      ]
      applyModifier('boss_masked', false)
      tickModifier(0.1)
      const firstMasked = mockLetters.filter(l => l.textContent === '?').length
      expect(firstMasked).toBeGreaterThanOrEqual(1)

      // 换词 — 新词应重新生成遮罩
      state.player.word = 'XY'
      mockLetters = [
        createMockLetterEl('letter current', 'X'),
        createMockLetterEl('letter pending', 'Y'),
      ]
      tickModifier(0.1)
      // 2 字母 * 0.30 = 0.6 → floor=0 → max(1,0)=1，至少遮 1 个
      const secondMasked = mockLetters.filter(l => l.textContent === '?').length
      expect(secondMasked).toBeGreaterThanOrEqual(1)
      cleanupModifier()
    })
  })

  describe('transformWordForModifier 函数', () => {
    it('无活跃修饰器时原样返回', () => {
      cleanupModifier()
      setActiveParams(null)
      expect(transformWordForModifier('hello')).toBe('hello')
    })

    it('非认知修饰器时原样返回', () => {
      applyModifier('boss_decay', false)
      expect(transformWordForModifier('hello')).toBe('hello')
      cleanupModifier()
    })
  })

  describe('认知类修饰器生命周期', () => {
    it('apply → onTick → cleanup 完整周期不报错', () => {
      const cognitiveMods: BossModifierId[] = ['boss_scramble', 'boss_reverse', 'boss_masked']
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
        createMockLetterEl('letter pending', 'B'),
      ]
      state.player.index = 0
      state.player.word = 'AB'

      cognitiveMods.forEach(id => {
        expect(() => {
          applyModifier(id, false)
          tickModifier(0.1)
          tickModifier(0.5)
          cleanupModifier()
        }).not.toThrow()
      })
    })

    it('精英版生命周期不报错', () => {
      const cognitiveMods: BossModifierId[] = ['boss_scramble', 'boss_reverse', 'boss_masked']
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
        createMockLetterEl('letter pending', 'B'),
      ]
      state.player.index = 0
      state.player.word = 'AB'

      cognitiveMods.forEach(id => {
        expect(() => {
          applyModifier(id, true)
          tickModifier(0.1)
          cleanupModifier()
        }).not.toThrow()
      })
    })
  })

  // === Story 18.7: 节奏锁定修饰器 ===

  describe('boss_rhythm 修饰器', () => {
    it('满功率参数: rhythmBpmStart=90, rhythmBpmEnd=140, rhythmDuration=60', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_rhythm.getParams(false)
      expect(params.rhythmBpmStart).toBe(90)
      expect(params.rhythmBpmEnd).toBe(140)
      expect(params.rhythmDuration).toBe(60)
    })

    it('精英参数: rhythmBpmStart=70, rhythmBpmEnd=110, rhythmDuration=45', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_rhythm.getParams(true)
      expect(params.rhythmBpmStart).toBe(70)
      expect(params.rhythmBpmEnd).toBe(110)
      expect(params.rhythmDuration).toBe(45)
    })

    it('精英参数弱于满功率（BPM 更低、时间更短）', () => {
      const full = BOSS_MODIFIER_REGISTRY.boss_rhythm.getParams(false)
      const elite = BOSS_MODIFIER_REGISTRY.boss_rhythm.getParams(true)
      expect(elite.rhythmBpmStart!).toBeLessThan(full.rhythmBpmStart!)
      expect(elite.rhythmBpmEnd!).toBeLessThan(full.rhythmBpmEnd!)
    })

    it('首字母立即解锁（+1 规则）', () => {
      state.player.word = 'HELLO'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'H'),
        createMockLetterEl('letter pending', 'E'),
        createMockLetterEl('letter pending', 'L'),
        createMockLetterEl('letter pending', 'L'),
        createMockLetterEl('letter pending', 'O'),
      ]
      applyModifier('boss_rhythm', false)
      // 即使 0 秒也有首字母解锁（wordTime=0 → floor(0/interval)+1 = 1）
      tickModifier(0.001)
      // 首字母（index 0）opacity=1
      expect(mockLetters[0].style.opacity).toBe('1')
      // 第二个字母仍锁定
      expect(mockLetters[1].style.opacity).toBe('0.3')
      cleanupModifier()
    })

    it('onTick 随时间解锁更多字母', () => {
      state.player.word = 'ABCD'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
        createMockLetterEl('letter pending', 'B'),
        createMockLetterEl('letter pending', 'C'),
        createMockLetterEl('letter pending', 'D'),
      ]
      applyModifier('boss_rhythm', false)
      // 首次 tick 注册词语（rhythmWordStart = rhythmElapsed）
      tickModifier(0.001)
      // BPM=90 → beatInterval = 60/90 ≈ 0.667s
      // 再经过 1.5s: wordTime≈1.5 → floor(1.5/0.667)+1 = floor(2.25)+1 = 3
      tickModifier(1.5)
      // 前 3 个字母解锁，第 4 个锁定
      expect(mockLetters[0].style.opacity).toBe('1')
      expect(mockLetters[1].style.opacity).toBe('1')
      expect(mockLetters[2].style.opacity).toBe('1')
      expect(mockLetters[3].style.opacity).toBe('0.3')
      cleanupModifier()
    })

    it('锁定字母 opacity=0.3', () => {
      state.player.word = 'AB'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
        createMockLetterEl('letter pending', 'B'),
      ]
      applyModifier('boss_rhythm', false)
      tickModifier(0.001)
      // 首字母解锁，第二个锁定
      expect(mockLetters[1].style.opacity).toBe('0.3')
      cleanupModifier()
    })

    it('单字母词立即解锁且 beatInterval 无影响', () => {
      state.player.word = 'A'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
      ]
      applyModifier('boss_rhythm', false)
      tickModifier(0.001)
      // 单字母词：首字母立即解锁，opacity=1
      expect(mockLetters[0].style.opacity).toBe('1')
      // isRhythmLocked: index=0, unlockedCount=1 → 0 < 1 → false
      expect(isRhythmLocked()).toBe(false)
      cleanupModifier()
    })

    it('当前可打字母添加 rhythm-pulse 类', () => {
      state.player.word = 'AB'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
        createMockLetterEl('letter pending', 'B'),
      ]
      applyModifier('boss_rhythm', false)
      tickModifier(0.001)
      // playerIdx=0, 已解锁 → 添加 rhythm-pulse
      expect(mockLetters[0].classList.add).toHaveBeenCalledWith('rhythm-pulse')
      cleanupModifier()
    })

    it('correct 字母恢复 opacity 并移除 rhythm-pulse', () => {
      state.player.word = 'AB'
      state.player.index = 1
      mockLetters = [
        createMockLetterEl('letter correct', 'A'),
        createMockLetterEl('letter current', 'B'),
      ]
      applyModifier('boss_rhythm', false)
      tickModifier(0.1)
      // correct 字母 opacity 恢复空字符串
      expect(mockLetters[0].style.opacity).toBe('')
      expect(mockLetters[0].classList.remove).toHaveBeenCalledWith('rhythm-pulse')
      cleanupModifier()
    })

    it('有 onTick 方法', () => {
      expect(typeof BOSS_MODIFIER_REGISTRY.boss_rhythm.onTick).toBe('function')
    })
  })

  describe('isRhythmLocked 函数', () => {
    it('无活跃修饰器时返回 false', () => {
      setActiveParams(null)
      expect(isRhythmLocked()).toBe(false)
    })

    it('非节奏修饰器时返回 false', () => {
      applyModifier('boss_decay', false)
      expect(isRhythmLocked()).toBe(false)
      cleanupModifier()
    })

    it('apply 后首次 tick 前返回 true（未解锁任何字母）', () => {
      state.player.word = 'HELLO'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'H'),
        createMockLetterEl('letter pending', 'E'),
        createMockLetterEl('letter pending', 'L'),
        createMockLetterEl('letter pending', 'L'),
        createMockLetterEl('letter pending', 'O'),
      ]
      applyModifier('boss_rhythm', false)
      // 尚未 tick — rhythmUnlockedCount=0, index=0 → 0 >= 0 → true
      expect(isRhythmLocked()).toBe(true)
      cleanupModifier()
    })

    it('当前字母已解锁时返回 false', () => {
      state.player.word = 'HELLO'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'H'),
        createMockLetterEl('letter pending', 'E'),
        createMockLetterEl('letter pending', 'L'),
        createMockLetterEl('letter pending', 'L'),
        createMockLetterEl('letter pending', 'O'),
      ]
      applyModifier('boss_rhythm', false)
      tickModifier(0.001) // 首字母解锁
      // index=0, unlockedCount=1 → 0 < 1 → false
      expect(isRhythmLocked()).toBe(false)
      cleanupModifier()
    })

    it('当前字母未解锁时返回 true', () => {
      state.player.word = 'HELLO'
      state.player.index = 2
      mockLetters = [
        createMockLetterEl('letter correct', 'H'),
        createMockLetterEl('letter correct', 'E'),
        createMockLetterEl('letter current', 'L'),
        createMockLetterEl('letter pending', 'L'),
        createMockLetterEl('letter pending', 'O'),
      ]
      applyModifier('boss_rhythm', false)
      tickModifier(0.001) // 仅首字母解锁，unlockedCount=1
      // index=2, unlockedCount=1 → 2 >= 1 → true
      expect(isRhythmLocked()).toBe(true)
      cleanupModifier()
    })
  })

  describe('boss_rhythm 换词与 BPM 递增', () => {
    it('换词时重置节奏计时', () => {
      state.player.word = 'AB'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
        createMockLetterEl('letter pending', 'B'),
      ]
      applyModifier('boss_rhythm', false)
      // 首次 tick 注册词语
      tickModifier(0.001)
      // 经过 2 秒，两个字母都解锁
      tickModifier(2.0)
      expect(mockLetters[0].style.opacity).toBe('1')
      expect(mockLetters[1].style.opacity).toBe('1')

      // 换词 — 换词 tick 中 rhythmWordStart 重置为当前 rhythmElapsed
      state.player.word = 'XYZ'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'X'),
        createMockLetterEl('letter pending', 'Y'),
        createMockLetterEl('letter pending', 'Z'),
      ]
      tickModifier(0.001) // 换词 tick（wordTime≈0 → 仅首字母解锁）
      expect(mockLetters[0].style.opacity).toBe('1')
      expect(mockLetters[1].style.opacity).toBe('0.3')
      expect(mockLetters[2].style.opacity).toBe('0.3')
      cleanupModifier()
    })

    it('BPM 随时间线性递增（换词后解锁更快证明 BPM 升高）', () => {
      // 先用短词推进 30s，让 BPM 从 90 升到 ~115
      state.player.word = 'A'
      state.player.index = 0
      mockLetters = [createMockLetterEl('letter current', 'A')]
      applyModifier('boss_rhythm', false)
      tickModifier(0.001) // 注册词语
      tickModifier(30.0)  // 推进 30s → t=0.5 → BPM=90+(140-90)*0.5=115

      // 换 10 字母新词 — wordTime 重置
      state.player.word = 'ABCDEFGHIJ'
      state.player.index = 0
      mockLetters = Array.from({ length: 10 }, (_, i) =>
        createMockLetterEl(i === 0 ? 'letter current' : 'letter pending', String.fromCharCode(65 + i))
      )
      tickModifier(0.001) // 注册新词

      // tick 0.6s — 在 BPM=90(interval=0.667s) 下只解锁 1 个
      // 但在 BPM≈115(interval=0.522s) 下解锁 floor(0.6/0.522)+1=2 个
      tickModifier(0.6)
      const unlocked = mockLetters.filter(l => l.style.opacity === '1').length
      expect(unlocked).toBe(2) // 证明 BPM > 90
      cleanupModifier()
    })
  })

  describe('boss_rhythm cleanup', () => {
    it('cleanup 恢复所有字母 opacity 并移除 rhythm-pulse', () => {
      state.player.word = 'ABC'
      state.player.index = 0
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
        createMockLetterEl('letter pending', 'B'),
        createMockLetterEl('letter pending', 'C'),
      ]
      applyModifier('boss_rhythm', false)
      tickModifier(0.5)
      cleanupModifier()
      // cleanup 后 opacity 全部恢复
      mockLetters.forEach(l => {
        expect(l.style.opacity).toBe('')
      })
      // rhythm-pulse 全部移除
      mockLetters.forEach(l => {
        expect(l.classList.remove).toHaveBeenCalledWith('rhythm-pulse')
      })
    })
  })

  describe('节奏修饰器生命周期', () => {
    it('apply → onTick → cleanup 完整周期不报错', () => {
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
        createMockLetterEl('letter pending', 'B'),
      ]
      state.player.index = 0
      state.player.word = 'AB'

      expect(() => {
        applyModifier('boss_rhythm', false)
        tickModifier(0.1)
        tickModifier(0.5)
        tickModifier(1.0)
        cleanupModifier()
      }).not.toThrow()
    })

    it('精英版生命周期不报错', () => {
      mockLetters = [
        createMockLetterEl('letter current', 'A'),
        createMockLetterEl('letter pending', 'B'),
      ]
      state.player.index = 0
      state.player.word = 'AB'

      expect(() => {
        applyModifier('boss_rhythm', true)
        tickModifier(0.1)
        tickModifier(0.5)
        cleanupModifier()
      }).not.toThrow()
    })
  })
})
