// ============================================
// 打字肉鸽 - Act 过渡演出系统
// ============================================
// Story 18.9: Act 标题卡 + 精英提示 + Boss 入场

import { getBossModifierMeta } from '../data/bossModifiers'
import { screenShake } from '../effects/juice'
import { t } from '../demo/demo-i18n'

/** 显示 Act 标题卡过渡动画（约 1.5s） */
export function showActTransition(actNum: number): Promise<void> {
  return new Promise(resolve => {
    const subtitle = t(`act.${actNum}`)
    const overlay = document.createElement('div')
    overlay.id = 'act-transition-overlay'
    overlay.innerHTML = `
      <div class="act-title">Act ${actNum}</div>
      <div class="act-subtitle">${subtitle}</div>
    `
    document.body.appendChild(overlay)

    // fadeIn 300ms → hold 900ms → fadeOut 300ms
    requestAnimationFrame(() => {
      overlay.classList.add('act-enter')
      setTimeout(() => overlay.classList.add('act-visible'), 300)
      setTimeout(() => {
        overlay.classList.remove('act-visible')
        overlay.classList.add('act-exit')
      }, 1200)
      setTimeout(() => { overlay.remove(); resolve() }, 1500)
    })
  })
}

/** 显示精英关开场提示（约 1.2s） */
export function showEliteAnnouncement(modId: string): Promise<void> {
  return new Promise(resolve => {
    const meta = getBossModifierMeta(modId as any)
    if (!meta) { resolve(); return }

    const banner = document.createElement('div')
    banner.id = 'elite-announcement'
    banner.innerHTML = t('act.elite_announce', { icon: meta.icon, name: meta.name })
    document.body.appendChild(banner)

    requestAnimationFrame(() => {
      banner.classList.add('elite-announce-enter')
      setTimeout(() => {
        banner.classList.add('elite-announce-exit')
      }, 900)
      setTimeout(() => { banner.remove(); resolve() }, 1200)
    })
  })
}

/** 显示 Boss 入场特效（约 2s） */
export function showBossIntro(pool: string[]): Promise<void> {
  return new Promise(resolve => {
    screenShake(4)

    const overlay = document.createElement('div')
    overlay.id = 'boss-intro-overlay'

    const title = document.createElement('div')
    title.className = 'boss-intro-title'
    title.textContent = '💀 BOSS'
    overlay.appendChild(title)

    const modList = document.createElement('div')
    modList.className = 'boss-intro-mods'
    pool.forEach((modId, i) => {
      const meta = getBossModifierMeta(modId as any)
      if (!meta) return
      const item = document.createElement('div')
      item.className = 'boss-intro-mod-item'
      item.textContent = `${meta.icon} ${meta.name}`
      item.style.animationDelay = `${(0.6 + i * 0.3).toFixed(1)}s`
      modList.appendChild(item)
    })
    overlay.appendChild(modList)

    document.body.appendChild(overlay)

    requestAnimationFrame(() => {
      overlay.classList.add('boss-intro-enter')
      setTimeout(() => {
        overlay.classList.add('boss-intro-exit')
      }, 1700)
      setTimeout(() => { overlay.remove(); resolve() }, 2000)
    })
  })
}

/** 更新 HUD 中的 Act / StageType 信息 */
export function updateStageInfo(actNum: number, stageType: string): void {
  const el = document.getElementById('hud-stage-info')
  if (!el) return

  const icons: Record<string, string> = {
    standard: '⚔️',
    elite: '⚡',
    boss: '💀',
  }
  const icon = icons[stageType] || '⚔️'
  el.textContent = `Act ${actNum} ${icon}`
  el.className = `hud-stage-info stage-${stageType}`

  // 脉冲动画
  el.classList.remove('stage-info-pulse')
  void el.offsetWidth
  el.classList.add('stage-info-pulse')
}
