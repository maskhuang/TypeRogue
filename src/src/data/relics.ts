// ============================================
// 打字肉鸽 - 遗物数据
// ============================================
// 职业专属遗物 + 通用遗物

import type { Modifier, PipelineContext } from '../systems/modifiers/ModifierTypes'

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
export const MAX_RELIC_SLOTS = 10

/**
 * 所有遗物数据（职业专属 + 通用遗物）
 */
export const RELICS: Record<string, RelicData> = {
  // ==================== 职业初始遗物 ====================

  apprentice_notes: {
    id: 'apprentice_notes',
    name: '学徒笔记',
    icon: '📓',
    description: '造词师初始遗物。开局元音碎片各 ×3。',
    rarity: 'common',
    basePrice: 0,
    effects: [],
    flavor: '每一笔都是对语言的敬意。',
  },

  primal_mutant: {
    id: 'primal_mutant',
    name: '原初变异体',
    icon: '🧫',
    description: '蜕变师初始遗物。每关第一次蜕变免费。',
    rarity: 'common',
    basePrice: 0,
    effects: [],
    flavor: '最初的变异，蕴含无限可能。',
  },

  // ==================== 蜕变师专属遗物 ====================

  ultimate_mutant_strain: {
    id: 'ultimate_mutant_strain',
    name: '终极突变株',
    icon: '⚛️',
    description: '每关前2次蜕变免费，每次蜕变返还1变异素。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    flavor: '进化的尽头，是无限的可能性。',
  },

  gene_stabilizer: {
    id: 'gene_stabilizer',
    name: '基因稳定器',
    icon: '🔒',
    description: '解锁单词条蜕变（可只替换一个词条）。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    flavor: '稳定基因链，精准操控变异。',
  },

  fittest_survivors: {
    id: 'fittest_survivors',
    name: '适者生存',
    icon: '💪',
    description: '蜕变后的技能本关产出+20%。',
    rarity: 'epic',
    basePrice: 0,
    effects: [],
    flavor: '适者生存，强者愈强。',
  },

  // ── 蜕变师附魔遗物（原附魔子系统，现为蜕变师专属） ──

  enchant_dividend: {
    id: 'enchant_dividend',
    name: '附魔红利',
    icon: '💰',
    description: '触发已附魔的技能时，+2金币。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    flavor: '附魔之力化为真金白银。',
  },

  enchant_boost: {
    id: 'enchant_boost',
    name: '附魔增幅',
    icon: '✴️',
    description: '已附魔的技能产出+15%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    flavor: '魔力涌动，技能更强。',
  },

  rune_spike: {
    id: 'rune_spike',
    name: '符文尖刺',
    icon: '💎',
    description: '每个已附魔的装备技能提供 +3% 全局暴击率。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    flavor: '铭刻越多，锋芒越盛。',
  },

  apprentice_robe: {
    id: 'apprentice_robe',
    name: '学徒之袍',
    icon: '👘',
    description: '所有学徒型附魔的成长累积值×1.3。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    flavor: '穿上学徒之袍，感受魔力的加速流动。',
  },

  trial_badge: {
    id: 'trial_badge',
    name: '试炼徽章',
    icon: '🏅',
    description: '任务型附魔所需装备技能数-1（最低1）。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    flavor: '每一枚徽章，都是试炼的加速通行证。',
  },

  fate_fork: {
    id: 'fate_fork',
    name: '命运三岔',
    icon: '🔱',
    description: '附魔选择界面从2选1变为3选1。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    behaviorType: 'fate_fork',
    flavor: '命运的分岔路，多一条选择。',
  },

  greedy_inscription: {
    id: 'greedy_inscription',
    name: '贪婪铭刻',
    icon: '🩸',
    description: '附魔必定成功。但每拥有一个附魔，目标分数×2。',
    rarity: 'legendary',
    basePrice: 200,
    effects: [],
    behaviorType: 'greedy_inscription',
    flavor: '贪婪地刻下每一道铭文，代价是无尽的追赶。',
  },

  // ==================== 造词师专属遗物 ====================

  masters_lexicon: {
    id: 'masters_lexicon',
    name: '大师词典',
    icon: '📙',
    description: '获得时全字母碎片各+2，流水线能量需求-20%。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    flavor: '二十六个字母，足以书写万物。',
  },

  perpetual_queue: {
    id: 'perpetual_queue',
    name: '永动队列',
    icon: '♾️',
    description: '每关战斗开始时流水线自动推进2个槽位。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    flavor: '永不停歇的字母之轮。',
  },

  word_scissors: {
    id: 'word_scissors',
    name: '拆词剪刀',
    icon: '✂️',
    description: '可拆解已造词，返还所有碎片。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    flavor: '剪下一个词，重组一种可能。',
  },

  resonance_mold: {
    id: 'resonance_mold',
    name: '共鸣字模',
    icon: '🧩',
    description: '流水线中重复字母槽位能量需求-50%。',
    rarity: 'epic',
    basePrice: 0,
    effects: [],
    flavor: '每个字母都有平等的共鸣权。',
  },

  // ── 造词师词库遗物（原单词/词库子系统，现为造词师专属） ──

  word_collection: {
    id: 'word_collection',
    name: '词汇收藏',
    icon: '📚',
    description: '首次打出的单词+3金币。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    flavor: '每个新词都是一枚珍贵的收藏。',
  },

  thick_deck: {
    id: 'thick_deck',
    name: '词库丰收',
    icon: '📖',
    description: '词库每5个词，商店词包-1金币。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    flavor: '词海无涯，积少成多。',
  },

  long_word_crit: {
    id: 'long_word_crit',
    name: '长词蓄力',
    icon: '📏',
    description: '≥6 字母单词暴击率 +12%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    flavor: '越长的单词，爆发越猛。',
  },

  short_sprint: {
    id: 'short_sprint',
    name: '短词冲刺',
    icon: '🏃',
    description: '≤4字母单词技能产出+20%。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    flavor: '短小精悍，快步如飞。',
  },

  long_word_master: {
    id: 'long_word_master',
    name: '长词达人',
    icon: '📏',
    description: '6+字母单词完成时+1s。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    flavor: '长词之路，时间为伴。',
  },

  word_dealer: {
    id: 'word_dealer',
    name: '词语经销商',
    icon: '🤑',
    description: '出售词语时，下次刷新免费。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    behaviorType: 'word_dealer',
    flavor: '卖出一个词，赚回一次机会。',
  },

  punctuation_liberation: {
    id: 'punctuation_liberation',
    name: '标点解放',
    icon: '❗',
    description: '解锁 ;,./[] 六个标点键位可绑定技能，词语中随机混入标点符号。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    behaviorType: 'punctuation_liberation',
    flavor: '标点符号也有成为技能载体的权利。',
  },

  // ==================== 通用遗物：打字/输入系统 (Story 36.2) ====================

  decelerate_reward: {
    id: 'decelerate_reward',
    name: '减速津贴',
    icon: '🐢',
    description: '当前词用时比上个词长时，+0.5s 时间。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'typing',
    behaviorType: 'decelerate_reward',
    flavor: '慢下来，也有奖赏。',
  },

  accelerate_reward: {
    id: 'accelerate_reward',
    name: '加速奖金',
    icon: '💨',
    description: '当前词用时比上个词短时，+2 金币。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'typing',
    behaviorType: 'accelerate_reward',
    flavor: '快人一步，财源广进。',
  },

  little_helper: {
    id: 'little_helper',
    name: '小助手',
    icon: '🤖',
    description: '重复单词打完首字母后按 Tab 自动补全。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'typing',
    behaviorType: 'autocomplete',
    flavor: '这个词……我见过。',
  },

  rhythm_adapt: {
    id: 'rhythm_adapt',
    name: '节奏适应',
    icon: '🎵',
    description: '单词下方出现节拍条，按键时命中节拍球可使该次技能产出+30%。',
    rarity: 'epic',
    basePrice: 80,
    effects: [],
    subsystem: 'typing',
    behaviorType: 'rhythm_adapt',
    flavor: '踩准节拍，力量倍增。',
  },

  glass_cannon_v2: {
    id: 'glass_cannon_v2',
    name: '回归基本功',
    icon: '📖',
    description: '得分×10。获取时卖出所有技能，且不再能装备技能。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'typing',
    behaviorType: 'glass_cannon',
    category: 'risk-reward',
    flavor: '大道至简，唯手熟尔。',
  },

  // ==================== 通用遗物：连击/倍率系统 (Story 36.3) ====================


  combo_buffer: {
    id: 'combo_buffer',
    name: '余韵护盾',
    icon: '🛡️',
    description: 'combo 中断时保留 50%（向下取整）。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'combo',
    flavor: '缓冲之盾，守护连击的余韵。',
  },

  multiplier_prism: {
    id: 'multiplier_prism',
    name: '倍率棱镜',
    icon: '🔷',
    description: '倍率≥2.5时，技能产出+20%。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'combo',
    flavor: '棱镜折射，将倍率化为真实的力量。',
  },

  combo_detonator: {
    id: 'combo_detonator',
    name: '蓄势引爆',
    icon: '💣',
    description: 'combo 达 15 时随机触发 3 个装备技能。需 combo 归零后才能再次触发。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'combo',
    behaviorType: 'combo_detonator',
    flavor: '连击蓄满，引爆一切。',
  },

  cancel: {
    id: 'cancel',
    name: '取消连锁',
    icon: '⛓️‍💥',
    description: '新词出现0.4s内打对首字母="取消"。取消词零失误完成→连锁+1（上限5），每层技能产出+10%。取消词打错→连锁归零并扣0.5s。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'combo',
    behaviorType: 'cancel',
    flavor: '精准连锁，一击即碎。',
  },

  immortal_combo: {
    id: 'immortal_combo',
    name: '不断之链',
    icon: '🔗',
    description: 'combo 跨关不重置（打错仍会中断），每关初始时间变为当前 combo 数。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'combo',
    behaviorType: 'immortal_combo',
    category: 'risk-reward',
    flavor: '永不断裂的锁链，代价是禁锢的力量。',
  },

  fury_beat: {
    id: 'fury_beat',
    name: '暴走节拍',
    icon: '💢',
    description: 'combo ≥ 10 时，暴击率 +10%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'combo',
    flavor: '连击越高，拳头越硬。',
  },

  // ==================== 技能系统（词条制）遗物 ====================

  first_strike: {
    id: 'first_strike',
    name: '首发强化',
    icon: '⚡',
    description: '每个单词第一个技能触发，+10分。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'skill',
    flavor: '先发制人，一击致命。',
  },

  less_is_more: {
    id: 'less_is_more',
    name: '少而精',
    icon: '💎',
    description: '装备技能数量<10时，技能产出+20%。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'skill',
    flavor: '少即是多，精即是强。',
  },

  training_manual: {
    id: 'training_manual',
    name: '集训手册',
    icon: '📖',
    description: '获取时所有技能等级+1（上限Lv.3）。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'skill',
    behaviorType: 'training_manual',
    flavor: '翻开手册，技能突飞猛进。',
  },

  jazz: {
    id: 'jazz',
    name: '爵士乐',
    icon: '🎷',
    description: '一词内触发≥3种不同词条类型时，该词得分+10%×独特词条数。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'skill',
    behaviorType: 'jazz_diversity',
    flavor: '即兴演奏，多样生辉。',
  },

  uncrowned_king: {
    id: 'uncrowned_king',
    name: '无冕之王',
    icon: '👑',
    description: '普通稀有度技能产出+30%。',
    rarity: 'rare',
    basePrice: 50,
    effects: [],
    subsystem: 'skill',
    behaviorType: 'uncrowned_king',
    flavor: '不戴王冠，却统御一切。',
  },

  d_100: {
    id: 'd_100',
    name: 'D100',
    icon: '🎲',
    description: '拾取时以及每5场战斗，用随机词条替换所有装备技能的词条（保留数量/等级/附魔）。',
    rarity: 'legendary',
    basePrice: 200,
    effects: [],
    subsystem: 'skill',
    behaviorType: 'd_100',
    flavor: '掷骰决定一切。',
  },

  // ==================== 附魔系统遗物 → 已迁移至蜕变师专属遗物 ====================

  // ==================== 键盘拓扑系统遗物 (Story 36.6) ====================

  adjacent_power: {
    id: 'adjacent_power',
    name: '邻键之力',
    icon: '🤝',
    description: '技能触发时，每个相邻已装备技能使产出+6%。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'topology',
    flavor: '键盘上的邻居守望相助。',
  },

  corner_power: {
    id: 'corner_power',
    name: '角隅之力',
    icon: '🪞',
    description: '位于键盘角落(Q/P/Z/M)的技能产出+20%。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'topology',
    flavor: '角落虽小，蕴含着不可忽视的力量。',
  },

  row_switch: {
    id: 'row_switch',
    name: '换行奖励',
    icon: '↕️',
    description: '当前按键与上一个按键不在同一行时，+1金币。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'topology',
    flavor: '指尖在键盘行间跳跃，金币随之落下。',
  },

  line_clear: {
    id: 'line_clear',
    name: '消行满贯',
    icon: '🎖️',
    description: '命中某一行所有已装备技能(≥2)时「消行」——该行所有技能额外触发一次(50%产出)，跨词累积。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'topology',
    behaviorType: 'line_clear',
    flavor: '满行消除，爽快连锁。',
  },

  dual_concerto: {
    id: 'dual_concerto',
    name: '双手协奏',
    icon: '🎹',
    description: '每当交替击键（左右手切换）时，+0.5s时间。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'topology',
    behaviorType: 'hand_alternation',
    flavor: '双手在键盘上翩翩起舞。',
  },

  precision_strike: {
    id: 'precision_strike',
    name: '精准打击',
    icon: '🎯',
    description: '中间行（Home Row: ASDFGHJKL）按键暴击率 +10%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'topology',
    flavor: '最熟悉的位置，最致命的一击。',
  },

  // ==================== 单词/词库系统遗物 → 已迁移至造词师专属遗物 ====================

  key_storm: {
    id: 'key_storm',
    name: '全键风暴',
    icon: '⛈️',
    description: '得分×0.5。单词完成时，该词每命中1个技能，随机触发1个未被该词命中的已装备技能。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'topology',
    behaviorType: 'key_storm',
    flavor: '风暴席卷整个键盘，每个键都不会被遗忘。',
  },

  // ─── 资源系统遗物 (Story 36.8) ───

  production_dividend: {
    id: 'production_dividend',
    name: '产出分红',
    icon: '🪙',
    description: '技能每次产出资源时，5%概率+2金币。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'resource',
    flavor: '每一份产出，都有一丝回报。',
  },

  time_trickle: {
    id: 'time_trickle',
    name: '续命涓流',
    icon: '💧',
    description: '技能每次产出资源时，+0.05s时间。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'resource',
    flavor: '涓涓细流，延续生命。',
  },

  resource_focus: {
    id: 'resource_focus',
    name: '资源专精',
    icon: '🔬',
    description: '装备中数量最多的资源类型，该类型产出+25%。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'resource',
    flavor: '专注一道，事半功倍。',
  },

  resource_diversity: {
    id: 'resource_diversity',
    name: '多元投资',
    icon: '🌈',
    description: '装备技能覆盖≥3种不同资源类型时，所有技能产出+20%。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'resource',
    flavor: '不把鸡蛋放在一个篮子里。',
  },

  resource_tide: {
    id: 'resource_tide',
    name: '资源潮汐',
    icon: '🌊',
    description: '4词一个潮汐周期，依次底分→倍率→时间→金币各+80%。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'resource',
    behaviorType: 'resource_tide',
    flavor: '潮起潮落，资源交替涌来。',
  },

  universal_furnace: {
    id: 'universal_furnace',
    name: '万物熔炉',
    icon: '⚗️',
    description: '战斗结束时，超标分数+剩余时间→金币，但不获得基础通关金币。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'resource',
    flavor: '万物皆可熔炼为金。',
  },

  // ─── 商店系统遗物 (Story 36.9) ───

  discount_card: {
    id: 'discount_card',
    name: '折扣卡',
    icon: '🏷️',
    description: '所有商品价格-15%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'shop',
    flavor: '会员专享，永久优惠。',
  },

  recycle_expert: {
    id: 'recycle_expert',
    name: '回收专家',
    icon: '♻️',
    description: '出售技能时回收价+50%（50%→75%）。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'shop',
    flavor: '在别人眼中的废品，我看到的是财富。',
  },

  black_market: {
    id: 'black_market',
    name: '黑市门票',
    icon: '🎫',
    description: '商店+1商品位（保底稀有品质）。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'shop',
    behaviorType: 'black_market',
    flavor: '门票有价，机遇无价。',
  },

  gold_interest: {
    id: 'gold_interest',
    name: '金库利息',
    icon: '🏦',
    description: '每关开始时，获得当前金币10%的利息（上限20金币）。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'shop',
    flavor: '让钱生钱，是最古老的智慧。',
  },

  smuggle_pass: {
    id: 'smuggle_pass',
    name: '走私通道',
    icon: '🕳️',
    description: '每关可免费拿走最便宜的商品。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'shop',
    behaviorType: 'smuggle_pass',
    flavor: '暗道通幽，拿了就走。',
  },

  timed_auction: {
    id: 'timed_auction',
    name: '限时拍卖',
    icon: '🔔',
    description: '刷新免费，但商店有30秒倒计时。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'shop',
    behaviorType: 'timed_auction',
    flavor: '时间就是金钱，字面意义上的。',
  },

  // ─── 关卡进度系统遗物 (Story 36.10) ───

  warm_up: {
    id: 'warm_up',
    name: '暖身操',
    icon: '🏋️',
    description: '每关前10秒技能产出+10%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'stage',
    flavor: '开局先热身，产出翻一番。',
  },

  intermission: {
    id: 'intermission',
    name: '幕间准备',
    icon: '🔋',
    description: '休息关解锁「幕间补给」选项：+25金币、2次免费刷新。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'stage',
    flavor: '幕间休息，养精蓄锐。',
  },

  gamblers_creed: {
    id: 'gamblers_creed',
    name: '赌徒信条',
    icon: '🎲',
    description: '休息关解锁「赌一把」选项：押100金币，60%赢300。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'stage',
    flavor: '赌徒从不休息，只是换个赌桌。',
  },

  endurance_battery: {
    id: 'endurance_battery',
    name: '续航电池',
    icon: '🔌',
    description: '每关基础时间+10秒。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'stage',
    flavor: '充满电的战斗，永不断电。',
  },

  elite_hunter: {
    id: 'elite_hunter',
    name: '猎物悬赏',
    icon: '🎯',
    description: '每关随机分配一个悬赏任务，完成后获得金币奖励。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'stage',
    flavor: '赏金猎人的每一关都是新挑战。',
  },

  phoenix: {
    id: 'phoenix',
    name: '不死鸟',
    icon: '🐦‍🔥',
    description: '关卡失败后复活（时间重置10秒），消耗此遗物。精英/Boss关额外刷新修饰器。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'stage',
    behaviorType: 'phoenix',
    flavor: '浴火重生，涅槃一次。',
  },

  desperate_crit: {
    id: 'desperate_crit',
    name: '绝境暴击',
    icon: '🔥',
    description: '剩余时间 ≤ 5s 时，暴击率 +20%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'stage',
    flavor: '背水一战，绝处逢生。',
  },

  // ===== Boss修饰器系统遗物 (5) =====

  modifier_shield: {
    id: 'modifier_shield',
    name: '修饰器护盾',
    icon: '🧿',
    description: '所有修饰器的负面数值效果减弱25%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'boss_modifier',
    flavor: '削弱敌意，化险为夷。',
  },

  bounty_hunter: {
    id: 'bounty_hunter',
    name: '困境红利',
    icon: '🏴‍☠️',
    description: '每个永久修饰器使商店价格-5%（上限30%）。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'boss_modifier',
    flavor: '困难越多，折扣越大。',
  },

  modifier_pardon: {
    id: 'modifier_pardon',
    name: '赦免状',
    icon: '📜',
    description: 'Boss关选修饰器时可跳过1轮（每Boss一次）。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'boss_modifier',
    flavor: '陛下开恩，免去一罪。',
  },

  modifier_barrier: {
    id: 'modifier_barrier',
    name: '修饰器屏障',
    icon: '🚧',
    description: '精英/Boss关：临时修饰器延迟至完成前3个词后才生效。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'boss_modifier',
    behaviorType: 'modifier_barrier',
    flavor: '稳住前半场，后半场再战。',
  },

  chaos_roulette: {
    id: 'chaos_roulette',
    name: '混沌轮盘',
    icon: '🎰',
    description: 'Boss关中，每完成5个词随机替换一个活跃修饰器。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'boss_modifier',
    behaviorType: 'chaos_roulette',
    flavor: '转动命运之轮，拥抱混沌。',
  },

  modifier_reversal: {
    id: 'modifier_reversal',
    name: '修饰器反转',
    icon: '🔄',
    description: '关卡开始时，进攻/防御修饰器随机一个反转为增益，另一个数值翻倍。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'boss_modifier',
    behaviorType: 'modifier_reversal',
    flavor: '混乱中诞生秩序，或秩序中诞生混乱。',
  },

  // ===== 结算/评分系统 (scoring) =====

  base_shield: {
    id: 'base_shield',
    name: '基数护盾',
    icon: '🔰',
    description: '每词结算分数不低于 15 分（在 Boss 修饰器之后应用）。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'scoring',
    flavor: '再微小的光芒，也不会被黑暗完全吞噬。',
  },

  lenient_judge: {
    id: 'lenient_judge',
    name: '宽容评审',
    icon: '⚖️',
    description: '目标分数降低 10%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'scoring',
    flavor: '评审官今天心情不错。',
  },

  s_rank_trophy: {
    id: 's_rank_trophy',
    name: 'S 级奖杯',
    icon: '🏆',
    description: '战斗评级 S +25 金币、SS +50、SSS +100。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'scoring',
    flavor: '追求卓越，回报自来。',
  },

  underdog_bonus: {
    id: 'underdog_bonus',
    name: '及格万岁',
    icon: '🎓',
    description: '战斗评级 B 时 +40 金币，A 时 +20 金币。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'scoring',
    flavor: '不求出彩，但求过关。',
  },

  snowball: {
    id: 'snowball',
    name: '雪球效应',
    icon: '❄️',
    description: '本关每词得分递增 5%（第 1 词 +0%，第 2 词 +5%，第 3 词 +10%…）。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'scoring',
    behaviorType: 'snowball',
    flavor: '小雪球滚下山坡，变成了雪崩。',
  },

  score_black_hole: {
    id: 'score_black_hole',
    name: '致命礼物',
    icon: '🌀',
    description: '分数不自动结算，累计到隐藏池。按回车键一次性结算——达标通关并获得金币奖励（越接近目标分奖励越丰厚），未达标即失败。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'scoring',
    behaviorType: 'score_black_hole',
    flavor: '越是刀尖上跳舞，礼物越是丰厚。',
  },

  // ===== 暴击系统遗物 (crit) =====

  lucky_strike: {
    id: 'lucky_strike',
    name: '幸运一击',
    icon: '🍀',
    description: '所有技能获得 +8% 基础暴击率。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'crit',
    flavor: '有时候，运气也是实力。',
  },

  crit_bonus: {
    id: 'crit_bonus',
    name: '暴击奖金',
    icon: '⚡',
    description: '每次暴击时 +3 金币。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'crit',
    flavor: '暴击就是真金白银。',
  },

  crit_charge: {
    id: 'crit_charge',
    name: '暴击蓄力',
    icon: '🔋',
    description: '每 5 次非暴击技能触发后，下一次触发必定暴击。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'crit',
    flavor: '蓄势待发，一击必杀。',
  },

  crit_storm: {
    id: 'crit_storm',
    name: '暴击风暴',
    icon: '🌩️',
    description: '单词内触发 ≥2 次暴击时，该词所有技能产出额外 +50%。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'crit',
    behaviorType: 'crit_storm',
    flavor: '雷声隆隆，万物震颤。',
  },

  fate_coin: {
    id: 'fate_coin',
    name: '命运硬币',
    icon: '🪙',
    description: '暴击率上限锁定为 50%，超出部分转化为暴击倍数加成（每 1% 超出 = +2% 暴击倍数）。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'crit',
    behaviorType: 'fate_coin',
    flavor: '硬币的两面都是你的——只要你翻得够多。',
  },

  // ==================== 叠层子系统遗物 ====================

  // ── 系统内 ──

  stack_momentum: {
    id: 'stack_momentum',
    name: '层层递进',
    icon: '📶',
    description: '技能每触发一次叠层效果，该技能本关叠层间隔临时 -1（最低 1，每关重置）。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'stacking',
    behaviorType: 'stack_momentum',
    flavor: '第一下是试探，第二下是节奏，第三下是习惯。',
  },

  stack_dividend: {
    id: 'stack_dividend',
    name: '积少成多',
    icon: '🧱',
    description: '技能每累计 10 层，该技能本关产出永久 +5%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'stacking',
    behaviorType: 'stack_dividend',
    flavor: '每一块砖都是地基。',
  },

  overload_circuit: {
    id: 'overload_circuit',
    name: '过载电路',
    icon: '🔌',
    description: '叠层技能触发叠层效果时，额外触发所有相邻叠层技能一次（额外触发不叠层）。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'stacking',
    behaviorType: 'overload_circuit',
    flavor: '电流不问方向，只问通路。',
  },

  surge: {
    id: 'surge',
    name: '浪涌',
    icon: '🌊',
    description: '技能触发叠层效果时，层数归零。范围内匹配技能本次产出 +层数 × 10%。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'stacking',
    behaviorType: 'surge',
    flavor: '潮水退去时，才知道谁在裸泳。',
  },

  perpetual_engine: {
    id: 'perpetual_engine',
    name: '永动引擎',
    icon: '⚙️',
    description: '叠层不再每关重置。所有叠层间隔 ×2。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'stacking',
    behaviorType: 'perpetual_engine',
    flavor: '永恒的代价是缓慢——但永恒就是永恒。',
  },

  // ── 跨系统 ──

  drum_pass: {
    id: 'drum_pass',
    name: '击鼓传花',
    icon: '🥁',
    description: 'combo 每 +5 时，随机一个叠层技能 +3 层。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'combo',
    behaviorType: 'drum_pass',
    requiresSubsystem: 'stacking',
    flavor: '鼓声不停，花就不落。',
  },

  word_resonance: {
    id: 'word_resonance',
    name: '词根共振',
    icon: '📖',
    description: '完成单词时，所有叠层技能额外 +N 层（N = 字母数 ÷ 3，向下取整）。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'word',
    behaviorType: 'word_resonance',
    requiresSubsystem: 'stacking',
    flavor: '长词是沉默的鼓手。',
  },

  crit_overflow: {
    id: 'crit_overflow',
    name: '暴击溢层',
    icon: '⚡',
    description: '暴击时，被触发技能额外 +3 层。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'crit',
    behaviorType: 'crit_overflow',
    requiresSubsystem: 'stacking',
    flavor: '力量溢出的余波，也能推动齿轮。',
  },

  inscription_flow: {
    id: 'inscription_flow',
    name: '铭文涌流',
    icon: '📜',
    description: '已附魔技能触发叠层效果时，附魔成长额外 +2%。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'enchantment',
    behaviorType: 'inscription_flow',
    flavor: '铭文与叠层共振，笔墨自会加深。',
  },

  neighbor_watch: {
    id: 'neighbor_watch',
    name: '邻里守望',
    icon: '🏘️',
    description: '技能触发叠层效果时，相邻键位的叠层技能也 +1 层。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'topology',
    behaviorType: 'neighbor_watch',
    flavor: '守望相助，层层相传。',
  },

}

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
export const DELETED_RELIC_IDS = [
  'magnet', 'combo_badge', 'berserker_mask',
  'combo_crown', 'treasure_map', 'piggy_bank',
  'chain_amplifier', 'fortress', 'passive_mastery',
  'golden_keyboard', 'void_heart', 'rhyme_master',
  'keyboard_storm', 'time_lord', 'time_crystal',
  'mono_affix',
  'refining_lens', 'catalyst_injector', 'fragment_prism', 'abyss_eye',
  // 非职业专属遗物（已删除）
  'lucky_coin', 'phoenix_feather', 'overkill_blade',
  'glass_cannon', 'time_thief', 'greedy_hand', 'silence_vow', 'doomsday',
  'spark_core', 'forge_heart', 'chain_surge', 'stack_resonance',
  'perfect_rhythm', 'resource_flood',
  'home_advantage', 'ambidextrous', 'twin_bond', 'lone_wolf',
  'cornucopia', 'time_bank', 'ramen', 'overcharge',
  'campfire_ember', 'star_chart', 'entropy', 'schrodinger_dice',
  'perfectionist', 'chain_ban', 'no_enchant_vow', 'keyboard_flood',
  'pure_heart', 'minimalist',
  'echo_bell', 'storm_drum', 'finale',
  'affix_spectrum', 'legendary_aura', 'quest_momentum',
  'modifier_foresight',
  'typing_wax_seal',
  'rhythm_doctor',
  'early_awakening', 'enchant_anchor',
  'symmetry_pact', 'row_medal',
  'score_magnet', 'time_dew', 'resource_sense',
]
