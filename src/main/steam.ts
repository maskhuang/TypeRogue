// ============================================
// 打字肉鸽 - Steam API 服务
// ============================================
// Story 8.2: Steam 初始化
// Story 8.3: Steam 成就
// Story 8.4: Steam 云存档

// steamworks.js 类型定义
interface SteamLocalPlayer {
  getName(): string
  getSteamId(): { steamId64: bigint }
}

interface SteamAchievements {
  activate(name: string): boolean
  isActivated(name: string): boolean
  getAchievementAchievedPercent(name: string): number
  indicateAchievementProgress(name: string, curProgress: number, maxProgress: number): boolean
}

interface SteamCloud {
  isEnabledForApp(): boolean
  isEnabledForAccount(): boolean
  writeFile(fileName: string, data: Buffer): boolean
  readFile(fileName: string): Buffer | null
  deleteFile(fileName: string): boolean
  fileExists(fileName: string): boolean
  getFileTimestamp(fileName: string): number
}

interface SteamClient {
  localplayer: SteamLocalPlayer
  achievement: SteamAchievements
  cloud: SteamCloud
}

let steamClient: SteamClient | null = null
let steamAvailable = false

// 用于测试注入的初始化函数（仅在测试环境下使用）
let _testInitFn: (() => SteamClient) | null = null

/**
 * 注入测试用的初始化函数（仅用于测试）
 * @internal
 * @throws 在生产环境调用会抛出错误
 */
export function _setTestInitFn(fn: (() => SteamClient) | null): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('_setTestInitFn is only available in test environment')
  }
  _testInitFn = fn
}

/**
 * 初始化 Steam API
 * 必须在 app.whenReady() 之后调用
 *
 * @returns true 如果 Steam 初始化成功
 */
export function initSteam(): boolean {
  try {
    // 如果有测试注入的初始化函数，使用它
    if (_testInitFn) {
      steamClient = _testInitFn()
    } else {
      // 动态导入 steamworks.js 避免在测试环境下崩溃
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { init } = require('steamworks.js')
      // 尝试初始化 steamworks.js
      // 需要 Steam 客户端运行且 steam_appid.txt 存在
      steamClient = init()
    }
    steamAvailable = true
    console.log('Steam: Initialized successfully')
    return true
  } catch (error) {
    // Steam 不可用时降级处理
    console.warn('Steam: Not available, running in offline mode', error)
    steamAvailable = false
    steamClient = null
    return false
  }
}

/**
 * 检查 Steam 是否可用
 */
export function isSteamAvailable(): boolean {
  return steamAvailable
}

/**
 * 获取 Steam 用户名
 * @returns 用户名或 null（如果 Steam 不可用）
 */
export function getSteamUserName(): string | null {
  if (!steamAvailable || !steamClient) {
    return null
  }
  try {
    return steamClient.localplayer.getName()
  } catch (error) {
    console.error('Steam: Failed to get user name', error)
    return null
  }
}

/**
 * 获取 Steam 用户 ID
 * @returns SteamID 字符串或 null
 */
export function getSteamUserId(): string | null {
  if (!steamAvailable || !steamClient) {
    return null
  }
  try {
    return steamClient.localplayer.getSteamId().steamId64.toString()
  } catch (error) {
    console.error('Steam: Failed to get user ID', error)
    return null
  }
}

/**
 * 获取 Steam 客户端实例（供其他 Steam 功能使用）
 */
export function getSteamClient(): SteamClient | null {
  return steamClient
}

/**
 * 清理 Steam 资源（应用退出时调用）
 */
export function shutdownSteam(): void {
  // steamworks.js 会自动清理，但可以在这里添加额外清理逻辑
  steamClient = null
  steamAvailable = false
}

// ============================================
// Steam 成就 API (Story 8.3)
// ============================================

/**
 * 解锁 Steam 成就
 * @param steamName Steam API 成就名称
 * @returns true 如果成功解锁
 */
export function unlockAchievement(steamName: string): boolean {
  if (!steamAvailable || !steamClient) {
    return false
  }
  try {
    const result = steamClient.achievement.activate(steamName)
    if (result) {
      console.log('Steam: Achievement unlocked:', steamName)
    }
    return result
  } catch (error) {
    console.error('Steam: Failed to unlock achievement', steamName, error)
    return false
  }
}

/**
 * 检查成就是否已解锁
 * @param steamName Steam API 成就名称
 * @returns true 如果已解锁，false 如果未解锁或 Steam 不可用
 */
export function isAchievementUnlocked(steamName: string): boolean {
  if (!steamAvailable || !steamClient) {
    return false
  }
  try {
    return steamClient.achievement.isActivated(steamName)
  } catch (error) {
    console.error('Steam: Failed to check achievement status', steamName, error)
    return false
  }
}

/**
 * 更新进度成就的进度
 * @param steamName Steam API 成就名称
 * @param current 当前进度
 * @param max 目标进度
 * @returns true 如果成功更新
 */
export function setAchievementProgress(steamName: string, current: number, max: number): boolean {
  if (!steamAvailable || !steamClient) {
    return false
  }
  try {
    return steamClient.achievement.indicateAchievementProgress(steamName, current, max)
  } catch (error) {
    console.error('Steam: Failed to set achievement progress', steamName, error)
    return false
  }
}

/**
 * 获取成就的全球解锁百分比
 * @param steamName Steam API 成就名称
 * @returns 解锁百分比 (0-100)，失败返回 0
 */
export function getAchievementGlobalPercent(steamName: string): number {
  if (!steamAvailable || !steamClient) {
    return 0
  }
  try {
    return steamClient.achievement.getAchievementAchievedPercent(steamName)
  } catch (error) {
    console.error('Steam: Failed to get achievement percent', steamName, error)
    return 0
  }
}

// ============================================
// Steam Cloud API (Story 8.4)
// ============================================

/**
 * 检查 Steam Cloud 是否可用
 * 需要同时满足 App 级别和 Account 级别启用
 */
export function isCloudEnabled(): boolean {
  if (!steamAvailable || !steamClient) {
    return false
  }
  try {
    return steamClient.cloud.isEnabledForApp() &&
           steamClient.cloud.isEnabledForAccount()
  } catch (error) {
    console.error('Steam: Failed to check cloud status', error)
    return false
  }
}

/**
 * 写入文件到 Steam Cloud
 * @param fileName 文件名（相对于云存储根目录）
 * @param data 文件内容（UTF-8 字符串）
 * @returns true 如果写入成功
 */
export function writeCloudFile(fileName: string, data: string): boolean {
  if (!isCloudEnabled()) return false
  try {
    const buffer = Buffer.from(data, 'utf-8')
    return steamClient!.cloud.writeFile(fileName, buffer)
  } catch (error) {
    console.error('Steam: Failed to write cloud file', fileName, error)
    return false
  }
}

/**
 * 从 Steam Cloud 读取文件
 * @param fileName 文件名
 * @returns 文件内容或 null
 */
export function readCloudFile(fileName: string): string | null {
  if (!isCloudEnabled()) return null
  try {
    const buffer = steamClient!.cloud.readFile(fileName)
    return buffer ? buffer.toString('utf-8') : null
  } catch (error) {
    console.error('Steam: Failed to read cloud file', fileName, error)
    return null
  }
}

/**
 * 获取云端文件时间戳
 * @param fileName 文件名
 * @returns Unix 时间戳（秒），失败返回 0
 */
export function getCloudFileTimestamp(fileName: string): number {
  if (!isCloudEnabled()) return 0
  try {
    return steamClient!.cloud.getFileTimestamp(fileName)
  } catch (error) {
    console.error('Steam: Failed to get cloud timestamp', fileName, error)
    return 0
  }
}

/**
 * 检查云端文件是否存在
 * @param fileName 文件名
 * @returns true 如果文件存在
 */
export function cloudFileExists(fileName: string): boolean {
  if (!isCloudEnabled()) return false
  try {
    return steamClient!.cloud.fileExists(fileName)
  } catch (error) {
    console.error('Steam: Failed to check cloud file exists', fileName, error)
    return false
  }
}

/**
 * 删除云端文件
 * @param fileName 文件名
 * @returns true 如果删除成功
 */
export function deleteCloudFile(fileName: string): boolean {
  if (!isCloudEnabled()) return false
  try {
    return steamClient!.cloud.deleteFile(fileName)
  } catch (error) {
    console.error('Steam: Failed to delete cloud file', fileName, error)
    return false
  }
}

/**
 * 重置 Steam 状态（仅用于测试）
 * @internal
 * @throws 在生产环境调用会抛出错误
 */
export function _resetForTesting(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('_resetForTesting is only available in test environment')
  }
  steamClient = null
  steamAvailable = false
  _testInitFn = null
}

// 导出类型供其他模块使用
export type { SteamClient, SteamLocalPlayer, SteamAchievements, SteamCloud }
