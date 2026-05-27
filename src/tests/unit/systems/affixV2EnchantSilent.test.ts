// ============================================
// 打字肉鸽 - 无词条技能获得附魔时静默
// ============================================
// maybeGrantV2Enchant 对无 V2 词条的技能直接 onComplete（不掷概率、不弹 picker）·
// 测试在无 DOM 的 node 环境跑：若误入 showV2EnchantPicker 会触碰 document → 抛错；
// 静默跳过则全程不触 DOM。

import { describe, it, expect, beforeEach } from 'vitest'
import { maybeGrantV2Enchant } from '../../../src/systems/restStage'
import { state } from '../../../src/core/state'
import { clearAllEquipped } from '../../../src/systems/affixV2Equipped'

beforeEach(() => {
  clearAllEquipped()
  state.affixSkills.clear()
})

describe('无词条技能获得附魔 → 静默', () => {
  it('技能存在但无 V2 词条 → 同步 onComplete，不弹界面', () => {
    state.affixSkills.set('s_no_affix', { rarity: 0, resource: 'score', level: 3 } as never)
    let done = false
    expect(() => maybeGrantV2Enchant('s_no_affix', () => { done = true })).not.toThrow()
    expect(done).toBe(true)
  })

  it('技能不存在 → 同步 onComplete', () => {
    let done = false
    maybeGrantV2Enchant('ghost', () => { done = true })
    expect(done).toBe(true)
  })
})
