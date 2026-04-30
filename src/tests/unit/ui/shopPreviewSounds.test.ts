// ============================================
// Story 60.12: terminal / 工作台音效层测试
// ============================================
// 验证 8 + 1 个新 SOUND_PROFILES 在正确触发点被调用
// 通过 vi.mock effects/sound 的 playSound 为 spy

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'

const playSoundSpy = vi.fn()
vi.mock('../../../src/effects/sound', () => ({
  playSound: (...args: unknown[]) => playSoundSpy(...args),
}))
vi.mock('../../../src/systems/battle', () => ({ startLevel: vi.fn() }))

import { __test } from '../../../src/ui/shopPreview'
import { updateSettings, loadSettings } from '../../../src/core/UserSettings'
import { RELICS } from '../../../src/data/relics'

// ===== Fake DOM stub =====
function makeFakeViewport(): unknown {
  return {
    appendChild: () => undefined,
    scrollTop: 0,
    scrollHeight: 0,
  }
}

const STUB_DOC = {
  getElementById: (id: string) => {
    if (id === 'terminal-viewport') return makeFakeViewport()
    if (id === 'wb-drawer') return {
      id,
      style: { display: '' },
      classList: { add: () => undefined, remove: () => undefined },
      querySelector: () => null,
    }
    if (id === 'wb-drawer-title') return { id, textContent: '' }
    if (id === 'wb-drawer-body') return { id, innerHTML: '' }
    if (id === 'wb-submit-btn') return { setAttribute: vi.fn(), classList: { add: vi.fn() } }
    return null
  },
  querySelector: () => null,
  querySelectorAll: () => [] as unknown[],
  createElement: () => ({
    className: '',
    style: {},
    innerHTML: '',
    textContent: '',
    classList: { add: () => undefined, remove: () => undefined },
    setAttribute: () => undefined,
    addEventListener: () => undefined,
    appendChild: () => undefined,
  }),
  body: {
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
    contains: vi.fn(() => false),
  },
}

beforeEach(() => {
  resetState()
  playSoundSpy.mockClear()
  localStorage.clear()
  loadSettings() // 重置为 DEFAULTS（含 shopSound: true）
  vi.stubGlobal('document', STUB_DOC)
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => { cb(); return 1 })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function calledWith(type: string): boolean {
  return playSoundSpy.mock.calls.some(c => c[0] === type)
}

function makeSkillDescriptor(skillId = 'sk_test', price = 30): unknown {
  const affixSkill = {
    id: skillId, name: 'Test Skill', icon: 'X', resource: 'base',
    rarity: 0, level: 1, affixes: [], shapeId: 'monomino', rotation: 0,
    baseValues: [10, 20, 30], enchantmentIds: [], purchasePrice: 0,
  }
  const item = { id: skillId, type: 'skill', skillId, cost: price, affixSkill }
  return {
    sku: 'SKL-001', kind: 'skill', name: 'Test Skill', nameAbbrev: 'TST', iconEmoji: 'X',
    rarity: 0, rarityLabel: 'COMMON', shapeTag: '[1·]', shapeColor: 'green',
    triggerHint: '—', desc: '', effect: '', affixLine: '', price,
    stockNow: 1, stockMax: 1, clearance: '4-B', redacted: false, upgrade: false,
    synergyCount: 0, originalItem: item,
  }
}

function makeRelicDescriptor(relicId: string, price = 50): unknown {
  return {
    sku: 'REL-001', kind: 'relic', name: 'Test Relic', nameAbbrev: 'TRL', iconEmoji: '✦',
    rarity: 0, rarityLabel: 'COMMON', shapeTag: '[REL]', shapeColor: 'amber',
    triggerHint: '—', desc: '', effect: '', affixLine: '—', price,
    stockNow: 1, stockMax: 1, clearance: '4-B', redacted: false, upgrade: false,
    synergyCount: 0, originalItem: { id: relicId, type: 'relic', relicId, cost: price },
  }
}

describe('Story 60.12 · BUY 音效', () => {
  it('AC6 BUY skill 成功 → shop_buy_ok', () => {
    state.gold = 100
    __test.executeBuySkill(makeSkillDescriptor('sk_a', 30) as never)
    expect(calledWith('shop_buy_ok')).toBe(true)
  })

  it('AC6 BUY skill inbox 满 → shop_buy_err', () => {
    state.gold = 100
    state.player.inbox = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'] // INBOX_MAX = 9
    __test.executeBuySkill(makeSkillDescriptor('sk_overflow', 30) as never)
    expect(calledWith('shop_buy_err')).toBe(true)
    expect(calledWith('shop_buy_ok')).toBe(false)
  })

  it('AC6 BUY relic 成功 → shop_buy_ok', () => {
    state.gold = 100
    const realRelicId = Object.keys(RELICS)[0]
    __test.executeBuyRelic(makeRelicDescriptor(realRelicId, 50) as never)
    expect(calledWith('shop_buy_ok')).toBe(true)
  })

  it('AC6 BUY relic 已拥有 → shop_buy_err', () => {
    state.gold = 100
    const realRelicId = Object.keys(RELICS)[0]
    state.player.relics.add(realRelicId)
    __test.executeBuyRelic(makeRelicDescriptor(realRelicId, 50) as never)
    expect(calledWith('shop_buy_err')).toBe(true)
    expect(calledWith('shop_buy_ok')).toBe(false)
  })

  it('AC6 cmdBuy 未知 SKU → shop_buy_err', () => {
    state.gold = 100
    __test.cmdBuy('NONEXISTENT')
    expect(calledWith('shop_buy_err')).toBe(true)
  })
})

describe('Story 60.12 · 拖拽音效', () => {
  it('AC7 bindSkillToKey → shop_drag_drop', () => {
    state.affixSkills.set('sk_drag', { id: 'sk_drag', name: 'X', icon: 'I', resource: 'base', rarity: 0, level: 1, affixes: [], shapeId: 'monomino', rotation: 0, baseValues: [10], enchantmentIds: [] } as never)
    state.player.skills.set('sk_drag', { level: 1 })
    state.player.inbox.push('sk_drag')
    __test.bindSkillToKey('sk_drag', 'a')
    expect(calledWith('shop_drag_drop')).toBe(true)
  })

  it('AC7 unbindSkillFromKey → shop_drag_unbind（仅当成功 unbind）', () => {
    state.affixSkills.set('sk_u', { id: 'sk_u', name: 'X', icon: 'I', resource: 'base', rarity: 0, level: 1, affixes: [], shapeId: 'monomino', rotation: 0, baseValues: [10], enchantmentIds: [] } as never)
    state.player.skills.set('sk_u', { level: 1 })
    state.player.bindings.set('a', 'sk_u')
    __test.unbindSkillFromKey('a')
    expect(calledWith('shop_drag_unbind')).toBe(true)
  })

  it('AC7 unbindSkillFromKey 空键 → 不 fire', () => {
    __test.unbindSkillFromKey('z') // 'z' 未绑
    expect(calledWith('shop_drag_unbind')).toBe(false)
  })
})

describe('Story 60.12 · 抽屉音效', () => {
  it('AC8 openDrawer → shop_drawer_open', () => {
    __test.openDrawer('words')
    expect(calledWith('shop_drawer_open')).toBe(true)
  })
})

describe('Story 60.12 · SUBMIT 音效', () => {
  beforeEach(() => {
    // proceedSubmit 末端有 setTimeout fallback，会在 test 结束后触发 executeSubmitTransition
    // 用 fake timers 阻止其异步 fire（防 hideRelicTooltip 在 unstub 后访问 document）
    vi.useFakeTimers()
    // M1 review fix: 重置 submitting flag — proceedSubmit 第一行 if (submitting) return
    // 早 return 会让后续 sfx 调用全部 skip，掩盖真实 shouldPlayShopSound 守卫行为
    __test.resetSubmitting()
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('AC9 proceedSubmit → submit_stamp', () => {
    __test.proceedSubmit()
    expect(calledWith('submit_stamp')).toBe(true)
  })
})

describe('Story 60.12 · shopSound=false 全静默', () => {
  beforeEach(() => {
    vi.useFakeTimers() // proceedSubmit setTimeout fallback 防御
    // M1 review fix: 重置 submitting flag 防跨 it 泄漏（前一组 SUBMIT 音效测试
    // 设 submitting=true 但 fake timers 阻止 fallback transition 不会 reset 它）
    __test.resetSubmitting()
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('AC6 shopSound=false → BUY skill 成功不 fire 任何音效', () => {
    updateSettings({ shopSound: false })
    state.gold = 100
    __test.executeBuySkill(makeSkillDescriptor('sk_silent', 30) as never)
    // BUY 路径所有 sfx 调用都被 shouldPlayShopSound 守门
    expect(calledWith('shop_buy_ok')).toBe(false)
  })

  it('AC6 shopSound=false → BUY err 不 fire', () => {
    updateSettings({ shopSound: false })
    state.gold = 100
    state.player.inbox = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9']
    __test.executeBuySkill(makeSkillDescriptor('sk_overflow', 30) as never)
    expect(calledWith('shop_buy_err')).toBe(false)
  })

  it('AC8 shopSound=false → openDrawer 不 fire', () => {
    updateSettings({ shopSound: false })
    __test.openDrawer('words')
    expect(calledWith('shop_drawer_open')).toBe(false)
  })

  it('AC9 shopSound=false → proceedSubmit 不 fire', () => {
    updateSettings({ shopSound: false })
    __test.proceedSubmit()
    expect(calledWith('submit_stamp')).toBe(false)
  })
})
