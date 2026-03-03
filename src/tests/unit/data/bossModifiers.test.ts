// ============================================
// 打字肉鸽 - bossModifiers 单元测试
// ============================================
// Story 18.1: Boss 修饰器池

import { describe, it, expect } from 'vitest'
import {
  BOSS_MODIFIER_IDS,
  drawBossModifiers,
} from '../../../src/data/bossModifiers'

describe('bossModifiers', () => {
  describe('BOSS_MODIFIER_IDS', () => {
    it('共 13 个修饰器', () => {
      expect(BOSS_MODIFIER_IDS).toHaveLength(13)
    })

    it('包含 7 个打字难度类修饰器', () => {
      const typingMods = [
        'boss_fade', 'boss_scramble', 'boss_reverse',
        'boss_drift', 'boss_masked', 'boss_spotlight', 'boss_rhythm',
      ]
      typingMods.forEach(id => {
        expect(BOSS_MODIFIER_IDS).toContain(id)
      })
    })

    it('包含 6 个数值规则类修饰器', () => {
      const numericalMods = [
        'boss_decay', 'boss_combo_punish', 'boss_cap',
        'boss_fast_time', 'boss_double_target', 'boss_diminish',
      ]
      numericalMods.forEach(id => {
        expect(BOSS_MODIFIER_IDS).toContain(id)
      })
    })

    it('所有 ID 不重复', () => {
      const unique = new Set(BOSS_MODIFIER_IDS)
      expect(unique.size).toBe(BOSS_MODIFIER_IDS.length)
    })
  })

  describe('drawBossModifiers()', () => {
    it('抽取 3 个修饰器', () => {
      const result = drawBossModifiers(3)
      expect(result).toHaveLength(3)
    })

    it('抽取结果不重复', () => {
      const result = drawBossModifiers(3)
      const unique = new Set(result)
      expect(unique.size).toBe(3)
    })

    it('抽取的都是合法修饰器 ID', () => {
      const result = drawBossModifiers(3)
      result.forEach(id => {
        expect(BOSS_MODIFIER_IDS).toContain(id)
      })
    })

    it('抽取 0 个返回空数组', () => {
      expect(drawBossModifiers(0)).toHaveLength(0)
    })

    it('抽取 1 个返回单元素数组', () => {
      const result = drawBossModifiers(1)
      expect(result).toHaveLength(1)
      expect(BOSS_MODIFIER_IDS).toContain(result[0])
    })

    it('抽取 13 个返回全部修饰器', () => {
      const result = drawBossModifiers(13)
      expect(result).toHaveLength(13)
      const unique = new Set(result)
      expect(unique.size).toBe(13)
    })

    it('抽取超过总数时最多返回 13 个', () => {
      const result = drawBossModifiers(20)
      expect(result).toHaveLength(13)
    })

    it('多次抽取具有随机性', () => {
      const results = new Set<string>()
      for (let i = 0; i < 20; i++) {
        const draw = drawBossModifiers(3)
        results.add(draw.sort().join(','))
      }
      // 20 次抽取应至少有 2 种不同组合（极低概率全相同）
      expect(results.size).toBeGreaterThanOrEqual(2)
    })
  })
})
