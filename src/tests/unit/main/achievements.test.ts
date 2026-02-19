// ============================================
// 打字肉鸽 - Steam 成就单元测试
// ============================================
// Story 8.3: Steam 成就 (AC: #7)

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  initSteam,
  isSteamAvailable,
  unlockAchievement,
  isAchievementUnlocked,
  setAchievementProgress,
  getAchievementGlobalPercent,
  _resetForTesting as _resetSteamForTesting,
  _setTestInitFn,
  SteamClient,
} from '../../../main/steam'
import {
  ACHIEVEMENT_MAP,
  AchievementId,
  getSteamAchievementName,
  isProgressAchievement,
  getProgressTarget,
  ALL_ACHIEVEMENT_IDS,
  ACHIEVEMENT_COUNT,
} from '../../../shared/achievements'

describe('AchievementService (Story 8.3)', () => {
  // Mock Steam client with achievements support
  function createMockClient(options: {
    userName?: string
    unlockedAchievements?: Set<string>
    throwOnActivate?: boolean
    throwOnIsActivated?: boolean
    achievementPercents?: Record<string, number>
  } = {}): SteamClient {
    const unlocked = options.unlockedAchievements ?? new Set<string>()

    return {
      localplayer: {
        getName: () => options.userName ?? 'TestPlayer',
        getSteamId: () => ({
          steamId64: BigInt('76561198000000000'),
        }),
      },
      achievement: {
        activate: (name: string) => {
          if (options.throwOnActivate) throw new Error('Failed to activate')
          if (unlocked.has(name)) return false // Already unlocked
          unlocked.add(name)
          return true
        },
        isActivated: (name: string) => {
          if (options.throwOnIsActivated) throw new Error('Failed to check')
          return unlocked.has(name)
        },
        getAchievementAchievedPercent: (name: string) => {
          return options.achievementPercents?.[name] ?? 0
        },
        indicateAchievementProgress: (_name: string, _current: number, _max: number) => {
          return true
        },
      },
    }
  }

  beforeEach(() => {
    _resetSteamForTesting()
  })

  describe('Achievement Mapping (AC: #1)', () => {
    it('应该至少定义 12 个成就', () => {
      expect(ACHIEVEMENT_COUNT).toBeGreaterThanOrEqual(12)
    })

    it('所有成就 ID 应该有对应的 Steam 名称', () => {
      for (const id of ALL_ACHIEVEMENT_IDS) {
        const steamName = getSteamAchievementName(id)
        expect(steamName).toBeDefined()
        expect(steamName.startsWith('ACH_')).toBe(true)
      }
    })

    it('应该正确识别进度成就', () => {
      expect(isProgressAchievement('runs_10')).toBe(true)
      expect(isProgressAchievement('runs_50')).toBe(true)
      expect(isProgressAchievement('runs_100')).toBe(true)
      expect(isProgressAchievement('first_win')).toBe(false)
    })

    it('应该正确获取进度成就目标值', () => {
      expect(getProgressTarget('runs_10')).toBe(10)
      expect(getProgressTarget('runs_50')).toBe(50)
      expect(getProgressTarget('runs_100')).toBe(100)
      expect(getProgressTarget('first_win')).toBeNull()
    })
  })

  describe('unlockAchievement (AC: #2)', () => {
    it('Steam 可用时应该直接解锁成就', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()

      const result = unlockAchievement('ACH_FIRST_WIN')

      expect(result).toBe(true)
    })

    it('重复解锁应该返回 false', () => {
      const unlocked = new Set<string>()
      _setTestInitFn(() => createMockClient({ unlockedAchievements: unlocked }))
      initSteam()

      expect(unlockAchievement('ACH_FIRST_WIN')).toBe(true)
      expect(unlockAchievement('ACH_FIRST_WIN')).toBe(false) // Already unlocked
    })

    it('Steam 不可用时应该返回 false', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })
      initSteam()

      const result = unlockAchievement('ACH_FIRST_WIN')

      expect(result).toBe(false)
    })

    it('解锁失败时应该返回 false 并处理异常', () => {
      _setTestInitFn(() => createMockClient({ throwOnActivate: true }))
      initSteam()

      const result = unlockAchievement('ACH_FIRST_WIN')

      expect(result).toBe(false)
    })
  })

  describe('isAchievementUnlocked (AC: #2)', () => {
    it('应该正确检测已解锁的成就', () => {
      const unlocked = new Set(['ACH_FIRST_WIN'])
      _setTestInitFn(() => createMockClient({ unlockedAchievements: unlocked }))
      initSteam()

      expect(isAchievementUnlocked('ACH_FIRST_WIN')).toBe(true)
      expect(isAchievementUnlocked('ACH_FIRST_SKILL')).toBe(false)
    })

    it('Steam 不可用时应该返回 false', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })
      initSteam()

      expect(isAchievementUnlocked('ACH_FIRST_WIN')).toBe(false)
    })

    it('检查失败时应该返回 false', () => {
      _setTestInitFn(() => createMockClient({ throwOnIsActivated: true }))
      initSteam()

      expect(isAchievementUnlocked('ACH_FIRST_WIN')).toBe(false)
    })
  })

  describe('setAchievementProgress (AC: #3)', () => {
    it('应该正确更新进度成就', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()

      const result = setAchievementProgress('ACH_RUNS_10', 5, 10)

      expect(result).toBe(true)
    })

    it('Steam 不可用时应该返回 false', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })
      initSteam()

      const result = setAchievementProgress('ACH_RUNS_10', 5, 10)

      expect(result).toBe(false)
    })
  })

  describe('getAchievementGlobalPercent', () => {
    it('应该返回成就全球解锁百分比', () => {
      _setTestInitFn(() =>
        createMockClient({
          achievementPercents: {
            'ACH_FIRST_WIN': 45.5,
            'ACH_RUNS_100': 5.2,
          },
        })
      )
      initSteam()

      expect(getAchievementGlobalPercent('ACH_FIRST_WIN')).toBe(45.5)
      expect(getAchievementGlobalPercent('ACH_RUNS_100')).toBe(5.2)
      expect(getAchievementGlobalPercent('ACH_UNKNOWN')).toBe(0)
    })

    it('Steam 不可用时应该返回 0', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })
      initSteam()

      expect(getAchievementGlobalPercent('ACH_FIRST_WIN')).toBe(0)
    })
  })
})
