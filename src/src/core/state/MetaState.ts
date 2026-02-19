// ============================================
// 打字肉鸽 - MetaState 管理跨 Run 的永久数据
// ============================================
// Story 6.1: Meta 状态管理
// Story 6.3: 解锁系统集成

import { eventBus } from '../events/EventBus'
import type { UnlockSystem } from '../unlock/UnlockSystem'

/**
 * Meta 统计数据 (AC: #4, #5)
 */
export interface MetaStats {
  totalRuns: number           // 总局数
  victories: number           // 胜利局数
  highestScore: number        // 最高分
  totalPlayTime: number       // 总游戏时间（毫秒）
  totalKeystrokes: number     // 总击键数
  totalWordsCompleted: number // 总完成词语数
  longestCombo: number        // 历史最高连击
  perfectRunCount: number     // 完美通关次数（无失败关卡）
}

/**
 * 成就进度 (AC: #3)
 */
export interface AchievementProgress {
  id: string
  name: string
  progress: number      // 当前进度值
  target: number        // 目标值
  unlocked: boolean     // 是否已解锁
  unlockedAt?: number   // 解锁时间戳
}

/**
 * Run 结果数据（来自 meta:check_unlocks 事件）
 */
export interface RunResultData {
  runResult: 'victory' | 'gameover'
  runStats: {
    totalScore: number
    totalTime?: number
    stagesCleared: number
    maxCombo: number
    perfectWords?: number
    keystrokes?: number
    wordsCompleted?: number
    skills: string[]
    relics: string[]
  }
}

/**
 * 默认解锁的技能（基础技能池）
 * 参考 gdd.md: 新手期解锁基础技能池
 */
const DEFAULT_UNLOCKED_SKILLS = [
  'score_boost',      // 分数加成
  'time_extend',      // 时间延长
  'combo_shield',     // 连击护盾
  'aura_basic',       // 基础光环
  'core_basic',       // 基础核心
]

/**
 * 默认解锁的遗物
 * 参考 gdd.md: 新手期解锁基础遗物
 */
const DEFAULT_UNLOCKED_RELICS = [
  'lucky_coin',       // 幸运硬币
  'speed_ring',       // 速度戒指
]

/**
 * MetaState - 管理跨 Run 的永久数据
 *
 * 职责:
 * - 管理解锁技能/遗物列表 (AC: #1, #2)
 * - 管理成就进度 (AC: #3)
 * - 管理全局统计数据 (AC: #4, #5)
 * - 支持序列化/反序列化（存档）(AC: #10)
 * - 响应 meta:check_unlocks 事件 (AC: #12)
 */
export class MetaState {
  private unlockedSkills: Set<string>
  private unlockedRelics: Set<string>
  private achievements: Map<string, AchievementProgress>
  private stats: MetaStats
  private eventUnsubscriber: (() => void) | null = null
  private unlockSystem: UnlockSystem | null = null  // Story 6.3: 解锁系统实例

  constructor() {
    // 初始化默认解锁 (AC: #11)
    this.unlockedSkills = new Set(DEFAULT_UNLOCKED_SKILLS)
    this.unlockedRelics = new Set(DEFAULT_UNLOCKED_RELICS)
    this.achievements = new Map()
    this.stats = this.createDefaultStats()

    // 监听 meta:check_unlocks 事件 (AC: #12)
    this.setupEventListeners()
  }

  private createDefaultStats(): MetaStats {
    return {
      totalRuns: 0,
      victories: 0,
      highestScore: 0,
      totalPlayTime: 0,
      totalKeystrokes: 0,
      totalWordsCompleted: 0,
      longestCombo: 0,
      perfectRunCount: 0,
    }
  }

  private setupEventListeners(): void {
    this.eventUnsubscriber = eventBus.on('meta:check_unlocks', (data) => {
      this.checkUnlocks(data)
    })
  }

  // ===========================================
  // 技能解锁方法 (AC: #6, #9)
  // ===========================================

  /**
   * 解锁技能 (AC: #6)
   * @returns true 如果是新解锁，false 如果已解锁或 ID 无效
   */
  unlockSkill(skillId: string): boolean {
    if (!skillId || typeof skillId !== 'string') {
      return false
    }
    if (this.unlockedSkills.has(skillId)) {
      return false
    }
    this.unlockedSkills.add(skillId)
    eventBus.emit('meta:skill_unlocked', { skillId })
    return true
  }

  /**
   * 检查技能是否已解锁 (AC: #9)
   */
  isSkillUnlocked(skillId: string): boolean {
    return this.unlockedSkills.has(skillId)
  }

  /**
   * 获取所有已解锁技能
   */
  getUnlockedSkills(): string[] {
    return Array.from(this.unlockedSkills)
  }

  // ===========================================
  // 遗物解锁方法 (AC: #7, #9)
  // ===========================================

  /**
   * 解锁遗物 (AC: #7)
   * @returns true 如果是新解锁，false 如果已解锁或 ID 无效
   */
  unlockRelic(relicId: string): boolean {
    if (!relicId || typeof relicId !== 'string') {
      return false
    }
    if (this.unlockedRelics.has(relicId)) {
      return false
    }
    this.unlockedRelics.add(relicId)
    eventBus.emit('meta:relic_unlocked', { relicId })
    return true
  }

  /**
   * 检查遗物是否已解锁 (AC: #9)
   */
  isRelicUnlocked(relicId: string): boolean {
    return this.unlockedRelics.has(relicId)
  }

  /**
   * 获取所有已解锁遗物
   */
  getUnlockedRelics(): string[] {
    return Array.from(this.unlockedRelics)
  }

  // ===========================================
  // 统计方法 (AC: #8, #5)
  // ===========================================

  /**
   * 更新统计数据 (AC: #8)
   */
  updateStats(data: RunResultData): void {
    const { runResult, runStats } = data

    // 更新 Run 计数
    this.stats.totalRuns++
    if (runResult === 'victory') {
      this.stats.victories++
      // 完美通关定义：胜利且通过全部 8 关
      // 注意：gameover 时即使 stagesCleared === 8 也不算完美通关
      // 因为完美通关要求最终胜利（达成目标分数）
      if (runStats.stagesCleared === 8) {
        this.stats.perfectRunCount++
      }
    }

    // 更新最高分
    if (runStats.totalScore > this.stats.highestScore) {
      this.stats.highestScore = runStats.totalScore
    }

    // 更新游戏时间
    if (runStats.totalTime) {
      this.stats.totalPlayTime += runStats.totalTime
    }

    // 更新击键数
    if (runStats.keystrokes) {
      this.stats.totalKeystrokes += runStats.keystrokes
    }

    // 更新词语数
    if (runStats.wordsCompleted) {
      this.stats.totalWordsCompleted += runStats.wordsCompleted
    }

    // 更新最高连击
    if (runStats.maxCombo > this.stats.longestCombo) {
      this.stats.longestCombo = runStats.maxCombo
    }
  }

  /**
   * 获取统计数据副本
   */
  getStats(): MetaStats {
    return { ...this.stats }
  }

  // ===========================================
  // 解锁检查方法 (AC: #12)
  // ===========================================

  /**
   * 设置 UnlockSystem 实例 (Story 6.3)
   * 在游戏初始化时调用
   */
  setUnlockSystem(system: UnlockSystem): void {
    this.unlockSystem = system
  }

  /**
   * 检查并触发解锁 (AC: #12, Story 6.3: AC #5, #10)
   * 此方法在 Run 结束时调用，检查是否满足解锁条件
   */
  checkUnlocks(data: RunResultData): void {
    // 1. 更新统计数据
    this.updateStats(data)

    // 2. 检查解锁条件 (Story 6.3)
    if (this.unlockSystem) {
      const newUnlocks = this.unlockSystem.checkUnlocks(data)
      if (newUnlocks.length > 0) {
        // 发送解锁汇总事件
        eventBus.emit('meta:unlocks_checked', {
          newUnlocks,
          totalNewUnlocks: newUnlocks.length
        })
      }
    }

    // 3. 发送统计更新事件
    eventBus.emit('meta:stats_updated', { stats: this.getStats() })

    // 4. 触发自动保存 (Story 6.3: AC #10)
    eventBus.emit('meta:request_save', {})
  }

  // ===========================================
  // 序列化方法 (AC: #10)
  // ===========================================

  /**
   * 序列化为可存储格式 (AC: #10)
   */
  serialize(): string {
    const data = {
      version: 1,  // 存档版本号，便于后续迁移
      unlockedSkills: Array.from(this.unlockedSkills),
      unlockedRelics: Array.from(this.unlockedRelics),
      achievements: Array.from(this.achievements.entries()),
      stats: this.stats,
    }
    return JSON.stringify(data)
  }

  /**
   * 从存档数据反序列化 (AC: #10)
   */
  deserialize(json: string): void {
    try {
      const data = JSON.parse(json)

      // 版本检查（预留迁移逻辑）
      if (data.version !== undefined && data.version !== 1) {
        console.warn(`MetaState: Unknown save version ${data.version}, attempting to load anyway`)
      }

      this.unlockedSkills = new Set(data.unlockedSkills || DEFAULT_UNLOCKED_SKILLS)
      this.unlockedRelics = new Set(data.unlockedRelics || DEFAULT_UNLOCKED_RELICS)
      this.achievements = new Map(data.achievements || [])
      this.stats = { ...this.createDefaultStats(), ...data.stats }
    } catch (error) {
      console.error('MetaState: Failed to deserialize save data', error)
      // 保持当前状态不变
    }
  }

  /**
   * 重置为默认状态（用于开发/测试）
   */
  reset(): void {
    this.unlockedSkills = new Set(DEFAULT_UNLOCKED_SKILLS)
    this.unlockedRelics = new Set(DEFAULT_UNLOCKED_RELICS)
    this.achievements = new Map()
    this.stats = this.createDefaultStats()
  }

  // ===========================================
  // 成就方法 (AC: #3)
  // ===========================================

  /**
   * 获取成就进度
   * @returns 成就的副本，防止外部修改
   */
  getAchievement(achievementId: string): AchievementProgress | undefined {
    const achievement = this.achievements.get(achievementId)
    return achievement ? { ...achievement } : undefined
  }

  /**
   * 获取所有成就
   * @returns 成就副本数组，防止外部修改
   */
  getAllAchievements(): AchievementProgress[] {
    return Array.from(this.achievements.values()).map(a => ({ ...a }))
  }

  /**
   * 更新成就进度
   * @returns true 如果成就刚刚解锁
   */
  updateAchievementProgress(achievementId: string, progress: number): boolean {
    const achievement = this.achievements.get(achievementId)
    if (!achievement) {
      return false
    }

    const wasUnlocked = achievement.unlocked
    achievement.progress = Math.min(progress, achievement.target)

    // 检查是否达成
    if (!wasUnlocked && achievement.progress >= achievement.target) {
      achievement.unlocked = true
      achievement.unlockedAt = Date.now()
      eventBus.emit('meta:achievement_unlocked', { achievement })
      return true
    }

    return false
  }

  /**
   * 注册成就（供外部模块调用）
   */
  registerAchievement(achievement: Omit<AchievementProgress, 'unlocked' | 'progress' | 'unlockedAt'>): void {
    if (!this.achievements.has(achievement.id)) {
      this.achievements.set(achievement.id, {
        ...achievement,
        progress: 0,
        unlocked: false,
      })
    }
  }

  /**
   * 清理资源（用于测试）
   */
  dispose(): void {
    if (this.eventUnsubscriber) {
      this.eventUnsubscriber()
      this.eventUnsubscriber = null
    }
  }
}
