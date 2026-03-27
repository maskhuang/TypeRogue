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
export const BOUNTY_GOLD_PER_MOD = 0.20
export const CHAOS_WORD_INTERVAL = 5

// === 数值型参数键（用于反转/翻倍） ===
const NUMERIC_PARAM_KEYS: (keyof BossModifierParams)[] = [
  'decayRate', 'comboPunishRate', 'timeSpeed', 'scoreCap', 'diminishRate', 'targetMultiplier',
  'keystrokeTax', 'escalateStep', 'frostPenalty', 'taxRate', 'scoreTaxFlat',
]

// === 模块级状态 ===

let _barrierUsedThisStage = false
let _chaosWordCount = 0

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

/** scoreCap 护盾：提高上限 25%（50 → 67） */
export function getShieldedScoreCap(rawCap: number): number {
  if (!state.player.relics.has('modifier_shield')) return rawCap
  return Math.ceil(rawCap / (1 - SHIELD_REDUCE))
}

/** targetMultiplier 护盾：将超出部分削弱 25%（2.0 → 1.75） */
export function getShieldedTargetMultiplier(rawMult: number): number {
  if (!state.player.relics.has('modifier_shield')) return rawMult
  return (rawMult - 1) * (1 - SHIELD_REDUCE) + 1
}

// === 赏金猎人 (bounty_hunter) ===

/** 有遗物 → 返回永久修饰器数量 × BOUNTY_GOLD_PER_MOD 的加算比例，否则 0 */
export function getBountyHunterGoldBonus(): number {
  if (!state.player.relics.has('bounty_hunter')) return 0
  return state.activeModifiers.length * BOUNTY_GOLD_PER_MOD
}

// === 修饰器屏障 (modifier_barrier) ===

/** 有遗物 + Boss关 + 未使用 → true（设置已使用标记），否则 false */
export function shouldBarrierBlock(): boolean {
  if (!state.player.relics.has('modifier_barrier')) return false
  const stageType = getStageType(state.level)
  if (stageType !== 'boss') return false
  if (_barrierUsedThisStage) return false
  _barrierUsedThisStage = true
  return true
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

/** 关卡开始、所有修饰器应用后调用：随机分两半，一半反转为增益，另一半数值 ×2 */
export function applyModifierReversal(): void {
  if (!state.player.relics.has('modifier_reversal')) return

  const instances = getActiveInstances()
  if (instances.length === 0) return

  // Fisher-Yates shuffle 一份索引数组
  const indices = instances.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }

  const halfLen = Math.floor(indices.length / 2)
  const invertIndices = new Set(indices.slice(0, halfLen))

  for (let i = 0; i < instances.length; i++) {
    const inst = instances[i]
    const params = inst.params
    const category = BOSS_MODIFIER_META[inst.modId]?.category

    if (category === 'disruption') {
      // 干扰类特殊处理：反转=禁用，增强=参数翻倍/减半
      if (invertIndices.has(i)) {
        // 禁用：所有打字干扰参数置零/极大值
        for (const key of Object.keys(params) as (keyof BossModifierParams)[]) {
          if (['fadeSpeed', 'fadeSpeedEnd'].includes(key)) (params as any)[key] = 999
          else if (key === 'spotlightRadius') (params as any)[key] = 999
          else if (key === 'scrollHitZone') (params as any)[key] = 999
          else if (['scrambleMode', 'reverseActive', 'garbleActive'].includes(key)) (params as any)[key] = 0
          else if (['garbleRate', 'scrollSpeed'].includes(key)) (params as any)[key] = 0
        }
      } else {
        // 增强：速度翻倍/范围减半
        if (params.fadeSpeed) { params.fadeSpeed /= 2; if (params.fadeSpeedEnd) params.fadeSpeedEnd /= 2 }
        if (params.spotlightRadius) params.spotlightRadius = Math.max(1, Math.floor(params.spotlightRadius / 2))
        if (params.garbleRate) params.garbleRate = Math.min(params.garbleRate * 2, 0.8)
        if (params.scrollSpeed) params.scrollSpeed *= 2
        if (params.scrollHitZone) params.scrollHitZone = Math.max(20, Math.floor(params.scrollHitZone / 2))
      }
    } else {
      // offense / defense: NUMERIC_PARAM_KEYS 反转逻辑
      if (invertIndices.has(i)) {
        for (const key of NUMERIC_PARAM_KEYS) {
          if (params[key] == null) continue
          if (key === 'timeSpeed') {
            params[key] = 2 - params[key]!
          } else if (key === 'scoreCap') {
            params[key] = Infinity
          } else if (key === 'targetMultiplier') {
            const oldMult = params[key]!
            params[key] = Math.max(0.5, 2 - oldMult)
            if (oldMult > 0) {
              state.targetScore = Math.floor(state.targetScore / oldMult * params[key]!)
            }
          } else if (key === 'scoreTaxFlat') {
            // 无效化：置 0
            params[key] = 0
          } else {
            params[key] = -(params[key]!)
          }
        }
      } else {
        for (const key of NUMERIC_PARAM_KEYS) {
          if (params[key] == null) continue
          if (key === 'timeSpeed') {
            params[key] = Math.min(params[key]! * 2, 2.0)
          } else if (key === 'scoreCap') {
            params[key] = Math.floor(params[key]! / 2)
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
  }

  forceRebuildParams()
}

// === 生命周期 ===

/** 每关开始时重置关级状态 */
export function resetBossModifierRelicBattleState(): void {
  _barrierUsedThisStage = false
  _chaosWordCount = 0
}

/** 注册Boss修饰器系统遗物行为 */
export function initBossModifierRelicBehaviors(): void {
  registerRelicBehavior('modifier_barrier', () => {
    // 行为逻辑由 shouldBarrierBlock() 在 startLevel 中直接调用
  })
  registerRelicBehavior('chaos_roulette', () => {
    // 行为逻辑由 checkChaosRoulette() 在 completeWord 中直接调用
  })
  registerRelicBehavior('modifier_foresight', () => {
    // 行为逻辑由 showForesightModal() 在 startLevel 中直接调用
  })
  registerRelicBehavior('modifier_reversal', () => {
    // 行为逻辑由 applyModifierReversal() 在 startLevel 中直接调用
  })
}
