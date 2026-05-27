// ============================================
// 打字肉鸽 - nest-build（gain_temp_skill）单元测试
// ============================================
// 覆盖：
//  1. 生成器 RECIPE_NEST_BUILD → gain_temp_skill effect · maintenance 段(非 tool·无 maxUses) · placement 合法 · trigger 非每键
//  2. nest_build ∈ META_RECIPE_KINDS（递归防护）
//  3. effect 结算 → tempSkillsGranted（recipe_pool spawn · 透传 placement）

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

  it('effect: source=recipe_pool · placement 仅 neighbors/all_skills · filter 带 hasTag', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateAffixV2(RECIPE_NEST_BUILD)
      const def = getAffixV2Definition(id)!
      expect(def.effect.kind).toBe('gain_temp_skill')
      if (def.effect.kind !== 'gain_temp_skill') continue
      expect(def.effect.source).toBe('recipe_pool')
      expect(['neighbors', 'all_skills']).toContain(def.effect.placement.type)
      expect(def.effect.filter.hasTag).toBeTruthy()   // 锁定一个行为族
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
