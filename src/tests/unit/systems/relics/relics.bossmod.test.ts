// ============================================
// 打字肉鸽 - Boss修饰器系统遗物行为测试 (Story 36.11)
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  SHIELD_REDUCE,
  BOUNTY_DISCOUNT_PER_MOD,
  BOUNTY_DISCOUNT_CAP,
  BARRIER_WORD_THRESHOLD,
  CHAOS_WORD_INTERVAL,
  getShieldedValue,
  getShieldedTimeSpeed,
  getShieldedScoreCap,
  getShieldedTargetMultiplier,
  getBountyHunterDiscount,
  shouldBarrierDelay,
  startBarrierDelay,
  addDeferredModifier,
  isBarrierDelaying,
  checkBarrierActivation,
  checkChaosRoulette,
  applyModifierReversal,
  hasModifierPardon,
  consumeModifierPardon,
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
    it('BOUNTY_DISCOUNT_PER_MOD = 0.05', () => expect(BOUNTY_DISCOUNT_PER_MOD).toBe(0.05))
    it('BOUNTY_DISCOUNT_CAP = 0.30', () => expect(BOUNTY_DISCOUNT_CAP).toBe(0.30))
    it('BARRIER_WORD_THRESHOLD = 3', () => expect(BARRIER_WORD_THRESHOLD).toBe(3))
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

  // === 困境红利 (bounty_hunter) ===
  describe('困境红利 (bounty_hunter)', () => {
    it('无遗物 → 0', () => {
      expect(getBountyHunterDiscount()).toBe(0)
    })

    it('有遗物 + 0 个永久修饰器 → 0', () => {
      state.player.relics.add('bounty_hunter')
      state.activeModifiers = []
      expect(getBountyHunterDiscount()).toBe(0)
    })

    it('有遗物 + 2 个永久修饰器 → 0.10', () => {
      state.player.relics.add('bounty_hunter')
      state.activeModifiers = ['boss_decay', 'boss_cap'] as BossModifierId[]
      expect(getBountyHunterDiscount()).toBeCloseTo(0.10)
    })

    it('有遗物 + 6 个永久修饰器 → 0.30（上限）', () => {
      state.player.relics.add('bounty_hunter')
      state.activeModifiers = ['boss_decay', 'boss_cap', 'boss_fast_time', 'boss_diminish', 'boss_double_target', 'boss_escalate'] as BossModifierId[]
      expect(getBountyHunterDiscount()).toBeCloseTo(0.30)
    })

    it('有遗物 + 10 个永久修饰器 → 不超过 0.30', () => {
      state.player.relics.add('bounty_hunter')
      state.activeModifiers = Array(10).fill('boss_decay') as BossModifierId[]
      expect(getBountyHunterDiscount()).toBe(0.30)
    })
  })

  // === 修饰器屏障 — 延迟生效 (modifier_barrier) ===
  describe('修饰器屏障 — 延迟生效 (modifier_barrier)', () => {
    it('无遗物 → shouldBarrierDelay false', () => {
      state.level = 5 // elite
      expect(shouldBarrierDelay()).toBe(false)
    })

    it('有遗物 + 普通关 → false', () => {
      state.player.relics.add('modifier_barrier')
      state.level = 1 // standard
      expect(shouldBarrierDelay()).toBe(false)
    })

    it('有遗物 + 精英关 → true', () => {
      state.player.relics.add('modifier_barrier')
      state.level = 5 // elite
      expect(shouldBarrierDelay()).toBe(true)
    })

    it('有遗物 + Boss关 → true', () => {
      state.player.relics.add('modifier_barrier')
      state.level = 12 // boss
      expect(shouldBarrierDelay()).toBe(true)
    })

    it('startBarrierDelay + isBarrierDelaying', () => {
      expect(isBarrierDelaying()).toBe(false)
      startBarrierDelay()
      expect(isBarrierDelaying()).toBe(true)
    })

    it('addDeferredModifier + checkBarrierActivation 前2词返回 null', () => {
      startBarrierDelay()
      addDeferredModifier('boss_decay' as BossModifierId, false)
      expect(checkBarrierActivation()).toBeNull() // 第1词
      expect(checkBarrierActivation()).toBeNull() // 第2词
      expect(isBarrierDelaying()).toBe(true)
    })

    it('checkBarrierActivation 第3词返回延迟列表', () => {
      startBarrierDelay()
      addDeferredModifier('boss_decay' as BossModifierId, false)
      addDeferredModifier('boss_cap' as BossModifierId, true)

      checkBarrierActivation() // 第1词
      checkBarrierActivation() // 第2词
      const result = checkBarrierActivation() // 第3词触发
      expect(result).not.toBeNull()
      expect(result!.length).toBe(2)
      expect(result![0].modId).toBe('boss_decay')
      expect(result![0].isElite).toBe(false)
      expect(result![1].modId).toBe('boss_cap')
      expect(result![1].isElite).toBe(true)
      expect(isBarrierDelaying()).toBe(false)
    })

    it('checkBarrierActivation 只触发一次', () => {
      startBarrierDelay()
      addDeferredModifier('boss_decay' as BossModifierId, false)
      checkBarrierActivation() // 1
      checkBarrierActivation() // 2
      checkBarrierActivation() // 3 — 触发
      expect(checkBarrierActivation()).toBeNull() // 之后不再触发
    })

    it('resetBossModifierRelicBattleState 重置延迟状态', () => {
      startBarrierDelay()
      addDeferredModifier('boss_decay' as BossModifierId, false)
      resetBossModifierRelicBattleState()
      expect(isBarrierDelaying()).toBe(false)
      // 重置后即使调 3 次也不触发（因为不再延迟）
      expect(checkBarrierActivation()).toBeNull()
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
      // 应用 offense + defense 各一个
      applyModifier('boss_escalation' as BossModifierId, false, false) // offense: escalateStep=0.20
      applyModifier('boss_decay' as BossModifierId, false, false)      // defense: decayRate

      const origStep = getActiveInstances()[0].params.escalateStep!
      const origDecay = getActiveInstances()[1].params.decayRate!

      // Math.random()=0.99 → invertIdx=1 → defense(boss_decay) 反转, offense(boss_escalation) 翻倍
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      applyModifierReversal()
      vi.restoreAllMocks()

      const instances = getActiveInstances()
      // offense 翻倍: escalateStep * 2
      expect(instances[0].params.escalateStep).toBeCloseTo(origStep * 2)
      // defense 反转: decayRate 取反
      expect(instances[1].params.decayRate).toBeCloseTo(-origDecay)
    })

    it('escalateStep 反转为负值', () => {
      state.player.relics.add('modifier_reversal')
      // offense + defense pair
      applyModifier('boss_escalation' as BossModifierId, false, false) // offense
      applyModifier('boss_decay' as BossModifierId, false, false)      // defense

      const origStep = getActiveInstances()[0].params.escalateStep!

      // Math.random()=0.0 → invertIdx=0 → offense(boss_escalation) 反转, defense(boss_decay) 翻倍
      vi.spyOn(Math, 'random').mockReturnValue(0.0)
      applyModifierReversal()
      vi.restoreAllMocks()

      expect(getActiveInstances()[0].params.escalateStep).toBeCloseTo(-origStep)
    })

    it('scoreCapPct 反转为 Infinity', () => {
      state.player.relics.add('modifier_reversal')
      // offense + defense(boss_cap)
      applyModifier('boss_escalation' as BossModifierId, false, false) // offense
      applyModifier('boss_cap' as BossModifierId, false, false)         // defense

      // Math.random()=0.99 → invertIdx=1 → defense(boss_cap) 反转
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      applyModifierReversal()
      vi.restoreAllMocks()

      expect(getActiveInstances()[1].params.scoreCapPct).toBe(Infinity)
    })

    it('targetMultiplier 反转缩放 state.targetScore (H2)', () => {
      state.player.relics.add('modifier_reversal')
      state.targetScore = 1000
      // offense + defense(boss_double_target: targetMultiplier=2.0)
      applyModifier('boss_escalation' as BossModifierId, false, false)  // offense
      applyModifier('boss_double_target' as BossModifierId, false, false) // defense, targetMultiplier=2.0
      expect(state.targetScore).toBe(2000)

      // Math.random()=0.99 → invertIdx=1 → defense(boss_double_target) 反转
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      applyModifierReversal()
      vi.restoreAllMocks()

      // 反转 targetMultiplier: 2.0 → max(0.5, 2-2.0) = 0.5
      const inst = getActiveInstances()[1]
      expect(inst.params.targetMultiplier).toBeCloseTo(0.5)
      // state.targetScore: floor(2000 / 2.0 * 0.5) = 500
      expect(state.targetScore).toBe(500)
    })

    it('targetMultiplier ×2 加倍缩放 state.targetScore', () => {
      state.player.relics.add('modifier_reversal')
      state.targetScore = 1000
      // offense + defense(boss_double_target: targetMultiplier=2.0)
      applyModifier('boss_escalation' as BossModifierId, false, false)  // offense
      applyModifier('boss_double_target' as BossModifierId, false, false) // defense, targetMultiplier=2.0
      expect(state.targetScore).toBe(2000)

      // Math.random()=0.0 → invertIdx=0 → offense(boss_escalation) 反转, defense(boss_double_target) 翻倍
      vi.spyOn(Math, 'random').mockReturnValue(0.0)
      applyModifierReversal()
      vi.restoreAllMocks()

      // defense 翻倍: targetMultiplier 2.0 → 4.0
      const inst = getActiveInstances()[1]
      expect(inst.params.targetMultiplier).toBeCloseTo(4.0)
      // state.targetScore: floor(2000 / 2.0 * 4.0) = 4000
      expect(state.targetScore).toBe(4000)
    })
  })

  // === 赦免状 (modifier_pardon) ===
  describe('赦免状 (modifier_pardon)', () => {
    it('无遗物 → hasModifierPardon() false', () => {
      expect(hasModifierPardon()).toBe(false)
    })

    it('有遗物 → hasModifierPardon() true', () => {
      state.player.relics.add('modifier_pardon')
      expect(hasModifierPardon()).toBe(true)
    })

    it('consumeModifierPardon 后 → false', () => {
      state.player.relics.add('modifier_pardon')
      consumeModifierPardon()
      expect(hasModifierPardon()).toBe(false)
    })

    it('resetBossModifierRelicBattleState 重置后 → 恢复 true', () => {
      state.player.relics.add('modifier_pardon')
      consumeModifierPardon()
      expect(hasModifierPardon()).toBe(false)
      resetBossModifierRelicBattleState()
      expect(hasModifierPardon()).toBe(true)
    })
  })

  // === 生命周期 ===
  describe('生命周期', () => {
    it('resetBossModifierRelicBattleState 重置 barrier + chaosWordCount', () => {
      state.player.relics.add('modifier_barrier')
      state.player.relics.add('chaos_roulette')
      state.level = 5 // elite
      state.bossModifierPool = ['boss_decay', 'boss_cap', 'boss_fast_time'] as BossModifierId[]

      // 启动 barrier 延迟
      startBarrierDelay()
      addDeferredModifier('boss_decay' as BossModifierId, false)
      // 推进 chaos word count
      state.level = 12 // boss for chaos roulette
      for (let i = 0; i < 3; i++) checkChaosRoulette()

      resetBossModifierRelicBattleState()

      // barrier 延迟状态重置
      expect(isBarrierDelaying()).toBe(false)
      // chaos word count 重置（需要再 5 词才触发）
      applyModifier('boss_decay' as BossModifierId, false, false)
      for (let i = 0; i < 4; i++) checkChaosRoulette()
      expect(getActiveInstances()[0].modId).toBe('boss_decay') // 没被替换
    })
  })

  // === 注册 ===
  describe('注册', () => {
    it('initBossModifierRelicBehaviors 注册 4 个行为', () => {
      initBossModifierRelicBehaviors()
      const behaviors = getRegisteredBehaviors()
      expect(behaviors.includes('modifier_barrier')).toBe(true)
      expect(behaviors.includes('chaos_roulette')).toBe(true)
      expect(behaviors.includes('modifier_reversal')).toBe(true)
      expect(behaviors.includes('modifier_pardon')).toBe(true)
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
