import { describe, it, expect, beforeEach } from 'vitest'
import { generateAffixV2, RECIPE_IMITATE } from '../../../src/data/affixV2Generator'
import { getAffixV2Definition } from '../../../src/data/affixV2'
import { affixV2SkillToTooltipInfo } from '../../../src/ui/affixV2TooltipAdapter'
import { scopePosAnchor } from '../../../src/data/keyboardTopology'
import { state as gameState } from '../../../src/core/state'
import { setLocale } from '../../../src/demo/demo-i18n'

// PositionRelation enum values are camelCase (see keyboardTopology.ts)
const ZH_REL: Record<string, string> = {
  adjacent: '相邻', sameRow: '同行', sameColumn: '同列',
  sameHand: '同手', sameFinger: '同指', symmetric: '对称',
}

beforeEach(() => { setLocale('zh') })

describe('In-tray (unbound) tooltip scope == scopePosAnchor(skillId)', () => {
  it('imitate neighborPosRel shows ANCHOR direction, not the generation-rolled value', () => {
    const skillId = 'skill_probe_123'
    const anchorRel = scopePosAnchor(skillId)
    // find an imitate def whose rolled posRel differs from this skill's anchor (so they're distinguishable)
    let defId = ''
    for (let i = 0; i < 80; i++) {
      const id = generateAffixV2(RECIPE_IMITATE)
      const def = getAffixV2Definition(id)!
      if (def.effect.kind === 'gain_skill' && def.effect.filter.neighborPosRel && def.effect.filter.neighborPosRel !== anchorRel) {
        defId = id
        break
      }
    }
    expect(defId).not.toBe('')

    const def = getAffixV2Definition(defId)!
    const rolled = (def.effect as { filter: { neighborPosRel: string } }).filter.neighborPosRel

    gameState.affixSkills.set(skillId, { id: skillId, v2Ids: [defId], resource: 'score' } as never)
    const infos = affixV2SkillToTooltipInfo({ id: skillId, v2Ids: [defId], resource: 'score' })
    const desc = infos.map(i => i.description ?? '').join(' || ')

    expect(desc).toContain(`${ZH_REL[anchorRel]}邻位`)   // anchor = runtime
    expect(desc).not.toContain(`${ZH_REL[rolled]}邻位`)  // not the stale rolled value
  })
})
