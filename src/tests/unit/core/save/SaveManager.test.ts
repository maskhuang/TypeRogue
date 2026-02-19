// ============================================
// 打字肉鸽 - SaveManager 单元测试
// ============================================
// Story 6.2: 存档系统

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SaveManager } from '../../../../src/core/save/SaveManager'
import { eventBus } from '../../../../src/core/events/EventBus'

// 模拟 localStorage
const createMockLocalStorage = () => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
}

// 模拟 window 对象
const createMockWindow = (mockLocalStorage: ReturnType<typeof createMockLocalStorage>) => ({
  localStorage: mockLocalStorage,
  electronAPI: undefined as { invoke: ReturnType<typeof vi.fn> } | undefined,
})

describe('SaveManager', () => {
  let saveManager: SaveManager
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>
  let mockWindow: ReturnType<typeof createMockWindow>
  let originalWindow: typeof globalThis.window
  let originalLocalStorage: typeof globalThis.localStorage

  beforeEach(() => {
    // 保存原始全局对象
    originalWindow = globalThis.window
    originalLocalStorage = globalThis.localStorage

    // 创建 mock
    mockLocalStorage = createMockLocalStorage()
    mockWindow = createMockWindow(mockLocalStorage)

    // 设置全局对象
    ;(globalThis as unknown as { window: unknown }).window = mockWindow
    ;(globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage

    // 清理 eventBus
    eventBus.clear()

    // 重置单例以获得新实例
    SaveManager.resetInstance()
    saveManager = SaveManager.getInstance()
  })

  afterEach(() => {
    // 恢复原始全局对象
    ;(globalThis as unknown as { window: unknown }).window = originalWindow
    ;(globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage
    eventBus.clear()
  })

  // ===========================================
  // 单例模式测试
  // ===========================================

  describe('单例模式', () => {
    it('应返回同一实例', () => {
      const instance1 = SaveManager.getInstance()
      const instance2 = SaveManager.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('resetInstance 应创建新实例', () => {
      const instance1 = SaveManager.getInstance()
      SaveManager.resetInstance()
      const instance2 = SaveManager.getInstance()
      expect(instance1).not.toBe(instance2)
    })
  })

  // ===========================================
  // Electron 环境检测测试
  // ===========================================

  describe('Electron 环境检测', () => {
    it('无 electronAPI 时 isElectron 应返回 false', () => {
      mockWindow.electronAPI = undefined
      expect(saveManager.isElectron()).toBe(false)
    })

    it('有 electronAPI 时 isElectron 应返回 true', () => {
      mockWindow.electronAPI = { invoke: vi.fn() }
      expect(saveManager.isElectron()).toBe(true)
    })
  })

  // ===========================================
  // localStorage 回退测试（开发环境）
  // ===========================================

  describe('localStorage 回退 (开发环境)', () => {
    describe('MetaState 存档', () => {
      it('应能保存 Meta', async () => {
        const testData = '{"version":1,"test":"meta"}'
        const success = await saveManager.saveMeta(testData)
        expect(success).toBe(true)
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('typing_roguelike_meta', testData)
      })

      it('应能加载 Meta', async () => {
        const testData = '{"version":1,"test":"meta"}'
        mockLocalStorage.getItem.mockReturnValueOnce(testData)
        const loaded = await saveManager.loadMeta()
        expect(loaded).toBe(testData)
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('typing_roguelike_meta')
      })

      it('无存档时加载应返回 null', async () => {
        mockLocalStorage.getItem.mockReturnValueOnce(null)
        const loaded = await saveManager.loadMeta()
        expect(loaded).toBeNull()
      })
    })

    describe('RunState 存档', () => {
      it('应能保存 Run', async () => {
        const testData = '{"version":1,"stage":3}'
        const success = await saveManager.saveRun(testData)
        expect(success).toBe(true)
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('typing_roguelike_run', testData)
      })

      it('应能加载 Run', async () => {
        const testData = '{"version":1,"stage":3}'
        mockLocalStorage.getItem.mockReturnValueOnce(testData)
        const loaded = await saveManager.loadRun()
        expect(loaded).toBe(testData)
      })

      it('无存档时加载应返回 null', async () => {
        mockLocalStorage.getItem.mockReturnValueOnce(null)
        const loaded = await saveManager.loadRun()
        expect(loaded).toBeNull()
      })

      it('应能删除 Run', async () => {
        const success = await saveManager.deleteRun()
        expect(success).toBe(true)
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('typing_roguelike_run')
      })

      it('删除不存在的 Run 应返回 true', async () => {
        const success = await saveManager.deleteRun()
        expect(success).toBe(true)
      })
    })

    describe('hasRunSave 检测', () => {
      it('无存档时应返回 false', async () => {
        mockLocalStorage.getItem.mockReturnValueOnce(null)
        expect(await saveManager.hasRunSave()).toBe(false)
      })

      it('有存档时应返回 true', async () => {
        mockLocalStorage.getItem.mockReturnValueOnce('{"test":"data"}')
        expect(await saveManager.hasRunSave()).toBe(true)
      })
    })

    describe('Key 一致性验证 (H4 bug fix)', () => {
      it('save/load Meta 应使用相同的 key', async () => {
        const testData = '{"version":1,"data":"test"}'
        await saveManager.saveMeta(testData)

        // 获取保存时使用的 key
        const saveKey = mockLocalStorage.setItem.mock.calls[0][0]

        await saveManager.loadMeta()

        // 获取加载时使用的 key
        const loadKey = mockLocalStorage.getItem.mock.calls[0][0]

        expect(saveKey).toBe(loadKey)
        expect(saveKey).toBe('typing_roguelike_meta')
      })

      it('save/load/delete Run 应使用相同的 key', async () => {
        const testData = '{"version":1,"stage":1}'
        await saveManager.saveRun(testData)
        const saveKey = mockLocalStorage.setItem.mock.calls[0][0]

        await saveManager.loadRun()
        const loadKey = mockLocalStorage.getItem.mock.calls[0][0]

        await saveManager.deleteRun()
        const deleteKey = mockLocalStorage.removeItem.mock.calls[0][0]

        expect(saveKey).toBe(loadKey)
        expect(loadKey).toBe(deleteKey)
        expect(saveKey).toBe('typing_roguelike_run')
      })
    })
  })

  // ===========================================
  // 事件发送测试 (AC: #8, #9)
  // ===========================================

  describe('事件发送', () => {
    it('保存 Meta 成功时应发送 save:complete 事件 (success: true)', async () => {
      const handler = vi.fn()
      eventBus.on('save:complete', handler)

      await saveManager.saveMeta('{"test":"data"}')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ success: true })
    })

    it('保存 Run 成功时应发送 save:complete 事件 (success: true)', async () => {
      const handler = vi.fn()
      eventBus.on('save:complete', handler)

      await saveManager.saveRun('{"test":"data"}')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ success: true })
    })

    it('保存 Meta 失败时应发送 save:complete 事件 (success: false)', async () => {
      // 模拟 localStorage 错误
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full')
      })

      const handler = vi.fn()
      eventBus.on('save:complete', handler)

      const success = await saveManager.saveMeta('{"test":"data"}')

      expect(success).toBe(false)
      expect(handler).toHaveBeenCalledWith({ success: false })
    })

    it('保存 Run 失败时应发送 save:complete 事件 (success: false)', async () => {
      // 模拟 localStorage 错误
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full')
      })

      const handler = vi.fn()
      eventBus.on('save:complete', handler)

      const success = await saveManager.saveRun('{"test":"data"}')

      expect(success).toBe(false)
      expect(handler).toHaveBeenCalledWith({ success: false })
    })

    it('加载不发送 save:complete 事件', async () => {
      const handler = vi.fn()
      eventBus.on('save:complete', handler)

      await saveManager.loadMeta()
      await saveManager.loadRun()

      expect(handler).not.toHaveBeenCalled()
    })

    it('删除不发送 save:complete 事件', async () => {
      const handler = vi.fn()
      eventBus.on('save:complete', handler)

      await saveManager.deleteRun()

      expect(handler).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // 数据完整性测试
  // ===========================================

  describe('数据完整性', () => {
    it('应正确处理复杂 JSON 数据的保存', async () => {
      const complexData = JSON.stringify({
        version: 1,
        unlockedSkills: ['skill_1', 'skill_2', 'skill_3'],
        unlockedRelics: ['relic_1'],
        stats: {
          totalRuns: 10,
          victories: 3,
          highestScore: 50000,
          totalPlayTime: 3600000,
        },
      })

      await saveManager.saveMeta(complexData)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('typing_roguelike_meta', complexData)
    })

    it('应正确处理包含中文的数据', async () => {
      const chineseData = JSON.stringify({
        version: 1,
        playerName: '玩家',
        achievement: '首次胜利',
      })

      await saveManager.saveMeta(chineseData)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('typing_roguelike_meta', chineseData)
    })

    it('应正确处理包含特殊字符的数据', async () => {
      const specialData = JSON.stringify({
        version: 1,
        data: 'Test\n\t"quoted"',
      })

      await saveManager.saveMeta(specialData)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('typing_roguelike_meta', specialData)
    })
  })

  // ===========================================
  // Electron IPC 模拟测试
  // ===========================================

  describe('Electron IPC 调用', () => {
    let mockInvoke: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockInvoke = vi.fn()
      mockWindow.electronAPI = { invoke: mockInvoke }
    })

    it('saveMeta 应调用 IPC save:meta', async () => {
      mockInvoke.mockResolvedValue({ success: true })

      await saveManager.saveMeta('{"test":"data"}')

      expect(mockInvoke).toHaveBeenCalledWith('save:meta', '{"test":"data"}')
    })

    it('loadMeta 应调用 IPC load:meta', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: '{"test":"data"}' })

      const result = await saveManager.loadMeta()

      expect(mockInvoke).toHaveBeenCalledWith('load:meta')
      expect(result).toBe('{"test":"data"}')
    })

    it('saveRun 应调用 IPC save:run', async () => {
      mockInvoke.mockResolvedValue({ success: true })

      await saveManager.saveRun('{"stage":1}')

      expect(mockInvoke).toHaveBeenCalledWith('save:run', '{"stage":1}')
    })

    it('loadRun 应调用 IPC load:run', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: '{"stage":1}' })

      const result = await saveManager.loadRun()

      expect(mockInvoke).toHaveBeenCalledWith('load:run')
      expect(result).toBe('{"stage":1}')
    })

    it('deleteRun 应调用 IPC delete:run', async () => {
      mockInvoke.mockResolvedValue({ success: true })

      await saveManager.deleteRun()

      expect(mockInvoke).toHaveBeenCalledWith('delete:run')
    })

    it('IPC 失败时应发送 save:complete (success: false)', async () => {
      mockInvoke.mockResolvedValue({ success: false, error: 'Disk full' })

      const handler = vi.fn()
      eventBus.on('save:complete', handler)

      const success = await saveManager.saveMeta('{"test":"data"}')

      expect(success).toBe(false)
      expect(handler).toHaveBeenCalledWith({ success: false })
    })

    it('loadMeta 失败时应返回 null', async () => {
      mockInvoke.mockResolvedValue({ success: false })

      const result = await saveManager.loadMeta()

      expect(result).toBeNull()
    })

    it('loadRun 失败时应返回 null', async () => {
      mockInvoke.mockResolvedValue({ success: false })

      const result = await saveManager.loadRun()

      expect(result).toBeNull()
    })

    it('hasRunSave 应正确检测 (IPC 模式)', async () => {
      mockInvoke.mockResolvedValueOnce({ success: true, data: '{"stage":1}' })
      expect(await saveManager.hasRunSave()).toBe(true)

      mockInvoke.mockResolvedValueOnce({ success: false, data: null })
      expect(await saveManager.hasRunSave()).toBe(false)
    })
  })
})
