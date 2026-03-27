// ============================================
// 打字肉鸽 - 词条制技能系统 数据定义
// ============================================
// Story 35.1: 核心数据结构与词条定义
// 设计文档: docs/design/affix-skill-system.md

import type { ResourceType } from '../core/types'
import { PositionRelation } from './keyboardTopology'

// ===== 词条类型枚举（20 类，6 类别） ====
// Replicate 已合并入 Splash
// Story 41.2: Multiply 已删除，被 Conduit 替代

export enum AffixType {
  // ── 数值型 ──
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
  Splash = 'splash',
  Amplify = 'amplify',
  Conduit = 'conduit',
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
  [AffixType.Splash]: 'trigger_chain',
  [AffixType.Amplify]: 'trigger_chain',
  [AffixType.Conduit]: 'trigger_chain',
  [AffixType.Outcast]: 'word_sense',
  [AffixType.Gravity]: 'word_sense',
  [AffixType.Ligature]: 'word_sense',
  [AffixType.Twin]: 'meta_rule',
  [AffixType.Recurse]: 'meta_rule',
  [AffixType.Taboo]: 'meta_rule',
}

// ===== 附魔类型枚举（46 个枚举值） =====
// 3 通用学徒 + 5 资源专精 + 20 悟道·词条 + 17 任务型 + 1 运算符 = 46

export enum EnchantmentType {
  // ── 学徒型（3 通用 + 5 资源专精） ──
  ApprenticeSelf = 'apprentice_self',
  ApprenticeNeighbor = 'apprentice_neighbor',
  ApprenticeProc = 'apprentice_proc',
  ApprenticeResBase = 'apprentice_res_base',
  ApprenticeResScore = 'apprentice_res_score',
  ApprenticeResMultiplier = 'apprentice_res_multiplier',
  ApprenticeResTime = 'apprentice_res_time',
  ApprenticeResGold = 'apprentice_res_gold',
  // ── 悟道·词条型（20，对应词条被触发时成长） ──
  ApprenticeAffixConvert = 'apprentice_affix_convert',
  ApprenticeAffixRainbow = 'apprentice_affix_rainbow',
  ApprenticeAffixCharge = 'apprentice_affix_charge',
  ApprenticeAffixDecay = 'apprentice_affix_decay',
  ApprenticeAffixPulse = 'apprentice_affix_pulse',
  ApprenticeAffixCrit = 'apprentice_affix_crit',
  ApprenticeAffixCascade = 'apprentice_affix_cascade',
  ApprenticeAffixVoid = 'apprentice_affix_void',
  ApprenticeAffixResonance = 'apprentice_affix_resonance',
  ApprenticeAffixMirror = 'apprentice_affix_mirror',
  ApprenticeAffixLink = 'apprentice_affix_link',
  ApprenticeAffixSplash = 'apprentice_affix_splash',
  ApprenticeAffixAmplify = 'apprentice_affix_amplify',
  ApprenticeAffixConduit = 'apprentice_affix_conduit',
  ApprenticeAffixOutcast = 'apprentice_affix_outcast',
  ApprenticeAffixGravity = 'apprentice_affix_gravity',
  ApprenticeAffixLigature = 'apprentice_affix_ligature',
  ApprenticeAffixTwin = 'apprentice_affix_twin',
  ApprenticeAffixRecurse = 'apprentice_affix_recurse',
  ApprenticeAffixTaboo = 'apprentice_affix_taboo',
  // ── 任务型（18，需技能拥有对应词条） ──
  QuestDevour = 'quest_devour',
  QuestOverload = 'quest_overload',
  QuestEcho = 'quest_echo',
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
  QuestTwin = 'quest_twin',
  QuestConduit = 'quest_conduit',
  // ── 运算符（1） ──
  MultiplyOperator = 'multiply_operator',
}

// ===== 任务附魔 ↔ 词条映射 =====

export const QUEST_AFFIX_MAP: Partial<Record<EnchantmentType, AffixType | AffixType[]>> = {
  [EnchantmentType.QuestDevour]: AffixType.Void,
  [EnchantmentType.QuestOverload]: AffixType.Crit,
  [EnchantmentType.QuestEcho]: AffixType.Pulse,
  [EnchantmentType.QuestChain]: AffixType.Cascade,
  [EnchantmentType.QuestPurify]: AffixType.Decay,
  [EnchantmentType.QuestResonance]: [AffixType.Resonance, AffixType.Link],
  [EnchantmentType.QuestCharge]: AffixType.Outcast,    // 蓄势→流放
  [EnchantmentType.QuestRefine]: AffixType.Convert,
  [EnchantmentType.QuestEnergize]: AffixType.Charge,    // 充能→蓄力
  [EnchantmentType.QuestFission]: AffixType.Splash,
  [EnchantmentType.QuestStack]: AffixType.Amplify,
  [EnchantmentType.QuestPolarize]: AffixType.Gravity,
  [EnchantmentType.QuestSpectrum]: AffixType.Rainbow,
  [EnchantmentType.QuestMirror]: AffixType.Mirror,
  [EnchantmentType.QuestOverlap]: AffixType.Ligature,
  [EnchantmentType.QuestIterate]: AffixType.Recurse,
  [EnchantmentType.QuestSacrifice]: AffixType.Taboo,
  [EnchantmentType.QuestTwin]: AffixType.Twin,
  [EnchantmentType.QuestConduit]: AffixType.Conduit,
}

// ===== 附魔元数据（非任务类附魔的显示信息） =====

export interface EnchantmentMeta {
  type: EnchantmentType
  name: string
  icon: string
  category: 'apprentice' | 'quest' | 'transmute' | 'passive' | 'operator'
  desc: string
  /** 衍生附魔目标资源（仅 Transmute 类使用） */
  transmuteResource?: ResourceType
}

export const ENCHANTMENT_META: Record<string, EnchantmentMeta> = {
  // ── 学徒型（12） ──
  [EnchantmentType.ApprenticeSelf]:     { type: EnchantmentType.ApprenticeSelf,     name: '学徒·自修', icon: '📖', category: 'apprentice', desc: '每次自身触发时永久成长 +1%' },
  [EnchantmentType.ApprenticeNeighbor]: { type: EnchantmentType.ApprenticeNeighbor, name: '学徒·观摩', icon: '👀', category: 'apprentice', desc: '范围内技能触发时永久成长' },
  [EnchantmentType.ApprenticeProc]:     { type: EnchantmentType.ApprenticeProc,     name: '学徒·悟道', icon: '💡', category: 'apprentice', desc: '词条特效触发时永久成长 +3%' },
  // ── 资源专精型（5） ──
  [EnchantmentType.ApprenticeResBase]:       { type: EnchantmentType.ApprenticeResBase,       name: '专精·基数', icon: '🔢', category: 'apprentice', desc: '产出基数资源时永久成长 +2%' },
  [EnchantmentType.ApprenticeResScore]:      { type: EnchantmentType.ApprenticeResScore,      name: '专精·分数', icon: '🏅', category: 'apprentice', desc: '产出分数资源时永久成长 +2%' },
  [EnchantmentType.ApprenticeResMultiplier]: { type: EnchantmentType.ApprenticeResMultiplier, name: '专精·倍率', icon: '📈', category: 'apprentice', desc: '产出倍率资源时永久成长 +2%' },
  [EnchantmentType.ApprenticeResTime]:       { type: EnchantmentType.ApprenticeResTime,       name: '专精·时间', icon: '⏳', category: 'apprentice', desc: '产出时间资源时永久成长 +2%' },
  [EnchantmentType.ApprenticeResGold]:       { type: EnchantmentType.ApprenticeResGold,       name: '专精·金币', icon: '💰', category: 'apprentice', desc: '产出金币资源时永久成长 +2%' },
  // ── 悟道·词条型（20） ──
  [EnchantmentType.ApprenticeAffixConvert]:   { type: EnchantmentType.ApprenticeAffixConvert,   name: '悟道·转化', icon: '💡', category: 'apprentice', desc: '场上转化词条触发时成长 +2%' },
  [EnchantmentType.ApprenticeAffixRainbow]:   { type: EnchantmentType.ApprenticeAffixRainbow,   name: '悟道·彩虹', icon: '💡', category: 'apprentice', desc: '场上彩虹词条触发时成长 +1.5%' },
  [EnchantmentType.ApprenticeAffixCharge]:    { type: EnchantmentType.ApprenticeAffixCharge,    name: '悟道·蓄力', icon: '💡', category: 'apprentice', desc: '场上蓄力词条触发时成长 +2%' },
  [EnchantmentType.ApprenticeAffixDecay]:     { type: EnchantmentType.ApprenticeAffixDecay,     name: '悟道·衰减', icon: '💡', category: 'apprentice', desc: '场上衰减词条触发时成长 +1.5%' },
  [EnchantmentType.ApprenticeAffixPulse]:     { type: EnchantmentType.ApprenticeAffixPulse,     name: '悟道·脉冲', icon: '💡', category: 'apprentice', desc: '场上脉冲词条触发时成长 +1.5%' },
  [EnchantmentType.ApprenticeAffixCrit]:      { type: EnchantmentType.ApprenticeAffixCrit,      name: '悟道·暴击', icon: '💡', category: 'apprentice', desc: '场上暴击词条触发时成长 +1.5%' },
  [EnchantmentType.ApprenticeAffixCascade]:   { type: EnchantmentType.ApprenticeAffixCascade,   name: '悟道·级联', icon: '💡', category: 'apprentice', desc: '场上级联词条触发时成长 +2%' },
  [EnchantmentType.ApprenticeAffixVoid]:      { type: EnchantmentType.ApprenticeAffixVoid,      name: '悟道·虚无', icon: '💡', category: 'apprentice', desc: '场上虚无词条触发时成长 +2%' },
  [EnchantmentType.ApprenticeAffixResonance]: { type: EnchantmentType.ApprenticeAffixResonance, name: '悟道·共鸣', icon: '💡', category: 'apprentice', desc: '场上共鸣词条触发时成长 +2%' },
  [EnchantmentType.ApprenticeAffixMirror]:    { type: EnchantmentType.ApprenticeAffixMirror,    name: '悟道·倒影', icon: '💡', category: 'apprentice', desc: '场上倒影词条触发时成长 +2%' },
  [EnchantmentType.ApprenticeAffixLink]:      { type: EnchantmentType.ApprenticeAffixLink,      name: '悟道·连接', icon: '💡', category: 'apprentice', desc: '场上连接词条触发时成长 +2%' },
  [EnchantmentType.ApprenticeAffixSplash]:    { type: EnchantmentType.ApprenticeAffixSplash,    name: '悟道·溅射', icon: '💡', category: 'apprentice', desc: '场上溅射词条触发时成长 +2%' },
  [EnchantmentType.ApprenticeAffixAmplify]:   { type: EnchantmentType.ApprenticeAffixAmplify,   name: '悟道·增幅', icon: '💡', category: 'apprentice', desc: '场上增幅词条触发时成长 +2%' },
  [EnchantmentType.ApprenticeAffixConduit]:   { type: EnchantmentType.ApprenticeAffixConduit,   name: '悟道·导能', icon: '💡', category: 'apprentice', desc: '场上导能词条触发时成长 +2.5%' },
  [EnchantmentType.ApprenticeAffixOutcast]:   { type: EnchantmentType.ApprenticeAffixOutcast,   name: '悟道·流放', icon: '💡', category: 'apprentice', desc: '场上流放词条触发时成长 +2%' },
  [EnchantmentType.ApprenticeAffixGravity]:   { type: EnchantmentType.ApprenticeAffixGravity,   name: '悟道·引力', icon: '💡', category: 'apprentice', desc: '场上引力词条触发时成长 +4%' },
  [EnchantmentType.ApprenticeAffixLigature]:  { type: EnchantmentType.ApprenticeAffixLigature,  name: '悟道·连字', icon: '💡', category: 'apprentice', desc: '场上连字词条触发时成长 +2%' },
  [EnchantmentType.ApprenticeAffixTwin]:      { type: EnchantmentType.ApprenticeAffixTwin,      name: '悟道·双生', icon: '💡', category: 'apprentice', desc: '场上双生词条触发时成长 +5%' },
  [EnchantmentType.ApprenticeAffixRecurse]:   { type: EnchantmentType.ApprenticeAffixRecurse,   name: '悟道·递归', icon: '💡', category: 'apprentice', desc: '场上递归词条触发时成长 +1.5%' },
  [EnchantmentType.ApprenticeAffixTaboo]:     { type: EnchantmentType.ApprenticeAffixTaboo,     name: '悟道·禁忌', icon: '💡', category: 'apprentice', desc: '场上禁忌词条触发时成长 +1.5%' },
  // ── 运算符（1） ──
  [EnchantmentType.MultiplyOperator]: { type: EnchantmentType.MultiplyOperator, name: '乘算化', icon: '✖️', category: 'operator', desc: '将加算层各项加成转为独立乘数' },
}

/** @deprecated 嬗变系已删除（Story 41.2），保留供旧存档兼容 */
export const TRANSMUTE_NAMES: Record<ResourceType, string> = {
  base: '衍生·基数', score: '衍生·分数', multiplier: '衍生·倍率',
  time: '衍生·时间', gold: '衍生·金币', fragment: '衍生·碎片', mutagen: '衍生·变异素',
}

// ===== 词条实例（运行时生成，已掷骰） =====

export interface AffixInstance {
  type: AffixType
  // 各类型的参数，按需填充
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
  posRel?: PositionRelation        // Void/Resonance/Mirror/Link/Splash/Amplify/Cascade
  bonusPerSlot?: number            // Void: 每空位加成%
  resource?: ResourceType          // Resonance: 监听资源 / Amplify: 关联资源 / Splash: 目标资源
  watchAffix?: AffixType           // Link: 监听词条类型 / Splash: 目标词条类型
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
  transmuteResource?: ResourceType       // 衍生附魔目标资源
  neighborPosRel?: PositionRelation      // 学徒·观摩：随机分配的位置关系
  purchasePrice?: number                 // 购买价格（用于转卖计算）
  shapeId?: string                       // Polyomino 形状 ID（默认 'monomino'）
  rotation?: number                      // 形状旋转态（0~3，默认 0）
}

// ===== 技能运行时状态（战斗中） =====

export interface SkillRuntimeState {
  skillId: string
  // ── 词条状态 ──
  chargeAccumulated: number        // 蓄力: 当前蓄力百分比
  currentDecayMult: number         // 衰减: 当前衰减乘数（每词重置）
  mirrorCopiedAffix: AffixInstance | null  // 倒影: 每关刷新时复制的词条
  mirrorCopiedAffixes: AffixInstance[]     // 倒影质变: 全词条复制（Story 41-5）
  triggerCount: number             // 脉冲: 触发计数
  amplifyStacks: number            // 增幅: 当前增幅层数（每关重置）
  // ── 附魔状态 ──
  apprenticeAccumulated: number    // 学徒(含丰收/适应): 永久成长累积%
  questStacks: number              // 任务: 当前叠层进度
  questCompletions: number         // 任务: 已完成次数
  questTransformed: boolean        // 任务: 已质变（首次完成后永久 true）
}

// ===== 存档数据 =====

export interface AffixSkillSaveData {
  id: string
  resource: ResourceType
  level: number
  rarity: SkillRarity
  affixes: AffixInstance[]
  enchantmentIds: string[]
  transmuteResource?: ResourceType
  neighborPosRel?: PositionRelation      // 学徒·观摩：随机分配的位置关系
  shapeId?: string                       // Polyomino 形状 ID（默认 'monomino'）
  rotation?: number                      // 形状旋转态（0~3，默认 0）
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
  convert_cross: 8,              // 布局思考
  convert_self: 3,               // 操作思考·保留
  [AffixType.Rainbow]: 10,      // 无脑
  [AffixType.Charge]: 8,        // 操作思考
  [AffixType.Decay]: 10,        // 无脑
  [AffixType.Pulse]: 10,        // 无脑
  [AffixType.Crit]: 10,         // 无脑
  [AffixType.Cascade]: 8,       // 操作思考
  [AffixType.Void]: 8,          // 布局思考
  [AffixType.Resonance]: 8,     // 布局思考
  [AffixType.Mirror]: 8,        // 布局思考
  [AffixType.Link]: 8,          // 布局思考
  [AffixType.Splash]: 8,        // 布局思考
  [AffixType.Amplify]: 8,       // 布局思考
  [AffixType.Conduit]: 6,       // 布局+构筑思考（仅≥2词条技能）
  [AffixType.Outcast]: 8,       // 操作思考
  [AffixType.Gravity]: 3,       // 操作思考·保留
  [AffixType.Ligature]: 8,      // 操作思考
  [AffixType.Twin]: 2,          // 无脑·保留
  [AffixType.Recurse]: 10,      // 无脑
  [AffixType.Taboo]: 10,        // 无脑
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
  [AffixType.Link]: '感应',
  [AffixType.Splash]: '溅射',
  [AffixType.Amplify]: '增幅',
  [AffixType.Conduit]: '导能',
  [AffixType.Outcast]: '流放',
  [AffixType.Gravity]: '引力',
  [AffixType.Ligature]: '连字',
  [AffixType.Twin]: '双生',
  [AffixType.Recurse]: '递归',
  [AffixType.Taboo]: '禁忌',
}

/** 词条功能说明（玩家可读） */
export const AFFIX_DESCRIPTIONS: Record<AffixType, string> = {
  [AffixType.Convert]: '读取一种资源的当前值，按系数加成本资源产出',
  [AffixType.Rainbow]: '每次触发时随机选择一种资源类型产出',
  [AffixType.Charge]: '未触发时持续蓄力，触发时释放加成',
  [AffixType.Decay]: '每个单词首次触发加成最高，逐次衰减，换词重置',
  [AffixType.Pulse]: '每隔固定次数触发一次爆发',
  [AffixType.Crit]: '触发时有概率暴击',
  [AffixType.Cascade]: '上一个按键与当前键满足指定位置关系时，产出倍增',
  [AffixType.Void]: '范围内空位越多加成越高',
  [AffixType.Resonance]: '范围内技能产出指定资源时，本技能自动触发',
  [AffixType.Mirror]: '每关结束时复制一个范围内技能的随机词条',
  [AffixType.Link]: '范围内有指定词条的技能触发时，本技能自动触发',
  [AffixType.Splash]: '触发后随机触发范围内1个匹配的技能',
  [AffixType.Amplify]: '每次触发叠一层，与范围内同资源增幅技能共享层数加成',
  [AffixType.Conduit]: '自身不产出，范围内拥有相同词条的邻居触发时额外触发一次',
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

/** @deprecated 嬗变系已删除（Story 41.2），保留供旧存档兼容 */
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

/** 乘算化附魔：基础值替换表（加算基底 → 乘数基底，来源 Story 34.2 旧乘算产出者） */
export const MULTIPLY_OPERATOR_BASE_VALUES: Record<ResourceType, [number, number, number]> = {
  base:       [2.0, 2.3, 2.6],
  score:      [1.1, 1.15, 1.2],
  multiplier: [1.15, 1.2, 1.25],
  time:       [1.2, 1.25, 1.3],
  gold:       [1.3, 1.5, 1.7],
  fragment:   [1.8, 2.1, 2.4],
  mutagen:    [1.8, 2.1, 2.4],
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

// ===== 职业限定附魔 =====

export const CLASS_RESTRICTED_ENCHANTMENTS: Record<string, EnchantmentType[]> = {
  // 职业限定附魔已精简；保留结构以便后续扩展
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

/**
 * 按职业过滤分类附魔候选。对每个类别分别应用 filterEnchantmentsByClass。
 */
export function filterCategorizedByClass(
  categorized: import('./affixTrigger').CategorizedEnchantments,
  playerClass?: string,
): import('./affixTrigger').CategorizedEnchantments {
  const f = (arr: EnchantmentType[]) => filterEnchantmentsByClass(arr, playerClass)
  return {
    apprentice: f(categorized.apprentice),
    quest: f(categorized.quest),
    transmute: f(categorized.transmute),
    operator: f(categorized.operator),
  }
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
  /** Story 41-3: 质变后效果描述（区分任务进度描述和质变后描述） */
  transformDesc?: string
}

export const QUEST_ENCHANTMENT_DEFS: QuestEnchantmentDef[] = [
  { type: EnchantmentType.QuestDevour, name: '吞噬', targetAffix: AffixType.Void, event: 'rangeFull', targetStacks: 1, effectDesc: '质变：每次吞噬', transformDesc: '完成后每次触发都寻找最弱邻居吞噬' },
  { type: EnchantmentType.QuestOverload, name: '过载', targetAffix: AffixType.Crit, event: 'critHit', targetStacks: 8, effectDesc: '质变：保底暴击', transformDesc: '完成后暴击必定触发' },
  { type: EnchantmentType.QuestEcho, name: '回响', targetAffix: AffixType.Pulse, event: 'affixProc:pulse', targetStacks: 6, effectDesc: '质变：跨技能脉冲同步', transformDesc: '完成后脉冲同步所有脉冲技能' },
  { type: EnchantmentType.QuestChain, name: '连锁', targetAffix: AffixType.Cascade, event: 'affixProc:cascade', targetStacks: 6, effectDesc: '质变：双向连锁', transformDesc: '完成后级联双向判定，反向键也触发' },
  { type: EnchantmentType.QuestPurify, name: '净化', targetAffix: AffixType.Decay, event: 'decayFloor', targetStacks: 3, effectDesc: '质变：衰减反转为增长', transformDesc: '完成后衰减方向反转，越触发越强' },
  { type: EnchantmentType.QuestResonance, name: '共振', targetAffix: [AffixType.Resonance, AffixType.Link], event: 'neighborTrigger', targetStacks: 20, effectDesc: '质变：共鸣增强', transformDesc: '完成后共鸣/链接触发产出 +50%' },
  { type: EnchantmentType.QuestCharge, name: '蓄势', targetAffix: AffixType.Outcast, event: 'outcastProc', targetStacks: 10, effectDesc: '质变：首尾呼应', transformDesc: '完成后触发词首/词尾时额外触发对端技能' },
  { type: EnchantmentType.QuestRefine, name: '精炼', targetAffix: AffixType.Convert, event: 'selfTrigger', targetStacks: 15, effectDesc: '质变：双向转化', transformDesc: '完成后转化同时反向产出到源资源' },
  { type: EnchantmentType.QuestEnergize, name: '充能', targetAffix: AffixType.Charge, event: 'wordComplete', targetStacks: 5, effectDesc: '质变：满蓄力自动完成', transformDesc: '满蓄力释放时自动打完当前单词剩余字母' },
  { type: EnchantmentType.QuestFission, name: '裂变', targetAffix: AffixType.Splash, event: 'affixProc:splash', targetStacks: 8, effectDesc: '质变：溅射链一跳', transformDesc: '完成后溅射目标可再溅射一次' },
  { type: EnchantmentType.QuestStack, name: '层叠', targetAffix: AffixType.Amplify, event: 'selfTrigger', targetStacks: 25, effectDesc: '质变：换词保留50%层数', transformDesc: '完成后换词时保留一半增幅层数' },
  { type: EnchantmentType.QuestPolarize, name: '极化', targetAffix: AffixType.Gravity, event: 'gravityWordMatch', targetStacks: 8, effectDesc: '质变：双向锁定', transformDesc: '完成后吸引字母必含，排斥字母必不含' },
  { type: EnchantmentType.QuestSpectrum, name: '光谱', targetAffix: AffixType.Rainbow, event: 'multiResourceWord', targetStacks: 3, effectDesc: '质变：全资源产出', transformDesc: '完成后产出等比分摊到所有资源' },
  { type: EnchantmentType.QuestMirror, name: '映射', targetAffix: AffixType.Mirror, event: 'stageCleared', targetStacks: 1, effectDesc: '质变：全词条复制', transformDesc: '完成后复制范围内所有邻居的不同类型词条' },
  { type: EnchantmentType.QuestOverlap, name: '重叠', targetAffix: AffixType.Ligature, event: 'selfTrigger', targetStacks: 15, effectDesc: '质变：关卡累计计数', transformDesc: '完成后连字按关卡累计按键计数' },
  { type: EnchantmentType.QuestIterate, name: '迭代', targetAffix: AffixType.Recurse, event: 'affixProc:recurse', targetStacks: 5, effectDesc: '质变：递归不衰减', transformDesc: '完成后递归概率不再每次减半' },
  { type: EnchantmentType.QuestSacrifice, name: '献祭', targetAffix: AffixType.Taboo, event: 'affixProc:taboo_penalty', targetStacks: 3, effectDesc: '质变：惩罚转为随机资源', transformDesc: '完成后惩罚触发时产出转为随机其他资源' },
  { type: EnchantmentType.QuestTwin, name: '镜像', targetAffix: AffixType.Twin, event: 'stageCleared', targetStacks: 3, effectDesc: '质变：词条效果加倍', transformDesc: '完成后所有非 Twin 词条效果翻倍' },
  { type: EnchantmentType.QuestConduit, name: '导引', targetAffix: AffixType.Conduit, event: 'selfTrigger', targetStacks: 15, effectDesc: '质变：导能 +2', transformDesc: '完成后为邻居提供 2 次额外触发' },
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
    mirrorCopiedAffixes: [],
    triggerCount: 0,
    amplifyStacks: 0,
    apprenticeAccumulated: 0,
    questStacks: 0,
    questCompletions: 0,
    questTransformed: false,
  }
}
