// ============================================
// 打字肉鸽 - 极速系遗物 · player 级编排层
// ============================================
// 本文件是 11 个极速(haste)系遗物的【编排中枢】。它们共用 affixV2 的 haste 数据
// 模型，但本身是 player 级（挂 state.player.relics，无 host skill），故【刻意不走】
// affixV2 EffectSpec：
//   · EffectSpec(grant_haste/stack_*/fire_target) 需要 host skill + instance state 作锚；
//     遗物无宿主技能，强接需造"虚拟宿主"基建，机制零收益。
//   · 其中 4 个触发于"极速被消耗时"，而 affixV2 无 on_haste_consumed trigger。
// 结论（2026-06，B 方案）：承认遗物 = player 级编排，保留命令式，只把分布式编排
// 收敛为一张清晰系统图 + 单一事实源清单(HASTE_RELIC_MANIFEST)，不动机制。
//
// ── 三层架构（编排横跨 4 文件）─────────────────────────────────────────────
//   [数据层]  affixV2State.ts      : _hasteBySkill 计数 / grantHaste / consumeHasteOne /
//                                    clearHasteForSkill / clearAllHaste(perpetual_engine 跳过)
//   [编排层]  本文件               : 监听 haste 事件 + combo/完词/暴击 钩子，驱动 11 遗物
//   [外部钩子] battle.ts           : applyDrumPass(playerCorrect) / applyWordResonance(completeWord)
//                                    / setRelicTriggerSkill 注入 / consumeHasteFireIfAny(逐键)
//             affixV2BattleIntegration.ts : crit_overflow 调用 + stack_crit(_inHasteFire) +
//                                    haste:consumed 的【唯一】emit 点(consumeHasteFireIfAny)
//
// ── 事件拓扑（单一 emit 源）────────────────────────────────────────────────
//   haste:granted  ← affixV2State.grantHaste()        （affixV2 effect / 4 个遗物 grantHaste）
//   haste:consumed ← affixV2BattleIntegration.consumeHasteFireIfAny() （仅此一处，逐键）
//
// ── 不变式 ────────────────────────────────────────────────────────────────
//   I1 onHasteConsumed 天然不重入：overload/surge 用普通 triggerSkill(不消耗极速)，
//      不会重新 emit haste:consumed，无递归。
//   I2 onHasteGranted 一跳防递归：neighbor_watch 再 grantHaste 会重入 → _inHasteRelicDispatch 守。
//   I3 重置归属分两家：编排态(_outputBonuses 等) → resetStackingRelicBattleState；
//      极速计数本身 → affixV2State.clearAllHaste（perpetual_engine 跳过，实现跨关保留）。
//   I4 stack_crit / perpetual_engine 真实逻辑在外部文件，本文件仅 no-op 登记（见 MANIFEST.impl）。
//
// 各遗物的触发相位与逻辑落点见 HASTE_RELIC_MANIFEST（下方·单一事实源，并驱动登记）。

import { state } from '../../core/state'
import { eventBus } from '../../core/events/EventBus'
import { grantHaste, clearHasteForSkill, addSkillCumFactor } from '../affixV2State'
import { hasRelation, PositionRelation } from '../../data/keyboardTopology'
import { registerRelicBehavior } from './RelicPipeline'

// === 极速系遗物编排清单（单一事实源）===
// phase = 触发相位；impl = 真实逻辑落点。initStackingRelicBehaviors 据此登记 no-op 行为。
// 改动遗物集时只改这里：新增/移除条目即同步登记表与文档。
export const HASTE_RELIC_MANIFEST: Record<string, { phase: string; impl: string }> = {
  // 极速被消耗时（onHasteConsumed，本文件）
  stack_momentum:   { phase: 'haste:consumed', impl: 'onHasteConsumed' },
  inscription_flow: { phase: 'haste:consumed', impl: 'onHasteConsumed' },
  overload_circuit: { phase: 'haste:consumed', impl: 'onHasteConsumed + _triggerSkill(邻居)' },
  surge:            { phase: 'haste:consumed', impl: 'onHasteConsumed + _triggerSkill(邻居·scale)' },
  // 极速被获得时（onHasteGranted，本文件）
  stack_dividend:   { phase: 'haste:granted',  impl: 'onHasteGranted' },
  neighbor_watch:   { phase: 'haste:granted',  impl: 'onHasteGranted + _inHasteRelicDispatch 防递归' },
  // 外部钩子触发（本文件导出函数，由 battle/affixV2BattleIntegration 调）
  drum_pass:        { phase: 'combo 每+5',      impl: 'applyDrumPass ← battle.playerCorrect' },
  word_resonance:   { phase: '完词',           impl: 'applyWordResonance ← battle.completeWord' },
  crit_overflow:    { phase: '暴击 fire',       impl: 'applyCritOverflow ← affixV2BattleIntegration.onSkillFireV2' },
  // 真实逻辑在外部文件，本文件仅 no-op 登记（I4）
  stack_crit:       { phase: '极速 fire',       impl: 'affixV2BattleIntegration.onSkillFireV2 (_inHasteFire)' },
  perpetual_engine: { phase: 'addHaste/关末',   impl: 'affixV2State.addHaste(×0.5) / clearAllHaste(跳过)' },
}

// === 常量 ===
export const MOMENTUM_OUTPUT_PER_CONSUME = 0.03  // 层层递进：每次消耗极速 → 该技能本关产出 +3%
export const DIVIDEND_HASTE_THRESHOLD = 10       // 积少成多：每累计获得 10 层极速
export const DIVIDEND_OUTPUT_BONUS = 0.05        // → 该技能本关产出 +5%
export const SURGE_OUTPUT_PER_STACK = 0.10       // 浪涌：邻居本次产出 +清空层数×10%
export const DRUM_PASS_COMBO_INTERVAL = 5        // 击鼓传花：combo 每 +5
export const DRUM_PASS_HASTE = 3                 // → 随机技能 +3 极速
export const CRIT_OVERFLOW_HASTE = 3             // 暴击溢层：暴击 → 该技能 +3 极速
export const INSCRIPTION_FLOW_GROWTH = 0.02      // 铭文涌流：已附魔技能消耗极速 → 成长 +2%
export const NEIGHBOR_WATCH_HASTE = 1            // 邻里守望：获得极速 → 相邻技能各 +1 极速

// === triggerSkill 注入 ===
// StackingRelicBehaviors → skills → affixV2BattleIntegration → StackingRelicBehaviors 会成环，
// 故 overload_circuit / surge 所需的 triggerSkill 由 battle.ts 在 init 时注入。
type TriggerSkillFn = (skillId: string, triggerKey: string, overrideAnchor?: unknown, outputScale?: number) => void
let _triggerSkill: TriggerSkillFn | undefined
export function setRelicTriggerSkill(fn: TriggerSkillFn): void {
  _triggerSkill = fn
}

// === 模块级状态（每关重置）===
/** 层层递进 + 积少成多：每技能本关累积的产出加成% */
const _outputBonuses = new Map<string, number>()
/** 积少成多：每技能累计获得的极速总量 */
const _dividendHasteTotal = new Map<string, number>()
/** 积少成多：每技能上次检查点 */
const _dividendCheckpoints = new Map<string, number>()
/** 击鼓传花：上次 combo 值 */
let _drumPassLastCombo = 0
/** neighbor_watch 防递归：处理 haste:granted 时不再二次传导 */
let _inHasteRelicDispatch = false
/** init 幂等保护（避免重复注册事件监听）*/
let _initialized = false

// === 辅助 ===

/** skill 的所有绑定键 */
function getSkillKeys(skillId: string): string[] {
  const keys: string[] = []
  for (const [k, sid] of state.player.bindings) {
    if (sid === skillId) keys.push(k)
  }
  return keys
}

/** 与 skillId 相邻（Adjacent）的其它 skillId（去重）*/
function getAdjacentSkillIds(skillId: string): string[] {
  const ownKeys = getSkillKeys(skillId)
  const seen = new Set<string>()
  for (const [k, sid] of state.player.bindings) {
    if (sid === skillId || seen.has(sid)) continue
    if (ownKeys.some(ok => hasRelation(ok, k, PositionRelation.Adjacent))) {
      seen.add(sid)
    }
  }
  return [...seen]
}

/** 随机一个场上 skillId（无技能返 null）*/
function pickRandomSkillId(): string | null {
  const ids = [...state.affixSkills.keys()]
  if (ids.length === 0) return null
  return ids[Math.floor(Math.random() * ids.length)]
}

// === 产出加成查询（emitV2SkillBaseOutput 调用）===

/** 层层递进 + 积少成多：该技能本关累积的产出加成%（0 = 无）*/
export function getHasteRelicOutputBonus(skillId: string): number {
  return _outputBonuses.get(skillId) ?? 0
}

// === 事件处理 ===

/** haste:granted → 积少成多累计 + 邻里守望传导
 *  I2 一跳防递归：neighbor_watch 内再 grantHaste 会重入本回调 → _inHasteRelicDispatch 守一跳。*/
function onHasteGranted(skillId: string, amount: number): void {
  // 积少成多 (stack_dividend)：累计获得量每过 10 层 → 该技能本关产出 +5%
  if (state.player.relics.has('stack_dividend')) {
    const total = (_dividendHasteTotal.get(skillId) ?? 0) + amount
    _dividendHasteTotal.set(skillId, total)
    const lastCp = _dividendCheckpoints.get(skillId) ?? 0
    const newCp = Math.floor(total / DIVIDEND_HASTE_THRESHOLD)
    if (newCp > lastCp) {
      const gained = (newCp - lastCp) * DIVIDEND_OUTPUT_BONUS
      _outputBonuses.set(skillId, (_outputBonuses.get(skillId) ?? 0) + gained)
      _dividendCheckpoints.set(skillId, newCp)
    }
  }
  // 邻里守望 (neighbor_watch)：技能获得极速 → 相邻技能各 +1 极速（仅一跳，防递归）
  if (state.player.relics.has('neighbor_watch') && !_inHasteRelicDispatch) {
    _inHasteRelicDispatch = true
    try {
      for (const nid of getAdjacentSkillIds(skillId)) {
        grantHaste(nid, NEIGHBOR_WATCH_HASTE, 'relic:neighbor_watch')
      }
    } finally {
      _inHasteRelicDispatch = false
    }
  }
}

/** haste:consumed → 层层递进 / 铭文涌流 / 过载电路 / 浪涌
 *  I1 不重入：本回调仅由 consumeHasteFireIfAny 触发；overload/surge 的 _triggerSkill 是普通
 *  fire（不消耗极速），不会再 emit haste:consumed，故无需重入守卫。*/
function onHasteConsumed(skillId: string, _sourceKey: string): void {
  // 层层递进 (stack_momentum)：消耗极速 → 该技能本关产出 +3%（逐次递进）
  if (state.player.relics.has('stack_momentum')) {
    _outputBonuses.set(skillId, (_outputBonuses.get(skillId) ?? 0) + MOMENTUM_OUTPUT_PER_CONSUME)
  }
  // 铭文涌流 (inscription_flow)：已附魔技能消耗极速 → 该技能本关成长 +2%
  if (state.player.relics.has('inscription_flow')) {
    const skill = state.affixSkills.get(skillId)
    if (skill && skill.enchantmentIds.length > 0) {
      addSkillCumFactor(skillId, INSCRIPTION_FLOW_GROWTH)
    }
  }
  // 过载电路 (overload_circuit)：消耗极速 → 相邻技能各额外触发 1 次
  if (state.player.relics.has('overload_circuit') && _triggerSkill) {
    for (const nid of getAdjacentSkillIds(skillId)) {
      const nKeys = getSkillKeys(nid)
      if (nKeys.length > 0) _triggerSkill(nid, nKeys[0])
    }
  }
  // 浪涌 (surge)：消耗极速 → 清空该技能剩余极速，邻居各额外触发 1 次（产出 ×(1+清空层数×10%)）
  if (state.player.relics.has('surge') && _triggerSkill) {
    const cleared = clearHasteForSkill(skillId)
    if (cleared > 0) {
      const scale = 1 + cleared * SURGE_OUTPUT_PER_STACK
      for (const nid of getAdjacentSkillIds(skillId)) {
        const nKeys = getSkillKeys(nid)
        if (nKeys.length > 0) _triggerSkill(nid, nKeys[0], undefined, scale)
      }
    }
  }
}

// === combo / 完词 / 暴击 钩子 ===

/** 击鼓传花 (drum_pass)：combo 每 +5 → 随机技能 +3 极速（battle.ts playerCorrect 调）*/
export function applyDrumPass(currentCombo: number): void {
  if (!state.player.relics.has('drum_pass')) return
  const prevMilestone = Math.floor(_drumPassLastCombo / DRUM_PASS_COMBO_INTERVAL)
  const curMilestone = Math.floor(currentCombo / DRUM_PASS_COMBO_INTERVAL)
  _drumPassLastCombo = currentCombo
  if (curMilestone <= prevMilestone) return
  const sid = pickRandomSkillId()
  if (sid) grantHaste(sid, DRUM_PASS_HASTE * (curMilestone - prevMilestone), 'relic:drum_pass')
}

/** 词根共振 (word_resonance)：完词 → 随机技能 +⌊词长/3⌋ 极速（battle.ts completeWord 调）*/
export function applyWordResonance(wordLength: number): void {
  if (!state.player.relics.has('word_resonance')) return
  const amount = Math.floor(wordLength / 3)
  if (amount <= 0) return
  const sid = pickRandomSkillId()
  if (sid) grantHaste(sid, amount, 'relic:word_resonance')
}

/** 暴击溢层 (crit_overflow)：暴击 fire → 该技能 +3 极速（onSkillFireV2 调）*/
export function applyCritOverflow(skillId: string, isCrit: boolean): void {
  if (!isCrit || !state.player.relics.has('crit_overflow')) return
  grantHaste(skillId, CRIT_OVERFLOW_HASTE, 'relic:crit_overflow')
}

// === 永动引擎状态查询 ===
/** perpetual_engine：极速跨关保留 + 获得量×0.5（addHaste / clearAllHaste 内部已处理，此处仅暴露查询）*/
export function isPerpetualEngineActive(): boolean {
  return state.player.relics.has('perpetual_engine')
}

// === 生命周期 ===

/** 每关重置（产出加成 / 积少成多累计 / combo 记录）·
 *  极速层数本身的关末清零由 affixV2State.clearAllHaste 处理（perpetual_engine 会跳过）*/
export function resetStackingRelicBattleState(): void {
  _outputBonuses.clear()
  _dividendHasteTotal.clear()
  _dividendCheckpoints.clear()
  _drumPassLastCombo = 0
  _inHasteRelicDispatch = false
}

/** 注册极速系遗物行为 + 挂事件监听（幂等）·
 *  登记表据 HASTE_RELIC_MANIFEST 驱动——真实逻辑落点见各条目 .impl（含外部文件，I4）*/
export function initStackingRelicBehaviors(): void {
  for (const id of Object.keys(HASTE_RELIC_MANIFEST)) registerRelicBehavior(id, () => {})

  if (_initialized) return
  _initialized = true
  eventBus.on('haste:granted', ({ skillId, amount }) => onHasteGranted(skillId, amount))
  eventBus.on('haste:consumed', ({ skillId, sourceKey }) => onHasteConsumed(skillId, sourceKey))
}
