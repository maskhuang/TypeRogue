// ============================================
// Story 60.5: UserSettings shopUI 字段测试
// ============================================
// 验证 shopUI 默认值 + 持久化 + 老存档（无字段）回落

import { describe, it, expect, beforeEach } from 'vitest'
import { getSettings, updateSettings, loadSettings } from '../../../src/core/UserSettings'

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
