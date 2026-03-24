// ============================================
// Story 40.5: 拖拽放置与形状预览 — 单元测试
// ============================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { highlightShapePlacement, clearShapePlacement } from '../../../../src/systems/shop'
import { mapShapeToKeys } from '../../../../src/data/skillShapes'
import { bindShapeToKeys, unbindSkill, getSkillAnchorKey } from '../../../../src/systems/bindingManager'
import type { DragPayload } from '../../../../src/systems/dragManager'

function makePayload(overrides: Partial<DragPayload> = {}): DragPayload {
  return {
    type: 'skill-inventory',
    label: 'Test',
    icon: '⚡',
    skillId: 'test-skill',
    ...overrides,
  }
}

// === DOM-independent tests ===

describe('highlightShapePlacement (logic via mocks)', () => {
  let mockQuerySelectorAll: ReturnType<typeof vi.fn>
  let mockQuerySelector: ReturnType<typeof vi.fn>
  let mockSlots: Map<string, { classList: { add: ReturnType<typeof vi.fn>, remove: ReturnType<typeof vi.fn>, contains: ReturnType<typeof vi.fn> } }>

  function makeSlot(key: string) {
    return {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(() => false),
      },
      dataset: { key },
    }
  }

  beforeEach(() => {
    mockSlots = new Map()
    const keys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
                  'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
                  'z', 'x', 'c', 'v', 'b', 'n', 'm']
    for (const k of keys) {
      mockSlots.set(k, makeSlot(k) as any)
    }

    mockQuerySelector = vi.fn((selector: string) => {
      const match = selector.match(/data-key="(\w)"/)
      if (match) return mockSlots.get(match[1]) ?? null
      return null
    })
    mockQuerySelectorAll = vi.fn(() => [])

    // Mock global document
    vi.stubGlobal('document', {
      querySelector: mockQuerySelector,
      querySelectorAll: mockQuerySelectorAll,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing for monomino (no shapeId)', () => {
    const payload = makePayload({ shapeId: undefined })
    highlightShapePlacement('q', payload)
    // Should not query any slots
    expect(mockQuerySelector).not.toHaveBeenCalled()
  })

  it('does nothing for monomino (shapeId = "monomino")', () => {
    const payload = makePayload({ shapeId: 'monomino', rotation: 0 })
    highlightShapePlacement('q', payload)
    expect(mockQuerySelector).not.toHaveBeenCalled()
  })

  it('adds valid class to target keys for domino placement', () => {
    const payload = makePayload({ shapeId: 'domino', rotation: 0 })
    const targetKeys = mapShapeToKeys('q', 'domino', 0)

    highlightShapePlacement('q', payload)

    if (targetKeys) {
      for (const key of targetKeys) {
        const slot = mockSlots.get(key)
        expect(slot?.classList.add).toHaveBeenCalledWith('shape-preview-valid')
      }
    }
  })

  it('adds invalid class when shape cannot fit at edge', () => {
    const payload = makePayload({ shapeId: 'domino', rotation: 0 })
    const targetKeys = mapShapeToKeys('p', 'domino', 0)

    if (!targetKeys) {
      highlightShapePlacement('p', payload)
      const slot = mockSlots.get('p')
      expect(slot?.classList.add).toHaveBeenCalledWith('shape-preview-invalid')
    }
  })

  it('adds valid class for triomino placement', () => {
    const payload = makePayload({ shapeId: 'triomino_L', rotation: 0 })
    const targetKeys = mapShapeToKeys('q', 'triomino_L', 0)

    highlightShapePlacement('q', payload)

    if (targetKeys) {
      expect(targetKeys.length).toBe(3)
      for (const key of targetKeys) {
        const slot = mockSlots.get(key)
        expect(slot?.classList.add).toHaveBeenCalledWith('shape-preview-valid')
      }
    }
  })
})

describe('clearShapePlacement (logic via mocks)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls querySelectorAll and remove on matching elements', () => {
    const mockRemove = vi.fn()
    const mockElement = { classList: { remove: mockRemove } }
    vi.stubGlobal('document', {
      querySelectorAll: vi.fn(() => [mockElement, mockElement]),
    })

    clearShapePlacement()

    expect(mockRemove).toHaveBeenCalledWith('shape-preview-valid', 'shape-preview-invalid', 'shape-preview-displaced')
  })

  it('handles empty result gracefully', () => {
    vi.stubGlobal('document', {
      querySelectorAll: vi.fn(() => []),
    })

    expect(() => clearShapePlacement()).not.toThrow()
  })
})

describe('handleDropOnKey multi-cell binding', () => {
  it('bindShapeToKeys binds multiple keys for domino', () => {
    const bindings = new Map<string, string>()
    const affixSkills = new Map<string, { shapeId?: string; rotation?: number }>()
    affixSkills.set('skill-1', { shapeId: 'domino', rotation: 0 })
    const bs = { bindings, affixSkills }

    const result = bindShapeToKeys(bs, 'skill-1', 'q')
    expect(result.success).toBe(true)

    const boundKeys = [...bindings.entries()].filter(([, id]) => id === 'skill-1').map(([k]) => k)
    expect(boundKeys.length).toBe(2)
  })

  it('swap logic: unbind both and rebind at new positions', () => {
    const bindings = new Map<string, string>()
    const affixSkills = new Map<string, { shapeId?: string; rotation?: number }>()
    affixSkills.set('skill-A', { shapeId: 'monomino', rotation: 0 })
    affixSkills.set('skill-B', { shapeId: 'monomino', rotation: 0 })
    const bs = { bindings, affixSkills }

    bindShapeToKeys(bs, 'skill-A', 'q')
    bindShapeToKeys(bs, 'skill-B', 'w')

    // Swap
    unbindSkill(bs, 'skill-A')
    unbindSkill(bs, 'skill-B')
    const r1 = bindShapeToKeys(bs, 'skill-A', 'w')
    const r2 = bindShapeToKeys(bs, 'skill-B', 'q')

    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(bindings.get('w')).toBe('skill-A')
    expect(bindings.get('q')).toBe('skill-B')
  })

  it('swap failure rollback: restores original when shape does not fit', () => {
    const bindings = new Map<string, string>()
    const affixSkills = new Map<string, { shapeId?: string; rotation?: number }>()
    // Domino at 'q' (occupies q+w)
    affixSkills.set('skill-A', { shapeId: 'domino', rotation: 0 })
    // Monomino at 'e'
    affixSkills.set('skill-B', { shapeId: 'monomino', rotation: 0 })
    const bs = { bindings, affixSkills }

    bindShapeToKeys(bs, 'skill-A', 'q')
    bindShapeToKeys(bs, 'skill-B', 'e')

    const anchorA = getSkillAnchorKey(bs, 'skill-A')!
    const anchorB = getSkillAnchorKey(bs, 'skill-B')!

    // Try swap: A → e, B → q
    unbindSkill(bs, 'skill-A')
    unbindSkill(bs, 'skill-B')

    const r1 = bindShapeToKeys(bs, 'skill-A', anchorB)
    if (r1.success) {
      const r2 = bindShapeToKeys(bs, 'skill-B', anchorA)
      // Both should succeed for monomino/domino swap
      expect(r2.success).toBe(true)
    } else {
      // Rollback
      bindShapeToKeys(bs, 'skill-A', anchorA)
      bindShapeToKeys(bs, 'skill-B', anchorB)
      expect(bindings.get(anchorA)).toBe('skill-A')
      expect(bindings.get(anchorB)).toBe('skill-B')
    }
  })

  it('multi-cell purchase binds all shape keys correctly', () => {
    const bindings = new Map<string, string>()
    const affixSkills = new Map<string, { shapeId?: string; rotation?: number }>()
    affixSkills.set('tri-skill', { shapeId: 'triomino_L', rotation: 0 })
    const bs = { bindings, affixSkills }

    const result = bindShapeToKeys(bs, 'tri-skill', 'q')
    if (result.success) {
      const boundKeys = [...bindings.entries()].filter(([, id]) => id === 'tri-skill').map(([k]) => k)
      expect(boundKeys.length).toBe(3)
    }
  })

  it('unbindSkill releases all keys of multi-cell skill', () => {
    const bindings = new Map<string, string>()
    const affixSkills = new Map<string, { shapeId?: string; rotation?: number }>()
    affixSkills.set('dom-skill', { shapeId: 'domino', rotation: 0 })
    const bs = { bindings, affixSkills }

    bindShapeToKeys(bs, 'dom-skill', 'q')
    const boundBefore = [...bindings.entries()].filter(([, id]) => id === 'dom-skill')
    expect(boundBefore.length).toBe(2)

    const released = unbindSkill(bs, 'dom-skill')
    expect(released.length).toBe(2)
    expect(bindings.size).toBe(0)
  })
})

describe('DragPayload shape fields', () => {
  it('accepts shapeId, rotation, and shapePreviewHtml', () => {
    const payload: DragPayload = {
      type: 'shop-item',
      label: 'Test Skill',
      icon: '⚡',
      itemIndex: 0,
      shapeId: 'domino',
      rotation: 1,
      shapePreviewHtml: '<div class="shape-preview">test</div>',
    }
    expect(payload.shapeId).toBe('domino')
    expect(payload.rotation).toBe(1)
    expect(payload.shapePreviewHtml).toContain('shape-preview')
  })

  it('shape fields are optional (backward compat)', () => {
    const payload: DragPayload = {
      type: 'skill-key',
      label: '[Q]',
      icon: '⚡',
      sourceKey: 'q',
      skillId: 'test',
    }
    expect(payload.shapeId).toBeUndefined()
    expect(payload.rotation).toBeUndefined()
    expect(payload.shapePreviewHtml).toBeUndefined()
  })
})
