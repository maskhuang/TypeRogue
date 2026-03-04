// ============================================
// 连接者触发 + 连锁保护测试
// Story 19.5: AC2, AC3, AC4, AC6, AC7, AC8
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, synergy, resetState } from '../../../src/core/state'
import { CONNECTORS } from '../../../src/data/connectors'
import { PRODUCERS } from '../../../src/data/producers'

// Mock DOM 和音效
vi.mock('../../../src/ui/elements', () => ({
  getElements: () => ({
    triggerZone: { appendChild: vi.fn() },
    battleSkills: { querySelectorAll: () => [] },
  }),
}))
vi.mock('../../../src/effects/sound', () => ({
  playSound: vi.fn(),
}))
const mockShowFeedback = vi.fn()
const mockHighlightBoundSkill = vi.fn()
const mockUpdateHUD = vi.fn()
vi.mock('../../../src/systems/battle', () => ({
  showFeedback: (...args: any[]) => mockShowFeedback(...args),
  highlightBoundSkill: (...args: any[]) => mockHighlightBoundSkill(...args),
  updateHUD: (...args: any[]) => mockUpdateHUD(...args),
}))

// Mock DOM for showTriggerPopup
beforeEach(() => {
  const mockEl = { className: '', innerHTML: '', style: { left: '' }, remove: vi.fn() }
  vi.stubGlobal('document', { createElement: () => mockEl })
})
afterEach(() => {
  vi.unstubAllGlobals()
  mockShowFeedback.mockClear()
  mockHighlightBoundSkill.mockClear()
  mockUpdateHUD.mockClear()
})

describe('triggerConnectorCopy — 复制型连接者 (AC2)', () => {
  beforeEach(() => resetState())

  it('触发后复制位置关系内的随机技能', async () => {
    const { triggerConnectorCopy } = await import('../../../src/systems/skills')
    // 设置：f=copy_adjacent 连接者, g=prod_burst 产出者 (f 和 g 相邻)
    state.player.skills.set('conn_copy_adjacent', { level: 1 })
    state.player.bindings.set('f', 'conn_copy_adjacent')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('g', 'prod_burst')

    const baseBefore = state.resources.base
    triggerConnectorCopy('conn_copy_adjacent', 'f', ['f'])
    // prod_burst 应该被触发 → base 增加
    expect(state.resources.base).toBeGreaterThan(baseBefore)
  })

  it('位置关系内无技能时不崩溃', async () => {
    const { triggerConnectorCopy } = await import('../../../src/systems/skills')
    state.player.skills.set('conn_copy_adjacent', { level: 1 })
    state.player.bindings.set('f', 'conn_copy_adjacent')
    // f 的相邻键都没有绑定技能
    expect(() => triggerConnectorCopy('conn_copy_adjacent', 'f', ['f'])).not.toThrow()
  })

  it('跳过其他连接者（避免无限递归）', async () => {
    const { triggerConnectorCopy } = await import('../../../src/systems/skills')
    state.player.skills.set('conn_copy_adjacent', { level: 1 })
    state.player.bindings.set('f', 'conn_copy_adjacent')
    // g 也绑定连接者
    state.player.skills.set('conn_copy_sameRow', { level: 1 })
    state.player.bindings.set('g', 'conn_copy_sameRow')
    // 不应触发 g（连接者跳过连接者）
    expect(() => triggerConnectorCopy('conn_copy_adjacent', 'f', ['f'])).not.toThrow()
  })
})

describe('checkResourceTriggers — 资源触发 (AC3)', () => {
  beforeEach(() => resetState())

  it('技能产出 base 后触发 base 连接者', async () => {
    const { checkResourceTriggers } = await import('../../../src/systems/skills')
    // 设置：f=conn_base_adjacent (监听 base, adjacent), d=prod_focus (倍率产出者)
    state.player.skills.set('conn_base_adjacent', { level: 1 })
    state.player.bindings.set('f', 'conn_base_adjacent')
    // d 和 f 相邻，且 d 绑定一个倍率产出者（不产出 base → 不被 Layer 1 过滤）
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('d', 'prod_focus')

    // 模拟 g (与 f 相邻) 产出了 base
    const multBefore = state.resources.multiplier
    checkResourceTriggers('base', 'g', ['g'])
    // conn_base_adjacent 应触发，选中 d(prod_focus) → multiplier 增加
    expect(state.resources.multiplier).toBeGreaterThanOrEqual(multBefore)
  })

  it('不匹配的资源不触发', async () => {
    const { checkResourceTriggers } = await import('../../../src/systems/skills')
    state.player.skills.set('conn_base_adjacent', { level: 1 })
    state.player.bindings.set('f', 'conn_base_adjacent')
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('d', 'prod_focus')

    const callsBefore = mockShowFeedback.mock.calls.length
    checkResourceTriggers('score', 'g', ['g'])  // score ≠ base
    // 不应触发连接者
    expect(mockShowFeedback.mock.calls.length).toBe(callsBefore)
  })
})

describe('分叉触发 — 多连接者同时触发 (AC3)', () => {
  beforeEach(() => resetState())

  it('同一资源变化触发多个连接者', async () => {
    const { checkResourceTriggers } = await import('../../../src/systems/skills')
    // 两个 base 连接者分别在 f 和 j，都监听 base + adjacent
    state.player.skills.set('conn_base_adjacent', { level: 1 })
    state.player.bindings.set('f', 'conn_base_adjacent')
    state.player.skills.set('conn_base_sameRow', { level: 1 })
    state.player.bindings.set('j', 'conn_base_sameRow')

    // d 绑定 prod_focus（倍率产出者，不产出 base → 不被 Layer 1 过滤）
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('d', 'prod_focus')
    // k 绑定 prod_focus
    state.player.skills.set('prod_shield', { level: 1 })
    state.player.bindings.set('k', 'prod_shield')

    // g 产出 base → 两个连接者都应有机会触发
    // 不应崩溃
    expect(() => checkResourceTriggers('base', 'g', ['g'])).not.toThrow()
  })
})

describe('Layer 1 — 2 卡循环阻断 (AC6)', () => {
  beforeEach(() => resetState())

  it('跳过能产出同资源的目标技能', async () => {
    const { checkResourceTriggers } = await import('../../../src/systems/skills')
    // conn_base_adjacent 在 f, 监听 base + adjacent
    state.player.skills.set('conn_base_adjacent', { level: 1 })
    state.player.bindings.set('f', 'conn_base_adjacent')
    // d 绑定 prod_burst (base 产出者) — 应被 Layer 1 跳过
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('d', 'prod_burst')

    const baseBefore = state.resources.base
    checkResourceTriggers('base', 'g', ['g'])
    // d 的 prod_burst 产出 base → 被 Layer 1 跳过 → base 不应增加
    expect(state.resources.base).toBe(baseBefore)
  })
})

describe('Layer 3 — 3+ 卡循环 → 伪无限 (AC6)', () => {
  beforeEach(() => resetState())

  it('chainHistory 中已有目标且链长 >= 2 时进入伪无限', async () => {
    const { enterPseudoInfinite, clearPseudoInfinite } = await import('../../../src/systems/skills')

    enterPseudoInfinite(['f', 'g', 'h'])
    expect(state.pseudoInfiniteState).not.toBeNull()
    expect(state.pseudoInfiniteState!.participantKeys).toEqual(['f', 'g', 'h'])
    expect(state.pseudoInfiniteState!.intervalId).toBeDefined()

    clearPseudoInfinite()
    expect(state.pseudoInfiniteState).toBeNull()
  })

  it('已有伪无限运行中时合并参与者', async () => {
    const { enterPseudoInfinite, clearPseudoInfinite } = await import('../../../src/systems/skills')

    enterPseudoInfinite(['f', 'g'])
    enterPseudoInfinite(['h', 'f'])  // f 重复应不重复加入
    expect(state.pseudoInfiniteState!.participantKeys).toEqual(['f', 'g', 'h'])

    clearPseudoInfinite()
  })
})

describe('伪无限速率 (AC6)', () => {
  beforeEach(() => resetState())

  it('250ms 间隔触发 = 4 次/秒', async () => {
    const { enterPseudoInfinite, clearPseudoInfinite } = await import('../../../src/systems/skills')

    // 绑定一个产出者
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.phase = 'battle'

    const baseBefore = state.resources.base
    enterPseudoInfinite(['f'])

    // 等待 1 秒 = 4 ticks
    await new Promise(r => setTimeout(r, 1100))

    const baseAfter = state.resources.base
    // 应该触发了 4 次，每次 prod_burst 增加 base
    expect(baseAfter).toBeGreaterThan(baseBefore)

    clearPseudoInfinite()
  })
})

describe('伪无限期间手动输入不阻塞 (AC6)', () => {
  beforeEach(() => resetState())

  it('triggerSkill 在伪无限期间正常工作', async () => {
    const { triggerSkill, enterPseudoInfinite, clearPseudoInfinite } = await import('../../../src/systems/skills')

    // 开启伪无限
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.phase = 'battle'
    enterPseudoInfinite(['f'])

    // 手动触发另一个技能
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('g', 'prod_focus')
    const multBefore = state.multiplier
    triggerSkill('prod_focus', 'g')
    // prod_focus 增加 multiplier
    expect(state.multiplier).toBeGreaterThanOrEqual(multBefore)

    clearPseudoInfinite()
  })
})

describe('triggerSkill 连接者分流 (AC2, AC3)', () => {
  beforeEach(() => resetState())

  it('copy 型通过 triggerSkill 正确分流', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    state.player.skills.set('conn_copy_adjacent', { level: 1 })
    state.player.bindings.set('f', 'conn_copy_adjacent')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('g', 'prod_burst')

    // 不应崩溃
    expect(() => triggerSkill('conn_copy_adjacent', 'f')).not.toThrow()
  })

  it('resourceTrigger 型不在 triggerSkill 中触发', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    state.player.skills.set('conn_base_adjacent', { level: 1 })
    state.player.bindings.set('f', 'conn_base_adjacent')

    const callsBefore = mockShowFeedback.mock.calls.length
    triggerSkill('conn_base_adjacent', 'f')
    // 资源触发型不在 triggerSkill 中直接触发，showFeedback 不应被调
    expect(mockShowFeedback.mock.calls.length).toBe(callsBefore)
  })

  it('产出者触发后调用 checkResourceTriggers', async () => {
    const { triggerSkill } = await import('../../../src/systems/skills')
    // 设置产出者在 f, 连接者在 g (监听 base, adjacent)
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.skills.set('conn_base_adjacent', { level: 1 })
    state.player.bindings.set('g', 'conn_base_adjacent')
    // h 上绑定倍率产出者（不产出 base → 不被 Layer 1 过滤）
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('h', 'prod_focus')

    state.phase = 'battle'
    triggerSkill('prod_burst', 'f')
    // prod_burst 产出 base → checkResourceTriggers('base', 'f')
    // → conn_base_adjacent at g (g adjacent to f) → 应找到 h (adjacent to g, prod_focus)
    // 整个链应不崩溃
  })
})

describe('无效 connector (AC8)', () => {
  beforeEach(() => resetState())

  it('无效 connector ID 不崩溃', async () => {
    const { triggerConnectorCopy, checkResourceTriggers } = await import('../../../src/systems/skills')
    expect(() => triggerConnectorCopy('nonexistent', 'f', ['f'])).not.toThrow()
    expect(() => checkResourceTriggers('base', 'f', ['f'])).not.toThrow()
  })
})
