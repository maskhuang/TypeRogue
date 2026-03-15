// ============================================
// 打字肉鸽 - 连锁触发技能飞行定位测试 (Story 37.4)
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, synergy, resetState } from '../../../src/core/state'
import type { AffixSkillInstance } from '../../../src/data/affixes'
import { AffixType } from '../../../src/data/affixes'

// Mock RelicPipeline
vi.mock('../../../src/systems/relics/RelicPipeline', () => ({
  resolveRelicSkillTrigger: () => 1,
  queryRelicFlag: () => false,
}))

// Mock UI / 音效
vi.mock('../../../src/ui/elements', () => ({
  getElements: () => ({
    triggerZone: { appendChild: vi.fn() },
  }),
}))
vi.mock('../../../src/effects/sound', () => ({
  playSound: vi.fn(),
  emitResourceSound: vi.fn(),
}))

const mockShowFeedback = vi.fn()
vi.mock('../../../src/systems/battle', () => ({
  showFeedback: (...args: any[]) => mockShowFeedback(...args),
  updateHUD: vi.fn(),
  setPseudoInfiniteVisual: vi.fn(),
}))

// Mock DOM for showTriggerPopup
beforeEach(() => {
  const mockEl = { className: '', innerHTML: '', style: { left: '' }, remove: vi.fn() }
  vi.stubGlobal('document', { createElement: () => mockEl })
})
afterEach(() => {
  vi.unstubAllGlobals()
  mockShowFeedback.mockClear()
})

/** 创建最简产出者技能 */
function makeProducer(id: string): AffixSkillInstance {
  return {
    id,
    name: 'TestProducer',
    icon: '⚡',
    resource: 'base',
    baseValues: [2, 4, 6],
    level: 1,
    rarity: 0,
    affixes: [{ type: AffixType.Produce, weight: 1 }],
    enchantmentIds: [],
  }
}

describe('triggerSkill — overrideAnchor 连锁触发飞行定位 (Story 37.4)', () => {
  beforeEach(() => {
    resetState()
  })

  it('无 overrideAnchor 时 anchor 使用 state.player.index', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    const skill = makeProducer('prod_test')
    state.affixSkills.set('prod_test', skill)
    state.affixSkillStates.set('prod_test', { skillId: 'prod_test' } as any)
    state.player.bindings.set('a', 'prod_test')
    state.player.word = 'apple'
    state.player.index = 3

    synergy.skillBaseScore = 0
    triggerSkill('prod_test', 'a')

    // 默认锚点应使用 state.player.index = 3
    const feedbackCalls = mockShowFeedback.mock.calls.filter(
      (c: any[]) => c[3] && typeof c[3] === 'object' && (c[3].letterIndex !== undefined || c[3].fromElementId)
    )
    expect(feedbackCalls.length).toBeGreaterThan(0)
    for (const call of feedbackCalls) {
      const anchor = call[3]
      expect(anchor.letterIndex).toBe(3)
      expect(anchor.fromElementId).toBeUndefined()
    }
  })

  it('overrideAnchor.letterIndex 覆盖默认锚点', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    const skill = makeProducer('prod_test')
    state.affixSkills.set('prod_test', skill)
    state.affixSkillStates.set('prod_test', { skillId: 'prod_test' } as any)
    state.player.bindings.set('a', 'prod_test')
    state.player.word = 'apple'
    state.player.index = 3

    synergy.skillBaseScore = 0
    triggerSkill('prod_test', 'a', { letterIndex: 0 })

    const feedbackCalls = mockShowFeedback.mock.calls.filter(
      (c: any[]) => c[3] && typeof c[3] === 'object' && c[3].letterIndex !== undefined
    )
    expect(feedbackCalls.length).toBeGreaterThan(0)
    for (const call of feedbackCalls) {
      expect(call[3].letterIndex).toBe(0)
    }
  })

  it('overrideAnchor.fromElementId 使用元素 ID 替代 letterIndex', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    const skill = makeProducer('prod_test')
    state.affixSkills.set('prod_test', skill)
    state.affixSkillStates.set('prod_test', { skillId: 'prod_test' } as any)
    state.player.bindings.set('a', 'prod_test')
    state.player.word = 'apple'
    state.player.index = 3

    synergy.skillBaseScore = 0
    triggerSkill('prod_test', 'a', { fromElementId: 'active-library' })

    const feedbackCalls = mockShowFeedback.mock.calls.filter(
      (c: any[]) => c[3] && typeof c[3] === 'object' && c[3].fromElementId
    )
    expect(feedbackCalls.length).toBeGreaterThan(0)
    for (const call of feedbackCalls) {
      expect(call[3].fromElementId).toBe('active-library')
      expect(call[3].letterIndex).toBeUndefined()
    }
  })
})
