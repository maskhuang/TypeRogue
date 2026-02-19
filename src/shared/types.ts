// ============================================
// 打字肉鸽 - 主进程/渲染进程共享类型定义
// ============================================
// Story 8.1: Electron 主进程 (AC: #4)

/**
 * 存档数据结构（与 Story 6.2 保持一致）
 */
export interface SaveData {
  meta: MetaSaveData
  run: RunSaveData | null
  timestamp: number
  version: string
}

export interface MetaSaveData {
  unlockedSkills: string[]
  unlockedRelics: string[]
  achievements: Record<string, boolean>
  statistics: GameStatistics
}

export interface RunSaveData {
  currentStage: number
  gold: number
  skillInventory: string[]
  bindings: Record<string, string>
  relics: string[]
}

export interface GameStatistics {
  totalRuns: number
  totalWins: number
  highScore: number
  totalWordsTyped: number
  totalPlayTime: number
}

/**
 * 应用配置
 */
export interface AppConfig {
  version: string
  isDevelopment: boolean
  platform: NodeJS.Platform
}

/**
 * IPC 响应通用结构
 */
export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
