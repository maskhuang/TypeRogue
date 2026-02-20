// ============================================
// 打字肉鸽 - ModifierRegistry 单元测试
// ============================================
// Story 11.1: Modifier 接口与注册中心

import { describe, it, expect, beforeEach } from 'vitest'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import type { Modifier } from '../../../../src/systems/modifiers/ModifierTypes'

// === 测试工厂函数 ===
function createTestModifier(overrides: Partial<Modifier> = {}): Modifier {
  return {
    id: 'test:mod:1',
    source: 'test:mod',
    sourceType: 'skill',
    layer: 'base',
    trigger: 'on_skill_trigger',
    phase: 'calculate',
    priority: 100,
    effect: { type: 'score', value: 5, stacking: 'additive' },
    ...overrides,
  }
}

describe('ModifierRegistry', () => {
  let registry: ModifierRegistry

  beforeEach(() => {
    registry = new ModifierRegistry()
  })

  // === register / unregister 基本操作 ===
  describe('register', () => {
    it('应该注册一个修饰器', () => {
      const mod = createTestModifier()
      registry.register(mod)
      expect(registry.has('test:mod:1')).toBe(true)
      expect(registry.count()).toBe(1)
    })

    it('应该注册多个不同 id 的修饰器', () => {
      registry.register(createTestModifier({ id: 'a' }))
      registry.register(createTestModifier({ id: 'b' }))
      expect(registry.count()).toBe(2)
    })
  })

  describe('unregister', () => {
    it('应该按 id 移除修饰器', () => {
      registry.register(createTestModifier({ id: 'a' }))
      registry.register(createTestModifier({ id: 'b' }))
      registry.unregister('a')
      expect(registry.has('a')).toBe(false)
      expect(registry.has('b')).toBe(true)
      expect(registry.count()).toBe(1)
    })

    it('移除不存在的 id 不报错', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow()
    })
  })

  // === id 唯一性 ===
  describe('id 唯一性', () => {
    it('重复 id 注册应覆盖旧的', () => {
      registry.register(createTestModifier({ id: 'dup', effect: { type: 'score', value: 5, stacking: 'additive' } }))
      registry.register(createTestModifier({ id: 'dup', effect: { type: 'score', value: 10, stacking: 'additive' } }))
      expect(registry.count()).toBe(1)
      const mods = registry.getAll()
      expect(mods[0].effect?.value).toBe(10)
    })
  })

  // === getByTrigger 查询 ===
  describe('getByTrigger', () => {
    it('应该按 trigger 过滤', () => {
      registry.register(createTestModifier({ id: 'a', trigger: 'on_skill_trigger' }))
      registry.register(createTestModifier({ id: 'b', trigger: 'on_word_complete' }))
      registry.register(createTestModifier({ id: 'c', trigger: 'on_skill_trigger' }))

      const result = registry.getByTrigger('on_skill_trigger')
      expect(result).toHaveLength(2)
      expect(result.map(m => m.id).sort()).toEqual(['a', 'c'])
    })

    it('应该按 trigger + phase 过滤', () => {
      registry.register(createTestModifier({ id: 'a', trigger: 'on_skill_trigger', phase: 'before' }))
      registry.register(createTestModifier({ id: 'b', trigger: 'on_skill_trigger', phase: 'calculate' }))
      registry.register(createTestModifier({ id: 'c', trigger: 'on_skill_trigger', phase: 'after' }))

      const result = registry.getByTrigger('on_skill_trigger', 'calculate')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('b')
    })

    it('无匹配时返回空数组', () => {
      registry.register(createTestModifier({ trigger: 'on_error' }))
      expect(registry.getByTrigger('on_battle_start')).toEqual([])
    })
  })

  // === getBySource 查询 ===
  describe('getBySource', () => {
    it('应该按 source 过滤', () => {
      registry.register(createTestModifier({ id: 'a', source: 'skill:burst' }))
      registry.register(createTestModifier({ id: 'b', source: 'skill:burst' }))
      registry.register(createTestModifier({ id: 'c', source: 'relic:magnet' }))

      const result = registry.getBySource('skill:burst')
      expect(result).toHaveLength(2)
      expect(result.map(m => m.id).sort()).toEqual(['a', 'b'])
    })

    it('无匹配时返回空数组', () => {
      expect(registry.getBySource('nonexistent')).toEqual([])
    })
  })

  // === registerMany / unregisterBySource 批量操作 ===
  describe('registerMany', () => {
    it('应该批量注册多个修饰器', () => {
      const mods = [
        createTestModifier({ id: 'a' }),
        createTestModifier({ id: 'b' }),
        createTestModifier({ id: 'c' }),
      ]
      registry.registerMany(mods)
      expect(registry.count()).toBe(3)
    })
  })

  describe('unregisterBySource', () => {
    it('应该移除所有来自同一 source 的修饰器', () => {
      registry.register(createTestModifier({ id: 'a', source: 'skill:burst' }))
      registry.register(createTestModifier({ id: 'b', source: 'skill:burst' }))
      registry.register(createTestModifier({ id: 'c', source: 'relic:magnet' }))

      registry.unregisterBySource('skill:burst')
      expect(registry.count()).toBe(1)
      expect(registry.has('c')).toBe(true)
    })

    it('source 不存在时不报错', () => {
      expect(() => registry.unregisterBySource('nonexistent')).not.toThrow()
    })
  })

  // === priority 排序 ===
  describe('priority 排序', () => {
    it('getByTrigger 结果应按 priority 升序排序', () => {
      registry.register(createTestModifier({ id: 'low', trigger: 'on_skill_trigger', priority: 200 }))
      registry.register(createTestModifier({ id: 'high', trigger: 'on_skill_trigger', priority: 10 }))
      registry.register(createTestModifier({ id: 'mid', trigger: 'on_skill_trigger', priority: 100 }))

      const result = registry.getByTrigger('on_skill_trigger')
      expect(result.map(m => m.id)).toEqual(['high', 'mid', 'low'])
    })

    it('getBySource 结果应按 priority 升序排序', () => {
      registry.register(createTestModifier({ id: 'c', source: 'skill:burst', priority: 300 }))
      registry.register(createTestModifier({ id: 'a', source: 'skill:burst', priority: 50 }))

      const result = registry.getBySource('skill:burst')
      expect(result.map(m => m.id)).toEqual(['a', 'c'])
    })

    it('getAll 结果应按 priority 升序排序', () => {
      registry.register(createTestModifier({ id: 'z', priority: 999 }))
      registry.register(createTestModifier({ id: 'a', priority: 1 }))

      const result = registry.getAll()
      expect(result.map(m => m.id)).toEqual(['a', 'z'])
    })
  })

  // === clear ===
  describe('clear', () => {
    it('应该清除所有修饰器', () => {
      registry.register(createTestModifier({ id: 'a' }))
      registry.register(createTestModifier({ id: 'b' }))
      registry.clear()
      expect(registry.count()).toBe(0)
      expect(registry.getAll()).toEqual([])
    })
  })

  // === has ===
  describe('has', () => {
    it('存在时返回 true', () => {
      registry.register(createTestModifier({ id: 'x' }))
      expect(registry.has('x')).toBe(true)
    })

    it('不存在时返回 false', () => {
      expect(registry.has('nope')).toBe(false)
    })
  })

  // === 不可变性 ===
  describe('返回值隔离', () => {
    it('getAll 返回副本，修改不影响内部状态', () => {
      registry.register(createTestModifier({ id: 'a' }))
      const all = registry.getAll()
      all.length = 0
      expect(registry.count()).toBe(1)
    })
  })
})
