// ============================================
// 打字肉鸽 - HelpPanel 术语表面板
// ============================================
// Story 39.6: 纯 DOM 组件，不依赖 PixiJS
// 依赖方向：ui/ 可 import data/ + core/，不 import systems/ 或 scenes/

import { t } from '../demo/demo-i18n'

/**
 * 术语表条目
 */
export interface GlossaryEntry {
  category: 'affix' | 'enchantment' | 'position' | 'resource' | 'modifier' | 'rarity'
  id: string
  icon: string
  nameKey: string
  descKey: string
}

/**
 * 术语表类别定义
 */
const CATEGORIES = ['affix', 'enchantment', 'position', 'resource', 'modifier', 'rarity'] as const
type GlossaryCategory = typeof CATEGORIES[number]

/**
 * 术语表数据 — 映射已有 i18n key
 */
export const GLOSSARY_DATA: GlossaryEntry[] = [
  // 词条（20 种）
  { category: 'affix', id: 'convert', icon: '🔄', nameKey: 'affix.convert', descKey: 'affix_desc.convert' },
  { category: 'affix', id: 'rainbow', icon: '🌈', nameKey: 'affix.rainbow', descKey: 'affix_desc.rainbow' },
  { category: 'affix', id: 'charge', icon: '🔋', nameKey: 'affix.charge', descKey: 'affix_desc.charge' },
  { category: 'affix', id: 'decay', icon: '📉', nameKey: 'affix.decay', descKey: 'affix_desc.decay' },
  { category: 'affix', id: 'pulse', icon: '💓', nameKey: 'affix.pulse', descKey: 'affix_desc.pulse' },
  { category: 'affix', id: 'crit', icon: '💥', nameKey: 'affix.crit', descKey: 'affix_desc.crit' },
  { category: 'affix', id: 'cascade', icon: '🌊', nameKey: 'affix.cascade', descKey: 'affix_desc.cascade' },
  { category: 'affix', id: 'void', icon: '🌑', nameKey: 'affix.void', descKey: 'affix_desc.void' },
  { category: 'affix', id: 'resonance', icon: '🔔', nameKey: 'affix.resonance', descKey: 'affix_desc.resonance' },
  { category: 'affix', id: 'mirror', icon: '🪞', nameKey: 'affix.mirror', descKey: 'affix_desc.mirror' },
  { category: 'affix', id: 'link', icon: '🔗', nameKey: 'affix.link', descKey: 'affix_desc.link' },
  { category: 'affix', id: 'splash', icon: '💦', nameKey: 'affix.splash', descKey: 'affix_desc.splash' },
  { category: 'affix', id: 'amplify', icon: '📢', nameKey: 'affix.amplify', descKey: 'affix_desc.amplify' },
  { category: 'affix', id: 'conduit', icon: '⚡', nameKey: 'affix.conduit', descKey: 'affix_desc.conduit' },
  { category: 'affix', id: 'outcast', icon: '🏴', nameKey: 'affix.outcast', descKey: 'affix_desc.outcast' },
  { category: 'affix', id: 'gravity', icon: '🌍', nameKey: 'affix.gravity', descKey: 'affix_desc.gravity' },
  { category: 'affix', id: 'ligature', icon: '🔠', nameKey: 'affix.ligature', descKey: 'affix_desc.ligature' },
  { category: 'affix', id: 'twin', icon: '👯', nameKey: 'affix.twin', descKey: 'affix_desc.twin' },
  { category: 'affix', id: 'recurse', icon: '🔁', nameKey: 'affix.recurse', descKey: 'affix_desc.recurse' },
  { category: 'affix', id: 'taboo', icon: '⚠️', nameKey: 'affix.taboo', descKey: 'affix_desc.taboo' },

  // 附魔（1 种学徒 + 5 资源专精 + 运算符）
  { category: 'enchantment', id: 'apprentice_neighbor', icon: '👀', nameKey: 'ench_meta.apprentice_neighbor', descKey: 'ench_meta.apprentice_neighbor.desc' },
  { category: 'enchantment', id: 'apprentice_res_base', icon: '🔢', nameKey: 'ench_meta.apprentice_res_base', descKey: 'ench_meta.apprentice_res_base.desc' },
  { category: 'enchantment', id: 'apprentice_res_score', icon: '🏅', nameKey: 'ench_meta.apprentice_res_score', descKey: 'ench_meta.apprentice_res_score.desc' },
  { category: 'enchantment', id: 'apprentice_res_multiplier', icon: '📈', nameKey: 'ench_meta.apprentice_res_multiplier', descKey: 'ench_meta.apprentice_res_multiplier.desc' },
  { category: 'enchantment', id: 'apprentice_res_time', icon: '⏳', nameKey: 'ench_meta.apprentice_res_time', descKey: 'ench_meta.apprentice_res_time.desc' },
  { category: 'enchantment', id: 'apprentice_res_gold', icon: '💰', nameKey: 'ench_meta.apprentice_res_gold', descKey: 'ench_meta.apprentice_res_gold.desc' },
  { category: 'enchantment', id: 'multiply_operator', icon: '⚙️', nameKey: 'ench_meta.multiply_operator', descKey: 'ench_meta.multiply_operator.desc' },
  { category: 'enchantment', id: 'ascend', icon: '✨', nameKey: 'help.ascend', descKey: 'help.ascend.desc' },

  // 位置关系（6 种）
  { category: 'position', id: 'adjacent', icon: '↔️', nameKey: 'rel.adjacent', descKey: 'rel.adjacent.desc' },
  { category: 'position', id: 'sameRow', icon: '➡️', nameKey: 'rel.sameRow', descKey: 'rel.sameRow.desc' },
  { category: 'position', id: 'sameColumn', icon: '⬇️', nameKey: 'rel.sameColumn', descKey: 'rel.sameColumn.desc' },
  { category: 'position', id: 'sameHand', icon: '🤚', nameKey: 'rel.sameHand', descKey: 'rel.sameHand.desc' },
  { category: 'position', id: 'sameFinger', icon: '☝️', nameKey: 'rel.sameFinger', descKey: 'rel.sameFinger.desc' },
  { category: 'position', id: 'symmetric', icon: '🪞', nameKey: 'rel.symmetric', descKey: 'rel.symmetric.desc' },

  // 资源（7 种）
  { category: 'resource', id: 'base', icon: '🔢', nameKey: 'resource.base', descKey: 'resource.base.desc' },
  { category: 'resource', id: 'score', icon: '⭐', nameKey: 'resource.score', descKey: 'resource.score.desc' },
  { category: 'resource', id: 'multiplier', icon: '✖️', nameKey: 'resource.multiplier', descKey: 'resource.multiplier.desc' },
  { category: 'resource', id: 'time', icon: '⏱️', nameKey: 'resource.time', descKey: 'resource.time.desc' },
  { category: 'resource', id: 'gold', icon: '🪙', nameKey: 'resource.gold', descKey: 'resource.gold.desc' },
  { category: 'resource', id: 'fragment', icon: '💎', nameKey: 'resource.fragment', descKey: 'resource.fragment.desc' },
  { category: 'resource', id: 'mutagen', icon: '🧪', nameKey: 'resource.mutagen', descKey: 'resource.mutagen.desc' },

  // 修饰器（仅包含已有 i18n key 的 9 种）
  { category: 'modifier', id: 'boss_keystroke_tax', icon: '⌨️', nameKey: 'modifier.boss_keystroke_tax', descKey: 'modifier.boss_keystroke_tax.desc' },
  { category: 'modifier', id: 'boss_escalation', icon: '📈', nameKey: 'modifier.boss_escalation', descKey: 'modifier.boss_escalation.desc' },
  { category: 'modifier', id: 'boss_frostbite', icon: '❄️', nameKey: 'modifier.boss_frostbite', descKey: 'modifier.boss_frostbite.desc' },
  { category: 'modifier', id: 'boss_resource_tax', icon: '💸', nameKey: 'modifier.boss_resource_tax', descKey: 'modifier.boss_resource_tax.desc' },
  { category: 'modifier', id: 'boss_mirror', icon: '🔀', nameKey: 'modifier.boss_mirror', descKey: 'modifier.boss_mirror.desc' },
  { category: 'modifier', id: 'boss_score_tax', icon: '🏦', nameKey: 'modifier.boss_score_tax', descKey: 'modifier.boss_score_tax.desc' },
  { category: 'modifier', id: 'boss_spotlight', icon: '🔦', nameKey: 'modifier.boss_spotlight', descKey: 'modifier.boss_spotlight.desc' },
  { category: 'modifier', id: 'boss_garble', icon: '🤪', nameKey: 'modifier.boss_garble', descKey: 'modifier.boss_garble.desc' },
  { category: 'modifier', id: 'boss_scroll', icon: '📜', nameKey: 'modifier.boss_scroll', descKey: 'modifier.boss_scroll.desc' },

  // 稀有度（4 级）
  { category: 'rarity', id: 'rarity_0', icon: '⬜', nameKey: 'rarity.0', descKey: 'rarity.0.desc' },
  { category: 'rarity', id: 'rarity_1', icon: '🟦', nameKey: 'rarity.1', descKey: 'rarity.1.desc' },
  { category: 'rarity', id: 'rarity_2', icon: '🟪', nameKey: 'rarity.2', descKey: 'rarity.2.desc' },
  { category: 'rarity', id: 'rarity_3', icon: '🟧', nameKey: 'rarity.3', descKey: 'rarity.3.desc' },
]

/** 转义 HTML 特殊字符 */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * 术语表面板（单例）
 * 固定定位 DOM 覆盖层，z-index 9000
 */
class HelpPanelImpl {
  private panel: HTMLElement | null = null
  private contentEl: HTMLElement | null = null
  private searchInput: HTMLInputElement | null = null
  private activeCategory: GlossaryCategory = 'affix'
  private searchQuery = ''

  show(): void {
    if (this.panel) {
      this.panel.classList.remove('hidden')
      return
    }
    this.create()
  }

  hide(): void {
    this.panel?.classList.add('hidden')
  }

  toggle(): void {
    if (this.panel && !this.panel.classList.contains('hidden')) {
      this.hide()
    } else {
      this.show()
    }
  }

  isVisible(): boolean {
    return this.panel !== null && !this.panel.classList.contains('hidden')
  }

  private create(): void {
    this.panel = document.createElement('div')
    this.panel.id = 'help-panel'
    this.panel.className = 'help-panel'

    // Header
    const header = document.createElement('div')
    header.className = 'help-header'

    const title = document.createElement('h2')
    title.textContent = t('help.title')
    header.appendChild(title)

    this.searchInput = document.createElement('input')
    this.searchInput.type = 'text'
    this.searchInput.className = 'help-search'
    this.searchInput.placeholder = t('help.search_placeholder')
    this.searchInput.addEventListener('input', () => {
      this.searchQuery = this.searchInput?.value.toLowerCase() ?? ''
      this.renderContent()
    })
    header.appendChild(this.searchInput)

    const closeBtn = document.createElement('button')
    closeBtn.className = 'help-close'
    closeBtn.textContent = '✕'
    closeBtn.addEventListener('click', () => this.hide())
    header.appendChild(closeBtn)

    this.panel.appendChild(header)

    // Tabs
    const tabs = document.createElement('div')
    tabs.className = 'help-tabs'
    for (const cat of CATEGORIES) {
      const btn = document.createElement('button')
      btn.dataset.cat = cat
      btn.textContent = t(`help.cat_${cat}`)
      btn.className = cat === this.activeCategory ? 'active' : ''
      btn.addEventListener('click', () => {
        this.activeCategory = cat
        tabs.querySelectorAll('button').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        this.renderContent()
      })
      tabs.appendChild(btn)
    }
    this.panel.appendChild(tabs)

    // Content
    this.contentEl = document.createElement('div')
    this.contentEl.className = 'help-content'
    this.panel.appendChild(this.contentEl)

    document.body.appendChild(this.panel)
    this.renderContent()
    this.injectStyles()
  }

  private renderContent(): void {
    if (!this.contentEl) return

    const entries = GLOSSARY_DATA.filter(e => {
      if (e.category !== this.activeCategory) return false
      if (!this.searchQuery) return true
      const name = t(e.nameKey).toLowerCase()
      const desc = t(e.descKey).toLowerCase()
      return name.includes(this.searchQuery) || desc.includes(this.searchQuery)
    })

    if (entries.length === 0) {
      this.contentEl.innerHTML = `<div class="help-no-results">${esc(t('help.no_results'))}</div>`
      return
    }

    this.contentEl.innerHTML = entries.map(e =>
      `<div class="help-entry">` +
      `<span class="help-entry-icon">${e.icon}</span>` +
      `<div class="help-entry-text">` +
      `<div class="help-entry-name">${esc(t(e.nameKey))}</div>` +
      `<div class="help-entry-desc">${esc(t(e.descKey))}</div>` +
      `</div></div>`
    ).join('')
  }

  private injectStyles(): void {
    if (document.getElementById('help-panel-styles')) return

    const style = document.createElement('style')
    style.id = 'help-panel-styles'
    style.textContent = `
      .help-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(600px, 90vw);
        max-height: 80vh;
        background: #1a1a2e;
        border: 1px solid #333;
        border-radius: 12px;
        z-index: 9000;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        color: #ddd;
        font-family: sans-serif;
      }
      .help-panel.hidden { display: none; }

      .help-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid #333;
      }
      .help-header h2 {
        margin: 0;
        font-size: 16px;
        color: #fff;
        flex-shrink: 0;
      }
      .help-search {
        flex: 1;
        padding: 4px 8px;
        background: #0d0d1a;
        border: 1px solid #444;
        border-radius: 6px;
        color: #ddd;
        font-size: 13px;
        outline: none;
      }
      .help-search:focus { border-color: #666; }
      .help-close {
        background: none;
        border: none;
        color: #888;
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
      }
      .help-close:hover { color: #fff; }

      .help-tabs {
        display: flex;
        gap: 2px;
        padding: 8px 16px;
        border-bottom: 1px solid #333;
        flex-wrap: wrap;
      }
      .help-tabs button {
        padding: 4px 10px;
        background: #0d0d1a;
        border: 1px solid #333;
        border-radius: 6px;
        color: #aaa;
        font-size: 12px;
        cursor: pointer;
      }
      .help-tabs button.active {
        background: #2a2a4a;
        color: #fff;
        border-color: #556;
      }
      .help-tabs button:hover { color: #fff; }

      .help-content {
        overflow-y: auto;
        padding: 8px 16px;
        flex: 1;
      }
      .help-entry {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid #222;
      }
      .help-entry:last-child { border-bottom: none; }
      .help-entry-icon {
        font-size: 18px;
        flex-shrink: 0;
        width: 24px;
        text-align: center;
      }
      .help-entry-text { flex: 1; }
      .help-entry-name {
        font-size: 13px;
        color: #e0e0e0;
        font-weight: bold;
        margin-bottom: 2px;
      }
      .help-entry-desc {
        font-size: 12px;
        color: #999;
        line-height: 1.4;
      }
      .help-no-results {
        text-align: center;
        color: #666;
        padding: 24px 0;
        font-size: 13px;
      }

      .help-btn {
        display: none;
      }
      .help-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        color: #fff;
      }
    `
    document.head.appendChild(style)
  }
}

export const helpPanel = new HelpPanelImpl()

/**
 * 在战斗和商店屏幕上创建 "?" 帮助按钮
 * 需在 DOM 初始化后调用（initElements 之后）
 */
let helpButtonsCreated = false
export function initHelpButtons(): void {
  if (helpButtonsCreated) return
  helpButtonsCreated = true

  // 注入样式（如果 HelpPanel 尚未创建）
  if (!document.getElementById('help-panel-styles')) {
    // 延迟到首次 show() 时注入完整样式
    // 这里只注入按钮样式
    const style = document.createElement('style')
    style.id = 'help-btn-styles'
    style.textContent = `
      .help-btn {
        display: none;
      }
      .help-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        color: #fff;
      }
    `
    document.head.appendChild(style)
  }

  const createBtn = (parentId: string, btnId: string) => {
    const parent = document.getElementById(parentId)
    if (!parent) return
    // 确保 parent 有 position 用于 absolute 定位
    const pos = getComputedStyle(parent).position
    if (pos === 'static') parent.style.position = 'relative'

    const btn = document.createElement('button')
    btn.id = btnId
    btn.className = 'help-btn'
    btn.textContent = '?'
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      helpPanel.toggle()
    })
    parent.appendChild(btn)
  }

  createBtn('battle-screen', 'battle-help-btn')
  createBtn('shop-screen', 'shop-help-btn')
}
