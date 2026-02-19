// ============================================
// 打字肉鸽 - Electron Preload 脚本
// ============================================
// Story 6.2: 存档系统 - 暴露 IPC 到渲染进程
// Story 8.1: Electron 主进程 - 扩展 API

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'

// 白名单：所有有效 IPC 通道
const VALID_CHANNELS = [
  // Story 6.2 存档通道
  IPC_CHANNELS.SAVE_META,
  IPC_CHANNELS.LOAD_META,
  IPC_CHANNELS.SAVE_RUN,
  IPC_CHANNELS.LOAD_RUN,
  IPC_CHANNELS.DELETE_RUN,
  // Story 8.1 扩展通道
  IPC_CHANNELS.SAVE_WRITE,
  IPC_CHANNELS.SAVE_READ,
  IPC_CHANNELS.SAVE_EXISTS,
  IPC_CHANNELS.APP_GET_VERSION,
  IPC_CHANNELS.APP_QUIT,
  IPC_CHANNELS.STEAM_IS_AVAILABLE,
  IPC_CHANNELS.STEAM_GET_USER_NAME,
  IPC_CHANNELS.STEAM_UNLOCK_ACHIEVEMENT,
  IPC_CHANNELS.STEAM_SET_ACHIEVEMENT_PROGRESS,
  IPC_CHANNELS.STEAM_SYNC_CLOUD,
  IPC_CHANNELS.STEAM_CLOUD_STATUS,
] as const

/**
 * 暴露安全的 IPC 通信接口到渲染进程
 * 使用 contextBridge 确保安全的上下文隔离 (AC: #4)
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 通用 IPC 调用（向后兼容）
   */
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    if ((VALID_CHANNELS as readonly string[]).includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    return Promise.reject(new Error(`Invalid IPC channel: ${channel}`))
  },

  /**
   * 存档系统 API (Story 8.1 AC: #2)
   */
  save: {
    write: (data: string) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_WRITE, data),
    read: () => ipcRenderer.invoke(IPC_CHANNELS.SAVE_READ),
    exists: () => ipcRenderer.invoke(IPC_CHANNELS.SAVE_EXISTS),
    // Story 6.2 兼容
    saveMeta: (data: string) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_META, data),
    loadMeta: () => ipcRenderer.invoke(IPC_CHANNELS.LOAD_META),
    saveRun: (data: string) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_RUN, data),
    loadRun: () => ipcRenderer.invoke(IPC_CHANNELS.LOAD_RUN),
    deleteRun: () => ipcRenderer.invoke(IPC_CHANNELS.DELETE_RUN)
  },

  /**
   * Steam API (Story 8.1 预留, Story 8.2 初始化, Story 8.3 成就, Story 8.4 云存档)
   */
  steam: {
    isAvailable: () => ipcRenderer.invoke(IPC_CHANNELS.STEAM_IS_AVAILABLE),
    getUserName: () => ipcRenderer.invoke(IPC_CHANNELS.STEAM_GET_USER_NAME),
    unlockAchievement: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.STEAM_UNLOCK_ACHIEVEMENT, id),
    setAchievementProgress: (id: string, current: number, max: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.STEAM_SET_ACHIEVEMENT_PROGRESS, id, current, max),
    syncCloud: () => ipcRenderer.invoke(IPC_CHANNELS.STEAM_SYNC_CLOUD),
    getCloudStatus: () => ipcRenderer.invoke(IPC_CHANNELS.STEAM_CLOUD_STATUS)
  },

  /**
   * 应用信息 API (Story 8.1 AC: #2)
   * Issue #5 Fix: getPlatform 现在返回 Promise 以保持 API 一致性
   */
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    quit: () => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),
    getPlatform: () => Promise.resolve(process.platform)
  }
})

// TypeScript 类型声明
declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      save: {
        write: (data: string) => Promise<{ success: boolean; error?: string }>
        read: () => Promise<{ success: boolean; data: string | null }>
        exists: () => Promise<{ success: boolean; data: boolean }>
        saveMeta: (data: string) => Promise<{ success: boolean; error?: string }>
        loadMeta: () => Promise<{ success: boolean; data: string | null }>
        saveRun: (data: string) => Promise<{ success: boolean; error?: string }>
        loadRun: () => Promise<{ success: boolean; data: string | null }>
        deleteRun: () => Promise<{ success: boolean }>
      }
      steam: {
        isAvailable: () => Promise<{ success: boolean; data: boolean }>
        getUserName: () => Promise<{ success: boolean; data: string | null }>
        unlockAchievement: (id: string) => Promise<{
          success: boolean
          data?: { synced: boolean; cached?: boolean; alreadyUnlocked?: boolean }
          error?: string
        }>
        setAchievementProgress: (id: string, current: number, max: number) => Promise<{
          success: boolean
          data?: { current: number; max: number }
          error?: string
        }>
        syncCloud: () => Promise<{
          success: boolean
          data?: { status: 'idle' | 'syncing' | 'synced' | 'conflict' | 'offline' }
          error?: string
        }>
        getCloudStatus: () => Promise<{
          success: boolean
          data?: {
            enabled: boolean
            status: 'idle' | 'syncing' | 'synced' | 'conflict' | 'offline'
            files: string[]
          }
        }>
      }
      app: {
        getVersion: () => Promise<{ success: boolean; data: string }>
        quit: () => Promise<{ success: boolean }>
        getPlatform: () => Promise<NodeJS.Platform>  // Issue #5 Fix: 现在返回 Promise
      }
    }
  }
}
