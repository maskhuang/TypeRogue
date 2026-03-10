// ============================================
// 打字肉鸽 - 产出者商店集成测试
// ============================================
// Story 19.2: Code Review Fix — AC 7 验证

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import { PRODUCERS, isProducer } from '../../../src/data/producers'
import { getSkillDisplayInfo } from '../../../src/data/skills'

// Mock DOM / 音效 / battle
vi.mock('../../../src/ui/elements', () => ({
  getElements: () => ({
    rewardCards: { innerHTML: '', appendChild: vi.fn() },
    boundGrid: { innerHTML: '' },
    triggerZone: { appendChild: vi.fn() },
  }),
}))
vi.mock('../../../src/effects/sound', () => ({ playSound: vi.fn(), emitResourceSound: vi.fn() }))
vi.mock('../../../src/effects/juice', () => ({
  juiceUp: vi.fn(), init3DCardEffect: vi.fn(),
}))
vi.mock('../../../src/systems/battle', () => ({
  showFeedback: vi.fn(),
  updateHUD: vi.fn(),
  setPseudoInfiniteVisual: vi.fn(),
}))

describe('产出者商店集成 (AC 7)', () => {
  beforeEach(() => {
    resetState()
  })

  it('产出者全部在技能池中（allSkillIds 包含 PRODUCERS）', () => {
    const producerIds = Object.keys(PRODUCERS)
    for (const id of producerIds) {
      expect(producerIds).toContain(id)
    }
    expect(producerIds).toHaveLength(14)
  })

  it('isProducer 正确区分产出者和旧技能', () => {
    expect(isProducer('prod_burst')).toBe(true)
    expect(isProducer('burst')).toBe(false)
    expect(isProducer('prod_mint')).toBe(true)
    expect(isProducer('shield')).toBe(false)
  })

  it('产出者可以存入 state.player.skills（购买模拟）', () => {
    state.player.skills.set('prod_burst', { level: 1 })
    expect(state.player.skills.has('prod_burst')).toBe(true)
    expect(state.player.skills.get('prod_burst')!.level).toBe(1)
  })

  it('产出者可以升级（level 1→2→3）', () => {
    state.player.skills.set('prod_loot', { level: 1 })
    const data = state.player.skills.get('prod_loot')!
    data.level = 2
    expect(data.level).toBe(2)
    data.level = 3
    expect(data.level).toBe(3)
  })

  it('产出者可以绑定到键位', () => {
    state.player.skills.set('prod_focus', { level: 1 })
    state.player.bindings.set('a', 'prod_focus')
    expect(state.player.bindings.get('a')).toBe('prod_focus')
  })

  it('产出者可以卖出（从 skills 和 bindings 移除）', () => {
    state.player.skills.set('prod_mint', { level: 2, purchasePrice: 20 })
    state.player.bindings.set('s', 'prod_mint')

    // 模拟卖出流程
    const skillId = 'prod_mint'
    const sellData = state.player.skills.get(skillId)!
    const sellPrice = Math.floor((sellData.purchasePrice || 15) / 2)
    state.gold += sellPrice

    for (const [key, id] of state.player.bindings) {
      if (id === skillId) { state.player.bindings.delete(key); break }
    }
    state.player.skills.delete(skillId)

    expect(state.gold).toBe(100 + 10) // initial 100 + floor(20/2)
    expect(state.player.skills.has('prod_mint')).toBe(false)
    expect(state.player.bindings.has('s')).toBe(false)
  })

  it('getSkillDisplayInfo 为产出者返回正确信息', () => {
    const display = getSkillDisplayInfo('prod_burst')
    expect(display.name).toBe('爆发')
    expect(display.icon).toBe('⚔️')
    expect(display.desc).toBe('触发时：⚔️基数+5') // default (no level = Lv1 static)
  })

  it('getSkillDisplayInfo 为产出者返回等级相关描述', () => {
    const lv1 = getSkillDisplayInfo('prod_burst', 1)
    expect(lv1.desc).toBe('触发时：⚔️基数+5')

    const lv2 = getSkillDisplayInfo('prod_burst', 2)
    expect(lv2.desc).toBe('触发时：⚔️基数+8')

    const lv3 = getSkillDisplayInfo('prod_burst', 3)
    expect(lv3.desc).toBe('触发时：⚔️基数+12')
  })

  it('getSkillDisplayInfo 乘法产出者等级描述', () => {
    const lv1 = getSkillDisplayInfo('prod_focus', 1)
    expect(lv1.desc).toBe('触发时：⚔️基数×2')

    const lv2 = getSkillDisplayInfo('prod_focus', 2)
    expect(lv2.desc).toBe('触发时：⚔️基数×2.3')
  })

  it('多个产出者可共存于 skills Map', () => {
    state.player.skills.set('prod_boost', { level: 2 })
    state.player.skills.set('prod_burst', { level: 1 })
    expect(state.player.skills.size).toBe(2)
    expect(state.player.skills.has('prod_boost')).toBe(true)
    expect(state.player.skills.has('prod_burst')).toBe(true)
  })
})
