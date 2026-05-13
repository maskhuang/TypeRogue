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
import { getAffixV2Definition } from '../data/affixV2'
import { evaluateTrigger, type TriggerContext } from './affixV2Trigger'
import { resolveEffect, type ResolveContext, type ResolveResult } from './affixV2Effect'
import {
  getInstanceState,
  resetAllAffixV2State,
} from './affixV2State'
import type { FireEvent } from './fireFilter'
import type { TargetSelector } from '../data/affixV2Trigger'

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

/** 清空（unequip 全部）· 用于切 run / reset */
export function clearAllEquipped(): void {
  _equipped.clear()
  _bySkill.clear()
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
  resourceLv1Base: (r: string) => number,
  getPlayerResource: (r: string) => number,
  nowMs: number,
): SourcedResult[] {
  const results: SourcedResult[] = []

  // ── 1. on_self_fire: 仅触发 skill 上的 V2 affix ──
  const selfIds = _bySkill.get(skillId) ?? []
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
      skillResourceLv1Base: resourceLv1Base(fireEvent.sourceResource),
      resourceLv1Base,
      nowMs,
      isCrit: fireEvent.isCrit,
      currentWordLength: 0,    // skill fire context, no word context
      getPlayerResource,
      resolveSelector: _selectorResolver,
    }
    const result = resolveEffect(def.effect, ctx)
    results.push({ sourceInstanceId: id, sourceSkillId: skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: id,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
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

      const triggerCtx: TriggerContext = {
        selfAffixId: entry.defId,
        selfKey: entry.key,
        event: broadcastEvent,
      }
      if (!evaluateTrigger(def.trigger, triggerCtx)) continue

      const ctx: ResolveContext = {
        instanceId: entry.instanceId,
        skillId: entry.skillId,
        key: entry.key,
        skillResource: broadcastEvent.sourceResource,
        skillResourceLv1Base: resourceLv1Base(broadcastEvent.sourceResource),
        resourceLv1Base,
        nowMs,
        isCrit: broadcastEvent.isCrit,
        currentWordLength: 0,
        getPlayerResource,
      }
      const result = resolveEffect(def.effect, ctx)
      results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

      _ghostLog.push({
        timestamp: nowMs,
        instanceId: entry.instanceId,
        defId: entry.defId,
        trigger: def.trigger.type,
        result,
      })
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
  resourceLv1Base: (r: string) => number,
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

    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: resourceLv1Base('score'),
      resourceLv1Base,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      getPlayerResource,
      resolveSelector: _selectorResolver,
    }
    const result = resolveEffect(def.effect, ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
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
  resourceLv1Base: (r: string) => number,
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

    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: resourceLv1Base('score'),
      resourceLv1Base,
      nowMs,
      isCrit: false,
      currentWordLength,
      getPlayerResource,
      resolveSelector: _selectorResolver,
    }
    const result = resolveEffect(def.effect, ctx)
    results.push({ sourceInstanceId: entry.instanceId, sourceSkillId: entry.skillId, sourceKey: entry.key, result })

    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: def.trigger.type,
      result,
    })
  }
  return results
}

// ============================================
// Battle lifecycle hooks
// ============================================

/** 战斗开始 · 全 reset + 应用所有 passive aura 一次 */
export function hookOnBattleStart(
  resourceLv1Base: (r: string) => number = () => 1,
  getPlayerResource: (r: string) => number = () => 0,
  nowMs: number = Date.now(),
): void {
  resetAllAffixV2State()
  clearGhostLog()

  // 一次性应用所有 passive trigger 的 affix（典型情况：apply_aura 持续 buff）
  for (const entry of _equipped.values()) {
    const def = getAffixV2Definition(entry.defId)
    if (!def || def.trigger.type !== 'passive') continue
    const ctx: ResolveContext = {
      instanceId: entry.instanceId,
      skillId: entry.skillId,
      key: entry.key,
      skillResource: 'score',
      skillResourceLv1Base: resourceLv1Base('score'),
      resourceLv1Base,
      nowMs,
      isCrit: false,
      currentWordLength: 0,
      getPlayerResource,
      resolveSelector: _selectorResolver,
    }
    const result = resolveEffect(def.effect, ctx)
    _ghostLog.push({
      timestamp: nowMs,
      instanceId: entry.instanceId,
      defId: entry.defId,
      trigger: 'passive',
      result,
    })
  }
}

/** 战斗结束 · 关内成长重置（state 内 cumulativeBaseAdd / cumulativeFactorAdd / stacks 清零）*/
export function hookOnBattleEnd(): void {
  resetAllAffixV2State()
}
