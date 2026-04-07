// ============================================
// 打字肉鸽 - 教程模式状态机
// ============================================
// Story 56-3a: 独立教程模式（5 阶段交互式教学）

import { state, resetState } from '../../core/state'
import { showScreen } from '../battle'
import { stopBGM } from '../../effects/sound'
import { clearFloatTexts } from '../../ui/effects/FloatTextPool'

export type TutorialPhase = 1 | 2 | 3 | 4 | 5 | 'complete'

/** 教程专用词库（短词 + 含 F 的词≥4） */
export const TUTORIAL_WORDS = [
  'fire', 'flame', 'frost', 'frog',
  'ice', 'bolt', 'spark', 'storm',
  'wolf', 'hero', 'rock', 'wind',
]

let currentPhase: TutorialPhase = 1
let escHandler: ((e: KeyboardEvent) => void) | null = null

/** 获取当前教程阶段 */
export function getTutorialPhase(): TutorialPhase {
  return currentPhase
}

/** 启动教程模式 */
export function startTutorialMode(): void {
  stopBGM()
  clearFloatTexts()
  resetState()

  // 设置教程 flag
  state.isTutorial = true
  state.classId = 'none'
  state.gameMode = 'normal'
  state.dailySeed = null
  state.level = 1

  // 教程词库
  state.player.wordDeck = [...TUTORIAL_WORDS]

  currentPhase = 1

  // Esc 退出监听
  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && state.isTutorial) {
      exitTutorialMode()
    }
  }
  window.addEventListener('keydown', escHandler)

  // 显示战斗界面（阶段 1 占位 — 后续 56-3c 实现具体阶段逻辑）
  showScreen('battle')
}

/** 推进到下一阶段 */
export function advanceTutorialPhase(): void {
  if (currentPhase === 'complete') return
  if (currentPhase === 5) {
    currentPhase = 'complete'
  } else {
    currentPhase = (currentPhase + 1) as TutorialPhase
  }
}

/** 退出教程模式回主菜单 */
export function exitTutorialMode(): void {
  // 移除 Esc 监听
  if (escHandler) {
    window.removeEventListener('keydown', escHandler)
    escHandler = null
  }

  stopBGM()
  clearFloatTexts()
  resetState()
  state.isTutorial = false
  showScreen('menu')
}
