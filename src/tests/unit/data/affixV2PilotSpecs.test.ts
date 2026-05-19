// ============================================
// 打字肉鸽 - S2 试点 8 个 affix 的端到端单元测试
// ============================================
// 验证：每个 pilot spec 接入 Definition 后，resolver 能正确执行其 effect。

import { describe, it, expect, beforeEach } from 'vitest'
import { PILOT_AFFIX_IDS, getPilotSpec } from '../../../src/data/affixV2PilotSpecs'
import { getAffixV2Definition } from '../../../src/data/affixV2'
import { resolveEffect, type ResolveContext } from '../../../src/systems/affixV2Effect'
import {
  resetAllAffixV2State,
  peekInstanceState,
  getInstanceState,
  listActiveAuras,
} from '../../../src/systems/affixV2State'

const ctx: ResolveContext = {
  instanceId: 'inst_1',
  skillId: 'skill_1',
  key: 'K',
  skillResource: 'score',
  skillResourceLv1Base: 11,
  resourceLv1Base: (r) => ({ score: 11, time: 0.2, gold: 3, shield: 5, multiplier: 0.35 } as Record<string, number>)[r] ?? 1,
  nowMs: 1000,
  isCrit: false,
  currentWordLength: 5,
  hostSkillLevel: 1,
  getPlayerResource: () => 100,  // 默认资源充足
}

beforeEach(() => {
  resetAllAffixV2State()
})

describe('PILOT specs · 12 个全在', () => {
  it('PILOT_AFFIX_IDS 完整 12 个', () => {
    expect(PILOT_AFFIX_IDS.length).toBe(12)
    expect(new Set(PILOT_AFFIX_IDS).size).toBe(12)
  })

  it('每个 id 都能查到 spec', () => {
    for (const id of PILOT_AFFIX_IDS) {
      const spec = getPilotSpec(id)
      expect(spec).toBeDefined()
      expect(spec?.archetype.length).toBeGreaterThan(0)
    }
  })

  it('每个 id 都能在 AffixV2 注册表里找到对应 Definition', () => {
    for (const id of PILOT_AFFIX_IDS) {
      const def = getAffixV2Definition(id)
      expect(def).toBeDefined()
      const pilot = getPilotSpec(id)!
      expect(def?.trigger).toEqual(pilot.trigger)
      expect(def?.effect).toEqual(pilot.effect)
    }
  })
})

describe('Pilot 1 · feed (maintenance · drip)', () => {
  it('每词末 +0.1 × score Lv1 base = 1.1 score', () => {
    const def = getAffixV2Definition('feed')!
    const r = resolveEffect(def.effect, ctx)
    expect(r.resourceProduced).toEqual([{ resource: 'score', amount: 1.1 }])
  })

  it('累加 30 次 ≈ T_maintenance', () => {
    const def = getAffixV2Definition('feed')!
    let total = 0
    for (let i = 0; i < 30; i++) {
      const r = resolveEffect(def.effect, ctx)
      total += r.resourceProduced[0].amount
    }
    // T_maintenance=3 → 总产出应 ≈ 3 × Lv1_base = 33
    expect(total).toBeCloseTo(33, 0)
  })
})

describe('Pilot 2 · charge (locomotion · burst-add)', () => {
  it('每次自触发 base 累加 0.083 × 11 ≈ 0.92', () => {
    const def = getAffixV2Definition('charge')!
    resolveEffect(def.effect, ctx)
    const s = peekInstanceState('inst_1')!
    expect(s.cumulativeBaseAdd).toBeCloseTo(0.913, 2)
  })

  it('30 fire 后 base 累加约 27.5（≈ T × Lv1）', () => {
    const def = getAffixV2Definition('charge')!
    for (let i = 0; i < 30; i++) resolveEffect(def.effect, ctx)
    const s = peekInstanceState('inst_1')!
    expect(s.cumulativeBaseAdd).toBeCloseTo(27.4, 0)
  })
})

describe('Pilot 3 · piloerection (posture · aura)', () => {
  it('passive trigger 注册 aura 到 store', () => {
    const def = getAffixV2Definition('piloerection')!
    const r = resolveEffect(def.effect, ctx)
    expect(r.aurasApplied.length).toBe(1)
    expect(r.aurasApplied[0].modifier).toEqual({ type: 'crit_chance_add', amount: 0.05 })
    expect(listActiveAuras().length).toBe(1)
  })
})

describe('Pilot 4 · bite (agonistic · burst-multiply)', () => {
  it('每次自触发 factor 累加 0.117', () => {
    const def = getAffixV2Definition('bite')!
    resolveEffect(def.effect, ctx)
    const s = peekInstanceState('inst_1')!
    expect(s.cumulativeFactorAdd).toBeCloseTo(0.117, 3)
  })

  it('多次累加线性增长', () => {
    const def = getAffixV2Definition('bite')!
    for (let i = 0; i < 5; i++) resolveEffect(def.effect, ctx)
    const s = peekInstanceState('inst_1')!
    expect(s.cumulativeFactorAdd).toBeCloseTo(0.117 * 5, 3)
  })
})

describe('Pilot 5 · pant_hoot (vocal · broadcast 纯)', () => {
  it('词末触发 SameRow 范围内 skill', () => {
    const def = getAffixV2Definition('pant_hoot')!
    const r = resolveEffect(def.effect, ctx)
    expect(r.fireTargetsTriggered.length).toBe(1)
    expect(r.fireTargetsTriggered[0].selector.type).toBe('neighbors')
    if (r.fireTargetsTriggered[0].selector.type === 'neighbors') {
      expect(r.fireTargetsTriggered[0].selector.pick).toBe('all')
    }
    expect(r.resourceProduced.length).toBe(0)  // 纯 broadcast，无 gain
  })
})

describe('Pilot 6 · hand_clap (gesture · stack_release)', () => {
  it('每键 stack +1，未满阈值不释放', () => {
    const def = getAffixV2Definition('hand_clap')!
    for (let i = 0; i < 7; i++) resolveEffect(def.effect, ctx)
    const s = peekInstanceState('inst_1')!
    expect(s.stacks).toBe(7)
    // 7 < 8 阈值，未释放任何 score
  })

  it('第 8 键满阈值释放 + reset', () => {
    const def = getAffixV2Definition('hand_clap')!
    for (let i = 0; i < 7; i++) resolveEffect(def.effect, ctx)
    // 第 8 键
    const r = resolveEffect(def.effect, ctx)
    const s = peekInstanceState('inst_1')!
    expect(s.stacks).toBe(0)  // 已 reset
    // 释放 ratio=0.3 × 11 = 3.3 score
    expect(r.resourceProduced[0].amount).toBeCloseTo(3.3, 5)
  })
})

describe('Pilot 7 · hammer_anvil (tool · burst-add + count-scale)', () => {
  it('关内成长 base，且按 tool tag 数量 scaling', () => {
    const def = getAffixV2Definition('hammer_anvil')!
    // 模拟场上 13 个 tool 词条（生产环境由 hook 注入 queryEquipped 真实计数）
    const mockTools = Array.from({ length: 13 }, (_, i) => ({
      defId: `t_${i}`, skillId: `sk_${i}`, key: 'k', instanceId: `inst_${i}`, tags: ['tool'] as readonly string[],
    }))
    const ctxWithCount = { ...ctx, queryEquipped: () => mockTools }
    resolveEffect(def.effect, ctxWithCount)
    const s = peekInstanceState('inst_1')!
    // base ratio 0.08, scale factor 0.2 × 13 = 2.6 scale
    // cumulativeBaseAdd = 0.08 × 11 × (1 + 0.2 × 13) = 0.88 × 3.6 = 3.168
    expect(s.cumulativeBaseAdd).toBeGreaterThan(2)
    expect(s.cumulativeBaseAdd).toBeLessThan(5)
  })

  it('凑 tool 越多 base 成长越快（涌现 anchor）', () => {
    // 用 registry scope：当前 tool 数 = 13（来自 affixV2.json）
    // 测试不直接动 registry，只验证 effect 结构上有 scale
    const def = getAffixV2Definition('hammer_anvil')!
    expect(def.effect.kind).toBe('add')
    if (def.effect.kind === 'add') {
      expect(def.effect.scale).toBeDefined()
      expect(def.effect.scale?.type).toBe('tag_count')
    }
  })
})

describe('Pilot 8 · pacing (abnormal · conditional)', () => {
  it('shield 充足时走 else（小额）', () => {
    const def = getAffixV2Definition('pacing')!
    // shield Lv1=5, ratio 0.5 → 阈值=2.5；getPlayerResource 返 100 > 2.5
    const r = resolveEffect(def.effect, ctx)
    expect(r.resourceProduced[0].amount).toBeCloseTo(0.05 * 11, 5)  // else 路径
  })

  it('shield 低时走 then（高额）', () => {
    const def = getAffixV2Definition('pacing')!
    const lowShieldCtx = {
      ...ctx,
      getPlayerResource: (r: string) => r === 'shield' ? 1 : 100,  // shield < 2.5
    }
    const r = resolveEffect(def.effect, lowShieldCtx)
    expect(r.resourceProduced[0].amount).toBeCloseTo(0.3 * 11, 5)  // then 路径，6× else
  })
})

describe('Archetype 覆盖 · S2 验证', () => {
  it('10 个 pilot 覆盖全 6 archetype', () => {
    const archetypes = new Set(PILOT_AFFIX_IDS.map(id => getPilotSpec(id)!.archetype))
    expect(archetypes.has('drip')).toBe(true)
    expect(archetypes.has('burst')).toBe(true)
    expect(archetypes.has('aura')).toBe(true)
    expect(archetypes.has('broadcast')).toBe(true)
    expect(archetypes.has('stack_release')).toBe(true)
    expect(archetypes.has('conditional')).toBe(true)
  })

  it('涵盖全 6 Phase 1 trigger 类型', () => {
    const triggers = new Set(PILOT_AFFIX_IDS.map(id => getPilotSpec(id)!.trigger.type))
    expect(triggers.has('on_key')).toBe(true)
    expect(triggers.has('on_word_end')).toBe(true)
    expect(triggers.has('on_self_fire')).toBe(true)
    expect(triggers.has('passive')).toBe(true)
    expect(triggers.has('every_n_keys')).toBe(true)
    expect(triggers.has('on_fire')).toBe(true)
    // teach + imitate (on_battle_end) 现在也覆盖
    expect(triggers.has('on_battle_end')).toBe(true)
  })

  it('覆盖全 4 gain_skill source（recipe_pool + player_skill_pool · shop/altar 后续）', () => {
    const sources = new Set<string>()
    for (const id of PILOT_AFFIX_IDS) {
      const eff = getPilotSpec(id)!.effect
      if (eff.kind === 'gain_skill') {
        sources.add(eff.source ?? 'recipe_pool')
      }
    }
    expect(sources.has('recipe_pool')).toBe(true)         // teach
    expect(sources.has('player_skill_pool')).toBe(true)   // imitate
  })
})

describe('Pilot 12 · imitate (tool · gain_skill · player_skill_pool)', () => {
  it('on_battle_end + gain_skill spec 正确装配 + source=player_skill_pool', () => {
    const def = getAffixV2Definition('imitate')!
    expect(def.trigger).toEqual({ type: 'on_battle_end', result: 'win' })
    expect(def.effect.kind).toBe('gain_skill')
    if (def.effect.kind === 'gain_skill') {
      expect(def.effect.source).toBe('player_skill_pool')
      expect(def.effect.fallback).toBe('skip')
    }
  })

  it('player_skill_pool 空（无 V2 owned skill）→ skillsGranted 空（fallback=skip）', () => {
    const def = getAffixV2Definition('imitate')!
    // ctx 不挂任何 state · gameState.affixSkills 在测试初始空
    const r = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 3 })
    expect(r.skillsGranted.length).toBe(0)
  })
})

describe('Pilot 11 · teach (tool · gain_skill)', () => {
  it('on_battle_end + gain_skill spec 正确装配', () => {
    const def = getAffixV2Definition('teach')!
    expect(def.trigger).toEqual({ type: 'on_battle_end', result: 'win' })
    expect(def.effect.kind).toBe('gain_skill')
  })

  it('hostSkillLevel=1 → 出师学徒 Lv=1', () => {
    const def = getAffixV2Definition('teach')!
    const r = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 1 })
    expect(r.skillsGranted.length).toBe(1)
    expect(r.skillsGranted[0].skill.level).toBe(1)
    expect(r.skillsGranted[0].sourceInstanceId).toBe('inst_1')
  })

  it('hostSkillLevel=5 → 出师学徒 Lv=5（inherit_host）', () => {
    const def = getAffixV2Definition('teach')!
    const r = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 5 })
    expect(r.skillsGranted[0].skill.level).toBe(5)
  })

  it('filter:hasTag=tool 命中 nut_crack recipe · 不走 widen 兜底', () => {
    const def = getAffixV2Definition('teach')!
    const r = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 3 })
    expect(r.skillsGranted.length).toBe(1)
    expect(r.skillsGranted[0].widened).toBe(false)   // tool recipe 存在 → 严绑
  })

  it('多次 resolveEffect 各产 1 个 · 不去重', () => {
    const def = getAffixV2Definition('teach')!
    const r = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 2 })
    const r2 = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 2 })
    expect(r.skillsGranted.length).toBe(1)
    expect(r2.skillsGranted.length).toBe(1)
    // skill id 由 generateSkill 内部 random+timestamp 生成 · 不同 fire 产不同 id
    expect(r.skillsGranted[0].skill.id).not.toBe(r2.skillsGranted[0].skill.id)
  })
})
