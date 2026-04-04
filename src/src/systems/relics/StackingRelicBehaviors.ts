// ============================================
// 打字肉鸽 - 叠层子系统遗物行为
// ============================================

import { state } from '../../core/state'
import { AffixType } from '../../data/affixes'
import { registerRelicBehavior } from './RelicPipeline'

// === 常量 ===
export const STACK_DIVIDEND_THRESHOLD = 10
export const STACK_DIVIDEND_BONUS = 0.05
export const SURGE_BONUS_PER_STACK = 0.10
export const DRUM_PASS_COMBO_INTERVAL = 5
export const DRUM_PASS_STACKS = 3
export const CRIT_OVERFLOW_STACKS = 3
export const INSCRIPTION_FLOW_GROWTH = 0.02
export const PERPETUAL_ENGINE_INTERVAL_MULT = 2

// === 模块级状态 ===

/** 层层递进：每个技能的间隔减少量（skillId → reduction） */
const _momentumReductions = new Map<string, number>()
/** 积少成多：每个技能的产出加成%（skillId → bonus） */
const _dividendBonuses = new Map<string, number>()
/** 积少成多：每个技能上次检查点层数（skillId → lastCheckpoint） */
const _dividendCheckpoints = new Map<string, number>()
/** 浪涌：本次触发的浪涌加成（临时，每次触发后清零） */
let _surgeBonus = 0
/** 击鼓传花：上次触发时的 combo 值 */
let _drumPassLastCombo = 0

// === 层层递进 (stack_momentum) ===

/** 获取技能的间隔减少量 */
export function getStackMomentumReduction(skillId: string): number {
  if (!state.player.relics.has('stack_momentum')) return 0
  return _momentumReductions.get(skillId) ?? 0
}

/** 叠层效果触发后调用：间隔临时 -1 */
export function onStackEffectTriggered(skillId: string): void {
  if (!state.player.relics.has('stack_momentum')) return
  const cur = _momentumReductions.get(skillId) ?? 0
  _momentumReductions.set(skillId, cur + 1)
}

// === 积少成多 (stack_dividend) ===

/** 获取积少成多产出加成% */
export function getStackDividendBonus(skillId: string): number {
  if (!state.player.relics.has('stack_dividend')) return 0
  return _dividendBonuses.get(skillId) ?? 0
}

/** 检查并更新积少成多（每次触发后调用） */
export function checkStackDividend(skillId: string, currentStacks: number): void {
  if (!state.player.relics.has('stack_dividend')) return
  const lastCp = _dividendCheckpoints.get(skillId) ?? 0
  const newCp = Math.floor(currentStacks / STACK_DIVIDEND_THRESHOLD)
  if (newCp > lastCp) {
    const gained = (newCp - lastCp) * STACK_DIVIDEND_BONUS
    const cur = _dividendBonuses.get(skillId) ?? 0
    _dividendBonuses.set(skillId, cur + gained)
    _dividendCheckpoints.set(skillId, newCp)
  }
}

// === 过载电路 (overload_circuit) ===

/** 是否启用过载电路 */
export function isOverloadCircuitActive(): boolean {
  return state.player.relics.has('overload_circuit')
}

// === 浪涌 (surge) ===

/** 是否启用浪涌 */
export function isSurgeActive(): boolean {
  return state.player.relics.has('surge')
}

/** 设置浪涌加成（叠层效果触发时调用） */
export function setSurgeBonus(stacks: number): void {
  _surgeBonus = stacks * SURGE_BONUS_PER_STACK
}

/** 获取浪涌加成（被增幅技能触发时读取） */
export function getSurgeBonus(): number {
  return _surgeBonus
}

/** 清零浪涌（触发周期结束后调用） */
export function clearSurgeBonus(): void {
  _surgeBonus = 0
}

// === 永动引擎 (perpetual_engine) ===

/** 是否启用永动引擎（叠层不重置） */
export function isPerpetualEngineActive(): boolean {
  return state.player.relics.has('perpetual_engine')
}

/** 获取永动引擎间隔倍数 */
export function getPerpetualEngineIntervalMult(): number {
  return state.player.relics.has('perpetual_engine') ? PERPETUAL_ENGINE_INTERVAL_MULT : 1
}

// === 击鼓传花 (drum_pass) ===

/** combo 更新时检查是否应给叠层技能加层 */
export function checkDrumPass(currentCombo: number): { skillId: string, stacks: number } | null {
  if (!state.player.relics.has('drum_pass')) return null
  const prevMilestone = Math.floor(_drumPassLastCombo / DRUM_PASS_COMBO_INTERVAL)
  const curMilestone = Math.floor(currentCombo / DRUM_PASS_COMBO_INTERVAL)
  _drumPassLastCombo = currentCombo
  if (curMilestone <= prevMilestone) return null

  // 找所有叠层技能（有 Splash/Resonance/Relay/Pulse/Amplify/WarDrum 词条的）
  const stackingSkillIds: string[] = []
  for (const [skillId, skill] of state.affixSkills) {
    if (skill.affixes.some(a => isStackingAffix(a.type))) {
      stackingSkillIds.push(skillId)
    }
  }
  if (stackingSkillIds.length === 0) return null
  const idx = Math.floor(Math.random() * stackingSkillIds.length)
  return { skillId: stackingSkillIds[idx], stacks: DRUM_PASS_STACKS }
}

// === 暴击溢层 (crit_overflow) ===

/** 获取暴击时额外叠层数 */
export function getCritOverflowStacks(): number {
  return state.player.relics.has('crit_overflow') ? CRIT_OVERFLOW_STACKS : 0
}

// === 铭文涌流 (inscription_flow) ===

/** 获取铭文涌流成长加成 */
export function getInscriptionFlowGrowth(): number {
  return state.player.relics.has('inscription_flow') ? INSCRIPTION_FLOW_GROWTH : 0
}

// === 邻里守望 (neighbor_watch) ===

/** 是否启用邻里守望 */
export function isNeighborWatchActive(): boolean {
  return state.player.relics.has('neighbor_watch')
}

// === 词根共振 (word_resonance) ===

/** 完成单词时获取额外叠层数 */
export function getWordResonanceStacks(wordLength: number): number {
  if (!state.player.relics.has('word_resonance')) return 0
  return Math.floor(wordLength / 3)
}

// === 辅助 ===

/** 判断词条类型是否为叠层式 */
export function isStackingAffix(type: AffixType): boolean {
  return type === AffixType.Splash
    || type === AffixType.Resonance
    || type === AffixType.Relay
    || type === AffixType.Pulse
    || type === AffixType.Amplify
    || type === AffixType.WarDrum
    || type === AffixType.Match
}

// === 生命周期 ===

/** 每词重置 */
export function resetStackingRelicWordState(): void {
  _drumPassLastCombo = state.combo ?? 0
}

/** 每关重置 */
export function resetStackingRelicBattleState(): void {
  _momentumReductions.clear()
  _dividendBonuses.clear()
  _dividendCheckpoints.clear()
  _surgeBonus = 0
  _drumPassLastCombo = 0
}

/** 注册叠层系统遗物行为 */
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
}
