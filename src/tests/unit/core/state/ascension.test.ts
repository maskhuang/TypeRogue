// ============================================
// Story 54.1: Ascension 状态持久化 — 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { MetaState, MAX_ASCENSION_LEVEL } from '../../../../src/core/state/MetaState'
import { RunState } from '../../../../src/core/state/RunState'
import { getAscensionLevel, state } from '../../../../src/core/state'

describe('Ascension State Persistence', () => {
  let meta: MetaState

  beforeEach(() => {
    meta = new MetaState()
  })

  // === MetaState ascension 字段 ===

  describe('MetaState ascension field', () => {
    it('defaults to 0 for all classes', () => {
      expect(meta.getAscension('none')).toBe(0)
      expect(meta.getAscension('wordsmith')).toBe(0)
      expect(meta.getAscension('metamorph')).toBe(0)
    })

    it('returns 0 for unknown class', () => {
      expect(meta.getAscension('unknown')).toBe(0)
    })
  })

  // === advanceAscension ===

  describe('advanceAscension', () => {
    it('advances ascension when level matches current max', () => {
      const result = meta.advanceAscension('none', 0)
      expect(result).toBe(true)
      expect(meta.getAscension('none')).toBe(1)
    })

    it('does not advance when level does not match current max', () => {
      // current is 0, trying to advance from level 1 — should fail
      const result = meta.advanceAscension('none', 1)
      expect(result).toBe(false)
      expect(meta.getAscension('none')).toBe(0)
    })

    it('advances sequentially through multiple levels', () => {
      for (let i = 0; i < 5; i++) {
        expect(meta.advanceAscension('wordsmith', i)).toBe(true)
      }
      expect(meta.getAscension('wordsmith')).toBe(5)
    })

    it('caps at MAX_ASCENSION_LEVEL', () => {
      // Advance to max
      for (let i = 0; i < MAX_ASCENSION_LEVEL; i++) {
        meta.advanceAscension('none', i)
      }
      expect(meta.getAscension('none')).toBe(MAX_ASCENSION_LEVEL)

      // Try to go beyond
      const result = meta.advanceAscension('none', MAX_ASCENSION_LEVEL)
      expect(result).toBe(false)
      expect(meta.getAscension('none')).toBe(MAX_ASCENSION_LEVEL)
    })

    it('tracks classes independently', () => {
      meta.advanceAscension('none', 0)
      meta.advanceAscension('none', 1)
      meta.advanceAscension('wordsmith', 0)

      expect(meta.getAscension('none')).toBe(2)
      expect(meta.getAscension('wordsmith')).toBe(1)
      expect(meta.getAscension('metamorph')).toBe(0)
    })
  })

  // === Serialization / Deserialization ===

  describe('serialization', () => {
    it('serializes ascension data', () => {
      meta.advanceAscension('none', 0)
      meta.advanceAscension('none', 1)
      meta.advanceAscension('wordsmith', 0)

      const json = meta.serialize()
      const data = JSON.parse(json)

      expect(data.version).toBe(7)
      expect(data.ascension).toEqual({ none: 2, wordsmith: 1, metamorph: 0 })
    })

    it('deserializes ascension data', () => {
      meta.advanceAscension('none', 0)
      meta.advanceAscension('none', 1)
      const json = meta.serialize()

      const meta2 = new MetaState()
      meta2.deserialize(json)

      expect(meta2.getAscension('none')).toBe(2)
      expect(meta2.getAscension('wordsmith')).toBe(0)
      expect(meta2.getAscension('metamorph')).toBe(0)
    })

    it('handles old save without ascension field (defaults to 0)', () => {
      // Simulate v6 save without ascension
      const oldSave = JSON.stringify({
        version: 6,
        unlockedSkills: [],
        unlockedRelics: [],
        unlockedClasses: ['none'],
        victoriedClasses: [],
        unlockedModes: [],
        achievements: [],
        stats: {},
        leaderboard: [],
        dailyLeaderboard: [],
        tutorialProgress: [],
        // no ascension field
      })

      meta.deserialize(oldSave)
      expect(meta.getAscension('none')).toBe(0)
      expect(meta.getAscension('wordsmith')).toBe(0)
      expect(meta.getAscension('metamorph')).toBe(0)
    })
  })

  // === checkUnlocks integration ===

  describe('checkUnlocks ascension advance', () => {
    it('advances ascension on victory at current max level', () => {
      meta.checkUnlocks({
        runResult: 'victory',
        runStats: { totalScore: 1000, stagesCleared: 12, maxCombo: 50, skills: [], relics: [] },
        classId: 'none',
        ascensionLevel: 0,
      })
      expect(meta.getAscension('none')).toBe(1)
    })

    it('does not advance on gameover', () => {
      meta.checkUnlocks({
        runResult: 'gameover',
        runStats: { totalScore: 100, stagesCleared: 3, maxCombo: 10, skills: [], relics: [] },
        classId: 'none',
        ascensionLevel: 0,
      })
      expect(meta.getAscension('none')).toBe(0)
    })

    it('does not advance when playing below max level', () => {
      // Advance to A1
      meta.advanceAscension('none', 0)
      expect(meta.getAscension('none')).toBe(1)

      // Victory at A0 (below max) — should not advance
      meta.checkUnlocks({
        runResult: 'victory',
        runStats: { totalScore: 1000, stagesCleared: 12, maxCombo: 50, skills: [], relics: [] },
        classId: 'none',
        ascensionLevel: 0,
      })
      expect(meta.getAscension('none')).toBe(1) // still 1, not 2
    })

    it('does not advance without ascensionLevel in data', () => {
      meta.checkUnlocks({
        runResult: 'victory',
        runStats: { totalScore: 1000, stagesCleared: 12, maxCombo: 50, skills: [], relics: [] },
        classId: 'none',
        // no ascensionLevel
      })
      expect(meta.getAscension('none')).toBe(0)
    })
  })

  // === MAX_ASCENSION_LEVEL constant ===

  describe('MAX_ASCENSION_LEVEL', () => {
    it('should be 10', () => {
      expect(MAX_ASCENSION_LEVEL).toBe(10)
    })
  })
})

// === RunState ascensionLevel serialization ===

describe('RunState ascensionLevel', () => {
  it('defaults to 0', () => {
    const rs = new RunState()
    const serialized = rs.serialize() as any
    expect(serialized.ascensionLevel).toBe(0)
  })

  it('serializes and deserializes ascensionLevel', () => {
    const rs = new RunState()
    ;(rs as any).data.ascensionLevel = 7
    const serialized = rs.serialize()

    const rs2 = RunState.deserialize(serialized)
    expect((rs2 as any).data.ascensionLevel).toBe(7)
  })

  it('deserializes old save without ascensionLevel (defaults to 0)', () => {
    const rs = new RunState()
    const serialized = rs.serialize() as any
    delete serialized.ascensionLevel

    const rs2 = RunState.deserialize(serialized)
    expect((rs2 as any).data.ascensionLevel).toBe(0)
  })
})

// === getAscensionLevel utility ===

describe('getAscensionLevel', () => {
  it('reads from state singleton', () => {
    state.ascensionLevel = 5
    expect(getAscensionLevel()).toBe(5)
    state.ascensionLevel = 0 // cleanup
  })

  it('defaults to 0', () => {
    state.ascensionLevel = 0
    expect(getAscensionLevel()).toBe(0)
  })
})
