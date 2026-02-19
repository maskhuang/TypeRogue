// ============================================
// 打字肉鸽 - BattleHUD 单元测试
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from 'pixi.js'
import { BattleHUD } from '../../../../src/ui/hud/BattleHUD'
import { BattleState } from '../../../../src/core/state/BattleState'

describe('BattleHUD', () => {
  let battleHUD: BattleHUD
  const SCREEN_WIDTH = 800
  const SCREEN_HEIGHT = 600

  beforeEach(() => {
    battleHUD = new BattleHUD(SCREEN_WIDTH, SCREEN_HEIGHT)
  })

  describe('初始化', () => {
    it('应该有正确的 label', () => {
      expect(battleHUD.label).toBe('BattleHUD')
    })

    it('应该继承自 Container', () => {
      expect(battleHUD).toBeInstanceOf(Container)
    })

    it('应该创建 4 个子组件', () => {
      // ScoreDisplay + TimerBar + ComboCounter + WordDisplay = 4
      expect(battleHUD.children.length).toBe(4)
    })
  })

  describe('子组件访问', () => {
    it('应该能访问 ScoreDisplay', () => {
      const scoreDisplay = battleHUD.getScoreDisplay()
      expect(scoreDisplay).toBeDefined()
      expect(scoreDisplay.label).toBe('ScoreDisplay')
    })

    it('应该能访问 TimerBar', () => {
      const timerBar = battleHUD.getTimerBar()
      expect(timerBar).toBeDefined()
      expect(timerBar.label).toBe('TimerBar')
    })

    it('应该能访问 ComboCounter', () => {
      const comboCounter = battleHUD.getComboCounter()
      expect(comboCounter).toBeDefined()
      expect(comboCounter.label).toBe('ComboCounter')
    })

    it('应该能访问 WordDisplay', () => {
      const wordDisplay = battleHUD.getWordDisplay()
      expect(wordDisplay).toBeDefined()
      expect(wordDisplay.label).toBe('WordDisplay')
    })
  })

  describe('syncWithState', () => {
    it('应该更新分数', () => {
      const state = new BattleState()
      state.completeWord(500)

      battleHUD.syncWithState(state)

      expect(battleHUD.getScoreDisplay().getTargetScore()).toBe(500)
    })

    it('应该更新倍率', () => {
      const state = new BattleState()
      state.setMultiplier(2.5)

      battleHUD.syncWithState(state)

      expect(battleHUD.getScoreDisplay().getMultiplierText().text).toBe('x2.5')
    })

    it('应该更新时间', () => {
      const state = new BattleState()
      state.start()
      state.updateTime(15) // 减少 15 秒

      battleHUD.syncWithState(state)

      expect(battleHUD.getTimerBar().getCurrentTime()).toBe(45)
    })

    it('应该更新连击', () => {
      const state = new BattleState()
      state.completeWord(100)
      state.completeWord(100)
      state.completeWord(100) // combo = 3

      battleHUD.syncWithState(state)

      expect(battleHUD.getComboCounter().getCurrentCombo()).toBe(3)
    })

    it('应该更新词语', () => {
      const state = new BattleState()
      state.setCurrentWord('hello')
      state.addTypedChar('h')
      state.addTypedChar('e')

      battleHUD.syncWithState(state)

      expect(battleHUD.getWordDisplay().getCurrentWord()).toBe('hello')
      expect(battleHUD.getWordDisplay().getTypedChars()).toBe('he')
    })
  })

  describe('update', () => {
    it('应该更新所有子组件', () => {
      const scoreDisplayUpdate = vi.spyOn(battleHUD.getScoreDisplay(), 'update')
      const timerBarUpdate = vi.spyOn(battleHUD.getTimerBar(), 'update')
      const comboCounterUpdate = vi.spyOn(battleHUD.getComboCounter(), 'update')

      battleHUD.update(0.016)

      expect(scoreDisplayUpdate).toHaveBeenCalledWith(0.016)
      expect(timerBarUpdate).toHaveBeenCalledWith(0.016)
      expect(comboCounterUpdate).toHaveBeenCalledWith(0.016)
    })
  })

  describe('布局', () => {
    it('ScoreDisplay 应该在左上角', () => {
      const scoreDisplay = battleHUD.getScoreDisplay()
      expect(scoreDisplay.position.x).toBe(20)
      expect(scoreDisplay.position.y).toBe(20)
    })

    it('TimerBar 应该在底部', () => {
      const timerBar = battleHUD.getTimerBar()
      expect(timerBar.position.x).toBe(20)
      expect(timerBar.position.y).toBe(SCREEN_HEIGHT - 40)
    })

    it('ComboCounter 应该在右下角', () => {
      const comboCounter = battleHUD.getComboCounter()
      expect(comboCounter.position.x).toBe(SCREEN_WIDTH - 150)
      expect(comboCounter.position.y).toBe(SCREEN_HEIGHT - 100)
    })

    it('WordDisplay 应该在中央', () => {
      const wordDisplay = battleHUD.getWordDisplay()
      expect(wordDisplay.position.x).toBe(SCREEN_WIDTH / 2)
      expect(wordDisplay.position.y).toBe(SCREEN_HEIGHT / 2)
    })
  })

  describe('destroy', () => {
    it('应该正确销毁组件', () => {
      battleHUD.destroy()
      expect(battleHUD.destroyed).toBe(true)
    })

    it('应该销毁所有子组件', () => {
      const scoreDisplay = battleHUD.getScoreDisplay()
      const timerBar = battleHUD.getTimerBar()
      const comboCounter = battleHUD.getComboCounter()
      const wordDisplay = battleHUD.getWordDisplay()

      battleHUD.destroy()

      expect(scoreDisplay.destroyed).toBe(true)
      expect(timerBar.destroyed).toBe(true)
      expect(comboCounter.destroyed).toBe(true)
      expect(wordDisplay.destroyed).toBe(true)
    })
  })
})
