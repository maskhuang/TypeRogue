// ============================================
// 打字肉鸽 - triggerSkill 重触发集成测试
// ============================================
// Story 29.1 code review: 验证 triggerSkill retrigger 流程

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, synergy, resetState } from '../../../src/core/state'

// === 控制 retrigger 行为的测试开关 ===
let retriggerEnabled = false

// Mock RelicPipeline: 模拟 retrigger 遗物
vi.mock('../../../src/systems/relics/RelicPipeline', () => ({
  resolveRelicSkillTrigger: (ctx: any, callbacks: any) => {
    if (retriggerEnabled && callbacks?.onRetrigger) {
      callbacks.onRetrigger()
    }
    return 1
  },
}))

// Mock UI / 音效
vi.mock('../../../src/ui/elements', () => ({
  getElements: () => ({
    triggerZone: { appendChild: vi.fn() },
  }),
}))
vi.mock('../../../src/effects/sound', () => ({
  playSound: vi.fn(),
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
  retriggerEnabled = false
})

describe('triggerSkill — retrigger 集成', () => {
  beforeEach(() => {
    resetState()
  })

  it('retrigger 启用 → 产出者触发两次，skillBaseScore 翻倍', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('a', 'prod_burst')
    synergy.skillBaseScore = 0

    // 先不启用 retrigger，记录单次触发值
    retriggerEnabled = false
    triggerSkill('prod_burst', 'a')
    const singleScore = synergy.skillBaseScore

    // 重置并启用 retrigger
    synergy.skillBaseScore = 0
    retriggerEnabled = true
    triggerSkill('prod_burst', 'a')

    // 重触发 → 触发两次 → 分数应为单次的两倍
    expect(synergy.skillBaseScore).toBe(singleScore * 2)
  })

  it('防循环：重触发的执行不会再次重触发（只执行两次，非三次）', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('a', 'prod_burst')
    synergy.skillBaseScore = 0

    // 先记录单次值
    retriggerEnabled = false
    triggerSkill('prod_burst', 'a')
    const singleScore = synergy.skillBaseScore

    // 重置并启用 retrigger（mock 每次都调用 onRetrigger，但防循环应阻止第三次）
    synergy.skillBaseScore = 0
    retriggerEnabled = true
    triggerSkill('prod_burst', 'a')

    // 防循环：应恰好 2 倍，而非 3 倍
    expect(synergy.skillBaseScore).toBe(singleScore * 2)
  })

  it('retrigger 触发时显示浮字反馈', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('a', 'prod_burst')

    retriggerEnabled = true
    triggerSkill('prod_burst', 'a')

    expect(mockShowFeedback).toHaveBeenCalledWith('重触发!', '#ff6b00')
  })

  it('增幅者 retrigger → 叠层增加两次', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    const AMP_ID = 'amp_base_adjacent'
    state.player.bindings.set('a', AMP_ID)

    // 单次触发
    retriggerEnabled = false
    triggerSkill(AMP_ID, 'a')
    const singleStacks = state.amplifierStacks.get(AMP_ID) || 0
    expect(singleStacks).toBe(1)

    // 重置叠层并启用 retrigger
    state.amplifierStacks.set(AMP_ID, 0)
    retriggerEnabled = true
    triggerSkill(AMP_ID, 'a')

    // 重触发 → 叠层 +2（两次各+1）
    expect(state.amplifierStacks.get(AMP_ID)).toBe(2)
  })

  it('retrigger 未启用 → 正常单次触发', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('a', 'prod_burst')
    synergy.skillBaseScore = 0

    retriggerEnabled = false
    triggerSkill('prod_burst', 'a')

    // 无 retrigger 反馈
    expect(mockShowFeedback).not.toHaveBeenCalledWith('重触发!', '#ff6b00')
  })
})
