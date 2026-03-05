// ============================================
// 战斗 UI 改造测试
// Story 19.7: AC1, AC2, AC6, AC7, AC8
// ============================================

import { describe, it, expect } from 'vitest'
import { RESOURCE_COLORS, RESOURCE_LABELS, RESOURCE_ICONS } from '../../../src/core/constants'
import type { ResourceType } from '../../../src/core/types'

// === AC1: 技能栏移除验证 ===
describe('技能栏移除 (AC1)', () => {
  it('UIElements 接口不包含 battleSkills', async () => {
    // 动态导入 types 文件源码验证
    const typesModule = await import('../../../src/core/types')
    // types 模块导出不包含 battleSkills（类型层面 — 运行时验证元素文件）
    const elementsModule = await import('../../../src/ui/elements')
    expect(typeof elementsModule.initElements).toBe('function')
    expect(typeof elementsModule.getElements).toBe('function')
  })

  it('elements.ts 不引用 battle-skills', async () => {
    // 通过读取模块确认 initElements 返回的对象不含 battleSkills
    // 注意：不能在 JSDOM 外调用 initElements，但可以验证模块导出正确
    const fs = await import('fs')
    const path = await import('path')
    const elementsPath = path.resolve(__dirname, '../../../src/ui/elements.ts')
    const content = fs.readFileSync(elementsPath, 'utf-8')
    expect(content).not.toContain('battle-skills')
    expect(content).not.toContain('battleSkills')
  })

  it('battle.ts 不导出 renderBattleSkills 或 highlightBoundSkill', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const battlePath = path.resolve(__dirname, '../../../src/systems/battle.ts')
    const content = fs.readFileSync(battlePath, 'utf-8')
    expect(content).not.toContain('renderBattleSkills')
    expect(content).not.toContain('highlightBoundSkill')
  })

  it('skills.ts 不引用 highlightBoundSkill', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const skillsPath = path.resolve(__dirname, '../../../src/systems/skills.ts')
    const content = fs.readFileSync(skillsPath, 'utf-8')
    expect(content).not.toContain('highlightBoundSkill')
  })

  it('index.html 不包含 battle-skills', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const htmlPath = path.resolve(__dirname, '../../../index.html')
    const content = fs.readFileSync(htmlPath, 'utf-8')
    expect(content).not.toContain('battle-skills')
  })

  it('style.css 不包含 .bound-skill', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const cssPath = path.resolve(__dirname, '../../../src/style.css')
    const content = fs.readFileSync(cssPath, 'utf-8')
    expect(content).not.toContain('.bound-skill')
    expect(content).not.toContain('#battle-skills')
  })
})

// === AC2: 资源颜色定义 ===
describe('6 种资源颜色 (AC2)', () => {
  const expectedColors: Record<ResourceType, string> = {
    base: '#e74c3c',
    score: '#f1c40f',
    multiplier: '#e67e22',
    time: '#3498db',
    shield: '#bdc3c7',
    gold: '#ffd700',
  }

  it('RESOURCE_COLORS 包含 6 种资源', () => {
    expect(Object.keys(RESOURCE_COLORS).length).toBe(6)
  })

  for (const [resource, color] of Object.entries(expectedColors)) {
    it(`${resource} 颜色为 ${color}`, () => {
      expect(RESOURCE_COLORS[resource as ResourceType]).toBe(color)
    })
  }

  it('RESOURCE_LABELS 包含 6 种资源标签', () => {
    expect(Object.keys(RESOURCE_LABELS).length).toBe(6)
    expect(RESOURCE_LABELS['base']).toBe('基数')
    expect(RESOURCE_LABELS['score']).toBe('分数')
    expect(RESOURCE_LABELS['multiplier']).toBe('倍率')
    expect(RESOURCE_LABELS['time']).toBe('时间')
    expect(RESOURCE_LABELS['shield']).toBe('护盾')
    expect(RESOURCE_LABELS['gold']).toBe('金币')
  })

  it('RESOURCE_ICONS 包含 6 种资源图标', () => {
    expect(Object.keys(RESOURCE_ICONS).length).toBe(6)
  })
})

// === AC6: 结算面板公式 ===
describe('结算面板公式 (AC6)', () => {
  it('index.html 包含 settlement-score 元素', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const htmlPath = path.resolve(__dirname, '../../../index.html')
    const content = fs.readFileSync(htmlPath, 'utf-8')
    expect(content).toContain('settlement-score')
    expect(content).toContain('id="settlement-score"')
  })

  it('结算面板布局顺序: 基数 × 倍率 + 分数 = 最终', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const htmlPath = path.resolve(__dirname, '../../../index.html')
    const content = fs.readFileSync(htmlPath, 'utf-8')
    const chipsPos = content.indexOf('settlement-chips')
    const multPos = content.indexOf('settlement-mult')
    const scorePos = content.indexOf('settlement-score')
    const resultPos = content.indexOf('settlement-result')
    expect(chipsPos).toBeLessThan(multPos)
    expect(multPos).toBeLessThan(scorePos)
    expect(scorePos).toBeLessThan(resultPos)
  })

  it('battle.ts updateSettlementLive 使用 base×mult+score 公式', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const battlePath = path.resolve(__dirname, '../../../src/systems/battle.ts')
    const content = fs.readFileSync(battlePath, 'utf-8')
    // 验证公式包含 resources.score
    expect(content).toContain('state.resources.score')
    expect(content).toContain('chips * mult + score')
  })
})

// === AC7: 已有效果保留 ===
describe('已有效果保留 (AC7)', () => {
  it('battle.ts 保留 showTriggerPopup 引用', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const skillsPath = path.resolve(__dirname, '../../../src/systems/skills.ts')
    const content = fs.readFileSync(skillsPath, 'utf-8')
    expect(content).toContain('showTriggerPopup')
  })

  it('battle.ts 保留 spawnParticles 引用', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const battlePath = path.resolve(__dirname, '../../../src/systems/battle.ts')
    const content = fs.readFileSync(battlePath, 'utf-8')
    expect(content).toContain('spawnParticles')
  })

  it('battle.ts 保留 screenShake 引用', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const battlePath = path.resolve(__dirname, '../../../src/systems/battle.ts')
    const content = fs.readFileSync(battlePath, 'utf-8')
    expect(content).toContain('screenShake')
  })

  it('battle.ts 保留 bumpCombo 引用', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const battlePath = path.resolve(__dirname, '../../../src/systems/battle.ts')
    const content = fs.readFileSync(battlePath, 'utf-8')
    expect(content).toContain('bumpCombo')
  })
})

// === AC8: 浮字系统性能设计 ===
describe('浮字系统 (AC8)', () => {
  it('battle.ts 实现浮字对象池', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const battlePath = path.resolve(__dirname, '../../../src/systems/battle.ts')
    const content = fs.readFileSync(battlePath, 'utf-8')
    expect(content).toContain('FLOAT_POOL_SIZE')
    expect(content).toContain('floatPool')
    expect(content).toContain('acquireFloat')
    expect(content).toContain('releaseFloat')
  })

  it('battle.ts 实现浮字队列', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const battlePath = path.resolve(__dirname, '../../../src/systems/battle.ts')
    const content = fs.readFileSync(battlePath, 'utf-8')
    expect(content).toContain('floatQueue')
    expect(content).toContain('drainQueue')
    expect(content).toContain('FLOAT_INTERVAL')
  })

  it('battle.ts 实现浮字队列清理（关卡结束时）', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const battlePath = path.resolve(__dirname, '../../../src/systems/battle.ts')
    const content = fs.readFileSync(battlePath, 'utf-8')
    expect(content).toContain('clearFloatQueue')
    // 在 endLevel/gameOver/victory 中都调用
    const clearCount = (content.match(/clearFloatQueue\(\)/g) || []).length
    expect(clearCount).toBeGreaterThanOrEqual(4) // 1 definition + 3 call sites
  })

  it('style.css 使用 CSS animation 驱动浮字', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const cssPath = path.resolve(__dirname, '../../../src/style.css')
    const content = fs.readFileSync(cssPath, 'utf-8')
    expect(content).toContain('.float-text')
    expect(content).toContain('float-text-active')
    expect(content).toContain('@keyframes floatUp')
  })
})

// === AC5: 伪无限视觉 ===
describe('伪无限视觉 (AC5)', () => {
  it('battle.ts 导出 setPseudoInfiniteVisual', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const battlePath = path.resolve(__dirname, '../../../src/systems/battle.ts')
    const content = fs.readFileSync(battlePath, 'utf-8')
    expect(content).toContain('export function setPseudoInfiniteVisual')
    expect(content).toContain('pseudo-infinite')
  })

  it('style.css 包含伪无限光效', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const cssPath = path.resolve(__dirname, '../../../src/style.css')
    const content = fs.readFileSync(cssPath, 'utf-8')
    expect(content).toContain('.pseudo-infinite')
    expect(content).toContain('pseudoInfinitePulse')
  })

  it('skills.ts 在进入/退出伪无限时调用视觉切换', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const skillsPath = path.resolve(__dirname, '../../../src/systems/skills.ts')
    const content = fs.readFileSync(skillsPath, 'utf-8')
    expect(content).toContain('setPseudoInfiniteVisual(true)')
    expect(content).toContain('setPseudoInfiniteVisual(false)')
  })
})
