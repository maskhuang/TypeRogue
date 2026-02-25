// ============================================
// 打字肉鸽 - KeyTooltip 键位悬停提示
// ============================================
// Story 16.4: 鼠标悬停显示底分详情和技能信息

export interface KeyTooltipData {
  letter: string
  score: number
  frequency: number
  skill?: {
    name: string
    icon: string
    description: string
    level: number
    school: string
    schoolCssClass: string
  }
}

/** 转义 HTML 特殊字符 */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * 键位悬停提示（单例 DOM 浮层）
 */
class KeyTooltipManager {
  private tooltip: HTMLElement | null = null
  private positionRafId: number = 0

  /**
   * 确保 tooltip DOM 元素存在
   */
  private ensureElement(): HTMLElement {
    if (this.tooltip && document.body.contains(this.tooltip)) {
      return this.tooltip
    }
    this.tooltip = document.createElement('div')
    this.tooltip.className = 'key-tooltip'
    this.tooltip.style.display = 'none'
    document.body.appendChild(this.tooltip)
    return this.tooltip
  }

  /**
   * 显示 tooltip
   * @param x 鼠标 clientX
   * @param y 鼠标 clientY
   * @param data tooltip 数据
   */
  show(x: number, y: number, data: KeyTooltipData): void {
    const el = this.ensureElement()

    let html = `<div class="tooltip-letter">${esc(data.letter.toUpperCase())}</div>`

    if (data.score > 0) {
      html += `<div class="tooltip-score">底分: +${data.score}</div>`
      html += `<div class="tooltip-freq">字频: ${data.frequency} 次</div>`
    } else {
      html += `<div class="tooltip-freq">字频: ${data.frequency} 次 (底分不足)</div>`
    }

    if (data.skill) {
      html += `<div class="tooltip-skill">`
      html += `<div class="tooltip-skill-name">${esc(data.skill.icon)} ${esc(data.skill.name)} Lv.${data.skill.level}</div>`
      html += `<div class="tooltip-skill-desc">${esc(data.skill.description)}</div>`
      html += `<span class="tooltip-skill-school ${esc(data.skill.schoolCssClass)}">${esc(data.skill.school)}</span>`
      html += `</div>`
    }

    el.innerHTML = html
    el.style.display = 'block'

    // 定位（避免溢出视口）
    this.position(el, x, y)
  }

  /**
   * 隐藏 tooltip
   */
  hide(): void {
    if (this.tooltip) {
      this.tooltip.style.display = 'none'
    }
  }

  /**
   * tooltip 是否正在显示
   */
  isVisible(): boolean {
    return !!this.tooltip && this.tooltip.style.display !== 'none' && this.tooltip.style.display !== ''
  }

  /**
   * 定位 tooltip，避免溢出视口
   */
  private position(el: HTMLElement, x: number, y: number): void {
    const offset = 12
    let left = x + offset
    let top = y + offset

    // 先设置初始位置
    el.style.left = `${left}px`
    el.style.top = `${top}px`

    // 取消上一次的边界检测，防止竞态
    if (this.positionRafId) {
      const cancel = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout
      cancel(this.positionRafId)
    }

    // 下一帧做边界检测（避免溢出视口）
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb: () => void) => setTimeout(cb, 0) as unknown as number
    this.positionRafId = raf(() => {
      if (typeof el.getBoundingClientRect !== 'function') return
      const rect = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight

      if (left + rect.width > vw) {
        left = x - rect.width - offset
      }
      if (top + rect.height > vh) {
        top = y - rect.height - offset
      }
      if (left < 0) left = offset
      if (top < 0) top = offset

      el.style.left = `${left}px`
      el.style.top = `${top}px`
    })
  }

  /**
   * 销毁 tooltip 元素
   */
  destroy(): void {
    if (this.tooltip && this.tooltip.parentElement) {
      this.tooltip.parentElement.removeChild(this.tooltip)
    }
    this.tooltip = null
  }
}

// 导出单例
export const keyTooltip = new KeyTooltipManager()
