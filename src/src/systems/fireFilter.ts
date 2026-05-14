// ============================================
// 打字肉鸽 - 新 Affix 系统 · 统一 FireFilter 匹配
// ============================================
// 把 FireFilter 5 维（tag / posRel / resource / is_crit / stack_state）AND-聚合判定。
//
// 各维度复用现有代码：
//   - tag         → tagQuery.hasTag（新代码，已实装）
//   - posRel      → keyboardTopology.hasRelation
//   - resource    → 直接字符串比较（沿用 Resonance / ClassResourceFilter pattern）
//   - is_crit     → 直接布尔比较（沿用 TriggerResult.isCrit pattern）
//   - stack_state → 直接枚举比较（沿用 onStackEffectTriggered pattern）

import type { FireFilter } from '../data/affixV2Trigger'
import { hasRelation } from '../data/keyboardTopology'
import { hasTag, type FireEvent } from './tagQuery'
import { state } from '../core/state'

// re-export 方便调用方一站式 import
export type { FireFilter, FireEvent }
export type { Tag } from '../data/affixTags'

/**
 * 判断 FireEvent 是否匹配 FireFilter（5 维 AND 聚合）。
 *
 * 缺省字段 = 不限制该维度；存在字段 = 必须匹配。
 *
 * @param event       触发事件载荷
 * @param filter      过滤条件
 * @param listenerKey 监听方所在键位（posRel 解析需要）
 * @returns true 表示命中，false 表示不命中
 */
export function matchFireFilter(
  event: FireEvent,
  filter: FireFilter,
  listenerKey: string,
): boolean {
  // ── tag 维度 ──
  if (filter.tag !== undefined) {
    const tags = Array.isArray(filter.tag) ? filter.tag : [filter.tag]
    let tagHit = false
    for (const t of tags) {
      if (hasTag(event.sourceAffixId, t)) { tagHit = true; break }
    }
    if (!tagHit) return false
  }

  // ── posRel 维度（键盘拓扑邻接）──
  if (filter.posRel !== undefined) {
    if (!hasRelation(listenerKey, event.sourceKey, filter.posRel)) return false
  }

  // ── resource 维度（产出资源类型）──
  if (filter.resource !== undefined) {
    if (event.sourceResource !== filter.resource) return false
  }

  // ── is_crit 维度（事件子类型）──
  if (filter.is_crit !== undefined) {
    if (event.isCrit !== filter.is_crit) return false
  }

  // ── stack_state 维度（事件子类型）──
  if (filter.stack_state !== undefined) {
    if (event.stackState !== filter.stack_state) return false
  }

  // ── rarity 维度（来源 skill 稀有度 · 精确匹配）──
  if (filter.rarity !== undefined) {
    const srcRarity = state.affixSkills.get(event.sourceSkillId)?.rarity
    if (srcRarity !== filter.rarity) return false
  }

  return true
}
