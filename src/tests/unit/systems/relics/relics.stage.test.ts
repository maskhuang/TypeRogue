// ============================================
// 打字肉鸽 - 关卡进度系统遗物行为测试 (Story 36.10)
// ============================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  WARMUP_DURATION,
  WARMUP_BONUS,
  INTERMISSION_GOLD,
  INTERMISSION_FREE_REFRESH,
  ENDURANCE_TIME_BONUS,
  PHOENIX_REVIVE_TIME,
  getWarmUpBonus,
  checkIntermission,
  grantIntermissionFreeRefreshes,
  hasIntermissionFreeRefresh,
  consumeIntermissionFreeRefresh,
  getEnduranceTimeBonus,
  getActiveBounty,
  onBountyError,
  checkBountyOnWordComplete,
  checkBountyOnStageEnd,
  rollBounty,
  BOUNTY_REWARDS,
  BOUNTY_TYPES,
  checkPhoenixRevive,
  consumePhoenix,
  resetStageRelicBattleState,
  initStageRelicBehaviors,
} from '../../../../src/systems/relics/StageRelicBehaviors'
import * as seededRandom from '../../../../src/core/seededRandom'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'

// === 辅助 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

describe('关卡进度系统遗物行为 (Story 36.10)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
    vi.useFakeTimers()
    resetStageRelicBattleState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // === 常量 ===
  describe('常量', () => {
    it('WARMUP_DURATION = 10', () => expect(WARMUP_DURATION).toBe(10))
    it('WARMUP_BONUS = 0.10', () => expect(WARMUP_BONUS).toBe(0.10))
    it('INTERMISSION_GOLD = 25', () => expect(INTERMISSION_GOLD).toBe(25))
    it('INTERMISSION_FREE_REFRESH = 2', () => expect(INTERMISSION_FREE_REFRESH).toBe(2))
    it('ENDURANCE_TIME_BONUS = 10', () => expect(ENDURANCE_TIME_BONUS).toBe(10))
    it('PHOENIX_REVIVE_TIME = 10', () => expect(PHOENIX_REVIVE_TIME).toBe(10))
  })

  // === 暖身操 (warm_up) ===
  describe('暖身操 (warm_up)', () => {
    it('无遗物 → 0', () => {
      expect(getWarmUpBonus()).toBe(0)
    })

    it('有遗物 + 不到 10 秒 → WARMUP_BONUS', () => {
      state.player.relics.add('warm_up')
      // resetStageRelicBattleState 在 beforeEach 中已设置 _stageStartTime = Date.now()
      // 不前进时间，应该在 10 秒内
      expect(getWarmUpBonus()).toBe(WARMUP_BONUS)
    })

    it('有遗物 + 超过 10 秒 → 0', () => {
      state.player.relics.add('warm_up')
      vi.advanceTimersByTime(11000) // 11 秒
      expect(getWarmUpBonus()).toBe(0)
    })

    it('有遗物 + 恰好 10 秒 → 0（边界）', () => {
      state.player.relics.add('warm_up')
      vi.advanceTimersByTime(10000) // 10 秒
      expect(getWarmUpBonus()).toBe(0)
    })

    it('有遗物 + 9.9 秒 → WARMUP_BONUS', () => {
      state.player.relics.add('warm_up')
      vi.advanceTimersByTime(9900) // 9.9 秒
      expect(getWarmUpBonus()).toBe(WARMUP_BONUS)
    })
  })

  // === 幕间准备 (intermission) ===
  describe('幕间准备 (intermission)', () => {
    it('无遗物 → null', () => {
      expect(checkIntermission()).toBeNull()
    })

    it('有遗物 → { gold: 10, freeRefreshes: 1 }', () => {
      state.player.relics.add('intermission')
      const result = checkIntermission()
      expect(result).toEqual({ gold: INTERMISSION_GOLD, freeRefreshes: INTERMISSION_FREE_REFRESH })
    })

    it('免费刷新初始为 false', () => {
      expect(hasIntermissionFreeRefresh()).toBe(false)
    })

    it('授予免费刷新后 → true', () => {
      grantIntermissionFreeRefreshes(1)
      expect(hasIntermissionFreeRefresh()).toBe(true)
    })

    it('消耗免费刷新后 → false', () => {
      grantIntermissionFreeRefreshes(1)
      consumeIntermissionFreeRefresh()
      expect(hasIntermissionFreeRefresh()).toBe(false)
    })

    it('多次消耗不会变负', () => {
      consumeIntermissionFreeRefresh()
      consumeIntermissionFreeRefresh()
      expect(hasIntermissionFreeRefresh()).toBe(false)
    })
  })

  // === 续航电池 (endurance_battery) ===
  describe('续航电池 (endurance_battery)', () => {
    it('无遗物 → 0', () => {
      expect(getEnduranceTimeBonus()).toBe(0)
    })

    it('有遗物 → ENDURANCE_TIME_BONUS', () => {
      state.player.relics.add('endurance_battery')
      expect(getEnduranceTimeBonus()).toBe(ENDURANCE_TIME_BONUS)
    })
  })

  // === 猎物悬赏 (elite_hunter → bounty hunt) ===
  describe('猎物悬赏 (elite_hunter)', () => {
    let randomSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      randomSpy = vi.spyOn(seededRandom, 'random')
    })

    afterEach(() => {
      randomSpy.mockRestore()
    })

    it('无遗物 → getActiveBounty 返回 null', () => {
      expect(getActiveBounty()).toBeNull()
    })

    it('有遗物 → rollBounty 后返回有效悬赏', () => {
      state.player.relics.add('elite_hunter')
      resetStageRelicBattleState()
      const bounty = getActiveBounty()
      expect(bounty).not.toBeNull()
      expect(BOUNTY_TYPES).toContain(bounty!.type)
      expect(bounty!.completed).toBe(false)
      expect(bounty!.reward).toBe(BOUNTY_REWARDS[bounty!.type])
    })

    it('combo_20: combo 达 20 → 完成', () => {
      state.player.relics.add('elite_hunter')
      randomSpy.mockReturnValue(0.2) // floor(0.2*5)=1 → combo_20
      resetStageRelicBattleState()
      expect(getActiveBounty()!.type).toBe('combo_20')
      expect(checkBountyOnWordComplete({ combo: 19, wordsCompleted: 1, wordTime: 3, perfect: false })).toBe(0)
      expect(checkBountyOnWordComplete({ combo: 20, wordsCompleted: 2, wordTime: 3, perfect: false })).toBe(BOUNTY_REWARDS.combo_20)
      expect(getActiveBounty()!.completed).toBe(true)
    })

    it('words_8: 完成 8 个单词 → 完成', () => {
      state.player.relics.add('elite_hunter')
      randomSpy.mockReturnValue(0.4) // floor(0.4*5)=2 → words_8
      resetStageRelicBattleState()
      expect(getActiveBounty()!.type).toBe('words_8')
      expect(checkBountyOnWordComplete({ combo: 1, wordsCompleted: 7, wordTime: 3, perfect: false })).toBe(0)
      expect(checkBountyOnWordComplete({ combo: 1, wordsCompleted: 8, wordTime: 3, perfect: false })).toBe(BOUNTY_REWARDS.words_8)
    })

    it('speed_word: wordTime ≤ 2 → 完成', () => {
      state.player.relics.add('elite_hunter')
      randomSpy.mockReturnValue(0.6) // floor(0.6*5)=3 → speed_word
      resetStageRelicBattleState()
      expect(getActiveBounty()!.type).toBe('speed_word')
      expect(checkBountyOnWordComplete({ combo: 1, wordsCompleted: 1, wordTime: 3, perfect: false })).toBe(0)
      expect(checkBountyOnWordComplete({ combo: 1, wordsCompleted: 2, wordTime: 1.5, perfect: false })).toBe(BOUNTY_REWARDS.speed_word)
    })

    it('perfect_3: 连续 3 个完美 → 完成', () => {
      state.player.relics.add('elite_hunter')
      randomSpy.mockReturnValue(0.8) // floor(0.8*5)=4 → perfect_3
      resetStageRelicBattleState()
      expect(getActiveBounty()!.type).toBe('perfect_3')
      expect(checkBountyOnWordComplete({ combo: 1, wordsCompleted: 1, wordTime: 3, perfect: true })).toBe(0)
      expect(checkBountyOnWordComplete({ combo: 2, wordsCompleted: 2, wordTime: 3, perfect: true })).toBe(0)
      expect(checkBountyOnWordComplete({ combo: 3, wordsCompleted: 3, wordTime: 3, perfect: true })).toBe(BOUNTY_REWARDS.perfect_3)
    })

    it('perfect_3: 中间打错重置计数', () => {
      state.player.relics.add('elite_hunter')
      randomSpy.mockReturnValue(0.8) // perfect_3
      resetStageRelicBattleState()
      checkBountyOnWordComplete({ combo: 1, wordsCompleted: 1, wordTime: 3, perfect: true })
      checkBountyOnWordComplete({ combo: 2, wordsCompleted: 2, wordTime: 3, perfect: true })
      onBountyError() // 打错重置
      // 需要重新连续3个
      expect(checkBountyOnWordComplete({ combo: 1, wordsCompleted: 3, wordTime: 3, perfect: true })).toBe(0)
      expect(checkBountyOnWordComplete({ combo: 2, wordsCompleted: 4, wordTime: 3, perfect: true })).toBe(0)
      expect(checkBountyOnWordComplete({ combo: 3, wordsCompleted: 5, wordTime: 3, perfect: true })).toBe(BOUNTY_REWARDS.perfect_3)
    })

    it('zero_errors: 无错完关 → checkBountyOnStageEnd 返回奖励', () => {
      state.player.relics.add('elite_hunter')
      randomSpy.mockReturnValue(0.0) // floor(0.0*5)=0 → zero_errors
      resetStageRelicBattleState()
      expect(getActiveBounty()!.type).toBe('zero_errors')
      // 没有调用 onBountyError
      expect(checkBountyOnStageEnd()).toBe(BOUNTY_REWARDS.zero_errors)
      expect(getActiveBounty()!.completed).toBe(true)
    })

    it('zero_errors: 打错后 → checkBountyOnStageEnd 返回 0', () => {
      state.player.relics.add('elite_hunter')
      randomSpy.mockReturnValue(0.0) // zero_errors
      resetStageRelicBattleState()
      onBountyError()
      expect(checkBountyOnStageEnd()).toBe(0)
    })

    it('已完成后再次检查 → 0（不重复奖励）', () => {
      state.player.relics.add('elite_hunter')
      randomSpy.mockReturnValue(0.6) // speed_word
      resetStageRelicBattleState()
      checkBountyOnWordComplete({ combo: 1, wordsCompleted: 1, wordTime: 1.5, perfect: false })
      // 再次检查
      expect(checkBountyOnWordComplete({ combo: 1, wordsCompleted: 2, wordTime: 1.0, perfect: false })).toBe(0)
    })

    it('resetStageRelicBattleState 重新抽取悬赏', () => {
      state.player.relics.add('elite_hunter')
      resetStageRelicBattleState()
      expect(getActiveBounty()).not.toBeNull()
    })
  })

  // === 不死鸟 (phoenix) ===
  describe('不死鸟 (phoenix)', () => {
    it('无遗物 → null', () => {
      expect(checkPhoenixRevive()).toBeNull()
    })

    it('有遗物 + 普通关 → { reviveTime: 10, refreshModifiers: false }', () => {
      state.player.relics.add('phoenix')
      state.level = 1 // 普通关
      const result = checkPhoenixRevive()
      expect(result).toEqual({ reviveTime: PHOENIX_REVIVE_TIME, refreshModifiers: false })
    })

    it('有遗物 + 精英关 → refreshModifiers: true (AC: #7)', () => {
      state.player.relics.add('phoenix')
      state.level = 5 // 精英关（position 5）
      const result = checkPhoenixRevive()
      expect(result).toEqual({ reviveTime: PHOENIX_REVIVE_TIME, refreshModifiers: true })
    })

    it('有遗物 + Boss 关 → refreshModifiers: true', () => {
      state.player.relics.add('phoenix')
      state.level = 12 // Boss关（CYCLE_LENGTH=12）
      const result = checkPhoenixRevive()
      expect(result).toEqual({ reviveTime: PHOENIX_REVIVE_TIME, refreshModifiers: true })
    })

    it('consumePhoenix 移除遗物 (AC: #6)', () => {
      state.player.relics.add('phoenix')
      consumePhoenix()
      expect(state.player.relics.has('phoenix')).toBe(false)
    })

    it('消耗后再检查 → null（防止重复复活）(AC: #6)', () => {
      state.player.relics.add('phoenix')
      consumePhoenix()
      expect(checkPhoenixRevive()).toBeNull()
    })
  })

  // === 生命周期 ===
  describe('resetStageRelicBattleState', () => {
    it('重置后暖身操计时重新开始', () => {
      state.player.relics.add('warm_up')
      vi.advanceTimersByTime(15000) // 超过 10 秒
      expect(getWarmUpBonus()).toBe(0)

      resetStageRelicBattleState()
      expect(getWarmUpBonus()).toBe(WARMUP_BONUS) // 重新开始计时
    })

    it('重置后免费刷新清零', () => {
      grantIntermissionFreeRefreshes(1)
      expect(hasIntermissionFreeRefresh()).toBe(true)
      resetStageRelicBattleState()
      expect(hasIntermissionFreeRefresh()).toBe(false)
    })
  })

  // === 注册 ===
  describe('initStageRelicBehaviors', () => {
    it('注册行为（≥1 个）', () => {
      initStageRelicBehaviors()
      const behaviors = getRegisteredBehaviors()
      expect(behaviors.length).toBeGreaterThanOrEqual(1)
      expect(behaviors).toContain('phoenix')
    })
  })
})
