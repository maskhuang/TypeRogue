// ============================================
// 打字肉鸽 - 云同步服务
// ============================================
// Story 8.4: Steam 云存档 (AC: #2, #3, #4, #5)

import { safeLoad, safeSave, SAVE_PATHS } from './save'
import {
  isCloudEnabled,
  readCloudFile,
  writeCloudFile,
  getCloudFileTimestamp
} from './steam'
import * as fs from 'fs'
import * as path from 'path'

// 同步状态
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'conflict' | 'offline'

export interface SyncResult {
  success: boolean
  status: SyncStatus
  error?: string
  resolvedWith?: 'local' | 'cloud'
}

// 需要同步的文件列表
// 注意: run.json 不同步，因为断点存档应为本地独立
export const CLOUD_FILES = ['meta.json', 'settings.json'] as const

// 同步状态追踪（Fix: Issue #5）
let isSyncing = false

// 云文件名到本地路径的映射
function getLocalPath(cloudFileName: string): string {
  // 使用 path.dirname + path.join 确保路径安全（Fix: Issue #3）
  const saveDir = path.dirname(SAVE_PATHS.META)
  switch (cloudFileName) {
    case 'meta.json':
      return SAVE_PATHS.META
    case 'settings.json':
      return path.join(saveDir, 'settings.json')
    default:
      return path.join(saveDir, cloudFileName)
  }
}

/**
 * 获取本地文件修改时间戳（秒）
 *
 * Fix: Issue #6 - 时间戳单位说明
 * - 本地文件: fs.statSync 返回毫秒，转换为秒
 * - Steam Cloud: getFileTimestamp 返回 Unix 时间戳（秒）
 * - 两者单位一致，可直接比较
 */
function getLocalTimestamp(filePath: string): number {
  try {
    const stats = fs.statSync(filePath)
    return Math.floor(stats.mtimeMs / 1000)
  } catch {
    return 0
  }
}

/**
 * 同步单个文件到云端
 * 策略: 使用最新版本（基于时间戳）
 */
export async function syncFile(fileName: string): Promise<SyncResult> {
  if (!isCloudEnabled()) {
    return { success: true, status: 'offline' }
  }

  try {
    const localPath = getLocalPath(fileName)
    const localData = await safeLoad(localPath)
    const localTimestamp = localData ? getLocalTimestamp(localPath) : 0

    const cloudData = readCloudFile(fileName)
    const cloudTimestamp = getCloudFileTimestamp(fileName)

    // 情况 1: 两边都没有数据
    if (!localData && !cloudData) {
      return { success: true, status: 'synced' }
    }

    // 情况 2: 只有本地数据 → 上传
    if (localData && !cloudData) {
      const uploaded = writeCloudFile(fileName, localData)
      return {
        success: uploaded,
        status: uploaded ? 'synced' : 'conflict',
        resolvedWith: 'local'
      }
    }

    // 情况 3: 只有云端数据 → 下载
    if (!localData && cloudData) {
      await safeSave(localPath, cloudData)
      return { success: true, status: 'synced', resolvedWith: 'cloud' }
    }

    // 情况 4: 两边都有数据 → 比较时间戳
    if (localTimestamp > cloudTimestamp) {
      // 本地更新 → 上传
      const uploaded = writeCloudFile(fileName, localData!)
      return {
        success: uploaded,
        status: uploaded ? 'synced' : 'conflict',
        resolvedWith: 'local'
      }
    } else if (cloudTimestamp > localTimestamp) {
      // 云端更新 → 下载
      await safeSave(localPath, cloudData!)
      return { success: true, status: 'synced', resolvedWith: 'cloud' }
    } else {
      // 时间戳相同 → 已同步
      return { success: true, status: 'synced' }
    }
  } catch (error) {
    // Fix: Issue #7 - 更详细的错误处理
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorType = error instanceof Error ? error.name : 'UnknownError'
    console.error(`Steam: Sync failed for ${fileName} [${errorType}]`, error)
    return {
      success: false,
      status: 'conflict',
      error: `${errorType}: ${errorMessage}`
    }
  }
}

/**
 * 同步所有云存档文件
 */
export async function syncAllFiles(): Promise<SyncResult> {
  if (!isCloudEnabled()) {
    return { success: true, status: 'offline' }
  }

  // Fix: Issue #5 - 追踪同步状态
  isSyncing = true
  try {
    let hasConflict = false
    for (const fileName of CLOUD_FILES) {
      const result = await syncFile(fileName)
      if (!result.success || result.status === 'conflict') {
        hasConflict = true
      }
    }

    return {
      success: !hasConflict,
      status: hasConflict ? 'conflict' : 'synced'
    }
  } finally {
    isSyncing = false
  }
}

/**
 * 上传当前存档到云端
 * 在 safeSave 后调用
 */
export function uploadToCloud(fileName: string, data: string): boolean {
  if (!isCloudEnabled()) {
    return true // 离线模式不算失败
  }
  return writeCloudFile(fileName, data)
}

/**
 * 获取当前同步状态
 * Fix: Issue #5 - 返回实际的 syncing 状态
 */
export function getSyncStatus(): SyncStatus {
  if (!isCloudEnabled()) {
    return 'offline'
  }
  if (isSyncing) {
    return 'syncing'
  }
  return 'idle'
}
