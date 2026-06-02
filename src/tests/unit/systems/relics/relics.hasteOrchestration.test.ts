// ============================================
// 极速系遗物 · player 级编排层 — 清单契约 + 登记一致性 + 生命周期
// ============================================
// B 方案（2026-06）：这批遗物刻意不走 affixV2 EffectSpec（player 级、无 host skill）。
// 本测试守护"单一事实源" HASTE_RELIC_MANIFEST 与登记表/文档不漂移。

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  HASTE_RELIC_MANIFEST,
  getHasteRelicOutputBonus,
  resetStackingRelicBattleState,
  isPerpetualEngineActive,
  initStackingRelicBehaviors,
} from '../../../../src/systems/relics/StackingRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'

const EXPECTED = [
  'stack_momentum', 'inscription_flow', 'overload_circuit', 'surge',
  'stack_dividend', 'neighbor_watch',
  'drum_pass', 'word_resonance', 'crit_overflow',
  'stack_crit', 'perpetual_engine',
]

describe('极速系遗物编排 · 清单契约', () => {
  beforeEach(() => {
    state.player.relics.clear()
    resetStackingRelicBattleState()
  })

  it('MANIFEST 恰好覆盖 11 个极速遗物', () => {
    expect(Object.keys(HASTE_RELIC_MANIFEST).sort()).toEqual([...EXPECTED].sort())
  })

  it('每条 MANIFEST 都有 phase + impl（文档完整）', () => {
    for (const [id, m] of Object.entries(HASTE_RELIC_MANIFEST)) {
      expect(m.phase, `${id}.phase`).toBeTruthy()
      expect(m.impl, `${id}.impl`).toBeTruthy()
    }
  })

  it('登记表与 MANIFEST 不漂移：init 登记的极速遗物 = MANIFEST 键集', () => {
    clearBehaviorHandlers()
    initStackingRelicBehaviors()
    const registered = new Set(getRegisteredBehaviors())
    for (const id of EXPECTED) expect(registered.has(id), `${id} 应被登记`).toBe(true)
  })

  it('I4：外部落点遗物在 impl 中标注其真实文件', () => {
    expect(HASTE_RELIC_MANIFEST.stack_crit.impl).toMatch(/affixV2BattleIntegration/)
    expect(HASTE_RELIC_MANIFEST.perpetual_engine.impl).toMatch(/affixV2State/)
  })
})

describe('极速系遗物编排 · 生命周期', () => {
  beforeEach(() => {
    state.player.relics.clear()
    resetStackingRelicBattleState()
  })

  it('getHasteRelicOutputBonus 默认 0', () => {
    expect(getHasteRelicOutputBonus('skill_x')).toBe(0)
  })

  it('isPerpetualEngineActive 跟随持有状态', () => {
    expect(isPerpetualEngineActive()).toBe(false)
    state.player.relics.add('perpetual_engine')
    expect(isPerpetualEngineActive()).toBe(true)
  })
})
