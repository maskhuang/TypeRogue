// ============================================
// 打字肉鸽 - GameOverScene Tests
// ============================================
// Story 5.5 Task 2: 游戏失败场景测试

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GameOverScene, GameOverData } from '../../../../src/scenes/gameover/GameOverScene'
import { eventBus } from '../../../../src/core/events/EventBus'

describe('GameOverScene', () => {
  let scene: GameOverScene
  let testData: GameOverData

  beforeEach(() => {
    eventBus.clear()
    testData = {
      finalScore: 2500,
      currentStage: 3,
      targetScore: 5000,
      skills: ['score_boost', 'combo_shield'],
      relics: ['lucky_coin']
    }
    scene = new GameOverScene(testData)
  })

  afterEach(() => {
    if (!scene.isDestroyed) {
      scene.onExit()
    }
  })

  describe('initialization', () => {
    it('should have correct scene name', () => {
      expect(scene.name).toBe('gameover')
    })

    it('should store game over data', () => {
      const data = scene.getData()
      expect(data.finalScore).toBe(2500)
      expect(data.currentStage).toBe(3)
      expect(data.targetScore).toBe(5000)
      expect(data.skills).toEqual(['score_boost', 'combo_shield'])
      expect(data.relics).toEqual(['lucky_coin'])
    })

    it('should return a copy of data to prevent mutation', () => {
      const data1 = scene.getData()
      const data2 = scene.getData()
      expect(data1).not.toBe(data2)
      expect(data1).toEqual(data2)
    })

    it('should default to retry option (index 0)', () => {
      expect(scene.getSelectedOption()).toBe(0)
    })
  })

  describe('onEnter', () => {
    it('should create container content when entering', () => {
      scene.onEnter()
      expect(scene.container.children.length).toBeGreaterThan(0)
    })

    it('should emit audio:play with gameover sound', () => {
      const audioHandler = vi.fn()
      eventBus.on('audio:play', audioHandler)

      scene.onEnter()

      expect(audioHandler).toHaveBeenCalledWith({ sound: 'gameover' })
    })

    it('should emit meta:check_unlocks with gameover result', () => {
      const metaHandler = vi.fn()
      eventBus.on('meta:check_unlocks', metaHandler)

      scene.onEnter()

      expect(metaHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          runResult: 'gameover',
          runStats: expect.objectContaining({
            totalScore: 2500,
            stagesCleared: 2, // currentStage - 1
            skills: ['score_boost', 'combo_shield'],
            relics: ['lucky_coin']
          })
        })
      )
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

    it('should emit run:start when Enter pressed on retry option', () => {
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

      // Even with retry selected
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

      // Should not throw
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
    it('should calculate correct deficit', () => {
      const data = scene.getData()
      const deficit = data.targetScore - data.finalScore
      expect(deficit).toBe(2500) // 5000 - 2500
    })

    it('should handle zero skills and relics', () => {
      const emptyData: GameOverData = {
        finalScore: 100,
        currentStage: 1,
        targetScore: 1000,
        skills: [],
        relics: []
      }
      const emptyScene = new GameOverScene(emptyData)

      const data = emptyScene.getData()
      expect(data.skills.length).toBe(0)
      expect(data.relics.length).toBe(0)
    })

    it('should handle large scores with localization', () => {
      const bigData: GameOverData = {
        finalScore: 1234567,
        currentStage: 7,
        targetScore: 2000000,
        skills: ['s1', 's2', 's3'],
        relics: ['r1', 'r2']
      }
      const bigScene = new GameOverScene(bigData)

      const data = bigScene.getData()
      expect(data.finalScore.toLocaleString()).toBe('1,234,567')
    })
  })
})
