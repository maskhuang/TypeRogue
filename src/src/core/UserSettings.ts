// ============================================
// 打字肉鸽 - 用户设置持久化
// ============================================
// Story 56-4: 音量/CRT/语言设置

const STORAGE_KEY = 'typing_roguelike_settings'

export type BackgroundMode = 'off' | 'random' | 'liquid' | 'marble' | 'cells' | 'aurora' | 'ink'
export type ShopUiMode = 'classic' | 'terminal'

export interface UserSettingsData {
  masterVolume: number   // 0-1
  crtEnabled: boolean
  locale: string         // 'zh' | 'en'
  backgroundMode: BackgroundMode
  // Story 60.5: 商店界面切换 — 默认 classic（保守发布），玩家主动切到 terminal 后立即生效
  shopUI: ShopUiMode
  // Story 60.11: terminal 商店转场动画开关（whoosh / CRT flicker / reshuffle 逐行 print）
  // 默认 true。`prefers-reduced-motion: reduce` 媒体查询会强制覆盖 false（见 shouldAnimateShop）
  shopAnimations: boolean
  // Story 60.12: terminal / 工作台音效层开关（kbd / BUY / drag / drawer / submit）
  // 默认 true。与 masterVolume 独立 — masterVolume=0 时全静音（含 classic），
  // shopSound=false 仅静默 terminal/workbench 新加音效，不影响 classic shop / 战斗音效
  shopSound: boolean
  // Story 60.17: 拖拽技能时 hover 候选键显示"假设绑这里"的预估产出 tooltip
  // 默认 true（覆盖 Story 60.9 拖拽屏蔽 tooltip 的决策，dogfood 反馈寻位需要预估）
  // 设 false 时回退 60.9 行为：拖拽中所有 tooltip 隐藏不挡视线
  shopDragPreviewTooltip: boolean
}

const DEFAULTS: UserSettingsData = {
  masterVolume: 0.7,
  crtEnabled: true,
  locale: 'zh',
  backgroundMode: 'random',
  shopUI: 'classic',
  shopAnimations: true,
  shopSound: true,
  shopDragPreviewTooltip: true,
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

/**
 * Story 60.12: 是否应播放 terminal / 工作台新音效
 * 仅守卫 settings.shopSound — masterVolume 由 effects/sound 主链路控制
 */
export function shouldPlayShopSound(): boolean {
  return current.shopSound
}

/**
 * Story 60.17: 拖拽技能时是否应显示 hover 目标键的预估 tooltip
 * 单点关 — 关闭则回退 Story 60.9 的 "拖拽中所有 tooltip 隐藏" 行为
 */
export function shouldShowDragPreviewTooltip(): boolean {
  return current.shopDragPreviewTooltip
}

/**
 * Story 60.11: 是否应播放 terminal 商店转场动画
 * 同时尊重玩家设置 + 系统级 prefers-reduced-motion 偏好
 */
export function shouldAnimateShop(): boolean {
  if (!current.shopAnimations) return false
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}
