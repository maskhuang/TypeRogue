// ============================================
// 打字肉鸽 - StageConfig 关卡配置类型
// ============================================
// Story 5.2 Task 1: 关卡配置类型定义

/**
 * 关卡修饰符类型
 */
export type StageModifier =
  | 'no_error'      // 不允许错误
  | 'time_pressure' // 时间压力（额外减时）
  | 'bonus_combo'   // 连击加成
  | 'boss'          // Boss 战特殊规则

/**
 * 单个关卡配置
 */
export interface StageConfig {
  /** 关卡编号 (1-8) */
  id: number

  /** 关卡名称 */
  name: string

  /** 所属幕数 (1-3) */
  act: number

  /** 是否为 Boss 关卡 */
  isBoss: boolean

  /** 时间限制（秒） */
  timeLimit: number

  /** 需要完成的词语数量 */
  wordCount: number

  /** 词语难度等级 (1-5) */
  wordDifficulty: number

  /** 基础金币奖励 */
  baseGoldReward: number

  /** 分数倍率修正 */
  scoreMultiplier: number

  /** 特殊修饰符（可选） */
  modifiers?: StageModifier[]
}

/**
 * 幕信息
 */
export interface ActInfo {
  /** 幕编号 (1-3) */
  id: number

  /** 幕名称 */
  name: string

  /** 包含的关卡编号范围 [start, end] */
  stages: [number, number]

  /** 幕主题描述 */
  description: string
}

/**
 * 全局难度设置
 */
export interface GlobalSettings {
  /** 基础时间（秒） */
  baseTime: number

  /** 每关递增时间（秒） */
  timeIncrement: number

  /** 词语难度递增率 */
  difficultyScaling: number
}

/**
 * 完整关卡配置数据
 */
export interface LevelsData {
  /** 所有关卡配置 */
  stages: StageConfig[]

  /** 幕信息 */
  acts: ActInfo[]

  /** 全局难度设置 */
  globalSettings: GlobalSettings
}

/**
 * 词语难度参数
 */
export interface WordDifficultyParams {
  /** 最小词语长度 */
  minLength: number

  /** 最大词语长度 */
  maxLength: number

  /** 复杂度系数 (0-1) */
  complexity: number
}
