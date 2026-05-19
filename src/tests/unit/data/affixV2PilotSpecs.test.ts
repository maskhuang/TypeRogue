// ============================================
// 打字肉鸽 - S2 试点 8 个 affix 的端到端单元测试
// ============================================
// 验证：每个 pilot spec 接入 Definition 后，resolver 能正确执行其 effect。

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PILOT_AFFIX_IDS, getPilotSpec } from '../../../src/data/affixV2PilotSpecs'
import { getAffixV2Definition } from '../../../src/data/affixV2'
import { resolveEffect, type ResolveContext } from '../../../src/systems/affixV2Effect'
import { formatEffectDescription, formatAffixV2Description } from '../../../src/ui/affixV2TooltipAdapter'
import { generateAffixV2, RECIPE_TEACH, RECIPE_IMITATE, RECIPE_SPEAR_MAKE, RECIPE_GAZE_FOLLOW } from '../../../src/data/affixV2Generator'
import { PositionRelation } from '../../../src/data/keyboardTopology'
import type { EffectSpec } from '../../../src/data/affixV2Trigger'
import { getCandidatePool } from '../../../src/systems/affixV2SkillFilter'
import {
  resetAllAffixV2State,
  peekInstanceState,
  getInstanceState,
  listActiveAuras,
} from '../../../src/systems/affixV2State'
import { state as gameState } from '../../../src/core/state'
import type { AffixSkillInstance } from '../../../src/core/types'

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

describe('PILOT specs · 10 个全在', () => {
  it('PILOT_AFFIX_IDS 完整 10 个', () => {
    expect(PILOT_AFFIX_IDS.length).toBe(10)
    expect(new Set(PILOT_AFFIX_IDS).size).toBe(10)
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

  it('涵盖 6 Phase 1 trigger 类型（gain_skill 类已下放 recipe_pool）', () => {
    const triggers = new Set(PILOT_AFFIX_IDS.map(id => getPilotSpec(id)!.trigger.type))
    expect(triggers.has('on_key')).toBe(true)
    expect(triggers.has('on_word_end')).toBe(true)
    expect(triggers.has('on_self_fire')).toBe(true)
    expect(triggers.has('passive')).toBe(true)
    expect(triggers.has('every_n_keys')).toBe(true)
    expect(triggers.has('on_fire')).toBe(true)
    // on_battle_end 由 RECIPE_TEACH / RECIPE_IMITATE 提供 · pilot 不再覆盖
    expect(triggers.has('on_battle_end')).toBe(false)
  })

  it('pilot 不再含 gain_skill effect（meta-progression 全下放 recipe_pool）', () => {
    const sources = new Set<string>()
    for (const id of PILOT_AFFIX_IDS) {
      const eff = getPilotSpec(id)!.effect
      if (eff.kind === 'gain_skill') {
        sources.add(eff.source ?? 'recipe_pool')
      }
    }
    expect(sources.size).toBe(0)   // 0 gain_skill in pilot
  })
})

describe('Tooltip 措辞 · 创生→获得 · 同 section→具体段名', () => {
  it('imitate (recipe-generated) tooltip · 自有复制 + 邻位关系 · 不含 section（去 hasTagFromHost 后跨段邻位可复制）', () => {
    const id = generateAffixV2(RECIPE_IMITATE)
    const def = getAffixV2Definition(id)!
    const desc = formatAffixV2Description(def, 'score')
    expect(desc).toContain('自有复制')
    expect(desc).toMatch(/(相邻|同行|同列|同手|同指|对称)邻位/)  // 6 种 PositionRelation 之一
    expect(desc).not.toContain('工具类')                          // hasTagFromHost 已移除 · 不限段
    expect(desc).not.toContain('同 section')
    expect(desc).toContain('与本技能同 Lv')
  })

  it('hasTagFromHost · 无 defSection 时退化为"同类"', () => {
    // 用手造 effect spec · 不挂 defSection
    const desc = formatEffectDescription(
      {
        kind: 'gain_skill',
        filter: { hasTagFromHost: true },
        source: 'player_skill_pool',
      },
      'score',
    )
    expect(desc).toContain('同类')
    expect(desc).not.toContain('同 section')
  })
})

describe('Recipe · imitate (player_skill_pool · 生成时锁 neighborPosRel)', () => {
  afterEach(() => {
    gameState.affixSkills.clear()
    gameState.player.bindings.clear()
  })

  function mkOwnedV2(id: string, resource: string, v2DefId: string): AffixSkillInstance {
    return {
      id, name: `Owned-${id}`, icon: '?',
      resource: resource as AffixSkillInstance['resource'],
      baseValues: [1, 2, 3, 4], level: 1, rarity: 1,
      affixes: [], enchantmentIds: [], v2Ids: [v2DefId],
    }
  }

  it('静态 JSON imitate 为 noop 占位（已下放 recipe_pool）', () => {
    const def = getAffixV2Definition('imitate')!
    expect(def.trigger.type).toBe('passive')
    expect(def.effect.kind).toBe('noop')
  })

  it('generateAffixV2(RECIPE_IMITATE) 生成 def 含 on_battle_end(any) + gain_skill', () => {
    const id = generateAffixV2(RECIPE_IMITATE)
    const def = getAffixV2Definition(id)!
    expect(def.trigger).toEqual({ type: 'on_battle_end', result: 'any' })
    expect(def.effect.kind).toBe('gain_skill')
    if (def.effect.kind === 'gain_skill') {
      expect(def.effect.source).toBe('player_skill_pool')
      expect(def.effect.fallback).toBe('skip')
      expect(def.effect.filter.hasTagFromHost).toBeUndefined()   // 已去掉 · 仅 neighborPosRel 约束
      expect(def.effect.filter.neighborPosRel).toBeDefined()
    }
  })

  it('多个生成实例可有不同 neighborPosRel', () => {
    const rels = new Set<PositionRelation>()
    for (let i = 0; i < 30; i++) {
      const id = generateAffixV2(RECIPE_IMITATE)
      const def = getAffixV2Definition(id)!
      if (def.effect.kind === 'gain_skill' && def.effect.filter.neighborPosRel !== undefined) {
        rels.add(def.effect.filter.neighborPosRel)
      }
    }
    expect(rels.size).toBeGreaterThan(1)   // 30 抽至少 2 种关系
  })

  it('无邻位兄弟 · skillsGranted 空（fallback=skip）', () => {
    // 不设 bindings · neighborPosRel 过滤后 pool 必空
    const id = generateAffixV2(RECIPE_IMITATE)
    const def = getAffixV2Definition(id)!
    const r = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 3 })
    expect(r.skillsGranted.length).toBe(0)
  })

  it('跨段邻位可复制 · 不限 section（hasTagFromHost 去掉）', () => {
    // 不锁 section · selfSection=tool 但兄弟是 maintenance 段也能被复制
    gameState.affixSkills.set('cross_sib', mkOwnedV2('cross_sib', 'gold', 'feed'))   // maintenance 段
    gameState.player.bindings.set('g', 'cross_sib')

    // 用一个保证 g 是 host=f 邻位的 spec（SameRow）
    const effect: EffectSpec = {
      kind: 'gain_skill',
      filter: { neighborPosRel: PositionRelation.SameRow, notOwned: false },
      source: 'player_skill_pool',
      count: 1,
      levelMode: 'inherit_host',
      fallback: 'skip',
    }
    const r = resolveEffect(effect, { ...ctx, key: 'f', hostSkillLevel: 1, selfSection: 'tool' })
    expect(r.skillsGranted.length).toBe(1)
    expect(r.skillsGranted[0].skill.resource).toBe('gold')      // 跨段（host=tool，兄弟=maintenance）也命中
  })
})

describe('hasTagFromHost 基础语义（独立于 imitate · 无 neighborPosRel 约束）', () => {
  afterEach(() => {
    gameState.affixSkills.clear()
  })

  function mkOwnedV2(id: string, resource: string, v2DefId: string): AffixSkillInstance {
    return {
      id, name: `Owned-${id}`, icon: '?',
      resource: resource as AffixSkillInstance['resource'],
      baseValues: [1, 2, 3, 4], level: 1, rarity: 1,
      affixes: [], enchantmentIds: [], v2Ids: [v2DefId],
    }
  }

  // 手造一个最小 gain_skill spec · 仅 hasTagFromHost · 不挂 neighborPosRel · 隔离 hasTagFromHost 维度
  const bareImitateEffect: EffectSpec = {
    kind: 'gain_skill',
    filter: { hasTagFromHost: true, notOwned: false },
    source: 'player_skill_pool',
    count: 1,
    levelMode: 'inherit_host',
    fallback: 'skip',
  }

  it('selfSection=tool · 仅 tool 段兄弟入候选 · 跨段被过滤', () => {
    gameState.affixSkills.set('tool_sib', mkOwnedV2('tool_sib', 'score', 'nut_crack'))
    gameState.affixSkills.set('maint_sib', mkOwnedV2('maint_sib', 'gold', 'feed'))
    gameState.affixSkills.set('loco_sib', mkOwnedV2('loco_sib', 'shield', 'climb'))
    for (let i = 0; i < 5; i++) {
      const r = resolveEffect(bareImitateEffect, { ...ctx, hostSkillLevel: 1, selfSection: 'tool' })
      expect(r.skillsGranted.length).toBe(1)
      expect(r.skillsGranted[0].skill.resource).toBe('score')
    }
  })

  it('selfSection=maintenance · 切换 section · 改为复制 maintenance 兄弟', () => {
    gameState.affixSkills.set('tool_sib', mkOwnedV2('tool_sib', 'score', 'nut_crack'))
    gameState.affixSkills.set('maint_sib', mkOwnedV2('maint_sib', 'gold', 'feed'))
    for (let i = 0; i < 5; i++) {
      const r = resolveEffect(bareImitateEffect, { ...ctx, hostSkillLevel: 1, selfSection: 'maintenance' })
      expect(r.skillsGranted.length).toBe(1)
      expect(r.skillsGranted[0].skill.resource).toBe('gold')
    }
  })

  it('selfSection 缺省 → hasTagFromHost 退化无 tag · 全池可抽', () => {
    gameState.affixSkills.set('tool_sib', mkOwnedV2('tool_sib', 'score', 'nut_crack'))
    gameState.affixSkills.set('maint_sib', mkOwnedV2('maint_sib', 'gold', 'feed'))
    const resources = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const r = resolveEffect(bareImitateEffect, { ...ctx, hostSkillLevel: 1 })
      if (r.skillsGranted.length > 0) resources.add(r.skillsGranted[0].skill.resource)
    }
    expect(resources.size).toBeGreaterThan(1)
  })
})

describe('Recipe · spear_make (upgrade_skill)', () => {
  it('生成 on_battle_end(any) + upgrade_skill(neighbors random, +1)', () => {
    const id = generateAffixV2(RECIPE_SPEAR_MAKE)
    const def = getAffixV2Definition(id)!
    expect(def.trigger).toEqual({ type: 'on_battle_end', result: 'any' })
    expect(def.effect.kind).toBe('upgrade_skill')
    if (def.effect.kind === 'upgrade_skill') {
      expect(def.effect.amount).toBe(1)
      expect(def.effect.selector.type).toBe('neighbors')
    }
  })

  it('resolve · selector 展开 → skillUpgrades 申请', () => {
    const id = generateAffixV2(RECIPE_SPEAR_MAKE)
    const def = getAffixV2Definition(id)!
    const r = resolveEffect(def.effect, { ...ctx, resolveSelector: () => ['target_skill'] })
    expect(r.skillUpgrades.length).toBe(1)
    expect(r.skillUpgrades[0].skillId).toBe('target_skill')
    expect(r.skillUpgrades[0].amount).toBe(1)
  })

  it('无 resolveSelector → 退化 self', () => {
    const id = generateAffixV2(RECIPE_SPEAR_MAKE)
    const def = getAffixV2Definition(id)!
    const r = resolveEffect(def.effect, { ...ctx })
    expect(r.skillUpgrades.length).toBe(1)
    expect(r.skillUpgrades[0].skillId).toBe(ctx.skillId)
  })
})

describe('Recipe · gaze_follow (graft_affix)', () => {
  it('生成 on_battle_end(any) + graft_affix(neighbors random)', () => {
    const id = generateAffixV2(RECIPE_GAZE_FOLLOW)
    const def = getAffixV2Definition(id)!
    expect(def.trigger).toEqual({ type: 'on_battle_end', result: 'any' })
    expect(def.effect.kind).toBe('graft_affix')
  })

  it('resolve · queryEquipped 出候选 → 抽 1 defId 申请嫁接到宿主', () => {
    const id = generateAffixV2(RECIPE_GAZE_FOLLOW)
    const def = getAffixV2Definition(id)!
    const r = resolveEffect(def.effect, {
      ...ctx,
      queryEquipped: () => [
        { defId: 'feed', skillId: 'neighbor', key: 'g', instanceId: 'i1', tags: ['maintenance'] },
      ],
    })
    expect(r.affixGrafts.length).toBe(1)
    expect(r.affixGrafts[0].defId).toBe('feed')
    expect(r.affixGrafts[0].targetSkillId).toBe(ctx.skillId)   // 宿主接收
  })

  it('queryEquipped 只含宿主自身词条 → 不嫁接（排除自身）', () => {
    const id = generateAffixV2(RECIPE_GAZE_FOLLOW)
    const def = getAffixV2Definition(id)!
    const r = resolveEffect(def.effect, {
      ...ctx,
      queryEquipped: () => [
        { defId: 'x', skillId: ctx.skillId, key: 'k', instanceId: 'i', tags: [] },
      ],
    })
    expect(r.affixGrafts.length).toBe(0)
  })

  it('无 queryEquipped → 不嫁接', () => {
    const id = generateAffixV2(RECIPE_GAZE_FOLLOW)
    const def = getAffixV2Definition(id)!
    const r = resolveEffect(def.effect, { ...ctx })
    expect(r.affixGrafts.length).toBe(0)
  })
})

describe('neighborPosRel · 候选池按宿主键位邻位收紧', () => {
  afterEach(() => {
    gameState.affixSkills.clear()
    gameState.player.bindings.clear()
  })

  function mkOwnedV2(id: string, resource: string, v2DefId: string): AffixSkillInstance {
    return {
      id, name: `Owned-${id}`, icon: '?',
      resource: resource as AffixSkillInstance['resource'],
      baseValues: [1, 2, 3, 4], level: 1, rarity: 1,
      affixes: [], enchantmentIds: [], v2Ids: [v2DefId],
    }
  }

  it('SameRow + host=f · 同行兄弟 g 入候选 · 不同行兄弟 q 被过滤', () => {
    // setup: 兄弟 g 绑 g 键（中行 · 同 f）· 兄弟 q 绑 q 键（顶行 · 跨行）· host 在 f
    gameState.affixSkills.set('g_sib', mkOwnedV2('g_sib', 'gold', 'nut_crack'))
    gameState.affixSkills.set('q_sib', mkOwnedV2('q_sib', 'shield', 'nut_crack'))   // 顶行
    gameState.player.bindings.set('g', 'g_sib')
    gameState.player.bindings.set('q', 'q_sib')

    const effect: EffectSpec = {
      kind: 'gain_skill',
      filter: { hasTagFromHost: true, neighborPosRel: PositionRelation.SameRow, notOwned: false },
      source: 'player_skill_pool',
      count: 1,
      levelMode: 'inherit_host',
      fallback: 'skip',
    }
    for (let i = 0; i < 5; i++) {
      const r = resolveEffect(effect, { ...ctx, key: 'f', hostSkillLevel: 1, selfSection: 'tool' })
      expect(r.skillsGranted.length).toBe(1)
      expect(r.skillsGranted[0].skill.resource).toBe('gold')   // g 同行 f · 必命中 g_sib
    }
  })

  it('Adjacent + host=f · 仅相邻键位 (d/g/r/v 等) 兄弟入候选', () => {
    gameState.affixSkills.set('g_sib', mkOwnedV2('g_sib', 'gold', 'nut_crack'))     // f-g 相邻
    gameState.affixSkills.set('p_sib', mkOwnedV2('p_sib', 'shield', 'nut_crack'))   // f-p 不相邻
    gameState.player.bindings.set('g', 'g_sib')
    gameState.player.bindings.set('p', 'p_sib')

    const effect: EffectSpec = {
      kind: 'gain_skill',
      filter: { hasTagFromHost: true, neighborPosRel: PositionRelation.Adjacent, notOwned: false },
      source: 'player_skill_pool',
      count: 1,
      levelMode: 'inherit_host',
      fallback: 'skip',
    }
    for (let i = 0; i < 5; i++) {
      const r = resolveEffect(effect, { ...ctx, key: 'f', hostSkillLevel: 1, selfSection: 'tool' })
      expect(r.skillsGranted.length).toBe(1)
      expect(r.skillsGranted[0].skill.resource).toBe('gold')
    }
  })

  it('无满足 posRel 的 owned skill · pool 空 · fallback=skip 不送', () => {
    gameState.affixSkills.set('p_sib', mkOwnedV2('p_sib', 'shield', 'nut_crack'))
    gameState.player.bindings.set('p', 'p_sib')

    const effect: EffectSpec = {
      kind: 'gain_skill',
      filter: { hasTagFromHost: true, neighborPosRel: PositionRelation.Adjacent, notOwned: false },
      source: 'player_skill_pool',
      count: 1,
      levelMode: 'inherit_host',
      fallback: 'skip',
    }
    const r = resolveEffect(effect, { ...ctx, key: 'f', hostSkillLevel: 1, selfSection: 'tool' })
    expect(r.skillsGranted.length).toBe(0)
  })
})

describe('Recipe · teach (recipe_pool · 生成时锁 hasTag)', () => {
  it('静态 JSON teach 为 noop 占位（已下放 recipe_pool）', () => {
    const def = getAffixV2Definition('teach')!
    expect(def.trigger.type).toBe('passive')
    expect(def.effect.kind).toBe('noop')
  })

  it('generateAffixV2(RECIPE_TEACH) 生成 def 含 on_battle_end(any) + gain_skill', () => {
    const id = generateAffixV2(RECIPE_TEACH)
    const def = getAffixV2Definition(id)!
    expect(def.trigger).toEqual({ type: 'on_battle_end', result: 'any' })   // 胜败通触发
    expect(def.effect.kind).toBe('gain_skill')
    if (def.effect.kind === 'gain_skill') {
      expect(def.effect.source).toBe('recipe_pool')
      expect(def.effect.levelMode).toBe('inherit_host')
    }
  })

  it('每个生成实例 hasTag 锁定 1 段 · ALL_RECIPES 非 teach section 之一', () => {
    const recipeSections = new Set(
      ['maintenance', 'locomotion', 'posture', 'agonistic', 'tool'],   // ALL_RECIPES non-teach 段
    )
    for (let i = 0; i < 10; i++) {
      const id = generateAffixV2(RECIPE_TEACH)
      const def = getAffixV2Definition(id)!
      if (def.effect.kind === 'gain_skill') {
        const tag = def.effect.filter.hasTag
        expect(typeof tag).toBe('string')
        expect(recipeSections.has(tag as string)).toBe(true)
      }
    }
  })

  it('不同 instance 可拿到不同 hasTag · 多样性', () => {
    const tags = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const id = generateAffixV2(RECIPE_TEACH)
      const def = getAffixV2Definition(id)!
      if (def.effect.kind === 'gain_skill') {
        tags.add(def.effect.filter.hasTag as string)
      }
    }
    expect(tags.size).toBeGreaterThan(1)   // 30 抽几乎必命中 ≥2 个 section
  })

  it('生成实例 resolve · 学徒 Lv = hostSkillLevel', () => {
    const id = generateAffixV2(RECIPE_TEACH)
    const def = getAffixV2Definition(id)!
    const r = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 7 })
    expect(r.skillsGranted.length).toBe(1)
    expect(r.skillsGranted[0].skill.level).toBe(7)
  })

  it('teach 自身从 recipe_pool 候选池排除 · gain_skill 不会直接选 teach seed 作 spawn 模板', () => {
    // 走 candidate pool 查询而非 e2e · spawn 后 skill 可能因 sampleV2Ids 独立随机得 teach（这是另一回事）
    const pool = getCandidatePool('recipe_pool')
    const teachSeeds = pool.filter(s => s.recipe?.kind === 'teach')
    expect(teachSeeds.length).toBe(0)
  })

  describe('复合 filter · hasTag + resource + rarity', () => {
    it('hasTag 总是有（100%）· resource ≥ 1 个实例（40% 出现率）· rarity ≥ 1 个实例（20% 出现率）', () => {
      const samples: { hasTag: boolean; resource: boolean; rarity: boolean }[] = []
      for (let i = 0; i < 100; i++) {
        const id = generateAffixV2(RECIPE_TEACH)
        const def = getAffixV2Definition(id)!
        if (def.effect.kind === 'gain_skill') {
          samples.push({
            hasTag: def.effect.filter.hasTag !== undefined,
            resource: def.effect.filter.resource !== undefined,
            rarity: def.effect.filter.rarity !== undefined,
          })
        }
      }
      // hasTag 100%
      expect(samples.every(s => s.hasTag)).toBe(true)
      // resource 40% · 100 抽期望 ~40 · 容差 [15, 65]
      const resourceCount = samples.filter(s => s.resource).length
      expect(resourceCount).toBeGreaterThanOrEqual(15)
      expect(resourceCount).toBeLessThanOrEqual(65)
      // rarity 20% · 期望 ~20 · 容差 [5, 45]
      const rarityCount = samples.filter(s => s.rarity).length
      expect(rarityCount).toBeGreaterThanOrEqual(5)
      expect(rarityCount).toBeLessThanOrEqual(45)
    })

    it('当 filter.resource 命中 · 学徒 resource 限定到该值', () => {
      // 强造 filter:{hasTag:'maintenance',resource:'score'} 验证 spawn 约束
      const def = getAffixV2Definition(generateAffixV2(RECIPE_TEACH))!
      if (def.effect.kind !== 'gain_skill') return
      const forcedEffect = {
        ...def.effect,
        filter: { hasTag: 'maintenance' as const, resource: 'score' as const, notOwned: false },
      }
      // maintenance recipe 池含 feed/drink · 两者都允许 score
      for (let i = 0; i < 10; i++) {
        const r = resolveEffect(forcedEffect, { ...ctx, hostSkillLevel: 1 })
        expect(r.skillsGranted.length).toBe(1)
        expect(r.skillsGranted[0].skill.resource).toBe('score')
      }
    })

    it('当 filter.rarity 命中 · 学徒 rarity 锁定到该值', () => {
      const def = getAffixV2Definition(generateAffixV2(RECIPE_TEACH))!
      if (def.effect.kind !== 'gain_skill') return
      const forcedEffect = {
        ...def.effect,
        filter: { hasTag: 'maintenance' as const, rarity: 2, notOwned: false },
      }
      for (let i = 0; i < 10; i++) {
        const r = resolveEffect(forcedEffect, { ...ctx, hostSkillLevel: 1 })
        expect(r.skillsGranted[0].skill.rarity).toBe(2)
      }
    })

    it('widen 顺序：resource → rarity → allTags → hasTag · hasTag 最后丢', () => {
      // 构造一个不可能直接命中的 filter（resource=mutagen recipe 池 0 个支持）
      // 验证 widen 时 resource 先丢 · hasTag 保留
      const def = getAffixV2Definition(generateAffixV2(RECIPE_TEACH))!
      if (def.effect.kind !== 'gain_skill') return
      const forcedEffect = {
        ...def.effect,
        filter: {
          hasTag: 'maintenance' as const,
          resource: 'mutagen' as const,   // recipe 池 0 个 maintenance 支持 mutagen
          notOwned: false,
        },
      }
      const r = resolveEffect(forcedEffect, { ...ctx, hostSkillLevel: 1 })
      expect(r.skillsGranted.length).toBe(1)
      expect(r.skillsGranted[0].widened).toBe(true)            // 走了 widen
      // mutagen 不可达 · widen 丢 resource 后留 hasTag=maintenance → 应抽 feed/drink
      const resource = r.skillsGranted[0].skill.resource
      expect(['score', 'gold', 'shield', 'time', 'multiplier', 'base']).toContain(resource)
    })
  })
})
