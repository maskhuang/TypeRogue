// ============================================
// 打字肉鸽 - KeyTooltip 单元测试
// ============================================
// Story 16.4: 键位悬停提示

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock DOM elements
function createMockElement(): HTMLElement {
  const style: Record<string, string> = {}
  const element: Partial<HTMLElement> & { _innerHTML: string; _className: string; _children: unknown[] } = {
    _innerHTML: '',
    _className: '',
    _children: [],
    style: new Proxy(style, {
      get: (target, prop) => target[prop as string] ?? '',
      set: (target, prop, value) => { target[prop as string] = value; return true },
    }) as unknown as CSSStyleDeclaration,
    get innerHTML() { return this._innerHTML },
    set innerHTML(val) { this._innerHTML = val },
    get className() { return this._className },
    set className(val) { this._className = val },
    get textContent() { return this._innerHTML.replace(/<[^>]*>/g, '') },
    get parentElement() { return null },
  }
  return element as unknown as HTMLElement
}

const mockTooltipEl = createMockElement()

// Mock document & window
const origDocument = globalThis.document
const origWindow = globalThis.window

beforeEach(() => {
  mockTooltipEl._innerHTML = ''
  mockTooltipEl._className = ''
  ;(mockTooltipEl.style as Record<string, string>).display = 'none'

  const mockDoc = {
    createElement: vi.fn(() => mockTooltipEl),
    body: {
      appendChild: vi.fn(),
      contains: vi.fn(() => true),
    },
    querySelector: vi.fn(() => mockTooltipEl),
  }

  globalThis.document = mockDoc as unknown as Document
  globalThis.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    requestAnimationFrame: vi.fn((cb: () => void) => { cb(); return 0 }),
  } as unknown as typeof window
})

afterEach(() => {
  globalThis.document = origDocument
  globalThis.window = origWindow
  // Reset module cache to get fresh singleton
  vi.resetModules()
})

describe('KeyTooltip', () => {
  it('show 后 isVisible 返回 true', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
    })
    expect(keyTooltip.isVisible()).toBe(true)
  })

  it('hide 后 isVisible 返回 false', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
    })
    keyTooltip.hide()
    expect(keyTooltip.isVisible()).toBe(false)
  })

  it('未显示时调用 hide 不报错', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    expect(() => keyTooltip.hide()).not.toThrow()
  })

  it('show 设置 tooltip 内容', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
    })
    expect(mockTooltipEl._innerHTML).toContain('E')
    expect(mockTooltipEl._innerHTML).toContain('+2')
    expect(mockTooltipEl._innerHTML).toContain('10')
  })

  it('底分为 0 时显示底分不足', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'x',
      score: 0,
      frequency: 3,
    })
    expect(mockTooltipEl._innerHTML).toContain('no base score')
  })

  it('show 包含技能信息', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '爆发',
        icon: '💥',
        description: '造成大量伤害',
        level: 3,
        school: '爆发',
        schoolCssClass: 'school-burst',
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('爆发')
    expect(mockTooltipEl._innerHTML).toContain('Lv.3')
    expect(mockTooltipEl._innerHTML).toContain('造成大量伤害')
    // schoolCssClass is no longer rendered in tooltip HTML — verify skill content instead
    expect(mockTooltipEl._innerHTML).toContain('💥')
  })

  it('多次销毁不报错', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    expect(() => {
      keyTooltip.destroy()
      keyTooltip.destroy()
    }).not.toThrow()
  })

  it('未创建时 isVisible 返回 false', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    expect(keyTooltip.isVisible()).toBe(false)
  })

  it('销毁后 isVisible 返回 false', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, { letter: 'a', score: 1, frequency: 5 })
    keyTooltip.destroy()
    expect(keyTooltip.isVisible()).toBe(false)
  })

  it('HTML 特殊字符被转义', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: '<script>',
      score: 1,
      frequency: 5,
      skill: {
        name: '<b>XSS</b>',
        icon: '💥',
        description: '"><img onerror=alert(1)>',
        level: 1,
        school: 'test',
        schoolCssClass: 'school-burst',
      },
    })
    expect(mockTooltipEl._innerHTML).not.toContain('<script>')
    expect(mockTooltipEl._innerHTML).not.toContain('<b>XSS</b>')
    expect(mockTooltipEl._innerHTML).toContain('&lt;SCRIPT&gt;')
    expect(mockTooltipEl._innerHTML).toContain('&lt;b&gt;XSS&lt;/b&gt;')
  })

  // Story 39.2: Tooltip 区块重构测试

  it('有技能时渲染 tooltip-section 区块', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '爆发',
        icon: '💥',
        description: '产出 base 资源',
        level: 2,
        school: '爆发',
        schoolCssClass: 'school-burst',
        affixInfo: [
          { typeName: '强化', typeKey: 'multiply', paramSummary: '×1.65', description: '技能产出直接乘以倍率' },
        ],
      },
    })
    // 标题区
    expect(mockTooltipEl._innerHTML).toContain('tooltip-header')
    expect(mockTooltipEl._innerHTML).toContain('tooltip-title')
    expect(mockTooltipEl._innerHTML).toContain('Lv.2')
    // 词条区
    expect(mockTooltipEl._innerHTML).toContain('tooltip-affix-list')
    expect(mockTooltipEl._innerHTML).toContain('tooltip-affix-name')
    expect(mockTooltipEl._innerHTML).toContain('×1.65')
    expect(mockTooltipEl._innerHTML).toContain('tooltip-affix-desc')
  })

  it('空键位无技能时不渲染 tooltip-section', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'x',
      score: 0,
      frequency: 3,
    })
    expect(mockTooltipEl._innerHTML).not.toContain('tooltip-section')
    expect(mockTooltipEl._innerHTML).not.toContain('tooltip-header')
    expect(mockTooltipEl._innerHTML).not.toContain('tooltip-affix-list')
  })

  it('无词条时不渲染词条区', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '基础',
        icon: '⚡',
        description: '基础技能',
        level: 1,
        school: 'burst',
        schoolCssClass: 'school-burst',
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('tooltip-header')
    expect(mockTooltipEl._innerHTML).not.toContain('tooltip-affix-list')
  })

  it('附魔区仅在有附魔时渲染', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '爆发',
        icon: '💥',
        description: '产出 base',
        level: 3,
        school: 'burst',
        schoolCssClass: 'school-burst',
        enchantments: [
          { icon: '📖', name: '学徒', desc: '+1%/触发', color: '#2ecc71' },
        ],
        apprenticeGrowth: '累计 12%',
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('tooltip-enchant-list')
    expect(mockTooltipEl._innerHTML).toContain('tooltip-ench-name')
    expect(mockTooltipEl._innerHTML).toContain('学徒')
    expect(mockTooltipEl._innerHTML).toContain('tooltip-apprentice')
    expect(mockTooltipEl._innerHTML).toContain('累计 12%')
  })

  it('摘要区使用 inline 布局和 | 分隔符', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '爆发',
        icon: '💥',
        description: '产出 base',
        level: 2,
        school: 'burst',
        schoolCssClass: 'school-burst',
        smartEstimate: {
          estimatedOutput: 24.5,
          breakdown: [
            { typeKey: 'multiply', label: '强化 ×1.65', detail: '' },
            { typeKey: 'void', label: '虚无 +30%', detail: '' },
          ],
        },
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('tooltip-summary')
    expect(mockTooltipEl._innerHTML).toContain('tooltip-est-value')
    expect(mockTooltipEl._innerHTML).toContain('tooltip-est-details')
    expect(mockTooltipEl._innerHTML).toContain('tooltip-est-sep')
    expect(mockTooltipEl._innerHTML).toContain('tooltip-est-item')
  })

  it('upgradeInfo 模式渲染升级信息而非等级', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '爆发',
        icon: '💥',
        description: '产出 base',
        level: 2,
        school: 'burst',
        schoolCssClass: 'school-burst',
        upgradeInfo: 'Lv.2 → Lv.3',
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('tooltip-upgrade-info')
    expect(mockTooltipEl._innerHTML).toContain('Lv.2 → Lv.3')
    expect(mockTooltipEl._innerHTML).not.toContain('Lv.2</div>')
  })

  it('无 smartEstimate 时不渲染摘要区', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '爆发',
        icon: '💥',
        description: '产出 base',
        level: 1,
        school: 'burst',
        schoolCssClass: 'school-burst',
      },
    })
    expect(mockTooltipEl._innerHTML).not.toContain('tooltip-summary')
  })

  // Code review fixes: 分支覆盖补充

  it('标题区渲染学派色标签', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '爆发',
        icon: '💥',
        description: '产出 base',
        level: 2,
        school: '爆发',
        schoolCssClass: 'school-burst',
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('tooltip-skill-school')
    expect(mockTooltipEl._innerHTML).toContain('school-burst')
    expect(mockTooltipEl._innerHTML).toContain('爆发')
  })

  it('baseValuesText 存在时渲染基础值行', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '基础',
        icon: '⚡',
        description: '描述',
        level: 1,
        school: 'burst',
        schoolCssClass: 'school-burst',
        baseValuesText: 'base: 10 | crit: 5',
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('tooltip-base-values')
    expect(mockTooltipEl._innerHTML).toContain('base: 10 | crit: 5')
  })

  it('amplifierStacks 和 affectedSkills 渲染增幅者信息', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '增幅',
        icon: '🔺',
        description: '增幅技能',
        level: 1,
        school: 'amplifier',
        schoolCssClass: 'school-amplifier',
        amplifierStacks: 3,
        affectedSkills: ['爆发A', '持续B'],
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('tooltip-amp-stacks')
    expect(mockTooltipEl._innerHTML).toContain('tooltip-amp-affects')
  })

  it('mechanicInfo 渲染机制信息', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '蓄力',
        icon: '⚡',
        description: '蓄力技能',
        level: 1,
        school: 'burst',
        schoolCssClass: 'school-burst',
        mechanicInfo: '蓄力 3/5',
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('tooltip-mechanic')
    expect(mockTooltipEl._innerHTML).toContain('蓄力 3/5')
  })

  it('enchantmentInfo 渲染旧式附魔描述', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '基础',
        icon: '⚡',
        description: '描述',
        level: 1,
        school: 'burst',
        schoolCssClass: 'school-burst',
        enchantmentInfo: '附魔: 强化 +10%',
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('tooltip-enchantment-info')
    expect(mockTooltipEl._innerHTML).toContain('附魔: 强化 +10%')
  })

  it('questProgress 渲染任务进度', async () => {
    const { keyTooltip } = await import('../../../../src/ui/keyboard/KeyTooltip')
    keyTooltip.show(100, 100, {
      letter: 'e',
      score: 2,
      frequency: 10,
      skill: {
        name: '基础',
        icon: '⚡',
        description: '描述',
        level: 1,
        school: 'burst',
        schoolCssClass: 'school-burst',
        enchantments: [
          { icon: '📖', name: '学徒', desc: '+1%/触发', color: '#2ecc71' },
        ],
        questProgress: '任务 2/5 完成',
      },
    })
    expect(mockTooltipEl._innerHTML).toContain('tooltip-quest')
    expect(mockTooltipEl._innerHTML).toContain('任务 2/5 完成')
  })
})
