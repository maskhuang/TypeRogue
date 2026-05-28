// ============================================
// 打字肉鸽 - 新 Affix 系统 · 装配登记表 + Battle Hook（ghost 模式）
// ============================================
// "Ghost 模式"——V2 affix 在战斗中真正 evaluate + resolve，
// 但 resourceProduced 仅 log，不实际改战斗 ledger。
// 用于验证 trigger/effect 在真实战斗事件流下的行为，不破坏现有 gameplay。
//
// 真正接入战斗 ledger 是后续工作（产出 → state.battle.resources）。
//
// 设计文档: affix-rewrite-research.md §5

import type { AffixV2Instance } from '../data/affixV2'
import { getAffixV2Definition, getAffixV2UseLimit } from '../data/affixV2'
import { state as gameState } from '../core/state'
import { BALANCE } from '../core/constants'
import { hasRelation, getKeysWithRelation, scopePosAnchor } from '../data/keyboardTopology'
import type { Tag } from '../data/affixTags'
import { getMinEnchantmentLevel } from './relics/EnchantmentRelicBehaviors'

/** 把 (resource)→base 回调按 skill 等级柯里化为 Lv.N 查询 ·
 *  resourceLv1Base 接受可选 level 参数（defaultResourceLv1Base），缺省 Lv1 */
function lvNBaseFor(
  skillId: string,
  resourceLv1Base: (r: string, level?: number) => number,
): (r: string) => number {
  const level = gameState.affixSkills.get(skillId)?.level ?? 1
  return (r: string) => resourceLv1Base(r, level)
}

/** 把 EquippedEntry hydrate 为 EquippedView（带 def.tags）·
 *  def 缺失（动态定义被取消注册）→ 跳过 */
function toView(entry: EquippedEntry): EquippedView | null {
  const def = getAffixV2Definition(entry.defId)
  if (!def) return null
  return { defId: entry.defId, skillId: entry.skillId, key: entry.key, instanceId: entry.instanceId, tags: def.tags }
}

/** 收集 scope 内所有 skill id（用于把 scope 解析为 entries 列表）·
 *  与 resolveSelectorToSkillIds 同语义，但这里不依赖 _selectorResolver 以保持模块自给 */
function collectSkillIdsForScope(
  scope: TargetSelector,
  sourceSkillId: string,
  sourceKey: string,
): string[] {
  switch (scope.type) {
    case 'self':
      return [sourceSkillId]
    case 'neighbors': {
      // 多格技能：邻位关系并集所有占位键（与 resolveSelectorToSkillIds / 范围预览同口径）。
      // 就地收集源技能占位键，避免 import bindingManager 形成循环依赖。
      const srcKeys: string[] = []
      for (const [k, sid] of gameState.player.bindings) {
        if (sid === sourceSkillId) srcKeys.push(k)
      }
      if (srcKeys.length === 0) srcKeys.push(sourceKey)
      const rel = scopePosAnchor(sourceSkillId)  // scope 锚统一（与 resolveSelectorToSkillIds 同口径）
      const out: string[] = []
      for (const [k, sid] of gameState.player.bindings) {
        if (sid === sourceSkillId) continue
        if (srcKeys.some(sk => hasRelation(sk, k, rel))) out.push(sid)
      }
      return out
    }
    case 'matched_resource':
      return [...gameState.affixSkills]
        .filter(([, sk]) => sk.resource === scope.resource)
        .map(([sid]) => sid)
    case 'matched_tag': {
      const seen = new Set<string>()
      for (const e of _equipped.values()) {
        if (seen.has(e.skillId)) continue
        const d = getAffixV2Definition(e.defId)
        if (d?.tags.includes(scope.tag)) seen.add(e.skillId)
      }
      return [...seen]
    }
    case 'matched_rarity':
      return [...gameState.affixSkills]
        .filter(([, sk]) => sk.rarity === scope.rarity)
        .map(([sid]) => sid)
    case 'all_skills':
      return [...gameState.affixSkills.keys()]
    case 'workbench':
      // IN-tray 未装配技能（已拥有但未绑键）· 主用作 inherit_tags 的 tag 来源
      return [...gameState.player.inbox]
    case 'hasted':
      // 装备态/预览无战斗态，无法判定极速 · effect 目标解析走 _selectorResolver（战斗态），不经此 stub；
      // 此处仅 scale-tag 计数会调用，而 SCALE_SCOPE_POOL 不含 hasted → 返空安全
      return []
    case 'marked':
      // 焦点 = 战斗运行时单焦点寄存器 · 同 hasted：装备态/预览无战斗态 → 返空安全（SCALE_SCOPE_POOL 不含 marked）
      return []
    case 'allied':
      // 结盟集 = 战斗运行时动态 · 同 hasted/marked：装备态/预览无战斗态 → 返空安全（SCALE_SCOPE_POOL 不含 allied）
      return []
  }
}

/** tooltip 预览用：统计 scale source 在 scope 内的单位数（与运行时 countScaleSource 同口径）·
 *  tag → scope 内含 tag 的词条数；resource/rarity → scope 内匹配的技能数；
 *  empty → 与宿主 posRel 的空键位数（需宿主 key）；targetScore → 当前关目标分数档（全程可预览）；
 *  affixName → scope 内携带同 defId 词条的去重技能数（需 hostDefId）。
 *  无法在当前上下文解析时返 null（neighbors/empty 缺宿主键位、self/hasted、affixName 缺 hostDefId）→ 预览只显规则。*/
export function previewCountScaleSource(
  source: ScaleCountSource,
  scope: TargetSelector | undefined,
  hostSkillId?: string,
  hostKey?: string,
  hostDefId?: string,
): number | null {
  if (source.by === 'empty') {
    if (hostKey === undefined) return null
    let n = 0
    for (const k of getKeysWithRelation(hostKey, source.posRel)) {
      if (!gameState.player.bindings.has(k)) n++
    }
    return n
  }
  if (source.by === 'targetScore') return Math.round(gameState.targetScore / BALANCE.TARGET_BASE)
  if (source.by === 'hasted') return null   // 极速数运行时动态 · 预览无战斗态 → 只显规则不显数
  if (source.by === 'allied') return null   // 结盟数运行时动态 · 预览无战斗态 → 只显规则不显数
  if (source.by === 'critChance') return null   // 暴击率含遗物/词效战斗动态项 · 预览无战斗态 → 只显规则不显数
  const sc: TargetSelector = scope ?? { type: 'all_skills' }
  if (sc.type === 'self' || sc.type === 'hasted') return null
  if (sc.type === 'neighbors' && (hostSkillId === undefined || hostKey === undefined)) return null
  const skillIds = new Set(collectSkillIdsForScope(sc, hostSkillId ?? '', hostKey ?? ''))
  if (source.by === 'tag') {
    const tags = Array.isArray(source.tag) ? source.tag : [source.tag]
    let n = 0
    for (const e of _equipped.values()) {
      if (!skillIds.has(e.skillId)) continue
      const def = getAffixV2Definition(e.defId)
      if (def && tags.some(t => def.tags.includes(t))) n++
    }
    return n
  }
  if (source.by === 'affixName') {
    if (hostDefId === undefined) return null   // 预览缺宿主 defId → 只显规则
    const skills = new Set<string>()
    for (const e of _equipped.values()) {
      if (!skillIds.has(e.skillId)) continue
      if (e.defId === hostDefId) skills.add(e.skillId)
    }
    return skills.size
  }
  // resource / rarity：数 scope 内匹配的技能
  let n = 0
  for (const id of skillIds) {
    const sk = gameState.affixSkills.get(id)
    if (!sk) continue
    if (source.by === 'resource' ? sk.resource === source.resource : sk.rarity === source.rarity) n++
  }
  return n
}

/** 为给定 entry 构建 queryEquipped(scope) ·
 *  scope=self 特殊处理（返回本 affix 自身，不展开到同 skill 其他 affix）·
 *  其它 scope → 解析为 skill ids，收集这些 skill 上的全部装备 entry */
function buildQueryEquipped(entry: EquippedEntry): (scope: TargetSelector) => readonly EquippedView[] {
  return (scope) => {
    if (scope.type === 'self') {
      const v = toView(entry)
      return v ? [v] : []
    }
    const skillIds = new Set(collectSkillIdsForScope(scope, entry.skillId, entry.key))
    const out: EquippedView[] = []
    for (const e of _equipped.values()) {
      if (!skillIds.has(e.skillId)) continue
      const v = toView(e)
      if (v) out.push(v)
    }
    return out
  }
}
import { evaluateTrigger, type TriggerContext } from './affixV2Trigger'
import { resolveEffect, type ResolveContext, type ResolveResult, type EquippedView } from './affixV2Effect'
import { applyEnchantToEffect, type EnchantSpec } from '../data/affixV2Enchant'

// ============================================
// V2 附魔层 store · 按 instanceId 索引
// ============================================

const _enchants: Map<string, EnchantSpec> = new Map()

/** 给指定 instance 设置附魔（覆盖原附魔；Bazaar 规则：一物一附魔）*/
export function setEnchant(instanceId: string, enchant: EnchantSpec): void {
  _enchants.set(instanceId, enchant)
}

/** 查询 instance 的附魔（无则 undefined）*/
export function getEnchant(instanceId: string): EnchantSpec | undefined {
  return _enchants.get(instanceId)
}

/** 移除指定 instance 的附魔 */
export function clearEnchant(instanceId: string): void {
  _enchants.delete(instanceId)
}

/** 清空全部附魔（切 run / battle end 用）*/
export function clearAllEnchants(): void {
  _enchants.clear()
}

/** 列出全部附魔（UI / 调试用）*/
export function listAllEnchants(): ReadonlyMap<string, EnchantSpec> {
  return _enchants
}

// ============================================
// Lv.3 附魔触发 · 待处理队列（局内升级到 Lv.3 时弹不了 picker，入队留到 shop 处理）
// ============================================
// run 级（跨战斗保留：局内入队 → 进 shop 处理）· clearAllEquipped（切 run）时清空。

const _pendingV2EnchantSkillIds: string[] = []

/** 升级到达附魔门槛（Lv.3）时登记 · 仅"跨越"门槛那一次入队（prev<门槛 且 new≥门槛）·
 *  局内升级（applySkillUpgrade / 学徒附魔）无法弹 picker，入队留待 shop processPendingV2Enchants 处理，避免丢失。
 *  商店升级有自己的即时路径（checkAutoEnchantment），不走此队列。*/
export function notePotentialLv3Enchant(skillId: string, prevLevel: number, newLevel: number): void {
  const min = getMinEnchantmentLevel()
  if (prevLevel >= min || newLevel < min) return
  if (!_pendingV2EnchantSkillIds.includes(skillId)) _pendingV2EnchantSkillIds.push(skillId)
}

/** 取出并清空待附魔队列（shop 处理入口调用）*/
export function takePendingV2EnchantSkillIds(): string[] {
  return _pendingV2EnchantSkillIds.splice(0)
}
import {
  getInstanceState,
  resetAllAffixV2State,
  getApprenticeProgress,
  clearApprenticeProgress,
  clearAllApprenticeProgress,
} from './affixV2State'
import { apprenticeNextThreshold } from '../data/affixV2Enchant'
import type { FireEvent } from './fireFilter'
import type { TargetSelector, ScaleCountSource } from '../data/affixV2Trigger'

/** 学徒附魔副作用 · 每次本词条 trigger 命中调一次 ·
 *  累加 progress；达 3 × 2^(skill.level - 1) → skill.level++（无上限）。
 *  非学徒附魔的 instance 早出。 */
function recordApprenticeTriggerHit(entry: EquippedEntry): void {
  const enchant = _enchants.get(entry.instanceId)
  if (!enchant || enchant.id !== 'apprentice') return
  const skill = gameState.affixSkills.get(entry.skillId)
  if (!skill) return
  const prog = getApprenticeProgress(entry.instanceId)
  prog.progress += 1
  const prevLevel = skill.level
  // while 而非 if：进度可能跨多级（一般 +1 不会，但保险）
  while (prog.progress >= apprenticeNextThreshold(skill.level)) {
    prog.progress -= apprenticeNextThreshold(skill.level)
    skill.level += 1
  }
  // 局内升级跨越 Lv.3 → 入队，留待 shop 弹 picker（避免丢失附魔机会）
  if (skill.level !== prevLevel) notePotentialLv3Enchant(entry.skillId, prevLevel, skill.level)
}

// === resolveSelector 注入点（integration 层提供，避免循环依赖）===
type SelectorResolver = (sel: TargetSelector, sourceSkillId: string, sourceKey: string) => readonly string[]
let _selectorResolver: SelectorResolver | undefined
export function setSelectorResolver(fn: SelectorResolver): void {
  _selectorResolver = fn
}

// ============================================
// V2 装配登记表
// ============================================
// 每个 skill 上可挂多个 V2 affix（每个 instance 有唯一 id）。

interface EquippedEntry {
  readonly instanceId: string
  readonly skillId: string
  readonly key: string             // 所在键位
  readonly defId: string            // 指向 AffixV2Definition.id
}

const _equipped: Map<string, EquippedEntry> = new Map()  // instanceId → entry
const _bySkill: Map<string, string[]> = new Map()         // skillId → instanceIds[]

/** 装配 V2 affix · skillId+key+defId → 生成 instanceId 自动登记 */
export function equipAffixV2(skillId: string, key: string, defId: string, instanceId?: string): string {
  const id = instanceId ?? `v2_${defId}_${skillId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  _equipped.set(id, { instanceId: id, skillId, key, defId })
  const list = _bySkill.get(skillId) ?? []
  list.push(id)
  _bySkill.set(skillId, list)
  return id
}

/** 卸下指定 instance */
export function unequipAffixV2(instanceId: string): void {
  const entry = _equipped.get(instanceId)
  if (!entry) return
  _equipped.delete(instanceId)
  _enchants.delete(instanceId)   // 同步清附魔，避免孤立 enchant 状态
  clearApprenticeProgress(instanceId)   // 学徒进度跟随 instance 生灭
  const list = _bySkill.get(entry.skillId)
  if (list) {
    const idx = list.indexOf(instanceId)
    if (idx >= 0) list.splice(idx, 1)
  }
}

/** 卸下 skill 上所有 V2 affix（解绑时调用）*/
export function unequipAllOnSkill(skillId: string): void {
  const ids = _bySkill.get(skillId)
  if (!ids) return
  for (const id of [...ids]) unequipAffixV2(id)
  _bySkill.delete(skillId)
}

/** 查 skill 上的所有 V2 instance */
export function getEquippedOnSkill(skillId: string): readonly AffixV2Instance[] {
  const ids = _bySkill.get(skillId) ?? []
  return ids.map(id => ({ defId: _equipped.get(id)!.defId }))
}

/** 列出全部 entry · 测试/调试用 */
export function listAllEquipped(): readonly EquippedEntry[] {
  return Array.from(_equipped.values())
}

/** 从宿主 skill 移除一个 V2 词条（用完消失）· 同步 v2Ids / rarity / v2Uses ·
 *  applyAffixGraft 的逆操作（rarity 回落到剩余 v2 词条数）。 */
function removeV2AffixFromSkill(skillId: string, defId: string): void {
  const skill = gameState.affixSkills.get(skillId)
  if (!skill?.v2Ids) return
  skill.v2Ids = skill.v2Ids.filter(id => id !== defId)
  // 稀有度 = 词条数 - 1（0/1/2/3 ↔ 1/2/3/4 词条）· 词条耗尽则回落 rarity 0
  skill.rarity = Math.max(0, Math.min(3, skill.v2Ids.length - 1)) as typeof skill.rarity
  if (skill.v2Uses) delete skill.v2Uses[defId]
}

/** tool/认知词条「用完消失」计数 · processV2Results 在每次事件结算后调一次 ·
 *  对传入的每个触发过的 instanceId（同一调用内去重）：若其 def 带 tool tag，
 *  宿主 skill 的该 defId 使用数 +1；达上限则从 skill 移除 + unequip 运行时 instance。
 *  使用计数挂在持久 skill 对象上（按 defId），故能跨关累积——
 *  _equipped 每关 battle:start 重建 instanceId，不能作为跨关锚点。
 *  返回被移除的 {skillId, defId}[]（供 caller 做 UI 反馈 / 日志）。 */
export function chargeToolAffixUses(instanceIds: Iterable<string>): { skillId: string; defId: string }[] {
  const removed: { skillId: string; defId: string }[] = []
  const seen = new Set<string>()
  for (const id of instanceIds) {
    if (seen.has(id)) continue
    seen.add(id)
    const entry = _equipped.get(id)
    if (!entry) continue
    const def = getAffixV2Definition(entry.defId)
    if (!def) continue
    // 永恒(eternal)：移除使用次数限制 —— 此词条不计 use、不消失
    if (_enchants.get(id)?.id === 'eternal') continue
    const limit = getAffixV2UseLimit(def)
    if (limit == null) continue
    const skill = gameState.affixSkills.get(entry.skillId)
    if (!skill) continue
    const uses = (skill.v2Uses ??= {})
    uses[entry.defId] = (uses[entry.defId] ?? 0) + 1
    if (uses[entry.defId] >= limit) {
      removeV2AffixFromSkill(entry.skillId, entry.defId)
      unequipAffixV2(id)
      removed.push({ skillId: entry.skillId, defId: entry.defId })
    }
  }
  return removed
}

/** 清空（unequip 全部）· 用于切 run / reset */
export function clearAllEquipped(): void {
  _equipped.clear()
  _bySkill.clear()
  _enchants.clear()
  _pendingV2EnchantSkillIds.length = 0
  clearAllApprenticeProgress()
}

// ============================================
// Battle event hooks · ghost 模式
// ============================================

/** 全局 fire log（ghost 模式，记录 resolved 结果，不改战斗 ledger）*/
const _ghostLog: GhostLogEntry[] = []

export interface GhostLogEntry {
  readonly timestamp: number
  readonly instanceId: string
  readonly defId: string
  readonly trigger: string
  readonly result: ResolveResult
}

export function getGhostLog(): readonly GhostLogEntry[] {
  return _ghostLog
}

export function clearGhostLog(): void {
  _ghostLog.length = 0
}

// ============================================
// Hook 入口 · 调用方按事件类型挑一个
// ============================================

/**
 * skill fire 时调用——遍历该 skill 上的 V2 instance，评估 trigger，命中则 resolve。
 *
 * @param skillId      触发的 skill
 * @param fireEvent    fire 事件（资源 / crit / stack 等信息）
 * @param resourceLv1Base  资源 → Lv1 base 查询
 * @param getPlayerResource 玩家资源池查询
 * @returns 所有命中 instance 的 resolve 结果
 */
/** 触发结果 · 带 source 信息便于 caller dispatch */
export interface SourcedResult {
  readonly sourceInstanceId: string
  readonly sourceSkillId: string
  readonly sourceKey: string
  readonly result: ResolveResult
}

export function hookOnSkillFire(
  skillId: string,
  fireEvent: FireEvent,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
): SourcedResult[] {
  const results: SourcedResult[] = []

  // ── 1. on_self_fire: 仅触发 skill 上的 V2 affix ──
  const selfIds = _bySkill.get(skillId) ?? []
  const selfLvBase = lvNBaseFor(skillId, resourceLv1Base)
  for (const id of selfIds) {
    const entry = _equipped.get(id)
    if (!entry) continue
    const def = getAffixV2Definition(entry.defId)
    if (!def) continue
    if (def.trigger.type !== 'on_self_fire') continue

    // 评估 trigger
    const triggerCtx: TriggerContext = {
      selfAffixId: entry.defId,
      selfKey: entry.key,
      event: fireEvent,
      affixKeyCount: getInstanceState(id).affixKeyCount,
    }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    // 命中 → resolve
    const ctx: ResolveContext = {
      instanceId: id,
      skillId,
      key: entry.key,
      skillResource: fireEvent.sourceResource,
      skillResourceLv1Base: selfLvBase(fireEvent.sourceResource),
      resourceLv1Base: selfLvBase,
      nowMs,
      isCrit: fireEvent.isCrit,
      currentWordLength: 0,    // skill fire context, no word context
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: id, sourceSkillId: skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: id,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }

  // ── 2. on_fire(filter): 全局 broadcast，所有 V2 affix 监听 ──
  // 每个 source affix（触发 skill 上的 V2 affix）都广播一次 event，
  // 让 on_fire(filter) 的 tag/resource/is_crit/posRel/stack_state filter 能精确匹配。
  // 如果 skill 没有 V2 affix，使用 sourceAffixId=skillId 作 fallback（tag filter 不会匹配）。
  const sourceAffixIds: string[] = selfIds.length > 0
    ? selfIds.map(id => _equipped.get(id)!.defId)
    : [skillId]  // fallback for non-V2 skills

  for (const sourceDefId of sourceAffixIds) {
    const broadcastEvent: FireEvent = { ...fireEvent, sourceAffixId: sourceDefId }
    for (const entry of _equipped.values()) {
      const def = getAffixV2Definition(entry.defId)
      if (!def || def.trigger.type !== 'on_fire') continue

      // chain（fire_target）的 on_fire(marked)：仅监听「其他」焦点技能 fire —— 跳过本技能自身 fire。
      // 否则本技能身为焦点时 fire 自身 → 自身 marked 监听命中 → fire_target 重触发 → 无限自激
      // （marked 是运行时动态焦点，无法在生成期按值去自身化，故在此按效果类型排除）。
      if (
        def.trigger.filter?.marked !== undefined &&
        def.effect.kind === 'fire_target' &&
        entry.skillId === broadcastEvent.sourceSkillId
      ) continue

      const triggerCtx: TriggerContext = {
        selfAffixId: entry.defId,
        selfKey: entry.key,
        event: broadcastEvent,
      }
      if (!evaluateTrigger(def.trigger, triggerCtx)) continue

      const entryLvBase = lvNBaseFor(entry.skillId, resourceLv1Base)
      const ctx: ResolveContext = {
        instanceId: entry.instanceId,
        skillId: entry.skillId,
        key: entry.key,
        skillResource: broadcastEvent.sourceResource,
        skillResourceLv1Base: entryLvBase(broadcastEvent.sourceResource),
        resourceLv1Base: entryLvBase,
        nowMs,
        isCrit: broadcastEvent.isCrit,
        currentWordLength: 0,
        hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
        getPlayerResource,
        queryEquipped: buildQueryEquipped(entry),
      }
      const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
      results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

      _ghostLog.push({
        timestamp: nowMs,
        instanceId: entry.instanceId,
        defId: entry.defId,
        trigger: def.trigger.type,
        result,
      })
      recordApprenticeTriggerHit(entry)
    }
  }

  return results
}

/**
 * on_key 全局 hook · 每次击键调用（不分 skill）
 * 遍历所有 V2 instance，命中 on_key trigger 的 resolve。
 * 同时累加每个 instance 的 affixKeyCount（用于 every_n_keys / affix_key_count_gte）。
 */
export function hookOnKey(
  nowMs: number,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
): SourcedResult[] {
  const results: SourcedResult[] = []
  for (const entry of _equipped.values()) {
    const def = getAffixV2Definition(entry.defId)
    if (!def) continue
    const state = getInstanceState(entry.instanceId)
    state.affixKeyCount += 1   // 累加 per-affix 按键计数

    // passive 在战斗事件流中跳过
    if (def.trigger.type === 'passive') continue
    // on_key hook 只处理 on_key 和 every_n_keys
    if (def.trigger.type !== 'on_key' && def.trigger.type !== 'every_n_keys') continue

    const triggerCtx: TriggerContext = {
      selfAffixId: entry.defId,
      selfKey: entry.key,
      affixKeyCount: state.affixKeyCount,
    }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const lvBase = lvNBaseFor(entry.skillId, resourceLv1Base)
    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: lvBase('score'),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }
  return results
}

/**
 * on_word_end 全局 hook · 词末调用一次
 * 遍历所有 V2 instance，命中 on_word_end / every_n_keys / etc. 的 resolve。
 */
export function hookOnWordEnd(
  nowMs: number,
  currentWordLength: number,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
): SourcedResult[] {
  const results: SourcedResult[] = []
  for (const entry of _equipped.values()) {
    const def = getAffixV2Definition(entry.defId)
    if (!def) continue
    const state = getInstanceState(entry.instanceId)

    // passive 在战斗事件流中跳过
    if (def.trigger.type === 'passive') continue
    // word_end hook 只处理 on_word_end
    if (def.trigger.type !== 'on_word_end') continue

    const triggerCtx: TriggerContext = {
      selfAffixId: entry.defId,
      selfKey: entry.key,
      affixKeyCount: state.affixKeyCount,
      isWordEnd: true,
    }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const lvBase = lvNBaseFor(entry.skillId, resourceLv1Base)
    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: lvBase('score'),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      queryEquipped: buildQueryEquipped(entry),
      resolveSelector: _selectorResolver,
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }
  return results
}

/**
 * haste:granted 全局 hook · 任一 skill 获得极速时调
 * 遍历 on_haste_granted trigger 的 V2 instance，scope 内含 grantedSkillId 才命中。
 * scope 缺省 = self（仅监听本 affix 所在 skill）。
 */
export function hookOnHasteGranted(
  grantedSkillId: string,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
): SourcedResult[] {
  const results: SourcedResult[] = []
  for (const entry of _equipped.values()) {
    const def = getAffixV2Definition(entry.defId)
    if (!def || def.trigger.type !== 'on_haste_granted') continue

    // scope 匹配：缺省 self
    const scope: TargetSelector = def.trigger.scope ?? { type: 'self' }
    let inScope = false
    if (scope.type === 'self') {
      inScope = entry.skillId === grantedSkillId
    } else if (_selectorResolver) {
      const targets = _selectorResolver(scope, entry.skillId, entry.key)
      inScope = targets.includes(grantedSkillId)
    }
    if (!inScope) continue

    const triggerCtx: TriggerContext = {
      selfAffixId: entry.defId,
      selfKey: entry.key,
      grantedSkillId,
    }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const lvBase = lvNBaseFor(entry.skillId, resourceLv1Base)
    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: lvBase('score'),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }
  return results
}

/**
 * haste:emitted 全局 hook · 任一 skill「发出/给予」极速时调（grant_haste 的源侧 · on_haste_granted 的镜像）。
 * 遍历 on_haste_emitted trigger 的 V2 instance，scope 内含 emitterSkillId（源/施加方 skill）才命中。
 * scope 缺省 = self（仅当本 affix 所在 skill 自己发出极速时触发）。
 * relic 等无源 skill 的极速施加由调用方传 emitterSkillId=空 → 不进本 hook。
 * 与 on_haste_granted 同纪律：无 grant_haste 源时永不触发（reactive build-around）。
 */
export function hookOnHasteEmitted(
  emitterSkillId: string,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
): SourcedResult[] {
  const results: SourcedResult[] = []
  for (const entry of _equipped.values()) {
    const def = getAffixV2Definition(entry.defId)
    if (!def || def.trigger.type !== 'on_haste_emitted') continue

    // scope 匹配：缺省 self（与 on_haste_granted 同口径，但匹配的是「源 skill」）
    const scope: TargetSelector = def.trigger.scope ?? { type: 'self' }
    let inScope = false
    if (scope.type === 'self') {
      inScope = entry.skillId === emitterSkillId
    } else if (_selectorResolver) {
      const targets = _selectorResolver(scope, entry.skillId, entry.key)
      inScope = targets.includes(emitterSkillId)
    }
    if (!inScope) continue

    const triggerCtx: TriggerContext = {
      selfAffixId: entry.defId,
      selfKey: entry.key,
      emitterSkillId,
    }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const lvBase = lvNBaseFor(entry.skillId, resourceLv1Base)
    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: lvBase('score'),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }
  return results
}

/**
 * mark 焦点变更全局 hook · 焦点 granted/lost 时调（mark:granted / mark:lost 事件驱动）。
 * 遍历对应 on_mark_granted / on_mark_lost trigger 的 V2 instance，scope 内含 markedSkillId 才命中。
 * scope 缺省 = self（仅监听本 affix 所在 skill）· 与 on_haste_granted 同结构。
 * 与 on_haste_granted 同纪律：无 apply_mark 源时永不触发（reactive build-around）。
 */
function hookOnMarkChange(
  triggerType: 'on_mark_granted' | 'on_mark_lost',
  markedSkillId: string,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
): SourcedResult[] {
  const results: SourcedResult[] = []
  for (const entry of _equipped.values()) {
    const def = getAffixV2Definition(entry.defId)
    if (!def || def.trigger.type !== triggerType) continue

    // scope 匹配：缺省 self（与 on_haste_granted 同口径）
    const scope: TargetSelector = def.trigger.scope ?? { type: 'self' }
    let inScope = false
    if (scope.type === 'self') {
      inScope = entry.skillId === markedSkillId
    } else if (_selectorResolver) {
      const targets = _selectorResolver(scope, entry.skillId, entry.key)
      inScope = targets.includes(markedSkillId)
    }
    if (!inScope) continue

    const triggerCtx: TriggerContext = {
      selfAffixId: entry.defId,
      selfKey: entry.key,
      markedSkillId,
    }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const lvBase = lvNBaseFor(entry.skillId, resourceLv1Base)
    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: lvBase('score'),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }
  return results
}

/** mark:granted 全局 hook · 任一 skill 成为焦点时调 */
export function hookOnMarkGranted(
  markedSkillId: string,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
): SourcedResult[] {
  return hookOnMarkChange('on_mark_granted', markedSkillId, resourceLv1Base, getPlayerResource, nowMs)
}

/** mark:lost 全局 hook · 任一 skill 失去焦点时调 */
export function hookOnMarkLost(
  markedSkillId: string,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
): SourcedResult[] {
  return hookOnMarkChange('on_mark_lost', markedSkillId, resourceLv1Base, getPlayerResource, nowMs)
}

/**
 * ally:joined 全局 hook · 任一 skill 加入结盟时调（ally:joined 事件驱动）。
 * 遍历 on_ally_joined trigger 的 V2 instance，scope 内含 alliedSkillId 才命中。
 * scope 缺省 = self（仅监听本 affix 所在 skill 入盟）· 与 hookOnMarkChange 同结构。
 * 与 on_mark_granted 同纪律：无 apply_ally 源时永不触发（reactive build-around）。
 */
export function hookOnAllyJoined(
  alliedSkillId: string,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
): SourcedResult[] {
  const results: SourcedResult[] = []
  for (const entry of _equipped.values()) {
    const def = getAffixV2Definition(entry.defId)
    if (!def || def.trigger.type !== 'on_ally_joined') continue

    // scope 匹配：缺省 self（与 hookOnMarkChange 同口径）
    const scope: TargetSelector = def.trigger.scope ?? { type: 'self' }
    let inScope = false
    if (scope.type === 'self') {
      inScope = entry.skillId === alliedSkillId
    } else if (_selectorResolver) {
      const targets = _selectorResolver(scope, entry.skillId, entry.key)
      inScope = targets.includes(alliedSkillId)
    }
    if (!inScope) continue

    const triggerCtx: TriggerContext = {
      selfAffixId: entry.defId,
      selfKey: entry.key,
      alliedSkillId,
    }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const lvBase = lvNBaseFor(entry.skillId, resourceLv1Base)
    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: lvBase('score'),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }
  return results
}

/**
 * resource:consumed 全局 hook · 任一资源被消耗（convert_resource）时调
 * 遍历 on_resource_consumed trigger 的 V2 instance，resource filter 匹配才命中。
 * 与 on_haste_granted 同纪律：无消耗源时永不触发（reactive build-around）。
 */
export function hookOnResourceConsumed(
  consumedResource: string,
  consumedAmount: number,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
  persistScope: 'fight' | 'run' = 'fight',
): SourcedResult[] {
  const results: SourcedResult[] = []
  for (const entry of _equipped.values()) {
    const def = getAffixV2Definition(entry.defId)
    if (!def || def.trigger.type !== 'on_resource_consumed') continue

    const triggerCtx: TriggerContext = {
      selfAffixId: entry.defId,
      selfKey: entry.key,
      consumedResource,
    }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const lvBase = lvNBaseFor(entry.skillId, resourceLv1Base)
    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: lvBase('score'),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      consumedResource,
      consumedAmount,
      persistScope,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }
  return results
}

/**
 * 「有技能被取代/吞噬」全局 hook · 任一 skill 被 consume_skill 本场移除时调（观察者）。
 * 遍历所有 on_skill_consumed trigger 的 V2 instance 全部触发（无 scope · 与 hookOnResourceConsumed 同结构）。
 * 与 on_removed 区别：on_removed 只迭代被移除者自身；本 hook 迭代全场的 on_skill_consumed 旁观词条。
 * 与 on_resource_consumed 同纪律：无 consume_skill 源时永不触发（reactive build-around）。
 */
export function hookOnSkillConsumed(
  consumedSkillId: string,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
  persistScope: 'fight' | 'run' = 'fight',
): SourcedResult[] {
  const results: SourcedResult[] = []
  for (const entry of _equipped.values()) {
    const def = getAffixV2Definition(entry.defId)
    if (!def || def.trigger.type !== 'on_skill_consumed') continue

    const triggerCtx: TriggerContext = {
      selfAffixId: entry.defId,
      selfKey: entry.key,
      consumedSkillId,
    }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const lvBase = lvNBaseFor(entry.skillId, resourceLv1Base)
    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: lvBase('score'),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      persistScope,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }
  return results
}

/**
 * skill 被「本场移除」（consume_skill 取代）时调 · 死亡回响。
 * 仅遍历被移除 skill 上的 V2 instance，命中 on_removed trigger 的 resolve。
 * skillResource 用被移除 skill 自身资源（死亡回响 gain_resource 按其 Lv 缩放）。
 * 与 on_resource_consumed 同纪律：无移除源（场上无 consume_skill）时永不触发（reactive build-around）。
 */
export function hookOnRemoved(
  removedSkillId: string,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
  persistScope: 'fight' | 'run' = 'fight',
): SourcedResult[] {
  const results: SourcedResult[] = []
  const ids = _bySkill.get(removedSkillId) ?? []
  const skillResource = gameState.affixSkills.get(removedSkillId)?.resource ?? 'score'
  const lvBase = lvNBaseFor(removedSkillId, resourceLv1Base)
  for (const id of ids) {
    const entry = _equipped.get(id)
    if (!entry) continue
    const def = getAffixV2Definition(entry.defId)
    if (!def || def.trigger.type !== 'on_removed') continue

    const triggerCtx: TriggerContext = { selfAffixId: entry.defId, selfKey: entry.key }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource,
      skillResourceLv1Base: lvBase(skillResource),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      persistScope,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }
  return results
}

/**
 * skill 被「出售」（建造期玩家主动处置）时调 · 双阶段触发模型的 on_sold（II 族建造期独占）。
 * 仅遍历被售 skill 上的 V2 instance，命中 on_sold trigger 的 resolve（与 hookOnRemoved 同结构）·
 * persistScope='run'（永久结算）· skillResource 用被售 skill 自身资源（gain_resource 按其 Lv 缩放）。
 * 由 build 集成在 skill:sold 事件（sellSkill 解绑/删除前发）时调，此刻该 skill 仍在 _equipped。
 */
export function hookOnSold(
  soldSkillId: string,
  resourceLv1Base: (r: string, level?: number) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
  persistScope: 'fight' | 'run' = 'run',
): SourcedResult[] {
  const results: SourcedResult[] = []
  const ids = _bySkill.get(soldSkillId) ?? []
  const skillResource = gameState.affixSkills.get(soldSkillId)?.resource ?? 'score'
  const lvBase = lvNBaseFor(soldSkillId, resourceLv1Base)
  for (const id of ids) {
    const entry = _equipped.get(id)
    if (!entry) continue
    const def = getAffixV2Definition(entry.defId)
    if (!def || def.trigger.type !== 'on_sold') continue

    const triggerCtx: TriggerContext = { selfAffixId: entry.defId, selfKey: entry.key }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource,
      skillResourceLv1Base: lvBase(skillResource),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      persistScope,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }
  return results
}

// ============================================
// Battle lifecycle hooks
// ============================================

/** 战斗开始 · 全 reset + 应用所有 passive aura 一次 + 触发 on_battle_start 一次 */
export function hookOnBattleStart(
  resourceLv1Base: (r: string, level?: number) => number = () => 1,
  getPlayerResource: (r: string) => number = () => 0,
  nowMs: number = Date.now(),
): SourcedResult[] {
  resetAllAffixV2State()
  clearGhostLog()

  const results: SourcedResult[] = []

  // passive 与 on_battle_start 都在 battle start 跑一次：
  //   passive  → 典型 apply_aura 持续 buff（不入 results，沿用历史只 log）
  //   on_battle_start → 一次性产出/成长种子（入 results 供 caller dispatch，旧 innate 等价物）
  for (const entry of _equipped.values()) {
    const def = getAffixV2Definition(entry.defId)
    if (!def) continue
    if (def.trigger.type !== 'passive' && def.trigger.type !== 'on_battle_start') continue

    const triggerCtx: TriggerContext = { selfAffixId: entry.defId, selfKey: entry.key }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const lvBase = lvNBaseFor(entry.skillId, resourceLv1Base)
    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: lvBase('score'),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const result = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)

    if (def.trigger.type === 'on_battle_start') {
      results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })
    }

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
    recordApprenticeTriggerHit(entry)
  }

  return results
}

/** 战斗结束 · 评估 on_battle_end triggers + 关内成长重置
 *  result='win'/'lose' 决定哪类 on_battle_end 词条命中（trigger.result='any' 全过）
 *  评估在 state reset 之前——保留 hostSkillLevel 等运行时上下文 */
export function hookOnBattleEnd(
  result: 'win' | 'lose' = 'win',
  resourceLv1Base: (r: string, level?: number) => number = () => 1,
  getPlayerResource: (r: string) => number = () => 0,
  nowMs: number = Date.now(),
): SourcedResult[] {
  const results: SourcedResult[] = []

  for (const entry of _equipped.values()) {
    const def = getAffixV2Definition(entry.defId)
    if (!def || def.trigger.type !== 'on_battle_end') continue

    // result 过滤：'any' 全过；其它必须精确匹配
    const wantResult = def.trigger.result ?? 'win'
    if (wantResult !== 'any' && wantResult !== result) continue

    const triggerCtx: TriggerContext = { selfAffixId: entry.defId, selfKey: entry.key }
    if (!evaluateTrigger(def.trigger, triggerCtx)) continue

    const lvBase = lvNBaseFor(entry.skillId, resourceLv1Base)
    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: lvBase('score'),
      resourceLv1Base: lvBase,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      hostSkillLevel: gameState.affixSkills.get(entry.skillId)?.level ?? 1,
      selfSection: def.section,
      selfDefId: def.id,
      getPlayerResource,
      resolveSelector: _selectorResolver,
      queryEquipped: buildQueryEquipped(entry),
    }
    const r = resolveEffect(applyEnchantToEffect(def.effect, getEnchant(entry.instanceId)), ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result: r })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result: r,
    })
    recordApprenticeTriggerHit(entry)
  }

  // 评估完才重置：on_battle_end 词条 hostSkillLevel / cum state 都需在本次结算时可读
  resetAllAffixV2State()
  return results
}
