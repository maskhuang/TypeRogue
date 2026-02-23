// ============================================
// 打字肉鸽 - LetterUpgradeSystem 单元测试
// ============================================
// Story 14.1: 字母升级核心逻辑 + 管道集成

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock state
vi.mock('../../../../src/core/state', () => {
  return {
    state: {
      player: {
        letterLevels: new Map<string, number>(),
        bindings: new Map(),
        skills: new Map(),
        relics: new Set(),
      },
    },
  }
})

// Mock eventBus
vi.mock('../../../../src/core/events/EventBus', () => {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {}
  return {
    eventBus: {
      emit: vi.fn((event: string, data: unknown) => {
        handlers[event]?.forEach(h => h(data))
      }),
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!handlers[event]) handlers[event] = []
        handlers[event].push(handler)
        return () => {
          handlers[event] = handlers[event].filter(h => h !== handler)
        }
      }),
    },
  }
})

import { state } from '../../../../src/core/state'
import { eventBus } from '../../../../src/core/events/EventBus'
import {
  upgradeLetter,
  getLetterLevel,
  getLetterModifiers,
  resetLetters,
  getUpgradeCost,
  upgradeLetters,
  LETTER_UPGRADE_COSTS,
  VOWELS,
} from '../../../../src/systems/letters/LetterUpgradeSystem'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'

beforeEach(() => {
  resetLetters()
  vi.clearAllMocks()
})

// ========================================
// upgradeLetter
// ========================================
describe('upgradeLetter', () => {
  it('从 Lv0 升级到 Lv1 → true', () => {
    expect(upgradeLetter('e')).toBe(true)
    expect(state.player.letterLevels.get('e')).toBe(1)
  })

  it('连续升级 Lv0→1→2→3', () => {
    upgradeLetter('a')
    upgradeLetter('a')
    upgradeLetter('a')
    expect(state.player.letterLevels.get('a')).toBe(3)
  })

  it('超过 Lv3 返回 false', () => {
    upgradeLetter('a')
    upgradeLetter('a')
    upgradeLetter('a')
    expect(upgradeLetter('a')).toBe(false)
    expect(state.player.letterLevels.get('a')).toBe(3)
  })

  it('大写输入转小写存储', () => {
    upgradeLetter('A')
    expect(state.player.letterLevels.get('a')).toBe(1)
    expect(state.player.letterLevels.has('A')).toBe(false)
  })

  it('升级触发 letter:upgraded 事件', () => {
    upgradeLetter('e')
    expect(eventBus.emit).toHaveBeenCalledWith('letter:upgraded', { key: 'e', level: 1 })
  })

  it('多次升级事件包含正确等级', () => {
    upgradeLetter('e')
    upgradeLetter('e')
    expect(eventBus.emit).toHaveBeenLastCalledWith('letter:upgraded', { key: 'e', level: 2 })
  })
})

// ========================================
// upgradeLetter 输入验证
// ========================================
describe('upgradeLetter 输入验证', () => {
  it('空字符串 → false', () => {
    expect(upgradeLetter('')).toBe(false)
    expect(state.player.letterLevels.size).toBe(0)
  })

  it('数字 → false', () => {
    expect(upgradeLetter('1')).toBe(false)
    expect(state.player.letterLevels.size).toBe(0)
  })

  it('多字符 → false', () => {
    expect(upgradeLetter('ab')).toBe(false)
    expect(state.player.letterLevels.size).toBe(0)
  })
})

// ========================================
// getLetterLevel
// ========================================
describe('getLetterLevel', () => {
  it('未升级字母返回 0', () => {
    expect(getLetterLevel('x')).toBe(0)
  })

  it('返回当前等级', () => {
    upgradeLetter('e')
    upgradeLetter('e')
    expect(getLetterLevel('e')).toBe(2)
  })

  it('大小写不敏感', () => {
    upgradeLetter('e')
    expect(getLetterLevel('E')).toBe(1)
  })
})

// ========================================
// resetLetters
// ========================================
describe('resetLetters', () => {
  it('清除所有字母等级', () => {
    upgradeLetter('a')
    upgradeLetter('b')
    upgradeLetter('c')
    resetLetters()
    expect(getLetterLevel('a')).toBe(0)
    expect(getLetterLevel('b')).toBe(0)
    expect(getLetterLevel('c')).toBe(0)
  })
})

// ========================================
// getLetterModifiers
// ========================================
describe('getLetterModifiers', () => {
  it('无升级字母返回空数组', () => {
    expect(getLetterModifiers()).toEqual([])
  })

  it('Lv1 字母生成 1 个修饰器 (value=1)', () => {
    upgradeLetter('e')
    const mods = getLetterModifiers()
    expect(mods).toHaveLength(1)
    expect(mods[0].id).toBe('letter:e:score')
    expect(mods[0].source).toBe('letter:e')
    expect(mods[0].sourceType).toBe('letter')
    expect(mods[0].layer).toBe('base')
    expect(mods[0].trigger).toBe('on_correct_keystroke')
    expect(mods[0].phase).toBe('calculate')
    expect(mods[0].condition).toEqual({ type: 'key_is', key: 'e' })
    expect(mods[0].effect).toEqual({ type: 'score', value: 1, stacking: 'additive' })
    expect(mods[0].priority).toBe(50)
  })

  it('Lv2 字母 value=2', () => {
    upgradeLetter('a')
    upgradeLetter('a')
    const mods = getLetterModifiers()
    expect(mods[0].effect?.value).toBe(2)
  })

  it('Lv3 字母 value=3', () => {
    upgradeLetter('a')
    upgradeLetter('a')
    upgradeLetter('a')
    const mods = getLetterModifiers()
    expect(mods[0].effect?.value).toBe(3)
  })

  it('多个升级字母各自生成修饰器', () => {
    upgradeLetter('a')
    upgradeLetter('b')
    upgradeLetter('b')
    const mods = getLetterModifiers()
    expect(mods).toHaveLength(2)
    const amod = mods.find(m => m.id === 'letter:a:score')
    const bmod = mods.find(m => m.id === 'letter:b:score')
    expect(amod?.effect?.value).toBe(1)
    expect(bmod?.effect?.value).toBe(2)
  })
})

// ========================================
// 管道集成测试 (Task 5.3)
// ========================================
describe('管道集成: 字母修饰器 + EffectPipeline', () => {
  it('击键匹配升级字母 → score = level', () => {
    upgradeLetter('e')
    upgradeLetter('e') // Lv2
    const registry = new ModifierRegistry()
    registry.registerMany(getLetterModifiers())
    const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
      currentKeystrokeKey: 'e',
    })
    expect(result.effects.score).toBe(2)
  })

  it('击键不匹配 → score = 0', () => {
    upgradeLetter('e')
    const registry = new ModifierRegistry()
    registry.registerMany(getLetterModifiers())
    const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
      currentKeystrokeKey: 'a',
    })
    expect(result.effects.score).toBe(0)
  })

  it('多字母升级 + 匹配字母 e → 只计算 e 的分数', () => {
    upgradeLetter('e') // e Lv1
    upgradeLetter('a') // a Lv1
    upgradeLetter('a') // a Lv2
    const registry = new ModifierRegistry()
    registry.registerMany(getLetterModifiers())
    const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
      currentKeystrokeKey: 'e',
    })
    expect(result.effects.score).toBe(1) // e Lv1
  })

  it('字母修饰器 + 技能修饰器在同一 registry 中正确叠加', () => {
    upgradeLetter('e') // e Lv1 → +1 score
    const registry = new ModifierRegistry()
    registry.registerMany(getLetterModifiers())
    // 添加一个无条件的技能 score modifier
    registry.register({
      id: 'skill:burst:score',
      source: 'skill:burst',
      sourceType: 'skill',
      layer: 'base',
      trigger: 'on_correct_keystroke',
      phase: 'calculate',
      effect: { type: 'score', value: 5, stacking: 'additive' },
      priority: 100,
    })
    const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
      currentKeystrokeKey: 'e',
    })
    // letter e Lv1(+1) + skill burst(+5) = 6
    expect(result.effects.score).toBe(6)
  })

  it('示例: "sleep" 中 e(Lv2) 每次击键 +2', () => {
    upgradeLetter('e')
    upgradeLetter('e') // e Lv2

    const word = 'sleep'
    let totalLetterScore = 0

    for (const char of word) {
      const registry = new ModifierRegistry()
      registry.registerMany(getLetterModifiers())
      const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
        currentKeystrokeKey: char,
      })
      totalLetterScore += result.effects.score
    }

    // s(0) + l(0) + e(2) + e(2) + p(0) = 4
    expect(totalLetterScore).toBe(4)
  })
})

// ========================================
// getUpgradeCost (Story 14.2)
// ========================================
describe('getUpgradeCost', () => {
  it('Lv0 → 价格 10', () => {
    expect(getUpgradeCost('a')).toBe(10)
  })

  it('Lv1 → 价格 20', () => {
    upgradeLetter('a')
    expect(getUpgradeCost('a')).toBe(20)
  })

  it('Lv2 → 价格 35', () => {
    upgradeLetter('a')
    upgradeLetter('a')
    expect(getUpgradeCost('a')).toBe(35)
  })

  it('Lv3 (满级) → null', () => {
    upgradeLetter('a')
    upgradeLetter('a')
    upgradeLetter('a')
    expect(getUpgradeCost('a')).toBeNull()
  })

  it('大小写不敏感', () => {
    upgradeLetter('a')
    expect(getUpgradeCost('A')).toBe(20)
  })
})

// ========================================
// LETTER_UPGRADE_COSTS 常量
// ========================================
describe('LETTER_UPGRADE_COSTS', () => {
  it('包含 3 个价格 [10, 20, 35]', () => {
    expect(LETTER_UPGRADE_COSTS).toEqual([10, 20, 35])
  })
})

// ========================================
// upgradeLetters 批量升级 (Story 14.2)
// ========================================
describe('upgradeLetters', () => {
  it('全部成功 → 返回成功数', () => {
    const count = upgradeLetters(['a', 'b', 'c'])
    expect(count).toBe(3)
    expect(getLetterLevel('a')).toBe(1)
    expect(getLetterLevel('b')).toBe(1)
    expect(getLetterLevel('c')).toBe(1)
  })

  it('部分满级 → 只升级未满级的', () => {
    upgradeLetter('a')
    upgradeLetter('a')
    upgradeLetter('a') // a = Lv3
    const count = upgradeLetters(['a', 'b'])
    expect(count).toBe(1) // only b upgraded
    expect(getLetterLevel('a')).toBe(3)
    expect(getLetterLevel('b')).toBe(1)
  })

  it('全部满级 → 返回 0', () => {
    upgradeLetter('a')
    upgradeLetter('a')
    upgradeLetter('a')
    upgradeLetter('b')
    upgradeLetter('b')
    upgradeLetter('b')
    const count = upgradeLetters(['a', 'b'])
    expect(count).toBe(0)
  })

  it('空数组 → 返回 0', () => {
    expect(upgradeLetters([])).toBe(0)
  })

  it('同一字母多次 → 连续升级', () => {
    const count = upgradeLetters(['a', 'a', 'a'])
    expect(count).toBe(3)
    expect(getLetterLevel('a')).toBe(3)
  })
})

// ========================================
// VOWELS 常量 (Story 14.2)
// ========================================
describe('VOWELS', () => {
  it('包含 5 个元音 [a, e, i, o, u]', () => {
    expect(VOWELS).toEqual(['a', 'e', 'i', 'o', 'u'])
  })
})
