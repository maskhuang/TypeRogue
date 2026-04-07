// ============================================
// 打字肉鸽 - 排行榜 HTML 显示
// ============================================
// Story 25.5: GameOver 画面中的排行榜渲染
// Story 25.6: 双栏排行榜（普通 + 每日）

import type { MetaState, LeaderboardEntry } from '../core/state/MetaState'
import { t, localizeItemName } from '../demo/demo-i18n'
import { RELICS } from '../data/relics'
import { getBossModifierMeta } from '../data/bossModifiers'

let metaRef: MetaState | null = null

export function initLeaderboardDisplay(meta: MetaState): void {
  metaRef = meta
}

/**
 * 渲染排行榜到 gameover-leaderboard 容器
 */
export function renderLeaderboard(): void {
  const container = document.getElementById('gameover-leaderboard')
  if (!container || !metaRef) return

  const normalEntries = metaRef.getLeaderboard()
  const dailyEntries = metaRef.getDailyLeaderboard()

  if (normalEntries.length === 0 && dailyEntries.length === 0) {
    container.innerHTML = ''
    return
  }

  let html = ''

  // 普通排行榜
  if (normalEntries.length > 0) {
    const latestDate = normalEntries.reduce((max, e) => e.date > max ? e.date : max, '')
    const rows = normalEntries.slice(0, 10).map((e, i) => renderRow(e, i, e.date === latestDate)).join('')
    html += `
      <div class="lb-title">${t('lb.title')}</div>
      <table class="lb-table">
        <thead><tr><th>#</th><th>${t('lb.cycle')}</th><th>${t('lb.score')}</th><th>${t('lb.result')}</th><th>${t('lb.date')}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
  }

  // 每日排行榜
  if (dailyEntries.length > 0) {
    const latestDate = dailyEntries.reduce((max, e) => e.date > max ? e.date : max, '')
    const rows = dailyEntries.slice(0, 10).map((e, i) => renderRow(e, i, e.date === latestDate)).join('')
    html += `
      <div class="lb-title lb-daily-title">${t('lb.daily_title')}</div>
      <table class="lb-table">
        <thead><tr><th>#</th><th>${t('lb.cycle')}</th><th>${t('lb.score')}</th><th>${t('lb.result')}</th><th>${t('lb.date')}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
  }

  container.innerHTML = html
}

/** 获取技能可读名称：优先用 name 字段，否则尝试从 ID 中提取 */
function getSkillDisplayName(s: { id: string; level: number; name?: string }): string {
  if (s.name) return `${s.name}(Lv${s.level})`
  // 旧存档没有 name — 显示简化 ID
  return `Skill(Lv${s.level})`
}

/** 获取遗物可读名称 */
function getRelicDisplayName(relicId: string): string {
  const relic = RELICS[relicId]
  if (!relic) return relicId
  return `${relic.icon}${localizeItemName(relicId, relic.name)}`
}

/** 获取修饰器可读名称 */
function getModDisplayName(modId: string): string {
  const meta = getBossModifierMeta(modId as any)
  if (!meta) return modId
  const name = t(`modifier.${meta.id}`)
  return name !== `modifier.${meta.id}` ? `${meta.icon}${name}` : `${meta.icon}${meta.name}`
}

function renderRow(entry: LeaderboardEntry, index: number, isLatest: boolean): string {
  const resultClass = entry.result === 'victory' ? 'lb-victory' : 'lb-defeat'
  const resultText = entry.result === 'victory' ? t('lb.victory') : t('lb.defeat')
  const dateStr = entry.date.slice(0, 10)
  const highlightClass = isLatest ? ' lb-latest' : ''
  const bs = entry.buildSummary
  const skillStr = bs.skills.map(getSkillDisplayName).join(', ') || t('lb.none')
  const relicStr = bs.relics.map(getRelicDisplayName).join(', ') || t('lb.none')
  const modStr = bs.activeModifiers.map(getModDisplayName).join(', ') || t('lb.none')
  return `<tr class="${resultClass}${highlightClass}">
    <td>${index + 1}</td>
    <td>${entry.cycle}</td>
    <td>${entry.score.toLocaleString()}</td>
    <td>${resultText}</td>
    <td>${dateStr}</td>
  </tr>
  <tr class="lb-detail${highlightClass}">
    <td colspan="5"><span class="lb-detail-label">${t('lb.skills')}:</span> ${escapeHtml(skillStr)} · <span class="lb-detail-label">${t('lb.relics')}:</span> ${escapeHtml(relicStr)} · <span class="lb-detail-label">${t('lb.mods')}:</span> ${escapeHtml(modStr)}</td>
  </tr>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
