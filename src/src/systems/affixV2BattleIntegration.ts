// ============================================
// 打字肉鸽 - 新 Affix 系统 · 战斗 ledger 真接入
// ============================================
// 把 ghost 模式升级为真接入：
//   1. 订阅 battle:start / word:complete event
//   2. 在 skill fire / key press 处调 V2 hooks
//   3. 把 resourceProduced 真正注入 state.resources
//
// 接入门槛：V2 装配登记表为空时所有 hook 返 []，相当于 no-op；
// 不会影响没有装 V2 词条的玩家。

import { state, synergy } from '../core/state'
import type { ResourceType } from '../core/types'
import { eventBus } from '../core/events/EventBus'
import { hasRelation } from '../data/keyboardTopology'
import { RESOURCE_COLORS } from '../core/constants'
import { showFeedback, updateHUD } from './battle'
import {
  hookOnSkillFire,
  hookOnKey,
  hookOnWordEnd,
  hookOnBattleStart,
  hookOnBattleEnd,
  listAllEquipped,
  setSelectorResolver,
  type SourcedResult,
} from './affixV2Equipped'
import { listActiveAuras, peekInstanceState, getSkillCumBase, getSkillCumFactor, getFireTargetWaitMs, tryFireTargetQuota } from './affixV2State'
import { getAffixV2Definition } from '../data/affixV2'
import { triggerSkill, recordSkillTrigger } from './skills'
import { getBindingState, getSkillKeys } from './bindingManager'
import type { ResourceProduction } from './affixV2Effect'
import type { FireEvent } from './fireFilter'
import type { TargetSelector } from '../data/affixV2Trigger'

// ============================================
// 资源 Lv1 base 查询
// ============================================
// 严格说应读现有 BASE_VALUES 表（按 skill resource × level）；
// 简化：用 BALANCE 中各资源初始/默认值。后续可换成精确表。

const DEFAULT_LV1_BASES: Record<string, number> = {
  base: 4,        // BASE_VALUES 表 score 资源 Lv1 base ≈ 4（参考 affix-skill-system.md §一）
  score: 11,
  multiplier: 0.35,
  time: 0.2,
  gold: 3,
  shield: 5,
  energy: 1,
  mutagen: 1,
}

export function defaultResourceLv1Base(resource: string): number {
  return DEFAULT_LV1_BASES[resource] ?? 1
}

// ============================================
// 玩家资源池查询
// ============================================

export function defaultGetPlayerResource(resource: string): number {
  const r = state.resources as unknown as Record<string, number>
  return r[resource] ?? 0
}

// ============================================
// 应用产出到 ledger
// ============================================

/** 资源注入 · 镜像现有 state 写入路径
 *
 * state.resources 上的 multiplier / time / shield 由 Object.defineProperty 代理到 state.{multiplier,time,shield}
 * （详 state.ts:100-119），写一次自动同步。score / gold 无 proxy，需手动镜像。
 */
function applyResourceAmount(resource: string, amount: number, anchorKey: string, skillId: string): void {
  if (amount === 0) return
  // base / multiplier 走 synergy 通道（per-word 累加器，词末 baseChips × mult 才进 state.score）
  // 直接写 state.resources.{base,multiplier} 会被 battle.ts:1430 updateSettlementLive 覆盖
  if (resource === 'base') {
    synergy.skillBaseScore += amount
  } else if (resource === 'multiplier') {
    synergy.skillMultBonus += amount
  } else {
    const r = state.resources as unknown as Record<string, number>
    r[resource] = (r[resource] ?? 0) + amount
    switch (resource) {
      case 'score':
        state.score = (state.score ?? 0) + amount
        break
      case 'gold':
        state.gold = (state.gold ?? 0) + amount
        state.player.gold = (state.player.gold ?? 0) + amount
        break
      // time / shield：state.resources 上是 proxy，写 resources 已同步顶层
    }
  }
  // 顺序：先 updateHUD 刷新（含 shield 可见性 + 浮字目标位置缓存），再 emitFloatFeedback
  // 反过来会导致首次 shield 浮字使用 stale (0,0) 目标位置 → orb 飞向左上角
  if (typeof document !== 'undefined') updateHUD()
  emitFloatFeedback(resource, amount, anchorKey)
  // 统计接入：INF /STATS 上一战每个技能的贡献（与 legacy recordSkillTrigger 同通道）
  recordSkillTrigger(skillId, anchorKey, resource as ResourceType, amount, false)
}

/** 浮字反馈 · 模仿 skills.ts:587 模板（+X · 资源色 · letterIndex 锚点）*/
function emitFloatFeedback(resource: string, amount: number, anchorKey: string): void {
  // 测试 / SSR 环境无 DOM 时跳过（showFeedback 内部 drainQueue 会访问 document）
  if (typeof document === 'undefined') return
  const color = RESOURCE_COLORS[resource] || '#ffffff'
  const displayValue = parseFloat(Math.abs(amount).toPrecision(4))
  const sign = amount >= 0 ? '+' : '-'
  const word = state.player.word?.toLowerCase() ?? ''
  const k = anchorKey.toLowerCase()
  const anchor = word.includes(k)
    ? { letterIndex: state.player.index, resource, amount }
    : { fromElementId: 'active-library', resource, amount }
  showFeedback(`${sign}${displayValue}`, color, 1, anchor)
}

/** 处理每个 sourced result：注入资源（经 aura 修饰）+ dispatch fire_target
 *  fire_target 目标列表剔除 sourceSkillId · 防直接回弹 A → B → A
 *  当 source 配额用完时（4/sec），剩余 dispatch 用 setTimeout 推迟到下个窗口
 *  → 实现"无限限流循环"：循环不中断，仅按 4/sec 节奏持续运行
 */
export function processV2Results(results: readonly SourcedResult[]): void {
  for (const sr of results) {
    const modified = applyAuraOutputBonus(sr.result.resourceProduced, sr.sourceSkillId, sr.sourceKey)
    for (const prod of modified) {
      applyResourceAmount(prod.resource, prod.amount, sr.sourceKey, sr.sourceSkillId)
    }
    for (const ft of sr.result.fireTargetsTriggered) {
      const targetIds = resolveSelectorToSkillIds(ft.selector, sr.sourceSkillId, sr.sourceKey)
        .filter(tid => tid !== sr.sourceSkillId)
      for (const tid of targetIds) {
        scheduleFireTargetDispatch(ft.sourceInstanceId, tid, sr.sourceKey)
      }
    }
  }
}

/** 调度一次 fire_target 触发：满配额立即派发，否则 setTimeout 推迟到下窗口 */
function scheduleFireTargetDispatch(sourceInstId: string, targetSkillId: string, sourceKey: string): void {
  const now = Date.now()
  const wait = getFireTargetWaitMs(sourceInstId, now)
  if (wait === 0) {
    tryFireTargetQuota(sourceInstId, now)  // 记账
    fireOneTarget(targetSkillId, sourceKey)
    return
  }
  setTimeout(() => {
    if (state.phase !== 'battle') return  // 出战斗丢弃残留
    scheduleFireTargetDispatch(sourceInstId, targetSkillId, sourceKey)
  }, wait + 5)  // 5ms jitter 避免边界精度问题
}

function fireOneTarget(targetSkillId: string, sourceKey: string): void {
  const keys = getSkillKeys(getBindingState(state), targetSkillId)
  const triggerKey = keys[0] ?? sourceKey
  try {
    triggerSkill(targetSkillId, triggerKey)
  } catch (e) {
    console.warn('[V2] fire_target dispatch failed', targetSkillId, e)
  }
}

// ============================================
// Selector 解析（fire_target / aura 用）
// ============================================

/** 把 TargetSelector 展开为目标 skillId 列表 */
function resolveSelectorToSkillIds(
  sel: TargetSelector,
  sourceSkillId: string,
  sourceKey: string,
): string[] {
  let candidates: string[] = []
  switch (sel.type) {
    case 'self':
      return [sourceSkillId]

    case 'neighbors': {
      const bindings = state.player.bindings
      const seen = new Set<string>()
      for (const [key, sid] of bindings) {
        if (sid === sourceSkillId) continue
        if (hasRelation(sourceKey, key, sel.posRel) && !seen.has(sid)) {
          seen.add(sid)
          candidates.push(sid)
        }
      }
      break
    }

    case 'matched_tag': {
      const seen = new Set<string>()
      for (const entry of listAllEquipped()) {
        const def = getAffixV2Definition(entry.defId)
        if (!def) continue
        if (def.tags.includes(sel.tag) && !seen.has(entry.skillId)) {
          seen.add(entry.skillId)
          candidates.push(entry.skillId)
        }
      }
      break
    }

    case 'matched_resource': {
      for (const [sid, sk] of state.affixSkills) {
        if (sk.resource === sel.resource) candidates.push(sid)
      }
      break
    }

    case 'all_skills': {
      candidates = [...state.affixSkills.keys()]
      break
    }
  }

  // pick === 'random' 时返回随机 1 个；self 已提前 return，不会进这里
  const pick = (sel as { pick?: string }).pick
  if (pick === 'random' && candidates.length > 0) {
    return [candidates[Math.floor(Math.random() * candidates.length)]]
  }
  return candidates
}

/** 判断给定 skill 是否在 selector 范围内（aura match 用）*/
function selectorMatchesSkill(
  sel: TargetSelector,
  sourceSkillId: string,
  sourceKey: string,
  targetSkillId: string,
  targetKey: string,
): boolean {
  switch (sel.type) {
    case 'self':              return targetSkillId === sourceSkillId
    case 'neighbors':         return targetSkillId !== sourceSkillId && hasRelation(sourceKey, targetKey, sel.posRel)
    case 'matched_tag': {
      for (const entry of listAllEquipped()) {
        if (entry.skillId !== targetSkillId) continue
        const def = getAffixV2Definition(entry.defId)
        if (def?.tags.includes(sel.tag)) return true
      }
      return false
    }
    case 'matched_resource': {
      const sk = state.affixSkills.get(targetSkillId)
      return sk?.resource === sel.resource
    }
    case 'all_skills':        return true
  }
}

// ============================================
// aura output_bonus_pct 消费
// ============================================

/** 给定一组 resource production，按已激活的 aura output_bonus_pct 加成 */
function applyAuraOutputBonus(
  production: readonly ResourceProduction[],
  sourceSkillId: string,
  sourceKey: string,
): ResourceProduction[] {
  if (production.length === 0) return [...production]
  let bonusMult = 1
  for (const aura of listActiveAuras()) {
    if (aura.modifier.type !== 'output_bonus_pct') continue
    const entry = listAllEquipped().find(e => e.instanceId === aura.sourceInstanceId)
    if (!entry) continue
    if (!selectorMatchesSkill(aura.selector, entry.skillId, entry.key, sourceSkillId, sourceKey)) continue
    bonusMult *= (1 + aura.modifier.amount)
  }
  if (bonusMult === 1) return [...production]
  return production.map(p => ({ resource: p.resource, amount: p.amount * bonusMult }))
}

// ============================================
// Hooks wiring · 在战斗事件流上挂订阅
// ============================================

let _wired = false

/** 装上 V2 战斗集成订阅（idempotent）*/
export function wireV2BattleIntegration(): void {
  if (_wired) return
  _wired = true

  // 把 selector → skillId[] 解析器注入到 affixV2Equipped（add/multiply 的 scope 展开用）
  setSelectorResolver(resolveSelectorToSkillIds)

  // battle:start → 从 state.player.bindings 重同步 V2 装配 + reset + 应用 passive aura
  // 重同步覆盖存档加载场景（bindings 直接还原，未走 bindShapeToKeys 路径）
  eventBus.on('battle:start', () => {
    resyncV2EquipmentFromState()
    hookOnBattleStart(defaultResourceLv1Base, defaultGetPlayerResource, Date.now())
  })

  // word:complete → 触发 on_word_end 类 V2 affix + 处理结果
  eventBus.on('word:complete', () => {
    const wordLen = state.player.word?.length ?? 0
    const results = hookOnWordEnd(Date.now(), wordLen, defaultResourceLv1Base, defaultGetPlayerResource)
    processV2Results(results)
  })

  // 注：on_key 与 on_skill_fire 不通过 eventBus，需 in-line 调用
  // 由 triggerAffixSkillWithFeedback / handleKeyPress 直接 import 本模块的 helper
}

/** Battle 结束 hook · 由调用方在战斗结算时调 */
export function triggerV2BattleEnd(): void {
  hookOnBattleEnd()
}

// ============================================
// 内联调用 helper（供 skills.ts / battle.ts 调）
// ============================================

/** 在 triggerAffixSkillWithFeedback 中调，传 fire event 信息 */
export function onSkillFireV2(
  skillId: string,
  sourceAffixId: string,
  sourceKey: string,
  sourceResource: string,
  isCrit: boolean,
  amount: number,
): void {
  const event: FireEvent = {
    sourceAffixId,
    sourceSkillId: skillId,
    sourceKey,
    sourceResource,
    isCrit,
    stackState: 'none',
    amount,
    timestamp: Date.now(),
  }
  const results = hookOnSkillFire(
    skillId, event,
    defaultResourceLv1Base,
    defaultGetPlayerResource,
    Date.now(),
  )
  processV2Results(results)

  // V2 skill 基础产出：替代旧 orchestrator 的 applyResource 通道
  // 公式：(Lv1Base + Σ cumulativeBaseAdd) × (1 + Σ cumulativeFactorAdd) × aura output_bonus_pct
  emitV2SkillBaseOutput(skillId, sourceKey, sourceResource)
}

/** 计算并写入 V2 skill 的基础产出 · 仅对挂有 v2Ids 的 skill 触发 */
function emitV2SkillBaseOutput(skillId: string, sourceKey: string, resource: string): void {
  const skill = state.affixSkills.get(skillId)
  if (!skill?.v2Ids || skill.v2Ids.length === 0) return

  // 聚合该 skill 上所有 V2 instance 的累加状态（self-scope add/multiply）
  let cumBase = 0
  let cumFactor = 0
  for (const entry of listAllEquipped()) {
    if (entry.skillId !== skillId) continue
    const s = peekInstanceState(entry.instanceId)
    if (!s) continue
    cumBase += s.cumulativeBaseAdd
    cumFactor += s.cumulativeFactorAdd
  }
  // 加上 scope-broadcast add/multiply 在本 skill 上的 aggregate
  cumBase += getSkillCumBase(skillId)
  cumFactor += getSkillCumFactor(skillId)

  const lv1Base = defaultResourceLv1Base(resource)
  const baseOutput = (lv1Base + cumBase) * (1 + cumFactor)

  // 经 aura output_bonus_pct 修饰后注入 ledger
  const modified = applyAuraOutputBonus([{ resource, amount: baseOutput }], skillId, sourceKey)
  for (const prod of modified) {
    applyResourceAmount(prod.resource, prod.amount, sourceKey, skillId)
  }
}

/** 在 handleKeyPress 中调，每键一次 */
export function onKeyV2(): void {
  const results = hookOnKey(Date.now(), defaultResourceLv1Base, defaultGetPlayerResource)
  processV2Results(results)
}

// ============================================
// 调试 · 装配 8 pilots 到指定 skill（dev only）
// ============================================

import { equipAffixV2, clearAllEquipped } from './affixV2Equipped'
import { PILOT_AFFIX_IDS } from '../data/affixV2PilotSpecs'

// ============================================
// 装配重同步 · 从 state.player.bindings 重建 V2 _equipped
// ============================================

/** 清空 V2 _equipped 后按 state.player.bindings 重新装配 */
export function resyncV2EquipmentFromState(): void {
  clearAllEquipped()
  const seen = new Set<string>()
  for (const [key, skillId] of state.player.bindings) {
    if (seen.has(skillId)) continue
    seen.add(skillId)
    const skill = state.affixSkills.get(skillId)
    if (!skill?.v2Ids?.length) continue
    for (const defId of skill.v2Ids) {
      equipAffixV2(skillId, key, defId)
    }
  }
}

/** 给指定 skill 装上 8 个 pilot V2 affix（debug 用）*/
export function equipAllPilotsOnSkill(skillId: string, key: string): string[] {
  const ids: string[] = []
  for (const defId of PILOT_AFFIX_IDS) {
    ids.push(equipAffixV2(skillId, key, defId))
  }
  return ids
}

/** Reset all equipped V2 + state（debug 用）*/
export function debugResetAllV2(): void {
  clearAllEquipped()
}

// expose 给 window 便于 browser console 调试
// 注意：所有 helper 必须用同一模块实例（避免 Vite dev 动态 import 分裂）
import { listAllEquipped as _listAllEquipped, getGhostLog as _getGhostLog, clearGhostLog as _clearGhostLog } from './affixV2Equipped'
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__v2 = {
    equip: equipAffixV2,
    equipAllPilots: equipAllPilotsOnSkill,
    reset: debugResetAllV2,
    wire: wireV2BattleIntegration,
    onSkillFire: onSkillFireV2,
    onKey: onKeyV2,
    onBattleEnd: triggerV2BattleEnd,
    // 调试 helper（所有走同一模块实例 · 避免 dev mode HMR 分裂）
    listEquipped: _listAllEquipped,
    ghostLog: _getGhostLog,
    clearGhostLog: _clearGhostLog,
    // state 用 getter 暴露（避免 TDZ：state import 在循环依赖下 module-init 时尚未初始化）
    getState: () => state,
  }
}
