// ============================================
// 打字肉鸽 - T4 规则改造遗物测试
// ============================================
// Story 30.1: 限制框架 + Story 30.2: T4 遗物

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { queryRelicFlag } from '../../../../src/systems/relics/RelicPipeline'
import { RELIC_FLAGS, RELICS, RELIC_MODIFIER_DEFS } from '../../../../src/data/relics'

// === Mock state ===
vi.mock('../../../../src/core/state', () => {
  const relics = new Set<string>()
  return {
    state: {
      player: {
        relics,
        relicStates: {} as Record<string, number>,
        bindings: new Map<string, string>(),
        skills: new Map(),
        enchantedSkills: new Map(),
      },
      combo: 0,
      multiplier: 1,
      level: 1,
      growthValues: new Map(),
      amplifierStacks: new Map(),
      affixSkills: new Map(),
      affixSkillStates: new Map(),
    },
    synergy: {
      wordSkillCount: 0,
      skillBaseScore: 0,
    },
  }
})

// Mock battle for showFeedback
vi.mock('../../../../src/systems/battle', () => ({
  showFeedback: vi.fn(),
  updateHUD: vi.fn(),
  setPseudoInfiniteVisual: vi.fn(),
}))

// Mock producers for isProducer
vi.mock('../../../../src/data/producers', () => ({
  isProducer: (id: string) => id.startsWith('prod_'),
}))

import { state } from '../../../../src/core/state'

function clearRelics(): void {
  state.player.relics.clear()
}

function addRelic(id: string): void {
  state.player.relics.add(id)
}

// === queryRelicFlag T4 限制 Flag 测试 ===
describe('queryRelicFlag — T4 限制 Flag', () => {
  const savedFlags: Record<string, string[]> = {}

  beforeEach(() => {
    clearRelics()
    for (const key of Object.keys(RELIC_FLAGS)) {
      savedFlags[key] = [...RELIC_FLAGS[key]]
    }
    // 注入测试遗物
    RELIC_FLAGS['connector_lock'] = ['test_chain_ban']
    RELIC_FLAGS['enchant_lock'] = ['test_no_enchant']
    RELIC_FLAGS['max_skill_level'] = ['test_minimalist']
    RELIC_FLAGS['producer_only'] = ['test_pure_heart']
    RELIC_FLAGS['max_skill_count'] = ['test_count_limit']
  })

  afterEach(() => {
    for (const key of Object.keys(savedFlags)) {
      RELIC_FLAGS[key] = savedFlags[key]
    }
    // 清理注入的 flag key（Story 30-1 原始只有 3 个）
    for (const key of Object.keys(RELIC_FLAGS)) {
      if (!(key in savedFlags)) delete RELIC_FLAGS[key]
    }
    // 清理注入的 RELICS
    delete (RELICS as any)['test_minimalist']
    delete (RELICS as any)['test_count_limit']
  })

  describe('connector_lock', () => {
    it('无限制遗物 → false', () => {
      expect(queryRelicFlag('connector_lock')).toBe(false)
    })

    it('有限制遗物 → true', () => {
      addRelic('test_chain_ban')
      expect(queryRelicFlag('connector_lock')).toBe(true)
    })
  })

  describe('enchant_lock', () => {
    it('无限制遗物 → false', () => {
      expect(queryRelicFlag('enchant_lock')).toBe(false)
    })

    it('有限制遗物 → true', () => {
      addRelic('test_no_enchant')
      expect(queryRelicFlag('enchant_lock')).toBe(true)
    })
  })

  describe('max_skill_level', () => {
    it('无限制遗物 → Infinity', () => {
      expect(queryRelicFlag('max_skill_level')).toBe(Infinity)
    })

    it('有限制遗物 → 返回限制等级', () => {
      ;(RELICS as any)['test_minimalist'] = {
        id: 'test_minimalist',
        name: 'Test',
        icon: '🧪',
        description: 'test',
        rarity: 'legendary',
        basePrice: 100,
        effects: [{ type: 'passive', modifier: 'max_skill_level', value: 1 }],
      }
      addRelic('test_minimalist')
      expect(queryRelicFlag('max_skill_level')).toBe(1)
    })
  })

  describe('producer_only', () => {
    it('无限制遗物 → false', () => {
      expect(queryRelicFlag('producer_only')).toBe(false)
    })

    it('有限制遗物 → true', () => {
      addRelic('test_pure_heart')
      expect(queryRelicFlag('producer_only')).toBe(true)
    })
  })

  describe('max_skill_count', () => {
    it('无限制遗物 → Infinity', () => {
      expect(queryRelicFlag('max_skill_count')).toBe(Infinity)
    })

    it('有限制遗物 → 返回限制数值', () => {
      ;(RELICS as any)['test_count_limit'] = {
        id: 'test_count_limit',
        name: 'Test',
        icon: '🧪',
        description: 'test',
        rarity: 'legendary',
        basePrice: 100,
        effects: [{ type: 'passive', modifier: 'max_skill_count', value: 5 }],
      }
      addRelic('test_count_limit')
      expect(queryRelicFlag('max_skill_count')).toBe(5)
    })
  })
})

// === RELIC_FLAGS 数据结构测试 ===
describe('RELIC_FLAGS — 映射完整性', () => {
  it('包含 5 个限制 flag', () => {
    expect('connector_lock' in RELIC_FLAGS).toBe(true)
    expect('enchant_lock' in RELIC_FLAGS).toBe(true)
    expect('max_skill_level' in RELIC_FLAGS).toBe(true)
    expect('producer_only' in RELIC_FLAGS).toBe(true)
    expect('max_skill_count' in RELIC_FLAGS).toBe(true)
  })

  it('connector_lock → chain_ban', () => {
    expect(RELIC_FLAGS['connector_lock']).toContain('chain_ban')
  })

  it('enchant_lock → no_enchant_vow + keyboard_flood', () => {
    expect(RELIC_FLAGS['enchant_lock']).toContain('no_enchant_vow')
    expect(RELIC_FLAGS['enchant_lock']).toContain('keyboard_flood')
  })

  it('max_skill_level → keyboard_flood + minimalist', () => {
    expect(RELIC_FLAGS['max_skill_level']).toContain('keyboard_flood')
    expect(RELIC_FLAGS['max_skill_level']).toContain('minimalist')
  })

  it('producer_only → pure_heart', () => {
    expect(RELIC_FLAGS['producer_only']).toContain('pure_heart')
  })

  it('max_skill_count → minimalist', () => {
    expect(RELIC_FLAGS['max_skill_count']).toContain('minimalist')
  })
})

// === T4 遗物数据测试 ===
const T4_IDS = ['chain_ban', 'no_enchant_vow', 'keyboard_flood', 'pure_heart', 'minimalist']

describe('T4 遗物数据', () => {
  it('5 个 T4 遗物存在于 RELICS', () => {
    for (const id of T4_IDS) {
      expect(RELICS[id]).toBeDefined()
    }
  })

  it('全部为 legendary', () => {
    for (const id of T4_IDS) {
      expect(RELICS[id].rarity).toBe('legendary')
    }
  })

  it('图标唯一（T4 内部）', () => {
    const icons = T4_IDS.map(id => RELICS[id].icon)
    expect(new Set(icons).size).toBe(5)
  })

  it('全部有工厂', () => {
    for (const id of T4_IDS) {
      expect(RELIC_MODIFIER_DEFS[id]).toBeDefined()
    }
  })
})

// === 每个遗物工厂测试 ===
describe('chain_ban 工厂', () => {
  it('产出 1 个 Modifier', () => {
    const mods = RELIC_MODIFIER_DEFS.chain_ban('chain_ban')
    expect(mods).toHaveLength(1)
  })

  it('global 层 score ×1.30 multiplicative', () => {
    const mods = RELIC_MODIFIER_DEFS.chain_ban('chain_ban')
    expect(mods[0].layer).toBe('global')
    expect(mods[0].trigger).toBe('on_skill_trigger')
    expect(mods[0].effect?.type).toBe('score')
    expect(mods[0].effect?.value).toBe(1.30)
    expect(mods[0].effect?.stacking).toBe('multiplicative')
  })

  it('RELICS 数据价格 80', () => {
    expect(RELICS.chain_ban.basePrice).toBe(80)
  })
})

describe('no_enchant_vow 工厂', () => {
  it('产出 1 个 Modifier', () => {
    const mods = RELIC_MODIFIER_DEFS.no_enchant_vow('no_enchant_vow')
    expect(mods).toHaveLength(1)
  })

  it('global 层 score ×1.40 multiplicative', () => {
    const mods = RELIC_MODIFIER_DEFS.no_enchant_vow('no_enchant_vow')
    expect(mods[0].layer).toBe('global')
    expect(mods[0].effect?.value).toBe(1.40)
    expect(mods[0].effect?.stacking).toBe('multiplicative')
  })

  it('RELICS 数据价格 80', () => {
    expect(RELICS.no_enchant_vow.basePrice).toBe(80)
  })
})

describe('keyboard_flood 工厂', () => {
  it('产出 1 个 Modifier', () => {
    const mods = RELIC_MODIFIER_DEFS.keyboard_flood('keyboard_flood')
    expect(mods).toHaveLength(1)
  })

  it('global 层 score ×1.25，条件 total_skills_gte=15', () => {
    const mods = RELIC_MODIFIER_DEFS.keyboard_flood('keyboard_flood')
    expect(mods[0].layer).toBe('global')
    expect(mods[0].effect?.value).toBe(1.25)
    expect(mods[0].condition).toEqual({ type: 'total_skills_gte', value: 15 })
  })

  it('RELICS 数据含 max_skill_level=1', () => {
    const eff = RELICS.keyboard_flood.effects.find(e => e.modifier === 'max_skill_level')
    expect(eff).toBeDefined()
    expect(eff!.value).toBe(1)
  })
})

describe('pure_heart 工厂', () => {
  it('产出 1 个 Modifier', () => {
    const mods = RELIC_MODIFIER_DEFS.pure_heart('pure_heart')
    expect(mods).toHaveLength(1)
  })

  it('global 层 score ×3.0，条件 skill_rarity_gte 0', () => {
    const mods = RELIC_MODIFIER_DEFS.pure_heart('pure_heart')
    expect(mods[0].layer).toBe('global')
    expect(mods[0].effect?.value).toBe(3.0)
    expect(mods[0].condition).toEqual({ type: 'skill_rarity_gte', value: 0 })
  })

  it('RELICS 数据价格 100', () => {
    expect(RELICS.pure_heart.basePrice).toBe(100)
  })
})

describe('minimalist 工厂', () => {
  it('产出 1 个 Modifier', () => {
    const mods = RELIC_MODIFIER_DEFS.minimalist('minimalist')
    expect(mods).toHaveLength(1)
  })

  it('on_word_complete multiply +1.0 additive', () => {
    const mods = RELIC_MODIFIER_DEFS.minimalist('minimalist')
    expect(mods[0].trigger).toBe('on_word_complete')
    expect(mods[0].effect?.type).toBe('multiply')
    expect(mods[0].effect?.value).toBe(1.0)
    expect(mods[0].effect?.stacking).toBe('additive')
  })

  it('RELICS 数据含 max_skill_level=3 和 max_skill_count=5', () => {
    const levelEff = RELICS.minimalist.effects.find(e => e.modifier === 'max_skill_level')
    const countEff = RELICS.minimalist.effects.find(e => e.modifier === 'max_skill_count')
    expect(levelEff).toBeDefined()
    expect(levelEff!.value).toBe(3)
    expect(countEff).toBeDefined()
    expect(countEff!.value).toBe(5)
  })
})

// === 获取时副作用测试 ===
describe('initRelicState — T4 副作用', () => {
  beforeEach(() => {
    state.player.skills.clear()
    state.player.bindings.clear()
    state.player.enchantedSkills.clear()
    state.player.relics.clear()
  })

  it('pure_heart 移除非产出者技能', async () => {
    const { initRelicState } = await import('../../../../src/systems/relics/RelicPipeline')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.skills.set('conv_fire', { level: 1 })
    state.player.skills.set('prod_chain', { level: 2 })
    state.player.bindings.set('a', 'prod_burst')
    state.player.bindings.set('s', 'conv_fire')
    state.player.relics.add('pure_heart')

    initRelicState('pure_heart')

    expect(state.player.skills.has('prod_burst')).toBe(true)
    expect(state.player.skills.has('prod_chain')).toBe(true)
    expect(state.player.skills.has('conv_fire')).toBe(false)
    expect(state.player.bindings.has('s')).toBe(false)
  })

  it('minimalist 将所有技能升至 Lv3', async () => {
    const { initRelicState } = await import('../../../../src/systems/relics/RelicPipeline')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.skills.set('prod_chain', { level: 2 })
    state.player.relics.add('minimalist')

    initRelicState('minimalist')

    expect(state.player.skills.get('prod_burst')?.level).toBe(3)
    expect(state.player.skills.get('prod_chain')?.level).toBe(3)
  })

  it('minimalist 已是 Lv3 不变', async () => {
    const { initRelicState } = await import('../../../../src/systems/relics/RelicPipeline')
    state.player.skills.set('prod_burst', { level: 3 })
    state.player.relics.add('minimalist')

    initRelicState('minimalist')

    expect(state.player.skills.get('prod_burst')?.level).toBe(3)
  })
})

// === queryRelicFlag 生产数据验证 ===
describe('queryRelicFlag — 生产遗物验证', () => {
  beforeEach(() => {
    clearRelics()
  })

  it('chain_ban → connector_lock', () => {
    addRelic('chain_ban')
    expect(queryRelicFlag('connector_lock')).toBe(true)
  })

  it('no_enchant_vow → enchant_lock', () => {
    addRelic('no_enchant_vow')
    expect(queryRelicFlag('enchant_lock')).toBe(true)
  })

  it('keyboard_flood → enchant_lock + max_skill_level=1', () => {
    addRelic('keyboard_flood')
    expect(queryRelicFlag('enchant_lock')).toBe(true)
    expect(queryRelicFlag('max_skill_level')).toBe(1)
  })

  it('pure_heart → producer_only', () => {
    addRelic('pure_heart')
    expect(queryRelicFlag('producer_only')).toBe(true)
  })

  it('minimalist → max_skill_count=5 + max_skill_level=3', () => {
    addRelic('minimalist')
    expect(queryRelicFlag('max_skill_count')).toBe(5)
    expect(queryRelicFlag('max_skill_level')).toBe(3)
  })

  it('keyboard_flood + minimalist → max_skill_level 取最低 =1', () => {
    addRelic('keyboard_flood')
    addRelic('minimalist')
    expect(queryRelicFlag('max_skill_level')).toBe(1)
  })
})
