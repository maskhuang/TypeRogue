// ============================================
// 打字肉鸽 - TimerBar 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from 'pixi.js'
import { TimerBar } from '../../../../src/ui/hud/TimerBar'

describe('TimerBar', () => {
  let timerBar: TimerBar
  const DEFAULT_WIDTH = 700

  beforeEach(() => {
    timerBar = new TimerBar(DEFAULT_WIDTH)
  })

  describe('初始化', () => {
    it('应该有正确的 label', () => {
      expect(timerBar.label).toBe('TimerBar')
    })

    it('应该继承自 Container', () => {
      expect(timerBar).toBeInstanceOf(Container)
    })

    it('应该创建背景、填充和文本', () => {
      // 背景 + 填充 + 文本 = 3 个子元素
      expect(timerBar.children.length).toBe(3)
    })

    it('默认总时间应该是 60 秒', () => {
      expect(timerBar.getTotalTime()).toBe(60)
    })

    it('默认当前时间应该是 60 秒', () => {
      expect(timerBar.getCurrentTime()).toBe(60)
    })
  })

  describe('setTotalTime', () => {
    it('应该更新总时间', () => {
      timerBar.setTotalTime(120)
      expect(timerBar.getTotalTime()).toBe(120)
    })

    it('应该同时更新当前时间', () => {
      timerBar.setTotalTime(90)
      expect(timerBar.getCurrentTime()).toBe(90)
    })
  })

  describe('setCurrentTime', () => {
    it('应该更新当前时间', () => {
      timerBar.setCurrentTime(45)
      expect(timerBar.getCurrentTime()).toBe(45)
    })

    it('不应该设置负数时间', () => {
      timerBar.setCurrentTime(-10)
      expect(timerBar.getCurrentTime()).toBe(0)
    })

    it('应该更新时间文本', () => {
      timerBar.setCurrentTime(30)
      expect(timerBar.getTimeText().text).toContain('30')
    })
  })

  describe('进度计算', () => {
    it('满时间时进度应该是 1', () => {
      timerBar.setTotalTime(60)
      timerBar.setCurrentTime(60)
      expect(timerBar.getProgress()).toBeCloseTo(1.0)
    })

    it('时间用尽时进度应该是 0', () => {
      timerBar.setTotalTime(60)
      timerBar.setCurrentTime(0)
      expect(timerBar.getProgress()).toBeCloseTo(0)
    })

    it('一半时间时进度应该是 0.5', () => {
      timerBar.setTotalTime(60)
      timerBar.setCurrentTime(30)
      expect(timerBar.getProgress()).toBeCloseTo(0.5)
    })
  })

  describe('警告状态 (<10 秒)', () => {
    it('时间 >= 10 秒时不应该是警告状态', () => {
      timerBar.setCurrentTime(10)
      expect(timerBar.isWarning()).toBe(false)
    })

    it('时间 < 10 秒时应该是警告状态', () => {
      timerBar.setCurrentTime(9)
      expect(timerBar.isWarning()).toBe(true)
    })

    it('时间 = 0 时应该是警告状态', () => {
      timerBar.setCurrentTime(0)
      expect(timerBar.isWarning()).toBe(true)
    })
  })

  describe('update (闪烁动画)', () => {
    it('非警告状态时 alpha 应该保持 1', () => {
      timerBar.setCurrentTime(30)
      timerBar.update(0.1)
      expect(timerBar.getBarFill().alpha).toBe(1)
    })

    it('警告状态时应该有闪烁效果', () => {
      timerBar.setCurrentTime(5)

      // 模拟多帧更新，检查 alpha 变化
      const alphas: number[] = []
      for (let i = 0; i < 20; i++) {
        timerBar.update(0.05)
        alphas.push(timerBar.getBarFill().alpha)
      }

      // alpha 应该有变化（不全是 1）
      const hasVariation = alphas.some(a => a !== 1)
      expect(hasVariation).toBe(true)
    })
  })

  describe('destroy', () => {
    it('应该正确销毁组件', () => {
      timerBar.destroy()
      expect(timerBar.destroyed).toBe(true)
    })

    it('应该清理子元素', () => {
      timerBar.destroy()
      expect(timerBar.children.length).toBe(0)
    })
  })
})
