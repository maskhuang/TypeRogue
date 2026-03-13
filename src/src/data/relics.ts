// ============================================
// 打字肉鸽 - 遗物数据
// ============================================
// Story 5.4 Task 2: 遗物数据定义

import type { Modifier, PipelineContext } from '../systems/modifiers/ModifierTypes'

// === 遗物类型定义（从 RelicTypes.ts 迁入） ===

export type RelicRarity = 'common' | 'rare' | 'legendary'

export type RelicEffectType =
  | 'battle_start'     // 战斗开始时触发
  | 'battle_end'       // 战斗结束时触发
  | 'on_word_complete' // 完成词语时触发
  | 'on_skill_trigger' // 技能触发时
  | 'on_error'         // 打错时触发
  | 'passive'          // 持续被动效果

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

export type RelicConditionType =
  | 'combo_threshold'   // 连击阈值

export interface RelicCondition {
  type: RelicConditionType
  threshold: number
}

export interface RelicEffect {
  type: RelicEffectType
  modifier: RelicModifierType
  value: number
  condition?: RelicCondition
}

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
}

/** 遗物槽位上限 */
export const MAX_RELIC_SLOTS = 10

/**
 * 所有遗物数据
 */
export const RELICS: Record<string, RelicData> = {
  // ==================== 普通遗物 ====================

  lucky_coin: {
    id: 'lucky_coin',
    name: '幸运硬币',
    icon: '🍀',
    description: '商店价格降低 10%',
    rarity: 'common',
    basePrice: 25,
    effects: [
      { type: 'passive', modifier: 'price_discount', value: 0.1 }
    ],
    flavor: '据说这枚硬币总是正面朝上。'
  },

  // ==================== 稀有遗物 ====================

  phoenix_feather: {
    id: 'phoenix_feather',
    name: '凤凰羽毛',
    icon: '🪶',
    description: '打错时 30% 概率保护连击',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'on_error', modifier: 'combo_protection', value: 0.3 }
    ],
    flavor: '涅槃重生，连击不灭。'
  },

  overkill_blade: {
    id: 'overkill_blade',
    name: '超杀之刃',
    icon: '🔪',
    description: '超杀得分转化为额外金币',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'battle_end', modifier: 'gold_flat', value: 0 } // 实际金币 = state.overkill，硬编码在 shop/battle 中
    ],
    flavor: '一击的余波化为金币的叮当声。'
  },

  // ==================== 风险回报遗物 ====================

  glass_cannon: {
    id: 'glass_cannon',
    name: '玻璃大炮',
    icon: '💣',
    description: '技能得分 ×3，但打错即本关失败',
    rarity: 'rare',
    basePrice: 40,
    category: 'risk-reward',
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 3.0 },
      { type: 'on_error', modifier: 'instant_fail', value: 1 }
    ],
    flavor: '要么完美，要么毁灭。'
  },

  time_thief: {
    id: 'time_thief',
    name: '时间窃贼',
    icon: '⏰',
    description: '技能触发 +0.3 秒，但基础时间减半',
    rarity: 'rare',
    basePrice: 45,
    category: 'risk-reward',
    effects: [
      { type: 'on_skill_trigger', modifier: 'time_steal', value: 0.3 },
      { type: 'battle_start', modifier: 'time_halve', value: 0.5 }
    ],
    flavor: '偷来的时间，总有代价。'
  },

  greedy_hand: {
    id: 'greedy_hand',
    name: '贪婪之手',
    icon: '🤑',
    description: '金币 ×1.5，但商店价格 +50%',
    rarity: 'rare',
    basePrice: 50,
    category: 'risk-reward',
    effects: [
      { type: 'battle_end', modifier: 'gold_multiplier', value: 1.5 },
      { type: 'passive', modifier: 'price_increase', value: 1.5 }
    ],
    flavor: '贪婪者索取一切，却付出更多。'
  },

  silence_vow: {
    id: 'silence_vow',
    name: '沉默誓约',
    icon: '🤫',
    description: '无技能时得分 ×5，但无法装备技能',
    rarity: 'legendary',
    basePrice: 80,
    category: 'risk-reward',
    effects: [
      { type: 'on_word_complete', modifier: 'score_multiplier', value: 5.0 },
      { type: 'passive', modifier: 'skill_lock', value: 1 }
    ],
    flavor: '沉默之中，文字本身就是力量。'
  },

  doomsday: {
    id: 'doomsday',
    name: '末日倒计时',
    icon: '☢️',
    description: '每关 +30 秒，但每过一关 -5 秒基础时间',
    rarity: 'legendary',
    basePrice: 70,
    category: 'risk-reward',
    effects: [
      { type: 'battle_start', modifier: 'time_bonus', value: 30 },
      { type: 'battle_start', modifier: 'time_penalty', value: -5 }
    ],
    flavor: '末日的钟声越来越近。'
  },

  // ==================== T1 条件加成遗物 ====================

  spark_core: {
    id: 'spark_core',
    name: '点火核心',
    icon: '🧨',
    description: '装备 ≥3 个产出者时，产出者产出 +20%',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 0.20 }
    ],
    flavor: '产出者越多，火花越烈。'
  },

  forge_heart: {
    id: 'forge_heart',
    name: '熔炉之心',
    icon: '⚗️',
    description: '拥有转化词条的技能触发时，产出 +15%',
    rarity: 'common',
    basePrice: 25,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 0.15 }
    ],
    flavor: '熔炉的心脏为转化注入力量。'
  },

  chain_surge: {
    id: 'chain_surge',
    name: '链路增压',
    icon: '🧲',
    description: '连接词条被动触发时，被触发技能产出 +25%',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 0.25 }
    ],
    flavor: '传导的能量在链路中不断增压。'
  },

  stack_resonance: {
    id: 'stack_resonance',
    name: '层叠共鸣',
    icon: '⚜️',
    description: '增幅词条叠层 ≥15 时，技能产出 +10%',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 0.10 }
    ],
    flavor: '层叠至极，共鸣自生。'
  },

  perfect_rhythm: {
    id: 'perfect_rhythm',
    name: '完美韵律',
    icon: '🎶',
    description: '无错误完成词语时，恢复该词 50% 消耗时间',
    rarity: 'common',
    basePrice: 30,
    effects: [
      { type: 'on_word_complete', modifier: 'time_bonus', value: 0.5 }
    ],
    flavor: '完美的节奏，时间也为之回溯。'
  },

  resource_flood: {
    id: 'resource_flood',
    name: '资源洪流',
    icon: '🌈',
    description: '单词内产出 ≥3 种资源时，该词得分 +20%',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'on_word_complete', modifier: 'score_multiplier', value: 0.20 }
    ],
    flavor: '资源汇流成河，奖励随之倾泻。'
  },

  // ==================== T5 空间策略遗物 ====================

  home_advantage: {
    id: 'home_advantage',
    name: '主行优势',
    icon: '🏠',
    description: '主行（ASDFGHJKL）键位的技能，每次触发产出 +30%',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 1.30 }
    ],
    flavor: '家的位置，就是力量的源泉。'
  },

  ambidextrous: {
    id: 'ambidextrous',
    name: '双手兼备',
    icon: '🤲',
    description: '一词中左手侧和右手侧均触发过技能时，该词结算得分 +30%',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      { type: 'on_word_complete', modifier: 'score_multiplier', value: 0.30 }
    ],
    flavor: '左右平衡，方能兼济天下。'
  },

  twin_bond: {
    id: 'twin_bond',
    name: '成双成对',
    icon: '👯',
    description: '恰好两个相邻的技能触发时，该技能产出 +25%',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 1.25 }
    ],
    flavor: '一双无间，胜过千军。'
  },

  lone_wolf: {
    id: 'lone_wolf',
    name: '独狼',
    icon: '🐺',
    description: '孤立技能（无相邻技能）触发时，该技能产出 ×1.8',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 1.80 }
    ],
    flavor: '独行者，无需同伴。'
  },

  // ==================== T6 经济遗物 ====================

  cornucopia: {
    id: 'cornucopia',
    name: '聚宝盆',
    icon: '🧧',
    description: '每关开始时获得 +15 金币',
    rarity: 'common',
    basePrice: 25,
    effects: [
      { type: 'battle_start', modifier: 'gold_flat', value: 15 }
    ],
    flavor: '盆中自有黄金来。'
  },

  time_bank: {
    id: 'time_bank',
    name: '时间银行',
    icon: '💳',
    description: '通关剩余时间转化为等量金币（1秒=1金币）',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      { type: 'battle_end', modifier: 'gold_flat', value: 0 }
    ],
    flavor: '时间就是金钱，字面意义上的。'
  },

  // ==================== T7 风险回报遗物 ====================

  ramen: {
    id: 'ramen',
    name: '拉面',
    icon: '🍜',
    description: '快速完词(<2s) 得分 +30%，慢速(>4s) 得分 -20%',
    rarity: 'rare',
    basePrice: 45,
    category: 'risk-reward',
    effects: [
      { type: 'on_word_complete', modifier: 'score_multiplier', value: 1.3 }
    ],
    flavor: '趁热吃，凉了就不好吃了。'
  },

  overcharge: {
    id: 'overcharge',
    name: '过载核心',
    icon: '🔋',
    description: '稀有(蓝)及以上技能效果 +50%，但每次触发 -0.1s 时间',
    rarity: 'rare',
    basePrice: 50,
    category: 'risk-reward',
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 1.5 },
      { type: 'on_skill_trigger', modifier: 'time_steal', value: -0.1 }
    ],
    flavor: '过度充能，燃烧时间。'
  },

  // ==================== T2 累积成长遗物 (Story 28.2) ====================

  campfire_ember: {
    id: 'campfire_ember',
    name: '篝火余烬',
    icon: '🏕️',
    description: '每购买 1 个技能，得分 +5%（幕结束重置）',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'passive', modifier: 'score_multiplier', value: 1.05 },
    ],
    flavor: '余烬尚温，趁热打铁。'
  },

  star_chart: {
    id: 'star_chart',
    name: '星图罗盘',
    icon: '🧭',
    description: '每获得 1 个附魔，得分永久 +8%',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      { type: 'passive', modifier: 'score_multiplier', value: 1.08 },
    ],
    flavor: '每一次附魔，都是新的星辰。'
  },

  entropy: {
    id: 'entropy',
    name: '熵增',
    icon: '🌑',
    description: '资源产出 +30%，每过 1 关 -5%，归零时消失',
    rarity: 'rare',
    basePrice: 45,
    category: 'risk-reward',
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 1.30 },
    ],
    flavor: '一切终将归于混沌。'
  },

  schrodinger_dice: {
    id: 'schrodinger_dice',
    name: '薛定谔骰子',
    icon: '🎭',
    description: '得分 ×1.25，每关结束 50% 翻倍 / 50% 消失',
    rarity: 'rare',
    basePrice: 50,
    category: 'risk-reward',
    effects: [
      { type: 'passive', modifier: 'score_multiplier', value: 1.25 },
    ],
    flavor: '不打开盒子，你永远不知道。'
  },

  // ==================== 传说遗物 ====================

  perfectionist: {
    id: 'perfectionist',
    name: '完美主义者',
    icon: '💯',
    description: '得分 ×2，但断连击时永久失去此遗物',
    rarity: 'legendary',
    basePrice: 120,
    effects: [
      { type: 'passive', modifier: 'score_multiplier', value: 2.0 },
    ],
    flavor: '只有完美，才配得上这份荣耀。'
  },

  // ==================== T4 规则改造遗物 (Story 30.2) ====================

  chain_ban: {
    id: 'chain_ban',
    name: '链式禁令',
    icon: '⛓️',
    description: '技能产出 +30%，但触发链词条（连接/复制/共鸣）被禁用',
    rarity: 'legendary',
    basePrice: 80,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 1.30 },
    ],
    flavor: '斩断锁链，力量才能自由流动。',
  },

  no_enchant_vow: {
    id: 'no_enchant_vow',
    name: '无附魔戒律',
    icon: '🚫',
    description: '技能产出 +40%，但无法获得新附魔',
    rarity: 'legendary',
    basePrice: 80,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 1.40 },
    ],
    flavor: '放弃附魔的诱惑，换取纯粹的力量。',
  },

  keyboard_flood: {
    id: 'keyboard_flood',
    name: '键盘洪水',
    icon: '⌨️',
    description: '≥15 技能时产出 +25%，但无法升级/附魔',
    rarity: 'legendary',
    basePrice: 100,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 1.25 },
      { type: 'passive', modifier: 'max_skill_level', value: 1 },
    ],
    flavor: '洪水席卷键盘，数量即是力量。',
  },

  pure_heart: {
    id: 'pure_heart',
    name: '纯粹之心',
    icon: '❤️',
    description: '白装技能效果 ×3，但只能使用白装（0 词条）',
    rarity: 'legendary',
    basePrice: 100,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 3.0 },
    ],
    flavor: '纯粹的心灵，产出无穷的力量。',
  },

  minimalist: {
    id: 'minimalist',
    name: '极简主义',
    icon: '🔲',
    description: '最多 5 技能全 Lv3，词结算 ×2',
    rarity: 'legendary',
    basePrice: 100,
    effects: [
      { type: 'passive', modifier: 'max_skill_level', value: 3 },
      { type: 'passive', modifier: 'max_skill_count', value: 5 },
    ],
    flavor: '少即是多，精即是强。',
  },

  // === T3 重触发遗物 ===
  echo_bell: {
    id: 'echo_bell',
    name: '回响之铃',
    icon: '🎐',
    description: '每词第一个技能触发两次',
    rarity: 'rare',
    basePrice: 50,
    effects: [],
    flavor: '风铃轻响，余音绕梁。',
  },
  storm_drum: {
    id: 'storm_drum',
    name: '风暴战鼓',
    icon: '🥁',
    description: '稀有(黄)及以上技能触发两次',
    rarity: 'rare',
    basePrice: 55,
    effects: [],
    flavor: '鼓声震天，万物生长。',
  },
  finale: {
    id: 'finale',
    name: '终幕',
    icon: '🎬',
    description: '连击≥20时技能触发两次',
    rarity: 'legendary',
    basePrice: 100,
    effects: [],
    flavor: '当高潮来临，一切都要再来一次。',
  },

  // ==================== 词条制专属遗物 (Story 35.12) ====================

  affix_spectrum: {
    id: 'affix_spectrum',
    name: '词条光谱',
    icon: '🪬',
    description: '每拥有 1 种不同词条类型，全技能产出 +3%',
    rarity: 'rare',
    basePrice: 55,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 0.03 }
    ],
    flavor: '色彩越丰富，光谱越耀眼。'
  },

  legendary_aura: {
    id: 'legendary_aura',
    name: '传说气场',
    icon: '👑',
    description: '每拥有 1 个传说(红)技能，全技能产出 +8%',
    rarity: 'rare',
    basePrice: 60,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 0.08 }
    ],
    flavor: '传说的气息弥漫在每一次触发中。'
  },

  quest_momentum: {
    id: 'quest_momentum',
    name: '任务动力',
    icon: '🪄',
    description: '每完成 1 次任务附魔，全技能产出 +2%',
    rarity: 'rare',
    basePrice: 50,
    effects: [
      { type: 'on_skill_trigger', modifier: 'score_multiplier', value: 0.02 }
    ],
    flavor: '每一个达成的目标，都化为持续的动力。'
  },


  // ==================== 职业初始遗物（占位） ====================
  // Story 32.1: 占位定义，具体效果在 Story 32.7 / 32.10 实现

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
  // Story 32.10: 6 个新遗物

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
    description: '每关结束时随机一个未附魔技能获随机附魔。',
    rarity: 'rare',
    basePrice: 60,
    effects: [],
    flavor: '混沌中播下的种子，总会结出意外的果实。',
  },

  fittest_survivors: {
    id: 'fittest_survivors',
    name: '适者生存',
    icon: '💪',
    description: '蜕变后的技能本关产出+20%。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    flavor: '适者生存，强者愈强。',
  },

  // ==================== 造词师专属遗物 ====================
  // Story 32.7: 6 个新遗物（学徒笔记效果在 RelicPipeline.initRelicState 中实现）

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
    rarity: 'rare',
    basePrice: 60,
    effects: [],
    flavor: '剪下一个词，重组一种可能。',
  },

  resonance_mold: {
    id: 'resonance_mold',
    name: '共鸣字模',
    icon: '🧩',
    description: '造词时重复字母不收金币。',
    rarity: 'legendary',
    basePrice: 0,
    effects: [],
    flavor: '每个字母都有平等的共鸣权。',
  },

}

// === Relic Modifier 工厂类型 ===
export type RelicModifierFactory = (
  relicId: string,
  context?: PipelineContext,
) => Modifier[]

// === 工具函数 ===
function relicMod(
  relicId: string,
  id: string,
  trigger: Modifier['trigger'],
  phase: Modifier['phase'],
  overrides: Partial<Modifier> = {},
): Modifier {
  return {
    id: `relic:${relicId}:${id}`,
    source: `relic:${relicId}`,
    sourceType: 'relic',
    layer: 'base',
    trigger,
    phase,
    priority: 200,
    ...overrides,
  }
}

// === RELIC_MODIFIER_DEFS — 每个遗物的 Modifier 工厂 ===
// 注意：加法效果用 base 层（baseSum += value），乘法效果用 global 层（globalProduct *= value）
export const RELIC_MODIFIER_DEFS: Record<string, RelicModifierFactory> = {
  // 行为型遗物：返回空数组，通过 queryRelicFlag 查询
  lucky_coin: () => [],
  // 完美主义者：得分 ×2（global 层），断连击时失去遗物（behavior）
  perfectionist: (id) => [
    relicMod(id, 'score', 'on_word_complete', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 2.0, stacking: 'multiplicative' },
    }),
    relicMod(id, 'lose', 'on_combo_break', 'after', {
      behavior: { type: 'remove_relic', relicId: 'perfectionist' },
    }),
  ],

  // 凤凰羽毛：打错时 50% 概率保护连击（代码行为为准）
  // 使用 after 阶段以被 BehaviorExecutor 收集
  phoenix_feather: (id) => [
    relicMod(id, 'protect', 'on_error', 'after', {
      behavior: { type: 'combo_protect', probability: 0.5 },
    }),
  ],

  // 超杀之刃：overkill 分数转金币
  overkill_blade: (id, ctx) => [
    relicMod(id, 'gold', 'on_battle_end', 'calculate', {
      effect: { type: 'gold', value: Math.max(0, ctx?.overkill ?? 0), stacking: 'additive' },
    }),
  ],


  // === 风险回报遗物 ===

  // 玻璃大炮：score ×3（增益） + 打错即失败（代价）
  glass_cannon: (id) => [
    relicMod(id, 'score', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 3.0, stacking: 'multiplicative' },
    }),
    relicMod(id, 'fail', 'on_error', 'after', {
      behavior: { type: 'instant_fail' },
    }),
  ],

  // 时间窃贼：技能触发 +0.3s（增益），基础时间减半通过 queryRelicFlag
  time_thief: (id) => [
    relicMod(id, 'time', 'on_skill_trigger', 'after', {
      behavior: { type: 'time_steal', timeBonus: 0.3 },
    }),
  ],

  // 贪婪之手：金币 ×1.5（增益），价格 +50% 通过 queryRelicFlag
  greedy_hand: (id) => [
    relicMod(id, 'gold', 'on_battle_end', 'calculate', {
      layer: 'global',
      effect: { type: 'gold', value: 1.5, stacking: 'multiplicative' },
    }),
  ],

  // 沉默誓约：无技能时 on_word_complete multiply +4（→ bonusMult=5 → 最终分 ×5），技能锁定通过 queryRelicFlag
  silence_vow: (id) => [
    relicMod(id, 'multiply', 'on_word_complete', 'calculate', {
      effect: { type: 'multiply', value: 4.0, stacking: 'additive' },
      condition: { type: 'no_skills_equipped' },
    }),
  ],

  // 末日倒计时：+30s 时间（增益），递增时间扣减通过 queryRelicFlag
  doomsday: (id) => [
    relicMod(id, 'time', 'on_battle_start', 'calculate', {
      effect: { type: 'time', value: 30, stacking: 'additive' },
    }),
  ],

  // === T1 条件加成遗物 ===

  // 点火核心：≥3 产出者时产出者产出 +20%（global 层乘法，双条件）
  spark_core: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.20, stacking: 'multiplicative' },
      condition: { type: 'is_producer_and_count_gte', value: 3 },
    }),
  ],

  // 熔炉之心：拥有转化词条的技能触发时 +15%（global 层乘法）
  forge_heart: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.15, stacking: 'multiplicative' },
      condition: { type: 'skill_has_affix', affixType: 'convert' },
    }),
  ],

  // 链路增压：连接词条被动触发时 +25%（global 层乘法）
  chain_surge: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.25, stacking: 'multiplicative' },
      condition: { type: 'is_affix_chain_trigger' },
    }),
  ],

  // 层叠共鸣：增幅词条叠层 ≥15 时，受影响技能 +10%（global 层乘法）
  stack_resonance: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.10, stacking: 'multiplicative' },
      condition: { type: 'affix_amplify_stacks_gte', value: 15 },
    }),
  ],

  // 完美韵律：无错误完成词语时恢复 50% 消耗时间（behavior 型）
  perfect_rhythm: (id) => [
    relicMod(id, 'refund', 'on_word_complete', 'after', {
      behavior: { type: 'time_refund', ratio: 0.5 },
      condition: { type: 'word_perfect' },
    }),
  ],

  // 资源洪流：单词内产出 ≥3 种资源时，该词分数 +20%（bonusMult 加算）
  resource_flood: (id) => [
    relicMod(id, 'boost', 'on_word_complete', 'calculate', {
      effect: { type: 'multiply', value: 0.20, stacking: 'additive' },
      condition: { type: 'word_resource_types_gte', value: 3 },
    }),
  ],

  // === T5 空间策略遗物 ===

  // 主行优势：主行键位技能触发 +30%（global 层乘法）
  home_advantage: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.30, stacking: 'multiplicative' },
      condition: { type: 'is_home_row' },
    }),
  ],

  // 双手兼备：左右手都触发过技能时，词结算 bonusMult +0.30
  ambidextrous: (id) => [
    relicMod(id, 'boost', 'on_word_complete', 'calculate', {
      effect: { type: 'multiply', value: 0.30, stacking: 'additive' },
      condition: { type: 'both_hands_triggered' },
    }),
  ],

  // 成双成对：配对技能（连通分量=2）触发 +25%（global 层乘法）
  twin_bond: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.25, stacking: 'multiplicative' },
      condition: { type: 'is_in_pair' },
    }),
  ],

  // 独狼：孤立技能触发 ×1.8（global 层乘法）
  lone_wolf: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.80, stacking: 'multiplicative' },
      condition: { type: 'is_isolated' },
    }),
  ],

  // === T6 经济遗物 ===

  // 聚宝盆：每关开始 +15 金币（base 层加法）
  cornucopia: (id) => [
    relicMod(id, 'gold', 'on_battle_start', 'calculate', {
      effect: { type: 'gold', value: 15, stacking: 'additive' },
    }),
  ],

  // 时间银行：通关剩余时间转金币（动态值，参考 overkill_blade）
  time_bank: (id, ctx) => [
    relicMod(id, 'gold', 'on_battle_end', 'calculate', {
      effect: { type: 'gold', value: Math.floor(ctx?.remainingTime ?? 0), stacking: 'additive' },
    }),
  ],

  // === T7 风险回报遗物 ===

  // 拉面：快速完词 +30%（<2s），慢速 -20%（>4s），条件型无状态
  ramen: (id) => [
    relicMod(id, 'fast', 'on_word_complete', 'calculate', {
      effect: { type: 'multiply', value: 0.3, stacking: 'additive' },
      condition: { type: 'word_time_lt', value: 2 },
    }),
    relicMod(id, 'slow', 'on_word_complete', 'calculate', {
      effect: { type: 'multiply', value: -0.2, stacking: 'additive' },
      condition: { type: 'word_time_gt', value: 4 },
    }),
  ],

  // === T2 累积成长遗物 (Story 28.2) ===

  // 篝火余烬：购买技能累积 +5%（幕重置），on_word_complete multiply 加算
  campfire_ember: (id, ctx) => {
    const count = ctx?.relicStates?.['campfire_ember'] ?? 0
    if (count <= 0) return []
    return [
      relicMod(id, 'boost', 'on_word_complete', 'calculate', {
        effect: { type: 'multiply', value: count * 0.05, stacking: 'additive' },
      }),
    ]
  },

  // 星图罗盘：附魔累积 +8%（永久），on_word_complete multiply 加算
  star_chart: (id, ctx) => {
    const count = ctx?.relicStates?.['star_chart'] ?? 0
    if (count <= 0) return []
    return [
      relicMod(id, 'boost', 'on_word_complete', 'calculate', {
        effect: { type: 'multiply', value: count * 0.08, stacking: 'additive' },
      }),
    ]
  },

  // 熵增：资源产出 +30%（衰减），on_skill_trigger global 层 score 乘算
  entropy: (id, ctx) => {
    const pct = ctx?.relicStates?.['entropy'] ?? 30
    if (pct <= 0) return []
    return [
      relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
        layer: 'global',
        effect: { type: 'score', value: 1 + pct / 100, stacking: 'multiplicative' },
      }),
    ]
  },

  // 薛定谔骰子：动态倍率（初始 ×1.25，每关 50% 翻倍 / 50% 消失）
  schrodinger_dice: (id, ctx) => {
    const mult = ctx?.relicStates?.['schrodinger_dice'] ?? 1.25
    if (mult <= 1.0) return []
    return [
      relicMod(id, 'boost', 'on_word_complete', 'calculate', {
        effect: { type: 'multiply', value: mult - 1.0, stacking: 'additive' },
      }),
    ]
  },

  // 过载核心：蓝装及以上 +50%（global 层），每次触发 -0.1s（time_steal 行为）
  overcharge: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.50, stacking: 'multiplicative' },
      condition: { type: 'skill_rarity_gte', value: 1 },
    }),
    relicMod(id, 'time_cost', 'on_skill_trigger', 'after', {
      behavior: { type: 'time_steal', timeBonus: -0.1 },
      condition: { type: 'skill_rarity_gte', value: 1 },
    }),
  ],

  // === T4 规则改造遗物 (Story 30.2) ===

  // 链式禁令：score ×1.30（global 层），连接者锁通过 RELIC_FLAGS
  chain_ban: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.30, stacking: 'multiplicative' },
    }),
  ],

  // 无附魔戒律：score ×1.40（global 层），附魔锁通过 RELIC_FLAGS
  no_enchant_vow: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.40, stacking: 'multiplicative' },
    }),
  ],

  // 键盘洪水：≥15 技能时 score ×1.25（global 层条件型），enchant_lock + max_skill_level=1 通过 RELIC_FLAGS
  keyboard_flood: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 1.25, stacking: 'multiplicative' },
      condition: { type: 'total_skills_gte', value: 15 },
    }),
  ],

  // 纯粹之心：白装(rarity=0) score ×3（global 层条件型），white_only 通过 RELIC_FLAGS
  // 注意：条件 rarity>=0 意为"仅 affix 技能"（旧系统技能默认 rarity=-1 不满足）。
  // white_only flag 阻止获取非白装，因此实际效果等同于"仅白装 ×3"。
  pure_heart: (id) => [
    relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
      layer: 'global',
      effect: { type: 'score', value: 3.0, stacking: 'multiplicative' },
      condition: { type: 'skill_rarity_gte', value: 0 },
    }),
  ],

  // 极简主义：词结算 ×2（on_word_complete multiply +1.0），max_skill_count + max_skill_level 通过 RELIC_FLAGS
  minimalist: (id) => [
    relicMod(id, 'multiply', 'on_word_complete', 'calculate', {
      effect: { type: 'multiply', value: 1.0, stacking: 'additive' },
    }),
  ],

  // === T3 重触发遗物 ===
  // 回响之铃：本词第一个技能触发时重触发
  echo_bell: (id) => [
    relicMod(id, 'retrigger', 'on_skill_trigger', 'after', {
      behavior: { type: 'retrigger' },
      condition: { type: 'skills_triggered_this_word', value: 0 },
    }),
  ],

  // 风暴战鼓：稀有(黄)及以上技能触发时重触发
  storm_drum: (id) => [
    relicMod(id, 'retrigger', 'on_skill_trigger', 'after', {
      behavior: { type: 'retrigger' },
      condition: { type: 'skill_rarity_gte', value: 2 },
    }),
  ],

  // 终幕：连击≥20时重触发
  finale: (id) => [
    relicMod(id, 'retrigger', 'on_skill_trigger', 'after', {
      behavior: { type: 'retrigger' },
      condition: { type: 'combo_gte', value: 20 },
    }),
  ],

  // === 词条制专属遗物 (Story 35.12) ===

  // 词条光谱：每种不同词条类型 → 全技能 +3%（动态计数，on_skill_trigger score 加算）
  affix_spectrum: (id, ctx) => {
    if (ctx?.relicStates?.['_affix_type_count'] != null) {
      const count = ctx.relicStates['_affix_type_count']
      if (count <= 0) return []
      return [
        relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
          effect: { type: 'score', value: count * 0.03, stacking: 'additive' },
        }),
      ]
    }
    return []
  },

  // 传说气场：每个传说(红)技能 → 全技能 +8%（动态计数）
  legendary_aura: (id, ctx) => {
    const count = ctx?.relicStates?.['_legendary_count'] ?? 0
    if (count <= 0) return []
    return [
      relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
        effect: { type: 'score', value: count * 0.08, stacking: 'additive' },
      }),
    ]
  },

  // 任务动力：累计 questCompletions 总和 → 全技能 +2%（动态计数）
  quest_momentum: (id, ctx) => {
    const total = ctx?.relicStates?.['_quest_completions_total'] ?? 0
    if (total <= 0) return []
    return [
      relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
        effect: { type: 'score', value: total * 0.02, stacking: 'additive' },
      }),
    ]
  },


}

// === T4 限制 Flag 映射表 ===
// flag name → 设置该 flag 的遗物 ID 列表（Story 30-2 填充具体遗物）
export const RELIC_FLAGS: Record<string, string[]> = {
  connector_lock: ['chain_ban'],                    // 禁用连接者（旧系统兼容）
  chain_affix_lock: ['chain_ban'],                  // 禁用触发链词条（连接/复制/共鸣）
  enchant_lock: ['no_enchant_vow', 'keyboard_flood'], // 禁用附魔
  max_skill_level: ['keyboard_flood', 'minimalist'],  // 限制技能等级上限
  producer_only: ['pure_heart'],                    // 仅允许产出者（旧系统兼容）
  white_only: ['pure_heart'],                       // 仅允许白装（rarity=0）
  max_skill_count: ['minimalist'],                  // 限制技能数量上限
}

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
]
