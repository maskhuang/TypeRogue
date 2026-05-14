// ============================================
// 打字肉鸽 - 极速系遗物行为
// ============================================
// 原叠层子系统遗物（旧 affix 系统）已随 V2 重做废弃 →
// 1:1 复用 relic ID / 槽位 / 名字 / flavor，行为层重写为 V2 极速机制。
// 10 个遗物按触发钩子分组：
//   极速消耗 (haste:consumed)：stack_momentum / inscription_flow / overload_circuit / surge
//   极速获得 (haste:granted) ：stack_dividend / neighbor_watch
//   combo 里程碑            ：drum_pass
//   完词                   ：word_resonance
//   暴击 fire              ：crit_overflow
//   跨关持久（addHaste/clearAllHaste 内部处理）：perpetual_engine

import { state } from '../../core/state'
import { eventBus } from '../../core/events/EventBus'
import { grantHaste, clearHasteForSkill, addSkillCumFactor } from '../affixV2State'
import { hasRelation, PositionRelation } from '../../data/keyboardTopology'
import { registerRelicBehavior } from './RelicPipeline'

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

/** haste:granted → 积少成多累计 + 邻里守望传导 */
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

/** haste:consumed → 层层递进 / 铭文涌流 / 过载电路 / 浪涌 */
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

/** 注册极速系遗物行为 + 挂事件监听（幂等）*/
export function initStackingRelicBehaviors(): void {
  registerRelicBehavior('stack_momentum', () => {})
  registerRelicBehavior('stack_dividend', () => {})
  registerRelicBehavior('overload_circuit', () => {})
  registerRelicBehavior('surge', () => {})
  registerRelicBehavior('perpetual_engine', () => {})
  registerRelicBehavior('drum_pass', () => {})
  registerRelicBehavior('word_resonance', () => {})
  registerRelicBehavior('crit_overflow', () => {})
  registerRelicBehavior('inscription_flow', () => {})
  registerRelicBehavior('neighbor_watch', () => {})
  // stack_crit 行为在 affixV2BattleIntegration.onSkillFireV2 内（极速 fire 必定暴击），此处仅登记
  registerRelicBehavior('stack_crit', () => {})

  if (_initialized) return
  _initialized = true
  eventBus.on('haste:granted', ({ skillId, amount }) => onHasteGranted(skillId, amount))
  eventBus.on('haste:consumed', ({ skillId, sourceKey }) => onHasteConsumed(skillId, sourceKey))
}
