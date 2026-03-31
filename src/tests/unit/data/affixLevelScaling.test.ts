// ============================================
// 打字肉鸽 - 词条参数随等级缩放 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import {
  AffixType,
  AFFIX_LEVEL_SCALING,
  applyAffixLevelScaling,
  previewAffixScaledValue,
} from '../../../src/data/affixes'
import type { AffixInstance } from '../../../src/data/affixes'

describe('AFFIX_LEVEL_SCALING table', () => {
  it('should have 14 entries for scalable affixes', () => {
    expect(Object.keys(AFFIX_LEVEL_SCALING).length).toBe(14)
  })
})

describe('applyAffixLevelScaling', () => {
  it('add mode: Crit chance +0.05 per level', () => {
    const affix: AffixInstance = { type: AffixType.Crit, chance: 0.3, critMult: 2.0 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.chance).toBe(0.35)
  })

  it('add mode: Pulse burstMult +0.3 per level', () => {
    const affix: AffixInstance = { type: AffixType.Pulse, interval: 3, burstMult: 3.0 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.burstMult).toBe(3.3)
  })

  it('add mode: Cascade cascadeMult +0.2 per level', () => {
    const affix: AffixInstance = { type: AffixType.Cascade, cascadeMult: 1.8 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.cascadeMult).toBe(2.0)
  })

  it('add mode: Decay floor +0.05 per level', () => {
    const affix: AffixInstance = { type: AffixType.Decay, initialMult: 2, decayPerTrigger: 0.2, floor: 0.5 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.floor).toBe(0.55)
  })

  it('add mode: Charge maxBonus +0.5 per level', () => {
    const affix: AffixInstance = { type: AffixType.Charge, gainPerSec: 0.1, maxBonus: 2.0 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.maxBonus).toBe(2.5)
  })

  it('add mode: Outcast bonusPercent +0.15 per level', () => {
    const affix: AffixInstance = { type: AffixType.Outcast, bonusPercent: 0.5 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.bonusPercent).toBe(0.65)
  })

  it('no-scale: Amplify (flat base per stack, no param scaling)', () => {
    const affix: AffixInstance = { type: AffixType.Amplify }
    const before = { ...affix }
    applyAffixLevelScaling([affix], 1)
    expect(affix).toEqual(before)
  })

  it('add mode: Recurse recurseChance +0.03 per level', () => {
    const affix: AffixInstance = { type: AffixType.Recurse, recurseChance: 0.2 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.recurseChance).toBe(0.23)
  })

  it('add mode: Taboo bonusPercent +0.3 per level', () => {
    const affix: AffixInstance = { type: AffixType.Taboo, bonusPercent: 1.0, penaltyChance: 0.1 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.bonusPercent).toBe(1.3)
  })

  it('mult mode: Convert k ×1.1 per level', () => {
    const affix: AffixInstance = { type: AffixType.Convert, source: 'base', k: 0.05 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.k).toBeCloseTo(0.055, 3)
  })

  it('mult mode: Convert k ×1.1 two levels', () => {
    const affix: AffixInstance = { type: AffixType.Convert, source: 'base', k: 0.05 }
    applyAffixLevelScaling([affix], 2)
    expect(affix.k).toBeCloseTo(0.0605, 3)
  })

  it('add-dir mode: Gravity attract (>1) gets +0.15', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.5 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.probMult).toBe(1.65)
  })

  it('add-dir mode: Gravity repel (<1) gets -0.15', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 0.5 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.probMult).toBe(0.35)
  })

  it('add-dir mode: Gravity neutral (=1) unchanged', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.0 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.probMult).toBe(1.0)
  })

  it('add-dir mode: Gravity clamp at 0 (repel)', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 0.1 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.probMult).toBeGreaterThanOrEqual(0)
  })

  it('add-dir mode: Gravity clamp at 2 (attract)', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.9 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.probMult).toBeLessThanOrEqual(2)
  })

  it('multi-level scaling (3 levels)', () => {
    const affix: AffixInstance = { type: AffixType.Crit, chance: 0.3, critMult: 2.0 }
    applyAffixLevelScaling([affix], 3)
    expect(affix.chance).toBe(0.45) // 0.3 + 3×0.05
  })

  it('no-scale affix: Rainbow unchanged', () => {
    const affix: AffixInstance = { type: AffixType.Rainbow }
    const before = { ...affix }
    applyAffixLevelScaling([affix], 1)
    expect(affix).toEqual(before)
  })

  it('no-scale affix: Mirror unchanged', () => {
    const affix: AffixInstance = { type: AffixType.Mirror }
    const before = { ...affix }
    applyAffixLevelScaling([affix], 1)
    expect(affix).toEqual(before)
  })

  it('handles multiple affixes in one call', () => {
    const affixes: AffixInstance[] = [
      { type: AffixType.Crit, chance: 0.3, critMult: 2.0 },
      { type: AffixType.Pulse, interval: 3, burstMult: 3.0 },
      { type: AffixType.Rainbow },
    ]
    applyAffixLevelScaling(affixes, 1)
    expect(affixes[0].chance).toBe(0.35)
    expect(affixes[1].burstMult).toBe(3.3)
    expect(affixes[2]).toEqual({ type: AffixType.Rainbow })
  })

  it('add mode: Splash splashCount +1 per level', () => {
    const affix: AffixInstance = { type: AffixType.Splash, splashCount: 1 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.splashCount).toBe(2)
  })

  it('add mode: Resonance resonanceCount +1 per level', () => {
    const affix: AffixInstance = { type: AffixType.Resonance, resonanceCount: 1 }
    applyAffixLevelScaling([affix], 1)
    expect(affix.resonanceCount).toBe(2)
  })
})

describe('previewAffixScaledValue', () => {
  it('returns correct preview for add mode', () => {
    const affix: AffixInstance = { type: AffixType.Crit, chance: 0.3, critMult: 2.0 }
    const result = previewAffixScaledValue(affix, 1)
    expect(result).not.toBeNull()
    expect(result!.param).toBe('chance')
    expect(result!.oldVal).toBe(0.3)
    expect(result!.newVal).toBe(0.35)
  })

  it('returns correct preview for mult mode', () => {
    const affix: AffixInstance = { type: AffixType.Convert, source: 'base', k: 0.05 }
    const result = previewAffixScaledValue(affix, 1)
    expect(result).not.toBeNull()
    expect(result!.param).toBe('k')
    expect(result!.oldVal).toBe(0.05)
    expect(result!.newVal).toBeCloseTo(0.055, 3)
  })

  it('returns null for non-scaling affix', () => {
    const affix: AffixInstance = { type: AffixType.Rainbow }
    const result = previewAffixScaledValue(affix, 1)
    expect(result).toBeNull()
  })

  it('returns null for neutral Gravity', () => {
    const affix: AffixInstance = { type: AffixType.Gravity, probMult: 1.0 }
    const result = previewAffixScaledValue(affix, 1)
    expect(result).toBeNull()
  })

  it('does not modify original affix', () => {
    const affix: AffixInstance = { type: AffixType.Crit, chance: 0.3, critMult: 2.0 }
    previewAffixScaledValue(affix, 1)
    expect(affix.chance).toBe(0.3)
  })

  it('preview for multi-level', () => {
    const affix: AffixInstance = { type: AffixType.Crit, chance: 0.3, critMult: 2.0 }
    const result = previewAffixScaledValue(affix, 2)
    expect(result).not.toBeNull()
    expect(result!.newVal).toBe(0.4) // 0.3 + 2×0.05
  })
})
