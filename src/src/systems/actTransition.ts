// ============================================
// 打字肉鸽 - Act 过渡演出系统
// ============================================
// Story 18.9: Act 标题卡 + 精英提示 + Boss 入场

import { getBossModifierMeta } from '../data/bossModifiers'
import { screenShake } from '../effects/juice'
import { t } from '../demo/demo-i18n'
import { state } from '../core/state'

/** 显示 Act 标题卡过渡动画（约 1.5s） */
export function showActTransition(actNum: number): Promise<void> {
  return new Promise(resolve => {
    const subtitle = t(`act.${actNum}`)
    const overlay = document.createElement('div')
    overlay.id = 'act-transition-overlay'
    overlay.innerHTML = `
      <div class="act-title">Cycle ${actNum}</div>
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
      const modName = t(`modifier.${meta.id}`) !== `modifier.${meta.id}` ? t(`modifier.${meta.id}`) : meta.name
      item.textContent = `${meta.icon} ${modName}`
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

/** 更新 HUD 中的 Cycle / StageType 信息 */
export function updateStageInfo(cycleNum: number, stageType: string): void {
  const el = document.getElementById('hud-stage-info')
  if (!el) return

  const icons: Record<string, string> = {
    standard: '📋', // routine paperwork
    boss: '🚩',     // priority case
    ritual: '🕯️',  // ritual stays
    elite: '📑',    // special category
  }
  const icon = icons[stageType] || '📋'
  const badge = state.ascensionLevel > 0 ? ` A${state.ascensionLevel}` : ''
  el.textContent = `BATCH ${cycleNum} ${icon}${badge}`
  el.className = `hud-stage-info stage-${stageType}`

  // 脉冲动画
  el.classList.remove('stage-info-pulse')
  void el.offsetWidth
  el.classList.add('stage-info-pulse')
}
