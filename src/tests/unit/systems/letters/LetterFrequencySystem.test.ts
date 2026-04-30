// ============================================
// 打字肉鸽 - LetterFrequencySystem 单元测试
// ============================================
// Story 16.1: 字频解锁
// 词语效果系统: getWordEffectModifiers 测试

import { describe, it, expect } from 'vitest'
import {
  calculateLetterFrequency,
  calculateLetterScores,
  getWordEffectModifiers,
} from '../../../../src/systems/letters/LetterFrequencySystem'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'
import type { WordEffect } from '../../../../src/core/types'

// ========================================
// calculateLetterFrequency
// ========================================
describe('calculateLetterFrequency', () => {
  it('空词库 → 空 Map', () => {
    const freq = calculateLetterFrequency([])
    expect(freq.size).toBe(0)
  })

  it('单词统计各字母出现次数', () => {
    const freq = calculateLetterFrequency(['sleep'])
    expect(freq.get('s')).toBe(1)
    expect(freq.get('l')).toBe(1)
    expect(freq.get('e')).toBe(2)
    expect(freq.get('p')).toBe(1)
  })

  it('多词累加频率', () => {
    const freq = calculateLetterFrequency(['fire', 'ice', 'flame'])
    expect(freq.get('e')).toBe(3) // fire + ice + flame
    expect(freq.get('i')).toBe(2) // fire + ice
    expect(freq.get('f')).toBe(2) // fire + flame
  })

  it('大小写统一为小写', () => {
    const freq = calculateLetterFrequency(['Fire', 'ICE'])
    expect(freq.get('f')).toBe(1)
    expect(freq.get('i')).toBe(2) // F→f: 'i' in 'ire' + 'I' in 'ICE'
  })

  it('非字母字符被忽略', () => {
    const freq = calculateLetterFrequency(['hello-world', 'test 123'])
    expect(freq.has('-')).toBe(false)
    expect(freq.has(' ')).toBe(false)
    expect(freq.has('1')).toBe(false)
  })
})

// ========================================
// getWordEffectModifiers
// ========================================
describe('getWordEffectModifiers', () => {
  it('空 wordEffects 返回空数组', () => {
    expect(getWordEffectModifiers(new Map())).toEqual([])
  })

  it('单个底分词生成 score 修饰器（独特字母）', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('flame', { type: 'base_score', value: 1 })
    const mods = getWordEffectModifiers(effects)
    // flame 有 5 个独特字母: f, l, a, m, e
    expect(mods).toHaveLength(5)
    const letters = mods.map(m => m.condition!.key).sort()
    expect(letters).toEqual(['a', 'e', 'f', 'l', 'm'])
    mods.forEach(m => {
      expect(m.effect!.type).toBe('score')
      expect(m.effect!.value).toBe(1)
      expect(m.trigger).toBe('on_correct_keystroke')
    })
  })

  it('同类型效果词叠加 value（同一字母）', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('flame', { type: 'base_score', value: 1 })
    effects.set('face', { type: 'base_score', value: 1 })
    const mods = getWordEffectModifiers(effects)
    // 'e' 在两个词中都出现 → value 叠加为 2
    const eMod = mods.find(m => m.condition!.key === 'e' && m.effect!.type === 'score')
    expect(eMod!.effect!.value).toBe(2)
  })

  it('不同类型效果生成不同修饰器', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('a', { type: 'base_score', value: 1 })
    effects.set('ab', { type: 'multiplier', value: 0.1 })
    const mods = getWordEffectModifiers(effects)
    // 'a' 有 score(1) + multiply(0.1)
    const aScore = mods.find(m => m.condition!.key === 'a' && m.effect!.type === 'score')
    const aMult = mods.find(m => m.condition!.key === 'a' && m.effect!.type === 'multiply')
    expect(aScore!.effect!.value).toBe(1)
    expect(aMult!.effect!.value).toBe(0.1)
  })

  it('重复字母只计算一次（独特字母）', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('see', { type: 'base_score', value: 2 })
    const mods = getWordEffectModifiers(effects)
    // see → 独特字母 s, e（不是 s, e, e）
    expect(mods).toHaveLength(2)
    const eMod = mods.find(m => m.condition!.key === 'e')
    expect(eMod!.effect!.value).toBe(2)
  })

  it('生成正确形状的修饰器', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('e', { type: 'gold', value: 2 })
    const mods = getWordEffectModifiers(effects)
    expect(mods).toHaveLength(1)
    expect(mods[0].id).toBe('wordeffect:e:gold')
    expect(mods[0].source).toBe('wordeffect:e')
    expect(mods[0].sourceType).toBe('letter')
    expect(mods[0].layer).toBe('base')
    expect(mods[0].trigger).toBe('on_correct_keystroke')
    expect(mods[0].phase).toBe('calculate')
    expect(mods[0].condition).toEqual({ type: 'key_is', key: 'e' })
    expect(mods[0].effect).toEqual({ type: 'gold', value: 2, stacking: 'additive' })
    expect(mods[0].priority).toBe(50)
  })
})

// ========================================
// calculateLetterScores (Story 60.19 helper)
// ========================================
describe('calculateLetterScores', () => {
  it('空 wordEffects 返回空 Map', () => {
    expect(calculateLetterScores(new Map()).size).toBe(0)
  })

  it('单字母 base_score 直接累加（targetLetter 路径）', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('a', { type: 'base_score', value: 5, targetLetter: 'a' })
    const scores = calculateLetterScores(effects)
    // round((1 + 5) * 1 - 1) = 5
    expect(scores.get('a')).toBe(5)
  })

  it('词内 base_score 按独特字母分摊（不锁 targetLetter）', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('see', { type: 'base_score', value: 2 })
    const scores = calculateLetterScores(effects)
    // 独特字母 s, e；each round((1+2)*1-1) = 2
    expect(scores.get('s')).toBe(2)
    expect(scores.get('e')).toBe(2)
  })

  it('base_multiplier 按 targetLetter 应用，0 加成时也产显示值', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('m1', { type: 'base_multiplier', value: 3, targetLetter: 'q' })
    const scores = calculateLetterScores(effects)
    // round((1+0)*3 - 1) = 2
    expect(scores.get('q')).toBe(2)
  })

  it('base_score 与 base_multiplier 联用：先加再乘再 -1', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('s1', { type: 'base_score', value: 4, targetLetter: 'a' })
    effects.set('m1', { type: 'base_multiplier', value: 2, targetLetter: 'a' })
    const scores = calculateLetterScores(effects)
    // round((1+4)*2 - 1) = 9
    expect(scores.get('a')).toBe(9)
  })

  it('score 为 0 的键不进 Map', () => {
    const effects = new Map<string, WordEffect>()
    // base_multiplier 1 + 0 score → round((1+0)*1-1)=0 → 不进
    effects.set('m1', { type: 'base_multiplier', value: 1, targetLetter: 'z' })
    const scores = calculateLetterScores(effects)
    expect(scores.has('z')).toBe(false)
  })

  it('multiplier 不带 targetLetter 时被忽略（与 classic shop 一致）', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('mult', { type: 'base_multiplier', value: 2 })
    const scores = calculateLetterScores(effects)
    expect(scores.size).toBe(0)
  })
})

// ========================================
// 管道集成测试
// ========================================
describe('管道集成: 词语效果修饰器 + EffectPipeline', () => {
  it('击键匹配字母 → 产出对应效果', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('flame', { type: 'base_score', value: 2 })
    const registry = new ModifierRegistry()
    registry.registerMany(getWordEffectModifiers(effects))
    const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
      currentKeystrokeKey: 'f',
    })
    expect(result.effects.score).toBe(2)
  })

  it('击键不匹配 → 无效果', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('flame', { type: 'base_score', value: 2 })
    const registry = new ModifierRegistry()
    registry.registerMany(getWordEffectModifiers(effects))
    const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
      currentKeystrokeKey: 'z',
    })
    expect(result.effects.score).toBe(0)
  })

  it('倍率效果正确产出', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('ace', { type: 'multiplier', value: 0.2 })
    const registry = new ModifierRegistry()
    registry.registerMany(getWordEffectModifiers(effects))
    const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
      currentKeystrokeKey: 'a',
    })
    expect(result.effects.multiply).toBeCloseTo(0.2)
  })

  it('时间效果正确产出', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('time', { type: 'time', value: 0.5 })
    const registry = new ModifierRegistry()
    registry.registerMany(getWordEffectModifiers(effects))
    const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
      currentKeystrokeKey: 't',
    })
    expect(result.effects.time).toBeCloseTo(0.5)
  })

  it('香蕉效果正确产出', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('gold', { type: 'gold', value: 2 })
    const registry = new ModifierRegistry()
    registry.registerMany(getWordEffectModifiers(effects))
    const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
      currentKeystrokeKey: 'g',
    })
    expect(result.effects.gold).toBe(2)
  })

  it('多效果词完整词语模拟', () => {
    const effects = new Map<string, WordEffect>()
    effects.set('see', { type: 'base_score', value: 1 })
    effects.set('sea', { type: 'gold', value: 2 })
    // s → score 1, gold 2; e → score 1, gold 2; a → gold 2
    const registry = new ModifierRegistry()
    registry.registerMany(getWordEffectModifiers(effects))

    let totalScore = 0
    let totalGold = 0
    for (const char of 'sea') {
      const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
        currentKeystrokeKey: char,
      })
      totalScore += result.effects.score
      totalGold += result.effects.gold
    }
    // s: score 1 + gold 2, e: score 1 + gold 2, a: gold 2
    expect(totalScore).toBe(2)
    expect(totalGold).toBe(6)
  })
})
