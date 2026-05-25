// ============================================
// 打字肉鸽 - affixV2 结盟（Alliance）机制单元测试
// ============================================
// 覆盖：结盟集（add/de-dup/clear · 复数共存）· ally:joined 事件 ·
//       allianceOutputBonusFor 数值层（+bonus×n）· apply_ally effect 结算（全候选入盟）·
//       coalition recipe 生成形态。对照 affixV2Mark.test.ts（MARK 的复数·数值版）。

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAllies,
  getAllianceSize,
  isAllied,
  addAlly,
  clearAllies,
  allianceOutputBonusFor,
  resetAllAffixV2State,
} from '../../../src/systems/affixV2State'
import { ALLIANCE_BONUS_PCT } from '../../../src/data/affixV2Trigger'
import { resolveEffect, type ResolveContext } from '../../../src/systems/affixV2Effect'
import { eventBus } from '../../../src/core/events/eventBus'
import { rollAffixV2Spec, ALL_RECIPES, RECIPE_COALITION } from '../../../src/data/affixV2Generator'
import { expectedFiresPerBattle } from '../../../src/data/affixV2Balance'
import { setSeededMode, setNormalMode } from '../../../src/core/seededRandom'

const baseCtx: ResolveContext = {
  instanceId: 'inst_1',
  skillId: 'skill_1',
  key: 'K',
  skillResource: 'score',
  skillResourceLv1Base: 11,
  resourceLv1Base: (r) => ({ score: 11, time: 0.2, gold: 3, shield: 5 } as Record<string, number>)[r] ?? 1,
  nowMs: 1000,
  isCrit: false,
  currentWordLength: 5,
  getPlayerResource: () => 0,
}

beforeEach(() => {
  resetAllAffixV2State()
})

describe('结盟集 · 复数共存', () => {
  it('初始空盟', () => {
    expect(getAllies()).toEqual([])
    expect(getAllianceSize()).toBe(0)
    expect(isAllied('skill_1')).toBe(false)
  })

  it('addAlly 入盟 · isAllied 命中 · 复数共存', () => {
    addAlly('skill_a', 'inst_1')
    addAlly('skill_b', 'inst_1')
    expect(getAllianceSize()).toBe(2)
    expect(isAllied('skill_a')).toBe(true)
    expect(isAllied('skill_b')).toBe(true)
    expect(isAllied('skill_c')).toBe(false)
  })

  it('重复入盟同技能 = no-op（不重复计数）', () => {
    addAlly('skill_a', 'inst_1')
    addAlly('skill_a', 'inst_1')
    expect(getAllianceSize()).toBe(1)
  })

  it('clearAllies 清空', () => {
    addAlly('skill_a', 'inst_1')
    clearAllies()
    expect(getAllianceSize()).toBe(0)
  })

  it('resetAllAffixV2State 清盟', () => {
    addAlly('skill_a', 'inst_1')
    resetAllAffixV2State()
    expect(getAllianceSize()).toBe(0)
  })
})

describe('结盟事件 · ally:joined', () => {
  it('新成员入盟发 ally:joined', () => {
    const joined: string[] = []
    const onJ = ({ skillId }: { skillId: string }) => joined.push(skillId)
    eventBus.on('ally:joined', onJ)
    try {
      addAlly('skill_a', 'inst_1')
      addAlly('skill_b', 'inst_1')
    } finally {
      eventBus.off('ally:joined', onJ)
    }
    expect(joined).toEqual(['skill_a', 'skill_b'])
  })

  it('重复入盟同技能 = no-op（不发事件）', () => {
    addAlly('skill_a', 'inst_1')
    let fired = 0
    const inc = () => { fired++ }
    eventBus.on('ally:joined', inc)
    try {
      addAlly('skill_a', 'inst_1')
    } finally {
      eventBus.off('ally:joined', inc)
    }
    expect(fired).toBe(0)
  })
})

describe('结盟数值层 · allianceOutputBonusFor', () => {
  it('未入盟 → 0', () => {
    addAlly('skill_a', 'inst_1')
    expect(allianceOutputBonusFor('skill_other')).toBe(0)
  })

  it('入盟 → ALLIANCE_BONUS_PCT × 结盟规模 n', () => {
    addAlly('skill_a', 'inst_1')
    expect(allianceOutputBonusFor('skill_a')).toBeCloseTo(ALLIANCE_BONUS_PCT * 1, 10)
    addAlly('skill_b', 'inst_1')
    // 盟变大 → 全体盟员 bonus 同步提升（动态读 size）
    expect(allianceOutputBonusFor('skill_a')).toBeCloseTo(ALLIANCE_BONUS_PCT * 2, 10)
    expect(allianceOutputBonusFor('skill_b')).toBeCloseTo(ALLIANCE_BONUS_PCT * 2, 10)
  })
})

describe('apply_ally effect 结算 · 全候选入盟', () => {
  it('selector 全部候选加入结盟（与 apply_mark 取 1 不同）', () => {
    const ctx: ResolveContext = {
      ...baseCtx,
      resolveSelector: () => ['skill_x', 'skill_y', 'skill_z'],
    }
    resolveEffect({ kind: 'apply_ally', selector: { type: 'all_skills' } }, ctx)
    expect(getAllianceSize()).toBe(3)
    expect(isAllied('skill_x')).toBe(true)
    expect(isAllied('skill_y')).toBe(true)
    expect(isAllied('skill_z')).toBe(true)
  })

  it('无 resolveSelector → 退化让宿主自身入盟', () => {
    resolveEffect({ kind: 'apply_ally', selector: { type: 'self' } }, baseCtx)
    expect(isAllied('skill_1')).toBe(true)  // ctx.skillId 兜底
    expect(getAllianceSize()).toBe(1)
  })

  it('候选为空 → 不改结盟', () => {
    addAlly('skill_prev', 'x')
    const ctx: ResolveContext = { ...baseCtx, resolveSelector: () => [] }
    resolveEffect({ kind: 'apply_ally', selector: { type: 'all_skills' } }, ctx)
    expect(getAllies()).toEqual(['skill_prev'])  // 维持不变
  })

  it('重复入盟去重（候选含已入盟）', () => {
    addAlly('skill_x', 'x')
    const ctx: ResolveContext = { ...baseCtx, resolveSelector: () => ['skill_x', 'skill_y'] }
    resolveEffect({ kind: 'apply_ally', selector: { type: 'all_skills' } }, ctx)
    expect(getAllianceSize()).toBe(2)  // x 不重复
  })
})

describe('coalition recipe', () => {
  it('已登记进 ALL_RECIPES', () => {
    expect(ALL_RECIPES).toContain(RECIPE_COALITION)
    expect(RECIPE_COALITION.kind).toBe('ally')
    expect(RECIPE_COALITION.section).toBe('agonistic')
  })

  it('生成形态：trigger 随机抽(排除高频 >100) · effect=apply_ally · selector 非 allied', () => {
    setSeededMode(0x414c4c59)  // 固定种子（"ALLY"）
    try {
      for (let i = 0; i < 50; i++) {
        const { trigger, effect } = rollAffixV2Spec(RECIPE_COALITION)
        // trigger 随机但被防洪水门控：期望频率不超 100/战（排除 on_key 等每键级 → 不每键狂刷入盟反应链）
        expect(expectedFiresPerBattle(trigger)).toBeLessThanOrEqual(100)
        expect(effect.kind).toBe('apply_ally')
        if (effect.kind === 'apply_ally') {
          // 不应抽到 allied 自身（招募当前盟员 = no-op）
          expect(effect.selector.type).not.toBe('allied')
        }
      }
    } finally {
      setNormalMode()
    }
  })
})
