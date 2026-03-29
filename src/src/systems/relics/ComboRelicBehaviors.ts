// ============================================
// 打字肉鸽 - 连击/倍率系统遗物行为 (Story 36.3)
// ============================================

import { state } from '../../core/state'
import { registerRelicBehavior, setRelicState, getRelicState } from './RelicPipeline'
import { eventBus } from '../../core/events/EventBus'

// === 连击缓冲 (combo_buffer) ===

/**
 * 计算 combo 缓冲后应保留的值
 * @param currentCombo 中断前的 combo 值
 * @returns 缓冲后保留的 combo 值（0 = 无缓冲或未持有）
 */
export function calculateComboBuffer(currentCombo: number): number {
  if (!state.player.relics.has('combo_buffer')) return 0
  return Math.floor(currentCombo * 0.5)
}

// === 倍率棱镜 (multiplier_prism) ===

/**
 * 获取倍率棱镜加成（技能产出百分比）
 * @returns 0.2 当 multiplier >= 2.5 且持有遗物；否则 0
 */
export function getMultiplierPrismBonus(): number {
  if (!state.player.relics.has('multiplier_prism')) return 0
  if (state.multiplier < 2.5) return 0
  return 0.2
}

// === 节奏医生 (rhythm_doctor) ===

const RHYTHM_DOCTOR_INTERVAL = 10

/**
 * 检查节奏医生是否应触发 +1s
 * 当 combo 跨越 10 的倍数点时触发
 * @param newCombo combo++ 后的新值
 * @returns 应加的时间（秒），0 = 不触发
 */
export function checkRhythmDoctor(newCombo: number): number {
  if (!state.player.relics.has('rhythm_doctor')) return 0
  const lastMilestone = getRelicState('rhythm_doctor') ?? 0
  const nextMilestone = lastMilestone + RHYTHM_DOCTOR_INTERVAL
  if (newCombo >= nextMilestone) {
    setRelicState('rhythm_doctor', nextMilestone)
    return 1
  }
  return 0
}

/**
 * 同步节奏医生 milestone（combo 中断时调用）
 */
export function syncRhythmDoctorMilestone(newCombo: number): void {
  if (!state.player.relics.has('rhythm_doctor')) return
  setRelicState('rhythm_doctor', Math.floor(newCombo / RHYTHM_DOCTOR_INTERVAL) * RHYTHM_DOCTOR_INTERVAL)
}

// === 连击引爆 (combo_detonator) ===

const DETONATOR_THRESHOLDS = [15, 30, 45]

/**
 * 检查连击引爆是否应触发
 * @param newCombo combo++ 后的新值
 * @returns 应触发的技能数（0 = 不触发，3 = 触发）
 */
export function checkComboDetonator(newCombo: number): number {
  if (!state.player.relics.has('combo_detonator')) return 0
  const triggered = getRelicState('combo_detonator') ?? 0
  for (let i = 0; i < DETONATOR_THRESHOLDS.length; i++) {
    const threshold = DETONATOR_THRESHOLDS[i]
    const bit = 1 << i
    if (newCombo >= threshold && (triggered & bit) === 0) {
      setRelicState('combo_detonator', triggered | bit)
      return 3
    }
  }
  return 0
}

/**
 * 重置连击引爆状态（每关调用）
 */
export function resetComboDetonator(): void {
  if (state.player.relics.has('combo_detonator')) {
    setRelicState('combo_detonator', 0)
  }
}

// === 不灭连击 (immortal_combo) ===

/** 上关结束时的 combo 数（获得不断之链时追溯用） */
let _lastBattleCombo = 0

/** 由 battle.ts 在关卡初始化时调用，保存上关 combo */
export function saveLastBattleCombo(combo: number): void {
  _lastBattleCombo = combo
}

/**
 * 检查是否持有不灭连击
 */
export function hasImmortalCombo(): boolean {
  return state.player.relics.has('immortal_combo')
}

// === 模块重置（关级别） ===

/**
 * 重置关级别状态 — 在 startLevel() 中调用
 */
export function resetComboRelicState(): void {
  resetComboDetonator()
  if (state.player.relics.has('rhythm_doctor')) {
    // 不灭连击时 combo 不重置，milestone 也不重置
    if (!hasImmortalCombo()) {
      setRelicState('rhythm_doctor', 0)
    }
  }
}

// === 注册所有行为 ===

/**
 * 初始化连击子系统遗物行为注册
 */
export function initComboRelicBehaviors(): void {
  registerRelicBehavior('combo_detonator', (_relicId, _context) => {
    // 实际逻辑在 checkComboDetonator() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('immortal_combo', (_relicId, _context) => {
    // 实际逻辑在 hasImmortalCombo() 中
  })

  // 获得不断之链时追溯上关 combo
  eventBus.on('relic:acquired', ({ relicId }) => {
    if (relicId === 'immortal_combo' && _lastBattleCombo > 0) {
      state.combo = _lastBattleCombo
    }
  })
}
