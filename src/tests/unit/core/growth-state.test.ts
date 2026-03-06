// ============================================
// 打字肉鸽 - 成长值状态存储测试
// ============================================
// Story 24.1: growthValues + devourIcons 状态存储

import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState } from '../../../src/core/state'
import { RunState } from '../../../src/core/state/RunState'

describe('Growth Value State (Story 24.1)', () => {

  // ==================== GameState 初始化测试 ====================

  describe('GameState 初始化', () => {
    it('createInitialState() 应返回空 growthValues Map', () => {
      const s = createInitialState()
      expect(s.growthValues).toBeInstanceOf(Map)
      expect(s.growthValues.size).toBe(0)
    })

    it('createInitialState() 应返回空 devourIcons Map', () => {
      const s = createInitialState()
      expect(s.devourIcons).toBeInstanceOf(Map)
      expect(s.devourIcons.size).toBe(0)
    })

    it('多次 createInitialState() 返回独立的 Map 实例', () => {
      const s1 = createInitialState()
      const s2 = createInitialState()
      s1.growthValues.set('prod_burst', 0.5)
      s1.devourIcons.set('prod_burst', ['🔥'])
      // s2 不受影响
      expect(s2.growthValues.size).toBe(0)
      expect(s2.devourIcons.size).toBe(0)
    })
  })

  // ==================== RunState 序列化测试 ====================

  describe('RunState 序列化', () => {
    let runState: RunState

    beforeEach(() => {
      runState = new RunState()
    })

    it('新建 RunState 应有空 growthValues 和 devourIcons', () => {
      const s = runState.getState()
      expect(s.growthValues).toBeInstanceOf(Map)
      expect(s.growthValues.size).toBe(0)
      expect(s.devourIcons).toBeInstanceOf(Map)
      expect(s.devourIcons.size).toBe(0)
    })

    it('reset() 后 growthValues 和 devourIcons 清零', () => {
      // 通过 serialize/deserialize 设置数据
      const data = {
        skills: [],
        bindings: {},
        relics: [],
        gold: 0,
        currentStage: 1,
        currentAct: 1,
        isActive: false,
        stats: { totalScore: 0, maxCombo: 0, wordsCompleted: 0, battlesWon: 0, startTime: 0 },
        bossModifierPool: [],
        bossModifierAssignment: [],
        growthValues: { prod_burst: 0.3 },
        devourIcons: { prod_burst: ['🔥'] },
      }
      const restored = RunState.deserialize(data)
      expect(restored.getState().growthValues.size).toBe(1)

      // reset
      restored.reset()
      expect(restored.getState().growthValues.size).toBe(0)
      expect(restored.getState().devourIcons.size).toBe(0)
    })

    it('serialize() 正确将 growthValues Map 序列化为普通对象', () => {
      // 直接操作内部数据
      const s = runState.getState() as any
      s.growthValues.set('prod_burst', 0.15)
      s.growthValues.set('conv_base_score_add', 0.30)

      const serialized = runState.serialize() as any
      expect(serialized.growthValues).toEqual({
        prod_burst: 0.15,
        conv_base_score_add: 0.30,
      })
    })

    it('serialize() 正确将 devourIcons Map 序列化为普通对象', () => {
      const s = runState.getState() as any
      s.devourIcons.set('prod_burst', ['🔥', '❄️'])
      s.devourIcons.set('conv_base_score_add', ['⚡'])

      const serialized = runState.serialize() as any
      expect(serialized.devourIcons).toEqual({
        prod_burst: ['🔥', '❄️'],
        conv_base_score_add: ['⚡'],
      })
    })

    it('deserialize() 正确恢复 growthValues Map', () => {
      const data = {
        skills: [],
        bindings: {},
        relics: [],
        gold: 0,
        currentStage: 1,
        currentAct: 1,
        isActive: false,
        stats: { totalScore: 0, maxCombo: 0, wordsCompleted: 0, battlesWon: 0, startTime: 0 },
        bossModifierPool: [],
        bossModifierAssignment: [],
        growthValues: { prod_burst: 0.15, conv_base_score_add: 0.30 },
        devourIcons: {},
      }

      const restored = RunState.deserialize(data)
      const s = restored.getState()
      expect(s.growthValues).toBeInstanceOf(Map)
      expect(s.growthValues.get('prod_burst')).toBe(0.15)
      expect(s.growthValues.get('conv_base_score_add')).toBe(0.30)
      expect(s.growthValues.size).toBe(2)
    })

    it('deserialize() 正确恢复 devourIcons Map', () => {
      const data = {
        skills: [],
        bindings: {},
        relics: [],
        gold: 0,
        currentStage: 1,
        currentAct: 1,
        isActive: false,
        stats: { totalScore: 0, maxCombo: 0, wordsCompleted: 0, battlesWon: 0, startTime: 0 },
        bossModifierPool: [],
        bossModifierAssignment: [],
        growthValues: {},
        devourIcons: { prod_burst: ['🔥', '❄️'], conv_base_score_add: ['⚡'] },
      }

      const restored = RunState.deserialize(data)
      const s = restored.getState()
      expect(s.devourIcons).toBeInstanceOf(Map)
      expect(s.devourIcons.get('prod_burst')).toEqual(['🔥', '❄️'])
      expect(s.devourIcons.get('conv_base_score_add')).toEqual(['⚡'])
      expect(s.devourIcons.size).toBe(2)
    })

    it('序列化往返数据一致 (serialize → JSON → deserialize)', () => {
      const s = runState.getState() as any
      s.growthValues.set('prod_burst', 0.45)
      s.growthValues.set('conv_base_score_add', 0.10)
      s.devourIcons.set('prod_burst', ['🔥', '❄️', '⚡'])

      // serialize → JSON → deserialize
      const serialized = runState.serialize()
      const jsonString = JSON.stringify(serialized)
      const parsed = JSON.parse(jsonString)
      const restored = RunState.deserialize(parsed)

      const rs = restored.getState()
      expect(rs.growthValues.get('prod_burst')).toBe(0.45)
      expect(rs.growthValues.get('conv_base_score_add')).toBe(0.10)
      expect(rs.growthValues.size).toBe(2)
      expect(rs.devourIcons.get('prod_burst')).toEqual(['🔥', '❄️', '⚡'])
      expect(rs.devourIcons.size).toBe(1)
    })

    it('旧存档兼容 — 缺失 growthValues/devourIcons 不报错', () => {
      // 模拟旧存档：没有 growthValues 和 devourIcons 字段
      const oldData = {
        skills: [{ id: 'fireBlast', level: 2 }],
        bindings: { F: 'fireBlast' },
        relics: [],
        gold: 100,
        currentStage: 3,
        currentAct: 1,
        isActive: true,
        stats: { totalScore: 500, maxCombo: 10, wordsCompleted: 25, battlesWon: 2, startTime: 1000 },
      }

      // 不应抛错
      const restored = RunState.deserialize(oldData)
      const s = restored.getState()

      // growthValues 和 devourIcons 应为空 Map
      expect(s.growthValues).toBeInstanceOf(Map)
      expect(s.growthValues.size).toBe(0)
      expect(s.devourIcons).toBeInstanceOf(Map)
      expect(s.devourIcons.size).toBe(0)

      // 其他字段应正常恢复
      expect(restored.getSkillLevel('fireBlast')).toBe(2)
      expect(restored.getGold()).toBe(100)
    })

    it('startRun() 清零 growthValues 和 devourIcons', () => {
      // 先设置数据
      const s = runState.getState() as any
      s.growthValues.set('prod_burst', 0.45)
      s.devourIcons.set('prod_burst', ['🔥', '❄️'])

      // startRun 调用 reset → createInitialState
      runState.startRun()

      const fresh = runState.getState()
      expect(fresh.growthValues.size).toBe(0)
      expect(fresh.devourIcons.size).toBe(0)
    })

    it('空 growthValues/devourIcons 序列化往返', () => {
      const serialized = runState.serialize()
      const jsonString = JSON.stringify(serialized)
      const parsed = JSON.parse(jsonString)
      const restored = RunState.deserialize(parsed)

      const s = restored.getState()
      expect(s.growthValues.size).toBe(0)
      expect(s.devourIcons.size).toBe(0)
    })
  })
})
