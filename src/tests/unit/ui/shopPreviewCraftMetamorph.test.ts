// ============================================
// Story 60.13: workbench Craft + Metamorph drawer 接入测试
// ============================================
// 验证 openDrawer('craft' | 'metamorph') 调用对应 panel 渲染器；
// stub 文案已移除；onGoldUpdate 回调能触发 terminal banner 刷新

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetState } from '../../../src/core/state'

// ===== Hoisted spies =====
const renderCraftPanelSpy = vi.fn()
const renderMetamorphPanelSpy = vi.fn()

vi.mock('../../../src/systems/classes/CraftingStation', () => ({
  renderCraftPanel: (container: HTMLElement, onGoldUpdate?: () => void) => {
    renderCraftPanelSpy(container, onGoldUpdate)
  },
  resetCraftInput: vi.fn(),
}))
vi.mock('../../../src/systems/classes/MetamorphStation', () => ({
  renderMetamorphPanel: (container: HTMLElement) => {
    renderMetamorphPanelSpy(container)
  },
}))
vi.mock('../../../src/effects/sound', () => ({ playSound: vi.fn() }))
vi.mock('../../../src/systems/battle', () => ({ startLevel: vi.fn() }))

import { __test } from '../../../src/ui/shopPreview'

// ===== Fake DOM =====
let drawerBody: { innerHTML: string }
let drawerEl: { id: string; style: { display: string }; classList: { add: () => void; remove: () => void }; querySelector: () => null }
let drawerTitle: { textContent: string }

function makeDrawerStub(): void {
  drawerBody = { innerHTML: '' }
  drawerEl = {
    id: 'wb-drawer',
    style: { display: '' },
    classList: { add: () => undefined, remove: () => undefined },
    querySelector: () => null,
  }
  drawerTitle = { textContent: '' }
}

const STUB_DOC = {
  getElementById: (id: string) => {
    if (id === 'wb-drawer') return drawerEl
    if (id === 'wb-drawer-title') return drawerTitle
    if (id === 'wb-drawer-body') return drawerBody
    return null
  },
  querySelector: () => null,
  querySelectorAll: () => [] as unknown[],
  createElement: () => ({
    className: '',
    style: {},
    textContent: '',
    innerHTML: '',
    classList: { add: () => undefined, remove: () => undefined },
    setAttribute: () => undefined,
    addEventListener: () => undefined,
    appendChild: () => undefined,
  }),
  body: {
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
    contains: vi.fn(() => false),
  },
}

beforeEach(() => {
  resetState()
  renderCraftPanelSpy.mockClear()
  renderMetamorphPanelSpy.mockClear()
  makeDrawerStub()
  vi.stubGlobal('document', STUB_DOC)
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => { cb(); return 1 })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Story 60.13 · craft drawer 接入', () => {
  it('AC1 openDrawer("craft") → renderCraftPanel 被调（带 onGoldUpdate 回调）', () => {
    __test.openDrawer('craft')
    expect(renderCraftPanelSpy).toHaveBeenCalledTimes(1)
    const [container, onGoldUpdate] = renderCraftPanelSpy.mock.calls[0]
    expect(container).toBe(drawerBody)
    expect(typeof onGoldUpdate).toBe('function')
  })

  it('AC1 抽屉标题改为 WORDSMITH STATION', () => {
    __test.openDrawer('craft')
    expect(drawerTitle.textContent).toContain('WORDSMITH STATION')
  })

  it('AC1 抽屉打开 → drawer.style.display=flex', () => {
    __test.openDrawer('craft')
    expect(drawerEl.style.display).toBe('flex')
  })

  it('Task 2 stub 已移除 — drawer body 不再含 STATION OFFLINE 字样', () => {
    __test.openDrawer('craft')
    // body.innerHTML 被先清空（''），renderCraftPanel 是 mock 不写内容
    expect(drawerBody.innerHTML).not.toContain('STATION OFFLINE')
    expect(drawerBody.innerHTML).not.toContain('WIRING DEFERRED')
  })
})

describe('Story 60.13 · metamorph drawer 接入', () => {
  it('AC2 openDrawer("metamorph") → renderMetamorphPanel 被调', () => {
    __test.openDrawer('metamorph')
    expect(renderMetamorphPanelSpy).toHaveBeenCalledTimes(1)
    expect(renderMetamorphPanelSpy.mock.calls[0][0]).toBe(drawerBody)
  })

  it('AC2 抽屉标题改为 METAMORPH STATION', () => {
    __test.openDrawer('metamorph')
    expect(drawerTitle.textContent).toContain('METAMORPH STATION')
  })

  it('Task 2 stub 已移除', () => {
    __test.openDrawer('metamorph')
    expect(drawerBody.innerHTML).not.toContain('STATION OFFLINE')
  })
})

describe('Story 60.13 · onGoldUpdate 回调', () => {
  it('AC7 craft 的 onGoldUpdate 调用时不抛错', () => {
    __test.openDrawer('craft')
    const [, onGoldUpdate] = renderCraftPanelSpy.mock.calls[0]
    // updateTerminalChrome 内部访问多个 DOM ID，STUB_DOC 返回 null 时应静默 skip
    expect(() => onGoldUpdate?.()).not.toThrow()
  })
})

describe('Story 60.13 · words drawer 路径不受影响（回归）', () => {
  it('AC4 openDrawer("words") 仍走原 renderWordsDrawerHtml 路径，不调 craft/metamorph', () => {
    __test.openDrawer('words')
    expect(renderCraftPanelSpy).not.toHaveBeenCalled()
    expect(renderMetamorphPanelSpy).not.toHaveBeenCalled()
    expect(drawerTitle.textContent).toContain('WORD LIBRARY')
  })
})

describe('Story 60.13 · L1 review · 非对应职业 panel 仍渲染（不阻拦）', () => {
  it('classId=none + openDrawer("craft") → renderCraftPanel 仍被调（开放问题 1 决议）', () => {
    // resetState 默认 classId 是 'none'（参考 main.ts 默认）
    // 玩家用 INF / debug 等手动触发 openDrawer 时 panel 应正常渲染，
    // 由 panel 内部读 state.fragmentInventory（空）等自然展示空 UI 劝退
    __test.openDrawer('craft')
    expect(renderCraftPanelSpy).toHaveBeenCalledTimes(1)
  })

  it('classId=none + openDrawer("metamorph") → renderMetamorphPanel 仍被调', () => {
    __test.openDrawer('metamorph')
    expect(renderMetamorphPanelSpy).toHaveBeenCalledTimes(1)
  })
})
