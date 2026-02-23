// ============================================
// 打字肉鸽 - ConditionEvaluator 单元测试
// ============================================
// Story 11.3: 条件系统

import { describe, it, expect, vi, afterEach } from 'vitest'
import { ConditionEvaluator } from '../../../../src/systems/modifiers/ConditionEvaluator'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'
import type { Modifier, PipelineContext } from '../../../../src/systems/modifiers/ModifierTypes'

// === 测试工厂 ===
function createTestModifier(overrides: Partial<Modifier> = {}): Modifier {
  return {
    id: 'test:mod:1',
    source: 'test:mod',
    sourceType: 'skill',
    layer: 'base',
    trigger: 'on_skill_trigger',
    phase: 'calculate',
    priority: 100,
    effect: { type: 'score', value: 5, stacking: 'additive' },
    ...overrides,
  }
}

describe('ConditionEvaluator', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // === 无条件 ===
  describe('无条件', () => {
    it('condition=undefined → true', () => {
      expect(ConditionEvaluator.evaluate(undefined, {})).toBe(true)
    })

    it('condition=undefined, context=undefined → true', () => {
      expect(ConditionEvaluator.evaluate(undefined)).toBe(true)
    })
  })

  // === 战斗状态条件 ===
  describe('combo_gte', () => {
    it('combo=10, value=5 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'combo_gte', value: 5 },
        { combo: 10 },
      )).toBe(true)
    })

    it('combo=3, value=5 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'combo_gte', value: 5 },
        { combo: 3 },
      )).toBe(false)
    })

    it('combo=5, value=5 → true (边界)', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'combo_gte', value: 5 },
        { combo: 5 },
      )).toBe(true)
    })
  })

  describe('combo_lte', () => {
    it('combo=3, value=5 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'combo_lte', value: 5 },
        { combo: 3 },
      )).toBe(true)
    })

    it('combo=10, value=5 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'combo_lte', value: 5 },
        { combo: 10 },
      )).toBe(false)
    })
  })

  describe('no_errors', () => {
    it('hasError=false → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'no_errors' },
        { hasError: false },
      )).toBe(true)
    })

    it('hasError=true → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'no_errors' },
        { hasError: true },
      )).toBe(false)
    })

    it('hasError 未提供 → 默认 false → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'no_errors' },
        {},
      )).toBe(true)
    })
  })

  describe('random', () => {
    it('probability=0.5, random=0.3 → true', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3)
      expect(ConditionEvaluator.evaluate(
        { type: 'random', probability: 0.5 },
        {},
      )).toBe(true)
    })

    it('probability=0.5, random=0.7 → false', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.7)
      expect(ConditionEvaluator.evaluate(
        { type: 'random', probability: 0.5 },
        {},
      )).toBe(false)
    })

    it('probability=0.5, random=0.5 → false (不含边界)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      expect(ConditionEvaluator.evaluate(
        { type: 'random', probability: 0.5 },
        {},
      )).toBe(false)
    })
  })

  // === 位置条件 ===
  describe('adjacent_skills_gte', () => {
    it('adjacentSkillCount=3, value=2 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'adjacent_skills_gte', value: 2 },
        { adjacentSkillCount: 3 },
      )).toBe(true)
    })

    it('adjacentSkillCount=1, value=2 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'adjacent_skills_gte', value: 2 },
        { adjacentSkillCount: 1 },
      )).toBe(false)
    })
  })

  describe('adjacent_empty_gte', () => {
    it('adjacentEmptyCount=2, value=1 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'adjacent_empty_gte', value: 1 },
        { adjacentEmptyCount: 2 },
      )).toBe(true)
    })

    it('adjacentEmptyCount=0, value=1 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'adjacent_empty_gte', value: 1 },
        { adjacentEmptyCount: 0 },
      )).toBe(false)
    })
  })

  describe('adjacent_has_type', () => {
    it('adjacentSkillTypes 包含 score → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'adjacent_has_type', skillType: 'score' },
        { adjacentSkillTypes: ['score', 'time'] },
      )).toBe(true)
    })

    it('adjacentSkillTypes 不包含 multiply → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'adjacent_has_type', skillType: 'multiply' },
        { adjacentSkillTypes: ['score', 'time'] },
      )).toBe(false)
    })

    it('adjacentSkillTypes 未提供 → 默认空数组 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'adjacent_has_type', skillType: 'score' },
        {},
      )).toBe(false)
    })
  })

  // === 词语条件 ===
  describe('word_length_gte', () => {
    it('currentWord="hello"(5), value=5 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_length_gte', value: 5 },
        { currentWord: 'hello' },
      )).toBe(true)
    })

    it('currentWord="hello"(5), value=6 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_length_gte', value: 6 },
        { currentWord: 'hello' },
      )).toBe(false)
    })
  })

  describe('word_length_lte', () => {
    it('currentWord="hi"(2), value=3 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_length_lte', value: 3 },
        { currentWord: 'hi' },
      )).toBe(true)
    })

    it('currentWord="hi"(2), value=1 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_length_lte', value: 1 },
        { currentWord: 'hi' },
      )).toBe(false)
    })
  })

  describe('word_has_letter', () => {
    it('currentWord="hello", letter="e" → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_has_letter', letter: 'e' },
        { currentWord: 'hello' },
      )).toBe(true)
    })

    it('currentWord="hello", letter="z" → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_has_letter', letter: 'z' },
        { currentWord: 'hello' },
      )).toBe(false)
    })

    it('currentWord 未提供 → 默认空串 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_has_letter', letter: 'a' },
        {},
      )).toBe(false)
    })
  })

  // === 遗物条件 ===
  describe('multiplier_gte', () => {
    it('multiplier=3.5, value=3.0 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'multiplier_gte', value: 3.0 },
        { multiplier: 3.5 },
      )).toBe(true)
    })

    it('multiplier=2.0, value=3.0 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'multiplier_gte', value: 3.0 },
        { multiplier: 2.0 },
      )).toBe(false)
    })

    it('multiplier=3.0, value=3.0 → true (边界)', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'multiplier_gte', value: 3.0 },
        { multiplier: 3.0 },
      )).toBe(true)
    })

    it('multiplier 未提供 → 默认 1', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'multiplier_gte', value: 3.0 },
        {},
      )).toBe(false)
    })
  })

  // === 上下文条件 ===
  describe('skills_triggered_this_word', () => {
    it('skillsTriggeredThisWord=0, value=0 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'skills_triggered_this_word', value: 0 },
        { skillsTriggeredThisWord: 0 },
      )).toBe(true)
    })

    it('skillsTriggeredThisWord=2, value=0 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'skills_triggered_this_word', value: 0 },
        { skillsTriggeredThisWord: 2 },
      )).toBe(false)
    })

    it('skillsTriggeredThisWord=3, value=3 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'skills_triggered_this_word', value: 3 },
        { skillsTriggeredThisWord: 3 },
      )).toBe(true)
    })
  })

  describe('nth_word', () => {
    it('wordNumber=6, value=3 → true (6%3=0)', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'nth_word', value: 3 },
        { wordNumber: 6 },
      )).toBe(true)
    })

    it('wordNumber=5, value=3 → false (5%3=2)', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'nth_word', value: 3 },
        { wordNumber: 5 },
      )).toBe(false)
    })

    it('wordNumber=0 → false (战斗未开始)', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'nth_word', value: 3 },
        { wordNumber: 0 },
      )).toBe(false)
    })

    it('wordNumber 未提供 → 默认 0 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'nth_word', value: 2 },
        {},
      )).toBe(false)
    })
  })

  // === Story 12.1: 新增条件 ===
  describe('skills_triggered_gte', () => {
    it('skillsTriggeredThisWord=3, value=3 → true (边界)', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'skills_triggered_gte', value: 3 },
        { skillsTriggeredThisWord: 3 },
      )).toBe(true)
    })

    it('skillsTriggeredThisWord=5, value=3 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'skills_triggered_gte', value: 3 },
        { skillsTriggeredThisWord: 5 },
      )).toBe(true)
    })

    it('skillsTriggeredThisWord=2, value=3 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'skills_triggered_gte', value: 3 },
        { skillsTriggeredThisWord: 2 },
      )).toBe(false)
    })
  })

  describe('different_skill_from_last', () => {
    it('不同技能 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'different_skill_from_last' },
        { currentSkillId: 'chain', lastTriggeredSkillId: 'burst' },
      )).toBe(true)
    })

    it('相同技能 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'different_skill_from_last' },
        { currentSkillId: 'chain', lastTriggeredSkillId: 'chain' },
      )).toBe(false)
    })

    it('无前置技能（第一个触发）→ false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'different_skill_from_last' },
        { currentSkillId: 'chain' },
      )).toBe(false)
    })

    it('lastTriggeredSkillId=undefined → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'different_skill_from_last' },
        { currentSkillId: 'chain', lastTriggeredSkillId: undefined },
      )).toBe(false)
    })

    it('currentSkillId 缺失但 lastTriggeredSkillId 存在 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'different_skill_from_last' },
        { lastTriggeredSkillId: 'burst' },
      )).toBe(false)
    })
  })

  // === 缺失上下文字段默认行为 ===
  describe('key_is (字母升级)', () => {
    it('匹配相同字母 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'key_is', key: 'e' },
        { currentKeystrokeKey: 'e' },
      )).toBe(true)
    })

    it('大小写不敏感: key=E, ctx=e → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'key_is', key: 'E' },
        { currentKeystrokeKey: 'e' },
      )).toBe(true)
    })

    it('大小写不敏感: key=e, ctx=E → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'key_is', key: 'e' },
        { currentKeystrokeKey: 'E' },
      )).toBe(true)
    })

    it('不匹配不同字母 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'key_is', key: 'e' },
        { currentKeystrokeKey: 'a' },
      )).toBe(false)
    })

    it('ctx 无 currentKeystrokeKey → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'key_is', key: 'e' },
        {},
      )).toBe(false)
    })

    it('ctx 为 undefined → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'key_is', key: 'e' },
      )).toBe(false)
    })
  })

  // === Story 14.3: 词语特征条件 ===
  describe('word_has_double_letter', () => {
    it('词含重复字母 "book" → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_has_double_letter' },
        { currentWord: 'book' },
      )).toBe(true)
    })

    it('词含重复字母 "jazz" → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_has_double_letter' },
        { currentWord: 'jazz' },
      )).toBe(true)
    })

    it('词无重复字母 "words" → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_has_double_letter' },
        { currentWord: 'words' },
      )).toBe(false)
    })

    it('空词 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_has_double_letter' },
        { currentWord: '' },
      )).toBe(false)
    })

    it('大写词 "BOOK" → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_has_double_letter' },
        { currentWord: 'BOOK' },
      )).toBe(true)
    })

    it('单字母 "a" → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_has_double_letter' },
        { currentWord: 'a' },
      )).toBe(false)
    })
  })

  describe('word_all_unique_letters', () => {
    it('全唯一 "words" → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_all_unique_letters' },
        { currentWord: 'words' },
      )).toBe(true)
    })

    it('全唯一 "flame" → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_all_unique_letters' },
        { currentWord: 'flame' },
      )).toBe(true)
    })

    it('有重复 "book" → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_all_unique_letters' },
        { currentWord: 'book' },
      )).toBe(false)
    })

    it('空词 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_all_unique_letters' },
        { currentWord: '' },
      )).toBe(false)
    })

    it('大写全唯一 "FLAME" → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_all_unique_letters' },
        { currentWord: 'FLAME' },
      )).toBe(true)
    })

    it('单字母 "x" → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_all_unique_letters' },
        { currentWord: 'x' },
      )).toBe(true)
    })
  })

  describe('word_vowel_ratio_gte', () => {
    it('高元音 "aeiou"(100%) ≥ 0.5 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_vowel_ratio_gte', value: 0.5 },
        { currentWord: 'aeiou' },
      )).toBe(true)
    })

    it('低元音 "rhythm"(0%) ≥ 0.3 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_vowel_ratio_gte', value: 0.3 },
        { currentWord: 'rhythm' },
      )).toBe(false)
    })

    it('边界 "hello"(2/5=0.4) ≥ 0.4 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_vowel_ratio_gte', value: 0.4 },
        { currentWord: 'hello' },
      )).toBe(true)
    })

    it('"hello"(2/5=0.4) ≥ 0.5 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_vowel_ratio_gte', value: 0.5 },
        { currentWord: 'hello' },
      )).toBe(false)
    })

    it('空词 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_vowel_ratio_gte', value: 0.1 },
        { currentWord: '' },
      )).toBe(false)
    })

    it('大写 "AUDIO"(4/5=0.8) ≥ 0.5 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'word_vowel_ratio_gte', value: 0.5 },
        { currentWord: 'AUDIO' },
      )).toBe(true)
    })
  })

  describe('skill_density_gte', () => {
    it('skillDensity=0.75 ≥ 0.5 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'skill_density_gte', value: 0.5 },
        { skillDensity: 0.75 },
      )).toBe(true)
    })

    it('skillDensity=0 ≥ 0.5 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'skill_density_gte', value: 0.5 },
        { skillDensity: 0 },
      )).toBe(false)
    })

    it('边界 skillDensity=0.5 ≥ 0.5 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'skill_density_gte', value: 0.5 },
        { skillDensity: 0.5 },
      )).toBe(true)
    })

    it('skillDensity 未提供 → 默认 0 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'skill_density_gte', value: 0.1 },
        {},
      )).toBe(false)
    })
  })

  describe('word_has_double_letter 与 word_all_unique_letters 互斥', () => {
    it('非空词二者必定一真一假', () => {
      const testWords = ['book', 'flame', 'jazz', 'words', 'see', 'cat']
      for (const word of testWords) {
        const hasDouble = ConditionEvaluator.evaluate(
          { type: 'word_has_double_letter' }, { currentWord: word })
        const allUnique = ConditionEvaluator.evaluate(
          { type: 'word_all_unique_letters' }, { currentWord: word })
        expect(hasDouble).not.toBe(allUnique)
      }
    })
  })

  describe('缺失上下文默认行为', () => {
    it('combo 未提供 → 默认 0, combo_gte value=0 → true', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'combo_gte', value: 0 },
        {},
      )).toBe(true)
    })

    it('adjacentSkillCount 未提供 → 默认 0, adjacent_skills_gte value=1 → false', () => {
      expect(ConditionEvaluator.evaluate(
        { type: 'adjacent_skills_gte', value: 1 },
        {},
      )).toBe(false)
    })
  })
})

// === EffectPipeline 集成测试 ===
describe('EffectPipeline + ConditionEvaluator 集成', () => {
  let registry: ModifierRegistry

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('before-phase: 条件不满足的 intercept 被跳过', () => {
    registry = new ModifierRegistry()
    registry.register(createTestModifier({
      id: 'skill:shield:intercept',
      phase: 'before',
      layer: 'base',
      effect: undefined,
      condition: { type: 'combo_gte', value: 10 },
      behavior: { type: 'intercept' },
    }))
    registry.register(createTestModifier({
      id: 'skill:burst:score',
      layer: 'base',
      effect: { type: 'score', value: 10, stacking: 'additive' },
    }))
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { combo: 3 })
    // intercept 条件不满足 (combo 3 < 10) → 不拦截，正常计算
    expect(result.intercepted).toBe(false)
    expect(result.effects.score).toBe(10)
  })

  it('after-phase: 条件不满足的 behavior 被排除', () => {
    registry = new ModifierRegistry()
    registry.register(createTestModifier({
      id: 'skill:echo:chain',
      phase: 'after',
      layer: 'base',
      effect: undefined,
      condition: { type: 'combo_gte', value: 10 },
      behavior: { type: 'trigger_adjacent' },
    }))
    registry.register(createTestModifier({
      id: 'skill:ripple:buff',
      phase: 'after',
      layer: 'base',
      effect: undefined,
      behavior: { type: 'buff_next_skill', multiplier: 1.5 },
    }))
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { combo: 3 })
    // echo 条件不满足 → 排除，ripple 无条件 → 保留
    expect(result.pendingBehaviors).toHaveLength(1)
    expect(result.pendingBehaviors[0]).toEqual({ type: 'buff_next_skill', multiplier: 1.5 })
  })

  it('条件不满足的修饰器被跳过', () => {
    registry = new ModifierRegistry()
    registry.register(createTestModifier({
      id: 'skill:burst:score',
      layer: 'base',
      condition: { type: 'combo_gte', value: 10 },
      effect: { type: 'score', value: 20, stacking: 'additive' },
    }))
    registry.register(createTestModifier({
      id: 'skill:lone:score',
      layer: 'base',
      effect: { type: 'score', value: 5, stacking: 'additive' },
    }))
    const ctx: PipelineContext = { combo: 3 }
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
    // burst 条件不满足 (combo 3 < 10) 被跳过，只有 lone 的 5 分
    expect(result.effects.score).toBe(5)
  })

  it('条件满足的修饰器正常计算', () => {
    registry = new ModifierRegistry()
    registry.register(createTestModifier({
      id: 'skill:burst:score',
      layer: 'base',
      condition: { type: 'combo_gte', value: 10 },
      effect: { type: 'score', value: 20, stacking: 'additive' },
    }))
    registry.register(createTestModifier({
      id: 'skill:lone:score',
      layer: 'base',
      effect: { type: 'score', value: 5, stacking: 'additive' },
    }))
    const ctx: PipelineContext = { combo: 15 }
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', ctx)
    // burst 条件满足 (combo 15 >= 10) → 20 + 5 = 25
    expect(result.effects.score).toBe(25)
  })

  // === Story 14.3: rhyme_master 遗物集成 ===
  it('word_has_double_letter 条件满足时遗物加分', () => {
    registry = new ModifierRegistry()
    // 模拟 rhyme_master 遗物效果
    registry.register(createTestModifier({
      id: 'relic:rhyme_master:score',
      source: 'relic:rhyme_master',
      sourceType: 'relic',
      layer: 'base',
      effect: { type: 'score', value: 3, stacking: 'additive' },
      condition: { type: 'word_has_double_letter' },
    }))
    // 技能基础分
    registry.register(createTestModifier({
      id: 'skill:burst:score',
      layer: 'base',
      effect: { type: 'score', value: 5, stacking: 'additive' },
    }))
    // 词含重复字母 → 遗物生效
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentWord: 'BOOK' })
    expect(result.effects.score).toBe(8) // 5 + 3
  })

  it('word_has_double_letter 条件不满足时遗物不加分', () => {
    registry = new ModifierRegistry()
    registry.register(createTestModifier({
      id: 'relic:rhyme_master:score',
      source: 'relic:rhyme_master',
      sourceType: 'relic',
      layer: 'base',
      effect: { type: 'score', value: 3, stacking: 'additive' },
      condition: { type: 'word_has_double_letter' },
    }))
    registry.register(createTestModifier({
      id: 'skill:burst:score',
      layer: 'base',
      effect: { type: 'score', value: 5, stacking: 'additive' },
    }))
    // 词无重复字母 → 遗物不生效
    const result = EffectPipeline.resolve(registry, 'on_skill_trigger', { currentWord: 'FLAME' })
    expect(result.effects.score).toBe(5) // 只有技能分
  })
})
