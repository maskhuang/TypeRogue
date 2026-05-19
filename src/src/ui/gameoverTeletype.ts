// ============================================
// Game Over · DPCA-VT220 CRT teletype renderer
// ============================================
// battle scene = MOKO (M4 旗下) · 失败/通过都走同一 CRT 框架，文案分支
// 与 settlement-teletype / rest-mock-crt 一脉相承

import { t, getLocale } from '../demo/demo-i18n'
import { getLastDepartureResult } from '../systems/departureCheck'

export type GameOverMode = 'defeat' | 'victory'

export interface GameOverStats {
  /** Run 实际到达的文件编号（display level） */
  fileNumber: number | string
  score: number
  targetScore?: number
  maxCombo: number
  /** 已习得技能数 */
  skillCount: number
  /** 当前 cycle */
  cycle?: number
  /** 通关时若已解锁 endless 则隐藏提示，未解锁则显示 */
  endlessJustUnlocked?: boolean
  /** 通关时上升的 ascension level，0 不显示 */
  ascensionLevel?: number
  /** V2 affix on_battle_end → gain_skill 本战获赠 skill 列表（id+name+level）·
   *  缺省 / 空数组 = 不显示 BONUS section */
  grantedSkills?: readonly { name: string; level: number }[]
}

interface ScriptLine {
  text: string
  /** 额外 class · divider / bright / alert / total / dim */
  cls?: string
  /** 单字符打字间隔 ms（0 = 整行直出） */
  charSpeed?: number
  /** 本行打完后停顿 ms */
  holdAfter?: number
}

const SKIP_FLAG = '__gameover_skip__'

/** Run the teletype animation into #gameover-stats and reveal LB + actions at end. */
export function runGameOverTeletype(mode: GameOverMode, stats: GameOverStats): Promise<void> {
  const screen = document.getElementById('gameover-screen')
  const stage = document.getElementById('gameover-stats')
  const header = document.getElementById('gameover-header')
  const specLine = document.getElementById('gameover-spec-line')
  const lb = document.getElementById('gameover-leaderboard')
  const actions = document.getElementById('gameover-actions')
  if (!stage || !screen) return Promise.resolve()

  // Reset state
  stage.innerHTML = ''
  if (lb) lb.classList.remove('show')
  if (actions) {
    actions.classList.remove('show')
    actions.hidden = true
  }
  screen.classList.remove('gameover-mode-defeat', 'gameover-mode-victory')
  screen.classList.add(mode === 'defeat' ? 'gameover-mode-defeat' : 'gameover-mode-victory')

  // Per-session header/spec stamp · 固定虚构日期 + 当前 HH:MM:SS（一点点变化感）
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  // 工号：用 stats 派生一个稳定的 4 位（避免每帧变化）
  const opCode = String(7000 + ((stats.score | 0) % 1000)).padStart(4, '0')
  if (header) header.textContent = t('gameover.crt.header', { date: '1962·11·23', time: `${hh}:${mm}:${ss}` })
  if (specLine) specLine.textContent = t('gameover.crt.spec_line', { op: opCode })

  const script = buildScript(mode, stats)

  // Skip handler · 空格 / 点击屏幕都立即跳到末尾
  ;(screen as any)[SKIP_FLAG] = false
  const skipHandler = (e: KeyboardEvent | MouseEvent) => {
    if (e instanceof KeyboardEvent && e.key !== ' ' && e.key !== 'Enter' && e.key !== 'Escape') return
    if (e instanceof MouseEvent) {
      const target = e.target as HTMLElement
      // 不拦截按钮点击
      if (target.closest('.restart-btn')) return
    }
    ;(screen as any)[SKIP_FLAG] = true
  }
  window.addEventListener('keydown', skipHandler)
  screen.addEventListener('click', skipHandler)

  return runScript(stage, screen, script).then(() => {
    window.removeEventListener('keydown', skipHandler)
    screen.removeEventListener('click', skipHandler)

    // 末尾常驻光标
    const finalCursor = document.createElement('span')
    finalCursor.className = 'ct-final-cursor'
    if (stage.lastElementChild) stage.lastElementChild.appendChild(finalCursor)

    // 解禁 actions
    if (actions) {
      actions.hidden = false
      requestAnimationFrame(() => actions.classList.add('show'))
    }
    if (lb) lb.classList.add('show')
  })
}

function buildScript(mode: GameOverMode, s: GameOverStats): ScriptLine[] {
  const lines: ScriptLine[] = []
  const cycleLabel = s.cycle ? ` · CYCLE ${s.cycle}` : ''
  const fileLabel = String(s.fileNumber)

  if (mode === 'defeat') {
    lines.push({ text: t('gameover.crt.file_aborted', { n: fileLabel }) + cycleLabel, cls: 'alert', charSpeed: 18, holdAfter: 250 })
    lines.push({ text: t('gameover.crt.reason_target'), cls: 'dim', charSpeed: 14, holdAfter: 300 })
    lines.push({ text: '', charSpeed: 0, holdAfter: 120 })
    lines.push({ text: t('gameover.crt.section_record'), cls: 'divider', charSpeed: 6, holdAfter: 180 })
    lines.push({ text: t('gameover.crt.row_score_target', { score: s.score.toLocaleString(), target: (s.targetScore ?? 0).toLocaleString() }), charSpeed: 8, holdAfter: 120 })
    lines.push({ text: t('gameover.crt.row_combo', { combo: s.maxCombo }), charSpeed: 8, holdAfter: 120 })
    lines.push({ text: t('gameover.crt.row_stage', { stage: fileLabel }), charSpeed: 8, holdAfter: 120 })
    lines.push({ text: t('gameover.crt.row_skills', { count: s.skillCount }), charSpeed: 8, holdAfter: 180 })
    lines.push({ text: t('gameover.crt.divider'), cls: 'divider', charSpeed: 6, holdAfter: 220 })
    lines.push({ text: t('gameover.crt.archiving'), charSpeed: 14, holdAfter: 280 })
    lines.push({ text: t('gameover.crt.operator_relieved'), cls: 'dim', charSpeed: 14, holdAfter: 350 })
    lines.push({ text: '', charSpeed: 0, holdAfter: 100 })
    lines.push({ text: t('gameover.crt.archive_pending'), cls: 'dim', charSpeed: 12, holdAfter: 80 })
  } else {
    lines.push({ text: t('gameover.crt.file_processed', { n: fileLabel }) + cycleLabel, cls: 'bright', charSpeed: 18, holdAfter: 300 })
    lines.push({ text: '', charSpeed: 0, holdAfter: 120 })
    lines.push({ text: t('gameover.crt.section_breakdown'), cls: 'divider', charSpeed: 6, holdAfter: 180 })
    lines.push({ text: t('gameover.crt.row_score', { score: s.score.toLocaleString() }), charSpeed: 8, holdAfter: 120 })
    lines.push({ text: t('gameover.crt.row_combo', { combo: s.maxCombo }), charSpeed: 8, holdAfter: 120 })
    lines.push({ text: t('gameover.crt.row_skills', { count: s.skillCount }), charSpeed: 8, holdAfter: 180 })
    if (s.ascensionLevel && s.ascensionLevel > 0) {
      lines.push({ text: t('gameover.crt.ascension_badge', { level: s.ascensionLevel }), cls: 'bright', charSpeed: 10, holdAfter: 200 })
    }
    lines.push({ text: t('gameover.crt.divider'), cls: 'divider', charSpeed: 6, holdAfter: 220 })
    // V2 gain_skill 获赠 section · 仅 victory 路径显示（lose 路径不送 skill）
    if (s.grantedSkills && s.grantedSkills.length > 0) {
      lines.push({ text: t('gameover.crt.section_bonus'), cls: 'divider', charSpeed: 6, holdAfter: 200 })
      for (const sk of s.grantedSkills) {
        lines.push({
          text: t('gameover.crt.row_granted_skill', { name: sk.name, level: sk.level }),
          cls: 'bright',
          charSpeed: 10,
          holdAfter: 250,         // stagger ~250ms · 多 grant 时不糊
        })
      }
      lines.push({ text: t('gameover.crt.divider'), cls: 'divider', charSpeed: 6, holdAfter: 220 })
    }
    lines.push({ text: t('gameover.crt.settlement_posted'), cls: 'bright', charSpeed: 16, holdAfter: 300 })
    if (s.endlessJustUnlocked) {
      lines.push({ text: t('gameover.crt.endless_unlocked'), cls: 'total', charSpeed: 18, holdAfter: 500 })
    }
    lines.push({ text: '', charSpeed: 0, holdAfter: 100 })
    lines.push({ text: t('gameover.crt.awaiting_next'), cls: 'dim', charSpeed: 14, holdAfter: 100 })
  }

  // 离场验证失败章 · 仅 lore，无数值惩罚 ·
  // pass / no result → 不打章；fail → 加 divider + alert 行
  const departure = getLastDepartureResult()
  if (departure && !departure.pass && departure.failLore) {
    const zh = getLocale() !== 'en'
    lines.push({ text: '', charSpeed: 0, holdAfter: 120 })
    lines.push({ text: '─── DEPARTURE WINDOW ───', cls: 'divider', charSpeed: 6, holdAfter: 200 })
    lines.push({
      text: zh ? departure.failLore.zh : departure.failLore.en,
      cls: 'alert',
      charSpeed: 16,
      holdAfter: 400,
    })
  }

  return lines
}

async function runScript(stage: HTMLElement, screen: HTMLElement, lines: ScriptLine[]): Promise<void> {
  for (const item of lines) {
    const line = document.createElement('div')
    line.className = `ct-line ${item.cls || ''}`.trim()
    line.innerHTML = '<span class="typed"></span><span class="cursor"></span>'
    stage.appendChild(line)
    requestAnimationFrame(() => line.classList.add('shown'))

    await typeLine(screen, line, item.text, item.charSpeed ?? 12)

    if (isSkipped(screen)) continue
    const hold = item.holdAfter ?? 100
    if (hold > 0) await wait(hold)
  }
}

function typeLine(screen: HTMLElement, lineEl: HTMLElement, text: string, charSpeed: number): Promise<void> {
  return new Promise(resolve => {
    const typed = lineEl.querySelector('.typed') as HTMLElement | null
    if (!typed) { resolve(); return }
    if (!text || charSpeed === 0 || isSkipped(screen)) {
      typed.textContent = text
      lineEl.classList.add('done')
      requestAnimationFrame(() => scrollIfNeeded(screen, lineEl))
      resolve()
      return
    }
    let i = 0
    const tick = () => {
      if (isSkipped(screen)) {
        typed.textContent = text
        lineEl.classList.add('done')
        scrollIfNeeded(screen, lineEl)
        resolve()
        return
      }
      typed.textContent = text.slice(0, ++i)
      if (i >= text.length) {
        lineEl.classList.add('done')
        scrollIfNeeded(screen, lineEl)
        resolve()
      } else {
        setTimeout(tick, charSpeed)
      }
    }
    tick()
  })
}

function wait(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function isSkipped(screen: HTMLElement): boolean {
  return Boolean((screen as any)[SKIP_FLAG])
}

/** 只在新行真的超出 viewport 底部时才滚 · 保留 header / FILE 标题行可见 */
function scrollIfNeeded(screen: HTMLElement, lineEl: HTMLElement): void {
  const inner = screen.querySelector('.gameover-bezel-screen') as HTMLElement | null
  if (!inner) return
  const innerRect = inner.getBoundingClientRect()
  const lineRect = lineEl.getBoundingClientRect()
  // 行底超出 inner 视口底部 → 只滚刚好够看见这行的距离（不一次滚到底）
  const overflow = lineRect.bottom - innerRect.bottom
  if (overflow > 0) inner.scrollTop += overflow + 4
}
