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
  /** 升级预览：旧效果 → 新效果（仅升级 tooltip） */
  upgradeEffect?: string
  /** 是否为"匹配技能"类词条 */
  isMatchAffix?: boolean
}

export interface EstimateBreakdownLine {
  typeKey: string   // affix/enchant type for coloring
  label: string     // e.g. "基础值" / "强化 ×1.65"
  detail: string    // e.g. "= 15" / "+0.15×1任务"
  oldLabel?: string // upgrade preview: old level's label (shown as oldLabel → label)
}

export interface SmartEstimate {
  estimatedOutput: number
  breakdown: EstimateBreakdownLine[]
  /** 所有暴击词条合计暴击率 */
  critChance: number
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
  swarm:     '#8B8000', // 暗黄 — 虫群
  mercenary: '#DAA520', // 金黄 — 雇佣
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
  // Story 45: 新词条
  war_drum:    '#e17055', // 陶红 — 战鼓
  relay:       '#74b9ff', // 淡蓝 — 中转
  multiply:    '#ffeaa7', // 淡黄 — 乘算
  phase_shift: '#e84393', // 洋红 — 相变
  endo_exo:    '#00cec9', // 湖蓝 — 吸放热
  fusion:      '#ff7675', // 珊瑚 — 聚变
  union:       '#e056a0', // 玫红 — 联合
  echo:        '#a29bfe', // 淡紫 — 回响
  fury:        '#ff4757', // 亮红 — 怒气
  tide:        '#0abde3', // 天蓝 — 潮汐
  flow:        '#0984e3', // 深蓝 — 落差
  confluence:  '#00b894', // 薄荷 — 汇流
  turbulence:  '#636e72', // 灰蓝 — 湍流
  cluster:     '#b2bec3', // 银灰 — 辅音丛
  coverage:    '#55efc4', // 翠绿 — 覆盖度
  bigram:      '#81ecec', // 浅青 — 双字组
  innate:      '#dfe6e9', // 亮灰 — 先天
  counter:     '#fab1a0', // 蜜桃 — 反制
  exhaust:     '#ffa502', // 琥珀 — 消耗
  ethereal:    '#c8d6e5', // 雾灰 — 虚无(词条)
  fallacy:     '#9b59b6', // 紫 — 赌徒
  parity:      '#a29bfe', // 淡紫 — 奇偶
  prime:       '#5f27cd', // 深紫 — 素数
  match:       '#e056a0', // 玫红 — 配对
  entropy:     '#2d98da', // 天蓝 — 熵
  cipher:      '#45aaf2', // 浅蓝 — 密文
  pattern:     '#20bf6b', // 翠绿 — 模式
  leverage:    '#f39c12', // 金橙 — 杠杆
  option:      '#d4ac0d', // 暗金 — 期权
  hedge:       '#1abc9c', // 青绿 — 对冲
  burst:       '#ff6348', // 火红 — 连射
  zero_in:     '#7bed9f', // 浅绿 — 校准
  sharpshooter:'#c0392b', // 深红 — 神射
  bridge:      '#7f8c8d', // 石灰 — 桥
  clique:      '#e74c3c', // 红 — 团
  component:   '#3498db', // 蓝 — 连通
  decorator:   '#f1c40f', // 金黄 — 装饰器
  reflect:     '#1e90ff', // 道奇蓝 — 反射
  monkey_patch:'#cf6a87', // 玫瑰 — 猴子补丁
  excavate:    '#d4a017', // 暗金 — 挖掘
  treasure:    '#f0c040', // 金黄 — 寻宝
  refine:      '#2ecc71', // 绿 — 提纯
  evolve:      '#9b59b6', // 紫 — 进化
  harvest:     '#ffd700', // 金 — 收割
  chain:       '#e74c3c', // 红 — 连锁
  volatile:    '#ff6b6b', // 亮红 — 不稳定
  mutacrit:    '#f39c12', // 橙 — 蜕变暴击
  ascend:      '#00b894', // 青绿 — 升华
  reecho:      '#00CED1', // 深青 — 回音
  myopia:      '#e67e22', // 橙 — 短视
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
    /** 暴击率（所有暴击词条合计，>0 时显示） */
    critChance?: number
    // 智能产出预估
    smartEstimate?: SmartEstimate
    // 商店扩展
    upgradeInfo?: string
    upgradeEstimate?: string
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

/**
 * 机制关键词高亮：对描述中出现的游戏术语加下划线 + 微亮色，
 * 帮助玩家识别需要理解的核心概念。
 *
 * 关键词按长度降序排列，避免短词误匹配长词的子串。
 */
const KW_STYLE = 'color:#fff;text-decoration:underline;text-decoration-color:rgba(255,255,255,0.35);text-underline-offset:2px'

/** 术语 ID → 匹配模式（中英共享同一 ID） */
const MECHANIC_KEYWORD_DEFS: Array<{ id: string; keywords: string[] }> = [
  { id: 'matched',        keywords: ['匹配技能', 'matched skills', '匹配', 'matched'] },
  { id: 'stack',           keywords: ['叠层', 'stack'] },
  { id: 'range',           keywords: ['范围', 'range'] },
  { id: 'transform',      keywords: ['质变', 'transform'] },
  { id: 'crit',            keywords: ['暴击', 'crit'] },
]

/** 编译后的匹配列表（长词优先） */
const MECHANIC_KW_PATTERNS: Array<{ id: string; pattern: RegExp }> = MECHANIC_KEYWORD_DEFS
  .flatMap(def => def.keywords.map(kw => ({ id: def.id, kw, len: kw.length })))
  .sort((a, b) => b.len - a.len)
  .map(({ id, kw }) => ({ id, pattern: new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') }))

/** 当前 tooltip 中出现的术语 ID（每次 highlightKeywords 调用时重建） */
let _matchedKeywordIds: Set<string> = new Set()

/** 在已转义的 HTML 文本中高亮机制关键词，同时收集命中的术语 ID */
function highlightKeywords(escaped: string): string {
  const placeholders: string[] = []
  for (const { id, pattern } of MECHANIC_KW_PATTERNS) {
    escaped = escaped.replace(pattern, m => {
      _matchedKeywordIds.add(id)
      const idx = placeholders.length
      placeholders.push(`<span style="${KW_STYLE}">${m}</span>`)
      return `\x00KW${idx}\x00`
    })
  }
  for (let i = 0; i < placeholders.length; i++) {
    escaped = escaped.replace(`\x00KW${i}\x00`, placeholders[i])
  }
  return escaped
}

/** 术语详情（延迟展开用） */
function buildGlossarySection(ids: Set<string>): string {
  if (ids.size === 0) return ''
  const lines: string[] = []
  for (const def of MECHANIC_KEYWORD_DEFS) {
    if (!ids.has(def.id)) continue
    const term = t('glossary.' + def.id + '.term')
    const detail = t('glossary.' + def.id + '.detail')
    if (!term || term.startsWith('glossary.')) continue
    lines.push(`<div class="tooltip-glossary-item"><span style="${KW_STYLE}">${esc(term)}</span> <span class="tooltip-glossary-detail">${esc(detail)}</span></div>`)
  }
  if (lines.length === 0) return ''
  return `<div class="tooltip-section tooltip-glossary" style="border-top:1px solid rgba(255,255,255,0.15);margin-top:0;padding-top:0;max-height:0;overflow:hidden;opacity:0;transition:max-height 0.3s ease,opacity 0.3s ease,margin-top 0.3s ease,padding-top 0.3s ease;">${lines.join('')}</div>`
}

/** 延迟展开的时间（毫秒） */
const GLOSSARY_DELAY_MS = 1500

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
    if (skill.upgradeEstimate) {
      html += `<div class="tooltip-upgrade-estimate">${esc(skill.upgradeEstimate)}</div>`
    }
  } else {
    html += `<div class="tooltip-title">${esc(skill.icon)} ${esc(skill.name)} Lv.${skill.level}</div>`
  }
  if (skill.schoolCssClass) {
    html += `<span class="tooltip-skill-school ${esc(skill.schoolCssClass)}">${esc(skill.school)}</span>`
  }
  html += `<div class="tooltip-skill-desc">${esc(skill.description)}</div>`
  if (skill.critChance != null && skill.critChance > 0) {
    html += `<div class="tooltip-crit-chance" style="color:#f1c40f;">⚡ ${esc(t('tooltip.crit_chance', { pct: Math.round(skill.critChance * 100) }))}</div>`
  }
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
    const hasMatch = skill.affixInfo.some(a => a.isMatchAffix)
    for (const affix of skill.affixInfo) {
      const color = AFFIX_COLORS[affix.typeKey || ''] || '#e67e22'
      if (hasMatch && !affix.isMatchAffix) {
        // 有匹配词条时，非匹配词条只显示名称
        parts.push(`<div class="tooltip-affix-name" style="color:${color};">&lt;${esc(affix.typeName)}&gt;</div>`)
      } else {
        parts.push(`<div class="tooltip-affix-name" style="color:${color};">&lt;${esc(affix.typeName)}&gt; ${esc(affix.paramSummary)}</div>`)
        if (affix.upgradeEffect) {
          parts.push(`<div class="tooltip-affix-upgrade">${esc(affix.upgradeEffect)}</div>`)
        }
        if (affix.description) {
          parts.push(`<div class="tooltip-affix-desc">${highlightKeywords(esc(affix.description))}</div>`)
        }
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
    parts.push(`<div class="tooltip-mechanic">${highlightKeywords(esc(skill.mechanicInfo))}</div>`)
  }

  // 旧式附魔描述文本
  if (skill.enchantmentInfo) {
    parts.push(`<div class="tooltip-enchantment-info">${highlightKeywords(esc(skill.enchantmentInfo))}</div>`)
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
      parts.push(`<div class="tooltip-ench-desc">${highlightKeywords(esc(ench.desc))}</div>`)
    }
  }

  if (skill.questProgress) {
    parts.push(`<div class="tooltip-quest">${highlightKeywords(esc(skill.questProgress))}</div>`)
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
      if (line.oldLabel) {
        html += `<span class="tooltip-est-item" style="color:${color};"><span class="tooltip-est-old">${esc(line.oldLabel)}</span> → ${esc(line.label)}`
      } else {
        html += `<span class="tooltip-est-item" style="color:${color};">${esc(line.label)}`
      }
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
  private glossaryTimerId: ReturnType<typeof setTimeout> | null = null

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
    this.clearGlossaryTimer()

    // 重置关键词收集
    _matchedKeywordIds = new Set()

    // 组合各区块（空区块不渲染）
    let html = buildLetterSection(data)

    if (data.skill) {
      html += buildHeaderSection(data.skill)
      html += buildAffixSection(data.skill)
      html += buildEnchantSection(data.skill)
      html += buildSummarySection(data.skill)
    }

    // 术语详情区（初始隐藏，延迟淡入）
    const glossaryHtml = buildGlossarySection(_matchedKeywordIds)
    html += glossaryHtml

    el.innerHTML = html
    el.style.display = 'block'

    // 延迟展开术语详情
    if (glossaryHtml) {
      this.glossaryTimerId = setTimeout(() => {
        const glossaryEl = el.querySelector('.tooltip-glossary') as HTMLElement | null
        if (glossaryEl) {
          // border-box 下 maxHeight 包含 padding，需额外补偿 paddingTop
          const GLOSSARY_PAD_TOP = 6
          glossaryEl.style.maxHeight = (glossaryEl.scrollHeight + GLOSSARY_PAD_TOP) + 'px'
          glossaryEl.style.opacity = '1'
          glossaryEl.style.marginTop = `${GLOSSARY_PAD_TOP}px`
          glossaryEl.style.paddingTop = `${GLOSSARY_PAD_TOP}px`
          // 展开动画(0.3s)结束后重新检测视口边界，防止底部遮挡
          setTimeout(() => this.clampToViewport(el), 320)
        }
      }, GLOSSARY_DELAY_MS)
    }

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
    this.clearGlossaryTimer()
    if (this.tooltip) {
      this.tooltip.style.display = 'none'
    }
  }

  private clearGlossaryTimer(): void {
    if (this.glossaryTimerId != null) {
      clearTimeout(this.glossaryTimerId)
      this.glossaryTimerId = null
    }
  }

  /**
   * tooltip 是否正在显示
   */
  isVisible(): boolean {
    return !!this.tooltip && this.tooltip.style.display !== 'none' && this.tooltip.style.display !== ''
  }

  /**
   * 将 tooltip 限制在视口内（用于术语展开后重新定位）
   */
  private clampToViewport(el: HTMLElement): void {
    if (typeof el.getBoundingClientRect !== 'function') return
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth
    const margin = 8
    if (rect.bottom > vh - margin) {
      const top = Math.max(margin, vh - rect.height - margin)
      el.style.top = `${top}px`
    }
    if (rect.right > vw - margin) {
      const left = Math.max(margin, vw - rect.width - margin)
      el.style.left = `${left}px`
    }
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
