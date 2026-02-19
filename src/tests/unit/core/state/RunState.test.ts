// ============================================
// 打字肉鸽 - RunState 单元测试
// ============================================
// Story 5.1: Run 状态管理

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { RunState } from '../../../../src/core/state/RunState'
import { BattleResult } from '../../../../src/scenes/battle/BattleFlowController'

describe('RunState', () => {
  let runState: RunState

  beforeEach(() => {
    runState = new RunState()
  })

  // ==================== 初始化测试 ====================

  describe('初始化', () => {
    it('新建 RunState 应有正确的初始值', () => {
      const state = runState.getState()
      expect(state.skills).toEqual([])
      expect(state.bindings.size).toBe(0)
      expect(state.relics).toEqual([])
      expect(state.gold).toBe(0)
      expect(state.currentStage).toBe(1)
      expect(state.currentAct).toBe(1)
      expect(state.isActive).toBe(false)
      expect(state.stats.totalScore).toBe(0)
      expect(state.stats.maxCombo).toBe(0)
      expect(state.stats.wordsCompleted).toBe(0)
      expect(state.stats.battlesWon).toBe(0)
    })

    it('reset() 应重置所有数据', () => {
      // 修改状态
      runState.addSkill('fireBlast')
      runState.addGold(100)
      runState.addRelic('goldenKey')
      runState.startRun()

      // 重置
      runState.reset()

      const state = runState.getState()
      expect(state.skills).toEqual([])
      expect(state.gold).toBe(0)
      expect(state.relics).toEqual([])
      expect(state.isActive).toBe(false)
    })
  })

  // ==================== 技能管理测试 (AC1, AC5) ====================

  describe('技能管理', () => {
    it('addSkill() 应添加新技能', () => {
      runState.addSkill('fireBlast')
      expect(runState.getSkills()).toHaveLength(1)
      expect(runState.getSkills()[0]).toEqual({ id: 'fireBlast', level: 1 })
    })

    it('addSkill() 可以指定初始等级', () => {
      runState.addSkill('fireBlast', 2)
      expect(runState.getSkillLevel('fireBlast')).toBe(2)
    })

    it('addSkill() 重复添加应升级技能', () => {
      runState.addSkill('fireBlast')
      runState.addSkill('fireBlast')
      expect(runState.getSkillLevel('fireBlast')).toBe(2)
    })

    it('技能等级不应超过 3', () => {
      runState.addSkill('fireBlast', 3)
      runState.addSkill('fireBlast') // 尝试升级
      expect(runState.getSkillLevel('fireBlast')).toBe(3)
    })

    it('addSkill() 初始等级被限制在 1-3', () => {
      runState.addSkill('skill1', 0)
      runState.addSkill('skill2', 5)
      expect(runState.getSkillLevel('skill1')).toBe(1)
      expect(runState.getSkillLevel('skill2')).toBe(3)
    })

    it('getSkillLevel() 未拥有技能返回 0', () => {
      expect(runState.getSkillLevel('nonexistent')).toBe(0)
    })

    it('getSkills() 返回所有技能', () => {
      runState.addSkill('skill1')
      runState.addSkill('skill2')
      expect(runState.getSkills()).toHaveLength(2)
    })

    it('removeSkill() 应移除技能', () => {
      runState.addSkill('fireBlast')
      const result = runState.removeSkill('fireBlast')
      expect(result).toBe(true)
      expect(runState.getSkillLevel('fireBlast')).toBe(0)
    })

    it('removeSkill() 不存在的技能返回 false', () => {
      const result = runState.removeSkill('nonexistent')
      expect(result).toBe(false)
    })

    it('removeSkill() 应同时解绑该技能', () => {
      runState.addSkill('fireBlast')
      runState.bindSkill('F', 'fireBlast')
      runState.removeSkill('fireBlast')
      expect(runState.getSkillAtKey('F')).toBeUndefined()
    })

    it('removeSkill() 应解绑多个键位', () => {
      runState.addSkill('fireBlast')
      runState.bindSkill('F', 'fireBlast')
      runState.bindSkill('G', 'fireBlast')
      runState.removeSkill('fireBlast')
      expect(runState.getSkillAtKey('F')).toBeUndefined()
      expect(runState.getSkillAtKey('G')).toBeUndefined()
    })
  })

  describe('技能绑定', () => {
    beforeEach(() => {
      runState.addSkill('fireBlast')
      runState.addSkill('iceShield')
    })

    it('bindSkill() 应正确绑定键位', () => {
      runState.bindSkill('F', 'fireBlast')
      expect(runState.getSkillAtKey('F')).toBe('fireBlast')
    })

    it('bindSkill() 应支持小写键位（转换为大写）', () => {
      runState.bindSkill('f', 'fireBlast')
      expect(runState.getSkillAtKey('F')).toBe('fireBlast')
    })

    it('bindSkill() 无效键位应抛出错误', () => {
      expect(() => runState.bindSkill('1', 'fireBlast')).toThrow('Invalid key')
      expect(() => runState.bindSkill('', 'fireBlast')).toThrow('Invalid key')
      expect(() => runState.bindSkill('FF', 'fireBlast')).toThrow('Invalid key')
    })

    it('bindSkill() 未拥有技能应抛出错误', () => {
      expect(() => runState.bindSkill('F', 'nonexistent')).toThrow('Skill not owned')
    })

    it('unbindSkill() 应移除绑定', () => {
      runState.bindSkill('F', 'fireBlast')
      runState.unbindSkill('F')
      expect(runState.getSkillAtKey('F')).toBeUndefined()
    })

    it('getSkillAtKey() 未绑定返回 undefined', () => {
      expect(runState.getSkillAtKey('X')).toBeUndefined()
    })

    it('getBindings() 应返回所有绑定', () => {
      runState.bindSkill('F', 'fireBlast')
      runState.bindSkill('I', 'iceShield')
      const bindings = runState.getBindings()
      expect(bindings.get('F')).toBe('fireBlast')
      expect(bindings.get('I')).toBe('iceShield')
    })

    it('覆盖绑定到同一键位', () => {
      runState.bindSkill('F', 'fireBlast')
      runState.bindSkill('F', 'iceShield')
      expect(runState.getSkillAtKey('F')).toBe('iceShield')
    })

    it('getKeyForSkill() 返回技能绑定的键位', () => {
      runState.bindSkill('F', 'fireBlast')
      expect(runState.getKeyForSkill('fireBlast')).toBe('F')
    })

    it('getKeyForSkill() 未绑定返回 undefined', () => {
      expect(runState.getKeyForSkill('fireBlast')).toBeUndefined()
    })

    it('isSkillBound() 返回正确的绑定状态', () => {
      runState.bindSkill('F', 'fireBlast')
      expect(runState.isSkillBound('fireBlast')).toBe(true)
      expect(runState.isSkillBound('iceShield')).toBe(false)
    })
  })

  // ==================== 金币测试 (AC2) ====================

  describe('金币管理', () => {
    it('初始金币为 0', () => {
      expect(runState.getGold()).toBe(0)
    })

    it('addGold() 应增加金币', () => {
      runState.addGold(100)
      expect(runState.getGold()).toBe(100)
    })

    it('addGold() 累加金币', () => {
      runState.addGold(50)
      runState.addGold(30)
      expect(runState.getGold()).toBe(80)
    })

    it('addGold() 负数应减少金币', () => {
      runState.addGold(100)
      runState.addGold(-30)
      expect(runState.getGold()).toBe(70)
    })

    it('金币不应低于 0', () => {
      runState.addGold(50)
      runState.addGold(-100)
      expect(runState.getGold()).toBe(0)
    })

    it('spendGold() 成功返回 true', () => {
      runState.addGold(100)
      const result = runState.spendGold(50)
      expect(result).toBe(true)
      expect(runState.getGold()).toBe(50)
    })

    it('spendGold() 余额不足返回 false', () => {
      runState.addGold(30)
      const result = runState.spendGold(50)
      expect(result).toBe(false)
      expect(runState.getGold()).toBe(30) // 余额不变
    })

    it('spendGold() 刚好足够时返回 true', () => {
      runState.addGold(50)
      const result = runState.spendGold(50)
      expect(result).toBe(true)
      expect(runState.getGold()).toBe(0)
    })

    it('spendGold() 负数金额返回 false', () => {
      runState.addGold(100)
      const result = runState.spendGold(-50)
      expect(result).toBe(false)
      expect(runState.getGold()).toBe(100) // 余额不变
    })
  })

  // ==================== 遗物测试 (AC4) ====================

  describe('遗物管理', () => {
    it('addRelic() 应添加遗物', () => {
      runState.addRelic('goldenKey')
      expect(runState.getRelics()).toContain('goldenKey')
    })

    it('addRelic() 重复添加不应重复', () => {
      runState.addRelic('goldenKey')
      runState.addRelic('goldenKey')
      expect(runState.getRelics()).toHaveLength(1)
    })

    it('hasRelic() 应正确返回', () => {
      runState.addRelic('goldenKey')
      expect(runState.hasRelic('goldenKey')).toBe(true)
      expect(runState.hasRelic('silverKey')).toBe(false)
    })

    it('getRelics() 返回所有遗物', () => {
      runState.addRelic('relic1')
      runState.addRelic('relic2')
      expect(runState.getRelics()).toHaveLength(2)
    })
  })

  // ==================== 关卡进度测试 (AC3) ====================

  describe('关卡进度', () => {
    it('初始关卡为 1，幕数为 1', () => {
      expect(runState.getCurrentStage()).toBe(1)
      expect(runState.getCurrentAct()).toBe(1)
    })

    it('advanceStage() 应推进关卡', () => {
      runState.advanceStage()
      expect(runState.getCurrentStage()).toBe(2)
    })

    it('Act 1: 关卡 1-3', () => {
      expect(runState.getCurrentAct()).toBe(1) // Stage 1
      runState.advanceStage() // Stage 2
      expect(runState.getCurrentAct()).toBe(1)
      runState.advanceStage() // Stage 3
      expect(runState.getCurrentAct()).toBe(1)
    })

    it('Act 2: 关卡 4-6', () => {
      // 推进到 Stage 4
      runState.advanceStage() // 2
      runState.advanceStage() // 3
      runState.advanceStage() // 4
      expect(runState.getCurrentStage()).toBe(4)
      expect(runState.getCurrentAct()).toBe(2)

      runState.advanceStage() // 5
      expect(runState.getCurrentAct()).toBe(2)
      runState.advanceStage() // 6
      expect(runState.getCurrentAct()).toBe(2)
    })

    it('Act 3: 关卡 7-8', () => {
      // 推进到 Stage 7
      for (let i = 0; i < 6; i++) runState.advanceStage()
      expect(runState.getCurrentStage()).toBe(7)
      expect(runState.getCurrentAct()).toBe(3)

      runState.advanceStage() // 8
      expect(runState.getCurrentStage()).toBe(8)
      expect(runState.getCurrentAct()).toBe(3)
    })

    it('isBossStage() 在第 8 关返回 true', () => {
      expect(runState.isBossStage()).toBe(false)
      // 推进到 Stage 8
      for (let i = 0; i < 7; i++) runState.advanceStage()
      expect(runState.isBossStage()).toBe(true)
    })

    it('isBossStage() 在非 Boss 关返回 false', () => {
      runState.advanceStage() // Stage 2
      expect(runState.isBossStage()).toBe(false)
    })

    it('advanceStage() 在 Stage 8 后不应继续推进', () => {
      // 推进到 Stage 8
      for (let i = 0; i < 7; i++) runState.advanceStage()
      expect(runState.getCurrentStage()).toBe(8)

      // 尝试继续推进
      runState.advanceStage()
      expect(runState.getCurrentStage()).toBe(8) // 仍为 8
      expect(runState.getCurrentAct()).toBe(3)
    })
  })

  // ==================== Run 生命周期测试 (AC6) ====================

  describe('Run 生命周期', () => {
    it('startRun() 应重置并激活', () => {
      // 先添加一些数据
      runState.addGold(100)
      runState.addSkill('fireBlast')

      runState.startRun()

      expect(runState.isActive()).toBe(true)
      expect(runState.getGold()).toBe(0)
      expect(runState.getSkills()).toHaveLength(0)
    })

    it('startRun() 应设置开始时间', () => {
      const beforeTime = Date.now()
      runState.startRun()
      const afterTime = Date.now()

      const stats = runState.getStats()
      expect(stats.startTime).toBeGreaterThanOrEqual(beforeTime)
      expect(stats.startTime).toBeLessThanOrEqual(afterTime)
    })

    it('endRun() 应结束 Run', () => {
      runState.startRun()
      runState.endRun()
      expect(runState.isActive()).toBe(false)
    })

    it('isActive() 应正确反映状态', () => {
      expect(runState.isActive()).toBe(false)
      runState.startRun()
      expect(runState.isActive()).toBe(true)
      runState.endRun()
      expect(runState.isActive()).toBe(false)
    })
  })

  // ==================== 战斗集成测试 (AC7) ====================

  describe('战斗集成', () => {
    const mockWinResult: BattleResult = {
      result: 'win',
      score: 500,
      maxCombo: 10,
      accuracy: 0.95,
      wordsCompleted: 25,
      timeUsed: 45
    }

    const mockLoseResult: BattleResult = {
      result: 'lose',
      score: 200,
      maxCombo: 5,
      accuracy: 0.80,
      wordsCompleted: 10,
      timeUsed: 60
    }

    it('applyBattleResult() 应更新统计', () => {
      runState.applyBattleResult(mockWinResult)

      const stats = runState.getStats()
      expect(stats.totalScore).toBe(500)
      expect(stats.maxCombo).toBe(10)
      expect(stats.wordsCompleted).toBe(25)
    })

    it('applyBattleResult() 累加多次战斗结果', () => {
      runState.applyBattleResult(mockWinResult)
      runState.applyBattleResult(mockWinResult)

      const stats = runState.getStats()
      expect(stats.totalScore).toBe(1000)
      expect(stats.wordsCompleted).toBe(50)
    })

    it('胜利战斗应增加 battlesWon', () => {
      runState.applyBattleResult(mockWinResult)
      expect(runState.getStats().battlesWon).toBe(1)
    })

    it('失败战斗不应增加 battlesWon', () => {
      runState.applyBattleResult(mockLoseResult)
      expect(runState.getStats().battlesWon).toBe(0)
    })

    it('胜利战斗应增加金币奖励', () => {
      runState.applyBattleResult(mockWinResult)
      // 500 分 / 100 = 5 金币
      expect(runState.getGold()).toBe(5)
    })

    it('失败战斗不应增加金币', () => {
      runState.applyBattleResult(mockLoseResult)
      expect(runState.getGold()).toBe(0)
    })

    it('maxCombo 应取最大值', () => {
      const result1: BattleResult = { ...mockWinResult, maxCombo: 10 }
      const result2: BattleResult = { ...mockWinResult, maxCombo: 5 }

      runState.applyBattleResult(result1)
      runState.applyBattleResult(result2)

      expect(runState.getStats().maxCombo).toBe(10)
    })

    it('maxCombo 应更新为更高值', () => {
      const result1: BattleResult = { ...mockWinResult, maxCombo: 5 }
      const result2: BattleResult = { ...mockWinResult, maxCombo: 15 }

      runState.applyBattleResult(result1)
      runState.applyBattleResult(result2)

      expect(runState.getStats().maxCombo).toBe(15)
    })
  })

  // ==================== 持续时间测试 ====================

  describe('Run 持续时间', () => {
    it('未开始时 getRunDuration() 返回 0', () => {
      expect(runState.getRunDuration()).toBe(0)
    })

    it('开始后 getRunDuration() 返回正值', async () => {
      runState.startRun()
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(runState.getRunDuration()).toBeGreaterThan(0)
    })

    it('结束后 getRunDuration() 返回 0', () => {
      runState.startRun()
      runState.endRun()
      expect(runState.getRunDuration()).toBe(0)
    })
  })

  // ==================== 状态只读保护测试 ====================

  describe('状态只读保护', () => {
    it('getState() 返回只读状态', () => {
      const state = runState.getState()
      // TypeScript 会阻止直接修改，这里验证返回的是正确类型
      expect(state).toBeDefined()
      expect(typeof state.gold).toBe('number')
    })

    it('getStats() 返回只读统计', () => {
      const stats = runState.getStats()
      expect(stats).toBeDefined()
      expect(typeof stats.totalScore).toBe('number')
    })
  })

  // ==================== 序列化测试 ====================

  describe('序列化', () => {
    it('serialize() 应返回可 JSON 化的对象', () => {
      runState.startRun()
      runState.addSkill('fireBlast', 2)
      runState.bindSkill('F', 'fireBlast')
      runState.addGold(100)
      runState.addRelic('goldenKey')
      runState.advanceStage()

      const serialized = runState.serialize()

      // 验证可 JSON 化
      const jsonString = JSON.stringify(serialized)
      expect(jsonString).toBeDefined()

      const parsed = JSON.parse(jsonString)
      expect(parsed.skills).toEqual([{ id: 'fireBlast', level: 2 }])
      expect(parsed.bindings).toEqual({ F: 'fireBlast' })
      expect(parsed.gold).toBe(100)
      expect(parsed.relics).toEqual(['goldenKey'])
      expect(parsed.currentStage).toBe(2)
    })

    it('deserialize() 应正确恢复状态', () => {
      // 设置原始状态
      runState.startRun()
      runState.addSkill('fireBlast', 2)
      runState.addSkill('iceShield', 1)
      runState.bindSkill('F', 'fireBlast')
      runState.bindSkill('I', 'iceShield')
      runState.addGold(250)
      runState.addRelic('goldenKey')
      runState.addRelic('silverRing')
      runState.advanceStage()
      runState.advanceStage()
      runState.advanceStage()

      // 序列化
      const serialized = runState.serialize()

      // 模拟 JSON 往返
      const jsonString = JSON.stringify(serialized)
      const parsed = JSON.parse(jsonString)

      // 反序列化
      const restored = RunState.deserialize(parsed)

      // 验证恢复的状态
      expect(restored.getSkillLevel('fireBlast')).toBe(2)
      expect(restored.getSkillLevel('iceShield')).toBe(1)
      expect(restored.getSkillAtKey('F')).toBe('fireBlast')
      expect(restored.getSkillAtKey('I')).toBe('iceShield')
      expect(restored.getGold()).toBe(250)
      expect(restored.hasRelic('goldenKey')).toBe(true)
      expect(restored.hasRelic('silverRing')).toBe(true)
      expect(restored.getCurrentStage()).toBe(4)
      expect(restored.getCurrentAct()).toBe(2)
      expect(restored.isActive()).toBe(true)
    })

    it('序列化/反序列化应保持战斗统计', () => {
      runState.startRun()
      runState.applyBattleResult({
        result: 'win',
        score: 500,
        maxCombo: 15,
        accuracy: 0.95,
        wordsCompleted: 30,
        timeUsed: 60
      })

      const serialized = runState.serialize()
      const jsonString = JSON.stringify(serialized)
      const parsed = JSON.parse(jsonString)
      const restored = RunState.deserialize(parsed)

      const stats = restored.getStats()
      expect(stats.totalScore).toBe(500)
      expect(stats.maxCombo).toBe(15)
      expect(stats.wordsCompleted).toBe(30)
      expect(stats.battlesWon).toBe(1)
    })

    it('空状态序列化/反序列化', () => {
      const serialized = runState.serialize()
      const jsonString = JSON.stringify(serialized)
      const parsed = JSON.parse(jsonString)
      const restored = RunState.deserialize(parsed)

      expect(restored.getSkills()).toHaveLength(0)
      expect(restored.getBindings().size).toBe(0)
      expect(restored.getGold()).toBe(0)
      expect(restored.getRelics()).toHaveLength(0)
      expect(restored.getCurrentStage()).toBe(1)
      expect(restored.isActive()).toBe(false)
    })
  })
})
