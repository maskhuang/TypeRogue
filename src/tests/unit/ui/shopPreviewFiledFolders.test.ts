// ============================================
// Story 60.20: 工作台 FILED folder 真实数据测试
// ============================================
// 验证 renderSkillFolderHtml / renderRelicFolderHtml / syncFiledFolders 渲染
// owned skills + relics 真实数据（替代 Phase 1 hardcoded DRIP CASCADE 等占位）。

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import type { AffixSkillInstance } from '../../../src/data/affixes'

vi.mock('../../../src/effects/sound', () => ({ playSound: vi.fn() }))

import {
  renderSkillFolderHtml,
  renderRelicFolderHtml,
} from '../../../src/ui/shop/shopWorkbench'

function makeSkill(id: string, name: string, level = 1, icon = '◇'): AffixSkillInstance {
  return {
    id,
    name,
    icon,
    resource: 'base',
    baseValues: [10, 20, 30],
    level,
    rarity: 0,
    affixes: [],
    enchantmentIds: [],
    shapeId: 'monomino',
    rotation: 0,
  }
}

beforeEach(() => {
  resetState()
})

describe('Story 60.20 · renderSkillFolderHtml', () => {
  it('AC3 空状态渲染 — NONE —', () => {
    const { count, rowsHtml } = renderSkillFolderHtml()
    expect(count).toBe(0)
    expect(rowsHtml).toContain('— NONE —')
    expect(rowsHtml).toContain('folder-empty')
  })

  it('AC1 只有 inbox 的 skills 渲染', () => {
    state.affixSkills.set('s1', makeSkill('s1', 'WAITING SKILL', 2, '⚡'))
    state.player.inbox.push('s1')
    const { count, rowsHtml } = renderSkillFolderHtml()
    expect(count).toBe(1)
    expect(rowsHtml).toContain('WAITING SKILL')
    expect(rowsHtml).toContain('Lv.2')
    expect(rowsHtml).toContain('⚡')
  })

  it('AC1 只有 bound 的 skills 渲染', () => {
    state.affixSkills.set('s2', makeSkill('s2', 'BOUND SKILL', 1, '🔥'))
    state.player.bindings.set('a', 's2')
    const { count, rowsHtml } = renderSkillFolderHtml()
    expect(count).toBe(1)
    expect(rowsHtml).toContain('BOUND SKILL')
  })

  it('AC1 多格 tetromino 在 bindings 中按 sid 去重（不重复出现）', () => {
    // 单技能 s3 占 4 个键 → bindings 4 条 entry，folder 应只渲一行
    state.affixSkills.set('s3', makeSkill('s3', 'TETRO SKILL', 1, '🔮'))
    state.player.bindings.set('a', 's3')
    state.player.bindings.set('b', 's3')
    state.player.bindings.set('c', 's3')
    state.player.bindings.set('d', 's3')
    const { count, rowsHtml } = renderSkillFolderHtml()
    expect(count).toBe(1)
    // name 只出现一次
    expect(rowsHtml.match(/TETRO SKILL/g)?.length).toBe(1)
  })

  it('AC1 bound + inbox 合并：bound 在前（按首键字母），inbox 在后（数组顺序）', () => {
    state.affixSkills.set('zKey', makeSkill('zKey', 'BOUND-Z', 1))
    state.affixSkills.set('aKey', makeSkill('aKey', 'BOUND-A', 1))
    state.affixSkills.set('inA', makeSkill('inA', 'INBOX-1', 1))
    state.affixSkills.set('inB', makeSkill('inB', 'INBOX-2', 1))
    state.player.bindings.set('z', 'zKey')
    state.player.bindings.set('a', 'aKey')
    state.player.inbox.push('inA', 'inB')
    const { count, rowsHtml } = renderSkillFolderHtml()
    expect(count).toBe(4)
    const aIdx = rowsHtml.indexOf('BOUND-A')
    const zIdx = rowsHtml.indexOf('BOUND-Z')
    const i1Idx = rowsHtml.indexOf('INBOX-1')
    const i2Idx = rowsHtml.indexOf('INBOX-2')
    expect(aIdx).toBeLessThan(zIdx)
    expect(zIdx).toBeLessThan(i1Idx)
    expect(i1Idx).toBeLessThan(i2Idx)
  })

  it('长名截断为 22 字符 + …', () => {
    const longName = 'A VERY LONG SKILL NAME THAT EXCEEDS LIMIT'
    state.affixSkills.set('s4', makeSkill('s4', longName, 1))
    state.player.inbox.push('s4')
    const { rowsHtml } = renderSkillFolderHtml()
    // 截断后含 …
    expect(rowsHtml).toContain('…')
    // 不应包含完整长名
    expect(rowsHtml).not.toContain(longName)
  })

  it('HTML escape — 名字含 < > & 不破坏 DOM', () => {
    // 名字会先 toUpperCase()，再 escapeHtml
    state.affixSkills.set('s5', makeSkill('s5', 'EVIL <script>', 1, '⚡'))
    state.player.inbox.push('s5')
    const { rowsHtml } = renderSkillFolderHtml()
    expect(rowsHtml).toContain('&lt;SCRIPT&gt;')
    expect(rowsHtml).not.toContain('<script>')
    expect(rowsHtml).not.toContain('<SCRIPT>')
  })
})

describe('Story 60.20 · renderRelicFolderHtml', () => {
  it('AC3 空状态渲染 — NONE —', () => {
    const { count, rowsHtml } = renderRelicFolderHtml()
    expect(count).toBe(0)
    expect(rowsHtml).toContain('— NONE —')
  })

  it('AC2 owned relics 渲染 RELICS[id] 的 icon + name', () => {
    state.player.relics.add('punctuation_liberation')
    const { count, rowsHtml } = renderRelicFolderHtml()
    expect(count).toBe(1)
    expect(rowsHtml).toContain('fr-name')
    expect(rowsHtml).toContain('fr-icon')
    // 不渲 placeholder 老数据
    expect(rowsHtml).not.toContain('FOSSILIZED MEMO')
    expect(rowsHtml).not.toContain('COLD COFFEE RING')
  })

  it('AC2 多个 relics 都渲染', () => {
    state.player.relics.add('punctuation_liberation')
    state.player.relics.add('apprentice_notes')
    const { count } = renderRelicFolderHtml()
    expect(count).toBe(2)
  })

  it('未知 relic id 静默跳过（防御性）', () => {
    state.player.relics.add('punctuation_liberation')
    state.player.relics.add('FAKE_RELIC_ID_XYZ' as never)
    const { count } = renderRelicFolderHtml()
    // 已知的 1 个进，未知的跳过
    expect(count).toBe(1)
  })
})
