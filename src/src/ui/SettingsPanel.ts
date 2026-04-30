// ============================================
// 打字肉鸽 - 设置面板
// ============================================
// Story 56-4: 音量/CRT/语言/重置

import { t, setLocale, getLocale, applyHtmlI18n } from '../demo/demo-i18n'
import type { Locale } from '../demo/demo-i18n'
import { getSettings, updateSettings } from '../core/UserSettings'
import type { BackgroundMode, ShopUiMode } from '../core/UserSettings'
import { setMasterVolume, playSound } from '../effects/sound'
import { setBackgroundMode } from '../effects/balatroBackground'

const BG_MODES: BackgroundMode[] = ['off', 'random', 'liquid', 'marble', 'cells', 'aurora', 'ink']

let overlay: HTMLElement | null = null
let escHandler: ((e: KeyboardEvent) => void) | null = null

export function openSettingsPanel(): void {
  if (overlay) return // already open
  const settings = getSettings()
  const container = document.getElementById('game-container')
  if (!container) return

  overlay = document.createElement('div')
  overlay.className = 'settings-overlay settings-style-dossier'
  overlay.innerHTML = `
    <div class="settings-panel">
      <div class="settings-title">${esc(t('settings.title'))}</div>

      <div class="settings-row">
        <label class="settings-label">${esc(t('settings.volume'))}</label>
        <input type="range" class="settings-slider" id="settings-volume" min="0" max="100" value="${Math.round(settings.masterVolume * 100)}">
        <span class="settings-value" id="settings-volume-val">${Math.round(settings.masterVolume * 100)}%</span>
      </div>

      <div class="settings-row">
        <label class="settings-label">${esc(t('settings.language'))}</label>
        <div class="settings-lang-btns">
          <button class="settings-lang-btn ${getLocale() === 'zh' ? 'active' : ''}" data-lang="zh">中</button>
          <button class="settings-lang-btn ${getLocale() === 'en' ? 'active' : ''}" data-lang="en">EN</button>
        </div>
      </div>

      <div class="settings-row">
        <label class="settings-label">${esc(t('settings.crt'))}</label>
        <button class="settings-toggle ${settings.crtEnabled ? 'active' : ''}" id="settings-crt">
          ${settings.crtEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div class="settings-row settings-bg-row">
        <label class="settings-label">${esc(t('settings.background'))}</label>
        <div class="settings-bg-btns">
          ${BG_MODES.map(m => `
            <button class="settings-lang-btn ${settings.backgroundMode === m ? 'active' : ''}" data-bg="${m}">
              ${esc(t('settings.bg.' + m))}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="settings-row">
        <label class="settings-label">${esc(t('settings.shopUI'))}</label>
        <div class="settings-lang-btns">
          <button class="settings-lang-btn ${settings.shopUI === 'classic' ? 'active' : ''}" data-shop-ui="classic">${esc(t('settings.shopUI.classic'))}</button>
          <button class="settings-lang-btn ${settings.shopUI === 'terminal' ? 'active' : ''}" data-shop-ui="terminal">${esc(t('settings.shopUI.terminal'))}</button>
        </div>
      </div>

      <div class="settings-row">
        <label class="settings-label">${esc(t('settings.shopAnimations'))}</label>
        <div class="settings-lang-btns">
          <button class="settings-lang-btn ${settings.shopAnimations ? 'active' : ''}" data-shop-anim="on">${esc(t('settings.shopAnimations.on'))}</button>
          <button class="settings-lang-btn ${!settings.shopAnimations ? 'active' : ''}" data-shop-anim="off">${esc(t('settings.shopAnimations.off'))}</button>
        </div>
      </div>

      <div class="settings-row">
        <label class="settings-label">${esc(t('settings.shopSound'))}</label>
        <div class="settings-lang-btns">
          <button class="settings-lang-btn ${settings.shopSound ? 'active' : ''}" data-shop-sound="on">${esc(t('settings.shopSound.on'))}</button>
          <button class="settings-lang-btn ${!settings.shopSound ? 'active' : ''}" data-shop-sound="off">${esc(t('settings.shopSound.off'))}</button>
        </div>
      </div>

      <div class="settings-row">
        <label class="settings-label">${esc(t('settings.shopDragPreview'))}</label>
        <div class="settings-lang-btns">
          <button class="settings-lang-btn ${settings.shopDragPreviewTooltip ? 'active' : ''}" data-shop-drag-preview="on">${esc(t('settings.shopDragPreview.on'))}</button>
          <button class="settings-lang-btn ${!settings.shopDragPreviewTooltip ? 'active' : ''}" data-shop-drag-preview="off">${esc(t('settings.shopDragPreview.off'))}</button>
        </div>
      </div>

      <div class="settings-divider"></div>

      <button class="settings-reset-btn" id="settings-reset">${esc(t('settings.reset'))}</button>

      <button class="settings-close-btn" id="settings-close">${esc(t('settings.close'))}</button>
    </div>
  `
  container.appendChild(overlay)

  // Volume slider
  const slider = overlay.querySelector('#settings-volume') as HTMLInputElement
  const valDisplay = overlay.querySelector('#settings-volume-val') as HTMLElement
  slider?.addEventListener('input', () => {
    const v = parseInt(slider.value) / 100
    valDisplay.textContent = `${slider.value}%`
    setMasterVolume(v)
    updateSettings({ masterVolume: v })
  })

  // Language buttons
  overlay.querySelectorAll('.settings-lang-btns .settings-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playSound('click')
      const lang = (btn as HTMLElement).dataset.lang as Locale
      setLocale(lang)
      updateSettings({ locale: lang })
      applyHtmlI18n()
      // Refresh panel
      closeSettingsPanel()
      openSettingsPanel()
    })
  })

  // CRT toggle
  const crtBtn = overlay.querySelector('#settings-crt') as HTMLElement
  crtBtn?.addEventListener('click', () => {
    playSound('toggle')
    const enabled = !getSettings().crtEnabled
    updateSettings({ crtEnabled: enabled })
    applyCRT(enabled)
    crtBtn.textContent = enabled ? 'ON' : 'OFF'
    crtBtn.classList.toggle('active', enabled)
  })

  // Background style picker
  overlay.querySelectorAll('.settings-bg-btns [data-bg]').forEach(btn => {
    btn.addEventListener('click', () => {
      playSound('click')
      const mode = (btn as HTMLElement).dataset.bg as BackgroundMode
      updateSettings({ backgroundMode: mode })
      setBackgroundMode(mode)
      overlay?.querySelectorAll('.settings-bg-btns [data-bg]').forEach(b => {
        b.classList.toggle('active', (b as HTMLElement).dataset.bg === mode)
      })
    })
  })

  // Story 60.5: Shop UI 切换（classic / terminal）
  overlay.querySelectorAll('[data-shop-ui]').forEach(btn => {
    btn.addEventListener('click', () => {
      playSound('click')
      const mode = (btn as HTMLElement).dataset.shopUi as ShopUiMode
      updateSettings({ shopUI: mode })
      overlay?.querySelectorAll('[data-shop-ui]').forEach(b => {
        b.classList.toggle('active', (b as HTMLElement).dataset.shopUi === mode)
      })
    })
  })

  // Story 60.11: Shop Animations 切换（on / off）
  overlay.querySelectorAll('[data-shop-anim]').forEach(btn => {
    btn.addEventListener('click', () => {
      playSound('click')
      const mode = (btn as HTMLElement).dataset.shopAnim
      const enabled = mode === 'on'
      updateSettings({ shopAnimations: enabled })
      overlay?.querySelectorAll('[data-shop-anim]').forEach(b => {
        const isOn = (b as HTMLElement).dataset.shopAnim === 'on'
        b.classList.toggle('active', isOn === enabled)
      })
    })
  })

  // Story 60.12: Shop Sound 切换（on / off）
  overlay.querySelectorAll('[data-shop-sound]').forEach(btn => {
    btn.addEventListener('click', () => {
      playSound('click')
      const mode = (btn as HTMLElement).dataset.shopSound
      const enabled = mode === 'on'
      updateSettings({ shopSound: enabled })
      overlay?.querySelectorAll('[data-shop-sound]').forEach(b => {
        const isOn = (b as HTMLElement).dataset.shopSound === 'on'
        b.classList.toggle('active', isOn === enabled)
      })
    })
  })

  // Story 60.17: Shop Drag Preview Tooltip 切换（on / off）
  overlay.querySelectorAll('[data-shop-drag-preview]').forEach(btn => {
    btn.addEventListener('click', () => {
      playSound('click')
      const mode = (btn as HTMLElement).dataset.shopDragPreview
      const enabled = mode === 'on'
      updateSettings({ shopDragPreviewTooltip: enabled })
      overlay?.querySelectorAll('[data-shop-drag-preview]').forEach(b => {
        const isOn = (b as HTMLElement).dataset.shopDragPreview === 'on'
        b.classList.toggle('active', isOn === enabled)
      })
    })
  })

  // Reset
  const resetBtn = overlay.querySelector('#settings-reset') as HTMLElement
  resetBtn?.addEventListener('click', () => {
    playSound('warning')
    if (confirm(t('settings.reset_confirm'))) {
      localStorage.clear()
      window.location.reload()
    }
  })

  // Close
  const closeBtn = overlay.querySelector('#settings-close') as HTMLElement
  closeBtn?.addEventListener('click', () => { playSound('cancel'); closeSettingsPanel() })

  // Esc close
  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeSettingsPanel()
  }
  window.addEventListener('keydown', escHandler)
}

export function closeSettingsPanel(): void {
  if (overlay?.parentNode) overlay.parentNode.removeChild(overlay)
  overlay = null
  if (escHandler) { window.removeEventListener('keydown', escHandler); escHandler = null }
}

/** 应用 CRT 设置到 DOM */
export function applyCRT(enabled: boolean): void {
  document.getElementById('game-container')?.classList.toggle('crt-disabled', !enabled)
}

/** 启动时应用所有设置 */
export function applyAllSettings(): void {
  const s = getSettings()
  setMasterVolume(s.masterVolume)
  applyCRT(s.crtEnabled)
  setBackgroundMode(s.backgroundMode)
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
