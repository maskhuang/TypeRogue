// ============================================
// 打字肉鸽 - KeyTooltip 键位悬停提示
// ============================================
// Story 16.4: 鼠标悬停显示底分详情和技能信息
// Story 39.2: Tooltip 信息架构重构 — 分区块卡片式布局

import { t } from '../../demo/demo-i18n'

export interface AffixTooltipInfo {
  typeName: string
  typeKey?: string
  paramSummary: string
  description?: string
}

export interface EstimateBreakdownLine {
  typeKey: string   // affix/enchant type for coloring
  label: string     // e.g. "基础值" / "强化 ×1.65"
  detail: string    // e.g. "= 15" / "+0.15×1任务"
}

export interface SmartEstimate {
  estimatedOutput: number
  breakdown: EstimateBreakdownLine[]
}

/** 每种词条的独特颜色 */
export const AFFIX_COLORS: Record<string, string> = {
  base:      '#cccccc', // 灰白 — 基础值
  apprentice:'#2ecc71', // 绿 — 学徒
  conduit:   '#e74c3c', // 红 — 导能
  convert:   '#f39c12', // 橙 — 转化
  rainbow:   '#ff6bcb', // 粉 — 彩虹
  charge:    '#3498db', // 蓝 — 蓄力
  decay:     '#95a5a6', // 灰 — 衰减
  pulse:     '#e67e22', // 深橙 — 脉冲
  crit:      '#f1c40f', // 金 — 暴击
  cascade:   '#1abc9c', // 青 — 级联
  void:      '#9b59b6', // 紫 — 虚无
  resonance: '#2ecc71', // 绿 — 共鸣
  mirror:    '#a29bfe', // 淡紫 — 倒影
  link:      '#00cec9', // 湖蓝 — 连接
  splash:    '#6c5ce7', // 靛蓝 — 溅射
  amplify:   '#fd79a8', // 浅粉 — 增幅
  outcast:   '#d35400', // 棕 — 流放
  gravity:   '#8e44ad', // 深紫 — 引力
  ligature:  '#27ae60', // 深绿 — 连字
  twin:      '#fdcb6e', // 淡金 — 双生
  recurse:   '#00b894', // 薄荷 — 递归
  taboo:     '#ff4757', // 亮红 — 禁忌
}

export interface KeyTooltipData {
  letter?: string
  score?: number
  frequency?: number
  skill?: {
    name: string
    icon: string
    description: string
    level: number
    school: string
    schoolCssClass: string
    amplifierStacks?: number
    affectedSkills?: string[]
    mechanicInfo?: string
    enchantmentInfo?: string
    // 词条制技能扩展
    affixInfo?: AffixTooltipInfo[]
    /** 已装备的附魔列表 */
    enchantments?: Array<{ icon: string; name: string; desc: string; color: string }>
    questProgress?: string
    apprenticeGrowth?: string
    // 智能产出预估
    smartEstimate?: SmartEstimate
    // 商店扩展
    upgradeInfo?: string
    baseValuesText?: string
  }
}

/** 转义 HTML 特殊字符 */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 清洁 CSS 颜色值，防止 style 注入 */
function safeColor(c: string): string {
  return /^[#a-zA-Z0-9(),.\s]+$/.test(c) ? c : '#aaa'
}

// ── 区块构建函数 ──

/** 字母 + 分数 + 频率区 */
function buildLetterSection(data: KeyTooltipData): string {
  let html = ''
  if (data.letter) {
    html += `<div class="tooltip-letter">${esc(data.letter.toUpperCase())}</div>`
  }
  if (data.score != null && data.frequency != null) {
    if (data.score > 0) {
      html += `<div class="tooltip-score">${esc(t('tooltip.base_score', { score: data.score }))}</div>`
      html += `<div class="tooltip-freq">${esc(t('tooltip.frequency', { count: data.frequency }))}</div>`
    } else {
      html += `<div class="tooltip-freq">${esc(t('tooltip.frequency_low', { count: data.frequency }))}</div>`
    }
  }
  return html
}

/** 标题区：技能名 + 等级 + 学派 + 描述 */
function buildHeaderSection(skill: NonNullable<KeyTooltipData['skill']>): string {
  let html = '<div class="tooltip-section tooltip-header">'
  if (skill.upgradeInfo) {
    html += `<div class="tooltip-title">${esc(skill.icon)} ${esc(skill.name)}</div>`
    html += `<div class="tooltip-upgrade-info">${esc(skill.upgradeInfo)}</div>`
  } else {
    html += `<div class="tooltip-title">${esc(skill.icon)} ${esc(skill.name)} Lv.${skill.level}</div>`
  }
  if (skill.schoolCssClass) {
    html += `<span class="tooltip-skill-school ${esc(skill.schoolCssClass)}">${esc(skill.school)}</span>`
  }
  html += `<div class="tooltip-skill-desc">${esc(skill.description)}</div>`
  if (skill.baseValuesText) {
    html += `<div class="tooltip-base-values">${esc(skill.baseValuesText)}</div>`
  }
  html += '</div>'
  return html
}

/** 词条区：词条列表 + 增幅/机制信息 */
function buildAffixSection(skill: NonNullable<KeyTooltipData['skill']>): string {
  const parts: string[] = []

  // 词条列表
  if (skill.affixInfo && skill.affixInfo.length > 0) {
    for (const affix of skill.affixInfo) {
      const color = AFFIX_COLORS[affix.typeKey || ''] || '#e67e22'
      parts.push(`<div class="tooltip-affix-name" style="color:${color};">&lt;${esc(affix.typeName)}&gt; ${esc(affix.paramSummary)}</div>`)
      if (affix.description) {
        parts.push(`<div class="tooltip-affix-desc">${esc(affix.description)}</div>`)
      }
    }
  }

  // 增幅者堆叠
  if (skill.amplifierStacks != null) {
    parts.push(`<div class="tooltip-amp-stacks">${esc(t('tooltip.stacks', { count: skill.amplifierStacks }))}</div>`)
  }

  // 增幅者影响范围
  if (skill.affectedSkills && skill.affectedSkills.length > 0) {
    parts.push(`<div class="tooltip-amp-affects">${esc(t('tooltip.amp_range', { skills: skill.affectedSkills.join(', ') }))}</div>`)
  }

  // 机制信息
  if (skill.mechanicInfo) {
    parts.push(`<div class="tooltip-mechanic">${esc(skill.mechanicInfo)}</div>`)
  }

  // 旧式附魔描述文本
  if (skill.enchantmentInfo) {
    parts.push(`<div class="tooltip-enchantment-info">${esc(skill.enchantmentInfo)}</div>`)
  }

  if (parts.length === 0) return ''
  return `<div class="tooltip-section tooltip-affix-list">${parts.join('')}</div>`
}

/** 附魔区：附魔列表 + 任务进度 + 学徒成长 */
function buildEnchantSection(skill: NonNullable<KeyTooltipData['skill']>): string {
  const parts: string[] = []

  if (skill.enchantments && skill.enchantments.length > 0) {
    for (const ench of skill.enchantments) {
      parts.push(`<div class="tooltip-ench-name" style="color:${safeColor(ench.color)};">${esc(ench.icon)} ${esc(ench.name)}</div>`)
      parts.push(`<div class="tooltip-ench-desc">${esc(ench.desc)}</div>`)
    }
  }

  if (skill.questProgress) {
    parts.push(`<div class="tooltip-quest">${esc(skill.questProgress)}</div>`)
  }

  if (skill.apprenticeGrowth) {
    parts.push(`<div class="tooltip-apprentice">${esc(skill.apprenticeGrowth)}</div>`)
  }

  if (parts.length === 0) return ''
  return `<div class="tooltip-section tooltip-enchant-list">${parts.join('')}</div>`
}

/** 摘要区：预估产出 + 明细 */
function buildSummarySection(skill: NonNullable<KeyTooltipData['skill']>): string {
  if (!skill.smartEstimate) return ''

  const est = skill.smartEstimate
  const fmtEst = Math.abs(est.estimatedOutput) < 1 ? est.estimatedOutput.toFixed(2)
    : Math.abs(est.estimatedOutput) < 10 ? est.estimatedOutput.toFixed(1)
    : Math.round(est.estimatedOutput).toString()

  let html = '<div class="tooltip-section tooltip-summary">'
  html += `<div class="tooltip-est-value">${esc(t('est.estimated_output', { val: (est.estimatedOutput >= 0 ? '+' : '') + fmtEst }))}</div>`

  if (est.breakdown.length > 0) {
    html += '<div class="tooltip-est-details">'
    for (let i = 0; i < est.breakdown.length; i++) {
      const line = est.breakdown[i]
      const color = AFFIX_COLORS[line.typeKey] || '#aaa'
      if (i > 0) {
        html += '<span class="tooltip-est-sep">|</span>'
      }
      html += `<span class="tooltip-est-item" style="color:${color};">${esc(line.label)}`
      if (line.detail) html += ` <span class="tooltip-est-detail">${esc(line.detail)}</span>`
      html += '</span>'
    }
    html += '</div>'
  }

  html += '</div>'
  return html
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
   * @param avoidRect 需要避开的区域（范围高亮的包围盒）
   */
  show(x: number, y: number, data: KeyTooltipData, avoidRect?: { top: number; left: number; right: number; bottom: number }): void {
    const el = this.ensureElement()

    // 组合各区块（空区块不渲染）
    let html = buildLetterSection(data)

    if (data.skill) {
      html += buildHeaderSection(data.skill)
      html += buildAffixSection(data.skill)
      html += buildEnchantSection(data.skill)
      html += buildSummarySection(data.skill)
    }

    el.innerHTML = html
    el.style.display = 'block'

    // 定位（避免溢出视口，可选避开高亮区域）
    if (avoidRect) {
      this.positionAvoidingRect(el, x, avoidRect)
    } else {
      this.position(el, x, y)
    }
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
   * 定位 tooltip，避开范围高亮区域
   */
  private positionAvoidingRect(el: HTMLElement, cursorX: number, avoid: { top: number; left: number; right: number; bottom: number }): void {
    const gap = 8

    el.style.left = `0px`
    el.style.top = `0px`

    if (this.positionRafId) {
      const cancel = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout
      cancel(this.positionRafId)
    }

    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb: () => void) => setTimeout(cb, 0) as unknown as number
    this.positionRafId = raf(() => {
      if (typeof el.getBoundingClientRect !== 'function') return
      const rect = el.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight

      // 水平居中于鼠标，但 clamp 到视口
      let left = cursorX - rect.width / 2
      if (left < gap) left = gap
      if (left + rect.width > vw - gap) left = vw - rect.width - gap

      // 优先放在高亮区域上方
      let top = avoid.top - rect.height - gap
      if (top >= gap) {
        el.style.left = `${left}px`
        el.style.top = `${top}px`
        return
      }

      // 放在高亮区域下方
      top = avoid.bottom + gap
      if (top + rect.height <= vh - gap) {
        el.style.left = `${left}px`
        el.style.top = `${top}px`
        return
      }

      // 放在高亮区域左侧
      left = avoid.left - rect.width - gap
      top = avoid.top
      if (left >= gap && top + rect.height <= vh) {
        el.style.left = `${left}px`
        el.style.top = `${top}px`
        return
      }

      // 放在高亮区域右侧
      left = avoid.right + gap
      if (left + rect.width <= vw - gap) {
        el.style.left = `${left}px`
        el.style.top = `${top}px`
        return
      }

      // fallback: 上方，允许超出
      el.style.left = `${Math.max(gap, cursorX - rect.width / 2)}px`
      el.style.top = `${avoid.top - rect.height - gap}px`
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
