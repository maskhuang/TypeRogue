// ============================================
// 打字肉鸽 - Demo DOM 清理
// ============================================
// Demo 共享 index.html，启动时批量移除完整版多余 DOM 节点

import { IS_DEMO } from './demo-config'
import { t } from './demo-i18n'

export function cleanDemoDom(): void {
  if (!IS_DEMO) return

  // Demo 禁用项：不删除，改为 disabled + 标注"正式版推出"
  const disableWithLabel: Array<{ id: string; label: string }> = [
    { id: 'daily-btn', label: t('demo.full_version') },
    { id: 'endless-btn', label: t('demo.full_version') },
    { id: 'collection-btn', label: t('demo.full_version') },
  ]
  for (const { id, label } of disableWithLabel) {
    const el = document.getElementById(id) as HTMLButtonElement | null
    if (el) {
      el.disabled = true
      el.title = label
      el.style.opacity = '0.4'
      el.style.cursor = 'not-allowed'
    }
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
