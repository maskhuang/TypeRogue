// ============================================
// 打字肉鸽 - 排行榜系统 单元测试
// ============================================
// Story 25.5: 排行榜数据层 + 成绩记录

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MetaState } from '../../../src/core/state/MetaState'
import type { LeaderboardEntry, BuildSummary } from '../../../src/core/state/MetaState'

function makeBuildSummary(overrides?: Partial<BuildSummary>): BuildSummary {
  return {
    skills: [{ id: 'base_producer_add', level: 2 }],
    enchantments: [],
    relics: ['lucky_coin'],
    activeModifiers: [],
    ...overrides,
  }
}

function makeEntry(overrides?: Partial<LeaderboardEntry>): LeaderboardEntry {
  return {
    cycle: 1,
    score: 10000,
    date: '2026-03-06T10:00:00.000Z',
    result: 'gameover',
    buildSummary: makeBuildSummary(),
    ...overrides,
  }
}

describe('排行榜系统 (Story 25.5)', () => {
  let meta: MetaState

  beforeEach(() => {
    meta = new MetaState()
  })

  afterEach(() => {
    meta.dispose()
  })

  // === AC1: 数据结构 ===

  describe('LeaderboardEntry 数据结构', () => {
    it('包含所有必要字段', () => {
      const entry = makeEntry({
        cycle: 3,
        score: 125000,
        date: '2026-03-06T10:30:00.000Z',
        result: 'victory',
        buildSummary: makeBuildSummary({
          skills: [{ id: 'base_producer_add', level: 2 }, { id: 'score_converter_mul', level: 1 }],
          enchantments: [{ skillId: 'base_producer_add', enchantmentId: 'growth_adjacent' }],
          relics: ['lucky_coin', 'time_crystal'],
          activeModifiers: ['boss_cap', 'boss_decay'],
        }),
      })
      expect(entry.cycle).toBe(3)
      expect(entry.score).toBe(125000)
      expect(entry.date).toBe('2026-03-06T10:30:00.000Z')
      expect(entry.result).toBe('victory')
      expect(entry.buildSummary.skills).toHaveLength(2)
      expect(entry.buildSummary.enchantments).toHaveLength(1)
      expect(entry.buildSummary.relics).toHaveLength(2)
      expect(entry.buildSummary.activeModifiers).toHaveLength(2)
    })
  })

  // === AC2: 排序规则 ===

  describe('排序规则', () => {
    it('按 cycle 降序排序', () => {
      meta.addLeaderboardEntry(makeEntry({ cycle: 1, score: 50000 }))
      meta.addLeaderboardEntry(makeEntry({ cycle: 3, score: 10000 }))
      meta.addLeaderboardEntry(makeEntry({ cycle: 2, score: 30000 }))

      const lb = meta.getLeaderboard()
      expect(lb[0].cycle).toBe(3)
      expect(lb[1].cycle).toBe(2)
      expect(lb[2].cycle).toBe(1)
    })

    it('同 cycle 按 score 降序排序', () => {
      meta.addLeaderboardEntry(makeEntry({ cycle: 2, score: 10000 }))
      meta.addLeaderboardEntry(makeEntry({ cycle: 2, score: 30000 }))
      meta.addLeaderboardEntry(makeEntry({ cycle: 2, score: 20000 }))

      const lb = meta.getLeaderboard()
      expect(lb[0].score).toBe(30000)
      expect(lb[1].score).toBe(20000)
      expect(lb[2].score).toBe(10000)
    })

    it('同 cycle 同 score 按 date 降序排序', () => {
      meta.addLeaderboardEntry(makeEntry({ cycle: 2, score: 10000, date: '2026-03-01T00:00:00.000Z' }))
      meta.addLeaderboardEntry(makeEntry({ cycle: 2, score: 10000, date: '2026-03-03T00:00:00.000Z' }))
      meta.addLeaderboardEntry(makeEntry({ cycle: 2, score: 10000, date: '2026-03-02T00:00:00.000Z' }))

      const lb = meta.getLeaderboard()
      expect(lb[0].date).toBe('2026-03-03T00:00:00.000Z')
      expect(lb[1].date).toBe('2026-03-02T00:00:00.000Z')
      expect(lb[2].date).toBe('2026-03-01T00:00:00.000Z')
    })

    it('综合排序：cycle > score > date', () => {
      meta.addLeaderboardEntry(makeEntry({ cycle: 1, score: 99999, date: '2026-03-05T00:00:00.000Z' }))
      meta.addLeaderboardEntry(makeEntry({ cycle: 3, score: 10000, date: '2026-03-01T00:00:00.000Z' }))
      meta.addLeaderboardEntry(makeEntry({ cycle: 2, score: 50000, date: '2026-03-03T00:00:00.000Z' }))
      meta.addLeaderboardEntry(makeEntry({ cycle: 2, score: 50000, date: '2026-03-04T00:00:00.000Z' }))

      const lb = meta.getLeaderboard()
      expect(lb[0].cycle).toBe(3)          // highest cycle
      expect(lb[1].cycle).toBe(2)          // same cycle, same score, later date
      expect(lb[1].date).toContain('03-04')
      expect(lb[2].cycle).toBe(2)          // same cycle, same score, earlier date
      expect(lb[2].date).toContain('03-03')
      expect(lb[3].cycle).toBe(1)          // lowest cycle despite highest score
    })
  })

  // === AC3: 存储与容量 ===

  describe('存储与容量', () => {
    it('初始排行榜为空', () => {
      expect(meta.getLeaderboard()).toHaveLength(0)
    })

    it('addLeaderboardEntry 插入记录', () => {
      meta.addLeaderboardEntry(makeEntry())
      expect(meta.getLeaderboard()).toHaveLength(1)
    })

    it('最多保留 20 条记录', () => {
      for (let i = 0; i < 25; i++) {
        meta.addLeaderboardEntry(makeEntry({ score: i * 1000 }))
      }
      expect(meta.getLeaderboard()).toHaveLength(20)
    })

    it('超出 20 条时截断最差记录', () => {
      // 插入 21 条，score 0~20000
      for (let i = 0; i <= 20; i++) {
        meta.addLeaderboardEntry(makeEntry({ score: i * 1000 }))
      }
      const lb = meta.getLeaderboard()
      expect(lb).toHaveLength(20)
      // 最差的 score=0 应被截断
      expect(lb[lb.length - 1].score).toBe(1000)
    })

    it('getLeaderboard 返回副本，修改不影响内部数据', () => {
      meta.addLeaderboardEntry(makeEntry())
      const lb = meta.getLeaderboard()
      lb.push(makeEntry({ score: 99999 }))
      expect(meta.getLeaderboard()).toHaveLength(1)
    })

    it('重复插入相同数据可以共存', () => {
      const entry = makeEntry()
      meta.addLeaderboardEntry(entry)
      meta.addLeaderboardEntry(entry)
      expect(meta.getLeaderboard()).toHaveLength(2)
    })
  })

  // === AC3: 序列化/反序列化 ===

  describe('序列化与反序列化', () => {
    it('serialize 包含 leaderboard 字段', () => {
      meta.addLeaderboardEntry(makeEntry({ cycle: 2, score: 50000 }))
      const json = meta.serialize()
      const parsed = JSON.parse(json)
      expect(parsed.leaderboard).toHaveLength(1)
      expect(parsed.leaderboard[0].cycle).toBe(2)
      expect(parsed.leaderboard[0].score).toBe(50000)
    })

    it('deserialize 恢复排行榜', () => {
      meta.addLeaderboardEntry(makeEntry({ cycle: 3, score: 80000 }))
      meta.addLeaderboardEntry(makeEntry({ cycle: 1, score: 20000 }))
      const json = meta.serialize()

      const meta2 = new MetaState()
      meta2.deserialize(json)
      const lb = meta2.getLeaderboard()
      expect(lb).toHaveLength(2)
      expect(lb[0].cycle).toBe(3)
      expect(lb[1].cycle).toBe(1)
    })

    it('deserialize 包含 buildSummary', () => {
      meta.addLeaderboardEntry(makeEntry({
        buildSummary: makeBuildSummary({
          skills: [{ id: 'test_skill', level: 3 }],
          relics: ['relic_a'],
          activeModifiers: ['boss_cap'],
        }),
      }))
      const json = meta.serialize()

      const meta2 = new MetaState()
      meta2.deserialize(json)
      const lb = meta2.getLeaderboard()
      expect(lb[0].buildSummary.skills[0].id).toBe('test_skill')
      expect(lb[0].buildSummary.relics).toContain('relic_a')
      expect(lb[0].buildSummary.activeModifiers).toContain('boss_cap')
    })

    it('旧存档兼容：无 leaderboard 字段默认空数组', () => {
      const oldJson = JSON.stringify({
        version: 1,
        unlockedSkills: [],
        unlockedRelics: [],
        achievements: [],
        stats: {
          totalRuns: 5,
          victories: 2,
          highestScore: 10000,
          totalPlayTime: 0,
          totalKeystrokes: 0,
          totalWordsCompleted: 0,
          longestCombo: 0,
          perfectRunCount: 0,
        },
      })

      const meta2 = new MetaState()
      meta2.deserialize(oldJson)
      expect(meta2.getLeaderboard()).toHaveLength(0)
    })

    it('版本号升级到 3', () => {
      meta.addLeaderboardEntry(makeEntry())
      const json = meta.serialize()
      const parsed = JSON.parse(json)
      expect(parsed.version).toBe(3)
    })
  })

  // === 空排行榜和边界场景 ===

  describe('边界场景', () => {
    it('空排行榜 getLeaderboard 返回空数组', () => {
      expect(meta.getLeaderboard()).toEqual([])
    })

    it('单条记录正常工作', () => {
      meta.addLeaderboardEntry(makeEntry({ cycle: 1, score: 5000 }))
      const lb = meta.getLeaderboard()
      expect(lb).toHaveLength(1)
      expect(lb[0].cycle).toBe(1)
      expect(lb[0].score).toBe(5000)
    })

    it('恰好 20 条不截断', () => {
      for (let i = 0; i < 20; i++) {
        meta.addLeaderboardEntry(makeEntry({ score: (i + 1) * 1000 }))
      }
      expect(meta.getLeaderboard()).toHaveLength(20)
    })
  })

  // === AC4: checkUnlocks 自动记录 ===

  describe('checkUnlocks 自动记录排行榜', () => {
    it('checkUnlocks 调用后排行榜增加一条记录', () => {
      meta.checkUnlocks({
        runResult: 'victory',
        runStats: {
          totalScore: 50000,
          stagesCleared: 8,
          maxCombo: 42,
          skills: ['skill_a', 'skill_b'],
          relics: ['relic_a'],
        },
        cycle: 2,
        skillLevels: [{ id: 'skill_a', level: 2 }, { id: 'skill_b', level: 1 }],
        enchantments: [{ skillId: 'skill_a', enchantmentId: 'growth_adjacent' }],
        activeModifiers: ['boss_cap'],
      })

      const lb = meta.getLeaderboard()
      expect(lb).toHaveLength(1)
      expect(lb[0].cycle).toBe(2)
      expect(lb[0].score).toBe(50000)
      expect(lb[0].result).toBe('victory')
      expect(lb[0].buildSummary.skills).toHaveLength(2)
      expect(lb[0].buildSummary.skills[0].level).toBe(2)
      expect(lb[0].buildSummary.enchantments).toHaveLength(1)
      expect(lb[0].buildSummary.relics).toContain('relic_a')
      expect(lb[0].buildSummary.activeModifiers).toContain('boss_cap')
    })

    it('gameover 结果也记录', () => {
      meta.checkUnlocks({
        runResult: 'gameover',
        runStats: {
          totalScore: 3000,
          stagesCleared: 2,
          maxCombo: 5,
          skills: ['skill_a'],
          relics: [],
        },
        cycle: 1,
      })

      const lb = meta.getLeaderboard()
      expect(lb).toHaveLength(1)
      expect(lb[0].cycle).toBe(1)
      expect(lb[0].result).toBe('gameover')
    })

    it('无 cycle 字段时默认 cycle=1', () => {
      meta.checkUnlocks({
        runResult: 'gameover',
        runStats: {
          totalScore: 1000,
          stagesCleared: 1,
          maxCombo: 0,
          skills: [],
          relics: [],
        },
      })

      const lb = meta.getLeaderboard()
      expect(lb[0].cycle).toBe(1)
    })

    it('无 skillLevels 时 fallback 到 skills 列表（level=1）', () => {
      meta.checkUnlocks({
        runResult: 'gameover',
        runStats: {
          totalScore: 1000,
          stagesCleared: 1,
          maxCombo: 0,
          skills: ['skill_x', 'skill_y'],
          relics: [],
        },
      })

      const lb = meta.getLeaderboard()
      expect(lb[0].buildSummary.skills).toHaveLength(2)
      expect(lb[0].buildSummary.skills[0].id).toBe('skill_x')
      expect(lb[0].buildSummary.skills[0].level).toBe(1)
    })

    it('多次 checkUnlocks 累积排行榜记录', () => {
      for (let i = 0; i < 5; i++) {
        meta.checkUnlocks({
          runResult: 'gameover',
          runStats: {
            totalScore: i * 10000,
            stagesCleared: i + 1,
            maxCombo: 0,
            skills: [],
            relics: [],
          },
          cycle: i + 1,
        })
      }

      const lb = meta.getLeaderboard()
      expect(lb).toHaveLength(5)
      expect(lb[0].cycle).toBe(5) // highest cycle first
    })
  })
})
