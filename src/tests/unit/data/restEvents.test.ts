// ============================================
// 打字肉鸽 - restEvents 单元测试（多选项制）
// ============================================

import { describe, it, expect } from 'vitest'
import { buildRestOptions } from '../../../src/data/restEvents'
import type { GameState } from '../../../src/core/types'

// 创建最小化测试用 GameState
function createTestState(overrides?: Partial<GameState>): GameState {
  return {
    level: 4,
    phase: 'rest',
    time: 30,
    timeMax: 30,
    score: 0,
    targetScore: 100,
    combo: 0,
    maxCombo: 0,
    multiplier: 1.0,
    wordScore: 0,
    gold: 200,
    wordPerfect: true,
    lastMilestone: 0,
    overkill: 0,
    bossModifierPool: [],
    usedRestEvents: [],
    tempBuffs: [],
    player: {
      word: '',
      index: 0,
      bindings: new Map([['a', 'prod_burst'], ['s', 'prod_boost']]),
      skills: new Map([['prod_burst', { level: 1 }], ['prod_boost', { level: 2 }]]),
      relics: new Set(),
      wordDeck: ['fire', 'ice'],
      baseMultiplier: 1.0,
      comboBonus: 0.1,
      wordBonus: 0,
      timeBonus: 0,
      evolvedSkills: new Map(),
    },
    shop: { items: [], refreshCount: 0 },
    ...overrides,
  } as GameState
}

describe('restEvents - buildRestOptions', () => {
  it('基础选项：有技能时返回2个选项（升级+增强）', () => {
    const state = createTestState()
    const options = buildRestOptions(state)
    expect(options).toHaveLength(2)
    expect(options[0].id).toBe('base_upgrade')
    expect(options[1].id).toBe('base_buff')
  })

  it('无技能时不显示升级选项，只有增强', () => {
    const state = createTestState()
    state.player.skills = new Map()
    const options = buildRestOptions(state)
    expect(options).toHaveLength(1)
    expect(options[0].id).toBe('base_buff')
  })

  it('所有技能已满级时不显示升级选项', () => {
    const state = createTestState()
    state.player.skills = new Map([['prod_burst', { level: 3 }]])
    const options = buildRestOptions(state)
    expect(options.find(o => o.id === 'base_upgrade')).toBeUndefined()
    expect(options.find(o => o.id === 'base_buff')).toBeDefined()
  })

  it('持有 intermission 遗物→多1个选项', () => {
    const state = createTestState()
    state.player.relics.add('intermission')
    const options = buildRestOptions(state)
    expect(options).toHaveLength(3)
    const relicOpt = options.find(o => o.id === 'relic_intermission')
    expect(relicOpt).toBeDefined()
    expect(relicOpt!.source).toBe('relic')
  })

  it('持有 gamblers_creed + ≥100g→多1个选项', () => {
    const state = createTestState({ gold: 150 })
    state.player.relics.add('gamblers_creed')
    const options = buildRestOptions(state)
    const gambleOpt = options.find(o => o.id === 'relic_gamble')
    expect(gambleOpt).toBeDefined()
  })

  it('持有 gamblers_creed 但 <100g→不显示', () => {
    const state = createTestState({ gold: 50 })
    state.player.relics.add('gamblers_creed')
    const options = buildRestOptions(state)
    const gambleOpt = options.find(o => o.id === 'relic_gamble')
    expect(gambleOpt).toBeUndefined()
  })

  it('同时持有两个遗物→最多4个选项', () => {
    const state = createTestState({ gold: 200 })
    state.player.relics.add('intermission')
    state.player.relics.add('gamblers_creed')
    const options = buildRestOptions(state)
    expect(options).toHaveLength(4)
  })

  it('每个选项包含必要字段', () => {
    const state = createTestState()
    state.player.relics.add('intermission')
    const options = buildRestOptions(state)
    options.forEach(opt => {
      expect(opt.id).toBeTruthy()
      expect(opt.label).toBeTruthy()
      expect(opt.description).toBeTruthy()
      expect(opt.icon).toBeTruthy()
      expect(opt.effectId).toBeTruthy()
      expect(['base', 'class', 'relic']).toContain(opt.source)
    })
  })
})
