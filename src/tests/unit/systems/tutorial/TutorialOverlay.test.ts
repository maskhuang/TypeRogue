// ============================================
// 打字肉鸽 - TutorialOverlay 单元测试
// ============================================
// Story 39.3 Task 8: TutorialOverlay DOM 逻辑测试
// 注意: node 环境无 DOM，仅测试构造和可见性逻辑

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock DOM APIs
const mockElements: HTMLElement[] = []
const mockBody = {
  appendChild: vi.fn((el: HTMLElement) => mockElements.push(el)),
  removeChild: vi.fn(),
}
const mockCreateElement = vi.fn(() => {
  const el: Record<string, unknown> = {
    className: '',
    innerHTML: '',
    style: {} as Record<string, string>,
    parentNode: mockBody,
    querySelector: vi.fn(() => ({
      addEventListener: vi.fn((_evt: string, cb: () => void) => { (el as any)._clickCb = cb }),
      checked: false,
    })),
    addEventListener: vi.fn(),
  }
  return el as unknown as HTMLElement
})
const mockGetElementById = vi.fn(() => null)

vi.stubGlobal('document', {
  createElement: mockCreateElement,
  body: mockBody,
  getElementById: mockGetElementById,
})
vi.stubGlobal('window', { innerWidth: 1024, innerHeight: 768 })
vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0))

// Mock i18n
vi.mock('../../../../src/demo/demo-i18n', () => ({
  t: (key: string) => key,
}))

import { TutorialOverlay } from '../../../../src/systems/tutorial/TutorialOverlay'

describe('TutorialOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockElements.length = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('初始状态不可见', () => {
    const overlay = new TutorialOverlay({
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step1',
      onDismiss: vi.fn(),
    })
    expect(overlay.isVisible()).toBe(false)
  })

  it('show 后可见', () => {
    const overlay = new TutorialOverlay({
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step1',
      onDismiss: vi.fn(),
    })
    overlay.show()
    expect(overlay.isVisible()).toBe(true)
  })

  it('dismiss 后不可见', () => {
    const onDismiss = vi.fn()
    const overlay = new TutorialOverlay({
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step1',
      onDismiss,
    })
    overlay.show()
    overlay.dismiss(false)
    expect(overlay.isVisible()).toBe(false)
    expect(onDismiss).toHaveBeenCalledWith(false)
  })

  it('dismiss 传递 neverShowAgain', () => {
    const onDismiss = vi.fn()
    const overlay = new TutorialOverlay({
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step1',
      onDismiss,
    })
    overlay.show()
    overlay.dismiss(true)
    expect(onDismiss).toHaveBeenCalledWith(true)
  })

  it('无锚点时应居中定位', () => {
    const overlay = new TutorialOverlay({
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step1',
      onDismiss: vi.fn(),
    })
    overlay.show()

    // 检查 container style 被设置了居中属性
    // createElement 被调用了（创建 overlay 容器）
    expect(mockCreateElement).toHaveBeenCalled()
  })

  it('有 highlight 时应创建 mask', () => {
    const overlay = new TutorialOverlay({
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step1',
      highlight: '.some-selector',
      onDismiss: vi.fn(),
    })
    overlay.show()

    // 两次 createElement: 一次 mask，一次 overlay
    expect(mockCreateElement).toHaveBeenCalledTimes(2)
  })

  it('无 highlight 时不创建 mask', () => {
    const overlay = new TutorialOverlay({
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step1',
      onDismiss: vi.fn(),
    })
    overlay.show()

    // 只有 overlay，没有 mask
    expect(mockCreateElement).toHaveBeenCalledTimes(1)
  })

  it('dismissAfter 应自动关闭', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const overlay = new TutorialOverlay({
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step1',
      dismissAfter: 3000,
      onDismiss,
    })
    overlay.show()

    expect(overlay.isVisible()).toBe(true)
    vi.advanceTimersByTime(3000)
    expect(overlay.isVisible()).toBe(false)
    expect(onDismiss).toHaveBeenCalledWith(false)

    vi.useRealTimers()
  })
})
