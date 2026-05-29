// ============================================
// 打字肉鸽 - 教程模式状态机
// ============================================
// Story 56-3a: 基础设施
// Story 56-3c: 阶段 1-4 战斗教程
// Stage 2 重构: phase 1-4 接入真实 FILE 1 PRACTICE · 不再合成 word queue / 不再重置 timer

import { t } from '../../demo/demo-i18n'
import { state, resetState } from '../../core/state'
import { showScreen, startLevel, stopBattleTimer } from '../battle'
// 注：openShop 用动态 import（见 runTutorialPhases）—— shop.ts 是重模块且有加载期副作用，
// 静态 import 会把它拽进所有 import 本文件的单测（localStorage / i18n / EventBus 污染）。
import { stopBGM, initAudio } from '../../effects/sound'
import { clearFloatTexts } from '../../ui/effects/FloatTextPool'
import { eventBus } from '../../core/events/EventBus'
import { showPrompt, dismissPrompt } from '../../ui/tutorial/TutorialPrompt'
import { generateSkill } from '../../data/skillGeneration'
import { createSkillRuntimeState } from '../../data/affixes'
import { resetCycleTracking } from '../battle'
import { bindShapeToKeys, getBindingState } from '../bindingManager'
import type { MetaState } from '../../core/state/MetaState'

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
// FILE1 计时器耗尽（battle:end）后置 true，使教学步骤提前退出、转入商店
let file1Cleared = false

export function getTutorialPhase(): TutorialPhase { return currentPhase }

/**
 * 启动教程模式
 * @param _metaState 兼容旧调用签名；教程已跳过职业 / 初始遗物选择，此参数不再使用
 */
export function startTutorialMode(_metaState?: MetaState): void {
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

  // 教程跳过职业 / 初始遗物选择：classId 留 'none'，直接进教学流程
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
  // 解冻计时器：教学阶段可能正处于 battle:pause 冻结态，中途退出必须恢复，
  // 否则 battlePaused 泄漏到后续正常战斗 → 正常战斗计时器也被冻住。
  eventBus.emit('battle:resume', {})
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

  // 起手技能不在开局给予 —— 改到 phase4「这是你的第一个技能」文案出现时再 grant + bind（见 grantStarterSkill），
  // 使技能给予时机与对应文案同步。开局无技能时 battle.ts 的第 2 词自动绑定因 skills.size===0 不触发；
  // grantStarterSkill 给予后立即手动绑定（bindings.size>0），自动绑定后续也不会再触发。
  resetCycleTracking()
  void startLevel()

  // 先冻结计时器：phase 1-2（打字 / 连击）无时间压力专心学习。计时器在 phase3「现在有时间限制了」
  // 文案出现时才解冻（见 runFile1Teaching 的 unfreezeTimer），使计时器启动与文案一致。
  // 打字/计分/技能触发不受 battlePaused 影响（只有计时器循环检查它），冻结期间玩家仍可正常学习。
  eventBus.emit('battle:pause', {})

  // FILE1 结束 = 计时器耗尽（和游戏一致：分数达标不结束、只继续刷溢出分；时间耗尽才结算进商店）。
  // battle:end（endLevel 在 time<=0 时 emit）→ 置 file1Cleared：中断教学 + 让等待结束的轮询 resolve。
  file1Cleared = false
  const unsubFile1End = eventBus.on('battle:end', () => {
    if (!file1Cleared) { file1Cleared = true; dismissPrompt() }
  })

  // 教学 phase 1-4 逐词推进（计时器若在教学中耗尽则提前 bail）；
  await runFile1Teaching()
  // 教学已展示完但计时器尚未耗尽 → 继续自由练习，直到时间耗尽才进商店（和游戏一致）。
  if (!aborted) await waitForFile1Ended()
  unsubFile1End()
  if (aborted) return
  dismissPrompt()

  // --- 阶段 5: 商店 (Stage 1 接入 terminal) ---
  // FILE1 结束（计时器耗尽）后由状态机显式驱动转场（不依赖 endLevel：教程态
  // _isCalibrationLevel 恒为 false，endLevel 不会开商店）：
  //   ① 解冻 battlePaused —— 否则冻结标志泄漏到 FILE2，FILE2 计时器也会被冻住
  //   ② 停掉 FILE1 计时器
  //   ③ 预设购买金币 —— openShop 教程分支跳过金币计算，依赖此处预设
  //   ④ openShop 直接打开商店（其内部 emit shop:opened；物品在 openShop 内按需生成）
  eventBus.emit('battle:resume', {})
  stopBattleTimer()
  state.gold = 200
  state.resources.gold = 200
  currentPhase = 5
  const { openShop } = await import('../shop')
  openShop(true)

  // 商店提示：①manualDismiss —— 玩家要按 ↑↓ / 回车 / Tab 操作，提示不能被这些按键关掉，改为在
  // 对应商店事件（购买 / 进工作台 / 绑定）发生时推进；②top —— 商店屏 z=9999 且底部有命令行 / SUBMIT /
  // 键盘，提示置顶（z=10000）才显示得出来且不遮挡底部控件。
  const shopOpts = { manualDismiss: true, top: true } as const
  // ↑↓ 选取商品，回车购买
  void showPrompt('tutorial.phase5.intro', shopOpts)
  await waitForShopPurchase()
  if (aborted) return

  // Tab 确认并进入工作台
  void showPrompt('tutorial.phase5.workbench', shopOpts)
  await waitForWorkbenchEntered()
  if (aborted) return

  // 拖拽技能到键绑定
  void showPrompt('tutorial.phase5.bind', shopOpts)
  await waitForSkillBound()
  if (aborted) return

  void showPrompt('tutorial.phase5.done', shopOpts)

  // === Stage 3: 等玩家提交 → FILE 2 战斗 → battle 结束 → 才弹完成屏 ===
  // 让玩家把刚学的东西真实跑一遍（FILE 2 自然 timer + 装配技能触发）
  await waitForBattleStart()
  if (aborted) return
  dismissPrompt() // 清掉商店最后一条提示，进入 FILE2
  await waitForBattleEnd()
  if (aborted) return

  // --- 完成画面 ---
  showTutorialComplete()
}

// ==========================================
// FILE1 教学：phase 1-4（计时器耗尽 file1Cleared 时提前返回 → 主流程转商店）
// ==========================================
async function runFile1Teaching(): Promise<void> {
  // 文本段序列：每完成一个单词推进到下一段（manualDismiss → 提示不会被打字按键关掉）。
  // 连击 / 技能机制仍在文案里讲解，但不再硬卡「连击 3」「触发 3 次」门槛，统一按「逐词」推进。
  type Seg = { key: string; phase?: TutorialPhase; arrow?: { target: string; position: 'top' | 'bottom' | 'left' | 'right' }; dynamicKey?: boolean; grantSkill?: boolean; unfreezeTimer?: boolean }
  const segments: Seg[] = [
    { key: 'tutorial.phase1.intro', phase: 1, arrow: { target: 'word-display', position: 'top' } },
    { key: 'tutorial.phase1.done' },
    { key: 'tutorial.phase2.intro', phase: 2, arrow: { target: 'combo-count', position: 'bottom' } },
    { key: 'tutorial.phase2.mult', arrow: { target: 'multiplier-display', position: 'bottom' } },
    { key: 'tutorial.phase3.intro', phase: 3, arrow: { target: 'timer-section', position: 'bottom' }, unfreezeTimer: true },
    { key: 'tutorial.phase4.intro', phase: 4, arrow: { target: 'skill-trigger-zone', position: 'top' }, grantSkill: true },
    { key: 'tutorial.phase4.hint', arrow: { target: 'word-display', position: 'top' }, dynamicKey: true },
    { key: 'tutorial.phase4.done' },
  ]

  for (const seg of segments) {
    if (seg.phase != null) currentPhase = seg.phase
    // 与「现在有时间限制了」文案同步：此刻才解冻计时器，开始倒计时
    if (seg.unfreezeTimer) eventBus.emit('battle:resume', {})
    // 与「这是你的第一个技能」文案同步：此刻才给予并绑定起手技能
    if (seg.grantSkill) grantStarterSkill()
    // hint 段动态读取实际绑定键（grantStarterSkill 已同步绑好）
    const params = seg.dynamicKey ? { key: ([...state.player.bindings.keys()][0] ?? 'f').toUpperCase() } : undefined
    void showPrompt(seg.key, { arrow: seg.arrow, params, manualDismiss: true })
    // 完成一个单词 → 推进到下一段（计时器耗尽则 waitForWords 经 file1Cleared 提前 resolve → bail）
    await waitForWords(1)
    if (aborted || file1Cleared) return
  }
}

// 等待 FILE1 结束（计时器耗尽 → battle:end → file1Cleared）；已结束 / aborted 则立即返回
function waitForFile1Ended(): Promise<void> {
  return new Promise(resolve => {
    if (file1Cleared || aborted) { resolve(); return }
    const check = setInterval(() => {
      if (file1Cleared || aborted) { clearInterval(check); resolve() }
    }, 200)
  })
}

// 给予并绑定起手技能（与 phase4 技能文案同步触发，取代 battle.ts 第 2 词的自动绑定）
function grantStarterSkill(): void {
  if (state.player.skills.size > 0) return // 已给予则跳过（防重入）
  const skill = generateSkill({ resource: 'base', rarity: 0, level: 1 })
  state.affixSkills.set(skill.id, skill)
  state.affixSkillStates.set(skill.id, createSkillRuntimeState(skill.id))
  state.player.skills.set(skill.id, { level: 1 })
  // 绑到当前词首字母：玩家打这个词时即可亲手触发，与文案「按绑定键触发」同步
  const key = (state.player.word?.[0] ?? 'f').toLowerCase()
  bindShapeToKeys(getBindingState(state), skill.id, key)
}

// ==========================================
// Helper: 等待打词数
// ==========================================
function waitForWords(count: number): Promise<void> {
  return new Promise(resolve => {
    let n = 0
    const check = setInterval(() => {
      if (aborted || file1Cleared) { unsub(); clearInterval(check); resolve() }
    }, 200)
    const unsub = eventBus.on('word:complete', () => {
      n++
      if (n >= count) { unsub(); clearInterval(check); resolve() }
    })
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
    // 防竞态：玩家可能在 phase5.done 提示关掉前就 SUBMIT 离店，导致 startLevel 的
    // battle:start 早于本监听注册而漏掉。若此刻已离开商店进入战斗，直接 resolve。
    if (state.phase === 'battle') { resolve(); return }
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
