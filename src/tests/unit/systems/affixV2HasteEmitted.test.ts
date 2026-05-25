// ============================================
// 打字肉鸽 - on_haste_emitted trigger（源/施加方侧）单元测试
// ============================================
// on_haste_granted（接收方）的镜像：当 scope 内某 skill「给予/发出」极速时触发。
// 典型 scope=neighbors{posRel} = "posRel 里的技能给予极速时"。
// 覆盖：evaluateTrigger 语义 + hookOnHasteEmitted scope 匹配（self / all_skills / neighbors）。

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  equipAffixV2,
  clearAllEquipped,
  clearGhostLog,
  getGhostLog,
  hookOnHasteEmitted,
  setSelectorResolver,
} from '../../../src/systems/affixV2Equipped'
import { resetAllAffixV2State } from '../../../src/systems/affixV2State'
import {
  registerDynamicAffixV2,
  clearDynamicAffixV2,
  type AffixV2Definition,
} from '../../../src/data/affixV2'
import { evaluateTrigger } from '../../../src/systems/affixV2Trigger'
import type { TriggerSpec, TargetSelector } from '../../../src/data/affixV2Trigger'

const lv1Base = (r: string) => ({ score: 11, time: 0.2, gold: 3, shield: 5 } as Record<string, number>)[r] ?? 1
const fullRes = () => 100
const NOW = 1000

/** 注册一个带 on_haste_emitted trigger 的动态词条（gain_resource 便于观察产出）*/
function makeEmittedAffix(id: string, scope?: TargetSelector): AffixV2Definition {
  const def: AffixV2Definition = {
    id,
    name_zh: id,
    name_en: id,
    section: 'locomotion',
    tags: ['locomotion'],
    phase: 'P1',
    trigger: { type: 'on_haste_emitted', ...(scope ? { scope } : {}) },
    effect: { kind: 'gain_resource', resource: 'score', ratio: 1 },
  }
  registerDynamicAffixV2(def)
  return def
}

beforeEach(() => {
  clearAllEquipped()
  resetAllAffixV2State()
  clearGhostLog()
  // 默认 resolver 返空，避免上一个测试的 resolver 泄漏；scope-based 测试各自覆盖
  setSelectorResolver(() => [])
})

afterEach(() => {
  clearDynamicAffixV2()
})

// ============================================
// evaluateTrigger 语义
// ============================================

describe('evaluateTrigger · on_haste_emitted', () => {
  it('无 emitterSkillId → false', () => {
    expect(evaluateTrigger({ type: 'on_haste_emitted' }, {})).toBe(false)
  })

  it('有 emitterSkillId → true（scope 匹配在 hook 层做）', () => {
    expect(evaluateTrigger({ type: 'on_haste_emitted' }, { emitterSkillId: 'skill_x' })).toBe(true)
  })

  it('grantedSkillId 不喂给 emitter 端（与 on_haste_granted 隔离）', () => {
    expect(evaluateTrigger({ type: 'on_haste_emitted' }, { grantedSkillId: 'skill_x' })).toBe(false)
  })
})

// ============================================
// hookOnHasteEmitted · scope=self（默认）
// ============================================

describe('hookOnHasteEmitted · scope=self', () => {
  it('本技能即源 → 命中', () => {
    makeEmittedAffix('emit_self')
    equipAffixV2('skill_1', 'K', 'emit_self')
    const r = hookOnHasteEmitted('skill_1', lv1Base, fullRes, NOW)
    expect(r.length).toBe(1)
    expect(r[0].sourceSkillId).toBe('skill_1')
    expect(r[0].result.resourceProduced[0].amount).toBeCloseTo(11, 3)  // ratio 1 × score Lv1 base 11
  })

  it('源是别的技能 → 不命中', () => {
    makeEmittedAffix('emit_self')
    equipAffixV2('skill_1', 'K', 'emit_self')
    const r = hookOnHasteEmitted('skill_2', lv1Base, fullRes, NOW)
    expect(r.length).toBe(0)
  })
})

// ============================================
// hookOnHasteEmitted · scope=all_skills（任意源）
// ============================================

describe('hookOnHasteEmitted · scope=all_skills', () => {
  it('任意源都命中（不论是否本技能）', () => {
    setSelectorResolver(() => ['skill_1', 'skill_2', 'skill_3'])
    makeEmittedAffix('emit_all', { type: 'all_skills' })
    equipAffixV2('skill_1', 'K', 'emit_all')
    expect(hookOnHasteEmitted('skill_2', lv1Base, fullRes, NOW).length).toBe(1)
    expect(hookOnHasteEmitted('skill_3', lv1Base, fullRes, NOW).length).toBe(1)
  })

  it('源不在 resolver 返回集 → 不命中', () => {
    setSelectorResolver(() => ['skill_1'])  // 仅 skill_1 在 scope
    makeEmittedAffix('emit_all', { type: 'all_skills' })
    equipAffixV2('skill_listener', 'L', 'emit_all')
    expect(hookOnHasteEmitted('skill_99', lv1Base, fullRes, NOW).length).toBe(0)
  })
})

// ============================================
// hookOnHasteEmitted · scope=neighbors{posRel} = "posRel 里的技能给予极速时"
// ============================================

describe('hookOnHasteEmitted · scope=neighbors（posRel）', () => {
  it('posRel 邻域内的源给予极速 → 命中', () => {
    // resolver 模拟集成层：host=skill_listener 的 posRel 邻域 = [skill_neighbor]
    setSelectorResolver((sel) => sel.type === 'neighbors' ? ['skill_neighbor'] : [])
    makeEmittedAffix('emit_nb', { type: 'neighbors', posRel: 'Adjacent' })
    equipAffixV2('skill_listener', 'L', 'emit_nb')
    const r = hookOnHasteEmitted('skill_neighbor', lv1Base, fullRes, NOW)
    expect(r.length).toBe(1)
    expect(r[0].sourceSkillId).toBe('skill_listener')  // 触发的是 listener 上的词条
    expect(getGhostLog().some(g => g.trigger === 'on_haste_emitted')).toBe(true)
  })

  it('邻域外的源给予极速 → 不命中', () => {
    setSelectorResolver((sel) => sel.type === 'neighbors' ? ['skill_neighbor'] : [])
    makeEmittedAffix('emit_nb', { type: 'neighbors', posRel: 'Adjacent' })
    equipAffixV2('skill_listener', 'L', 'emit_nb')
    expect(hookOnHasteEmitted('skill_far', lv1Base, fullRes, NOW).length).toBe(0)
  })
})

// ============================================
// 隔离 · on_haste_granted 词条不被 emitter hook 触发
// ============================================

describe('granted / emitted 隔离', () => {
  it('on_haste_granted 词条不在 hookOnHasteEmitted 中触发', () => {
    const granted: AffixV2Definition = {
      id: 'grant_self', name_zh: 'g', name_en: 'g', section: 'locomotion', tags: ['locomotion'],
      phase: 'P1', trigger: { type: 'on_haste_granted' }, effect: { kind: 'gain_resource', resource: 'score', ratio: 1 },
    }
    registerDynamicAffixV2(granted)
    equipAffixV2('skill_1', 'K', 'grant_self')
    expect(hookOnHasteEmitted('skill_1', lv1Base, fullRes, NOW).length).toBe(0)
  })
})
