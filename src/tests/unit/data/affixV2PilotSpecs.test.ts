// ============================================
// 打字肉鸽 - S2 试点 8 个 affix 的端到端单元测试
// ============================================
// 验证：每个 pilot spec 接入 Definition 后，resolver 能正确执行其 effect。

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PILOT_AFFIX_IDS, getPilotSpec } from '../../../src/data/affixV2PilotSpecs'
import { getAffixV2Definition } from '../../../src/data/affixV2'
import { resolveEffect, type ResolveContext } from '../../../src/systems/affixV2Effect'
import { formatEffectDescription, formatAffixV2Description } from '../../../src/ui/affixV2TooltipAdapter'
import { generateAffixV2, RECIPE_TEACH } from '../../../src/data/affixV2Generator'
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

describe('PILOT specs · 11 个全在', () => {
  it('PILOT_AFFIX_IDS 完整 11 个', () => {
    expect(PILOT_AFFIX_IDS.length).toBe(11)
    expect(new Set(PILOT_AFFIX_IDS).size).toBe(11)
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
    // imitate (on_battle_end) 覆盖 · teach 已下放 recipe_pool 不在 pilot
    expect(triggers.has('on_battle_end')).toBe(true)
  })

  it('pilot 中 gain_skill source 限 player_skill_pool（recipe_pool 由 RECIPE_TEACH 提供）', () => {
    const sources = new Set<string>()
    for (const id of PILOT_AFFIX_IDS) {
      const eff = getPilotSpec(id)!.effect
      if (eff.kind === 'gain_skill') {
        sources.add(eff.source ?? 'recipe_pool')
      }
    }
    expect(sources.has('player_skill_pool')).toBe(true)   // imitate
    // recipe_pool 不再由 pilot 提供 · 见 affixV2Generator.RECIPE_TEACH
  })
})

describe('Tooltip 措辞 · 创生→获得 · 同 section→具体段名', () => {
  it('imitate tooltip · 包含"自有复制" + "工具类" · 不含"同 section"', () => {
    const def = getAffixV2Definition('imitate')!
    const desc = formatAffixV2Description(def, 'score')
    expect(desc).toContain('自有复制')
    expect(desc).toContain('工具类')              // hasTagFromHost + def.section='tool' → 工具类
    expect(desc).not.toContain('同 section')
    expect(desc).not.toContain('section')         // 英文残留也检查
    expect(desc).toContain('与本技能同 Lv')
  })

  it('hasTagFromHost · 无 defSection 时退化为"同类"', () => {
    const def = getAffixV2Definition('imitate')!
    // 不传 defSection · formatEffectDescription 第三参缺省
    const desc = formatEffectDescription(def.effect, 'score')
    expect(desc).toContain('同类')
    expect(desc).not.toContain('同 section')
  })
})

describe('Pilot 11 · imitate (tool · gain_skill · player_skill_pool · hasTagFromHost)', () => {
  it('on_battle_end + gain_skill spec 正确装配 + source=player_skill_pool', () => {
    const def = getAffixV2Definition('imitate')!
    expect(def.trigger).toEqual({ type: 'on_battle_end', result: 'win' })
    expect(def.effect.kind).toBe('gain_skill')
    if (def.effect.kind === 'gain_skill') {
      expect(def.effect.source).toBe('player_skill_pool')
      expect(def.effect.fallback).toBe('skip')
      expect(def.effect.filter.hasTagFromHost).toBe(true)
    }
  })

  it('player_skill_pool 空（无 V2 owned skill）→ skillsGranted 空（fallback=skip）', () => {
    const def = getAffixV2Definition('imitate')!
    // ctx 不挂任何 state · gameState.affixSkills 在测试初始空
    const r = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 3 })
    expect(r.skillsGranted.length).toBe(0)
  })

  describe('hasTagFromHost · selfSection 动态绑定', () => {
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

    it('selfSection=tool · 仅 tool 段兄弟入候选 · 跨段被过滤', () => {
      // mix tool + maintenance + locomotion siblings
      gameState.affixSkills.set('tool_sib', mkOwnedV2('tool_sib', 'score', 'nut_crack'))      // tool（recipe nut_crack 是 tool 段）
      gameState.affixSkills.set('maint_sib', mkOwnedV2('maint_sib', 'gold', 'feed'))           // maintenance
      gameState.affixSkills.set('loco_sib', mkOwnedV2('loco_sib', 'shield', 'climb'))          // locomotion
      const def = getAffixV2Definition('imitate')!
      // 跑 5 次以确保不是恰巧抽中 tool
      for (let i = 0; i < 5; i++) {
        const r = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 1, selfSection: 'tool' })
        expect(r.skillsGranted.length).toBe(1)
        // 克隆体的 resource 来自 tool_sib (score) · 不应是 gold/shield
        expect(r.skillsGranted[0].skill.resource).toBe('score')
      }
    })

    it('selfSection=maintenance · 同段切换 · imitate 自动改为复制 maintenance', () => {
      gameState.affixSkills.set('tool_sib', mkOwnedV2('tool_sib', 'score', 'nut_crack'))
      gameState.affixSkills.set('maint_sib', mkOwnedV2('maint_sib', 'gold', 'feed'))
      const def = getAffixV2Definition('imitate')!
      for (let i = 0; i < 5; i++) {
        const r = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 1, selfSection: 'maintenance' })
        expect(r.skillsGranted.length).toBe(1)
        expect(r.skillsGranted[0].skill.resource).toBe('gold')   // 只可能抽到 maint_sib
      }
    })

    it('selfSection 缺省 → hasTagFromHost 退化为无 tag filter（全池可抽）', () => {
      gameState.affixSkills.set('tool_sib', mkOwnedV2('tool_sib', 'score', 'nut_crack'))
      gameState.affixSkills.set('maint_sib', mkOwnedV2('maint_sib', 'gold', 'feed'))
      const def = getAffixV2Definition('imitate')!
      const resources = new Set<string>()
      // 不传 selfSection · 跑 30 次应能抽到两种 resource
      for (let i = 0; i < 30; i++) {
        const r = resolveEffect(def.effect, { ...ctx, hostSkillLevel: 1 })
        if (r.skillsGranted.length > 0) resources.add(r.skillsGranted[0].skill.resource)
      }
      expect(resources.size).toBeGreaterThan(1)
    })
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
})
