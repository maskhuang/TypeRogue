// ============================================
// 打字肉鸽 - 新 Affix 系统 · TriggerSpec / EffectSpec 类型
// ============================================
// 设计文档:
//   - docs/design/affix-rewrite-research.md §5（trigger 系统）
//   - docs/design/affix-rewrite-tag-system.md §4-5（FireFilter / Effect）

import type { Tag } from './affixTags'
import type { PositionRelation } from './keyboardTopology'

// ===== FireFilter（5 维） =====
// 注：完整类型定义在 src/src/systems/fireFilter.ts；此处仅为 TriggerSpec.on_fire 引用。
// 避免循环 import，FireFilter 的运行时匹配函数在 fireFilter.ts。

/** 完整 fire filter · 6 维正交（详 affix-rewrite-tag-system.md §4.2） */
export interface FireFilter {
  /** behavior sampling：来源 affix 携带此 tag（any-of）*/
  readonly tag?: Tag | readonly Tag[]
  /** focal subgroup：键盘拓扑位置关系 */
  readonly posRel?: PositionRelation
  /** resource sampling：来源 skill 产出资源类型 */
  readonly resource?: string
  /** event-type：来源 fire 是否暴击 */
  readonly is_crit?: boolean
  /** event-type：来源 fire 是否触发满层释放 */
  readonly stack_state?: 'full' | 'partial'
  /** 来源 skill 稀有度（= V2 词条数量 0-3）· 精确匹配，复合范围交由 composite */
  readonly rarity?: number
}

// ===== WindowPattern (Phase 2 · on_window_mode) =====

/** on_window_mode 的 pattern 注册表（详 tag-system §5.3.2） */
export type WindowPattern =
  | 'rhythm_stable'         // std(inter-key intervals) < threshold
  | 'hand_alternation'      // L-R 交替比 > threshold
  | 'bpm_lock'              // mean ≈ target BPM, jitter 小
  // Phase 3 扩展：
  // | 'accel' | 'decel' | 'same_hand_streak'

/** on_window_mode 的窗口参数 */
export interface WindowSpec {
  readonly size: number
  readonly unit: 'keys' | 'seconds' | 'words'
}

// ===== TriggerSpec (Phase 1 + Phase 2) =====

/** Phase 1 trigger 集（详 research §5.1） */
export type Phase1TriggerSpec =
  | { type: 'passive' }
  | { type: 'on_key' }
  | { type: 'on_word_end' }
  | { type: 'on_self_fire' }
  | { type: 'on_fire'; filter?: FireFilter }
  | { type: 'every_n_keys'; n: number }
  /** scope 内某个 skill 获得极速时触发 · 默认 scope=self */
  | { type: 'on_haste_granted'; scope?: TargetSelector }
  /** 每场战斗开始触发一次 · 旧 innate 的 V2 等价物 */
  | { type: 'on_battle_start' }
  /** 每场战斗结束触发一次 · result 决定哪类结局触发（缺省 'win'）·
   *  典型用法：on_battle_end + gain_skill effect 做关后奖励 */
  | { type: 'on_battle_end'; result?: 'win' | 'lose' | 'any' }

/** Phase 2 trigger 扩展（详 research §5.2） */
export type Phase2TriggerSpec =
  | { type: 'on_window_mode'; pattern: WindowPattern; window?: WindowSpec; threshold?: number }
  | { type: 'on_sequence'; pattern: string }
  | { type: 'one_per_window'; n: number; inner: TriggerSpec }    // 包裹 inner trigger，限流

/** 完整 TriggerSpec union */
export type TriggerSpec = Phase1TriggerSpec | Phase2TriggerSpec

// ===== ScaleByTag (供 EffectSpec 引用) =====
// 两种 mode：
//   tag_count  — 乘性连续：factor = 1 + count × factor（count=0 时 = 1，全产出）
//   tag_per_n  — 步进整数：factor = floor(count / perN)（count<perN 时 = 0，门控）
// 两种 mode 都按"乘性 scale 因子"语义接入 add / multiply / gain_resource / apply_aura；
// 差别在曲线形态（连续 % 增长 vs 整数跳变）。

export type ScaleByTag =
  | {
      readonly type: 'tag_count'
      readonly tag: Tag | readonly Tag[]
      readonly factor: number
      /** 计数范围；缺省 = all_skills · pick 字段被忽略（计数语义） */
      readonly scope?: TargetSelector
    }
  | {
      readonly type: 'tag_per_n'
      readonly tag: Tag | readonly Tag[]
      /** 每 N 个 tag 贡献 1 单位 scale；count<perN → 0 */
      readonly perN: number
      readonly scope?: TargetSelector
    }

// ===== TargetSelector =====
// 统一范围类型 · 用于 fire_target / apply_aura / apply_status / ScaleByTag.scope / count_tag_*.scope
//
// 4 种 selector + 可选 pick 量词：
//   pick='all'     → 范围内全部目标（默认）
//   pick='random'  → 范围内随机 1 个
// 计数 context（ScaleByTag / count_tag_*）下 pick 被忽略——计数不需要"挑一个"。

export type TargetSelector =
  | { type: 'self' }
  | { type: 'neighbors'; posRel: PositionRelation; pick?: 'all' | 'random' }
  | { type: 'matched_tag'; tag: Tag; pick?: 'all' | 'random' }
  /** 按主产出资源过滤（如"所有 score 产出 skill"）*/
  | { type: 'matched_resource'; resource: string; pick?: 'all' | 'random' }
  | { type: 'all_skills'; pick?: 'all' | 'random' }
  /** 当前处于极速状态（haste 层数 ≥ 1）的技能 · 运行时动态 */
  | { type: 'hasted'; pick?: 'all' | 'random' }
  /** 指定稀有度（= V2 词条数量 0-3）的技能 · 精确匹配，复合范围交由 composite */
  | { type: 'matched_rarity'; rarity: number; pick?: 'all' | 'random' }

// ===== AuraModifier (apply_aura 用) =====

export type AuraModifier =
  /** 邻居 base += ratio × neighbor_resource_Lv1_base */
  | { type: 'base_add'; ratio: number }
  /** 邻居 multiplier factor += amount（factor delta，非资源比例）*/
  | { type: 'factor_add'; amount: number }
  /** 邻居 crit chance += amount（绝对百分比，0.10 = +10%）*/
  | { type: 'crit_chance_add'; amount: number }
  /** 邻居输出 +amount%（绝对百分比，0.10 = +10%）*/
  | { type: 'output_bonus_pct'; amount: number }
  /** 多重释放 · 目标 skill 每次 fire 额外触发 amount 次（amount = 1 → 单次变双发，2 → 三发）*/
  | { type: 'multi_fire_add'; amount: number }
  /** 彩虹 · 目标 skill 基础产出改为随机资源（按目标资源 Lv1 base 重缩放，每次 fire 重抽）*/
  | { type: 'rainbow' }

// ===== StatusKeyword (apply_status 占位 · K4 D' 决议)
// 词表暂未敲定（推迟到 narrative status register 决议），运行时 stub。
export type StatusKeyword = string

// ===== SkillFilter (gain_skill 用)
// 给定候选池后按以下字段 AND 过滤；任一字段缺省 = 不过滤该维度。
// 字段语义见 docs/design/affix-rewrite-tag-system.md §10（skill 维度筛选 · 待补）

export interface SkillFilter {
  /** 主产出资源（any-of）· 候选 skill 的 resource 字段命中任一即过 */
  readonly resource?: string | readonly string[]
  /** 排除资源（none-of）*/
  readonly excludeResource?: string | readonly string[]
  /** 稀有度（V2 词条数量 0-3）· 数字 = 精确；范围 = min/max 闭区间 */
  readonly rarity?: number | { readonly min?: number; readonly max?: number }
  /** tag 维度 any-of：候选 skill 的任一 V2 词条 tag 命中即过 */
  readonly hasTag?: Tag | readonly Tag[]
  /** tag 维度 all-of：候选 skill 的 V2 词条必须同时含所有 tag */
  readonly allTags?: readonly Tag[]
  /** 排除 tag：候选 skill 任一 V2 词条带这些 tag 即拒 */
  readonly excludeTag?: Tag | readonly Tag[]
  /** 是否排除玩家已拥有的同 skill id（缺省 false · 候选池本身已是新生成则不重复）*/
  readonly notOwned?: boolean
  /** class 限制 · 对接现有 ClassResourceFilter（缺省 = 不限制）*/
  readonly classFilter?: string
}

// ===== SkillFilter widen 候选维度（fallback='widen' 时按顺序逐档放宽）
export const SKILL_FILTER_WIDEN_ORDER = ['allTags', 'hasTag', 'rarity', 'resource'] as const

// ===== ConditionSpec (conditional 用) =====
// K4 D' 决议：基础 8 条永远启用；status 依赖 2 条作占位（runtime stub 返 false）

export type ConditionSpec =
  // 基础 8 条（不依赖 status）
  | { type: 'is_crit' }
  | { type: 'word_length_gte'; n: number }
  | { type: 'word_length_lte'; n: number }
  | { type: 'count_tag_gte'; tag: Tag; n: number; scope?: TargetSelector }
  | { type: 'count_tag_lte'; tag: Tag; n: number; scope?: TargetSelector }
  /**
   * 资源量低于阈值 · ratio 是 Lv1 base 的比例（0.5 = 50% Lv1 base）
   * 例：resource='score', ratio=2 → 阈值 = 2 × score_Lv1_base = 22 (Lv1=11)
   */
  | { type: 'resource_below'; resource: string; ratio: number }
  /** 资源量高于阈值 · ratio 同上 */
  | { type: 'resource_above'; resource: string; ratio: number }
  | { type: 'affix_key_count_gte'; n: number }
  // status 依赖 2 条（K4 D' 占位 · 运行时 stub）
  | { type: 'has_status'; target: TargetSelector; status: StatusKeyword }
  | { type: 'status_count_gte'; target: TargetSelector; status: StatusKeyword; n: number }

// ===== Rate limit 常量 (fire_target 防递归爆炸) =====
// K1 决议：Bazaar 风限流——同一来源每秒最多 4 次触发
export const FIRE_TARGET_RATE_LIMIT_PER_SEC = 4

// ===== EffectSpec =====
// 4 个核心 kind（2026-05-12 锁定）：2 个关内成长 + 2 个一次性。
// 关内成长 = 每次 trigger 命中累积，battle end 重置（Bazaar "for the fight" pattern）。
// 一次性    = 每次 trigger 输出固定值，无累积。
//
// 详 docs/design/affix-rewrite-tag-system.md §5（Effect Scaling 接口）。

/** Effect 规格（数值产出 / 关内成长 / 一次性）*/
export type EffectSpec =
  /** 无 effect（占位 · 默认值）*/
  | { kind: 'noop' }

  /**
   * 关内成长 · base 累加
   * 每次 trigger 命中 → 累加 ratio × skill_resource_Lv1_base（for the fight）；battle end 重置。
   * selector 缺省 = self（写到本 instance state.cumulativeBaseAdd）；
   * selector 提供时按 scope 展开，写到 per-skill aggregate（affixV2State._skillCumBase）。
   * 数值演算：fire N 次后 cum base = N × ratio × Lv1_base
   */
  | { kind: 'add'; ratio: number; scale?: ScaleByTag; selector?: TargetSelector }

  /**
   * 关内成长 · multiplier factor 累加
   * 每次 trigger 命中 → 累加 amount（for the fight）；battle end 重置。
   * selector 缺省 = self（写到本 instance state.cumulativeFactorAdd）；
   * selector 提供时按 scope 展开，写到 per-skill aggregate（affixV2State._skillCumFactor）。
   * 数值演算：fire N 次后 factor = 1 + N × amount；线性增长（非指数）。
   */
  | { kind: 'multiply'; amount: number; scale?: ScaleByTag; selector?: TargetSelector }

  /**
   * 一次性产出
   * 每次 trigger 命中 → 产出 ratio × resource_Lv1_base 点 resource；
   * 无累积、无重置。
   * 设计意图：同上 `add`——ratio 是资源 Lv1 base 比例，跨资源等效。
   */
  | { kind: 'gain_resource'; resource: string; ratio: number; scale?: ScaleByTag }

  /**
   * 比例产出（"持有 X → 产出 Y"）· source/target 为不同资源
   * 每次 trigger 命中 → amount = ratio × Lv1[target] × (player[source] / Lv1[source])
   * 数值演算：持 1 Lv1 单位 source 时，等效一次 `gain_resource(target, ratio)`；
   *           持 10 Lv1 单位 source 时，等效 10× drip 一次产出。雪球性。
   */
  | { kind: 'gain_proportional'; source: string; target: string; ratio: number }

  /**
   * 极速 grant · 给 selector 内 skill +amount 极速层（per-skill 累加，floor 后消耗）
   * 消耗时机：玩家按下技能绑定键时，若该 skill 有 ≥1 极速，消耗 1 层 → 额外触发一次
   * 额外触发内容：基础产出 + 该 skill 上 on_self_fire affix 各跑一次 + every_n_keys 全局计数 +1
   * **不** 推进 word.index；每关重置。
   */
  | { kind: 'grant_haste'; selector: TargetSelector; amount: number }

  /**
   * 多 effect 顺序执行（加算层 → 乘算层 → 一次性产出 的顺序结算）
   *
   * **使用约束（2026-05-12 决议）**：composite **仅用于 stack 模式**——
   * 把 stack_inc + stack_release 在同 trigger 下 atomic 组合。
   * 其他"同 trigger 多 effect"场景应拆为多 affix（同 skill 多槽位），
   * 不要用 composite 作为通用复合容器。
   *
   * 合法例：composite([stack_inc(1), stack_release(8, gain, reset:true)])
   * 不合法：composite([add, gain_resource])  → 应拆 2 affix
   */
  | { kind: 'composite'; effects: readonly EffectSpec[] }

  /**
   * 条件包装 · if-then[-else]
   * when 评估命中 → 执行 then；else 缺省 = 不执行
   */
  | { kind: 'conditional'; when: ConditionSpec; then: EffectSpec; else?: EffectSpec }

  /**
   * 触发目标 skill 完整 re-fire（K1 决议 ii · Bazaar 风）
   * 目标 skill 走一遍完整 fire pipeline（含所有 affix 重评估）。
   * 防递归：同一来源 4 fires/sec 限流（FIRE_TARGET_RATE_LIMIT_PER_SEC）。
   */
  | { kind: 'fire_target'; selector: TargetSelector }

  /**
   * 给目标加持续 aura buff/debuff（K3 决议：仅 'fight' duration · battle end 清除）
   * 不是 per-fire 触发——是常驻 modifier。
   * scale 可选：触发时按 tag count 把 modifier amount 乘以 scale factor，再注册到 aura store。
   * 例：multi_fire_add(amount=1) + scale=tag_per_n(perN=2, tag=vocal)
   *     → 场上每 2 个 vocal 词条 → +1 多重释放（count<2 → amount=0 空 aura）。
   */
  | { kind: 'apply_aura'; selector: TargetSelector; modifier: AuraModifier; scale?: ScaleByTag }

  /**
   * 给目标加 status 层（K4 D' 占位 · 词表未定，runtime stub）
   * amount 为层数（≥1）；duration 为 ticks/seconds，由 status 系统解析。
   */
  | { kind: 'apply_status'; target: TargetSelector; status: StatusKeyword; amount: number; duration?: number }

  /** 自身 stack 计数 +amount（默认 +1）· 需 instance state */
  | { kind: 'stack_inc'; amount?: number }

  /**
   * stack 达 threshold 时执行 release effect；reset=true 时清零（K5 决议：state 在 registry）
   */
  | { kind: 'stack_release'; threshold: number; release: EffectSpec; reset?: boolean }

  /**
   * 获得新技能（meta-progression effect）
   * 典型搭配：on_battle_end trigger · 关后白送一个匹配 filter 的 skill。
   *
   * - filter 在 source 池上 AND 过滤；命中 0 时按 fallback 处理
   * - levelMode 缺省 'inherit_host'（新 skill Lv = 本词条宿主 skill Lv）
   * - count 缺省 1；多个 gain_skill affix 各自独立触发不互相 cap
   */
  | {
      kind: 'gain_skill'
      filter: SkillFilter
      source?: 'recipe_pool' | 'shop_pool' | 'altar_pool' | 'player_skill_pool'
      count?: number
      levelMode?:
        | 'inherit_host'
        | { type: 'fixed'; level: number }
        | { type: 'host_minus'; delta: number }
      fallback?: 'widen' | 'refund' | 'skip'
    }

// ===== 默认值 =====

export const DEFAULT_TRIGGER: TriggerSpec = { type: 'passive' }
export const DEFAULT_EFFECT: EffectSpec = { kind: 'noop' }
