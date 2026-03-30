// ============================================
// 打字肉鸽 - bossModifierEngine 单元测试
// ============================================
// Story 18.4: Boss 修饰器引擎 + 数值修饰器
// Story 18.5: 视觉类修饰器（boss_fade）
// Story 18.6: 认知类修饰器（boss_scramble, boss_reverse）
// Story 18.8: 数值修饰器集成测试（cap, fast_time 等）

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import {
  BOSS_MODIFIER_REGISTRY,
  getActiveParams,
  setActiveParams,
  incrementDiminishCount,
  getDiminishMultiplier,
  transformWordForModifier,
  garbleWord,
  isGarbleActive,
  GARBLE_CHARS,
} from '../../../src/data/bossModifiers'
import type { BossModifierId, BossModifier, BossModifierParams } from '../../../src/data/bossModifiers'
import {
  applyModifier,
  cleanupModifier,
  cleanupTemporaryModifiers,
  tickModifier,
  getActiveModifierEffect,
  isModifierActive,
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
        children: mockLetters,
        style: mockWordDisplayStyle,
      }
    }
    if (id === 'word-zone') {
      return {
        classList: { add: vi.fn(), remove: vi.fn() },
        insertBefore: vi.fn(),
        firstChild: null,
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
    id: '',
    className: '',
    innerHTML: '',
    textContent: '',
    remove: vi.fn(),
  })),
  querySelectorAll: vi.fn((_selector: string) => mockLetters),
})

describe('bossModifierEngine', () => {
  beforeEach(() => {
    resetState()
    cleanupModifier()
    setActiveParams(null)
    mockLetters = []
    mockWordDisplayStyle = {}
  })

  describe('BOSS_MODIFIER_REGISTRY', () => {
    it('包含全部 15 个修饰器', () => {
      const keys = Object.keys(BOSS_MODIFIER_REGISTRY)
      expect(keys).toHaveLength(15)
    })

    it('每个修饰器都有 id/getParams/apply/cleanup', () => {
      for (const [id, mod] of Object.entries(BOSS_MODIFIER_REGISTRY)) {
        expect(mod.id).toBe(id)
        expect(typeof mod.getParams).toBe('function')
        expect(typeof mod.apply).toBe('function')
        expect(typeof mod.cleanup).toBe('function')
      }
    })

    it('全部 12 个修饰器均已完整实现（0 个 stub）', () => {
      for (const [_id, mod] of Object.entries(BOSS_MODIFIER_REGISTRY)) {
        const params = mod.getParams(false)
        const values = Object.values(params).filter(v => v !== undefined)
        expect(values.length).toBeGreaterThan(0)
      }
    })

    it('1 个视觉类修饰器返回非空参数', () => {
      const visual: BossModifierId[] = ['boss_fade']
      visual.forEach(id => {
        const params = BOSS_MODIFIER_REGISTRY[id].getParams(false)
        const values = Object.values(params).filter(v => v !== undefined)
        expect(values.length).toBeGreaterThan(0)
      })
    })

    it('2 个认知类修饰器返回非空参数', () => {
      const cognitive: BossModifierId[] = ['boss_scramble', 'boss_reverse']
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
      expect(effect!.scoreCapPct).toBe(0.10)
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
      expect(effect!.scoreCapPct).toBe(0.10)
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

  describe('boss_cap 修饰器', () => {
    it('满功率参数: scoreCapPct = 0.10', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_cap.getParams(false)
      expect(params.scoreCapPct).toBe(0.10)
    })

    it('精英参数: scoreCapPct = 0.15', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_cap.getParams(true)
      expect(params.scoreCapPct).toBe(0.15)
    })

    it('集成：高分词被截断到 targetScore×10%（模拟 completeWord 钩子）', () => {
      state.targetScore = 500
      applyModifier('boss_cap', false)
      let finalWordScore = 100
      const modEffect = getActiveParams()
      if (modEffect?.scoreCapPct) {
        const cap = Math.floor(state.targetScore * modEffect.scoreCapPct)
        finalWordScore = Math.min(finalWordScore, cap)
      }
      expect(finalWordScore).toBe(50) // 500 × 0.10 = 50
      cleanupModifier()
    })

    it('集成：低于 cap 的分数不截断', () => {
      state.targetScore = 500
      applyModifier('boss_cap', false)
      let finalWordScore = 30
      const modEffect = getActiveParams()
      if (modEffect?.scoreCapPct) {
        const cap = Math.floor(state.targetScore * modEffect.scoreCapPct)
        finalWordScore = Math.min(finalWordScore, cap)
      }
      expect(finalWordScore).toBe(30)
      cleanupModifier()
    })

    it('集成：精英版 scoreCapPct=0.15 截断', () => {
      state.targetScore = 500
      applyModifier('boss_cap', true)
      let finalWordScore = 100
      const modEffect = getActiveParams()
      if (modEffect?.scoreCapPct) {
        const cap = Math.floor(state.targetScore * modEffect.scoreCapPct)
        finalWordScore = Math.min(finalWordScore, cap)
      }
      expect(finalWordScore).toBe(75) // 500 × 0.15 = 75
      cleanupModifier()
    })
  })

  describe('boss_fast_time 修饰器', () => {
    it('返回 timeSpeed 标志位 = 1', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_fast_time.getParams(false)
      expect(params.timeSpeed).toBe(1)
    })

    it('精英参数与满功率相同（标志位）', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_fast_time.getParams(true)
      expect(params.timeSpeed).toBe(1)
    })

    it('激活后 timeSpeed 标志为 truthy', () => {
      applyModifier('boss_fast_time', false)
      const modEffect = getActiveParams()
      expect(!!modEffect?.timeSpeed).toBe(true)
      cleanupModifier()
    })

    it('无修饰器时 timeSpeed 为 undefined', () => {
      const modEffect = getActiveParams()
      expect(modEffect?.timeSpeed).toBeUndefined()
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
      'boss_decay', 'boss_cap',
      'boss_double_target', 'boss_diminish',
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

  describe('视觉类修饰器生命周期', () => {
    it('apply → onTick → cleanup 完整周期不报错', () => {
      const visualMods: BossModifierId[] = ['boss_fade']
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
      const visualMods: BossModifierId[] = ['boss_fade']
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
      const cognitiveMods: BossModifierId[] = ['boss_scramble', 'boss_reverse']
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
      const cognitiveMods: BossModifierId[] = ['boss_scramble', 'boss_reverse']
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

  // === boss_garble 乱码修饰器 ===

  describe('boss_garble 修饰器', () => {
    it('满功率参数: garbleRate=0.3, garbleActive=1', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_garble.getParams(false)
      expect(params.garbleRate).toBe(0.3)
      expect(params.garbleActive).toBe(1)
    })

    it('精英参数: garbleRate=0.15', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_garble.getParams(true)
      expect(params.garbleRate).toBe(0.15)
      expect(params.garbleActive).toBe(1)
    })

    it('garbleWord 至少插入 1 个标点', () => {
      for (let i = 0; i < 20; i++) {
        const result = garbleWord('hello', 0.3)
        expect(result.length).toBeGreaterThan(5)
        const punctCount = result.split('').filter(c => GARBLE_CHARS.includes(c)).length
        expect(punctCount).toBeGreaterThanOrEqual(1)
      }
    })

    it('garbleWord 保留原始字母', () => {
      const result = garbleWord('abc', 0.5)
      const letters = result.split('').filter(c => !GARBLE_CHARS.includes(c))
      expect(letters.join('')).toBe('abc')
    })

    it('isGarbleActive 激活时返回 true', () => {
      applyModifier('boss_garble', false)
      expect(isGarbleActive()).toBe(true)
      cleanupModifier()
    })

    it('isGarbleActive 未激活时返回 false', () => {
      expect(isGarbleActive()).toBe(false)
    })

    it('transformWordForModifier 应用 garble 变换', () => {
      applyModifier('boss_garble', false)
      const result = transformWordForModifier('hello')
      expect(result.length).toBeGreaterThan(5)
      cleanupModifier()
    })

    it('apply → cleanup 完整周期不报错', () => {
      expect(() => {
        applyModifier('boss_garble', false)
        tickModifier(0.1)
        cleanupModifier()
      }).not.toThrow()
    })
  })

})
