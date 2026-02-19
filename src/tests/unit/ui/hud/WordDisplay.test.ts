// ============================================
// 打字肉鸽 - WordDisplay 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from 'pixi.js'
import { WordDisplay } from '../../../../src/ui/hud/WordDisplay'

describe('WordDisplay', () => {
  let wordDisplay: WordDisplay

  beforeEach(() => {
    wordDisplay = new WordDisplay()
  })

  describe('初始化', () => {
    it('应该有正确的 label', () => {
      expect(wordDisplay.label).toBe('WordDisplay')
    })

    it('应该继承自 Container', () => {
      expect(wordDisplay).toBeInstanceOf(Container)
    })

    it('应该创建两个文本元素', () => {
      // 已输入文本 + 剩余文本 = 2 个子元素
      expect(wordDisplay.children.length).toBe(2)
    })

    it('初始词语应该为空', () => {
      expect(wordDisplay.getCurrentWord()).toBe('')
    })

    it('初始已输入应该为空', () => {
      expect(wordDisplay.getTypedChars()).toBe('')
    })
  })

  describe('setWord', () => {
    it('应该设置当前词语', () => {
      wordDisplay.setWord('hello')
      expect(wordDisplay.getCurrentWord()).toBe('hello')
    })

    it('应该清空已输入字符', () => {
      wordDisplay.setTypedChars('hel')
      wordDisplay.setWord('world') // 新词语
      expect(wordDisplay.getTypedChars()).toBe('')
    })

    it('剩余文本应该显示完整词语', () => {
      wordDisplay.setWord('hello')
      expect(wordDisplay.getRemainingText().text).toBe('hello')
    })

    it('已输入文本应该为空', () => {
      wordDisplay.setWord('hello')
      expect(wordDisplay.getTypedText().text).toBe('')
    })
  })

  describe('setTypedChars', () => {
    it('应该更新已输入字符', () => {
      wordDisplay.setWord('hello')
      wordDisplay.setTypedChars('hel')
      expect(wordDisplay.getTypedChars()).toBe('hel')
    })

    it('已输入文本应该显示正确', () => {
      wordDisplay.setWord('hello')
      wordDisplay.setTypedChars('hel')
      expect(wordDisplay.getTypedText().text).toBe('hel')
    })

    it('剩余文本应该显示未输入部分', () => {
      wordDisplay.setWord('hello')
      wordDisplay.setTypedChars('hel')
      expect(wordDisplay.getRemainingText().text).toBe('lo')
    })

    it('完成输入后剩余应该为空', () => {
      wordDisplay.setWord('hello')
      wordDisplay.setTypedChars('hello')
      expect(wordDisplay.getRemainingText().text).toBe('')
    })
  })

  describe('显示分离', () => {
    it('已输入和剩余应该分开显示', () => {
      wordDisplay.setWord('typing')
      wordDisplay.setTypedChars('typ')

      const typed = wordDisplay.getTypedText()
      const remaining = wordDisplay.getRemainingText()

      expect(typed.text).toBe('typ')
      expect(remaining.text).toBe('ing')
    })

    it('空输入时应该显示完整词语在剩余', () => {
      wordDisplay.setWord('test')
      wordDisplay.setTypedChars('')

      expect(wordDisplay.getTypedText().text).toBe('')
      expect(wordDisplay.getRemainingText().text).toBe('test')
    })
  })

  describe('isComplete', () => {
    it('未完成时应该返回 false', () => {
      wordDisplay.setWord('hello')
      wordDisplay.setTypedChars('hel')
      expect(wordDisplay.isComplete()).toBe(false)
    })

    it('完成时应该返回 true', () => {
      wordDisplay.setWord('hello')
      wordDisplay.setTypedChars('hello')
      expect(wordDisplay.isComplete()).toBe(true)
    })

    it('空词语时应该返回 true', () => {
      wordDisplay.setWord('')
      expect(wordDisplay.isComplete()).toBe(true)
    })
  })

  describe('destroy', () => {
    it('应该正确销毁组件', () => {
      wordDisplay.destroy()
      expect(wordDisplay.destroyed).toBe(true)
    })

    it('应该清理子元素', () => {
      wordDisplay.destroy()
      expect(wordDisplay.children.length).toBe(0)
    })
  })
})
