// ============================================
// 打字肉鸽 - KeyTooltip 单元测试
// ============================================
// Story 16.4: 键位悬停提示

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock DOM elements
function createMockElement(): HTMLElement {
  const style: Record<string, string> = {}
  const element: Partial<HTMLElement> & { _innerHTML: string; _className: string; _children: unknown[] } = {
    _innerHTML: '',
    _className: '',
    _children: [],
    style: new Proxy(style, {
      get: (target, prop) => target[prop as string] ?? '',
      set: (target, prop, value) => { target[prop as string] = value; return true },
    }) as unknown as CSSStyleDeclaration,
    get innerHTML() { return this._innerHTML },
    set innerHTML(val) { this._innerHTML = val },
    get className() { return this._className },
    set className(val) { this._className = val },
    get textContent() { return this._innerHTML.replace(/<[^>]*>/g, '') },
    get parentElement() { return null },
  }
  return element as unknown as HTMLElement
}

const mockTooltipEl = createMockElement()

// Mock document & window
const origDocument = globalThis.document
const origWindow = globalThis.window

beforeEach(() => {
  mockTooltipEl._innerHTML = ''
  mockTooltipEl._className = ''
  ;(mockTooltipEl.style as Record<string, string>).display = 'none'

  const mockDoc = {
    createElement: vi.fn(() => mockTooltipEl),
    body: {
      appendChild: vi.fn(),
      contains: vi.fn(() => true),
    },
    querySelector: vi.fn(() => mockTooltipEl),
  }

  globalThis.document = mockDoc as unknown as Document
  globalThis.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    requestAnimationFrame: vi.fn((cb: () => void) => { cb(); return 0 }),
  } as unknown as typeof window
})

afterEach(() => {
  globalThis.document = origDocument
  globalThis.window = origWindow
  // Reset module cache to get fresh singleton
  vi.resetModules()
})

describe('KeyTooltip', () => {
  it('show 后 isVisible 返回 true', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
    })
    expect(keyTooltip.isVisible()).toBe(true)
  })

  it('hide 后 isVisible 返回 false', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
    })
    keyTooltip.hide()
    expect(keyTooltip.isVisible()).toBe(false)
  })

  it('未显示时调用 hide 不报错', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    expect(() => keyTooltip.hide()).not.toThrow()
  })

  it('show 设置 tooltip 内容', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
    })
    expect(mockTooltipEl._innerHTML).toContain('E')
    expect(mockTooltipEl._innerHTML).toContain('+2')
    expect(mockTooltipEl._innerHTML).toContain('10')
  })

  it('底分为 0 时显示底分不足', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'x',
      score: 0,
      frequency: 3,
    })
    expect(mockTooltipEl._innerHTML).toContain('底分不足')
  })

  it('show 包含技能信息', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '爆发',
        icon: '💥',
        description: '造成大量伤害',
        level: 3,
        school: '爆发',
        schoolCssClass: 'school-burst',
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('爆发')
    expect(mockTooltipEl._innerHTML).toContain('Lv.3')
    expect(mockTooltipEl._innerHTML).toContain('造成大量伤害')
    expect(mockTooltipEl._innerHTML).toContain('school-burst')
  })

  it('多次销毁不报错', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    expect(() => {
      keyTooltip.destroy()
      keyTooltip.destroy()
    }).not.toThrow()
  })
})
