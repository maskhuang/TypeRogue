// ============================================
// 规则手册 overlay 渲染器
// ============================================
// 主菜单「规则」入口动态渲染
//   - 单 layer (默认录入者)：无 tab strip，与原硬编码布局视觉一致
//   - 多 layer (≥1 职业解锁)：顶部 tab strip 切换
//   - ACK 按钮维持原 id (`menu-ov-handbook-ack`)，main.ts 的 ACK→tutorial 流程不变
//
// 内容来源：data/handbook.ts RULE_LAYERS · 全 i18n key 驱动

import { getVisibleRuleLayers, type RuleLayer, type RuleContent } from '../../data/handbook'
import type { MetaState } from '../../core/state/MetaState'
import { t } from '../../demo/demo-i18n'

const OVERLAY_ID = 'menu-ov-handbook'

/**
 * 渲染 handbook overlay · 在打开前调用
 * 复用同一 overlay 容器，根据当前 metaState 重绘内容
 */
export function renderHandbook(metaState: MetaState): void {
  const overlay = document.getElementById(OVERLAY_ID)
  if (!overlay) return

  const layers = getVisibleRuleLayers(metaState)

  if (layers.length === 0) {
    // 极端情况：连 baseline 都不可见（不应该发生 · operator/none 默认解锁）
    overlay.innerHTML = `
      <div class="ov-header"><div class="h-text"><div class="title">— NO RULESETS POSTED —</div></div></div>
    `
    return
  }

  // 保留上次激活的 tab（同一 session 再次打开维持上下文）
  const prevActiveId = overlay.dataset.activeLayerId
  const activeLayer = layers.find(l => l.id === prevActiveId) ?? layers[0]
  paint(overlay, layers, activeLayer)
}

function paint(overlay: HTMLElement, layers: RuleLayer[], active: RuleLayer): void {
  overlay.dataset.activeLayerId = active.id
  const content = active.content
  if (!content) return // 防御性：getVisibleRuleLayers 已滤过

  overlay.innerHTML = `
    ${renderTabStrip(layers, active)}
    ${renderBody(content)}
  `

  // Tab 切换
  overlay.querySelectorAll<HTMLElement>('.hb-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.layerId
      const next = layers.find(l => l.id === id)
      if (next && next.id !== active.id) paint(overlay, layers, next)
    })
  })
}

function renderTabStrip(layers: RuleLayer[], active: RuleLayer): string {
  if (layers.length < 2) return '' // 单层无需 tab
  return `<div class="hb-tab-strip">${layers.map(l => `
    <button class="hb-tab${l.id === active.id ? ' active' : ''}" data-layer-id="${l.id}">${escapeHtml(t(l.tabLabelKey))}</button>
  `).join('')}</div>`
}

function renderBody(c: RuleContent): string {
  return `
    <div class="ov-header">
      <div class="seal"><img src="/assets/ui/seal-mark.png" alt=""></div>
      <div class="h-text">
        <div class="org">${escapeHtml(t('menu.org_dept'))}</div>
        <div class="title">${escapeHtml(t(c.titleKey))}</div>
      </div>
      <div class="form-id">${t(c.formIdKey)}</div>
    </div>
    <p style="font-size:12px; color:var(--desk-ink-dim); letter-spacing:0.1em">${escapeHtml(t(c.preambleKey))}</p>
    ${c.sections.map(s => `
      <div class="ov-section">${escapeHtml(t(s.titleKey))}</div>
      <ul>${s.itemKeys.map(k => `<li>${escapeHtml(t(k))}</li>`).join('')}</ul>
    `).join('')}
    ${c.warnKey ? `<p class="ov-warn">${escapeHtml(t(c.warnKey))}</p>` : ''}
    ${c.routeNoteKey ? `<p class="ov-route-note">${t(c.routeNoteKey)}</p>` : ''}
    <div class="ov-footer">
      <div>${escapeHtml(t(c.footerKey))}</div>
      <button class="ov-close" id="menu-ov-handbook-ack">${escapeHtml(t(c.ackBtnKey))}</button>
    </div>
  `
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
