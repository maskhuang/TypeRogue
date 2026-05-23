// ============================================
// 打字肉鸽 - inherit_tags aura + workbench scope 单元测试
// ============================================
// 验证：宿主 skill 通过 inherit_tags aura 拥有「来源 scope（含 workbench=IN-tray）内
// 所有技能 own-tag 的并集」；继承 tag 喂入 matched_tag / on_fire(tag) 等技能层 tag 判定。

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../src/core/state'
import { addAura, resetAllAffixV2State } from '../../../src/systems/affixV2State'
import {
  getSkillOwnTags,
  getSkillInheritedTags,
  getSkillEffectiveTags,
  skillHasEffectiveTag,
} from '../../../src/systems/affixV2InheritedTags'
import { matchFireFilter } from '../../../src/systems/fireFilter'
import type { FireEvent } from '../../../src/systems/tagQuery'

// 真实 affix def → tag（= section）：still=maintenance / pant_hoot=vocal / brachiate=locomotion
function setSkill(id: string, v2Ids: string[], extra: Record<string, unknown> = {}): void {
  state.affixSkills.set(id, { id, v2Ids, ...extra } as never)
}

beforeEach(() => {
  resetAllAffixV2State()
  state.affixSkills.clear()
  state.player.bindings.clear()
  state.player.inbox = []
})

describe('getSkillOwnTags · v2Ids → section tag 并集', () => {
  it('多词条取并集，无 v2Ids 返回空', () => {
    setSkill('s1', ['still', 'pant_hoot'])  // maintenance + vocal
    expect([...getSkillOwnTags('s1')].sort()).toEqual(['maintenance', 'vocal'])
    setSkill('s2', [])
    expect(getSkillOwnTags('s2').size).toBe(0)
    expect(getSkillOwnTags('missing').size).toBe(0)
  })
})

describe('inherit_tags · 宿主继承 workbench(IN-tray) scope 的 tag', () => {
  beforeEach(() => {
    setSkill('host', [])                  // 宿主自身无 own tag
    setSkill('bench1', ['pant_hoot'])     // IN-tray · vocal
    setSkill('bench2', ['brachiate'])     // IN-tray · locomotion
    setSkill('keyboard', ['still'])       // 绑键 · maintenance（不在 inbox）
    state.player.inbox = ['bench1', 'bench2']
    state.player.bindings.set('A', 'keyboard')
    // 宿主 host 携带 inherit_tags aura，来源 scope = workbench(IN-tray)
    addAura('inst_host', { type: 'workbench' }, { type: 'inherit_tags' }, 'host', 'B')
  })

  it('继承 IN-tray 全部技能的 own tag', () => {
    expect([...getSkillInheritedTags('host')].sort()).toEqual(['locomotion', 'vocal'])
  })

  it('有效 tag = own ∪ inherited（此例 own 为空）', () => {
    expect([...getSkillEffectiveTags('host')].sort()).toEqual(['locomotion', 'vocal'])
    expect(skillHasEffectiveTag('host', 'vocal')).toBe(true)
    expect(skillHasEffectiveTag('host', 'locomotion')).toBe(true)
  })

  it('IN-tray 外的绑键技能 tag 不被继承', () => {
    expect(skillHasEffectiveTag('host', 'maintenance')).toBe(false)
  })

  it('非宿主技能不受 aura 影响', () => {
    expect(getSkillInheritedTags('bench1').size).toBe(0)
    expect(skillHasEffectiveTag('keyboard', 'vocal')).toBe(false)
  })

  it('battle reset 清光环后继承消失', () => {
    resetAllAffixV2State()
    expect(getSkillInheritedTags('host').size).toBe(0)
  })
})

describe('inherit_tags · own tag 与继承叠加', () => {
  it('宿主既有 own tag 又继承来源 tag', () => {
    setSkill('host', ['still'])           // own maintenance
    setSkill('bench1', ['pant_hoot'])     // IN-tray vocal
    state.player.inbox = ['bench1']
    addAura('inst_host', { type: 'workbench' }, { type: 'inherit_tags' }, 'host', 'B')
    expect([...getSkillEffectiveTags('host')].sort()).toEqual(['maintenance', 'vocal'])
  })
})

describe('inherit_tags 喂入 on_fire(tag) filter', () => {
  beforeEach(() => {
    setSkill('host', ['still'])           // own maintenance
    setSkill('bench1', ['pant_hoot'])     // IN-tray vocal
    state.player.inbox = ['bench1']
    addAura('inst_host', { type: 'workbench' }, { type: 'inherit_tags' }, 'host', 'B')
  })

  const event: FireEvent = {
    sourceAffixId: 'still',     // maintenance（宿主自身词条）
    sourceSkillId: 'host',
    sourceKey: 'B',
    sourceResource: 'score',
    isCrit: false,
    stackState: 'none',
    amount: 1,
    timestamp: 0,
  }

  it('继承到的 vocal → 宿主 fire 命中 on_fire{tag:vocal}', () => {
    expect(matchFireFilter(event, { tag: 'vocal' }, 'C')).toBe(true)
  })

  it('own maintenance（来源词条自带）仍命中', () => {
    expect(matchFireFilter(event, { tag: 'maintenance' }, 'C')).toBe(true)
  })

  it('未持有 / 未继承的 tag 不命中', () => {
    expect(matchFireFilter(event, { tag: 'gesture' }, 'C')).toBe(false)
  })
})
