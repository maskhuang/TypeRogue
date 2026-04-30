// ============================================
// Story 60.5: UserSettings shopUI 字段测试
// ============================================
// 验证 shopUI 默认值 + 持久化 + 老存档（无字段）回落

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getSettings, updateSettings, loadSettings, shouldAnimateShop, shouldPlayShopSound } from '../../../src/core/UserSettings'

beforeEach(() => {
  localStorage.clear()
  // 重新 load 让 in-memory current 重置为 DEFAULTS
  loadSettings()
})

describe('Story 60.5 · UserSettings.shopUI', () => {
  it('默认值为 classic', () => {
    expect(getSettings().shopUI).toBe('classic')
  })

  it('updateSettings 写入 shopUI=terminal 后立即生效', () => {
    updateSettings({ shopUI: 'terminal' })
    expect(getSettings().shopUI).toBe('terminal')
  })

  it('updateSettings 持久化到 localStorage', () => {
    updateSettings({ shopUI: 'terminal' })
    const raw = localStorage.getItem('typing_roguelike_settings')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.shopUI).toBe('terminal')
  })

  it('loadSettings 在老存档（无 shopUI 字段）回落 classic', () => {
    // 模拟老存档：localStorage 里只有部分字段，缺 shopUI
    localStorage.setItem(
      'typing_roguelike_settings',
      JSON.stringify({
        masterVolume: 0.5,
        crtEnabled: false,
        locale: 'en',
        backgroundMode: 'liquid',
        // 故意不写 shopUI
      }),
    )
    loadSettings()
    expect(getSettings().shopUI).toBe('classic')
    // 其他字段还是从存档读出
    expect(getSettings().masterVolume).toBe(0.5)
    expect(getSettings().locale).toBe('en')
  })

  it('loadSettings 完整存档（含 shopUI=terminal）正确还原', () => {
    localStorage.setItem(
      'typing_roguelike_settings',
      JSON.stringify({
        masterVolume: 0.7,
        crtEnabled: true,
        locale: 'zh',
        backgroundMode: 'random',
        shopUI: 'terminal',
      }),
    )
    loadSettings()
    expect(getSettings().shopUI).toBe('terminal')
  })

  it('在 terminal/classic 间反复切换不丢失', () => {
    updateSettings({ shopUI: 'terminal' })
    expect(getSettings().shopUI).toBe('terminal')
    updateSettings({ shopUI: 'classic' })
    expect(getSettings().shopUI).toBe('classic')
    updateSettings({ shopUI: 'terminal' })
    expect(getSettings().shopUI).toBe('terminal')
  })
})

describe('Story 60.11 · UserSettings.shopAnimations', () => {
  it('默认值为 true', () => {
    expect(getSettings().shopAnimations).toBe(true)
  })

  it('updateSettings 写入 shopAnimations=false 立即生效 + 持久化', () => {
    updateSettings({ shopAnimations: false })
    expect(getSettings().shopAnimations).toBe(false)
    const parsed = JSON.parse(localStorage.getItem('typing_roguelike_settings')!)
    expect(parsed.shopAnimations).toBe(false)
  })

  it('loadSettings 老存档（无 shopAnimations 字段）回落 true', () => {
    localStorage.setItem(
      'typing_roguelike_settings',
      JSON.stringify({ masterVolume: 0.5, crtEnabled: true, locale: 'zh', backgroundMode: 'random', shopUI: 'classic' }),
    )
    loadSettings()
    expect(getSettings().shopAnimations).toBe(true)
  })

  it('反复切换不丢失', () => {
    updateSettings({ shopAnimations: false })
    expect(getSettings().shopAnimations).toBe(false)
    updateSettings({ shopAnimations: true })
    expect(getSettings().shopAnimations).toBe(true)
    updateSettings({ shopAnimations: false })
    expect(getSettings().shopAnimations).toBe(false)
  })
})

describe('Story 60.11 · shouldAnimateShop helper', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shopAnimations=true + matchMedia reduce=false → 返回 true', () => {
    updateSettings({ shopAnimations: true })
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
    expect(shouldAnimateShop()).toBe(true)
  })

  it('shopAnimations=false → 返回 false（即使无 reduced-motion）', () => {
    updateSettings({ shopAnimations: false })
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
    expect(shouldAnimateShop()).toBe(false)
  })

  it('prefers-reduced-motion=reduce → 返回 false（即使 shopAnimations=true）', () => {
    updateSettings({ shopAnimations: true })
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    expect(shouldAnimateShop()).toBe(false)
  })

  it('window 不存在（SSR/test 默认）→ shopAnimations=true 时返回 true', () => {
    updateSettings({ shopAnimations: true })
    vi.stubGlobal('window', undefined)
    expect(shouldAnimateShop()).toBe(true)
  })

  it('matchMedia 抛错 → 回落到 true（防御性）', () => {
    updateSettings({ shopAnimations: true })
    vi.stubGlobal('window', {
      matchMedia: () => { throw new Error('not supported') },
    })
    expect(shouldAnimateShop()).toBe(true)
  })
})

describe('Story 60.12 · UserSettings.shopSound', () => {
  it('默认值为 true', () => {
    expect(getSettings().shopSound).toBe(true)
  })

  it('updateSettings 写入 shopSound=false 立即生效 + 持久化', () => {
    updateSettings({ shopSound: false })
    expect(getSettings().shopSound).toBe(false)
    const parsed = JSON.parse(localStorage.getItem('typing_roguelike_settings')!)
    expect(parsed.shopSound).toBe(false)
  })

  it('loadSettings 老存档（无 shopSound 字段）回落 true', () => {
    localStorage.setItem(
      'typing_roguelike_settings',
      JSON.stringify({ masterVolume: 0.5, crtEnabled: true, locale: 'zh', backgroundMode: 'random', shopUI: 'classic', shopAnimations: true }),
    )
    loadSettings()
    expect(getSettings().shopSound).toBe(true)
  })

  it('反复切换不丢失', () => {
    updateSettings({ shopSound: false })
    expect(getSettings().shopSound).toBe(false)
    updateSettings({ shopSound: true })
    expect(getSettings().shopSound).toBe(true)
    updateSettings({ shopSound: false })
    expect(getSettings().shopSound).toBe(false)
  })
})

describe('Story 60.12 · shouldPlayShopSound helper', () => {
  it('shopSound=true → 返回 true', () => {
    updateSettings({ shopSound: true })
    expect(shouldPlayShopSound()).toBe(true)
  })

  it('shopSound=false → 返回 false', () => {
    updateSettings({ shopSound: false })
    expect(shouldPlayShopSound()).toBe(false)
  })

  it('与 shouldAnimateShop 独立 — 关动画不关音效', () => {
    updateSettings({ shopAnimations: false, shopSound: true })
    expect(shouldPlayShopSound()).toBe(true)
  })
})
