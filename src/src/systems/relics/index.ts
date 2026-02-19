// ============================================
// 打字肉鸽 - Relics 模块导出
// ============================================
// Story 5.4 Task 5: 模块导出

export { RelicSystem } from './RelicSystem'
export type { RelicSystemConfig } from './RelicSystem'

export { RelicEffects, createDefaultContext } from './RelicEffects'
export type { BattleContext } from './RelicEffects'

export {
  createDefaultModifiers
} from './RelicTypes'

export type {
  RelicData,
  RelicEffect,
  RelicEffectType,
  RelicRarity,
  RelicModifiers,
  RelicModifierType,
  RelicCondition,
  RelicConditionType
} from './RelicTypes'
