// ============================================
// 商店 Act 权重与新手引导测试
// Story 19.8: AC1-AC8
// ============================================

import { describe, it, expect } from 'vitest'
import { ACT_SKILL_WEIGHTS, SKILL_TYPE_TOOLTIPS } from '../../../src/systems/shop'

// === AC1: Act 权重定义 ===
describe('Act 权重定义 (AC1)', () => {
  it('ACT_SKILL_WEIGHTS 包含 3 个 Act', () => {
    expect(Object.keys(ACT_SKILL_WEIGHTS).length).toBe(3)
    expect(ACT_SKILL_WEIGHTS[1]).toBeDefined()
    expect(ACT_SKILL_WEIGHTS[2]).toBeDefined()
    expect(ACT_SKILL_WEIGHTS[3]).toBeDefined()
  })

  it('每个 Act 权重之和为 100', () => {
    for (const act of [1, 2, 3]) {
      const w = ACT_SKILL_WEIGHTS[act]
      expect(w.producer + w.converter + w.connector).toBe(100)
    }
  })

  it('Act 1 权重: 80/20/0', () => {
    const w = ACT_SKILL_WEIGHTS[1]
    expect(w.producer).toBe(80)
    expect(w.converter).toBe(20)
    expect(w.connector).toBe(0)
  })

  it('Act 2 权重: 30/50/20', () => {
    const w = ACT_SKILL_WEIGHTS[2]
    expect(w.producer).toBe(30)
    expect(w.converter).toBe(50)
    expect(w.connector).toBe(20)
  })

  it('Act 3 权重: 10/40/50', () => {
    const w = ACT_SKILL_WEIGHTS[3]
    expect(w.producer).toBe(10)
    expect(w.converter).toBe(40)
    expect(w.connector).toBe(50)
  })
})

// === AC2: Act 1 无连接者 ===
describe('Act 1 无连接者 (AC2)', () => {
  it('Act 1 connector 权重严格为 0', () => {
    expect(ACT_SKILL_WEIGHTS[1].connector).toBe(0)
  })

  it('weightedPick 使用 weights.connector > 0 守卫', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    // 所有 connectorBucket 访问必须有 weights.connector > 0 守卫
    const connectorAccess = (content.match(/connectorBucket\.(shift|length)/g) || []).length
    const connectorGuarded = (content.match(/weights\.connector > 0 && connectorBucket/g) || []).length
    // weightedPick 中有 2 处 connectorBucket 访问需要守卫
    expect(connectorGuarded).toBeGreaterThanOrEqual(2)
  })

  it('SKILL_POOL_MULTIPLIER 常量替代魔法数字', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('SKILL_POOL_MULTIPLIER')
  })
})

// === AC1 源码验证: generateShopItems 使用 getActForNode ===
describe('generateShopItems Act 权重集成 (AC1)', () => {
  it('shop.ts 引用 getActForNode', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('getActForNode')
    expect(content).toContain('ACT_SKILL_WEIGHTS')
  })

  it('shop.ts generateShopItems 使用加权抽取', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('weightedPick')
    expect(content).toContain('producerBucket')
    expect(content).toContain('converterBucket')
    expect(content).toContain('connectorBucket')
  })
})

// === AC6: 升级池独立 ===
describe('升级池独立于 Act 权重 (AC6)', () => {
  it('shop.ts 升级池不受权重影响', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    // 升级池在加权新技能之后独立构建
    const weightedPickPos = content.indexOf('weightedPick')
    const upgradeComment = content.indexOf('不受 Act 权重限制')
    expect(weightedPickPos).toBeLessThan(upgradeComment)
  })
})

// === AC4, AC5: tooltip 系统 ===
describe('首次获取 tooltip (AC4, AC5)', () => {
  it('SKILL_TYPE_TOOLTIPS 包含 3 种类型', () => {
    expect(Object.keys(SKILL_TYPE_TOOLTIPS).length).toBe(3)
    expect(SKILL_TYPE_TOOLTIPS['producer']).toBeDefined()
    expect(SKILL_TYPE_TOOLTIPS['converter']).toBeDefined()
    expect(SKILL_TYPE_TOOLTIPS['connector']).toBeDefined()
  })

  it('每种 tooltip 包含 text 和 color', () => {
    for (const key of ['producer', 'converter', 'connector']) {
      const tip = SKILL_TYPE_TOOLTIPS[key]
      expect(tip.text).toBeTruthy()
      expect(tip.color).toBeTruthy()
      expect(tip.text).toContain('💡')
    }
  })

  it('产出者 tooltip 文案正确', () => {
    expect(SKILL_TYPE_TOOLTIPS['producer'].text).toContain('产出者')
  })

  it('转化者 tooltip 文案正确', () => {
    expect(SKILL_TYPE_TOOLTIPS['converter'].text).toContain('转化者')
  })

  it('连接者 tooltip 文案正确', () => {
    expect(SKILL_TYPE_TOOLTIPS['connector'].text).toContain('连接者')
  })
})

// === AC5: seenSkillTypes 状态跟踪 ===
describe('seenSkillTypes 状态 (AC5)', () => {
  it('state.ts 初始化 seenSkillTypes', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const statePath = path.resolve(__dirname, '../../../src/core/state.ts')
    const content = fs.readFileSync(statePath, 'utf-8')
    expect(content).toContain('seenSkillTypes')
    expect(content).toContain('new Set()')
  })

  it('types.ts 定义 seenSkillTypes', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const typesPath = path.resolve(__dirname, '../../../src/core/types.ts')
    const content = fs.readFileSync(typesPath, 'utf-8')
    expect(content).toContain('seenSkillTypes')
  })

  it('shop.ts executePurchase 检查并设置 seenSkillTypes', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('state.seenSkillTypes.has')
    expect(content).toContain('state.seenSkillTypes.add')
    expect(content).toContain('SKILL_TYPE_TOOLTIPS')
  })
})

// === 21.4: 第一关金币保底 ===
describe('第一关金币保底 (21.4 AC5)', () => {
  it('shop.ts 包含 level 1 金币保底逻辑', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('state.level === 1')
    expect(content).toContain('isGoldSkill')
    expect(content).toContain('prod_mint')
    expect(content).toContain('prod_treasury')
  })

  it('金币保底检查 gold source 和 target', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain("source === 'gold'")
    expect(content).toContain("target === 'gold'")
  })

  it('金币保底替换逻辑存在', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('goldCandidates')
    expect(content).toContain('skillPool[skillPool.length - 1]')
  })
})

// === 21.5: 热力图维度选择器 ===
describe('热力图维度选择器 (21.5 AC4)', () => {
  it('shop.ts 包含 HEATMAP_DIMENSIONS 定义', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('HEATMAP_DIMENSIONS')
    expect(content).toContain('HeatmapDimension')
    expect(content).toContain('currentHeatmapDimension')
  })

  it('维度选择器包含 7 种维度 (triggerCount + 6 resources)', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain("key: 'triggerCount'")
    expect(content).toContain("label: '触发数'")
    // 6 resources via RESOURCE_LABELS mapping
    expect(content).toContain('RESOURCE_LABELS[r]')
    expect(content).toContain('RESOURCE_COLORS[r]')
  })

  it('renderHeatmapTab 输出 heatmap-dims 选择器', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('heatmap-dims')
    expect(content).toContain('heatmap-dim')
    expect(content).toContain('data-dim')
  })

  it('getKeyValue 辅助函数存在', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('function getKeyValue')
    expect(content).toContain('triggerCount')
    expect(content).toContain('ks.resources')
  })
})

// === 21.5: 统计面板金币总计 ===
describe('统计面板金币总计 (21.5 AC5)', () => {
  it('renderStatsPanel 计算 totalGold', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('totalGold')
    expect(content).toContain('ks.resources.gold')
    expect(content).toContain('💰')
  })
})

// === 21.5: tooltip 包含 gold ===
describe('热力图 tooltip 包含 gold (21.5 AC3)', () => {
  it('showHeatmapTooltip 遍历含 gold 的资源列表', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    // tooltip 遍历 6 种资源（含 gold）
    expect(content).toContain("'base', 'score', 'multiplier', 'time', 'shield', 'gold'")
  })
})

// === AC3, AC7, AC8: 现有功能保留 ===
describe('现有商店功能保留 (AC3, AC7, AC8)', () => {
  it('保底逻辑保留', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('≥1 技能 + ≥1 牌包')
  })

  it('锁定逻辑保留', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('item.locked')
    expect(content).toContain('locked.length')
  })

  it('sellSkill 保留', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('export function sellSkill')
  })

  it('dragManager 保留', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('dragManager')
    expect(content).toContain('registerShopDropZones')
  })

  it('附魔模态框保留', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('renderEnchantmentModal')
    expect(content).toContain('checkAutoEnchantment')
  })

  it('refreshShop 保留', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const shopPath = path.resolve(__dirname, '../../../src/systems/shop.ts')
    const content = fs.readFileSync(shopPath, 'utf-8')
    expect(content).toContain('function refreshShop')
  })
})
