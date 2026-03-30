// ============================================
// 打字肉鸽 - 附魔系统遗物行为 (Story 36.5)
// ============================================

import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'

/** 附魔加速遗物的加成倍率（学徒之袍 + 试炼徽章共用） */
export const ENCHANTMENT_BOOST_RATE = 1.3

// === 学徒之袍 (apprentice_robe) ===

/**
 * 获取学徒型附魔成长乘数
 * 持有 apprentice_robe → 1.3，否则 1
 */
export function getApprenticeGrowthMultiplier(): number {
  return state.player.relics.has('apprentice_robe') ? ENCHANTMENT_BOOST_RATE : 1
}

// === 试炼徽章 (trial_badge) ===

/**
 * 获取试炼型附魔堆叠增量
 * 持有 trial_badge → 1.3，否则 1
 */
export function getQuestStackIncrement(): number {
  return state.player.relics.has('trial_badge') ? ENCHANTMENT_BOOST_RATE : 1
}

// === 命运三岔 (fate_fork) ===

/**
 * 获取附魔选择候选数
 * 持有 fate_fork → 3，否则 2
 */
export function getEnchantmentChoiceCount(): number {
  return state.player.relics.has('fate_fork') ? 3 : 2
}

// === 早期觉醒 (early_awakening) ===

/** 获取附魔触发等级门槛（按稀有度递减，早期觉醒再 -1） */
export function getMinEnchantmentLevel(rarity: number = 1): number {
  const base = Math.max(1, 4 - rarity)
  return state.player.relics.has('early_awakening') ? Math.max(1, base - 1) : base
}

// === 附魔锚点 (enchant_anchor) ===

/**
 * 获取附魔锚点额外槽位加成
 * 持有 → 1，否则 0
 */
export function getEnchantAnchorSlotBonus(): number {
  return state.player.relics.has('enchant_anchor') ? 1 : 0
}

/**
 * 获取附魔锚点价格乘数
 * 持有 → 1 + 0.1 × 所有技能附魔总数，否则 1
 */
export function getEnchantAnchorPriceMultiplier(): number {
  if (!state.player.relics.has('enchant_anchor')) return 1
  let totalEnchantments = 0
  for (const [, skill] of state.affixSkills) {
    totalEnchantments += skill.enchantmentIds.length
  }
  return 1 + 0.1 * totalEnchantments
}

// === 模块重置（关级别） ===

/**
 * 重置关级别状态 — 在 startLevel() 中调用
 * 当前附魔遗物无需关级别状态重置
 */
export function resetEnchantmentRelicState(): void {
  // no-op: 附魔遗物均为被动效果，无关级别状态
}

// === 注册所有行为 ===

/**
 * 初始化附魔子系统遗物行为注册
 */
export function initEnchantmentRelicBehaviors(): void {
  registerRelicBehavior('fate_fork', (_relicId, _context) => {
    // 实际逻辑在 getEnchantmentChoiceCount() 中，由 shop.ts 调用
  })

  registerRelicBehavior('early_awakening', (_relicId, _context) => {
    // 实际逻辑在 getMinEnchantmentLevel() 中，由 shop.ts 调用
  })
}
