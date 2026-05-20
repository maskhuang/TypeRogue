// =============================================================================
// 离场验证 · 句子池 + 失败 lore beat
// =============================================================================
// 触发：run 结束（最后一关后，settlement 之前）
// 机制：随机一句"普通句子"·玩家用自己的话 paraphrase·
//   hard check 唯一：不出现本 run wordDeck 里的 anomaly token → pass
// 失败仅 lore（无数值惩罚），settlement 上加 "扣留" 章
//
// 当前 pool 为 skeletal seed · narrative pipeline 后续增补

export interface DeparturePrompt {
  readonly id: string
  readonly zh: string
  readonly en: string
}

export interface DepartureFailLore {
  readonly id: string
  readonly zh: string
  readonly en: string
}

// =============================================================================
// 普通句子池 · paraphrase 提示用
// =============================================================================
// 选词约束：均为普通日常句（区别于 anomaly token / 未受理文本），
// 玩家自己能换 5+ 个 token 重写出同义。
// 后续 narrative pipeline 扩到 ~12 条以保 LRU 不撞。

export const DEPARTURE_PROMPTS: readonly DeparturePrompt[] = [
  {
    id: 'dep-01-end-of-duty',
    zh: '今日勤务结束。',
    en: 'Today\'s duty has ended.',
  },
]

// =============================================================================
// 失败 lore beat · settlement 上的扣留章戳
// =============================================================================

export const DEPARTURE_FAIL_LORES: readonly DepartureFailLore[] = [
  {
    id: 'fail-01-retained',
    zh: '扣留 · 您今日的复述与未受理文本有高重合。请配合二审。',
    en: 'DETAINED · Your departure paraphrase overlaps significantly with unfiled text. Please cooperate with review.',
  },
]

// =============================================================================
// 公共 API
// =============================================================================

export function pickDeparturePrompt(rng: () => number = Math.random): DeparturePrompt {
  const idx = Math.floor(rng() * DEPARTURE_PROMPTS.length)
  return DEPARTURE_PROMPTS[Math.min(idx, DEPARTURE_PROMPTS.length - 1)]
}

export function pickDepartureFailLore(rng: () => number = Math.random): DepartureFailLore {
  const idx = Math.floor(rng() * DEPARTURE_FAIL_LORES.length)
  return DEPARTURE_FAIL_LORES[Math.min(idx, DEPARTURE_FAIL_LORES.length - 1)]
}
