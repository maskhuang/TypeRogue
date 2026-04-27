// ============================================
// 打字肉鸽 - 职业系统集成测试
// ============================================
// Story 32.11: 职业系统集成测试 + 平衡

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { state, resetState, resetResources } from '../../../../src/core/state'
import { RunState } from '../../../../src/core/state/RunState'
import { isFeatureEnabled } from '../../../../src/systems/classes/ClassFeatureGate'
import { isResourceActiveForClass } from '../../../../src/systems/classes/ClassResourceFilter'
import { classManager } from '../../../../src/systems/classes/ClassManager'
import { generateRelicCandidates } from '../../../../src/systems/relicPicker'
import { craftWord } from '../../../../src/systems/classes/CraftingStation'

// Mock side-effect modules
vi.mock('../../../../src/effects/sound', () => ({ playSound: vi.fn(), emitResourceSound: vi.fn() }))
vi.mock('../../../../src/systems/battle', () => ({
  showFeedback: vi.fn(),
  updateHUD: vi.fn(),
  setPseudoInfiniteVisual: vi.fn(),
}))
vi.mock('../../../../src/systems/shop', () => ({
  renderBuildManager: vi.fn(),
}))
vi.mock('../../../../src/core/seededRandom', () => ({
  random: vi.fn(() => 0.5),
  seed: vi.fn(),
  getSeedState: vi.fn(),
  setSeedState: vi.fn(),
}))
vi.mock('../../../../src/data/skills', () => ({
  getSkillDisplayInfo: vi.fn(() => ({ icon: '?', name: 'mock', desc: '' })),
  getSkillSchool: vi.fn(() => ({ label: 'mock', cssClass: '' })),
  DELETED_SKILL_IDS: [],
  DELETED_EVOLUTION_IDS: [],
}))
vi.mock('../../../../src/ui/elements', () => ({
  getElements: () => ({ triggerZone: { appendChild: vi.fn() } }),
}))

// ==================== Task 1: RunState 序列化 ====================

describe('RunState 职业字段序列化 (Task 1)', () => {
  it('serialize() 应包含所有职业字段', () => {
    const rs = new RunState()
    const serialized = rs.serialize() as Record<string, unknown>

    expect(serialized).toHaveProperty('classId', 'none')
    expect(serialized).toHaveProperty('fragmentInventory')
    expect(serialized).toHaveProperty('fragmentQueue')
    expect(serialized).toHaveProperty('fragmentQueuePosition', 0)
    expect(serialized).toHaveProperty('craftedWords')
    expect(serialized).toHaveProperty('mutagenInventory', 0)
    expect(serialized).toHaveProperty('evolvedSkills')
    expect(serialized).toHaveProperty('seenSkillTypes')
    expect(serialized).toHaveProperty('wordDeck')
  })

  it('造词师数据 serialize→deserialize 往返', () => {
    const rs = new RunState()
    const d = rs.getState() as any
    d.classId = 'wordsmith'
    d.fragmentInventory = { a: 5, e: 3, t: 1 }
    d.fragmentQueue = ['a', 'e', '_', 't', '_', '_']
    d.fragmentQueuePosition = 2
    d.craftedWords = ['ate', 'tea']
    d.wordDeck = ['hello', 'world', 'ate', 'tea']
    d.evolvedSkills.set('conv_x', 'conv_x_evo')

    const serialized = rs.serialize()
    const json = JSON.parse(JSON.stringify(serialized))
    const restored = RunState.deserialize(json)
    const rd = restored.getState()

    expect(rd.classId).toBe('wordsmith')
    expect(rd.fragmentInventory).toEqual({ a: 5, e: 3, t: 1 })
    expect(rd.fragmentQueue).toEqual(['a', 'e', '_', 't', '_', '_'])
    expect(rd.fragmentQueuePosition).toBe(2)
    expect(rd.craftedWords).toEqual(['ate', 'tea'])
    expect(rd.wordDeck).toEqual(['hello', 'world', 'ate', 'tea'])
    expect(rd.evolvedSkills.get('conv_x')).toBe('conv_x_evo')
  })

  it('蜕变师数据 serialize→deserialize 往返', () => {
    const rs = new RunState()
    const d = rs.getState() as any
    d.classId = 'metamorph'
    d.mutagenInventory = 7
    d.seenSkillTypes.add('producer')
    d.seenSkillTypes.add('converter')

    const serialized = rs.serialize()
    const json = JSON.parse(JSON.stringify(serialized))
    const restored = RunState.deserialize(json)
    const rd = restored.getState()

    expect(rd.classId).toBe('metamorph')
    expect(rd.mutagenInventory).toBe(7)
    expect(rd.seenSkillTypes.has('producer')).toBe(true)
    expect(rd.seenSkillTypes.has('converter')).toBe(true)
  })

  it('无职业存档：无额外职业字段污染', () => {
    const rs = new RunState()
    const serialized = rs.serialize()
    const json = JSON.parse(JSON.stringify(serialized))
    const restored = RunState.deserialize(json)
    const rd = restored.getState()

    expect(rd.classId).toBe('none')
    expect(rd.fragmentInventory).toEqual({})
    expect(rd.mutagenInventory).toBe(0)
    expect(rd.craftedWords).toEqual([])
    expect(rd.wordDeck).toEqual([])
    expect(rd.evolvedSkills.size).toBe(0)
    expect(rd.seenSkillTypes.size).toBe(0)
  })

  it('向后兼容：旧存档无职业字段 → 使用默认值', () => {
    const fakeOldSave = {
      skills: [],
      bindings: {},
      relics: [],
      gold: 50,
      currentStage: 3,
      currentAct: 1,
      isActive: true,
      stats: { totalScore: 100, maxCombo: 5, wordsCompleted: 10, battlesWon: 2, startTime: 0 },
    }
    const restored = RunState.deserialize(fakeOldSave)
    const rd = restored.getState()

    expect(rd.classId).toBe('none')
    expect(rd.fragmentInventory).toEqual({})
    expect(rd.fragmentQueue).toEqual(['_', '_', '_', '_', '_', '_'])
    expect(rd.fragmentQueuePosition).toBe(0)
    expect(rd.craftedWords).toEqual([])
    expect(rd.mutagenInventory).toBe(0)
    expect(rd.wordDeck).toEqual([])
    expect(rd.evolvedSkills.size).toBe(0)
    expect(rd.seenSkillTypes.size).toBe(0)
    // 原有字段仍正确恢复
    expect(restored.getGold()).toBe(50)
    expect(restored.getCurrentStage()).toBe(3)
    expect(restored.isActive()).toBe(true)
  })

  it('Map/Set 字段 JSON 往返不丢失', () => {
    const rs = new RunState()
    const d = rs.getState() as any
    d.evolvedSkills.set('s1', 'e1')
    d.evolvedSkills.set('s2', 'e2')
    d.seenSkillTypes.add('producer')
    d.seenSkillTypes.add('amplifier')

    const json = JSON.parse(JSON.stringify(rs.serialize()))
    const restored = RunState.deserialize(json)
    const rd = restored.getState()

    expect(rd.evolvedSkills.size).toBe(2)
    expect(rd.seenSkillTypes.size).toBe(2)
  })
})

// ==================== Task 2: 职业切换状态隔离 ====================

describe('职业切换状态隔离 (Task 2)', () => {
  beforeEach(() => {
    resetState()
  })

  it('resetState() 后所有职业字段归零', () => {
    state.classId = 'wordsmith'
    state.fragmentInventory.a = 10
    state.fragmentInventory.e = 5
    state.mutagenInventory = 3
    state.craftedWords.push('test')
    state.fragmentQueue = ['a', 'e', 't', '_', '_', '_']

    resetState()

    expect(state.classId).toBe('none')
    expect(state.fragmentInventory.a).toBe(0)
    expect(state.fragmentInventory.e).toBe(0)
    expect(state.mutagenInventory).toBe(0)
    expect(state.craftedWords).toEqual([])
    expect(state.fragmentQueue).toEqual(['_', '_', '_', '_', '_', '_'])
  })

  it('resetResources() 清空每关产出计数', () => {
    state.classResourceProduced = { fragment: 10, mutagen: 5 }
    state.fragmentQueuePosition = 4

    resetResources()

    expect(state.classResourceProduced).toEqual({})
    expect(state.fragmentQueuePosition).toBe(0)
  })

  it('连续切换职业无残留（手动设置）', () => {
    // Run A: 造词师
    state.classId = 'wordsmith'
    state.fragmentInventory.a = 10
    state.craftedWords.push('hello')

    // 重置（模拟新 Run）
    resetState()

    // Run B: 蜕变师
    state.classId = 'metamorph'
    state.mutagenInventory = 5

    // 造词师字段应为初始值
    expect(state.fragmentInventory.a).toBe(0)
    expect(state.craftedWords).toEqual([])
    // 蜕变师字段正确
    expect(state.mutagenInventory).toBe(5)
    expect(state.classId).toBe('metamorph')
  })

  it('selectClass 切换：造词师→重置→蜕变师，starter relic 无残留', () => {
    // Run A: 选造词师
    classManager.selectClass('wordsmith')
    expect(state.classId).toBe('wordsmith')
    expect(state.player.relics.has('apprentice_notes')).toBe(true)

    // 重置（模拟新 Run）
    resetState()

    // Run B: 选蜕变师
    classManager.selectClass('metamorph')
    expect(state.classId).toBe('metamorph')
    expect(state.player.relics.has('primal_mutant')).toBe(true)
    // 造词师 starter relic 不应残留
    expect(state.player.relics.has('apprentice_notes')).toBe(false)
  })
})

// ==================== Task 3: 无职业模式回归 ====================

describe('无职业模式回归 (Task 3)', () => {
  beforeEach(() => {
    resetState()
    state.classId = 'none'
  })

  it('FeatureGate: 无职业时所有功能启用', () => {
    expect(isFeatureEnabled('pack-system')).toBe(true)
    expect(isFeatureEnabled('enchant-choice')).toBe(true)
  })

  it('ClassResourceFilter: 无职业时排除 fragment/mutagen 资源技能', () => {
    expect(isResourceActiveForClass('score', 'none')).toBe(true)
    expect(isResourceActiveForClass('gold', 'none')).toBe(true)
    expect(isResourceActiveForClass('fragment', 'none')).toBe(false)
    expect(isResourceActiveForClass('mutagen', 'none')).toBe(false)
  })

  it('generateRelicCandidates: 无职业时排除所有专属遗物', () => {
    const wordsmithRelics = new Set([
      'apprentice_notes', 'masters_lexicon', 'perpetual_queue',
      'word_scissors', 'resonance_mold',
    ])
    const metamorphRelics = new Set([
      'primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer',
      'chaos_seed', 'fittest_survivors',
    ])
    const candidates = generateRelicCandidates()
    for (const id of candidates) {
      expect(wordsmithRelics.has(id)).toBe(false)
      expect(metamorphRelics.has(id)).toBe(false)
    }
  })

})

// ==================== Task 4: 造词师 E2E 集成 ====================

describe('造词师 End-to-End 集成 (Task 4)', () => {
  beforeEach(() => {
    resetState()
  })

  it('selectClass("wordsmith") 设置 classId 并添加 starter relic', () => {
    classManager.selectClass('wordsmith')
    expect(state.classId).toBe('wordsmith')
    expect(state.player.relics.has('apprentice_notes')).toBe(true)
  })

  it('造词师 FeatureGate: 无牌包+有附魔选择', () => {
    state.classId = 'wordsmith'
    expect(isFeatureEnabled('pack-system')).toBe(false)
    expect(isFeatureEnabled('enchant-choice')).toBe(true)
  })

  it('craftWord 消耗碎片+香蕉 → word 进入 wordDeck 和 craftedWords', () => {
    state.classId = 'wordsmith'
    state.fragmentInventory.c = 1
    state.fragmentInventory.a = 1
    state.fragmentInventory.t = 1
    state.gold = 100

    const success = craftWord(['c', 'a', 't'], vi.fn())
    expect(success).toBe(true)
    expect(state.fragmentInventory.c).toBe(0)
    expect(state.fragmentInventory.a).toBe(0)
    expect(state.fragmentInventory.t).toBe(0)
    expect(state.craftedWords).toContain('cat')
    expect(state.player.wordDeck).toContain('cat')
  })

  it('craftWord 碎片不足时失败', () => {
    state.classId = 'wordsmith'
    state.fragmentInventory.c = 1
    state.fragmentInventory.a = 0
    state.fragmentInventory.t = 1
    state.gold = 100

    const success = craftWord(['c', 'a', 't'], vi.fn())
    expect(success).toBe(false)
    expect(state.craftedWords).not.toContain('cat')
  })
})

// ==================== Task 5: 蜕变师 E2E 集成 ====================

describe('蜕变师 End-to-End 集成 (Task 5)', () => {
  beforeEach(() => {
    resetState()
  })

  it('selectClass("metamorph") 设置 classId 并添加 starter relic', () => {
    classManager.selectClass('metamorph')
    expect(state.classId).toBe('metamorph')
    expect(state.player.relics.has('primal_mutant')).toBe(true)
  })

  it('蜕变师 FeatureGate: 无附魔选择+有牌包', () => {
    state.classId = 'metamorph'
    expect(isFeatureEnabled('enchant-choice')).toBe(false)
    expect(isFeatureEnabled('pack-system')).toBe(true)
  })

})

// ==================== Task 6: FeatureGate 集成验证 ====================

describe('FeatureGate 2×3 矩阵全覆盖 (Task 6)', () => {
  beforeEach(() => {
    resetState()
  })

  // pack-system
  it('none: pack-system = true', () => {
    state.classId = 'none'
    expect(isFeatureEnabled('pack-system')).toBe(true)
  })
  it('wordsmith: pack-system = false', () => {
    state.classId = 'wordsmith'
    expect(isFeatureEnabled('pack-system')).toBe(false)
  })
  it('metamorph: pack-system = true', () => {
    state.classId = 'metamorph'
    expect(isFeatureEnabled('pack-system')).toBe(true)
  })

  // enchant-choice
  it('none: enchant-choice = true', () => {
    state.classId = 'none'
    expect(isFeatureEnabled('enchant-choice')).toBe(true)
  })
  it('wordsmith: enchant-choice = true', () => {
    state.classId = 'wordsmith'
    expect(isFeatureEnabled('enchant-choice')).toBe(true)
  })
  it('metamorph: enchant-choice = false', () => {
    state.classId = 'metamorph'
    expect(isFeatureEnabled('enchant-choice')).toBe(false)
  })
})

// ==================== Task 6 补充: generateRelicCandidates 职业过滤 ====================

describe('generateRelicCandidates 职业过滤 (Task 6.4)', () => {
  const wordsmithRelics = new Set([
    'apprentice_notes', 'masters_lexicon', 'perpetual_queue',
    'word_scissors', 'resonance_mold',
  ])
  const metamorphRelics = new Set([
    'primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer',
    'chaos_seed', 'fittest_survivors',
  ])

  beforeEach(() => {
    resetState()
  })

  it('造词师不可获得蜕变师遗物', () => {
    state.classId = 'wordsmith'
    const candidates = generateRelicCandidates()
    // 不应出现蜕变师专属遗物
    for (const id of candidates) {
      expect(metamorphRelics.has(id)).toBe(false)
    }
    // 确认返回了候选遗物（排除过滤后仍有可用遗物）
    expect(candidates.length).toBeGreaterThan(0)
  })

  it('蜕变师不可获得造词师遗物', () => {
    state.classId = 'metamorph'
    const candidates = generateRelicCandidates()
    for (const id of candidates) {
      expect(wordsmithRelics.has(id)).toBe(false)
    }
    expect(candidates.length).toBeGreaterThan(0)
  })
})

// ==================== Task 7: 资源 UI 隔离验证 ====================

describe('资源 UI 隔离逻辑验证 (Task 7)', () => {
  beforeEach(() => {
    resetState()
  })

  it('fragment 仅在造词师激活时有效', () => {
    expect(isResourceActiveForClass('fragment', 'wordsmith')).toBe(true)
    expect(isResourceActiveForClass('fragment', 'metamorph')).toBe(false)
    expect(isResourceActiveForClass('fragment', 'none')).toBe(false)
  })

  it('mutagen 仅在蜕变师激活时有效', () => {
    expect(isResourceActiveForClass('mutagen', 'metamorph')).toBe(true)
    expect(isResourceActiveForClass('mutagen', 'wordsmith')).toBe(false)
    expect(isResourceActiveForClass('mutagen', 'none')).toBe(false)
  })

  it('通用资源在所有职业下均有效', () => {
    const genericResources = ['base', 'score', 'multiplier', 'time', 'gold'] as const
    const classIds = ['none', 'wordsmith', 'metamorph'] as const
    for (const res of genericResources) {
      for (const cls of classIds) {
        expect(isResourceActiveForClass(res, cls)).toBe(true)
      }
    }
  })

})

// ==================== Task 8: 存档往返集成 ====================

describe('存档往返集成 (Task 8)', () => {
  it('造词师全字段存档恢复', () => {
    const rs = new RunState()
    const d = rs.getState() as any
    d.classId = 'wordsmith'
    d.fragmentInventory = { a: 5, b: 0, e: 3, t: 2 }
    d.fragmentQueue = ['a', 'e', 't', '_', '_', '_']
    d.fragmentQueuePosition = 3
    d.craftedWords = ['ate', 'tea', 'eat']
    d.wordDeck = ['hello', 'world', 'ate', 'tea', 'eat']
    d.evolvedSkills.set('conv_1', 'conv_1_evo')
    d.relicStates = { apprentice_notes: 1 }

    const json = JSON.parse(JSON.stringify(rs.serialize()))
    const restored = RunState.deserialize(json)
    const rd = restored.getState()

    expect(rd.classId).toBe('wordsmith')
    expect(rd.fragmentInventory.a).toBe(5)
    expect(rd.fragmentInventory.e).toBe(3)
    expect(rd.fragmentQueue).toEqual(['a', 'e', 't', '_', '_', '_'])
    expect(rd.fragmentQueuePosition).toBe(3)
    expect(rd.craftedWords).toEqual(['ate', 'tea', 'eat'])
    expect(rd.wordDeck).toEqual(['hello', 'world', 'ate', 'tea', 'eat'])
    expect(rd.evolvedSkills.get('conv_1')).toBe('conv_1_evo')
    expect(rd.relicStates.apprentice_notes).toBe(1)
  })

  it('蜕变师全字段存档恢复', () => {
    const rs = new RunState()
    const d = rs.getState() as any
    d.classId = 'metamorph'
    d.mutagenInventory = 12
    d.seenSkillTypes.add('producer')
    d.seenSkillTypes.add('converter')
    d.seenSkillTypes.add('amplifier')
    d.relicStates = { primal_mutant: 0, fittest_conv_mut_1: 1 }

    const json = JSON.parse(JSON.stringify(rs.serialize()))
    const restored = RunState.deserialize(json)
    const rd = restored.getState()

    expect(rd.classId).toBe('metamorph')
    expect(rd.mutagenInventory).toBe(12)
    expect(rd.seenSkillTypes.size).toBe(3)
    expect(rd.relicStates.primal_mutant).toBe(0)
    expect(rd.relicStates.fittest_conv_mut_1).toBe(1)
  })
})
