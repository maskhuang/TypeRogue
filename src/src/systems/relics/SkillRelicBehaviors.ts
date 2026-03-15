// ============================================
// 打字肉鸽 - 技能系统（词条制）遗物行为 (Story 36.4)
// ============================================

import { state, synergy } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'
import type { AffixType } from '../../data/affixes'

/** 无冕之王 Lv4+ 每级递增倍率 */
export const UK_GROWTH_RATE = 1.6

// === 首发强化 (first_strike) ===

/**
 * 获取首发强化加成
 * 每词第一个技能触发时产出 +20%
 * @returns 0.2 当持有遗物且为本词第一个技能；否则 0
 */
export function getFirstStrikeBonus(): number {
  if (!state.player.relics.has('first_strike')) return 0
  // wordSkillCount 在 triggerAffixSkillWithFeedback 入口处 ++ 后为 1 表示第一个
  if (synergy.wordSkillCount !== 1) return 0
  return 0.2
}

// === 少而精 (less_is_more) ===

/**
 * 获取少而精加成
 * 装备技能 <10 时产出 +20%
 * @returns 0.2 当持有遗物且技能数 <10；否则 0
 */
export function getLessIsMoreBonus(): number {
  if (!state.player.relics.has('less_is_more')) return 0
  if (state.player.skills.size >= 10) return 0
  return 0.2
}

// === 集训手册 (training_manual) ===

/**
 * 应用集训手册效果 — 一次性将所有 Lv.1 技能升至 Lv.2
 * @returns 升级的技能 ID 列表
 */
export function applyTrainingManual(): string[] {
  const upgradedIds: string[] = []
  for (const [skillId, data] of state.player.skills) {
    if (data.level === 1) {
      data.level = 2
      const affixSkill = state.affixSkills.get(skillId)
      if (affixSkill) affixSkill.level = 2
      upgradedIds.push(skillId)
    }
  }
  return upgradedIds
}

// === 爵士乐 (jazz) ===

/** 本词已触发的不同词条类型 */
const _wordAffixTypes = new Set<AffixType>()

/**
 * 追踪本词触发的词条类型
 * @param affixes 触发技能的词条列表
 */
export function trackWordAffixTypes(affixes: Array<{ type: AffixType }>): void {
  if (!state.player.relics.has('jazz')) return
  for (const affix of affixes) {
    _wordAffixTypes.add(affix.type)
  }
}

/**
 * 获取本词已触发的词条类型数
 */
export function getWordAffixTypeCount(): number {
  return _wordAffixTypes.size
}

/**
 * 重置本词词条类型追踪
 */
export function resetWordAffixTypes(): void {
  _wordAffixTypes.clear()
}

/**
 * 检查爵士乐加成
 * N ≥ 3 时返回 0.1 * N（得分加成比例），否则 0
 */
export function checkJazzBonus(): number {
  if (!state.player.relics.has('jazz')) return 0
  const n = _wordAffixTypes.size
  if (n < 3) return 0
  return 0.1 * n
}

// === 无冕之王 (uncrowned_king) ===

/**
 * 检查是否持有无冕之王
 */
export function hasUncrownedKing(): boolean {
  return state.player.relics.has('uncrowned_king')
}

/**
 * 计算 Lv4+ 技能的 baseValue（无冕之王）
 * Lv4+ 按 Lv3 值 × 1.6^(level-3) 递增
 * @param level 技能等级（≥4）
 * @param baseValues [Lv1, Lv2, Lv3] 基础值数组
 * @returns 计算后的 baseValue
 */
export function getUncrownedKingBaseValue(
  level: number,
  baseValues: [number, number, number],
): number {
  if (level <= 3) return baseValues[level - 1]
  return baseValues[2] * Math.pow(UK_GROWTH_RATE, level - 3)
}

/**
 * 检查是否应阻止技能获得附魔
 * 有无冕之王 + 技能无附魔 → 阻止
 * @param enchantmentIds 技能的附魔列表
 * @returns true 表示应阻止附魔
 */
export function shouldBlockEnchantment(enchantmentIds: string[]): boolean {
  if (!state.player.relics.has('uncrowned_king')) return false
  return enchantmentIds.length === 0
}

// === 模块重置（关级别） ===

/**
 * 重置关级别状态 — 在 startLevel() 中调用
 */
export function resetSkillRelicState(): void {
  _wordAffixTypes.clear()
}

// === 注册所有行为 ===

/**
 * 初始化技能子系统遗物行为注册
 */
export function initSkillRelicBehaviors(): void {
  registerRelicBehavior('training_manual', (_relicId, _context) => {
    // 实际逻辑在 applyTrainingManual() 中，由 shop.ts 购买时调用
  })

  registerRelicBehavior('jazz_diversity', (_relicId, _context) => {
    // 实际逻辑在 trackWordAffixTypes() / checkJazzBonus() 中
  })

  registerRelicBehavior('uncrowned_king', (_relicId, _context) => {
    // 实际逻辑在 hasUncrownedKing() / shouldBlockEnchantment() 中
  })
}
