// ============================================
// 打字肉鸽 - 教程模式状态机
// ============================================
// Story 56-3a: 基础设施
// Story 56-3c: 阶段 1-4 战斗教程
// Stage 2 重构: phase 1-4 接入真实 FILE 1 PRACTICE · 不再合成 word queue / 不再重置 timer

import { t } from '../../demo/demo-i18n'
import { state, resetState } from '../../core/state'
import { showScreen, startLevel } from '../battle'
import { stopBGM, initAudio } from '../../effects/sound'
import { clearFloatTexts } from '../../ui/effects/FloatTextPool'
import { eventBus } from '../../core/events/EventBus'
import { showPrompt, dismissPrompt } from '../../ui/tutorial/TutorialPrompt'
import { generateSkill } from '../../data/skillGeneration'
import { createSkillRuntimeState } from '../../data/affixes'
import { resetCycleTracking } from '../battle'
// Stage 4: 完整版前置引导
import type { MetaState } from '../../core/state/MetaState'
import { IS_DEMO } from '../../demo/demo-config'
import { showClassPicker } from '../classes/ClassPicker'
import { hasUnownedRelics, showRelicPicker, RELIC_WEIGHT_PRESETS } from '../relicPicker'
import { CLASS_DEFINITIONS } from '../../data/classes'

export type TutorialPhase = 1 | 2 | 3 | 4 | 5 | 'complete'

/** 教程词库 (复用为 FILE 1 wordDeck) */
export const TUTORIAL_WORDS = [
  'fire', 'flame', 'frost', 'frog',
  'ice', 'bolt', 'spark', 'storm',
  'wolf', 'hero', 'rock', 'wind',
]

let currentPhase: TutorialPhase = 1
let escHandler: ((e: KeyboardEvent) => void) | null = null
let aborted = false

export function getTutorialPhase(): TutorialPhase { return currentPhase }

/**
 * 启动教程模式
 * @param metaState 完整版传入，触发真实 class picker + relic picker 前置流程；
 *                  Demo 模式忽略（直接进 phase 1）
 */
export function startTutorialMode(metaState?: MetaState): void {
  stopBGM()
  clearFloatTexts()
  resetState()

  state.isTutorial = true
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

  // Stage 4: 完整版走真实 class picker → relic picker 流程；demo 跳过
  if (!IS_DEMO && metaState) {
    showClassPicker(metaState, () => {
      // 教程不走 ascension picker · 直接进 relic 申领
      const classDef = CLASS_DEFINITIONS[state.classId]
      const starterId = classDef?.starterRelic
      const onRelicDone = () => { void runTutorialPhases() }
      if (starterId) {
        showRelicPicker(onRelicDone, RELIC_WEIGHT_PRESETS.gameStart, {
          titleKey: 'relic_picker.starter_title',
          deskMode: true,
          overrideCandidates: [starterId],
        })
      } else if (hasUnownedRelics()) {
        showRelicPicker(onRelicDone, RELIC_WEIGHT_PRESETS.gameStart, {
          titleKey: 'relic_picker.starter_title',
          deskMode: true,
        })
      } else {
        onRelicDone()
      }
    })
    return
  }

  // Demo 模式 / 缺 metaState：跳过 picker，沿用旧行为
  state.classId = 'none'
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
  // Stage 2: setWordQueue / setTutorialHUD 路径已删 · 仅需重置 phase 指针
  currentPhase = 1
  showScreen('menu')
}

// ==========================================
// 教程主流程
// ==========================================

async function runTutorialPhases(): Promise<void> {
  // === Stage 2: 一场真实 FILE 1 PRACTICE 覆盖 phase 1-4 ===
  //   - 不再合成 word queue / stopBattleTimer / time=9999 / setTutorialHUD 进退
  //   - 用真实 startLevel 走完整 calibration 关（无目标 · timer 自然 ramp · auto-pass）
  //   - phase 1-4 都是 prompt 注入，等待真实事件推进；HUD 全部默认显示
  //   - 战斗结束自然触发 settlement → openShop → phase 5
  currentPhase = 1
  showScreen('battle')
  initAudio()

  // 生成起手技能（real init 里 main.ts 做的事 · tutorial 走自己分支需手动来一份）
  // 真实 FILE 1 logic (battle.ts:397) 会在玩家打完第一个词时自动绑到首字母键 → 不需手动 bind
  const skill = generateSkill({ resource: 'base', rarity: 0, level: 1 })
  state.affixSkills.set(skill.id, skill)
  state.affixSkillStates.set(skill.id, createSkillRuntimeState(skill.id))
  state.player.skills.set(skill.id, { level: 1 })

  resetCycleTracking()
  void startLevel()

  // --- 阶段 1: 打字基础 ---
  await showPrompt('tutorial.phase1.intro', { arrow: { target: 'word-display', position: 'top' } })
  if (aborted) return
  await waitForWords(1)
  if (aborted) return
  await showPrompt('tutorial.phase1.done')
  if (aborted) return

  // --- 阶段 2: 连击与倍率 ---
  advanceTutorialPhase()
  await showPrompt('tutorial.phase2.intro', { arrow: { target: 'combo-count', position: 'bottom' } })
  if (aborted) return
  await waitForCombo(3)
  if (aborted) return
  await showPrompt('tutorial.phase2.mult', { arrow: { target: 'multiplier-display', position: 'bottom' } })
  if (aborted) return

  // --- 阶段 3: 时间与目标 (真实 timer / calibration 自动 pass · 仅 intro 提示)---
  advanceTutorialPhase()
  await showPrompt('tutorial.phase3.intro', { arrow: { target: 'timer-section', position: 'bottom' } })
  if (aborted) return

  // --- 阶段 4: 技能触发 (auto-bind 已在第 1 词后由 battle.ts 接管) ---
  advanceTutorialPhase()
  await showPrompt('tutorial.phase4.intro', { arrow: { target: 'skill-trigger-zone', position: 'top' } })
  if (aborted) return
  await showPrompt('tutorial.phase4.hint', { arrow: { target: 'word-display', position: 'top' } })
  if (aborted) return
  await waitForSkillTriggers(3)
  if (aborted) return
  await showPrompt('tutorial.phase4.done')
  if (aborted) return

  // --- 阶段 5: 商店 (Stage 1 接入 terminal · 战斗结束 → settlement → openShop 自动触发) ---
  advanceTutorialPhase()
  await waitForShopOpened()
  if (aborted) return

  await showPrompt('tutorial.phase5.intro')
  if (aborted) return

  // 等待真实 BUY cmd 触发购买（terminal 内输入 BUY <SKU>）
  await waitForShopPurchase()
  if (aborted) return

  // 等待 Tab 转工作台（让玩家自然发现 terminal 底部 TAB · WORKBENCH 提示）
  await waitForWorkbenchEntered()
  if (aborted) return

  await showPrompt('tutorial.phase5.bind')
  if (aborted) return

  // 等待真实拖卡至键 · bindSkillToKey emit
  await waitForSkillBound()
  if (aborted) return

  await showPrompt('tutorial.phase5.done')
  if (aborted) return

  // === Stage 3: 等玩家提交 → FILE 2 战斗 → battle 结束 → 才弹完成屏 ===
  // 让玩家把刚学的东西真实跑一遍（FILE 2 自然 timer + 装配技能触发）
  await waitForBattleStart()
  if (aborted) return
  await waitForBattleEnd()
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
// Helper: 等待 combo 达到指定值（Stage 2）
// ==========================================
function waitForCombo(target: number): Promise<void> {
  return new Promise(resolve => {
    const check = setInterval(() => {
      if (aborted) { unsub(); clearInterval(check); resolve() }
    }, 200)
    const unsub = eventBus.on('score:update', (e) => {
      if (e.combo >= target) { unsub(); clearInterval(check); resolve() }
    })
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
// Helper: 等待 shop 打开（Stage 2 · 真实 FILE 1 end → settlement → openShop）
// ==========================================
function waitForShopOpened(): Promise<void> {
  return new Promise(resolve => {
    const unsub = eventBus.on('shop:opened', () => {
      unsub(); clearInterval(check); resolve()
    })
    const check = setInterval(() => {
      if (aborted) { unsub(); clearInterval(check); resolve() }
    }, 200)
  })
}

// ==========================================
// Helper: 等待商店购买
// ==========================================
function waitForShopPurchase(): Promise<void> {
  return new Promise(resolve => {
    const unsub = eventBus.on('shop:purchase', () => {
      unsub(); clearInterval(check); resolve()
    })
    const check = setInterval(() => {
      if (aborted) { unsub(); clearInterval(check); resolve() }
    }, 200)
  })
}

// ==========================================
// Helper: 等待 Tab 转工作台（Stage 1）
// ==========================================
function waitForWorkbenchEntered(): Promise<void> {
  return new Promise(resolve => {
    const unsub = eventBus.on('shop:workbench_entered', () => {
      unsub(); clearInterval(check); resolve()
    })
    const check = setInterval(() => {
      if (aborted) { unsub(); clearInterval(check); resolve() }
    }, 200)
  })
}

// ==========================================
// Helper: 等待 battle:start（Stage 3 · FILE 2 进入信号）
// ==========================================
function waitForBattleStart(): Promise<void> {
  return new Promise(resolve => {
    const unsub = eventBus.on('battle:start', () => {
      unsub(); clearInterval(check); resolve()
    })
    const check = setInterval(() => {
      if (aborted) { unsub(); clearInterval(check); resolve() }
    }, 200)
  })
}

// ==========================================
// Helper: 等待 battle:end（Stage 3 · FILE 2 结束信号）
// ==========================================
function waitForBattleEnd(): Promise<void> {
  return new Promise(resolve => {
    const unsub = eventBus.on('battle:end', () => {
      unsub(); clearInterval(check); resolve()
    })
    const check = setInterval(() => {
      if (aborted) { unsub(); clearInterval(check); resolve() }
    }, 200)
  })
}

// ==========================================
// Helper: 等待 IN-tray 拖卡至键完成绑定（Stage 1）
// ==========================================
function waitForSkillBound(): Promise<void> {
  return new Promise(resolve => {
    const unsub = eventBus.on('skill:bound', () => {
      unsub(); clearInterval(check); resolve()
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
  // DPCA-VT220 bezel · TRAINING COMPLETE
  overlay.innerHTML = `
    <div class="tutorial-complete-panel">
      <div class="tc-header">
        <span class="tc-led"></span>
        <span class="tc-brand">DPCA-VT220</span>
        <span class="tc-spec">INSTRUCTION · DEPT 2-B · OP. PRIMATE-7842</span>
        <span class="tc-vent">▦▦▦▦▦▦</span>
      </div>
      <div class="tc-screen">
        <div class="tutorial-complete-title">${esc(t('tutorial.complete.title'))}</div>
        <div class="tutorial-complete-body">${esc(t('tutorial.complete.body'))}</div>
        <ul class="tutorial-complete-list">
          <li>&gt; ✓ ${esc(t('tutorial.complete.s1'))}</li>
          <li>&gt; ✓ ${esc(t('tutorial.complete.s2'))}</li>
          <li>&gt; ✓ ${esc(t('tutorial.complete.s3'))}</li>
          <li>&gt; ✓ ${esc(t('tutorial.complete.s4'))}</li>
          <li>&gt; ✓ ${esc(t('tutorial.complete.s5'))}</li>
        </ul>
        <button class="tutorial-complete-btn">▸ ${esc(t('tutorial.complete.btn'))}</button>
      </div>
      <div class="tc-bottom">
        <span class="tc-sticker">PROPERTY OF DPCA · UNAUTHORIZED USE PROHIBITED</span>
        <span class="tc-serial">SN-3942-A</span>
      </div>
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
