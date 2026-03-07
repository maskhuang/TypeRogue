// ============================================
// 打字肉鸽 - 遗物数据
// ============================================
// Story 5.4 Task 2: 遗物数据定义

import type { Modifier, PipelineContext } from '../systems/modifiers/ModifierTypes'

// === 遗物类型定义（从 RelicTypes.ts 迁入） ===

export type RelicRarity = 'common' | 'rare' | 'legendary'

export type RelicEffectType =
  | 'battle_start'     // 战斗开始时触发
  | 'battle_end'       // 战斗结束时触发
  | 'on_word_complete' // 完成词语时触发
  | 'on_skill_trigger' // 技能触发时
  | 'on_keystroke'     // 每次击键时触发
  | 'on_combo_break'   // 连击断裂时触发
  | 'on_error'         // 打错时触发
  | 'passive'          // 持续被动效果
  | 'on_acquire'       // 获取时一次性触发

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
  | 'score_bonus'          // 分数固定加成
  | 'instant_fail'         // 打错即失败
  | 'time_steal'           // 时间窃取
  | 'time_halve'           // 时间减半
  | 'price_increase'       // 价格增加
  | 'skill_lock'           // 技能锁定
  | 'time_penalty'         // 时间惩罚

export type RelicConditionType =
  | 'combo_threshold'   // 连击阈值
  | 'score_threshold'   // 分数阈值
  | 'time_remaining'    // 剩余时间阈值

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

/**
 * 所有遗物数据
 */
export const RELICS: Record<string, RelicData> = {
  // ==================== 普通遗物 ====================

  lucky_coin: {
    id: 'lucky_coin',
    name: '幸运硬币',
    icon: '🍀',
    description: '商店价格降低 10%',
    rarity: 'common',
    basePrice: 25,
    effects: [
      { type: 'passive', modifier: 'price_discount', value: 0.1 }
    ],
    flavor: '据说这枚硬币总是正面朝上。'
  },

  time_crystal: {
    id: 'time_crystal',
    name: '时间水晶',
    icon: '🔷',
    description: '每完成一个词语 +0.5 秒',
    rarity: 'common',
    basePrice: 30,
    effects: [
      { type: 'on_word_complete', modifier: 'time_bonus', value: 0.5 }
    ]
  },

  // ==================== 稀有遗物 ====================

  phoenix_feather: {
    id: 'phoenix_feather',
    name: '凤凰羽毛',
    icon: '🪶',
    description: '打错时 30% 概率保护连击',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'on_error', modifier: 'combo_protection', value: 0.3 }
    ],
    flavor: '涅槃重生，连击不灭。'
  },


  overkill_blade: {
    id: 'overkill_blade',
    name: '超杀之刃',
    icon: '🔪',
    description: '超杀分数转化为额外金币',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'battle_end', modifier: 'gold_flat', value: 0 } // 实际金币 = state.overkill，硬编码在 shop/battle 中
    ],
    flavor: '一击的余波化为金币的叮当声。'
  },

  // ==================== 词语特征遗物 ====================

  rhyme_master: {
    id: 'rhyme_master',
    name: '韵律大师',
    icon: '🎶',
    description: '词含重复字母时所有技能基数 +3',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_bonus', value: 3 }
    ],
    flavor: '重复的韵律中蕴藏着力量。'
  },

  // ==================== 催化剂遗物 ====================

  void_heart: {
    id: 'void_heart',
    name: '虚空之心',
    icon: '🌑',
    description: '每个空键位 +3 基数',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_bonus', value: 3 }
    ],
    flavor: '虚空之中，空白即是力量。'
  },

  keyboard_storm: {
    id: 'keyboard_storm',
    name: '键盘风暴',
    icon: '🌩️',
    description: '技能数≥12时所有技能基数+2',
    rarity: 'legendary',
    basePrice: 100,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_bonus', value: 2 }
    ],
    flavor: '当键盘被占满，风暴降临。'
  },

  // ==================== 风险回报遗物 ====================

  glass_cannon: {
    id: 'glass_cannon',
    name: '玻璃大炮',
    icon: '💣',
    description: '技能分数 ×2，但打错即本关失败',
    rarity: 'rare',
    basePrice: 40,
    category: 'risk-reward',
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 2.0 },
      { type: 'on_error', modifier: 'instant_fail', value: 1 }
    ],
    flavor: '要么完美，要么毁灭。'
  },

  time_thief: {
    id: 'time_thief',
    name: '时间窃贼',
    icon: '⏰',
    description: '技能触发 +0.3 秒，但基础时间减半',
    rarity: 'rare',
    basePrice: 45,
    category: 'risk-reward',
    effects: [
      { type: 'on_skill_trigger', modifier: 'time_steal', value: 0.3 },
      { type: 'battle_start', modifier: 'time_halve', value: 0.5 }
    ],
    flavor: '偷来的时间，总有代价。'
  },

  greedy_hand: {
    id: 'greedy_hand',
    name: '贪婪之手',
    icon: '🤑',
    description: '金币 ×1.5，但商店价格 +50%',
    rarity: 'rare',
    basePrice: 50,
    category: 'risk-reward',
    effects: [
      { type: 'battle_end', modifier: 'gold_multiplier', value: 1.5 },
      { type: 'passive', modifier: 'price_increase', value: 1.5 }
    ],
    flavor: '贪婪者索取一切，却付出更多。'
  },

  silence_vow: {
    id: 'silence_vow',
    name: '沉默誓约',
    icon: '🤫',
    description: '无技能时分数 ×5，但无法装备技能',
    rarity: 'legendary',
    basePrice: 80,
    category: 'risk-reward',
    effects: [
      { type: 'on_word_complete', modifier: 'score_multiplier', value: 5.0 },
      { type: 'passive', modifier: 'skill_lock', value: 1 }
    ],
    flavor: '沉默之中，文字本身就是力量。'
  },

  doomsday: {
    id: 'doomsday',
    name: '末日倒计时',
    icon: '☢️',
    description: '每关 +30 秒，但每过一关 -5 秒基础时间',
    rarity: 'legendary',
    basePrice: 70,
    category: 'risk-reward',
    effects: [
      { type: 'battle_start', modifier: 'time_bonus', value: 30 },
      { type: 'battle_start', modifier: 'time_penalty', value: -5 }
    ],
    flavor: '末日的钟声越来越近。'
  },

  // ==================== 传说遗物 ====================

  golden_keyboard: {
    id: 'golden_keyboard',
    name: '黄金键盘',
    icon: '⌨️',
    description: '所有技能效果 +25%',
    rarity: 'legendary',
    basePrice: 100,
    effects: [
      { type: 'passive', modifier: 'skill_effect_bonus', value: 0.25 }
    ],
    flavor: '传说中的键盘，每一次击键都闪耀着金光。'
  },

  time_lord: {
    id: 'time_lord',
    name: '时间领主',
    icon: '🕰️',
    description: '每关额外 +8 秒',
    rarity: 'legendary',
    basePrice: 90,
    effects: [
      { type: 'battle_start', modifier: 'time_bonus', value: 8 }
    ]
  },

  perfectionist: {
    id: 'perfectionist',
    name: '完美主义者',
    icon: '💯',
    description: '无错误通关时分数 ×2',
    rarity: 'legendary',
    basePrice: 120,
    effects: [
      {
        type: 'battle_end',
        modifier: 'score_multiplier',
        value: 1, // 额外 +1 (总共 ×2)
        condition: { type: 'combo_threshold', threshold: -1 } // 特殊：-1 表示无断连
      }
    ],
    flavor: '只有完美，才配得上这份荣耀。'
  }
}

// === Relic Modifier 工厂类型 ===
export type RelicModifierFactory = (
  relicId: string,
  context?: PipelineContext,
) => Modifier[]

// === 工具函数 ===
function relicMod(
  relicId: string,
  id: string,
  trigger: Modifier['trigger'],
  phase: Modifier['phase'],
  overrides: Partial<Modifier> = {},
): Modifier {
  return {
    id: `relic:${relicId}:${id}`,
    source: `relic:${relicId}`,
    sourceType: 'relic',
    layer: 'base',
    trigger,
    phase,
    priority: 200,
    ...overrides,
  }
}

// === RELIC_MODIFIER_DEFS — 每个遗物的 Modifier 工厂 ===
// 注意：加法效果用 base 层（baseSum += value），乘法效果用 global 层（globalProduct *= value）
export const RELIC_MODIFIER_DEFS: Record<string, RelicModifierFactory> = {
  // 韵律大师：词含重复字母时基数 +3（base additive + 条件）
  rhyme_master: (id) => [
    relicMod(id, 'score', 'on_skill_trigger', 'calculate', {
      effect: { type: 'score', value: 3, stacking: 'additive' },
      condition: { type: 'word_has_double_letter' },
    }),
  ],

  // 行为型遗物：返回空数组，通过 queryRelicFlag 查询
  lucky_coin: () => [],
  perfectionist: () => [],

  // 时间水晶：完成词语 +0.5 秒
  time_crystal: (id) => [
    relicMod(id, 'time', 'on_word_complete', 'calculate', {
      effect: { type: 'time', value: 0.5, stacking: 'additive' },
    }),
  ],


  // 凤凰羽毛：打错时 50% 概率保护连击（代码行为为准）
  // 使用 after 阶段以被 BehaviorExecutor 收集
  phoenix_feather: (id) => [
    relicMod(id, 'protect', 'on_error', 'after', {
      behavior: { type: 'combo_protect', probability: 0.5 },
    }),
  ],


  // 超杀之刃：overkill 分数转金币
  overkill_blade: (id, ctx) => [
    relicMod(id, 'gold', 'on_battle_end', 'calculate', {
      effect: { type: 'gold', value: Math.max(0, ctx?.overkill ?? 0), stacking: 'additive' },
    }),
  ],


  // 虚空之心：每个空键位 +3 基数（base additive）
  void_heart: (id, ctx) => [
    relicMod(id, 'score', 'on_skill_trigger', 'calculate', {
      effect: { type: 'score', value: (ctx?.adjacentEmptyCount ?? 0) * 3, stacking: 'additive' },
    }),
  ],

  // 键盘风暴：技能数 >=12 时基数 +2（base additive + 条件）
  keyboard_storm: (id) => [
    relicMod(id, 'score', 'on_skill_trigger', 'calculate', {
      effect: { type: 'score', value: 2, stacking: 'additive' },
      condition: { type: 'total_skills_gte', value: 12 },
    }),
  ],

  // === 风险回报遗物 ===

  // 玻璃大炮：score ×2（增益） + 打错即失败（代价）
  glass_cannon: (id) => [
    relicMod(id, 'score', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 2.0, stacking: 'multiplicative' },
    }),
    relicMod(id, 'fail', 'on_error', 'after', {
      behavior: { type: 'instant_fail' },
    }),
  ],

  // 时间窃贼：技能触发 +0.3s（增益），基础时间减半通过 queryRelicFlag
  time_thief: (id) => [
    relicMod(id, 'time', 'on_skill_trigger', 'after', {
      behavior: { type: 'time_steal', timeBonus: 0.3 },
    }),
  ],

  // 贪婪之手：金币 ×1.5（增益），价格 +50% 通过 queryRelicFlag
  greedy_hand: (id) => [
    relicMod(id, 'gold', 'on_battle_end', 'calculate', {
      layer: 'global',
      effect: { type: 'gold', value: 1.5, stacking: 'multiplicative' },
    }),
  ],

  // 沉默誓约：无技能时 on_word_complete multiply +4（→ bonusMult=5 → 最终分 ×5），技能锁定通过 queryRelicFlag
  silence_vow: (id) => [
    relicMod(id, 'multiply', 'on_word_complete', 'calculate', {
      effect: { type: 'multiply', value: 4.0, stacking: 'additive' },
      condition: { type: 'no_skills_equipped' },
    }),
  ],

  // 末日倒计时：+30s 时间（增益），递增时间扣减通过 queryRelicFlag
  doomsday: (id) => [
    relicMod(id, 'time', 'on_battle_start', 'calculate', {
      effect: { type: 'time', value: 30, stacking: 'additive' },
    }),
  ],

  // 黄金键盘：技能触发时分数 ×1.25（乘法效果，用 global 层）
  golden_keyboard: (id) => [
    relicMod(id, 'score', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.25, stacking: 'multiplicative' },
    }),
  ],

  // 时间领主：战斗开始 +8 秒
  time_lord: (id) => [
    relicMod(id, 'time', 'on_battle_start', 'calculate', {
      effect: { type: 'time', value: 8, stacking: 'additive' },
    }),
  ],
}

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
]
