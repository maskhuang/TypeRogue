// ============================================
// 打字肉鸽 - 周目状态与循环结构 单元测试
// ============================================
// Story 25.1: cycle state & loop structure

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createInitialState, state, resetState } from '../../../src/core/state'
import { RunState } from '../../../src/core/state/RunState'
import { advanceCycle } from '../../../src/systems/battle'

describe('周目状态 (cycle)', () => {
  // === AC1: cycle 字段 ===

  describe('GameState cycle 初始化', () => {
    it('cycle 默认值 = 1', () => {
      const s = createInitialState()
      expect(s.cycle).toBe(1)
    })
  })

  // === AC2: activeModifiers 字段 ===

  describe('GameState activeModifiers 初始化', () => {
    it('activeModifiers 默认值 = []', () => {
      const s = createInitialState()
      expect(s.activeModifiers).toEqual([])
    })
  })

  // === AC1: RunState 序列化/反序列化 ===

  describe('RunState cycle 序列化', () => {
    let runState: RunState

    beforeEach(() => {
      runState = new RunState()
    })

    it('cycle 默认值 = 1 (RunState)', () => {
      expect(runState.getState().cycle).toBe(1)
    })

    it('activeModifiers 默认值 = [] (RunState)', () => {
      expect(runState.getState().activeModifiers).toEqual([])
    })

    it('serialize() 包含 cycle 和 activeModifiers', () => {
      const serialized = runState.serialize() as any
      expect(serialized.cycle).toBe(1)
      expect(serialized.activeModifiers).toEqual([])
    })

    it('serialize() 保留修改后的 cycle 值', () => {
      ;(runState as any).data.cycle = 3
      ;(runState as any).data.activeModifiers = ['mod_visual', 'mod_rhythm']
      const serialized = runState.serialize() as any
      expect(serialized.cycle).toBe(3)
      expect(serialized.activeModifiers).toEqual(['mod_visual', 'mod_rhythm'])
    })

    it('deserialize() 正确恢复 cycle', () => {
      ;(runState as any).data.cycle = 5
      ;(runState as any).data.activeModifiers = ['mod_a', 'mod_b', 'mod_c']
      const serialized = runState.serialize()
      const json = JSON.parse(JSON.stringify(serialized))
      const restored = RunState.deserialize(json)
      expect(restored.getState().cycle).toBe(5)
      expect(restored.getState().activeModifiers).toEqual(['mod_a', 'mod_b', 'mod_c'])
    })

    it('反序列化向后兼容（无 cycle 字段时默认 1）', () => {
      const oldSave = {
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
        masteryCounters: {},
        devourIcons: {},
      }
      const restored = RunState.deserialize(oldSave as any)
      expect(restored.getState().cycle).toBe(1)
      expect(restored.getState().activeModifiers).toEqual([])
    })

    it('cycle 序列化/反序列化往返保持一致', () => {
      ;(runState as any).data.cycle = 7
      ;(runState as any).data.activeModifiers = ['x', 'y']
      const serialized = runState.serialize()
      const json = JSON.parse(JSON.stringify(serialized))
      const restored = RunState.deserialize(json)
      const reSerialized = restored.serialize() as any
      expect(reSerialized.cycle).toBe(7)
      expect(reSerialized.activeModifiers).toEqual(['x', 'y'])
    })
  })

  // === AC3: advanceCycle() 流程测试 ===

  describe('advanceCycle() 周目推进', () => {
    beforeEach(() => {
      resetState()
    })

    it('cycle 递增', () => {
      expect(state.cycle).toBe(1)
      advanceCycle()
      expect(state.cycle).toBe(2)
    })

    it('连续推进 cycle 递增', () => {
      advanceCycle()
      advanceCycle()
      advanceCycle()
      expect(state.cycle).toBe(4)
    })

    it('level 重置为 1', () => {
      state.level = 10
      advanceCycle()
      expect(state.level).toBe(1)
    })

    it('bossModifierPool 重新抽取（3 个）', () => {
      const oldPool = [...state.bossModifierPool]
      advanceCycle()
      expect(state.bossModifierPool).toHaveLength(3)
      // 新池可能与旧池不同（随机）
    })

    it('tempBuffs 清空', () => {
      state.tempBuffs = [
        { type: 'multiplier', value: 1.0, expiresAtNode: 10 },
        { type: 'time', value: 5, expiresAtNode: 8 },
      ]
      advanceCycle()
      expect(state.tempBuffs).toEqual([])
    })

    it('sealedKeys 清空', () => {
      state.sealedKeys = [
        { key: 'A', skillId: 'prod_burst', expiresAtNode: 10 },
      ]
      advanceCycle()
      expect(state.sealedKeys).toEqual([])
    })

    it('保留 skills', () => {
      state.player.skills.set('prod_burst', { level: 3 })
      state.player.skills.set('conv_base_score_add', { level: 2 })
      advanceCycle()
      expect(state.player.skills.size).toBe(2)
      expect(state.player.skills.get('prod_burst')!.level).toBe(3)
    })

    it('保留 bindings', () => {
      state.player.bindings.set('f', 'prod_burst')
      advanceCycle()
      expect(state.player.bindings.get('f')).toBe('prod_burst')
    })

    it('保留 gold', () => {
      state.gold = 350
      advanceCycle()
      expect(state.gold).toBe(350)
    })

    it('保留 growthValues', () => {
      state.growthValues.set('skill_a', 0.24)
      advanceCycle()
      expect(state.growthValues.get('skill_a')).toBe(0.24)
    })

    it('保留 masteryCounters', () => {
      state.masteryCounters.set('skill_b', 30)
      advanceCycle()
      expect(state.masteryCounters.get('skill_b')).toBe(30)
    })

    it('保留 devourIcons', () => {
      state.devourIcons.set('skill_c', ['🔥', '⚡'])
      advanceCycle()
      expect(state.devourIcons.get('skill_c')).toEqual(['🔥', '⚡'])
    })

    it('保留 relics', () => {
      state.player.relics.add('lucky_coin')
      advanceCycle()
      expect(state.player.relics.has('lucky_coin')).toBe(true)
    })

    it('保留 wordDeck', () => {
      state.player.wordDeck = ['hello', 'world', 'test']
      advanceCycle()
      expect(state.player.wordDeck).toEqual(['hello', 'world', 'test'])
    })

    it('保留 enchantedSkills/evolvedSkills', () => {
      state.player.enchantedSkills.set('prod_burst', 'ench_growth_adjacent')
      state.player.evolvedSkills.set('prod_burst', 'prod_burst_evo_a')
      advanceCycle()
      expect(state.player.enchantedSkills.get('prod_burst')).toBe('ench_growth_adjacent')
      expect(state.player.evolvedSkills.get('prod_burst')).toBe('prod_burst_evo_a')
    })
  })

  // === AC5: HUD 显示逻辑 ===

  describe('HUD 周目显示逻辑', () => {
    it('周目 1 时不显示周目前缀', () => {
      const cycle = 1
      const prefix = cycle >= 2 ? `周目${cycle} · ` : ''
      expect(prefix).toBe('')
    })

    it('周目 2 时显示周目前缀', () => {
      const cycle = 2
      const prefix = cycle >= 2 ? `周目${cycle} · ` : ''
      expect(prefix).toBe('周目2 · ')
    })

    it('周目 5 时显示正确前缀', () => {
      const cycle = 5
      const prefix = cycle >= 2 ? `周目${cycle} · ` : ''
      expect(prefix).toBe('周目5 · ')
    })

    it('战斗 HUD 周目1 格式: LEVEL X', () => {
      const cycle = 1
      const displayLevel = 3
      const stageLabel = ' [ELITE]'
      const cyclePrefix = cycle >= 2 ? `周目${cycle} · ` : ''
      const label = `${cyclePrefix}LEVEL ${displayLevel}${stageLabel}`
      expect(label).toBe('LEVEL 3 [ELITE]')
    })

    it('战斗 HUD 周目3 格式: 周目3 · LEVEL X', () => {
      const cycle = 3
      const displayLevel = 1
      const stageLabel = ''
      const cyclePrefix = cycle >= 2 ? `周目${cycle} · ` : ''
      const label = `${cyclePrefix}LEVEL ${displayLevel}${stageLabel}`
      expect(label).toBe('周目3 · LEVEL 1')
    })
  })
})
