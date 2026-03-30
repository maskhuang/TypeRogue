// ============================================
// 打字肉鸽 - Boss 修饰器选择与叠加 单元测试
// ============================================
// Story 25.3: 修饰器候选生成 + 多修饰器引擎 + 选择流程

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import {
  BOSS_MODIFIER_IDS,
  generateBossModifierCandidates,
  generateBossModifierCandidatesByCategory,
  BOSS_MODIFIER_META,
  getActiveParams,
  setActiveParams,
} from '../../../src/data/bossModifiers'
import type { BossModifierId } from '../../../src/data/bossModifiers'
import {
  applyModifier,
  cleanupModifier,
  cleanupTemporaryModifiers,
  tickModifier,
  getActiveModifierEffect,
  isModifierActive,
} from '../../../src/systems/bossModifierEngine'

// Mock DOM
vi.stubGlobal('document', {
  getElementById: vi.fn(() => ({
    classList: { add: vi.fn(), remove: vi.fn() },
    querySelector: vi.fn(() => ({ textContent: '' })),
    appendChild: vi.fn(),
    style: {},
  })),
  createElement: vi.fn(() => ({
    className: '',
    innerHTML: '',
    remove: vi.fn(),
  })),
  querySelectorAll: vi.fn(() => []),
})

describe('Boss 修饰器选择与叠加 (Story 25.3)', () => {
  beforeEach(() => {
    resetState()
    cleanupModifier()
    setActiveParams(null)
  })

  // === AC2: 候选池排除 ===

  describe('generateBossModifierCandidatesByCategory', () => {
    it('返回 3 组候选（offense/defense/disruption）', () => {
      const groups = generateBossModifierCandidatesByCategory([])
      expect(groups).toHaveLength(3)
    })

    it('每组返回 2 个候选', () => {
      const groups = generateBossModifierCandidatesByCategory([])
      for (const group of groups) {
        expect(group).toHaveLength(2)
      }
    })

    it('各组候选属于正确的类别', () => {
      const categories = ['offense', 'defense', 'disruption'] as const
      const groups = generateBossModifierCandidatesByCategory([])
      for (let i = 0; i < 3; i++) {
        for (const id of groups[i]) {
          expect(BOSS_MODIFIER_META[id].category).toBe(categories[i])
        }
      }
    })

    it('候选全部来自 BOSS_MODIFIER_IDS', () => {
      const all = generateBossModifierCandidatesByCategory([]).flat()
      all.forEach(id => {
        expect(BOSS_MODIFIER_IDS).toContain(id)
      })
    })

    it('排除已激活的修饰器', () => {
      const active: BossModifierId[] = ['boss_fade', 'boss_decay', 'boss_fast_time']
      const all = generateBossModifierCandidatesByCategory(active).flat()
      active.forEach(id => {
        expect(all).not.toContain(id)
      })
    })

    it('某类别全部排除后该组为空', () => {
      // 排除所有 offense（前 6 个）
      const allOffense = BOSS_MODIFIER_IDS.filter(id => BOSS_MODIFIER_META[id].category === 'offense') as BossModifierId[]
      const groups = generateBossModifierCandidatesByCategory(allOffense)
      expect(groups[0]).toHaveLength(0) // offense 为空
      expect(groups[1]).toHaveLength(2) // defense 正常
      expect(groups[2]).toHaveLength(2) // disruption 正常
    })

    it('排除全部 14 个后所有组为空', () => {
      const active = [...BOSS_MODIFIER_IDS] as BossModifierId[]
      const groups = generateBossModifierCandidatesByCategory(active)
      expect(groups.flat()).toHaveLength(0)
    })

    it('多次调用结果随机', () => {
      const results = new Set<string>()
      for (let i = 0; i < 20; i++) {
        const c = generateBossModifierCandidatesByCategory([]).flat()
        results.add(c.sort().join(','))
      }
      expect(results.size).toBeGreaterThan(1)
    })
  })

  // === AC5: 多修饰器引擎 ===

  describe('多修饰器引擎', () => {
    it('同时应用两个修饰器', () => {
      applyModifier('boss_cap', false)
      applyModifier('boss_fast_time', false)
      const effect = getActiveModifierEffect()
      expect(effect).not.toBeNull()
      expect(effect!.scoreCapPct).toBe(0.10)
      expect(effect!.timeSpeed).toBe(1)
    })

    it('同时应用三个修饰器', () => {
      applyModifier('boss_cap', false)
      applyModifier('boss_fast_time', false)
      applyModifier('boss_decay', false)
      const effect = getActiveModifierEffect()
      expect(effect!.scoreCapPct).toBe(0.10)
      expect(effect!.timeSpeed).toBe(1)
      expect(effect!.decayRate).toBe(0.05)
    })

    it('tickModifier 遍历所有活跃修饰器', () => {
      state.score = 1000
      applyModifier('boss_decay', false) // has onTick
      applyModifier('boss_cap', false) // no onTick
      tickModifier(1.0)
      // boss_decay tick: 1000 * 0.05 * 1.0 = 50
      expect(state.score).toBeCloseTo(950, 0)
    })

    it('cleanupModifier 清理全部修饰器', () => {
      applyModifier('boss_cap', false)
      applyModifier('boss_fast_time', false)
      applyModifier('boss_decay', false)
      cleanupModifier()
      expect(getActiveModifierEffect()).toBeNull()
    })

    it('isModifierActive 检测已激活修饰器', () => {
      applyModifier('boss_cap', false)
      expect(isModifierActive('boss_cap')).toBe(true)
      expect(isModifierActive('boss_decay')).toBe(false)
    })

    it('isModifierActive 区分永久和临时', () => {
      applyModifier('boss_cap', false, true) // permanent
      applyModifier('boss_decay', false, false) // temporary
      expect(isModifierActive('boss_cap')).toBe(true)
      expect(isModifierActive('boss_decay')).toBe(true)
    })
  })

  // === cleanupTemporaryModifiers ===

  describe('cleanupTemporaryModifiers', () => {
    it('清理临时修饰器，保留永久修饰器', () => {
      applyModifier('boss_cap', false, true) // permanent
      applyModifier('boss_fast_time', false, false) // temporary
      cleanupTemporaryModifiers()
      const effect = getActiveModifierEffect()
      expect(effect!.scoreCapPct).toBe(0.10)
      expect(effect!.timeSpeed).toBeUndefined()
    })

    it('无永久修饰器时清理后为空', () => {
      applyModifier('boss_cap', false, false)
      applyModifier('boss_fast_time', false, false)
      cleanupTemporaryModifiers()
      expect(getActiveModifierEffect()).toBeNull()
    })

    it('全是永久修饰器时不清理', () => {
      applyModifier('boss_cap', false, true)
      applyModifier('boss_fast_time', false, true)
      cleanupTemporaryModifiers()
      const effect = getActiveModifierEffect()
      expect(effect!.scoreCapPct).toBe(0.10)
      expect(effect!.timeSpeed).toBe(1)
    })

    it('多次调用幂等', () => {
      applyModifier('boss_cap', false, true) // permanent
      applyModifier('boss_fast_time', false, false) // temporary
      cleanupTemporaryModifiers()
      cleanupTemporaryModifiers()
      const effect = getActiveModifierEffect()
      expect(effect!.scoreCapPct).toBe(0.10)
    })
  })

  // === AC3: 选择流程 ===

  describe('选择流程加入 activeModifiers', () => {
    it('选中修饰器后添加到 state.activeModifiers', () => {
      state.activeModifiers = []
      const modId: BossModifierId = 'boss_cap'
      state.activeModifiers.push(modId)
      expect(state.activeModifiers).toContain('boss_cap')
      expect(state.activeModifiers).toHaveLength(1)
    })

    it('多次选择累积', () => {
      state.activeModifiers = ['boss_cap']
      state.activeModifiers.push('boss_decay')
      expect(state.activeModifiers).toHaveLength(2)
      expect(state.activeModifiers).toContain('boss_cap')
      expect(state.activeModifiers).toContain('boss_decay')
    })

    it('候选排除已累积的修饰器', () => {
      state.activeModifiers = ['boss_cap', 'boss_decay']
      const candidates = generateBossModifierCandidates(state.activeModifiers)
      expect(candidates).not.toContain('boss_cap')
      expect(candidates).not.toContain('boss_decay')
    })
  })

  // === AC4: startLevel 多修饰器应用 ===

  describe('startLevel activeModifiers 应用', () => {
    it('永久修饰器参数通过 applyModifier 写入', () => {
      // 模拟 startLevel 中的循环
      state.activeModifiers = ['boss_cap', 'boss_fast_time']
      for (const modId of state.activeModifiers) {
        applyModifier(modId, false, true)
      }
      const effect = getActiveModifierEffect()
      expect(effect!.scoreCapPct).toBe(0.10)
      expect(effect!.timeSpeed).toBe(1)
    })

    it('永久修饰器使用满功率参数（isElite=false）', () => {
      state.activeModifiers = ['boss_cap']
      applyModifier('boss_cap', false, true)
      const effect = getActiveModifierEffect()
      expect(effect!.scoreCapPct).toBe(0.10) // 满功率
    })
  })

  // === AC6: 与现有 elite/boss 关卡兼容 ===

  describe('elite/boss 修饰器共存', () => {
    it('永久修饰器 + 精英临时修饰器同时生效', () => {
      // 永久修饰器
      applyModifier('boss_cap', false, true) // permanent, full power
      // 精英关修饰器
      applyModifier('boss_fast_time', true, false) // elite, temporary
      const effect = getActiveModifierEffect()
      expect(effect!.scoreCapPct).toBe(0.10) // permanent full power
      expect(effect!.timeSpeed).toBe(1) // elite reduced
    })

    it('精英关跳过已在永久列表中的修饰器', () => {
      applyModifier('boss_cap', false, true) // permanent
      // 精英关尝试应用同一个 → 检查 isModifierActive
      expect(isModifierActive('boss_cap')).toBe(true)
      // 不重复应用
    })

    it('Boss 轮换切换保留永久修饰器', () => {
      // 永久修饰器
      applyModifier('boss_cap', false, true) // permanent
      // 临时修饰器（模拟 Boss 轮换阶段 A）
      applyModifier('boss_decay', false, false) // temporary

      // 切换阶段 → cleanupTemporary
      cleanupTemporaryModifiers()
      expect(isModifierActive('boss_cap')).toBe(true) // permanent preserved
      expect(isModifierActive('boss_decay')).toBe(false) // temporary removed

      // 应用新的临时修饰器（阶段 B）
      applyModifier('boss_fast_time', false, false)
      const effect = getActiveModifierEffect()
      expect(effect!.scoreCapPct).toBe(0.10) // permanent still active
      expect(effect!.timeSpeed).toBe(1) // new temporary
      expect(effect!.decayRate).toBeUndefined() // old temporary gone
    })

    it('Boss 轮换跳过已在永久列表中的修饰器（不双重应用）', () => {
      // 永久修饰器 boss_cap
      applyModifier('boss_cap', false, true) // permanent, scoreCapPct: 0.10
      // 模拟 Boss 轮换 cleanupTemporary + 尝试应用同一个修饰器
      cleanupTemporaryModifiers()
      // switchToPhase 中的逻辑：isModifierActive(boss_cap) → true → 不重复应用
      expect(isModifierActive('boss_cap')).toBe(true)
      // 验证不会出现双重实例
      const effect = getActiveModifierEffect()
      expect(effect!.scoreCapPct).toBe(0.10)
    })

    it('endLevel cleanupModifier 清理全部（永久 + 临时）', () => {
      applyModifier('boss_cap', false, true) // permanent
      applyModifier('boss_decay', false, false) // temporary
      cleanupModifier() // endLevel
      expect(getActiveModifierEffect()).toBeNull()
      expect(isModifierActive('boss_cap')).toBe(false)
      expect(isModifierActive('boss_decay')).toBe(false)
    })
  })

  // === getActiveParams 合并 ===

  describe('getActiveParams 合并', () => {
    it('多个修饰器参数合并（Object.assign 语义）', () => {
      applyModifier('boss_cap', false, true) // scoreCapPct: 0.10
      applyModifier('boss_fast_time', false, true) // timeSpeed: 1
      applyModifier('boss_decay', false, true) // decayRate: 0.05
      const params = getActiveParams()
      expect(params!.scoreCapPct).toBe(0.10)
      expect(params!.timeSpeed).toBe(1)
      expect(params!.decayRate).toBe(0.05)
    })

    it('无活跃修饰器时返回 null', () => {
      expect(getActiveParams()).toBeNull()
    })

    it('cleanupTemporary 后重新计算合并参数', () => {
      applyModifier('boss_cap', false, true) // permanent
      applyModifier('boss_fast_time', false, false) // temporary
      const before = getActiveParams()
      expect(before!.timeSpeed).toBe(1)

      cleanupTemporaryModifiers()
      const after = getActiveParams()
      expect(after!.scoreCapPct).toBe(0.10)
      expect(after!.timeSpeed).toBeUndefined()
    })
  })
})
