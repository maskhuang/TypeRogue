// ============================================
// 打字肉鸽 - 遗物数据
// ============================================
// Story 5.4 Task 2: 遗物数据定义

import type { RelicData, RelicRarity } from '../systems/relics/RelicTypes'

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
    description: '战斗奖励金币 +25%',
    rarity: 'rare',
    basePrice: 45,
    effects: [
      { type: 'battle_end', modifier: 'gold_multiplier', value: 1.25 }
    ]
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
