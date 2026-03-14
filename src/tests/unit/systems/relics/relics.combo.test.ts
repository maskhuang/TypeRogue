// ============================================
// 打字肉鸽 - 连击/倍率系统遗物行为测试 (Story 36.3)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  calculateComboBuffer,
  getMultiplierPrismBonus,
  checkRhythmDoctor,
  syncRhythmDoctorMilestone,
  checkComboDetonator,
  resetComboDetonator,
  hasImmortalCombo,
  shouldBlockMultiplierResource,
  resetComboRelicState,
  initComboRelicBehaviors,
} from '../../../../src/systems/relics/ComboRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'

// === 辅助：清理遗物 + 状态 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

describe('连击/倍率系统遗物行为 (Story 36.3)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
  })

  // =====================
  // AC1: 连击缓冲
  // =====================
  describe('连击缓冲 (combo_buffer)', () => {
    it('未持有 → 返回 0', () => {
      expect(calculateComboBuffer(20)).toBe(0)
    })

    it('combo=10 → 保留 5', () => {
      state.player.relics.add('combo_buffer')
      expect(calculateComboBuffer(10)).toBe(5)
    })

    it('combo=15 → 保留 7 (floor)', () => {
      state.player.relics.add('combo_buffer')
      expect(calculateComboBuffer(15)).toBe(7)
    })

    it('combo=0 → 保留 0', () => {
      state.player.relics.add('combo_buffer')
      expect(calculateComboBuffer(0)).toBe(0)
    })

    it('combo=1 → 保留 0 (floor)', () => {
      state.player.relics.add('combo_buffer')
      expect(calculateComboBuffer(1)).toBe(0)
    })

    it('combo=100 → 保留 50', () => {
      state.player.relics.add('combo_buffer')
      expect(calculateComboBuffer(100)).toBe(50)
    })
  })

  // =====================
  // AC2: 倍率棱镜
  // =====================
  describe('倍率棱镜 (multiplier_prism)', () => {
    it('未持有 → 返回 0', () => {
      state.multiplier = 3.0
      expect(getMultiplierPrismBonus()).toBe(0)
    })

    it('持有但 multiplier < 2.5 → 返回 0', () => {
      state.player.relics.add('multiplier_prism')
      state.multiplier = 2.0
      expect(getMultiplierPrismBonus()).toBe(0)
    })

    it('持有且 multiplier = 2.5 → 返回 0.2', () => {
      state.player.relics.add('multiplier_prism')
      state.multiplier = 2.5
      expect(getMultiplierPrismBonus()).toBe(0.2)
    })

    it('持有且 multiplier > 2.5 → 返回 0.2', () => {
      state.player.relics.add('multiplier_prism')
      state.multiplier = 5.0
      expect(getMultiplierPrismBonus()).toBe(0.2)
    })

    it('multiplier 刚好 2.49 → 不触发', () => {
      state.player.relics.add('multiplier_prism')
      state.multiplier = 2.49
      expect(getMultiplierPrismBonus()).toBe(0)
    })
  })

  // =====================
  // AC3: 节奏医生
  // =====================
  describe('节奏医生 (rhythm_doctor)', () => {
    beforeEach(() => {
      state.player.relics.add('rhythm_doctor')
    })

    it('未持有 → 返回 0', () => {
      state.player.relics.delete('rhythm_doctor')
      expect(checkRhythmDoctor(10)).toBe(0)
    })

    it('combo 达到 10 → +1s', () => {
      expect(checkRhythmDoctor(10)).toBe(1)
    })

    it('combo 9 → 不触发', () => {
      expect(checkRhythmDoctor(9)).toBe(0)
    })

    it('combo 10 后再到 20 → 再次 +1s', () => {
      checkRhythmDoctor(10)
      expect(checkRhythmDoctor(15)).toBe(0)
      expect(checkRhythmDoctor(20)).toBe(1)
    })

    it('combo 跳跃直接到 10 → 触发', () => {
      expect(checkRhythmDoctor(10)).toBe(1)
    })

    it('milestone 同步：combo 中断到 5 后重新计算', () => {
      checkRhythmDoctor(10)
      syncRhythmDoctorMilestone(5)
      // milestone 被同步为 0（floor(5/10)*10 = 0）
      // 下一个 milestone 是 10
      expect(checkRhythmDoctor(10)).toBe(1)
    })

    it('milestone 同步：combo 缓冲到 12 后保持 milestone=10', () => {
      checkRhythmDoctor(10)
      checkRhythmDoctor(20)
      syncRhythmDoctorMilestone(12)
      // milestone 被同步为 10（floor(12/10)*10 = 10）
      // 下一个 milestone 是 20
      expect(checkRhythmDoctor(15)).toBe(0)
      expect(checkRhythmDoctor(20)).toBe(1)
    })
  })

  // =====================
  // AC4: 连击引爆
  // =====================
  describe('连击引爆 (combo_detonator)', () => {
    beforeEach(() => {
      state.player.relics.add('combo_detonator')
    })

    it('未持有 → 返回 0', () => {
      state.player.relics.delete('combo_detonator')
      expect(checkComboDetonator(15)).toBe(0)
    })

    it('combo 达到 15 → 触发 3 技能', () => {
      expect(checkComboDetonator(15)).toBe(3)
    })

    it('combo 14 → 不触发', () => {
      expect(checkComboDetonator(14)).toBe(0)
    })

    it('combo 达到 30 → 再次触发 3', () => {
      checkComboDetonator(15)
      expect(checkComboDetonator(25)).toBe(0)
      expect(checkComboDetonator(30)).toBe(3)
    })

    it('combo 达到 45 → 第三次触发', () => {
      checkComboDetonator(15)
      checkComboDetonator(30)
      expect(checkComboDetonator(45)).toBe(3)
    })

    it('45 之后不再触发', () => {
      checkComboDetonator(15)
      checkComboDetonator(30)
      checkComboDetonator(45)
      expect(checkComboDetonator(60)).toBe(0)
    })

    it('同一阈值不重复触发', () => {
      checkComboDetonator(15)
      expect(checkComboDetonator(15)).toBe(0)
    })

    it('重置后可重新触发', () => {
      checkComboDetonator(15)
      resetComboDetonator()
      expect(checkComboDetonator(15)).toBe(3)
    })
  })

  // =====================
  // AC5: 不灭连击
  // =====================
  describe('不灭连击 (immortal_combo)', () => {
    it('未持有 → false', () => {
      expect(hasImmortalCombo()).toBe(false)
    })

    it('持有 → true', () => {
      state.player.relics.add('immortal_combo')
      expect(hasImmortalCombo()).toBe(true)
    })

    it('未持有 → multiplier 资源不阻止', () => {
      expect(shouldBlockMultiplierResource()).toBe(false)
    })

    it('持有 → multiplier 资源被阻止', () => {
      state.player.relics.add('immortal_combo')
      expect(shouldBlockMultiplierResource()).toBe(true)
    })
  })

  // =====================
  // AC6: 关级别重置
  // =====================
  describe('resetComboRelicState', () => {
    it('重置 combo_detonator 阈值', () => {
      state.player.relics.add('combo_detonator')
      checkComboDetonator(15)
      resetComboRelicState()
      expect(checkComboDetonator(15)).toBe(3)
    })

    it('重置 rhythm_doctor milestone（无 immortal_combo）', () => {
      state.player.relics.add('rhythm_doctor')
      checkRhythmDoctor(10)
      resetComboRelicState()
      // milestone 重置为 0，combo 到 10 可以再次触发
      expect(checkRhythmDoctor(10)).toBe(1)
    })

    it('有 immortal_combo 时不重置 rhythm_doctor milestone', () => {
      state.player.relics.add('rhythm_doctor')
      state.player.relics.add('immortal_combo')
      checkRhythmDoctor(10)
      checkRhythmDoctor(20)
      resetComboRelicState()
      // milestone 保持在 20，下一个是 30
      expect(checkRhythmDoctor(25)).toBe(0)
      expect(checkRhythmDoctor(30)).toBe(1)
    })
  })

  // =====================
  // 行为注册
  // =====================
  describe('initComboRelicBehaviors', () => {
    it('注册 combo_detonator 和 immortal_combo 行为', () => {
      initComboRelicBehaviors()
      const registered = getRegisteredBehaviors()
      expect(registered).toContain('combo_detonator')
      expect(registered).toContain('immortal_combo')
    })
  })

  // =====================
  // 交互测试 (Review L2)
  // =====================
  describe('遗物交互', () => {
    it('immortal_combo + combo_buffer：打错时 buffer 生效，跨关不重置', () => {
      state.player.relics.add('combo_buffer')
      state.player.relics.add('immortal_combo')
      // 打错时 combo 仍会中断，buffer 保留 50%
      expect(calculateComboBuffer(20)).toBe(10)
      // immortal_combo 只影响跨关不重置
      expect(hasImmortalCombo()).toBe(true)
    })

    it('multiplier_prism + immortal_combo：棱镜加成仍生效', () => {
      state.player.relics.add('multiplier_prism')
      state.player.relics.add('immortal_combo')
      state.multiplier = 3.0
      // 棱镜仍提供 +20%（独立于 multiplier 资源阻止）
      expect(getMultiplierPrismBonus()).toBe(0.2)
      // multiplier 资源被阻止
      expect(shouldBlockMultiplierResource()).toBe(true)
    })

    it('combo_buffer + rhythm_doctor：缓冲后 milestone 正确同步', () => {
      state.player.relics.add('combo_buffer')
      state.player.relics.add('rhythm_doctor')
      // combo 到 25，触发 milestone 10 和 20
      checkRhythmDoctor(10)
      checkRhythmDoctor(20)
      // combo 中断，buffer 保留 floor(25 * 0.5) = 12
      const buffered = calculateComboBuffer(25)
      expect(buffered).toBe(12)
      syncRhythmDoctorMilestone(buffered)
      // milestone 同步为 10（floor(12/10)*10），下一个 milestone 是 20
      expect(checkRhythmDoctor(15)).toBe(0)
      expect(checkRhythmDoctor(20)).toBe(1)
    })
  })
})
