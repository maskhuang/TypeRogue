// ============================================
// 打字肉鸽 - nest-build（gain_temp_skill）单元测试
// ============================================
// 覆盖：
//  1. 生成器 RECIPE_NEST_BUILD → gain_temp_skill·source=self_copy effect · maintenance 段(非 tool·无 maxUses) · placement 合法 · trigger 非每键
//  2. nest_build ∈ META_RECIPE_KINDS（递归防护）
//  3. effect 结算 → tempSkillsGranted（self_copy 复制宿主·剥离自身词条 / recipe_pool 池 spawn · 透传 placement）

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateAffixV2, META_RECIPE_KINDS, RECIPE_NEST_BUILD } from '../../../src/data/affixV2Generator'
import { getAffixV2Definition } from '../../../src/data/affixV2'
import { resolveEffect, type ResolveContext } from '../../../src/systems/affixV2Effect'
import { resetAllAffixV2State } from '../../../src/systems/affixV2State'
import { removeTransientSkills } from '../../../src/systems/affixV2BattleIntegration'
import { bindShapeToKeys, getBindingState, getSkillAnchorKey } from '../../../src/systems/bindingManager'
import { state } from '../../../src/core/state'
import type { AffixSkillInstance } from '../../../src/data/affixes'
import { setSeededMode, setNormalMode } from '../../../src/core/seededRandom'

function makeSkill(id: string, transient: boolean): AffixSkillInstance {
  return {
    id, name: id, icon: '◆', resource: 'score',
    baseValues: [11], level: 1, rarity: 0 as never,
    affixes: [], enchantmentIds: [], shapeId: 'monomino', rotation: 0,
    ...(transient ? { transient: true } : {}),
  }
}

const baseCtx: ResolveContext = {
  instanceId: 'inst_nest',
  skillId: 'skill_host',
  key: 'F',
  skillResource: 'score',
  skillResourceLv1Base: 11,
  resourceLv1Base: (r) => ({ score: 11, time: 0.2, gold: 3, shield: 5 } as Record<string, number>)[r] ?? 1,
  nowMs: 1000,
  isCrit: false,
  currentWordLength: 5,
  hostSkillLevel: 1,
  getPlayerResource: () => 0,
}

beforeEach(() => {
  setSeededMode(42)
  resetAllAffixV2State()
})

afterEach(() => {
  setNormalMode()
})

describe('nest-build 生成器', () => {
  it('始终产出 gain_temp_skill effect · maintenance 段 · 非 tool · 无 maxUses', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateAffixV2(RECIPE_NEST_BUILD)
      const def = getAffixV2Definition(id)
      expect(def).toBeTruthy()
      expect(def!.effect.kind).toBe('gain_temp_skill')
      expect(def!.section).toBe('maintenance')
      expect(def!.tags).not.toContain('tool')
      expect(def!.maxUses).toBeUndefined()    // 非 tool 段 → 不 roll 使用次数
    }
  })

  it('effect: source=self_copy（生成本技能临时复制）· placement 仅 neighbors/all_skills · count=1', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateAffixV2(RECIPE_NEST_BUILD)
      const def = getAffixV2Definition(id)!
      expect(def.effect.kind).toBe('gain_temp_skill')
      if (def.effect.kind !== 'gain_temp_skill') continue
      expect(def.effect.source).toBe('self_copy')
      expect(['neighbors', 'all_skills']).toContain(def.effect.placement.type)
      expect(def.effect.count).toBe(1)
    }
  })

  it('trigger 随机抽：从不取每键 trigger(on_key)，且类型有多样性', () => {
    const types = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const id = generateAffixV2(RECIPE_NEST_BUILD)
      const def = getAffixV2Definition(id)!
      expect(def.trigger.type).not.toBe('on_key')   // 排除最高频（每键 spawn 会刷爆键盘）
      types.add(def.trigger.type)
    }
    expect(types.size).toBeGreaterThan(1)            // 随机抽 → 不退化成单一 trigger
  })

  it('nest_build 列入 META_RECIPE_KINDS（防被 spawn 出的技能递归筑巢）', () => {
    expect(META_RECIPE_KINDS.has('nest_build')).toBe(true)
  })
})

describe('gain_temp_skill effect 结算', () => {
  it('recipe_pool spawn → 产出 tempSkillsGranted · 透传 placement · 不污染 skillsGranted', () => {
    const r = resolveEffect(
      {
        kind: 'gain_temp_skill',
        filter: { hasTag: 'maintenance', notOwned: false },
        source: 'recipe_pool',
        count: 1,
        levelMode: 'inherit_host',
        fallback: 'widen',
        placement: { type: 'neighbors', posRel: 'adjacent' as never },
      },
      baseCtx,
    )
    expect(r.tempSkillsGranted.length).toBe(1)
    expect(r.skillsGranted.length).toBe(0)
    const tg = r.tempSkillsGranted[0]
    expect(tg.skill).toBeTruthy()
    expect(tg.skill.level).toBe(1)              // inherit_host = hostSkillLevel(1)
    expect(tg.placement.type).toBe('neighbors')
    expect(tg.sourceInstanceId).toBe('inst_nest')
  })

  it('self_copy → 复制宿主技能（继承资源/等级）· 剥离自身词条防递归 · tempSkillsGranted', () => {
    state.affixSkills.clear()
    state.affixSkills.set('skill_host', {
      id: 'skill_host', name: '宿主', icon: '◆', resource: 'gold',
      baseValues: [3, 6], level: 2, rarity: 1 as never,
      affixes: [], enchantmentIds: [], shapeId: 'monomino', rotation: 0,
      v2Ids: ['def_self', 'def_other'],
    } as AffixSkillInstance)
    const r = resolveEffect(
      { kind: 'gain_temp_skill', filter: {}, source: 'self_copy', count: 1, levelMode: 'inherit_host', placement: { type: 'all_skills' } },
      { ...baseCtx, skillId: 'skill_host', selfDefId: 'def_self', hostSkillLevel: 2 },
    )
    expect(r.tempSkillsGranted.length).toBe(1)
    const tg = r.tempSkillsGranted[0]
    expect(tg.skill.resource).toBe('gold')          // 复制宿主资源
    expect(tg.skill.level).toBe(2)                  // inherit_host
    expect(tg.skill.id).not.toBe('skill_host')      // 新实例
    expect(tg.skill.v2Ids).toEqual(['def_other'])   // 自身 nest_build 词条(def_self)被剥离 → 不递归
    expect(tg.placement.type).toBe('all_skills')
    state.affixSkills.clear()
  })

  it('count=2 → spawn 2 个临时技能', () => {
    const r = resolveEffect(
      {
        kind: 'gain_temp_skill',
        filter: { hasTag: 'maintenance', notOwned: false },
        source: 'recipe_pool',
        count: 2,
        levelMode: 'inherit_host',
        fallback: 'widen',
        placement: { type: 'all_skills' },
      },
      baseCtx,
    )
    expect(r.tempSkillsGranted.length).toBe(2)
    for (const tg of r.tempSkillsGranted) expect(tg.placement.type).toBe('all_skills')
  })
})

describe('removeTransientSkills · 战斗结束移除临时技能', () => {
  beforeEach(() => {
    state.affixSkills.clear()
    state.affixSkillStates.clear()
    state.player.skills.clear()
    state.player.bindings.clear()
  })

  it('移除 transient 技能（解绑 + 删注册），保留普通技能', () => {
    const temp = makeSkill('temp_1', true)
    const perm = makeSkill('perm_1', false)
    const bs = getBindingState(state)
    for (const sk of [temp, perm]) {
      state.affixSkills.set(sk.id, sk)
      state.player.skills.set(sk.id, { level: sk.level })
    }
    bindShapeToKeys(bs, 'temp_1', 'j')
    bindShapeToKeys(bs, 'perm_1', 'k')
    expect(getSkillAnchorKey(bs, 'temp_1')).toBe('j')

    removeTransientSkills()

    // transient 全清：注册表 + 绑定 + player.skills
    expect(state.affixSkills.has('temp_1')).toBe(false)
    expect(state.player.skills.has('temp_1')).toBe(false)
    expect(getSkillAnchorKey(bs, 'temp_1')).toBeUndefined()
    expect(state.player.bindings.has('j')).toBe(false)
    // 普通技能不受影响
    expect(state.affixSkills.has('perm_1')).toBe(true)
    expect(getSkillAnchorKey(bs, 'perm_1')).toBe('k')
  })

  it('无 transient 技能时幂等（不抛、不动普通技能）', () => {
    state.affixSkills.set('perm_1', makeSkill('perm_1', false))
    expect(() => removeTransientSkills()).not.toThrow()
    expect(state.affixSkills.has('perm_1')).toBe(true)
  })
})
