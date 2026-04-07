// ============================================
// 打字肉鸽 - 设置面板
// ============================================
// Story 56-4: 音量/CRT/语言/重置

import { t, setLocale, getLocale, applyHtmlI18n } from '../demo/demo-i18n'
import type { Locale } from '../demo/demo-i18n'
import { getSettings, updateSettings } from '../core/UserSettings'
import { setMasterVolume } from '../effects/sound'

let overlay: HTMLElement | null = null
let escHandler: ((e: KeyboardEvent) => void) | null = null

export function openSettingsPanel(): void {
  if (overlay) return // already open
  const settings = getSettings()
  const container = document.getElementById('game-container')
  if (!container) return

  overlay = document.createElement('div')
  overlay.className = 'settings-overlay'
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
  overlay.querySelectorAll('.settings-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
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
    const enabled = !getSettings().crtEnabled
    updateSettings({ crtEnabled: enabled })
    applyCRT(enabled)
    crtBtn.textContent = enabled ? 'ON' : 'OFF'
    crtBtn.classList.toggle('active', enabled)
  })

  // Reset
  const resetBtn = overlay.querySelector('#settings-reset') as HTMLElement
  resetBtn?.addEventListener('click', () => {
    if (confirm(t('settings.reset_confirm'))) {
      localStorage.clear()
      window.location.reload()
    }
  })

  // Close
  const closeBtn = overlay.querySelector('#settings-close') as HTMLElement
  closeBtn?.addEventListener('click', () => closeSettingsPanel())

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
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
