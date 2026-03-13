// ============================================
// 打字肉鸽 - 商店系统遗物行为 (Story 36.9)
// ============================================
// 5 个商店系统遗物的纯函数行为模块

import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'

// === 常量 ===
export const DISCOUNT_RATE = 0.15
export const RECYCLE_BONUS = 0.50
export const BLACK_MARKET_EXTRA = 1
export const AUCTION_TIMER = 30

// === 模块级状态 ===

/** 本关走私通道是否已使用 */
let _smuggleFreeUsed = false

/** 限时拍卖倒计时 timer ID */
let _auctionTimerId: ReturnType<typeof setInterval> | null = null

// === 折扣卡 (discount_card) ===

/** 有遗物 → 0.85，否则 1 */
export function getDiscountMultiplier(): number {
  if (!state.player.relics.has('discount_card')) return 1
  return 1 - DISCOUNT_RATE
}

// === 回收专家 (recycle_expert) ===

/** 有遗物 → 0.75，否则 0.50 */
export function getRecycleSellMultiplier(): number {
  if (!state.player.relics.has('recycle_expert')) return 0.50
  return 0.50 + RECYCLE_BONUS * 0.50
}

// === 黑市门票 (black_market) ===

/** 有遗物 → 1 额外商品位，否则 0 */
export function getBlackMarketExtraSlots(): number {
  if (!state.player.relics.has('black_market')) return 0
  return BLACK_MARKET_EXTRA
}

// === 走私通道 (smuggle_pass) ===

/** 有遗物 + 未使用 → true */
export function canSmuggleFree(): boolean {
  if (!state.player.relics.has('smuggle_pass')) return false
  return !_smuggleFreeUsed
}

/** 消费免费拿走机会 */
export function consumeSmuggleFree(): void {
  _smuggleFreeUsed = true
}

/** 每关商店打开时重置 */
export function resetSmuggleFree(): void {
  _smuggleFreeUsed = false
}

// === 限时拍卖 (timed_auction) ===

/** 有遗物 → true */
export function isTimedAuction(): boolean {
  return state.player.relics.has('timed_auction')
}

/** 启动限时拍卖倒计时，返回 cleanup 函数 */
export function startAuctionTimer(
  onTick: (remaining: number) => void,
  onExpire: () => void,
): () => void {
  clearAuctionTimer()
  let remaining = AUCTION_TIMER
  onTick(remaining)
  _auctionTimerId = setInterval(() => {
    remaining--
    onTick(remaining)
    if (remaining <= 0) {
      clearAuctionTimer()
      onExpire()
    }
  }, 1000)
  return () => clearAuctionTimer()
}

/** 清理倒计时 */
export function clearAuctionTimer(): void {
  if (_auctionTimerId !== null) {
    clearInterval(_auctionTimerId)
    _auctionTimerId = null
  }
}

// === 生命周期 ===

/** 每关商店打开时重置 */
export function resetShopRelicState(): void {
  _smuggleFreeUsed = false
  clearAuctionTimer()
}

/** 注册商店系统遗物行为 */
export function initShopRelicBehaviors(): void {
  registerRelicBehavior('black_market', () => {})
  registerRelicBehavior('smuggle_pass', () => {})
  registerRelicBehavior('timed_auction', () => {})
}
