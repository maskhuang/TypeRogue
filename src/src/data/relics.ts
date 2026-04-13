// ============================================
// 打字肉鸽 - 遗物数据
// ============================================
// 职业专属遗物 + 通用遗物

import type { Modifier, PipelineContext } from '../systems/modifiers/ModifierTypes'

// Story 57.1: RELICS / DELETED_RELIC_IDS / MAX_RELIC_SLOTS 迁至 data-json/relics.json
// 本文件保留类型定义和运行时函数

import { RELICS_DATA } from './schemas/relics.schema'
// === 遗物类型定义（从 RelicTypes.ts 迁入） ===

export type RelicRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type RelicEffectType =
  | 'battle_start'     // 战斗开始时触发
  | 'battle_end'       // 战斗结束时触发
  | 'on_word_complete' // 完成词语时触发
  | 'on_skill_trigger' // 技能触发时
  | 'on_error'         // 打错时触发
  | 'passive'          // 持续被动效果
  // Story 36.1: 新增触发时机
  | 'on_keystroke'     // 每次正确/错误击键时触发
  | 'on_combo_change'  // combo 变化时触发（包括中断和增长）
  | 'on_word_start'    // 单词开始输入时触发
  | 'on_shop_enter'    // 进入商店时触发
  | 'on_stage_start'   // 关卡开始时触发
  | 'on_stage_end'     // 关卡结束时触发
  | 'on_settle'        // 单词结算时触发

export type RelicModifierType =
  | 'time_bonus'           // 时间加成（秒）
  | 'score_multiplier'     // 分数倍率加成
  | 'gold_multiplier'      // 金币倍率加成
  | 'combo_protection'     // 连击保护概率
  | 'price_discount'       // 商店折扣
  | 'gold_flat'            // 金币固定加成
  | 'instant_fail'         // 打错即失败
  | 'time_steal'           // 时间窃取
  | 'time_halve'           // 时间减半
  | 'price_increase'       // 价格增加
  | 'skill_lock'           // 技能锁定
  | 'time_penalty'         // 时间惩罚
  | 'max_skill_level'      // 技能等级上限（T4 限制框架）
  | 'max_skill_count'      // 技能数量上限（T4 限制框架）
  // Story 36.1: 新增修改器类型
  | 'skill_output_percent' // 技能产出百分比加算（多个遗物加算叠加）
  | 'error_forgive'        // 错误免除次数（每词重置）
  | 'combo_retain_percent' // combo 中断保留百分比（0-1）
  | 'enchant_growth_bonus' // 附魔成长速度加成百分比
  | 'shop_slot_bonus'      // 商店额外商品位
  | 'free_refresh'         // 商店免费刷新次数
  | 'target_score_reduce'  // 目标分数降低百分比（0-1）
  | 'base_time_bonus'      // 每关基础时间加成（秒）
  | 'sell_price_bonus'     // 出售价格加成百分比（0-1）
  | 'word_score_min'       // 单词最低结算得分
  | 'modifier_debuff_reduce' // Boss修饰器负面效果降低百分比（0-1）
  | 'gold_per_modifier'    // 每个激活修饰器额外通关金币百分比

export type RelicConditionType =
  | 'combo_threshold'       // 连击达到阈值
  // Story 36.1: 新增条件类型
  | 'multiplier_threshold'  // 倍率达到阈值
  | 'skill_count_lt'        // 已装备技能数量小于阈值
  | 'word_length_gte'       // 单词长度 >= 阈值
  | 'word_length_lte'       // 单词长度 <= 阈值
  | 'time_elapsed_lt'       // 关卡已进行时间 < 阈值（秒）
  | 'stage_type'            // 关卡类型匹配
  | 'resource_types_gte'    // 一词内产出资源种类数 >= 阈值

export interface RelicCondition {
  type: RelicConditionType
  /** 数值阈值（用于 combo_threshold, multiplier_threshold, skill_count_lt, word_length, time_elapsed_lt, resource_types_gte） */
  threshold?: number
  /** 关卡类型匹配值（stage_type 使用） */
  stageType?: 'normal' | 'boss'
}

export interface RelicEffect {
  type: RelicEffectType
  modifier: RelicModifierType
  value: number
  condition?: RelicCondition
}

/** 遗物所属子系统（11 个子系统 × 5 个遗物 = 55 通用遗物） */
export type RelicSubsystem =
  | 'typing'         // 打字/输入系统
  | 'combo'          // 连击/倍率系统
  | 'skill'          // 技能系统（词条制）
  | 'enchantment'    // 附魔系统
  | 'topology'       // 键盘拓扑系统
  | 'word'           // 单词/词库系统
  | 'resource'       // 资源系统
  | 'shop'           // 商店系统
  | 'stage'          // 关卡进度系统
  | 'boss_modifier'  // Boss修饰器系统
  | 'scoring'        // 结算/评分系统
  | 'crit'           // 暴击系统
  | 'stacking'       // 叠层系统

/** 遗物行为类型 — 标记需要自定义逻辑的遗物 */
export type RelicBehaviorType =
  // 打字/输入系统
  | 'decelerate_reward'    // 减速津贴：当前词比上个词慢时+时间
  | 'accelerate_reward'    // 加速奖金：当前词比上个词快时+金币
  | 'autocomplete'         // 小助手：Tab 自动补全重复单词
  | 'rhythm_adapt'         // 节奏适应：太鼓节拍系统
  | 'glass_cannon'         // 玻璃大炮：得分×2，打错即死
  // 连击/倍率系统
  | 'double_keystroke'     // 回声指套：正确击键概率算两次
  | 'combo_detonator'      // 连击引爆：combo 达阈值时触发技能
  | 'cancel'         // 取消连锁：连续无失误完成单词叠层，每层技能+8%
  | 'immortal_combo'       // 不灭连击：combo 永不中断，禁止 multiplier 产出
  // 技能系统
  | 'training_manual'      // 集训手册：一次性升级所有 Lv.1 技能
  | 'jazz'                 // 爵士乐：一词内不同词条类型越多加分越高
  | 'uncrowned_king'       // 无冕之王：无附魔技能无限升级，禁止附魔
  | 'd_100'                // D100：拾取时及每5战替换所有技能词条
  // 附魔系统
  | 'fate_fork'            // 命运三岔：附魔选择变 3 选 1
  | 'greedy_inscription'   // 贪婪铭刻：附魔必定成功，每附魔目标×2
  // 键盘拓扑系统
  | 'line_clear'           // 消行满贯：命中一行所有技能→额外触发（跨词累积）
  | 'hand_alternation'     // 双手协奏：左右手交替击键加时间
  | 'punctuation_liberation' // 标点解放：解锁标点键位+词语混入标点
  // 单词/词库系统
  | 'word_dealer'          // 词语经销商：出售词语→下次刷新免费
  | 'key_storm'            // 全键风暴：前 3 词完成时随机触发未命中技能
  // 资源系统
  | 'resource_tide'        // 资源潮汐：奇偶词交替加成 base/multiplier
  // 商店系统
  | 'black_market'         // 黑市门票：商店+1商品位（保底稀有品质）
  | 'smuggle_pass'         // 走私通道：每关免费拿走最便宜商品
  | 'timed_auction'        // 限时拍卖：刷新免费 + 30 秒倒计时
  // 关卡进度系统
  | 'phoenix'              // 不死鸟：失败后复活并移除此遗物
  // Boss修饰器系统
  | 'modifier_barrier'     // 修饰器屏障：第一个修饰器无效化
  | 'chaos_roulette'       // 混沌轮盘：每 5 词替换一个修饰器
  | 'modifier_reversal'    // 修饰器反转：一半修饰器反转为增益
  // 结算/评分系统
  | 'snowball'             // 雪球效应：每词得分递增
  | 'score_black_hole'     // 分数黑洞：隐藏累计，单次手动结算
  // 暴击系统
  | 'crit_storm'           // 暴击风暴：单词内≥2次暴击时全词产出+50%
  | 'fate_coin'            // 命运硬币：超出50%暴击率转化为暴击倍数
  // 叠层系统（系统内 + 跨系统）
  | 'stack_momentum'       // 层层递进：叠层效果触发后间隔临时-1
  | 'stack_dividend'       // 积少成多：每10层产出永久+5%
  | 'overload_circuit'     // 过载电路：叠层效果触发时额外触发相邻叠层技能
  | 'surge'                // 浪涌：叠层效果触发时层数归零，邻居产出+层数×10%
  | 'perpetual_engine'     // 永动引擎：叠层不重置，间隔×2
  | 'drum_pass'            // 击鼓传花：combo+5→叠层+3
  | 'word_resonance'       // 词根共振：完词→叠层+N
  | 'crit_overflow'        // 暴击溢层：暴击→叠层+3
  | 'inscription_flow'     // 铭文涌流：附魔叠层→成长+2%
  | 'neighbor_watch'       // 邻里守望：叠层→相邻叠层+1
  | 'stack_crit'           // 叠层暴击：叠层时可暴击，额外+1层

export interface RelicData {
  id: string
  name: string
  icon: string
  description: string
  rarity: RelicRarity
  basePrice: number
  effects: RelicEffect[]
  flavor?: string
  category?: 'risk-reward'
  /** 所属子系统（通用遗物分类，职业遗物无此字段） */
  subsystem?: RelicSubsystem
  /** 行为类型（需要自定义逻辑的遗物） */
  behaviorType?: RelicBehaviorType
  /** 效果依赖的子系统（与 subsystem 不同时使用；开局时该子系统不可用则排除） */
  requiresSubsystem?: RelicSubsystem
}

/** 遗物槽位上限（1-0） */
/** 遗物槽位上限（来源 JSON） */
export const MAX_RELIC_SLOTS = RELICS_DATA.maxRelicSlots
/**
 * 所有遗物数据（职业专属 + 通用遗物）
 */
export const RELICS: Record<string, RelicData> = RELICS_DATA.relics as Record<string, RelicData>

// === Relic Modifier 工厂类型 ===
export type RelicModifierFactory = (
  relicId: string,
  context?: PipelineContext,
) => Modifier[]

// === RELIC_MODIFIER_DEFS — 每个遗物的 Modifier 工厂 ===
// 玻璃大炮得分×2 改为 completeWord() 中直接整词翻倍，不走管道
// multiplier_prism 通过 ComboRelicBehaviors.getMultiplierPrismBonus() 纯函数实现，不走管道
export const RELIC_MODIFIER_DEFS: Record<string, RelicModifierFactory> = {}

// === T4 限制 Flag 映射表（已清空，无 T4 遗物） ===
export const RELIC_FLAGS: Record<string, string[]> = {}

/**
 * 按稀有度获取遗物列表
 */
export function getRelicsByRarity(rarity: RelicRarity): RelicData[] {
  return Object.values(RELICS).filter(r => r.rarity === rarity)
}

/**
 * 获取遗物数据
 */
export function getRelicData(relicId: string): RelicData | undefined {
  return RELICS[relicId]
}

/**
 * 获取所有遗物ID
 */
export function getAllRelicIds(): string[] {
  return Object.keys(RELICS)
}

/**
 * 获取所有遗物数据
 */
export function getAllRelics(): RelicData[] {
  return Object.values(RELICS)
}

/**
 * 检查遗物数据是否存在
 */
export function relicExists(relicId: string): boolean {
  return relicId in RELICS
}

/**
 * 已删除的遗物 ID（用于存档迁移过滤）
 */
export const DELETED_RELIC_IDS = RELICS_DATA.deletedRelicIds
