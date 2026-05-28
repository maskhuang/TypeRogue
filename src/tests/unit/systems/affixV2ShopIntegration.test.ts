// ============================================
// 打字肉鸽 - V2 真接入：shop generateSkill → bind → V2 equip
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { generateSkill } from '../../../src/data/skillGeneration'
import { bindShapeToKeys, unbindSkill } from '../../../src/systems/bindingManager'
import { listAllEquipped, getEquippedOnSkill, clearAllEquipped } from '../../../src/systems/affixV2Equipped'
import { resetAllAffixV2State } from '../../../src/systems/affixV2State'
import { PILOT_AFFIX_IDS } from '../../../src/data/affixV2PilotSpecs'
import type { SkillRarity } from '../../../src/data/affixes'

beforeEach(() => {
  clearAllEquipped()
  resetAllAffixV2State()
})

describe('generateSkill · 产出带 v2Ids', () => {
  it('rarity 0 → 1 个 v2Ids（词条数 = rarity+1）', () => {
    const s = generateSkill({ rarity: 0 as SkillRarity })
    expect(s.v2Ids?.length).toBe(1)
  })

  it('rarity 1 → 2 个 v2Ids（动态生成 · gen_ 前缀）', () => {
    const s = generateSkill({ rarity: 1 as SkillRarity })
    expect(s.v2Ids?.length).toBe(2)
    expect(s.v2Ids![0]).toMatch(/^gen_/)
  })

  it('rarity 3 → 4 个不重复 v2Ids', () => {
    const s = generateSkill({ rarity: 3 as SkillRarity })
    expect(s.v2Ids?.length).toBe(4)
    expect(new Set(s.v2Ids).size).toBe(4)
  })

  it('legacy affixes 数组保持空（v2 接管）', () => {
    const s = generateSkill({ rarity: 3 as SkillRarity })
    expect(s.affixes).toEqual([])
  })
})

describe('bindShapeToKeys · V2 联动', () => {
  it('绑定到 K 键 → 所有 v2Ids 自动装到 K', () => {
    // 用 monomino 形状保证 'k' 可放置（rarity 3 但 shape 强制单格）
    const skill = generateSkill({ rarity: 3 as SkillRarity, shapeId: 'monomino' })
    const bs = {
      bindings: new Map<string, string>(),
      affixSkills: new Map([[skill.id, skill]]),
    }
    const r = bindShapeToKeys(bs, skill.id, 'k')
    expect(r.success).toBe(true)

    const equipped = getEquippedOnSkill(skill.id)
    expect(equipped.length).toBe(4)   // rarity 3 = 4 词条
    const equippedDefIds = new Set(equipped.map(e => e.defId))
    expect(equippedDefIds).toEqual(new Set(skill.v2Ids))
  })

  it('解绑 → V2 affix 全部卸下', () => {
    const skill = generateSkill({ rarity: 2 as SkillRarity, shapeId: 'monomino' })
    const bs = {
      bindings: new Map<string, string>(),
      affixSkills: new Map([[skill.id, skill]]),
    }
    bindShapeToKeys(bs, skill.id, 'k')
    expect(getEquippedOnSkill(skill.id).length).toBe(3)   // rarity 2 = 3 词条

    unbindSkill(bs, skill.id)
    expect(getEquippedOnSkill(skill.id).length).toBe(0)
  })

  it('替换绑定 → 旧 V2 卸下 + 新 V2 装到新键', () => {
    const skill = generateSkill({ rarity: 1 as SkillRarity, shapeId: 'monomino' })
    const bs = {
      bindings: new Map<string, string>(),
      affixSkills: new Map([[skill.id, skill]]),
    }
    bindShapeToKeys(bs, skill.id, 'k')
    const firstEquipped = listAllEquipped().filter(e => e.skillId === skill.id)
    expect(firstEquipped.length).toBe(2)   // rarity 1 = 2 词条
    expect(firstEquipped[0].key).toBe('k')

    // 重新绑到 J（rebind）
    bindShapeToKeys(bs, skill.id, 'j')
    const secondEquipped = listAllEquipped().filter(e => e.skillId === skill.id)
    expect(secondEquipped.length).toBe(2)   // rarity 1 = 2 词条
    expect(secondEquipped[0].key).toBe('j')
    expect(secondEquipped[0].instanceId).not.toBe(firstEquipped[0].instanceId)
  })

  it('displaced skill → 其 V2 同步卸下', () => {
    const skillA = generateSkill({ rarity: 1 as SkillRarity, shapeId: 'monomino' })
    const skillB = generateSkill({ rarity: 1 as SkillRarity, shapeId: 'monomino' })
    const bs = {
      bindings: new Map<string, string>(),
      affixSkills: new Map([[skillA.id, skillA], [skillB.id, skillB]]),
    }
    bindShapeToKeys(bs, skillA.id, 'k')
    expect(getEquippedOnSkill(skillA.id).length).toBe(2)   // rarity 1 = 2 词条

    // B 绑同一键 → A 被 displaced
    bindShapeToKeys(bs, skillB.id, 'k')
    expect(getEquippedOnSkill(skillA.id).length).toBe(0)
    expect(getEquippedOnSkill(skillB.id).length).toBe(2)
  })
})
