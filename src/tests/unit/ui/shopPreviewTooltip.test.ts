// ============================================
// Story 60.9: 工作台 hover tooltip 测试
// ============================================
// 验证：
//   - tier-1 已绑键 hover → keyTooltip.show 调用
//   - IN-tray 卡片 hover → keyTooltip.show 调用
//   - 数字键已挂遗物 hover → showRelicTooltip 调用
//   - mouseleave → 相应 hide
//   - dragManager.dragging=true 时跳过（不 show）
//   - dataset.tooltipBound 防重 listener
//   - workbench 屏不存在时静默 return

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'

// ===== Hoisted spies =====
const keyTooltipShowSpy = vi.fn()
const keyTooltipHideSpy = vi.fn()
const showRelicTooltipSpy = vi.fn()
const hideRelicTooltipSpy = vi.fn()
const moveRelicTooltipSpy = vi.fn()

vi.mock('../../../src/ui/keyboard/KeyTooltip', async () => {
  const actual = await vi.importActual<typeof import('../../../src/ui/keyboard/KeyTooltip')>(
    '../../../src/ui/keyboard/KeyTooltip',
  )
  return {
    ...actual,
    keyTooltip: {
      show: (...args: unknown[]) => keyTooltipShowSpy(...args),
      hide: () => keyTooltipHideSpy(),
    },
  }
})

vi.mock('../../../src/systems/shop', async () => {
  const actual = await vi.importActual<typeof import('../../../src/systems/shop')>(
    '../../../src/systems/shop',
  )
  return {
    ...actual,
    showRelicTooltip: (...args: unknown[]) => showRelicTooltipSpy(...args),
    hideRelicTooltip: () => hideRelicTooltipSpy(),
    moveRelicTooltip: (...args: unknown[]) => moveRelicTooltipSpy(...args),
    buildSkillKeyTooltipData: (skillId: string) => ({
      skill: {
        name: `MOCK ${skillId}`,
        icon: 'X',
        description: 'mock-desc',
        level: 1,
        school: 'COMMON',
        schoolCssClass: 'rarity-0',
      },
    }),
  }
})

const dragState = { dragging: false }
vi.mock('../../../src/systems/dragManager', async () => {
  const actual = await vi.importActual<typeof import('../../../src/systems/dragManager')>(
    '../../../src/systems/dragManager',
  )
  return {
    ...actual,
    dragManager: {
      ...actual.dragManager,
      get dragging() { return dragState.dragging },
      set onDragStart(_cb: unknown) {},
      set onDragEnd(_cb: unknown) {},
      init: vi.fn(),
      destroy: vi.fn(),
      registerDropZone: vi.fn(),
      clearDropZones: vi.fn(),
    },
  }
})

vi.mock('../../../src/effects/sound', () => ({ playSound: vi.fn() }))
vi.mock('../../../src/systems/battle', () => ({ startLevel: vi.fn() }))

import { attachWorkbenchTooltips } from '../../../src/ui/shopPreview'
import { RELICS } from '../../../src/data/relics'

// ===== Fake element infrastructure =====
type Handler = (e: MouseEvent) => void
interface FakeEl {
  className: string
  dataset: Record<string, string | undefined>
  classList: { contains: (c: string) => boolean }
  _handlers: Record<string, Handler[]>
  addEventListener: (type: string, h: Handler) => void
  fire: (type: string, e: MouseEvent) => void
}

function makeFakeEl(opts: {
  classNames: string[]
  dataKey?: string
  boundSkill?: string
  skillId?: string
  relicId?: string
  dragType?: string
}): FakeEl {
  const ds: Record<string, string | undefined> = {}
  if (opts.dataKey) ds.key = opts.dataKey
  if (opts.boundSkill) ds.boundSkill = opts.boundSkill
  if (opts.skillId) ds.skillId = opts.skillId
  if (opts.relicId) ds.relicId = opts.relicId
  if (opts.dragType) ds.dragType = opts.dragType
  const handlers: Record<string, Handler[]> = {}
  return {
    className: opts.classNames.join(' '),
    dataset: ds,
    classList: { contains: (c: string) => opts.classNames.includes(c) },
    _handlers: handlers,
    addEventListener: (type: string, h: Handler) => {
      if (!handlers[type]) handlers[type] = []
      handlers[type].push(h)
    },
    fire: (type: string, e: MouseEvent) => {
      handlers[type]?.forEach(h => h(e))
    },
  }
}

interface FakeRoot {
  selectorMap: Record<string, FakeEl[]>
  querySelectorAll: (selector: string) => FakeEl[]
}

function makeFakeRoot(map: Record<string, FakeEl[]>): FakeRoot {
  return {
    selectorMap: map,
    querySelectorAll: (selector: string) => map[selector] ?? [],
  }
}

let fakeRoot: FakeRoot | null = null

beforeEach(() => {
  resetState()
  keyTooltipShowSpy.mockClear()
  keyTooltipHideSpy.mockClear()
  showRelicTooltipSpy.mockClear()
  hideRelicTooltipSpy.mockClear()
  moveRelicTooltipSpy.mockClear()
  dragState.dragging = false
  fakeRoot = null
  vi.stubGlobal('document', {
    getElementById: (id: string) => (id === 'workbench-screen-preview' ? fakeRoot : null),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Story 60.17 修订：tier-1 listener 现绑定到所有 tier-1 letter key（不再仅 has-skill），
// 用于支持拖拽中候选键预估 tooltip。静态已绑键路径仍用 has-skill 类内部 guard。
const SEL_TIER1 = '.kb-key.kb-tier-1[data-key]'
const SEL_INTRAY = '.weapon-card[data-drag-type="skill-inventory"]'
const SEL_RELIC = '.kb-key.kb-tier-2.has-relic[data-key]'

function fakeMouseEvent(): MouseEvent {
  return { clientX: 100, clientY: 200 } as MouseEvent
}

describe('Story 60.9 · tier-1 已绑键 hover', () => {
  it('mouseenter 触发 keyTooltip.show with skill data', () => {
    state.player.bindings.set('a', 'sk_a')
    state.affixSkills.set('sk_a', { id: 'sk_a' } as any)
    const keyEl = makeFakeEl({
      classNames: ['kb-key', 'kb-tier-1', 'has-skill'],
      dataKey: 'a',
      boundSkill: 'sk_a',
    })
    fakeRoot = makeFakeRoot({ [SEL_TIER1]: [keyEl] })

    attachWorkbenchTooltips()
    keyEl.fire('mouseenter', fakeMouseEvent())

    expect(keyTooltipShowSpy).toHaveBeenCalledTimes(1)
    expect(keyTooltipShowSpy.mock.calls[0][2]?.skill?.name).toBe('MOCK sk_a')
  })

  it('mouseleave → keyTooltip.hide', () => {
    state.player.bindings.set('a', 'sk_a')
    state.affixSkills.set('sk_a', { id: 'sk_a' } as any)
    const keyEl = makeFakeEl({
      classNames: ['kb-key', 'kb-tier-1', 'has-skill'],
      dataKey: 'a',
      boundSkill: 'sk_a',
    })
    fakeRoot = makeFakeRoot({ [SEL_TIER1]: [keyEl] })
    attachWorkbenchTooltips()
    keyEl.fire('mouseleave', fakeMouseEvent())
    expect(keyTooltipHideSpy).toHaveBeenCalledTimes(1)
  })

  it('dragManager.dragging=true 时跳过 show', () => {
    state.player.bindings.set('a', 'sk_a')
    state.affixSkills.set('sk_a', { id: 'sk_a' } as any)
    const keyEl = makeFakeEl({
      classNames: ['kb-key', 'kb-tier-1', 'has-skill'],
      dataKey: 'a',
      boundSkill: 'sk_a',
    })
    fakeRoot = makeFakeRoot({ [SEL_TIER1]: [keyEl] })

    attachWorkbenchTooltips()
    dragState.dragging = true
    keyEl.fire('mouseenter', fakeMouseEvent())

    expect(keyTooltipShowSpy).not.toHaveBeenCalled()
  })
})

describe('Story 60.9 · IN-tray 卡片 hover', () => {
  it('mouseenter 触发 keyTooltip.show', () => {
    state.affixSkills.set('sk_b', { id: 'sk_b' } as any)
    const card = makeFakeEl({
      classNames: ['weapon-card'],
      skillId: 'sk_b',
      dragType: 'skill-inventory',
    })
    fakeRoot = makeFakeRoot({ [SEL_INTRAY]: [card] })

    attachWorkbenchTooltips()
    card.fire('mouseenter', fakeMouseEvent())

    expect(keyTooltipShowSpy).toHaveBeenCalledTimes(1)
    expect(keyTooltipShowSpy.mock.calls[0][2]?.skill?.name).toBe('MOCK sk_b')
  })

  it('mouseleave → keyTooltip.hide', () => {
    state.affixSkills.set('sk_b', { id: 'sk_b' } as any)
    const card = makeFakeEl({
      classNames: ['weapon-card'],
      skillId: 'sk_b',
      dragType: 'skill-inventory',
    })
    fakeRoot = makeFakeRoot({ [SEL_INTRAY]: [card] })
    attachWorkbenchTooltips()
    card.fire('mouseleave', fakeMouseEvent())
    expect(keyTooltipHideSpy).toHaveBeenCalledTimes(1)
  })
})

describe('Story 60.9 · 数字键已挂遗物 hover', () => {
  it('mouseenter 触发 showRelicTooltip with real relic', () => {
    const realRelicId = Object.keys(RELICS)[0]
    expect(realRelicId).toBeDefined()
    const keyEl = makeFakeEl({
      classNames: ['kb-key', 'kb-tier-2', 'has-relic'],
      dataKey: '1',
      relicId: realRelicId,
    })
    fakeRoot = makeFakeRoot({ [SEL_RELIC]: [keyEl] })

    attachWorkbenchTooltips()
    keyEl.fire('mouseenter', fakeMouseEvent())

    expect(showRelicTooltipSpy).toHaveBeenCalledTimes(1)
    expect(showRelicTooltipSpy.mock.calls[0][1]?.id).toBe(realRelicId)
  })

  it('mousemove 触发 moveRelicTooltip', () => {
    const realRelicId = Object.keys(RELICS)[0]
    const keyEl = makeFakeEl({
      classNames: ['kb-key', 'kb-tier-2', 'has-relic'],
      dataKey: '1',
      relicId: realRelicId,
    })
    fakeRoot = makeFakeRoot({ [SEL_RELIC]: [keyEl] })
    attachWorkbenchTooltips()
    keyEl.fire('mousemove', fakeMouseEvent())
    expect(moveRelicTooltipSpy).toHaveBeenCalledTimes(1)
  })

  it('mouseleave → hideRelicTooltip', () => {
    const realRelicId = Object.keys(RELICS)[0]
    const keyEl = makeFakeEl({
      classNames: ['kb-key', 'kb-tier-2', 'has-relic'],
      dataKey: '1',
      relicId: realRelicId,
    })
    fakeRoot = makeFakeRoot({ [SEL_RELIC]: [keyEl] })
    attachWorkbenchTooltips()
    keyEl.fire('mouseleave', fakeMouseEvent())
    expect(hideRelicTooltipSpy).toHaveBeenCalledTimes(1)
  })

  it('dragManager.dragging=true 时跳过', () => {
    const realRelicId = Object.keys(RELICS)[0]
    const keyEl = makeFakeEl({
      classNames: ['kb-key', 'kb-tier-2', 'has-relic'],
      dataKey: '1',
      relicId: realRelicId,
    })
    fakeRoot = makeFakeRoot({ [SEL_RELIC]: [keyEl] })
    attachWorkbenchTooltips()
    dragState.dragging = true
    keyEl.fire('mouseenter', fakeMouseEvent())
    expect(showRelicTooltipSpy).not.toHaveBeenCalled()
  })

  it('relicId 不在 RELICS 字典中 → 静默 return', () => {
    const keyEl = makeFakeEl({
      classNames: ['kb-key', 'kb-tier-2', 'has-relic'],
      dataKey: '1',
      relicId: 'nonexistent_relic_xyz',
    })
    fakeRoot = makeFakeRoot({ [SEL_RELIC]: [keyEl] })
    attachWorkbenchTooltips()
    keyEl.fire('mouseenter', fakeMouseEvent())
    expect(showRelicTooltipSpy).not.toHaveBeenCalled()
  })
})

describe('Story 60.9 · dataset.tooltipBound 防重', () => {
  it('多次 attach 同一元素只触发一次 listener', () => {
    state.player.bindings.set('a', 'sk_a')
    state.affixSkills.set('sk_a', { id: 'sk_a' } as any)
    const keyEl = makeFakeEl({
      classNames: ['kb-key', 'kb-tier-1', 'has-skill'],
      dataKey: 'a',
      boundSkill: 'sk_a',
    })
    fakeRoot = makeFakeRoot({ [SEL_TIER1]: [keyEl] })

    attachWorkbenchTooltips()
    attachWorkbenchTooltips()
    attachWorkbenchTooltips()

    keyEl.fire('mouseenter', fakeMouseEvent())
    expect(keyTooltipShowSpy).toHaveBeenCalledTimes(1)
    expect(keyEl.dataset.tooltipBound).toBe('1')
  })
})

describe('Story 60.9 · workbench 屏不存在', () => {
  it('attachWorkbenchTooltips 在 #workbench-screen-preview 缺失时静默 return', () => {
    fakeRoot = null
    expect(() => attachWorkbenchTooltips()).not.toThrow()
  })
})
