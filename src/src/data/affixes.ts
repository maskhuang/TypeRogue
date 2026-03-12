// ============================================
// 打字肉鸽 - 词条制技能系统 数据定义
// ============================================
// Story 35.1: 核心数据结构与词条定义
// 设计文档: docs/design/affix-skill-system.md

import type { ResourceType } from '../core/types'
import { PositionRelation } from './keyboardTopology'

// ===== 词条类型枚举（20 类，6 类别） =====

export enum AffixType {
  // ── 数值型 ──
  Multiply = 'multiply',
  Convert = 'convert',
  Rainbow = 'rainbow',
  // ── 节奏型 ──
  Charge = 'charge',
  Decay = 'decay',
  Pulse = 'pulse',
  Crit = 'crit',
  Cascade = 'cascade',
  // ── 键盘拓扑型 ──
  Void = 'void',
  Resonance = 'resonance',
  Mirror = 'mirror',
  // ── 触发链型 ──
  Link = 'link',
  Replicate = 'replicate',
  Amplify = 'amplify',
  // ── 单词感知型 ──
  Outcast = 'outcast',
  Gravity = 'gravity',
  Ligature = 'ligature',
  // ── 元规则型 ──
  Twin = 'twin',
  Recurse = 'recurse',
  Taboo = 'taboo',
}

// ===== 词条类别 =====

export type AffixCategory = 'numeric' | 'rhythm' | 'topology' | 'trigger_chain' | 'word_sense' | 'meta_rule'

export const AFFIX_CATEGORY_MAP: Record<AffixType, AffixCategory> = {
  [AffixType.Multiply]: 'numeric',
  [AffixType.Convert]: 'numeric',
  [AffixType.Rainbow]: 'numeric',
  [AffixType.Charge]: 'rhythm',
  [AffixType.Decay]: 'rhythm',
  [AffixType.Pulse]: 'rhythm',
  [AffixType.Crit]: 'rhythm',
  [AffixType.Cascade]: 'rhythm',
  [AffixType.Void]: 'topology',
  [AffixType.Resonance]: 'topology',
  [AffixType.Mirror]: 'topology',
  [AffixType.Link]: 'trigger_chain',
  [AffixType.Replicate]: 'trigger_chain',
  [AffixType.Amplify]: 'trigger_chain',
  [AffixType.Outcast]: 'word_sense',
  [AffixType.Gravity]: 'word_sense',
  [AffixType.Ligature]: 'word_sense',
  [AffixType.Twin]: 'meta_rule',
  [AffixType.Recurse]: 'meta_rule',
  [AffixType.Taboo]: 'meta_rule',
}

// ===== 附魔类型枚举（37 个枚举值） =====
// 溅射/衍生各为 1 个枚举值，posRel/资源变体在运行时处理

export enum EnchantmentType {
  // ── 溅射（1，运行时按 posRel 6 变体） ──
  Splash = 'splash',
  // ── 学徒型（12） ──
  ApprenticeSelf = 'apprentice_self',
  ApprenticeNeighbor = 'apprentice_neighbor',
  ApprenticeWord = 'apprentice_word',
  ApprenticeProc = 'apprentice_proc',
  ApprenticeCrit = 'apprentice_crit',
  ApprenticeOutcast = 'apprentice_outcast',
  ApprenticeLongWord = 'apprentice_longword',
  ApprenticePerfect = 'apprentice_perfect',
  ApprenticeCombo = 'apprentice_combo',
  ApprenticeStage = 'apprentice_stage',
  ApprenticeHarvest = 'apprentice_harvest',
  ApprenticeAdapt = 'apprentice_adapt',
  // ── 任务型（18，需技能拥有对应词条） ──
  QuestDevour = 'quest_devour',
  QuestOverload = 'quest_overload',
  QuestEcho = 'quest_echo',
  QuestAscend = 'quest_ascend',
  QuestChain = 'quest_chain',
  QuestPurify = 'quest_purify',
  QuestResonance = 'quest_resonance',
  QuestCharge = 'quest_charge',
  QuestRefine = 'quest_refine',
  QuestEnergize = 'quest_energize',
  QuestFission = 'quest_fission',
  QuestStack = 'quest_stack',
  QuestPolarize = 'quest_polarize',
  QuestSpectrum = 'quest_spectrum',
  QuestMirror = 'quest_mirror',
  QuestOverlap = 'quest_overlap',
  QuestIterate = 'quest_iterate',
  QuestSacrifice = 'quest_sacrifice',
  // ── 衍生型（1，运行时按 extraResource 7 变体） ──
  Transmute = 'transmute',
  // ── 被动型（职业限定，4） ──
  LetterAffinity = 'letter_affinity',
  Overflow = 'overflow',
  Unstable = 'unstable',
  MutationHunger = 'mutation_hunger',
  // ── 运算符（1） ──
  MultiplyOperator = 'multiply_operator',
}

// ===== 任务附魔 ↔ 词条映射 =====

export const QUEST_AFFIX_MAP: Partial<Record<EnchantmentType, AffixType | AffixType[]>> = {
  [EnchantmentType.QuestDevour]: AffixType.Void,
  [EnchantmentType.QuestOverload]: AffixType.Crit,
  [EnchantmentType.QuestEcho]: AffixType.Pulse,
  [EnchantmentType.QuestAscend]: AffixType.Multiply,
  [EnchantmentType.QuestChain]: AffixType.Cascade,
  [EnchantmentType.QuestPurify]: AffixType.Decay,
  [EnchantmentType.QuestResonance]: [AffixType.Resonance, AffixType.Link],
  [EnchantmentType.QuestCharge]: AffixType.Outcast,    // 蓄势→流放
  [EnchantmentType.QuestRefine]: AffixType.Convert,
  [EnchantmentType.QuestEnergize]: AffixType.Charge,    // 充能→蓄力
  [EnchantmentType.QuestFission]: AffixType.Replicate,
  [EnchantmentType.QuestStack]: AffixType.Amplify,
  [EnchantmentType.QuestPolarize]: AffixType.Gravity,
  [EnchantmentType.QuestSpectrum]: AffixType.Rainbow,
  [EnchantmentType.QuestMirror]: AffixType.Mirror,
  [EnchantmentType.QuestOverlap]: AffixType.Ligature,
  [EnchantmentType.QuestIterate]: AffixType.Recurse,
  [EnchantmentType.QuestSacrifice]: AffixType.Taboo,
}

// ===== 词条实例（运行时生成，已掷骰） =====

export interface AffixInstance {
  type: AffixType
  // 各类型的参数，按需填充
  multiplier?: number              // Multiply: 1.3~2.0
  source?: ResourceType            // Convert: 源资源
  k?: number                       // Convert: 系数（按源资源校准）
  gainPerSec?: number              // Charge: 每秒蓄力%
  maxBonus?: number                // Charge: 蓄力上限%
  initialMult?: number             // Decay: 初始乘数
  decayPerTrigger?: number         // Decay: 每次触发衰减量
  floor?: number                   // Decay: 衰减下限
  interval?: number                // Pulse: 间隔次数
  burstMult?: number               // Pulse: 爆发乘数
  chance?: number                  // Crit: 暴击概率
  critMult?: number                // Crit: 暴击乘数
  posRel?: PositionRelation        // Void/Resonance/Mirror/Link/Replicate/Amplify/Cascade
  bonusPerSlot?: number            // Void: 每空位加成%
  efficiency?: number              // Resonance: 触发效率%
  resource?: ResourceType          // Link/Amplify: 关联资源
  valuePerStack?: number           // Amplify: 每层加成%
  cascadeMult?: number             // Cascade: 级联乘数
  bonusPercent?: number            // Outcast: 首尾字母加成% / Taboo: +100% 固定
  probMult?: number                // Gravity: 单词出现概率倍率（0~2）
  recurseChance?: number           // Recurse: 重触发概率 15%~30%
  penaltyChance?: number           // Taboo: 负产出概率 10%
}

// ===== 稀有度 =====

export type SkillRarity = 0 | 1 | 2 | 3

export const RARITY_NAMES: Record<SkillRarity, string> = {
  0: '普通',
  1: '稀有',
  2: '史诗',
  3: '传说',
}

export const RARITY_COLORS: Record<SkillRarity, string> = {
  0: '#ffffff',  // 白
  1: '#4488ff',  // 蓝
  2: '#a855f7',  // 紫
  3: '#ff8800',  // 橙
}

// ===== 技能实例（词条制） =====

export interface AffixSkillInstance {
  id: string
  name: string
  icon: string
  resource: ResourceType
  baseValues: [number, number, number]  // Lv1/2/3 加算基础值
  level: number                          // 1-3
  rarity: SkillRarity                    // 词条数量
  affixes: AffixInstance[]               // 0~3 个词条
  enchantmentIds: string[]               // 附魔列表（通常 0~1；双生词条时最多 2）
  purchasePrice?: number                 // 购买价格（用于转卖计算）
}

// ===== 技能运行时状态（战斗中） =====

export interface SkillRuntimeState {
  skillId: string
  // ── 词条状态 ──
  chargeAccumulated: number        // 蓄力: 当前蓄力百分比
  currentDecayMult: number         // 衰减: 当前衰减乘数（每词重置）
  mirrorCopiedAffix: AffixInstance | null  // 倒影: 每关刷新时复制的词条
  triggerCount: number             // 脉冲: 触发计数
  amplifyStacks: number            // 增幅: 当前增幅层数（每关重置）
  // ── 附魔状态 ──
  apprenticeAccumulated: number    // 学徒(含丰收/适应): 永久成长累积%
  questStacks: number              // 任务: 当前叠层进度
  questCompletions: number         // 任务: 已完成次数（= 词条增强层数）
}

// ===== 存档数据 =====

export interface AffixSkillSaveData {
  id: string
  resource: ResourceType
  level: number
  rarity: SkillRarity
  affixes: AffixInstance[]
  enchantmentIds: string[]
  runtime: SkillRuntimeState
}

// ===== 常量表 =====

/** 基底值：7 种资源 × 3 等级 */
export const BASE_VALUES: Record<ResourceType, [number, number, number]> = {
  base:       [5, 8, 12],
  score:      [15, 24, 36],
  multiplier: [0.2, 0.32, 0.48],
  time:       [0.2, 0.32, 0.48],
  gold:       [3, 5, 8],
  fragment:   [1, 1.6, 2.4],
  mutagen:    [1, 1.6, 2.4],
}

/** 词条权重键：所有 AffixType（除 Convert 拆为 cross/self） */
export type AffixWeightKey = Exclude<AffixType, AffixType.Convert> | 'convert_cross' | 'convert_self'

/** 词条权重表（转化拆分异源/同源，生成时按 source === resource 判断） */
export const AFFIX_WEIGHTS: Record<AffixWeightKey, number> = {
  [AffixType.Multiply]: 4,
  convert_cross: 10,    // 异源转化
  convert_self: 3,      // 同源转化
  [AffixType.Rainbow]: 6,
  [AffixType.Charge]: 6,
  [AffixType.Decay]: 6,
  [AffixType.Pulse]: 6,
  [AffixType.Crit]: 8,
  [AffixType.Cascade]: 4,
  [AffixType.Void]: 10,
  [AffixType.Resonance]: 4,
  [AffixType.Mirror]: 3,
  [AffixType.Link]: 4,
  [AffixType.Replicate]: 3,
  [AffixType.Amplify]: 3,
  [AffixType.Outcast]: 6,
  [AffixType.Gravity]: 5,
  [AffixType.Ligature]: 6,
  [AffixType.Twin]: 2,
  [AffixType.Recurse]: 3,
  [AffixType.Taboo]: 4,
}

/** 虚无词条 bonusPerSlot 按 PositionRelation */
export const VOID_BONUS_TABLE: Record<PositionRelation, number> = {
  [PositionRelation.Adjacent]: 0.25,
  [PositionRelation.SameRow]: 0.10,
  [PositionRelation.SameColumn]: 0.30,
  [PositionRelation.SameHand]: 0.05,
  [PositionRelation.SameFinger]: 0.35,
  [PositionRelation.Symmetric]: 0.50,
}

/** 共鸣词条 efficiency 按 PositionRelation */
export const RESONANCE_EFFICIENCY_TABLE: Record<PositionRelation, number> = {
  [PositionRelation.Adjacent]: 0.50,
  [PositionRelation.SameRow]: 0.30,
  [PositionRelation.SameColumn]: 0.40,
  [PositionRelation.SameHand]: 0.15,
  [PositionRelation.SameFinger]: 0.50,
  [PositionRelation.Symmetric]: 0.60,
}

/** 转化词条 k 值校准表：[k_min, k_max] */
export const CONVERT_K_TABLE: Record<ResourceType, [number, number]> = {
  base:       [0.02, 0.05],
  score:      [0.0005, 0.001],
  multiplier: [0.10, 0.25],
  time:       [0.01, 0.025],
  gold:       [0.003, 0.008],
  fragment:   [0.02, 0.05],
  mutagen:    [0.02, 0.05],
}

// ===== 自动命名 =====

export const AFFIX_NAMES: Record<AffixType, string> = {
  [AffixType.Multiply]: '强化',
  [AffixType.Convert]: '转化',
  [AffixType.Rainbow]: '彩虹',
  [AffixType.Charge]: '蓄力',
  [AffixType.Decay]: '衰减',
  [AffixType.Pulse]: '脉冲',
  [AffixType.Crit]: '暴击',
  [AffixType.Cascade]: '级联',
  [AffixType.Void]: '虚无',
  [AffixType.Resonance]: '共鸣',
  [AffixType.Mirror]: '倒影',
  [AffixType.Link]: '连接',
  [AffixType.Replicate]: '复制',
  [AffixType.Amplify]: '增幅',
  [AffixType.Outcast]: '流放',
  [AffixType.Gravity]: '引力',
  [AffixType.Ligature]: '连字',
  [AffixType.Twin]: '双生',
  [AffixType.Recurse]: '递归',
  [AffixType.Taboo]: '禁忌',
}

/** 词条功能说明（玩家可读） */
export const AFFIX_DESCRIPTIONS: Record<AffixType, string> = {
  [AffixType.Multiply]: '产出直接乘以倍率',
  [AffixType.Convert]: '读取一种资源的当前值，按系数加成本资源产出',
  [AffixType.Rainbow]: '每次触发时随机选择一种资源类型产出',
  [AffixType.Charge]: '未触发时持续蓄力，触发时释放加成',
  [AffixType.Decay]: '每个单词首次触发加成最高，逐次衰减，换词重置',
  [AffixType.Pulse]: '每隔固定次数触发一次爆发',
  [AffixType.Crit]: '触发时有概率暴击',
  [AffixType.Cascade]: '上一个按键与当前键满足指定位置关系时，产出倍增',
  [AffixType.Void]: '范围内空位越多加成越高',
  [AffixType.Resonance]: '范围内技能触发时，本技能以指定效率被动触发',
  [AffixType.Mirror]: '每关开始时复制一个范围内技能的随机词条',
  [AffixType.Link]: '范围内技能产出指定资源时，本技能自动触发',
  [AffixType.Replicate]: '按键时同时触发范围内技能',
  [AffixType.Amplify]: '每次触发叠一层，与范围内同资源增幅技能共享层数加成',
  [AffixType.Outcast]: '单词首尾字母触发时获得额外加成',
  [AffixType.Gravity]: '调整含本键字母的单词出现概率',
  [AffixType.Ligature]: '字母在当前单词中重复出现时，按出现次数倍增产出',
  [AffixType.Twin]: '获得附魔时同时获得两个（而非二选一）',
  [AffixType.Recurse]: '触发后有概率再次触发',
  [AffixType.Taboo]: '大幅提升产出，但有小概率产出负值',
}

export const RESOURCE_NAMES: Record<ResourceType, string> = {
  base: '基数',
  score: '分数',
  multiplier: '倍率',
  time: '时间',
  gold: '金币',
  fragment: '碎片',
  mutagen: '变异素',
}

/** 稀有度掷骰概率 */
export const RARITY_PROBABILITIES: [number, number, number, number] = [0.40, 0.30, 0.20, 0.10]

// ===== 衍生附魔比率表（per-resource） =====

/** 衍生附魔每种额外资源的产出比率（设计文档 §4.5 衍生附魔表） */
export const TRANSMUTE_RATIO_TABLE: Record<ResourceType, number> = {
  base:       0.30,
  score:      0.30,
  multiplier: 0.10,
  time:       0.20,
  gold:       0.20,
  fragment:   0.15,
  mutagen:    0.15,
}

// ===== 乘算化运算符校准表（per-resource） =====

/** 乘算化附魔：将加算层各项 bonus 转为独立乘数时的校准系数（初始全 1.0，后续平衡调优） */
export const MULTIPLY_OPERATOR_CALIBRATION: Record<ResourceType, number> = {
  base:       1.0,
  score:      1.0,
  multiplier: 1.0,
  time:       1.0,
  gold:       1.0,
  fragment:   1.0,
  mutagen:    1.0,
}

// ===== 学徒·观摩 growthPerProc 按 PositionRelation =====

export const APPRENTICE_NEIGHBOR_GROWTH: Record<PositionRelation, number> = {
  [PositionRelation.Adjacent]: 0.015,
  [PositionRelation.SameRow]: 0.01,
  [PositionRelation.SameColumn]: 0.02,
  [PositionRelation.SameHand]: 0.005,
  [PositionRelation.SameFinger]: 0.025,
  [PositionRelation.Symmetric]: 0.03,
}

// ===== 溅射附魔定义（1 类型 × 6 posRel 变体） =====

export interface SplashEnchantmentDef {
  posRel: PositionRelation
  name: string
}

export const SPLASH_ENCHANTMENT_DEFS: SplashEnchantmentDef[] = [
  { posRel: PositionRelation.Adjacent,  name: '溅射·相邻' },
  { posRel: PositionRelation.SameRow,   name: '溅射·同行' },
  { posRel: PositionRelation.SameColumn, name: '溅射·同列' },
  { posRel: PositionRelation.SameHand,  name: '溅射·同手' },
  { posRel: PositionRelation.SameFinger, name: '溅射·同指' },
  { posRel: PositionRelation.Symmetric, name: '溅射·对称' },
]

// ===== 职业限定附魔 =====

export const CLASS_RESTRICTED_ENCHANTMENTS: Record<string, EnchantmentType[]> = {
  wordsmith: [EnchantmentType.ApprenticeHarvest, EnchantmentType.LetterAffinity, EnchantmentType.Overflow],
  metamorph: [EnchantmentType.ApprenticeAdapt, EnchantmentType.Unstable, EnchantmentType.MutationHunger],
}

/** 所有职业限定附魔的集合（用于快速查找） */
const ALL_CLASS_RESTRICTED = new Set<EnchantmentType>(
  Object.values(CLASS_RESTRICTED_ENCHANTMENTS).flat(),
)

/**
 * 按职业过滤附魔候选列表。
 * - 无职业：排除所有职业限定附魔
 * - 有职业：排除非本职业的限定附魔，保留本职业的
 */
export function filterEnchantmentsByClass(
  candidates: EnchantmentType[],
  playerClass?: string,
): EnchantmentType[] {
  if (!playerClass) {
    return candidates.filter(e => !ALL_CLASS_RESTRICTED.has(e))
  }
  const allowed = CLASS_RESTRICTED_ENCHANTMENTS[playerClass] ?? []
  const allowedSet = new Set(allowed)
  return candidates.filter(e => !ALL_CLASS_RESTRICTED.has(e) || allowedSet.has(e))
}

// ===== 事件类型（学徒/任务附魔可监听） =====

export type AffixEventId =
  | 'selfTrigger' | 'neighborTrigger' | 'wordComplete'
  | 'affixProc' | 'affixProc:pulse' | 'affixProc:cascade' | 'affixProc:recurse' | 'affixProc:taboo_penalty'
  | 'critHit' | 'outcastProc'
  | 'longWord:6' | 'perfectWord' | 'comboReach:15'
  | 'stageCleared' | 'mutationApplied'

// ===== 任务附魔定义 =====

export interface QuestEnchantmentDef {
  type: EnchantmentType
  name: string
  targetAffix: AffixType | AffixType[]
  event: AffixEventId
  targetStacks: number
  effectDesc: string
}

export const QUEST_ENCHANTMENT_DEFS: QuestEnchantmentDef[] = [
  { type: EnchantmentType.QuestDevour, name: '吞噬', targetAffix: AffixType.Void, event: 'selfTrigger', targetStacks: 15, effectDesc: 'bonusPerSlot +5%' },
  { type: EnchantmentType.QuestOverload, name: '过载', targetAffix: AffixType.Crit, event: 'critHit', targetStacks: 8, effectDesc: 'critMult +0.5' },
  { type: EnchantmentType.QuestEcho, name: '回响', targetAffix: AffixType.Pulse, event: 'affixProc:pulse', targetStacks: 6, effectDesc: 'burstMult +0.3' },
  { type: EnchantmentType.QuestAscend, name: '升华', targetAffix: AffixType.Multiply, event: 'perfectWord', targetStacks: 3, effectDesc: 'multiplier +0.15' },
  { type: EnchantmentType.QuestChain, name: '连锁', targetAffix: AffixType.Cascade, event: 'affixProc:cascade', targetStacks: 6, effectDesc: 'cascadeMult +0.2' },
  { type: EnchantmentType.QuestPurify, name: '净化', targetAffix: AffixType.Decay, event: 'comboReach:15', targetStacks: 3, effectDesc: 'floor -0.05 (min 0.1)' },
  { type: EnchantmentType.QuestResonance, name: '共振', targetAffix: [AffixType.Resonance, AffixType.Link], event: 'neighborTrigger', targetStacks: 20, effectDesc: 'efficiency +8%' },
  { type: EnchantmentType.QuestCharge, name: '蓄势', targetAffix: AffixType.Outcast, event: 'outcastProc', targetStacks: 10, effectDesc: 'bonusPercent +15%' },
  { type: EnchantmentType.QuestRefine, name: '精炼', targetAffix: AffixType.Convert, event: 'selfTrigger', targetStacks: 15, effectDesc: 'k ×1.1' },
  { type: EnchantmentType.QuestEnergize, name: '充能', targetAffix: AffixType.Charge, event: 'wordComplete', targetStacks: 5, effectDesc: 'maxBonus +0.3' },
  { type: EnchantmentType.QuestFission, name: '裂变', targetAffix: AffixType.Replicate, event: 'longWord:6', targetStacks: 5, effectDesc: '额外触发 +1 邻居' },
  { type: EnchantmentType.QuestStack, name: '层叠', targetAffix: AffixType.Amplify, event: 'selfTrigger', targetStacks: 25, effectDesc: 'valuePerStack +0.005' },
  { type: EnchantmentType.QuestPolarize, name: '极化', targetAffix: AffixType.Gravity, event: 'wordComplete', targetStacks: 8, effectDesc: '|probMult−1| +0.15' },
  { type: EnchantmentType.QuestSpectrum, name: '光谱', targetAffix: AffixType.Rainbow, event: 'selfTrigger', targetStacks: 20, effectDesc: '随机权重偏向最低资源 +15%/层' },
  { type: EnchantmentType.QuestMirror, name: '映射', targetAffix: AffixType.Mirror, event: 'stageCleared', targetStacks: 1, effectDesc: '复制参数 ×1.1/层' },
  { type: EnchantmentType.QuestOverlap, name: '重叠', targetAffix: AffixType.Ligature, event: 'selfTrigger', targetStacks: 15, effectDesc: '连字 N 上限 +1/层' },
  { type: EnchantmentType.QuestIterate, name: '迭代', targetAffix: AffixType.Recurse, event: 'affixProc:recurse', targetStacks: 5, effectDesc: 'recurseChance +3%/层' },
  { type: EnchantmentType.QuestSacrifice, name: '献祭', targetAffix: AffixType.Taboo, event: 'affixProc:taboo_penalty', targetStacks: 3, effectDesc: 'penaltyChance -1%/层 (min 2%)' },
]

// ===== 旧系统技能识别（存档迁移用）=====

/** 旧系统技能 ID 前缀（Epic 19/34: Producer/Converter/Connector/Amplifier） */
export const OLD_SKILL_PREFIXES = ['prod_', 'conv_', 'conn_', 'amp_']

/** 检查是否为 Epic 19/34 旧系统技能（按前缀匹配） */
export function isOldSystemSkill(id: string): boolean {
  return OLD_SKILL_PREFIXES.some(prefix => id.startsWith(prefix))
}

// ===== 工厂函数：创建默认运行时状态 =====

export function createSkillRuntimeState(skillId: string): SkillRuntimeState {
  return {
    skillId,
    chargeAccumulated: 0,
    currentDecayMult: 1,        // 中性乘数（衰减词条每词重置为 initialMult）
    mirrorCopiedAffix: null,
    triggerCount: 0,
    amplifyStacks: 0,
    apprenticeAccumulated: 0,
    questStacks: 0,
    questCompletions: 0,
  }
}
