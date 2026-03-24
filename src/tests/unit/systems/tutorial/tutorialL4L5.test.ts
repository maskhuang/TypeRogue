// ============================================
// 打字肉鸽 - L4-L5 引导步骤测试
// ============================================
// Story 39.6 Task 8: 步骤数据 + condition + paramsProvider + i18n 测试

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  L4_STEPS,
  L5_STEPS,
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
// L4 步骤数据测试
// ===========================================
describe('L4_STEPS 数据结构', () => {
  it('应有 3 个步骤', () => {
    expect(L4_STEPS).toHaveLength(3)
  })

  it('所有步骤 ID 唯一', () => {
    const ids = L4_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('所有步骤 level 为 4', () => {
    for (const step of L4_STEPS) {
      expect(step.level).toBe(4)
    }
  })

  it('所有步骤均使用 battle:start 事件', () => {
    for (const step of L4_STEPS) {
      expect(step.trigger.event).toBe('battle:start')
    }
  })

  it('所有步骤 delay 为 1500ms', () => {
    for (const step of L4_STEPS) {
      expect(step.trigger.delay).toBe(1500)
    }
  })

  it('包含正确的步骤 ID', () => {
    const ids = L4_STEPS.map(s => s.id)
    expect(ids).toContain('L4_elite_intro')
    expect(ids).toContain('L4_boss_intro')
    expect(ids).toContain('L4_modifier_explain')
  })

  it('L4_boss_intro 前置为 L4_elite_intro', () => {
    const bossIntro = L4_STEPS.find(s => s.id === 'L4_boss_intro')!
    expect(bossIntro.prerequisite).toBe('L4_elite_intro')
  })

  it('L4_modifier_explain 前置为 L4_elite_intro', () => {
    const modExplain = L4_STEPS.find(s => s.id === 'L4_modifier_explain')!
    expect(modExplain.prerequisite).toBe('L4_elite_intro')
  })

  it('L4_elite_intro 无前置', () => {
    const eliteIntro = L4_STEPS.find(s => s.id === 'L4_elite_intro')!
    expect(eliteIntro.prerequisite).toBeUndefined()
  })

  it('各步骤有 anchorElement 和 anchorPosition', () => {
    for (const step of L4_STEPS) {
      expect(step.content.anchorElement).toBeTruthy()
      expect(step.content.anchorPosition).toBeTruthy()
    }
  })
})

// ===========================================
// L5 步骤数据测试
// ===========================================
describe('L5_STEPS 数据结构', () => {
  it('应有 2 个步骤', () => {
    expect(L5_STEPS).toHaveLength(2)
  })

  it('所有步骤 ID 唯一', () => {
    const ids = L5_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('所有步骤 level 为 5', () => {
    for (const step of L5_STEPS) {
      expect(step.level).toBe(5)
    }
  })

  it('各步骤触发事件正确', () => {
    const classUnlock = L5_STEPS.find(s => s.id === 'L5_class_unlock')!
    const classResource = L5_STEPS.find(s => s.id === 'L5_class_resource')!

    expect(classUnlock.trigger.event).toBe('meta:class_unlocked')
    expect(classResource.trigger.event).toBe('skill:triggered')
  })

  it('L5_class_resource 前置为 L5_class_unlock', () => {
    const classResource = L5_STEPS.find(s => s.id === 'L5_class_resource')!
    expect(classResource.prerequisite).toBe('L5_class_unlock')
  })

  it('L5_class_unlock 无前置', () => {
    const classUnlock = L5_STEPS.find(s => s.id === 'L5_class_unlock')!
    expect(classUnlock.prerequisite).toBeUndefined()
  })

  it('各步骤有 anchorElement 和 anchorPosition', () => {
    for (const step of L5_STEPS) {
      expect(step.content.anchorElement).toBeTruthy()
      expect(step.content.anchorPosition).toBeTruthy()
    }
  })
})

// ===========================================
// L4 condition 函数测试
// ===========================================
describe('L4 condition 注入测试', () => {
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

  it('L4_elite_intro: 精英关时触发', () => {
    const step = {
      ...L4_STEPS.find(s => s.id === 'L4_elite_intro')!,
      trigger: { ...L4_STEPS.find(s => s.id === 'L4_elite_intro')!.trigger, delay: 0 },
    }
    step.trigger.condition = () => true
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('battle:start', { stageId: 3 })
    expect(handler).toHaveBeenCalledWith({ stepId: 'L4_elite_intro' })
  })

  it('L4_elite_intro: 非精英关时不触发', () => {
    const step = {
      ...L4_STEPS.find(s => s.id === 'L4_elite_intro')!,
      trigger: { ...L4_STEPS.find(s => s.id === 'L4_elite_intro')!.trigger, delay: 0 },
    }
    step.trigger.condition = () => false
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('battle:start', { stageId: 1 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('L4_boss_intro: Boss 关 + 前置完成时触发', () => {
    persistence.markTutorialCompleted('L4_elite_intro')

    const step = {
      ...L4_STEPS.find(s => s.id === 'L4_boss_intro')!,
      trigger: { ...L4_STEPS.find(s => s.id === 'L4_boss_intro')!.trigger, delay: 0 },
    }
    step.trigger.condition = () => true
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('battle:start', { stageId: 10 })
    expect(handler).toHaveBeenCalledWith({ stepId: 'L4_boss_intro' })
  })

  it('L4_boss_intro: 前置未完成时不触发', () => {
    const step = {
      ...L4_STEPS.find(s => s.id === 'L4_boss_intro')!,
      trigger: { ...L4_STEPS.find(s => s.id === 'L4_boss_intro')!.trigger, delay: 0 },
    }
    step.trigger.condition = () => true
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('battle:start', { stageId: 10 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('L4_modifier_explain: 有修饰器时触发', () => {
    persistence.markTutorialCompleted('L4_elite_intro')

    const step = {
      ...L4_STEPS.find(s => s.id === 'L4_modifier_explain')!,
      trigger: { ...L4_STEPS.find(s => s.id === 'L4_modifier_explain')!.trigger, delay: 0 },
    }
    step.trigger.condition = () => true
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('battle:start', { stageId: 3 })
    expect(handler).toHaveBeenCalledWith({ stepId: 'L4_modifier_explain' })
  })

  it('L4_modifier_explain: 无修饰器时不触发', () => {
    persistence.markTutorialCompleted('L4_elite_intro')

    const step = {
      ...L4_STEPS.find(s => s.id === 'L4_modifier_explain')!,
      trigger: { ...L4_STEPS.find(s => s.id === 'L4_modifier_explain')!.trigger, delay: 0 },
    }
    step.trigger.condition = () => false
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('battle:start', { stageId: 1 })
    expect(handler).not.toHaveBeenCalled()
  })
})

// ===========================================
// L5 condition 函数测试
// ===========================================
describe('L5 condition 注入测试', () => {
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

  it('L5_class_unlock: meta:class_unlocked 事件触发', () => {
    const step = {
      ...L5_STEPS.find(s => s.id === 'L5_class_unlock')!,
      trigger: { ...L5_STEPS.find(s => s.id === 'L5_class_unlock')!.trigger },
    }
    // 无额外 condition
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('meta:class_unlocked', { classId: 'wordsmith' })
    expect(handler).toHaveBeenCalledWith({ stepId: 'L5_class_unlock' })
  })

  it('L5_class_resource: 职业 Run 中触发', () => {
    persistence.markTutorialCompleted('L5_class_unlock')

    const step = {
      ...L5_STEPS.find(s => s.id === 'L5_class_resource')!,
      trigger: { ...L5_STEPS.find(s => s.id === 'L5_class_resource')!.trigger },
    }
    step.trigger.condition = () => true
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('skill:triggered', { skillId: 'test' })
    expect(handler).toHaveBeenCalledWith({ stepId: 'L5_class_resource' })
  })

  it('L5_class_resource: 非职业 Run 时不触发', () => {
    persistence.markTutorialCompleted('L5_class_unlock')

    const step = {
      ...L5_STEPS.find(s => s.id === 'L5_class_resource')!,
      trigger: { ...L5_STEPS.find(s => s.id === 'L5_class_resource')!.trigger },
    }
    step.trigger.condition = () => false
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('skill:triggered', { skillId: 'test' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('L5_class_resource: 前置未完成时不触发', () => {
    const step = {
      ...L5_STEPS.find(s => s.id === 'L5_class_resource')!,
      trigger: { ...L5_STEPS.find(s => s.id === 'L5_class_resource')!.trigger },
    }
    step.trigger.condition = () => true
    tutorialManager.register([step])
    tutorialManager.start()

    const handler = vi.fn()
    eventBus.on('tutorial:step_shown', handler)
    eventBus.emit('skill:triggered', { skillId: 'test' })
    expect(handler).not.toHaveBeenCalled()
  })
})

// ===========================================
// paramsProvider 测试
// ===========================================
describe('L4_modifier_explain paramsProvider', () => {
  it('L4_modifier_explain 步骤数据中无默认 paramsProvider', () => {
    const step = L4_STEPS.find(s => s.id === 'L4_modifier_explain')!
    // paramsProvider 在 tutorialInit 中注入，步骤数据中不应有
    expect(step.content.paramsProvider).toBeUndefined()
  })

  it('TutorialContent 接口支持 paramsProvider', () => {
    const original = L4_STEPS.find(s => s.id === 'L4_modifier_explain')!
    // 使用浅拷贝避免修改共享数据
    const step = { ...original, content: { ...original.content } }
    step.content.paramsProvider = () => ({ name: 'Test Mod', desc: 'Test Desc' })
    const params = step.content.paramsProvider()
    expect(params).toEqual({ name: 'Test Mod', desc: 'Test Desc' })
    // 原始数据不应被修改
    expect(original.content.paramsProvider).toBeUndefined()
  })
})

// ===========================================
// i18n 完整性测试
// ===========================================
describe('L4-L5 i18n 完整性', () => {
  it('所有 L4-L5 步骤的 i18n key 在 zh locale 中存在', async () => {
    const { setLocale, t, initLocale } = await import('../../../../src/demo/demo-i18n')
    initLocale()
    setLocale('zh')

    const steps = [...L4_STEPS, ...L5_STEPS]
    for (const step of steps) {
      const title = t(step.content.titleKey)
      const body = t(step.content.bodyKey)
      expect(title).not.toBe(step.content.titleKey)
      expect(body).not.toBe(step.content.bodyKey)
      expect(title).toBeTruthy()
      expect(body).toBeTruthy()
    }
  })

  it('所有 L4-L5 步骤的 i18n key 在 en locale 中存在', async () => {
    const { setLocale, t, initLocale } = await import('../../../../src/demo/demo-i18n')
    initLocale()
    setLocale('en')

    const steps = [...L4_STEPS, ...L5_STEPS]
    for (const step of steps) {
      const title = t(step.content.titleKey)
      const body = t(step.content.bodyKey)
      expect(title).not.toBe(step.content.titleKey)
      expect(body).not.toBe(step.content.bodyKey)
      expect(title).toBeTruthy()
      expect(body).toBeTruthy()
    }
  })

  it('FULL_TUTORIAL_STEPS 包含所有 L4-L5 步骤 ID', () => {
    const fullIds = new Set(FULL_TUTORIAL_STEPS.map(s => s.id))
    const l4l5Steps = [...L4_STEPS, ...L5_STEPS]
    for (const step of l4l5Steps) {
      expect(fullIds.has(step.id)).toBe(true)
    }
  })

  it('FULL_TUTORIAL_STEPS 总数为 20', () => {
    expect(FULL_TUTORIAL_STEPS.length).toBe(20)
  })

  it('settings i18n keys 在 zh locale 中存在', async () => {
    const { setLocale, t, initLocale } = await import('../../../../src/demo/demo-i18n')
    initLocale()
    setLocale('zh')

    const keys = [
      'settings.tutorial_section',
      'settings.tutorial_toggle',
      'settings.tutorial_reset',
      'settings.tutorial_reset_confirm',
      'settings.confirm',
      'settings.cancel',
    ]
    for (const key of keys) {
      const val = t(key)
      expect(val).not.toBe(key)
      expect(val).toBeTruthy()
    }
  })
})

// ===========================================
// GLOSSARY_DATA 完整性测试
// ===========================================
describe('GLOSSARY_DATA 完整性', () => {
  // 延迟 import 避免 DOM mock 冲突
  let GLOSSARY_DATA: import('../../../../src/ui/HelpPanel').GlossaryEntry[]

  beforeEach(async () => {
    const mod = await import('../../../../src/ui/HelpPanel')
    GLOSSARY_DATA = mod.GLOSSARY_DATA
  })

  it('所有条目 id 唯一', () => {
    const ids = GLOSSARY_DATA.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('所有条目有 icon', () => {
    for (const entry of GLOSSARY_DATA) {
      expect(entry.icon).toBeTruthy()
    }
  })

  it('nameKey 和 descKey 不应相同', () => {
    for (const entry of GLOSSARY_DATA) {
      expect(entry.descKey).not.toBe(entry.nameKey)
    }
  })

  it('所有 nameKey 在 zh locale 中存在', async () => {
    const { setLocale, t, initLocale } = await import('../../../../src/demo/demo-i18n')
    initLocale()
    setLocale('zh')

    for (const entry of GLOSSARY_DATA) {
      const name = t(entry.nameKey)
      expect(name).not.toBe(entry.nameKey)
      expect(name).toBeTruthy()
    }
  })

  it('所有 descKey 在 zh locale 中存在', async () => {
    const { setLocale, t, initLocale } = await import('../../../../src/demo/demo-i18n')
    initLocale()
    setLocale('zh')

    for (const entry of GLOSSARY_DATA) {
      const desc = t(entry.descKey)
      expect(desc).not.toBe(entry.descKey)
      expect(desc).toBeTruthy()
    }
  })

  it('覆盖 6 个类别', () => {
    const categories = new Set(GLOSSARY_DATA.map(e => e.category))
    expect(categories.size).toBe(6)
    expect(categories).toContain('affix')
    expect(categories).toContain('enchantment')
    expect(categories).toContain('position')
    expect(categories).toContain('resource')
    expect(categories).toContain('modifier')
    expect(categories).toContain('rarity')
  })
})
