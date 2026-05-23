// ============================================
// 打字肉鸽 - V2 词条生成器 · chant scale roll
// ============================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateAffixV2, pickRecipeForSkill, META_RECIPE_KINDS, ALL_RECIPES, RECIPE_PILOERECTION, RECIPE_ARM_RAISE, RECIPE_BIPEDAL_SWAGGER, RECIPE_SUPINE, RECIPE_HUDDLE, RECIPE_GAZE_FOLLOW, RECIPE_IMITATE, RECIPE_REGURGITATE, RECIPE_FEED, RECIPE_NUT_CRACK } from '../../../src/data/affixV2Generator'
import { getAffixV2Definition, TOOL_AFFIX_USES_MIN, TOOL_AFFIX_USES_MAX } from '../../../src/data/affixV2'
import { setSeededMode, setNormalMode } from '../../../src/core/seededRandom'

beforeEach(() => {
  setSeededMode(42)
})

afterEach(() => {
  setNormalMode()
})

describe('chant generator · scale roll', () => {
  it('rainbow modifier 永远不挂 scale', () => {
    // RECIPE_SUPINE 固定 rainbow modifier · 跑多次统计是否带 scale
    setNormalMode()
    setSeededMode(1)
    let rainbowCount = 0
    let rainbowWithScale = 0
    for (let i = 0; i < 200; i++) {
      const id = generateAffixV2(RECIPE_SUPINE)
      const def = getAffixV2Definition(id)
      if (def?.effect.kind === 'apply_aura' && def.effect.modifier.type === 'rainbow') {
        rainbowCount++
        if ('scale' in def.effect && def.effect.scale) rainbowWithScale++
      }
    }
    expect(rainbowCount).toBe(200)  // SUPINE 恒 rainbow
    expect(rainbowWithScale).toBe(0)         // rainbow 不带 scale
  })

  it('multi_fire_add 的 scale 曲线一定是 per_n', () => {
    setSeededMode(7)
    let mfaWithScaleCount = 0
    for (let i = 0; i < 300; i++) {
      const id = generateAffixV2(RECIPE_BIPEDAL_SWAGGER)   // 固定 multi_fire_add
      const def = getAffixV2Definition(id)
      if (def?.effect.kind !== 'apply_aura') continue
      if (def.effect.modifier.type !== 'multi_fire_add') continue
      const scale = (def.effect as { scale?: { type: string; perN?: number } }).scale
      if (!scale) continue
      mfaWithScaleCount++
      expect(scale.type).toBe('per_n')
      // perN ∈ [2, 4]
      expect(scale.perN).toBeGreaterThanOrEqual(2)
      expect(scale.perN).toBeLessThanOrEqual(4)
    }
    expect(mfaWithScaleCount).toBeGreaterThan(0)  // 至少有一次抽到 multi_fire_add + scale
  })

  it('crit_chance_add / output_bonus_pct 的 scale 曲线是 count', () => {
    setSeededMode(13)
    let pctWithScaleCount = 0
    // crit=PILOERECTION · output=ARM_RAISE（拆分后各自独立 recipe）
    for (let i = 0; i < 300; i++) {
      for (const recipe of [RECIPE_PILOERECTION, RECIPE_ARM_RAISE]) {
        const id = generateAffixV2(recipe)
        const def = getAffixV2Definition(id)
        if (def?.effect.kind !== 'apply_aura') continue
        const modType = def.effect.modifier.type
        if (modType !== 'crit_chance_add' && modType !== 'output_bonus_pct') continue
        const scale = (def.effect as { scale?: { type: string; factor?: number } }).scale
        if (!scale) continue
        pctWithScaleCount++
        expect(scale.type).toBe('count')
        expect(scale.factor).toBe(0.1)
      }
    }
    expect(pctWithScaleCount).toBeGreaterThan(0)
  })

  it('tag source 的 tag = recipe.section；source 含 tag/resource/rarity/empty/targetScore/affixName 变体', () => {
    setSeededMode(99)
    const bys = new Set<string>()
    for (let i = 0; i < 600; i++) {
      const id = generateAffixV2(RECIPE_PILOERECTION)
      const def = getAffixV2Definition(id)
      if (def?.effect.kind !== 'apply_aura') continue
      const scale = (def.effect as { scale?: { source: { by: string; tag?: string } } }).scale
      if (!scale) continue
      bys.add(scale.source.by)
      if (scale.source.by === 'tag') expect(scale.source.tag).toBe(RECIPE_PILOERECTION.section)  // 'posture'
    }
    // 非门控的 source 变体都应被抽到（hasted 受需求门控，不在此断言）
    for (const by of ['tag', 'resource', 'rarity', 'empty', 'targetScore', 'affixName']) expect(bys.has(by)).toBe(true)
  })

  it('tool 段 recipe 生成时 roll maxUses（[MIN, MAX] 闭区间整数）', () => {
    setSeededMode(5)
    const seen = new Set<number>()
    for (let i = 0; i < 100; i++) {
      for (const recipe of [RECIPE_GAZE_FOLLOW, RECIPE_IMITATE]) {
        const def = getAffixV2Definition(generateAffixV2(recipe))
        expect(def?.maxUses).toBeDefined()
        expect(Number.isInteger(def!.maxUses)).toBe(true)
        expect(def!.maxUses!).toBeGreaterThanOrEqual(TOOL_AFFIX_USES_MIN)
        expect(def!.maxUses!).toBeLessThanOrEqual(TOOL_AFFIX_USES_MAX)
        seen.add(def!.maxUses!)
      }
    }
    // 多 seed 应 roll 出不止一个值（验证确实随机，而非固定常量）
    expect(seen.size).toBeGreaterThan(1)
  })

  it('scale scope 不再恒为 all_skills（按 SCALE_SCOPE_POOL 抽 · 仍以 all_skills 为主）', () => {
    setSeededMode(7)
    const scopes = new Set<string>()
    for (let i = 0; i < 500; i++) {
      const def = getAffixV2Definition(generateAffixV2(RECIPE_PILOERECTION))   // chant → apply_aura
      if (def?.effect.kind === 'apply_aura' && def.effect.scale) {
        scopes.add(def.effect.scale.scope?.type ?? 'all_skills')
      }
    }
    expect(scopes.has('all_skills')).toBe(true)   // all_skills 仍是常见基线
    expect(scopes.has('neighbors')).toBe(true)    // neighbors（键位拓扑）已纳入池
    expect(scopes.size).toBeGreaterThan(1)         // 不再恒为 all_skills
  })

  describe('crack 系 · nut_crack 大额单次产出（消耗型工具）', () => {
    it('已注册进 ALL_RECIPES', () => {
      expect(ALL_RECIPES).toContain(RECIPE_NUT_CRACK)
    })

    it('生成 on_self_fire + gain_resource（ratio = 固定大额 amount · 资源在池内）', () => {
      setSeededMode(11)
      const pool = new Set<string>()
      for (let i = 0; i < 100; i++) {
        const def = getAffixV2Definition(generateAffixV2(RECIPE_NUT_CRACK))
        expect(def?.section).toBe('tool')
        expect(def?.trigger.type).toBe('on_self_fire')
        expect(def?.effect.kind).toBe('gain_resource')
        const eff = def!.effect as { kind: 'gain_resource'; resource: string; ratio: number }
        expect(eff.ratio).toBe(RECIPE_NUT_CRACK.amount)              // per-use 不按 freq 缩放
        expect(RECIPE_NUT_CRACK.resourcePool).toContain(eff.resource)
        pool.add(eff.resource)
      }
      expect(pool.size).toBeGreaterThan(1)                          // 资源确实随机抽（非固定单值）
    })

    it('maxUses 落在 usesRange [6,10]（覆盖 tool 段默认 2-4 · 多于一般工具）', () => {
      setSeededMode(11)
      const [lo, hi] = RECIPE_NUT_CRACK.usesRange
      const seen = new Set<number>()
      for (let i = 0; i < 100; i++) {
        const def = getAffixV2Definition(generateAffixV2(RECIPE_NUT_CRACK))
        expect(def?.maxUses).toBeDefined()
        expect(Number.isInteger(def!.maxUses)).toBe(true)
        expect(def!.maxUses!).toBeGreaterThanOrEqual(lo)
        expect(def!.maxUses!).toBeLessThanOrEqual(hi)
        seen.add(def!.maxUses!)
      }
      expect(lo).toBeGreaterThan(4)                                  // 确实"更多"——超出默认 tool 上限
      expect(seen.size).toBeGreaterThan(1)                           // 随机非常量
    })
  })

  it('非 tool 段 recipe 不赋 maxUses（无限制）', () => {
    setSeededMode(5)
    const def = getAffixV2Definition(generateAffixV2(RECIPE_PILOERECTION))   // posture
    expect(def?.maxUses).toBeUndefined()
  })

  it('pickRecipeForSkill({excludeMeta}) 永不返回 meta 操纵家族', () => {
    setSeededMode(123)
    for (let i = 0; i < 300; i++) {
      expect(META_RECIPE_KINDS.has(pickRecipeForSkill(undefined, { excludeMeta: true }).kind)).toBe(false)
    }
  })

  it('pickRecipeForSkill 默认池含 meta（确认 excludeMeta 才是过滤开关）', () => {
    setSeededMode(7)
    let sawMeta = false
    for (let i = 0; i < 500 && !sawMeta; i++) {
      if (META_RECIPE_KINDS.has(pickRecipeForSkill().kind)) sawMeta = true
    }
    expect(sawMeta).toBe(true)
  })

  it('scale 概率 ≈ 30% (非 rainbow 中，宽松区间)', () => {
    // 30% 名义 · 1000 试 · 抽样误差 ~3% → 区间 [22%, 38%]
    setSeededMode(31337)
    let nonRainbow = 0
    let nonRainbowWithScale = 0
    for (let i = 0; i < 1000; i++) {
      const id = generateAffixV2(RECIPE_PILOERECTION)
      const def = getAffixV2Definition(id)
      if (def?.effect.kind !== 'apply_aura') continue
      // rainbow / inherit_tags 无 amount → 永不挂 scale，排除以测「scale-eligible 内 ≈30%」
      if (def.effect.modifier.type === 'rainbow' || def.effect.modifier.type === 'inherit_tags') continue
      nonRainbow++
      const scale = (def.effect as { scale?: unknown }).scale
      if (scale) nonRainbowWithScale++
    }
    expect(nonRainbow).toBeGreaterThan(100)
    const rate = nonRainbowWithScale / nonRainbow
    expect(rate).toBeGreaterThan(0.22)
    expect(rate).toBeLessThan(0.38)
  })
})

describe('chant generator · inherit_tags 随机可抽', () => {
  it('多 seed 跑能抽到 inherit_tags · 无 scale/amount', () => {
    setSeededMode(7)
    let count = 0
    for (let i = 0; i < 600; i++) {
      const def = getAffixV2Definition(generateAffixV2(RECIPE_HUDDLE))  // 固定 inherit_tags
      if (def?.effect.kind !== 'apply_aura') continue
      if (def.effect.modifier.type !== 'inherit_tags') continue
      count++
      expect('scale' in def.effect && def.effect.scale).toBeFalsy()  // 无 scale
      expect('amount' in def.effect.modifier).toBe(false)            // 无 amount 字段
    }
    expect(count).toBe(600)  // HUDDLE 恒 inherit_tags
  })

  it('inherit_tags 来源 scope 不为 self / hasted；含 workbench 变体', () => {
    setSeededMode(99)
    const scopes = new Set<string>()
    for (let i = 0; i < 800; i++) {
      const def = getAffixV2Definition(generateAffixV2(RECIPE_HUDDLE))  // 固定 inherit_tags
      if (def?.effect.kind !== 'apply_aura') continue
      if (def.effect.modifier.type !== 'inherit_tags') continue
      scopes.add(def.effect.selector.type)
    }
    expect(scopes.size).toBeGreaterThan(0)
    expect(scopes.has('self')).toBe(false)     // 继承自身 = no-op，已排除
    expect(scopes.has('hasted')).toBe(false)   // 继承不挂靠战斗极速态，已排除
    expect(scopes.has('workbench')).toBe(true) // IN-tray 签名来源在池内
  })
})

describe('metabolize generator · 反刍/regurgitate', () => {
  it('生成 convert_resource · from/to 均排除宿主资源且互异', () => {
    setSeededMode(101)
    for (let i = 0; i < 50; i++) {
      const id = generateAffixV2(RECIPE_REGURGITATE, 'score')
      const def = getAffixV2Definition(id)
      expect(def?.effect.kind).toBe('convert_resource')
      if (def?.effect.kind !== 'convert_resource') continue
      expect(def.effect.from).not.toBe('score')        // 排除宿主原资源
      expect(def.effect.to).not.toBe('score')
      expect(def.effect.from).not.toBe(def.effect.to)   // from ≠ to
      expect(def.effect.ratio).toBeGreaterThan(0)
    }
  })

  it('不同宿主资源 → 该资源被排除出 from/to', () => {
    setSeededMode(202)
    for (let i = 0; i < 50; i++) {
      const id = generateAffixV2(RECIPE_REGURGITATE, 'gold')
      const def = getAffixV2Definition(id)
      if (def?.effect.kind !== 'convert_resource') continue
      expect(def.effect.from).not.toBe('gold')
      expect(def.effect.to).not.toBe('gold')
    }
  })

  it('on_resource_consumed 会被分配给生成词条（reactive trigger 进池）', () => {
    setSeededMode(7)
    let seen = false
    for (let i = 0; i < 600; i++) {
      const id = generateAffixV2(RECIPE_FEED)
      const def = getAffixV2Definition(id)
      if (def?.trigger.type === 'on_resource_consumed') { seen = true; break }
    }
    expect(seen).toBe(true)
  })
})
