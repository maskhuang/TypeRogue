// ============================================
// 打字肉鸽 - ComboCounter 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from 'pixi.js'
import { ComboCounter } from '../../../../src/ui/hud/ComboCounter'

describe('ComboCounter', () => {
  let comboCounter: ComboCounter

  beforeEach(() => {
    comboCounter = new ComboCounter()
  })

  describe('初始化', () => {
    it('应该有正确的 label', () => {
      expect(comboCounter.label).toBe('ComboCounter')
    })

    it('应该继承自 Container', () => {
      expect(comboCounter).toBeInstanceOf(Container)
    })

    it('初始应该不可见', () => {
      expect(comboCounter.visible).toBe(false)
    })

    it('初始连击应该是 0', () => {
      expect(comboCounter.getCurrentCombo()).toBe(0)
    })
  })

  describe('setCombo', () => {
    it('combo = 0 时应该隐藏', () => {
      comboCounter.setCombo(5)
      expect(comboCounter.visible).toBe(true)

      comboCounter.setCombo(0)
      expect(comboCounter.visible).toBe(false)
    })

    it('combo > 0 时应该显示', () => {
      comboCounter.setCombo(1)
      expect(comboCounter.visible).toBe(true)
    })

    it('应该更新文本', () => {
      comboCounter.setCombo(15)
      expect(comboCounter.getComboText().text).toBe('15 COMBO')
    })

    it('应该记录当前连击数', () => {
      comboCounter.setCombo(10)
      expect(comboCounter.getCurrentCombo()).toBe(10)
    })
  })

  describe('弹出动画', () => {
    it('连击增加时应该触发动画', () => {
      comboCounter.setCombo(1)
      expect(comboCounter.getAnimationScale()).toBeGreaterThan(1.0)
    })

    it('连击减少时不应该触发动画', () => {
      comboCounter.setCombo(5)
      // 完成动画
      for (let i = 0; i < 20; i++) {
        comboCounter.update(0.1)
      }

      comboCounter.setCombo(3) // 减少
      // 不应该有新动画
      expect(comboCounter.getAnimationScale()).toBeCloseTo(1.0, 1)
    })

    it('连击不变时不应该触发动画', () => {
      comboCounter.setCombo(5)
      // 完成动画
      for (let i = 0; i < 20; i++) {
        comboCounter.update(0.1)
      }
      expect(comboCounter.getAnimationScale()).toBeCloseTo(1.0, 1)

      comboCounter.setCombo(5) // 相同值
      expect(comboCounter.getAnimationScale()).toBeCloseTo(1.0, 1)
    })
  })

  describe('update (缩放恢复)', () => {
    it('动画后缩放应该逐渐恢复到 1', () => {
      comboCounter.setCombo(5)
      expect(comboCounter.getAnimationScale()).toBeGreaterThan(1.0)

      // 模拟多帧更新
      for (let i = 0; i < 20; i++) {
        comboCounter.update(0.1)
      }

      expect(comboCounter.getAnimationScale()).toBeCloseTo(1.0, 1)
    })

    it('缩放不应该小于 1', () => {
      comboCounter.setCombo(5)

      // 大量更新
      for (let i = 0; i < 100; i++) {
        comboCounter.update(0.1)
      }

      expect(comboCounter.getAnimationScale()).toBeGreaterThanOrEqual(1.0)
    })
  })

  describe('颜色系统', () => {
    it('低连击 (1-5) 应该是白色', () => {
      comboCounter.setCombo(3)
      expect(comboCounter.getComboColor()).toBe(0xffffff)
    })

    it('中连击 (6-10) 应该是黄色', () => {
      comboCounter.setCombo(8)
      expect(comboCounter.getComboColor()).toBe(0xffff00)
    })

    it('高连击 (11+) 应该是橙红色', () => {
      comboCounter.setCombo(15)
      expect(comboCounter.getComboColor()).toBe(0xff6600)
    })
  })

  describe('destroy', () => {
    it('应该正确销毁组件', () => {
      comboCounter.destroy()
      expect(comboCounter.destroyed).toBe(true)
    })

    it('应该清理子元素', () => {
      comboCounter.destroy()
      expect(comboCounter.children.length).toBe(0)
    })
  })
})
