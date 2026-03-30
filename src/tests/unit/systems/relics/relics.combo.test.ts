// ============================================
// 打字肉鸽 - 连击/倍率系统遗物行为测试 (Story 36.3)
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  checkEchoThimble,
  calculateComboBuffer,
  getMultiplierPrismBonus,
  checkComboDetonator,
  resetComboDetonator,
  onComboBreakDetonator,
  hasImmortalCombo,
  resetComboRelicState,
  initComboRelicBehaviors,
  onNewWordForCancel,
  checkCancelOnFirstLetter,
  getCancelChainBonus,
  getCancelChainCount,
  onCancelledWordComplete,
  onCancelledWordError,
  isWordCancelled,
  resetCancelChainState,
} from '../../../../src/systems/relics/ComboRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'

// === 辅助：清理遗物 + 状态 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
  resetCancelChainState()
}

describe('连击/倍率系统遗物行为 (Story 36.3)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
  })

  // =====================
  // AC0: 回声指套（从 typing 迁入）
  // =====================
  describe('回声指套 (echo_thimble)', () => {
    beforeEach(() => {
      state.player.relics.add('echo_thimble')
    })

    it('随机值 < 0.08 触发双重击键', () => {
      expect(checkEchoThimble(0.05)).toBe(true)
    })

    it('随机值 >= 0.08 不触发', () => {
      expect(checkEchoThimble(0.08)).toBe(false)
      expect(checkEchoThimble(0.5)).toBe(false)
    })

    it('随机值 = 0 触发', () => {
      expect(checkEchoThimble(0)).toBe(true)
    })

    it('边界值 0.079 触发', () => {
      expect(checkEchoThimble(0.079)).toBe(true)
    })

    it('未持有指套时不触发', () => {
      state.player.relics.delete('echo_thimble')
      expect(checkEchoThimble(0.01)).toBe(false)
    })
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
  // AC3: 连击引爆（稀有，combo 达 15 触发一次，归零后可再次触发）
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

    it('触发后继续升 combo 不再触发', () => {
      checkComboDetonator(15)
      expect(checkComboDetonator(20)).toBe(0)
      expect(checkComboDetonator(30)).toBe(0)
      expect(checkComboDetonator(100)).toBe(0)
    })

    it('同一阈值不重复触发', () => {
      checkComboDetonator(15)
      expect(checkComboDetonator(15)).toBe(0)
    })

    it('combo 中断（onComboBreakDetonator）后可重新触发', () => {
      checkComboDetonator(15)
      onComboBreakDetonator()
      expect(checkComboDetonator(15)).toBe(3)
    })

    it('resetComboDetonator 也可重置', () => {
      checkComboDetonator(15)
      resetComboDetonator()
      expect(checkComboDetonator(15)).toBe(3)
    })
  })

  // =====================
  // AC4: 取消连锁（史诗，基于阅读硬直的取消机制）
  // =====================
  describe('取消连锁 (cancel)', () => {
    beforeEach(() => {
      state.player.relics.add('cancel')
    })

    it('未持有 → 无效果', () => {
      state.player.relics.delete('cancel')
      onNewWordForCancel()
      expect(checkCancelOnFirstLetter()).toBe(false)
      expect(getCancelChainBonus()).toBe(0)
    })

    it('在窗口内打对首字母 → 取消成功', () => {
      onNewWordForCancel()
      // performance.now() 在同一 tick 内，elapsed ≈ 0 < 400ms
      expect(checkCancelOnFirstLetter()).toBe(true)
      expect(isWordCancelled()).toBe(true)
    })

    it('首字母只判定一次', () => {
      onNewWordForCancel()
      expect(checkCancelOnFirstLetter()).toBe(true)
      expect(checkCancelOnFirstLetter()).toBe(false) // 第二次不再判定
    })

    it('取消词零失误完成 → 连锁+1', () => {
      onNewWordForCancel()
      checkCancelOnFirstLetter()
      onCancelledWordComplete() // wordPerfect 时调用
      expect(getCancelChainCount()).toBe(1)
    })

    it('连锁叠加至上限 5', () => {
      for (let i = 0; i < 7; i++) {
        onNewWordForCancel()
        checkCancelOnFirstLetter()
        onCancelledWordComplete()
      }
      expect(getCancelChainCount()).toBe(5)
    })

    it('getCancelChainBonus 返回 层数×0.10（仅取消词有效）', () => {
      // 先攒 3 层
      for (let i = 0; i < 3; i++) {
        onNewWordForCancel()
        checkCancelOnFirstLetter()
        onCancelledWordComplete()
      }
      expect(getCancelChainCount()).toBe(3)
      // 新词取消状态下才有加成
      onNewWordForCancel()
      checkCancelOnFirstLetter()
      expect(getCancelChainBonus()).toBeCloseTo(0.30)
    })

    it('非取消词无加成（即使有层数）', () => {
      // 攒 2 层
      for (let i = 0; i < 2; i++) {
        onNewWordForCancel()
        checkCancelOnFirstLetter()
        onCancelledWordComplete()
      }
      expect(getCancelChainCount()).toBe(2)
      // 这次不取消（不调 checkCancelOnFirstLetter）
      onNewWordForCancel()
      expect(getCancelChainBonus()).toBe(0) // 非取消词
      expect(getCancelChainCount()).toBe(2) // 层数不变
    })

    it('取消词打错 → 连锁归零 + 返回惩罚时间', () => {
      // 攒 3 层
      for (let i = 0; i < 3; i++) {
        onNewWordForCancel()
        checkCancelOnFirstLetter()
        onCancelledWordComplete()
      }
      // 新词取消
      onNewWordForCancel()
      checkCancelOnFirstLetter()
      // 打错
      const penalty = onCancelledWordError()
      expect(penalty).toBe(0.5)
      expect(getCancelChainCount()).toBe(0)
      expect(isWordCancelled()).toBe(false)
    })

    it('非取消词打错 → 无额外惩罚，连锁不变', () => {
      // 攒 2 层
      for (let i = 0; i < 2; i++) {
        onNewWordForCancel()
        checkCancelOnFirstLetter()
        onCancelledWordComplete()
      }
      // 不取消
      onNewWordForCancel()
      const penalty = onCancelledWordError()
      expect(penalty).toBe(0) // 非取消词无惩罚
      expect(getCancelChainCount()).toBe(2) // 层数不变
    })

    it('关级别重置清零所有状态', () => {
      for (let i = 0; i < 3; i++) {
        onNewWordForCancel()
        checkCancelOnFirstLetter()
        onCancelledWordComplete()
      }
      resetCancelChainState()
      expect(getCancelChainCount()).toBe(0)
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

    it('未持有 → hasImmortalCombo 返回 false', () => {
      expect(hasImmortalCombo()).toBe(false)
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

    it('重置 cancel 状态', () => {
      state.player.relics.add('cancel')
      onNewWordForCancel()
      checkCancelOnFirstLetter()
      onCancelledWordComplete()
      expect(getCancelChainCount()).toBe(1)
      resetComboRelicState()
      expect(getCancelChainCount()).toBe(0)
    })
  })

  // =====================
  // 行为注册
  // =====================
  describe('initComboRelicBehaviors', () => {
    it('注册 double_keystroke, combo_detonator, cancel 和 immortal_combo 行为', () => {
      initComboRelicBehaviors()
      const registered = getRegisteredBehaviors()
      expect(registered).toContain('double_keystroke')
      expect(registered).toContain('combo_detonator')
      expect(registered).toContain('cancel')
      expect(registered).toContain('immortal_combo')
    })
  })

  // =====================
  // 交互测试
  // =====================
  describe('遗物交互', () => {
    it('immortal_combo + combo_buffer：打错时 buffer 生效，跨关不重置', () => {
      state.player.relics.add('combo_buffer')
      state.player.relics.add('immortal_combo')
      expect(calculateComboBuffer(20)).toBe(10)
      expect(hasImmortalCombo()).toBe(true)
    })

    it('multiplier_prism + immortal_combo：棱镜加成仍生效', () => {
      state.player.relics.add('multiplier_prism')
      state.player.relics.add('immortal_combo')
      state.multiplier = 3.0
      expect(getMultiplierPrismBonus()).toBe(0.2)
      expect(hasImmortalCombo()).toBe(true)
    })

    it('cancel + combo_detonator：两者独立运作', () => {
      state.player.relics.add('cancel')
      state.player.relics.add('combo_detonator')
      // 取消连锁攒层
      onNewWordForCancel()
      checkCancelOnFirstLetter()
      onCancelledWordComplete()
      expect(getCancelChainCount()).toBe(1)
      // 连击引爆正常触发
      expect(checkComboDetonator(15)).toBe(3)
    })
  })
})
