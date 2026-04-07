// ============================================
// 打字肉鸽 - 教程模式状态机
// ============================================
// Story 56-3a: 基础设施
// Story 56-3c: 阶段 1-4 战斗教程

import { t } from '../../demo/demo-i18n'
import { state, resetState } from '../../core/state'
import { showScreen, startLevel } from '../battle'
import { stopBGM, initAudio } from '../../effects/sound'
import { clearFloatTexts } from '../../ui/effects/FloatTextPool'
import { eventBus } from '../../core/events/EventBus'
import { showPrompt, dismissPrompt } from '../../ui/tutorial/TutorialPrompt'
import { generateSkill } from '../../data/skillGeneration'
import { createSkillRuntimeState } from '../../data/affixes'
import { bindShapeToKeys, getBindingState } from '../bindingManager'
import { resetCycleTracking } from '../battle'

export type TutorialPhase = 1 | 2 | 3 | 4 | 5 | 'complete'

/** 教程专用词库 */
export const TUTORIAL_WORDS = [
  'fire', 'flame', 'frost', 'frog',
  'ice', 'bolt', 'spark', 'storm',
  'wolf', 'hero', 'rock', 'wind',
]

/** 含 F 的词（阶段 4 优先选用） */
const F_WORDS = ['fire', 'flame', 'frost', 'frog']

let currentPhase: TutorialPhase = 1
let escHandler: ((e: KeyboardEvent) => void) | null = null
let aborted = false

export function getTutorialPhase(): TutorialPhase { return currentPhase }

/** 启动教程模式 */
export function startTutorialMode(): void {
  stopBGM()
  clearFloatTexts()
  resetState()

  state.isTutorial = true
  state.classId = 'none'
  state.gameMode = 'normal'
  state.dailySeed = null
  state.level = 1
  state.player.wordDeck = [...TUTORIAL_WORDS]

  currentPhase = 1
  aborted = false

  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && state.isTutorial) {
      exitTutorialMode()
    }
  }
  window.addEventListener('keydown', escHandler)

  void runTutorialPhases()
}

/** 推进阶段 */
export function advanceTutorialPhase(): void {
  if (currentPhase === 'complete') return
  if (currentPhase === 5) { currentPhase = 'complete' }
  else { currentPhase = (currentPhase + 1) as TutorialPhase }
}

/** 退出教程 */
export function exitTutorialMode(): void {
  aborted = true
  dismissPrompt()
  if (escHandler) { window.removeEventListener('keydown', escHandler); escHandler = null }
  stopBGM()
  clearFloatTexts()
  resetState()
  state.isTutorial = false
  showScreen('menu')
}

// ==========================================
// 教程主流程
// ==========================================

async function runTutorialPhases(): Promise<void> {
  // --- 阶段 1: 打字基础 ---
  currentPhase = 1
  resetBattleForPhase()
  state.time = 9999; state.timeMax = 9999; state.targetScore = 99999
  setTutorialHUD(1)
  showScreen('battle')
  initAudio()

  await showPrompt('tutorial.phase1.intro')
  if (aborted) return

  // 启动关卡（无时限模式）
  resetCycleTracking()
  void startLevel()
  await waitForWords(3)
  if (aborted) return

  await showPrompt('tutorial.phase1.done')
  if (aborted) return

  // --- 阶段 2: 连击与倍率 ---
  advanceTutorialPhase()
  setTutorialHUD(2)

  await showPrompt('tutorial.phase2.intro')
  if (aborted) return

  await waitForWords(5)
  if (aborted) return

  await showPrompt('tutorial.phase2.mult')
  if (aborted) return

  // --- 阶段 3: 时间与目标 ---
  advanceTutorialPhase()
  resetBattleForPhase()
  state.time = 30; state.timeMax = 30; state.targetScore = 300
  state.score = 0
  setTutorialHUD(3)

  await showPrompt('tutorial.phase3.intro')
  if (aborted) return

  resetCycleTracking()
  void startLevel()

  // 等待达标或时间到
  const p3result = await waitForTargetOrTimeUp()
  if (aborted) return

  if (p3result === 'reached') {
    await showPrompt('tutorial.phase3.reached')
  } else {
    await showPrompt('tutorial.phase3.fail')
  }
  if (aborted) return

  // --- 阶段 4: 技能触发 ---
  advanceTutorialPhase()
  resetBattleForPhase()
  state.time = 45; state.timeMax = 45; state.targetScore = 200
  state.score = 0
  // 优先选含 F 的词
  state.player.wordDeck = [...F_WORDS, ...TUTORIAL_WORDS.filter(w => !F_WORDS.includes(w))]
  setTutorialHUD(4)

  // 赠送预设技能绑定 F 键
  const skill = generateSkill({ resource: 'base', rarity: 0, level: 1 })
  state.affixSkills.set(skill.id, skill)
  state.affixSkillStates.set(skill.id, createSkillRuntimeState(skill.id))
  state.player.skills.set(skill.id, { level: 1, name: skill.name })
  bindShapeToKeys(getBindingState(state), skill.id, 'f')

  await showPrompt('tutorial.phase4.intro')
  if (aborted) return

  await showPrompt('tutorial.phase4.hint')
  if (aborted) return

  resetCycleTracking()
  void startLevel()

  await waitForSkillTriggers(3)
  if (aborted) return

  await showPrompt('tutorial.phase4.done')
  if (aborted) return

  // --- 阶段 5: 商店 ---
  advanceTutorialPhase()
  state.gold = 200

  // 生成教程固定商品
  const tutorialShopItems: import('../../core/types').ShopItem[] = (['base', 'multiplier', 'time'] as const).map(res => {
    const sk = generateSkill({ resource: res, rarity: 0, level: 1 })
    return { type: 'skill' as const, skill: sk, price: 50, locked: false }
  })
  state.shop.items = tutorialShopItems
  state.shop.refreshCount = 0

  // openShop 会检测 isTutorial 保留预设商品
  const { openShop } = await import('../shop')
  openShop(true)

  await showPrompt('tutorial.phase5.intro')
  if (aborted) return

  // 等待购买
  await waitForShopPurchase()
  if (aborted) return

  await showPrompt('tutorial.phase5.bind')
  if (aborted) return

  await showPrompt('tutorial.phase5.done')
  if (aborted) return

  // --- 完成画面 ---
  showTutorialComplete()
}

// ==========================================
// Helper: 等待打词数
// ==========================================
function waitForWords(count: number): Promise<void> {
  return new Promise(resolve => {
    let n = 0
    const check = setInterval(() => {
      if (aborted) { unsub(); clearInterval(check); resolve() }
    }, 200)
    const unsub = eventBus.on('word:complete', () => {
      n++
      if (n >= count) { unsub(); clearInterval(check); resolve() }
    })
  })
}

// ==========================================
// Helper: 等待达标或时间到
// ==========================================
function waitForTargetOrTimeUp(): Promise<'reached' | 'time_up'> {
  return new Promise(resolve => {
    let resolved = false
    const check = setInterval(() => {
      if (aborted) { done('time_up') }
    }, 200)
    const done = (r: 'reached' | 'time_up') => {
      if (resolved) return
      resolved = true; unsub1(); unsub2(); clearInterval(check); resolve(r)
    }
    const unsub1 = eventBus.on('word:complete', () => {
      if (state.score >= state.targetScore) done('reached')
    })
    const unsub2 = eventBus.on('tutorial:time_up', () => done('time_up'))
  })
}

// ==========================================
// Helper: 等待技能触发次数
// ==========================================
function waitForSkillTriggers(count: number): Promise<void> {
  return new Promise(resolve => {
    let n = 0
    const check = setInterval(() => {
      if (aborted) { unsub(); clearInterval(check); resolve() }
    }, 200)
    const unsub = eventBus.on('skill:triggered', () => {
      n++
      if (n >= count) { unsub(); clearInterval(check); resolve() }
    })
  })
}

// ==========================================
// Helper: 重置战斗 state（阶段间）
// ==========================================
function resetBattleForPhase(): void {
  state.combo = 0
  state.maxCombo = 0
  state.multiplier = 1.0
  state.overkill = 0
  state.overflowScore = 0
  state.player.word = ''
  state.player.index = 0
  state.battleStats = null
}

// ==========================================
// Helper: HUD 显隐控制
// ==========================================
function setTutorialHUD(phase: number): void {
  const comboEl = document.getElementById('combo-count')
  const multEl = document.getElementById('multiplier-display')
  const timerSection = document.getElementById('timer-section')
  const targetEl = document.getElementById('target-score')
  const triggerZone = document.getElementById('skill-trigger-zone')
  const relicBar = document.getElementById('player-relics')

  // P1: 仅 word + score
  if (comboEl) comboEl.style.display = phase >= 2 ? '' : 'none'
  if (multEl) multEl.style.display = phase >= 2 ? '' : 'none'
  if (timerSection) timerSection.style.display = phase >= 3 ? '' : 'none'
  if (targetEl) targetEl.style.display = phase >= 3 ? '' : 'none'
  if (triggerZone) triggerZone.style.display = phase >= 4 ? '' : 'none'
  if (relicBar) relicBar.style.display = 'none' // 教程中始终隐藏遗物
}

// ==========================================
// Helper: 等待商店购买
// ==========================================
function waitForShopPurchase(): Promise<void> {
  return new Promise(resolve => {
    const unsub = eventBus.on('shop:purchase', () => {
      unsub(); resolve()
    })
    const check = setInterval(() => {
      if (aborted) { unsub(); clearInterval(check); resolve() }
    }, 200)
  })
}

// ==========================================
// 完成画面
// ==========================================
function showTutorialComplete(): void {
  const container = document.getElementById('game-container')
  if (!container) { exitTutorialMode(); return }

  const overlay = document.createElement('div')
  overlay.className = 'tutorial-complete-overlay'
  overlay.innerHTML = `
    <div class="tutorial-complete-panel">
      <div class="tutorial-complete-title">${esc(t('tutorial.complete.title'))}</div>
      <div class="tutorial-complete-body">${esc(t('tutorial.complete.body'))}</div>
      <ul class="tutorial-complete-list">
        <li>✓ ${esc(t('tutorial.complete.s1'))}</li>
        <li>✓ ${esc(t('tutorial.complete.s2'))}</li>
        <li>✓ ${esc(t('tutorial.complete.s3'))}</li>
        <li>✓ ${esc(t('tutorial.complete.s4'))}</li>
        <li>✓ ${esc(t('tutorial.complete.s5'))}</li>
      </ul>
      <button class="menu-btn menu-btn-start tutorial-complete-btn">${esc(t('tutorial.complete.btn'))}</button>
    </div>
  `
  container.appendChild(overlay)

  const btn = overlay.querySelector('.tutorial-complete-btn')
  if (btn) {
    btn.addEventListener('click', () => {
      overlay.remove()
      exitTutorialMode()
    }, { once: true })
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
