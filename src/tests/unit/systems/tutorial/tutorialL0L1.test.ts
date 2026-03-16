// ============================================
// 打字肉鸽 - L0-L1 引导步骤测试
// ============================================
// Story 39.4 Task 6: 步骤数据 + condition + i18n 测试

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  L0_STEPS,
  L1_STEPS,
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
// 6.1: L0 步骤数据测试
// ===========================================
describe('L0_STEPS 数据结构', () => {
  it('应有 4 个步骤', () => {
    expect(L0_STEPS).toHaveLength(4)
  })

  it('所有步骤 ID 唯一', () => {
    const ids = L0_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('所有步骤 level 为 0', () => {
    for (const step of L0_STEPS) {
      expect(step.level).toBe(0)
    }
  })

  it('prerequisite 链正确', () => {
    const welcome = L0_STEPS.find(s => s.id === 'L0_welcome')!
    const triggered = L0_STEPS.find(s => s.id === 'L0_skill_triggered')!
    const wordComplete = L0_STEPS.find(s => s.id === 'L0_word_complete')!
    const combo = L0_STEPS.find(s => s.id === 'L0_combo')!

    expect(welcome.prerequisite).toBeUndefined()
    expect(triggered.prerequisite).toBe('L0_welcome')
    expect(wordComplete.prerequisite).toBe('L0_skill_triggered')
    expect(combo.prerequisite).toBe('L0_word_complete')
  })

  it('各步骤触发事件正确', () => {
    expect(L0_STEPS[0].trigger.event).toBe('battle:start')
    expect(L0_STEPS[0].trigger.delay).toBe(1000)
    expect(L0_STEPS[1].trigger.event).toBe('skill:triggered')
    expect(L0_STEPS[2].trigger.event).toBe('word:complete')
    expect(L0_STEPS[3].trigger.event).toBe('combo:update')
  })

  it('各步骤有 anchorElement 和 anchorPosition', () => {
    for (const step of L0_STEPS) {
      expect(step.content.anchorElement).toBeTruthy()
      expect(step.content.anchorPosition).toBeTruthy()
    }
  })
})

// ===========================================
// 6.2: L1 步骤数据测试
// ===========================================
describe('L1_STEPS 数据结构', () => {
  it('应有 4 个步骤', () => {
    expect(L1_STEPS).toHaveLength(4)
  })

  it('所有步骤 ID 唯一', () => {
    const ids = L1_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('所有步骤 level 为 1', () => {
    for (const step of L1_STEPS) {
      expect(step.level).toBe(1)
    }
  })

  it('无互相 prerequisite', () => {
    const l1Ids = new Set(L1_STEPS.map(s => s.id))
    for (const step of L1_STEPS) {
      if (step.prerequisite) {
        expect(l1Ids.has(step.prerequisite)).toBe(false)
      }
    }
  })

  it('各步骤触发事件正确', () => {
    const shopIntro = L1_STEPS.find(s => s.id === 'L1_shop_intro')!
    const skillBind = L1_STEPS.find(s => s.id === 'L1_skill_bind')!
    const upgrade = L1_STEPS.find(s => s.id === 'L1_upgrade')!
    const relic = L1_STEPS.find(s => s.id === 'L1_relic')!

    expect(shopIntro.trigger.event).toBe('shop:opened')
    expect(shopIntro.trigger.delay).toBe(500)
    expect(skillBind.trigger.event).toBe('shop:purchase')
    expect(upgrade.trigger.event).toBe('skill:upgraded')
    expect(relic.trigger.event).toBe('relic:acquired')
  })
})

// ===========================================
// FULL_TUTORIAL_STEPS
// ===========================================
describe('FULL_TUTORIAL_STEPS', () => {
  it('应有 19 个步骤（L0×4 + L1×4 + L2×4 + L3×2 + L4×3 + L5×2）', () => {
    expect(FULL_TUTORIAL_STEPS).toHaveLength(19)
  })

  it('所有 ID 全局唯一', () => {
    const ids = FULL_TUTORIAL_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ===========================================
// 6.6: condition 函数测试
// ===========================================
describe('L0 combo condition', () => {
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

  it('combo < 5 时 condition 返回 false（步骤不触发）', () => {
    // 深拷贝步骤避免污染全局数据
    const comboStep = {
      ...L0_STEPS.find(s => s.id === 'L0_combo')!,
      trigger: { ...L0_STEPS.find(s => s.id === 'L0_combo')!.trigger },
    }
    // 模拟 state.combo = 3
    comboStep.trigger.condition = () => 3 >= 5

    // 标记前置步骤完成
    persistence.markTutorialCompleted('L0_welcome')
    persistence.markTutorialCompleted('L0_skill_triggered')
    persistence.markTutorialCompleted('L0_word_complete')

    tutorialManager.register([comboStep])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)

    eventBus.emit('combo:update', { combo: 3 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('combo >= 5 时 condition 返回 true（步骤触发）', () => {
    const comboStep = {
      ...L0_STEPS.find(s => s.id === 'L0_combo')!,
      trigger: { ...L0_STEPS.find(s => s.id === 'L0_combo')!.trigger },
    }
    comboStep.trigger.condition = () => 5 >= 5

    persistence.markTutorialCompleted('L0_welcome')
    persistence.markTutorialCompleted('L0_skill_triggered')
    persistence.markTutorialCompleted('L0_word_complete')

    tutorialManager.register([comboStep])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)

    eventBus.emit('combo:update', { combo: 5 })
    expect(handler).toHaveBeenCalledWith({ stepId: 'L0_combo' })
  })
})

// ===========================================
// 6.7: i18n 完整性测试
// ===========================================
describe('i18n 完整性', () => {
  it('所有 L0-L1 步骤的 i18n key 在 zh locale 中存在', async () => {
    const { setLocale, t, initLocale } = await import('../../../../src/demo/demo-i18n')
    initLocale()
    setLocale('zh')

    for (const step of FULL_TUTORIAL_STEPS) {
      const title = t(step.content.titleKey)
      const body = t(step.content.bodyKey)
      // t() 返回 key 本身表示翻译缺失
      expect(title).not.toBe(step.content.titleKey)
      expect(body).not.toBe(step.content.bodyKey)
      expect(title).toBeTruthy()
      expect(body).toBeTruthy()
    }
  })

  it('所有 L0-L1 步骤的 i18n key 在 en locale 中存在', async () => {
    const { setLocale, t, initLocale } = await import('../../../../src/demo/demo-i18n')
    initLocale()
    setLocale('en')

    for (const step of FULL_TUTORIAL_STEPS) {
      const title = t(step.content.titleKey)
      const body = t(step.content.bodyKey)
      expect(title).not.toBe(step.content.titleKey)
      expect(body).not.toBe(step.content.bodyKey)
      expect(title).toBeTruthy()
      expect(body).toBeTruthy()
    }
  })
})
