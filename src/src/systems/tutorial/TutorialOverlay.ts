// ============================================
// 打字肉鸽 - TutorialOverlay 引导浮窗
// ============================================
// Story 39.3: 锚定定位 + 箭头 + 遮罩 + "知道了"/"不再提示"

import { t } from '../../demo/demo-i18n'

export interface TutorialOverlayOptions {
  titleKey: string
  bodyKey: string
  anchorElement?: string
  anchorPosition?: 'top' | 'bottom' | 'left' | 'right'
  highlight?: string
  dismissAfter?: number
  /** 动态 i18n 参数提供者 */
  paramsProvider?: () => Record<string, string | number>
  onDismiss: (neverShowAgain: boolean) => void
}

/**
 * 引导浮窗 DOM 组件
 * 支持锚定定位（4 方向）、箭头、可选遮罩、自动关闭
 */
export class TutorialOverlay {
  private container: HTMLElement | null = null
  private mask: HTMLElement | null = null
  private dismissTimer: ReturnType<typeof setTimeout> | null = null
  private options: TutorialOverlayOptions

  constructor(options: TutorialOverlayOptions) {
    this.options = options
  }

  show(): void {
    this.createMask()
    this.createOverlay()
    this.position()

    if (this.options.dismissAfter && this.options.dismissAfter > 0) {
      this.dismissTimer = setTimeout(() => this.dismiss(false), this.options.dismissAfter)
    }
  }

  dismiss(neverShowAgain: boolean): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer)
      this.dismissTimer = null
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    if (this.mask && this.mask.parentNode) {
      this.mask.parentNode.removeChild(this.mask)
    }
    this.container = null
    this.mask = null
    this.options.onDismiss(neverShowAgain)
  }

  isVisible(): boolean {
    return this.container !== null
  }

  private createMask(): void {
    if (!this.options.highlight) return

    this.mask = document.createElement('div')
    this.mask.className = 'tutorial-overlay-mask'
    document.body.appendChild(this.mask)
  }

  private createOverlay(): void {
    const pos = this.options.anchorPosition || 'bottom'
    const params = this.options.paramsProvider?.() ?? undefined

    this.container = document.createElement('div')
    this.container.className = 'tutorial-overlay'
    this.container.innerHTML = [
      `<div class="tutorial-overlay-arrow tutorial-arrow-${pos}"></div>`,
      `<div class="tutorial-overlay-title">${esc(t(this.options.titleKey, params))}</div>`,
      `<div class="tutorial-overlay-body">${esc(t(this.options.bodyKey, params))}</div>`,
      '<div class="tutorial-overlay-actions">',
      `  <label class="tutorial-overlay-never"><input type="checkbox" class="tutorial-never-cb"> ${esc(t('tutorial.never_show'))}</label>`,
      `  <button class="tutorial-overlay-btn">${esc(t('tutorial.got_it'))}</button>`,
      '</div>',
    ].join('')

    document.body.appendChild(this.container)

    // 绑定按钮事件
    const btn = this.container.querySelector('.tutorial-overlay-btn')
    if (btn) {
      btn.addEventListener('click', () => {
        const cb = this.container?.querySelector('.tutorial-never-cb') as HTMLInputElement | null
        this.dismiss(cb?.checked ?? false)
      })
    }
  }

  private position(): void {
    if (!this.container) return

    const anchorId = this.options.anchorElement
    if (!anchorId) {
      // 无锚定：居中显示
      this.container.style.left = '50%'
      this.container.style.top = '40%'
      this.container.style.transform = 'translate(-50%, -50%)'
      return
    }

    const anchor = document.getElementById(anchorId)
    if (!anchor) {
      this.container.style.left = '50%'
      this.container.style.top = '40%'
      this.container.style.transform = 'translate(-50%, -50%)'
      return
    }

    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb: () => void) => setTimeout(cb, 0)
    raf(() => {
      if (!this.container || typeof anchor.getBoundingClientRect !== 'function') return

      const rect = anchor.getBoundingClientRect()
      const pos = this.options.anchorPosition || 'bottom'
      const gap = 12

      let left = 0
      let top = 0

      switch (pos) {
        case 'bottom':
          left = rect.left + rect.width / 2
          top = rect.bottom + gap
          this.container.style.transform = 'translateX(-50%)'
          break
        case 'top':
          left = rect.left + rect.width / 2
          top = rect.top - gap
          this.container.style.transform = 'translateX(-50%) translateY(-100%)'
          break
        case 'left':
          left = rect.left - gap
          top = rect.top + rect.height / 2
          this.container.style.transform = 'translateX(-100%) translateY(-50%)'
          break
        case 'right':
          left = rect.right + gap
          top = rect.top + rect.height / 2
          this.container.style.transform = 'translateY(-50%)'
          break
      }

      // clamp 到视口
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (left < 8) left = 8
      if (left > vw - 8) left = vw - 8
      if (top < 8) top = 8
      if (top > vh - 8) top = vh - 8

      this.container.style.left = `${left}px`
      this.container.style.top = `${top}px`
    })
  }
}

/** 转义 HTML 特殊字符 */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
