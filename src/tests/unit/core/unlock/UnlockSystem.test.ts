// ============================================
// 打字肉鸽 - 解锁系统单元测试
// ============================================
// Story 6.3: 解锁系统

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UnlockSystem } from '../../../../src/core/unlock/UnlockSystem'
import type { UnlockCondition, UnlockConditionType, UnlockDefinition } from '../../../../src/core/unlock/UnlockSystem'
import { MetaState } from '../../../../src/core/state/MetaState'
import type { RunResultData } from '../../../../src/core/state/MetaState'
import { eventBus } from '../../../../src/core/events/EventBus'

describe('UnlockSystem', () => {
  let metaState: MetaState
  let unlockSystem: UnlockSystem

  beforeEach(() => {
    metaState = new MetaState()
    unlockSystem = new UnlockSystem(metaState)
  })

  afterEach(() => {
    metaState.dispose()
  })

  // ===========================================
  // Task 1: UnlockCondition 接口定义测试 (AC: #1)
  // ===========================================

  describe('类型定义 (AC: #1)', () => {
    it('UnlockConditionType 应支持四种条件类型', () => {
      const types: UnlockConditionType[] = ['milestone', 'build', 'stats', 'challenge']
      expect(types).toHaveLength(4)
    })

    it('UnlockCondition 应支持里程碑条件', () => {
      const condition: UnlockCondition = {
        type: 'milestone',
        milestone: { act: 1, minStages: 3 }
      }
      expect(condition.type).toBe('milestone')
      expect(condition.milestone?.act).toBe(1)
      expect(condition.milestone?.minStages).toBe(3)
    })

    it('UnlockCondition 应支持 Build 成就条件', () => {
      const condition: UnlockCondition = {
        type: 'build',
        build: {
          requiredSkills: ['aura_basic'],
          minSkillCount: 3,
          mustWin: true
        }
      }
      expect(condition.type).toBe('build')
      expect(condition.build?.requiredSkills).toContain('aura_basic')
      expect(condition.build?.minSkillCount).toBe(3)
      expect(condition.build?.mustWin).toBe(true)
    })

    it('UnlockCondition 应支持统计阈值条件', () => {
      const condition: UnlockCondition = {
        type: 'stats',
        stats: { field: 'totalRuns', threshold: 10 }
      }
      expect(condition.type).toBe('stats')
      expect(condition.stats?.field).toBe('totalRuns')
      expect(condition.stats?.threshold).toBe(10)
    })

    it('UnlockCondition 应支持挑战条件', () => {
      const condition: UnlockCondition = {
        type: 'challenge',
        challenge: { ascensionLevel: 1 }
      }
      expect(condition.type).toBe('challenge')
      expect(condition.challenge?.ascensionLevel).toBe(1)
    })

    it('UnlockDefinition 应包含完整定义字段', () => {
      const def: UnlockDefinition = {
        id: 'test_unlock',
        type: 'skill',
        targetId: 'test_skill',
        name: '测试解锁',
        description: '测试描述',
        condition: {
          type: 'milestone',
          milestone: { act: 1, minStages: 3 }
        }
      }
      expect(def.id).toBe('test_unlock')
      expect(def.type).toBe('skill')
      expect(def.targetId).toBe('test_skill')
      expect(def.name).toBe('测试解锁')
      expect(def.description).toBe('测试描述')
      expect(def.condition.type).toBe('milestone')
    })

    it('UnlockDefinition 应支持遗物类型', () => {
      const def: UnlockDefinition = {
        id: 'test_relic_unlock',
        type: 'relic',
        targetId: 'test_relic',
        name: '测试遗物解锁',
        description: '测试描述',
        condition: {
          type: 'stats',
          stats: { field: 'victories', threshold: 5 }
        }
      }
      expect(def.type).toBe('relic')
    })
  })

  // ===========================================
  // 里程碑解锁测试 (AC: #2)
  // ===========================================

  describe('里程碑解锁 (AC: #2)', () => {
    it('通关 Act 1 应解锁相应技能', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 3,
          maxCombo: 20,
          skills: ['score_boost'],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const act1Unlock = newUnlocks.find(u => u.id === 'milestone_act1')
      expect(act1Unlock).toBeDefined()
      expect(metaState.isSkillUnlocked('echo_basic')).toBe(true)
    })

    it('通关 Act 2 应解锁相应技能', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 5000,
          stagesCleared: 6,
          maxCombo: 50,
          skills: [],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const act2Unlock = newUnlocks.find(u => u.id === 'milestone_act2')
      expect(act2Unlock).toBeDefined()
      expect(metaState.isSkillUnlocked('ripple_basic')).toBe(true)
    })

    it('通关全部 8 关应解锁 Act 3 奖励', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 10000,
          stagesCleared: 8,
          maxCombo: 80,
          skills: [],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const act3Unlock = newUnlocks.find(u => u.id === 'milestone_act3')
      expect(act3Unlock).toBeDefined()
      expect(metaState.isSkillUnlocked('void_master')).toBe(true)
    })

    it('通关 Act 1 应同时解锁遗物', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 3,
          maxCombo: 20,
          skills: [],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const relicUnlock = newUnlocks.find(u => u.id === 'milestone_relic_act1')
      expect(relicUnlock).toBeDefined()
      expect(metaState.isRelicUnlocked('combo_keeper')).toBe(true)
    })

    it('失败时不应解锁里程碑', () => {
      const data: RunResultData = {
        runResult: 'gameover',
        runStats: {
          totalScore: 1000,
          stagesCleared: 3,
          maxCombo: 20,
          skills: ['score_boost'],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const milestoneUnlocks = newUnlocks.filter(u =>
        u.condition.type === 'milestone'
      )
      expect(milestoneUnlocks.length).toBe(0)
    })

    it('关卡数不足时不应解锁', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 500,
          stagesCleared: 2,
          maxCombo: 10,
          skills: [],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const act1Unlock = newUnlocks.find(u => u.id === 'milestone_act1')
      expect(act1Unlock).toBeUndefined()
    })
  })

  // ===========================================
  // Build 成就解锁测试 (AC: #3)
  // ===========================================

  describe('Build 成就解锁 (AC: #3)', () => {
    it('满足技能组合条件时应解锁', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 2000,
          stagesCleared: 8,
          maxCombo: 50,
          skills: ['aura_basic', 'aura_skill_2', 'aura_skill_3'],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const buildUnlock = newUnlocks.find(u => u.id === 'build_aura_master')
      expect(buildUnlock).toBeDefined()
      expect(metaState.isSkillUnlocked('aura_enhanced')).toBe(true)
    })

    it('仅 1 技能胜利应解锁孤狼成就', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 3000,
          stagesCleared: 8,
          maxCombo: 30,
          skills: ['score_boost'],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const loneWolfUnlock = newUnlocks.find(u => u.id === 'build_lone_wolf')
      expect(loneWolfUnlock).toBeDefined()
      expect(metaState.isSkillUnlocked('lone_enhanced')).toBe(true)
    })

    it('失败时 mustWin=true 的成就不应解锁', () => {
      const data: RunResultData = {
        runResult: 'gameover',
        runStats: {
          totalScore: 2000,
          stagesCleared: 5,
          maxCombo: 50,
          skills: ['aura_basic', 'aura_skill_2', 'aura_skill_3'],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const buildUnlocks = newUnlocks.filter(u =>
        u.condition.type === 'build'
      )
      expect(buildUnlocks.length).toBe(0)
    })

    it('缺少必需技能时不应解锁', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 2000,
          stagesCleared: 8,
          maxCombo: 50,
          skills: ['other_skill_1', 'other_skill_2', 'other_skill_3'],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const auraUnlock = newUnlocks.find(u => u.id === 'build_aura_master')
      expect(auraUnlock).toBeUndefined()
    })

    it('技能数量不足时不应解锁', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 2000,
          stagesCleared: 8,
          maxCombo: 50,
          skills: ['aura_basic', 'aura_skill_2'],  // 只有2个，需要3个
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const auraUnlock = newUnlocks.find(u => u.id === 'build_aura_master')
      expect(auraUnlock).toBeUndefined()
    })
  })

  // ===========================================
  // 统计解锁测试 (AC: #4)
  // ===========================================

  describe('统计解锁 (AC: #4)', () => {
    it('达到局数阈值时应解锁', () => {
      // 模拟 10 局游戏（先更新统计，再检查解锁）
      // UnlockSystem.checkUnlocks 使用当前 stats，所以需要先更新到阈值
      for (let i = 0; i < 10; i++) {
        metaState.updateStats({
          runResult: 'gameover',
          runStats: {
            totalScore: 100,
            stagesCleared: 1,
            maxCombo: 5,
            skills: [],
            relics: []
          }
        })
      }

      // 检查解锁（此时 totalRuns = 10）
      const data: RunResultData = {
        runResult: 'gameover',
        runStats: {
          totalScore: 100,
          stagesCleared: 1,
          maxCombo: 5,
          skills: [],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const veteranUnlock = newUnlocks.find(u => u.id === 'stats_veteran')
      expect(veteranUnlock).toBeDefined()
      expect(metaState.isSkillUnlocked('score_veteran')).toBe(true)
    })

    it('达到胜利次数阈值时应解锁', () => {
      // 模拟 5 次胜利（先更新统计到阈值）
      for (let i = 0; i < 5; i++) {
        metaState.updateStats({
          runResult: 'victory',
          runStats: {
            totalScore: 1000,
            stagesCleared: 8,
            maxCombo: 20,
            skills: [],
            relics: []
          }
        })
      }

      // 检查解锁（此时 victories = 5）
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 8,
          maxCombo: 20,
          skills: [],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const winnerUnlock = newUnlocks.find(u => u.id === 'stats_winner')
      expect(winnerUnlock).toBeDefined()
      expect(metaState.isSkillUnlocked('time_master')).toBe(true)
    })

    it('达到最高分阈值时应解锁', () => {
      // 先更新统计使 highestScore 达到阈值
      metaState.updateStats({
        runResult: 'victory',
        runStats: {
          totalScore: 50000,
          stagesCleared: 8,
          maxCombo: 80,
          skills: ['score_boost'],
          relics: []
        }
      })

      // 检查解锁（此时 highestScore = 50000）
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 50000,
          stagesCleared: 8,
          maxCombo: 80,
          skills: ['score_boost'],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const highscoreUnlock = newUnlocks.find(u => u.id === 'stats_highscore')
      expect(highscoreUnlock).toBeDefined()
      expect(metaState.isRelicUnlocked('score_amplifier')).toBe(true)
    })

    it('达到连击阈值时应解锁', () => {
      // 先更新统计使 longestCombo 达到阈值
      metaState.updateStats({
        runResult: 'victory',
        runStats: {
          totalScore: 10000,
          stagesCleared: 8,
          maxCombo: 100,
          skills: [],
          relics: []
        }
      })

      // 检查解锁（此时 longestCombo = 100）
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 10000,
          stagesCleared: 8,
          maxCombo: 100,
          skills: [],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const comboUnlock = newUnlocks.find(u => u.id === 'stats_combo_legend')
      expect(comboUnlock).toBeDefined()
      expect(metaState.isSkillUnlocked('combo_legend')).toBe(true)
    })

    it('未达到阈值时不应解锁', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 8,
          maxCombo: 50,  // 低于 100
          skills: [],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const comboUnlock = newUnlocks.find(u => u.id === 'stats_combo_legend')
      expect(comboUnlock).toBeUndefined()
    })
  })

  // ===========================================
  // 挑战解锁测试 (AC: #4 扩展)
  // ===========================================

  describe('挑战解锁', () => {
    it('完成 Ascension 1 应解锁', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 5000,
          stagesCleared: 8,
          maxCombo: 50,
          skills: [],
          relics: [],
          ascensionLevel: 1
        } as RunResultData['runStats'] & { ascensionLevel: number }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const challengeUnlock = newUnlocks.find(u => u.id === 'challenge_a1')
      expect(challengeUnlock).toBeDefined()
      expect(metaState.isSkillUnlocked('ascension_boost')).toBe(true)
    })

    it('Ascension 等级不足时不应解锁', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 5000,
          stagesCleared: 8,
          maxCombo: 50,
          skills: [],
          relics: [],
          ascensionLevel: 0
        } as RunResultData['runStats'] & { ascensionLevel: number }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const challengeUnlock = newUnlocks.find(u => u.id === 'challenge_a1')
      expect(challengeUnlock).toBeUndefined()
    })

    it('失败时不应解锁挑战', () => {
      const data: RunResultData = {
        runResult: 'gameover',
        runStats: {
          totalScore: 5000,
          stagesCleared: 7,
          maxCombo: 50,
          skills: [],
          relics: [],
          ascensionLevel: 1
        } as RunResultData['runStats'] & { ascensionLevel: number }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      const challengeUnlock = newUnlocks.find(u => u.id === 'challenge_a1')
      expect(challengeUnlock).toBeUndefined()
    })
  })

  // ===========================================
  // 事件发送测试 (AC: #6)
  // ===========================================

  describe('解锁事件 (AC: #6)', () => {
    it('解锁技能时应发送 unlock:new 事件', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('unlock:new', handler)

      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 3,
          maxCombo: 20,
          skills: [],
          relics: []
        }
      }

      unlockSystem.checkUnlocks(data)

      expect(handler).toHaveBeenCalled()
      const call = handler.mock.calls[0][0]
      expect(call.type).toBe('skill')
      expect(call.name).toBeDefined()
      expect(call.description).toBeDefined()

      unsubscribe()
    })

    it('解锁遗物时应发送正确的事件类型', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('unlock:new', handler)

      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 3,
          maxCombo: 20,
          skills: [],
          relics: []
        }
      }

      unlockSystem.checkUnlocks(data)

      // 应该有遗物解锁事件 (milestone_relic_act1)
      const relicEvents = handler.mock.calls.filter(
        (call: unknown[]) => (call[0] as { type: string }).type === 'relic'
      )
      expect(relicEvents.length).toBeGreaterThan(0)

      unsubscribe()
    })

    it('多个解锁时应发送多个事件', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('unlock:new', handler)

      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 3,
          maxCombo: 20,
          skills: [],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      // 应该为每个解锁发送一个事件
      expect(handler).toHaveBeenCalledTimes(newUnlocks.length)

      unsubscribe()
    })
  })

  // ===========================================
  // 重复解锁防护测试
  // ===========================================

  describe('重复解锁防护', () => {
    it('已解锁的项目不应重复解锁', () => {
      // 先手动解锁
      metaState.unlockSkill('echo_basic')

      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 3,
          maxCombo: 20,
          skills: [],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      // echo_basic 不应在新解锁列表中
      const echoUnlock = newUnlocks.find(u => u.targetId === 'echo_basic')
      expect(echoUnlock).toBeUndefined()
    })

    it('连续调用 checkUnlocks 不应重复解锁', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 3,
          maxCombo: 20,
          skills: [],
          relics: []
        }
      }

      const firstUnlocks = unlockSystem.checkUnlocks(data)
      const secondUnlocks = unlockSystem.checkUnlocks(data)

      // 第二次调用不应返回相同的解锁
      expect(firstUnlocks.length).toBeGreaterThan(0)
      expect(secondUnlocks.length).toBe(0)
    })
  })

  // ===========================================
  // 边界情况测试
  // ===========================================

  describe('边界情况', () => {
    it('空技能列表应正确处理', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 8,
          maxCombo: 20,
          skills: [],
          relics: []
        }
      }

      // 不应抛出错误
      expect(() => unlockSystem.checkUnlocks(data)).not.toThrow()
    })

    it('stagesCleared 为 0 应正确处理', () => {
      const data: RunResultData = {
        runResult: 'gameover',
        runStats: {
          totalScore: 0,
          stagesCleared: 0,
          maxCombo: 0,
          skills: [],
          relics: []
        }
      }

      const newUnlocks = unlockSystem.checkUnlocks(data)

      // 不应有里程碑解锁
      const milestoneUnlocks = newUnlocks.filter(u =>
        u.condition.type === 'milestone'
      )
      expect(milestoneUnlocks.length).toBe(0)
    })

    it('极大数值应正确处理', () => {
      const data: RunResultData = {
        runResult: 'victory',
        runStats: {
          totalScore: Number.MAX_SAFE_INTEGER,
          stagesCleared: 8,
          maxCombo: 1000000,
          skills: [],
          relics: []
        }
      }

      // 不应抛出错误
      expect(() => unlockSystem.checkUnlocks(data)).not.toThrow()
    })
  })
})
