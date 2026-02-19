// ============================================
// 打字肉鸽 - EffectQueue 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { EffectQueue, type QueuedEffect } from '../../../../src/systems/skills/active/EffectQueue'

describe('EffectQueue', () => {
  let queue: EffectQueue

  beforeEach(() => {
    queue = new EffectQueue()
    queue.clear()
  })

  const createEffect = (type: QueuedEffect['type'], value: number): QueuedEffect => ({
    type,
    value,
    sourceSkillId: 'test-skill',
    sourceKey: 'f'
  })

  describe('enqueue/dequeue', () => {
    it('应该按 FIFO 顺序处理', () => {
      queue.enqueue(createEffect('amplify', 1.5))
      queue.enqueue(createEffect('chain', 10))

      const first = queue.dequeue()
      expect(first?.type).toBe('amplify')

      const second = queue.dequeue()
      expect(second?.type).toBe('chain')
    })

    it('空队列 dequeue 应该返回 null', () => {
      expect(queue.dequeue()).toBeNull()
    })

    it('队列满时应该移除最旧的效果', () => {
      queue.setMaxSize(2)
      queue.enqueue(createEffect('amplify', 1))
      queue.enqueue(createEffect('amplify', 2))
      queue.enqueue(createEffect('amplify', 3))

      expect(queue.length).toBe(2)
      const first = queue.dequeue()
      expect(first?.value).toBe(2)
    })
  })

  describe('peek/peekAll', () => {
    it('peek 应该返回队首但不移除', () => {
      queue.enqueue(createEffect('amplify', 1.5))

      const peeked = queue.peek()
      expect(peeked?.value).toBe(1.5)
      expect(queue.length).toBe(1)
    })

    it('peekAll 应该返回副本', () => {
      queue.enqueue(createEffect('amplify', 1))
      queue.enqueue(createEffect('chain', 2))

      const all = queue.peekAll()
      expect(all).toHaveLength(2)
      all.pop()  // 修改副本
      expect(queue.length).toBe(2)  // 原队列不受影响
    })
  })

  describe('applyNext', () => {
    it('amplify 效果应该乘以基础值', () => {
      queue.enqueue(createEffect('amplify', 2))
      const result = queue.applyNext(10)
      expect(result.value).toBe(20)
    })

    it('chain 效果应该加上基础值', () => {
      queue.enqueue(createEffect('chain', 5))
      const result = queue.applyNext(10)
      expect(result.value).toBe(15)
    })

    it('transform 效果应该替换基础值', () => {
      queue.enqueue(createEffect('transform', 100))
      const result = queue.applyNext(10)
      expect(result.value).toBe(100)
    })

    it('空队列应该返回原值', () => {
      const result = queue.applyNext(10)
      expect(result.value).toBe(10)
      expect(result.appliedEffect).toBeNull()
    })
  })

  describe('applyAllMatching', () => {
    it('应该只应用匹配的效果', () => {
      queue.enqueue({ ...createEffect('ripple', 1.5), targetKey: 'a' })
      queue.enqueue({ ...createEffect('ripple', 2), targetKey: 'b' })
      queue.enqueue({ ...createEffect('chain', 10), targetKey: 'a' })

      const result = queue.applyAllMatching(10, e => e.targetKey === 'a')

      // ripple 1.5: 10 * 1.5 = 15
      // chain 10: 15 + 10 = 25
      expect(result.value).toBe(25)
      expect(queue.length).toBe(1)  // 只剩 targetKey: 'b'
    })
  })

  describe('clear', () => {
    it('应该清空队列', () => {
      queue.enqueue(createEffect('amplify', 1))
      queue.enqueue(createEffect('chain', 2))
      queue.clear()
      expect(queue.isEmpty).toBe(true)
    })
  })

  describe('properties', () => {
    it('isEmpty 应该正确反映状态', () => {
      expect(queue.isEmpty).toBe(true)
      queue.enqueue(createEffect('amplify', 1))
      expect(queue.isEmpty).toBe(false)
    })

    it('isFull 应该在达到 maxSize 时为 true', () => {
      queue.setMaxSize(2)
      queue.enqueue(createEffect('amplify', 1))
      expect(queue.isFull).toBe(false)
      queue.enqueue(createEffect('amplify', 2))
      expect(queue.isFull).toBe(true)
    })
  })

  describe('delay effect limit', () => {
    it('delay 效果应该重新入队并增加计数', () => {
      queue.enqueue(createEffect('delay', 0))
      const result = queue.applyNext(10)

      expect(result.value).toBe(10)
      expect(queue.length).toBe(1)

      const requeued = queue.peek()
      expect(requeued?.delayCount).toBe(1)
    })

    it('delay 效果达到上限后应该消失', () => {
      // 模拟已经延迟了 3 次的效果
      queue.enqueue({
        ...createEffect('delay', 0),
        delayCount: 3
      })

      const result = queue.applyNext(10)

      expect(result.value).toBe(10)
      expect(queue.length).toBe(0)  // 效果消失，不再入队
      expect(result.description).toContain('上限')
    })
  })
})
