// ============================================
// 打字肉鸽 - Demo Analytics 埋点
// ============================================
// Umami 轻量追踪（无 cookie、GDPR 合规）

import { IS_DEMO } from './demo-config'

export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (!IS_DEMO) return
  if (typeof window !== 'undefined' && (window as any).umami) {
    (window as any).umami.track(name, data)
  }
}
