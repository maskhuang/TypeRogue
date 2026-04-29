// ============================================
// Story 60.2: Pack 多词拣选弹窗集成测试
// ============================================
// 验证 BUY pack 路径分支：单词直接入库 / 多词弹 picker；
// finalizePackPick / cancelPackPick 状态变更。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import {
  __test,
  finalizePackPick,
  cancelPackPick,
} from '../../../src/ui/shopPreview'
import type { WordPack, WordEffect, ShopItem, PackCondition } from '../../../src/core/types'
import type { ItemDescriptor } from '../../../src/ui/itemDescriptors'

vi.mock('../../../src/effects/sound', () => ({ playSound: vi.fn() }))

// shopPreview 内部会调 document.getElementById 等；node env 下无 DOM → stub
const STUB_DOC = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [] as unknown[],
  body: { appendChild: () => undefined, contains: () => false },
  createElement: () => ({ style: {}, classList: { add: () => undefined, remove: () => undefined } }),
}

beforeEach(() => {
  resetState()
  __test.resetUndoStack()
  __test.setPendingPackPick(null)
  vi.stubGlobal('document', STUB_DOC)
  state.gold = 100
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ===== Helpers =====

function makePack(words: string[], pickCount: number, opts?: { wordEffect?: WordEffect; rarity?: 0|1|2|3 }): WordPack {
  const cond: PackCondition = { type: 'high_freq' } as PackCondition
  return {
    condition: cond,
    name: 'TEST_PACK',
    desc: 'test',
    words,
    pickCount,
    cost: 12,
    rarity: opts?.rarity ?? 1,
    wordEffect: opts?.wordEffect,
  }
}

function makeDescriptor(pack: WordPack, sku = 'PCK-001', price = 12): ItemDescriptor {
  const item: ShopItem = {
    type: 'pack',
    cost: price,
    pack,
  } as ShopItem
  return {
    sku,
    name: pack.name,
    nameAbbrev: pack.name,
    kind: 'pack',
    rarity: pack.rarity,
    rarityLabel: 'TEST',
    clearance: '4-B',
    price,
    stockNow: 1,
    stockMax: 1,
    desc: pack.desc,
    effect: '—',
    affixLine: '—',
    triggerHint: 'PURCHASE',
    shapeColor: 'gray',
    shapeTag: '[—]',
    redacted: false,
    upgrade: false,
    synergyCount: 0,
    originalItem: item,
  } as unknown as ItemDescriptor
}

// ===== Tests =====

describe('Story 60.2 · pack picker dispatch', () => {
  it('AC5 · 单词 pack（words.length === pickCount）走 direct 路径，gold/wordDeck/undoStack 全 update', () => {
    const pack = makePack(['cat'], 1)
    const d = makeDescriptor(pack)

    __test.executeBuyPack(d)

    expect(state.gold).toBe(100 - 12)
    expect(state.player.wordDeck).toContain('cat')
    expect(__test.getUndoStack()).toHaveLength(1)
    expect(__test.getUndoStack()[0]).toMatchObject({ kind: 'pack', words: ['cat'], price: 12 })
    expect(__test.getPendingPackPick()).toBeNull()
  })

  it('AC1 · 多词 pack（words.length > pickCount）不扣钱、wordDeck 不变、undoStack 不 push、pending 已设置', () => {
    const pack = makePack(['alpha', 'beta', 'gamma'], 1)
    const d = makeDescriptor(pack)

    __test.executeBuyPack(d)

    // 多词路径：deferred deduction
    expect(state.gold).toBe(100)
    expect(state.player.wordDeck).toHaveLength(0)
    expect(__test.getUndoStack()).toHaveLength(0)
    expect(__test.getPendingPackPick()).not.toBeNull()
    expect(__test.getPendingPackPick()?.pack.words).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('M4 fix · direct 路径 wordEffect: 非 wordsmith 写入 state.wordEffects', () => {
    const eff: WordEffect = { type: 'multi_score', value: 2 } as WordEffect
    const pack = makePack(['cat'], 1, { wordEffect: eff })
    const d = makeDescriptor(pack)
    state.classId = 'none'

    __test.executeBuyPack(d)

    expect(state.player.wordDeck).toEqual(['cat'])
    expect(state.wordEffects.get('cat')).toEqual(eff)
  })

  it('M4 fix · direct 路径 wordEffect: Wordsmith 类不写入', () => {
    const eff: WordEffect = { type: 'multi_score', value: 2 } as WordEffect
    const pack = makePack(['cat'], 1, { wordEffect: eff })
    const d = makeDescriptor(pack)
    state.classId = 'wordsmith'

    __test.executeBuyPack(d)

    expect(state.player.wordDeck).toEqual(['cat'])
    expect(state.wordEffects.has('cat')).toBe(false)
  })
})

describe('Story 60.2 · finalizePackPick (AC3)', () => {
  it('选词后扣钱 + 入 wordDeck + push undoStack（entry.words === [pickedWord]）', () => {
    const pack = makePack(['alpha', 'beta', 'gamma'], 1)
    const d = makeDescriptor(pack, 'PCK-X', 18)
    __test.setPendingPackPick({ d, pack })

    finalizePackPick('beta')

    expect(state.gold).toBe(100 - 18)
    expect(state.player.wordDeck).toEqual(['beta'])
    const stk = __test.getUndoStack()
    expect(stk).toHaveLength(1)
    expect(stk[0]).toMatchObject({ kind: 'pack', sku: 'PCK-X', price: 18, words: ['beta'] })
    expect(__test.getPendingPackPick()).toBeNull()
  })

  it('AC9e · wordEffect: 非 wordsmith 类时写入 state.wordEffects', () => {
    const eff: WordEffect = { type: 'multi_score', value: 2 } as WordEffect
    const pack = makePack(['alpha', 'beta', 'gamma'], 1, { wordEffect: eff })
    const d = makeDescriptor(pack)
    __test.setPendingPackPick({ d, pack })
    state.classId = 'none'

    finalizePackPick('beta')

    expect(state.wordEffects.get('beta')).toEqual(eff)
  })

  it('AC9e · wordEffect: Wordsmith 类时不写入（造词师拆词逻辑）', () => {
    const eff: WordEffect = { type: 'multi_score', value: 2 } as WordEffect
    const pack = makePack(['alpha', 'beta', 'gamma'], 1, { wordEffect: eff })
    const d = makeDescriptor(pack)
    __test.setPendingPackPick({ d, pack })
    state.classId = 'wordsmith'

    finalizePackPick('beta')

    expect(state.wordEffects.has('beta')).toBe(false)
  })

  it('pending 为 null 时调用 finalize 是 no-op', () => {
    __test.setPendingPackPick(null)
    finalizePackPick('beta')

    expect(state.gold).toBe(100)
    expect(state.player.wordDeck).toHaveLength(0)
    expect(__test.getUndoStack()).toHaveLength(0)
  })
})

describe('Story 60.2 · cancelPackPick (AC4)', () => {
  it('取消后 state 100% 不变（gold/wordDeck/undoStack 与初始一致）', () => {
    const pack = makePack(['alpha', 'beta', 'gamma'], 1)
    const d = makeDescriptor(pack, 'PCK-Y', 25)
    const goldBefore = state.gold
    const deckBefore = [...state.player.wordDeck]
    const stkBefore = __test.getUndoStack().length

    __test.setPendingPackPick({ d, pack })
    cancelPackPick()

    expect(state.gold).toBe(goldBefore)
    expect(state.player.wordDeck).toEqual(deckBefore)
    expect(__test.getUndoStack()).toHaveLength(stkBefore)
    expect(__test.getPendingPackPick()).toBeNull()
  })

  it('pending 为 null 时调用 cancel 是 no-op', () => {
    __test.setPendingPackPick(null)
    expect(() => cancelPackPick()).not.toThrow()
    expect(state.gold).toBe(100)
  })
})
