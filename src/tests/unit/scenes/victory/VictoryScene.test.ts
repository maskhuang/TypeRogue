// ============================================
// 打字肉鸽 - VictoryScene Tests
// ============================================
// Story 5.5 Task 3: 胜利结算场景测试

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VictoryScene, VictoryData } from '../../../../src/scenes/victory/VictoryScene'
import { eventBus } from '../../../../src/core/events/EventBus'

describe('VictoryScene', () => {
  let scene: VictoryScene
  let testData: VictoryData

  beforeEach(() => {
    eventBus.clear()
    testData = {
      totalScore: 50000,
      totalTime: 1200000, // 20 minutes
      stagesCleared: 8,
      maxCombo: 42,
      perfectWords: 150,
      skills: ['score_boost', 'combo_shield', 'time_extend'],
      relics: ['lucky_coin', 'void_heart']
    }
    scene = new VictoryScene(testData)
  })

  afterEach(() => {
    if (!scene.isDestroyed) {
      scene.onExit()
    }
  })

  describe('initialization', () => {
    it('should have correct scene name', () => {
      expect(scene.name).toBe('victory')
    })

    it('should store victory data', () => {
      const data = scene.getData()
      expect(data.totalScore).toBe(50000)
      expect(data.totalTime).toBe(1200000)
      expect(data.stagesCleared).toBe(8)
      expect(data.maxCombo).toBe(42)
      expect(data.perfectWords).toBe(150)
      expect(data.skills).toEqual(['score_boost', 'combo_shield', 'time_extend'])
      expect(data.relics).toEqual(['lucky_coin', 'void_heart'])
    })

    it('should return a copy of data to prevent mutation', () => {
      const data1 = scene.getData()
      const data2 = scene.getData()
      expect(data1).not.toBe(data2)
      expect(data1).toEqual(data2)
    })

    it('should default to new game option (index 0)', () => {
      expect(scene.getSelectedOption()).toBe(0)
    })
  })

  describe('time formatting', () => {
    it('should format time correctly for minutes and seconds', () => {
      expect(scene.formatTime(1200000)).toBe('20:00') // 20 minutes
      expect(scene.formatTime(90000)).toBe('1:30')    // 1.5 minutes
      expect(scene.formatTime(65000)).toBe('1:05')    // 65 seconds
      expect(scene.formatTime(5000)).toBe('0:05')     // 5 seconds
      expect(scene.formatTime(0)).toBe('0:00')        // 0 seconds
    })

    it('should pad seconds with leading zero', () => {
      expect(scene.formatTime(61000)).toBe('1:01')
      expect(scene.formatTime(69000)).toBe('1:09')
    })

    it('should handle large times', () => {
      expect(scene.formatTime(3600000)).toBe('60:00') // 1 hour
      expect(scene.formatTime(5400000)).toBe('90:00') // 1.5 hours
    })
  })

  describe('onEnter', () => {
    it('should create container content when entering', () => {
      scene.onEnter()
      expect(scene.container.children.length).toBeGreaterThan(0)
    })

    it('should emit audio:play with victory sound', () => {
      const audioHandler = vi.fn()
      eventBus.on('audio:play', audioHandler)

      scene.onEnter()

      expect(audioHandler).toHaveBeenCalledWith({ sound: 'victory' })
    })

    it('should emit meta:check_unlocks with victory result', () => {
      const metaHandler = vi.fn()
      eventBus.on('meta:check_unlocks', metaHandler)

      scene.onEnter()

      expect(metaHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          runResult: 'victory',
          runStats: expect.objectContaining({
            totalScore: 50000,
            totalTime: 1200000,
            stagesCleared: 8,
            maxCombo: 42,
            perfectWords: 150,
            skills: ['score_boost', 'combo_shield', 'time_extend'],
            relics: ['lucky_coin', 'void_heart']
          })
        })
      )
    })

    it('should emit unlock check with full run stats', () => {
      const metaHandler = vi.fn()
      eventBus.on('meta:check_unlocks', metaHandler)

      scene.onEnter()

      const call = metaHandler.mock.calls[0][0]
      expect(call.runResult).toBe('victory')
      expect(call.runStats.totalScore).toBe(50000)
      expect(call.runStats.perfectWords).toBe(150)
    })
  })

  describe('keyboard navigation', () => {
    beforeEach(() => {
      scene.onEnter()
    })

    it('should navigate down with ArrowDown', () => {
      expect(scene.getSelectedOption()).toBe(0)

      scene.handleKeyInput('ArrowDown')

      expect(scene.getSelectedOption()).toBe(1)
    })

    it('should navigate up with ArrowUp', () => {
      scene.handleKeyInput('ArrowDown')
      expect(scene.getSelectedOption()).toBe(1)

      scene.handleKeyInput('ArrowUp')

      expect(scene.getSelectedOption()).toBe(0)
    })

    it('should not go below last option', () => {
      scene.handleKeyInput('ArrowDown')
      scene.handleKeyInput('ArrowDown')
      scene.handleKeyInput('ArrowDown')

      expect(scene.getSelectedOption()).toBe(1)
    })

    it('should not go above first option', () => {
      scene.handleKeyInput('ArrowUp')
      scene.handleKeyInput('ArrowUp')

      expect(scene.getSelectedOption()).toBe(0)
    })
  })

  describe('Enter key actions', () => {
    beforeEach(() => {
      scene.onEnter()
    })

    it('should emit run:start when Enter pressed on new game option', () => {
      const startHandler = vi.fn()
      eventBus.on('run:start', startHandler)

      scene.handleKeyInput('Enter')

      expect(startHandler).toHaveBeenCalledWith({})
    })

    it('should emit scene:goto_menu when Enter pressed on menu option', () => {
      const menuHandler = vi.fn()
      eventBus.on('scene:goto_menu', menuHandler)

      scene.handleKeyInput('ArrowDown')
      scene.handleKeyInput('Enter')

      expect(menuHandler).toHaveBeenCalledWith({})
    })
  })

  describe('Escape key action', () => {
    beforeEach(() => {
      scene.onEnter()
    })

    it('should emit scene:goto_menu when Escape pressed', () => {
      const menuHandler = vi.fn()
      eventBus.on('scene:goto_menu', menuHandler)

      scene.handleKeyInput('Escape')

      expect(menuHandler).toHaveBeenCalledWith({})
    })

    it('should go to menu regardless of selected option', () => {
      const menuHandler = vi.fn()
      const startHandler = vi.fn()
      eventBus.on('scene:goto_menu', menuHandler)
      eventBus.on('run:start', startHandler)

      // With new game selected
      expect(scene.getSelectedOption()).toBe(0)

      scene.handleKeyInput('Escape')

      expect(menuHandler).toHaveBeenCalledWith({})
      expect(startHandler).not.toHaveBeenCalled()
    })
  })

  describe('onExit', () => {
    it('should clean up scene', () => {
      scene.onEnter()
      scene.onExit()

      expect(scene.isDestroyed).toBe(true)
    })

    it('should not crash when handling key after exit', () => {
      scene.onEnter()
      scene.onExit()

      expect(() => scene.handleKeyInput('Enter')).not.toThrow()
    })
  })

  describe('update', () => {
    it('should not throw on update call', () => {
      scene.onEnter()
      expect(() => scene.update(16)).not.toThrow()
    })
  })

  describe('stats display data', () => {
    it('should handle zero skills and relics', () => {
      const emptyData: VictoryData = {
        totalScore: 10000,
        totalTime: 600000,
        stagesCleared: 8,
        maxCombo: 10,
        perfectWords: 50,
        skills: [],
        relics: []
      }
      const emptyScene = new VictoryScene(emptyData)

      const data = emptyScene.getData()
      expect(data.skills.length).toBe(0)
      expect(data.relics.length).toBe(0)
    })

    it('should handle large scores with localization', () => {
      const bigData: VictoryData = {
        totalScore: 1234567,
        totalTime: 900000,
        stagesCleared: 8,
        maxCombo: 200,
        perfectWords: 500,
        skills: [],
        relics: []
      }
      const bigScene = new VictoryScene(bigData)

      const data = bigScene.getData()
      expect(data.totalScore.toLocaleString()).toBe('1,234,567')
    })

    it('should track perfect completion', () => {
      const data = scene.getData()
      expect(data.stagesCleared).toBe(8)
      expect(data.maxCombo).toBe(42)
    })
  })
})
