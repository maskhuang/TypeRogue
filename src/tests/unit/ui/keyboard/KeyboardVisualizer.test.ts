// ============================================
// 打字肉鸽 - KeyboardVisualizer 单元测试
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Container, Texture } from 'pixi.js'
import { KeyboardVisualizer } from '../../../../src/ui/keyboard/KeyboardVisualizer'
import { KeyVisual } from '../../../../src/ui/keyboard/KeyVisual'
import { eventBus } from '../../../../src/core/events/EventBus'

describe('KeyboardVisualizer', () => {
  let keyboard: KeyboardVisualizer

  beforeEach(() => {
    eventBus.clear()
    keyboard = new KeyboardVisualizer()
  })

  afterEach(() => {
    keyboard.destroy()
    eventBus.clear()
  })

  describe('初始化', () => {
    it('应该有正确的 label', () => {
      expect(keyboard.label).toBe('KeyboardVisualizer')
    })

    it('应该继承自 Container', () => {
      expect(keyboard).toBeInstanceOf(Container)
    })

    it('应该创建 26 个按键', () => {
      expect(keyboard.getKeyCount()).toBe(26)
    })

    it('应该创建所有字母键', () => {
      const letters = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('')
      letters.forEach(letter => {
        expect(keyboard.getKey(letter)).toBeDefined()
      })
    })
  })

  describe('布局', () => {
    it('第一行应该有 10 个键 (QWERTYUIOP)', () => {
      const firstRow = 'QWERTYUIOP'.split('')
      firstRow.forEach(letter => {
        expect(keyboard.getKey(letter)).toBeDefined()
      })
    })

    it('第二行应该有 9 个键 (ASDFGHJKL)', () => {
      const secondRow = 'ASDFGHJKL'.split('')
      secondRow.forEach(letter => {
        expect(keyboard.getKey(letter)).toBeDefined()
      })
    })

    it('第三行应该有 7 个键 (ZXCVBNM)', () => {
      const thirdRow = 'ZXCVBNM'.split('')
      thirdRow.forEach(letter => {
        expect(keyboard.getKey(letter)).toBeDefined()
      })
    })

    it('getKeyboardWidth 应该返回正确宽度', () => {
      // 10 个键 + 9 个间隙
      const expectedWidth = 10 * KeyVisual.KEY_SIZE + 9 * KeyVisual.KEY_GAP
      expect(keyboard.getKeyboardWidth()).toBe(expectedWidth)
    })

    it('getKeyboardHeight 应该返回正确高度', () => {
      // 3 行 + 2 个间隙
      const expectedHeight = 3 * KeyVisual.KEY_SIZE + 2 * KeyVisual.KEY_GAP
      expect(keyboard.getKeyboardHeight()).toBe(expectedHeight)
    })

    it('第二行应该有偏移', () => {
      const keyA = keyboard.getKey('A')
      const keyQ = keyboard.getKey('Q')

      expect(keyA).toBeDefined()
      expect(keyQ).toBeDefined()

      // A 的 x 应该比 Q 多一半键宽的偏移
      const expectedOffset = 0.5 * (KeyVisual.KEY_SIZE + KeyVisual.KEY_GAP)
      expect(keyA!.x).toBeCloseTo(expectedOffset, 1)
    })
  })

  describe('syncBindings', () => {
    it('应该为绑定的键设置图标', () => {
      const bindings = new Map([['q', 'skill1'], ['w', 'skill2']])
      const textures = new Map([
        ['skill1', Texture.WHITE],
        ['skill2', Texture.WHITE]
      ])

      keyboard.syncBindings(bindings, textures)

      expect(keyboard.getKey('Q')?.hasSkillIcon()).toBe(true)
      expect(keyboard.getKey('W')?.hasSkillIcon()).toBe(true)
      expect(keyboard.getKey('E')?.hasSkillIcon()).toBe(false)
    })

    it('没有纹理时不应设置图标', () => {
      const bindings = new Map([['q', 'skill1']])

      keyboard.syncBindings(bindings)

      expect(keyboard.getKey('Q')?.hasSkillIcon()).toBe(false)
    })
  })

  describe('clearBindings', () => {
    it('应该清除所有图标', () => {
      const bindings = new Map([['q', 'skill1']])
      const textures = new Map([['skill1', Texture.WHITE]])

      keyboard.syncBindings(bindings, textures)
      expect(keyboard.getKey('Q')?.hasSkillIcon()).toBe(true)

      keyboard.clearBindings()
      expect(keyboard.getKey('Q')?.hasSkillIcon()).toBe(false)
    })
  })

  describe('highlightKey', () => {
    it('应该高亮指定键', () => {
      keyboard.highlightKey('F')

      expect(keyboard.getKey('F')?.getPressed()).toBe(true)
      expect(keyboard.getCurrentPressed()).toBe('F')
    })

    it('应该高亮相邻键', () => {
      keyboard.highlightKey('F')

      // F 的相邻键: D, R, T, G, C, V
      expect(keyboard.getKey('D')?.getAdjacentHighlight()).toBe(true)
      expect(keyboard.getKey('G')?.getAdjacentHighlight()).toBe(true)
    })

    it('非相邻键不应被高亮', () => {
      keyboard.highlightKey('F')

      expect(keyboard.getKey('Q')?.getAdjacentHighlight()).toBe(false)
      expect(keyboard.getKey('M')?.getAdjacentHighlight()).toBe(false)
    })

    it('高亮新键应清除旧高亮', () => {
      keyboard.highlightKey('F')
      keyboard.highlightKey('Q')

      expect(keyboard.getKey('F')?.getPressed()).toBe(false)
      expect(keyboard.getKey('Q')?.getPressed()).toBe(true)
    })
  })

  describe('clearHighlights', () => {
    it('应该清除所有高亮', () => {
      keyboard.highlightKey('F')
      keyboard.clearHighlights()

      expect(keyboard.getKey('F')?.getPressed()).toBe(false)
      expect(keyboard.getKey('D')?.getAdjacentHighlight()).toBe(false)
      expect(keyboard.getCurrentPressed()).toBeNull()
    })
  })

  describe('事件监听', () => {
    it('bindEvents 后应响应 keypress', () => {
      keyboard.bindEvents()

      eventBus.emit('input:keypress', { key: 'f', timestamp: Date.now() })

      expect(keyboard.getKey('F')?.getPressed()).toBe(true)
    })

    it('bindEvents 后应响应 keyup', () => {
      keyboard.bindEvents()

      eventBus.emit('input:keypress', { key: 'f', timestamp: Date.now() })
      expect(keyboard.getKey('F')?.getPressed()).toBe(true)

      eventBus.emit('input:keyup', { key: 'f', timestamp: Date.now() })
      expect(keyboard.getKey('F')?.getPressed()).toBe(false)
    })

    it('bindEvents 后应响应 skill:triggered', () => {
      keyboard.bindEvents()

      eventBus.emit('skill:triggered', {
        key: 'f',
        skillId: 'skill1',
        type: 'passive'
      })

      expect(keyboard.getKey('F')?.getIsAnimating()).toBe(true)
    })

    it('unbindEvents 后不应响应事件', () => {
      keyboard.bindEvents()
      keyboard.unbindEvents()

      eventBus.emit('input:keypress', { key: 'f', timestamp: Date.now() })

      expect(keyboard.getKey('F')?.getPressed()).toBe(false)
    })
  })

  describe('update', () => {
    it('应该更新所有键的动画', () => {
      keyboard.bindEvents()

      // 触发动画
      eventBus.emit('skill:triggered', {
        key: 'f',
        skillId: 'skill1',
        type: 'passive'
      })

      const keyF = keyboard.getKey('F')!
      const initialScale = keyF.getAnimationScale()

      keyboard.update(0.1)

      expect(keyF.getAnimationScale()).toBeLessThan(initialScale)
    })
  })

  describe('destroy', () => {
    it('应该正确销毁组件', () => {
      keyboard.bindEvents()
      keyboard.destroy()

      expect(keyboard.destroyed).toBe(true)
    })

    it('销毁后应该清理所有键', () => {
      keyboard.destroy()
      expect(keyboard.getKeyCount()).toBe(0)
    })

    it('销毁后不应响应事件', () => {
      keyboard.bindEvents()
      const keyF = keyboard.getKey('F')

      keyboard.destroy()

      eventBus.emit('input:keypress', { key: 'f', timestamp: Date.now() })

      // keyF 已被销毁，不应抛出错误
      expect(keyboard.destroyed).toBe(true)
    })
  })

  describe('大小写不敏感', () => {
    it('getKey 应该大小写不敏感', () => {
      expect(keyboard.getKey('q')).toBe(keyboard.getKey('Q'))
    })

    it('highlightKey 应该大小写不敏感', () => {
      keyboard.highlightKey('f')
      expect(keyboard.getCurrentPressed()).toBe('F')
    })
  })
})
