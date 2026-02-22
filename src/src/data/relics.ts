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
    icon: '⚔️',
    description: '超杀分数转化为额外金币',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'battle_end', modifier: 'gold_flat', value: 0 } // 实际金币 = state.overkill，硬编码在 shop/battle 中
    ],
    flavor: '一击的余波化为金币的叮当声。'
  },

  // ==================== 催化剂遗物 ====================

  void_heart: {
    id: 'void_heart',
    name: '虚空之心',
    icon: '🕳️',
    description: '每个空键位 +3 底分',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_bonus', value: 3 }
    ],
    flavor: '虚空之中，空白即是力量。'
  },

  chain_amplifier: {
    id: 'chain_amplifier',
    name: '连锁放大器',
    icon: '⚡',
    description: 'echo/ripple 额外触发一次',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      { type: 'passive', modifier: 'chain_amplify', value: 1 }
    ],
    flavor: '锁链之上再加一环。'
  },

  fortress: {
    id: 'fortress',
    name: '铁壁',
    icon: '🏰',
    description: '护盾+2，哨兵每层护盾额外+1分',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'passive', modifier: 'shield_bonus', value: 2 }
    ],
    flavor: '坚不可摧的堡垒。'
  },

  passive_mastery: {
    id: 'passive_mastery',
    name: '被动大师',
    icon: '📿',
    description: '被动技能增强效果翻倍',
    rarity: 'legendary',
    basePrice: 90,
    effects: [
      { type: 'passive', modifier: 'passive_enhance_double', value: 2 }
    ],
    flavor: '大师之道，在于无为而治。'
  },

  keyboard_storm: {
    id: 'keyboard_storm',
    name: '键盘风暴',
    icon: '🌩️',
    description: '技能数≥12时所有技能底分+2',
    rarity: 'legendary',
    basePrice: 100,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_bonus', value: 2 }
    ],
    flavor: '当键盘被占满，风暴降临。'
  },

  gamblers_creed: {
    id: 'gamblers_creed',
    name: '赌徒信条',
    icon: '🎲',
    description: '豪赌技能100%成功',
    rarity: 'rare',
    basePrice: 60,
    effects: [
      { type: 'passive', modifier: 'gamble_guaranteed', value: 1 }
    ],
    flavor: '信仰赌桌的人，永远不会输。'
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


  // 虚空之心：每个空键位 +3 底分（base additive）
  void_heart: (id, ctx) => [
    relicMod(id, 'score', 'on_skill_trigger', 'calculate', {
      effect: { type: 'score', value: (ctx?.adjacentEmptyCount ?? 0) * 3, stacking: 'additive' },
    }),
  ],

  // 连锁放大器：行为型，通过 queryRelicFlag 查询
  chain_amplifier: () => [],

  // 铁壁：行为型，通过 queryRelicFlag 查询
  fortress: () => [],

  // 被动大师：行为型，通过 createScopedRegistry 中特殊处理
  passive_mastery: () => [],

  // 键盘风暴：技能数 >=12 时底分 +2（base additive + 条件）
  keyboard_storm: (id) => [
    relicMod(id, 'score', 'on_skill_trigger', 'calculate', {
      effect: { type: 'score', value: 2, stacking: 'additive' },
      condition: { type: 'total_skills_gte', value: 12 },
    }),
  ],

  // 赌徒信条：行为型，通过 queryRelicFlag 查询
  gamblers_creed: () => [],

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
