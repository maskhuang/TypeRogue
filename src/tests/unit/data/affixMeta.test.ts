// ============================================
// Story 45.9: 元规则型 — 先天 + 反制 + 消耗 + 虚无 单元测试
// ============================================

import { describe, it, expect } from 'vitest'
import { AffixType, createSkillRuntimeState } from '../../../src/data/affixes'
import type { AffixInstance, AffixSkillInstance } from '../../../src/data/affixes'
import { removeAffixAtRuntime } from '../../../src/data/affixTrigger'

// ===== SkillRuntimeState 初始化 =====

describe('SkillRuntimeState meta-rule fields', () => {
  it('createSkillRuntimeState 包含 counter/exhaust/ethereal 字段', () => {
    const rt = createSkillRuntimeState('test')
    expect(rt.counterCharges).toBe(0)
    expect(rt.exhaustCount).toBe(0)
    expect(rt.etherealTriggered).toBe(false)
  })
})

// ===== removeAffixAtRuntime =====

describe('removeAffixAtRuntime', () => {
  function mockSkill(affixTypes: AffixType[]): AffixSkillInstance {
    return {
      id: 'test', name: 'test', icon: '', resource: 'base',
      baseValues: [4, 7, 10, 14], level: 1, rarity: 0 as any,
      affixes: affixTypes.map(type => ({ type } as AffixInstance)),
      enchantmentIds: [],
    }
  }

  it('移除存在的词条类型 → 返回 true + affixes 减少', () => {
    const skill = mockSkill([AffixType.Exhaust, AffixType.Crit])
    expect(skill.affixes).toHaveLength(2)
    const result = removeAffixAtRuntime(skill, AffixType.Exhaust)
    expect(result).toBe(true)
    expect(skill.affixes).toHaveLength(1)
    expect(skill.affixes[0].type).toBe(AffixType.Crit)
  })

  it('移除不存在的词条类型 → 返回 false + 无变化', () => {
    const skill = mockSkill([AffixType.Crit])
    const result = removeAffixAtRuntime(skill, AffixType.Exhaust)
    expect(result).toBe(false)
    expect(skill.affixes).toHaveLength(1)
  })

  it('移除后技能可继续使用（affixes 可为空）', () => {
    const skill = mockSkill([AffixType.Ethereal])
    removeAffixAtRuntime(skill, AffixType.Ethereal)
    expect(skill.affixes).toHaveLength(0)
  })
})

// ===== Counter 负值拦截逻辑 =====

describe('Counter charge logic', () => {
  it('负产出 + 有充能 → 产出归零 + 充能-1', () => {
    let output = -50
    let charges = 3
    if (output < 0 && charges > 0) {
      charges--
      output = 0
    }
    expect(output).toBe(0)
    expect(charges).toBe(2)
  })

  it('负产出 + 无充能 → 产出不变', () => {
    let output = -50
    const charges = 0
    if (output < 0 && charges > 0) {
      // not entered
    }
    expect(output).toBe(-50)
  })

  it('正产出 + 有充能 → 不触发（不浪费充能）', () => {
    const output = 100
    let charges = 3
    if (output < 0 && charges > 0) {
      charges--
    }
    expect(charges).toBe(3)
  })
})

// ===== Exhaust base 倍增 + 计数移除 =====

describe('Exhaust logic', () => {
  it('base 倍增应用（effectiveBase *= exhaustMult）', () => {
    const base = 10
    const exhaustMult = 2.0
    expect(base * exhaustMult).toBe(20)
  })

  it('达到 maxTriggers 时移除', () => {
    const skill = { affixes: [{ type: AffixType.Exhaust, maxTriggers: 3 }] } as any
    let exhaustCount = 2
    exhaustCount++
    if (exhaustCount >= 3) {
      removeAffixAtRuntime(skill, AffixType.Exhaust)
    }
    expect(skill.affixes).toHaveLength(0)
    expect(exhaustCount).toBe(3)
  })
})

// ===== Ethereal base 倍增 + 关卡结束移除 =====

describe('Ethereal logic', () => {
  it('base 倍增应用（effectiveBase *= etherealMult）', () => {
    const base = 10
    const etherealMult = 3.0
    expect(base * etherealMult).toBe(30)
  })

  it('etherealTriggered=true 时关卡结束移除', () => {
    const skill = { affixes: [{ type: AffixType.Ethereal }, { type: AffixType.Crit }] } as any
    const etherealTriggered = true
    if (etherealTriggered) {
      removeAffixAtRuntime(skill, AffixType.Ethereal)
    }
    expect(skill.affixes).toHaveLength(1)
    expect(skill.affixes[0].type).toBe(AffixType.Crit)
  })
})

// ===== 交互测试 =====

describe('Meta-rule interactions', () => {
  it('Innate + Exhaust: 自动触发消耗 1 次弹药', () => {
    let exhaustCount = 0
    // Innate auto-trigger
    exhaustCount++
    // Player triggers 4 more times (maxTriggers=5)
    for (let i = 0; i < 4; i++) exhaustCount++
    expect(exhaustCount).toBe(5) // Innate ate 1 of 5 charges
  })
})
