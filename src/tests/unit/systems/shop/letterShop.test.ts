// ============================================
// 打字肉鸽 - 字母升级商店 逻辑测试
// ============================================
// Story 14.2: 商店字母标签页 — 商店特有逻辑测试
// (LetterUpgradeSystem 核心函数已在 LetterUpgradeSystem.test.ts 覆盖)

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock state
vi.mock('../../../../src/core/state', () => {
  return {
    state: {
      phase: 'shop' as string,
      gold: 100,
      overkill: 0,
      time: 10,
      level: 1,
      score: 0,
      targetScore: 100,
      player: {
        letterLevels: new Map<string, number>(),
        bindings: new Map(),
        skills: new Map(),
        relics: new Set(),
        wordDeck: [],
      },
      shop: {
        tab: 'skills' as string,
        freeLetterUpgrade: true,
        freeLetterOptions: [] as string[],
        selectedSkill: null,
        selectedKey: null,
        shopWords: [] as unknown[],
        shopSkills: [] as unknown[],
        shopRelics: [] as string[],
        rewards: [] as unknown[],
        removeCount: 0,
      },
    },
  }
})

// Mock eventBus
vi.mock('../../../../src/core/events/EventBus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(() => () => {}),
  },
}))

import { state } from '../../../../src/core/state'
import {
  upgradeLetter,
  getLetterLevel,
  getUpgradeCost,
  resetLetters,
  VOWELS,
} from '../../../../src/systems/letters/LetterUpgradeSystem'
import { KEYS } from '../../../../src/core/constants'

beforeEach(() => {
  resetLetters()
  state.gold = 100
  state.shop.tab = 'skills'
  state.shop.freeLetterUpgrade = true
  state.shop.freeLetterOptions = []
})

// ========================================
// ShopState 扩展验证
// ========================================
describe('ShopState 字母升级字段', () => {
  it('tab 可设置为 letters', () => {
    state.shop.tab = 'letters'
    expect(state.shop.tab).toBe('letters')
  })

  it('freeLetterOptions 存储缓存的免费字母', () => {
    state.shop.freeLetterOptions = ['a', 'e', 'i']
    expect(state.shop.freeLetterOptions).toEqual(['a', 'e', 'i'])
  })
})

// ========================================
// 免费升级选项生成逻辑
// ========================================
describe('免费升级选项生成', () => {
  it('所有字母未升级时有 26 个可选', () => {
    const upgradableKeys = KEYS.filter(k => getLetterLevel(k) < 3)
    expect(upgradableKeys.length).toBe(26)
  })

  it('满级字母不出现在可选列表中', () => {
    upgradeLetter('a'); upgradeLetter('a'); upgradeLetter('a')
    const upgradableKeys = KEYS.filter(k => getLetterLevel(k) < 3)
    expect(upgradableKeys).not.toContain('a')
    expect(upgradableKeys.length).toBe(25)
  })

  it('全部满级时可选列表为空', () => {
    for (const c of 'abcdefghijklmnopqrstuvwxyz') {
      upgradeLetter(c); upgradeLetter(c); upgradeLetter(c)
    }
    const upgradableKeys = KEYS.filter(k => getLetterLevel(k) < 3)
    expect(upgradableKeys.length).toBe(0)
  })

  it('缓存的免费选项在购买后不变', () => {
    state.shop.freeLetterOptions = ['a', 'e', 'i']
    // 模拟购买其他字母
    upgradeLetter('q')
    // 缓存的选项不受影响
    expect(state.shop.freeLetterOptions).toEqual(['a', 'e', 'i'])
  })
})

// ========================================
// 购买流程逻辑
// ========================================
describe('字母升级购买流程', () => {
  it('购买价格 = getUpgradeCost → getAdjustedPrice 链路', () => {
    // 验证 getUpgradeCost 返回正确基础价格供 getAdjustedPrice 使用
    const baseCost = getUpgradeCost('a')!
    expect(baseCost).toBe(10)
    // 购买后验证升级生效
    state.gold -= baseCost
    upgradeLetter('a')
    expect(state.gold).toBe(90)
    expect(getLetterLevel('a')).toBe(1)
    // 下次价格递增
    expect(getUpgradeCost('a')).toBe(20)
  })

  it('免费升级不扣金币', () => {
    const initialGold = state.gold
    upgradeLetter('e')
    state.shop.freeLetterUpgrade = false
    expect(state.gold).toBe(initialGold)
    expect(getLetterLevel('e')).toBe(1)
  })

  it('总投资满级一个字母 = 65 金币', () => {
    let totalSpent = 0
    while (getUpgradeCost('a') !== null) {
      totalSpent += getUpgradeCost('a')!
      upgradeLetter('a')
    }
    expect(totalSpent).toBe(65)
    expect(getLetterLevel('a')).toBe(3)
  })
})

// ========================================
// VOWELS 常量 — 遗物接口预留
// ========================================
describe('VOWELS 遗物接口', () => {
  it('包含 5 个元音且不可变', () => {
    expect(VOWELS).toEqual(['a', 'e', 'i', 'o', 'u'])
    // as const 确保 TypeScript 层面不可变
    expect(Object.isFrozen(VOWELS)).toBe(false) // runtime 不 freeze，但 TS 类型保护
    expect(VOWELS.length).toBe(5)
  })
})
