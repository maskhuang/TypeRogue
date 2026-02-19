// ============================================
// 打字肉鸽 - Steam 服务单元测试
// ============================================
// Story 8.2: Steam 初始化 (AC: #7)
// Story 8.4: Steam 云存档

import { describe, it, expect, beforeEach } from 'vitest'
import {
  initSteam,
  isSteamAvailable,
  getSteamUserName,
  getSteamUserId,
  getSteamClient,
  shutdownSteam,
  _resetForTesting,
  _setTestInitFn,
  // Story 8.4: Cloud API
  isCloudEnabled,
  writeCloudFile,
  readCloudFile,
  getCloudFileTimestamp,
  cloudFileExists
} from '../../../main/steam'

describe('SteamService', () => {
  // Mock Steam Cloud 存储
  const mockCloudStorage: Map<string, { data: Buffer; timestamp: number }> = new Map()

  // Mock Steam client 工厂函数
  function createMockClient(options: {
    userName?: string
    steamId?: bigint
    throwOnGetName?: boolean
    throwOnGetId?: boolean
    cloudEnabled?: boolean
    cloudEnabledForAccount?: boolean
  } = {}) {
    return {
      localplayer: {
        getName: () => {
          if (options.throwOnGetName) throw new Error('Failed to get name')
          return options.userName ?? 'TestPlayer'
        },
        getSteamId: () => {
          if (options.throwOnGetId) throw new Error('Failed to get ID')
          return {
            steamId64: options.steamId ?? BigInt('76561198000000000')
          }
        }
      },
      achievement: {
        activate: () => true,
        isActivated: () => false,
        getAchievementAchievedPercent: () => 0,
        indicateAchievementProgress: () => true
      },
      cloud: {
        isEnabledForApp: () => options.cloudEnabled ?? true,
        isEnabledForAccount: () => options.cloudEnabledForAccount ?? true,
        writeFile: (fileName: string, data: Buffer): boolean => {
          mockCloudStorage.set(fileName, { data, timestamp: Date.now() })
          return true
        },
        readFile: (fileName: string): Buffer | null => {
          const file = mockCloudStorage.get(fileName)
          return file ? file.data : null
        },
        deleteFile: (fileName: string): boolean => {
          return mockCloudStorage.delete(fileName)
        },
        fileExists: (fileName: string): boolean => {
          return mockCloudStorage.has(fileName)
        },
        getFileTimestamp: (fileName: string): number => {
          const file = mockCloudStorage.get(fileName)
          return file ? Math.floor(file.timestamp / 1000) : 0
        }
      }
    }
  }

  beforeEach(() => {
    // 重置 Steam 状态（包括清除 _testInitFn）
    _resetForTesting()
    // 清理 mock 云存储
    mockCloudStorage.clear()
  })

  describe('initSteam (AC: #2)', () => {
    it('Steam 可用时应该返回 true', () => {
      _setTestInitFn(() => createMockClient())

      const result = initSteam()

      expect(result).toBe(true)
      expect(isSteamAvailable()).toBe(true)
    })

    it('Steam 不可用时应该返回 false 并降级 (AC: #4)', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })

      const result = initSteam()

      expect(result).toBe(false)
      expect(isSteamAvailable()).toBe(false)
    })
  })

  describe('getSteamUserName (AC: #5)', () => {
    it('Steam 可用时应该返回用户名', () => {
      _setTestInitFn(() => createMockClient({ userName: '打字高手' }))
      initSteam()

      const name = getSteamUserName()

      expect(name).toBe('打字高手')
    })

    it('Steam 不可用时应该返回 null', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })
      initSteam()

      const name = getSteamUserName()

      expect(name).toBeNull()
    })

    it('获取用户名失败时应该返回 null', () => {
      _setTestInitFn(() => createMockClient({ throwOnGetName: true }))
      initSteam()

      const name = getSteamUserName()

      expect(name).toBeNull()
    })
  })

  describe('getSteamUserId', () => {
    it('Steam 可用时应该返回 SteamID', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()

      const id = getSteamUserId()

      expect(id).toBe('76561198000000000')
    })

    it('Steam 不可用时应该返回 null', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })
      initSteam()

      const id = getSteamUserId()

      expect(id).toBeNull()
    })

    it('获取用户 ID 失败时应该返回 null', () => {
      _setTestInitFn(() => createMockClient({ throwOnGetId: true }))
      initSteam()

      const id = getSteamUserId()

      expect(id).toBeNull()
    })
  })

  describe('降级处理 (AC: #4)', () => {
    it('Steam 不可用时游戏应该仍可运行', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })

      // 初始化不应抛出异常
      expect(() => initSteam()).not.toThrow()

      // API 应该返回安全的默认值
      expect(isSteamAvailable()).toBe(false)
      expect(getSteamUserName()).toBeNull()
      expect(getSteamUserId()).toBeNull()
    })
  })

  describe('shutdownSteam', () => {
    it('应该清理 Steam 状态', () => {
      _setTestInitFn(() => createMockClient())

      initSteam()
      expect(isSteamAvailable()).toBe(true)

      shutdownSteam()
      expect(isSteamAvailable()).toBe(false)
    })

    it('未初始化时调用 shutdownSteam 不应抛出异常', () => {
      expect(() => shutdownSteam()).not.toThrow()
      expect(isSteamAvailable()).toBe(false)
    })
  })

  describe('getSteamClient', () => {
    it('Steam 可用时应该返回客户端实例', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()

      const client = getSteamClient()

      expect(client).not.toBeNull()
      expect(client?.localplayer.getName()).toBe('TestPlayer')
    })

    it('Steam 不可用时应该返回 null', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })
      initSteam()

      expect(getSteamClient()).toBeNull()
    })
  })

  describe('isSteamAvailable (AC: #2)', () => {
    it('初始化前应该返回 false', () => {
      expect(isSteamAvailable()).toBe(false)
    })

    it('初始化成功后应该返回 true', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()
      expect(isSteamAvailable()).toBe(true)
    })

    it('shutdown 后应该返回 false', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()
      shutdownSteam()
      expect(isSteamAvailable()).toBe(false)
    })
  })

  // ============================================
  // Story 8.4: Steam Cloud API Tests
  // ============================================

  describe('isCloudEnabled (Story 8.4)', () => {
    it('Steam 不可用时应该返回 false', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })
      initSteam()

      expect(isCloudEnabled()).toBe(false)
    })

    it('Cloud 启用时应该返回 true', () => {
      _setTestInitFn(() => createMockClient({ cloudEnabled: true, cloudEnabledForAccount: true }))
      initSteam()

      expect(isCloudEnabled()).toBe(true)
    })

    it('App 级别禁用时应该返回 false', () => {
      _setTestInitFn(() => createMockClient({ cloudEnabled: false, cloudEnabledForAccount: true }))
      initSteam()

      expect(isCloudEnabled()).toBe(false)
    })

    it('Account 级别禁用时应该返回 false', () => {
      _setTestInitFn(() => createMockClient({ cloudEnabled: true, cloudEnabledForAccount: false }))
      initSteam()

      expect(isCloudEnabled()).toBe(false)
    })
  })

  describe('writeCloudFile (Story 8.4)', () => {
    it('应该成功写入文件', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()

      const result = writeCloudFile('test.json', '{"data": "test"}')

      expect(result).toBe(true)
      expect(mockCloudStorage.has('test.json')).toBe(true)
    })

    it('Cloud 不可用时应该返回 false', () => {
      _setTestInitFn(() => createMockClient({ cloudEnabled: false }))
      initSteam()

      const result = writeCloudFile('test.json', '{"data": "test"}')

      expect(result).toBe(false)
    })

    it('Steam 不可用时应该返回 false', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })
      initSteam()

      const result = writeCloudFile('test.json', '{"data": "test"}')

      expect(result).toBe(false)
    })
  })

  describe('readCloudFile (Story 8.4)', () => {
    it('应该成功读取文件', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()

      // 先写入
      writeCloudFile('test.json', '{"data": "test"}')

      // 再读取
      const content = readCloudFile('test.json')

      expect(content).toBe('{"data": "test"}')
    })

    it('文件不存在时应该返回 null', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()

      const content = readCloudFile('nonexistent.json')

      expect(content).toBeNull()
    })

    it('Cloud 不可用时应该返回 null', () => {
      _setTestInitFn(() => createMockClient({ cloudEnabled: false }))
      initSteam()

      const content = readCloudFile('test.json')

      expect(content).toBeNull()
    })
  })

  describe('getCloudFileTimestamp (Story 8.4)', () => {
    it('应该返回文件时间戳', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()

      writeCloudFile('test.json', '{"data": "test"}')
      const timestamp = getCloudFileTimestamp('test.json')

      expect(timestamp).toBeGreaterThan(0)
    })

    it('文件不存在时应该返回 0', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()

      const timestamp = getCloudFileTimestamp('nonexistent.json')

      expect(timestamp).toBe(0)
    })

    it('Cloud 不可用时应该返回 0', () => {
      _setTestInitFn(() => createMockClient({ cloudEnabled: false }))
      initSteam()

      const timestamp = getCloudFileTimestamp('test.json')

      expect(timestamp).toBe(0)
    })
  })

  describe('cloudFileExists (Story 8.4)', () => {
    it('文件存在时应该返回 true', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()

      writeCloudFile('test.json', '{"data": "test"}')
      const exists = cloudFileExists('test.json')

      expect(exists).toBe(true)
    })

    it('文件不存在时应该返回 false', () => {
      _setTestInitFn(() => createMockClient())
      initSteam()

      const exists = cloudFileExists('nonexistent.json')

      expect(exists).toBe(false)
    })

    it('Cloud 不可用时应该返回 false', () => {
      _setTestInitFn(() => createMockClient({ cloudEnabled: false }))
      initSteam()

      const exists = cloudFileExists('test.json')

      expect(exists).toBe(false)
    })
  })
})
