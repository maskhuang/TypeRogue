// ============================================
// 打字肉鸽 - Modifier 模块导出
// ============================================
// Story 11.1: 统一效果管道的数据层
// Story 11.2: 三层计算管道
// Story 11.3: 条件系统
// Story 11.4: 行为修饰器框架

export type {
  Modifier,
  ModifierLayer,
  ModifierPhase,
  ModifierTrigger,
  ModifierSourceType,
  ModifierEffectType,
  ModifierEffect,
  ModifierBehavior,
  ModifierCondition,
  EffectAccumulator,
  PipelineResult,
  PipelineContext,
  BehaviorCallbacks,
  BehaviorExecutionResult,
} from './ModifierTypes'

export { ModifierRegistry } from './ModifierRegistry'
export { EffectPipeline } from './EffectPipeline'
export { ConditionEvaluator } from './ConditionEvaluator'
export { BehaviorExecutor } from './BehaviorExecutor'
