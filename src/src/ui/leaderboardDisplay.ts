// ============================================
// 打字肉鸽 - 排行榜 HTML 显示
// ============================================
// Story 25.5: GameOver 画面中的排行榜渲染
// Story 25.6: 双栏排行榜（普通 + 每日）

import type { MetaState, LeaderboardEntry } from '../core/state/MetaState'

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
      <div class="lb-title">排行榜</div>
      <table class="lb-table">
        <thead><tr><th>#</th><th>周目</th><th>分数</th><th>结果</th><th>日期</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
  }

  // 每日排行榜
  if (dailyEntries.length > 0) {
    const latestDate = dailyEntries.reduce((max, e) => e.date > max ? e.date : max, '')
    const rows = dailyEntries.slice(0, 10).map((e, i) => renderRow(e, i, e.date === latestDate)).join('')
    html += `
      <div class="lb-title lb-daily-title">每日挑战榜</div>
      <table class="lb-table">
        <thead><tr><th>#</th><th>周目</th><th>分数</th><th>结果</th><th>日期</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `
  }

  container.innerHTML = html
}

function renderRow(entry: LeaderboardEntry, index: number, isLatest: boolean): string {
  const resultClass = entry.result === 'victory' ? 'lb-victory' : 'lb-defeat'
  const resultText = entry.result === 'victory' ? '胜' : '败'
  const dateStr = entry.date.slice(0, 10)
  const highlightClass = isLatest ? ' lb-latest' : ''
  const bs = entry.buildSummary
  const skillStr = bs.skills.map(s => `${s.id}(Lv${s.level})`).join(', ') || '无'
  const relicStr = bs.relics.join(', ') || '无'
  const modStr = bs.activeModifiers.join(', ') || '无'
  return `<tr class="${resultClass}${highlightClass}">
    <td>${index + 1}</td>
    <td>${entry.cycle}</td>
    <td>${entry.score.toLocaleString()}</td>
    <td>${resultText}</td>
    <td>${dateStr}</td>
  </tr>
  <tr class="lb-detail${highlightClass}">
    <td colspan="5"><span class="lb-detail-label">技能:</span> ${escapeHtml(skillStr)} · <span class="lb-detail-label">遗物:</span> ${escapeHtml(relicStr)} · <span class="lb-detail-label">修饰:</span> ${escapeHtml(modStr)}</td>
  </tr>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
