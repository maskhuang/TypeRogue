// ============================================
// 打字肉鸽 - 遗物数据
// ============================================
// 仅保留职业专属遗物

import type { Modifier, PipelineContext } from '../systems/modifiers/ModifierTypes'

// === 遗物类型定义（从 RelicTypes.ts 迁入） ===

export type RelicRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type RelicEffectType =
  | 'battle_start'     // 战斗开始时触发
  | 'battle_end'       // 战斗结束时触发
  | 'on_word_complete' // 完成词语时触发
  | 'on_skill_trigger' // 技能触发时
  | 'on_error'         // 打错时触发
  | 'passive'          // 持续被动效果

export type RelicModifierType =
  | 'time_bonus'           // 时间加成（秒）
  | 'score_multiplier'     // 分数倍率加成
  | 'gold_multiplier'      // 金币倍率加成
  | 'combo_protection'     // 连击保护概率
  | 'price_discount'       // 商店折扣
  | 'gold_flat'            // 金币固定加成
  | 'instant_fail'         // 打错即失败
  | 'time_steal'           // 时间窃取
  | 'time_halve'           // 时间减半
  | 'price_increase'       // 价格增加
  | 'skill_lock'           // 技能锁定
  | 'time_penalty'         // 时间惩罚
  | 'max_skill_level'      // 技能等级上限（T4 限制框架）
  | 'max_skill_count'      // 技能数量上限（T4 限制框架）

export type RelicConditionType =
  | 'combo_threshold'   // 连击阈值

export interface RelicCondition {
  type: RelicConditionType
  threshold: number
}

export interface RelicEffect {
  type: RelicEffectType
  modifier: RelicModifierType
  value: number
  condition?: RelicCondition
}

export interface RelicData {
  id: string
  name: string
  icon: string
  description: string
  rarity: RelicRarity
  basePrice: number
  effects: RelicEffect[]
  flavor?: string
  category?: 'risk-reward'
}

/** 遗物槽位上限 */
export const MAX_RELIC_SLOTS = 10

/**
 * 所有遗物数据（仅职业专属）
 */
export const RELICS: Record<string, RelicData> = {
  // ==================== 职业初始遗物 ====================

  apprentice_notes: {
    id: 'apprentice_notes',
    name: '学徒笔记',
    icon: '📓',
    description: '造词师初始遗物。开局元音碎片各 ×3。',
    rarity: 'common',
    basePrice: 0,
    effects: [],
    flavor: '每一笔都是对语言的敬意。',
  },

  primal_mutant: {
    id: 'primal_mutant',
    name: '原初变异体',
    icon: '🧫',
    description: '蜕变师初始遗物。每关第一次蜕变免费。',
    rarity: 'common',
    basePrice: 0,
    effects: [],
    flavor: '最初的变异，蕴含无限可能。',
  },

  // ==================== 蜕变师专属遗物 ====================

  ultimate_mutant_strain: {
    id: 'ultimate_mutant_strain',
    name: '终极突变株',
    icon: '⚛️',
    description: '每关前2次蜕变免费，每次蜕变返还1变异素。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    flavor: '进化的尽头，是无限的可能性。',
  },

  gene_stabilizer: {
    id: 'gene_stabilizer',
    name: '基因稳定器',
    icon: '🔒',
    description: '解锁单词条蜕变（可只替换一个词条）。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    flavor: '稳定基因链，精准操控变异。',
  },

  chaos_seed: {
    id: 'chaos_seed',
    name: '混沌种子',
    icon: '🌱',
    description: '每关开始时，给所有未附魔技能一个随机附魔（临时，关结束移除）。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    flavor: '混沌中播下的种子，总会结出意外的果实。',
  },

  fittest_survivors: {
    id: 'fittest_survivors',
    name: '适者生存',
    icon: '💪',
    description: '蜕变后的技能本关产出+20%。',
    rarity: 'epic',
    basePrice: 0,
    effects: [],
    flavor: '适者生存，强者愈强。',
  },

  // ==================== 造词师专属遗物 ====================

  masters_lexicon: {
    id: 'masters_lexicon',
    name: '大师词典',
    icon: '📙',
    description: '获得时全字母碎片各+2，采集队列+2格。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    flavor: '二十六个字母，足以书写万物。',
  },

  perpetual_queue: {
    id: 'perpetual_queue',
    name: '永动队列',
    icon: '♾️',
    description: '每关战斗开始时自动采集一轮队列。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    flavor: '永不停歇的字母之轮。',
  },

  word_scissors: {
    id: 'word_scissors',
    name: '拆词剪刀',
    icon: '✂️',
    description: '可拆解已造词，返还所有碎片。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    flavor: '剪下一个词，重组一种可能。',
  },

  resonance_mold: {
    id: 'resonance_mold',
    name: '共鸣字模',
    icon: '🧩',
    description: '造词时重复字母不收金币。',
    rarity: 'epic',
    basePrice: 0,
    effects: [],
    flavor: '每个字母都有平等的共鸣权。',
  },

}

// === Relic Modifier 工厂类型 ===
export type RelicModifierFactory = (
  relicId: string,
  context?: PipelineContext,
) => Modifier[]

// === RELIC_MODIFIER_DEFS — 每个遗物的 Modifier 工厂 ===
// 职业专属遗物均为行为型，无 Modifier 管道效果
export const RELIC_MODIFIER_DEFS: Record<string, RelicModifierFactory> = {}

// === T4 限制 Flag 映射表（已清空，无 T4 遗物） ===
export const RELIC_FLAGS: Record<string, string[]> = {}

/**
 * 按稀有度获取遗物列表
 */
export function getRelicsByRarity(rarity: RelicRarity): RelicData[] {
  return Object.values(RELICS).filter(r => r.rarity === rarity)
}

/**
 * 获取遗物数据
 */
export function getRelicData(relicId: string): RelicData | undefined {
  return RELICS[relicId]
}

/**
 * 获取所有遗物ID
 */
export function getAllRelicIds(): string[] {
  return Object.keys(RELICS)
}

/**
 * 获取所有遗物数据
 */
export function getAllRelics(): RelicData[] {
  return Object.values(RELICS)
}

/**
 * 检查遗物数据是否存在
 */
export function relicExists(relicId: string): boolean {
  return relicId in RELICS
}

/**
 * 已删除的遗物 ID（用于存档迁移过滤）
 */
export const DELETED_RELIC_IDS = [
  'magnet', 'combo_badge', 'berserker_mask',
  'combo_crown', 'treasure_map', 'piggy_bank',
  'chain_amplifier', 'fortress', 'passive_mastery', 'gamblers_creed',
  'golden_keyboard', 'void_heart', 'rhyme_master',
  'keyboard_storm', 'time_lord', 'time_crystal',
  'mono_affix',
  'refining_lens', 'catalyst_injector', 'fragment_prism', 'abyss_eye',
  // 非职业专属遗物（已删除）
  'lucky_coin', 'phoenix_feather', 'overkill_blade',
  'glass_cannon', 'time_thief', 'greedy_hand', 'silence_vow', 'doomsday',
  'spark_core', 'forge_heart', 'chain_surge', 'stack_resonance',
  'perfect_rhythm', 'resource_flood',
  'home_advantage', 'ambidextrous', 'twin_bond', 'lone_wolf',
  'cornucopia', 'time_bank', 'ramen', 'overcharge',
  'campfire_ember', 'star_chart', 'entropy', 'schrodinger_dice',
  'perfectionist', 'chain_ban', 'no_enchant_vow', 'keyboard_flood',
  'pure_heart', 'minimalist',
  'echo_bell', 'storm_drum', 'finale',
  'affix_spectrum', 'legendary_aura', 'quest_momentum',
]
