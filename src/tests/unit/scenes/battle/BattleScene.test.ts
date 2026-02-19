// ============================================
// 打字肉鸽 - BattleScene 单元测试
// ============================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Container } from 'pixi.js'
import { BattleScene } from '../../../../src/scenes/battle/BattleScene'
import { eventBus } from '../../../../src/core/events/EventBus'

// Mock eventBus with proper unsubscribe functions
vi.mock('../../../../src/core/events/EventBus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()), // Return mock unsubscribe function
    off: vi.fn()
  }
}))

// Mock WordLoader to make initialization fast
vi.mock('../../../../src/systems/typing/WordLoader', () => ({
  wordLoader: {
    load: vi.fn().mockResolvedValue({
      words: ['cat', 'dog', 'sun']
    })
  }
}))

// Helper to flush promises
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock PixiJS Application
const createMockApp = () => ({
  stage: new Container(),
  screen: { width: 800, height: 600 }
})

describe('BattleScene', () => {
  let scene: BattleScene
  let mockApp: ReturnType<typeof createMockApp>

  beforeEach(() => {
    mockApp = createMockApp()
    scene = new BattleScene(mockApp as any)
    vi.mocked(eventBus.emit).mockClear()
  })

  describe('基本属性', () => {
    it('name 应该是 BattleScene', () => {
      expect(scene.name).toBe('BattleScene')
    })

    it('应该有 container', () => {
      expect(scene.container).toBeInstanceOf(Container)
    })
  })

  describe('层级结构', () => {
    it('onEnter 后应该有 4 个子层', () => {
      scene.onEnter()
      // 应该有 4 个子容器：background, game, ui, effect
      expect(scene.container.children.length).toBe(4)
    })

    it('层级应该按正确顺序创建', () => {
      scene.onEnter()
      const children = scene.container.children as Container[]
      expect(children[0].label).toBe('backgroundLayer')
      expect(children[1].label).toBe('gameLayer')
      expect(children[2].label).toBe('uiLayer')
      expect(children[3].label).toBe('effectLayer')
    })

    it('getGameLayer 应该返回游戏层', () => {
      scene.onEnter()
      const gameLayer = scene.getGameLayer()
      expect(gameLayer.label).toBe('gameLayer')
    })

    it('getUILayer 应该返回 UI 层', () => {
      scene.onEnter()
      const uiLayer = scene.getUILayer()
      expect(uiLayer.label).toBe('uiLayer')
    })

    it('getEffectLayer 应该返回效果层', () => {
      scene.onEnter()
      const effectLayer = scene.getEffectLayer()
      expect(effectLayer.label).toBe('effectLayer')
    })
  })

  describe('生命周期 - onEnter', () => {
    it('onEnter 应该发送 battle:start 事件', async () => {
      scene.onEnter()
      await flushPromises() // Wait for async initialization
      expect(eventBus.emit).toHaveBeenCalledWith('battle:start', { stageId: 1 })
    })

    it('onEnter 应该使 BattleState 进入 playing 状态', async () => {
      scene.onEnter()
      await flushPromises() // Wait for async initialization
      expect(scene.getBattleState().isPlaying()).toBe(true)
    })

    it('onEnter 应该重置 BattleState', async () => {
      const battleState = scene.getBattleState()
      battleState.completeWord(100) // 修改状态

      scene.onEnter()
      await flushPromises() // Wait for async initialization
      expect(battleState.getState().score).toBe(0)
    })
  })

  describe('生命周期 - onPause', () => {
    it('onPause 应该暂停战斗', async () => {
      scene.onEnter()
      await flushPromises()
      scene.onPause()
      expect(scene.getBattleState().isPaused()).toBe(true)
    })

    it('onPause 应该发送 battle:pause 事件', async () => {
      scene.onEnter()
      await flushPromises()
      vi.mocked(eventBus.emit).mockClear()
      scene.onPause()
      expect(eventBus.emit).toHaveBeenCalledWith('battle:pause', {})
    })
  })

  describe('生命周期 - onResume', () => {
    it('onResume 应该恢复战斗', async () => {
      scene.onEnter()
      await flushPromises()
      scene.onPause()
      scene.onResume()
      expect(scene.getBattleState().isPlaying()).toBe(true)
    })

    it('onResume 应该发送 battle:resume 事件', async () => {
      scene.onEnter()
      await flushPromises()
      scene.onPause()
      vi.mocked(eventBus.emit).mockClear()
      scene.onResume()
      expect(eventBus.emit).toHaveBeenCalledWith('battle:resume', {})
    })
  })

  describe('update', () => {
    it('暂停时不应该更新时间', async () => {
      scene.onEnter()
      await flushPromises()
      const initialTime = scene.getBattleState().getState().timeRemaining
      scene.onPause()
      scene.update(1000) // 1 秒（毫秒）
      expect(scene.getBattleState().getState().timeRemaining).toBe(initialTime)
    })

    it('正常游戏时应该更新时间', async () => {
      scene.onEnter()
      await flushPromises()
      const initialTime = scene.getBattleState().getState().timeRemaining
      scene.update(1000) // 1 秒（毫秒）
      expect(scene.getBattleState().getState().timeRemaining).toBe(initialTime - 1)
    })

    it('时间耗尽时应该触发 battle:end 事件', async () => {
      scene.onEnter()
      await flushPromises()
      vi.mocked(eventBus.emit).mockClear()
      // 耗尽所有时间
      scene.update(60000) // 60 秒
      expect(eventBus.emit).toHaveBeenCalledWith('battle:end', {
        result: 'lose',
        score: 0
      })
    })

    it('ready 状态时不应该更新', () => {
      // 不调用 onEnter，保持 ready 状态
      const battleState = scene.getBattleState()
      const initialTime = battleState.getState().timeRemaining
      scene.update(1000)
      expect(battleState.getState().timeRemaining).toBe(initialTime)
    })
  })

  describe('pauseBattle / resumeBattle', () => {
    it('pauseBattle 在 playing 时应该暂停', async () => {
      scene.onEnter()
      await flushPromises()
      scene.pauseBattle()
      expect(scene.getBattleState().isPaused()).toBe(true)
    })

    it('pauseBattle 在非 playing 时不应该改变状态', () => {
      // ready 状态
      scene.pauseBattle()
      expect(scene.getBattleState().getState().phase).toBe('ready')
    })

    it('resumeBattle 在 paused 时应该恢复', async () => {
      scene.onEnter()
      await flushPromises()
      scene.pauseBattle()
      scene.resumeBattle()
      expect(scene.getBattleState().isPlaying()).toBe(true)
    })

    it('resumeBattle 在非 paused 时不应该改变状态', async () => {
      scene.onEnter()
      await flushPromises()
      const phase = scene.getBattleState().getState().phase
      scene.resumeBattle()
      expect(scene.getBattleState().getState().phase).toBe(phase)
    })
  })

  describe('getBattleState', () => {
    it('应该返回 BattleState 实例', () => {
      const battleState = scene.getBattleState()
      expect(battleState).toBeDefined()
      expect(typeof battleState.getState).toBe('function')
    })
  })

  describe('生命周期 - onExit', () => {
    it('onExit 应该调用 unbindEvents', () => {
      scene.onEnter()
      // onExit 应该不报错
      expect(() => scene.onExit()).not.toThrow()
    })

    it('onExit 后场景 container 应该被销毁', () => {
      scene.onEnter()
      scene.onExit()
      expect(scene.isDestroyed).toBe(true)
    })
  })

  describe('battle:end 防重复触发', () => {
    it('多次 update 后只应该触发一次 battle:end', async () => {
      scene.onEnter()
      await flushPromises()
      vi.mocked(eventBus.emit).mockClear()

      // 耗尽时间
      scene.update(60000)
      // 再次调用 update
      scene.update(1000)
      scene.update(1000)

      // battle:end 应该只被调用一次
      const battleEndCalls = vi.mocked(eventBus.emit).mock.calls.filter(
        call => call[0] === 'battle:end'
      )
      expect(battleEndCalls.length).toBe(1)
    })
  })

  describe('stageId 配置', () => {
    it('默认 stageId 应该是 1', async () => {
      scene.onEnter()
      await flushPromises()
      expect(eventBus.emit).toHaveBeenCalledWith('battle:start', { stageId: 1 })
    })

    it('应该支持自定义 stageId', async () => {
      const customScene = new BattleScene(mockApp as any, 5)
      customScene.onEnter()
      await flushPromises()
      expect(eventBus.emit).toHaveBeenCalledWith('battle:start', { stageId: 5 })
    })
  })

  describe('destroy', () => {
    it('destroy 应该不报错', async () => {
      scene.onEnter()
      await flushPromises()
      expect(() => scene.destroy()).not.toThrow()
    })

    it('destroy 后不应该再触发 battle:end', async () => {
      scene.onEnter()
      await flushPromises()
      scene.destroy()
      vi.mocked(eventBus.emit).mockClear()

      // 尝试触发结束
      scene.update(60000)

      const battleEndCalls = vi.mocked(eventBus.emit).mock.calls.filter(
        call => call[0] === 'battle:end'
      )
      expect(battleEndCalls.length).toBe(0)
    })
  })
})
