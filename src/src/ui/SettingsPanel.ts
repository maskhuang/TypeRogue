// ============================================
// 打字肉鸽 - 设置面板
// ============================================
// Story 56-4: 音量/CRT/语言/重置

import { t, setLocale, getLocale, applyHtmlI18n } from '../demo/demo-i18n'
import type { Locale } from '../demo/demo-i18n'
import { getSettings, updateSettings } from '../core/UserSettings'
import type { BackgroundMode } from '../core/UserSettings'
import { setMasterVolume, setMusicVolume, playSound } from '../effects/sound'
import { setBackgroundMode } from '../effects/balatroBackground'
import { eventBus } from '../core/events/EventBus'

const BG_MODES: BackgroundMode[] = ['off', 'random', 'liquid', 'marble', 'cells', 'aurora', 'ink']

let overlay: HTMLElement | null = null
let escHandler: ((e: KeyboardEvent) => void) | null = null
// 战斗中点 CFG 图标会触发 battle:pause —— closeSettingsPanel 时配对 resume
let battlePausedByIcon = false

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
        <label class="settings-label">${esc(t('settings.music'))}</label>
        <input type="range" class="settings-slider" id="settings-music" min="0" max="100" value="${Math.round(settings.musicVolume * 100)}">
        <span class="settings-value" id="settings-music-val">${Math.round(settings.musicVolume * 100)}%</span>
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

  // Music (底乐) slider
  const musicSlider = overlay.querySelector('#settings-music') as HTMLInputElement
  const musicVal = overlay.querySelector('#settings-music-val') as HTMLElement
  musicSlider?.addEventListener('input', () => {
    const v = parseInt(musicSlider.value) / 100
    musicVal.textContent = `${musicSlider.value}%`
    setMusicVolume(v)
    updateSettings({ musicVolume: v })
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
  if (battlePausedByIcon) {
    eventBus.emit('battle:resume')
    battlePausedByIcon = false
  }
}

// === In-game CFG 图标 ===

const ICON_VISIBLE_SCREENS = ['battle-screen', 'terminal-shop-screen', 'workbench-screen-preview']

/** 根据当前可见屏幕决定 CFG 图标显示与否 —— 仅 battle / terminal / workbench 三屏 */
export function updateSettingsToggleIcon(): void {
  const icon = document.getElementById('settings-toggle-icon') as HTMLButtonElement | null
  if (!icon) return
  const anyVisible = ICON_VISIBLE_SCREENS.some(id => {
    const el = document.getElementById(id)
    return el && el.style.display !== 'none' && el.style.display !== ''
  })
  icon.style.display = anyVisible ? 'inline-block' : 'none'
}

/** 应用启动时调用一次：绑定点击 + 初始可见性 */
export function wireSettingsToggleIcon(): void {
  const icon = document.getElementById('settings-toggle-icon')
  if (!icon || (icon as HTMLElement).dataset.bound === '1') return
  ;(icon as HTMLElement).dataset.bound = '1'
  icon.addEventListener('click', () => {
    playSound('click')
    if (overlay) { closeSettingsPanel(); return } // 已开 → 切关
    const battleVisible = document.getElementById('battle-screen')?.style.display === 'flex'
    if (battleVisible) {
      eventBus.emit('battle:pause')
      battlePausedByIcon = true
    }
    openSettingsPanel()
  })
  updateSettingsToggleIcon()
}

/** 应用 CRT 设置到 DOM */
export function applyCRT(enabled: boolean): void {
  document.getElementById('game-container')?.classList.toggle('crt-disabled', !enabled)
}

/** 启动时应用所有设置 */
export function applyAllSettings(): void {
  const s = getSettings()
  setMasterVolume(s.masterVolume)
  setMusicVolume(s.musicVolume)
  applyCRT(s.crtEnabled)
  setBackgroundMode(s.backgroundMode)
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
