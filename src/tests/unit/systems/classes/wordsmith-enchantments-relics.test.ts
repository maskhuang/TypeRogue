// ============================================
// 打字肉鸽 - 造词师专属附魔 + 遗物测试
// ============================================
// Story 32.7: 3 附魔 + 7 遗物数据/机制/池过滤

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ENCHANTMENTS, drawEnchantmentPair, isEnchantment } from '../../../../src/data/enchantments'
import { RELICS } from '../../../../src/data/relics'
import { state, resetState } from '../../../../src/core/state'

// Mock DOM + sound
vi.mock('../../../../src/effects/sound', () => ({ playSound: vi.fn() }))
vi.mock('../../../../src/systems/battle', () => ({
  showFeedback: vi.fn(),
  updateHUD: vi.fn(),
  setPseudoInfiniteVisual: vi.fn(),
  renderRelicDisplay: vi.fn(),
}))
vi.mock('../../../../src/ui/elements', () => ({
  getElements: () => ({ triggerZone: { appendChild: vi.fn() } }),
}))
beforeEach(() => {
  const mockEl = { className: '', innerHTML: '', style: { left: '' }, remove: vi.fn() }
  vi.stubGlobal('document', { createElement: () => mockEl })
})

// =====================
// 附魔数据完整性
// =====================
describe('造词师专属附魔数据', () => {
  const classExclusives = Object.values(ENCHANTMENTS).filter(e => e.category === 'class-exclusive')

  it('共 6 个 class-exclusive 附魔', () => {
    expect(classExclusives.length).toBe(6)
  })

  it('包含 harvest/letter_affinity/overflow', () => {
    const ids = classExclusives.map(e => e.id)
    expect(ids).toContain('ench_harvest')
    expect(ids).toContain('ench_letter_affinity')
    expect(ids).toContain('ench_overflow')
  })

  it('每个都有必要字段', () => {
    for (const ench of classExclusives) {
      expect(ench.name).toBeTruthy()
      expect(ench.icon).toBeTruthy()
      expect(ench.desc).toBeTruthy()
      expect(typeof ench.effectValue).toBe('number')
      expect(ench.effectValue).toBeGreaterThan(0)
    }
  })

  it('effectValue 正确', () => {
    expect(ENCHANTMENTS['ench_harvest'].effectValue).toBe(0.08)
    expect(ENCHANTMENTS['ench_letter_affinity'].effectValue).toBe(0.25)
    expect(ENCHANTMENTS['ench_overflow'].effectValue).toBe(0.20)
  })
})

// =====================
// 附魔池过滤
// =====================
describe('drawEnchantmentPair 池过滤', () => {
  beforeEach(() => resetState())

  it('非造词师不出现 class-exclusive 附魔', () => {
    state.classId = 'none'
    for (let i = 0; i < 50; i++) {
      const [a, b] = drawEnchantmentPair()
      expect(ENCHANTMENTS[a].category).not.toBe('class-exclusive')
      expect(ENCHANTMENTS[b].category).not.toBe('class-exclusive')
    }
  })

  it('造词师可出现 class-exclusive 附魔', () => {
    state.classId = 'wordsmith'
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const [a, b] = drawEnchantmentPair()
      seen.add(a)
      seen.add(b)
    }
    const classExclusiveSeen = [...seen].filter(id => ENCHANTMENTS[id].category === 'class-exclusive')
    expect(classExclusiveSeen.length).toBeGreaterThan(0)
  })
})

// =====================
// 丰收附魔触发
// =====================
describe('丰收附魔 — onWordCrafted', () => {
  beforeEach(() => resetState())

  it('craftWord 后 growthValues 增加 0.08', async () => {
    const { onWordCrafted } = await import('../../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_harvest')

    onWordCrafted()
    expect(state.growthValues.get('prod_burst')).toBeCloseTo(0.08)
  })

  it('多次造词后累加', async () => {
    const { onWordCrafted } = await import('../../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.enchantedSkills.set('prod_burst', 'ench_harvest')

    onWordCrafted()
    onWordCrafted()
    onWordCrafted()
    expect(state.growthValues.get('prod_burst')).toBeCloseTo(0.24)
  })

  it('harvest 成长值在 getEnchantmentMultiplier 中生效', async () => {
    const { onWordCrafted, getEnchantmentMultiplier } = await import('../../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_harvest')

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.0)
    onWordCrafted()
    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.08)
    onWordCrafted()
    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.16)
  })

  it('无 harvest 附魔时不累加', async () => {
    const { onWordCrafted } = await import('../../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.enchantedSkills.set('prod_burst', 'ench_growth_adjacent')

    onWordCrafted()
    expect(state.growthValues.get('prod_burst') || 0).toBe(0)
  })
})

// =====================
// 字母亲和附魔
// =====================
describe('字母亲和附魔 — getEnchantmentMultiplier', () => {
  beforeEach(() => resetState())

  it('队列含绑定键字母时 multiplier=1.25', async () => {
    const { getEnchantmentMultiplier } = await import('../../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_letter_affinity')
    state.fragmentQueue = ['f', 'a', 'b', '_', 'c', 'd']

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.25)
  })

  it('队列不含绑定键字母时 multiplier=1.0', async () => {
    const { getEnchantmentMultiplier } = await import('../../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_letter_affinity')
    state.fragmentQueue = ['a', 'b', 'c', '_', 'd', 'e']

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.0)
  })
})

// =====================
// 满溢附魔
// =====================
describe('满溢附魔 — getEnchantmentMultiplier', () => {
  beforeEach(() => resetState())

  it('0 个字母 ≥15 → 1.0', async () => {
    const { getEnchantmentMultiplier } = await import('../../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_overflow')
    state.fragmentInventory = { a: 5, b: 10 }

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.0)
  })

  it('1 个字母 ≥15 → 1.20', async () => {
    const { getEnchantmentMultiplier } = await import('../../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_overflow')
    state.fragmentInventory = { a: 15 }

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.20)
  })

  it('2 个字母 ≥15 → 1.25', async () => {
    const { getEnchantmentMultiplier } = await import('../../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_overflow')
    state.fragmentInventory = { a: 15, b: 20 }

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.25)
  })

  it('3 个字母 ≥15 → 1.30', async () => {
    const { getEnchantmentMultiplier } = await import('../../../../src/systems/skills')
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.player.enchantedSkills.set('prod_burst', 'ench_overflow')
    state.fragmentInventory = { a: 15, b: 15, c: 15 }

    expect(getEnchantmentMultiplier('prod_burst', 'f')).toBeCloseTo(1.30)
  })
})

// =====================
// 遗物数据完整性
// =====================
describe('造词师专属遗物数据', () => {
  const wordsmithRelicIds = [
    'apprentice_notes', 'masters_lexicon', 'perpetual_queue',
    'refining_lens', 'word_scissors', 'resonance_mold', 'fragment_prism',
  ]

  it('7 个造词师遗物都存在', () => {
    for (const id of wordsmithRelicIds) {
      expect(RELICS[id], `missing relic: ${id}`).toBeDefined()
    }
  })

  it('每个遗物有完整字段', () => {
    for (const id of wordsmithRelicIds) {
      const r = RELICS[id]
      expect(r.id).toBe(id)
      expect(r.name).toBeTruthy()
      expect(r.icon).toBeTruthy()
      expect(r.description).toBeTruthy()
      expect(r.rarity).toBeTruthy()
      expect(typeof r.basePrice).toBe('number')
    }
  })

  it('稀有度正确', () => {
    expect(RELICS['apprentice_notes'].rarity).toBe('common')
    expect(RELICS['masters_lexicon'].rarity).toBe('legendary')
    expect(RELICS['perpetual_queue'].rarity).toBe('rare')
    expect(RELICS['refining_lens'].rarity).toBe('rare')
    expect(RELICS['word_scissors'].rarity).toBe('rare')
    expect(RELICS['resonance_mold'].rarity).toBe('legendary')
    expect(RELICS['fragment_prism'].rarity).toBe('legendary')
  })
})

// =====================
// 遗物池过滤
// =====================
describe('遗物池过滤 — generateRelicCandidates', () => {
  beforeEach(() => resetState())

  it('非造词师不出现造词师专属遗物', async () => {
    const { generateRelicCandidates } = await import('../../../../src/systems/relicPicker')
    state.classId = 'none'
    const candidates = generateRelicCandidates()
    const wordsmithIds = new Set([
      'apprentice_notes', 'masters_lexicon', 'perpetual_queue',
      'refining_lens', 'word_scissors', 'resonance_mold', 'fragment_prism',
    ])
    for (const id of candidates) {
      expect(wordsmithIds.has(id), `non-wordsmith got ${id}`).toBe(false)
    }
  })
})

// =====================
// 学徒笔记
// =====================
describe('学徒笔记 — initRelicState', () => {
  beforeEach(() => resetState())

  it('获得后 a/e/i/o/u 各 +3', async () => {
    const { initRelicState } = await import('../../../../src/systems/relics/RelicPipeline')
    state.player.relics.add('apprentice_notes')
    initRelicState('apprentice_notes')

    for (const vowel of ['a', 'e', 'i', 'o', 'u']) {
      expect(state.fragmentInventory[vowel]).toBe(3)
    }
  })
})

// =====================
// 大师词典
// =====================
describe('大师词典 — initRelicState + getMaxQueueLength', () => {
  beforeEach(() => resetState())

  it('获得后全字母碎片各 +2', async () => {
    const { initRelicState } = await import('../../../../src/systems/relics/RelicPipeline')
    state.player.relics.add('masters_lexicon')
    initRelicState('masters_lexicon')

    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      expect(state.fragmentInventory[letter]).toBe(2)
    }
  })

  it('getMaxQueueLength 返回 8', async () => {
    const { getMaxQueueLength } = await import('../../../../src/systems/classes/FragmentQueue')
    state.player.relics.add('masters_lexicon')

    expect(getMaxQueueLength()).toBe(8)
  })
})

// =====================
// 共鸣字模
// =====================
describe('共鸣字模 — calculateCraftCost', () => {
  beforeEach(() => resetState())

  it('无遗物时重复字母有金币成本', async () => {
    const { calculateCraftCost } = await import('../../../../src/systems/classes/CraftingStation')
    const { gold } = calculateCraftCost(['a', 'a'])
    expect(gold).toBeGreaterThan(0)
  })

  it('有 resonance_mold 时金币为 0', async () => {
    const { calculateCraftCost } = await import('../../../../src/systems/classes/CraftingStation')
    state.player.relics.add('resonance_mold')
    const { gold } = calculateCraftCost(['a', 'a', 'a'])
    expect(gold).toBe(0)
  })

  it('有 resonance_mold 时碎片成本不变', async () => {
    const { calculateCraftCost } = await import('../../../../src/systems/classes/CraftingStation')
    state.player.relics.add('resonance_mold')
    const { fragments } = calculateCraftCost(['a', 'b', 'a'])
    expect(fragments['a']).toBe(2)
    expect(fragments['b']).toBe(1)
  })
})

// =====================
// 拆词剪刀
// =====================
describe('拆词剪刀 — deconstructWord', () => {
  beforeEach(() => resetState())

  it('返还 50% 碎片（向下取整）', async () => {
    const { deconstructWord } = await import('../../../../src/systems/classes/CraftingStation')
    state.craftedWords = ['aaab']
    state.player.wordDeck = ['aaab']
    state.fragmentInventory = { a: 0, b: 0 }

    deconstructWord('aaab', vi.fn())

    // a×3 → floor(3*0.5)=1, b×1 → floor(1*0.5)=0
    expect(state.fragmentInventory['a']).toBe(1)
    expect(state.fragmentInventory['b']).toBe(0)
  })

  it('多字母返还正确', async () => {
    const { deconstructWord } = await import('../../../../src/systems/classes/CraftingStation')
    state.craftedWords = ['aabb']
    state.player.wordDeck = ['aabb']
    state.fragmentInventory = { a: 0, b: 0 }

    deconstructWord('aabb', vi.fn())

    // a×2, b×2 → 各返还 floor(2*0.5) = 1
    expect(state.fragmentInventory['a']).toBe(1)
    expect(state.fragmentInventory['b']).toBe(1)
  })

  it('从 craftedWords 和 wordDeck 移除', async () => {
    const { deconstructWord } = await import('../../../../src/systems/classes/CraftingStation')
    state.craftedWords = ['test', 'word']
    state.player.wordDeck = ['test', 'word']

    deconstructWord('test', vi.fn())

    expect(state.craftedWords).toEqual(['word'])
    expect(state.player.wordDeck).toEqual(['word'])
  })

  it('不存在的词返回 false', async () => {
    const { deconstructWord } = await import('../../../../src/systems/classes/CraftingStation')
    state.craftedWords = ['hello']
    const result = deconstructWord('nonexistent', vi.fn())
    expect(result).toBe(false)
  })
})

// =====================
// 碎片棱镜
// =====================
describe('碎片棱镜 — distributeFragments', () => {
  beforeEach(() => resetState())

  it('无棱镜时正常产出单字母', async () => {
    const { distributeFragments } = await import('../../../../src/systems/classes/FragmentQueue')
    state.fragmentQueue = ['e']
    state.fragmentQueuePosition = 0
    const result = distributeFragments(1)
    expect(result).toEqual({ e: 1 })
  })

  it('有棱镜时中间字母产出 3 个', async () => {
    const { distributeFragments } = await import('../../../../src/systems/classes/FragmentQueue')
    state.player.relics.add('fragment_prism')
    state.fragmentQueue = ['e']
    state.fragmentQueuePosition = 0
    const result = distributeFragments(1)
    expect(result['d']).toBe(1)
    expect(result['e']).toBe(1)
    expect(result['f']).toBe(1)
  })

  it('有棱镜时 a 只产出 a+b', async () => {
    const { distributeFragments } = await import('../../../../src/systems/classes/FragmentQueue')
    state.player.relics.add('fragment_prism')
    state.fragmentQueue = ['a']
    state.fragmentQueuePosition = 0
    const result = distributeFragments(1)
    expect(result['a']).toBe(1)
    expect(result['b']).toBe(1)
    expect(result['`']).toBeUndefined() // no char before 'a'
  })

  it('有棱镜时 z 只产出 y+z', async () => {
    const { distributeFragments } = await import('../../../../src/systems/classes/FragmentQueue')
    state.player.relics.add('fragment_prism')
    state.fragmentQueue = ['z']
    state.fragmentQueuePosition = 0
    const result = distributeFragments(1)
    expect(result['y']).toBe(1)
    expect(result['z']).toBe(1)
    expect(result['{']).toBeUndefined() // no char after 'z'
  })

  it('跳过格不受棱镜影响', async () => {
    const { distributeFragments } = await import('../../../../src/systems/classes/FragmentQueue')
    state.player.relics.add('fragment_prism')
    state.fragmentQueue = ['_', 'e']
    state.fragmentQueuePosition = 0
    const result = distributeFragments(1)
    // '_' 被跳过，'e' 产出 d+e+f
    expect(result['d']).toBe(1)
    expect(result['e']).toBe(1)
    expect(result['f']).toBe(1)
  })
})

// =====================
// 永动队列 — battle_start 完整队列采集
// =====================
describe('永动队列 — routeFragmentsToInventory', () => {
  beforeEach(() => resetState())

  it('routeFragmentsToInventory(6) 按队列分配碎片到库存', async () => {
    const { routeFragmentsToInventory } = await import('../../../../src/systems/classes/FragmentQueue')
    state.fragmentQueue = ['a', 'b', 'c', 'd', 'e', 'f']
    state.fragmentQueuePosition = 0

    routeFragmentsToInventory(6)

    // 6 个碎片分配到 6 个字母各 1 个
    for (const letter of ['a', 'b', 'c', 'd', 'e', 'f']) {
      expect(state.fragmentInventory[letter]).toBe(1)
    }
  })

  it('getMaxQueueLength 返回正确队列长度用于永动队列', async () => {
    const { getMaxQueueLength } = await import('../../../../src/systems/classes/FragmentQueue')
    expect(getMaxQueueLength()).toBe(6)
    state.player.relics.add('masters_lexicon')
    expect(getMaxQueueLength()).toBe(8)
  })
})

// =====================
// 精炼透镜 — 转化者碎片读数 +30%
// =====================
describe('精炼透镜 — triggerConverter sourceVal', () => {
  beforeEach(() => resetState())

  it('fragment 源转化者有 refining_lens 时 sourceVal ×1.3', async () => {
    const { triggerConverter } = await import('../../../../src/systems/skills')
    // 设置一个 fragment→score 转化者
    state.player.skills.set('conv_fragment_score_add', { level: 1 })
    state.player.bindings.set('f', 'conv_fragment_score_add')
    state.player.relics.add('refining_lens')
    state.classResourceProduced = { fragment: 10 }

    const scoreBefore = state.resources.score
    triggerConverter('conv_fragment_score_add', 'f')
    const scoreAfter = state.resources.score

    // 有 refining_lens 时 delta 更大
    const deltaWith = scoreAfter - scoreBefore

    // 重置并测试无遗物
    resetState()
    state.player.skills.set('conv_fragment_score_add', { level: 1 })
    state.player.bindings.set('f', 'conv_fragment_score_add')
    state.classResourceProduced = { fragment: 10 }

    const scoreBefore2 = state.resources.score
    triggerConverter('conv_fragment_score_add', 'f')
    const deltaWithout = state.resources.score - scoreBefore2

    // 有遗物时的增量应为无遗物的 1.3 倍
    expect(deltaWith).toBeCloseTo(deltaWithout * 1.3, 1)
  })
})
