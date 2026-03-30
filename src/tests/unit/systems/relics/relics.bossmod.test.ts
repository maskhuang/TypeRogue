// ============================================
// 打字肉鸽 - Boss修饰器系统遗物行为测试 (Story 36.11)
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  SHIELD_REDUCE,
  BOUNTY_GOLD_PER_MOD,
  CHAOS_WORD_INTERVAL,
  getShieldedValue,
  getShieldedTimeSpeed,
  getShieldedScoreCap,
  getShieldedTargetMultiplier,
  getBountyHunterGoldBonus,
  shouldBarrierBlock,
  checkChaosRoulette,
  applyModifierReversal,
  resetBossModifierRelicBattleState,
  initBossModifierRelicBehaviors,
} from '../../../../src/systems/relics/BossModifierRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'
import {
  applyModifier,
  cleanupModifier,
  getActiveInstances,
  getActiveModifierEffect,
  forceRebuildParams,
  replaceTemporaryModifier,
  undoLastTemporaryModifier,
} from '../../../../src/systems/bossModifierEngine'
import { getActiveParams, setActiveParams } from '../../../../src/data/bossModifiers'
import type { BossModifierId } from '../../../../src/data/bossModifiers'

// Mock DOM
vi.stubGlobal('document', {
  getElementById: () => null,
  createElement: () => ({ className: '', innerHTML: '', remove: vi.fn() }),
  addEventListener: vi.fn(),
  querySelectorAll: () => [],
})

// === 辅助 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

describe('Boss修饰器系统遗物行为 (Story 36.11)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
    cleanupModifier()
    resetBossModifierRelicBattleState()
    state.activeModifiers = []
    state.level = 1
    state.targetScore = 1000
    state.score = 0
  })

  // === 常量 ===
  describe('常量', () => {
    it('SHIELD_REDUCE = 0.25', () => expect(SHIELD_REDUCE).toBe(0.25))
    it('BOUNTY_GOLD_PER_MOD = 0.20', () => expect(BOUNTY_GOLD_PER_MOD).toBe(0.20))
    it('CHAOS_WORD_INTERVAL = 5', () => expect(CHAOS_WORD_INTERVAL).toBe(5))
  })

  // === 修饰器护盾 (modifier_shield) ===
  describe('修饰器护盾 (modifier_shield)', () => {
    describe('getShieldedValue', () => {
      it('无遗物 → 原值', () => {
        expect(getShieldedValue(0.20, true)).toBe(0.20)
      })

      it('有遗物 + isDebuff → 削弱 25%', () => {
        state.player.relics.add('modifier_shield')
        expect(getShieldedValue(0.20, true)).toBeCloseTo(0.15) // 0.20 * 0.75
      })

      it('有遗物 + 非 debuff → 原值', () => {
        state.player.relics.add('modifier_shield')
        expect(getShieldedValue(0.20, false)).toBe(0.20)
      })

      it('decayRate 0.05 → 0.0375', () => {
        state.player.relics.add('modifier_shield')
        expect(getShieldedValue(0.05, true)).toBeCloseTo(0.0375)
      })

      it('0.20 → 0.15', () => {
        state.player.relics.add('modifier_shield')
        expect(getShieldedValue(0.20, true)).toBeCloseTo(0.15)
      })

      it('diminishRate 0.10 → 0.075', () => {
        state.player.relics.add('modifier_shield')
        expect(getShieldedValue(0.10, true)).toBeCloseTo(0.075)
      })
    })

    describe('getShieldedTimeSpeed', () => {
      it('无遗物 → 原值', () => {
        expect(getShieldedTimeSpeed(1.5)).toBe(1.5)
      })

      it('有遗物 → 加速部分削弱 25%（1.5 → 1.375）', () => {
        state.player.relics.add('modifier_shield')
        expect(getShieldedTimeSpeed(1.5)).toBeCloseTo(1.375)
      })

      it('正常速度 1.0 → 不变', () => {
        state.player.relics.add('modifier_shield')
        expect(getShieldedTimeSpeed(1.0)).toBe(1.0)
      })
    })

    describe('getShieldedScoreCap', () => {
      it('无遗物 → 原值', () => {
        expect(getShieldedScoreCap(50)).toBe(50)
      })

      it('有遗物 → 提高上限 25%（50 → 67）', () => {
        state.player.relics.add('modifier_shield')
        expect(getShieldedScoreCap(50)).toBe(67) // ceil(50 / 0.75)
      })
    })

    describe('getShieldedTargetMultiplier', () => {
      it('无遗物 → 原值', () => {
        expect(getShieldedTargetMultiplier(2.0)).toBe(2.0)
      })

      it('有遗物 → 超出部分削弱 25%（2.0 → 1.75）', () => {
        state.player.relics.add('modifier_shield')
        expect(getShieldedTargetMultiplier(2.0)).toBeCloseTo(1.75)
      })

      it('正常倍率 1.0 → 不变', () => {
        state.player.relics.add('modifier_shield')
        expect(getShieldedTargetMultiplier(1.0)).toBe(1.0)
      })
    })
  })

  // === 赏金猎人 (bounty_hunter) ===
  describe('赏金猎人 (bounty_hunter)', () => {
    it('无遗物 → 0', () => {
      expect(getBountyHunterGoldBonus()).toBe(0)
    })

    it('有遗物 + 0 个永久修饰器 → 0', () => {
      state.player.relics.add('bounty_hunter')
      state.activeModifiers = []
      expect(getBountyHunterGoldBonus()).toBe(0)
    })

    it('有遗物 + 2 个永久修饰器 → 0.40', () => {
      state.player.relics.add('bounty_hunter')
      state.activeModifiers = ['boss_decay', 'boss_cap'] as BossModifierId[]
      expect(getBountyHunterGoldBonus()).toBeCloseTo(0.40)
    })

    it('有遗物 + 3 个永久修饰器 → 0.60', () => {
      state.player.relics.add('bounty_hunter')
      state.activeModifiers = ['boss_decay', 'boss_cap', 'boss_fast_time'] as BossModifierId[]
      expect(getBountyHunterGoldBonus()).toBeCloseTo(0.60)
    })
  })

  // === 修饰器屏障 (modifier_barrier) ===
  describe('修饰器屏障 (modifier_barrier)', () => {
    it('无遗物 → false', () => {
      // 设置精英关 (level=3)
      state.level = 3
      expect(shouldBarrierBlock()).toBe(false)
    })

    it('有遗物 + 普通关 → false', () => {
      state.player.relics.add('modifier_barrier')
      state.level = 1 // standard
      expect(shouldBarrierBlock()).toBe(false)
    })

    it('有遗物 + 精英关 → 首次 true, 第二次 false', () => {
      state.player.relics.add('modifier_barrier')
      state.level = 3 // elite
      expect(shouldBarrierBlock()).toBe(true)
      expect(shouldBarrierBlock()).toBe(false)
    })

    it('resetBossModifierRelicBattleState 重置后可再次触发', () => {
      state.player.relics.add('modifier_barrier')
      state.level = 3
      shouldBarrierBlock() // 消耗
      resetBossModifierRelicBattleState()
      expect(shouldBarrierBlock()).toBe(true)
    })
  })

  // === 混沌轮盘 (chaos_roulette) ===
  describe('混沌轮盘 (chaos_roulette)', () => {
    it('无遗物不触发', () => {
      state.level = 10 // boss
      state.bossModifierPool = ['boss_decay', 'boss_cap', 'boss_fast_time'] as BossModifierId[]
      applyModifier('boss_decay' as BossModifierId, false, false)
      for (let i = 0; i < 5; i++) checkChaosRoulette()
      // 没有遗物，不应触发替换
      expect(getActiveInstances().length).toBe(1)
      expect(getActiveInstances()[0].modId).toBe('boss_decay')
    })

    it('有遗物 + 非 Boss 关不触发', () => {
      state.player.relics.add('chaos_roulette')
      state.level = 1 // standard
      applyModifier('boss_decay' as BossModifierId, false, false)
      for (let i = 0; i < 5; i++) checkChaosRoulette()
      expect(getActiveInstances()[0].modId).toBe('boss_decay')
    })

    it('有遗物 + Boss关 + 第5词触发替换', () => {
      state.player.relics.add('chaos_roulette')
      state.level = 10 // boss
      state.bossModifierPool = ['boss_decay', 'boss_cap', 'boss_fast_time'] as BossModifierId[]
      applyModifier('boss_decay' as BossModifierId, false, false)

      // 前 4 词不触发
      for (let i = 0; i < 4; i++) checkChaosRoulette()
      expect(getActiveInstances()[0].modId).toBe('boss_decay')

      // 第 5 词触发
      checkChaosRoulette()
      const instances = getActiveInstances()
      expect(instances.length).toBe(1)
      // 新修饰器不应该是原来的 boss_decay
      expect(instances[0].modId).not.toBe('boss_decay')
    })

    it('替换后的修饰器不在已激活列表中 (AC7)', () => {
      state.player.relics.add('chaos_roulette')
      state.level = 10 // boss
      state.bossModifierPool = ['boss_decay', 'boss_cap', 'boss_fast_time'] as BossModifierId[]
      // 先应用两个修饰器
      applyModifier('boss_decay' as BossModifierId, false, false)
      applyModifier('boss_cap' as BossModifierId, false, false)

      // 第 5 词触发
      for (let i = 0; i < 5; i++) checkChaosRoulette()
      const instances = getActiveInstances()
      const modIds = instances.map(inst => inst.modId)
      // 所有 modId 应唯一
      expect(new Set(modIds).size).toBe(modIds.length)
    })
  })

  // === 修饰器反转 (modifier_reversal) ===
  describe('修饰器反转 (modifier_reversal)', () => {
    it('无遗物不操作', () => {
      applyModifier('boss_decay' as BossModifierId, false, false)
      const beforeRate = getActiveParams()?.decayRate
      applyModifierReversal()
      expect(getActiveParams()?.decayRate).toBe(beforeRate)
    })

    it('有遗物 → 反转半数 + 加倍半数 (AC6)', () => {
      state.player.relics.add('modifier_reversal')
      // 应用两个数值修饰器
      applyModifier('boss_decay' as BossModifierId, false, false)
      applyModifier('boss_cap' as BossModifierId, false, false)

      // 获取原始值
      const origDecay = getActiveInstances()[0].params.decayRate!
      const origCap = getActiveInstances()[1].params.scoreCapPct!

      // 固定 Math.random 使 shuffle 可预测
      vi.spyOn(Math, 'random').mockReturnValue(0.99) // 不交换 → 索引顺序不变 → 第一个反转，第二个加倍

      applyModifierReversal()

      vi.restoreAllMocks()

      const instances = getActiveInstances()
      // 一个应该被反转，一个应该被加倍
      // 由于 halfLen = floor(2/2) = 1，第一个反转（indices[0]），第二个加倍
      const decayParams = instances[0].params
      const capParams = instances[1].params

      // 反转：decayRate 取反
      expect(decayParams.decayRate).toBeCloseTo(-origDecay)
      // 增强：scoreCapPct 减半（更严格）
      expect(capParams.scoreCapPct).toBe(origCap / 2)
    })

    it('timeSpeed 反转为减速（2 - original）', () => {
      state.player.relics.add('modifier_reversal')
      applyModifier('boss_fast_time' as BossModifierId, false, false)

      const origSpeed = getActiveInstances()[0].params.timeSpeed!
      // 只有1个修饰器，halfLen=0，全部加倍（0个反转）
      // 需要2个才能有反转
      cleanupModifier()
      applyModifier('boss_fast_time' as BossModifierId, false, false)
      applyModifier('boss_decay' as BossModifierId, false, false)

      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      applyModifierReversal()
      vi.restoreAllMocks()

      // halfLen = floor(2/2) = 1, 第一个（fast_time）反转
      const speedParams = getActiveInstances()[0].params
      expect(speedParams.timeSpeed).toBeCloseTo(2 - origSpeed)
    })

    it('scoreCapPct 反转为 Infinity', () => {
      state.player.relics.add('modifier_reversal')
      applyModifier('boss_cap' as BossModifierId, false, false)
      applyModifier('boss_decay' as BossModifierId, false, false)

      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      applyModifierReversal()
      vi.restoreAllMocks()

      // 第一个（boss_cap）反转
      expect(getActiveInstances()[0].params.scoreCapPct).toBe(Infinity)
    })

    it('targetMultiplier 反转缩放 state.targetScore (H2)', () => {
      state.player.relics.add('modifier_reversal')
      state.targetScore = 1000
      // boss_double_target: targetMultiplier=2.0, apply() 时 state.targetScore *= 2 → 2000
      applyModifier('boss_double_target' as BossModifierId, false, false)
      expect(state.targetScore).toBe(2000)
      // 加第二个修饰器使 halfLen=1（第一个反转，第二个加倍）
      applyModifier('boss_decay' as BossModifierId, false, false)

      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      applyModifierReversal()
      vi.restoreAllMocks()

      // 反转 targetMultiplier: 2.0 → max(0.5, 2-2.0) = 0.5
      const inst = getActiveInstances()[0]
      expect(inst.params.targetMultiplier).toBeCloseTo(0.5)
      // state.targetScore 应从 2000 按 oldMult=2.0→newMult=0.5 缩放: floor(2000 / 2.0 * 0.5) = 500
      expect(state.targetScore).toBe(500)
    })

    it('targetMultiplier ×2 加倍缩放 state.targetScore', () => {
      state.player.relics.add('modifier_reversal')
      state.targetScore = 1000
      applyModifier('boss_decay' as BossModifierId, false, false)
      // boss_double_target 第二个 → 加倍分支
      applyModifier('boss_double_target' as BossModifierId, false, false)
      expect(state.targetScore).toBe(2000)

      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      applyModifierReversal()
      vi.restoreAllMocks()

      // 第二个（boss_double_target）加倍: targetMultiplier 2.0 → 4.0
      const inst = getActiveInstances()[1]
      expect(inst.params.targetMultiplier).toBeCloseTo(4.0)
      // state.targetScore: floor(2000 / 2.0 * 4.0) = 4000
      expect(state.targetScore).toBe(4000)
    })
  })

  // === 生命周期 ===
  describe('生命周期', () => {
    it('resetBossModifierRelicBattleState 重置 barrier + chaosWordCount', () => {
      state.player.relics.add('modifier_barrier')
      state.player.relics.add('chaos_roulette')
      state.level = 3 // elite
      state.bossModifierPool = ['boss_decay', 'boss_cap', 'boss_fast_time'] as BossModifierId[]

      // 消耗 barrier
      shouldBarrierBlock()
      // 推进 chaos word count
      for (let i = 0; i < 3; i++) checkChaosRoulette()

      resetBossModifierRelicBattleState()

      // barrier 可再次触发
      expect(shouldBarrierBlock()).toBe(true)
      // chaos word count 重置（需要再 5 词才触发）
      // 验证：再调 2 词不应触发（因为已经重置为 0，需要完整 5 词）
      applyModifier('boss_decay' as BossModifierId, false, false)
      state.level = 10 // boss
      for (let i = 0; i < 4; i++) checkChaosRoulette()
      expect(getActiveInstances()[0].modId).toBe('boss_decay') // 没被替换
    })
  })

  // === 注册 ===
  describe('注册', () => {
    it('initBossModifierRelicBehaviors 注册 3 个行为', () => {
      initBossModifierRelicBehaviors()
      const behaviors = getRegisteredBehaviors()
      expect(behaviors.includes('modifier_barrier')).toBe(true)
      expect(behaviors.includes('chaos_roulette')).toBe(true)
      expect(behaviors.includes('modifier_reversal')).toBe(true)
    })
  })

  // === Engine API 扩展 ===
  describe('引擎 API 扩展 (Task 2)', () => {
    it('getActiveInstances 返回活跃列表', () => {
      applyModifier('boss_decay' as BossModifierId, false, false)
      const instances = getActiveInstances()
      expect(instances.length).toBe(1)
      expect(instances[0].modId).toBe('boss_decay')
    })

    it('forceRebuildParams 重建合并参数', () => {
      applyModifier('boss_decay' as BossModifierId, false, false)
      const inst = getActiveInstances()[0]
      inst.params.decayRate = 0.99
      forceRebuildParams()
      expect(getActiveParams()?.decayRate).toBe(0.99)
    })

    it('replaceTemporaryModifier 替换临时修饰器', () => {
      applyModifier('boss_decay' as BossModifierId, false, false)
      const ok = replaceTemporaryModifier('boss_decay' as BossModifierId, 'boss_cap' as BossModifierId)
      expect(ok).toBe(true)
      const instances = getActiveInstances()
      expect(instances.some(i => i.modId === 'boss_cap')).toBe(true)
      expect(instances.some(i => i.modId === 'boss_decay')).toBe(false)
    })

    it('replaceTemporaryModifier 不替换永久修饰器', () => {
      applyModifier('boss_decay' as BossModifierId, false, true) // permanent
      const ok = replaceTemporaryModifier('boss_decay' as BossModifierId, 'boss_cap' as BossModifierId)
      expect(ok).toBe(false)
    })

    it('undoLastTemporaryModifier 撤销最后一个临时修饰器', () => {
      applyModifier('boss_decay' as BossModifierId, false, true) // permanent
      applyModifier('boss_cap' as BossModifierId, false, false) // temporary
      const ok = undoLastTemporaryModifier()
      expect(ok).toBe(true)
      expect(getActiveInstances().length).toBe(1)
      expect(getActiveInstances()[0].modId).toBe('boss_decay')
    })

    it('undoLastTemporaryModifier 无临时修饰器 → false', () => {
      applyModifier('boss_decay' as BossModifierId, false, true) // permanent only
      expect(undoLastTemporaryModifier()).toBe(false)
    })
  })
})
