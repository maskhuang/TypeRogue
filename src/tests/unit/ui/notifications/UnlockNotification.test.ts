// ============================================
// 打字肉鸽 - 解锁通知管理器单元测试
// ============================================
// Story 6.3: 解锁系统 - 通知组件测试

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UnlockNotificationManager } from '../../../../src/ui/notifications/UnlockNotification'
import type { UnlockNotificationData } from '../../../../src/ui/notifications/UnlockNotification'
import { eventBus } from '../../../../src/core/events/EventBus'

describe('UnlockNotificationManager', () => {
  let manager: UnlockNotificationManager

  beforeEach(() => {
    manager = new UnlockNotificationManager()
  })

  afterEach(() => {
    manager.dispose()
  })

  describe('事件监听', () => {
    it('应监听 unlock:new 事件', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('ui:show_notification', handler)

      eventBus.emit('unlock:new', {
        definition: {},
        type: 'skill',
        targetId: 'test_skill',
        name: '测试技能',
        description: '测试描述'
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'unlock',
          title: '解锁: 测试技能',
          message: '测试描述'
        })
      )

      unsubscribe()
    })

    it('技能解锁应显示技能图标', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('ui:show_notification', handler)

      eventBus.emit('unlock:new', {
        definition: {},
        type: 'skill',
        targetId: 'test_skill',
        name: '测试技能',
        description: '测试描述'
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'skill_icon'
        })
      )

      unsubscribe()
    })

    it('遗物解锁应显示遗物图标', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('ui:show_notification', handler)

      eventBus.emit('unlock:new', {
        definition: {},
        type: 'relic',
        targetId: 'test_relic',
        name: '测试遗物',
        description: '测试描述'
      })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'relic_icon'
        })
      )

      unsubscribe()
    })
  })

  describe('通知队列管理', () => {
    it('应将通知添加到队列', () => {
      const data: UnlockNotificationData = {
        type: 'skill',
        name: '测试技能',
        description: '测试描述'
      }

      manager.showNotification(data)

      const queue = manager.getQueue()
      expect(queue).toHaveLength(1)
      expect(queue[0]).toEqual(data)
    })

    it('多个通知应按顺序添加到队列', () => {
      manager.showNotification({ type: 'skill', name: '技能1', description: '描述1' })
      manager.showNotification({ type: 'relic', name: '遗物1', description: '描述2' })
      manager.showNotification({ type: 'skill', name: '技能2', description: '描述3' })

      const queue = manager.getQueue()
      expect(queue).toHaveLength(3)
      expect(queue[0].name).toBe('技能1')
      expect(queue[1].name).toBe('遗物1')
      expect(queue[2].name).toBe('技能2')
    })

    it('clearQueue 应清空队列', () => {
      manager.showNotification({ type: 'skill', name: '技能1', description: '描述1' })
      manager.showNotification({ type: 'skill', name: '技能2', description: '描述2' })

      expect(manager.getQueue()).toHaveLength(2)

      manager.clearQueue()

      expect(manager.getQueue()).toHaveLength(0)
    })

    it('getQueue 应返回副本不影响原队列', () => {
      manager.showNotification({ type: 'skill', name: '技能1', description: '描述1' })

      const queue1 = manager.getQueue()
      queue1.push({ type: 'relic', name: '遗物1', description: '描述2' })

      expect(manager.getQueue()).toHaveLength(1)
    })
  })

  describe('dispose 清理', () => {
    it('dispose 后不应再监听事件', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('ui:show_notification', handler)

      manager.dispose()

      eventBus.emit('unlock:new', {
        definition: {},
        type: 'skill',
        targetId: 'test_skill',
        name: '测试技能',
        description: '测试描述'
      })

      // 不应触发 showNotification（不会发出 ui:show_notification）
      // 注意：这里检查的是 manager 内部的事件监听被移除
      // 由于 dispose 只移除了 unlock:new 的监听，直接检查队列
      expect(manager.getQueue()).toHaveLength(0)

      unsubscribe()
    })

    it('dispose 应清空队列', () => {
      manager.showNotification({ type: 'skill', name: '技能1', description: '描述1' })
      expect(manager.getQueue()).toHaveLength(1)

      manager.dispose()

      expect(manager.getQueue()).toHaveLength(0)
    })

    it('重复调用 dispose 不应报错', () => {
      expect(() => {
        manager.dispose()
        manager.dispose()
      }).not.toThrow()
    })
  })
})
