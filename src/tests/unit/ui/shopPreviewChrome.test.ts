// ============================================
// Story 60.3: 终端 banner / 状态栏 label 生成测试
// ============================================
// 4 个纯函数 buildBannerLine / getFormLabel / getClrLabel / getStageIcon
// 不模拟 DOM，直接验证字符串输出。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  buildBannerLine,
  getFormLabel,
  getClrLabel,
  getStageIcon,
  updateTerminalChrome,
} from '../../../src/ui/shopPreview'
import { BALANCE } from '../../../src/core/constants'
import { state, resetState } from '../../../src/core/state'

vi.mock('../../../src/effects/sound', () => ({ playSound: vi.fn() }))

const CYCLE_LENGTH = BALANCE.CYCLE_LENGTH

describe('Story 60.3 · buildBannerLine', () => {
  it('cycle 1 不带前缀', () => {
    const line = buildBannerLine(5, 1, 0)
    expect(line).not.toContain('CYCLE')
    expect(line).not.toContain('批次')
    expect(line).not.toMatch(/BATCH \d+ ·/)
    expect(line).toContain('FILE')
    expect(line).toContain('A0')
  })

  it('cycle ≥ 2 带 cycle prefix（与 battle.ts 词典同源）', () => {
    const line = buildBannerLine(24, 2, 1)
    // cycle_prefix i18n value = 'BATCH {cycle} · ' (en) / '批次{cycle} · ' (zh)
    // 不论 locale 都应包含 cycle 数字 2
    expect(line).toMatch(/2[\s·]/)
    expect(line).toContain('FILE')
    expect(line).toContain('A1')
  })

  it('FILE 编号用 getBattleNumber（仪式节点跳过）', () => {
    // level 6 是 cycle 1 的仪式节点 → getBattleNumber(6) = 5
    const line = buildBannerLine(6, 1, 0)
    expect(line).toContain('FILE 5')
  })

  it('BATCH 显示位置 / cycleLength（零填充 2 位）', () => {
    const line = buildBannerLine(3, 1, 0)
    expect(line).toContain(`BATCH 03/${CYCLE_LENGTH}`)
  })

  it('BATCH 双位数也正确（cycle 第 12 关）', () => {
    const line = buildBannerLine(12, 1, 0)
    expect(line).toContain(`BATCH 12/${CYCLE_LENGTH}`)
  })

  it('Ascension 字段', () => {
    expect(buildBannerLine(1, 1, 0)).toContain('A0')
    expect(buildBannerLine(1, 1, 5)).toContain('A5')
    expect(buildBannerLine(1, 1, 10)).toContain('A10')
  })

  it('CLERK ID 永远固定 7842（DPCA 叙事常量）', () => {
    expect(buildBannerLine(1, 1, 0)).toContain('CLERK ID: 7842')
    expect(buildBannerLine(48, 4, 7)).toContain('CLERK ID: 7842')
  })

  it('level <= 0 兜底为 1（dev 测试时未初始化）', () => {
    const line = buildBannerLine(0, 1, 0)
    expect(line).toContain('FILE 1')
    expect(line).toContain('BATCH 01/')
  })

  it('行宽固定（不超出 banner 框，截断或填充）', () => {
    // BANNER_INNER_WIDTH = 73 (private) — 验证返回字符串始终不超过 / 等于此宽度
    // 长场景：cycle 99 + ascension 10 + level 9999
    const longLine = buildBannerLine(9999, 99, 10)
    expect(longLine.length).toBeLessThanOrEqual(73)
    // 短场景：填充到固定宽度
    const shortLine = buildBannerLine(1, 1, 0)
    expect(shortLine.length).toBe(73)
  })
})

describe('Story 60.3 · getFormLabel', () => {
  it('F-${level} 跟着 state.level 变', () => {
    expect(getFormLabel(1)).toBe('F-1')
    expect(getFormLabel(7)).toBe('F-7')
    expect(getFormLabel(24)).toBe('F-24')
    expect(getFormLabel(120)).toBe('F-120')
  })

  it('level <= 0 兜底为 1', () => {
    expect(getFormLabel(0)).toBe('F-1')
    expect(getFormLabel(-5)).toBe('F-1')
  })
})

describe('Story 60.3 · getClrLabel (按 stageType 映射密级)', () => {
  it('standard → 4-B', () => {
    // level 1, 2, 3, 4 都是 standard（cycle 内位置 1-4）
    expect(getClrLabel(1)).toBe('4-B')
    expect(getClrLabel(2)).toBe('4-B')
    expect(getClrLabel(4)).toBe('4-B')
  })

  it('elite → 4-A (cycle 内位置 5)', () => {
    expect(getClrLabel(5)).toBe('4-A')
    expect(getClrLabel(17)).toBe('4-A') // cycle 2 第 5 关
  })

  it('ritual → III (cycle 内位置 6)', () => {
    expect(getClrLabel(6)).toBe('III')
    expect(getClrLabel(18)).toBe('III') // cycle 2 第 6 关
  })

  it('boss → III (cycle 内位置 12)', () => {
    expect(getClrLabel(12)).toBe('III')
    expect(getClrLabel(24)).toBe('III') // cycle 2 boss
    expect(getClrLabel(36)).toBe('III') // cycle 3 boss
  })
})

describe('Story 60.3 · getStageIcon (从 STAGE_ICONS 单一真相源读)', () => {
  it('standard → 📋', () => {
    expect(getStageIcon(1)).toBe('📋')
    expect(getStageIcon(7)).toBe('📋')
  })

  it('elite → 📑', () => {
    expect(getStageIcon(5)).toBe('📑')
    expect(getStageIcon(17)).toBe('📑')
  })

  it('ritual → 🕯️', () => {
    expect(getStageIcon(6)).toBe('🕯️')
    expect(getStageIcon(18)).toBe('🕯️')
  })

  it('boss → 🚩', () => {
    expect(getStageIcon(12)).toBe('🚩')
    expect(getStageIcon(24)).toBe('🚩')
    expect(getStageIcon(36)).toBe('🚩')
  })
})

describe('Story 60.3 · updateTerminalChrome (集成 smoke test, M2 fix)', () => {
  type Spy = { textContent: string }
  let bannerEl: Spy, balEl: Spy, formEm: Spy, clrEm: Spy, stageEm: Spy
  let rootStub: { querySelector: (sel: string) => Spy | null }

  beforeEach(() => {
    resetState()
    bannerEl = { textContent: '' }
    balEl = { textContent: '', /* updateBalDisplay 用 innerHTML，需要 stub */ } as Spy
    ;(balEl as unknown as { innerHTML: string }).innerHTML = ''
    formEm = { textContent: '' }
    clrEm = { textContent: '' }
    stageEm = { textContent: '' }

    rootStub = {
      querySelector(sel: string): Spy | null {
        if (sel === '#terminal-banner-pre') return bannerEl
        if (sel === '[data-field="form"] em') return formEm
        if (sel === '[data-field="clr"] em') return clrEm
        if (sel === '[data-field="stage"] em') return stageEm
        return null
      },
    }

    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'terminal-shop-screen' ? rootStub : null),
      querySelector: (sel: string) => {
        // updateBalDisplay 用 document.querySelector('#terminal-shop-screen .ts-cell .bal')
        if (sel === '#terminal-shop-screen .ts-cell .bal') return balEl
        return null
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('写入 banner + FORM + CLR + STAGE 的 textContent', () => {
    state.level = 5
    state.cycle = 1
    state.ascensionLevel = 0

    updateTerminalChrome()

    expect(bannerEl.textContent).toContain('FILE')
    expect(bannerEl.textContent).toContain('A0')
    expect(formEm.textContent).toBe('F-5')
    expect(clrEm.textContent).toBe('4-A') // level 5 = elite
    expect(stageEm.textContent).toBe('📑')
  })

  it('cycle 2 boss 关：所有字段联动', () => {
    state.level = 24
    state.cycle = 2
    state.ascensionLevel = 1

    updateTerminalChrome()

    expect(bannerEl.textContent).toContain('FILE 22')
    expect(bannerEl.textContent).toContain(`BATCH 12/${BALANCE.CYCLE_LENGTH}`)
    expect(bannerEl.textContent).toContain('A1')
    expect(formEm.textContent).toBe('F-24')
    expect(clrEm.textContent).toBe('III')
    expect(stageEm.textContent).toBe('🚩')
  })

  it('root null 时 no-op（terminal 未 inject）', () => {
    vi.stubGlobal('document', { getElementById: () => null, querySelector: () => null })
    expect(() => updateTerminalChrome()).not.toThrow()
  })
})

describe('Story 60.3 · AC8 端到端 cycle 2 boss 关回归用例', () => {
  it('level=24, cycle=2, ascension=1 → banner 全字段正确', () => {
    const line = buildBannerLine(24, 2, 1)
    // getBattleNumber(24) = 22（cycle 1 全 11 战 + cycle 2 boss 是第 11 场战斗 = 22）
    // 仪式节点（位置 6）不计入战斗，每周期 11 战
    expect(line).toContain('FILE 22')
    expect(line).toContain(`BATCH 12/${CYCLE_LENGTH}`)
    expect(line).toContain('A1')
    expect(line).toMatch(/2[\s·]/) // cycle 数字
  })

  it('level=24 → STAGE 🚩 + CLR III + FORM F-24', () => {
    expect(getStageIcon(24)).toBe('🚩')
    expect(getClrLabel(24)).toBe('III')
    expect(getFormLabel(24)).toBe('F-24')
  })
})
