// ============================================
// Story 60.5: openShop dispatcher 集成测试 (M1)
// ============================================
// 验证 dispatchShopMode 按 shopUI + isTutorial 走对应分支：
//   - classic → 防御性隐藏残留 terminal DOM（AC6）
//   - terminal + !isTutorial → 隐藏 #shop-screen + 调 enterTerminalShop（AC3/AC5）
//   - terminal + isTutorial → force classic（开放问题 1 决议）

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// vi.mock 必须在 import 被测模块之前（hoisted）
const enterTerminalShopSpy = vi.fn()
vi.mock('../../../src/ui/shopPreview', () => ({
  enterTerminalShop: (won?: boolean) => enterTerminalShopSpy(won),
}))

const getSettingsSpy = vi.fn()
vi.mock('../../../src/core/UserSettings', () => ({
  getSettings: () => getSettingsSpy(),
  // shop.ts 还会 import 其它符号，按需补 stub（当前只用 getSettings）
}))

import { dispatchShopMode } from '../../../src/systems/shop'

interface FakeEl {
  id: string
  style: { display: string }
}

let elements: Map<string, FakeEl>

function makeEl(id: string, display = 'flex'): FakeEl {
  return { id, style: { display } }
}

beforeEach(() => {
  enterTerminalShopSpy.mockClear()
  getSettingsSpy.mockReset()
  elements = new Map()
  vi.stubGlobal('document', {
    getElementById: (id: string) => elements.get(id) ?? null,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Story 60.5 · dispatchShopMode', () => {
  it('shopUI=classic → 走 classic 分支，不调 enterTerminalShop', () => {
    getSettingsSpy.mockReturnValue({ shopUI: 'classic' })
    const mode = dispatchShopMode(true, false)
    expect(mode).toBe('classic')
    expect(enterTerminalShopSpy).not.toHaveBeenCalled()
  })

  it('shopUI=terminal + !isTutorial → 走 terminal，隐藏 #shop-screen，调 enterTerminalShop(won)', () => {
    getSettingsSpy.mockReturnValue({ shopUI: 'terminal' })
    elements.set('shop-screen', makeEl('shop-screen', 'flex'))

    const mode = dispatchShopMode(true, false)

    expect(mode).toBe('terminal')
    expect(enterTerminalShopSpy).toHaveBeenCalledWith(true)
    expect(elements.get('shop-screen')!.style.display).toBe('none')
  })

  it('shopUI=terminal + isTutorial → force classic（教程不进 terminal）', () => {
    getSettingsSpy.mockReturnValue({ shopUI: 'terminal' })
    const mode = dispatchShopMode(false, true)
    expect(mode).toBe('classic')
    expect(enterTerminalShopSpy).not.toHaveBeenCalled()
  })

  it('L1 防御：classic 分支隐藏残留 #terminal-shop-screen 和 #workbench-screen-preview', () => {
    getSettingsSpy.mockReturnValue({ shopUI: 'classic' })
    elements.set('terminal-shop-screen', makeEl('terminal-shop-screen', 'flex'))
    elements.set('workbench-screen-preview', makeEl('workbench-screen-preview', 'flex'))

    dispatchShopMode(true, false)

    expect(elements.get('terminal-shop-screen')!.style.display).toBe('none')
    expect(elements.get('workbench-screen-preview')!.style.display).toBe('none')
  })

  it('L1 防御：terminal 分支不去碰残留 terminal DOM（enterTerminalShop 自己管）', () => {
    getSettingsSpy.mockReturnValue({ shopUI: 'terminal' })
    elements.set('shop-screen', makeEl('shop-screen', 'flex'))
    const term = makeEl('terminal-shop-screen', 'flex')
    elements.set('terminal-shop-screen', term)

    dispatchShopMode(false, false)

    // dispatcher 不应主动隐藏 terminal-shop-screen — 留给 enterTerminalShop
    expect(term.style.display).toBe('flex')
  })

  it('shopUI 字段缺失 → fallback classic', () => {
    getSettingsSpy.mockReturnValue({}) // 无 shopUI 字段（极端 / 异常存档）
    const mode = dispatchShopMode(false, false)
    expect(mode).toBe('classic')
    expect(enterTerminalShopSpy).not.toHaveBeenCalled()
  })

  it('won 参数透传给 enterTerminalShop', () => {
    getSettingsSpy.mockReturnValue({ shopUI: 'terminal' })
    dispatchShopMode(false, false)
    expect(enterTerminalShopSpy).toHaveBeenCalledWith(false)
  })
})
