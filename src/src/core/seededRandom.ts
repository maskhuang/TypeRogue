// ============================================
// 打字肉鸽 - 种子化随机数生成器
// ============================================
// Story 25.6: 每日种子系统 (AC: 1, 2)

/**
 * SeededRandom — mulberry32 PRNG
 *
 * 高质量 32 位伪随机数生成器，接受整数种子。
 * 同一种子保证产生完全相同的序列。
 */
export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = (seed | 0) || 1
  }

  /** 返回 [0, 1) 的伪随机浮点数 */
  next(): number {
    this.state = this.state + 0x6D2B79F5 | 0
    let t = Math.imul(this.state ^ this.state >>> 15, 1 | this.state)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }

  /** 返回 [min, max) 的伪随机整数 */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min))
  }
}

/**
 * 字符串哈希 → 32 位整数
 * Java String.hashCode 风格
 */
export function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0
  }
  return hash
}

/** 获取今天的 UTC 日期字符串 (YYYY-MM-DD) */
export function getDailySeedString(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 获取今天的每日种子值 */
export function getDailySeed(): number {
  return hashCode(getDailySeedString())
}

// === 全局 random() 切换 ===

let _rng: (() => number) = Math.random

/** 全局随机函数 — 普通模式用 Math.random，种子模式用 SeededRandom */
export function random(): number {
  return _rng()
}

/** 切换到种子模式 */
export function setSeededMode(seed: number): void {
  const sr = new SeededRandom(seed)
  _rng = () => sr.next()
}

/** 切换回普通模式 */
export function setNormalMode(): void {
  _rng = Math.random
}

/**
 * 用一个隔离的种子流临时替换全局 random() 跑一段逻辑，结束后**精确还原**之前的 _rng。
 * 用于标定 / 离线采样：不消耗、不扰动 gameplay 的随机序列（无论当前处普通还是种子模式）。
 */
export function runWithTempSeed<T>(seed: number, fn: () => T): T {
  const prev = _rng
  const sr = new SeededRandom(seed)
  _rng = () => sr.next()
  try {
    return fn()
  } finally {
    _rng = prev
  }
}

/**
 * 种子化洗牌 — Fisher-Yates shuffle（不修改原数组）
 */
export function seededShuffle<T>(arr: readonly T[], rng: SeededRandom): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
