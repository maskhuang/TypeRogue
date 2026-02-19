// ============================================
// 打字肉鸽 - RelicTypes 遗物类型定义
// ============================================
// Story 5.4 Task 1: 遗物类型定义

/**
 * 遗物稀有度
 */
export type RelicRarity = 'common' | 'rare' | 'legendary'

/**
 * 遗物效果类型
 */
export type RelicEffectType =
  | 'battle_start'     // 战斗开始时触发
  | 'battle_end'       // 战斗结束时触发
  | 'on_word_complete' // 完成词语时触发
  | 'on_keystroke'     // 每次击键时触发
  | 'on_combo_break'   // 连击断裂时触发
  | 'on_error'         // 打错时触发
  | 'passive'          // 持续被动效果
  | 'on_acquire'       // 获取时一次性触发

/**
 * 遗物效果数值类型
 */
export type RelicModifierType =
  | 'time_bonus'           // 时间加成（秒）
  | 'score_multiplier'     // 分数倍率加成
  | 'gold_multiplier'      // 金币倍率加成
  | 'combo_protection'     // 连击保护概率
  | 'skill_effect_bonus'   // 技能效果加成
  | 'price_discount'       // 商店折扣
  | 'word_score_bonus'     // 词语基础分加成
  | 'multiplier_per_combo' // 每连击倍率加成
  | 'gold_flat'            // 金币固定加成

/**
 * 遗物效果条件类型
 */
export type RelicConditionType =
  | 'combo_threshold'   // 连击阈值
  | 'score_threshold'   // 分数阈值
  | 'time_remaining'    // 剩余时间阈值

/**
 * 遗物效果条件
 */
export interface RelicCondition {
  /** 条件类型 */
  type: RelicConditionType
  /** 条件阈值 */
  threshold: number
}

/**
 * 遗物效果定义
 */
export interface RelicEffect {
  /** 效果触发类型 */
  type: RelicEffectType

  /** 数值修改类型 */
  modifier: RelicModifierType

  /** 效果数值 */
  value: number

  /** 触发条件（可选） */
  condition?: RelicCondition
}

/**
 * 遗物数据定义
 */
export interface RelicData {
  /** 遗物ID */
  id: string

  /** 显示名称 */
  name: string

  /** 图标 */
  icon: string

  /** 描述 */
  description: string

  /** 稀有度 */
  rarity: RelicRarity

  /** 商店基础价格 */
  basePrice: number

  /** 效果列表 */
  effects: RelicEffect[]

  /** 风味文字（可选） */
  flavor?: string
}

/**
 * 遗物效果计算结果
 */
export interface RelicModifiers {
  timeBonus: number
  scoreMultiplier: number
  goldMultiplier: number
  comboProtectionChance: number
  skillEffectBonus: number
  priceDiscount: number
  wordScoreBonus: number
  multiplierPerCombo: number
  goldFlat: number
}

/**
 * 创建默认修改器（所有值为中性）
 */
export function createDefaultModifiers(): RelicModifiers {
  return {
    timeBonus: 0,
    scoreMultiplier: 1,
    goldMultiplier: 1,
    comboProtectionChance: 0,
    skillEffectBonus: 0,
    priceDiscount: 0,
    wordScoreBonus: 0,
    multiplierPerCombo: 0,
    goldFlat: 0
  }
}
