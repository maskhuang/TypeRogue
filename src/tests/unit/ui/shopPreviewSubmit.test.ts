// ============================================
// Story 60.4: SUBMIT FORM → startLevel 流程测试
// ============================================
// 7 用例覆盖：直通 / 警告 bindings / 警告 inbox / Y/N / 防抖 / proceed transition
// mock startLevel 避免触发真实战斗初始化（DOM/audio/PixiJS）

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'

// 必须先 mock，再 import 被测模块（vi.mock 是 hoisted）
const startLevelSpy = vi.fn()
vi.mock('../../../src/systems/battle', () => ({
  startLevel: () => startLevelSpy(),
}))
vi.mock('../../../src/effects/sound', () => ({ playSound: vi.fn() }))
// dragManager.destroy 在 transition 内调用 — stub
vi.mock('../../../src/systems/dragManager', async () => {
  const actual = await vi.importActual<typeof import('../../../src/systems/dragManager')>(
    '../../../src/systems/dragManager',
  )
  return {
    ...actual,
    dragManager: { ...actual.dragManager, destroy: vi.fn(), init: vi.fn(), clearDropZones: vi.fn() },
  }
})

import {
  triggerSubmit,
  handleSubmitConfirmation,
  __test,
} from '../../../src/ui/shopPreview'

const STUB_DOC = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [] as unknown[],
  createElement: () => ({
    classList: { add: () => undefined, remove: () => undefined },
    setAttribute: () => undefined,
    addEventListener: () => undefined,
    style: {},
    textContent: '',
  }),
  body: {
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
    contains: vi.fn(() => false),
  },
}

beforeEach(() => {
  resetState()
  __test.resetSubmitting()
  __test.setPendingSubmit(null)
  startLevelSpy.mockClear()
  vi.useFakeTimers() // proceedSubmit 用 setTimeout fallback，必须 fake 防止 unstub 后异步触发
  vi.stubGlobal('document', STUB_DOC)
  vi.stubGlobal('location', { hash: '', pathname: '/', search: '' })
  vi.stubGlobal('history', { replaceState: vi.fn() })
  state.level = 1
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// ===== Helpers =====
function setOneBinding(): void {
  state.player.bindings.set('a', 'skill_a')
}

describe('Story 60.4 · triggerSubmit dispatch', () => {
  it('AC8 直通：bindings 非空 + inbox 空 → 不弹警告，直接 proceed（startLevel 调用）', () => {
    setOneBinding()
    expect(state.player.inbox).toHaveLength(0)

    triggerSubmit()

    expect(__test.getPendingSubmit()).toBeNull()
    // proceed 异步通过 setTimeout fallback；同步阶段 submitting=true
    expect(__test.isSubmitting()).toBe(true)
  })

  it('AC2 空绑定：bindings.size===0 → pendingSubmit warn-bindings', () => {
    expect(state.player.bindings.size).toBe(0)
    triggerSubmit()

    const ps = __test.getPendingSubmit()
    expect(ps).not.toBeNull()
    expect(ps?.stage).toBe('warn-bindings')
    expect(ps?.nextStage).toBe('proceed') // inbox 空 → 跳过 inbox 警告
    expect(__test.isSubmitting()).toBe(false)
  })

  it('AC2+AC3 双警告：bindings 空 + inbox 非空 → warn-bindings 链到 warn-inbox', () => {
    state.player.inbox = ['skill_x', 'skill_y']
    triggerSubmit()
    const ps = __test.getPendingSubmit()
    expect(ps?.stage).toBe('warn-bindings')
    expect(ps?.nextStage).toBe('warn-inbox') // 链下一阶段
  })

  it('AC3 inbox 警告：bindings 非空 + inbox 非空 → 直接 warn-inbox（跳 warn-bindings）', () => {
    setOneBinding()
    state.player.inbox = ['skill_x']
    triggerSubmit()
    const ps = __test.getPendingSubmit()
    expect(ps?.stage).toBe('warn-inbox')
    expect(ps?.nextStage).toBe('proceed')
  })
})

describe('Story 60.4 · handleSubmitConfirmation Y/N', () => {
  it('AC7 顺序：Y on warn-bindings (nextStage=warn-inbox) → 进入 warn-inbox', () => {
    state.player.inbox = ['skill_x']
    triggerSubmit() // 空绑定 + inbox 非空 → warn-bindings
    expect(__test.getPendingSubmit()?.stage).toBe('warn-bindings')

    const consumed = handleSubmitConfirmation('Y')
    expect(consumed).toBe(true)
    expect(__test.getPendingSubmit()?.stage).toBe('warn-inbox')
  })

  it('AC7 顺序：Y on warn-inbox (nextStage=proceed) → 进入 proceed', () => {
    setOneBinding()
    state.player.inbox = ['skill_x']
    triggerSubmit() // bindings 非空 + inbox 非空 → warn-inbox
    expect(__test.getPendingSubmit()?.stage).toBe('warn-inbox')

    handleSubmitConfirmation('Y')
    expect(__test.getPendingSubmit()).toBeNull()
    expect(__test.isSubmitting()).toBe(true) // 进入 stamp 动画阶段
  })

  it('AC5 N on warn-bindings：state 100% 不变 + pendingSubmit 清零', () => {
    state.player.inbox = ['skill_x']
    state.gold = 50
    triggerSubmit()
    expect(__test.getPendingSubmit()).not.toBeNull()

    const goldBefore = state.gold
    const inboxBefore = [...state.player.inbox]
    const bindingsBefore = new Map(state.player.bindings)

    handleSubmitConfirmation('N')

    expect(__test.getPendingSubmit()).toBeNull()
    expect(__test.isSubmitting()).toBe(false)
    expect(state.gold).toBe(goldBefore)
    expect(state.player.inbox).toEqual(inboxBefore)
    expect(state.player.bindings).toEqual(bindingsBefore)
    expect(startLevelSpy).not.toHaveBeenCalled()
  })

  it('handleSubmitConfirmation pending=null 时返回 false（让其他 handler 处理）', () => {
    expect(handleSubmitConfirmation('Y')).toBe(false)
    expect(handleSubmitConfirmation('hello')).toBe(false)
  })

  it('无效输入（非 Y/N）保持 pending 状态 + 返回 true（消费输入）', () => {
    triggerSubmit()
    expect(__test.getPendingSubmit()?.stage).toBe('warn-bindings')

    const consumed = handleSubmitConfirmation('maybe')
    expect(consumed).toBe(true) // 仍在 confirm 模式
    expect(__test.getPendingSubmit()?.stage).toBe('warn-bindings') // 状态不变
  })
})

describe('Story 60.4 · proceed transition (M2 fix - 覆盖核心 path)', () => {
  it('AC4 直通：advance fake timers 800ms → state.level++ + startLevel 调用 + submitting reset', () => {
    setOneBinding()
    const levelBefore = state.level

    triggerSubmit()
    expect(__test.isSubmitting()).toBe(true)
    expect(startLevelSpy).not.toHaveBeenCalled() // 同步阶段还没调

    vi.advanceTimersByTime(800)

    expect(state.level).toBe(levelBefore + 1)
    expect(startLevelSpy).toHaveBeenCalledTimes(1)
    expect(__test.isSubmitting()).toBe(false)
  })

  it('AC4 双警告通过：Y on warn-bindings → Y on warn-inbox → 800ms 后 startLevel 被调', () => {
    state.player.inbox = ['skill_x']
    triggerSubmit() // 空绑定 + inbox 非空 → warn-bindings

    handleSubmitConfirmation('Y')
    expect(__test.getPendingSubmit()?.stage).toBe('warn-inbox')

    handleSubmitConfirmation('Y')
    expect(__test.isSubmitting()).toBe(true)

    vi.advanceTimersByTime(800)
    expect(startLevelSpy).toHaveBeenCalledTimes(1)
    expect(__test.isSubmitting()).toBe(false)
  })
})

describe('Story 60.4 · M1 fix: pendingConfirm 互斥', () => {
  it('triggerSubmit 在 pendingConfirm 未结时拒绝启动 SUBMIT 流程', () => {
    setOneBinding()
    // 模拟 BUY high-price 留下的 pendingConfirm
    __test.setPendingConfirm({ sku: 'SKL-001', price: 150 })

    triggerSubmit()

    // SUBMIT 流程不应启动
    expect(__test.getPendingSubmit()).toBeNull()
    expect(__test.isSubmitting()).toBe(false)
    // pendingConfirm 仍保留（让玩家继续处理）
    expect(__test.getPendingConfirm()).not.toBeNull()
    expect(startLevelSpy).not.toHaveBeenCalled()
  })

  it('pendingConfirm 处理完后 triggerSubmit 可正常工作', () => {
    setOneBinding()
    __test.setPendingConfirm({ sku: 'SKL-001', price: 150 })

    triggerSubmit() // 被拒
    expect(__test.isSubmitting()).toBe(false)

    // 模拟玩家处理完 pendingConfirm（清零）
    __test.setPendingConfirm(null)

    triggerSubmit() // 现在能跑
    expect(__test.isSubmitting()).toBe(true)
  })
})

describe('Story 60.4 · debounce (AC6)', () => {
  it('pendingSubmit 非空时再次 triggerSubmit → no-op', () => {
    triggerSubmit() // → warn-bindings
    const psBefore = __test.getPendingSubmit()

    triggerSubmit() // 防抖
    expect(__test.getPendingSubmit()).toBe(psBefore) // 引用相等，未替换
  })

  it('submitting=true 时再次 triggerSubmit → no-op', () => {
    setOneBinding()
    triggerSubmit() // → 直通 proceed → submitting=true
    expect(__test.isSubmitting()).toBe(true)

    const callsBefore = startLevelSpy.mock.calls.length
    triggerSubmit() // 防抖
    expect(startLevelSpy.mock.calls.length).toBe(callsBefore) // 没新增调用
  })
})
