// ============================================
// 打字肉鸽 - restEvents 单元测试
// ============================================
// Story 18.3: 休息关事件数据与抽取逻辑

import { describe, it, expect } from 'vitest'
import { REST_EVENTS, drawRestEvent } from '../../../src/data/restEvents'
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
      bindings: new Map([['a', 'burst'], ['s', 'amp']]),
      skills: new Map([['burst', { level: 1 }], ['amp', { level: 2 }]]),
      relics: new Set(['lucky_coin']),
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

describe('restEvents', () => {
  describe('REST_EVENTS 完整性', () => {
    it('共 10 个事件', () => {
      expect(REST_EVENTS).toHaveLength(10)
    })

    it('所有事件 ID 不重复', () => {
      const ids = REST_EVENTS.map(e => e.id)
      const unique = new Set(ids)
      expect(unique.size).toBe(10)
    })

    it('每个事件包含必要字段', () => {
      REST_EVENTS.forEach(event => {
        expect(event.id).toBeTruthy()
        expect(event.name).toBeTruthy()
        expect(event.icon).toBeTruthy()
        expect(event.description).toBeTruthy()
        expect(event.options.length).toBeGreaterThan(0)
      })
    })

    it('每个选项包含 label, description, effectId', () => {
      REST_EVENTS.forEach(event => {
        event.options.forEach(option => {
          expect(option.label).toBeTruthy()
          expect(option.description).toBeTruthy()
          expect(option.effectId).toBeTruthy()
        })
      })
    })

    it('命运之轮只有 1 个选项（无选择）', () => {
      const wheel = REST_EVENTS.find(e => e.id === 'wheel_of_destiny')
      expect(wheel).toBeDefined()
      expect(wheel!.options).toHaveLength(1)
    })
  })

  describe('前置条件', () => {
    it('技能祭坛需要 ≥2 技能', () => {
      const altar = REST_EVENTS.find(e => e.id === 'skill_altar')!
      expect(altar.prerequisite).toBeDefined()

      const rich = createTestState() // 2 skills
      expect(altar.prerequisite!(rich)).toBe(true)

      const poor = createTestState()
      poor.player.skills = new Map([['burst', { level: 1 }]])
      expect(altar.prerequisite!(poor)).toBe(false)
    })

    it('赌徒骰子需要 ≥100 金币', () => {
      const dice = REST_EVENTS.find(e => e.id === 'gambler_dice')!
      expect(dice.prerequisite).toBeDefined()

      const rich = createTestState({ gold: 150 })
      expect(dice.prerequisite!(rich)).toBe(true)

      const poor = createTestState({ gold: 50 })
      expect(dice.prerequisite!(poor)).toBe(false)
    })

    it('遗物熔炉需要 ≥1 遗物或 ≥1 技能', () => {
      const forge = REST_EVENTS.find(e => e.id === 'relic_forge')!
      expect(forge.prerequisite).toBeDefined()

      const hasRelics = createTestState()
      expect(forge.prerequisite!(hasRelics)).toBe(true)

      const hasNothing = createTestState()
      hasNothing.player.relics = new Set()
      hasNothing.player.skills = new Map()
      expect(forge.prerequisite!(hasNothing)).toBe(false)
    })

    it('键盘诅咒需要 ≥1 绑定', () => {
      const curse = REST_EVENTS.find(e => e.id === 'keyboard_curse')!
      expect(curse.prerequisite).toBeDefined()

      const hasBind = createTestState()
      expect(curse.prerequisite!(hasBind)).toBe(true)

      const noBind = createTestState()
      noBind.player.bindings = new Map()
      expect(curse.prerequisite!(noBind)).toBe(false)
    })

    it('技能复制器需要 ≥1 技能', () => {
      const copier = REST_EVENTS.find(e => e.id === 'skill_copier')!
      expect(copier.prerequisite).toBeDefined()

      const hasSkills = createTestState()
      expect(copier.prerequisite!(hasSkills)).toBe(true)

      const noSkills = createTestState()
      noSkills.player.skills = new Map()
      expect(copier.prerequisite!(noSkills)).toBe(false)
    })

    it('无前置条件的事件始终可用', () => {
      const noPre = REST_EVENTS.filter(e => !e.prerequisite)
      expect(noPre.length).toBeGreaterThan(0)
      const state = createTestState()
      noPre.forEach(event => {
        // 无 prerequisite 意味着始终可用
        expect(!event.prerequisite || event.prerequisite(state)).toBe(true)
      })
    })
  })

  describe('drawRestEvent()', () => {
    it('从可用事件池中抽取', () => {
      const state = createTestState()
      const event = drawRestEvent([], state)
      expect(event).not.toBeNull()
      expect(REST_EVENTS.map(e => e.id)).toContain(event!.id)
    })

    it('不重复抽取已使用的事件', () => {
      const state = createTestState()
      const allIds = REST_EVENTS.map(e => e.id)
      // 标记所有事件为已使用
      const event = drawRestEvent(allIds, state)
      expect(event).toBeNull()
    })

    it('排除不满足前置条件的事件', () => {
      const poorState = createTestState({ gold: 10 })
      poorState.player.skills = new Map()
      poorState.player.relics = new Set()
      poorState.player.bindings = new Map()

      // 多次抽取，确保不会抽到有前置条件且不满足的事件
      for (let i = 0; i < 50; i++) {
        const event = drawRestEvent([], poorState)
        if (event && event.prerequisite) {
          expect(event.prerequisite(poorState)).toBe(true)
        }
      }
    })

    it('所有事件用完后返回 null', () => {
      const state = createTestState()
      const usedIds: string[] = []
      // 逐个抽取直到池空
      for (let i = 0; i < 15; i++) {
        const event = drawRestEvent(usedIds, state)
        if (!event) break
        usedIds.push(event.id)
      }
      const finalDraw = drawRestEvent(usedIds, state)
      expect(finalDraw).toBeNull()
    })

    it('多次抽取具有随机性', () => {
      const state = createTestState()
      const results = new Set<string>()
      for (let i = 0; i < 30; i++) {
        const event = drawRestEvent([], state)
        if (event) results.add(event.id)
      }
      // 30 次抽取应至少出现 2 种不同事件
      expect(results.size).toBeGreaterThanOrEqual(2)
    })
  })
})
