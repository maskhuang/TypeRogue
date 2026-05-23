// ============================================
// 打字肉鸽 - affixV2 MARK 焦点机制单元测试
// ============================================
// 覆盖：单焦点寄存器（set/displace/no-op/clear）· mark:granted/mark:lost 事件 ·
//       apply_mark effect 结算 · directed_scratch recipe 生成形态。

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getFocus,
  isFocused,
  setFocus,
  clearFocus,
  resetAllAffixV2State,
} from '../../../src/systems/affixV2State'
import { resolveEffect, type ResolveContext } from '../../../src/systems/affixV2Effect'
import { eventBus } from '../../../src/core/events/eventBus'
import { rollAffixV2Spec, ALL_RECIPES, RECIPE_DIRECTED_SCRATCH } from '../../../src/data/affixV2Generator'
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

describe('MARK 单焦点寄存器', () => {
  it('初始无焦点', () => {
    expect(getFocus()).toBeNull()
    expect(isFocused('skill_1')).toBe(false)
  })

  it('setFocus 设焦点 · isFocused 命中', () => {
    setFocus('skill_a', 'inst_1')
    expect(getFocus()).toBe('skill_a')
    expect(isFocused('skill_a')).toBe(true)
    expect(isFocused('skill_b')).toBe(false)
  })

  it('new 顶 old：改指移动焦点', () => {
    setFocus('skill_a', 'inst_1')
    setFocus('skill_b', 'inst_1')
    expect(getFocus()).toBe('skill_b')
    expect(isFocused('skill_a')).toBe(false)
  })

  it('clearFocus 清空', () => {
    setFocus('skill_a', 'inst_1')
    clearFocus()
    expect(getFocus()).toBeNull()
  })

  it('resetAllAffixV2State 清焦点', () => {
    setFocus('skill_a', 'inst_1')
    resetAllAffixV2State()
    expect(getFocus()).toBeNull()
  })
})

describe('MARK 焦点事件 · mark:granted / mark:lost', () => {
  it('首次上位：仅发 granted（无旧焦点 → 不发 lost）', () => {
    const granted: string[] = []
    const lost: string[] = []
    const onG = ({ skillId }: { skillId: string }) => granted.push(skillId)
    const onL = ({ skillId }: { skillId: string }) => lost.push(skillId)
    eventBus.on('mark:granted', onG)
    eventBus.on('mark:lost', onL)
    try {
      setFocus('skill_a', 'inst_1')
    } finally {
      eventBus.off('mark:granted', onG)
      eventBus.off('mark:lost', onL)
    }
    expect(granted).toEqual(['skill_a'])
    expect(lost).toEqual([])
  })

  it('re-aim：成对发 lost(旧) + granted(新)', () => {
    setFocus('skill_a', 'inst_1')
    const granted: string[] = []
    const lost: string[] = []
    const onG = ({ skillId }: { skillId: string }) => granted.push(skillId)
    const onL = ({ skillId }: { skillId: string }) => lost.push(skillId)
    eventBus.on('mark:granted', onG)
    eventBus.on('mark:lost', onL)
    try {
      setFocus('skill_b', 'inst_1')
    } finally {
      eventBus.off('mark:granted', onG)
      eventBus.off('mark:lost', onL)
    }
    expect(lost).toEqual(['skill_a'])
    expect(granted).toEqual(['skill_b'])
  })

  it('重标同一焦点 = no-op（不发任何事件）', () => {
    setFocus('skill_a', 'inst_1')
    let fired = 0
    const inc = () => { fired++ }
    eventBus.on('mark:granted', inc)
    eventBus.on('mark:lost', inc)
    try {
      setFocus('skill_a', 'inst_1')
    } finally {
      eventBus.off('mark:granted', inc)
      eventBus.off('mark:lost', inc)
    }
    expect(fired).toBe(0)
    expect(getFocus()).toBe('skill_a')
  })
})

describe('apply_mark effect 结算', () => {
  it('selector 候选 → 设焦点', () => {
    const ctx: ResolveContext = {
      ...baseCtx,
      resolveSelector: () => ['skill_target'],
    }
    resolveEffect({ kind: 'apply_mark', selector: { type: 'self' } }, ctx)
    expect(getFocus()).toBe('skill_target')
  })

  it('无 resolveSelector → 退化标记宿主自身', () => {
    resolveEffect({ kind: 'apply_mark', selector: { type: 'self' } }, baseCtx)
    expect(getFocus()).toBe('skill_1')  // ctx.skillId 兜底
  })

  it('候选为空 → 不改焦点', () => {
    setFocus('skill_prev', 'x')
    const ctx: ResolveContext = { ...baseCtx, resolveSelector: () => [] }
    resolveEffect({ kind: 'apply_mark', selector: { type: 'all_skills' } }, ctx)
    expect(getFocus()).toBe('skill_prev')  // 维持不变
  })
})

describe('directed_scratch recipe', () => {
  it('已登记进 ALL_RECIPES', () => {
    expect(ALL_RECIPES).toContain(RECIPE_DIRECTED_SCRATCH)
    expect(RECIPE_DIRECTED_SCRATCH.kind).toBe('mark')
    expect(RECIPE_DIRECTED_SCRATCH.section).toBe('gesture')
  })

  it('生成形态：trigger 随机抽(排除高频 >100) · effect=apply_mark · selector 非 marked', () => {
    setSeededMode(0x4d41524b)  // 固定种子（"MARK"）
    try {
      for (let i = 0; i < 50; i++) {
        const { trigger, effect } = rollAffixV2Spec(RECIPE_DIRECTED_SCRATCH)
        // trigger 随机但被防洪水门控：期望频率不超 100/战（排除 on_key 等每键级 → 焦点不乱跳）
        expect(expectedFiresPerBattle(trigger)).toBeLessThanOrEqual(100)
        expect(effect.kind).toBe('apply_mark')
        if (effect.kind === 'apply_mark') {
          // 不应抽到 marked 自身（标记当前焦点 = no-op）
          expect(effect.selector.type).not.toBe('marked')
        }
      }
    } finally {
      setNormalMode()
    }
  })
})
