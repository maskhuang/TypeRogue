// ============================================
// 打字肉鸽 - resolveChainAnchor 单元测试 (Story 37.4)
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'

// Mock battle.ts 的重型依赖（DOM/Audio/单例）
vi.mock('../../../src/ui/elements', () => ({
  getElements: vi.fn(() => ({
    container: { getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })), appendChild: vi.fn(), querySelectorAll: vi.fn(() => []), classList: { toggle: vi.fn() } },
    word: { children: [] },
    playerRelics: { children: [] },
    activeLibrary: { textContent: '' },
    triggerZone: { appendChild: vi.fn() },
    comboDisplay: { textContent: '' },
    scoreCount: { textContent: '' },
    healthBar: { style: {} },
  })),
}))
vi.mock('../../../src/systems/typing/InputHandler', () => ({
  inputHandler: { enable: vi.fn(), disable: vi.fn(), reset: vi.fn() },
}))
vi.mock('../../../src/ui/keyboard/KeyTooltip', () => ({
  keyTooltip: { show: vi.fn(), hide: vi.fn(), update: vi.fn() },
}))
vi.mock('../../../src/effects/juice', () => ({
  juiceUp: vi.fn(), bumpCombo: vi.fn(), bumpScore: vi.fn(), bumpMultiplier: vi.fn(),
  bumpTimer: vi.fn(), bumpGold: vi.fn(), getFloatScale: vi.fn(() => 1), screenShake: vi.fn(),
  getShakeIntensity: vi.fn(() => 0), getScoreTier: vi.fn(() => 'low'),
  SCORE_TIER_CLASSES: { low: '', mid: '', high: '', ultra: '' },
  ScoreRoller: vi.fn().mockImplementation(() => ({ update: vi.fn(), setValue: vi.fn(), destroy: vi.fn() })),
  triggerSlowMotion: vi.fn(), getTimeScale: vi.fn(() => 1),
  checkMilestone: vi.fn(), showMilestoneCelebration: vi.fn(),
  showRatingReveal: vi.fn(), calculateRating: vi.fn(() => 'S'),
}))
vi.mock('../../../src/effects/sound', () => ({
  playSound: vi.fn(), initAudio: vi.fn(), playScoreSound: vi.fn(),
  playRatingSound: vi.fn(), startBGM: vi.fn(), stopBGM: vi.fn(),
  updateBGMTension: vi.fn(), releaseBGMTension: vi.fn(), emitResourceSound: vi.fn(),
}))
vi.mock('../../../src/effects/particles', () => ({
  spawnParticles: vi.fn(),
}))

// 直接导入 resolveChainAnchor（不 mock battle.ts 本身）
import { resolveChainAnchor } from '../../../src/systems/battle'

describe('resolveChainAnchor — 链式触发锚点计算 (Story 37.4)', () => {
  beforeEach(() => {
    resetState()
  })

  it('boundKey 在本词中有匹配时返回 letterIndex', () => {
    state.player.word = 'apple'
    const result = resolveChainAnchor('p')
    expect(result.letterIndex).toBeDefined()
    // 'p' 出现在 index 1 和 2
    expect([1, 2]).toContain(result.letterIndex)
    expect(result.fromElementId).toBeUndefined()
  })

  it('boundKey 不在本词中时返回 fromElementId: active-library', () => {
    state.player.word = 'apple'
    const result = resolveChainAnchor('z')
    expect(result.fromElementId).toBe('active-library')
    expect(result.letterIndex).toBeUndefined()
  })

  it('大小写不敏感匹配（M3 修复验证）', () => {
    state.player.word = 'Apple'
    const result = resolveChainAnchor('A')
    expect(result.letterIndex).toBe(0)
    expect(result.fromElementId).toBeUndefined()
  })

  it('空词时总返回 fromElementId', () => {
    state.player.word = ''
    const result = resolveChainAnchor('a')
    expect(result.fromElementId).toBe('active-library')
    expect(result.letterIndex).toBeUndefined()
  })

  it('单字母词精确匹配', () => {
    state.player.word = 'a'
    const result = resolveChainAnchor('a')
    expect(result.letterIndex).toBe(0)
  })
})
