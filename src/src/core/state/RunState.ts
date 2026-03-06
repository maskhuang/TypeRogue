// ============================================
// 打字肉鸽 - RunState 单局状态管理
// ============================================
// Story 5.1: Run 状态管理

import { BattleResult } from '../../scenes/battle/BattleFlowController'
import { drawBossModifiers } from '../../data/bossModifiers'
import { DELETED_SKILL_IDS, DELETED_EVOLUTION_IDS } from '../../data/skills'

/**
 * 技能实例（已获得的技能）
 */
export interface SkillInstance {
  id: string         // 技能ID
  level: number      // 当前等级 (1-3)
}

/**
 * Run 统计数据
 */
export interface RunStats {
  /** 总分数 */
  totalScore: number

  /** 最高连击 */
  maxCombo: number

  /** 完成词语数 */
  wordsCompleted: number

  /** 战斗胜利次数 */
  battlesWon: number

  /** Run 开始时间 (毫秒时间戳) */
  startTime: number
}

/**
 * Run 状态数据
 * 管理单局游戏的所有持久数据
 */
/**
 * Boss 修饰器分配记录
 */
export interface BossModifierAssignment {
  /** 关卡节点 ID */
  stageId: number
  /** 修饰器 ID */
  modifierId: string
}

export interface RunStateData {
  /** 已获得技能列表 */
  skills: SkillInstance[]

  /** 技能绑定 (键位 → 技能ID) */
  bindings: Map<string, string>

  /** 遗物列表 */
  relics: string[]

  /** 金币数量 */
  gold: number

  /** 当前关卡编号 (1-10, 含休息节点) */
  currentStage: number

  /** 当前幕数 (1-3) */
  currentAct: number

  /** Run 是否进行中 */
  isActive: boolean

  /** Run 统计 */
  stats: RunStats

  /** Boss 修饰器池（3个随机修饰器 ID） */
  bossModifierPool: string[]

  /** Boss 修饰器分配（Stage 3→A, Stage 6→B, Stage 9→C） */
  bossModifierAssignment: BossModifierAssignment[]

  /** 成长附魔累积值（skillId → 成长百分比），跨关保持，新 Run 重置 */
  growthValues: Map<string, number>

  /** 精通附魔触发计数（skillId → 累计触发次数），跨关保持，新 Run 重置 */
  masteryCounters: Map<string, number>

  /** 吞噬附魔获得的图标（skillId → 图标列表），跨关保持，新 Run 重置 */
  devourIcons: Map<string, string[]>
}

/**
 * 单局状态管理类
 *
 * 职责:
 * - 管理单局游戏的所有持久数据
 * - 提供技能绑定和查询方法
 * - 处理金币增减
 * - 跟踪关卡进度
 * - 应用战斗结果
 */
export class RunState {
  private data: RunStateData

  constructor() {
    this.data = this.createInitialState()
  }

  /**
   * 创建初始状态
   */
  private createInitialState(): RunStateData {
    return {
      skills: [],
      bindings: new Map(),
      relics: [],
      gold: 0,
      currentStage: 1,
      currentAct: 1,
      isActive: false,
      stats: {
        totalScore: 0,
        maxCombo: 0,
        wordsCompleted: 0,
        battlesWon: 0,
        startTime: 0
      },
      bossModifierPool: [],
      bossModifierAssignment: [],
      growthValues: new Map(),
      masteryCounters: new Map(),
      devourIcons: new Map(),
    }
  }

  // ==================== 技能管理 (AC1, AC5) ====================

  /**
   * 添加技能
   * 如果已拥有则升级（最高 3 级）
   * @param skillId 技能ID
   * @param level 初始等级（默认 1）
   */
  addSkill(skillId: string, level: number = 1): void {
    const existing = this.data.skills.find(s => s.id === skillId)
    if (existing) {
      // 已有技能则升级，最高 3 级
      existing.level = Math.min(3, existing.level + 1)
    } else {
      this.data.skills.push({ id: skillId, level: Math.min(3, Math.max(1, level)) })
    }
  }

  /**
   * 获取技能等级
   * @returns 技能等级，未拥有返回 0
   */
  getSkillLevel(skillId: string): number {
    const skill = this.data.skills.find(s => s.id === skillId)
    return skill?.level || 0
  }

  /**
   * 获取所有技能
   */
  getSkills(): readonly SkillInstance[] {
    return this.data.skills
  }

  /**
   * 移除技能
   * 同时解绑该技能的所有键位绑定
   * @returns 是否成功移除（技能不存在时返回 false）
   */
  removeSkill(skillId: string): boolean {
    const index = this.data.skills.findIndex(s => s.id === skillId)
    if (index === -1) return false

    // 移除技能
    this.data.skills.splice(index, 1)

    // 解绑该技能的所有键位
    for (const [key, boundSkillId] of this.data.bindings.entries()) {
      if (boundSkillId === skillId) {
        this.data.bindings.delete(key)
      }
    }

    return true
  }

  /**
   * 绑定技能到键位
   * @param key 键位 (A-Z)
   * @param skillId 技能ID
   * @throws 无效键位或未拥有技能时抛出错误
   */
  bindSkill(key: string, skillId: string): void {
    const upperKey = key.toUpperCase()
    // 验证键位有效性 (A-Z)
    if (!/^[A-Z]$/.test(upperKey)) {
      throw new Error(`Invalid key: ${key}`)
    }
    // 验证技能已拥有
    if (!this.data.skills.some(s => s.id === skillId)) {
      throw new Error(`Skill not owned: ${skillId}`)
    }
    this.data.bindings.set(upperKey, skillId)
  }

  /**
   * 解绑键位技能
   */
  unbindSkill(key: string): void {
    this.data.bindings.delete(key.toUpperCase())
  }

  /**
   * 获取键位绑定的技能
   * @returns 技能ID，未绑定返回 undefined
   */
  getSkillAtKey(key: string): string | undefined {
    return this.data.bindings.get(key.toUpperCase())
  }

  /**
   * 获取所有绑定
   */
  getBindings(): ReadonlyMap<string, string> {
    return this.data.bindings
  }

  /**
   * 检查技能是否已绑定到某个键位
   * @returns 绑定的键位，未绑定返回 undefined
   */
  getKeyForSkill(skillId: string): string | undefined {
    for (const [key, boundSkillId] of this.data.bindings.entries()) {
      if (boundSkillId === skillId) {
        return key
      }
    }
    return undefined
  }

  /**
   * 检查技能是否已绑定
   */
  isSkillBound(skillId: string): boolean {
    return this.getKeyForSkill(skillId) !== undefined
  }

  // ==================== 金币管理 (AC2) ====================

  /**
   * 获取当前金币
   */
  getGold(): number {
    return this.data.gold
  }

  /**
   * 添加金币
   * @param amount 添加数量（可为负数）
   */
  addGold(amount: number): void {
    this.data.gold = Math.max(0, this.data.gold + amount)
  }

  /**
   * 消费金币
   * @param amount 消费数量（必须为正数）
   * @returns 是否消费成功
   */
  spendGold(amount: number): boolean {
    if (amount < 0) return false
    if (this.data.gold >= amount) {
      this.data.gold -= amount
      return true
    }
    return false
  }

  // ==================== 遗物管理 (AC4) ====================

  /**
   * 添加遗物
   * 重复添加会被忽略
   */
  addRelic(relicId: string): void {
    if (!this.data.relics.includes(relicId)) {
      this.data.relics.push(relicId)
    }
  }

  /**
   * 检查是否拥有遗物
   */
  hasRelic(relicId: string): boolean {
    return this.data.relics.includes(relicId)
  }

  /**
   * 获取所有遗物
   */
  getRelics(): readonly string[] {
    return this.data.relics
  }

  // ==================== 关卡进度 (AC3) ====================

  /**
   * 获取当前关卡
   */
  getCurrentStage(): number {
    return this.data.currentStage
  }

  /**
   * 获取当前幕数
   */
  getCurrentAct(): number {
    return this.data.currentAct
  }

  /**
   * 推进到下一关
   * 同时更新幕数 (Act 1: 1-4, Act 2: 5-8, Act 3: 9-10)
   * 如果已在最终关卡（10），不再推进
   */
  advanceStage(): void {
    if (this.data.currentStage >= 10) return
    this.data.currentStage++
    // Act 边界映射（与 systems/stage/stageFlow.ts NODE_ACT 保持同步）
    if (this.data.currentStage <= 4) {
      this.data.currentAct = 1
    } else if (this.data.currentStage <= 8) {
      this.data.currentAct = 2
    } else {
      this.data.currentAct = 3
    }
  }

  /**
   * 检查是否为 Boss 关卡
   */
  isBossStage(): boolean {
    return this.data.currentStage === 10
  }

  // ==================== Run 生命周期 (AC6) ====================

  /**
   * 开始新 Run
   * 重置所有数据并标记为活跃
   * 抽取 3 个 Boss 修饰器分配到精英关
   */
  startRun(): void {
    this.reset()
    this.data.isActive = true
    this.data.stats.startTime = Date.now()

    // 抽取 3 个不重复的 Boss 修饰器
    const modifiers = drawBossModifiers(3)
    this.data.bossModifierPool = modifiers
    // 分配到精英关节点: Stage 3→A, Stage 6→B, Stage 9→C
    this.data.bossModifierAssignment = [
      { stageId: 3, modifierId: modifiers[0] || '' },
      { stageId: 6, modifierId: modifiers[1] || '' },
      { stageId: 9, modifierId: modifiers[2] || '' },
    ]
  }

  /**
   * 检查 Run 是否进行中
   */
  isActive(): boolean {
    return this.data.isActive
  }

  /**
   * 结束 Run
   */
  endRun(): void {
    this.data.isActive = false
  }

  /**
   * 重置为新 Run 初始状态 (AC6)
   */
  reset(): void {
    this.data = this.createInitialState()
  }

  /**
   * 获取只读状态
   */
  getState(): Readonly<RunStateData> {
    return this.data
  }

  // ==================== 战斗集成 (AC7) ====================

  /**
   * 应用战斗结果到 Run 状态
   * 在每场战斗结束后调用
   */
  applyBattleResult(result: BattleResult): void {
    // 更新统计
    this.data.stats.totalScore += result.score
    this.data.stats.maxCombo = Math.max(this.data.stats.maxCombo, result.maxCombo)
    this.data.stats.wordsCompleted += result.wordsCompleted

    if (result.result === 'win') {
      this.data.stats.battlesWon++
      // 战斗胜利奖励金币（基于分数，每 100 分 1 金币）
      const goldReward = Math.floor(result.score / 100)
      this.addGold(goldReward)
    }
  }

  /**
   * 获取 Run 统计
   */
  getStats(): Readonly<RunStats> {
    return this.data.stats
  }

  /**
   * 计算 Run 持续时间（毫秒）
   */
  getRunDuration(): number {
    if (!this.data.isActive || this.data.stats.startTime === 0) return 0
    return Date.now() - this.data.stats.startTime
  }

  // ==================== 序列化 (AC8 - 为存档系统准备) ====================

  /**
   * 序列化状态为可 JSON 存储的对象
   * 将 Map 转换为普通对象
   */
  serialize(): object {
    return {
      skills: [...this.data.skills],
      bindings: Object.fromEntries(this.data.bindings),
      relics: [...this.data.relics],
      gold: this.data.gold,
      currentStage: this.data.currentStage,
      currentAct: this.data.currentAct,
      isActive: this.data.isActive,
      stats: { ...this.data.stats },
      bossModifierPool: [...this.data.bossModifierPool],
      bossModifierAssignment: [...this.data.bossModifierAssignment],
      growthValues: Object.fromEntries(this.data.growthValues),
      masteryCounters: Object.fromEntries(this.data.masteryCounters),
      devourIcons: Object.fromEntries(this.data.devourIcons),
    }
  }

  /**
   * 从序列化数据恢复状态
   * @param data 序列化的状态数据
   */
  static deserialize(data: ReturnType<RunState['serialize']>): RunState {
    const runState = new RunState()
    const parsed = data as {
      skills: Array<{ id: string; level: number }>
      bindings: Record<string, string>
      relics: string[]
      gold: number
      currentStage: number
      currentAct: number
      isActive: boolean
      stats: {
        totalScore: number
        maxCombo: number
        wordsCompleted: number
        battlesWon: number
        startTime: number
      }
    }

    // 恢复技能（过滤已删除的旧技能）
    parsed.skills.forEach(skill => {
      if (DELETED_SKILL_IDS.includes(skill.id)) return
      if (DELETED_EVOLUTION_IDS.includes(skill.id)) return
      runState.data.skills.push({ id: skill.id, level: skill.level })
    })

    // 恢复绑定（过滤已删除的旧技能绑定）
    Object.entries(parsed.bindings).forEach(([key, skillId]) => {
      if (DELETED_SKILL_IDS.includes(skillId)) return
      if (DELETED_EVOLUTION_IDS.includes(skillId)) return
      runState.data.bindings.set(key, skillId)
    })

    // 恢复其他字段（过滤已删除遗物，兼容旧存档）
    const DELETED_RELICS = ['chain_amplifier', 'fortress', 'passive_mastery', 'gamblers_creed']
    runState.data.relics = parsed.relics.filter(id => !DELETED_RELICS.includes(id))
    runState.data.gold = parsed.gold
    runState.data.currentStage = parsed.currentStage
    runState.data.currentAct = parsed.currentAct
    runState.data.isActive = parsed.isActive
    runState.data.stats = { ...parsed.stats }
    runState.data.bossModifierPool = (parsed as any).bossModifierPool || []
    runState.data.bossModifierAssignment = (parsed as any).bossModifierAssignment || []

    // 恢复成长值（兼容旧存档）
    const growthEntries = (parsed as any).growthValues || {}
    Object.entries(growthEntries).forEach(([skillId, value]) => {
      runState.data.growthValues.set(skillId, value as number)
    })

    // 恢复精通计数（兼容旧存档）
    const masteryEntries = (parsed as any).masteryCounters || {}
    Object.entries(masteryEntries).forEach(([skillId, count]) => {
      runState.data.masteryCounters.set(skillId, count as number)
    })

    // 恢复吞噬图标（兼容旧存档）
    const devourEntries = (parsed as any).devourIcons || {}
    Object.entries(devourEntries).forEach(([skillId, icons]) => {
      runState.data.devourIcons.set(skillId, icons as string[])
    })

    return runState
  }
}
