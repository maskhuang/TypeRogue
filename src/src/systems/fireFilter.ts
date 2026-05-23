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
import { hasRelation, triggerPosAnchor } from '../data/keyboardTopology'
import { hasTag, type FireEvent } from './tagQuery'
import { state } from '../core/state'
import { skillHasEffectiveTag } from './affixV2InheritedTags'
import { isFocused } from './affixV2State'

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
  // 命中条件：来源词条 def 携带该 tag，或来源 skill 经 inherit_tags 继承到该 tag
  // （宿主「拥有」继承 tag → 其 fire 视为带该 tag，on_fire(tag) 监听者随之触发）。
  if (filter.tag !== undefined) {
    const tags = Array.isArray(filter.tag) ? filter.tag : [filter.tag]
    let tagHit = false
    for (const t of tags) {
      if (hasTag(event.sourceAffixId, t) || skillHasEffectiveTag(event.sourceSkillId, t)) { tagHit = true; break }
    }
    if (!tagHit) return false
  }

  // ── posRel 维度（键盘拓扑邻接）──
  // 多格监听者：并集所有占位键 — 任一格与来源成 posRel 即命中
  // （与触发源预览 shopWorkbench.getTriggerSourceKeys 同口径，避免预览含 T 而实际不响应）
  if (filter.posRel !== undefined) {
    const listenerSkillId = state.player.bindings.get(listenerKey)
    let posHit = false
    if (listenerSkillId) {
      // trigger 锚：listener 技能所有 on_fire{posRel} 统一用其 trigger 锚（忽略 per-affix rolled posRel）
      const rel = triggerPosAnchor(listenerSkillId)
      for (const [k, sid] of state.player.bindings) {
        if (sid === listenerSkillId && hasRelation(k, event.sourceKey, rel)) { posHit = true; break }
      }
    } else {
      // 未绑定（预览/孤立）→ 无技能锚，退化用 rolled posRel
      posHit = hasRelation(listenerKey, event.sourceKey, filter.posRel)
    }
    if (!posHit) return false
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

  // ── marked 维度（来源 skill 是否为当前焦点）· "使用MARK技能时" = filter.marked===true ──
  if (filter.marked !== undefined) {
    if (isFocused(event.sourceSkillId) !== filter.marked) return false
  }

  return true
}
