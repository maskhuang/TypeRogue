// ============================================
// Story 60.10: 终端 INF 命令扩展（owned skills/relics）测试
// ============================================
// 验证 cmdInfo dispatcher 6 条匹配路径：
//   - catalog SKU（行为不退化）
//   - 单键位（a-z 或 1-0）
//   - owned skill 模糊名（单/多命中）
//   - owned relic id/name
//   - /OWNED 列表
//   - 全 miss → suggestSku fallback

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'

// 不需要 mock 内部函数 — INF 是纯只读 dispatcher，只需捕获 appendLine
// 通过 stub document.getElementById 返回 fake terminal-viewport 拿到所有 appendLine 输出

vi.mock('../../../src/effects/sound', () => ({ playSound: vi.fn() }))
vi.mock('../../../src/systems/battle', () => ({ startLevel: vi.fn() }))

import { __test } from '../../../src/ui/shopPreview'
import { RELICS } from '../../../src/data/relics'

interface FakeViewportLine {
  text: string
  className: string
}
const capturedLines: FakeViewportLine[] = []

const FAKE_VIEWPORT = {
  appendChild: (node: { textContent?: string; innerHTML?: string; className?: string }) => {
    // appendLine 创建 div 后 .innerHTML = escaped 文本（或 raw HTML）
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

function makeMockSkill(id: string, name: string, level = 1, shapeId = 'monomino'): void {
  state.affixSkills.set(id, {
    id, name, icon: 'X', resource: 'base', rarity: 0, level,
    affixes: [], shapeId, rotation: 0, baseValues: [10, 20, 30],
    enchantmentIds: [], purchasePrice: 0,
  } as any)
  state.affixSkillStates.set(id, { id, exhaustCount: 0 } as any)
  state.player.skills.set(id, { level })
}

describe('Story 60.10 · INF dispatcher 路径', () => {
  it('AC1 catalog SKU 命中 → 渲染 catalog（不退化）', () => {
    // M2 review fix: 用 setDescriptorCache 注入 fake catalog 验证命中路径
    const fakeDescriptor = {
      sku: 'SKL-001',
      kind: 'skill',
      name: 'TEST CATALOG SKILL',
      nameAbbrev: 'TST',
      iconEmoji: 'X',
      rarity: 0,
      rarityLabel: 'COMMON',
      shapeTag: '[1·]',
      shapeColor: 'green',
      triggerHint: '—',
      desc: 'test desc',
      effect: 'test effect',
      affixLine: '—',
      price: 30,
      stockNow: 1,
      stockMax: 1,
      clearance: '4-B',
      redacted: false,
      upgrade: false,
      synergyCount: 0,
      originalItem: { id: 'sk_test', type: 'skill', skillId: 'sk_test', cost: 30, affixSkill: null },
    } as any
    __test.setDescriptorCache([fakeDescriptor])
    __test.cmdInfo('SKL-001')
    // catalog renderInfoBlock 输出含 catalog 名 + KIND SKILL · CLR · PRICE 等关键标识
    expect(lineContains('TEST CATALOG SKILL')).toBe(true)
    expect(lineContains('KIND SKILL')).toBe(true)
    expect(lineContains('PRICE')).toBe(true)
    // 不应触发 owned 路径（catalog 命中应短路）
    expect(lineContains('OWNED ·')).toBe(false)
  })

  it('AC1 catalog SKU 未命中 → suggestSku fallback', () => {
    __test.setDescriptorCache([])
    __test.cmdInfo('SKL-9999')
    expect(lineContains('NOT FOUND')).toBe(true)
  })

  it('AC2a 单字母键位（已绑）→ owned skill 渲染', () => {
    makeMockSkill('sk_a', 'MORALE AURA')
    state.player.bindings.set('f', 'sk_a')
    __test.cmdInfo('F')
    expect(lineContains('OWNED')).toBe(true)
    expect(lineContains('MORALE AURA')).toBe(true)
    expect(lineContains('KEY F')).toBe(true)
  })

  it('AC2a 单字母键位（未绑）→ UNBOUND 提示', () => {
    state.gold = 100
    __test.cmdInfo('F')
    expect(lineContains('KEY F · UNBOUND')).toBe(true)
    // appendLine 把 💰 包成 <span class="bna">💰</span>，故只验证 100 出现
    expect(lineContains('100')).toBe(true)
  })

  it('AC2b 数字键位（已挂遗物）→ owned relic 渲染', () => {
    const realRelicId = Object.keys(RELICS)[0]
    state.player.relics.add(realRelicId)
    __test.cmdInfo('1')
    expect(lineContains('OWNED · RELIC')).toBe(true)
    expect(lineContains(RELICS[realRelicId].name)).toBe(true)
    expect(lineContains('KEY 1')).toBe(true)
  })

  it('AC2b 数字键位（无遗物）→ NO RELIC 提示', () => {
    state.gold = 50
    __test.cmdInfo('3')
    expect(lineContains('KEY 3 · NO RELIC')).toBe(true)
  })

  it('AC2b 数字键 0 → relic index 9（与 syncWorkbenchRelics 对齐）', () => {
    const realRelicId = Object.keys(RELICS)[0]
    // 填 10 个 relic（前 9 个用 dummy id 占位，第 10 个是真 relic）
    for (let i = 0; i < 9; i++) state.player.relics.add(`dummy_${i}`)
    state.player.relics.add(realRelicId)
    __test.cmdInfo('0')
    expect(lineContains('KEY 0')).toBe(true)
    expect(lineContains(RELICS[realRelicId].name)).toBe(true)
  })

  it('AC3 模糊名单命中 → owned skill 渲染', () => {
    makeMockSkill('sk_b', 'MORALE AURA')
    state.player.bindings.set('a', 'sk_b')
    __test.cmdInfo('moral')
    expect(lineContains('OWNED')).toBe(true)
    expect(lineContains('MORALE AURA')).toBe(true)
  })

  it('AC3 模糊名多命中 → 候选列表 + REFINE 提示', () => {
    makeMockSkill('sk_c1', 'FIRE BLAST')
    makeMockSkill('sk_c2', 'FIRE STORM')
    state.player.bindings.set('a', 'sk_c1')
    state.player.bindings.set('b', 'sk_c2')
    __test.cmdInfo('FIRE')
    expect(lineContains('MULTIPLE MATCHES')).toBe(true)
    expect(lineContains('FIRE BLAST')).toBe(true)
    expect(lineContains('FIRE STORM')).toBe(true)
    expect(lineContains('REFINE QUERY')).toBe(true)
  })

  it('AC3 模糊名 inbox 也参与匹配（不只是 bound）', () => {
    makeMockSkill('sk_inbox', 'INBOX SKILL')
    state.player.inbox.push('sk_inbox')
    __test.cmdInfo('INBOX')
    expect(lineContains('OWNED')).toBe(true)
    expect(lineContains('IN-TRAY SLOT 1')).toBe(true)
  })

  it('AC4 owned relic id/name 模糊匹配', () => {
    const realRelicId = Object.keys(RELICS)[0]
    state.player.relics.add(realRelicId)
    // 用 relic 名字一部分查询
    const query = (RELICS[realRelicId].name || '').slice(0, 4).toUpperCase()
    if (query.length >= 2) {
      __test.cmdInfo(query)
      expect(lineContains('OWNED · RELIC')).toBe(true)
    }
  })

  it('AC5 全 miss → suggestSku fallback', () => {
    __test.cmdInfo('NONEXISTENT-XYZ')
    expect(lineContains('NOT FOUND')).toBe(true)
    expect(lineContains('TRY')).toBe(true) // 提示 INF /OWNED
  })

  it('AC6 /OWNED 列表 — 空时打印 EMPTY', async () => {
    // Story 60.15: 切 en locale 验证英文 UI 字符串（默认 zh 已 i18n 化）
    const { setLocale } = await import('../../../src/demo/demo-i18n')
    setLocale('en')
    __test.cmdInfo('/OWNED')
    expect(lineContains('OWNED ASSETS')).toBe(true)
    expect(lineContains('SKILLS')).toBe(true)
    expect(lineContains('RELICS')).toBe(true)
    // bindings + inbox 空
    const skillsHeaderIdx = capturedLines.findIndex(l => l.text.includes('SKILLS'))
    const relicsHeaderIdx = capturedLines.findIndex(l => l.text.includes('RELICS'))
    // SKILLS 段下应有 EMPTY
    expect(capturedLines.slice(skillsHeaderIdx, relicsHeaderIdx).some(l => l.text.includes('EMPTY'))).toBe(true)
    // RELICS 段下也应 EMPTY
    expect(capturedLines.slice(relicsHeaderIdx).some(l => l.text.includes('EMPTY'))).toBe(true)
    setLocale('zh')
  })

  it('AC6 /OWNED 列表 — 含 bound skills + inbox + relics', () => {
    makeMockSkill('sk_bound', 'BOUND SKILL')
    state.player.bindings.set('f', 'sk_bound')
    makeMockSkill('sk_inbox2', 'INBOX SKILL')
    state.player.inbox.push('sk_inbox2')
    const realRelicId = Object.keys(RELICS)[0]
    state.player.relics.add(realRelicId)

    __test.cmdInfo('/LIST-OWNED')
    expect(lineContains('BOUND SKILL')).toBe(true)
    expect(lineContains('INBOX SKILL')).toBe(true)
    expect(lineContains(RELICS[realRelicId].name)).toBe(true)
  })

  it('M1 review · /OWNED 多格技能去重 — bound 到多键的同一 sid 只列一行', () => {
    // 一个 tetromino_T 绑到 ASDF 4 键 — bindings Map 有 4 条 entry 同 sid
    makeMockSkill('sk_tet', 'TETROMINO SKILL', 1, 'tetromino_T')
    state.player.bindings.set('a', 'sk_tet')
    state.player.bindings.set('s', 'sk_tet')
    state.player.bindings.set('d', 'sk_tet')
    state.player.bindings.set('f', 'sk_tet')

    __test.cmdInfo('/OWNED')
    // 同一 skill 名应该只在 owned 列表里出现 1 次
    const skillNameOccurrences = capturedLines.filter(l => l.text.includes('TETROMINO SKILL')).length
    expect(skillNameOccurrences).toBe(1)
    // 4 个键应合并显示
    expect(lineContains('A+D+F+S')).toBe(true)
  })

  it('AC9 HEL 输出 INF 扩展用法说明（间接通过未知 INF arg 验证 dispatcher）', async () => {
    // Story 60.15: 切 en locale 验证英文 USAGE 字符串（默认 zh 已 i18n 化为中文）
    const { setLocale } = await import('../../../src/demo/demo-i18n')
    setLocale('en')
    __test.cmdInfo('') // empty arg
    expect(lineContains('USAGE')).toBe(true)
    expect(lineContains('SKU')).toBe(true)
    expect(lineContains('KEY')).toBe(true)
    expect(lineContains('NAME')).toBe(true)
    expect(lineContains('/owned')).toBe(true)
    setLocale('zh')
  })
})
