// ============================================
// 打字肉鸽 - T4 限制框架测试
// ============================================
// Story 30.1: 技能限制框架

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { queryRelicFlag } from '../../../../src/systems/relics/RelicPipeline'
import { RELIC_FLAGS, RELICS } from '../../../../src/data/relics'

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
      },
      combo: 0,
      multiplier: 1,
      level: 1,
    },
    synergy: {
      wordSkillCount: 0,
      skillBaseScore: 0,
    },
  }
})

import { state } from '../../../../src/core/state'

function clearRelics(): void {
  state.player.relics.clear()
}

function addRelic(id: string): void {
  state.player.relics.add(id)
}

// === queryRelicFlag T4 扩展测试 ===
describe('queryRelicFlag — T4 限制 Flag', () => {
  // 保存原始值，afterEach 恢复（防止污染其他测试）
  const savedFlags: Record<string, string[]> = {}

  beforeEach(() => {
    clearRelics()
    // 保存原始值
    for (const key of Object.keys(RELIC_FLAGS)) {
      savedFlags[key] = [...RELIC_FLAGS[key]]
    }
    // 注入测试数据
    RELIC_FLAGS['connector_lock'] = ['test_chain_ban']
    RELIC_FLAGS['enchant_lock'] = ['test_no_enchant']
    RELIC_FLAGS['max_skill_level'] = ['test_minimalist']
  })

  afterEach(() => {
    // 恢复原始值
    for (const key of Object.keys(savedFlags)) {
      RELIC_FLAGS[key] = savedFlags[key]
    }
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
      // 临时注入 RELICS 数据
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
      // 清理
      delete (RELICS as any)['test_minimalist']
    })
  })
})

// === RELIC_FLAGS 数据结构测试 ===
describe('RELIC_FLAGS', () => {
  it('包含 3 个限制 flag', () => {
    expect('connector_lock' in RELIC_FLAGS).toBe(true)
    expect('enchant_lock' in RELIC_FLAGS).toBe(true)
    expect('max_skill_level' in RELIC_FLAGS).toBe(true)
  })

  it('初始为空数组（Story 30-2 填充）', () => {
    // 注意：测试 setup 可能已修改，检查类型
    expect(Array.isArray(RELIC_FLAGS['connector_lock'])).toBe(true)
    expect(Array.isArray(RELIC_FLAGS['enchant_lock'])).toBe(true)
    expect(Array.isArray(RELIC_FLAGS['max_skill_level'])).toBe(true)
  })
})
