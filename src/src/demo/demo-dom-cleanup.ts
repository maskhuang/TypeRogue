// ============================================
// 打字肉鸽 - Demo DOM 清理
// ============================================
// Demo 共享 index.html，启动时批量移除完整版多余 DOM 节点

import { IS_DEMO } from './demo-config'
import { t } from './demo-i18n'

export function cleanDemoDom(): void {
  if (!IS_DEMO) return

  const removeIds = [
    'class-select-modal',     // 职业选择
    'craft-panel',            // 造词站
    'metamorph-panel',        // 蜕变站
    'boss-modifier-picker',   // Boss 修饰器
    'daily-btn',              // 每日挑战按钮
    'endless-btn',            // 无尽模式按钮
    'collection-btn',         // 图鉴按钮
  ]
  for (const id of removeIds) {
    document.getElementById(id)?.remove()
  }
}

// === 全局错误边界（Demo 面向冷流量，白屏 = 永久流失） ===

export function installDemoErrorBoundary(): void {
  if (!IS_DEMO) return

  window.onerror = (_msg, _src, _line, _col, _err) => {
    showDemoErrorOverlay()
    return true
  }
  window.addEventListener('unhandledrejection', (e) => {
    showDemoErrorOverlay()
    e.preventDefault()
  })
}

function showDemoErrorOverlay(): void {
  if (document.getElementById('demo-error-overlay')) return
  const overlay = document.createElement('div')
  overlay.id = 'demo-error-overlay'
  overlay.className = 'demo-overlay'
  overlay.innerHTML = `
    <div class="demo-start-content">
      <h2>${t('demo.error.title')}</h2>
      <p>${t('demo.error.desc')}</p>
      <button class="demo-start-btn" onclick="location.reload()">${t('demo.error.btn')}</button>
    </div>
  `
  document.body.appendChild(overlay)
}

// === WebGL 兼容性检测 ===

export function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch { return false }
}

export function showWebGLError(): void {
  const overlay = document.createElement('div')
  overlay.className = 'demo-overlay'
  overlay.innerHTML = `
    <div class="demo-start-content">
      <h2>${t('demo.webgl.title')}</h2>
      <p>${t('demo.webgl.desc')}</p>
    </div>
  `
  document.body.appendChild(overlay)
}
