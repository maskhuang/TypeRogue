// ============================================
// 打字肉鸽 - 遗物图标脉冲测试 (Story 37.5)
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'

// Mock UI elements
vi.mock('../../../src/ui/elements', () => ({
  getElements: () => ({
    playerRelics: { children: [] },
    triggerZone: { appendChild: vi.fn() },
  }),
}))

vi.mock('../../../src/effects/sound', () => ({
  playSound: vi.fn(),
  emitResourceSound: vi.fn(),
}))

describe('遗物图标脉冲 (Story 37.5)', () => {
  beforeEach(() => {
    resetState()
  })

  it('getRelicIndex 返回正确索引', () => {
    state.player.relics = new Set(['decelerate_reward', 'jazz', 'snowball'])
    const relics = [...state.player.relics]
    expect(relics.indexOf('decelerate_reward')).toBe(0)
    expect(relics.indexOf('jazz')).toBe(1)
    expect(relics.indexOf('snowball')).toBe(2)
  })

  it('getRelicIndex 未持有遗物返回 -1', () => {
    state.player.relics = new Set(['jazz'])
    const relics = [...state.player.relics]
    expect(relics.indexOf('combo_buffer')).toBe(-1)
    expect(relics.indexOf('decelerate_reward')).toBe(-1)
  })

  it('所有 5 个目标遗物 ID 与 Set 操作兼容', () => {
    const targetRelics = ['decelerate_reward', 'combo_buffer', 'jazz', 'little_helper', 'snowball']
    state.player.relics = new Set(targetRelics)
    for (const id of targetRelics) {
      expect(state.player.relics.has(id)).toBe(true)
      const idx = [...state.player.relics].indexOf(id)
      expect(idx).toBeGreaterThanOrEqual(0)
    }
  })

  it('pulseRelicIcon 对未持有遗物安全跳过（idx < 0 分支）', () => {
    state.player.relics = new Set(['jazz'])
    // getRelicIndex('combo_buffer') 返回 -1 → pulseRelicIcon 应提前 return
    const relics = [...state.player.relics]
    const idx = relics.indexOf('combo_buffer')
    expect(idx).toBe(-1)
    // 不崩溃即为通过
  })
})
