// ============================================
// 打字肉鸽 - T2 累积成长遗物测试
// ============================================
// Story 28.2: 4 个 T2 累积成长遗物

import { describe, it, expect, vi } from 'vitest'
import { RELICS, RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'

// === Mock state ===
vi.mock('../../../../src/core/state', () => {
  const relics = new Set<string>()
  return {
    state: {
      player: {
        relics,
        relicStates: {} as Record<string, number>,
        bindings: new Map(),
        skills: new Map(),
      },
      combo: 0,
      multiplier: 1,
      overkill: 0,
    },
    synergy: {
      wordSkillCount: 0,
      skillBaseScore: 0,
      skillMultBonus: 0,
    },
  }
})

// ========================================
// T2 遗物数据完整性
// ========================================
describe('T2 遗物数据', () => {
  const t2Ids = ['campfire_ember', 'star_chart', 'entropy', 'schrodinger_dice']

  it('4 个 T2 遗物都在 RELICS 中定义', () => {
    t2Ids.forEach(id => {
      expect(RELICS[id]).toBeDefined()
    })
  })

  it('4 个 T2 遗物都在 RELIC_MODIFIER_DEFS 中定义', () => {
    t2Ids.forEach(id => {
      expect(RELIC_MODIFIER_DEFS[id]).toBeDefined()
    })
  })

  it('RELIC_MODIFIER_DEFS 总数 = 35', () => {
    expect(Object.keys(RELIC_MODIFIER_DEFS)).toHaveLength(35)
  })

  it('图标唯一（T2 内部）', () => {
    const icons = t2Ids.map(id => RELICS[id].icon)
    expect(new Set(icons).size).toBe(4)
  })

  it('4 个 T2 遗物全部为 rare 稀有度', () => {
    t2Ids.forEach(id => {
      expect(RELICS[id].rarity).toBe('rare')
    })
  })

  it('entropy 和 schrodinger_dice 是 risk-reward 类型', () => {
    expect(RELICS['entropy'].category).toBe('risk-reward')
    expect(RELICS['schrodinger_dice'].category).toBe('risk-reward')
  })

  it('campfire_ember 和 star_chart 不是 risk-reward 类型', () => {
    expect(RELICS['campfire_ember'].category).not.toBe('risk-reward')
    expect(RELICS['star_chart'].category).not.toBe('risk-reward')
  })
})

// ========================================
// initRelicState 初始值验证
// ========================================
describe('initRelicState 初始值', () => {
  // 直接从 RelicPipeline 导入会拉到真实 state，这里测试工厂的默认值行为

  it('campfire_ember 工厂默认 count=0 时返回空数组', () => {
    const mods = RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 0 } })
    expect(mods).toHaveLength(0)
  })

  it('star_chart 工厂默认 count=0 时返回空数组', () => {
    const mods = RELIC_MODIFIER_DEFS.star_chart('star_chart', { relicStates: { star_chart: 0 } })
    expect(mods).toHaveLength(0)
  })

  it('entropy 工厂默认 pct=30 时返回 modifier（on_skill_trigger）', () => {
    const mods = RELIC_MODIFIER_DEFS.entropy('entropy', { relicStates: { entropy: 30 } })
    expect(mods).toHaveLength(1)
    expect(mods[0].trigger).toBe('on_skill_trigger')
  })

  it('schrodinger_dice 工厂默认 relicStates=1.25 时返回 modifier', () => {
    const mods = RELIC_MODIFIER_DEFS.schrodinger_dice('schrodinger_dice', { relicStates: { schrodinger_dice: 1.25 } })
    expect(mods).toHaveLength(1)
  })
})

// ========================================
// campfire_ember（篝火余烬）
// ========================================
describe('campfire_ember 工厂', () => {
  it('购买计数为 0 时返回空数组（无效果）', () => {
    const mods = RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 0 } })
    expect(mods).toHaveLength(0)
  })

  it('购买 1 个技能：multiply = 0.05（+5%）', () => {
    const mods = RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 1 } })
    expect(mods).toHaveLength(1)
    expect(mods[0].effect.type).toBe('multiply')
    expect(mods[0].effect.value).toBeCloseTo(0.05)
  })

  it('购买 3 个技能：multiply = 0.15（+15%）', () => {
    const mods = RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 3 } })
    expect(mods[0].effect.value).toBeCloseTo(0.15)
  })

  it('trigger 为 on_word_complete', () => {
    const mods = RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 1 } })
    expect(mods[0].trigger).toBe('on_word_complete')
  })

  it('layer 为 base（multiply 加算 → bonusMult）', () => {
    const mods = RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 1 } })
    expect(mods[0].layer).toBe('base')
  })

  it('无 relicStates 上下文时返回空数组', () => {
    const mods = RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember')
    expect(mods).toHaveLength(0)
  })

  it('管道 resolve：购买 2 次 → multiply = 0.10', () => {
    const registry = new ModifierRegistry()
    const mods = RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 2 } })
    registry.registerMany(mods)
    const result = EffectPipeline.resolve(registry, 'on_word_complete')
    // effects.multiply 被 battle.ts 用作 bonusMult += effects.multiply
    expect(result.effects.multiply).toBeCloseTo(0.10)
  })
})

// ========================================
// star_chart（星图罗盘）
// ========================================
describe('star_chart 工厂', () => {
  it('附魔计数为 0 时返回空数组（无效果）', () => {
    const mods = RELIC_MODIFIER_DEFS.star_chart('star_chart', { relicStates: { star_chart: 0 } })
    expect(mods).toHaveLength(0)
  })

  it('附魔 1 次：multiply = 0.08（+8%）', () => {
    const mods = RELIC_MODIFIER_DEFS.star_chart('star_chart', { relicStates: { star_chart: 1 } })
    expect(mods).toHaveLength(1)
    expect(mods[0].effect.type).toBe('multiply')
    expect(mods[0].effect.value).toBeCloseTo(0.08)
  })

  it('附魔 3 次：multiply = 0.24（+24%）', () => {
    const mods = RELIC_MODIFIER_DEFS.star_chart('star_chart', { relicStates: { star_chart: 3 } })
    expect(mods[0].effect.value).toBeCloseTo(0.24)
  })

  it('trigger 为 on_word_complete', () => {
    const mods = RELIC_MODIFIER_DEFS.star_chart('star_chart', { relicStates: { star_chart: 1 } })
    expect(mods[0].trigger).toBe('on_word_complete')
  })

  it('永不重置：附魔 5 次仍有效', () => {
    const mods = RELIC_MODIFIER_DEFS.star_chart('star_chart', { relicStates: { star_chart: 5 } })
    expect(mods).toHaveLength(1)
    expect(mods[0].effect.value).toBeCloseTo(0.40)
  })

  it('管道 resolve：附魔 1 次 → multiply = 0.08', () => {
    const registry = new ModifierRegistry()
    const mods = RELIC_MODIFIER_DEFS.star_chart('star_chart', { relicStates: { star_chart: 1 } })
    registry.registerMany(mods)
    const result = EffectPipeline.resolve(registry, 'on_word_complete')
    expect(result.effects.multiply).toBeCloseTo(0.08)
  })
})

// ========================================
// entropy（熵增）— 资源产出型 (Story 28.3 重设计)
// ========================================
describe('entropy 工厂 — 资源产出 +30%（on_skill_trigger）', () => {
  it('初始 pct=30：score = 1.30（×1.30 资源产出）', () => {
    const mods = RELIC_MODIFIER_DEFS.entropy('entropy', { relicStates: { entropy: 30 } })
    expect(mods).toHaveLength(1)
    expect(mods[0].effect.type).toBe('score')
    expect(mods[0].effect.value).toBeCloseTo(1.30)
    expect(mods[0].effect.stacking).toBe('multiplicative')
  })

  it('trigger 为 on_skill_trigger（非 on_word_complete）', () => {
    const mods = RELIC_MODIFIER_DEFS.entropy('entropy', { relicStates: { entropy: 30 } })
    expect(mods[0].trigger).toBe('on_skill_trigger')
  })

  it('layer 为 global（乘算进 relicMult）', () => {
    const mods = RELIC_MODIFIER_DEFS.entropy('entropy', { relicStates: { entropy: 30 } })
    expect(mods[0].layer).toBe('global')
  })

  it('衰减后 pct=25：score = 1.25', () => {
    const mods = RELIC_MODIFIER_DEFS.entropy('entropy', { relicStates: { entropy: 25 } })
    expect(mods[0].effect.value).toBeCloseTo(1.25)
  })

  it('衰减后 pct=5：score = 1.05', () => {
    const mods = RELIC_MODIFIER_DEFS.entropy('entropy', { relicStates: { entropy: 5 } })
    expect(mods[0].effect.value).toBeCloseTo(1.05)
  })

  it('pct=0 时返回空数组（自动消失）', () => {
    const mods = RELIC_MODIFIER_DEFS.entropy('entropy', { relicStates: { entropy: 0 } })
    expect(mods).toHaveLength(0)
  })

  it('pct 为负数时返回空数组', () => {
    const mods = RELIC_MODIFIER_DEFS.entropy('entropy', { relicStates: { entropy: -5 } })
    expect(mods).toHaveLength(0)
  })

  it('无 relicStates 上下文时使用默认值 30', () => {
    const mods = RELIC_MODIFIER_DEFS.entropy('entropy')
    expect(mods).toHaveLength(1)
    expect(mods[0].effect.value).toBeCloseTo(1.30)
  })

  it('衰减链：30 → 25 → 20 → 15 → 10 → 5 → 0（6 关寿命）', () => {
    const values = [30, 25, 20, 15, 10, 5, 0]
    const expected = [1.30, 1.25, 1.20, 1.15, 1.10, 1.05, 0]
    values.forEach((pct, i) => {
      const mods = RELIC_MODIFIER_DEFS.entropy('entropy', { relicStates: { entropy: pct } })
      if (pct <= 0) {
        expect(mods).toHaveLength(0)
      } else {
        expect(mods[0].effect.value).toBeCloseTo(expected[i])
      }
    })
  })

  it('管道 resolve（on_skill_trigger + dummy base）：pct=30 → score = 1.30', () => {
    const registry = new ModifierRegistry()
    // dummy base=1 使 global 层乘法公式生效
    registry.register({
      id: '_base:score', source: '_base', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 1, stacking: 'additive' }, priority: 0,
    })
    const mods = RELIC_MODIFIER_DEFS.entropy('entropy', { relicStates: { entropy: 30 } })
    registry.registerMany(mods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
    // base=1 × global=1.30 = 1.30
    expect(result.effects.score).toBeCloseTo(1.30)
  })
})

// ========================================
// schrodinger_dice（薛定谔骰子）— 动态倍率型 (Story 28.3 重设计)
// ========================================
describe('schrodinger_dice 工厂 — 动态倍率（初始 ×1.25，翻倍/消失）', () => {
  it('初始 relicStates=1.25 → multiply = 0.25', () => {
    const mods = RELIC_MODIFIER_DEFS.schrodinger_dice('schrodinger_dice', { relicStates: { schrodinger_dice: 1.25 } })
    expect(mods).toHaveLength(1)
    expect(mods[0].effect.type).toBe('multiply')
    expect(mods[0].effect.value).toBeCloseTo(0.25)
  })

  it('翻倍后 relicStates=2.50 → multiply = 1.50', () => {
    const mods = RELIC_MODIFIER_DEFS.schrodinger_dice('schrodinger_dice', { relicStates: { schrodinger_dice: 2.50 } })
    expect(mods[0].effect.value).toBeCloseTo(1.50)
  })

  it('再翻倍 relicStates=5.00 → multiply = 4.00', () => {
    const mods = RELIC_MODIFIER_DEFS.schrodinger_dice('schrodinger_dice', { relicStates: { schrodinger_dice: 5.00 } })
    expect(mods[0].effect.value).toBeCloseTo(4.00)
  })

  it('relicStates=1.0 → 返回空数组（≤1.0 无效）', () => {
    const mods = RELIC_MODIFIER_DEFS.schrodinger_dice('schrodinger_dice', { relicStates: { schrodinger_dice: 1.0 } })
    expect(mods).toHaveLength(0)
  })

  it('无 relicStates → 默认 1.25，multiply = 0.25', () => {
    const mods = RELIC_MODIFIER_DEFS.schrodinger_dice('schrodinger_dice')
    expect(mods).toHaveLength(1)
    expect(mods[0].effect.value).toBeCloseTo(0.25)
  })

  it('trigger 为 on_word_complete', () => {
    const mods = RELIC_MODIFIER_DEFS.schrodinger_dice('schrodinger_dice', { relicStates: { schrodinger_dice: 1.25 } })
    expect(mods[0].trigger).toBe('on_word_complete')
  })

  it('layer 为 base（multiply 加算 → bonusMult）', () => {
    const mods = RELIC_MODIFIER_DEFS.schrodinger_dice('schrodinger_dice', { relicStates: { schrodinger_dice: 1.25 } })
    expect(mods[0].layer).toBe('base')
  })

  it('管道 resolve：relicStates=1.25 → multiply = 0.25', () => {
    const registry = new ModifierRegistry()
    const mods = RELIC_MODIFIER_DEFS.schrodinger_dice('schrodinger_dice', { relicStates: { schrodinger_dice: 1.25 } })
    registry.registerMany(mods)
    const result = EffectPipeline.resolve(registry, 'on_word_complete')
    expect(result.effects.multiply).toBeCloseTo(0.25)
  })
})

// ========================================
// 多遗物叠加
// ========================================
describe('T2 遗物叠加', () => {
  it('campfire_ember + star_chart 同时生效（additive stacking）', () => {
    const registry = new ModifierRegistry()
    const mods1 = RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 2 } })
    const mods2 = RELIC_MODIFIER_DEFS.star_chart('star_chart', { relicStates: { star_chart: 1 } })
    registry.registerMany([...mods1, ...mods2])
    const result = EffectPipeline.resolve(registry, 'on_word_complete')
    // base layer additive: 0.10 + 0.08 = 0.18
    expect(result.effects.multiply).toBeCloseTo(0.18)
  })

  it('campfire_ember + star_chart + schrodinger_dice 同管道叠加（on_word_complete）', () => {
    const registry = new ModifierRegistry()
    const ctx = { relicStates: { campfire_ember: 2, star_chart: 1, schrodinger_dice: 1.25 } }
    const allMods = [
      ...RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', ctx),
      ...RELIC_MODIFIER_DEFS.star_chart('star_chart', ctx),
      ...RELIC_MODIFIER_DEFS.schrodinger_dice('schrodinger_dice', ctx),
    ]
    registry.registerMany(allMods)
    const result = EffectPipeline.resolve(registry, 'on_word_complete')
    // base layer additive: 0.10 + 0.08 + 0.25 = 0.43
    expect(result.effects.multiply).toBeCloseTo(0.43)
  })

  it('entropy 在 on_skill_trigger 管道独立生效', () => {
    const registry = new ModifierRegistry()
    // dummy base=1
    registry.register({
      id: '_base:score', source: '_base', sourceType: 'skill',
      layer: 'base', trigger: 'on_skill_trigger', phase: 'calculate',
      effect: { type: 'score', value: 1, stacking: 'additive' }, priority: 0,
    })
    const ctx = { relicStates: { entropy: 30 } }
    const mods = RELIC_MODIFIER_DEFS.entropy('entropy', ctx)
    registry.registerMany(mods)
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger')
    expect(result.effects.score).toBeCloseTo(1.30)
  })
})

// ========================================
// 状态变化模拟（验证 shop/battle 状态更新后工厂输出正确）
// ========================================
describe('T2 遗物状态变化模拟', () => {
  it('campfire_ember 购买递增模拟：0 → 1 → 2 → 幕重置 → 0', () => {
    // 初始：count=0，无效果
    expect(RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 0 } })).toHaveLength(0)
    // shop.ts 购买 1 次后：count=1
    expect(RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 1 } })[0].effect.value).toBeCloseTo(0.05)
    // shop.ts 购买 2 次后：count=2
    expect(RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 2 } })[0].effect.value).toBeCloseTo(0.10)
    // battle.ts 幕重置后：count=0
    expect(RELIC_MODIFIER_DEFS.campfire_ember('campfire_ember', { relicStates: { campfire_ember: 0 } })).toHaveLength(0)
  })

  it('star_chart 附魔递增模拟：0 → 1 → 2 → 3（永不重置）', () => {
    const states = [0, 1, 2, 3]
    const expected = [0, 0.08, 0.16, 0.24]
    states.forEach((count, i) => {
      const mods = RELIC_MODIFIER_DEFS.star_chart('star_chart', { relicStates: { star_chart: count } })
      if (count === 0) {
        expect(mods).toHaveLength(0)
      } else {
        expect(mods[0].effect.value).toBeCloseTo(expected[i])
      }
    })
  })

  it('entropy 关卡衰减模拟：30 → 25 → ... → 5 → 0（消失）', () => {
    let pct = 30
    for (let battle = 0; battle < 7; battle++) {
      const mods = RELIC_MODIFIER_DEFS.entropy('entropy', { relicStates: { entropy: pct } })
      if (pct <= 0) {
        expect(mods).toHaveLength(0)
      } else {
        expect(mods[0].effect.value).toBeCloseTo(1 + pct / 100)
      }
      // 模拟 battle.ts 衰减
      pct -= 5
    }
    // 第 7 关前消失
    expect(pct).toBeLessThanOrEqual(0)
  })

  it('schrodinger_dice 翻倍链模拟：1.25 → 2.50 → 5.00 → ...', () => {
    let mult = 1.25
    for (let i = 0; i < 3; i++) {
      const mods = RELIC_MODIFIER_DEFS.schrodinger_dice('schrodinger_dice', { relicStates: { schrodinger_dice: mult } })
      expect(mods).toHaveLength(1)
      expect(mods[0].effect.value).toBeCloseTo(mult - 1.0)
      // 模拟 50% 翻倍
      mult *= 2
    }
    // 3 次翻倍后 = 10.0
    expect(mult).toBeCloseTo(10.0)
  })
})
