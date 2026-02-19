// ============================================
// 打字肉鸽 - 云同步服务单元测试
// ============================================
// Story 8.4: Steam 云存档 (AC: #8)

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock steam module
vi.mock('../../../main/steam', () => ({
  isCloudEnabled: vi.fn(),
  readCloudFile: vi.fn(),
  writeCloudFile: vi.fn(),
  getCloudFileTimestamp: vi.fn(),
  cloudFileExists: vi.fn()
}))

// Mock save module
vi.mock('../../../main/save', () => ({
  safeLoad: vi.fn(),
  safeSave: vi.fn(),
  SAVE_PATHS: {
    META: '/mock/userData/meta.json',
    RUN: '/mock/userData/run.json'
  }
}))

// Mock fs for getLocalTimestamp
vi.mock('fs', () => ({
  statSync: vi.fn()
}))

import {
  syncFile,
  syncAllFiles,
  uploadToCloud,
  getSyncStatus,
  CLOUD_FILES,
  type SyncStatus
} from '../../../main/cloud-sync'
import * as steam from '../../../main/steam'
import * as save from '../../../main/save'
import * as fs from 'fs'

describe('CloudSyncService (Story 8.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('syncFile', () => {
    it('云端不可用时应该返回 offline 状态', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(false)

      const result = await syncFile('meta.json')

      expect(result.success).toBe(true)
      expect(result.status).toBe('offline')
    })

    it('两边都没有数据时应该返回 synced', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)
      vi.mocked(save.safeLoad).mockResolvedValue(null)
      vi.mocked(steam.readCloudFile).mockReturnValue(null)

      const result = await syncFile('meta.json')

      expect(result.success).toBe(true)
      expect(result.status).toBe('synced')
    })

    it('只有本地数据时应该上传到云端', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)
      vi.mocked(save.safeLoad).mockResolvedValue('{"data":"local"}')
      vi.mocked(steam.readCloudFile).mockReturnValue(null)
      vi.mocked(steam.writeCloudFile).mockReturnValue(true)

      const result = await syncFile('meta.json')

      expect(result.success).toBe(true)
      expect(result.status).toBe('synced')
      expect(result.resolvedWith).toBe('local')
      expect(steam.writeCloudFile).toHaveBeenCalledWith('meta.json', '{"data":"local"}')
    })

    it('只有云端数据时应该下载到本地', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)
      vi.mocked(save.safeLoad).mockResolvedValue(null)
      vi.mocked(steam.readCloudFile).mockReturnValue('{"data":"cloud"}')
      vi.mocked(save.safeSave).mockResolvedValue(undefined)

      const result = await syncFile('meta.json')

      expect(result.success).toBe(true)
      expect(result.status).toBe('synced')
      expect(result.resolvedWith).toBe('cloud')
      expect(save.safeSave).toHaveBeenCalled()
    })

    it('本地更新时应该上传覆盖云端', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)
      vi.mocked(save.safeLoad).mockResolvedValue('{"data":"local"}')
      vi.mocked(steam.readCloudFile).mockReturnValue('{"data":"cloud"}')
      vi.mocked(steam.getCloudFileTimestamp).mockReturnValue(1000)
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 2000000 } as any) // Local newer
      vi.mocked(steam.writeCloudFile).mockReturnValue(true)

      const result = await syncFile('meta.json')

      expect(result.success).toBe(true)
      expect(result.resolvedWith).toBe('local')
      expect(steam.writeCloudFile).toHaveBeenCalled()
    })

    it('云端更新时应该下载覆盖本地', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)
      vi.mocked(save.safeLoad).mockResolvedValue('{"data":"local"}')
      vi.mocked(steam.readCloudFile).mockReturnValue('{"data":"cloud"}')
      vi.mocked(steam.getCloudFileTimestamp).mockReturnValue(3000) // Cloud newer
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 1000000 } as any)
      vi.mocked(save.safeSave).mockResolvedValue(undefined)

      const result = await syncFile('meta.json')

      expect(result.success).toBe(true)
      expect(result.resolvedWith).toBe('cloud')
      expect(save.safeSave).toHaveBeenCalled()
    })

    it('时间戳相同时应该视为已同步', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)
      vi.mocked(save.safeLoad).mockResolvedValue('{"data":"same"}')
      vi.mocked(steam.readCloudFile).mockReturnValue('{"data":"same"}')
      vi.mocked(steam.getCloudFileTimestamp).mockReturnValue(1000)
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 1000000 } as any) // Same second

      const result = await syncFile('meta.json')

      expect(result.success).toBe(true)
      expect(result.status).toBe('synced')
    })

    it('上传失败时应该返回 conflict', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)
      vi.mocked(save.safeLoad).mockResolvedValue('{"data":"local"}')
      vi.mocked(steam.readCloudFile).mockReturnValue(null)
      vi.mocked(steam.writeCloudFile).mockReturnValue(false)

      const result = await syncFile('meta.json')

      expect(result.success).toBe(false)
      expect(result.status).toBe('conflict')
    })
  })

  describe('syncAllFiles', () => {
    it('应该同步所有配置的文件', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)
      vi.mocked(save.safeLoad).mockResolvedValue(null)
      vi.mocked(steam.readCloudFile).mockReturnValue(null)

      const result = await syncAllFiles()

      expect(result.success).toBe(true)
      expect(result.status).toBe('synced')
    })

    it('任一文件冲突时应该返回 conflict 状态', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)
      vi.mocked(save.safeLoad).mockResolvedValue('{"data":"local"}')
      vi.mocked(steam.readCloudFile).mockReturnValue(null)
      vi.mocked(steam.writeCloudFile).mockReturnValue(false) // Upload fails

      const result = await syncAllFiles()

      expect(result.success).toBe(false)
      expect(result.status).toBe('conflict')
    })

    it('Cloud 不可用时应该返回 offline', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(false)

      const result = await syncAllFiles()

      expect(result.success).toBe(true)
      expect(result.status).toBe('offline')
    })
  })

  describe('uploadToCloud', () => {
    it('应该成功上传文件', () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)
      vi.mocked(steam.writeCloudFile).mockReturnValue(true)

      const result = uploadToCloud('meta.json', '{"data":"test"}')

      expect(result).toBe(true)
      expect(steam.writeCloudFile).toHaveBeenCalledWith('meta.json', '{"data":"test"}')
    })

    it('Cloud 不可用时应该返回 true（离线模式不算失败）', () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(false)

      const result = uploadToCloud('meta.json', '{"data":"test"}')

      expect(result).toBe(true)
      expect(steam.writeCloudFile).not.toHaveBeenCalled()
    })
  })

  describe('getSyncStatus', () => {
    it('Cloud 不可用时应该返回 offline', () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(false)

      const status = getSyncStatus()

      expect(status).toBe('offline')
    })

    it('Cloud 可用且未同步时应该返回 idle', () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)

      const status = getSyncStatus()

      expect(status).toBe('idle')
    })

    it('同步过程中应该返回 syncing (Fix: Issue #5)', async () => {
      vi.mocked(steam.isCloudEnabled).mockReturnValue(true)
      vi.mocked(save.safeLoad).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(null), 50))
      )
      vi.mocked(steam.readCloudFile).mockReturnValue(null)

      // 启动同步但不等待完成
      const syncPromise = syncAllFiles()

      // 检查同步中状态
      // 注意：由于 JavaScript 的事件循环，需要让同步开始执行
      await new Promise(resolve => setTimeout(resolve, 10))
      const statusDuring = getSyncStatus()

      await syncPromise

      // 同步后应该回到 idle
      const statusAfter = getSyncStatus()

      expect(statusDuring).toBe('syncing')
      expect(statusAfter).toBe('idle')
    })
  })

  describe('CLOUD_FILES', () => {
    it('应该包含需要同步的文件', () => {
      expect(CLOUD_FILES).toContain('meta.json')
      expect(CLOUD_FILES).toContain('settings.json')
    })

    it('不应该包含 run.json', () => {
      expect(CLOUD_FILES).not.toContain('run.json')
    })
  })
})
