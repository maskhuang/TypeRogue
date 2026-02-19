// ============================================
// 打字肉鸽 - Steam 成就离线缓存单元测试
// ============================================
// Story 8.3: Steam 成就 (AC: #4, #5, #7)

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock electron app module before imports
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/userData'),
  },
}))

// Mock the save module
vi.mock('../../../main/save', () => ({
  safeSave: vi.fn().mockResolvedValue(undefined),
  safeLoad: vi.fn().mockResolvedValue(null),
}))

// Mock the steam module
const mockIsSteamAvailable = vi.fn()
const mockUnlockAchievement = vi.fn()

vi.mock('../../../main/steam', () => ({
  isSteamAvailable: () => mockIsSteamAvailable(),
  unlockAchievement: (name: string) => mockUnlockAchievement(name),
}))

import {
  cachePendingAchievement,
  syncPendingAchievements,
  loadPendingAchievements,
  getPendingCount,
  isPendingAchievement,
  _resetForTesting,
  _getPendingList,
} from '../../../main/achievement-cache'
import { safeSave, safeLoad } from '../../../main/save'

describe('AchievementCache (Story 8.3 AC: #4, #5)', () => {
  beforeEach(() => {
    _resetForTesting()
    vi.clearAllMocks()
    mockIsSteamAvailable.mockReturnValue(false)
    mockUnlockAchievement.mockReturnValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('cachePendingAchievement (AC: #4)', () => {
    it('应该将成就添加到待同步队列', () => {
      cachePendingAchievement('ACH_FIRST_WIN')

      expect(getPendingCount()).toBe(1)
      expect(isPendingAchievement('ACH_FIRST_WIN')).toBe(true)
    })

    it('不应该重复添加相同的成就', () => {
      cachePendingAchievement('ACH_FIRST_WIN')
      cachePendingAchievement('ACH_FIRST_WIN')

      expect(getPendingCount()).toBe(1)
    })

    it('应该可以添加多个不同的成就', () => {
      cachePendingAchievement('ACH_FIRST_WIN')
      cachePendingAchievement('ACH_FIRST_SKILL')
      cachePendingAchievement('ACH_RUNS_10')

      expect(getPendingCount()).toBe(3)
      expect(isPendingAchievement('ACH_FIRST_WIN')).toBe(true)
      expect(isPendingAchievement('ACH_FIRST_SKILL')).toBe(true)
      expect(isPendingAchievement('ACH_RUNS_10')).toBe(true)
    })

    it('应该记录解锁时间戳', () => {
      const before = Date.now()
      cachePendingAchievement('ACH_FIRST_WIN')
      const after = Date.now()

      const pending = _getPendingList()
      expect(pending[0].unlockedAt).toBeGreaterThanOrEqual(before)
      expect(pending[0].unlockedAt).toBeLessThanOrEqual(after)
    })

    it('添加成就后应该触发持久化', async () => {
      cachePendingAchievement('ACH_FIRST_WIN')

      // 等待异步持久化完成
      await vi.waitFor(() => {
        expect(safeSave).toHaveBeenCalled()
      })
    })
  })

  describe('syncPendingAchievements (AC: #5)', () => {
    it('Steam 不可用时应该返回 0', () => {
      mockIsSteamAvailable.mockReturnValue(false)
      cachePendingAchievement('ACH_FIRST_WIN')

      const synced = syncPendingAchievements()

      expect(synced).toBe(0)
      expect(getPendingCount()).toBe(1) // 仍在队列中
    })

    it('Steam 可用时应该同步所有成就', () => {
      mockIsSteamAvailable.mockReturnValue(true)
      mockUnlockAchievement.mockReturnValue(true)

      cachePendingAchievement('ACH_FIRST_WIN')
      cachePendingAchievement('ACH_FIRST_SKILL')

      const synced = syncPendingAchievements()

      expect(synced).toBe(2)
      expect(getPendingCount()).toBe(0)
      expect(mockUnlockAchievement).toHaveBeenCalledWith('ACH_FIRST_WIN')
      expect(mockUnlockAchievement).toHaveBeenCalledWith('ACH_FIRST_SKILL')
    })

    it('同步失败的成就应该保留在队列中', () => {
      mockIsSteamAvailable.mockReturnValue(true)
      mockUnlockAchievement
        .mockReturnValueOnce(true) // 第一个成功
        .mockReturnValueOnce(false) // 第二个失败

      cachePendingAchievement('ACH_FIRST_WIN')
      cachePendingAchievement('ACH_FIRST_SKILL')

      const synced = syncPendingAchievements()

      expect(synced).toBe(1)
      expect(getPendingCount()).toBe(1)
      expect(isPendingAchievement('ACH_FIRST_SKILL')).toBe(true)
    })

    it('空队列应该返回 0', () => {
      mockIsSteamAvailable.mockReturnValue(true)

      const synced = syncPendingAchievements()

      expect(synced).toBe(0)
    })

    it('抛出异常的成就应该保留在队列中', () => {
      mockIsSteamAvailable.mockReturnValue(true)
      mockUnlockAchievement.mockImplementation(() => {
        throw new Error('Steam error')
      })

      cachePendingAchievement('ACH_FIRST_WIN')

      const synced = syncPendingAchievements()

      expect(synced).toBe(0)
      expect(getPendingCount()).toBe(1)
    })
  })

  describe('loadPendingAchievements (AC: #4)', () => {
    it('应该从存储加载缓存的成就', async () => {
      const mockData = JSON.stringify([
        { steamName: 'ACH_FIRST_WIN', unlockedAt: 1234567890 },
        { steamName: 'ACH_FIRST_SKILL', unlockedAt: 1234567891 },
      ])
      vi.mocked(safeLoad).mockResolvedValueOnce(mockData)

      await loadPendingAchievements()

      expect(getPendingCount()).toBe(2)
      expect(isPendingAchievement('ACH_FIRST_WIN')).toBe(true)
      expect(isPendingAchievement('ACH_FIRST_SKILL')).toBe(true)
    })

    it('存储为空时应该初始化空列表', async () => {
      vi.mocked(safeLoad).mockResolvedValueOnce(null)

      await loadPendingAchievements()

      expect(getPendingCount()).toBe(0)
    })

    it('JSON 解析失败时应该初始化空列表', async () => {
      vi.mocked(safeLoad).mockResolvedValueOnce('invalid json')

      await loadPendingAchievements()

      expect(getPendingCount()).toBe(0)
    })

    it('非数组数据时应该初始化空列表', async () => {
      vi.mocked(safeLoad).mockResolvedValueOnce(JSON.stringify({ notAnArray: true }))

      await loadPendingAchievements()

      expect(getPendingCount()).toBe(0)
    })
  })

  describe('getPendingCount', () => {
    it('初始状态应该返回 0', () => {
      expect(getPendingCount()).toBe(0)
    })

    it('添加成就后应该正确计数', () => {
      cachePendingAchievement('ACH_FIRST_WIN')
      expect(getPendingCount()).toBe(1)

      cachePendingAchievement('ACH_FIRST_SKILL')
      expect(getPendingCount()).toBe(2)
    })
  })

  describe('isPendingAchievement', () => {
    it('不存在的成就应该返回 false', () => {
      expect(isPendingAchievement('ACH_FIRST_WIN')).toBe(false)
    })

    it('已添加的成就应该返回 true', () => {
      cachePendingAchievement('ACH_FIRST_WIN')
      expect(isPendingAchievement('ACH_FIRST_WIN')).toBe(true)
    })

    it('同步后的成就应该返回 false', () => {
      mockIsSteamAvailable.mockReturnValue(true)
      mockUnlockAchievement.mockReturnValue(true)

      cachePendingAchievement('ACH_FIRST_WIN')
      syncPendingAchievements()

      expect(isPendingAchievement('ACH_FIRST_WIN')).toBe(false)
    })
  })

  describe('_resetForTesting', () => {
    it('应该清空待同步队列', () => {
      cachePendingAchievement('ACH_FIRST_WIN')
      cachePendingAchievement('ACH_FIRST_SKILL')
      expect(getPendingCount()).toBe(2)

      _resetForTesting()

      expect(getPendingCount()).toBe(0)
    })
  })
})
