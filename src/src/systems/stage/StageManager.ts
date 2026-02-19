// ============================================
// 打字肉鸽 - StageManager 关卡管理器
// ============================================
// Story 5.2 Task 3: 关卡管理器实现

import {
  StageConfig,
  ActInfo,
  LevelsData,
  GlobalSettings,
  WordDifficultyParams,
  StageModifier
} from './StageConfig'

/**
 * 词语难度参数映射表
 */
const DIFFICULTY_PARAMS: Record<number, WordDifficultyParams> = {
  1: { minLength: 3, maxLength: 5, complexity: 0.2 },
  2: { minLength: 4, maxLength: 6, complexity: 0.4 },
  3: { minLength: 5, maxLength: 7, complexity: 0.6 },
  4: { minLength: 5, maxLength: 8, complexity: 0.8 },
  5: { minLength: 6, maxLength: 10, complexity: 1.0 }
}

/**
 * 默认全局设置
 */
const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  baseTime: 60,
  timeIncrement: 5,
  difficultyScaling: 0.15
}

/**
 * 关卡管理器
 *
 * 职责:
 * - 加载和缓存关卡配置数据
 * - 提供关卡查询接口
 * - 计算难度参数
 */
export class StageManager {
  private data: LevelsData | null = null
  private stageMap: Map<number, StageConfig> = new Map()
  private actMap: Map<number, ActInfo> = new Map()

  /**
   * 加载关卡配置数据
   * @param levelsData 关卡配置 JSON 数据
   */
  load(levelsData: LevelsData): void {
    this.data = levelsData

    // 建立关卡索引
    this.stageMap.clear()
    for (const stage of levelsData.stages) {
      this.stageMap.set(stage.id, stage)
    }

    // 建立幕索引
    this.actMap.clear()
    for (const act of levelsData.acts) {
      this.actMap.set(act.id, act)
    }
  }

  /**
   * 检查是否已加载
   */
  isLoaded(): boolean {
    return this.data !== null
  }

  /**
   * 重置管理器（清除已加载数据）
   */
  reset(): void {
    this.data = null
    this.stageMap.clear()
    this.actMap.clear()
  }

  // ==================== 关卡查询 ====================

  /**
   * 获取关卡配置
   * @param stageId 关卡编号 (1-8)
   * @returns 关卡配置，不存在返回 undefined
   */
  getStage(stageId: number): StageConfig | undefined {
    return this.stageMap.get(stageId)
  }

  /**
   * 获取所有关卡配置
   */
  getAllStages(): readonly StageConfig[] {
    return this.data?.stages || []
  }

  /**
   * 获取总关卡数
   */
  getTotalStages(): number {
    return this.data?.stages.length || 0
  }

  // ==================== 幕查询 ====================

  /**
   * 获取幕信息
   * @param actId 幕编号 (1-3)
   */
  getAct(actId: number): ActInfo | undefined {
    return this.actMap.get(actId)
  }

  /**
   * 获取所有幕信息
   */
  getAllActs(): readonly ActInfo[] {
    return this.data?.acts || []
  }

  /**
   * 获取总幕数
   */
  getTotalActs(): number {
    return this.data?.acts.length || 0
  }

  /**
   * 获取指定幕的所有关卡（按 id 升序排列）
   * @param actId 幕编号 (1-3)
   */
  getStagesInAct(actId: number): StageConfig[] {
    const act = this.actMap.get(actId)
    if (!act) return []

    const [start, end] = act.stages
    const stages = this.data?.stages.filter(s => s.id >= start && s.id <= end) || []
    return stages.sort((a, b) => a.id - b.id)
  }

  /**
   * 获取关卡所属幕
   */
  getActForStage(stageId: number): number {
    return this.stageMap.get(stageId)?.act || 1
  }

  // ==================== Boss 和最终关卡 ====================

  /**
   * 检查是否为 Boss 关卡
   */
  isBossStage(stageId: number): boolean {
    return this.stageMap.get(stageId)?.isBoss || false
  }

  /**
   * 检查是否为最终关卡
   */
  isFinalStage(stageId: number): boolean {
    const totalStages = this.getTotalStages()
    return totalStages > 0 && stageId === totalStages
  }

  // ==================== 难度参数 ====================

  /**
   * 计算关卡实际时间限制
   * @param stageId 关卡编号
   * @returns 时间限制（秒）
   */
  getEffectiveTimeLimit(stageId: number): number {
    const stage = this.stageMap.get(stageId)
    if (!stage) return DEFAULT_GLOBAL_SETTINGS.baseTime

    // 如果关卡有自定义时间，使用自定义值
    if (stage.timeLimit > 0) {
      return stage.timeLimit
    }

    // 否则使用全局计算
    const settings = this.data?.globalSettings || DEFAULT_GLOBAL_SETTINGS
    return settings.baseTime + (stageId - 1) * settings.timeIncrement
  }

  /**
   * 获取关卡词语难度参数（1-5 映射到实际参数）
   * @param stageId 关卡编号
   */
  getWordDifficultyParams(stageId: number): WordDifficultyParams {
    const stage = this.stageMap.get(stageId)
    const difficulty = stage?.wordDifficulty || 1

    return DIFFICULTY_PARAMS[difficulty] || DIFFICULTY_PARAMS[1]
  }

  // ==================== 修饰符 ====================

  /**
   * 检查关卡是否有特定修饰符
   * @param stageId 关卡编号
   * @param modifier 修饰符名称
   */
  hasModifier(stageId: number, modifier: StageModifier): boolean {
    const stage = this.stageMap.get(stageId)
    return stage?.modifiers?.includes(modifier) || false
  }

  /**
   * 获取关卡所有修饰符
   * @param stageId 关卡编号
   */
  getModifiers(stageId: number): readonly StageModifier[] {
    return this.stageMap.get(stageId)?.modifiers || []
  }

  // ==================== 全局设置 ====================

  /**
   * 获取全局设置
   */
  getGlobalSettings(): GlobalSettings {
    return this.data?.globalSettings || DEFAULT_GLOBAL_SETTINGS
  }
}

// 单例导出
export const stageManager = new StageManager()
