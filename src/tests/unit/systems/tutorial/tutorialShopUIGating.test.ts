// ============================================
// Story 60.8: terminal 教程 + classic gating 测试
// ============================================
// 验证：
//   - 4 个新 step（L1_terminal_intro / workbench_drag / relic_number_row / drawer_words）注册到 L1_STEPS
//   - 老 3 个 L1 商店 step（shop_intro / skill_bind / shape_hint）condition gate shopUI=classic
//   - 新 4 个 step condition gate shopUI=terminal
//   - shopUI 切换后下次 condition 调用读取最新值（不缓存）
//   - workbench_drag 仅 skill purchase + terminal 触发

import { describe, it, expect, beforeEach, vi } from 'vitest'

// 必须先 mock，再 import 被测模块
const mockShopUI = { value: 'classic' as 'classic' | 'terminal' }
vi.mock('../../../../src/core/UserSettings', async () => {
  const actual = await vi.importActual<typeof import('../../../../src/core/UserSettings')>(
    '../../../../src/core/UserSettings',
  )
  return {
    ...actual,
    getSettings: () => ({ ...actual.getSettings(), shopUI: mockShopUI.value }),
  }
})

vi.mock('../../../../src/systems/tutorial/TutorialOverlay', () => ({
  TutorialOverlay: vi.fn().mockImplementation(() => ({
    show: vi.fn(),
    dismiss: vi.fn(),
    isVisible: vi.fn(() => false),
  })),
}))

import { L1_STEPS } from '../../../../src/data/tutorialSteps'
import { initFullTutorial } from '../../../../src/systems/tutorial/tutorialInit'
import { eventBus } from '../../../../src/core/events/EventBus'

const STUB_DOC = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [] as unknown[],
  createElement: () => ({
    classList: { add: () => undefined, remove: () => undefined },
    setAttribute: () => undefined,
    addEventListener: () => undefined,
    appendChild: () => undefined,
    style: {},
    textContent: '',
  }),
  body: {
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
    contains: vi.fn(() => false),
  },
  head: { appendChild: vi.fn() },
  addEventListener: vi.fn(),
}

beforeEach(() => {
  vi.stubGlobal('document', STUB_DOC)
  // initFullTutorial 用 module-scoped initialized flag — 第一次调用后注入 condition，后续 noop
  // 测试只关心 condition 是否就地 mutate 上 step.trigger，所以多次调用是安全的（注入幂等）
  initFullTutorial()
  mockShopUI.value = 'classic'
})

describe('Story 60.8 · 4 新 terminal 教程 step 注册', () => {
  const NEW_STEP_IDS = [
    'L1_terminal_intro',
    'L1_workbench_drag',
    'L1_relic_number_row',
    'L1_drawer_words',
  ]

  it.each(NEW_STEP_IDS)('%s 已注册到 L1_STEPS 且有 trigger.condition', stepId => {
    const step = L1_STEPS.find(s => s.id === stepId)
    expect(step).toBeDefined()
    expect(step!.trigger.condition).toBeDefined()
    expect(typeof step!.trigger.condition).toBe('function')
  })
})

describe('Story 60.8 · classic gating — 老 step 仅 shopUI=classic 触发', () => {
  it('shopUI=classic → L1_shop_intro condition 返回 true', () => {
    mockShopUI.value = 'classic'
    const step = L1_STEPS.find(s => s.id === 'L1_shop_intro')!
    expect(step.trigger.condition!()).toBe(true)
  })

  it('shopUI=terminal → L1_shop_intro condition 返回 false', () => {
    mockShopUI.value = 'terminal'
    const step = L1_STEPS.find(s => s.id === 'L1_shop_intro')!
    expect(step.trigger.condition!()).toBe(false)
  })

  it('shopUI 切换后下次调用读最新值（不缓存）', () => {
    const step = L1_STEPS.find(s => s.id === 'L1_shop_intro')!
    mockShopUI.value = 'classic'
    expect(step.trigger.condition!()).toBe(true)
    mockShopUI.value = 'terminal'
    expect(step.trigger.condition!()).toBe(false)
    mockShopUI.value = 'classic'
    expect(step.trigger.condition!()).toBe(true)
  })
})

describe('Story 60.8 · terminal gating — 新 step 仅 shopUI=terminal 触发', () => {
  it('shopUI=terminal → L1_terminal_intro condition 返回 true', () => {
    mockShopUI.value = 'terminal'
    const step = L1_STEPS.find(s => s.id === 'L1_terminal_intro')!
    expect(step.trigger.condition!()).toBe(true)
  })

  it('shopUI=classic → L1_terminal_intro condition 返回 false', () => {
    mockShopUI.value = 'classic'
    const step = L1_STEPS.find(s => s.id === 'L1_terminal_intro')!
    expect(step.trigger.condition!()).toBe(false)
  })
})

describe('Story 60.8 · 复合 condition — purchase type + shopUI', () => {
  it('L1_workbench_drag: skill purchase + shopUI=terminal → true', () => {
    mockShopUI.value = 'terminal'
    eventBus.emit('shop:purchase', { type: 'skill', itemId: 'sk_a', price: 30 })
    const step = L1_STEPS.find(s => s.id === 'L1_workbench_drag')!
    expect(step.trigger.condition!()).toBe(true)
  })

  it('L1_workbench_drag: relic purchase + shopUI=terminal → false', () => {
    mockShopUI.value = 'terminal'
    eventBus.emit('shop:purchase', { type: 'relic', itemId: 'rel_a', price: 30 })
    const step = L1_STEPS.find(s => s.id === 'L1_workbench_drag')!
    expect(step.trigger.condition!()).toBe(false)
  })

  it('L1_workbench_drag: skill purchase + shopUI=classic → false', () => {
    mockShopUI.value = 'classic'
    eventBus.emit('shop:purchase', { type: 'skill', itemId: 'sk_a', price: 30 })
    const step = L1_STEPS.find(s => s.id === 'L1_workbench_drag')!
    expect(step.trigger.condition!()).toBe(false)
  })

  it('L1_relic_number_row: relic purchase + shopUI=terminal → true', () => {
    mockShopUI.value = 'terminal'
    eventBus.emit('shop:purchase', { type: 'relic', itemId: 'rel_a', price: 30 })
    const step = L1_STEPS.find(s => s.id === 'L1_relic_number_row')!
    expect(step.trigger.condition!()).toBe(true)
  })

  it('L1_drawer_words: pack purchase + shopUI=terminal → true', () => {
    mockShopUI.value = 'terminal'
    eventBus.emit('shop:purchase', { type: 'pack', itemId: 'pck_a', price: 30 })
    const step = L1_STEPS.find(s => s.id === 'L1_drawer_words')!
    expect(step.trigger.condition!()).toBe(true)
  })

  it('L1_drawer_words: skill purchase + shopUI=terminal → false', () => {
    mockShopUI.value = 'terminal'
    eventBus.emit('shop:purchase', { type: 'skill', itemId: 'sk_a', price: 30 })
    const step = L1_STEPS.find(s => s.id === 'L1_drawer_words')!
    expect(step.trigger.condition!()).toBe(false)
  })
})

describe('Story 60.8 · 新 step i18n key 完整性', () => {
  const NEW_STEPS = [
    'L1_terminal_intro',
    'L1_workbench_drag',
    'L1_relic_number_row',
    'L1_drawer_words',
  ]

  it('zh 词典含全部 4 step × 2 key = 8 个 key', async () => {
    const { setLocale, t, initLocale } = await import('../../../../src/demo/demo-i18n')
    initLocale()
    setLocale('zh')
    for (const id of NEW_STEPS) {
      const step = L1_STEPS.find(s => s.id === id)!
      const title = t(step.content.titleKey)
      const body = t(step.content.bodyKey)
      expect(title).not.toBe(step.content.titleKey)
      expect(body).not.toBe(step.content.bodyKey)
      expect(title).toBeTruthy()
      expect(body).toBeTruthy()
    }
  })

  it('en 词典含全部 4 step × 2 key = 8 个 key', async () => {
    const { setLocale, t, initLocale } = await import('../../../../src/demo/demo-i18n')
    initLocale()
    setLocale('en')
    for (const id of NEW_STEPS) {
      const step = L1_STEPS.find(s => s.id === id)!
      const title = t(step.content.titleKey)
      const body = t(step.content.bodyKey)
      expect(title).not.toBe(step.content.titleKey)
      expect(body).not.toBe(step.content.bodyKey)
      expect(title).toBeTruthy()
      expect(body).toBeTruthy()
    }
  })
})
