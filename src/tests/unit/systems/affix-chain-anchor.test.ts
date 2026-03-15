// ============================================
// 打字肉鸽 - 词条链式触发锚点独立定位测试 (Story 37.6)
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

// Mock battle — 包含 resolveChainAnchor
const mockShowFeedback = vi.fn()
const mockResolveChainAnchor = vi.fn((key: string) => {
  // 用 letterIndex: 77 作为链式锚点标记值
  return { letterIndex: 77 }
})
vi.mock('../../../src/systems/battle', () => ({
  showFeedback: (...args: any[]) => mockShowFeedback(...args),
  updateHUD: vi.fn(),
  setPseudoInfiniteVisual: vi.fn(),
  resolveChainAnchor: (...args: any[]) => mockResolveChainAnchor(...args),
}))

// Mock orchestrator — 返回包含不同 triggerKey 的链式结果
const mockOrchestrate = vi.fn()
vi.mock('../../../src/systems/affixTriggerOrchestrator', () => ({
  orchestrateAffixTrigger: (...args: any[]) => mockOrchestrate(...args),
}))

// Mock DOM
beforeEach(() => {
  const mockEl = { className: '', innerHTML: '', style: { left: '' }, remove: vi.fn() }
  vi.stubGlobal('document', { createElement: () => mockEl })
})
afterEach(() => {
  vi.unstubAllGlobals()
  mockShowFeedback.mockClear()
  mockResolveChainAnchor.mockClear()
  mockOrchestrate.mockClear()
})

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

describe('triggerSkill — 词条链式触发锚点独立定位 (Story 37.6)', () => {
  beforeEach(() => {
    resetState()
  })

  it('链式结果 (tr.triggerKey !== triggerKey) 使用 resolveChainAnchor', async () => {
    mockOrchestrate.mockReturnValue({
      totalOutput: 10,
      triggerCount: 2,
      maxDepth: 1,
      enteredPseudoInfinite: false,
      triggerResults: [
        {
          triggerKey: 'a', output: 5, bonusPercent: 0, multipliers: [],
          isCrit: false, isPulse: false, isCascade: false, isTabooPenalty: false,
          isMultiplyOp: false, ligatureCount: 0, stateMutations: [],
          phase4: { targetResource: 'base' },
        },
        {
          triggerKey: 'b', output: 5, bonusPercent: 0, multipliers: [],
          isCrit: false, isPulse: false, isCascade: false, isTabooPenalty: false,
          isMultiplyOp: false, ligatureCount: 0, stateMutations: [],
          phase4: { targetResource: 'base' },
        },
      ],
    })

    const { triggerSkill } = await import('../../../src/systems/skills')
    const skill = makeProducer('prod_a')
    state.affixSkills.set('prod_a', skill)
    state.affixSkillStates.set('prod_a', { skillId: 'prod_a' } as any)
    state.player.bindings.set('a', 'prod_a')
    state.player.word = 'apple'
    state.player.index = 3

    synergy.skillBaseScore = 0
    triggerSkill('prod_a', 'a')

    // L1: 验证 orchestrator 被正确调用
    expect(mockOrchestrate).toHaveBeenCalledTimes(1)
    const orchestrateArgs = mockOrchestrate.mock.calls[0]
    expect(orchestrateArgs[0]).toBe('prod_a') // skillId
    expect(orchestrateArgs[1]).toBe('a')      // triggerKey

    // resolveChainAnchor 应只对链式结果 (triggerKey='b') 调用
    expect(mockResolveChainAnchor).toHaveBeenCalledWith('b')
    expect(mockResolveChainAnchor).not.toHaveBeenCalledWith('a')

    // 检查反馈调用
    const anchored = mockShowFeedback.mock.calls.filter(
      (c: any[]) => c[3] && typeof c[3] === 'object'
    )
    expect(anchored.length).toBe(2)

    // 初始触发 (triggerKey='a') 应使用 state.player.index = 3
    expect(anchored[0][3].letterIndex).toBe(3)

    // 链式触发 (triggerKey='b') 应使用 resolveChainAnchor 返回的 77
    expect(anchored[1][3].letterIndex).toBe(77)
  })

  it('初始触发与 recurse 使用相同锚点', async () => {
    mockOrchestrate.mockReturnValue({
      totalOutput: 10,
      triggerCount: 2,
      maxDepth: 1,
      enteredPseudoInfinite: false,
      triggerResults: [
        {
          triggerKey: 'a', output: 5, bonusPercent: 0, multipliers: [],
          isCrit: false, isPulse: false, isCascade: false, isTabooPenalty: false,
          isMultiplyOp: false, ligatureCount: 0, stateMutations: [],
          phase4: { targetResource: 'base' },
        },
        {
          // recurse: same triggerKey
          triggerKey: 'a', output: 3, bonusPercent: 0, multipliers: [],
          isCrit: false, isPulse: false, isCascade: false, isTabooPenalty: false,
          isMultiplyOp: false, ligatureCount: 0, stateMutations: [],
          phase4: { targetResource: 'base' },
        },
      ],
    })

    const { triggerSkill } = await import('../../../src/systems/skills')
    const skill = makeProducer('prod_a')
    state.affixSkills.set('prod_a', skill)
    state.affixSkillStates.set('prod_a', { skillId: 'prod_a' } as any)
    state.player.bindings.set('a', 'prod_a')
    state.player.word = 'apple'
    state.player.index = 3

    synergy.skillBaseScore = 0
    triggerSkill('prod_a', 'a')

    // recurse 与 initial 的 triggerKey 相同 → 不调用 resolveChainAnchor
    expect(mockResolveChainAnchor).not.toHaveBeenCalled()

    const anchored = mockShowFeedback.mock.calls.filter(
      (c: any[]) => c[3] && typeof c[3] === 'object'
    )
    // 两个结果都用 state.player.index = 3
    for (const call of anchored) {
      expect(call[3].letterIndex).toBe(3)
    }
  })

  it('链式结果的衍生附魔反馈也使用独立锚点', async () => {
    mockOrchestrate.mockReturnValue({
      totalOutput: 5,
      triggerCount: 2,
      maxDepth: 1,
      enteredPseudoInfinite: false,
      triggerResults: [
        {
          triggerKey: 'a', output: 5, bonusPercent: 0, multipliers: [],
          isCrit: false, isPulse: false, isCascade: false, isTabooPenalty: false,
          isMultiplyOp: false, ligatureCount: 0, stateMutations: [],
          phase4: { targetResource: 'base' },
        },
        {
          triggerKey: 'c', output: 3, bonusPercent: 0, multipliers: [],
          isCrit: false, isPulse: false, isCascade: false, isTabooPenalty: false,
          isMultiplyOp: false, ligatureCount: 0, stateMutations: [],
          phase4: { targetResource: 'base' },
          phase5: { transmuteOutput: { resource: 'gold', amount: 2 }, recurse: { shouldRecurse: false }, splashTargets: [], devourTarget: null, questCompleted: false },
        },
      ],
    })

    const { triggerSkill } = await import('../../../src/systems/skills')
    const skill = makeProducer('prod_a')
    state.affixSkills.set('prod_a', skill)
    state.affixSkillStates.set('prod_a', { skillId: 'prod_a' } as any)
    state.player.bindings.set('a', 'prod_a')
    state.player.word = 'cat'
    state.player.index = 1

    synergy.skillBaseScore = 0
    triggerSkill('prod_a', 'a')

    // resolveChainAnchor 被调用（链式 triggerKey='c'）
    const chainCalls = mockResolveChainAnchor.mock.calls.filter((c: any[]) => c[0] === 'c')
    expect(chainCalls.length).toBeGreaterThanOrEqual(1)

    // 查找衍生附魔反馈（🔀 前缀）
    const transmuteFeedback = mockShowFeedback.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('🔀')
    )
    expect(transmuteFeedback.length).toBe(1)
    // 衍生附魔也应使用链式锚点 77
    expect(transmuteFeedback[0][3].letterIndex).toBe(77)
  })
})
