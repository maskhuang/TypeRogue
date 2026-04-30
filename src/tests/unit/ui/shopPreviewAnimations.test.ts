// ============================================
// Story 60.11: terminal 商店转场动画测试
// ============================================
// 验证 BUY whoosh / showOnly CRT flicker / cmdReshuffle 后 cmdList 逐行 print
// 通过 shopAnimations 设置 + matchMedia 双开关守卫

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'

// 不 mock UserSettings — 用真模块，通过 stubbing window.matchMedia 控制 reduced-motion
vi.mock('../../../src/effects/sound', () => ({ playSound: vi.fn() }))
vi.mock('../../../src/systems/battle', () => ({ startLevel: vi.fn() }))

// rebuildDescriptors 调用 describeAllShopItems(state.shop.items)，会清空 descriptorCache。
// 测试需要保留 setDescriptorCache 注入的 fake 数据 — mock 让它回传 state.shop.items 原样
// 当作 ItemDescriptor[]（测试侧写入的就是 fake descriptor，不需要真的描述化）
vi.mock('../../../src/ui/itemDescriptors', async () => {
  const actual = await vi.importActual<typeof import('../../../src/ui/itemDescriptors')>(
    '../../../src/ui/itemDescriptors',
  )
  return {
    ...actual,
    describeAllShopItems: (items: unknown[]) => items as never[],
  }
})

import { __test } from '../../../src/ui/shopPreview'
import { updateSettings, loadSettings } from '../../../src/core/UserSettings'

// ===== Fake DOM 基建 =====
interface FakeEl {
  id?: string
  className: string
  style: { display: string }
  classList: {
    add: (c: string) => void
    remove: (c: string) => void
    contains: (c: string) => boolean
    _classes: Set<string>
  }
  _classListAddCalls: string[]
  _animationEndListeners: Array<() => void>
  addEventListener: (type: string, cb: () => void, opts?: unknown) => void
  offsetWidth: number
  querySelector: (sel: string) => FakeEl | null
  querySelectorAll: (sel: string) => FakeEl[]
  appendChild: (n: unknown) => void
}

function makeEl(opts: Partial<{ id: string; className: string }> = {}): FakeEl {
  const cls = new Set<string>(opts.className?.split(/\s+/).filter(Boolean) ?? [])
  const addCalls: string[] = []
  const endListeners: Array<() => void> = []
  return {
    id: opts.id,
    className: opts.className ?? '',
    style: { display: 'flex' },
    classList: {
      _classes: cls,
      add: (c: string) => { cls.add(c); addCalls.push(c) },
      remove: (c: string) => { cls.delete(c) },
      contains: (c: string) => cls.has(c),
    },
    _classListAddCalls: addCalls,
    _animationEndListeners: endListeners,
    addEventListener: (type: string, cb: () => void) => {
      if (type === 'animationend') endListeners.push(cb)
    },
    offsetWidth: 100,
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: () => undefined,
  }
}

let terminalScreenEl: FakeEl
let workbenchScreenEl: FakeEl
let foamCaseEl: FakeEl
let foamCutouts: FakeEl[]
let weaponCard: FakeEl
let viewport: FakeEl

function setupDom(): void {
  terminalScreenEl = makeEl({ id: 'terminal-shop-screen' })
  workbenchScreenEl = makeEl({ id: 'workbench-screen-preview' })
  weaponCard = makeEl({ className: 'weapon-card' })
  const cutout0 = makeEl({ className: 'foam-cutout' })
  cutout0.querySelector = (sel: string) => sel === '.weapon-card' ? weaponCard : null
  foamCutouts = [cutout0]
  foamCaseEl = makeEl({ className: 'wb-foam-case' })
  foamCaseEl.querySelectorAll = (sel: string) => sel === '.foam-cutout' ? foamCutouts : []
  workbenchScreenEl.querySelector = (sel: string) =>
    sel === '.wb-foam-case' ? foamCaseEl : null
  viewport = makeEl({ id: 'terminal-viewport' })
}

beforeEach(() => {
  resetState()
  setupDom()
  localStorage.clear()
  loadSettings() // 重置 settings 为默认（含 shopAnimations: true）
  // requestAnimationFrame 同步 stub
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => { cb(); return 1 })
  // matchMedia 默认无 reduced-motion
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (cb: () => void) => { cb(); return 1 },
  })
  vi.stubGlobal('document', {
    getElementById: (id: string) => {
      if (id === 'terminal-shop-screen') return terminalScreenEl
      if (id === 'workbench-screen-preview') return workbenchScreenEl
      if (id === 'terminal-viewport') return viewport
      return null
    },
    querySelector: (sel: string) => {
      if (sel === '#workbench-screen-preview .wb-foam-case') return foamCaseEl
      return null
    },
    createElement: () => makeEl(),
    body: {
      classList: { add: vi.fn(), remove: vi.fn() },
      appendChild: vi.fn(),
      contains: vi.fn(() => false),
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Story 60.11 · BUY whoosh 动画', () => {
  it('shopAnimations=true → IN-tray 槽 weapon-card 加 wb-inbox-whoosh class', () => {
    updateSettings({ shopAnimations: true })
    state.player.inbox.push('sk_test') // 模拟 BUY 后 push
    __test.triggerInboxWhoosh(0)
    expect(weaponCard._classListAddCalls).toContain('wb-inbox-whoosh')
  })

  it('shopAnimations=false → 不加 class', () => {
    updateSettings({ shopAnimations: false })
    __test.triggerInboxWhoosh(0)
    expect(weaponCard._classListAddCalls).not.toContain('wb-inbox-whoosh')
  })

  it('matchMedia reduce → 不加 class（即使 settings true）', () => {
    updateSettings({ shopAnimations: true })
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: true }),
      requestAnimationFrame: (cb: () => void) => { cb(); return 1 },
    })
    __test.triggerInboxWhoosh(0)
    expect(weaponCard._classListAddCalls).not.toContain('wb-inbox-whoosh')
  })

  it('slotIdx 越界 → 不抛错且不加 class', () => {
    updateSettings({ shopAnimations: true })
    expect(() => __test.triggerInboxWhoosh(99)).not.toThrow()
    expect(weaponCard._classListAddCalls).not.toContain('wb-inbox-whoosh')
  })
})

describe('Story 60.11 · showOnly CRT flicker', () => {
  it('shopAnimations=true + 切到不同屏幕 → 目标屏加 screen-crt-transition class', () => {
    updateSettings({ shopAnimations: true })
    // 默认 currentScreen 假设为 'terminal'，切到 'workbench' 触发动画
    __test.showOnly('workbench')
    expect(workbenchScreenEl._classListAddCalls).toContain('screen-crt-transition')
  })

  it('shopAnimations=false → 不触发动画', () => {
    updateSettings({ shopAnimations: false })
    __test.showOnly('workbench')
    expect(workbenchScreenEl._classListAddCalls).not.toContain('screen-crt-transition')
  })

  it('切到相同屏幕 → 不重复触发动画', () => {
    updateSettings({ shopAnimations: true })
    __test.showOnly('workbench')
    workbenchScreenEl._classListAddCalls.length = 0
    __test.showOnly('workbench') // 已经是 workbench
    expect(workbenchScreenEl._classListAddCalls).not.toContain('screen-crt-transition')
  })
})

describe('Story 60.11 · RESHUFFLE 后 cmdList 逐行 print', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shopAnimations=true + nextListIsAnimated=true → setTimeout 队列触发', () => {
    updateSettings({ shopAnimations: true })
    // 注入一个 fake catalog item 让 cmdList 不走空 catalog 分支
    // 由于 mock 的 describeAllShopItems 直接返回 state.shop.items，
    // 把 fake descriptor 直接塞进 state.shop.items 就能让 rebuildDescriptors 拿到非空 cache
    state.shop.items = [{
      sku: 'SKL-001', kind: 'skill', name: 'TEST', nameAbbrev: 'TST', iconEmoji: 'X',
      rarity: 0, rarityLabel: 'COMMON', shapeTag: '[1·]', shapeColor: 'green',
      triggerHint: '—', desc: '', effect: '', affixLine: '—', price: 30,
      stockNow: 1, stockMax: 1, clearance: '4-B', redacted: false, upgrade: false,
      synergyCount: 0, originalItem: { id: 'sk', type: 'skill', skillId: 'sk', cost: 30 },
    } as any]
    __test.setNextListAnimated(true)
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    __test.cmdList()
    // 至少有 catalog header / divider / row 等多次 setTimeout 调用
    expect(setTimeoutSpy.mock.calls.length).toBeGreaterThan(3)
  })

  it('nextListIsAnimated=false → 立即同步 print（无 setTimeout 队列）', () => {
    updateSettings({ shopAnimations: true })
    // 由于 mock 的 describeAllShopItems 直接返回 state.shop.items，
    // 把 fake descriptor 直接塞进 state.shop.items 就能让 rebuildDescriptors 拿到非空 cache
    state.shop.items = [{
      sku: 'SKL-001', kind: 'skill', name: 'TEST', nameAbbrev: 'TST', iconEmoji: 'X',
      rarity: 0, rarityLabel: 'COMMON', shapeTag: '[1·]', shapeColor: 'green',
      triggerHint: '—', desc: '', effect: '', affixLine: '—', price: 30,
      stockNow: 1, stockMax: 1, clearance: '4-B', redacted: false, upgrade: false,
      synergyCount: 0, originalItem: { id: 'sk', type: 'skill', skillId: 'sk', cost: 30 },
    } as any]
    __test.setNextListAnimated(false)
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    __test.cmdList()
    expect(setTimeoutSpy.mock.calls.length).toBe(0)
  })

  it('shopAnimations=false → 即使 nextListIsAnimated=true 也即时全出', () => {
    updateSettings({ shopAnimations: false })
    // 由于 mock 的 describeAllShopItems 直接返回 state.shop.items，
    // 把 fake descriptor 直接塞进 state.shop.items 就能让 rebuildDescriptors 拿到非空 cache
    state.shop.items = [{
      sku: 'SKL-001', kind: 'skill', name: 'TEST', nameAbbrev: 'TST', iconEmoji: 'X',
      rarity: 0, rarityLabel: 'COMMON', shapeTag: '[1·]', shapeColor: 'green',
      triggerHint: '—', desc: '', effect: '', affixLine: '—', price: 30,
      stockNow: 1, stockMax: 1, clearance: '4-B', redacted: false, upgrade: false,
      synergyCount: 0, originalItem: { id: 'sk', type: 'skill', skillId: 'sk', cost: 30 },
    } as any]
    __test.setNextListAnimated(true)
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    __test.cmdList()
    expect(setTimeoutSpy.mock.calls.length).toBe(0)
  })

  it('cmdList 单次触发后 nextListIsAnimated 重置为 false', () => {
    updateSettings({ shopAnimations: true })
    __test.setDescriptorCache([])
    __test.setNextListAnimated(true)
    __test.cmdList()
    // 第二次调用应已重置为非动画模式 — 用 setTimeout 验证
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    __test.cmdList()
    expect(setTimeoutSpy.mock.calls.length).toBe(0)
  })

  it('M1 review · 空 catalog 路径也消费 nextListIsAnimated（防 flag 跨调用泄漏）', () => {
    updateSettings({ shopAnimations: true })
    state.shop.items = [] // 空 → cmdList 早 return
    __test.setNextListAnimated(true)
    __test.cmdList() // 早 return 路径
    // 之后给 cache 一个非空 catalog，再次调用应走非动画即时路径
    state.shop.items = [{
      sku: 'SKL-001', kind: 'skill', name: 'TEST', nameAbbrev: 'TST', iconEmoji: 'X',
      rarity: 0, rarityLabel: 'COMMON', shapeTag: '[1·]', shapeColor: 'green',
      triggerHint: '—', desc: '', effect: '', affixLine: '—', price: 30,
      stockNow: 1, stockMax: 1, clearance: '4-B', redacted: false, upgrade: false,
      synergyCount: 0, originalItem: { id: 'sk', type: 'skill', skillId: 'sk', cost: 30 },
    } as any]
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    __test.cmdList()
    // flag 应已被早 return 消费 → 这次走即时路径 → 0 setTimeout
    expect(setTimeoutSpy.mock.calls.length).toBe(0)
  })
})
