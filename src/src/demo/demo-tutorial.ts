// ============================================
// 打字肉鸽 - Demo 新手引导
// ============================================
// 3 步浮层提示，通过 EventBus 监听事件触发

import { IS_DEMO } from './demo-config'
import { eventBus } from '../core/events/EventBus'
import { t } from './demo-i18n'

let step = 0
let tipEl: HTMLElement | null = null

function showTip(text: string, anchorId: string): void {
  removeTip()
  const anchor = document.getElementById(anchorId)
  if (!anchor) return

  tipEl = document.createElement('div')
  tipEl.className = 'demo-tutorial-tip'
  tipEl.textContent = text
  document.body.appendChild(tipEl)

  // 定位在 anchor 下方
  const rect = anchor.getBoundingClientRect()
  tipEl.style.left = `${rect.left + rect.width / 2 - 160}px`
  tipEl.style.top = `${rect.bottom + 12}px`

  // 3 秒后自动消失
  setTimeout(removeTip, 4000)
}

function removeTip(): void {
  if (tipEl && tipEl.parentNode) {
    tipEl.parentNode.removeChild(tipEl)
    tipEl = null
  }
}

export function initDemoTutorial(): void {
  if (!IS_DEMO) return
  step = 0

  // Step 1: 战斗开始 1 秒后提示打字
  setTimeout(() => {
    if (step !== 0) return
    step = 1
    showTip(t('tutorial.step1'), 'word-display')
  }, 1000)

  // Step 2: 首次触发技能后提示键盘高亮
  const onSkill = () => {
    if (step > 1) return
    step = 2
    eventBus.off('skill:triggered', onSkill)
    showTip(t('tutorial.step2'), 'bottom-hud')
  }
  eventBus.on('skill:triggered', onSkill)

  // Step 3: 首次完成一个词后提示结算
  const onWord = () => {
    if (step > 2) return
    step = 3
    eventBus.off('word:complete', onWord)
    setTimeout(() => {
      showTip(t('tutorial.step3'), 'score-zone')
    }, 500)
  }
  eventBus.on('word:complete', onWord)
}
