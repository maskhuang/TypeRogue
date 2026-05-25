// ============================================
// 打字肉鸽 - 新 Affix 系统 · tag 继承（inherit_tags aura）
// ============================================
// inherit_tags aura：宿主 skill 拥有「来源 scope 内所有技能 own-tag 的并集」。
//   - apply_aura.selector 在此 modifier 下语义反转为「tag 来源 scope」；接收方恒为宿主自身。
//   - 继承的是技能层 tag 成员资格，不创造幻影词条（count(tag)/scale 计数不受影响）。
//   - 一跳继承：来源只取 own-tag，不取来源的继承 tag → 无递归。
//
// 本模块是叶子：只依赖 affixV2State（aura store）+ data 层 + core/state。
// 刻意不 import affixV2Equipped / fireFilter / battleIntegration——否则
// fireFilter → 本模块 → equipped → affixV2Trigger → fireFilter 成环。
// 宿主 skillId/key 由 AuraEntry 直接携带（addAura 透传），无需反查 _equipped。

import type { Tag } from '../data/affixTags'
import type { TargetSelector } from '../data/affixV2Trigger'
import { state } from '../core/state'
import { getAffixV2Definition } from '../data/affixV2'
import { hasRelation, scopePosAnchor } from '../data/keyboardTopology'
import { listActiveAuras } from './affixV2State'

/**
 * skill 自身（own）携带的 tag 集 = 其所有 v2 词条 def.tags 的并集。
 * 读 state.affixSkills[skillId].v2Ids——绑键 / 未绑键（IN-tray）皆可取，不含继承。
 */
export function getSkillOwnTags(skillId: string): Set<Tag> {
  const out = new Set<Tag>()
  const sk = state.affixSkills.get(skillId)
  if (!sk?.v2Ids) return out
  for (const defId of sk.v2Ids) {
    const def = getAffixV2Definition(defId)
    if (!def) continue
    for (const t of def.tags) out.add(t)
  }
  return out
}

/**
 * 把 inherit_tags 的「来源 scope」解析为 skill id 列表。
 * 仅用 own-tag 判定（matched_tag），杜绝继承递归；与 resolveSelectorToSkillIds 同口径子集，
 * 本模块自给以避免循环依赖。pick 量词在「计数/来源」语境下忽略（全取）。
 */
function resolveSourceScopeSkillIds(sel: TargetSelector, hostSkillId: string, hostKey: string): string[] {
  switch (sel.type) {
    case 'self':
      return [hostSkillId]
    case 'neighbors': {
      // 多格宿主：并集所有占位键（与 resolveSelectorToSkillIds / 范围预览同口径）
      const hostKeys: string[] = []
      for (const [k, sid] of state.player.bindings) {
        if (sid === hostSkillId) hostKeys.push(k)
      }
      if (hostKeys.length === 0) hostKeys.push(hostKey)
      const rel = scopePosAnchor(hostSkillId)  // scope 锚统一（与 resolveSelectorToSkillIds 同口径）
      const out: string[] = []
      for (const [k, sid] of state.player.bindings) {
        if (sid === hostSkillId) continue
        if (hostKeys.some(hk => hasRelation(hk, k, rel))) out.push(sid)
      }
      return out
    }
    case 'matched_tag': {
      const out: string[] = []
      for (const sid of state.affixSkills.keys()) {
        if (getSkillOwnTags(sid).has(sel.tag)) out.push(sid)
      }
      return out
    }
    case 'matched_resource':
      return [...state.affixSkills].filter(([, sk]) => sk.resource === sel.resource).map(([sid]) => sid)
    case 'matched_rarity':
      return [...state.affixSkills].filter(([, sk]) => sk.rarity === sel.rarity).map(([sid]) => sid)
    case 'all_skills':
      return [...state.affixSkills.keys()]
    case 'workbench':
      return [...state.player.inbox]
    case 'hasted':
      // 极速态 = 战斗运行时（_hasteBySkill），本模块刻意不依赖；继承语义也不挂靠极速 → 返空
      return []
    case 'marked':
      // 焦点 = 战斗运行时单焦点；继承语义不挂靠焦点（INHERIT_TAGS_SOURCE_POOL 已排除 marked）→ 返空
      return []
    case 'allied':
      // 结盟集 = 战斗运行时；继承语义不挂靠结盟（INHERIT_TAGS_SOURCE_POOL 已排除 allied）→ 返空
      return []
  }
}

/**
 * 宿主 skill 通过 inherit_tags aura 继承到的 tag 集（不含 own tag）。
 * 遍历活跃 aura：modifier=inherit_tags 且 sourceSkillId=本 skill（= 宿主携带）→
 * 并入 selector 来源 scope 内每个技能的 own-tag。
 */
export function getSkillInheritedTags(skillId: string): Set<Tag> {
  const out = new Set<Tag>()
  for (const aura of listActiveAuras()) {
    if (aura.modifier.type !== 'inherit_tags') continue
    if (aura.sourceSkillId !== skillId) continue
    const srcIds = resolveSourceScopeSkillIds(aura.selector, skillId, aura.sourceKey ?? '')
    for (const srcId of srcIds) {
      if (srcId === skillId) continue   // 自身 own tag 已单独覆盖，无需经继承再加
      for (const t of getSkillOwnTags(srcId)) out.add(t)
    }
  }
  return out
}

/** skill 的有效 tag = own ∪ inherited */
export function getSkillEffectiveTags(skillId: string): Set<Tag> {
  const out = getSkillOwnTags(skillId)
  for (const t of getSkillInheritedTags(skillId)) out.add(t)
  return out
}

/** skill 是否（含继承地）携带某 tag · 先查 own（廉价），未命中再查继承 */
export function skillHasEffectiveTag(skillId: string, tag: Tag): boolean {
  if (getSkillOwnTags(skillId).has(tag)) return true
  return getSkillInheritedTags(skillId).has(tag)
}
