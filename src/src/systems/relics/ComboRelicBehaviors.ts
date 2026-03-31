// ============================================
// 打字肉鸽 - 连击/倍率系统遗物行为 (Story 36.3)
// ============================================

import { state } from '../../core/state'
import { registerRelicBehavior, setRelicState, getRelicState } from './RelicPipeline'
import { eventBus } from '../../core/events/EventBus'

// === 回声指套 (echo_thimble) — 从 TypingRelicBehaviors 迁入 ===

/** 回声指套触发概率 */
const ECHO_THIMBLE_CHANCE = 0.08

/**
 * 检查回声指套是否触发双重击键
 * @param randomValue 0-1 随机数（外部传入便于测试）
 * @returns true 如果触发双重击键
 */
export function checkEchoThimble(randomValue: number): boolean {
  if (!state.player.relics.has('echo_thimble')) return false
  return randomValue < ECHO_THIMBLE_CHANCE
}

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

// === 连击引爆 (combo_detonator) ===

const DETONATOR_THRESHOLD = 15

/**
 * 检查连击引爆是否应触发
 * combo 达到 15 时触发一次；之后需要 combo 归零（打错）才能再次触发。
 * @param newCombo combo++ 后的新值
 * @returns 应触发的技能数（0 = 不触发，3 = 触发）
 */
export function checkComboDetonator(newCombo: number): number {
  if (!state.player.relics.has('combo_detonator')) return 0
  const fired = getRelicState('combo_detonator') ?? 0
  if (!fired && newCombo >= DETONATOR_THRESHOLD) {
    setRelicState('combo_detonator', 1)
    return 3
  }
  return 0
}

/**
 * combo 归零时重置引爆状态（由 playerWrong 调用）
 */
export function onComboBreakDetonator(): void {
  if (state.player.relics.has('combo_detonator')) {
    setRelicState('combo_detonator', 0)
  }
}

/**
 * 重置连击引爆状态（每关调用）
 */
export function resetComboDetonator(): void {
  if (state.player.relics.has('combo_detonator')) {
    setRelicState('combo_detonator', 0)
  }
}

// === 取消连锁 (cancel) ===
// 灵感：格斗游戏的取消机制。打字游戏中"硬直"= 阅读新词的时间。
// 在 0.4s 内打对首字母 = "取消"阅读硬直，跳过安全阅读直接打字。
// 快但没看清 → 打错代价更大。

const CANCEL_WINDOW_MS = 400
const CANCEL_CHAIN_MAX = 5
const CANCEL_CHAIN_BONUS_PER_STACK = 0.10
const CANCEL_ERROR_PENALTY = 0.5 // 秒

let _cancelChainCount = 0
let _wordAppearTime = 0
/** 当前词是否已检查过取消窗口（首字母时判定一次） */
let _cancelCheckedThisWord = false
/** 当前词是否处于"已取消"状态（打错时加重惩罚） */
let _wordCancelled = false

/**
 * 新词出现时记录时间戳（由 setWord 调用）
 */
export function onNewWordForCancel(): void {
  if (!state.player.relics.has('cancel')) return
  _wordAppearTime = performance.now()
  _cancelCheckedThisWord = false
  _wordCancelled = false
}

/**
 * 首字母正确时检查是否在取消窗口内
 * @returns true 如果成功取消（用于视觉反馈）
 */
export function checkCancelOnFirstLetter(): boolean {
  if (!state.player.relics.has('cancel')) return false
  if (_cancelCheckedThisWord) return false
  _cancelCheckedThisWord = true
  if (_wordAppearTime <= 0) return false
  const elapsed = performance.now() - _wordAppearTime
  if (elapsed <= CANCEL_WINDOW_MS) {
    _wordCancelled = true
    return true
  }
  // 超时 → 安全模式，连锁不变
  return false
}

/**
 * 完成一个被取消的词且无失误 → 连锁+1
 * 由 completeWord 在 wordPerfect 时调用
 */
export function onCancelledWordComplete(): void {
  if (!state.player.relics.has('cancel')) return
  if (_wordCancelled) {
    _cancelChainCount = Math.min(_cancelChainCount + 1, CANCEL_CHAIN_MAX)
  }
}

/**
 * 获取当前词的取消连锁技能产出加成
 * 只有被取消的词才有加成
 */
export function getCancelChainBonus(): number {
  if (!state.player.relics.has('cancel')) return 0
  if (!_wordCancelled) return 0
  return _cancelChainCount * CANCEL_CHAIN_BONUS_PER_STACK
}

/** 当前连锁层数 */
export function getCancelChainCount(): number {
  return _cancelChainCount
}

/** 当前词是否处于取消状态 */
export function isWordCancelled(): boolean {
  return _wordCancelled
}

/**
 * 取消状态下打错 → 连锁归零 + 额外时间惩罚
 * @returns 额外扣除的时间（秒），0 = 非取消词或未持有
 */
export function onCancelledWordError(): number {
  if (!state.player.relics.has('cancel')) return 0
  if (_wordCancelled) {
    _cancelChainCount = 0
    _wordCancelled = false
    return CANCEL_ERROR_PENALTY
  }
  return 0
}

/**
 * 关级别重置
 */
export function resetCancelChainState(): void {
  _cancelChainCount = 0
  _wordAppearTime = 0
  _cancelCheckedThisWord = false
  _wordCancelled = false
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

// === 暴走节拍 (fury_beat) — 跨子系统暴击率遗物 ===

/** 暴走节拍 combo 阈值 */
export const FURY_BEAT_COMBO_THRESHOLD = 10
/** 暴走节拍暴击率加成 */
export const FURY_BEAT_CRIT_RATE = 0.10

/** combo ≥ 阈值且持有遗物 → FURY_BEAT_CRIT_RATE，否则 0 */
export function getFuryBeatCritRate(): number {
  if (!state.player.relics.has('fury_beat')) return 0
  if (state.combo < FURY_BEAT_COMBO_THRESHOLD) return 0
  return FURY_BEAT_CRIT_RATE
}

// === 模块重置（关级别） ===

/**
 * 重置关级别状态 — 在 startLevel() 中调用
 */
export function resetComboRelicState(): void {
  resetComboDetonator()
  resetCancelChainState()
}

// === 注册所有行为 ===

/**
 * 初始化连击子系统遗物行为注册
 */
export function initComboRelicBehaviors(): void {
  registerRelicBehavior('double_keystroke', (_relicId, _context) => {
    // 回声指套的实际逻辑在 checkEchoThimble() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('combo_detonator', (_relicId, _context) => {
    // 实际逻辑在 checkComboDetonator() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('cancel', (_relicId, _context) => {
    // 实际逻辑在 checkCancelOnKeystroke() / getCancelChainBonus() 中
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
