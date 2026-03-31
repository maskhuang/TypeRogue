// ============================================
// 打字肉鸽 - 附魔系统遗物行为 (Story 36.5)
// ============================================

import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'

/** 附魔加速遗物的加成倍率（学徒之袍 + 试炼徽章共用） */
export const ENCHANTMENT_BOOST_RATE = 1.3

// === 附魔红利 (enchant_dividend) ===

const ENCHANT_DIVIDEND_GOLD = 2

/**
 * 获取附魔红利金币奖励
 * 触发已附魔技能时 +2 金币
 * @param hasEnchantment 该技能是否有附魔
 * @returns 2 当持有遗物且技能有附魔；否则 0
 */
export function getEnchantDividendGold(hasEnchantment: boolean): number {
  if (!state.player.relics.has('enchant_dividend')) return 0
  return hasEnchantment ? ENCHANT_DIVIDEND_GOLD : 0
}

// === 附魔增幅 (enchant_boost) ===

const ENCHANT_BOOST_PERCENT = 0.15

/**
 * 获取附魔增幅加成
 * 已附魔技能产出 +15%
 * @param hasEnchantment 该技能是否有附魔
 * @returns 0.15 当持有遗物且技能有附魔；否则 0
 */
export function getEnchantBoostBonus(hasEnchantment: boolean): number {
  if (!state.player.relics.has('enchant_boost')) return 0
  return hasEnchantment ? ENCHANT_BOOST_PERCENT : 0
}

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
 * 获取任务型附魔所需装备数减少量
 * 持有 trial_badge → -1，否则 0
 */
export function getQuestEquipReduction(): number {
  return state.player.relics.has('trial_badge') ? 1 : 0
}

// === 命运三岔 (fate_fork) ===

/**
 * 获取附魔选择候选数
 * 持有 fate_fork → 3，否则 2
 */
export function getEnchantmentChoiceCount(): number {
  return state.player.relics.has('fate_fork') ? 3 : 2
}

// === 附魔等级门槛 ===

/** 获取附魔触发等级门槛（统一 Lv.3） */
export function getMinEnchantmentLevel(_rarity?: number): number {
  return 3
}

// === 贪婪铭刻 (greedy_inscription) ===

/**
 * 附魔是否必定成功（贪婪铭刻）
 */
export function isEnchantGuaranteed(): boolean {
  return state.player.relics.has('greedy_inscription')
}

/**
 * 获取贪婪铭刻对目标分数的倍率
 * 每个拥有的附魔使目标分数 ×2
 * @returns 2^(附魔总数)，无遗物时返回 1
 */
export function getGreedyInscriptionTargetMult(): number {
  if (!state.player.relics.has('greedy_inscription')) return 1
  let totalEnch = 0
  for (const [, skill] of state.affixSkills) {
    totalEnch += skill.enchantmentIds.length
  }
  return totalEnch === 0 ? 1 : Math.pow(2, totalEnch)
}

// === 符文尖刺 (rune_spike) — 跨子系统暴击率遗物 ===

/** 符文尖刺：每个已附魔技能提供的暴击率 */
export const RUNE_SPIKE_RATE_PER_ENCHANT = 0.03

/** 每个已附魔的装备技能提供 +3% 全局暴击率 */
export function getRuneSpikeCritRate(): number {
  if (!state.player.relics.has('rune_spike')) return 0
  let enchantedCount = 0
  for (const [, skill] of state.affixSkills) {
    if (skill.enchantmentIds.length > 0) enchantedCount++
  }
  return enchantedCount * RUNE_SPIKE_RATE_PER_ENCHANT
}

// === 附魔锚点（已删除，保留空桩避免消费端报错） ===

/** @deprecated enchant_anchor 已删除，始终返回 0 */
export function getEnchantAnchorSlotBonus(): number {
  return 0
}

/** @deprecated enchant_anchor 已删除，始终返回 1 */
export function getEnchantAnchorPriceMultiplier(): number {
  return 1
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

}
