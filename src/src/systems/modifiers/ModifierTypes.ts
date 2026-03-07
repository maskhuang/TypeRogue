// ============================================
// 打字肉鸽 - Modifier 类型定义
// ============================================
// Story 11.1: 统一效果管道的数据层

// === 修饰器层级 ===
/** BASE 加法叠加, ENHANCE 乘法叠加, GLOBAL 乘法叠加 */
export type ModifierLayer = 'base' | 'enhance' | 'global'

// === 修饰器阶段 ===
/** before=拦截, calculate=数值计算, after=链式触发 */
export type ModifierPhase = 'before' | 'calculate' | 'after'

// === 触发事件类型 ===
export type ModifierTrigger =
  | 'on_skill_trigger'      // 技能触发时
  | 'on_correct_keystroke'   // 正确击键时
  | 'on_error'               // 打错时
  | 'on_word_complete'       // 完成词语时
  | 'on_combo_break'         // 连击中断时
  | 'on_battle_start'        // 战斗开始
  | 'on_battle_end'          // 战斗结束

// === 修饰器来源类型 ===
export type ModifierSourceType = 'skill' | 'relic' | 'passive' | 'letter'

// === 数值效果类型 ===
export type ModifierEffectType = 'score' | 'multiply' | 'time' | 'gold'

/** 数值效果 */
export interface ModifierEffect {
  type: ModifierEffectType
  value: number
  stacking: 'additive' | 'multiplicative'
}

// === 行为效果 ===
export type ModifierBehavior =
  | { type: 'intercept' }
  | { type: 'trigger_adjacent' }
  | { type: 'buff_next_skill'; multiplier: number }
  | { type: 'trigger_skill'; targetSkillId: string }
  | { type: 'combo_protect'; probability: number }
  | { type: 'set_echo_flag' }
  | { type: 'set_ripple_flag' }
  | { type: 'pulse_counter'; timeBonus: number }
  | { type: 'trigger_row_mirror' }
  | { type: 'amplify_chain' }
  | { type: 'instant_fail' }
  | { type: 'time_steal'; timeBonus: number }
  | { type: 'remove_relic'; relicId: string }
  | { type: 'time_refund'; ratio: number }
  // 进化系统行为 (Story 15.1)
  | { type: 'restore_combo'; triggerEvery: number }
  | { type: 'set_word_cooldown' }
  | { type: 'trigger_random_adjacent' }

// === 条件系统 ===
export type ModifierCondition =
  // 战斗状态
  | { type: 'combo_gte'; value: number }
  | { type: 'combo_lte'; value: number }
  | { type: 'no_errors' }
  | { type: 'random'; probability: number }
  // 位置
  | { type: 'adjacent_skills_gte'; value: number }
  | { type: 'adjacent_empty_gte'; value: number }
  | { type: 'adjacent_has_type'; skillType: string }
  // 词语
  | { type: 'word_length_gte'; value: number }
  | { type: 'word_length_lte'; value: number }
  | { type: 'word_has_letter'; letter: string }
  // 遗物
  | { type: 'multiplier_gte'; value: number }
  // 上下文
  | { type: 'skills_triggered_this_word'; value: number }
  | { type: 'skills_triggered_gte'; value: number }
  | { type: 'different_skill_from_last' }
  | { type: 'nth_word'; value: number }
  // 催化剂遗物条件
  | { type: 'total_skills_gte'; value: number }
  | { type: 'always_true' }
  // 风险回报遗物条件
  | { type: 'no_skills_equipped' }
  // 字母升级条件
  | { type: 'key_is'; key: string }
  // 词语特征条件 (Story 14.3)
  | { type: 'word_has_double_letter' }
  | { type: 'word_all_unique_letters' }
  | { type: 'word_vowel_ratio_gte'; value: number }
  | { type: 'skill_density_gte'; value: number }
  // T1 条件加成遗物 (Story 27.2)
  | { type: 'current_skill_is_converter' }
  | { type: 'is_chained_trigger' }
  | { type: 'amplifier_stacks_gte'; value: number }
  | { type: 'word_resource_types_gte'; value: number }
  | { type: 'word_perfect' }
  | { type: 'is_producer_and_count_gte'; value: number }
  | { type: 'is_converter_after_producer' }
  // T5 空间策略遗物条件 (Story 27.4)
  | { type: 'is_home_row' }
  | { type: 'both_hands_triggered' }
  | { type: 'is_in_pair' }
  | { type: 'is_isolated' }

// === 管道输出类型 (Story 11.2) ===

/** 按 effect.type 分组的数值结果 */
export interface EffectAccumulator {
  score: number
  multiply: number
  time: number
  gold: number
}

/** EffectPipeline.resolve() 的返回值 */
export interface PipelineResult {
  /** Phase 1 是否被拦截 */
  intercepted: boolean
  /** Phase 2 三层计算结果 */
  effects: EffectAccumulator
  /** Phase 3 待执行的行为列表 */
  pendingBehaviors: ModifierBehavior[]
}

/** 管道上下文 — 条件评估所需的运行时数据 */
export interface PipelineContext {
  /** 当前连击数 */
  combo?: number
  /** 本场战斗是否出过错 */
  hasError?: boolean
  /** 相邻键中有技能的数量（调用方预计算） */
  adjacentSkillCount?: number
  /** 相邻键中无技能的数量（调用方预计算） */
  adjacentEmptyCount?: number
  /** 相邻键上技能的类型列表（调用方预计算） */
  adjacentSkillTypes?: string[]
  /** 当前词语 */
  currentWord?: string
  /** 本词已触发的技能数量 */
  skillsTriggeredThisWord?: number
  /** 本场战斗第几个词（1-indexed） */
  wordNumber?: number
  /** 当前倍率（遗物条件使用） */
  multiplier?: number
  /** 超杀分数（遗物金币计算使用） */
  overkill?: number
  /** 当前触发的技能 ID（chain 条件使用） */
  currentSkillId?: string
  /** 本词前一个触发的技能 ID（chain 条件使用） */
  lastTriggeredSkillId?: string
  /** 玩家当前拥有的技能总数（键盘风暴使用） */
  totalSkillCount?: number
  /** 当前正确击键的字母（字母升级系统使用） */
  currentKeystrokeKey?: string
  /** 词中技能键命中率 (0.0~1.0)（词语条件使用） */
  skillDensity?: number
  /** 当前触发技能的类型分类（T1 遗物条件使用） */
  currentSkillCategory?: 'producer' | 'converter' | 'connector' | 'amplifier'
  /** 是否由连接者传导触发（链路增压使用） */
  isChainedTrigger?: boolean
  /** 本词已产出的不同资源种类数（资源洪流使用） */
  wordResourceTypes?: number
  /** 本词是否无错误（完美韵律使用） */
  wordPerfect?: boolean
  /** 当前增幅者最大叠层数（层叠共鸣使用） */
  amplifierMaxStacks?: number
  /** 已装备的产出者数量（点火核心使用） */
  equippedProducerCount?: number
  /** 本词是否有产出者触发过（熔炉之心使用） */
  wordHasProducerTriggered?: boolean
  /** 当前触发技能绑定的键位（T5 空间遗物使用） */
  currentSkillKey?: string
  /** 本词是否有左手技能触发过（双手兼备使用） */
  leftHandTriggered?: boolean
  /** 本词是否有右手技能触发过（双手兼备使用） */
  rightHandTriggered?: boolean
}

// === 行为执行回调 (Story 11.4) ===

/** BehaviorExecutor 的回调接口 — 由调用方实现 */
export interface BehaviorCallbacks {
  /** trigger_adjacent: 返回相邻技能的 pipeline 结果列表 */
  onTriggerAdjacent?(depth: number): PipelineResult[]
  /** trigger_skill: 返回指定技能的 pipeline 结果（null = 技能不存在） */
  onTriggerSkill?(targetSkillId: string, depth: number): PipelineResult | null
  /** buff_next_skill: 通知调用方设置临时增益 */
  onBuffNextSkill?(multiplier: number): void
  /** combo_protect: 按概率保护连击，返回是否保护成功 */
  onComboProtect?(probability: number): boolean
  /** set_echo_flag: 设置 echo 双触发标记 */
  onSetEchoFlag?(): void
  /** set_ripple_flag: 设置 ripple 效果传递标记 */
  onSetRippleFlag?(): void
  /** pulse_counter: 脉冲计数器，达到阈值时触发时间加成 */
  onPulseCounter?(timeBonus: number): void
  /** trigger_row_mirror: 同行镜像触发，返回触发结果 */
  onTriggerRowMirror?(depth: number): PipelineResult | null
  /** amplify_chain: 连锁放大器，echo/ripple 额外触发一次 */
  onAmplifyChain?(): void
  /** instant_fail: 玻璃大炮，打错即本关失败 */
  onInstantFail?(): void
  /** time_steal: 时间窃贼，技能触发时加时间 */
  onTimeSteal?(timeBonus: number): void
  /** remove_relic: 移除指定遗物（完美主义者断连击时触发） */
  onRemoveRelic?(relicId: string): void
  /** time_refund: 返还词语消耗时间的百分比（完美韵律使用） */
  onTimeRefund?(ratio: number): void
  // 进化系统回调 (Story 15.2)
  /** restore_combo: 每 N 次触发恢复连击 */
  onRestoreCombo?(triggerEvery: number): void
  /** set_word_cooldown: 设置当前技能本词冷却 */
  onSetWordCooldown?(): void
  /** trigger_random_adjacent: 随机触发一个相邻技能 */
  onTriggerRandomAdjacent?(depth: number): PipelineResult | null
}

/** BehaviorExecutor.execute() 的返回值 */
export interface BehaviorExecutionResult {
  /** 成功执行的行为数量（不含 intercept 跳过和深度截断） */
  executedCount: number
  /** 因深度限制被跳过的触发类行为数量 */
  skippedByDepth: number
  /** 实际达到的最大链式深度（等于传入的 depth 若无链式触发） */
  chainDepthReached: number
}

// === 完整 Modifier 接口 ===
export interface Modifier {
  /** 唯一标识，如 'skill:burst:score' */
  id: string
  /** 来源标识，如 'skill:burst' */
  source: string
  /** 来源类型 */
  sourceType: ModifierSourceType
  /** 修饰层级 */
  layer: ModifierLayer
  /** 触发事件 */
  trigger: ModifierTrigger
  /** 处理阶段 */
  phase: ModifierPhase
  /** 触发条件（可选，无条件则始终生效） */
  condition?: ModifierCondition
  /** 数值效果（和 behavior 可同时存在） */
  effect?: ModifierEffect
  /** 行为效果 */
  behavior?: ModifierBehavior
  /** 优先级，越小越先执行，默认 100 */
  priority: number
}
