// ============================================
// 打字肉鸽 - SeededRandom 单元测试
// ============================================
// Story 25.6: 每日种子系统

import { describe, it, expect, afterEach } from 'vitest'
import {
  SeededRandom,
  hashCode,
  getDailySeed,
  getDailySeedString,
  random,
  setSeededMode,
  setNormalMode,
  seededShuffle,
} from '../../../src/core/seededRandom'
import { getStarterWords } from '../../../src/data/words'
import { MetaState } from '../../../src/core/state/MetaState'

describe('SeededRandom (Story 25.6)', () => {
  afterEach(() => {
    setNormalMode()
  })

  // === AC1: 种子化随机数生成器 ===

  describe('SeededRandom 类', () => {
    it('固定种子产生相同序列', () => {
      const rng1 = new SeededRandom(12345)
      const rng2 = new SeededRandom(12345)
      const seq1 = Array.from({ length: 10 }, () => rng1.next())
      const seq2 = Array.from({ length: 10 }, () => rng2.next())
      expect(seq1).toEqual(seq2)
    })

    it('不同种子产生不同序列', () => {
      const rng1 = new SeededRandom(12345)
      const rng2 = new SeededRandom(54321)
      const seq1 = Array.from({ length: 5 }, () => rng1.next())
      const seq2 = Array.from({ length: 5 }, () => rng2.next())
      expect(seq1).not.toEqual(seq2)
    })

    it('next() 返回 [0,1) 范围的数', () => {
      const rng = new SeededRandom(42)
      for (let i = 0; i < 100; i++) {
        const v = rng.next()
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    })

    it('nextInt(min, max) 返回 [min, max) 整数', () => {
      const rng = new SeededRandom(99)
      for (let i = 0; i < 100; i++) {
        const v = rng.nextInt(3, 10)
        expect(v).toBeGreaterThanOrEqual(3)
        expect(v).toBeLessThan(10)
        expect(Number.isInteger(v)).toBe(true)
      }
    })

    it('nextInt 固定种子结果一致', () => {
      const rng1 = new SeededRandom(77)
      const rng2 = new SeededRandom(77)
      const seq1 = Array.from({ length: 10 }, () => rng1.nextInt(0, 100))
      const seq2 = Array.from({ length: 10 }, () => rng2.nextInt(0, 100))
      expect(seq1).toEqual(seq2)
    })
  })

  // === AC2: 种子值由日期生成 ===

  describe('hashCode', () => {
    it('相同字符串产生相同哈希', () => {
      expect(hashCode('2026-03-06')).toBe(hashCode('2026-03-06'))
    })

    it('不同字符串产生不同哈希', () => {
      expect(hashCode('2026-03-06')).not.toBe(hashCode('2026-03-07'))
    })

    it('返回 32 位整数', () => {
      const h = hashCode('test-string')
      expect(Number.isInteger(h)).toBe(true)
      expect(Math.abs(h)).toBeLessThanOrEqual(0x7FFFFFFF + 1)
    })
  })

  describe('getDailySeed / getDailySeedString', () => {
    it('getDailySeedString 返回 YYYY-MM-DD 格式', () => {
      const s = getDailySeedString()
      expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('getDailySeed 返回整数', () => {
      const seed = getDailySeed()
      expect(Number.isInteger(seed)).toBe(true)
    })

    it('同一调用期间 getDailySeed 返回一致值', () => {
      const s1 = getDailySeed()
      const s2 = getDailySeed()
      expect(s1).toBe(s2)
    })
  })

  // === AC1: 全局 random() 切换 ===

  describe('全局 random() 切换', () => {
    it('setNormalMode 后 random() 返回 [0,1) 范围', () => {
      setNormalMode()
      for (let i = 0; i < 10; i++) {
        const v = random()
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    })

    it('setSeededMode 后 random() 确定性输出', () => {
      setSeededMode(12345)
      const seq1 = Array.from({ length: 5 }, () => random())
      setSeededMode(12345)
      const seq2 = Array.from({ length: 5 }, () => random())
      expect(seq1).toEqual(seq2)
    })

    it('setNormalMode 恢复非确定性', () => {
      setSeededMode(99999)
      const seeded = random()
      setNormalMode()
      // 普通模式不保证相同值（概率极小）
      // 只验证返回有效值
      const normal = random()
      expect(normal).toBeGreaterThanOrEqual(0)
      expect(normal).toBeLessThan(1)
    })
  })

  // === AC1: seededShuffle ===

  describe('seededShuffle', () => {
    it('固定种子洗牌结果一致', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const rng1 = new SeededRandom(42)
      const rng2 = new SeededRandom(42)
      const result1 = seededShuffle(arr, rng1)
      const result2 = seededShuffle(arr, rng2)
      expect(result1).toEqual(result2)
    })

    it('不修改原数组', () => {
      const arr = [1, 2, 3, 4, 5]
      const original = [...arr]
      const rng = new SeededRandom(42)
      seededShuffle(arr, rng)
      expect(arr).toEqual(original)
    })

    it('返回的数组包含所有原始元素', () => {
      const arr = [1, 2, 3, 4, 5]
      const rng = new SeededRandom(42)
      const result = seededShuffle(arr, rng)
      expect(result.sort()).toEqual([1, 2, 3, 4, 5])
    })

    it('不同种子产生不同顺序', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const r1 = seededShuffle(arr, new SeededRandom(1))
      const r2 = seededShuffle(arr, new SeededRandom(2))
      expect(r1).not.toEqual(r2)
    })
  })

  // === AC3: getStarterWords 确定性 ===

  describe('getStarterWords + seeded mode', () => {
    it('相同种子产生相同初始词库', () => {
      setSeededMode(42)
      const words1 = getStarterWords()
      setSeededMode(42)
      const words2 = getStarterWords()
      expect(words1).toEqual(words2)
    })

    it('不同种子产生不同初始词库', () => {
      setSeededMode(42)
      const words1 = getStarterWords()
      setSeededMode(99999)
      const words2 = getStarterWords()
      expect(words1).not.toEqual(words2)
    })
  })

  // === AC5: 每日排行榜独立性 ===

  describe('每日排行榜', () => {
    let meta: MetaState

    afterEach(() => {
      meta.dispose()
    })

    function makeEntry(overrides?: Partial<import('../../../src/core/state/MetaState').LeaderboardEntry>) {
      return {
        cycle: 1,
        score: 100,
        date: new Date().toISOString(),
        result: 'gameover' as const,
        buildSummary: { skills: [], enchantments: [], relics: [], activeModifiers: [] },
        ...overrides,
      }
    }

    it('普通和每日排行榜独立', () => {
      meta = new MetaState()
      meta.addLeaderboardEntry(makeEntry({ score: 200 }))
      meta.addDailyLeaderboardEntry(makeEntry({ score: 300, seed: 42 }))
      expect(meta.getLeaderboard()).toHaveLength(1)
      expect(meta.getLeaderboard()[0].score).toBe(200)
      expect(meta.getDailyLeaderboard()).toHaveLength(1)
      expect(meta.getDailyLeaderboard()[0].score).toBe(300)
    })

    it('每日排行榜条目包含 seed', () => {
      meta = new MetaState()
      meta.addDailyLeaderboardEntry(makeEntry({ seed: 12345 }))
      expect(meta.getDailyLeaderboard()[0].seed).toBe(12345)
    })

    it('序列化/反序列化保留每日排行榜', () => {
      meta = new MetaState()
      meta.addDailyLeaderboardEntry(makeEntry({ score: 500, seed: 42 }))
      const json = meta.serialize()
      const meta2 = new MetaState()
      meta2.deserialize(json)
      expect(meta2.getDailyLeaderboard()).toHaveLength(1)
      expect(meta2.getDailyLeaderboard()[0].score).toBe(500)
      expect(meta2.getDailyLeaderboard()[0].seed).toBe(42)
      meta2.dispose()
    })

    it('反序列化 v2 数据（无 dailyLeaderboard）默认空数组', () => {
      meta = new MetaState()
      const v2Data = JSON.stringify({
        version: 2,
        unlockedSkills: [],
        unlockedRelics: [],
        achievements: [],
        stats: {},
        leaderboard: [makeEntry()],
      })
      meta.deserialize(v2Data)
      expect(meta.getDailyLeaderboard()).toEqual([])
      expect(meta.getLeaderboard()).toHaveLength(1)
    })

    it('checkUnlocks 根据 seed 字段分流到正确排行榜', () => {
      meta = new MetaState()
      const baseStats = {
        totalScore: 5000,
        stagesCleared: 3,
        maxCombo: 10,
        skills: ['skill_a'],
        relics: [] as string[],
      }
      // 无 seed → 普通排行榜
      meta.checkUnlocks({ runResult: 'gameover', runStats: baseStats, cycle: 1 })
      // 有 seed → 每日排行榜
      meta.checkUnlocks({ runResult: 'gameover', runStats: baseStats, cycle: 1, seed: 42 })

      expect(meta.getLeaderboard()).toHaveLength(1)
      expect(meta.getLeaderboard()[0].seed).toBeUndefined()
      expect(meta.getDailyLeaderboard()).toHaveLength(1)
      expect(meta.getDailyLeaderboard()[0].seed).toBe(42)
    })
  })
})
