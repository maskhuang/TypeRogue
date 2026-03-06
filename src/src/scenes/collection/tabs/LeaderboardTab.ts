// ============================================
// 打字肉鸽 - LeaderboardTab 组件
// ============================================
// Story 25.5: 排行榜标签页 (AC: 5, 6)

import { Container, Text, Graphics } from 'pixi.js'
import type { MetaState, LeaderboardEntry } from '../../../core/state/MetaState'

const COLORS = {
  bg1: 0x2a2a3e,
  bg2: 0x252538,
  highlight: 0x3a3a5e,
  text: 0xeaeaea,
  textDim: 0x888888,
  cyan: 0x4ecdc4,
  gold: 0xffe66d,
  red: 0xff6b6b,
}

const ROW_HEIGHT = 44
const CARD_WIDTH = 600
const DETAIL_HEIGHT = 120

/**
 * LeaderboardTab - 排行榜标签页
 *
 * 显示历史 Run 排名列表，支持选中展开 Build 摘要
 */
export class LeaderboardTab extends Container {
  private metaState: MetaState
  private listContainer: Container
  private detailContainer: Container | null = null
  private selectedIndex: number = -1
  private entries: LeaderboardEntry[] = []

  constructor(metaState: MetaState) {
    super()
    this.metaState = metaState
    this.listContainer = new Container()
    this.addChild(this.listContainer)
    this.render()
  }

  getEntries(): LeaderboardEntry[] {
    return this.entries
  }

  getSelectedIndex(): number {
    return this.selectedIndex
  }

  selectRow(index: number): void {
    if (index < 0 || index >= this.entries.length) return
    this.selectedIndex = index
    this.render()
  }

  private render(): void {
    this.listContainer.removeChildren()
    if (this.detailContainer) {
      this.removeChild(this.detailContainer)
      this.detailContainer = null
    }

    this.entries = this.metaState.getLeaderboard()

    if (this.entries.length === 0) {
      const emptyText = new Text({
        text: '暂无记录',
        style: { fontFamily: 'Arial', fontSize: 20, fill: COLORS.textDim },
      })
      emptyText.anchor.set(0.5, 0)
      emptyText.y = 40
      this.listContainer.addChild(emptyText)
      return
    }

    // Header
    const header = new Text({
      text: '排行榜',
      style: { fontFamily: 'Arial', fontSize: 24, fill: COLORS.text },
    })
    header.anchor.set(0.5, 0)
    this.listContainer.addChild(header)

    // Column headers
    const colHeader = this.createColumnHeaders()
    colHeader.y = 36
    this.listContainer.addChild(colHeader)

    // Rows
    const startY = 70
    this.entries.forEach((entry, idx) => {
      const row = this.createRow(entry, idx, idx === this.selectedIndex)
      row.y = startY + idx * ROW_HEIGHT
      this.listContainer.addChild(row)
    })

    // Detail panel for selected entry
    if (this.selectedIndex >= 0 && this.selectedIndex < this.entries.length) {
      this.detailContainer = this.createDetailPanel(this.entries[this.selectedIndex])
      this.detailContainer.y = startY + this.entries.length * ROW_HEIGHT + 10
      this.addChild(this.detailContainer)
    }
  }

  private createColumnHeaders(): Container {
    const c = new Container()
    const style = { fontFamily: 'Arial', fontSize: 13, fill: COLORS.textDim }
    const cols = [
      { text: '#', x: -CARD_WIDTH / 2 + 16 },
      { text: '周目', x: -CARD_WIDTH / 2 + 60 },
      { text: '分数', x: -CARD_WIDTH / 2 + 140 },
      { text: '结果', x: -CARD_WIDTH / 2 + 280 },
      { text: '日期', x: -CARD_WIDTH / 2 + 360 },
    ]
    for (const col of cols) {
      const t = new Text({ text: col.text, style })
      t.x = col.x
      t.anchor.set(0, 0.5)
      c.addChild(t)
    }
    return c
  }

  private createRow(entry: LeaderboardEntry, index: number, selected: boolean): Container {
    const c = new Container()

    // Background
    const bg = new Graphics()
    bg.roundRect(-CARD_WIDTH / 2, 0, CARD_WIDTH, ROW_HEIGHT - 4, 6)
    bg.fill(selected ? COLORS.highlight : (index % 2 === 0 ? COLORS.bg1 : COLORS.bg2))
    if (selected) {
      bg.stroke({ width: 1, color: COLORS.cyan })
    }
    c.addChild(bg)

    const midY = (ROW_HEIGHT - 4) / 2

    // Rank
    const rankText = new Text({
      text: `${index + 1}`,
      style: { fontFamily: 'Arial', fontSize: 16, fill: index < 3 ? COLORS.gold : COLORS.text, fontWeight: 'bold' },
    })
    rankText.x = -CARD_WIDTH / 2 + 16
    rankText.anchor.set(0, 0.5)
    rankText.y = midY
    c.addChild(rankText)

    // Cycle
    const cycleText = new Text({
      text: `${entry.cycle}`,
      style: { fontFamily: 'Arial', fontSize: 16, fill: COLORS.cyan, fontWeight: 'bold' },
    })
    cycleText.x = -CARD_WIDTH / 2 + 60
    cycleText.anchor.set(0, 0.5)
    cycleText.y = midY
    c.addChild(cycleText)

    // Score
    const scoreText = new Text({
      text: entry.score.toLocaleString(),
      style: { fontFamily: 'Arial', fontSize: 16, fill: COLORS.text },
    })
    scoreText.x = -CARD_WIDTH / 2 + 140
    scoreText.anchor.set(0, 0.5)
    scoreText.y = midY
    c.addChild(scoreText)

    // Result
    const isVictory = entry.result === 'victory'
    const resultText = new Text({
      text: isVictory ? '胜' : '败',
      style: { fontFamily: 'Arial', fontSize: 16, fill: isVictory ? COLORS.gold : COLORS.red, fontWeight: 'bold' },
    })
    resultText.x = -CARD_WIDTH / 2 + 280
    resultText.anchor.set(0, 0.5)
    resultText.y = midY
    c.addChild(resultText)

    // Date
    const dateStr = entry.date.slice(0, 10) // YYYY-MM-DD
    const dateText = new Text({
      text: dateStr,
      style: { fontFamily: 'Arial', fontSize: 14, fill: COLORS.textDim },
    })
    dateText.x = -CARD_WIDTH / 2 + 360
    dateText.anchor.set(0, 0.5)
    dateText.y = midY
    c.addChild(dateText)

    return c
  }

  private createDetailPanel(entry: LeaderboardEntry): Container {
    const c = new Container()
    const bs = entry.buildSummary

    // Background
    const bg = new Graphics()
    bg.roundRect(-CARD_WIDTH / 2, 0, CARD_WIDTH, DETAIL_HEIGHT, 8)
    bg.fill(0x1e1e30)
    bg.stroke({ width: 1, color: COLORS.cyan, alpha: 0.5 })
    c.addChild(bg)

    const headerStyle = { fontFamily: 'Arial', fontSize: 14, fill: COLORS.cyan }
    const bodyStyle = { fontFamily: 'Arial', fontSize: 13, fill: COLORS.text }

    // Skills
    const skillNames = bs.skills.map(s => `${s.id}(Lv${s.level})`).join(', ') || '无'
    const skillLabel = new Text({ text: '技能:', style: headerStyle })
    skillLabel.x = -CARD_WIDTH / 2 + 16
    skillLabel.y = 10
    c.addChild(skillLabel)
    const skillValue = new Text({ text: skillNames.slice(0, 80), style: bodyStyle })
    skillValue.x = -CARD_WIDTH / 2 + 60
    skillValue.y = 10
    c.addChild(skillValue)

    // Enchantments
    const enchNames = bs.enchantments.map(e => `${e.skillId}→${e.enchantmentId}`).join(', ') || '无'
    const enchLabel = new Text({ text: '附魔:', style: headerStyle })
    enchLabel.x = -CARD_WIDTH / 2 + 16
    enchLabel.y = 35
    c.addChild(enchLabel)
    const enchValue = new Text({ text: enchNames.slice(0, 80), style: bodyStyle })
    enchValue.x = -CARD_WIDTH / 2 + 60
    enchValue.y = 35
    c.addChild(enchValue)

    // Relics
    const relicNames = bs.relics.join(', ') || '无'
    const relicLabel = new Text({ text: '遗物:', style: headerStyle })
    relicLabel.x = -CARD_WIDTH / 2 + 16
    relicLabel.y = 60
    c.addChild(relicLabel)
    const relicValue = new Text({ text: relicNames.slice(0, 80), style: bodyStyle })
    relicValue.x = -CARD_WIDTH / 2 + 60
    relicValue.y = 60
    c.addChild(relicValue)

    // Active modifiers
    const modNames = bs.activeModifiers.join(', ') || '无'
    const modLabel = new Text({ text: '修饰:', style: headerStyle })
    modLabel.x = -CARD_WIDTH / 2 + 16
    modLabel.y = 85
    c.addChild(modLabel)
    const modValue = new Text({ text: modNames.slice(0, 80), style: bodyStyle })
    modValue.x = -CARD_WIDTH / 2 + 60
    modValue.y = 85
    c.addChild(modValue)

    return c
  }

  refresh(): void {
    this.render()
  }

  getContentHeight(): number {
    const rowCount = this.entries.length || 1
    const baseHeight = 70 + rowCount * ROW_HEIGHT
    return this.selectedIndex >= 0 ? baseHeight + DETAIL_HEIGHT + 10 : baseHeight
  }

  destroy(): void {
    this.detailContainer = null
    super.destroy({ children: true })
  }
}
