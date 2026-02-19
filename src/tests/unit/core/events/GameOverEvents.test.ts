// ============================================
// 打字肉鸽 - Game Over Events Tests
// ============================================
// Story 5.5 Task 1: 结束事件定义测试

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eventBus, GameEvents } from '../../../../src/core/events/EventBus'

describe('GameOver Events', () => {
  beforeEach(() => {
    eventBus.clear()
  })

  describe('run:victory event', () => {
    it('should emit victory event with correct data structure', () => {
      const handler = vi.fn()
      eventBus.on('run:victory', handler)

      const victoryData: GameEvents['run:victory'] = {
        totalScore: 50000,
        totalTime: 1200000, // 20 minutes in ms
        stagesCleared: 8,
        maxCombo: 42,
        perfectWords: 150,
        skills: ['score_boost', 'combo_shield'],
        relics: ['lucky_coin']
      }

      eventBus.emit('run:victory', victoryData)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(victoryData)
    })

    it('should allow subscribing and unsubscribing', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('run:victory', handler)

      eventBus.emit('run:victory', {
        totalScore: 1000,
        totalTime: 60000,
        stagesCleared: 1,
        maxCombo: 5,
        perfectWords: 10,
        skills: [],
        relics: []
      })
      expect(handler).toHaveBeenCalledTimes(1)

      unsubscribe()

      eventBus.emit('run:victory', {
        totalScore: 2000,
        totalTime: 120000,
        stagesCleared: 2,
        maxCombo: 10,
        perfectWords: 20,
        skills: [],
        relics: []
      })
      expect(handler).toHaveBeenCalledTimes(1) // Still 1, not called again
    })
  })

  describe('run:gameover event', () => {
    it('should emit gameover event with correct data structure', () => {
      const handler = vi.fn()
      eventBus.on('run:gameover', handler)

      const gameoverData: GameEvents['run:gameover'] = {
        finalScore: 2500,
        currentStage: 3,
        targetScore: 5000,
        skills: ['time_extend'],
        relics: ['combo_crown']
      }

      eventBus.emit('run:gameover', gameoverData)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(gameoverData)
    })

    it('should include score deficit information', () => {
      const handler = vi.fn()
      eventBus.on('run:gameover', handler)

      const data = {
        finalScore: 3000,
        currentStage: 5,
        targetScore: 8000,
        skills: [],
        relics: []
      }

      eventBus.emit('run:gameover', data)

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          finalScore: 3000,
          targetScore: 8000
        })
      )
      // Deficit can be calculated: 8000 - 3000 = 5000
    })
  })

  describe('meta:check_unlocks event', () => {
    it('should emit unlock check for victory result', () => {
      const handler = vi.fn()
      eventBus.on('meta:check_unlocks', handler)

      const unlockData: GameEvents['meta:check_unlocks'] = {
        runResult: 'victory',
        runStats: {
          totalScore: 50000,
          totalTime: 900000,
          stagesCleared: 8,
          maxCombo: 100,
          perfectWords: 200,
          skills: ['skill1', 'skill2'],
          relics: ['relic1']
        }
      }

      eventBus.emit('meta:check_unlocks', unlockData)

      expect(handler).toHaveBeenCalledWith(unlockData)
      expect(handler.mock.calls[0][0].runResult).toBe('victory')
    })

    it('should emit unlock check for gameover result', () => {
      const handler = vi.fn()
      eventBus.on('meta:check_unlocks', handler)

      const unlockData: GameEvents['meta:check_unlocks'] = {
        runResult: 'gameover',
        runStats: {
          totalScore: 5000,
          stagesCleared: 4,
          maxCombo: 25,
          skills: ['skill1'],
          relics: []
        }
      }

      eventBus.emit('meta:check_unlocks', unlockData)

      expect(handler).toHaveBeenCalledWith(unlockData)
      expect(handler.mock.calls[0][0].runResult).toBe('gameover')
    })
  })

  describe('scene:goto_menu event', () => {
    it('should emit goto_menu event', () => {
      const handler = vi.fn()
      eventBus.on('scene:goto_menu', handler)

      eventBus.emit('scene:goto_menu', {})

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({})
    })
  })

  describe('run:start event', () => {
    it('should emit run:start event for new run', () => {
      const handler = vi.fn()
      eventBus.on('run:start', handler)

      eventBus.emit('run:start', {})

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({})
    })
  })

  describe('audio:play event', () => {
    it('should emit audio:play with sound name', () => {
      const handler = vi.fn()
      eventBus.on('audio:play', handler)

      eventBus.emit('audio:play', { sound: 'victory' })

      expect(handler).toHaveBeenCalledWith({ sound: 'victory' })
    })

    it('should emit gameover sound', () => {
      const handler = vi.fn()
      eventBus.on('audio:play', handler)

      eventBus.emit('audio:play', { sound: 'gameover' })

      expect(handler).toHaveBeenCalledWith({ sound: 'gameover' })
    })
  })
})
