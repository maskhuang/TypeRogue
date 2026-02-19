// ============================================
// 打字肉鸽 - Steam 成就离线缓存
// ============================================
// Story 8.3: Steam 成就 (AC: #4, #5)

import { app } from 'electron'
import * as path from 'path'
import { safeSave, safeLoad } from './save'
import { isSteamAvailable, unlockAchievement } from './steam'

/**
 * 待同步的成就数据结构
 */
interface PendingAchievement {
  steamName: string
  unlockedAt: number // timestamp
}

// 内存中的待同步成就列表
let pendingAchievements: PendingAchievement[] = []

// 缓存文件路径
const getCacheFile = (): string => path.join(app.getPath('userData'), 'pending-achievements.json')

/**
 * 添加待同步成就到缓存 (AC: #4)
 * 当 Steam 不可用时调用此函数缓存成就
 *
 * @param steamName Steam API 成就名称
 */
export function cachePendingAchievement(steamName: string): void {
  // 避免重复添加
  if (pendingAchievements.find((a) => a.steamName === steamName)) {
    return
  }

  pendingAchievements.push({
    steamName,
    unlockedAt: Date.now(),
  })

  // 异步持久化（不阻塞调用者）
  savePendingAchievements().catch((error) => {
    console.error('Steam: Failed to save pending achievements', error)
  })
}

/**
 * 同步所有待处理成就到 Steam (AC: #5)
 * 当 Steam 重新连接时调用此函数
 *
 * @returns 成功同步的成就数量
 */
export function syncPendingAchievements(): number {
  if (!isSteamAvailable()) {
    return 0
  }

  if (pendingAchievements.length === 0) {
    return 0
  }

  let synced = 0
  const remaining: PendingAchievement[] = []

  for (const pending of pendingAchievements) {
    try {
      const success = unlockAchievement(pending.steamName)
      if (success) {
        synced++
        console.log('Steam: Synced cached achievement:', pending.steamName)
      } else {
        // 保留失败的成就以便下次重试
        remaining.push(pending)
      }
    } catch (error) {
      console.error('Steam: Failed to sync achievement', pending.steamName, error)
      remaining.push(pending)
    }
  }

  pendingAchievements = remaining

  // 异步更新持久化
  savePendingAchievements().catch((error) => {
    console.error('Steam: Failed to save pending achievements after sync', error)
  })

  if (synced > 0) {
    console.log(`Steam: Synced ${synced} cached achievement(s)`)
  }

  return synced
}

/**
 * 从本地存储加载待同步成就 (AC: #4)
 * 应在应用启动时调用
 */
export async function loadPendingAchievements(): Promise<void> {
  try {
    const data = await safeLoad(getCacheFile())
    if (data) {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) {
        pendingAchievements = parsed
        console.log(`Steam: Loaded ${pendingAchievements.length} pending achievement(s)`)
      }
    }
  } catch (error) {
    console.error('Steam: Failed to load pending achievements', error)
    pendingAchievements = []
  }
}

/**
 * 保存待同步成就到本地存储
 * 使用原子写入确保数据完整性
 */
async function savePendingAchievements(): Promise<void> {
  const data = JSON.stringify(pendingAchievements, null, 2)
  await safeSave(getCacheFile(), data)
}

/**
 * 获取待同步成就数量
 */
export function getPendingCount(): number {
  return pendingAchievements.length
}

/**
 * 检查特定成就是否在待同步队列中
 */
export function isPendingAchievement(steamName: string): boolean {
  return pendingAchievements.some((a) => a.steamName === steamName)
}

/**
 * 重置缓存状态（仅用于测试）
 * @internal
 * @throws 在生产环境调用会抛出错误
 */
export function _resetForTesting(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('_resetForTesting is only available in test environment')
  }
  pendingAchievements = []
}

/**
 * 获取当前待同步列表（仅用于测试）
 * @internal
 * @throws 在生产环境调用会抛出错误
 */
export function _getPendingList(): PendingAchievement[] {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('_getPendingList is only available in test environment')
  }
  return [...pendingAchievements]
}
