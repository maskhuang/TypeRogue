// =============================================================================
// 离场验证窗 · UI 层
// =============================================================================
// 在 run 结束后、settlement 之前弹出。
// 单一一句提示 + text input + 30s 倒计时 + 提交。Promise<DepartureCheckResult>。
//
// 视觉：DPCA paper-craft 风（与 #menu-ov-handbook 同体系）

import { state } from '../core/state'
import { pickDeparturePrompt } from '../data/narrative/departureCheck'
import { evaluateDepartureCheck, type DepartureCheckResult } from '../systems/departureCheck'
import { getLocale } from '../demo/demo-i18n'

const DEPARTURE_TIME_LIMIT_S = 30

const SHROUD_ID = 'departure-check-shroud'
const PAPER_ID = 'departure-check-form'

interface DepartureWindowI18n {
  readonly header_org: string
  readonly header_title: string
  readonly instruction: string
  readonly input_placeholder: string
  readonly submit_btn: string
  readonly countdown_label: string
}

const I18N_ZH: DepartureWindowI18n = {
  header_org: 'DPCA · 值班窗口',
  header_title: '离场验证 · DEPARTURE',
  instruction: '请用您本人的话简短解释下列句子的含义。不可引用已受理文本。',
  input_placeholder: '在此键入您的复述…',
  submit_btn: '提交 · SUBMIT',
  countdown_label: '剩余',
}

const I18N_EN: DepartureWindowI18n = {
  header_org: 'DPCA · DUTY WINDOW',
  header_title: 'DEPARTURE VERIFICATION',
  instruction: 'In your own words, briefly explain the meaning of the sentence below. Do not quote filed text.',
  input_placeholder: 'Type your paraphrase here…',
  submit_btn: 'SUBMIT',
  countdown_label: 'TIME',
}

function getI18n(): DepartureWindowI18n {
  return getLocale() === 'en' ? I18N_EN : I18N_ZH
}

/**
 * 展示离场验证窗，等待玩家提交或 30s 超时。
 * 返回 DepartureCheckResult（pass + typed + 失败原因 + 失败 lore）·
 * 同时记录到 systems/departureCheck.ts 的 _lastResult。
 */
export function showDepartureWindow(): Promise<DepartureCheckResult> {
  return new Promise((resolve) => {
    const i18n = getI18n()
    const prompt = pickDeparturePrompt()
    const promptText = getLocale() === 'en' ? prompt.en : prompt.zh

    const { shroud, paper, input, submitBtn, timerEl } = ensureOverlay(i18n, promptText)

    let timeLeft = DEPARTURE_TIME_LIMIT_S
    timerEl.textContent = `${timeLeft}`

    const timer = setInterval(() => {
      timeLeft--
      timerEl.textContent = `${timeLeft}`
      if (timeLeft <= 0) {
        cleanup()
        const result = evaluateDepartureCheck(
          input.value.trim(),
          prompt,
          state.player.wordDeck ?? [],
          input.value.trim() === '' ? 'empty' : 'timeout',
        )
        resolve(result)
      }
    }, 1000)

    const onSubmit = () => {
      const typed = input.value.trim()
      cleanup()
      const result = evaluateDepartureCheck(
        typed,
        prompt,
        state.player.wordDeck ?? [],
        typed === '' ? 'empty' : undefined,
      )
      resolve(result)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSubmit()
      }
    }

    const cleanup = () => {
      clearInterval(timer)
      submitBtn.removeEventListener('click', onSubmit)
      input.removeEventListener('keydown', onKeyDown)
      shroud.classList.remove('show')
      paper.classList.remove('show')
      // 200ms 后移除 DOM（等过渡）·
      setTimeout(() => {
        shroud.remove()
        paper.remove()
      }, 400)
    }

    submitBtn.addEventListener('click', onSubmit)
    input.addEventListener('keydown', onKeyDown)

    // 下一帧加 .show 触发过渡
    requestAnimationFrame(() => {
      shroud.classList.add('show')
      paper.classList.add('show')
      input.focus()
    })
  })
}

function ensureOverlay(
  i18n: DepartureWindowI18n,
  promptText: string,
): {
  shroud: HTMLElement
  paper: HTMLElement
  input: HTMLInputElement
  submitBtn: HTMLButtonElement
  timerEl: HTMLElement
} {
  // 先清旧的（防御性·上一次 timeout 没正常清）
  document.getElementById(SHROUD_ID)?.remove()
  document.getElementById(PAPER_ID)?.remove()

  const container = document.getElementById('game-container') ?? document.body

  const shroud = document.createElement('div')
  shroud.id = SHROUD_ID
  shroud.className = 'desk-overlay-shroud'

  const paper = document.createElement('div')
  paper.id = PAPER_ID
  paper.className = 'desk-overlay-paper departure-window'
  paper.innerHTML = `
    <div class="ov-header">
      <div class="h-text">
        <div class="org">${escapeHtml(i18n.header_org)}</div>
        <div class="title">${escapeHtml(i18n.header_title)}</div>
      </div>
    </div>
    <p class="departure-instruction">${escapeHtml(i18n.instruction)}</p>
    <div class="departure-prompt-card">${escapeHtml(promptText)}</div>
    <div class="departure-input-row">
      <input type="text" class="departure-input" placeholder="${escapeHtml(i18n.input_placeholder)}" autocomplete="off" spellcheck="false" />
      <div class="departure-timer">
        <span class="departure-timer-label">${escapeHtml(i18n.countdown_label)}</span>
        <span class="departure-timer-value">${DEPARTURE_TIME_LIMIT_S}</span>
        <span class="departure-timer-unit">s</span>
      </div>
    </div>
    <div class="ov-footer">
      <button class="ov-close departure-submit-btn" type="button">${escapeHtml(i18n.submit_btn)}</button>
    </div>
  `

  container.appendChild(shroud)
  container.appendChild(paper)

  return {
    shroud,
    paper,
    input: paper.querySelector<HTMLInputElement>('.departure-input')!,
    submitBtn: paper.querySelector<HTMLButtonElement>('.departure-submit-btn')!,
    timerEl: paper.querySelector<HTMLElement>('.departure-timer-value')!,
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
