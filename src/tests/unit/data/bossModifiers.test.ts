// ============================================
// 打字肉鸽 - bossModifiers 单元测试
// ============================================
// Story 18.1: Boss 修饰器池

import { describe, it, expect } from 'vitest'
import {
  BOSS_MODIFIER_IDS,
  drawBossModifiers,
  BOSS_MODIFIER_META,
  getBossModifierMeta,
  BOSS_MODIFIER_REGISTRY,
} from '../../../src/data/bossModifiers'
import type { BossModifierId } from '../../../src/data/bossModifiers'

describe('bossModifiers', () => {
  describe('BOSS_MODIFIER_IDS', () => {
    it('共 18 个修饰器', () => {
      expect(BOSS_MODIFIER_IDS).toHaveLength(18)
    })

    it('包含 6 个进攻类修饰器', () => {
      const offenseMods = [
        'boss_fast_time', 'boss_keystroke_tax', 'boss_escalation',
        'boss_frostbite', 'boss_resource_tax', 'boss_mirror',
      ]
      offenseMods.forEach(id => {
        expect(BOSS_MODIFIER_IDS).toContain(id)
      })
    })

    it('包含 6 个防守类修饰器', () => {
      const defenseMods = [
        'boss_decay', 'boss_combo_punish', 'boss_cap',
        'boss_double_target', 'boss_diminish', 'boss_score_tax',
      ]
      defenseMods.forEach(id => {
        expect(BOSS_MODIFIER_IDS).toContain(id)
      })
    })

    it('包含 6 个干扰类修饰器', () => {
      const disruptionMods = [
        'boss_fade', 'boss_scramble', 'boss_reverse',
        'boss_spotlight', 'boss_garble', 'boss_scroll',
      ]
      disruptionMods.forEach(id => {
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

    it('抽取 18 个返回全部修饰器', () => {
      const result = drawBossModifiers(18)
      expect(result).toHaveLength(18)
      const unique = new Set(result)
      expect(unique.size).toBe(18)
    })

    it('抽取超过总数时最多返回 18 个', () => {
      const result = drawBossModifiers(25)
      expect(result).toHaveLength(18)
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

  describe('BOSS_MODIFIER_META', () => {
    it('包含所有 18 个修饰器的元数据', () => {
      BOSS_MODIFIER_IDS.forEach(id => {
        expect(BOSS_MODIFIER_META[id]).toBeDefined()
      })
    })

    it('每个元数据包含必要字段', () => {
      BOSS_MODIFIER_IDS.forEach(id => {
        const meta = BOSS_MODIFIER_META[id]
        expect(meta.id).toBe(id)
        expect(meta.name).toBeTruthy()
        expect(meta.icon).toBeTruthy()
        expect(meta.description).toBeTruthy()
        expect(meta.eliteHint).toBeTruthy()
        expect(['offense', 'defense', 'disruption']).toContain(meta.category)
      })
    })

    it('每个图标唯一', () => {
      const icons = Object.values(BOSS_MODIFIER_META).map(m => m.icon)
      expect(new Set(icons).size).toBe(icons.length)
    })

    it('没有多余的元数据条目', () => {
      const metaKeys = Object.keys(BOSS_MODIFIER_META)
      expect(metaKeys).toHaveLength(18)
      metaKeys.forEach(key => {
        expect(BOSS_MODIFIER_IDS).toContain(key)
      })
    })
  })

  describe('getBossModifierMeta()', () => {
    it('返回已知修饰器的元数据', () => {
      const meta = getBossModifierMeta('boss_fade')
      expect(meta).toBeDefined()
      expect(meta!.id).toBe('boss_fade')
      expect(meta!.name).toBe('渐隐之词')
      expect(meta!.icon).toBe('👻')
    })

    it('返回 undefined 给未知 ID', () => {
      expect(getBossModifierMeta('unknown_id' as BossModifierId)).toBeUndefined()
    })

    it('所有 18 个修饰器都能查询', () => {
      BOSS_MODIFIER_IDS.forEach(id => {
        const meta = getBossModifierMeta(id)
        expect(meta).toBeDefined()
        expect(meta!.id).toBe(id)
      })
    })
  })

  // Story 18.4: BossModifier 注册表
  describe('BOSS_MODIFIER_REGISTRY', () => {
    it('注册表包含全部 18 个修饰器', () => {
      const keys = Object.keys(BOSS_MODIFIER_REGISTRY)
      expect(keys).toHaveLength(18)
      BOSS_MODIFIER_IDS.forEach(id => {
        expect(BOSS_MODIFIER_REGISTRY[id]).toBeDefined()
      })
    })

    it('每个修饰器 id 与注册表 key 一致', () => {
      for (const [key, mod] of Object.entries(BOSS_MODIFIER_REGISTRY)) {
        expect(mod.id).toBe(key)
      }
    })

    it('6 个数值修饰器返回非空参数', () => {
      const numerical: BossModifierId[] = [
        'boss_decay', 'boss_combo_punish', 'boss_cap',
        'boss_fast_time', 'boss_double_target', 'boss_diminish',
      ]
      numerical.forEach(id => {
        const params = BOSS_MODIFIER_REGISTRY[id].getParams(false)
        const values = Object.values(params).filter(v => v !== undefined)
        expect(values.length).toBeGreaterThan(0)
      })
    })

    it('boss_garble 返回 garbleRate 和 garbleActive', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_garble.getParams(false)
      expect(params.garbleRate).toBe(0.3)
      expect(params.garbleActive).toBe(1)
    })

    it('boss_scroll 返回 scrollSpeed 和 scrollHitZone', () => {
      const params = BOSS_MODIFIER_REGISTRY.boss_scroll.getParams(false)
      expect(params.scrollSpeed).toBe(100)
      expect(params.scrollHitZone).toBe(40)
    })

    it('包含 boss_garble 和 boss_scroll', () => {
      expect(BOSS_MODIFIER_IDS).toContain('boss_garble')
      expect(BOSS_MODIFIER_IDS).toContain('boss_scroll')
    })
  })
})
