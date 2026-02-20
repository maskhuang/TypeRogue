// ============================================
// 打字肉鸽 - 遗物数据
// ============================================
// Story 5.4 Task 2: 遗物数据定义

import type { RelicData, RelicRarity } from '../systems/relics/RelicTypes'
import type { Modifier, PipelineContext } from '../systems/modifiers/ModifierTypes'

/**
 * 所有遗物数据
 */
export const RELICS: Record<string, RelicData> = {
  // ==================== 普通遗物 ====================

  lucky_coin: {
    id: 'lucky_coin',
    name: '幸运硬币',
    icon: '🪙',
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
    icon: '💎',
    description: '每完成一个词语 +0.5 秒',
    rarity: 'common',
    basePrice: 30,
    effects: [
      { type: 'on_word_complete', modifier: 'time_bonus', value: 0.5 }
    ]
  },

  piggy_bank: {
    id: 'piggy_bank',
    name: '存钱罐',
    icon: '🐷',
    description: '每关开始 +10 金币',
    rarity: 'common',
    basePrice: 25,
    effects: [
      { type: 'battle_start', modifier: 'gold_flat', value: 10 }
    ]
  },

  magnet: {
    id: 'magnet',
    name: '磁石',
    icon: '🧲',
    description: '词语基础分 +5',
    rarity: 'common',
    basePrice: 20,
    effects: [
      { type: 'passive', modifier: 'word_score_bonus', value: 5 }
    ]
  },

  combo_badge: {
    id: 'combo_badge',
    name: '连击徽章',
    icon: '🎖️',
    description: '每 10 连击获得 +0.1 倍率',
    rarity: 'common',
    basePrice: 30,
    effects: [
      { type: 'passive', modifier: 'multiplier_per_combo', value: 0.01 }
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

  berserker_mask: {
    id: 'berserker_mask',
    name: '狂战士面具',
    icon: '👹',
    description: '连击 > 20 时分数 +30%',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      {
        type: 'passive',
        modifier: 'score_multiplier',
        value: 0.3,
        condition: { type: 'combo_threshold', threshold: 20 }
      }
    ]
  },

  treasure_map: {
    id: 'treasure_map',
    name: '藏宝图',
    icon: '🗺️',
    description: '战斗结束时额外 +15 金币',
    rarity: 'rare',
    basePrice: 45,
    effects: [
      { type: 'battle_end', modifier: 'gold_flat', value: 15 }
    ]
  },

  overkill_blade: {
    id: 'overkill_blade',
    name: '超杀之刃',
    icon: '⚔️',
    description: '超杀分数转化为额外金币',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'battle_end', modifier: 'gold_flat', value: 0 } // 实际金币 = state.overkill，硬编码在 shop/battle 中
    ],
    flavor: '一击的余波化为金币的叮当声。'
  },

  combo_crown: {
    id: 'combo_crown',
    name: '连击皇冠',
    icon: '👑',
    description: '初始倍率 +0.3',
    rarity: 'rare',
    basePrice: 60,
    effects: [
      { type: 'battle_start', modifier: 'score_multiplier', value: 0.3 }
    ]
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
    icon: '⏳',
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
  // 行为型遗物：返回空数组，通过 queryRelicFlag 查询
  lucky_coin: () => [],
  magnet: () => [],
  perfectionist: () => [],

  // 时间水晶：完成词语 +0.5 秒
  time_crystal: (id) => [
    relicMod(id, 'time', 'on_word_complete', 'calculate', {
      effect: { type: 'time', value: 0.5, stacking: 'additive' },
    }),
  ],

  // 存钱罐：进入商店 +10 金币
  piggy_bank: (id) => [
    relicMod(id, 'gold', 'on_battle_end', 'calculate', {
      effect: { type: 'gold', value: 10, stacking: 'additive' },
    }),
  ],

  // 连击徽章：倍率 += combo * 0.01
  combo_badge: (id, ctx) => [
    relicMod(id, 'multiply', 'on_word_complete', 'calculate', {
      effect: { type: 'multiply', value: (ctx?.combo ?? 0) * 0.01, stacking: 'additive' },
    }),
  ],

  // 凤凰羽毛：打错时 50% 概率保护连击（代码行为为准）
  // 使用 after 阶段以被 BehaviorExecutor 收集
  phoenix_feather: (id) => [
    relicMod(id, 'protect', 'on_error', 'after', {
      behavior: { type: 'combo_protect', probability: 0.5 },
    }),
  ],

  // 狂战士面具：倍率 >= 3.0 时 bonusMult +0.5（总计 1.5 倍）
  // 注意：旧代码使用 > 3.0（严格大于），迁移后改为 >= 3.0（大于等于），边界情况影响极小
  berserker_mask: (id) => [
    relicMod(id, 'multiply', 'on_word_complete', 'calculate', {
      effect: { type: 'multiply', value: 0.5, stacking: 'additive' },
      condition: { type: 'multiplier_gte', value: 3.0 },
    }),
  ],

  // 藏宝图：战斗结束 +15 金币
  treasure_map: (id) => [
    relicMod(id, 'gold', 'on_battle_end', 'calculate', {
      effect: { type: 'gold', value: 15, stacking: 'additive' },
    }),
  ],

  // 超杀之刃：overkill 分数转金币
  overkill_blade: (id, ctx) => [
    relicMod(id, 'gold', 'on_battle_end', 'calculate', {
      effect: { type: 'gold', value: Math.max(0, ctx?.overkill ?? 0), stacking: 'additive' },
    }),
  ],

  // 连击皇冠：战斗开始 倍率 +0.3
  combo_crown: (id) => [
    relicMod(id, 'multiply', 'on_battle_start', 'calculate', {
      effect: { type: 'multiply', value: 0.3, stacking: 'additive' },
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
