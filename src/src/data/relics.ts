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
  stageType?: 'normal' | 'elite' | 'boss' | 'rest'
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

/** 遗物行为类型 — 标记需要自定义逻辑的遗物 */
export type RelicBehaviorType =
  // 打字/输入系统
  | 'error_forgive_first'  // 打字蜡封：每词首次错误免除
  | 'double_keystroke'     // 回声指套：正确击键概率算两次
  | 'autocomplete'         // 小助手：Tab 自动补全重复单词
  | 'rhythm_adapt'         // 节奏适应：根据单词用时给予不同奖励
  | 'glass_cannon'         // 玻璃大炮：得分×2，打错即死
  // 连击/倍率系统
  | 'combo_detonator'      // 连击引爆：combo 达阈值时触发技能
  | 'immortal_combo'       // 不灭连击：combo 永不中断，禁止 multiplier 产出
  // 技能系统
  | 'training_manual'      // 集训手册：一次性升级所有 Lv.1 技能
  | 'jazz_diversity'       // 爵士乐：一词内不同词条类型越多加分越高
  | 'uncrowned_king'       // 无冕之王：无附魔技能无限升级，禁止附魔
  // 附魔系统
  | 'fate_fork'            // 命运三岔：附魔选择变 3 选 1
  | 'early_awakening'      // 早期觉醒：Lv2 技能可获得附魔
  // 键盘拓扑系统
  | 'row_select'           // 行会勋章：选一行加成
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
}

/** 遗物槽位上限（F1-F12） */
export const MAX_RELIC_SLOTS = 12

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

  chaos_seed: {
    id: 'chaos_seed',
    name: '混沌种子',
    icon: '🌱',
    description: '每关开始时，给所有未附魔技能一个随机附魔（临时，关结束移除）。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    flavor: '混沌中播下的种子，总会结出意外的果实。',
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

  // ==================== 造词师专属遗物 ====================

  masters_lexicon: {
    id: 'masters_lexicon',
    name: '大师词典',
    icon: '📙',
    description: '获得时全字母碎片各+2，采集队列+2格。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    flavor: '二十六个字母，足以书写万物。',
  },

  perpetual_queue: {
    id: 'perpetual_queue',
    name: '永动队列',
    icon: '♾️',
    description: '每关战斗开始时自动采集一轮队列。',
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
    description: '造词时重复字母不收金币。',
    rarity: 'epic',
    basePrice: 0,
    effects: [],
    flavor: '每个字母都有平等的共鸣权。',
  },

  // ==================== 通用遗物：打字/输入系统 (Story 36.2) ====================

  typing_wax_seal: {
    id: 'typing_wax_seal',
    name: '打字蜡封',
    icon: '🕯️',
    description: '每词首次打错免除惩罚。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'typing',
    behaviorType: 'error_forgive_first',
    flavor: '蜡封之下，第一次失误悄然消融。',
  },

  echo_thimble: {
    id: 'echo_thimble',
    name: '回声指套',
    icon: '🧤',
    description: '正确击键时 8% 概率触发双重击键（combo+1，技能额外触发一次）。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'typing',
    behaviorType: 'double_keystroke',
    flavor: '指尖的余韵，化为第二次敲击。',
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
    description: '单词用时>3s加1秒时间；用时<3s该词得分+30%。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'typing',
    behaviorType: 'rhythm_adapt',
    flavor: '快与慢，皆有其奖赏。',
  },

  glass_cannon_v2: {
    id: 'glass_cannon_v2',
    name: '玻璃大炮',
    icon: '💥',
    description: '得分×2，打错即死。蜡封免除的错误不触发死亡。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'typing',
    behaviorType: 'glass_cannon',
    category: 'risk-reward',
    flavor: '一击之间，荣耀与毁灭并存。',
  },

  // ==================== 通用遗物：连击/倍率系统 (Story 36.3) ====================

  combo_buffer: {
    id: 'combo_buffer',
    name: '余韵护盾',
    icon: '🛡️',
    description: 'combo 中断时保留 30%（向下取整）。',
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

  rhythm_doctor: {
    id: 'rhythm_doctor',
    name: '节奏医生',
    icon: '⏱️',
    description: '每 10 combo +1s 时间。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'combo',
    flavor: '节奏即生命，连击即脉搏。',
  },

  combo_detonator: {
    id: 'combo_detonator',
    name: '蓄势引爆',
    icon: '💣',
    description: 'combo 达 15/30/45 时，随机触发 3 个装备技能。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'combo',
    behaviorType: 'combo_detonator',
    flavor: '连击蓄满，引爆一切。',
  },

  immortal_combo: {
    id: 'immortal_combo',
    name: '不断之链',
    icon: '🔗',
    description: 'combo 永不中断（跨关不重置），但技能不再产出 multiplier 资源。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'combo',
    behaviorType: 'immortal_combo',
    category: 'risk-reward',
    flavor: '永不断裂的锁链，代价是禁锢的力量。',
  },

  // ==================== 技能系统（词条制）遗物 ====================

  first_strike: {
    id: 'first_strike',
    name: '首发强化',
    icon: '⚡',
    description: '每个单词第一个技能触发，产出+20%。',
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
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'skill',
    flavor: '少即是多，精即是强。',
  },

  training_manual: {
    id: 'training_manual',
    name: '集训手册',
    icon: '📖',
    description: '获取时一次性升级所有Lv.1技能至Lv.2。',
    rarity: 'rare',
    basePrice: 80,
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
    description: '没有附魔的技能可以无限升级（Lv4+沿用+60%递增），但永远不能获得附魔。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'skill',
    behaviorType: 'uncrowned_king',
    category: 'risk-reward',
    flavor: '不戴王冠，却统御一切。',
  },

  // ==================== 附魔系统遗物 (Story 36.5) ====================

  apprentice_robe: {
    id: 'apprentice_robe',
    name: '学徒之袍',
    icon: '👘',
    description: '所有学徒型附魔的成长累积值×1.3。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'enchantment',
    flavor: '穿上学徒之袍，感受魔力的加速流动。',
  },

  trial_badge: {
    id: 'trial_badge',
    name: '试炼徽章',
    icon: '🏅',
    description: '所有试炼型附魔的堆叠进度×1.3。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'enchantment',
    flavor: '每一枚徽章，都是试炼的加速通行证。',
  },

  fate_fork: {
    id: 'fate_fork',
    name: '命运三岔',
    icon: '🔱',
    description: '附魔选择界面从2选1变为3选1。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'enchantment',
    behaviorType: 'fate_fork',
    flavor: '命运的分岔路，多一条选择。',
  },

  early_awakening: {
    id: 'early_awakening',
    name: '早期觉醒',
    icon: '🌅',
    description: '附魔触发条件从Lv3+放宽到Lv2+。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'enchantment',
    behaviorType: 'early_awakening',
    flavor: '黎明之光，提前唤醒沉睡的力量。',
  },

  enchant_anchor: {
    id: 'enchant_anchor',
    name: '附魔锚点',
    icon: '⚓',
    description: '所有技能附魔槽位+1，但每个已激活的附魔使商店所有商品价格+10%。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'enchantment',
    category: 'risk-reward',
    flavor: '锚定更多附魔，代价是日益攀升的物价。',
  },

  // ==================== 键盘拓扑系统遗物 (Story 36.6) ====================

  adjacent_power: {
    id: 'adjacent_power',
    name: '邻键之力',
    icon: '🤝',
    description: '技能触发时，每个相邻已装备技能使产出+6%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'topology',
    flavor: '键盘上的邻居守望相助。',
  },

  symmetry_pact: {
    id: 'symmetry_pact',
    name: '对称契约',
    icon: '🪞',
    description: '对称位两技能都装备时，各自产出+15%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'topology',
    flavor: '左右呼应，对称之美蕴含力量。',
  },

  row_medal: {
    id: 'row_medal',
    name: '行会勋章',
    icon: '🎖️',
    description: '选一行（QWER/ASDF/ZXCV），该行技能产出+25%。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'topology',
    behaviorType: 'row_select',
    flavor: '加入行会，享受专属加成。',
  },

  dual_concerto: {
    id: 'dual_concerto',
    name: '双手协奏',
    icon: '🎹',
    description: '每当交替击键（左右手切换）时，+0.5s时间。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'topology',
    behaviorType: 'hand_alternation',
    flavor: '双手在键盘上翩翩起舞。',
  },

  key_storm: {
    id: 'key_storm',
    name: '全键风暴',
    icon: '⛈️',
    description: '每关前3个单词完成时，随机触发3个未被该词命中的已装备技能。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'topology',
    behaviorType: 'key_storm',
    flavor: '风暴席卷整个键盘，每个键都不会被遗忘。',
  },

  // ==================== 单词/词库系统遗物 (Story 36.7) ====================

  word_collection: {
    id: 'word_collection',
    name: '词汇收藏',
    icon: '📚',
    description: '首次打出的单词+3金币。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'word',
    flavor: '每个新词都是一枚珍贵的收藏。',
  },

  short_sprint: {
    id: 'short_sprint',
    name: '短词冲刺',
    icon: '🏃',
    description: '≤4字母单词技能产出+20%。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'word',
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
    subsystem: 'word',
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
    subsystem: 'word',
    behaviorType: 'word_dealer',
    flavor: '卖出一个词，赚回一次机会。',
  },

  punctuation_liberation: {
    id: 'punctuation_liberation',
    name: '标点解放',
    icon: '❗',
    description: '解锁 ;,./ 四个标点键位可绑定技能，词语中随机混入标点符号。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'word',
    behaviorType: 'punctuation_liberation',
    flavor: '标点符号也有成为技能载体的权利。',
  },

  // ─── 资源系统遗物 (Story 36.8) ───

  score_magnet: {
    id: 'score_magnet',
    name: '分数磁铁',
    icon: '🧲',
    description: '每打一个字+1分数。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'resource',
    flavor: '分数自然被你吸引。',
  },

  resource_sense: {
    id: 'resource_sense',
    name: '资源感应',
    icon: '🔮',
    description: '一词内产出3+种资源，最少那种+50%。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'resource',
    flavor: '感知每一种资源的流动。',
  },

  time_dew: {
    id: 'time_dew',
    name: '时间露珠',
    icon: '💧',
    description: '每完成3个单词+1秒。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'resource',
    flavor: '三词一露，滴水成河。',
  },

  resource_tide: {
    id: 'resource_tide',
    name: '资源潮汐',
    icon: '🌊',
    description: '奇数词base+40%，偶数词multiplier+40%。',
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
    icon: '🔥',
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
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'shop',
    flavor: '在别人眼中的废品，我看到的是财富。',
  },

  black_market: {
    id: 'black_market',
    name: '黑市门票',
    icon: '🎫',
    description: '商店+1商品位（保底稀有品质）。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'shop',
    behaviorType: 'black_market',
    flavor: '门票有价，机遇无价。',
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
    icon: '⏳',
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
    description: '每关前10秒技能产出+40%。',
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
    description: '休息关额外获得+10金币和1次免费刷新。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'stage',
    flavor: '幕间休息，养精蓄锐。',
  },

  endurance_battery: {
    id: 'endurance_battery',
    name: '续航电池',
    icon: '🔌',
    description: '每关基础时间+10秒。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'stage',
    flavor: '充满电的战斗，永不断电。',
  },

  elite_hunter: {
    id: 'elite_hunter',
    name: '精英猎手',
    icon: '🎯',
    description: '精英关通关金币奖励翻倍。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'stage',
    flavor: '猎杀精英，双倍回报。',
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
    name: '赏金猎人',
    icon: '🏴‍☠️',
    description: '每个永久修饰器使通关金币+20%（加算）。',
    rarity: 'common',
    basePrice: 50,
    effects: [],
    subsystem: 'boss_modifier',
    flavor: '风险越大，赏金越高。',
  },

  modifier_barrier: {
    id: 'modifier_barrier',
    name: '修饰器屏障',
    icon: '🚧',
    description: '精英/Boss关开始时，第一个修饰器被无效化。每关仅一次。',
    rarity: 'rare',
    basePrice: 80,
    effects: [],
    subsystem: 'boss_modifier',
    behaviorType: 'modifier_barrier',
    flavor: '先发制人，挡住第一波。',
  },

  chaos_roulette: {
    id: 'chaos_roulette',
    name: '混沌轮盘',
    icon: '🎰',
    description: 'Boss关中，每完成5个词随机替换一个活跃修饰器。',
    rarity: 'epic',
    basePrice: 120,
    effects: [],
    subsystem: 'boss_modifier',
    behaviorType: 'chaos_roulette',
    flavor: '转动命运之轮，拥抱混沌。',
  },

  modifier_reversal: {
    id: 'modifier_reversal',
    name: '修饰器反转',
    icon: '🔄',
    description: '关卡开始时，随机一半修饰器反转为增益，另一半数值翻倍。',
    rarity: 'legendary',
    basePrice: 0,
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
    description: '每词结算分数不低于 20 分（在 Boss 修饰器之后应用）。',
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
    name: '分数黑洞',
    icon: '🌀',
    description: '单词完成后分数不自动结算，累计到隐藏池。按回车键一次性结算——达标即通关，未达标即失败。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    subsystem: 'scoring',
    behaviorType: 'score_black_hole',
    flavor: '万物坠入虚空，直到奇点爆发。',
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
  'chain_amplifier', 'fortress', 'passive_mastery', 'gamblers_creed',
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
]
