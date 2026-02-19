// ============================================
// 打字肉鸽 - StageManager 单元测试
// ============================================
// Story 5.2 Task 5: 单元测试

import { describe, it, expect, beforeEach } from 'vitest'
import { StageManager } from '../../../../src/systems/stage/StageManager'
import { LevelsData } from '../../../../src/systems/stage/StageConfig'

// 测试用关卡配置数据
const testLevelsData: LevelsData = {
  globalSettings: {
    baseTime: 60,
    timeIncrement: 5,
    difficultyScaling: 0.15
  },
  acts: [
    {
      id: 1,
      name: '初试锋芒',
      stages: [1, 3],
      description: '学习基础，熟悉技能系统'
    },
    {
      id: 2,
      name: '深入迷宫',
      stages: [4, 6],
      description: '挑战升级，策略构筑'
    },
    {
      id: 3,
      name: '最终决战',
      stages: [7, 8],
      description: '终极考验，击败 Boss'
    }
  ],
  stages: [
    {
      id: 1,
      name: '起点',
      act: 1,
      isBoss: false,
      timeLimit: 60,
      wordCount: 15,
      wordDifficulty: 1,
      baseGoldReward: 50,
      scoreMultiplier: 1.0,
      modifiers: []
    },
    {
      id: 2,
      name: '初探',
      act: 1,
      isBoss: false,
      timeLimit: 65,
      wordCount: 18,
      wordDifficulty: 1,
      baseGoldReward: 60,
      scoreMultiplier: 1.0,
      modifiers: []
    },
    {
      id: 3,
      name: '热身',
      act: 1,
      isBoss: false,
      timeLimit: 70,
      wordCount: 20,
      wordDifficulty: 2,
      baseGoldReward: 75,
      scoreMultiplier: 1.1,
      modifiers: []
    },
    {
      id: 4,
      name: '跃进',
      act: 2,
      isBoss: false,
      timeLimit: 75,
      wordCount: 22,
      wordDifficulty: 2,
      baseGoldReward: 90,
      scoreMultiplier: 1.2,
      modifiers: []
    },
    {
      id: 5,
      name: '挑战',
      act: 2,
      isBoss: false,
      timeLimit: 80,
      wordCount: 25,
      wordDifficulty: 3,
      baseGoldReward: 110,
      scoreMultiplier: 1.3,
      modifiers: ['time_pressure']
    },
    {
      id: 6,
      name: '险境',
      act: 2,
      isBoss: false,
      timeLimit: 85,
      wordCount: 28,
      wordDifficulty: 3,
      baseGoldReward: 130,
      scoreMultiplier: 1.4,
      modifiers: ['time_pressure']
    },
    {
      id: 7,
      name: '巅峰',
      act: 3,
      isBoss: false,
      timeLimit: 90,
      wordCount: 30,
      wordDifficulty: 4,
      baseGoldReward: 150,
      scoreMultiplier: 1.5,
      modifiers: ['time_pressure', 'bonus_combo']
    },
    {
      id: 8,
      name: '终极审判',
      act: 3,
      isBoss: true,
      timeLimit: 120,
      wordCount: 40,
      wordDifficulty: 5,
      baseGoldReward: 300,
      scoreMultiplier: 2.0,
      modifiers: ['boss', 'no_error']
    }
  ]
}

describe('StageManager', () => {
  let stageManager: StageManager

  beforeEach(() => {
    stageManager = new StageManager()
  })

  // ==================== 加载测试 ====================

  describe('加载', () => {
    it('isLoaded() 未加载时返回 false', () => {
      expect(stageManager.isLoaded()).toBe(false)
    })

    it('load() 应正确加载关卡数据', () => {
      stageManager.load(testLevelsData)
      expect(stageManager.isLoaded()).toBe(true)
    })

    it('reset() 应清除已加载数据', () => {
      stageManager.load(testLevelsData)
      stageManager.reset()
      expect(stageManager.isLoaded()).toBe(false)
    })
  })

  // ==================== 关卡查询测试 ====================

  describe('关卡查询', () => {
    beforeEach(() => {
      stageManager.load(testLevelsData)
    })

    it('getStage() 返回正确的关卡配置', () => {
      const stage1 = stageManager.getStage(1)
      expect(stage1).toBeDefined()
      expect(stage1?.name).toBe('起点')
      expect(stage1?.act).toBe(1)
      expect(stage1?.timeLimit).toBe(60)
    })

    it('getStage() 不存在的关卡返回 undefined', () => {
      expect(stageManager.getStage(99)).toBeUndefined()
      expect(stageManager.getStage(0)).toBeUndefined()
    })

    it('getAllStages() 返回所有 8 个关卡', () => {
      const stages = stageManager.getAllStages()
      expect(stages).toHaveLength(8)
    })

    it('getTotalStages() 返回 8', () => {
      expect(stageManager.getTotalStages()).toBe(8)
    })

    it('getTotalStages() 未加载时返回 0', () => {
      const newManager = new StageManager()
      expect(newManager.getTotalStages()).toBe(0)
    })
  })

  // ==================== 幕查询测试 ====================

  describe('幕查询', () => {
    beforeEach(() => {
      stageManager.load(testLevelsData)
    })

    it('getAct() 返回正确的幕信息', () => {
      const act1 = stageManager.getAct(1)
      expect(act1).toBeDefined()
      expect(act1?.name).toBe('初试锋芒')
      expect(act1?.stages).toEqual([1, 3])
    })

    it('getAct() 不存在的幕返回 undefined', () => {
      expect(stageManager.getAct(99)).toBeUndefined()
    })

    it('getTotalActs() 返回 3', () => {
      expect(stageManager.getTotalActs()).toBe(3)
    })

    it('getAllActs() 返回所有 3 个幕', () => {
      const acts = stageManager.getAllActs()
      expect(acts).toHaveLength(3)
      expect(acts[0].name).toBe('初试锋芒')
      expect(acts[1].name).toBe('深入迷宫')
      expect(acts[2].name).toBe('最终决战')
    })

    it('getAllActs() 未加载时返回空数组', () => {
      const newManager = new StageManager()
      expect(newManager.getAllActs()).toEqual([])
    })

    it('getStagesInAct(1) 返回关卡 1-3', () => {
      const stages = stageManager.getStagesInAct(1)
      expect(stages).toHaveLength(3)
      expect(stages.map(s => s.id)).toEqual([1, 2, 3])
    })

    it('getStagesInAct(2) 返回关卡 4-6', () => {
      const stages = stageManager.getStagesInAct(2)
      expect(stages).toHaveLength(3)
      expect(stages.map(s => s.id)).toEqual([4, 5, 6])
    })

    it('getStagesInAct(3) 返回关卡 7-8', () => {
      const stages = stageManager.getStagesInAct(3)
      expect(stages).toHaveLength(2)
      expect(stages.map(s => s.id)).toEqual([7, 8])
    })

    it('getStagesInAct() 不存在的幕返回空数组', () => {
      expect(stageManager.getStagesInAct(99)).toEqual([])
    })

    it('getActForStage() 返回正确的幕编号', () => {
      expect(stageManager.getActForStage(1)).toBe(1)
      expect(stageManager.getActForStage(3)).toBe(1)
      expect(stageManager.getActForStage(4)).toBe(2)
      expect(stageManager.getActForStage(6)).toBe(2)
      expect(stageManager.getActForStage(7)).toBe(3)
      expect(stageManager.getActForStage(8)).toBe(3)
    })

    it('getActForStage() 不存在的关卡返回 1', () => {
      expect(stageManager.getActForStage(99)).toBe(1)
    })
  })

  // ==================== Boss 关卡测试 ====================

  describe('Boss 关卡', () => {
    beforeEach(() => {
      stageManager.load(testLevelsData)
    })

    it('isBossStage(8) 返回 true', () => {
      expect(stageManager.isBossStage(8)).toBe(true)
    })

    it('isBossStage(1-7) 返回 false', () => {
      for (let i = 1; i <= 7; i++) {
        expect(stageManager.isBossStage(i)).toBe(false)
      }
    })

    it('isBossStage() 不存在的关卡返回 false', () => {
      expect(stageManager.isBossStage(99)).toBe(false)
    })

    it('isFinalStage(8) 返回 true', () => {
      expect(stageManager.isFinalStage(8)).toBe(true)
    })

    it('isFinalStage(7) 返回 false', () => {
      expect(stageManager.isFinalStage(7)).toBe(false)
    })

    it('isFinalStage() 未加载时返回 false', () => {
      const newManager = new StageManager()
      expect(newManager.isFinalStage(8)).toBe(false)
    })
  })

  // ==================== 难度参数测试 ====================

  describe('难度参数', () => {
    beforeEach(() => {
      stageManager.load(testLevelsData)
    })

    it('getEffectiveTimeLimit() 返回正确的时间', () => {
      expect(stageManager.getEffectiveTimeLimit(1)).toBe(60)
      expect(stageManager.getEffectiveTimeLimit(5)).toBe(80)
      expect(stageManager.getEffectiveTimeLimit(8)).toBe(120)
    })

    it('getEffectiveTimeLimit() 不存在的关卡返回默认 60', () => {
      expect(stageManager.getEffectiveTimeLimit(99)).toBe(60)
    })

    it('getWordDifficultyParams() 难度 1 的词语长度 3-5', () => {
      const params = stageManager.getWordDifficultyParams(1)
      expect(params.minLength).toBe(3)
      expect(params.maxLength).toBe(5)
      expect(params.complexity).toBe(0.2)
    })

    it('getWordDifficultyParams() 难度 2 的词语长度 4-6', () => {
      const params = stageManager.getWordDifficultyParams(3) // wordDifficulty: 2
      expect(params.minLength).toBe(4)
      expect(params.maxLength).toBe(6)
      expect(params.complexity).toBe(0.4)
    })

    it('getWordDifficultyParams() 难度 3 的词语长度 5-7', () => {
      const params = stageManager.getWordDifficultyParams(5) // wordDifficulty: 3
      expect(params.minLength).toBe(5)
      expect(params.maxLength).toBe(7)
      expect(params.complexity).toBe(0.6)
    })

    it('getWordDifficultyParams() 难度 4 的词语长度 5-8', () => {
      const params = stageManager.getWordDifficultyParams(7) // wordDifficulty: 4
      expect(params.minLength).toBe(5)
      expect(params.maxLength).toBe(8)
      expect(params.complexity).toBe(0.8)
    })

    it('getWordDifficultyParams() 难度 5 的词语长度 6-10', () => {
      const params = stageManager.getWordDifficultyParams(8) // wordDifficulty: 5
      expect(params.minLength).toBe(6)
      expect(params.maxLength).toBe(10)
      expect(params.complexity).toBe(1.0)
    })

    it('getWordDifficultyParams() 不存在的关卡返回难度 1 参数', () => {
      const params = stageManager.getWordDifficultyParams(99)
      expect(params.minLength).toBe(3)
      expect(params.maxLength).toBe(5)
    })
  })

  // ==================== 修饰符测试 ====================

  describe('修饰符', () => {
    beforeEach(() => {
      stageManager.load(testLevelsData)
    })

    it('hasModifier() 正确检测 time_pressure', () => {
      expect(stageManager.hasModifier(5, 'time_pressure')).toBe(true)
      expect(stageManager.hasModifier(6, 'time_pressure')).toBe(true)
      expect(stageManager.hasModifier(7, 'time_pressure')).toBe(true)
      expect(stageManager.hasModifier(1, 'time_pressure')).toBe(false)
    })

    it('hasModifier() Stage 8 有 boss 和 no_error 修饰符', () => {
      expect(stageManager.hasModifier(8, 'boss')).toBe(true)
      expect(stageManager.hasModifier(8, 'no_error')).toBe(true)
    })

    it('hasModifier() Stage 7 有 bonus_combo 修饰符', () => {
      expect(stageManager.hasModifier(7, 'bonus_combo')).toBe(true)
    })

    it('hasModifier() 不存在的关卡返回 false', () => {
      expect(stageManager.hasModifier(99, 'boss')).toBe(false)
    })

    it('getModifiers() 返回所有修饰符', () => {
      expect(stageManager.getModifiers(8)).toEqual(['boss', 'no_error'])
      expect(stageManager.getModifiers(7)).toEqual(['time_pressure', 'bonus_combo'])
      expect(stageManager.getModifiers(1)).toEqual([])
    })
  })

  // ==================== 全局设置测试 ====================

  describe('全局设置', () => {
    it('getGlobalSettings() 加载后返回正确设置', () => {
      stageManager.load(testLevelsData)
      const settings = stageManager.getGlobalSettings()
      expect(settings.baseTime).toBe(60)
      expect(settings.timeIncrement).toBe(5)
      expect(settings.difficultyScaling).toBe(0.15)
    })

    it('getGlobalSettings() 未加载返回默认设置', () => {
      const settings = stageManager.getGlobalSettings()
      expect(settings.baseTime).toBe(60)
      expect(settings.timeIncrement).toBe(5)
      expect(settings.difficultyScaling).toBe(0.15)
    })
  })

  // ==================== 关卡配置完整性测试 ====================

  describe('关卡配置完整性', () => {
    beforeEach(() => {
      stageManager.load(testLevelsData)
    })

    it('所有关卡都有必需字段', () => {
      const stages = stageManager.getAllStages()
      for (const stage of stages) {
        expect(stage.id).toBeGreaterThan(0)
        expect(stage.name).toBeDefined()
        expect(stage.act).toBeGreaterThanOrEqual(1)
        expect(stage.act).toBeLessThanOrEqual(3)
        expect(typeof stage.isBoss).toBe('boolean')
        expect(stage.timeLimit).toBeGreaterThan(0)
        expect(stage.wordCount).toBeGreaterThan(0)
        expect(stage.wordDifficulty).toBeGreaterThanOrEqual(1)
        expect(stage.wordDifficulty).toBeLessThanOrEqual(5)
        expect(stage.baseGoldReward).toBeGreaterThan(0)
        expect(stage.scoreMultiplier).toBeGreaterThan(0)
      }
    })

    it('难度递增验证：时间递增', () => {
      const stages = stageManager.getAllStages()
      for (let i = 1; i < stages.length - 1; i++) { // 排除 Boss 关卡
        expect(stages[i].timeLimit).toBeGreaterThanOrEqual(stages[i - 1].timeLimit)
      }
    })

    it('难度递增验证：词数递增', () => {
      const stages = stageManager.getAllStages()
      for (let i = 1; i < stages.length; i++) {
        expect(stages[i].wordCount).toBeGreaterThanOrEqual(stages[i - 1].wordCount)
      }
    })

    it('难度递增验证：金币奖励递增', () => {
      const stages = stageManager.getAllStages()
      for (let i = 1; i < stages.length; i++) {
        expect(stages[i].baseGoldReward).toBeGreaterThanOrEqual(stages[i - 1].baseGoldReward)
      }
    })
  })
})
