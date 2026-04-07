// ============================================
// 打字肉鸽 - 用户设置持久化
// ============================================
// Story 56-4: 音量/CRT/语言设置

const STORAGE_KEY = 'typing_roguelike_settings'

export interface UserSettingsData {
  masterVolume: number   // 0-1
  crtEnabled: boolean
  locale: string         // 'zh' | 'en'
}

const DEFAULTS: UserSettingsData = {
  masterVolume: 0.7,
  crtEnabled: true,
  locale: 'zh',
}

let current: UserSettingsData = { ...DEFAULTS }

export function loadSettings(): UserSettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      current = { ...DEFAULTS, ...parsed }
    }
  } catch { /* ignore */ }
  return current
}

export function saveSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch { /* ignore */ }
}

export function getSettings(): UserSettingsData {
  return current
}

export function updateSettings(partial: Partial<UserSettingsData>): void {
  Object.assign(current, partial)
  saveSettings()
}
