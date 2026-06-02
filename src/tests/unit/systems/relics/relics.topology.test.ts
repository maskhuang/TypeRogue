// ============================================
// 打字肉鸽 - 键盘拓扑遗物行为测试 (Story 36.6)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  ADJACENT_POWER_RATE,
  CORNER_POWER_RATE,
  DUAL_CONCERTO_TIME,
  ROW_SWITCH_GOLD,
  KEY_STORM_SCORE_PENALTY,
  getAdjacentPowerBonus,
  getCornerPowerBonus,
  checkRowSwitch,
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
    it('CORNER_POWER_RATE = 0.20', () => {
      expect(CORNER_POWER_RATE).toBe(0.20)
    })
    it('DUAL_CONCERTO_TIME = 0.5', () => {
      expect(DUAL_CONCERTO_TIME).toBe(0.5)
    })
    it('ROW_SWITCH_GOLD = 1', () => {
      expect(ROW_SWITCH_GOLD).toBe(1)
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

  // === 角隅之力 (corner_power) ===
  describe('角隅之力 (corner_power)', () => {
    it('无遗物 → 0', () => {
      expect(getCornerPowerBonus('q')).toBe(0)
    })

    it('有遗物 + 角落键(Q) → 0.20', () => {
      state.player.relics.add('corner_power')
      expect(getCornerPowerBonus('q')).toBe(CORNER_POWER_RATE)
    })

    it('有遗物 + 角落键(P) → 0.20', () => {
      state.player.relics.add('corner_power')
      expect(getCornerPowerBonus('p')).toBe(CORNER_POWER_RATE)
    })

    it('有遗物 + 角落键(Z) → 0.20', () => {
      state.player.relics.add('corner_power')
      expect(getCornerPowerBonus('z')).toBe(CORNER_POWER_RATE)
    })

    it('有遗物 + 角落键(M) → 0.20', () => {
      state.player.relics.add('corner_power')
      expect(getCornerPowerBonus('m')).toBe(CORNER_POWER_RATE)
    })

    it('有遗物 + 非角落键(F) → 0', () => {
      state.player.relics.add('corner_power')
      expect(getCornerPowerBonus('f')).toBe(0)
    })

    it('有遗物 + 非角落键(A) → 0', () => {
      state.player.relics.add('corner_power')
      expect(getCornerPowerBonus('a')).toBe(0)
    })
  })

  // === 换行奖励 (row_switch) ===
  describe('换行奖励 (row_switch)', () => {
    it('无遗物 → 0', () => {
      expect(checkRowSwitch('f')).toBe(0)
    })

    it('首次按键 → 0（无前行记录）', () => {
      state.player.relics.add('row_switch')
      expect(checkRowSwitch('f')).toBe(0)
    })

    it('同行连续按键 → 0', () => {
      state.player.relics.add('row_switch')
      checkRowSwitch('f') // 中行
      expect(checkRowSwitch('d')).toBe(0) // 中行 → 中行
    })

    it('跨行 → 1 金币', () => {
      state.player.relics.add('row_switch')
      checkRowSwitch('f') // 中行 (row 1)
      expect(checkRowSwitch('q')).toBe(ROW_SWITCH_GOLD) // 上行 (row 0)
    })

    it('连续跨行连续触发', () => {
      state.player.relics.add('row_switch')
      checkRowSwitch('f')  // 中行, 首次 → 0
      expect(checkRowSwitch('q')).toBe(ROW_SWITCH_GOLD)  // 中→上
      expect(checkRowSwitch('z')).toBe(ROW_SWITCH_GOLD)  // 上→下
      expect(checkRowSwitch('a')).toBe(ROW_SWITCH_GOLD)  // 下→中
    })

    it('无遗物时也更新行号状态', () => {
      // 先不加遗物，按一个键更新行号
      checkRowSwitch('q') // 上行
      // 加遗物后，从上行切到中行应触发
      state.player.relics.add('row_switch')
      expect(checkRowSwitch('f')).toBe(ROW_SWITCH_GOLD)
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

    it('重置换行奖励行号', () => {
      state.player.relics.add('row_switch')
      checkRowSwitch('f') // 中行

      resetTopologyRelicState()

      // 重置后首次按键 → 0（无前行记录）
      expect(checkRowSwitch('q')).toBe(0)
    })
  })

  // === 行为注册 ===
  describe('initTopologyRelicBehaviors', () => {
    it('注册 hand_alternation, key_storm 行为', () => {
      initTopologyRelicBehaviors()
      const handlers = getRegisteredBehaviors()
      expect(handlers).toContain('hand_alternation')
      expect(handlers).toContain('key_storm')
    })
  })

  // === 遗物组合交互 ===
  describe('遗物组合交互', () => {
    it('邻键之力 + 角隅之力 可叠加', () => {
      state.player.relics.add('adjacent_power')
      state.player.relics.add('corner_power')
      // q 是角落键，q 相邻 w
      bindKey('q', 'skill_q')
      bindKey('w', 'skill_w')

      const adj = getAdjacentPowerBonus('q')
      const corner = getCornerPowerBonus('q')
      expect(adj).toBeCloseTo(ADJACENT_POWER_RATE) // 1 neighbor (w)
      expect(corner).toBe(CORNER_POWER_RATE) // q is corner
      expect(adj + corner).toBeCloseTo(ADJACENT_POWER_RATE + CORNER_POWER_RATE)
    })

    it('换行奖励 + 双手协奏 同时触发', () => {
      state.player.relics.add('row_switch')
      state.player.relics.add('dual_concerto')
      // f(中行,左手) → j(中行,右手): 双手协奏触发，换行不触发
      checkRowSwitch('f')
      checkDualConcerto('f')
      expect(checkRowSwitch('j')).toBe(0) // 同行
      expect(checkDualConcerto('j')).toBe(DUAL_CONCERTO_TIME) // 换手

      // j(中行,右手) → q(上行,左手): 两者都触发
      expect(checkRowSwitch('q')).toBe(ROW_SWITCH_GOLD) // 跨行
      expect(checkDualConcerto('q')).toBe(DUAL_CONCERTO_TIME) // 换手
    })
  })
})
