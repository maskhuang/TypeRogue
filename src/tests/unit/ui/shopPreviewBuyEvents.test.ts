// ============================================
// Story 60.7: Terminal BUY/SELL/UND 副作用闭合测试
// ============================================
// 验证：
//   - executeBuySkill: shop:purchase emit + evaluateEquipQuests + applyMaxSkillLevelOnPurchase
//   - executeBuyRelic: d_100 → rerollAllAffixes / universal_furnace → initFurnace / shop:purchase emit
//   - cmdSell: evaluateEquipQuests
//   - cmdUndo skill: evaluateEquipQuests

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'

// ===== Hoisted spies (vi.mock 必须在 import 被测模块之前) =====
const evaluateEquipQuestsSpy = vi.fn()
const applyMaxSkillLevelOnPurchaseSpy = vi.fn()
const rerollAllAffixesSpy = vi.fn(() => 0)
const initFurnaceSpy = vi.fn()
const eventBusEmitSpy = vi.fn()

vi.mock('../../../src/data/affixTrigger', async () => {
  const actual = await vi.importActual<typeof import('../../../src/data/affixTrigger')>(
    '../../../src/data/affixTrigger',
  )
  return { ...actual, evaluateEquipQuests: (...args: unknown[]) => evaluateEquipQuestsSpy(...args) }
})

vi.mock('../../../src/systems/shop', async () => {
  const actual = await vi.importActual<typeof import('../../../src/systems/shop')>(
    '../../../src/systems/shop',
  )
  return {
    ...actual,
    applyMaxSkillLevelOnPurchase: (id: string) => applyMaxSkillLevelOnPurchaseSpy(id),
  }
})

vi.mock('../../../src/systems/relics/SkillRelicBehaviors', async () => {
  const actual = await vi.importActual<typeof import('../../../src/systems/relics/SkillRelicBehaviors')>(
    '../../../src/systems/relics/SkillRelicBehaviors',
  )
  return { ...actual, rerollAllAffixes: () => rerollAllAffixesSpy() }
})

vi.mock('../../../src/systems/relics/ResourceRelicBehaviors', async () => {
  const actual = await vi.importActual<typeof import('../../../src/systems/relics/ResourceRelicBehaviors')>(
    '../../../src/systems/relics/ResourceRelicBehaviors',
  )
  return { ...actual, initFurnace: (rng?: unknown) => initFurnaceSpy(rng) }
})

vi.mock('../../../src/core/events/EventBus', async () => {
  const actual = await vi.importActual<typeof import('../../../src/core/events/EventBus')>(
    '../../../src/core/events/EventBus',
  )
  return {
    ...actual,
    eventBus: {
      ...actual.eventBus,
      emit: (event: string, payload: unknown) => eventBusEmitSpy(event, payload),
      on: () => () => undefined,
      off: () => undefined,
    },
  }
})

vi.mock('../../../src/effects/sound', () => ({ playSound: vi.fn() }))
vi.mock('../../../src/systems/battle', () => ({ startLevel: vi.fn() }))

import { __test } from '../../../src/ui/shopPreview'
import type { ItemDescriptor } from '../../../src/ui/itemDescriptors'
import type { ShopItem } from '../../../src/core/types'

const STUB_DOC = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [] as unknown[],
  createElement: () => ({
    classList: { add: () => undefined, remove: () => undefined },
    setAttribute: () => undefined,
    addEventListener: () => undefined,
    style: {},
    textContent: '',
  }),
  body: {
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
    contains: vi.fn(() => false),
  },
}

beforeEach(() => {
  resetState()
  evaluateEquipQuestsSpy.mockClear()
  applyMaxSkillLevelOnPurchaseSpy.mockClear()
  rerollAllAffixesSpy.mockClear()
  initFurnaceSpy.mockClear()
  eventBusEmitSpy.mockClear()
  vi.stubGlobal('document', STUB_DOC)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ===== Helpers =====
function makeSkillDescriptor(skillId = 'skill_test', price = 30): ItemDescriptor {
  const affixSkill = {
    id: skillId,
    name: 'Test Skill',
    icon: 'X',
    resource: 'chip',
    rarity: 0,
    level: 1,
    affixes: [],
    shapeId: 'monomino',
    rotation: 0,
  } as any
  const item: ShopItem = {
    id: skillId,
    type: 'skill',
    skillId,
    cost: price,
    affixSkill,
  } as any
  return {
    sku: 'SKL-001',
    kind: 'skill',
    name: 'Test Skill',
    nameAbbrev: 'TST',
    iconEmoji: 'X',
    rarity: 0,
    rarityLabel: 'COMMON',
    shapeTag: '[1·]',
    shapeColor: 'green',
    triggerHint: '—',
    desc: '',
    effect: '',
    affixLine: '',
    price,
    stockNow: 1,
    stockMax: 1,
    clearance: '4-B',
    redacted: false,
    upgrade: false,
    synergyCount: 0,
    originalItem: item,
  } as any
}

function makeRelicDescriptor(relicId = 'test_relic', price = 50): ItemDescriptor {
  const item: ShopItem = {
    id: relicId,
    type: 'relic',
    relicId,
    cost: price,
  } as any
  return {
    sku: 'REL-001',
    kind: 'relic',
    name: 'Test Relic',
    nameAbbrev: 'TRL',
    iconEmoji: '✦',
    rarity: 0,
    rarityLabel: 'COMMON',
    shapeTag: '[REL]',
    shapeColor: 'amber',
    triggerHint: '—',
    desc: '',
    effect: '',
    affixLine: '—',
    price,
    stockNow: 1,
    stockMax: 1,
    clearance: '4-B',
    redacted: false,
    upgrade: false,
    synergyCount: 0,
    originalItem: item,
  } as any
}

describe('Story 60.7 · executeBuySkill 副作用', () => {
  it('AC1 触发 shop:purchase 事件 with type=skill + price', () => {
    state.gold = 100
    const d = makeSkillDescriptor('skill_a', 30)
    __test.executeBuySkill(d)
    const purchaseEmits = eventBusEmitSpy.mock.calls.filter(c => c[0] === 'shop:purchase')
    expect(purchaseEmits.length).toBe(1)
    expect(purchaseEmits[0][1]).toMatchObject({ type: 'skill', itemId: 'skill_a', price: 30 })
  })

  it('AC2 触发 evaluateEquipQuests', () => {
    state.gold = 100
    __test.executeBuySkill(makeSkillDescriptor('skill_b', 30))
    expect(evaluateEquipQuestsSpy).toHaveBeenCalledTimes(1)
  })

  it('AC3 触发 applyMaxSkillLevelOnPurchase with skillId', () => {
    state.gold = 100
    __test.executeBuySkill(makeSkillDescriptor('skill_c', 30))
    expect(applyMaxSkillLevelOnPurchaseSpy).toHaveBeenCalledWith('skill_c')
  })

  it('inbox 已满 → 不触发副作用 + 不扣钱', () => {
    state.gold = 100
    state.player.inbox = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'] // INBOX_MAX = 9
    __test.executeBuySkill(makeSkillDescriptor('skill_overflow', 30))
    expect(evaluateEquipQuestsSpy).not.toHaveBeenCalled()
    expect(eventBusEmitSpy).not.toHaveBeenCalled()
    expect(state.gold).toBe(100) // 不扣钱
  })
})

describe('Story 60.7 · executeBuyRelic 副作用', () => {
  it('AC4 d_100 触发 rerollAllAffixes', () => {
    state.gold = 100
    __test.executeBuyRelic(makeRelicDescriptor('d_100', 50))
    expect(rerollAllAffixesSpy).toHaveBeenCalledTimes(1)
  })

  it('AC5 universal_furnace 触发 initFurnace', () => {
    state.gold = 100
    __test.executeBuyRelic(makeRelicDescriptor('universal_furnace', 50))
    expect(initFurnaceSpy).toHaveBeenCalledTimes(1)
  })

  it('AC6 普通 relic 触发 shop:purchase event with type=relic', () => {
    state.gold = 100
    __test.executeBuyRelic(makeRelicDescriptor('test_relic', 50))
    const purchaseEmits = eventBusEmitSpy.mock.calls.filter(c => c[0] === 'shop:purchase')
    expect(purchaseEmits.length).toBe(1)
    expect(purchaseEmits[0][1]).toMatchObject({ type: 'relic', itemId: 'test_relic', price: 50 })
  })

  it('普通 relic 不触发 d_100 / furnace 副作用', () => {
    state.gold = 100
    __test.executeBuyRelic(makeRelicDescriptor('test_relic', 50))
    expect(rerollAllAffixesSpy).not.toHaveBeenCalled()
    expect(initFurnaceSpy).not.toHaveBeenCalled()
  })
})

describe('Story 60.7 · cmdSell 副作用', () => {
  it('AC7 卖出后触发 evaluateEquipQuests', () => {
    state.gold = 100
    // Setup: BUY 一个 skill 进 inbox
    __test.executeBuySkill(makeSkillDescriptor('skill_d', 30))
    evaluateEquipQuestsSpy.mockClear() // 清掉 BUY 触发的那次
    // SELL by SKU
    __test.cmdSell('SKL-001')
    expect(evaluateEquipQuestsSpy).toHaveBeenCalledTimes(1)
  })
})

describe('Story 60.7 · cmdUndo 副作用', () => {
  it('AC8 UND skill 后触发 evaluateEquipQuests', () => {
    state.gold = 100
    __test.executeBuySkill(makeSkillDescriptor('skill_e', 30))
    evaluateEquipQuestsSpy.mockClear()
    __test.cmdUndo()
    expect(evaluateEquipQuestsSpy).toHaveBeenCalledTimes(1)
  })

  it('UND 非 skill（pack/relic）不触发 evaluateEquipQuests', () => {
    state.gold = 100
    __test.executeBuyRelic(makeRelicDescriptor('test_relic_2', 50))
    evaluateEquipQuestsSpy.mockClear()
    __test.cmdUndo()
    expect(evaluateEquipQuestsSpy).not.toHaveBeenCalled()
  })
})

describe('Story 60.7 · review M1 — BUY 路径隔离 catalog 引用', () => {
  it('M1 executeBuySkill 不 mutate catalog 的 affixSkill 引用', () => {
    state.gold = 100
    const d = makeSkillDescriptor('skill_iso', 30)
    const catalogAffixSkill = d.originalItem.affixSkill
    __test.executeBuySkill(d)
    // state.affixSkills 里的实例应该是 clone，与 catalog 不同引用
    const stateSkill = state.affixSkills.get('skill_iso')
    expect(stateSkill).toBeDefined()
    expect(stateSkill).not.toBe(catalogAffixSkill)
  })

  it('M1 BUY → UND → BUY 同一 SKU：catalog affixes 不被叠加 mutate', () => {
    state.gold = 1000
    const d = makeSkillDescriptor('skill_double_buy', 30)
    // 在 catalog affixSkill 上记录原始 affixes 引用 + 初始内容
    const catalogSkill = d.originalItem.affixSkill
    const originalAffixesRef = catalogSkill.affixes
    const originalAffixesSnapshot = JSON.stringify(catalogSkill.affixes)

    __test.executeBuySkill(d)
    __test.cmdUndo()
    __test.executeBuySkill(d)

    // catalog 的 affixes 数组引用未变 + 内容未被叠加 mutate
    expect(catalogSkill.affixes).toBe(originalAffixesRef)
    expect(JSON.stringify(catalogSkill.affixes)).toBe(originalAffixesSnapshot)
  })
})
