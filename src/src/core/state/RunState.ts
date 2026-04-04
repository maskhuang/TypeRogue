// ============================================
// 打字肉鸽 - RunState 单局状态管理
// ============================================
// Story 5.1: Run 状态管理

import { BattleResult } from '../../scenes/battle/BattleFlowController'
// Story 42.6: drawBossModifiers no longer used — pool starts empty
import { DELETED_SKILL_IDS, DELETED_EVOLUTION_IDS } from '../../data/skills'
import { DELETED_RELIC_IDS, MAX_RELIC_SLOTS } from '../../data/relics'
import type { ClassId, WordEffect } from '../types'
import { BALANCE } from '../constants'
import type { AffixSkillInstance, SkillRuntimeState } from '../../data/affixes'
import { createSkillRuntimeState } from '../../data/affixes'
import { serializeSkill, deserializeSkill, migrateLoadedSkills } from '../../data/affixTrigger'
import { generateName } from '../../data/skillGeneration'
import { RESOURCE_ICONS, PUNCTUATION_KEYS } from '../constants'
import { unbindSkill as bmUnbindSkill, bindShapeToKeys, getSkillAnchorKey, getRunStateBindingState } from '../../systems/bindingManager'

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

  /** 当前关卡编号（Cycle 内，1-CYCLE_LENGTH） */
  currentStage: number

  /** Run 是否进行中 */
  isActive: boolean

  /** Run 统计 */
  stats: RunStats

  /** Boss 战前选择的临时修饰器（0-3 个） */
  bossModifierPool: string[]

  /** 本 Run 已用修饰器列表（不重复抽取用） */
  usedBossModifiers: string[]

  /** Boss 修饰器分配（Stage 3→A, Stage 6→B, Stage 9→C） */
  bossModifierAssignment: BossModifierAssignment[]

  /** 当前周目数（默认 1，通关 Boss 后 +1） */
  cycle: number

  /** 跨周目累积的 Boss 修饰器列表 */
  activeModifiers: string[]

  /** 遗物可变状态（relicId → 数值），用于 entropy/schrodinger_dice 等有动态值的遗物 */
  relicStates: Record<string, number>

  // === 职业系统字段（Story 32.11） ===

  /** 当前职业 ID */
  classId: ClassId

  /** 造词师：26 字母碎片库存 */
  fragmentInventory: Record<string, number>

  /** 造词师：采集队列字母序列 */
  fragmentQueue: string[]

  /** 造词师：采集队列当前位置 */
  fragmentQueuePosition: number

  /** 造词师：本 Run 已造词列表 */
  craftedWords: string[]

  /** 造词师：组装队列（跨关保持） */
  assemblyQueue: import('../../core/types').AssemblyPipeline[]

  /** 蜕变师：变异素库存 */
  mutagenInventory: number

  /** 技能进化映射（原ID → 进化ID）— legacy */
  evolvedSkills: Map<string, string>

  /** 已见技能类型（用于商店多样性） */
  seenSkillTypes: Set<string>

  /** 词库（含造词师造出的词） */
  wordDeck: string[]

  /** 词条制技能定义（35.9） */
  affixSkills: Map<string, AffixSkillInstance>

  /** 词条制技能运行时状态（35.9） */
  affixSkillStates: Map<string, SkillRuntimeState>

  /** 蜕变A累计次数（35.10） */
  mutationACounts: Map<string, number>

  /** 词汇收藏：本 Run 已完成单词集合（36.7） */
  collectedWords: Set<string>

  /** 词语效果 Map<word, WordEffect>（效果词击键加成） */
  wordEffects: Map<string, WordEffect>

  /** Story 42.3: 跨关累积溢出分 */
  overflowScore: number

  /** 第一关校准基数（第一关得分，替代 TARGET_BASE） */
  calibratedTargetBase: number

  /** 精英战选中的修饰器（保证出现在 Boss 选取中） */
  eliteModifier: string | null

  /** Story 54.1: 本局选择的 Ascension 级别（0-10） */
  ascensionLevel: number

  /** Story 54.6: A6 初始弱化 modifier ID */
  ascensionInitialModifier: string | null
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
      isActive: false,
      stats: {
        totalScore: 0,
        maxCombo: 0,
        wordsCompleted: 0,
        battlesWon: 0,
        startTime: 0
      },
      bossModifierPool: [],
      usedBossModifiers: [],  // Story 42.6
      bossModifierAssignment: [],
      cycle: 1,
      activeModifiers: [],
      relicStates: {},
      classId: 'none',
      fragmentInventory: {},
      fragmentQueue: ['_', '_', '_', '_', '_', '_'],
      fragmentQueuePosition: 0,
      craftedWords: [],
      assemblyQueue: [],
      mutagenInventory: 0,
      evolvedSkills: new Map(),
      seenSkillTypes: new Set(),
      wordDeck: [],
      affixSkills: new Map(),
      affixSkillStates: new Map(),
      mutationACounts: new Map(),
      collectedWords: new Set(),
      wordEffects: new Map(),
      overflowScore: 0,
      calibratedTargetBase: 0,
      eliteModifier: null,
      ascensionLevel: 0,
      ascensionInitialModifier: null,
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

    // 解绑该技能的所有键位（多格形状全解）
    bmUnbindSkill(getRunStateBindingState(this.data), skillId)

    // 清理词条制技能数据（35.9 review fix）
    this.data.affixSkills.delete(skillId)
    this.data.affixSkillStates.delete(skillId)

    return true
  }

  /**
   * 绑定技能到键位（多格形状：通过 BindingManager 处理）
   * @param key 锚点键位
   * @param skillId 技能ID
   * @throws 无效键位或未拥有技能时抛出错误
   */
  bindSkill(key: string, skillId: string): void {
    // 标点键用原始字符存储
    const isPunctuation = PUNCTUATION_KEYS.includes(key)
    const normalizedKey = isPunctuation ? key : key.toLowerCase()
    // 验证键位有效性 (a-z 或标点键)
    if (!/^[a-z]$/.test(normalizedKey) && !isPunctuation) {
      throw new Error(`Invalid key: ${key}`)
    }
    // 验证技能已拥有
    if (!this.data.skills.some(s => s.id === skillId)) {
      throw new Error(`Skill not owned: ${skillId}`)
    }
    bindShapeToKeys(getRunStateBindingState(this.data), skillId, normalizedKey)
  }

  /**
   * 解绑键位技能（多格技能：解绑该技能的所有键位）
   */
  unbindSkill(key: string): void {
    const normalizedKey = PUNCTUATION_KEYS.includes(key) ? key : key.toLowerCase()
    const skillId = this.data.bindings.get(normalizedKey)
    if (skillId) {
      bmUnbindSkill(getRunStateBindingState(this.data), skillId)
    }
  }

  /**
   * 获取键位绑定的技能
   * @returns 技能ID，未绑定返回 undefined
   */
  getSkillAtKey(key: string): string | undefined {
    return this.data.bindings.get(key.toLowerCase())
  }

  /**
   * 获取所有绑定
   */
  getBindings(): ReadonlyMap<string, string> {
    return this.data.bindings
  }

  /**
   * 检查技能是否已绑定到某个键位
   * @returns 锚点键位，未绑定返回 undefined
   */
  getKeyForSkill(skillId: string): string | undefined {
    return getSkillAnchorKey(getRunStateBindingState(this.data), skillId)
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
  addRelic(relicId: string): boolean {
    if (this.data.relics.includes(relicId)) return false
    if (this.data.relics.length >= MAX_RELIC_SLOTS) return false
    this.data.relics.push(relicId)
    return true
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
   * 获取当前 Cycle
   */
  getCurrentCycle(): number {
    return this.data.cycle
  }

  /**
   * 推进到下一关（Cycle 内递增，无上限）
   */
  advanceStage(): void {
    this.data.currentStage++
  }

  /**
   * 检查当前是否为 Boss 关卡（每 CYCLE_LENGTH 关）
   */
  isBossStage(): boolean {
    return this.data.currentStage > 0 && this.data.currentStage % BALANCE.CYCLE_LENGTH === 0
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

    // Story 42.6: Boss 修饰器池初始为空，等 advanceCycle 时再抽
    this.data.bossModifierPool = []
    this.data.usedBossModifiers = []
    this.data.bossModifierAssignment = []
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
      // Story 42.3: overflowScore 由 battle.ts endLevel() 更新 state.overflowScore（运行时 source of truth）
      // 此处不累积，避免与 endLevel() 双倍计数
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
      isActive: this.data.isActive,
      stats: { ...this.data.stats },
      bossModifierPool: [...this.data.bossModifierPool],
      usedBossModifiers: [...this.data.usedBossModifiers],  // Story 42.6
      bossModifierAssignment: [...this.data.bossModifierAssignment],
      cycle: this.data.cycle,
      activeModifiers: [...this.data.activeModifiers],
      relicStates: { ...this.data.relicStates },
      classId: this.data.classId,
      fragmentInventory: { ...this.data.fragmentInventory },
      fragmentQueue: [...this.data.fragmentQueue],
      fragmentQueuePosition: this.data.fragmentQueuePosition,
      craftedWords: [...this.data.craftedWords],
      assemblyQueue: this.data.assemblyQueue ? JSON.parse(JSON.stringify(this.data.assemblyQueue)) : [],
      mutagenInventory: this.data.mutagenInventory,
      evolvedSkills: Object.fromEntries(this.data.evolvedSkills),
      seenSkillTypes: Array.from(this.data.seenSkillTypes),
      wordDeck: [...this.data.wordDeck],
      affixSkillData: [...this.data.affixSkills.entries()].map(([id, skill]) => {
        const rt = this.data.affixSkillStates.get(id) || createSkillRuntimeState(id)
        return serializeSkill(skill, rt)
      }),
      mutationACounts: Object.fromEntries(this.data.mutationACounts),
      collectedWords: Array.from(this.data.collectedWords),
      wordEffects: Object.fromEntries(this.data.wordEffects),
      overflowScore: this.data.overflowScore,
      calibratedTargetBase: this.data.calibratedTargetBase,
      eliteModifier: this.data.eliteModifier,
      ascensionLevel: this.data.ascensionLevel,
      ascensionInitialModifier: this.data.ascensionInitialModifier,
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
    runState.data.relics = parsed.relics
      .filter(id => !DELETED_RELIC_IDS.includes(id))
      .slice(0, MAX_RELIC_SLOTS)
    runState.data.gold = parsed.gold
    runState.data.currentStage = parsed.currentStage
    runState.data.isActive = parsed.isActive
    runState.data.stats = { ...parsed.stats }
    // bossModifierPool: Boss 战前选择的临时修饰器（0-3 个），直接还原
    runState.data.bossModifierPool = (parsed as any).bossModifierPool || []
    runState.data.usedBossModifiers = (parsed as any).usedBossModifiers || []
    runState.data.bossModifierAssignment = (parsed as any).bossModifierAssignment || []

    // 恢复周目数和活跃修饰器（兼容旧存档）
    runState.data.cycle = (parsed as any).cycle || 1
    runState.data.activeModifiers = (parsed as any).activeModifiers || []
    runState.data.relicStates = (parsed as any).relicStates || {}

    // 恢复职业系统字段（兼容旧存档）
    runState.data.classId = ((parsed as any).classId || 'none') as ClassId
    runState.data.fragmentInventory = (parsed as any).fragmentInventory || {}
    runState.data.fragmentQueue = (parsed as any).fragmentQueue || ['_', '_', '_', '_', '_', '_']
    runState.data.fragmentQueuePosition = (parsed as any).fragmentQueuePosition || 0
    runState.data.craftedWords = (parsed as any).craftedWords || []
    // 存档迁移：旧版 assemblyPipeline → assemblyQueue[0]
    const oldPipeline = (parsed as any).assemblyPipeline
    runState.data.assemblyQueue = (parsed as any).assemblyQueue || (oldPipeline ? [oldPipeline] : [])
    runState.data.mutagenInventory = (parsed as any).mutagenInventory || 0
    runState.data.wordDeck = (parsed as any).wordDeck || []

    const evolvedEntries = (parsed as any).evolvedSkills || {}
    Object.entries(evolvedEntries).forEach(([skillId, evolvedId]) => {
      runState.data.evolvedSkills.set(skillId, evolvedId as string)
    })

    const seenTypes: string[] = (parsed as any).seenSkillTypes || []
    seenTypes.forEach(t => runState.data.seenSkillTypes.add(t))

    // 恢复词条制技能（35.9）
    const rawAffixSkills: any[] = (parsed as any).affixSkillData || []
    const migratedSkills = migrateLoadedSkills(rawAffixSkills)
    for (const saveData of migratedSkills) {
      const { skill, runtimeState } = deserializeSkill(saveData)
      // TODO(35-9): 恢复显示名和图标
      skill.name = generateName(skill.resource, skill.affixes)
      skill.icon = RESOURCE_ICONS[skill.resource] || '?'
      runState.data.affixSkills.set(skill.id, skill)
      runState.data.affixSkillStates.set(skill.id, runtimeState)
    }

    // 恢复蜕变A计数（35.10）
    const mutationAEntries = (parsed as any).mutationACounts || {}
    Object.entries(mutationAEntries).forEach(([skillId, count]) => {
      runState.data.mutationACounts.set(skillId, count as number)
    })

    // 恢复词汇收藏（36.7）
    const savedWords: string[] = (parsed as any).collectedWords || []
    savedWords.forEach(w => runState.data.collectedWords.add(w))

    // 恢复词语效果（兼容旧存档）
    const wordEffectsRaw = (parsed as any).wordEffects || {}
    Object.entries(wordEffectsRaw).forEach(([word, effect]) => {
      runState.data.wordEffects.set(word, effect as WordEffect)
    })

    // Story 42.3: 恢复溢出分
    runState.data.overflowScore = (parsed as any).overflowScore || 0
    runState.data.calibratedTargetBase = (parsed as any).calibratedTargetBase || 0
    runState.data.eliteModifier = (parsed as any).eliteModifier || null
    runState.data.ascensionLevel = (parsed as any).ascensionLevel || 0
    runState.data.ascensionInitialModifier = (parsed as any).ascensionInitialModifier || null

    return runState
  }
}
