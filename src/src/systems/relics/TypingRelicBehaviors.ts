// ============================================
// 打字肉鸽 - 打字/输入系统遗物行为 (Story 36.2)
// ============================================

import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'
import { eventBus } from '../../core/events/EventBus'
import { unbindSkill, getBindingState } from '../bindingManager'
import { getRecycleSellMultiplier } from './ShopRelicBehaviors'

// === 模块级状态（关级别，不需持久化） ===

/** 本关已出现过的单词（小助手用） */
let seenWords: Set<string> = new Set()

/** 上个词的用时（秒），减速津贴/加速奖金用 */
let lastWordElapsed = -1

/**
 * 重置关级别状态 — 在 startLevel() 中调用
 */
export function resetTypingRelicState(): void {
  seenWords.clear()
  lastWordElapsed = -1
}

/**
 * 记录当前单词到已见列表 — 在 setWord() 中调用
 */
export function trackWord(word: string): void {
  seenWords.add(word.toUpperCase())
}

/**
 * 检查单词是否为重复词（已出现过）
 */
export function isRepeatWord(word: string): boolean {
  return seenWords.has(word.toUpperCase())
}

// === 小助手 Tab 自动补全检查 ===

/**
 * 检查是否可以 Tab 自动补全
 * @returns true 如果当前词可以自动补全（重复词 + 已打完首字母）
 */
export function canAutocomplete(): boolean {
  if (!state.player.relics.has('little_helper')) return false
  if (state.player.index < 1) return false // 还没打完首字母
  return isRepeatWord(state.player.word)
}

// === 减速津贴 + 加速奖金（在 completeWord 中调用） ===

/**
 * 检查减速/加速遗物
 * @param wordElapsed 当前词用时（秒）
 * @returns 时间加成和金币加成
 */
export function checkSpeedRelics(wordElapsed: number): { timeBonus: number; goldBonus: number } {
  let timeBonus = 0, goldBonus = 0
  if (lastWordElapsed >= 0) {
    if (state.player.relics.has('decelerate_reward') && wordElapsed > lastWordElapsed) timeBonus = 0.5
    if (state.player.relics.has('accelerate_reward') && wordElapsed < lastWordElapsed) goldBonus = 2
  }
  lastWordElapsed = wordElapsed
  return { timeBonus, goldBonus }
}

// === 回归基本功检查（得分×10，禁止装备技能） ===

/**
 * 检查是否持有回归基本功遗物
 * @returns true 如果持有回归基本功
 */
export function hasGlassCannon(): boolean {
  return state.player.relics.has('glass_cannon_v2')
}

// === 注册所有行为 ===

/**
 * 初始化打字子系统遗物行为注册
 * 在应用启动时调用一次
 */
export function initTypingRelicBehaviors(): void {
  registerRelicBehavior('decelerate_reward', (_relicId, _context) => {
    // 实际逻辑在 checkSpeedRelics() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('accelerate_reward', (_relicId, _context) => {
    // 实际逻辑在 checkSpeedRelics() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('autocomplete', (_relicId, _context) => {
    // 小助手的实际逻辑在 canAutocomplete() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('glass_cannon', (_relicId, _context) => {
    // 回归基本功：score×10 在 battle.ts completeWord() 中直接处理
    // 获取时卖出所有技能 + 禁止装备 在 relic:acquired 事件中处理
  })

  // 回归基本功：获取时卖出所有已有技能并回收金币
  eventBus.on('relic:acquired', ({ relicId }) => {
    if (relicId !== 'glass_cannon_v2') return
    const bs = getBindingState(state)
    const sellMult = getRecycleSellMultiplier()
    let totalGold = 0

    // 遍历所有技能，累加回收金币
    for (const [skillId, data] of state.player.skills) {
      const sellPrice = Math.floor((data.purchasePrice || 15) * sellMult)
      totalGold += sellPrice
      unbindSkill(bs, skillId)
    }

    // 清空技能相关数据
    state.affixSkills.clear()
    state.affixSkillStates.clear()
    state.player.skills.clear()
    state.player.bindings.clear()

    // 回收金币
    if (totalGold > 0) {
      state.player.gold += totalGold
    }
  })
}
