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

/** 完整 fire filter · 7 维正交（详 affix-rewrite-tag-system.md §4.2） */
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
  /** 来源 skill 是否为当前焦点（MARK）· true = 仅焦点击发时命中（="使用MARK技能时"）*/
  readonly marked?: boolean
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
  /** scope 内某个 skill 「给予/发出」极速时触发（源/施加方侧 · on_haste_granted 的镜像）· 默认 scope=self ·
   *  匹配 grant_haste 的「源 skill」是否在 scope 内（典型 scope=neighbors{posRel} = "posRel 里的技能给予极速时"）·
   *  relic 等无源 skill 的极速施加不触发 · 无 grant_haste 源时永不触发（reactive build-around · 与 on_haste_granted 同纪律）*/
  | { type: 'on_haste_emitted'; scope?: TargetSelector }
  /** scope 内某个 skill 成为焦点（获得 MARK）时触发 · 默认 scope=self ·
   *  reactive build-around：无 apply_mark 源时永不触发（与 on_haste_granted 同纪律）*/
  | { type: 'on_mark_granted'; scope?: TargetSelector }
  /** scope 内某个 skill 失去焦点（MARK 被改指/清除）时触发 · 默认 scope=self ·
   *  单焦点 re-aim 时旧焦点必被剥夺 → 焦点交接 payoff · 关末 teardown 不触发（不发事件）*/
  | { type: 'on_mark_lost'; scope?: TargetSelector }
  /** scope 内某个 skill 加入结盟时触发 · 默认 scope=self ·
   *  reactive build-around：无 apply_ally 源时永不触发（与 on_mark_granted 同纪律）·
   *  结盟单向只进（无 left 触发）· 关末 teardown 清盟不触发（不发事件）*/
  | { type: 'on_ally_joined'; scope?: TargetSelector }
  /** 每场战斗开始触发一次 · 旧 innate 的 V2 等价物 */
  | { type: 'on_battle_start' }
  /** 每场战斗结束触发一次 · result 决定哪类结局触发（缺省 'win'）·
   *  典型用法：on_battle_end + gain_skill effect 做关后奖励 */
  | { type: 'on_battle_end'; result?: 'win' | 'lose' | 'any' }
  /** 某资源被消耗时触发（反应型）· 监听 convert_resource 产生的消耗事件 ·
   *  resource 缺省 = 任意资源被消耗即触发；指定时仅该资源被消耗才触发 ·
   *  无 convert_resource 源时永不触发（build-around · 与 on_haste_granted 同纪律）*/
  | { type: 'on_resource_consumed'; resource?: string }
  /** 本技能「被移除」时触发（死亡回响 · 反应型）· 仅当宿主 skill 被 consume_skill（取代/吞噬类）
   *  本场移除时派发；hook 层只迭代被移除 skill 上的 on_removed 词条。
   *  无移除源（场上无 consume_skill）时永不触发（build-around · 与 on_resource_consumed 同纪律）*/
  | { type: 'on_removed' }

/** Phase 2 trigger 扩展（详 research §5.2） */
export type Phase2TriggerSpec =
  | { type: 'on_window_mode'; pattern: WindowPattern; window?: WindowSpec; threshold?: number }
  | { type: 'on_sequence'; pattern: string }
  | { type: 'one_per_window'; n: number; inner: TriggerSpec }    // 包裹 inner trigger，限流

/** 完整 TriggerSpec union */
export type TriggerSpec = Phase1TriggerSpec | Phase2TriggerSpec

// ===== ScaleByTag (供 EffectSpec 引用) =====
// 「scale by count」· 两层正交：
//   curve（type）：count — 乘性连续 factor = 1 + n × factor（n=0 → ×1 全产出）
//                  per_n — 步进整数 factor = floor(n / perN)（n<perN → 0，门控）
//   source       ：数 scope 内的什么单位 —— 词条(tag) / 资源(resource) / 稀有度(rarity) /
//                  空位(empty) / 极速(hasted) / 结盟数(allied) / 目标分数档(targetScore) / 同名词条(affixName)
// 都按"乘性 scale 因子"接入 add / multiply / gain_resource / apply_aura。
// scope 决定计数范围（缺省 all_skills）；empty / hasted / allied / targetScore 例外——不使用 scope（见各 source 注释）。

/** scale 计数来源 · 决定"数 scope 内的什么" */
export type ScaleCountSource =
  /** 词条：scope 内携带该 tag 的词条数 */
  | { readonly by: 'tag'; readonly tag: Tag | readonly Tag[] }
  /** 资源：scope 内主产该资源的技能数 */
  | { readonly by: 'resource'; readonly resource: string }
  /** 稀有度：scope 内该稀有度(0-3)的技能数 */
  | { readonly by: 'rarity'; readonly rarity: number }
  /** 空位：与宿主键位成该 posRel 关系的空键位（无技能绑定）数 · 不使用 scope */
  | { readonly by: 'empty'; readonly posRel: PositionRelation }
  /** 极速：场上当前处于极速态（haste 层数 ≥ 1）的技能数 · 运行时动态 · 全局计数，不使用 scope */
  | { readonly by: 'hasted' }
  /** 结盟数：当前结盟集规模 n（已入盟技能数）· 运行时动态 · 全局计数，不使用 scope ·
   *  与盟员产出加成同口径（= 字母徽章显示的 n）· reactive build-around：无 apply_ally 源时为 0 */
  | { readonly by: 'allied' }
  /** 目标分数：当前关目标分数档 = round(targetScore / TARGET_BASE) · 越深入 run 目标越高 → 数越大 · 全局计数，不使用 scope */
  | { readonly by: 'targetScore' }
  /** 同名词条：scope 内携带「与宿主同名词条」（同 defId）的去重技能数 · 自指，无参数（计数对象恒为挂载本 scale 的词条名）·
   *  宿主自身那个技能也计入（≥1）· 宿主 defId 运行时取 ctx.selfDefId、tooltip 预览取 hostDefId · 协同放大「越多技能装了我，我越强」*/
  | { readonly by: 'affixName' }

export type ScaleByTag =
  | {
      readonly type: 'count'
      readonly source: ScaleCountSource
      readonly factor: number
      /** 计数范围；缺省 = all_skills · empty source 忽略此字段 */
      readonly scope?: TargetSelector
    }
  | {
      readonly type: 'per_n'
      readonly source: ScaleCountSource
      /** 每 perN 个单位贡献 1 档 scale；count<perN → 0 */
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
  /**
   * 当前焦点技能（MARK 单焦点寄存器 · 0/1 个）· 运行时动态。
   * 解析为当前被标记的那个技能（无焦点 → 空集）· 与 hasted 同纪律（装备态/预览返空）。
   * 作 effect scope = "作用于焦点"；与 Tier-2 射程内优先互补（详 affixV2State.setFocus）。
   */
  | { type: 'marked'; pick?: 'all' | 'random' }
  /**
   * 当前结盟全部成员（结盟集 · 0..N 个）· 运行时动态。
   * 解析为当前已入盟的所有技能（无成员 → 空集）· 与 hasted/marked 同纪律（装备态/预览返空）。
   * 作 effect scope = "作用于全体盟员"；与结盟产出加成（每盟员 +bonus×n）互补。
   */
  | { type: 'allied'; pick?: 'all' | 'random' }
  /** 指定稀有度（= V2 词条数量 0-3）的技能 · 精确匹配，复合范围交由 composite */
  | { type: 'matched_rarity'; rarity: number; pick?: 'all' | 'random' }
  /**
   * IN-tray（工作台未装配）技能 · = state.player.inbox（已拥有但未绑键）。
   * 现有 all_skills 已涵盖全量 affixSkills（绑键 + IN-tray），故本 scope 专取「仅未绑键」
   * 这一既有 selector 无法单独圈出的集合。这些技能不参战，主用作 inherit_tags 的 tag 来源。
   */
  | { type: 'workbench'; pick?: 'all' | 'random' }
  /**
   * 同词内技能 · = 当前/刚输入单词里一起击发的技能（宿主键位所在 word 的其他绑键技能）。
   * 运行时由集成层从 state.player.word 的字母 → state.player.bindings 推导（任一占用键的字母
   * 出现在 word 中即在范围内）· 恒排除宿主自身 + 本场已被移除(consumed)的技能。
   * 无 word 上下文（如 on_battle_start）→ 退化为空集。consume_skill（取代）签名 scope。
   */
  | { type: 'same_word'; pick?: 'all' | 'random' }

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
  /**
   * 继承 tag · 宿主 skill（= 携带此 aura 的 skill）拥有 scope 内所有技能 tag 的并集。
   * 此处 apply_aura.selector 语义反转为「tag 来源 scope」（而非接收方）——接收方恒为宿主自身。
   * 继承的是技能层 tag 成员资格（own tag 并集），消费方：matched_tag 选取 + on_fire tag filter
   * 把宿主视为携带这些 tag。一跳继承（只取来源的 own tag，不取来源的继承 tag），不会递归。
   * 不创造幻影词条——故 count(tag) / scale-by-tag 计数不变（数的是真实词条数）。
   * 无数值字段 → scale 透传。
   */
  | { type: 'inherit_tags' }

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
  /** 动态：true 时 hasTag 在 resolve 阶段填充为本词条 def 的 section
   *  典型用法：imitate 在不同 section 上自动只复制同 section 兄弟
   *  与显式 hasTag 同时存在时以本字段为准（覆盖） */
  readonly hasTagFromHost?: boolean
  /** 候选池仅含与宿主键位满足 posRel 关系的 skill（player_skill_pool 主用 · 其他 source 忽略）
   *  6 种关系：Adjacent / SameRow / SameColumn / SameHand / SameFinger / Symmetric
   *  典型用法：imitate 限定为某种位置邻位的兄弟 skill */
  readonly neighborPosRel?: import('./keyboardTopology').PositionRelation
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

// ===== 结盟产出加成常量 =====
// 结盟集（apply_ally）内每个技能产出 ×(1 + ALLIANCE_BONUS_PCT × n)，n = 当前结盟规模。
// 平衡可调旋钮：盟越大每个盟员越强（n=2 → +10%，n=5 → +25%）。
export const ALLIANCE_BONUS_PCT = 0.05

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
   * 资源转化（消耗型）· 消耗 from 资源，产出 to 资源 —— 二者均排除宿主原资源（生成时按 host 排除）。
   * 与 gain_proportional（drink/饮水）区别：
   *   - gain_proportional：source = 宿主自身资源，只「读取持有量」缩放产出，**不扣除**；
   *   - convert_resource：from/to 都**不是**宿主产出资源，且真正**扣除** from（负向注入资源池）。
   * 数值（1:1 Lv1-单位代谢，from/to 各按自身 Lv1 base 折算）：
   *   desired = ratio × Lv1[from]；have = player[from]
   *   持有为 0 → 跳过（不消耗不产出）；have < desired → 按 have/desired 比例缩减消耗与产出
   *   消耗 = min(desired, have)；产出 = ratio × Lv1[to] × (消耗 / desired)
   * 消耗量进 ResolveResult.resourcesConsumed，供集成层扣除 + 派发 on_resource_consumed。
   */
  | { kind: 'convert_resource'; from: string; to: string; ratio: number }

  /**
   * 回收被消耗的资源（食粪 coprophagy · 反应式）· 仅在 on_resource_consumed 上下文有意义。
   * 每当任意 affix 消耗（"排泄"）资源 → 回收 fraction × 本次被消耗量，产出同种资源。
   * 数值：produce = fraction × ctx.consumedAmount（直接按量回收，不经 Lv1 缩放）。
   * fraction < 1 → 永远是部分退款（消耗家族净变便宜），不成无限循环；
   * 缺 consumedResource/consumedAmount（非消耗上下文）→ no-op。
   */
  | { kind: 'reclaim_consumed'; fraction: number }

  /**
   * 极速 grant · 给 selector 内 skill +amount 极速层（per-skill 累加，floor 后消耗）
   * 消耗时机：玩家按下技能绑定键时，若该 skill 有 ≥1 极速，消耗 1 层 → 额外触发一次
   * 额外触发内容：基础产出 + 该 skill 上 on_self_fire affix 各跑一次 + every_n_keys 全局计数 +1
   * **不** 推进 word.index；每关重置。
   */
  | { kind: 'grant_haste'; selector: TargetSelector; amount: number }
  /** MARK 给予：把 selector 解析出的候选随机取 1 个设为全局焦点（单焦点寄存器，new 顶 old）·
   *  无数值 · 收益是被标记技能被其它取对象效果优先选中（Tier-2 射程内优先 + marked scope 显式触达）*/
  | { kind: 'apply_mark'; selector: TargetSelector }

  /** 结盟给予：把 selector 解析出的**全部**候选加入结盟集（复数共存，与 apply_mark 取 1 不同）·
   *  收益是集合内每个技能产出 +ALLIANCE_BONUS_PCT × n（n=结盟规模 · 越大越强）· scope 越宽入盟越多 */
  | { kind: 'apply_ally'; selector: TargetSelector }

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
   * scale 可选：触发时按 source count 把 modifier amount 乘以 scale factor，再注册到 aura store。
   * 例：multi_fire_add(amount=1) + scale={type:'per_n', source:{by:'tag',tag:'vocal'}, perN:2}
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

  /**
   * 升级 selector 范围内 skill 的等级（meta-progression · 制造/锻造型）
   * 每次命中 → 目标 skill.level += amount（capped 至 baseValues 长度）· run 内永久
   */
  | { kind: 'upgrade_skill'; selector: TargetSelector; amount: number }

  /**
   * 从 from 范围内随机抽 1 个 V2 词条复制装到宿主（meta-progression · 读取/嫁接型）
   * 宿主词条数 +1（受 rarity 上限约束，已满则跳过）· run 内永久
   */
  | { kind: 'graft_affix'; from: TargetSelector }

  /**
   * 取代（agonistic 对抗 · 本场移除 + 吸收产出）· 移除 selector 范围内满足 filter 的 1 个技能，
   * 获得 = ratio × 被移除技能基础产出（其主资源 Lv.N base）的一次性产出（同被移除技能的资源）。
   *
   * - selector：典型 same_word（同词内）· 范围已排除宿主自身 + 已被移除技能；
   * - filter：可选 · 在 selector 候选上 AND 过滤（resource / rarity / hasTag 等 · 缺省 = 不过滤）·
   *           recipe 生成时随机锁 1 个维度（与 teach/imitate 同纪律）；
   * - 命中多个时随机取 1；命中 0 → no-op；
   * - 移除是「本场」级（consumed 集 · battle reset 恢复），**不**改 run 级 state；
   * - 被移除技能上的 on_removed 词条在移除时派发一次（死亡回响）。
   * 产出由集成层按被移除技能的 resource × level 计算并注入（不经 output_bonus / crit 二次放大）。
   */
  | { kind: 'consume_skill'; selector: TargetSelector; ratio: number; filter?: SkillFilter }

// ===== 默认值 =====

export const DEFAULT_TRIGGER: TriggerSpec = { type: 'passive' }
export const DEFAULT_EFFECT: EffectSpec = { kind: 'noop' }
