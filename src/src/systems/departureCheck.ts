// =============================================================================
// 离场验证 · paraphrase 验证器
// =============================================================================
// Run end 时调用：玩家用自己的话复述一句普通话，
// 验证规则（hard check only）：typed 文本不含本 run wordDeck 任何 token → pass
//
// 失败仅 lore beat（无数值惩罚），settlement 上加扣留章
//
// 状态：lastResult 跨 run 持久（在 settlement 显示用），新 run resetDepartureCheckState 重置

import type { DeparturePrompt, DepartureFailLore } from '../data/narrative/departureCheck'
import { pickDepartureFailLore } from '../data/narrative/departureCheck'

export interface DepartureCheckResult {
  readonly pass: boolean
  /** 玩家实际 typed 的文本 */
  readonly typed: string
  /** 提示句（用于 settlement 回显）*/
  readonly prompt: DeparturePrompt
  /** 失败原因：'anomaly_token' = typed 含 anomaly · 'timeout' = 30s 未提交 · 'empty' = 提交空 */
  readonly failReason?: 'anomaly_token' | 'timeout' | 'empty'
  /** 命中的 anomaly tokens（debug / lore 显示用）*/
  readonly hitTokens: readonly string[]
  /** 失败 lore beat（pass 时空）*/
  readonly failLore?: DepartureFailLore
}

let _lastResult: DepartureCheckResult | null = null

/** 新 run 启动时清空 · 由 resetState 调用 */
export function resetDepartureCheckState(): void {
  _lastResult = null
}

/** settlement 显示用：拿到上次离场验证的结果（无 → null）*/
export function getLastDepartureResult(): DepartureCheckResult | null {
  return _lastResult
}

/**
 * 验证玩家 typed 文本是否含 anomaly token。
 *
 * @param typed 玩家输入文本
 * @param prompt 提示句对象
 * @param anomalyPool 本 run wordDeck（anomaly tokens 集合）
 * @param failReason 外部传入的失败原因（timeout / empty）·  缺省 = 走 token 检查
 * @returns 验证结果（同时记录到 _lastResult）
 */
export function evaluateDepartureCheck(
  typed: string,
  prompt: DeparturePrompt,
  anomalyPool: readonly string[],
  failReason?: 'timeout' | 'empty',
  rng: () => number = Math.random,
): DepartureCheckResult {
  // 1. 外部强制失败（timeout / empty）
  if (failReason === 'timeout' || failReason === 'empty') {
    const result: DepartureCheckResult = {
      pass: false,
      typed,
      prompt,
      failReason,
      hitTokens: [],
      failLore: pickDepartureFailLore(rng),
    }
    _lastResult = result
    return result
  }

  // 2. Hard check: typed 文本是否含本 run wordDeck token
  //    分词：按空白 + 标点切片，case-insensitive 匹配
  //    （CJK 不分词 — 用 substring 匹配避免假阴性）
  const typedLower = typed.toLowerCase()
  const hits: string[] = []
  for (const token of anomalyPool) {
    if (!token) continue
    const t = token.toLowerCase()
    // 边界检查：英文 token 用 word boundary、CJK 用裸 substring
    const isLatinWord = /^[a-z0-9'_-]+$/i.test(token)
    if (isLatinWord) {
      const re = new RegExp(`\\b${escapeRegex(t)}\\b`, 'i')
      if (re.test(typedLower)) hits.push(token)
    } else {
      if (typedLower.includes(t)) hits.push(token)
    }
  }

  if (hits.length > 0) {
    const result: DepartureCheckResult = {
      pass: false,
      typed,
      prompt,
      failReason: 'anomaly_token',
      hitTokens: hits,
      failLore: pickDepartureFailLore(rng),
    }
    _lastResult = result
    return result
  }

  // 3. 通过
  const result: DepartureCheckResult = {
    pass: true,
    typed,
    prompt,
    hitTokens: [],
  }
  _lastResult = result
  return result
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
