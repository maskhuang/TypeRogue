// ============================================
// 打字肉鸽 - V2 词条作用域 → 键位解析（范围预览共用）
// ============================================
// workbench 拖拽预览 (shopWorkbench.highlightEffectRadius) 与
// 键盘 hover 预览 (shop.highlightSkillRange) 共用同一套 selector→keys 语义，
// 抽到此 leaf 模块避免两边重复 / 漂移（且 shopWorkbench 依赖 shop，不能反向 import）。

import type { EffectSpec, TargetSelector } from '../data/affixV2Trigger'
import { getAffixV2Definition } from '../data/affixV2'
import { getKeysWithRelation } from '../data/keyboardTopology'
import { state } from '../core/state'

/** 递归提取 effect 中的 TargetSelector（aura / fire_target / apply_status / add / multiply
 *  / grant_haste / upgrade_skill / graft_affix / gain_skill[neighborPosRel]）。
 *  无位置作用域的 effect（gain_resource / gain_proportional / stack_inc / noop）返回 undefined。 */
export function extractSelectorFromEffect(effect: EffectSpec): TargetSelector | undefined {
  switch (effect.kind) {
    case 'apply_aura':   return effect.selector
    case 'fire_target':  return effect.selector
    case 'apply_status': return effect.target
    case 'add':          return effect.selector
    case 'multiply':     return effect.selector
    case 'grant_haste':  return effect.selector             // haste 系（跳跃）也有作用域，需范围预览
    // meta-progression 操纵家族（on_battle_end）的邻位范围
    case 'upgrade_skill': return effect.selector                 // spear_make
    case 'graft_affix':   return effect.from                     // gaze_follow
    case 'gain_skill':                                           // imitate（teach 走 recipe_pool 无邻位 → 不高亮）
      return effect.filter.neighborPosRel !== undefined
        ? { type: 'neighbors', posRel: effect.filter.neighborPosRel }
        : undefined
    case 'composite': {
      for (const c of effect.effects) {
        const s = extractSelectorFromEffect(c)
        if (s) return s
      }
      return undefined
    }
    case 'conditional': {
      const t = extractSelectorFromEffect(effect.then)
      if (t) return t
      return effect.else ? extractSelectorFromEffect(effect.else) : undefined
    }
    case 'stack_release': return extractSelectorFromEffect(effect.release)
    default: return undefined
  }
}

/** TargetSelector → 高亮键列表（与 affixV2BattleIntegration.resolveSelectorToSkillIds 同语义）。
 *  occupiedKeys/occupiedSet = 该技能自身占据的键（多格技能含全部占位键）。 */
export function resolveSelectorToHighlightKeys(
  sel: TargetSelector,
  occupiedKeys: string[],
  occupiedSet: Set<string>,
): string[] {
  switch (sel.type) {
    case 'self':
      return []   // self 即占位本身，不额外高亮
    case 'neighbors': {
      const out = new Set<string>()
      for (const ok of occupiedKeys) {
        for (const k of getKeysWithRelation(ok, sel.posRel)) out.add(k)
      }
      return Array.from(out)
    }
    case 'all_skills': {
      const out: string[] = []
      for (const [k, sid] of state.player.bindings) {
        if (occupiedSet.has(k)) continue
        void sid
        out.push(k)
      }
      return out
    }
    case 'matched_tag': {
      const out: string[] = []
      for (const [k, sid] of state.player.bindings) {
        const sk = state.affixSkills.get(sid)
        if (!sk) continue
        const hit = sk.v2Ids?.some(id => {
          const d = getAffixV2Definition(id)
          return d?.tags.includes(sel.tag)
        })
        if (hit) out.push(k)
      }
      return out
    }
    case 'matched_resource': {
      const out: string[] = []
      for (const [k, sid] of state.player.bindings) {
        const sk = state.affixSkills.get(sid)
        if (sk?.resource === sel.resource) out.push(k)
      }
      return out
    }
    case 'hasted':
      // 运行时动态范围（依赖战斗内 haste 状态）· 预览无战斗态，不高亮
      return []
    case 'matched_rarity': {
      const out: string[] = []
      for (const [k, sid] of state.player.bindings) {
        const sk = state.affixSkills.get(sid)
        if (sk?.rarity === sel.rarity) out.push(k)
      }
      return out
    }
  }
}
