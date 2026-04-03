// ============================================
// 打字肉鸽 - critStreak / missStreak 基础设施测试
// ============================================
// Story 49.0

import { describe, it, expect } from 'vitest'
import { createSkillRuntimeState } from '../../../src/data/affixes'
import type { SkillRuntimeState } from '../../../src/data/affixes'

describe('SkillRuntimeState critStreak/missStreak', () => {
  it('should initialize critStreak and missStreak to 0', () => {
    const state = createSkillRuntimeState('test')
    expect(state.critStreak).toBe(0)
    expect(state.missStreak).toBe(0)
  })

  it('should have critStreak and missStreak fields', () => {
    const state = createSkillRuntimeState('test')
    expect('critStreak' in state).toBe(true)
    expect('missStreak' in state).toBe(true)
  })
})

describe('critStreak / missStreak update logic', () => {
  function simulateCritJudgment(state: SkillRuntimeState, isCrit: boolean, hasCritChance: boolean) {
    if (hasCritChance) {
      if (isCrit) {
        state.critStreak = (state.critStreak ?? 0) + 1
        state.missStreak = 0
      } else {
        state.missStreak = (state.missStreak ?? 0) + 1
        state.critStreak = 0
      }
    }
  }

  it('should increment critStreak on crit', () => {
    const state = createSkillRuntimeState('test')
    simulateCritJudgment(state, true, true)
    expect(state.critStreak).toBe(1)
    expect(state.missStreak).toBe(0)
  })

  it('should increment missStreak on miss', () => {
    const state = createSkillRuntimeState('test')
    simulateCritJudgment(state, false, true)
    expect(state.critStreak).toBe(0)
    expect(state.missStreak).toBe(1)
  })

  it('should accumulate consecutive crits', () => {
    const state = createSkillRuntimeState('test')
    simulateCritJudgment(state, true, true)
    simulateCritJudgment(state, true, true)
    simulateCritJudgment(state, true, true)
    expect(state.critStreak).toBe(3)
    expect(state.missStreak).toBe(0)
  })

  it('should accumulate consecutive misses', () => {
    const state = createSkillRuntimeState('test')
    simulateCritJudgment(state, false, true)
    simulateCritJudgment(state, false, true)
    simulateCritJudgment(state, false, true)
    expect(state.critStreak).toBe(0)
    expect(state.missStreak).toBe(3)
  })

  it('should reset critStreak on miss', () => {
    const state = createSkillRuntimeState('test')
    simulateCritJudgment(state, true, true)
    simulateCritJudgment(state, true, true)
    expect(state.critStreak).toBe(2)
    simulateCritJudgment(state, false, true)
    expect(state.critStreak).toBe(0)
    expect(state.missStreak).toBe(1)
  })

  it('should reset missStreak on crit', () => {
    const state = createSkillRuntimeState('test')
    simulateCritJudgment(state, false, true)
    simulateCritJudgment(state, false, true)
    expect(state.missStreak).toBe(2)
    simulateCritJudgment(state, true, true)
    expect(state.missStreak).toBe(0)
    expect(state.critStreak).toBe(1)
  })

  it('should not update when no crit chance', () => {
    const state = createSkillRuntimeState('test')
    simulateCritJudgment(state, false, false) // no crit affixes
    expect(state.critStreak).toBe(0)
    expect(state.missStreak).toBe(0)
  })

  it('should handle old saves without critStreak/missStreak (??0)', () => {
    const oldState = { skillId: 'old' } as any
    expect(oldState.critStreak ?? 0).toBe(0)
    expect(oldState.missStreak ?? 0).toBe(0)
  })
})
