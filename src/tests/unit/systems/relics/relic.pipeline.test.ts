// ============================================
// 打字肉鸽 - 遗物 Modifier 管道测试
// ============================================
// 仅职业专属遗物（所有非职业遗物已删除）

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'
import { resolveRelicEffects, resolveRelicEffectsWithBehaviors, queryRelicFlag, resolveRelicSkillTrigger } from '../../../../src/systems/relics/RelicPipeline'

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
      affixSkills: new Map(),
      affixSkillStates: new Map(),
    },
    synergy: {
      wordSkillCount: 0,
    },
  }
})

// 获取 mock state 引用
import { state } from '../../../../src/core/state'

function clearRelics(): void {
  state.player.relics.clear()
}

function addRelic(id: string): void {
  state.player.relics.add(id)
}

// ========================================
// RELIC_MODIFIER_DEFS 工厂单元测试
// ========================================
describe('RELIC_MODIFIER_DEFS 工厂', () => {
  it('仅 multiplier_prism 使用管道（1 个工厂）', () => {
    expect(Object.keys(RELIC_MODIFIER_DEFS)).toHaveLength(1)
    expect(RELIC_MODIFIER_DEFS['multiplier_prism']).toBeDefined()
  })
})

// ========================================
// queryRelicFlag 测试
// ========================================
describe('queryRelicFlag', () => {
  beforeEach(() => clearRelics())

  it('price_discount → 0（无折扣遗物）', () => {
    expect(queryRelicFlag('price_discount')).toBe(0)
  })

  it('deleted relics return false/default', () => {
    expect(queryRelicFlag('chain_amplifier')).toBe(false)
    expect(queryRelicFlag('fortress_shield_bonus')).toBe(false)
    expect(queryRelicFlag('fortress_sentinel_bonus')).toBe(false)
    expect(queryRelicFlag('passive_mastery')).toBe(false)
    expect(queryRelicFlag('gamblers_creed')).toBe(false)
  })

  it('glass_cannon → false（已删除）', () => {
    expect(queryRelicFlag('glass_cannon')).toBe(false)
  })

  it('greedy_hand → 1（默认倍率）', () => {
    expect(queryRelicFlag('greedy_hand')).toBe(1)
  })

  it('max_skill_level → Infinity', () => {
    expect(queryRelicFlag('max_skill_level')).toBe(Infinity)
  })

  it('unknown flag → false', () => {
    expect(queryRelicFlag('nonexistent')).toBe(false)
  })
})

// ========================================
// resolveRelicEffects 管道集成测试
// ========================================
describe('resolveRelicEffects 管道集成', () => {
  beforeEach(() => clearRelics())

  it('无遗物 → 所有效果为 0', () => {
    const result = resolveRelicEffects('on_word_complete')
    expect(result.effects.score).toBe(0)
    expect(result.effects.time).toBe(0)
    expect(result.effects.gold).toBe(0)
    expect(result.effects.multiply).toBe(0)
  })

  it('职业专属遗物无 modifier 工厂 → 无额外效果', () => {
    addRelic('apprentice_notes')
    const result = resolveRelicEffects('on_word_complete')
    expect(result.effects.score).toBe(0)
  })
})

// ========================================
// resolveRelicSkillTrigger 测试
// ========================================
describe('resolveRelicSkillTrigger', () => {
  beforeEach(() => clearRelics())

  it('无遗物 → 倍率 = 1', () => {
    const mult = resolveRelicSkillTrigger({})
    expect(mult).toBe(1)
  })

  it('职业专属遗物（无 modifier 工厂）→ 倍率 = 1', () => {
    addRelic('apprentice_notes')
    const mult = resolveRelicSkillTrigger({})
    expect(mult).toBe(1)
  })
})
