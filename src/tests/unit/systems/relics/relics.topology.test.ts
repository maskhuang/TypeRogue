// ============================================
// 打字肉鸽 - 键盘拓扑遗物行为测试 (Story 36.6)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  ADJACENT_POWER_RATE,
  SYMMETRY_PACT_RATE,
  ROW_MEDAL_RATE,
  DUAL_CONCERTO_TIME,
  KEY_STORM_SCORE_PENALTY,
  getAdjacentPowerBonus,
  getSymmetryPactBonus,
  setRowMedalRow,
  getRowMedalBonus,
  checkDualConcerto,
  resetDualConcertoHand,
  hasKeyStorm,
  checkKeyStorm,
  resetTopologyRelicState,
  initTopologyRelicBehaviors,
} from '../../../../src/systems/relics/TopologyRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'

// === 辅助 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
  state.player.bindings.clear()
}

function bindKey(key: string, skillId: string): void {
  state.player.bindings.set(key, skillId)
}

describe('键盘拓扑遗物行为 (Story 36.6)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
    resetTopologyRelicState()
  })

  // === 常量校验 ===
  describe('常量', () => {
    it('ADJACENT_POWER_RATE = 0.06', () => {
      expect(ADJACENT_POWER_RATE).toBe(0.06)
    })
    it('SYMMETRY_PACT_RATE = 0.15', () => {
      expect(SYMMETRY_PACT_RATE).toBe(0.15)
    })
    it('ROW_MEDAL_RATE = 0.25', () => {
      expect(ROW_MEDAL_RATE).toBe(0.25)
    })
    it('DUAL_CONCERTO_TIME = 0.5', () => {
      expect(DUAL_CONCERTO_TIME).toBe(0.5)
    })
    it('KEY_STORM_SCORE_PENALTY = 0.5', () => {
      expect(KEY_STORM_SCORE_PENALTY).toBe(0.5)
    })
  })

  // === 邻键之力 (adjacent_power) ===
  describe('邻键之力 (adjacent_power)', () => {
    it('无遗物 → 0', () => {
      bindKey('f', 'skill_f')
      expect(getAdjacentPowerBonus('f')).toBe(0)
    })

    it('有遗物但无相邻装备 → 0', () => {
      state.player.relics.add('adjacent_power')
      bindKey('q', 'skill_q')
      // q 的相邻是 w, a — 都没装备
      expect(getAdjacentPowerBonus('q')).toBe(0)
    })

    it('1个相邻装备 → 0.06', () => {
      state.player.relics.add('adjacent_power')
      bindKey('f', 'skill_f')
      bindKey('d', 'skill_d') // d 是 f 的相邻
      expect(getAdjacentPowerBonus('f')).toBeCloseTo(ADJACENT_POWER_RATE)
    })

    it('3个相邻装备 → 0.18', () => {
      state.player.relics.add('adjacent_power')
      bindKey('f', 'skill_f')
      bindKey('d', 'skill_d')
      bindKey('r', 'skill_r')
      bindKey('g', 'skill_g')
      expect(getAdjacentPowerBonus('f')).toBeCloseTo(3 * ADJACENT_POWER_RATE)
    })

    it('非相邻键不计入', () => {
      state.player.relics.add('adjacent_power')
      bindKey('q', 'skill_q')
      bindKey('p', 'skill_p') // p 不是 q 的相邻
      expect(getAdjacentPowerBonus('q')).toBe(0)
    })
  })

  // === 对称契约 (symmetry_pact) ===
  describe('对称契约 (symmetry_pact)', () => {
    it('无遗物 → 0', () => {
      bindKey('q', 'skill_q')
      bindKey('p', 'skill_p')
      expect(getSymmetryPactBonus('q')).toBe(0)
    })

    it('有遗物 + 对称位有装备 → 0.15', () => {
      state.player.relics.add('symmetry_pact')
      bindKey('q', 'skill_q')
      bindKey('p', 'skill_p') // q↔p 对称
      expect(getSymmetryPactBonus('q')).toBe(SYMMETRY_PACT_RATE)
    })

    it('有遗物 + 对称位无装备 → 0', () => {
      state.player.relics.add('symmetry_pact')
      bindKey('q', 'skill_q')
      // p 未装备
      expect(getSymmetryPactBonus('q')).toBe(0)
    })

    it('双向对称：q→p 和 p→q 都生效', () => {
      state.player.relics.add('symmetry_pact')
      bindKey('q', 'skill_q')
      bindKey('p', 'skill_p')
      expect(getSymmetryPactBonus('q')).toBe(SYMMETRY_PACT_RATE)
      expect(getSymmetryPactBonus('p')).toBe(SYMMETRY_PACT_RATE)
    })

    it('无对称位的键(a,z,x,c) → 0 (AC2)', () => {
      state.player.relics.add('symmetry_pact')
      bindKey('a', 'skill_a')
      bindKey('z', 'skill_z')
      bindKey('x', 'skill_x')
      bindKey('c', 'skill_c')
      expect(getSymmetryPactBonus('a')).toBe(0)
      expect(getSymmetryPactBonus('z')).toBe(0)
      expect(getSymmetryPactBonus('x')).toBe(0)
      expect(getSymmetryPactBonus('c')).toBe(0)
    })
  })

  // === 行会勋章 (row_medal) ===
  describe('行会勋章 (row_medal)', () => {
    it('无遗物 → 0', () => {
      expect(getRowMedalBonus('f')).toBe(0)
    })

    it('有遗物但未选择行 → 0', () => {
      state.player.relics.add('row_medal')
      expect(getRowMedalBonus('f')).toBe(0)
    })

    it('选择上行(0) + 上行键触发 → 0.25', () => {
      state.player.relics.add('row_medal')
      setRowMedalRow(0)
      expect(getRowMedalBonus('q')).toBe(ROW_MEDAL_RATE) // q 在上行
      expect(getRowMedalBonus('w')).toBe(ROW_MEDAL_RATE)
      expect(getRowMedalBonus('p')).toBe(ROW_MEDAL_RATE)
    })

    it('选择上行(0) + 中行键触发 → 0', () => {
      state.player.relics.add('row_medal')
      setRowMedalRow(0)
      expect(getRowMedalBonus('a')).toBe(0) // a 在中行
      expect(getRowMedalBonus('f')).toBe(0)
    })

    it('选择中行(1) + 中行键触发 → 0.25', () => {
      state.player.relics.add('row_medal')
      setRowMedalRow(1)
      expect(getRowMedalBonus('a')).toBe(ROW_MEDAL_RATE)
      expect(getRowMedalBonus('f')).toBe(ROW_MEDAL_RATE)
      expect(getRowMedalBonus('l')).toBe(ROW_MEDAL_RATE)
    })

    it('选择下行(2) + 下行键触发 → 0.25', () => {
      state.player.relics.add('row_medal')
      setRowMedalRow(2)
      expect(getRowMedalBonus('z')).toBe(ROW_MEDAL_RATE)
      expect(getRowMedalBonus('m')).toBe(ROW_MEDAL_RATE)
    })

    it('setRowMedalRow 存储到 relicStates', () => {
      setRowMedalRow(1)
      expect(state.player.relicStates['row_medal']).toBe(1)
    })
  })

  // === 双手协奏 (dual_concerto) ===
  describe('双手协奏 (dual_concerto)', () => {
    it('无遗物 → 0', () => {
      expect(checkDualConcerto('f')).toBe(0)
    })

    it('首次按键 → 0（无前手记录）', () => {
      state.player.relics.add('dual_concerto')
      expect(checkDualConcerto('f')).toBe(0) // f 是左手，首次
    })

    it('同手连续按键 → 0', () => {
      state.player.relics.add('dual_concerto')
      checkDualConcerto('f') // 左手
      expect(checkDualConcerto('d')).toBe(0) // 左手 → 左手
    })

    it('换手 → 0.5', () => {
      state.player.relics.add('dual_concerto')
      checkDualConcerto('f') // 左手
      expect(checkDualConcerto('j')).toBe(DUAL_CONCERTO_TIME) // 右手
    })

    it('连续换手连续触发', () => {
      state.player.relics.add('dual_concerto')
      checkDualConcerto('f')  // 左手, 首次 → 0
      expect(checkDualConcerto('j')).toBe(DUAL_CONCERTO_TIME)  // 右→左
      expect(checkDualConcerto('d')).toBe(DUAL_CONCERTO_TIME)  // j(right) → d(left) = 切换
      expect(checkDualConcerto('k')).toBe(DUAL_CONCERTO_TIME) // right again
    })

    it('resetDualConcertoHand 重置追踪', () => {
      state.player.relics.add('dual_concerto')
      checkDualConcerto('f') // 左手
      resetDualConcertoHand()
      expect(checkDualConcerto('j')).toBe(0) // 重置后首次 → 0
    })

    it('边界键判定：T/G/B→left，Y/H/N→right (AC7)', () => {
      state.player.relics.add('dual_concerto')
      // T→left, then Y→right: should switch
      checkDualConcerto('t') // left
      expect(checkDualConcerto('y')).toBe(DUAL_CONCERTO_TIME) // right → switch
      resetDualConcertoHand()
      // G→left, then H→right
      checkDualConcerto('g') // left
      expect(checkDualConcerto('h')).toBe(DUAL_CONCERTO_TIME)
      resetDualConcertoHand()
      // B→left, then N→right
      checkDualConcerto('b') // left
      expect(checkDualConcerto('n')).toBe(DUAL_CONCERTO_TIME)
      resetDualConcertoHand()
      // Same side should be 0: T→G (both left)
      checkDualConcerto('t')
      expect(checkDualConcerto('g')).toBe(0)
      resetDualConcertoHand()
      // Y→H (both right)
      checkDualConcerto('y')
      expect(checkDualConcerto('h')).toBe(0)
    })
  })

  // === 全键风暴 (key_storm) ===
  describe('全键风暴 (key_storm)', () => {
    const mockRandom = () => 0.5

    it('无遗物 → 空数组', () => {
      bindKey('a', 's1')
      expect(checkKeyStorm(1, 'b', mockRandom)).toEqual([])
    })

    it('hasKeyStorm 正确判断', () => {
      expect(hasKeyStorm()).toBe(false)
      state.player.relics.add('key_storm')
      expect(hasKeyStorm()).toBe(true)
    })

    it('KEY_STORM_SCORE_PENALTY 为 0.5', () => {
      expect(KEY_STORM_SCORE_PENALTY).toBe(0.5)
    })

    it('hitCount=0 → 空数组', () => {
      state.player.relics.add('key_storm')
      bindKey('a', 's1')
      bindKey('b', 's2')
      expect(checkKeyStorm(0, 'x', mockRandom)).toEqual([])
    })

    it('每命中1个技能触发1个未命中技能', () => {
      state.player.relics.add('key_storm')
      bindKey('a', 's1')
      bindKey('b', 's2')
      bindKey('c', 's3')
      // word = 'a'，命中1个 → 触发1个未命中
      const targets = checkKeyStorm(1, 'a', mockRandom)
      expect(targets).toHaveLength(1)
      expect(['b', 'c']).toContain(targets[0].key)
    })

    it('hitCount=2 → 触发2个未命中技能', () => {
      state.player.relics.add('key_storm')
      bindKey('a', 's1')
      bindKey('b', 's2')
      bindKey('c', 's3')
      bindKey('d', 's4')
      // word = 'ab'，命中2个 → 触发2个未命中(c,d)
      const targets = checkKeyStorm(2, 'ab', mockRandom)
      expect(targets).toHaveLength(2)
      expect(targets.map(t => t.key).sort()).toEqual(['c', 'd'])
    })

    it('hitCount > 未命中数 → 最多返回未命中数', () => {
      state.player.relics.add('key_storm')
      bindKey('a', 's1')
      bindKey('b', 's2')
      bindKey('c', 's3')
      // word = 'ab'，命中5 → 只有1个未命中(c)
      const targets = checkKeyStorm(5, 'ab', mockRandom)
      expect(targets).toHaveLength(1)
      expect(targets[0].key).toBe('c')
    })

    it('所有键都在单词中 → 空数组', () => {
      state.player.relics.add('key_storm')
      bindKey('a', 's1')
      bindKey('b', 's2')
      const targets = checkKeyStorm(2, 'ab', mockRandom)
      expect(targets).toEqual([])
    })
  })

  // === 模块重置 ===
  describe('resetTopologyRelicState', () => {
    it('重置双手协奏状态', () => {
      state.player.relics.add('dual_concerto')
      checkDualConcerto('f')

      resetTopologyRelicState()

      // 双手协奏：重置后首次 → 0
      expect(checkDualConcerto('j')).toBe(0)
    })
  })

  // === 行为注册 ===
  describe('initTopologyRelicBehaviors', () => {
    it('注册 row_select, hand_alternation, key_storm 行为', () => {
      initTopologyRelicBehaviors()
      const handlers = getRegisteredBehaviors()
      expect(handlers).toContain('row_select')
      expect(handlers).toContain('hand_alternation')
      expect(handlers).toContain('key_storm')
    })
  })

  // === 遗物组合交互 ===
  describe('遗物组合交互', () => {
    it('邻键之力 + 对称契约 可叠加', () => {
      state.player.relics.add('adjacent_power')
      state.player.relics.add('symmetry_pact')
      // q↔p 对称，q 相邻 w,a
      bindKey('q', 'skill_q')
      bindKey('p', 'skill_p')
      bindKey('w', 'skill_w')

      const adj = getAdjacentPowerBonus('q')
      const sym = getSymmetryPactBonus('q')
      expect(adj).toBeCloseTo(ADJACENT_POWER_RATE) // 1 neighbor (w)
      expect(sym).toBe(SYMMETRY_PACT_RATE) // p is symmetric
      expect(adj + sym).toBeCloseTo(ADJACENT_POWER_RATE + SYMMETRY_PACT_RATE)
    })

    it('行会勋章 + 邻键之力 可叠加', () => {
      state.player.relics.add('row_medal')
      state.player.relics.add('adjacent_power')
      setRowMedalRow(1) // 中行
      bindKey('f', 'skill_f')
      bindKey('d', 'skill_d')
      bindKey('g', 'skill_g')

      const row = getRowMedalBonus('f')
      const adj = getAdjacentPowerBonus('f')
      expect(row).toBe(ROW_MEDAL_RATE)
      expect(adj).toBeCloseTo(2 * ADJACENT_POWER_RATE) // d,g both adjacent
    })
  })
})
