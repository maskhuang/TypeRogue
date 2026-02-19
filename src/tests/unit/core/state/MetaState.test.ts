// ============================================
// 打字肉鸽 - MetaState 单元测试
// ============================================
// Story 6.1 Task 10: MetaState 单元测试

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MetaState } from '../../../../src/core/state/MetaState'
import { eventBus } from '../../../../src/core/events/EventBus'
import type { RunResultData } from '../../../../src/core/state/MetaState'

describe('MetaState', () => {
  let metaState: MetaState

  beforeEach(() => {
    eventBus.clear()
    metaState = new MetaState()
  })

  afterEach(() => {
    eventBus.clear()
  })

  // ===========================================
  // 初始化测试 (AC: #1, #2, #3, #4, #11)
  // ===========================================
  describe('初始化', () => {
    it('应包含默认解锁的技能 (AC: #1, #11)', () => {
      expect(metaState.isSkillUnlocked('score_boost')).toBe(true)
      expect(metaState.isSkillUnlocked('time_extend')).toBe(true)
      expect(metaState.isSkillUnlocked('combo_shield')).toBe(true)
      expect(metaState.isSkillUnlocked('aura_basic')).toBe(true)
      expect(metaState.isSkillUnlocked('core_basic')).toBe(true)
    })

    it('应包含默认解锁的遗物 (AC: #2, #11)', () => {
      expect(metaState.isRelicUnlocked('lucky_coin')).toBe(true)
      expect(metaState.isRelicUnlocked('speed_ring')).toBe(true)
    })

    it('未知技能应返回未解锁 (AC: #1)', () => {
      expect(metaState.isSkillUnlocked('unknown_skill')).toBe(false)
    })

    it('未知遗物应返回未解锁 (AC: #2)', () => {
      expect(metaState.isRelicUnlocked('unknown_relic')).toBe(false)
    })

    it('应有初始统计数据全为零 (AC: #4, #5)', () => {
      const stats = metaState.getStats()
      expect(stats.totalRuns).toBe(0)
      expect(stats.victories).toBe(0)
      expect(stats.highestScore).toBe(0)
      expect(stats.totalPlayTime).toBe(0)
      expect(stats.totalKeystrokes).toBe(0)
      expect(stats.totalWordsCompleted).toBe(0)
      expect(stats.longestCombo).toBe(0)
      expect(stats.perfectRunCount).toBe(0)
    })

    it('应有空的成就列表 (AC: #3)', () => {
      expect(metaState.getAllAchievements()).toHaveLength(0)
    })
  })

  // ===========================================
  // 技能解锁测试 (AC: #6, #9)
  // ===========================================
  describe('解锁技能', () => {
    it('应能解锁新技能 (AC: #6)', () => {
      const result = metaState.unlockSkill('new_skill')
      expect(result).toBe(true)
      expect(metaState.isSkillUnlocked('new_skill')).toBe(true)
    })

    it('重复解锁应返回 false (AC: #6)', () => {
      metaState.unlockSkill('new_skill')
      const result = metaState.unlockSkill('new_skill')
      expect(result).toBe(false)
    })

    it('解锁时应发送 meta:skill_unlocked 事件', () => {
      const handler = vi.fn()
      eventBus.on('meta:skill_unlocked', handler)
      metaState.unlockSkill('new_skill')
      expect(handler).toHaveBeenCalledWith({ skillId: 'new_skill' })
    })

    it('重复解锁不应发送事件', () => {
      const handler = vi.fn()
      metaState.unlockSkill('new_skill')
      eventBus.on('meta:skill_unlocked', handler)
      metaState.unlockSkill('new_skill')
      expect(handler).not.toHaveBeenCalled()
    })

    it('应能获取所有已解锁技能列表 (AC: #9)', () => {
      const skills = metaState.getUnlockedSkills()
      expect(skills).toContain('score_boost')
      expect(skills).toContain('time_extend')
      expect(Array.isArray(skills)).toBe(true)
    })

    it('解锁新技能后列表应更新', () => {
      metaState.unlockSkill('new_skill')
      const skills = metaState.getUnlockedSkills()
      expect(skills).toContain('new_skill')
    })

    it('默认已解锁的技能重复解锁返回 false', () => {
      const result = metaState.unlockSkill('score_boost')
      expect(result).toBe(false)
    })

    it('isSkillUnlocked 应正确检查状态 (AC: #9)', () => {
      expect(metaState.isSkillUnlocked('score_boost')).toBe(true)
      expect(metaState.isSkillUnlocked('nonexistent')).toBe(false)
      metaState.unlockSkill('test_skill')
      expect(metaState.isSkillUnlocked('test_skill')).toBe(true)
    })
  })

  // ===========================================
  // 遗物解锁测试 (AC: #7, #9)
  // ===========================================
  describe('解锁遗物', () => {
    it('应能解锁新遗物 (AC: #7)', () => {
      const result = metaState.unlockRelic('new_relic')
      expect(result).toBe(true)
      expect(metaState.isRelicUnlocked('new_relic')).toBe(true)
    })

    it('重复解锁应返回 false (AC: #7)', () => {
      metaState.unlockRelic('new_relic')
      const result = metaState.unlockRelic('new_relic')
      expect(result).toBe(false)
    })

    it('解锁时应发送 meta:relic_unlocked 事件', () => {
      const handler = vi.fn()
      eventBus.on('meta:relic_unlocked', handler)
      metaState.unlockRelic('new_relic')
      expect(handler).toHaveBeenCalledWith({ relicId: 'new_relic' })
    })

    it('重复解锁不应发送事件', () => {
      const handler = vi.fn()
      metaState.unlockRelic('new_relic')
      eventBus.on('meta:relic_unlocked', handler)
      metaState.unlockRelic('new_relic')
      expect(handler).not.toHaveBeenCalled()
    })

    it('应能获取所有已解锁遗物列表 (AC: #9)', () => {
      const relics = metaState.getUnlockedRelics()
      expect(relics).toContain('lucky_coin')
      expect(relics).toContain('speed_ring')
      expect(Array.isArray(relics)).toBe(true)
    })

    it('解锁新遗物后列表应更新', () => {
      metaState.unlockRelic('new_relic')
      const relics = metaState.getUnlockedRelics()
      expect(relics).toContain('new_relic')
    })

    it('默认已解锁的遗物重复解锁返回 false', () => {
      const result = metaState.unlockRelic('lucky_coin')
      expect(result).toBe(false)
    })

    it('isRelicUnlocked 应正确检查状态 (AC: #9)', () => {
      expect(metaState.isRelicUnlocked('lucky_coin')).toBe(true)
      expect(metaState.isRelicUnlocked('nonexistent')).toBe(false)
      metaState.unlockRelic('test_relic')
      expect(metaState.isRelicUnlocked('test_relic')).toBe(true)
    })
  })

  // ===========================================
  // 统计更新测试 (AC: #8, #5)
  // ===========================================
  describe('统计更新', () => {
    const createRunResult = (overrides: Partial<RunResultData> = {}): RunResultData => ({
      runResult: 'victory',
      runStats: {
        totalScore: 1000,
        totalTime: 300000,
        stagesCleared: 8,
        maxCombo: 50,
        perfectWords: 20,
        keystrokes: 500,
        wordsCompleted: 100,
        skills: ['skill1', 'skill2'],
        relics: ['relic1'],
        ...overrides.runStats,
      },
      ...overrides,
    })

    it('应更新 Run 计数 (AC: #8)', () => {
      metaState.updateStats(createRunResult())
      expect(metaState.getStats().totalRuns).toBe(1)
    })

    it('胜利时应增加胜利计数 (AC: #8)', () => {
      metaState.updateStats(createRunResult({ runResult: 'victory' }))
      expect(metaState.getStats().victories).toBe(1)
    })

    it('失败时不应增加胜利计数 (AC: #8)', () => {
      metaState.updateStats(createRunResult({ runResult: 'gameover' }))
      expect(metaState.getStats().victories).toBe(0)
      expect(metaState.getStats().totalRuns).toBe(1)
    })

    it('完美通关应增加 perfectRunCount (AC: #8)', () => {
      metaState.updateStats(createRunResult({
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 8,
          maxCombo: 50,
          skills: [],
          relics: []
        }
      }))
      expect(metaState.getStats().perfectRunCount).toBe(1)
    })

    it('非完美通关不应增加 perfectRunCount', () => {
      metaState.updateStats(createRunResult({
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 5,
          maxCombo: 50,
          skills: [],
          relics: []
        }
      }))
      expect(metaState.getStats().perfectRunCount).toBe(0)
    })

    it('应更新最高分 (AC: #5)', () => {
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 5000, stagesCleared: 3, maxCombo: 30, skills: [], relics: [] }
      }))
      expect(metaState.getStats().highestScore).toBe(5000)
    })

    it('较低分数不应更新最高分', () => {
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 5000, stagesCleared: 3, maxCombo: 30, skills: [], relics: [] }
      }))
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 3000, stagesCleared: 2, maxCombo: 20, skills: [], relics: [] }
      }))
      expect(metaState.getStats().highestScore).toBe(5000)
    })

    it('应累加游戏时间 (AC: #5)', () => {
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 1000, totalTime: 60000, stagesCleared: 3, maxCombo: 30, skills: [], relics: [] }
      }))
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 2000, totalTime: 90000, stagesCleared: 4, maxCombo: 40, skills: [], relics: [] }
      }))
      expect(metaState.getStats().totalPlayTime).toBe(150000)
    })

    it('应累加击键数 (AC: #5)', () => {
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 1000, keystrokes: 200, stagesCleared: 3, maxCombo: 30, skills: [], relics: [] }
      }))
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 2000, keystrokes: 300, stagesCleared: 4, maxCombo: 40, skills: [], relics: [] }
      }))
      expect(metaState.getStats().totalKeystrokes).toBe(500)
    })

    it('应累加词语数 (AC: #5)', () => {
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 1000, wordsCompleted: 50, stagesCleared: 3, maxCombo: 30, skills: [], relics: [] }
      }))
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 2000, wordsCompleted: 70, stagesCleared: 4, maxCombo: 40, skills: [], relics: [] }
      }))
      expect(metaState.getStats().totalWordsCompleted).toBe(120)
    })

    it('应更新最高连击 (AC: #5)', () => {
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 1000, maxCombo: 60, stagesCleared: 3, skills: [], relics: [] }
      }))
      expect(metaState.getStats().longestCombo).toBe(60)
    })

    it('较低连击不应更新最高连击', () => {
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 1000, maxCombo: 60, stagesCleared: 3, skills: [], relics: [] }
      }))
      metaState.updateStats(createRunResult({
        runStats: { totalScore: 2000, maxCombo: 40, stagesCleared: 4, skills: [], relics: [] }
      }))
      expect(metaState.getStats().longestCombo).toBe(60)
    })

    it('getStats 应返回副本防止外部修改', () => {
      const stats1 = metaState.getStats()
      stats1.totalRuns = 999
      const stats2 = metaState.getStats()
      expect(stats2.totalRuns).toBe(0)
    })
  })

  // ===========================================
  // 解锁检查测试 (AC: #12)
  // ===========================================
  describe('解锁检查 - checkUnlocks', () => {
    it('checkUnlocks 应更新统计数据 (AC: #12)', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 2000,
          stagesCleared: 8,
          maxCombo: 40,
          skills: [],
          relics: []
        }
      }
      metaState.checkUnlocks(data)
      expect(metaState.getStats().totalRuns).toBe(1)
      expect(metaState.getStats().victories).toBe(1)
    })

    it('checkUnlocks 应发送 meta:stats_updated 事件 (AC: #12)', () => {
      const handler = vi.fn()
      eventBus.on('meta:stats_updated', handler)

      metaState.checkUnlocks({
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 8,
          maxCombo: 30,
          skills: [],
          relics: []
        }
      })

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        stats: expect.objectContaining({
          totalRuns: 1,
          victories: 1
        })
      }))
    })

    it('应响应 meta:check_unlocks 事件 (AC: #12)', () => {
      // 创建新实例确保事件监听器设置正确
      const newMetaState = new MetaState()

      eventBus.emit('meta:check_unlocks', {
        runResult: 'victory',
        runStats: {
          totalScore: 3000,
          stagesCleared: 8,
          maxCombo: 50,
          skills: [],
          relics: []
        }
      })

      expect(newMetaState.getStats().totalRuns).toBe(1)
    })
  })

  // ===========================================
  // 序列化测试 (AC: #10)
  // ===========================================
  describe('序列化', () => {
    it('应能序列化为 JSON 字符串 (AC: #10)', () => {
      const json = metaState.serialize()
      expect(typeof json).toBe('string')
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('序列化应包含版本号', () => {
      const json = metaState.serialize()
      const data = JSON.parse(json)
      expect(data.version).toBe(1)
    })

    it('序列化应包含所有解锁技能', () => {
      metaState.unlockSkill('test_skill')
      const json = metaState.serialize()
      const data = JSON.parse(json)
      expect(data.unlockedSkills).toContain('test_skill')
      expect(data.unlockedSkills).toContain('score_boost')
    })

    it('序列化应包含所有解锁遗物', () => {
      metaState.unlockRelic('test_relic')
      const json = metaState.serialize()
      const data = JSON.parse(json)
      expect(data.unlockedRelics).toContain('test_relic')
      expect(data.unlockedRelics).toContain('lucky_coin')
    })

    it('序列化应包含统计数据', () => {
      metaState.updateStats({
        runResult: 'victory',
        runStats: { totalScore: 5000, stagesCleared: 8, maxCombo: 50, skills: [], relics: [] }
      })
      const json = metaState.serialize()
      const data = JSON.parse(json)
      expect(data.stats.totalRuns).toBe(1)
      expect(data.stats.highestScore).toBe(5000)
    })

    it('应能从 JSON 反序列化 (AC: #10)', () => {
      metaState.unlockSkill('test_skill')
      metaState.unlockRelic('test_relic')
      metaState.updateStats({
        runResult: 'victory',
        runStats: { totalScore: 7000, stagesCleared: 8, maxCombo: 60, skills: [], relics: [] }
      })
      const json = metaState.serialize()

      const newState = new MetaState()
      newState.deserialize(json)

      expect(newState.isSkillUnlocked('test_skill')).toBe(true)
      expect(newState.isRelicUnlocked('test_relic')).toBe(true)
      expect(newState.getStats().highestScore).toBe(7000)
      expect(newState.getStats().totalRuns).toBe(1)
    })

    it('反序列化无效 JSON 应保持当前状态', () => {
      metaState.unlockSkill('my_skill')
      metaState.deserialize('invalid json')
      // 应保持当前状态
      expect(metaState.isSkillUnlocked('my_skill')).toBe(true)
    })

    it('反序列化空数据应使用默认值', () => {
      const newState = new MetaState()
      newState.deserialize('{}')
      // 应使用默认值
      expect(newState.isSkillUnlocked('score_boost')).toBe(true)
      expect(newState.getStats().totalRuns).toBe(0)
    })
  })

  // ===========================================
  // 重置测试
  // ===========================================
  describe('重置', () => {
    it('reset 应恢复默认解锁技能', () => {
      metaState.unlockSkill('extra_skill')
      metaState.reset()
      expect(metaState.isSkillUnlocked('extra_skill')).toBe(false)
      expect(metaState.isSkillUnlocked('score_boost')).toBe(true)
    })

    it('reset 应恢复默认解锁遗物', () => {
      metaState.unlockRelic('extra_relic')
      metaState.reset()
      expect(metaState.isRelicUnlocked('extra_relic')).toBe(false)
      expect(metaState.isRelicUnlocked('lucky_coin')).toBe(true)
    })

    it('reset 应清零统计数据', () => {
      metaState.updateStats({
        runResult: 'victory',
        runStats: { totalScore: 5000, stagesCleared: 8, maxCombo: 50, skills: [], relics: [] }
      })
      metaState.reset()
      expect(metaState.getStats().totalRuns).toBe(0)
      expect(metaState.getStats().highestScore).toBe(0)
    })

    it('reset 应清空成就', () => {
      metaState.registerAchievement({ id: 'test', name: 'Test', target: 10 })
      metaState.reset()
      expect(metaState.getAllAchievements()).toHaveLength(0)
    })
  })

  // ===========================================
  // 成就测试 (AC: #3)
  // ===========================================
  describe('成就', () => {
    it('应能注册成就 (AC: #3)', () => {
      metaState.registerAchievement({ id: 'first_win', name: '首胜', target: 1 })
      const achievement = metaState.getAchievement('first_win')
      expect(achievement).toBeDefined()
      expect(achievement?.name).toBe('首胜')
      expect(achievement?.progress).toBe(0)
      expect(achievement?.unlocked).toBe(false)
    })

    it('重复注册成就不应覆盖', () => {
      metaState.registerAchievement({ id: 'test', name: 'Original', target: 10 })
      metaState.updateAchievementProgress('test', 5)
      metaState.registerAchievement({ id: 'test', name: 'New', target: 20 })
      const achievement = metaState.getAchievement('test')
      expect(achievement?.name).toBe('Original')
      expect(achievement?.progress).toBe(5)
    })

    it('应能更新成就进度', () => {
      metaState.registerAchievement({ id: 'scorer', name: 'Scorer', target: 100 })
      metaState.updateAchievementProgress('scorer', 50)
      expect(metaState.getAchievement('scorer')?.progress).toBe(50)
    })

    it('进度达标时应解锁成就', () => {
      metaState.registerAchievement({ id: 'winner', name: 'Winner', target: 10 })
      const unlocked = metaState.updateAchievementProgress('winner', 10)
      expect(unlocked).toBe(true)
      expect(metaState.getAchievement('winner')?.unlocked).toBe(true)
    })

    it('进度超过目标时应限制在目标值', () => {
      metaState.registerAchievement({ id: 'test', name: 'Test', target: 10 })
      metaState.updateAchievementProgress('test', 15)
      expect(metaState.getAchievement('test')?.progress).toBe(10)
    })

    it('解锁成就时应发送事件', () => {
      const handler = vi.fn()
      eventBus.on('meta:achievement_unlocked', handler)

      metaState.registerAchievement({ id: 'test', name: 'Test', target: 5 })
      metaState.updateAchievementProgress('test', 5)

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        achievement: expect.objectContaining({
          id: 'test',
          unlocked: true
        })
      }))
    })

    it('已解锁成就更新进度不应重复发送事件', () => {
      const handler = vi.fn()
      metaState.registerAchievement({ id: 'test', name: 'Test', target: 5 })
      metaState.updateAchievementProgress('test', 5)

      eventBus.on('meta:achievement_unlocked', handler)
      metaState.updateAchievementProgress('test', 5)

      expect(handler).not.toHaveBeenCalled()
    })

    it('解锁时应记录时间戳', () => {
      metaState.registerAchievement({ id: 'test', name: 'Test', target: 1 })
      const before = Date.now()
      metaState.updateAchievementProgress('test', 1)
      const after = Date.now()

      const achievement = metaState.getAchievement('test')
      expect(achievement?.unlockedAt).toBeGreaterThanOrEqual(before)
      expect(achievement?.unlockedAt).toBeLessThanOrEqual(after)
    })

    it('getAllAchievements 应返回所有成就', () => {
      metaState.registerAchievement({ id: 'a1', name: 'A1', target: 10 })
      metaState.registerAchievement({ id: 'a2', name: 'A2', target: 20 })
      const achievements = metaState.getAllAchievements()
      expect(achievements).toHaveLength(2)
    })

    it('更新不存在的成就应返回 false', () => {
      const result = metaState.updateAchievementProgress('nonexistent', 10)
      expect(result).toBe(false)
    })

    it('getAchievement 查询不存在的成就应返回 undefined', () => {
      expect(metaState.getAchievement('nonexistent')).toBeUndefined()
    })

    it('getAchievement 应返回副本防止外部修改', () => {
      metaState.registerAchievement({ id: 'test', name: 'Test', target: 10 })
      const achievement = metaState.getAchievement('test')
      achievement!.unlocked = true
      achievement!.progress = 999
      // 原始数据应不受影响
      const original = metaState.getAchievement('test')
      expect(original?.unlocked).toBe(false)
      expect(original?.progress).toBe(0)
    })

    it('getAllAchievements 应返回副本防止外部修改', () => {
      metaState.registerAchievement({ id: 'test', name: 'Test', target: 10 })
      const achievements = metaState.getAllAchievements()
      achievements[0].unlocked = true
      achievements[0].progress = 999
      // 原始数据应不受影响
      const original = metaState.getAchievement('test')
      expect(original?.unlocked).toBe(false)
      expect(original?.progress).toBe(0)
    })
  })

  // ===========================================
  // dispose 测试 (H3)
  // ===========================================
  describe('dispose', () => {
    it('dispose 后不应响应 meta:check_unlocks 事件', () => {
      const testState = new MetaState()
      testState.dispose()

      eventBus.emit('meta:check_unlocks', {
        runResult: 'victory',
        runStats: {
          totalScore: 5000,
          stagesCleared: 8,
          maxCombo: 50,
          skills: [],
          relics: []
        }
      })

      // dispose 后不应更新统计
      expect(testState.getStats().totalRuns).toBe(0)
    })

    it('多次 dispose 应是幂等的（不抛错）', () => {
      const testState = new MetaState()
      expect(() => {
        testState.dispose()
        testState.dispose()
        testState.dispose()
      }).not.toThrow()
    })
  })

  // ===========================================
  // 参数验证测试 (M3)
  // ===========================================
  describe('参数验证', () => {
    it('unlockSkill 空字符串应返回 false', () => {
      expect(metaState.unlockSkill('')).toBe(false)
      expect(metaState.getUnlockedSkills()).not.toContain('')
    })

    it('unlockRelic 空字符串应返回 false', () => {
      expect(metaState.unlockRelic('')).toBe(false)
      expect(metaState.getUnlockedRelics()).not.toContain('')
    })

    it('unlockSkill null/undefined 应返回 false', () => {
      expect(metaState.unlockSkill(null as unknown as string)).toBe(false)
      expect(metaState.unlockSkill(undefined as unknown as string)).toBe(false)
    })

    it('unlockRelic null/undefined 应返回 false', () => {
      expect(metaState.unlockRelic(null as unknown as string)).toBe(false)
      expect(metaState.unlockRelic(undefined as unknown as string)).toBe(false)
    })
  })

  // ===========================================
  // 成就序列化往返测试 (M2)
  // ===========================================
  describe('成就序列化往返', () => {
    it('成就数据应完整序列化和反序列化', () => {
      // 注册并部分完成成就
      metaState.registerAchievement({ id: 'partial', name: 'Partial', target: 100 })
      metaState.updateAchievementProgress('partial', 50)

      // 注册并完成成就
      metaState.registerAchievement({ id: 'complete', name: 'Complete', target: 10 })
      metaState.updateAchievementProgress('complete', 10)

      const json = metaState.serialize()
      const newState = new MetaState()
      newState.deserialize(json)

      // 验证部分完成的成就
      const partial = newState.getAchievement('partial')
      expect(partial).toBeDefined()
      expect(partial?.progress).toBe(50)
      expect(partial?.unlocked).toBe(false)

      // 验证已完成的成就
      const complete = newState.getAchievement('complete')
      expect(complete).toBeDefined()
      expect(complete?.progress).toBe(10)
      expect(complete?.unlocked).toBe(true)
      expect(complete?.unlockedAt).toBeDefined()
    })
  })
})
