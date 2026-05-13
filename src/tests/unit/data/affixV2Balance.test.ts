// ============================================
// 打字肉鸽 - affixV2 Balance · 频率表 + throughput target 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import {
  TRIGGER_FREQUENCY,
  SECTION_THROUGHPUT_TARGET,
  RARITY_MULTIPLIER,
  expectedFiresPerBattle,
  computeAutoMagnitude,
  isMagnitudeInBaseline,
  KEYS_PER_BATTLE,
  WORDS_PER_BATTLE,
} from '../../../src/data/affixV2Balance'
import { SECTION_TAGS } from '../../../src/data/affixTags'

describe('TRIGGER_FREQUENCY · 完整覆盖', () => {
  it('9 个 trigger 类型都有频率值', () => {
    const expected = ['passive', 'on_key', 'on_word_end', 'on_self_fire', 'on_fire', 'every_n_keys', 'on_window_mode', 'on_sequence', 'one_per_window']
    for (const t of expected) {
      expect(TRIGGER_FREQUENCY[t as keyof typeof TRIGGER_FREQUENCY]).toBeDefined()
    }
  })

  it('on_key 频率 = KEYS_PER_BATTLE', () => {
    expect(TRIGGER_FREQUENCY.on_key.fires).toBe(KEYS_PER_BATTLE)
  })

  it('on_word_end 频率 = WORDS_PER_BATTLE', () => {
    expect(TRIGGER_FREQUENCY.on_word_end.fires).toBe(WORDS_PER_BATTLE)
  })
})

describe('expectedFiresPerBattle · 动态计算', () => {
  it('every_n_keys 按 n 反比', () => {
    expect(expectedFiresPerBattle({ type: 'every_n_keys', n: 10 })).toBe(30)
    expect(expectedFiresPerBattle({ type: 'every_n_keys', n: 5 })).toBe(60)
    expect(expectedFiresPerBattle({ type: 'every_n_keys', n: 1 })).toBe(300)
  })

  it('one_per_window 限流后频率取 min', () => {
    const inner = { type: 'on_key' as const }
    const f = expectedFiresPerBattle({ type: 'one_per_window', n: 30, inner })
    expect(f).toBeLessThanOrEqual(10) // min(on_key 300, battle/N=10)
  })

  it('passive 返 1（即"持续"标记）', () => {
    expect(expectedFiresPerBattle({ type: 'passive' })).toBe(1)
  })
})

describe('SECTION_THROUGHPUT_TARGET · 覆盖 8 个 section', () => {
  it('每个 section tag 有 throughput target', () => {
    for (const sec of SECTION_TAGS) {
      expect(SECTION_THROUGHPUT_TARGET[sec]).toBeGreaterThan(0)
    }
  })
})

describe('RARITY_MULTIPLIER · 单调递增', () => {
  it('普通 < 稀有 < 史诗 < 传说', () => {
    expect(RARITY_MULTIPLIER[0]).toBeLessThan(RARITY_MULTIPLIER[1])
    expect(RARITY_MULTIPLIER[1]).toBeLessThan(RARITY_MULTIPLIER[2])
    expect(RARITY_MULTIPLIER[2]).toBeLessThan(RARITY_MULTIPLIER[3])
  })
})

describe('computeAutoMagnitude · 反推公式', () => {
  it('on_word_end + maintenance + 普通 → T/f 反推', () => {
    const T = SECTION_THROUGHPUT_TARGET.maintenance
    const f = WORDS_PER_BATTLE
    const expected = T / f
    expect(computeAutoMagnitude('maintenance', 0, { type: 'on_word_end' }))
      .toBeCloseTo(expected, 5)
  })

  it('稀有度 1.3× 倍率正确', () => {
    const m0 = computeAutoMagnitude('maintenance', 0, { type: 'on_word_end' })
    const m1 = computeAutoMagnitude('maintenance', 1, { type: 'on_word_end' })
    expect(m1 / m0).toBeCloseTo(1.3, 3)
  })

  it('低频 trigger → 高 magnitude', () => {
    const hi_f = computeAutoMagnitude('maintenance', 0, { type: 'on_key' })       // 300 fires
    const lo_f = computeAutoMagnitude('maintenance', 0, { type: 'every_n_keys', n: 30 })  // 10 fires
    expect(lo_f).toBeGreaterThan(hi_f)
    expect(lo_f / hi_f).toBeCloseTo(30, 0)  // 30x magnitude for 30x lower freq
  })

  it('passive 直接 T × R 不除频率', () => {
    const T = SECTION_THROUGHPUT_TARGET.posture
    const R = RARITY_MULTIPLIER[1]
    expect(computeAutoMagnitude('posture', 1, { type: 'passive' })).toBeCloseTo(T * R, 5)
  })
})

describe('isMagnitudeInBaseline · ±30% 容忍', () => {
  it('完全等于 auto 值 → true', () => {
    const auto = computeAutoMagnitude('maintenance', 0, { type: 'on_word_end' })
    expect(isMagnitudeInBaseline('maintenance', 0, { type: 'on_word_end' }, auto)).toBe(true)
  })

  it('+25% 仍在 baseline', () => {
    const auto = computeAutoMagnitude('maintenance', 0, { type: 'on_word_end' })
    expect(isMagnitudeInBaseline('maintenance', 0, { type: 'on_word_end' }, auto * 1.25)).toBe(true)
  })

  it('+40% 超 baseline', () => {
    const auto = computeAutoMagnitude('maintenance', 0, { type: 'on_word_end' })
    expect(isMagnitudeInBaseline('maintenance', 0, { type: 'on_word_end' }, auto * 1.4)).toBe(false)
  })
})
