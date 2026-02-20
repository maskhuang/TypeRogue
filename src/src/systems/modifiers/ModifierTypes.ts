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
export type ModifierEffectType = 'score' | 'multiply' | 'time' | 'gold' | 'shield'

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

// === 条件系统（12 种原语） ===
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
  // 上下文
  | { type: 'skills_triggered_this_word'; value: number }
  | { type: 'nth_word'; value: number }

// === 管道输出类型 (Story 11.2) ===

/** 按 effect.type 分组的数值结果 */
export interface EffectAccumulator {
  score: number
  multiply: number
  time: number
  gold: number
  shield: number
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

/** 管道上下文（预留给 11.3 条件系统） */
export interface PipelineContext {
  // 11.3 将扩展: combo, wordLength, adjacentSkills, wordSkillCount, etc.
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
