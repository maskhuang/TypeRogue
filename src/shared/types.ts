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

// ============================================
// NarrativeArchive (PL-5 / §9.6)
// ============================================
// 反身闭合 cross-run 数据。仅本地存档（narrative.json），永不上云、永不跨玩家、永不在 UI 暴露。
// IPC 路径：SAVE_NARRATIVE / LOAD_NARRATIVE 走 safeSave（**不**经 safeSaveWithCloud）。

/** Endless 模式 boss 修饰器签名（DC6 boss tooltip 反身闭合 attribution） */
export interface EndlessModifierSignature {
  playerWorkerId: string
  modifier: string
  cycle: number
  timestamp: number
}

/**
 * Typing rhythm 击键节奏指纹（DC9 主菜单 ambient sound replay）
 *
 * 隐私不变量：rhythmVector 仅存按键之间的时间间隔（ms 数值数组），
 * **绝不**包含 typed content / 字符 / 词。类型层面就排除了泄漏。
 */
export interface TypingRhythmFingerprint {
  sessionId: string
  rhythmVector: number[]
  timestamp: number
}

/** Endless 自由打字便签（DC2 下周目其他职业 run 投递） */
export interface EndlessFreeTypeNote {
  playerWorkerId: string
  content: string
  cycle: number
}

/** 工号 + 章节通关历史（反身闭合 cross-ref 锚点） */
export interface WorkerIdHistoryEntry {
  workerId: string
  chapterCleared: number
  timestamp: number
}

export interface NarrativeArchive {
  endlessModifierSignatures: EndlessModifierSignature[]
  typingRhythmFingerprints: TypingRhythmFingerprint[]
  endlessFreeTypeNotes: EndlessFreeTypeNote[]
  playerWorkerIdHistory: WorkerIdHistoryEntry[]
  nimL4Unlocked: boolean
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
