// ============================================
// 打字肉鸽 - Act 过渡演出系统
// ============================================
// Story 18.9: Act 标题卡 + 精英提示 + Boss 入场

import { getBossModifierMeta } from '../data/bossModifiers'
import { screenShake } from '../effects/juice'
import { installSkipListener, type SkipController } from '../effects/skipAnimation'
import { t } from '../demo/demo-i18n'
import { state } from '../core/state'

/** Act 过渡 · DPCA-VT220 phosphor terminal teletype（与评定/结算同款 bezel）
 *  任意非修饰键即跳过：打字 tick 立即填完文本；hold/fade 延时折叠为 0 → 立刻进入下一关。 */
export function showActTransition(actNum: number): Promise<void> {
  return new Promise(resolve => {
    const goldReward = document.getElementById('gold-reward')
    const linesContainer = document.getElementById('ct-lines')
    const headerEl = document.getElementById('ct-header')
    if (!goldReward || !linesContainer) { resolve(); return }

    const subtitle = (t(`act.${actNum}`) || '').toUpperCase()

    if (headerEl) {
      const d = new Date()
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      const MM = String(d.getMonth() + 1).padStart(2, '0')
      const DD = String(d.getDate()).padStart(2, '0')
      // 年份打码，月·日跟当天同步
      headerEl.textContent = t('tt.cycle_header', { date: `████·${MM}·${DD}`, time: `${hh}:${mm}` })
    }

    goldReward.classList.remove('gold-reward-hidden', 'gold-reward-hide')
    goldReward.classList.add('gold-reward-show')

    linesContainer.innerHTML = ''
    // skip 只压缩"构建阶段"（typing + 行间 hold）；最后的 700ms 阅读 + 300ms 淡出
    // 不受影响 —— 跳到完成态后让玩家正常读完 + 自然消失
    const skip = installSkipListener()
    void runActTeletype(linesContainer, actNum, subtitle, skip).then(() => {
      setTimeout(() => {
        goldReward.classList.remove('gold-reward-show')
        goldReward.classList.add('gold-reward-hide')
        setTimeout(() => {
          goldReward.classList.add('gold-reward-hidden')
          goldReward.classList.remove('gold-reward-hide')
          skip.dispose()
          resolve()
        }, 300)
      }, 700)
    })
  })
}

async function runActTeletype(container: HTMLElement, actNum: number, subtitle: string, skip: SkipController): Promise<void> {
  const newLine = (cls = ''): HTMLDivElement => {
    const line = document.createElement('div')
    line.className = `ct-line ${cls}`.trim()
    line.innerHTML = '<span class="typed"></span><span class="cursor"></span>'
    container.appendChild(line)
    line.classList.add('shown')
    return line
  }
  const typeLine = (lineEl: HTMLElement, text: string, speed: number): Promise<void> => {
    return new Promise(resolve => {
      const typed = lineEl.querySelector('.typed') as HTMLElement | null
      if (!text || speed === 0 || skip.skipped) {
        if (typed) typed.textContent = text
        lineEl.classList.add('done')
        resolve()
        return
      }
      let i = 0
      const tick = (): void => {
        if (skip.skipped) {
          if (typed) typed.textContent = text
          lineEl.classList.add('done')
          resolve()
          return
        }
        if (typed) typed.textContent = text.slice(0, ++i)
        if (i >= text.length) { lineEl.classList.add('done'); resolve() }
        else setTimeout(tick, speed)
      }
      tick()
    })
  }

  await typeLine(newLine(), t('tt.cycle_rollover'),                                   14)
  await skip.sleep(200)
  await typeLine(newLine(), t('tt.cycle_routing', { n: actNum }),                     14)
  await skip.sleep(250)
  await typeLine(newLine('divider'), '> ────────────────────────',                    4)
  await skip.sleep(100)
  // BATCH 行：大字标题
  const batchLine = newLine('total')
  await typeLine(batchLine, t('tt.cycle_batch_title', { n: actNum, subtitle }),       22)
  await skip.sleep(350)
  await typeLine(newLine('ready'), t('tt.cycle_ready'),                               14)
}

/** 显示 Boss 入场特效（约 2s）— 任意非修饰键跳过 */
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

    // skip 把 stagger 入场强制 fast-forward 到完成态（所有 mod 立刻可见）；
    // 之后的 1700ms dwell + 300ms exit 不受 skip 影响 —— 让玩家读完 modifier 列表
    const skip = installSkipListener()
    skip.onSkip(() => {
      overlay.querySelectorAll<HTMLElement>('.boss-intro-mod-item').forEach(el => {
        el.style.animation = 'none'
        el.style.opacity = '1'
      })
    })
    requestAnimationFrame(() => {
      overlay.classList.add('boss-intro-enter')
      setTimeout(() => {
        overlay.classList.add('boss-intro-exit')
      }, 1700)
      setTimeout(() => {
        overlay.remove()
        skip.dispose()
        resolve()
      }, 2000)
    })
  })
}

/** Stage type → emoji icon（HUD + 终端商店共享单一真相源） */
export const STAGE_ICONS: Record<string, string> = {
  standard: '📋', // routine paperwork
  boss: '🚩',     // priority case
  ritual: '🕯️',  // ritual stays
  elite: '📑',    // special category
}

/** 更新 HUD 中的 Cycle / StageType 信息 */
export function updateStageInfo(cycleNum: number, stageType: string): void {
  const el = document.getElementById('hud-stage-info')
  if (!el) return

  const icon = STAGE_ICONS[stageType] || '📋'
  const badge = state.ascensionLevel > 0 ? ` A${state.ascensionLevel}` : ''
  el.textContent = `BATCH ${cycleNum} ${icon}${badge}`
  el.className = `hud-stage-info stage-${stageType}`

  // 脉冲动画
  el.classList.remove('stage-info-pulse')
  void el.offsetWidth
  el.classList.add('stage-info-pulse')
}
