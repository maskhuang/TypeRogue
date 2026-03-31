// ============================================
// 打字肉鸽 - Boss修饰器系统遗物行为 (Story 36.11)
// ============================================
// 5 个Boss修饰器系统遗物的纯函数行为模块

import { state } from '../../core/state'
import { getStageType } from '../stage/stageFlow'
import { registerRelicBehavior } from './RelicPipeline'
import {
  getActiveInstances,
  forceRebuildParams,
  replaceTemporaryModifier,
} from '../bossModifierEngine'
import { generateBossModifierCandidates, BOSS_MODIFIER_META } from '../../data/bossModifiers'
import type { BossModifierParams } from '../../data/bossModifiers'

// === 常量 ===
export const SHIELD_REDUCE = 0.25
export const BOUNTY_DISCOUNT_PER_MOD = 0.05
export const BOUNTY_DISCOUNT_CAP = 0.30
export const BARRIER_WORD_THRESHOLD = 3
export const CHAOS_WORD_INTERVAL = 5

// === 数值型参数键（用于反转/翻倍） ===
const NUMERIC_PARAM_KEYS: (keyof BossModifierParams)[] = [
  'decayRate', 'scoreCapPct', 'diminishRate', 'targetMultiplier',
  'escalateStep', 'scoreTaxPct',
]

// === 模块级状态 ===

let _barrierDelaying = false
let _barrierWordCount = 0
let _deferredModifiers: Array<{ modId: import('../../data/bossModifiers').BossModifierId; isElite: boolean }> = []
let _chaosWordCount = 0
let _pardonUsedThisBoss = false

// === 修饰器护盾 (modifier_shield) ===

/** 通用负面数值削弱：有遗物 + isDebuff → rawValue * (1 - SHIELD_REDUCE) */
export function getShieldedValue(rawValue: number, isDebuff: boolean): number {
  if (!state.player.relics.has('modifier_shield')) return rawValue
  if (!isDebuff) return rawValue
  return rawValue * (1 - SHIELD_REDUCE)
}

/** timeSpeed 护盾：将加速部分削弱 25%（1.5 → 1.375） */
export function getShieldedTimeSpeed(rawSpeed: number): number {
  if (!state.player.relics.has('modifier_shield')) return rawSpeed
  return (rawSpeed - 1) * (1 - SHIELD_REDUCE) + 1
}

/** scoreCap 护盾：提高上限 25% */
export function getShieldedScoreCap(rawCap: number): number {
  if (!state.player.relics.has('modifier_shield')) return rawCap
  return Math.ceil(rawCap / (1 - SHIELD_REDUCE))
}

/** targetMultiplier 护盾：将超出部分削弱 25%（2.0 → 1.75） */
export function getShieldedTargetMultiplier(rawMult: number): number {
  if (!state.player.relics.has('modifier_shield')) return rawMult
  return (rawMult - 1) * (1 - SHIELD_REDUCE) + 1
}

// === 困境红利 (bounty_hunter) ===

/** 有遗物 → 返回永久修饰器数量 × 5% 的商店折扣比例（上限 30%），否则 0 */
export function getBountyHunterDiscount(): number {
  if (!state.player.relics.has('bounty_hunter')) return 0
  return Math.min(state.activeModifiers.length * BOUNTY_DISCOUNT_PER_MOD, BOUNTY_DISCOUNT_CAP)
}

// === 赦免状 (modifier_pardon) ===

/** 有遗物且本Boss未使用过 → true */
export function hasModifierPardon(): boolean {
  return state.player.relics.has('modifier_pardon') && !_pardonUsedThisBoss
}

/** 消耗本Boss的赦免次数 */
export function consumeModifierPardon(): void {
  _pardonUsedThisBoss = true
}

// === 修饰器屏障 (modifier_barrier) — 延迟生效 ===

/** 有遗物 + 精英/Boss 关 → 应延迟临时修饰器 */
export function shouldBarrierDelay(): boolean {
  if (!state.player.relics.has('modifier_barrier')) return false
  const stageType = getStageType(state.level)
  return stageType === 'boss' || stageType === 'elite'
}

/** 开始屏障延迟：存储待应用的临时修饰器 */
export function startBarrierDelay(): void {
  _barrierDelaying = true
  _deferredModifiers = []
}

/** 将一个临时修饰器加入延迟队列 */
export function addDeferredModifier(modId: import('../../data/bossModifiers').BossModifierId, isElite: boolean): void {
  _deferredModifiers.push({ modId, isElite })
}

/** 当前是否正在延迟 */
export function isBarrierDelaying(): boolean {
  return _barrierDelaying
}

/** 每完成一词调用：完成第 3 个词后返回待应用列表并结束延迟，否则 null */
export function checkBarrierActivation(): Array<{ modId: import('../../data/bossModifiers').BossModifierId; isElite: boolean }> | null {
  if (!_barrierDelaying) return null
  _barrierWordCount++
  if (_barrierWordCount < BARRIER_WORD_THRESHOLD) return null
  _barrierDelaying = false
  const deferred = [..._deferredModifiers]
  _deferredModifiers = []
  return deferred
}

// === 混沌轮盘 (chaos_roulette) ===

/** 每完成一词调用：有遗物 + Boss关 → 每 5 词替换一个临时修饰器。返回是否触发了替换 */
export function checkChaosRoulette(): boolean {
  if (!state.player.relics.has('chaos_roulette')) return false
  if (getStageType(state.level) !== 'boss') return false

  _chaosWordCount++
  if (_chaosWordCount % CHAOS_WORD_INTERVAL !== 0) return false

  const instances = getActiveInstances()
  const temporaryInstances = instances.filter(inst => !inst.isPermanent)
  if (temporaryInstances.length === 0) return false

  // 随机选一个临时修饰器
  const oldInst = temporaryInstances[Math.floor(Math.random() * temporaryInstances.length)]

  // 获取所有活跃 modId，用于排除
  const activeIds = instances.map(inst => inst.modId)
  const candidates = generateBossModifierCandidates(activeIds)
  if (candidates.length === 0) return false

  const newModId = candidates[Math.floor(Math.random() * candidates.length)]
  replaceTemporaryModifier(oldInst.modId, newModId)
  return true
}

// === 修饰器反转 (modifier_reversal) ===

/**
 * 关卡开始、所有修饰器应用后调用：
 * 在进攻类和防御类修饰器中各找一个，随机反转其中一个、翻倍另一个。
 * 干扰类不受影响。
 */
export function applyModifierReversal(): void {
  if (!state.player.relics.has('modifier_reversal')) return

  const instances = getActiveInstances()
  if (instances.length === 0) return

  // 找到第一个 offense 和第一个 defense 实例
  const offenseInst = instances.find(inst => BOSS_MODIFIER_META[inst.modId]?.category === 'offense')
  const defenseInst = instances.find(inst => BOSS_MODIFIER_META[inst.modId]?.category === 'defense')

  const targets = [offenseInst, defenseInst].filter(Boolean) as typeof instances[number][]
  if (targets.length === 0) return

  // 随机选一个反转，其余翻倍
  const invertIdx = Math.floor(Math.random() * targets.length)

  for (let i = 0; i < targets.length; i++) {
    const params = targets[i].params
    if (i === invertIdx) {
      // 反转：数值取反/无效化
      for (const key of NUMERIC_PARAM_KEYS) {
        if (params[key] == null) continue
        if (key === 'timeSpeed') {
          params[key] = 2 - params[key]!
        } else if (key === 'scoreCapPct') {
          params[key] = Infinity
        } else if (key === 'targetMultiplier') {
          const oldMult = params[key]!
          params[key] = Math.max(0.5, 2 - oldMult)
          if (oldMult > 0) {
            state.targetScore = Math.floor(state.targetScore / oldMult * params[key]!)
          }
        } else if (key === 'scoreTaxPct') {
          params[key] = 0
        } else {
          params[key] = -(params[key]!)
        }
      }
    } else {
      // 翻倍
      for (const key of NUMERIC_PARAM_KEYS) {
        if (params[key] == null) continue
        if (key === 'timeSpeed') {
          params[key] = Math.min(params[key]! * 2, 2.0)
        } else if (key === 'scoreCapPct') {
          params[key] = params[key]! / 2
        } else if (key === 'targetMultiplier') {
          const oldMult = params[key]!
          params[key] = oldMult * 2
          if (oldMult > 0) {
            state.targetScore = Math.floor(state.targetScore / oldMult * params[key]!)
          }
        } else {
          params[key] = params[key]! * 2
        }
      }
    }
  }

  forceRebuildParams()
}

// === 生命周期 ===

/** 每关开始时重置关级状态 */
export function resetBossModifierRelicBattleState(): void {
  _barrierDelaying = false
  _barrierWordCount = 0
  _deferredModifiers = []
  _chaosWordCount = 0
  _pardonUsedThisBoss = false
}

/** 注册Boss修饰器系统遗物行为 */
export function initBossModifierRelicBehaviors(): void {
  registerRelicBehavior('modifier_barrier', () => {
    // 行为逻辑由 shouldBarrierBlock() 在 startLevel 中直接调用
  })
  registerRelicBehavior('chaos_roulette', () => {
    // 行为逻辑由 checkChaosRoulette() 在 completeWord 中直接调用
  })
  registerRelicBehavior('modifier_reversal', () => {
    // 行为逻辑由 applyModifierReversal() 在 startLevel 中直接调用
  })
  registerRelicBehavior('modifier_pardon', () => {
    // 行为逻辑由 hasModifierPardon/consumeModifierPardon 在 bossModifierPicker 中调用
  })
}
