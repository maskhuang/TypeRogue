// ============================================
// 商店 UI 附魔与新机制展示测试
// Story 34.6: AC1-AC7 (行为测试)
// ============================================

import { describe, it, expect } from 'vitest'
import { PRODUCERS, isProducer, getProducerMechanic, MECHANIC_LABELS, MECHANIC_ICONS, RELATION_LABELS } from '../../../src/data/producers'
import { buildMechanicInfo } from '../../../src/systems/shop'
import { ENCHANTMENTS } from '../../../src/data/enchantments'
import type { KeyTooltipData } from '../../../src/ui/keyboard/KeyTooltip'
import type { ChargeParams, DecayParams, PulseParams, CritParams, VoidParams } from '../../../src/core/types'

// === AC1: 乘算化附魔边框 ===
describe('AC1: 乘算化附魔边框', () => {
  it('ench_multiply 存在于 ENCHANTMENTS 且为 operator 类型', () => {
    expect(ENCHANTMENTS['ench_multiply']).toBeDefined()
    expect(ENCHANTMENTS['ench_multiply'].category).toBe('operator')
  })

  it('ench_multiply 有图标和名称', () => {
    const ench = ENCHANTMENTS['ench_multiply']
    expect(ench.icon).toBeDefined()
    expect(ench.name).toBeDefined()
    expect(ench.name.length).toBeGreaterThan(0)
  })
})

// === AC2: 商店技能卡片机制 Badge ===
describe('AC2: 商店技能卡片机制 Badge', () => {
  it('MECHANIC_LABELS 导出且包含 5 种机制', () => {
    expect(MECHANIC_LABELS).toBeDefined()
    expect(MECHANIC_LABELS['charge']).toBe('蓄力')
    expect(MECHANIC_LABELS['decay']).toBe('衰减')
    expect(MECHANIC_LABELS['pulse']).toBe('脉冲')
    expect(MECHANIC_LABELS['crit']).toBe('暴击')
    expect(MECHANIC_LABELS['void']).toBe('虚无')
  })

  it('MECHANIC_ICONS 导出且包含 5 种机制图标', () => {
    expect(MECHANIC_ICONS).toBeDefined()
    expect(MECHANIC_ICONS['charge']).toBe('🔌')
    expect(MECHANIC_ICONS['decay']).toBe('📉')
    expect(MECHANIC_ICONS['pulse']).toBe('💗')
    expect(MECHANIC_ICONS['crit']).toBe('🎲')
    expect(MECHANIC_ICONS['void']).toBe('⬛')
  })

  it('standard 不在 MECHANIC_LABELS/ICONS 中', () => {
    expect(MECHANIC_LABELS['standard']).toBeUndefined()
    expect(MECHANIC_ICONS['standard']).toBeUndefined()
  })
})

// === AC3: 商店 Tooltip 机制信息 ===
describe('AC3: 商店 Tooltip 机制信息', () => {
  it('KeyTooltipData.skill 支持 mechanicInfo 字段', () => {
    const data: KeyTooltipData = {
      skill: {
        name: 'test',
        icon: '⚔️',
        description: 'test desc',
        level: 1,
        school: 'burst',
        schoolCssClass: 'school-burst',
        mechanicInfo: '🔌蓄力 · 每秒+8%，上限200%',
      },
    }
    expect(data.skill!.mechanicInfo).toBe('🔌蓄力 · 每秒+8%，上限200%')
  })

  it('buildMechanicInfo 对标准产出者返回 undefined', () => {
    const standardIds = Object.keys(PRODUCERS).filter(id => getProducerMechanic(id) === 'standard')
    expect(standardIds.length).toBeGreaterThan(0)
    for (const id of standardIds.slice(0, 3)) {
      expect(buildMechanicInfo(id)).toBeUndefined()
    }
  })

  it('buildMechanicInfo 对蓄力产出者返回描述含图标和参数', () => {
    const info = buildMechanicInfo('prod_charge_base')
    expect(info).toBeDefined()
    expect(info).toContain('🔌')
    expect(info).toContain('蓄力')
    expect(info).toContain('每秒')
    expect(info).toContain('上限')
    // 验证参数来自实际数据
    const prod = PRODUCERS['prod_charge_base']
    const cp = prod.mechanicParams as ChargeParams
    expect(info).toContain(`${Math.round(cp.gainPerSec * 100)}%`)
    expect(info).toContain(`${Math.round(cp.maxBonus * 100)}%`)
  })

  it('buildMechanicInfo 对衰减产出者返回描述含初始/衰减/下限', () => {
    const info = buildMechanicInfo('prod_decay_base')
    expect(info).toBeDefined()
    expect(info).toContain('📉')
    expect(info).toContain('衰减')
    expect(info).toContain('初始')
    const prod = PRODUCERS['prod_decay_base']
    const dp = prod.mechanicParams as DecayParams
    expect(info).toContain(`×${dp.initialMult}`)
    expect(info).toContain(`-${dp.decayPerTrigger}`)
    expect(info).toContain(`×${dp.floor}`)
  })

  it('buildMechanicInfo 对脉冲产出者返回描述含间隔和倍率', () => {
    const info = buildMechanicInfo('prod_pulse_multiplier')
    expect(info).toBeDefined()
    expect(info).toContain('💗')
    expect(info).toContain('脉冲')
    const prod = PRODUCERS['prod_pulse_multiplier']
    const pp = prod.mechanicParams as PulseParams
    expect(info).toContain(`${pp.interval}`)
    expect(info).toContain(`×${pp.burstMult}`)
  })

  it('buildMechanicInfo 对暴击产出者返回描述含概率和倍率', () => {
    const info = buildMechanicInfo('prod_crit_time')
    expect(info).toBeDefined()
    expect(info).toContain('🎲')
    expect(info).toContain('暴击')
    expect(info).toContain('概率')
    const prod = PRODUCERS['prod_crit_time']
    const crp = prod.mechanicParams as CritParams
    expect(info).toContain(`${Math.round(crp.chance * 100)}%`)
    expect(info).toContain(`×${crp.critMult}`)
  })

  it('buildMechanicInfo 对虚无产出者返回描述含范围和空位信息', () => {
    const info = buildMechanicInfo('prod_void_base_adjacent')
    expect(info).toBeDefined()
    expect(info).toContain('⬛')
    expect(info).toContain('虚无')
    expect(info).toContain('空位')
    const prod = PRODUCERS['prod_void_base_adjacent']
    const vp = prod.mechanicParams as VoidParams
    expect(info).toContain(`${Math.round(vp.bonusPerSlot * 100)}%`)
    // 验证位置关系标签被正确使用
    const relLabel = RELATION_LABELS[vp.posRel]
    expect(relLabel).toBeDefined()
    expect(info).toContain(relLabel)
  })

  it('buildMechanicInfo 对非产出者返回 undefined', () => {
    expect(buildMechanicInfo('conv_base_to_score')).toBeUndefined()
    expect(buildMechanicInfo('nonexistent')).toBeUndefined()
  })
})

// === AC4: 战斗触发弹窗机制状态 ===
describe('AC4: 各机制产出者 mechanicParams 结构正确', () => {
  it('蓄力产出者有 gainPerSec 和 maxBonus', () => {
    const chargeIds = Object.keys(PRODUCERS).filter(id => getProducerMechanic(id) === 'charge')
    expect(chargeIds.length).toBeGreaterThan(0)
    for (const id of chargeIds) {
      const p = PRODUCERS[id].mechanicParams as ChargeParams
      expect(p).toBeDefined()
      expect(p.gainPerSec).toBeGreaterThan(0)
      expect(p.maxBonus).toBeGreaterThan(0)
    }
  })

  it('衰减产出者有 initialMult、decayPerTrigger、floor', () => {
    const decayIds = Object.keys(PRODUCERS).filter(id => getProducerMechanic(id) === 'decay')
    expect(decayIds.length).toBeGreaterThan(0)
    for (const id of decayIds) {
      const p = PRODUCERS[id].mechanicParams as DecayParams
      expect(p).toBeDefined()
      expect(p.initialMult).toBeGreaterThan(0)
      expect(p.decayPerTrigger).toBeGreaterThan(0)
      expect(p.floor).toBeGreaterThanOrEqual(0)
      expect(p.floor).toBeLessThan(p.initialMult)
    }
  })

  it('脉冲产出者有 interval 和 burstMult', () => {
    const pulseIds = Object.keys(PRODUCERS).filter(id => getProducerMechanic(id) === 'pulse')
    expect(pulseIds.length).toBeGreaterThan(0)
    for (const id of pulseIds) {
      const p = PRODUCERS[id].mechanicParams as PulseParams
      expect(p).toBeDefined()
      expect(p.interval).toBeGreaterThan(1)
      expect(p.burstMult).toBeGreaterThan(1)
    }
  })

  it('暴击产出者有 chance 和 critMult', () => {
    const critIds = Object.keys(PRODUCERS).filter(id => getProducerMechanic(id) === 'crit')
    expect(critIds.length).toBeGreaterThan(0)
    for (const id of critIds) {
      const p = PRODUCERS[id].mechanicParams as CritParams
      expect(p).toBeDefined()
      expect(p.chance).toBeGreaterThan(0)
      expect(p.chance).toBeLessThanOrEqual(1)
      expect(p.critMult).toBeGreaterThan(1)
    }
  })

  it('虚无产出者有 posRel 和 bonusPerSlot', () => {
    const voidIds = Object.keys(PRODUCERS).filter(id => getProducerMechanic(id) === 'void')
    expect(voidIds.length).toBeGreaterThan(0)
    for (const id of voidIds) {
      const p = PRODUCERS[id].mechanicParams as VoidParams
      expect(p).toBeDefined()
      expect(p.posRel).toBeDefined()
      expect(typeof p.posRel).toBe('string')
      expect(p.bonusPerSlot).toBeGreaterThan(0)
    }
  })
})

// === AC5: 暴击触发特殊反馈 ===
describe('AC5: 暴击机制数据完整性', () => {
  it('每个暴击产出者的 critMult 合理（1-10倍）', () => {
    const critIds = Object.keys(PRODUCERS).filter(id => getProducerMechanic(id) === 'crit')
    for (const id of critIds) {
      const p = PRODUCERS[id].mechanicParams as CritParams
      expect(p.critMult).toBeGreaterThanOrEqual(1)
      expect(p.critMult).toBeLessThanOrEqual(10)
    }
  })

  it('暴击概率在合理范围内（5%-80%）', () => {
    const critIds = Object.keys(PRODUCERS).filter(id => getProducerMechanic(id) === 'crit')
    for (const id of critIds) {
      const p = PRODUCERS[id].mechanicParams as CritParams
      expect(p.chance).toBeGreaterThanOrEqual(0.05)
      expect(p.chance).toBeLessThanOrEqual(0.8)
    }
  })
})

// === AC6: 商店 bound-grid 机制角标 ===
describe('AC6: 非标准产出者数据', () => {
  it('非 standard 产出者数量与预期一致', () => {
    const nonStandard = Object.keys(PRODUCERS).filter(id => getProducerMechanic(id) !== 'standard')
    expect(nonStandard.length).toBe(70) // 7*4 mechanic + 42 void
  })

  it('每种非标准机制都有对应的图标', () => {
    const mechanics = new Set(
      Object.keys(PRODUCERS)
        .map(id => getProducerMechanic(id))
        .filter(m => m !== 'standard')
    )
    for (const mech of mechanics) {
      expect(MECHANIC_ICONS[mech]).toBeDefined()
      expect(MECHANIC_ICONS[mech].length).toBeGreaterThan(0)
    }
  })
})

// === AC7: 商店虚无范围高亮 ===
describe('AC7: 虚无产出者范围数据', () => {
  it('所有虚无产出者的 posRel 在 RELATION_LABELS 中有对应标签', () => {
    const voidIds = Object.keys(PRODUCERS).filter(id => getProducerMechanic(id) === 'void')
    expect(voidIds.length).toBeGreaterThan(0)
    for (const id of voidIds) {
      const vp = PRODUCERS[id].mechanicParams as VoidParams
      expect(RELATION_LABELS[vp.posRel]).toBeDefined()
    }
  })

  it('RELATION_LABELS 包含所有 6 种位置关系', () => {
    const expectedRelations = ['adjacent', 'sameRow', 'sameColumn', 'sameHand', 'sameFinger', 'symmetric']
    for (const rel of expectedRelations) {
      expect(RELATION_LABELS[rel]).toBeDefined()
      expect(RELATION_LABELS[rel].length).toBeGreaterThan(0)
    }
  })
})

// === 跨 AC 集成验证 ===
describe('跨 AC 集成验证', () => {
  it('所有非 standard 机制都有对应的 LABEL 和 ICON', () => {
    for (const mech of ['charge', 'decay', 'pulse', 'crit', 'void']) {
      expect(MECHANIC_LABELS[mech]).toBeDefined()
      expect(MECHANIC_ICONS[mech]).toBeDefined()
      expect(MECHANIC_LABELS[mech].length).toBeGreaterThan(0)
      expect(MECHANIC_ICONS[mech].length).toBeGreaterThan(0)
    }
  })

  it('每种机制产出者都能生成 mechanicInfo', () => {
    for (const mech of ['charge', 'decay', 'pulse', 'crit', 'void']) {
      const id = Object.keys(PRODUCERS).find(pid => getProducerMechanic(pid) === mech)
      expect(id).toBeDefined()
      const info = buildMechanicInfo(id!)
      expect(info).toBeDefined()
      expect(info!.length).toBeGreaterThan(0)
    }
  })

  it('buildMechanicInfo 输出包含对应机制图标', () => {
    for (const mech of ['charge', 'decay', 'pulse', 'crit', 'void']) {
      const id = Object.keys(PRODUCERS).find(pid => getProducerMechanic(pid) === mech)!
      const info = buildMechanicInfo(id)!
      expect(info).toContain(MECHANIC_ICONS[mech])
      expect(info).toContain(MECHANIC_LABELS[mech])
    }
  })
})
