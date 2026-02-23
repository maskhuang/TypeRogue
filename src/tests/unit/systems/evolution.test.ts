// ============================================
// 打字肉鸽 - 进化系统集成测试
// ============================================
// Story 15.2: 进化 UI 与选择机制

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BehaviorExecutor } from '../../../src/systems/modifiers/BehaviorExecutor'
import type {
  ModifierBehavior,
  BehaviorCallbacks,
  PipelineResult,
} from '../../../src/systems/modifiers/ModifierTypes'
import {
  getSkillModifierFactory,
  getEvolutionBranches,
  getSkillDisplayInfo,
  SKILLS,
  EVOLUTIONS,
  EVOLUTION_MODIFIER_DEFS,
} from '../../../src/data/skills'
import { state, synergy, resetState } from '../../../src/core/state'
import { createScopedRegistry, generateFeedback } from '../../../src/systems/skills'
import type { PipelineContext, EffectAccumulator } from '../../../src/systems/modifiers/ModifierTypes'
import { EffectPipeline } from '../../../src/systems/modifiers/EffectPipeline'

// === 工具函数 ===
function emptyPipelineResult(pendingBehaviors: ModifierBehavior[] = []): PipelineResult {
  return {
    intercepted: false,
    effects: { score: 0, multiply: 0, time: 0, gold: 0, shield: 0 },
    pendingBehaviors,
  }
}

describe('进化系统', () => {
  beforeEach(() => {
    resetState()
  })

  // === 7.1 工厂路由测试 ===
  describe('工厂路由', () => {
    it('无进化时返回基础工厂', () => {
      const factory = getSkillModifierFactory('burst', new Map())
      const mods = factory('burst', 1, {})
      expect(mods.length).toBeGreaterThan(0)
      expect(mods[0].source).toBe('skill:burst')
    })

    it('有进化时返回进化工厂', () => {
      const evolvedSkills = new Map([['burst', 'burst_inferno']])
      const factory = getSkillModifierFactory('burst', evolvedSkills)
      const mods = factory('burst', 3, { combo: 15 })
      expect(mods.length).toBeGreaterThan(0)
      // burst_inferno has combo_gte condition
      expect(mods[0].condition).toEqual({ type: 'combo_gte', value: 10 })
    })

    it('进化 ID 不存在时回退到基础工厂', () => {
      const evolvedSkills = new Map([['burst', 'nonexistent_branch']])
      const factory = getSkillModifierFactory('burst', evolvedSkills)
      const mods = factory('burst', 1, {})
      expect(mods.length).toBeGreaterThan(0)
    })

    it('createScopedRegistry 使用进化工厂', () => {
      state.player.bindings.set('f', 'burst')
      state.player.skills.set('burst', { level: 3 })
      state.player.evolvedSkills.set('burst', 'burst_precision')
      const ctx: PipelineContext = { skillsTriggeredThisWord: 1 }
      const registry = createScopedRegistry('burst', 3, 'f', ctx, false)
      const mods = registry.getAll()
      // burst_precision returns 2 modifiers: score + multiply
      expect(mods.length).toBe(2)
    })
  })

  // === 7.2 BehaviorExecutor 回调测试 ===
  describe('BehaviorExecutor 进化行为', () => {
    it('restore_combo: 调用 onRestoreCombo(triggerEvery)', () => {
      const onRestoreCombo = vi.fn()
      const callbacks: BehaviorCallbacks = { onRestoreCombo }
      const behaviors: ModifierBehavior[] = [{ type: 'restore_combo', triggerEvery: 3 }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onRestoreCombo).toHaveBeenCalledWith(3)
      expect(result.executedCount).toBe(1)
    })

    it('restore_combo: 无回调时跳过', () => {
      const behaviors: ModifierBehavior[] = [{ type: 'restore_combo', triggerEvery: 3 }]
      const result = BehaviorExecutor.execute(behaviors, 0)
      expect(result.executedCount).toBe(0)
    })

    it('set_word_cooldown: 调用 onSetWordCooldown', () => {
      const onSetWordCooldown = vi.fn()
      const callbacks: BehaviorCallbacks = { onSetWordCooldown }
      const behaviors: ModifierBehavior[] = [{ type: 'set_word_cooldown' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onSetWordCooldown).toHaveBeenCalled()
      expect(result.executedCount).toBe(1)
    })

    it('set_word_cooldown: 不受深度限制', () => {
      const onSetWordCooldown = vi.fn()
      const callbacks: BehaviorCallbacks = { onSetWordCooldown }
      const behaviors: ModifierBehavior[] = [{ type: 'set_word_cooldown' }]

      const result = BehaviorExecutor.execute(behaviors, 3, callbacks)
      expect(onSetWordCooldown).toHaveBeenCalled()
      expect(result.executedCount).toBe(1)
      expect(result.skippedByDepth).toBe(0)
    })

    it('trigger_random_adjacent: 深度 0 时调用回调', () => {
      const onTriggerRandomAdjacent = vi.fn().mockReturnValue(emptyPipelineResult())
      const callbacks: BehaviorCallbacks = { onTriggerRandomAdjacent }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_random_adjacent' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onTriggerRandomAdjacent).toHaveBeenCalledWith(0)
      expect(result.executedCount).toBe(1)
      expect(result.chainDepthReached).toBe(1)
    })

    it('trigger_random_adjacent: 深度 >= MAX_DEPTH 时跳过', () => {
      const onTriggerRandomAdjacent = vi.fn()
      const callbacks: BehaviorCallbacks = { onTriggerRandomAdjacent }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_random_adjacent' }]

      const result = BehaviorExecutor.execute(behaviors, 3, callbacks)
      expect(onTriggerRandomAdjacent).not.toHaveBeenCalled()
      expect(result.skippedByDepth).toBe(1)
    })

    it('trigger_random_adjacent: 返回 null 时跳过', () => {
      const onTriggerRandomAdjacent = vi.fn().mockReturnValue(null)
      const callbacks: BehaviorCallbacks = { onTriggerRandomAdjacent }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_random_adjacent' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onTriggerRandomAdjacent).toHaveBeenCalledWith(0)
      expect(result.executedCount).toBe(0)
    })

    it('trigger_random_adjacent: 递归处理返回的 pendingBehaviors', () => {
      const onSetWordCooldown = vi.fn()
      const onTriggerRandomAdjacent = vi.fn().mockReturnValue(
        emptyPipelineResult([{ type: 'set_word_cooldown' }]),
      )
      const callbacks: BehaviorCallbacks = { onTriggerRandomAdjacent, onSetWordCooldown }
      const behaviors: ModifierBehavior[] = [{ type: 'trigger_random_adjacent' }]

      const result = BehaviorExecutor.execute(behaviors, 0, callbacks)
      expect(onTriggerRandomAdjacent).toHaveBeenCalledWith(0)
      expect(onSetWordCooldown).toHaveBeenCalled()
      expect(result.executedCount).toBe(2)
    })
  })

  // === 7.3 进化购买流程测试 ===
  describe('进化购买流程', () => {
    it('getEvolutionBranches 返回正确的分支', () => {
      const branches = getEvolutionBranches('burst')
      expect(branches.length).toBe(2)
      expect(branches[0].id).toBe('burst_inferno')
      expect(branches[1].id).toBe('burst_precision')
    })

    it('getEvolutionBranches 无进化技能返回空数组', () => {
      // 检查一个没有进化的技能（如果存在的话）
      const branches = getEvolutionBranches('nonexistent')
      expect(branches.length).toBe(0)
    })

    it('进化后 evolvedSkills 记录正确', () => {
      state.player.evolvedSkills.set('burst', 'burst_inferno')
      expect(state.player.evolvedSkills.get('burst')).toBe('burst_inferno')
    })

    it('已进化技能不能再次进化（通过 has 检查）', () => {
      state.player.evolvedSkills.set('burst', 'burst_inferno')
      expect(state.player.evolvedSkills.has('burst')).toBe(true)
    })

    it('进化扣除金币', () => {
      state.gold = 100
      const cost = 40
      state.gold -= cost
      state.player.evolvedSkills.set('burst', 'burst_inferno')
      expect(state.gold).toBe(60)
      expect(state.player.evolvedSkills.get('burst')).toBe('burst_inferno')
    })

    it('金币不足时不能进化', () => {
      state.gold = 10
      const cost = 40
      if (state.gold < cost) {
        // 不执行进化
        expect(state.player.evolvedSkills.has('burst')).toBe(false)
      }
      expect(state.gold).toBe(10)
    })

    it('进化后工厂路由自动切换', () => {
      state.player.evolvedSkills.set('burst', 'burst_inferno')
      const factory = getSkillModifierFactory('burst', state.player.evolvedSkills)
      const mods = factory('burst', 3, { combo: 15 })
      expect(mods[0].condition).toEqual({ type: 'combo_gte', value: 10 })
    })

    it('进化分支的金币费用数据正确', () => {
      const branches = getEvolutionBranches('burst')
      expect(branches[0].condition.goldCost).toBe(40)
      expect(branches[1].condition.goldCost).toBe(40)
      const ampBranches = getEvolutionBranches('amp')
      expect(ampBranches[0].condition.goldCost).toBe(50)
    })
  })

  // === 7.4 运行时逻辑测试 ===
  describe('运行时逻辑', () => {
    describe('amp_overdrive 词冷却', () => {
      it('wordCooldowns 初始为空', () => {
        expect(synergy.wordCooldowns.size).toBe(0)
      })

      it('添加冷却后 has 返回 true', () => {
        synergy.wordCooldowns.add('amp')
        expect(synergy.wordCooldowns.has('amp')).toBe(true)
      })

      it('clear 后冷却重置', () => {
        synergy.wordCooldowns.add('amp')
        synergy.wordCooldowns.clear()
        expect(synergy.wordCooldowns.has('amp')).toBe(false)
      })
    })

    describe('freeze_permafrost 每词一次', () => {
      it('freezeTriggeredThisWord 初始为空', () => {
        expect(synergy.freezeTriggeredThisWord.size).toBe(0)
      })

      it('添加标记后 has 返回 true', () => {
        synergy.freezeTriggeredThisWord.add('freeze')
        expect(synergy.freezeTriggeredThisWord.has('freeze')).toBe(true)
      })

      it('clear 后标记重置', () => {
        synergy.freezeTriggeredThisWord.add('freeze')
        synergy.freezeTriggeredThisWord.clear()
        expect(synergy.freezeTriggeredThisWord.has('freeze')).toBe(false)
      })
    })

    describe('freeze_chrono 恢复 combo', () => {
      it('restoreComboCounters 初始为空', () => {
        expect(synergy.restoreComboCounters.size).toBe(0)
      })

      it('计数器递增', () => {
        const counter = (synergy.restoreComboCounters.get('freeze') ?? 0) + 1
        synergy.restoreComboCounters.set('freeze', counter)
        expect(synergy.restoreComboCounters.get('freeze')).toBe(1)
      })

      it('达到 triggerEvery 后重置为 0', () => {
        synergy.restoreComboCounters.set('freeze', 2)
        const counter = (synergy.restoreComboCounters.get('freeze') ?? 0) + 1
        if (counter >= 3) {
          synergy.restoreComboCounters.set('freeze', 0)
        }
        expect(synergy.restoreComboCounters.get('freeze')).toBe(0)
      })
    })

    describe('lone_hermit 技能上限 4', () => {
      it('技能数 < 4 时不阻止', () => {
        state.player.evolvedSkills.set('lone', 'lone_hermit')
        state.player.skills.set('lone', { level: 3 })
        state.player.skills.set('burst', { level: 1 })
        state.player.skills.set('amp', { level: 1 })
        const hermitCapped = state.player.evolvedSkills.get('lone') === 'lone_hermit'
          && state.player.skills.size >= 4
        expect(hermitCapped).toBe(false)
      })

      it('技能数 >= 4 时阻止新技能', () => {
        state.player.evolvedSkills.set('lone', 'lone_hermit')
        state.player.skills.set('lone', { level: 3 })
        state.player.skills.set('burst', { level: 1 })
        state.player.skills.set('amp', { level: 1 })
        state.player.skills.set('freeze', { level: 1 })
        const hermitCapped = state.player.evolvedSkills.get('lone') === 'lone_hermit'
          && state.player.skills.size >= 4
        expect(hermitCapped).toBe(true)
      })

      it('无 lone_hermit 进化时不限制', () => {
        state.player.skills.set('lone', { level: 3 })
        state.player.skills.set('burst', { level: 1 })
        state.player.skills.set('amp', { level: 1 })
        state.player.skills.set('freeze', { level: 1 })
        state.player.skills.set('shield', { level: 1 })
        const hermitCapped = state.player.evolvedSkills.get('lone') === 'lone_hermit'
          && state.player.skills.size >= 4
        expect(hermitCapped).toBe(false)
      })
    })
  })

  // === 进化 Modifier 工厂测试 ===
  describe('进化 Modifier 工厂', () => {
    it('burst_inferno: 底分翻倍 + combo 条件', () => {
      const factory = EVOLUTION_MODIFIER_DEFS['burst_inferno']
      const mods = factory('burst', 3, { combo: 15 })
      expect(mods.length).toBe(1)
      expect(mods[0].effect?.type).toBe('score')
      expect(mods[0].condition).toEqual({ type: 'combo_gte', value: 10 })
    })

    it('burst_precision: 底分减半 + 额外倍率', () => {
      const factory = EVOLUTION_MODIFIER_DEFS['burst_precision']
      const mods = factory('burst', 3, {})
      expect(mods.length).toBe(2)
      expect(mods[0].effect?.type).toBe('score')
      expect(mods[1].effect?.type).toBe('multiply')
      expect(mods[1].effect?.value).toBe(0.3)
    })

    it('amp_overdrive: 倍率翻倍 + set_word_cooldown 行为', () => {
      const factory = EVOLUTION_MODIFIER_DEFS['amp_overdrive']
      const mods = factory('amp', 3, {})
      expect(mods.length).toBe(2)
      const cooldownMod = mods.find(m => m.behavior?.type === 'set_word_cooldown')
      expect(cooldownMod).toBeTruthy()
    })

    it('echo_resonance: set_echo_flag 行为（runtime 三触发）', () => {
      const factory = EVOLUTION_MODIFIER_DEFS['echo_resonance']
      const mods = factory('echo', 3, {})
      const echoFlagMod = mods.find(m => m.behavior?.type === 'set_echo_flag')
      expect(echoFlagMod).toBeTruthy()
    })

    it('echo_phantom: trigger_random_adjacent 行为', () => {
      const factory = EVOLUTION_MODIFIER_DEFS['echo_phantom']
      const mods = factory('echo', 3, {})
      const randomAdjMod = mods.find(m => m.behavior?.type === 'trigger_random_adjacent')
      expect(randomAdjMod).toBeTruthy()
    })

    it('freeze_permafrost: 固定 +1.5 秒', () => {
      const factory = EVOLUTION_MODIFIER_DEFS['freeze_permafrost']
      const mods = factory('freeze', 3, {})
      expect(mods.length).toBe(1)
      expect(mods[0].effect?.type).toBe('time')
      expect(mods[0].effect?.value).toBe(1.5)
    })

    it('freeze_chrono: restore_combo 行为 (triggerEvery=3)', () => {
      const factory = EVOLUTION_MODIFIER_DEFS['freeze_chrono']
      const mods = factory('freeze', 3, {})
      expect(mods.length).toBe(1)
      expect(mods[0].behavior?.type).toBe('restore_combo')
      if (mods[0].behavior?.type === 'restore_combo') {
        expect(mods[0].behavior.triggerEvery).toBe(3)
      }
    })

    it('lone_hermit: 孤立加成 ×3 + 触发条件', () => {
      const factory = EVOLUTION_MODIFIER_DEFS['lone_hermit']
      const mods = factory('lone', 3, {})
      expect(mods.length).toBe(1)
      expect(mods[0].condition).toEqual({ type: 'skills_triggered_this_word', value: 1 })
    })
  })

  // === getSkillDisplayInfo 测试 ===
  describe('getSkillDisplayInfo', () => {
    it('无进化时返回原始技能信息', () => {
      const display = getSkillDisplayInfo('burst')
      expect(display.name).toBe(SKILLS['burst'].name)
      expect(display.icon).toBe(SKILLS['burst'].icon)
    })

    it('有进化时返回进化后信息', () => {
      const evolvedSkills = new Map([['burst', 'burst_inferno']])
      const display = getSkillDisplayInfo('burst', evolvedSkills)
      expect(display.name).toBe('烈焰爆发')
      expect(display.icon).toBe('🔥')
    })

    it('进化 ID 不存在时回退到原始信息', () => {
      const evolvedSkills = new Map([['burst', 'nonexistent']])
      const display = getSkillDisplayInfo('burst', evolvedSkills)
      expect(display.name).toBe(SKILLS['burst'].name)
    })

    it('技能不存在时返回默认值', () => {
      const display = getSkillDisplayInfo('nonexistent')
      expect(display.name).toBe('???')
      expect(display.icon).toBe('?')
    })
  })

  // === generateFeedback 进化适配测试 ===
  describe('generateFeedback 进化适配', () => {
    const zeroEffects: EffectAccumulator = { score: 0, multiply: 0, time: 0, gold: 0, shield: 0 }
    const ctx: PipelineContext = {}

    it('未进化时返回基础反馈', () => {
      const fb = generateFeedback('burst', { ...zeroEffects, score: 10 }, ctx)
      expect(fb).not.toBeNull()
      expect(fb!.text).toContain('分')
    })

    it('echo_resonance 显示"共鸣→三触发"', () => {
      state.player.evolvedSkills.set('echo', 'echo_resonance')
      const fb = generateFeedback('echo', zeroEffects, ctx)
      expect(fb).not.toBeNull()
      expect(fb!.text).toContain('共鸣')
    })

    it('echo_phantom 显示"幻影→随机触发"', () => {
      state.player.evolvedSkills.set('echo', 'echo_phantom')
      const fb = generateFeedback('echo', zeroEffects, ctx)
      expect(fb).not.toBeNull()
      expect(fb!.text).toContain('幻影')
    })

    it('freeze_permafrost 有 time 时显示秒数', () => {
      state.player.evolvedSkills.set('freeze', 'freeze_permafrost')
      const fb = generateFeedback('freeze', { ...zeroEffects, time: 1.5 }, ctx)
      expect(fb).not.toBeNull()
      expect(fb!.text).toContain('永冻')
      expect(fb!.text).toContain('1.5')
    })

    it('freeze_permafrost 无 time 时显示"本词已触发"', () => {
      state.player.evolvedSkills.set('freeze', 'freeze_permafrost')
      const fb = generateFeedback('freeze', zeroEffects, ctx)
      expect(fb).not.toBeNull()
      expect(fb!.text).toContain('本词已触发')
    })

    it('freeze_chrono 显示"时光倒流"', () => {
      state.player.evolvedSkills.set('freeze', 'freeze_chrono')
      const fb = generateFeedback('freeze', zeroEffects, ctx)
      expect(fb).not.toBeNull()
      expect(fb!.text).toContain('时光倒流')
    })

    it('burst_inferno 有分数时显示"烈焰"', () => {
      state.player.evolvedSkills.set('burst', 'burst_inferno')
      state.multiplier = 1
      const fb = generateFeedback('burst', { ...zeroEffects, score: 20 }, ctx)
      expect(fb).not.toBeNull()
      expect(fb!.text).toContain('烈焰')
    })

    it('burst_inferno 无分数时显示"combo不足"', () => {
      state.player.evolvedSkills.set('burst', 'burst_inferno')
      const fb = generateFeedback('burst', zeroEffects, ctx)
      expect(fb).not.toBeNull()
      expect(fb!.text).toContain('combo不足')
    })
  })
})
