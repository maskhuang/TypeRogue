// ============================================
// 打字肉鸽 - 渲染进程存档管理器
// ============================================
// Story 6.2: 存档系统 - 通过 IPC 与主进程通信

import { eventBus } from '../events/EventBus'
import { IPC_CHANNELS } from '../../../shared/ipc-channels'

// Electron IPC 接口（通过 preload 暴露）
declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  }
}

/**
 * IPC 调用结果
 */
interface SaveResult {
  success: boolean
  data?: string | null
  error?: string
}

/**
 * 渲染进程存档管理器 (AC: #7)
 * 通过 IPC 与主进程通信进行存档操作
 *
 * 职责:
 * - 提供 saveMeta/loadMeta 方法保存/加载 MetaState
 * - 提供 saveRun/loadRun/deleteRun 方法管理断点存档
 * - 在非 Electron 环境提供 localStorage 回退
 * - 存档完成后发送 save:complete 事件
 */
export class SaveManager {
  private static instance: SaveManager | null = null

  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager()
    }
    return SaveManager.instance
  }

  /**
   * 重置单例（用于测试）
   */
  static resetInstance(): void {
    SaveManager.instance = null
  }

  /**
   * 检查是否在 Electron 环境中
   */
  isElectron(): boolean {
    return typeof window !== 'undefined' && window.electronAPI !== undefined
  }

  /**
   * 调用 IPC
   */
  private async invoke(channel: string, ...args: unknown[]): Promise<SaveResult> {
    if (!this.isElectron()) {
      // 开发环境或浏览器环境，使用 localStorage 回退
      return this.localStorageFallback(channel, ...args)
    }
    return window.electronAPI!.invoke(channel, ...args) as Promise<SaveResult>
  }

  /**
   * localStorage 回退（开发环境）
   * 允许在非 Electron 环境（如浏览器开发）中使用存档功能
   *
   * Key 映射规则：
   * - save:meta / load:meta → typing_roguelike_meta
   * - save:run / load:run / delete:run → typing_roguelike_run
   */
  private localStorageFallback(channel: string, ...args: unknown[]): SaveResult {
    // 提取资源类型 (meta/run)，确保 save/load/delete 操作使用同一个 key
    const resourceType = channel.split(':')[1] // 'meta' or 'run'
    const key = `typing_roguelike_${resourceType}`

    try {
      if (channel.startsWith('save:')) {
        localStorage.setItem(key, args[0] as string)
        return { success: true }
      } else if (channel.startsWith('load:')) {
        const data = localStorage.getItem(key)
        return { success: data !== null, data }
      } else if (channel.startsWith('delete:')) {
        localStorage.removeItem(key)
        return { success: true }
      }
      return { success: false, error: 'Unknown channel' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  // ===========================================
  // MetaState 存档方法 (AC: #3)
  // ===========================================

  /**
   * 保存 MetaState (AC: #8, #9)
   * @param serializedData MetaState.serialize() 的输出
   * @returns true 如果保存成功
   */
  async saveMeta(serializedData: string): Promise<boolean> {
    const result = await this.invoke(IPC_CHANNELS.SAVE_META, serializedData)
    eventBus.emit('save:complete', { success: result.success })
    return result.success
  }

  /**
   * 加载 MetaState (AC: #5)
   * @returns 序列化的 MetaState 数据，或 null 如果不存在
   */
  async loadMeta(): Promise<string | null> {
    const result = await this.invoke(IPC_CHANNELS.LOAD_META)
    return result.success ? (result.data ?? null) : null
  }

  // ===========================================
  // RunState 存档方法 (AC: #4)
  // ===========================================

  /**
   * 保存 RunState（断点续玩）
   * @param serializedData RunState.serialize() 的输出
   * @returns true 如果保存成功
   */
  async saveRun(serializedData: string): Promise<boolean> {
    const result = await this.invoke(IPC_CHANNELS.SAVE_RUN, serializedData)
    eventBus.emit('save:complete', { success: result.success })
    return result.success
  }

  /**
   * 加载 RunState
   * @returns 序列化的 RunState 数据，或 null 如果不存在
   */
  async loadRun(): Promise<string | null> {
    const result = await this.invoke(IPC_CHANNELS.LOAD_RUN)
    return result.success ? (result.data ?? null) : null
  }

  /**
   * 删除 RunState（Run 结束时清除断点存档）
   * @returns true 如果删除成功
   */
  async deleteRun(): Promise<boolean> {
    const result = await this.invoke(IPC_CHANNELS.DELETE_RUN)
    return result.success
  }

  /**
   * 检查是否存在断点存档
   * @returns true 如果有未完成的 Run 存档
   */
  async hasRunSave(): Promise<boolean> {
    const data = await this.loadRun()
    return data !== null
  }
}

// 导出单例
export const saveManager = SaveManager.getInstance()
