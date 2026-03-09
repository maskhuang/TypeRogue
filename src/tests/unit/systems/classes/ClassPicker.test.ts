// ============================================
// 打字肉鸽 - ClassPicker 单元测试
// ============================================
// Story 32.1 Code Review: ClassPicker 基础测试

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { eventBus } from '../../../../src/core/events/EventBus'

describe('ClassPicker', () => {
  beforeEach(() => {
    eventBus.clear()
    // 模拟 document.getElementById 返回 null（无 DOM 元素场景）
    ;(globalThis as any).document = {
      getElementById: () => null,
    }
  })

  afterEach(() => {
    delete (globalThis as any).document
    eventBus.clear()
  })

  // ===========================================
  // 无 DOM 环境 fallback 测试
  // ===========================================
  describe('showClassPicker (no DOM elements)', () => {
    it('DOM 元素不存在时应直接调用 onComplete', async () => {
      const { showClassPicker } = await import('../../../../src/systems/classes/ClassPicker')
      const { MetaState } = await import('../../../../src/core/state/MetaState')
      const metaState = new MetaState()
      const onComplete = vi.fn()
      showClassPicker(metaState, onComplete)
      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('DOM 元素不存在时不应抛出异常', async () => {
      const { showClassPicker } = await import('../../../../src/systems/classes/ClassPicker')
      const { MetaState } = await import('../../../../src/core/state/MetaState')
      const metaState = new MetaState()
      expect(() => {
        showClassPicker(metaState, () => {})
      }).not.toThrow()
    })
  })
})
