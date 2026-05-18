// ============================================
// 打字肉鸽 - V2 词条生成器 · chant scale roll
// ============================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateAffixV2, RECIPE_PILOERECTION } from '../../../src/data/affixV2Generator'
import { getAffixV2Definition } from '../../../src/data/affixV2'
import { setSeededMode, setNormalMode } from '../../../src/core/seededRandom'

beforeEach(() => {
  setSeededMode(42)
})

afterEach(() => {
  setNormalMode()
})

describe('chant generator · scale roll', () => {
  it('rainbow modifier 永远不挂 scale', () => {
    // 多 seed 跑 100 次，统计 rainbow apply_aura 是否带 scale
    setNormalMode()
    setSeededMode(1)
    let rainbowCount = 0
    let rainbowWithScale = 0
    for (let i = 0; i < 200; i++) {
      const id = generateAffixV2(RECIPE_PILOERECTION)
      const def = getAffixV2Definition(id)
      if (def?.effect.kind === 'apply_aura' && def.effect.modifier.type === 'rainbow') {
        rainbowCount++
        if ('scale' in def.effect && def.effect.scale) rainbowWithScale++
      }
    }
    expect(rainbowCount).toBeGreaterThan(0)  // 200 trials 应能抽到 rainbow
    expect(rainbowWithScale).toBe(0)         // rainbow 不带 scale
  })

  it('multi_fire_add 的 scale 一定是 tag_per_n', () => {
    setSeededMode(7)
    let mfaWithScaleCount = 0
    for (let i = 0; i < 300; i++) {
      const id = generateAffixV2(RECIPE_PILOERECTION)
      const def = getAffixV2Definition(id)
      if (def?.effect.kind !== 'apply_aura') continue
      if (def.effect.modifier.type !== 'multi_fire_add') continue
      const scale = (def.effect as { scale?: { type: string; perN?: number } }).scale
      if (!scale) continue
      mfaWithScaleCount++
      expect(scale.type).toBe('tag_per_n')
      // perN ∈ [2, 4]
      expect(scale.perN).toBeGreaterThanOrEqual(2)
      expect(scale.perN).toBeLessThanOrEqual(4)
    }
    expect(mfaWithScaleCount).toBeGreaterThan(0)  // 至少有一次抽到 multi_fire_add + scale
  })

  it('crit_chance_add / output_bonus_pct 的 scale 是 tag_count', () => {
    setSeededMode(13)
    let pctWithScaleCount = 0
    for (let i = 0; i < 300; i++) {
      const id = generateAffixV2(RECIPE_PILOERECTION)
      const def = getAffixV2Definition(id)
      if (def?.effect.kind !== 'apply_aura') continue
      const modType = def.effect.modifier.type
      if (modType !== 'crit_chance_add' && modType !== 'output_bonus_pct') continue
      const scale = (def.effect as { scale?: { type: string; factor?: number } }).scale
      if (!scale) continue
      pctWithScaleCount++
      expect(scale.type).toBe('tag_count')
      expect(scale.factor).toBe(0.1)
    }
    expect(pctWithScaleCount).toBeGreaterThan(0)
  })

  it('scale tag 总是 = recipe.section', () => {
    setSeededMode(99)
    for (let i = 0; i < 200; i++) {
      const id = generateAffixV2(RECIPE_PILOERECTION)
      const def = getAffixV2Definition(id)
      if (def?.effect.kind !== 'apply_aura') continue
      const scale = (def.effect as { scale?: { tag: string } }).scale
      if (!scale) continue
      expect(scale.tag).toBe(RECIPE_PILOERECTION.section)  // 'posture'
    }
  })

  it('scale 概率 ≈ 30% (非 rainbow 中，宽松区间)', () => {
    // 30% 名义 · 1000 试 · 抽样误差 ~3% → 区间 [22%, 38%]
    setSeededMode(31337)
    let nonRainbow = 0
    let nonRainbowWithScale = 0
    for (let i = 0; i < 1000; i++) {
      const id = generateAffixV2(RECIPE_PILOERECTION)
      const def = getAffixV2Definition(id)
      if (def?.effect.kind !== 'apply_aura') continue
      if (def.effect.modifier.type === 'rainbow') continue
      nonRainbow++
      const scale = (def.effect as { scale?: unknown }).scale
      if (scale) nonRainbowWithScale++
    }
    expect(nonRainbow).toBeGreaterThan(100)
    const rate = nonRainbowWithScale / nonRainbow
    expect(rate).toBeGreaterThan(0.22)
    expect(rate).toBeLessThan(0.38)
  })
})
