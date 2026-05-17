// ============================================
// 打字肉鸽 - 教程底部提示框
// ============================================
// Story 56-3b: 打字机效果 + 箭头 + 遮罩 + Promise API

import { t } from '../../demo/demo-i18n'

export interface PromptOptions {
  /** 指示箭头 — 指向目标元素 */
  arrow?: { target: string; position: 'top' | 'bottom' | 'left' | 'right' }
  /** 高亮遮罩 — 镂空目标元素 */
  highlight?: string
  /** 打字机速度 ms/字符（默认 30） */
  typeSpeed?: number
  /** i18n 参数 */
  params?: Record<string, string | number>
}

let promptContainer: HTMLElement | null = null
let arrowEl: HTMLElement | null = null
let maskEl: HTMLElement | null = null
let resolvePromise: (() => void) | null = null
let typeTimer: ReturnType<typeof setInterval> | null = null

/**
 * 显示底部教程提示（打字机效果）
 * @returns Promise — resolve 时提示已关闭
 */
export function showPrompt(textKey: string, options?: PromptOptions): Promise<void> {
  // 先清理旧的
  dismissPrompt()

  const text = t(textKey, options?.params)
  const speed = options?.typeSpeed ?? 30

  return new Promise<void>(resolve => {
    resolvePromise = resolve

    // 遮罩
    if (options?.highlight) {
      createHighlightMask(options.highlight)
    }

    // 箭头
    if (options?.arrow) {
      createArrow(options.arrow.target, options.arrow.position)
    }

    // 提示框容器 · DPCA-VT220 INSTRUCTION channel
    promptContainer = document.createElement('div')
    promptContainer.className = 'tutorial-prompt'

    // 头条：mini DPCA bar (LED + brand + spec + tag)
    const header = document.createElement('div')
    header.className = 'tutorial-prompt-header'
    header.innerHTML = `
      <span class="tutorial-prompt-led"></span>
      <span class="tutorial-prompt-brand">DPCA-VT220</span>
      <span class="tutorial-prompt-spec">INSTRUCTION · DEPT 2-B · OP. PRIMATE-7842</span>
      <span class="tutorial-prompt-tag">INDUCTION</span>
    `
    promptContainer.appendChild(header)

    // 屏内 body 包裹
    const body = document.createElement('div')
    body.className = 'tutorial-prompt-body'
    promptContainer.appendChild(body)

    const textEl = document.createElement('div')
    textEl.className = 'tutorial-prompt-text'
    body.appendChild(textEl)

    const continueEl = document.createElement('div')
    continueEl.className = 'tutorial-prompt-continue'
    continueEl.textContent = t('tutorial.press_any_key') !== 'tutorial.press_any_key'
      ? t('tutorial.press_any_key')
      : 'ANY KEY'
    continueEl.style.display = 'none'
    body.appendChild(continueEl)

    document.getElementById('game-container')?.appendChild(promptContainer)

    // 打字机效果
    let charIndex = 0
    typeTimer = setInterval(() => {
      if (charIndex < text.length) {
        textEl.textContent = text.slice(0, charIndex + 1)
        charIndex++
      } else {
        clearInterval(typeTimer!)
        typeTimer = null
        textEl.classList.add('typing-done')
        continueEl.style.display = ''
        // 下一帧绑定（避免与最后一个打字 keydown 冲突）
        requestAnimationFrame(() => {
          if (!promptContainer) return // 已被 dismiss
          const handler = (e: Event) => {
            e.preventDefault()
            cleanup()
          }
          document.addEventListener('keydown', handler, { once: true })
          promptContainer?.addEventListener('click', handler, { once: true })
        })
      }
    }, speed)
  })
}

/** 强制关闭提示（用于 Esc 退出教程） */
export function dismissPrompt(): void {
  cleanup()
}

function cleanup(): void {
  if (typeTimer) { clearInterval(typeTimer); typeTimer = null }
  if (promptContainer?.parentNode) { promptContainer.parentNode.removeChild(promptContainer) }
  if (arrowEl?.parentNode) { arrowEl.parentNode.removeChild(arrowEl) }
  if (maskEl?.parentNode) { maskEl.parentNode.removeChild(maskEl) }
  promptContainer = null
  arrowEl = null
  maskEl = null
  if (resolvePromise) { resolvePromise(); resolvePromise = null }
}

function createHighlightMask(targetId: string): void {
  const target = document.getElementById(targetId)
  if (!target) return

  maskEl = document.createElement('div')
  maskEl.className = 'tutorial-prompt-mask'

  // 用 clip-path 镂空目标区域
  const rect = target.getBoundingClientRect()
  const container = document.getElementById('game-container')
  const cr = container?.getBoundingClientRect() ?? { left: 0, top: 0 }
  const x = rect.left - cr.left
  const y = rect.top - cr.top
  const w = rect.width
  const h = rect.height
  const pad = 4
  // polygon 镂空：外框 → 内框（逆时针）
  maskEl.style.clipPath = `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    ${x - pad}px ${y - pad}px, ${x - pad}px ${y + h + pad}px,
    ${x + w + pad}px ${y + h + pad}px, ${x + w + pad}px ${y - pad}px, ${x - pad}px ${y - pad}px
  )`

  document.getElementById('game-container')?.appendChild(maskEl)
}

function createArrow(targetId: string, position: string): void {
  const target = document.getElementById(targetId)
  if (!target) return

  arrowEl = document.createElement('div')
  arrowEl.className = `tutorial-prompt-arrow tutorial-prompt-arrow-${position}`

  const rect = target.getBoundingClientRect()
  const container = document.getElementById('game-container')
  const cr = container?.getBoundingClientRect() ?? { left: 0, top: 0 }
  const gap = 8

  switch (position) {
    case 'top':
      arrowEl.style.left = `${rect.left + rect.width / 2 - cr.left}px`
      arrowEl.style.top = `${rect.top - cr.top - gap}px`
      break
    case 'bottom':
      arrowEl.style.left = `${rect.left + rect.width / 2 - cr.left}px`
      arrowEl.style.top = `${rect.bottom - cr.top + gap}px`
      break
    case 'left':
      arrowEl.style.left = `${rect.left - cr.left - gap}px`
      arrowEl.style.top = `${rect.top + rect.height / 2 - cr.top}px`
      break
    case 'right':
      arrowEl.style.left = `${rect.right - cr.left + gap}px`
      arrowEl.style.top = `${rect.top + rect.height / 2 - cr.top}px`
      break
  }

  document.getElementById('game-container')?.appendChild(arrowEl)
}
