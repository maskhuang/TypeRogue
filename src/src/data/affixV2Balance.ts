// ============================================
// 打字肉鸽 - 新 Affix 系统 · Balance 数据
// ============================================
// 频率表 + throughput target + rarity 倍率 — Phase 1 设计 grammar 的数值基础。
//
// 用法：
//   magnitude = SECTION_THROUGHPUT_TARGET[section]
//             × RARITY_MULTIPLIER[rarity]
//             / EXPECTED_FIRES_PER_BATTLE(trigger)
//
// 校准 baseline 假设：1 场战斗 ≈ 60s ≈ 300 击键 ≈ 30 词。
// 实测 telemetry 接入后再调（详 docs/design/affix-rewrite-tag-system.md §5.5）。

import type { TriggerSpec } from './affixV2Trigger'
import type { SectionTag } from './affixTags'

// ===== 单战 baseline 假设 =====

export const BATTLE_DURATION_SEC = 60
export const KEYS_PER_BATTLE = 300
export const WORDS_PER_BATTLE = 30

// ===== Trigger 期望频率（每战触发次数）=====
// 用于 auto-scaling：低频 trigger → 高 magnitude；高频 trigger → 小 magnitude。

interface TriggerFrequencyEntry {
  readonly fires: number
  readonly note?: string
}

/** 每个 trigger 类型的期望触发次数（每战）*/
export const TRIGGER_FREQUENCY: Record<TriggerSpec['type'], TriggerFrequencyEntry> = {
  passive:          { fires: 1,   note: 'aura 持续；按 duration 计而非 fire 计' },
  on_key:           { fires: 300, note: '最高频；= KEYS_PER_BATTLE' },
  on_word_end:      { fires: 30,  note: '= WORDS_PER_BATTLE' },
  on_self_fire:     { fires: 30,  note: '默认假设；实际取决于上下文' },
  on_fire:          { fires: 30,  note: 'filter 应用后实际频率会降；默认无 filter 估值' },
  every_n_keys:     { fires: 30,  note: '默认 n=10；实际计算用 keysPerBattle/n' },
  on_haste_granted: { fires: 20,  note: 'haste grant 频率经验值；依赖场上 grant_haste 源' },
  on_resource_consumed: { fires: 15, note: '资源消耗频率经验值；依赖场上 convert_resource 源' },
  on_removed:       { fires: 1,   note: '死亡回响；每场被取代一次（依赖场上 consume_skill 源）→ magnitude 应高' },
  on_battle_start:  { fires: 1,   note: '每战仅一次（旧 innate V2 等价物）→ magnitude 应高' },
  on_battle_end:    { fires: 1,   note: '每战仅一次（关后结算 · gain_skill / 关后奖励主用）→ magnitude 应高' },
  on_window_mode:   { fires: 5,   note: 'Phase 2 · 罕见命中' },
  on_sequence:      { fires: 5,   note: 'Phase 2 · 取决于 pattern 严格度' },
  one_per_window:   { fires: 6,   note: 'Phase 2 · 取决于 inner & N' },
} as const

/**
 * 计算给定 trigger 的实际期望频率（考虑 every_n_keys 等参数）。
 *
 * @returns expected fires per battle
 */
export function expectedFiresPerBattle(trigger: TriggerSpec): number {
  if (trigger.type === 'every_n_keys') {
    return Math.max(1, Math.floor(KEYS_PER_BATTLE / trigger.n))
  }
  if (trigger.type === 'one_per_window') {
    return Math.min(
      expectedFiresPerBattle(trigger.inner),
      Math.floor(KEYS_PER_BATTLE / trigger.n),
    )
  }
  return TRIGGER_FREQUENCY[trigger.type].fires
}

// ===== Section throughput target =====
// 每个 section 一个 throughput 目标，单位是 ratio（× Lv1 resource base）。
// 设计师从 archetype 模板填 trigger，magnitude 自动反推。

export const SECTION_THROUGHPUT_TARGET: Record<SectionTag, number> = {
  maintenance: 3.0,   // 例：on_word_end (30 fires) → 0.1 ratio/fire
  locomotion:  2.5,   // 单次中爆发；ratio 略低（× factor 平均补足）
  posture:     1.2,   // aura 持续型；与 fire 数无关，是"等效"目标
  agonistic:   3.5,   // 单次大额，含 crit synergy
  vocal:       0.5,   // 主要 broadcast，单位是"触发邻居次数"非 ratio
  gesture:     3.0,   // 累积型；总产出与 maintenance 同档
  tool:        3.0,   // composite 联动
  abnormal:    4.0,   // 高方差，± 50%
}

// ===== Rarity 倍率 =====

export const RARITY_MULTIPLIER: Record<0 | 1 | 2 | 3, number> = {
  0: 1.0,   // 普通
  1: 1.3,   // 稀有
  2: 1.7,   // 史诗
  3: 2.2,   // 传说
}

// ===== Auto-scaling 计算 =====

/**
 * 给定 section + rarity + trigger，计算"建议 magnitude（ratio 单位）"。
 * 设计师可在 ±30% 范围内微调（详 §S1.d checklist）。
 */
export function computeAutoMagnitude(
  section: SectionTag,
  rarity: 0 | 1 | 2 | 3,
  trigger: TriggerSpec,
): number {
  const T = SECTION_THROUGHPUT_TARGET[section]
  const R = RARITY_MULTIPLIER[rarity]
  const f = expectedFiresPerBattle(trigger)
  if (trigger.type === 'passive') {
    // passive：duration 制——不除以 fire 数，magnitude 直接为 T × R
    // 调用方按需自己加 duration coefficient
    return T * R
  }
  return (T * R) / f
}

/**
 * 反向校验：给定 spec 的 magnitude 是否在合理 baseline ± 30%？
 * 用于 S1.d 设计 checklist。
 */
export function isMagnitudeInBaseline(
  section: SectionTag,
  rarity: 0 | 1 | 2 | 3,
  trigger: TriggerSpec,
  actualMagnitude: number,
  tolerance: number = 0.3,
): boolean {
  const auto = computeAutoMagnitude(section, rarity, trigger)
  if (auto === 0) return actualMagnitude === 0
  const ratio = actualMagnitude / auto
  return ratio >= 1 - tolerance && ratio <= 1 + tolerance
}
