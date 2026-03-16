// ============================================
// 打字肉鸽 - Demo 教程迁移测试
// ============================================
// Story 39.3 Task 8: 验证迁移数据完整性

import { describe, it, expect } from 'vitest'
import { DEMO_TUTORIAL_STEPS } from '../../../../src/data/tutorialSteps'

describe('DEMO_TUTORIAL_STEPS', () => {
  it('应有 3 个步骤', () => {
    expect(DEMO_TUTORIAL_STEPS).toHaveLength(3)
  })

  it('所有步骤 ID 唯一', () => {
    const ids = DEMO_TUTORIAL_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('所有步骤 level 为 0', () => {
    for (const step of DEMO_TUTORIAL_STEPS) {
      expect(step.level).toBe(0)
    }
  })

  it('第 1 步触发 battle:start', () => {
    expect(DEMO_TUTORIAL_STEPS[0].trigger.event).toBe('battle:start')
    expect(DEMO_TUTORIAL_STEPS[0].trigger.delay).toBe(1000)
    expect(DEMO_TUTORIAL_STEPS[0].prerequisite).toBeUndefined()
  })

  it('第 2 步触发 word:complete，前置为第 1 步', () => {
    expect(DEMO_TUTORIAL_STEPS[1].trigger.event).toBe('word:complete')
    expect(DEMO_TUTORIAL_STEPS[1].prerequisite).toBe('demo_step1_type')
  })

  it('第 3 步触发 shop:opened，前置为第 2 步', () => {
    expect(DEMO_TUTORIAL_STEPS[2].trigger.event).toBe('shop:opened')
    expect(DEMO_TUTORIAL_STEPS[2].prerequisite).toBe('demo_step2_skill')
  })

  it('所有步骤有 content 的 titleKey 和 bodyKey', () => {
    for (const step of DEMO_TUTORIAL_STEPS) {
      expect(step.content.titleKey).toBeTruthy()
      expect(step.content.bodyKey).toBeTruthy()
    }
  })

  it('prerequisite 链正确连接', () => {
    // step2 → step1, step3 → step2
    const step1 = DEMO_TUTORIAL_STEPS.find(s => s.id === 'demo_step1_type')!
    const step2 = DEMO_TUTORIAL_STEPS.find(s => s.id === 'demo_step2_skill')!
    const step3 = DEMO_TUTORIAL_STEPS.find(s => s.id === 'demo_step3_shop')!

    expect(step1.prerequisite).toBeUndefined()
    expect(step2.prerequisite).toBe(step1.id)
    expect(step3.prerequisite).toBe(step2.id)
  })
})
