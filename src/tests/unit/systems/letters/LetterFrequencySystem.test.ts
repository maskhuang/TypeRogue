// ============================================
// 打字肉鸽 - LetterFrequencySystem 单元测试
// ============================================
// Story 16.1: 字频底分核心系统

import { describe, it, expect } from 'vitest'
import {
  calculateLetterFrequency,
  letterFrequencyToScore,
  getLetterScores,
  getLetterScoreModifiers,
} from '../../../../src/systems/letters/LetterFrequencySystem'
import { ModifierRegistry } from '../../../../src/systems/modifiers/ModifierRegistry'
import { EffectPipeline } from '../../../../src/systems/modifiers/EffectPipeline'

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
// letterFrequencyToScore
// ========================================
describe('letterFrequencyToScore', () => {
  it('freq=0 → score=0', () => {
    expect(letterFrequencyToScore(0)).toBe(0)
  })

  it('freq=4 → score=0', () => {
    expect(letterFrequencyToScore(4)).toBe(0)
  })

  it('freq=5 → score=1', () => {
    expect(letterFrequencyToScore(5)).toBe(1)
  })

  it('freq=9 → score=1', () => {
    expect(letterFrequencyToScore(9)).toBe(1)
  })

  it('freq=10 → score=2', () => {
    expect(letterFrequencyToScore(10)).toBe(2)
  })

  it('freq=25 → score=5', () => {
    expect(letterFrequencyToScore(25)).toBe(5)
  })

  it('freq=30 → score=6', () => {
    expect(letterFrequencyToScore(30)).toBe(6)
  })
})

// ========================================
// getLetterScores
// ========================================
describe('getLetterScores', () => {
  it('空词库 → 空 Map', () => {
    const scores = getLetterScores([])
    expect(scores.size).toBe(0)
  })

  it('频率不足 5 的字母不出现在结果中', () => {
    const scores = getLetterScores(['fire', 'ice'])
    // 每个字母最多出现 2 次，floor(2/5)=0，全部不够
    expect(scores.size).toBe(0)
  })

  it('频率刚好为 5 → score=1', () => {
    // 'eeeee' 中 e 出现 5 次
    const scores = getLetterScores(['eeeee'])
    expect(scores.get('e')).toBe(1)
  })

  it('多词库积累频率', () => {
    // 每个词 e 出现 2 次，5 个词 → e 出现 10 次 → score=2
    const words = ['sleep', 'steep', 'creep', 'fleet', 'greet']
    const scores = getLetterScores(words)
    expect(scores.get('e')!).toBeGreaterThanOrEqual(2)
  })
})

// ========================================
// getLetterScoreModifiers
// ========================================
describe('getLetterScoreModifiers', () => {
  it('空词库返回空数组', () => {
    expect(getLetterScoreModifiers([])).toEqual([])
  })

  it('频率不足的词库返回空数组', () => {
    expect(getLetterScoreModifiers(['fire', 'ice'])).toEqual([])
  })

  it('生成正确形状的修饰器', () => {
    const words = ['eeeee'] // e 出现 5 次 → score=1
    const mods = getLetterScoreModifiers(words)
    expect(mods).toHaveLength(1)
    expect(mods[0].id).toBe('letter:e:score')
    expect(mods[0].source).toBe('letter:e')
    expect(mods[0].sourceType).toBe('letter')
    expect(mods[0].layer).toBe('base')
    expect(mods[0].trigger).toBe('on_correct_keystroke')
    expect(mods[0].phase).toBe('calculate')
    expect(mods[0].condition).toEqual({ type: 'key_is', key: 'e' })
    expect(mods[0].effect).toEqual({ type: 'score', value: 1, stacking: 'additive' })
    expect(mods[0].priority).toBe(50)
  })

  it('多字母生成多个修饰器', () => {
    // a 出现 10 次 → score=2, b 出现 5 次 → score=1
    const words = ['aaaaabbbbb', 'aaaaa']
    const mods = getLetterScoreModifiers(words)
    expect(mods).toHaveLength(2)
    const aMod = mods.find(m => m.id === 'letter:a:score')
    const bMod = mods.find(m => m.id === 'letter:b:score')
    expect(aMod?.effect?.value).toBe(2)
    expect(bMod?.effect?.value).toBe(1)
  })
})

// ========================================
// 管道集成测试
// ========================================
describe('管道集成: 字频修饰器 + EffectPipeline', () => {
  it('击键匹配字母 → score = 字频底分', () => {
    const words = ['eeeeeeeee', 'e'] // e 出现 10 次 → score=2
    const registry = new ModifierRegistry()
    registry.registerMany(getLetterScoreModifiers(words))
    const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
      currentKeystrokeKey: 'e',
    })
    expect(result.effects.score).toBe(2)
  })

  it('击键不匹配 → score = 0', () => {
    const words = ['eeeee'] // e 出现 5 次 → score=1
    const registry = new ModifierRegistry()
    registry.registerMany(getLetterScoreModifiers(words))
    const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
      currentKeystrokeKey: 'a',
    })
    expect(result.effects.score).toBe(0)
  })

  it('完整词语模拟: 只有匹配字母累加底分', () => {
    // e 出现 10 次 → score=2, s 出现 5 次 → score=1
    const deck = ['sssss', 'eeeee', 'eeeee']
    const word = 'see'
    let totalScore = 0

    const registry = new ModifierRegistry()
    registry.registerMany(getLetterScoreModifiers(deck))

    for (const char of word) {
      const result = EffectPipeline.resolve(registry, 'on_correct_keystroke', {
        currentKeystrokeKey: char,
      })
      totalScore += result.effects.score
    }

    // s(1) + e(2) + e(2) = 5
    expect(totalScore).toBe(5)
  })
})
