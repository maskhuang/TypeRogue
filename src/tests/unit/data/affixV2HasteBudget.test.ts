// ============================================
// 极速供需预算不变式（方案 B2 兜底测试）
// ============================================
// 断言：给予极速（供给 S）始终 > 涉及极速（需求 D）。
// 任何新增 recipe/trigger/scope 若破坏此关系，此测试红灯挡 PR（见 affixV2Generator.ts 极速预算 section）。

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateAffixV2, pickRecipeForSkill, classifyHaste } from '../../../src/data/affixV2Generator'
import { getAffixV2Definition } from '../../../src/data/affixV2'
import { setSeededMode, setNormalMode } from '../../../src/core/seededRandom'

beforeEach(() => setSeededMode(987654))
afterEach(() => setNormalMode())

describe('haste supply/demand budget invariant', () => {
  it('grant_haste share stays above haste-reference share (S > D + margin)', () => {
    const N = 30000
    let grants = 0      // 供给：产 grant_haste
    let refsOnly = 0    // 需求：读取极速但不产出
    for (let i = 0; i < N; i++) {
      const def = getAffixV2Definition(generateAffixV2(pickRecipeForSkill()))
      if (!def) continue
      const c = classifyHaste(def.trigger, def.effect)
      if (c.grants) grants++
      else if (c.references) refsOnly++
    }
    const S = grants / N
    const D = refsOnly / N
    console.log(`\n[haste budget] supply S=${(100 * S).toFixed(2)}%  demand D=${(100 * D).toFixed(2)}%  gap=${(100 * (S - D)).toFixed(2)}pp`)

    // 核心不变式：供给严格高于需求，且留出采样噪声余量（期望 gap ≈ S×0.15 ≈ 1.2pp）
    expect(S).toBeGreaterThan(D + 0.003)
    // 健全性：两者落在合理区间，防标定/分类彻底失效
    expect(S).toBeGreaterThan(0.04)
    expect(S).toBeLessThan(0.15)
    expect(D).toBeGreaterThan(0.01)
    expect(D).toBeLessThan(S)
  })
})
