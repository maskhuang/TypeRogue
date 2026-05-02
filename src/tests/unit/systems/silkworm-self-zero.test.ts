// Regression: Silkworm + self-zero affix (Conduit/Amplify/...) must NOT consume letter base.
// Pre-fix bug: battle.ts unconditionally zeroed letterBase whenever skill carried Silkworm,
// while resolvePhase2's silkworm case early-returned on effectiveBase<=0 (self-zero skills).
// Net: player lost the letter base AND received no compensating bonus → "不产出".
//
// This test verifies via isSelfZeroSkill() (used by battle.ts as the new guard) that the
// classification is correct for the relevant affix mixes. The integration check that
// letterBase actually survives lives in battle.ts itself; we test the helper here because
// battle.ts's playerCorrect() touches the live game state (DOM, audio) and is not unit-testable.

import { describe, it, expect } from 'vitest'
import { AffixType } from '../../../src/data/affixes'
import { isSelfZeroSkill } from '../../../src/data/affixTrigger'

function mkSkill(affixes: any[]): any {
  return {
    id: 's', name: 's', icon: '⚔️',
    resource: 'score', baseValues: [10, 16, 24], level: 1, rarity: 0,
    affixes, enchantmentIds: [],
  }
}
function mkRt(): any {
  return {
    skillId: 's', chargeAccumulated: 0, currentDecayMult: 0,
    mirrorCopiedAffix: null, mirrorCopiedAffixes: [],
    stacks: 0, apprenticeAccumulated: 0,
    questStacks: 0, questCompletions: 0, questTransformed: false,
    exhaustCount: 0, critStreak: 0, missStreak: 0,
    patchTargetIndex: -1, patchMultiplier: 1.0,
    mutacritAccum: 0, reechoStacks: 0, silkwormStacks: 0, wordBaseBonus: 0,
  }
}

describe('isSelfZeroSkill (silkworm consumption guard)', () => {
  const SELF_ZERO_AFFIXES = [
    AffixType.Conduit, AffixType.Amplify, AffixType.Splash, AffixType.Relay,
    AffixType.WarDrum, AffixType.AuraFury, AffixType.AuraMorale,
  ]

  it.each(SELF_ZERO_AFFIXES)('returns true when skill has %s alongside Silkworm', (selfZeroType) => {
    const skill = mkSkill([
      { type: AffixType.Silkworm, silkwormK: 0.5 },
      { type: selfZeroType, posRel: 0 },
    ])
    expect(isSelfZeroSkill(skill, mkRt())).toBe(true)
  })

  it('returns false for plain Silkworm-only skill', () => {
    const skill = mkSkill([{ type: AffixType.Silkworm, silkwormK: 0.5 }])
    expect(isSelfZeroSkill(skill, mkRt())).toBe(false)
  })

  it('returns true when Mirror copies a self-zero affix at runtime', () => {
    const skill = mkSkill([
      { type: AffixType.Silkworm, silkwormK: 0.5 },
      { type: AffixType.Mirror },
    ])
    const rt = mkRt()
    rt.mirrorCopiedAffix = { type: AffixType.Conduit, posRel: 0 }
    expect(isSelfZeroSkill(skill, rt)).toBe(true)
  })
})
