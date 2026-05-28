// ============================================
// 打字肉鸽 - V2 skill 基础产出 emit 测试
// ============================================
// 验证：装 V2 affix 后调用 onSkillFireV2，state.resources[skill.resource] 真的增加
// 公式：(Lv1Base + Σ cumulativeBaseAdd) × (1 + Σ cumulativeFactorAdd)

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../src/core/state'
import { equipAffixV2, clearAllEquipped } from '../../../src/systems/affixV2Equipped'
import { resetAllAffixV2State } from '../../../src/systems/affixV2State'
import { onSkillFireV2 } from '../../../src/systems/affixV2BattleIntegration'
import { registerDynamicAffixV2, unregisterDynamicAffixV2 } from '../../../src/data/affixV2'

const SKILL_ID = 'skill_test'
const KEY = 'k'

beforeEach(() => {
  clearAllEquipped()
  resetAllAffixV2State()
  // 假装一个挂 v2Ids 的 skill
  state.affixSkills.set(SKILL_ID, {
    id: SKILL_ID,
    name: 'test',
    icon: '',
    resource: 'score',
    baseValues: [11, 24, 50, 95],
    level: 1,
    rarity: 1,
    affixes: [],
    enchantmentIds: [],
    v2Ids: [],   // 占位 — 各测试自己装具体 affix
  })
  // 资源池清零
  const r = state.resources as unknown as Record<string, number>
  r.score = 0
  state.score = 0
})

describe('V2 skill 基础产出 emit', () => {
  it('单 charge 累加：1st fire +11.91，2nd fire +12.82（cumBase 0.91 → 1.83）', () => {
    state.affixSkills.get(SKILL_ID)!.v2Ids = ['charge']
    equipAffixV2(SKILL_ID, KEY, 'charge')

    const r = state.resources as unknown as Record<string, number>

    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'score', false, 0)
    // 1st: cumBase += 0.913 (0.083 × 11) → emit (11 + 0.913) × 1 = 11.913
    expect(r.score).toBeCloseTo(11.913, 2)

    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'score', false, 0)
    // 2nd: cumBase = 1.826 → emit (11 + 1.826) × 1 = 12.826
    expect(r.score - 11.913).toBeCloseTo(12.826, 2)
  })

  it('永久层 permBaseAdd / permFactorAdd 计入基础产出（双阶段·战斗外累积）', () => {
    registerDynamicAffixV2({
      id: 'dp_noop', name_zh: '空', name_en: 'noop', section: 'maintenance', tags: ['maintenance'], phase: 'P1',
      trigger: { type: 'passive' }, effect: { kind: 'noop' },
    })
    const sk = state.affixSkills.get(SKILL_ID)!
    sk.v2Ids = ['dp_noop']
    sk.permBaseAdd = 5
    sk.permFactorAdd = 0.5
    equipAffixV2(SKILL_ID, KEY, 'dp_noop')

    const r = state.resources as unknown as Record<string, number>
    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'score', false, 0)
    // (lv1Base 11 + permBase 5) × (1 + permFactor 0.5) = 16 × 1.5 = 24
    expect(r.score).toBeCloseTo(24, 2)
    unregisterDynamicAffixV2('dp_noop')
  })

  it('单 bite 累加：1st fire 11 × 1.117 = 12.287，2nd × 1.234 = 13.574', () => {
    state.affixSkills.get(SKILL_ID)!.v2Ids = ['bite']
    equipAffixV2(SKILL_ID, KEY, 'bite')

    const r = state.resources as unknown as Record<string, number>

    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'score', false, 0)
    expect(r.score).toBeCloseTo(11 * 1.117, 2)

    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'score', false, 0)
    const second = r.score - 11 * 1.117
    expect(second).toBeCloseTo(11 * 1.234, 2)
  })

  it('charge + bite 同 skill：1st fire 应用 add + multiply', () => {
    state.affixSkills.get(SKILL_ID)!.v2Ids = ['charge', 'bite']
    equipAffixV2(SKILL_ID, KEY, 'charge')
    equipAffixV2(SKILL_ID, KEY, 'bite')

    const r = state.resources as unknown as Record<string, number>

    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'score', false, 0)
    // cumBase = 0.913 (from charge), cumFactor = 0.117 (from bite)
    // emit = (11 + 0.913) × (1 + 0.117) = 11.913 × 1.117 ≈ 13.307
    expect(r.score).toBeCloseTo(11.913 * 1.117, 1)
  })

  it('无 v2Ids 的 skill（legacy）→ 不 emit V2 base', () => {
    state.affixSkills.get(SKILL_ID)!.v2Ids = []
    const r = state.resources as unknown as Record<string, number>
    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'score', false, 0)
    expect(r.score).toBe(0)
  })

  it('feed (gain_resource) → 一次性 +1.1，无 cumulative 影响', () => {
    state.affixSkills.get(SKILL_ID)!.v2Ids = ['feed']
    equipAffixV2(SKILL_ID, KEY, 'feed')

    const r = state.resources as unknown as Record<string, number>
    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'score', false, 0)
    // feed 不响应 on_self_fire（它是 on_word_end），所以 cumBase=0, cumFactor=0
    // base emit = 11 × 1 = 11
    expect(r.score).toBeCloseTo(11, 2)
  })

  it('score 资源同步写入 state.score（玩家可见总分）', () => {
    state.affixSkills.get(SKILL_ID)!.v2Ids = ['charge']
    equipAffixV2(SKILL_ID, KEY, 'charge')

    expect(state.score).toBe(0)
    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'score', false, 0)
    // state.resources.score 与 state.score 必须同步
    const r = state.resources as unknown as Record<string, number>
    expect(state.score).toBeCloseTo(r.score, 4)
    expect(state.score).toBeCloseTo(11.913, 2)
  })

  it('gold 资源同步写入 state.gold + state.player.gold', () => {
    state.affixSkills.get(SKILL_ID)!.resource = 'gold'
    state.affixSkills.get(SKILL_ID)!.v2Ids = ['charge']
    equipAffixV2(SKILL_ID, KEY, 'charge')

    state.gold = 0
    state.player.gold = 0
    state.resources.gold = 0

    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'gold', false, 0)
    // gold Lv1 base = 3, charge ratio = 0.083 → cumBase = 0.249, output = 3.249
    expect(state.resources.gold).toBeCloseTo(3.249, 2)
    expect(state.gold).toBeCloseTo(state.resources.gold, 4)
    expect(state.player.gold).toBeCloseTo(state.resources.gold, 4)
  })

  it('time 资源同步写入 state.time（受 timeMax 上限）', () => {
    state.affixSkills.get(SKILL_ID)!.resource = 'time'
    state.affixSkills.get(SKILL_ID)!.v2Ids = ['charge']
    equipAffixV2(SKILL_ID, KEY, 'charge')

    state.timeMax = 30
    state.time = 10   // proxy: 这一行同时把 state.resources.time 设到 10

    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'time', false, 0)
    // time Lv1 base = 0.2, charge ratio = 0.083 → cumBase = 0.0166, output = 0.2166
    // state.resources.time = state.time（proxy），两者必须相等
    expect(state.time).toBeCloseTo(10 + 0.2166, 3)
    expect(state.resources.time).toBeCloseTo(state.time, 4)
  })

  it('shield 资源走 proxy（state.shield ↔ state.resources.shield 自动同步）', () => {
    state.affixSkills.get(SKILL_ID)!.resource = 'shield'
    state.affixSkills.get(SKILL_ID)!.v2Ids = ['charge']
    equipAffixV2(SKILL_ID, KEY, 'charge')

    state.shield = 0
    onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'shield', false, 0)
    // shield Lv1 base = 0.2（BASE_VALUES 精确表）, charge ratio = 0.083 → cumBase = 0.0166, output = 0.2166
    expect(state.shield).toBeCloseTo(0.2166, 3)
    expect(state.resources.shield).toBeCloseTo(state.shield, 4)
  })
})

describe('convert_resource 端到端 · 消耗扣资源 + 派发 on_resource_consumed 反应链', () => {
  it('反刍消耗 shield、产出 gold；on_resource_consumed 反应词条随之产出 time', () => {
    // 宿主资源 = score（故 convert 排除 score；消耗 shield、产出 gold）
    state.affixSkills.get(SKILL_ID)!.resource = 'score'
    state.affixSkills.get(SKILL_ID)!.v2Ids = ['test_regurg']

    registerDynamicAffixV2({
      id: 'test_regurg',
      name_zh: '反刍', name_en: 'regurgitate',
      section: 'maintenance', tags: ['maintenance'], phase: 'P1',
      trigger: { type: 'on_self_fire' },
      effect: { kind: 'convert_resource', from: 'shield', to: 'gold', ratio: 1 },
    })
    registerDynamicAffixV2({
      id: 'test_consumed_reactor',
      name_zh: '反应', name_en: 'reactor',
      section: 'maintenance', tags: ['maintenance'], phase: 'P1',
      trigger: { type: 'on_resource_consumed' },
      effect: { kind: 'gain_resource', resource: 'time', ratio: 1 },
    })
    try {
      equipAffixV2(SKILL_ID, KEY, 'test_regurg')
      // 反应词条挂在另一技能上（也进 _equipped → 会被 hookOnResourceConsumed 找到）
      equipAffixV2('skill_react', 'j', 'test_consumed_reactor')

      const r = state.resources as unknown as Record<string, number>
      state.shield = 10        // 可消耗资源（proxy → resources.shield）
      state.time = 10          // 反应产出落点
      state.timeMax = 30
      state.gold = 0; state.player.gold = 0; r.gold = 0
      state.score = 0; r.score = 0

      onSkillFireV2(SKILL_ID, SKILL_ID, KEY, 'score', false, 0)

      // 消耗：shield -= 1 × Lv1[shield]=0.2（BASE_VALUES 精确表）→ 10 - 0.2 = 9.8
      expect(state.shield).toBeCloseTo(9.8, 3)
      // 产出：gold += 1 × Lv1[gold]=3 → 3（1 Lv1-单位 shield 换 1 Lv1-单位 gold，系统口径下等值）
      expect(r.gold).toBeCloseTo(3, 3)
      // 反应链：消耗 shield → on_resource_consumed 反应词条产出 time += 1 × Lv1[time]=0.2 → 10.2
      expect(state.time).toBeCloseTo(10.2, 3)
      // 宿主自身基础产出（score）不受影响：11 × 1 = 11
      expect(r.score).toBeCloseTo(11, 2)
    } finally {
      unregisterDynamicAffixV2('test_regurg')
      unregisterDynamicAffixV2('test_consumed_reactor')
      clearAllEquipped()
    }
  })
})
