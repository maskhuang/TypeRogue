// ============================================
// 打字肉鸽 - ScoreDisplay 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from 'pixi.js'
import { ScoreDisplay } from '../../../../src/ui/hud/ScoreDisplay'

describe('ScoreDisplay', () => {
  let scoreDisplay: ScoreDisplay

  beforeEach(() => {
    scoreDisplay = new ScoreDisplay()
  })

  describe('初始化', () => {
    it('应该有正确的 label', () => {
      expect(scoreDisplay.label).toBe('ScoreDisplay')
    })

    it('应该继承自 Container', () => {
      expect(scoreDisplay).toBeInstanceOf(Container)
    })

    it('初始分数应该是 0', () => {
      expect(scoreDisplay.getDisplayedScore()).toBe(0)
    })

    it('应该创建分数和倍率文本', () => {
      expect(scoreDisplay.children.length).toBe(2)
    })

    it('初始分数文本应该是 0', () => {
      expect(scoreDisplay.getScoreText().text).toBe('0')
    })

    it('初始倍率应该是 x1.0', () => {
      expect(scoreDisplay.getMultiplierText().text).toBe('x1.0')
    })
  })

  describe('setScore', () => {
    it('应该更新目标分数', () => {
      scoreDisplay.setScore(1000)
      expect(scoreDisplay.getTargetScore()).toBe(1000)
    })

    it('多次调用应该更新到最新值', () => {
      scoreDisplay.setScore(100)
      scoreDisplay.setScore(500)
      scoreDisplay.setScore(1500)
      expect(scoreDisplay.getTargetScore()).toBe(1500)
    })
  })

  describe('setMultiplier', () => {
    it('应该更新倍率文本', () => {
      scoreDisplay.setMultiplier(2.5)
      expect(scoreDisplay.getMultiplierText().text).toBe('x2.5')
    })

    it('应该正确格式化小数', () => {
      scoreDisplay.setMultiplier(1.0)
      expect(scoreDisplay.getMultiplierText().text).toBe('x1.0')
    })

    it('应该处理整数倍率', () => {
      scoreDisplay.setMultiplier(3)
      expect(scoreDisplay.getMultiplierText().text).toBe('x3.0')
    })
  })

  describe('update (动画过渡)', () => {
    it('分数应该逐渐接近目标值', () => {
      scoreDisplay.setScore(100)
      scoreDisplay.update(0.1) // 100ms

      const displayed = scoreDisplay.getDisplayedScore()
      expect(displayed).toBeGreaterThan(0)
      expect(displayed).toBeLessThanOrEqual(100)
    })

    it('多次 update 后应该达到目标值', () => {
      scoreDisplay.setScore(100)

      // 模拟多帧更新
      for (let i = 0; i < 20; i++) {
        scoreDisplay.update(0.1)
      }

      expect(scoreDisplay.getDisplayedScore()).toBe(100)
    })

    it('目标值和显示值相同时不应更新', () => {
      scoreDisplay.setScore(0) // 初始目标就是 0
      const initialDisplayed = scoreDisplay.getDisplayedScore()
      scoreDisplay.update(0.1)
      expect(scoreDisplay.getDisplayedScore()).toBe(initialDisplayed)
    })

    it('分数减少时也应该正确过渡', () => {
      // 先设置一个高分并完成动画
      scoreDisplay.setScore(1000)
      for (let i = 0; i < 50; i++) {
        scoreDisplay.update(0.1)
      }
      expect(scoreDisplay.getDisplayedScore()).toBe(1000)

      // 然后减少分数
      scoreDisplay.setScore(500)
      scoreDisplay.update(0.1)

      const displayed = scoreDisplay.getDisplayedScore()
      expect(displayed).toBeLessThan(1000)
      expect(displayed).toBeGreaterThanOrEqual(500)
    })
  })

  describe('formatScore (千位分隔符)', () => {
    it('应该为大数字添加分隔符', () => {
      scoreDisplay.setScore(12345)
      for (let i = 0; i < 50; i++) {
        scoreDisplay.update(0.1)
      }

      expect(scoreDisplay.getScoreText().text).toBe('12,345')
    })

    it('小于 1000 的数字不应有分隔符', () => {
      scoreDisplay.setScore(999)
      for (let i = 0; i < 50; i++) {
        scoreDisplay.update(0.1)
      }

      expect(scoreDisplay.getScoreText().text).toBe('999')
    })

    it('应该正确处理百万级数字', () => {
      scoreDisplay.setScore(1234567)
      for (let i = 0; i < 100; i++) {
        scoreDisplay.update(0.1)
      }

      expect(scoreDisplay.getScoreText().text).toBe('1,234,567')
    })
  })

  describe('destroy', () => {
    it('应该正确销毁组件', () => {
      scoreDisplay.destroy()
      expect(scoreDisplay.destroyed).toBe(true)
    })

    it('应该清理子元素', () => {
      scoreDisplay.destroy()
      expect(scoreDisplay.children.length).toBe(0)
    })
  })
})
