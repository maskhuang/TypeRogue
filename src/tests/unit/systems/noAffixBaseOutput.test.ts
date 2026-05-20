// ============================================
// 无词条技能（rarity 0）基数产出回归测试
// ============================================
// 背景：无词条技能（v2Ids 空）依赖旧 orchestrator 管线产出基数资源，
// 而该管线在缺少 affixSkillStates runtimeState 时静默 continue → 零产出/无反馈。
// 运行时新增技能（gain_skill 授予）不会自动建 runtimeState，旧此路径下无词条技能失效。
// 修复：triggerSkill 缺失时懒建 runtimeState；gain_skill 授予时一并建。

import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../src/ui/elements', () => ({
  getElements: () => ({ word: { children: [] } }),
}))

import { state, synergy } from '../../../src/core/state'
import { generateSkill } from '../../../src/data/skillGeneration'
import { triggerSkill } from '../../../src/systems/skills'
import { clearAllEquipped } from '../../../src/systems/affixV2Equipped'
import { resetAllAffixV2State } from '../../../src/systems/affixV2State'
import { resyncV2EquipmentFromState } from '../../../src/systems/affixV2BattleIntegration'

function fire(skillId: string, key: string): void {
  // 旧路径反馈会触达 document（测试 node 环境无 DOM），产出已先于反馈写入，吞掉 DOM 报错
  try { triggerSkill(skillId, key) } catch { /* DOM-only feedback failure */ }
}

describe('无词条技能基数产出（缺失 runtimeState 防御）', () => {
  beforeEach(() => {
    clearAllEquipped()
    resetAllAffixV2State()
    state.affixSkills.clear()
    state.affixSkillStates.clear()
    state.player.bindings.clear()
    state.player.skills.clear()
    synergy.skillBaseScore = 0
    state.player.word = 'apple'
    state.player.index = 0
  })

  it('无词条 base 技能即使缺 runtimeState 也能产出基数（triggerSkill 懒建）', () => {
    const skill = generateSkill({ rarity: 0, resource: 'base', level: 1 })
    skill.id = 'sk_no_rt'
    expect(skill.v2Ids).toEqual([])
    // 模拟 gain_skill 授予：写 affixSkills 但故意不建 runtimeState
    state.affixSkills.set(skill.id, skill)
    state.player.skills.set(skill.id, { level: 1 } as any)
    state.player.bindings.set('a', skill.id)
    resyncV2EquipmentFromState()

    expect(state.affixSkillStates.has('sk_no_rt')).toBe(false)
    fire('sk_no_rt', 'a')

    // baseValues[0] = 4
    expect(synergy.skillBaseScore).toBe(4)
    expect(state.affixSkillStates.has('sk_no_rt')).toBe(true)
  })

  it('有词条技能缺 runtimeState 一直能产出（V2 路径不依赖 runtimeState）', () => {
    const skill = generateSkill({ rarity: 1, resource: 'base', level: 1 })
    skill.id = 'sk_v2'
    expect(skill.v2Ids!.length).toBeGreaterThan(0)
    state.affixSkills.set(skill.id, skill)
    state.player.skills.set(skill.id, { level: 1 } as any)
    state.player.bindings.set('a', skill.id)
    resyncV2EquipmentFromState()

    fire('sk_v2', 'a')
    expect(synergy.skillBaseScore).toBeGreaterThan(0)
  })
})
