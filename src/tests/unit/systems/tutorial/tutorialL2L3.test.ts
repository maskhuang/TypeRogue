// ============================================
// 打字肉鸽 - L2-L3 引导步骤测试
// ============================================
// Story 39.5 Task 4: 步骤数据 + condition + i18n 测试

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  L2_STEPS,
  L3_STEPS,
  FULL_TUTORIAL_STEPS,
} from '../../../../src/data/tutorialSteps'
import { eventBus } from '../../../../src/core/events/EventBus'
import { tutorialManager } from '../../../../src/systems/tutorial/TutorialManager'
import type { TutorialPersistence } from '../../../../src/systems/tutorial/TutorialManager'

// TutorialOverlay DOM mock
vi.mock('../../../../src/systems/tutorial/TutorialOverlay', () => {
  return {
    TutorialOverlay: vi.fn().mockImplementation((opts: { onDismiss: (neverShow: boolean) => void }) => {
      let visible = false
      return {
        show: vi.fn(() => { visible = true }),
        dismiss: vi.fn((neverShow: boolean) => {
          visible = false
          opts.onDismiss(neverShow)
        }),
        isVisible: vi.fn(() => visible),
      }
    }),
  }
})

// ===========================================
// L2 步骤数据测试
// ===========================================
describe('L2_STEPS 数据结构', () => {
  it('应有 4 个步骤', () => {
    expect(L2_STEPS).toHaveLength(4)
  })

  it('所有步骤 ID 唯一', () => {
    const ids = L2_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('所有步骤 level 为 2', () => {
    for (const step of L2_STEPS) {
      expect(step.level).toBe(2)
    }
  })

  it('所有步骤均使用 shop:purchase 事件', () => {
    for (const step of L2_STEPS) {
      expect(step.trigger.event).toBe('shop:purchase')
    }
  })

  it('dismissAfter 为 8000ms', () => {
    for (const step of L2_STEPS) {
      expect(step.dismissAfter).toBe(8000)
    }
  })

  it('各步骤有 anchorElement 和 anchorPosition', () => {
    for (const step of L2_STEPS) {
      expect(step.content.anchorElement).toBeTruthy()
      expect(step.content.anchorPosition).toBeTruthy()
    }
  })

  it('包含正确的步骤 ID', () => {
    const ids = L2_STEPS.map(s => s.id)
    expect(ids).toContain('L2_affix_intro')
    expect(ids).toContain('L2_affix_positional')
    expect(ids).toContain('L2_affix_variety')
    expect(ids).toContain('L2_rarity_explain')
  })
})

// ===========================================
// L3 步骤数据测试
// ===========================================
describe('L3_STEPS 数据结构', () => {
  it('应有 2 个步骤', () => {
    expect(L3_STEPS).toHaveLength(2)
  })

  it('所有步骤 ID 唯一', () => {
    const ids = L3_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('所有步骤 level 为 3', () => {
    for (const step of L3_STEPS) {
      expect(step.level).toBe(3)
    }
  })

  it('各步骤触发事件正确', () => {
    const enchantUnlock = L3_STEPS.find(s => s.id === 'L3_enchant_unlock')!
    const enchantGrowth = L3_STEPS.find(s => s.id === 'L3_enchant_growth')!

    expect(enchantUnlock.trigger.event).toBe('skill:upgraded')
    expect(enchantGrowth.trigger.event).toBe('skill:triggered')
  })

  it('L3_enchant_growth 前置为 L3_enchant_unlock', () => {
    const enchantGrowth = L3_STEPS.find(s => s.id === 'L3_enchant_growth')!
    expect(enchantGrowth.prerequisite).toBe('L3_enchant_unlock')
  })

  it('L3_enchant_unlock 无前置', () => {
    const enchantUnlock = L3_STEPS.find(s => s.id === 'L3_enchant_unlock')!
    expect(enchantUnlock.prerequisite).toBeUndefined()
  })

  it('各步骤有 anchorElement 和 anchorPosition', () => {
    for (const step of L3_STEPS) {
      expect(step.content.anchorElement).toBeTruthy()
      expect(step.content.anchorPosition).toBeTruthy()
    }
  })
})

// ===========================================
// L2 condition 函数测试
// ===========================================
describe('L2 condition 注入测试', () => {
  let persistence: TutorialPersistence

  beforeEach(() => {
    eventBus.clear()
    tutorialManager._testReset()
    const completed = new Set<string>()
    persistence = {
      isTutorialCompleted: vi.fn((id: string) => completed.has(id)),
      markTutorialCompleted: vi.fn((id: string) => completed.add(id)),
      resetTutorials: vi.fn(() => completed.clear()),
    }
    tutorialManager.setPersistence(persistence)
  })

  afterEach(() => {
    tutorialManager.stop()
    eventBus.clear()
  })

  it('L2_affix_intro: rarity < 1 时不触发', () => {
    const step = {
      ...L2_STEPS.find(s => s.id === 'L2_affix_intro')!,
      trigger: { ...L2_STEPS.find(s => s.id === 'L2_affix_intro')!.trigger },
    }
    step.trigger.condition = () => 0 >= 1
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('shop:purchase', { type: 'skill', itemId: 'test' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('L2_affix_intro: rarity >= 1 时触发', () => {
    const step = {
      ...L2_STEPS.find(s => s.id === 'L2_affix_intro')!,
      trigger: { ...L2_STEPS.find(s => s.id === 'L2_affix_intro')!.trigger },
    }
    step.trigger.condition = () => 1 >= 1
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('shop:purchase', { type: 'skill', itemId: 'test' })
    expect(handler).toHaveBeenCalledWith({ stepId: 'L2_affix_intro' })
  })

  it('L2_affix_positional: 无拓扑词条时不触发', () => {
    const step = {
      ...L2_STEPS.find(s => s.id === 'L2_affix_positional')!,
      trigger: { ...L2_STEPS.find(s => s.id === 'L2_affix_positional')!.trigger },
    }
    step.trigger.condition = () => false
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('shop:purchase', { type: 'skill', itemId: 'test' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('L2_affix_positional: 有拓扑词条时触发', () => {
    const step = {
      ...L2_STEPS.find(s => s.id === 'L2_affix_positional')!,
      trigger: { ...L2_STEPS.find(s => s.id === 'L2_affix_positional')!.trigger },
    }
    step.trigger.condition = () => true
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('shop:purchase', { type: 'skill', itemId: 'test' })
    expect(handler).toHaveBeenCalledWith({ stepId: 'L2_affix_positional' })
  })

  it('L2_rarity_explain: rarity < 3 时不触发', () => {
    const step = {
      ...L2_STEPS.find(s => s.id === 'L2_rarity_explain')!,
      trigger: { ...L2_STEPS.find(s => s.id === 'L2_rarity_explain')!.trigger },
    }
    step.trigger.condition = () => 2 >= 3
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('shop:purchase', { type: 'skill', itemId: 'test' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('L2_rarity_explain: rarity >= 3 时触发', () => {
    const step = {
      ...L2_STEPS.find(s => s.id === 'L2_rarity_explain')!,
      trigger: { ...L2_STEPS.find(s => s.id === 'L2_rarity_explain')!.trigger },
    }
    step.trigger.condition = () => 3 >= 3
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('shop:purchase', { type: 'skill', itemId: 'test' })
    expect(handler).toHaveBeenCalledWith({ stepId: 'L2_rarity_explain' })
  })
})

// ===========================================
// L3 condition 函数测试
// ===========================================
describe('L3 condition 注入测试', () => {
  let persistence: TutorialPersistence

  beforeEach(() => {
    eventBus.clear()
    tutorialManager._testReset()
    const completed = new Set<string>()
    persistence = {
      isTutorialCompleted: vi.fn((id: string) => completed.has(id)),
      markTutorialCompleted: vi.fn((id: string) => completed.add(id)),
      resetTutorials: vi.fn(() => completed.clear()),
    }
    tutorialManager.setPersistence(persistence)
  })

  afterEach(() => {
    tutorialManager.stop()
    eventBus.clear()
  })

  it('L3_enchant_unlock: 未达到附魔等级时不触发', () => {
    const step = {
      ...L3_STEPS.find(s => s.id === 'L3_enchant_unlock')!,
      trigger: { ...L3_STEPS.find(s => s.id === 'L3_enchant_unlock')!.trigger },
    }
    step.trigger.condition = () => 2 >= 3
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('skill:upgraded', { skillId: 'test', newLevel: 2 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('L3_enchant_unlock: 达到附魔等级时触发', () => {
    const step = {
      ...L3_STEPS.find(s => s.id === 'L3_enchant_unlock')!,
      trigger: { ...L3_STEPS.find(s => s.id === 'L3_enchant_unlock')!.trigger },
    }
    step.trigger.condition = () => 3 >= 3
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('skill:upgraded', { skillId: 'test', newLevel: 3 })
    expect(handler).toHaveBeenCalledWith({ stepId: 'L3_enchant_unlock' })
  })

  it('L3_enchant_growth: 前置未完成时不触发', () => {
    const step = {
      ...L3_STEPS.find(s => s.id === 'L3_enchant_growth')!,
      trigger: { ...L3_STEPS.find(s => s.id === 'L3_enchant_growth')!.trigger },
    }
    step.trigger.condition = () => true
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('skill:triggered', { skillId: 'test', growthValue: 5 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('L3_enchant_growth: 前置完成 + growth 时触发', () => {
    persistence.markTutorialCompleted('L3_enchant_unlock')

    const step = {
      ...L3_STEPS.find(s => s.id === 'L3_enchant_growth')!,
      trigger: { ...L3_STEPS.find(s => s.id === 'L3_enchant_growth')!.trigger },
    }
    step.trigger.condition = () => true
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('skill:triggered', { skillId: 'test', growthValue: 5 })
    expect(handler).toHaveBeenCalledWith({ stepId: 'L3_enchant_growth' })
  })

  it('L3_enchant_growth: 无 growth 时不触发', () => {
    persistence.markTutorialCompleted('L3_enchant_unlock')

    const step = {
      ...L3_STEPS.find(s => s.id === 'L3_enchant_growth')!,
      trigger: { ...L3_STEPS.find(s => s.id === 'L3_enchant_growth')!.trigger },
    }
    step.trigger.condition = () => false
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('skill:triggered', { skillId: 'test' })
    expect(handler).not.toHaveBeenCalled()
  })
})

// ===========================================
// i18n 完整性测试
// ===========================================
describe('L2-L3 i18n 完整性', () => {
  it('所有 L2-L3 步骤的 i18n key 在 zh locale 中存在', async () => {
    const { setLocale, t, initLocale } = await import('../../../../src/demo/demo-i18n')
    initLocale()
    setLocale('zh')

    const steps = [...L2_STEPS, ...L3_STEPS]
    for (const step of steps) {
      const title = t(step.content.titleKey)
      const body = t(step.content.bodyKey)
      expect(title).not.toBe(step.content.titleKey)
      expect(body).not.toBe(step.content.bodyKey)
      expect(title).toBeTruthy()
      expect(body).toBeTruthy()
    }
  })

  it('所有 L2-L3 步骤的 i18n key 在 en locale 中存在', async () => {
    const { setLocale, t, initLocale } = await import('../../../../src/demo/demo-i18n')
    initLocale()
    setLocale('en')

    const steps = [...L2_STEPS, ...L3_STEPS]
    for (const step of steps) {
      const title = t(step.content.titleKey)
      const body = t(step.content.bodyKey)
      expect(title).not.toBe(step.content.titleKey)
      expect(body).not.toBe(step.content.bodyKey)
      expect(title).toBeTruthy()
      expect(body).toBeTruthy()
    }
  })

  it('FULL_TUTORIAL_STEPS 包含所有 L2-L3 步骤 ID', () => {
    const fullIds = new Set(FULL_TUTORIAL_STEPS.map(s => s.id))
    const l2l3Steps = [...L2_STEPS, ...L3_STEPS]
    for (const step of l2l3Steps) {
      expect(fullIds.has(step.id)).toBe(true)
    }
  })
})
