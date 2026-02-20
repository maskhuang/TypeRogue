// ============================================
// 打字肉鸽 - Modifier 模块导出
// ============================================
// Story 11.1: 统一效果管道的数据层
// Story 11.2: 三层计算管道

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
} from './ModifierTypes'

export { ModifierRegistry } from './ModifierRegistry'
export { EffectPipeline } from './EffectPipeline'
