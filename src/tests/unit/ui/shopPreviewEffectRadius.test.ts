// ============================================
// Story 60.18: 范围词条 effect radius 键盘高亮测试
// ============================================
// 验证：
//   - 含 splash/aura/relay/war_drum 等带 posRel 的词条 → hover 候选键时邻接 keys
//     拿到 .effect-radius-preview class
//   - 不含范围词条（纯产出 / 多格 tetromino）→ 不加 class
//   - clearEffectRadiusHighlight 清除所有 class
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import { PositionRelation } from '../../../src/data/keyboardTopology'

// dragManager mock — 不实际拖拽
const dragState = { dragging: false, payload: null as unknown }
vi.mock('../../../src/systems/dragManager', async () => {
  const actual = await vi.importActual<typeof import('../../../src/systems/dragManager')>(
    '../../../src/systems/dragManager',
  )
  return {
    ...actual,
    dragManager: {
      ...actual.dragManager,
      get dragging() { return dragState.dragging },
      get currentPayload() { return dragState.payload },
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

import { clearEffectRadiusHighlight, highlightEffectRadius } from '../../../src/ui/shop/shopWorkbench'
import { getKeysWithRelation } from '../../../src/data/keyboardTopology'
import { generateAffixV2, RECIPE_SPEAR_MAKE, RECIPE_GAZE_FOLLOW, RECIPE_IMITATE, RECIPE_TEACH } from '../../../src/data/affixV2Generator'
import { getAffixV2Definition } from '../../../src/data/affixV2'

// ===== Fake DOM 基础设施 =====
interface FakeKeyEl {
  className: string
  dataset: Record<string, string | undefined>
  classList: {
    _classes: Set<string>
    contains: (c: string) => boolean
    add: (c: string) => void
    remove: (c: string) => void
  }
}

function makeFakeKey(key: string): FakeKeyEl {
  const classes = new Set(['kb-key', 'kb-tier-1'])
  return {
    className: 'kb-key kb-tier-1',
    dataset: { key },
    classList: {
      _classes: classes,
      contains: (c: string) => classes.has(c),
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
    },
  }
}

const RADIUS_CLASS = 'effect-radius-preview'

beforeEach(() => {
  resetState()
  dragState.dragging = false
  dragState.payload = null
  // Node test env 没有 CSS.escape — stub 一个穿透即可（测试用单字母 key 无特殊字符）
  ;(globalThis as unknown as { CSS: { escape: (s: string) => string } }).CSS = {
    escape: (s: string) => s,
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Story 60.18 · effect radius 高亮', () => {
  it('clearEffectRadiusHighlight 清除所有 .effect-radius-preview class', () => {
    // 准备 3 个 key 元素，2 个有 class
    const keyA = makeFakeKey('a')
    keyA.classList.add(RADIUS_CLASS)
    const keyB = makeFakeKey('b')
    keyB.classList.add(RADIUS_CLASS)
    const keyC = makeFakeKey('c') // 无 class

    const fakeRoot = {
      querySelectorAll: (sel: string) => {
        if (sel === `.kb-key.${RADIUS_CLASS}`) return [keyA, keyB]
        return []
      },
    }
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'workbench-screen-preview' ? fakeRoot : null),
    })

    clearEffectRadiusHighlight()

    expect(keyA.classList.contains(RADIUS_CLASS)).toBe(false)
    expect(keyB.classList.contains(RADIUS_CLASS)).toBe(false)
    expect(keyC.classList.contains(RADIUS_CLASS)).toBe(false) // 本来就没
  })

  it('clearEffectRadiusHighlight 在 #workbench-screen-preview 缺失时静默 return', () => {
    vi.stubGlobal('document', { getElementById: () => null })
    expect(() => clearEffectRadiusHighlight()).not.toThrow()
  })

  it('PositionRelation enum 完整 — 至少含 Adjacent', () => {
    // sanity: 验证我们用的 PositionRelation 仍存在
    expect(PositionRelation.Adjacent).toBeDefined()
    expect(typeof PositionRelation.Adjacent).toBe('string')
  })

  it('范围词条触发：splash + posRel=Adjacent → hover G 邻接 keys 加 .effect-radius-preview class', () => {
    // 准备 state + mock skill 含 splash 词条 + posRel=Adjacent
    state.affixSkills.set('sk_splash', {
      id: 'sk_splash',
      name: 'MOCK SPLASH',
      icon: 'X',
      level: 1,
      rarity: 1,
      resource: 'base',
      baseValues: [10],
      shapeId: 'monomino',
      rotation: 0,
      enchantmentIds: [],
      affixes: [{ type: 'splash', posRel: PositionRelation.Adjacent }],
    } as unknown as never)

    // 计算预期：hover 'g' 时 Adjacent 关系下应被高亮的键集合（与实现同源算法）
    const expectedKeys = new Set(getKeysWithRelation('g', PositionRelation.Adjacent))
    expect(expectedKeys.size).toBeGreaterThan(0) // sanity: Adjacent 应至少有 1 邻

    // 构造 fake DOM：每个 keys 对应一个 FakeKeyEl
    const allKeys = ['q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m']
    const elMap = new Map<string, FakeKeyEl>()
    for (const k of allKeys) elMap.set(k, makeFakeKey(k))

    const fakeRoot = {
      querySelector: (sel: string) => {
        // 抓 [data-key="X"] 的 X
        const m = sel.match(/data-key="([^"]+)"/)
        return m ? (elMap.get(m[1]) ?? null) : null
      },
      querySelectorAll: () => [],
    }
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'workbench-screen-preview' ? fakeRoot : null),
    })

    highlightEffectRadius('g', 'sk_splash')

    // 邻接键应被加 class
    for (const k of expectedKeys) {
      const el = elMap.get(k)
      if (!el) continue
      expect(el.classList.contains(RADIUS_CLASS)).toBe(true)
    }
    // 非邻接键不应被加 class（取一个明显远的 'q'）
    if (!expectedKeys.has('q')) {
      expect(elMap.get('q')!.classList.contains(RADIUS_CLASS)).toBe(false)
    }
    // anchor 'g' 自身不在 radius（实现 occupiedSet 排除）
    expect(elMap.get('g')!.classList.contains(RADIUS_CLASS)).toBe(false)
  })

  it('无 posRel 词条（如 base / convert）→ 不加 class', () => {
    state.affixSkills.set('sk_plain', {
      id: 'sk_plain',
      name: 'MOCK PLAIN',
      icon: 'X',
      level: 1,
      rarity: 0,
      resource: 'base',
      baseValues: [10],
      shapeId: 'monomino',
      rotation: 0,
      enchantmentIds: [],
      affixes: [{ type: 'convert' }], // no posRel
    } as unknown as never)

    const allKeys = ['a','b','c','d','e','f','g','h','i','j']
    const elMap = new Map<string, FakeKeyEl>()
    for (const k of allKeys) elMap.set(k, makeFakeKey(k))
    const fakeRoot = {
      querySelector: (sel: string) => {
        const m = sel.match(/data-key="([^"]+)"/)
        return m ? (elMap.get(m[1]) ?? null) : null
      },
      querySelectorAll: () => [],
    }
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'workbench-screen-preview' ? fakeRoot : null),
    })

    highlightEffectRadius('g', 'sk_plain')

    for (const el of elMap.values()) {
      expect(el.classList.contains(RADIUS_CLASS)).toBe(false)
    }
  })

  it('未注册 skillId → 静默 no-op，不抛异常', () => {
    vi.stubGlobal('document', {
      getElementById: () => ({ querySelector: () => null, querySelectorAll: () => [] }),
    })
    expect(() => highlightEffectRadius('g', 'NONEXISTENT_SID')).not.toThrow()
  })
})

describe('meta-progression 操纵家族 effect radius', () => {
  const ALL_KEYS = ['q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m']

  function setupV2Skill(skillId: string, defId: string) {
    state.affixSkills.set(skillId, {
      id: skillId, name: 'META', icon: 'X', level: 1, rarity: 1, resource: 'base',
      baseValues: [10], shapeId: 'monomino', rotation: 0, enchantmentIds: [], affixes: [],
      v2Ids: [defId],
    } as unknown as never)
  }

  function fakeDom(elMap: Map<string, FakeKeyEl>) {
    const fakeRoot = {
      querySelector: (sel: string) => {
        const m = sel.match(/data-key="([^"]+)"/)
        return m ? (elMap.get(m[1]) ?? null) : null
      },
      querySelectorAll: () => [],
    }
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'workbench-screen-preview' ? fakeRoot : null),
    })
  }

  function expectAdjacentHighlighted(skillId: string) {
    const elMap = new Map<string, FakeKeyEl>()
    for (const k of ALL_KEYS) elMap.set(k, makeFakeKey(k))
    fakeDom(elMap)
    highlightEffectRadius('g', skillId)
    const expected = new Set(getKeysWithRelation('g', PositionRelation.Adjacent))
    expect(expected.size).toBeGreaterThan(0)
    for (const k of expected) {
      const el = elMap.get(k)
      if (el) expect(el.classList.contains(RADIUS_CLASS)).toBe(true)
    }
    // anchor 自身不高亮
    expect(elMap.get('g')!.classList.contains(RADIUS_CLASS)).toBe(false)
  }

  it('spear_make (upgrade_skill) → 邻位范围高亮', () => {
    const defId = generateAffixV2(RECIPE_SPEAR_MAKE)
    const def = getAffixV2Definition(defId)! as { effect: { selector: { posRel: string } } }
    def.effect.selector.posRel = PositionRelation.Adjacent
    setupV2Skill('sk_spear', defId)
    expectAdjacentHighlighted('sk_spear')
  })

  it('gaze_follow (graft_affix) → 邻位范围高亮', () => {
    const defId = generateAffixV2(RECIPE_GAZE_FOLLOW)
    const def = getAffixV2Definition(defId)! as { effect: { from: { posRel: string } } }
    def.effect.from.posRel = PositionRelation.Adjacent
    setupV2Skill('sk_gaze', defId)
    expectAdjacentHighlighted('sk_gaze')
  })

  it('imitate (gain_skill[neighborPosRel]) → 邻位范围高亮', () => {
    const defId = generateAffixV2(RECIPE_IMITATE)
    const def = getAffixV2Definition(defId)! as { effect: { filter: { neighborPosRel: string } } }
    def.effect.filter.neighborPosRel = PositionRelation.Adjacent
    setupV2Skill('sk_imitate', defId)
    expectAdjacentHighlighted('sk_imitate')
  })

  it('teach (gain_skill recipe_pool, 无 neighborPosRel) → 不高亮任何键', () => {
    const defId = generateAffixV2(RECIPE_TEACH)  // teach 用 hasTag/recipe_pool，无 neighborPosRel
    setupV2Skill('sk_teach', defId)
    const elMap = new Map<string, FakeKeyEl>()
    for (const k of ALL_KEYS) elMap.set(k, makeFakeKey(k))
    fakeDom(elMap)
    highlightEffectRadius('g', 'sk_teach')
    for (const el of elMap.values()) {
      expect(el.classList.contains(RADIUS_CLASS)).toBe(false)
    }
  })
})
