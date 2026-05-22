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
import { random } from '../core/seededRandom'

/** V2 暴击产出倍率 */
export const V2_CRIT_MULTIPLIER = 2
import { hasRelation } from '../data/keyboardTopology'
import { RESOURCE_COLORS, INBOX_MAX } from '../core/constants'
import { showFeedback, updateHUD } from './battle'
import { getFloatScale } from '../effects/juice'
import {
  hookOnSkillFire,
  hookOnKey,
  hookOnWordEnd,
  hookOnBattleStart,
  hookOnBattleEnd,
  hookOnHasteGranted,
  listAllEquipped,
  setSelectorResolver,
  chargeToolAffixUses,
  type SourcedResult,
} from './affixV2Equipped'
import { listActiveAuras, peekInstanceState, getSkillCumBase, getSkillCumFactor, getFireTargetWaitMs, tryFireTargetQuota, consumeHasteOne, getHaste } from './affixV2State'
import { getAffixV2Definition } from '../data/affixV2'
import { BASE_VALUES, createSkillRuntimeState } from '../data/affixes'
import { getAscendBaseScale } from '../data/affixTrigger'
import { triggerSkill, recordSkillTrigger } from './skills'
import { getBindingState, getSkillKeys } from './bindingManager'
import { getHasteRelicOutputBonus, applyCritOverflow } from './relics/StackingRelicBehaviors'
import {
  getRelicCritRate, isCritChargeReady, consumeCritCharge, advanceCritCharge,
  isFateCoinActive, FATE_COIN_CRIT_CAP, FATE_COIN_CONVERSION,
  getCritBonusGold, recordWordCrit, getCritStormBonus,
} from './relics/CritRelicBehaviors'
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

/** 资源基础产出值查询 · level 缺省 1（向后兼容）·
 *  优先读 BASE_VALUES 精确 Lv.N 表，缺失资源回退 DEFAULT_LV1_BASES。
 *  名称沿用 Lv1Base 为历史原因——传入 level 即按 Lv.N 取值，使 V2 affix 效果随技能升级缩放。
 *  超出表长度（>Lv4）：按 table[last] × getAscendBaseScale(level) 延伸，
 *  与 legacy shop.ts:534 getEffectiveBaseValue 保持一致——避免 V2/legacy 两套数字。 */
export function defaultResourceLv1Base(resource: string, level = 1): number {
  const table = BASE_VALUES[resource as ResourceType]
  if (table && table.length > 0) {
    const maxIdx = table.length - 1
    const idx = Math.max(Math.floor(level), 1) - 1
    if (idx <= maxIdx) return table[idx]
    return table[maxIdx] * getAscendBaseScale(level)
  }
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
function applyResourceAmount(resource: string, amount: number, anchorKey: string, skillId: string, isCrit = false): void {
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
  emitFloatFeedback(resource, amount, anchorKey, isCrit)
  // 统计接入：INF /STATS 上一战每个技能的贡献（与 legacy recordSkillTrigger 同通道）
  recordSkillTrigger(skillId, anchorKey, resource as ResourceType, amount, false)
}

/** 浮字反馈 · 模仿 skills.ts:587 模板（+X · 资源色 · letterIndex 锚点 · getFloatScale 大小缩放）*/
function emitFloatFeedback(resource: string, amount: number, anchorKey: string, isCrit = false): void {
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
  // 暴击：💥 前缀 + 放大（对齐 skills.ts:612 旧路径模板）
  const scale = Math.max(getFloatScale(resource, amount), isCrit ? 2.0 : 1)
  showFeedback(`${isCrit ? '💥' : ''}${sign}${displayValue}`, color, scale, anchor)
}

/** 处理每个 sourced result：注入资源（经 aura 修饰）+ dispatch fire_target
 *  fire_target 目标列表剔除 sourceSkillId · 防直接回弹 A → B → A
 *  当 source 配额用完时（4/sec），剩余 dispatch 用 setTimeout 推迟到下个窗口
 *  → 实现"无限限流循环"：循环不中断，仅按 4/sec 节奏持续运行
 */
export function processV2Results(results: readonly SourcedResult[], outputMult = 1, isCrit = false): void {
  for (const sr of results) {
    const modified = applyAuraOutputBonus(sr.result.resourceProduced, sr.sourceSkillId, sr.sourceKey)
    for (const prod of modified) {
      applyResourceAmount(prod.resource, prod.amount * outputMult, sr.sourceKey, sr.sourceSkillId, isCrit)
    }
    for (const ft of sr.result.fireTargetsTriggered) {
      const targetIds = resolveSelectorToSkillIds(ft.selector, sr.sourceSkillId, sr.sourceKey)
        .filter(tid => tid !== sr.sourceSkillId)
      for (const tid of targetIds) {
        scheduleFireTargetDispatch(ft.sourceInstanceId, tid, sr.sourceKey)
      }
    }
    // gain_skill: 把 spawn 出来的 skill 写到 state（inventory + inbox 待绑定）
    // inbox 满 → 直接丢弃 spawn 的 skill（不入 affixSkills/skills 也不入 inbox · 保孤立）
    for (const sg of sr.result.skillsGranted) {
      if (state.player.inbox.length >= INBOX_MAX) continue
      state.affixSkills.set(sg.skill.id, sg.skill)
      state.player.skills.set(sg.skill.id, { level: sg.skill.level })
      // runtimeState 必须随技能一起建立——否则无词条技能（rarity 0）走旧管线时因缺 runtimeState 零产出
      state.affixSkillStates.set(sg.skill.id, createSkillRuntimeState(sg.skill.id))
      state.player.inbox.push(sg.skill.id)
      _lastBattleGrantedSkillIds.push(sg.skill.id)
    }
    // upgrade_skill: 目标 skill +level（capped baseValues 长度 · 同步 player.skills）
    for (const up of sr.result.skillUpgrades) {
      applySkillUpgrade(up.skillId, up.amount)
    }
    // graft_affix: 把 defId 装到宿主 skill + 更新 v2Ids + bump rarity（cap 3）
    for (const gr of sr.result.affixGrafts) {
      applyAffixGraft(gr.targetSkillId, gr.targetKey, gr.defId)
    }
  }
  // tool/认知词条「用完消失」：本次结算中触发过的词条各计 1 次使用，用尽即从宿主移除
  if (results.length > 0) chargeToolAffixUses(results.map(r => r.sourceInstanceId))
}

/** 升级 skill 等级 · capped 至 baseValues 长度 · 同步 affixSkills + player.skills */
function applySkillUpgrade(skillId: string, amount: number): void {
  const skill = state.affixSkills.get(skillId)
  if (!skill) return
  const maxLv = skill.baseValues?.length ?? skill.level
  const newLv = Math.min(maxLv, skill.level + Math.max(1, Math.floor(amount)))
  if (newLv === skill.level) return
  skill.level = newLv
  const ps = state.player.skills.get(skillId)
  if (ps) ps.level = newLv
}

/** 词条嫁接 · 把 defId 装到宿主 skill · 更新 v2Ids + rarity（cap 3）· 已满或重复则跳过 */
function applyAffixGraft(targetSkillId: string, targetKey: string, defId: string): void {
  const skill = state.affixSkills.get(targetSkillId)
  if (!skill) return
  const v2Ids = skill.v2Ids ?? []
  if (v2Ids.length >= 3) return            // rarity 上限 3 词条 · 满则跳过
  if (v2Ids.includes(defId)) return        // 已有同 def 不重复嫁接
  skill.v2Ids = [...v2Ids, defId]
  skill.rarity = Math.min(3, (skill.rarity ?? v2Ids.length) + 1) as typeof skill.rarity
  // 装到运行时登记表（与 resyncV2EquipmentFromState 一致 · 让本战后续 / 下战生效）
  equipAffixV2(targetSkillId, targetKey, defId)
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

/** 调度一次 on_haste_granted 派发：满配额立即跑 hook，否则 setTimeout 推迟（同 fire_target 4/sec 限流） */
function scheduleHasteGrantedDispatch(sourceInstId: string, grantedSkillId: string): void {
  const now = Date.now()
  const wait = getFireTargetWaitMs(sourceInstId, now)
  if (wait === 0) {
    tryFireTargetQuota(sourceInstId, now)  // 记账（与 fire_target 共享配额）
    const results = hookOnHasteGranted(grantedSkillId, defaultResourceLv1Base, defaultGetPlayerResource, now)
    processV2Results(results)
    return
  }
  setTimeout(() => {
    if (state.phase !== 'battle') return  // 出战斗丢弃残留
    scheduleHasteGrantedDispatch(sourceInstId, grantedSkillId)
  }, wait + 5)  // 5ms jitter
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

    case 'hasted': {
      for (const sid of state.affixSkills.keys()) {
        if (getHaste(sid) > 0) candidates.push(sid)
      }
      break
    }

    case 'matched_rarity': {
      for (const [sid, sk] of state.affixSkills) {
        if (sk.rarity === sel.rarity) candidates.push(sid)
      }
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
    case 'hasted':            return getHaste(targetSkillId) > 0
    case 'matched_rarity':    return state.affixSkills.get(targetSkillId)?.rarity === sel.rarity
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
  //               + 触发 on_battle_start 词条（旧 innate 等价物，hookOnBattleStart 返回结果）
  // 重同步覆盖存档加载场景（bindings 直接还原，未走 bindShapeToKeys 路径）
  eventBus.on('battle:start', () => {
    resyncV2EquipmentFromState()
    _lastBattleGrantedSkillIds = []        // 每战清零；本战 gain_skill 命中再 push
    const results = hookOnBattleStart(defaultResourceLv1Base, defaultGetPlayerResource, Date.now())
    processV2Results(results)
  })

  // battle:end → 触发 on_battle_end 词条（teach 主用 · gain_skill 写 inbox）
  //              + reset 关内 cum / stacks state（hookOnBattleEnd 内含）
  // 监听 battle.ts 中 victory() / gameOver() 显式 emit；caller 不需再调 triggerV2BattleEnd
  eventBus.on('battle:end', ({ result }) => {
    triggerV2BattleEnd(result === 'lose' ? 'lose' : 'win')
  })

  // word:complete → 触发 on_word_end 类 V2 affix + 处理结果
  eventBus.on('word:complete', () => {
    const wordLen = state.player.word?.length ?? 0
    const results = hookOnWordEnd(Date.now(), wordLen, defaultResourceLv1Base, defaultGetPlayerResource)
    processV2Results(results)
  })

  // haste:granted → 触发 on_haste_granted 类 V2 affix（scope 内含 grantedSkillId）
  // 同来源限流：复用 fire_target rate limit（4/sec/source），超配额 setTimeout 推迟到下窗口，
  // grant_haste → on_haste_granted → grant_haste 自循环按 4/sec 节奏持续运行，链不中断
  eventBus.on('haste:granted', ({ skillId, sourceInstanceId }) => {
    scheduleHasteGrantedDispatch(sourceInstanceId, skillId)
  })

  // 注：on_key 与 on_skill_fire 不通过 eventBus，需 in-line 调用
  // 由 triggerAffixSkillWithFeedback / handleKeyPress 直接 import 本模块的 helper
}

/** Battle 结束 hook · 由调用方在战斗结算时调
 *  result='win' 触发胜利型 on_battle_end 词条；'lose' 触发失败型；'any' 永远过
 *  现在 wireV2BattleIntegration 已订阅 battle:end event 自动调；保留导出供调试 / 手动调用 */
export function triggerV2BattleEnd(result: 'win' | 'lose' = 'win'): void {
  const results = hookOnBattleEnd(result, defaultResourceLv1Base, defaultGetPlayerResource, Date.now())
  processV2Results(results)
}

// ============================================
// gain_skill 本战 grant 缓冲（settlement UI 用）
// ============================================
// battle:start 清零；processV2Results 处理 skillsGranted 时 push
// UI 在 victory()/gameOver() 读 getLastBattleGrantedSkillIds() 后传给 teletype

let _lastBattleGrantedSkillIds: string[] = []

export function getLastBattleGrantedSkillIds(): readonly string[] {
  return _lastBattleGrantedSkillIds
}

// ============================================
// 内联调用 helper（供 skills.ts / battle.ts 调）
// ============================================

// 多重释放 · 防递归：MULTI_FIRE aura 触发的额外 fire 不再叠加 multi_fire（否则无限）
let _inMultiFireExtra = false

// 极速 fire 标记：consumeHasteFireIfAny 触发的额外 fire 期间为 true（stack_crit 遗物用）
let _inHasteFire = false

/** 在 triggerAffixSkillWithFeedback 中调，传 fire event 信息 */
export function onSkillFireV2(
  skillId: string,
  sourceAffixId: string,
  sourceKey: string,
  sourceResource: string,
  isCrit: boolean,
  amount: number,
): void {
  // 暴击判定：V2 crit_chance_add aura + 全遗物暴击率源
  const wordLen = state.player.word?.length ?? 0
  let critChance = sumCritChanceAuras(skillId, sourceKey) + getRelicCritRate(sourceKey, wordLen)
  const chargeReady = isCritChargeReady()   // crit_charge：保底必暴

  // fate_coin：暴击率封顶 50%，超出部分转暴击倍率
  let critMultBonus = 0
  if (isFateCoinActive() && critChance > FATE_COIN_CRIT_CAP) {
    critMultBonus = (critChance - FATE_COIN_CRIT_CAP) * FATE_COIN_CONVERSION
    critChance = FATE_COIN_CRIT_CAP
  }

  // 强制暴击短路：isCrit 入参（guaranteed crit）/ crit_charge 保底 /
  // stack_crit 遗物（极速消耗触发的额外 fire 必定暴击）
  const stackCritForce = _inHasteFire && state.player.relics.has('stack_crit')
  const rolledCrit = isCrit || chargeReady || stackCritForce || random() < critChance
  if (chargeReady && rolledCrit) consumeCritCharge()
  advanceCritCharge(rolledCrit)

  if (rolledCrit) {
    recordWordCrit()   // crit_storm：记录本词暴击
    // crit_bonus：暴击 → +3 金币
    const critGold = getCritBonusGold()
    if (critGold > 0) {
      state.gold = (state.gold ?? 0) + critGold
      state.resources.gold = (state.resources.gold ?? 0) + critGold
      state.player.gold = (state.player.gold ?? 0) + critGold
    }
  }
  // 产出倍率：暴击 (2 + fate_coin 加成) × crit_storm 本词加成（crit_storm 不限暴击 fire）
  const outputMult = (rolledCrit ? V2_CRIT_MULTIPLIER + critMultBonus : 1) * (1 + getCritStormBonus())

  const event: FireEvent = {
    sourceAffixId,
    sourceSkillId: skillId,
    sourceKey,
    sourceResource,
    isCrit: rolledCrit,
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
  processV2Results(results, outputMult, rolledCrit)

  // V2 skill 基础产出：替代旧 orchestrator 的 applyResource 通道
  // 公式：(Lv1Base + Σ cumulativeBaseAdd) × (1 + Σ cumulativeFactorAdd) × aura output_bonus_pct × outputMult
  emitV2SkillBaseOutput(skillId, sourceKey, sourceResource, outputMult, rolledCrit)

  // 暴击溢层 (crit_overflow) 遗物：暴击 fire → 该技能 +3 极速
  applyCritOverflow(skillId, rolledCrit)

  // 多重释放 aura · 顶层 fire 完成后查匹配此 skill 的 multi_fire_add aura，额外再 fire N 次
  if (!_inMultiFireExtra) {
    const extras = sumMultiFireAuras(skillId, sourceKey)
    if (extras > 0) {
      _inMultiFireExtra = true
      try {
        for (let i = 0; i < extras; i++) {
          triggerSkill(skillId, sourceKey)
        }
      } finally {
        _inMultiFireExtra = false
      }
    }
  }
}

/** 极速消耗 · 玩家按下绑定键时调（在 playerCorrect 的 triggerSkill 后）
 *  若 skill 有 ≥1 极速层 → 消耗 1 层 + 触发：
 *    1. 全 V2 实例 affixKeyCount +1（额外按键计数，via onKeyV2 → 顺带跑 on_key/every_n_keys）
 *    2. triggerSkill 再跑一次（base + on_self_fire + on_fire + chain — 完整 fire pipeline）
 *  注意：word.index 不变（triggerSkill 不动 index，playerCorrect 才动）
 *  注意：单次按键最多消耗 1 层（即使有多层）— 攒下来分多次用
 */
export function consumeHasteFireIfAny(skillId: string, sourceKey: string): boolean {
  if (!consumeHasteOne(skillId)) return false
  // 1. 模拟一次额外按键（bump every_n_keys 计数 + 跑 on_key/every_n_keys triggered V2 affixes）
  onKeyV2()
  // 2. 模拟一次额外 skill fire（完整 pipeline）· _inHasteFire 标记供 stack_crit 遗物判定
  _inHasteFire = true
  try {
    triggerSkill(skillId, sourceKey)
  } finally {
    _inHasteFire = false
  }
  // 3. 通知极速消耗（极速系遗物监听：overload_circuit / surge / momentum / inscription_flow）
  eventBus.emit('haste:consumed', { skillId, sourceKey })
  return true
}

/** 累计 multi_fire_add aura · 返回向上取整后的额外 fire 次数 */
function sumMultiFireAuras(skillId: string, sourceKey: string): number {
  let total = 0
  for (const aura of listActiveAuras()) {
    if (aura.modifier.type !== 'multi_fire_add') continue
    const entry = listAllEquipped().find(e => e.instanceId === aura.sourceInstanceId)
    if (!entry) continue
    if (!selectorMatchesSkill(aura.selector, entry.skillId, entry.key, skillId, sourceKey)) continue
    total += aura.modifier.amount
  }
  return Math.floor(total)
}

/** 累计 crit_chance_add aura · 返回该 skill 本次 fire 的暴击率（未封顶，roll 时 random()<chance 即暴击）*/
function sumCritChanceAuras(skillId: string, sourceKey: string): number {
  let total = 0
  for (const aura of listActiveAuras()) {
    if (aura.modifier.type !== 'crit_chance_add') continue
    const entry = listAllEquipped().find(e => e.instanceId === aura.sourceInstanceId)
    if (!entry) continue
    if (!selectorMatchesSkill(aura.selector, entry.skillId, entry.key, skillId, sourceKey)) continue
    total += aura.modifier.amount
  }
  return total
}

/** 彩虹资源池 · rainbow aura 随机产出的 6 种核心资源 */
const RAINBOW_RESOURCE_POOL: readonly string[] = ['base', 'score', 'multiplier', 'time', 'shield', 'gold']

/** 该 skill 是否被 rainbow aura 覆盖 */
function skillHasRainbowAura(skillId: string, sourceKey: string): boolean {
  for (const aura of listActiveAuras()) {
    if (aura.modifier.type !== 'rainbow') continue
    const entry = listAllEquipped().find(e => e.instanceId === aura.sourceInstanceId)
    if (!entry) continue
    if (selectorMatchesSkill(aura.selector, entry.skillId, entry.key, skillId, sourceKey)) return true
  }
  return false
}

/** 计算并写入 V2 skill 的基础产出 · 仅对挂有 v2Ids 的 skill 触发 */
function emitV2SkillBaseOutput(skillId: string, sourceKey: string, resource: string, outputMult = 1, isCrit = false): void {
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

  // Lv.N 基础产出：随技能等级缩放（之前恒取 Lv1，技能升级不生效）
  const lvN = skill.level ?? 1
  const lv1Base = defaultResourceLv1Base(resource, lvN)
  // 极速系遗物产出加成（stack_momentum 逐次递进 + stack_dividend 累计里程碑）
  const relicBonus = getHasteRelicOutputBonus(skillId)
  let baseOutput = (lv1Base + cumBase) * (1 + cumFactor) * (1 + relicBonus) * outputMult

  // rainbow aura：基础产出改为随机资源，按目标资源 Lv.N base 重缩放（每次 fire 重抽）
  let outResource = resource
  if (skillHasRainbowAura(skillId, sourceKey)) {
    outResource = RAINBOW_RESOURCE_POOL[Math.floor(random() * RAINBOW_RESOURCE_POOL.length)]
    const tgtBase = defaultResourceLv1Base(outResource, lvN)
    if (lv1Base > 0) baseOutput = baseOutput * (tgtBase / lv1Base)
  }

  // 经 aura output_bonus_pct 修饰后注入 ledger
  const modified = applyAuraOutputBonus([{ resource: outResource, amount: baseOutput }], skillId, sourceKey)
  for (const prod of modified) {
    applyResourceAmount(prod.resource, prod.amount, sourceKey, skillId, isCrit)
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
