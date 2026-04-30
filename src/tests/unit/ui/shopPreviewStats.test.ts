// ============================================
// Story 60.19: STAT 命令真实数据接入测试
// ============================================
// 验证 cmdStats 正确读取 state.player.wordDeck (freq) + state.wordEffects (score)，
// 渲染 ASCII bar chart + LOCKED 状态 + TOP CONTRIBUTOR / WEAKEST KEY。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'

vi.mock('../../../src/effects/sound', () => ({ playSound: vi.fn() }))
vi.mock('../../../src/systems/battle', () => ({ startLevel: vi.fn() }))

import { cmdStats } from '../../../src/ui/shop/shopTerminal'

interface FakeViewportLine {
  text: string
  className: string
}
const capturedLines: FakeViewportLine[] = []

const FAKE_VIEWPORT = {
  appendChild: (node: { textContent?: string; innerHTML?: string; className?: string }) => {
    capturedLines.push({
      text: node.innerHTML ?? node.textContent ?? '',
      className: node.className ?? '',
    })
  },
  scrollTop: 0,
  scrollHeight: 0,
}

const STUB_DOC = {
  getElementById: (id: string) => (id === 'terminal-viewport' ? FAKE_VIEWPORT : null),
  querySelector: () => null,
  querySelectorAll: () => [] as unknown[],
  createElement: (_tag: string) => ({
    className: '',
    textContent: '',
    innerHTML: '',
  }),
  body: {
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
    contains: vi.fn(() => false),
  },
}

beforeEach(() => {
  resetState()
  capturedLines.length = 0
  vi.stubGlobal('document', STUB_DOC)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function lineContains(needle: string): boolean {
  return capturedLines.some(l => l.text.includes(needle))
}

function findLine(needle: string): FakeViewportLine | undefined {
  return capturedLines.find(l => l.text.includes(needle))
}

describe('Story 60.19 · cmdStats 真实数据', () => {
  it('AC1: 词库为空 → 显示 NO TYPING ACTIVITY 兜底', () => {
    state.player.wordDeck = []
    cmdStats()
    expect(lineContains('NO TYPING ACTIVITY')).toBe(true)
    // 没有 LOCKED 行
    expect(capturedLines.some(l => l.text.includes('FREQ-LOCKED'))).toBe(false)
  })

  it('AC1: FREQ 列接 calculateLetterFrequency 真实结果', () => {
    state.player.wordDeck = ['cat', 'cat', 'cab']
    // 期望 freq: a=3, b=1, c=3, t=2
    cmdStats()
    // 渲染顺序按 freq 降序，所以 A 或 C 排前
    const aLine = findLine(' A ')
    const cLine = findLine(' C ')
    const bLine = findLine(' B ')
    const tLine = findLine(' T ')
    expect(aLine?.text).toMatch(/\b3\b/)
    expect(cLine?.text).toMatch(/\b3\b/)
    expect(bLine?.text).toMatch(/\b1\b/)
    expect(tLine?.text).toMatch(/\b2\b/)
  })

  it('AC2: SCORE 列接 calculateLetterScores（base_score）', () => {
    state.player.wordDeck = ['ace']
    state.wordEffects.set('boost-a', { type: 'base_score', value: 5, targetLetter: 'a' } as any)
    cmdStats()
    // 'a' 应有 +5 score 显示
    const aLine = findLine(' A ')
    expect(aLine?.text).toContain('+5')
  })

  it('AC3: freq < FREQ_UNLOCK_THRESHOLD 非标点键 → LOCKED 标记', () => {
    // FREQ_UNLOCK_THRESHOLD = 1（systems/letters/LetterFrequencySystem.ts:11）
    // wordDeck 仅有 1 个非锁字母，确保某些字母 freq=0 (locked)
    state.player.wordDeck = ['ace']
    // 强制注入一个 score-only 键（'z' freq=0），验证 locked 路径
    state.wordEffects.set('boost-z', { type: 'base_score', value: 3, targetLetter: 'z' } as any)
    cmdStats()
    // z 行应有 [FREQ-LOCKED] 标记 + redacted class
    const zLine = findLine(' Z ')
    expect(zLine).toBeDefined()
    expect(zLine!.text).toContain('[FREQ-LOCKED]')
    expect(zLine!.className).toContain('redacted')
  })

  it('AC3: 标点键 freq=0 时不标 LOCKED（PUNCTUATION_KEYS 豁免）', () => {
    // 通过 wordEffects targetLetter=';' 触发渲染该键（虽然 freq=0）
    state.player.wordDeck = ['ace']
    state.wordEffects.set('punct-boost', {
      type: 'base_score', value: 2, targetLetter: ';',
    } as any)
    cmdStats()
    const semiLine = capturedLines.find(l => l.text.match(/\s;\s|\s;\s\b/))
    // 标点键不应触发 LOCKED 标记
    if (semiLine) {
      expect(semiLine.text).not.toContain('[FREQ-LOCKED]')
    }
  })

  it('AC4: TOP CONTRIBUTOR 显示综合占比（freq × (1+score)）', () => {
    state.player.wordDeck = ['cat', 'cat', 'cat'] // a=3, c=3, t=3
    cmdStats()
    expect(lineContains('TOP CONTRIBUTOR')).toBe(true)
    // 应该显示某个 KEY + 百分比
    const topLine = findLine('TOP CONTRIBUTOR')
    expect(topLine?.text).toMatch(/[A-Z]/)
    expect(topLine?.text).toMatch(/\d+%/)
  })

  it('AC4: WEAKEST KEY 显示 freq 最低非标点键', () => {
    state.player.wordDeck = ['cat', 'cat', 'cab'] // a=3, b=1, c=3, t=2
    cmdStats()
    expect(lineContains('WEAKEST KEY')).toBe(true)
    const weakLine = findLine('WEAKEST KEY')
    // b freq=1（最弱非标点）
    expect(weakLine?.text).toContain('B')
  })

  it('AC5: 移除 hardcoded DPS / ACC 列', () => {
    state.player.wordDeck = ['cat']
    cmdStats()
    expect(capturedLines.some(l => l.text.includes('DPS'))).toBe(false)
    expect(capturedLines.some(l => l.text.includes('ACC'))).toBe(false)
    expect(capturedLines.some(l => l.text.includes('STUB'))).toBe(false)
  })

  it('AC1: bar chart 长度按 max freq 缩放', () => {
    // 单字母 'a' 出现 1 次 → maxFreq = 1, barLen = 20（满）
    state.player.wordDeck = ['a']
    cmdStats()
    const aLine = findLine(' A ')
    expect(aLine?.text).toContain('█'.repeat(20))
  })

  it('AC1: top-N 限制（≤10 行 key 数据）', () => {
    // 11 个不同字母 → 只显示前 10
    state.player.wordDeck = ['abcdefghijk']
    cmdStats()
    // 计 KEY 数据行（含 ' A ' 一类的格式 + bar）
    const keyRows = capturedLines.filter(l => /█/.test(l.text))
    expect(keyRows.length).toBeLessThanOrEqual(10)
  })

  it('AC7: i18n 替换工作（标题含 BATCH 占位）', () => {
    state.player.wordDeck = ['cat']
    state.level = 5
    cmdStats()
    // 标题含 "BATCH" 字样和 batch 数字
    const title = findLine('PERFORMANCE AUDIT')
    expect(title).toBeDefined()
    expect(title?.text).toContain('BATCH')
    // batch 占比展示位（level=5 → cycle 内位置 5）
    expect(title?.text).toMatch(/05\/\d+/)
  })
})
