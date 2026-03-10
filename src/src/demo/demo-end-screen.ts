// ============================================
// 打字肉鸽 - Demo 结束屏
// ============================================
// 展示得分统计 + 完整版卖点 + Steam 链接 + 再玩一次

import { IS_DEMO } from './demo-config'
import { trackEvent } from './demo-analytics'
import { t } from './demo-i18n'

interface DemoStats {
  totalScore: number
  maxCombo: number
  skillCount: number
  stagesCleared: number
}

export function showDemoEndScreen(stats: DemoStats): void {
  if (!IS_DEMO) return

  trackEvent('demo_end', {
    totalScore: stats.totalScore,
    maxCombo: stats.maxCombo,
    stagesCleared: stats.stagesCleared,
  })

  // 移除已有的结束屏（防重复）
  document.getElementById('demo-end-overlay')?.remove()

  const overlay = document.createElement('div')
  overlay.id = 'demo-end-overlay'
  overlay.className = 'demo-end-overlay'
  overlay.innerHTML = `
    <div class="demo-end-content">
      <h2>${t('demo_end.title')}</h2>
      <div class="demo-end-stats">
        <div>${t('demo_end.score', { value: stats.totalScore })}</div>
        <div>${t('demo_end.combo', { value: stats.maxCombo })}</div>
        <div>${t('demo_end.skills', { value: stats.skillCount })}</div>
      </div>
      <hr class="demo-end-divider">
      <div class="demo-end-features">
        <h3>${t('demo_end.features_title')}</h3>
        <ul>
          <li>${t('demo_end.f1')}</li>
          <li>${t('demo_end.f2')}</li>
          <li>${t('demo_end.f3')}</li>
          <li>${t('demo_end.f4')}</li>
          <li>${t('demo_end.f5')}</li>
          <li>${t('demo_end.f6')}</li>
        </ul>
      </div>
      <div class="demo-end-actions">
        <a class="demo-steam-btn" id="demo-cta-steam"
           href="https://store.steampowered.com/app/XXXXX"
           target="_blank" rel="noopener">
          ${t('demo_end.steam')}
        </a>
        <button class="demo-replay-btn" id="demo-cta-replay">${t('demo_end.replay')}</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  // 事件绑定
  document.getElementById('demo-cta-steam')?.addEventListener('click', () => {
    trackEvent('demo_cta_steam')
  })
  document.getElementById('demo-cta-replay')?.addEventListener('click', () => {
    trackEvent('demo_cta_replay')
    window.location.reload()
  })
}
