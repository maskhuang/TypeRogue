// ============================================
// 打字肉鸽 - 共享类型单元测试
// ============================================
// Story 8.1: Electron 主进程 (AC: #6)

import { describe, it, expect } from 'vitest'
import type {
  SaveData,
  MetaSaveData,
  RunSaveData,
  GameStatistics,
  AppConfig,
  IpcResponse
} from '../../../shared/types'

describe('共享类型定义', () => {
  describe('SaveData', () => {
    it('应该正确定义存档数据结构', () => {
      const saveData: SaveData = {
        meta: {
          unlockedSkills: ['fire_blast'],
          unlockedRelics: ['lucky_coin'],
          achievements: { 'first_win': true },
          statistics: {
            totalRuns: 10,
            totalWins: 5,
            highScore: 10000,
            totalWordsTyped: 500,
            totalPlayTime: 3600000
          }
        },
        run: null,
        timestamp: Date.now(),
        version: '0.1.0'
      }

      expect(saveData.meta.unlockedSkills).toContain('fire_blast')
      expect(saveData.run).toBeNull()
      expect(typeof saveData.timestamp).toBe('number')
    })
  })

  describe('MetaSaveData', () => {
    it('应该包含所有永久进度字段', () => {
      const meta: MetaSaveData = {
        unlockedSkills: [],
        unlockedRelics: [],
        achievements: {},
        statistics: {
          totalRuns: 0,
          totalWins: 0,
          highScore: 0,
          totalWordsTyped: 0,
          totalPlayTime: 0
        }
      }

      expect(Array.isArray(meta.unlockedSkills)).toBe(true)
      expect(typeof meta.achievements).toBe('object')
    })
  })

  describe('RunSaveData', () => {
    it('应该包含单局游戏数据字段', () => {
      const run: RunSaveData = {
        currentStage: 3,
        gold: 150,
        skillInventory: ['fire_blast', 'ice_shield'],
        bindings: { 'Q': 'fire_blast' },
        relics: ['lucky_coin']
      }

      expect(run.currentStage).toBe(3)
      expect(run.gold).toBe(150)
      expect(run.bindings['Q']).toBe('fire_blast')
    })
  })

  describe('GameStatistics', () => {
    it('应该包含所有统计字段', () => {
      const stats: GameStatistics = {
        totalRuns: 100,
        totalWins: 25,
        highScore: 50000,
        totalWordsTyped: 10000,
        totalPlayTime: 36000000
      }

      expect(stats.totalRuns).toBe(100)
      expect(stats.totalWins).toBe(25)
    })
  })

  describe('AppConfig', () => {
    it('应该定义应用配置结构', () => {
      const config: AppConfig = {
        version: '0.1.0',
        isDevelopment: true,
        platform: 'darwin'
      }

      expect(config.version).toBe('0.1.0')
      expect(config.isDevelopment).toBe(true)
    })
  })

  describe('IpcResponse', () => {
    it('应该支持泛型数据响应', () => {
      const successResponse: IpcResponse<string> = {
        success: true,
        data: 'test data'
      }

      const errorResponse: IpcResponse = {
        success: false,
        error: 'Something went wrong'
      }

      expect(successResponse.success).toBe(true)
      expect(successResponse.data).toBe('test data')
      expect(errorResponse.error).toBe('Something went wrong')
    })

    // Issue #2 Fix: 验证 IpcResponse 一致性模式
    it('应该支持所有 IPC 返回类型场景', () => {
      // 存档操作响应
      const saveResponse: IpcResponse<void> = { success: true }
      expect(saveResponse.success).toBe(true)

      // 读取操作响应
      const loadResponse: IpcResponse<string | null> = {
        success: true,
        data: '{"test": "data"}'
      }
      expect(loadResponse.data).toBe('{"test": "data"}')

      // 存在性检查响应
      const existsResponse: IpcResponse<boolean> = {
        success: true,
        data: true
      }
      expect(existsResponse.data).toBe(true)

      // 版本信息响应
      const versionResponse: IpcResponse<string> = {
        success: true,
        data: '0.1.0'
      }
      expect(versionResponse.data).toBe('0.1.0')

      // Steam 错误响应
      const steamError: IpcResponse = {
        success: false,
        error: 'Steam not initialized'
      }
      expect(steamError.success).toBe(false)
      expect(steamError.error).toBe('Steam not initialized')
    })
  })
})
