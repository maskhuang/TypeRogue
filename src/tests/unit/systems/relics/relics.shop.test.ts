// ============================================
// 打字肉鸽 - 商店系统遗物行为测试 (Story 36.9)
// ============================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  DISCOUNT_RATE,
  RECYCLE_BONUS,
  BLACK_MARKET_EXTRA,
  AUCTION_TIMER,
  getDiscountMultiplier,
  getRecycleSellMultiplier,
  getBlackMarketExtraSlots,
  canSmuggleFree,
  consumeSmuggleFree,
  resetSmuggleFree,
  isTimedAuction,
  startAuctionTimer,
  clearAuctionTimer,
  resetShopRelicState,
  initShopRelicBehaviors,
} from '../../../../src/systems/relics/ShopRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'

// === 辅助 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

describe('商店系统遗物行为 (Story 36.9)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
    resetShopRelicState()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // === 常量校验 ===
  describe('常量', () => {
    it('DISCOUNT_RATE = 0.15', () => {
      expect(DISCOUNT_RATE).toBe(0.15)
    })
    it('RECYCLE_BONUS = 0.50', () => {
      expect(RECYCLE_BONUS).toBe(0.50)
    })
    it('BLACK_MARKET_EXTRA = 1', () => {
      expect(BLACK_MARKET_EXTRA).toBe(1)
    })
    it('AUCTION_TIMER = 30', () => {
      expect(AUCTION_TIMER).toBe(30)
    })
  })

  // === 折扣卡 (discount_card) ===
  describe('折扣卡 (discount_card)', () => {
    it('无遗物 → 1', () => {
      expect(getDiscountMultiplier()).toBe(1)
    })

    it('有遗物 → 0.85', () => {
      state.player.relics.add('discount_card')
      expect(getDiscountMultiplier()).toBe(0.85)
    })
  })

  // === 回收专家 (recycle_expert) ===
  describe('回收专家 (recycle_expert)', () => {
    it('无遗物 → 0.50', () => {
      expect(getRecycleSellMultiplier()).toBe(0.50)
    })

    it('有遗物 → 0.75', () => {
      state.player.relics.add('recycle_expert')
      expect(getRecycleSellMultiplier()).toBe(0.75)
    })
  })

  // === 黑市门票 (black_market) ===
  describe('黑市门票 (black_market)', () => {
    it('无遗物 → 0', () => {
      expect(getBlackMarketExtraSlots()).toBe(0)
    })

    it('有遗物 → 1', () => {
      state.player.relics.add('black_market')
      expect(getBlackMarketExtraSlots()).toBe(BLACK_MARKET_EXTRA)
    })
  })

  // === 走私通道 (smuggle_pass) ===
  describe('走私通道 (smuggle_pass)', () => {
    it('无遗物 → false', () => {
      expect(canSmuggleFree()).toBe(false)
    })

    it('有遗物 + 未使用 → true', () => {
      state.player.relics.add('smuggle_pass')
      expect(canSmuggleFree()).toBe(true)
    })

    it('使用后 → false', () => {
      state.player.relics.add('smuggle_pass')
      consumeSmuggleFree()
      expect(canSmuggleFree()).toBe(false)
    })

    it('重置后 → true', () => {
      state.player.relics.add('smuggle_pass')
      consumeSmuggleFree()
      expect(canSmuggleFree()).toBe(false)
      resetSmuggleFree()
      expect(canSmuggleFree()).toBe(true)
    })
  })

  // === 限时拍卖 (timed_auction) ===
  describe('限时拍卖 (timed_auction)', () => {
    it('无遗物 → false', () => {
      expect(isTimedAuction()).toBe(false)
    })

    it('有遗物 → true', () => {
      state.player.relics.add('timed_auction')
      expect(isTimedAuction()).toBe(true)
    })

    it('倒计时初始值 = AUCTION_TIMER', () => {
      const ticks: number[] = []
      startAuctionTimer(
        (r) => ticks.push(r),
        () => {},
      )
      expect(ticks[0]).toBe(AUCTION_TIMER)
      clearAuctionTimer()
    })

    it('每秒递减', () => {
      const ticks: number[] = []
      startAuctionTimer(
        (r) => ticks.push(r),
        () => {},
      )
      vi.advanceTimersByTime(3000)
      // 初始30 + 3 tick = [30, 29, 28, 27]
      expect(ticks).toEqual([30, 29, 28, 27])
      clearAuctionTimer()
    })

    it('到0时触发 onExpire', () => {
      let expired = false
      startAuctionTimer(
        () => {},
        () => { expired = true },
      )
      vi.advanceTimersByTime(AUCTION_TIMER * 1000)
      expect(expired).toBe(true)
    })

    it('clearAuctionTimer 停止倒计时', () => {
      const ticks: number[] = []
      startAuctionTimer(
        (r) => ticks.push(r),
        () => {},
      )
      vi.advanceTimersByTime(2000)
      clearAuctionTimer()
      vi.advanceTimersByTime(5000)
      // 初始30 + 2 tick = [30, 29, 28]，之后不再增加
      expect(ticks).toEqual([30, 29, 28])
    })
  })

  // === 生命周期 ===
  describe('生命周期', () => {
    it('resetShopRelicState 重置 smuggle + timer', () => {
      state.player.relics.add('smuggle_pass')
      consumeSmuggleFree()
      expect(canSmuggleFree()).toBe(false)
      const ticks: number[] = []
      startAuctionTimer(
        (r) => ticks.push(r),
        () => {},
      )
      resetShopRelicState()
      expect(canSmuggleFree()).toBe(true)
      // timer 被清理，不再触发
      vi.advanceTimersByTime(5000)
      expect(ticks).toEqual([30]) // 只有初始调用
    })

    it('initShopRelicBehaviors 注册行为', () => {
      initShopRelicBehaviors()
      const handlers = getRegisteredBehaviors()
      expect(handlers.length).toBeGreaterThanOrEqual(3)
    })
  })

  // === 折扣+附魔锚点交互 ===
  describe('折扣叠加', () => {
    it('折扣率独立返回，与附魔锚点叠加由调用方完成', () => {
      state.player.relics.add('discount_card')
      // 折扣卡返回 0.85
      const discount = getDiscountMultiplier()
      // 假设附魔锚点倍率 1.2（2个附魔）
      const enchantMult = 1.2
      const finalMult = enchantMult * discount
      expect(finalMult).toBeCloseTo(1.02, 2) // 1.2 * 0.85 = 1.02
    })
  })
})
