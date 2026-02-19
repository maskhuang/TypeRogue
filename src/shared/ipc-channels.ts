// ============================================
// 打字肉鸽 - IPC 通道常量
// ============================================
// Story 6.2: 存档系统 - IPC 通道定义
// Story 8.1: Electron 主进程 - 扩展通道定义

/**
 * IPC 通道常量
 * 用于主进程和渲染进程通信
 */
export const IPC_CHANNELS = {
  // 存档相关 (Story 6.2)
  SAVE_META: 'save:meta',
  LOAD_META: 'load:meta',
  SAVE_RUN: 'save:run',
  LOAD_RUN: 'load:run',
  DELETE_RUN: 'delete:run',
  // Issue #4 Fix: Removed orphaned SAVE_RESULT channel (had no handler)

  // 存档系统扩展 (Story 8.1)
  SAVE_WRITE: 'save:write',
  SAVE_READ: 'save:read',
  SAVE_EXISTS: 'save:exists',

  // Steam API (Story 8.1 预留, Story 8.2 初始化, Story 8.3 成就, Story 8.4 云存档)
  STEAM_IS_AVAILABLE: 'steam:is-available',
  STEAM_GET_USER_NAME: 'steam:get-user-name',
  STEAM_UNLOCK_ACHIEVEMENT: 'steam:unlock-achievement',
  STEAM_SET_ACHIEVEMENT_PROGRESS: 'steam:set-achievement-progress',
  STEAM_SYNC_CLOUD: 'steam:sync-cloud',
  STEAM_CLOUD_STATUS: 'steam:cloud-status',

  // 应用信息 (Story 8.1)
  APP_GET_VERSION: 'app:get-version',
  APP_QUIT: 'app:quit'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
