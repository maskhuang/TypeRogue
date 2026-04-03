// ============================================
// 打字肉鸽 - 词条制技能系统 数据定义
// ============================================
// Story 35.1: 核心数据结构与词条定义
// 设计文档: docs/design/affix-skill-system.md

import type { ResourceType } from '../core/types'
import { PositionRelation } from './keyboardTopology'

// ===== 词条类型枚举（35 类，6 类别） ====
// Replicate 已合并入 Splash; Link 已合并入 Resonance

export enum AffixType {
  // ── 数值型 numeric ──
  Convert = 'convert',
  Rainbow = 'rainbow',
  Multiply = 'multiply',
  PhaseShift = 'phase_shift',
  EndoExo = 'endo_exo',
  Fusion = 'fusion',
  // ── 暴击型 crit ──
  Crit = 'crit',
  Charge = 'charge',
  Decay = 'decay',
  Recurse = 'recurse',
  Taboo = 'taboo',
  // ── 叠层型 stack ──
  Pulse = 'pulse',
  Resonance = 'resonance',
  Splash = 'splash',
  Amplify = 'amplify',
  Relay = 'relay',
  WarDrum = 'war_drum',
  // ── 拓扑型 topology ──
  Void = 'void',
  Mirror = 'mirror',
  Cascade = 'cascade',
  Flow = 'flow',
  Confluence = 'confluence',
  Turbulence = 'turbulence',
  // ── 词感型 word_sense ──
  Outcast = 'outcast',
  Gravity = 'gravity',
  Ligature = 'ligature',
  Cluster = 'cluster',
  Coverage = 'coverage',
  Bigram = 'bigram',
  // ── 元规则型 meta_rule ──
  Conduit = 'conduit',
  Twin = 'twin',
  Innate = 'innate',
  Counter = 'counter',
  Exhaust = 'exhaust',
  Ethereal = 'ethereal',
}

// ===== 词条类别 =====

export type AffixCategory = 'numeric' | 'crit' | 'stack' | 'topology' | 'word_sense' | 'meta_rule'

export const AFFIX_CATEGORY_MAP: Record<AffixType, AffixCategory> = {
  // ── 数值型 ──
  [AffixType.Convert]: 'numeric',
  [AffixType.Rainbow]: 'numeric',
  [AffixType.Multiply]: 'numeric',
  [AffixType.PhaseShift]: 'numeric',
  [AffixType.EndoExo]: 'numeric',
  [AffixType.Fusion]: 'numeric',
  // ── 暴击型 ──
  [AffixType.Crit]: 'crit',
  [AffixType.Charge]: 'crit',
  [AffixType.Decay]: 'crit',
  [AffixType.Recurse]: 'crit',
  [AffixType.Taboo]: 'crit',
  // ── 叠层型 ──
  [AffixType.Pulse]: 'stack',
  [AffixType.Resonance]: 'stack',
  [AffixType.Splash]: 'stack',
  [AffixType.Amplify]: 'stack',
  [AffixType.Relay]: 'stack',
  [AffixType.WarDrum]: 'stack',
  // ── 拓扑型 ──
  [AffixType.Void]: 'topology',
  [AffixType.Mirror]: 'topology',
  [AffixType.Cascade]: 'topology',
  [AffixType.Flow]: 'topology',
  [AffixType.Confluence]: 'topology',
  [AffixType.Turbulence]: 'topology',
  // ── 词感型 ──
  [AffixType.Outcast]: 'word_sense',
  [AffixType.Gravity]: 'word_sense',
  [AffixType.Ligature]: 'word_sense',
  [AffixType.Cluster]: 'word_sense',
  [AffixType.Coverage]: 'word_sense',
  [AffixType.Bigram]: 'word_sense',
  // ── 元规则型 ──
  [AffixType.Conduit]: 'meta_rule',
  [AffixType.Twin]: 'meta_rule',
  [AffixType.Innate]: 'meta_rule',
  [AffixType.Counter]: 'meta_rule',
  [AffixType.Exhaust]: 'meta_rule',
  [AffixType.Ethereal]: 'meta_rule',
}

// ===== 附魔类型枚举（26 个枚举值） =====
// 2 通用学徒 + 5 资源专精 + 18 任务型 + 1 运算符 = 26

export enum EnchantmentType {
  // ── 学徒型（2 通用 + 5 资源专精） ──
  ApprenticeSelf = 'apprentice_self',
  ApprenticeNeighbor = 'apprentice_neighbor',
  ApprenticeResBase = 'apprentice_res_base',
  ApprenticeResScore = 'apprentice_res_score',
  ApprenticeResMultiplier = 'apprentice_res_multiplier',
  ApprenticeResTime = 'apprentice_res_time',
  ApprenticeResGold = 'apprentice_res_gold',
  // ── 任务型（19，需技能拥有对应词条） ──
  QuestDevour = 'quest_devour',
  QuestOverload = 'quest_overload',
  QuestEcho = 'quest_echo',
  QuestChain = 'quest_chain',
  QuestPurify = 'quest_purify',
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
  QuestRelay = 'quest_relay',
  QuestMultiplyOp = 'quest_multiply_op',
  // ── 运算符（保留类型，现通过质变获取） ──
  MultiplyOperator = 'multiply_operator',
}

// ===== 任务附魔 ↔ 词条映射 =====

export const QUEST_AFFIX_MAP: Partial<Record<EnchantmentType, AffixType | AffixType[]>> = {
  [EnchantmentType.QuestDevour]: AffixType.Void,
  [EnchantmentType.QuestOverload]: AffixType.Crit,
  [EnchantmentType.QuestEcho]: AffixType.Pulse,
  [EnchantmentType.QuestChain]: AffixType.Cascade,
  [EnchantmentType.QuestPurify]: AffixType.Decay,
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
  [EnchantmentType.QuestRelay]: AffixType.Relay,
  [EnchantmentType.QuestMultiplyOp]: AffixType.Multiply,
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
  // ── 学徒型（6） ──  ApprenticeSelf 已删除（观摩可覆盖自身）
  [EnchantmentType.ApprenticeNeighbor]: { type: EnchantmentType.ApprenticeNeighbor, name: '学徒·观摩', icon: '👀', category: 'apprentice', desc: '自身或指定关系的技能触发时永久成长' },
  // ── 资源专精型（5） ──
  [EnchantmentType.ApprenticeResBase]:       { type: EnchantmentType.ApprenticeResBase,       name: '专精·基数', icon: '🔢', category: 'apprentice', desc: '产出基数资源时永久成长 +2%' },
  [EnchantmentType.ApprenticeResScore]:      { type: EnchantmentType.ApprenticeResScore,      name: '专精·分数', icon: '🏅', category: 'apprentice', desc: '产出分数资源时永久成长 +2%' },
  [EnchantmentType.ApprenticeResMultiplier]: { type: EnchantmentType.ApprenticeResMultiplier, name: '专精·倍率', icon: '📈', category: 'apprentice', desc: '产出倍率资源时永久成长 +2%' },
  [EnchantmentType.ApprenticeResTime]:       { type: EnchantmentType.ApprenticeResTime,       name: '专精·时间', icon: '⏳', category: 'apprentice', desc: '产出时间资源时永久成长 +2%' },
  [EnchantmentType.ApprenticeResGold]:       { type: EnchantmentType.ApprenticeResGold,       name: '专精·金币', icon: '💰', category: 'apprentice', desc: '产出金币资源时永久成长 +2%' },
  // ── 运算符（通过质变获取） ──
  [EnchantmentType.MultiplyOperator]: { type: EnchantmentType.MultiplyOperator, name: '乘算化', icon: '✖️', category: 'operator', desc: '将加算层各项加成转为独立乘数' },
}

/** @deprecated 嬗变系已删除（Story 41.2），保留供旧存档兼容 */
export const TRANSMUTE_NAMES: Record<ResourceType, string> = {
  base: '衍生·基数', score: '衍生·分数', multiplier: '衍生·倍率',
  time: '衍生·时间', gold: '衍生·金币', energy: '衍生·能量', mutagen: '衍生·变异素',
}

// ===== 词条实例（运行时生成，已掷骰） =====

export interface AffixInstance {
  type: AffixType
  // 各类型的参数，按需填充
  source?: ResourceType            // Convert: 源资源
  k?: number                       // Convert: 系数（按源资源校准）
  gainPerSec?: number              // Charge: 每秒蓄力暴击率
  maxBonus?: number                // Charge: 蓄力暴击率上限
  initialMult?: number             // Decay: 初始暴击率加成
  decayPerTrigger?: number         // Decay: 每次触发暴击率衰减量
  floor?: number                   // Decay: 暴击率衰减下限
  interval?: number                // Pulse: 间隔次数
  burstMult?: number               // @deprecated Pulse: 旧版爆发乘数（现改为自触发），保留供旧存档兼容
  chance?: number                  // Crit: 暴击概率
  critMult?: number                // Crit: 暴击乘数
  posRel?: PositionRelation        // Void/Resonance/Mirror/Splash/Amplify/Cascade
  bonusPerSlot?: number            // Void: 每空位加成%
  resource?: ResourceType          // Amplify: 关联资源
  splashCount?: number             // Splash: 触发指定关系的N个匹配技能
  resonanceCount?: number          // Resonance: 共享技能触发时自触发N次
  relayCount?: number              // Relay: 中转触发指定关系的N个匹配技能
  valuePerStack?: number           // Amplify: 已废弃（现每层 = 基础产出绝对值），保留供旧存档兼容
  cascadeMult?: number             // Cascade: 级联乘数
  bonusPercent?: number            // Outcast: 首尾字母加成% / Taboo: 暴击率加成
  probMult?: number                // Gravity: 单词出现概率倍率（0~2）
  recurseChance?: number           // Recurse: 重触发概率 15%~30%
  penaltyChance?: number           // @deprecated Taboo: 旧版负产出概率（现并入暴击系统）
  critPerStack?: number            // WarDrum: 每层暴击率
  multiplyValue?: number           // Multiply: 产出乘数 ×N
  clusterK?: number                // Cluster: 每单位辅音丛长度的 bonusPercent
  coverageK?: number               // Coverage: 每个不同字母的 bonusPercent
  bigramK?: number                 // Bigram: 平均 bigram 罕见度 × K 的 bonusPercent
  flowK?: number                   // Flow: 每单位归一化落差的 bonusPercent
  confluenceK?: number             // Confluence: 资源多样性加成系数
  turbulenceK?: number             // Turbulence: 极差×邻居数加成系数
  // ── 数值型新词条（热力学） ──
  phaseSource?: ResourceType       // PhaseShift: 温度源资源
  phaseT1?: number                 // PhaseShift: 固→液阈值
  phaseT2?: number                 // PhaseShift: 液→气阈值
  kSolid?: number                  // PhaseShift: 固态 k
  kLiquid?: number                 // PhaseShift: 液态 k
  kGas?: number                    // PhaseShift: 气态 k
  sustainCost?: number             // PhaseShift: 气态每触发消耗量
  endoSource?: ResourceType        // EndoExo: 读取源资源
  endoThreshold?: number           // EndoExo: Exo/Endo 切换阈值
  kExo?: number                    // EndoExo: 放热 k
  kEndo?: number                   // EndoExo: 吸热 k（可为负）
  endoConsumeRate?: number         // EndoExo: 放热消耗量
  fusionSourceA?: ResourceType     // Fusion: 燃料 A
  fusionSourceB?: ResourceType     // Fusion: 燃料 B
  ignitionA?: number               // Fusion: A 点火阈值
  ignitionB?: number               // Fusion: B 点火阈值
  fusionK?: number                 // Fusion: 成功倍率
  fusionConsumeA?: number          // Fusion: A 消耗量
  fusionConsumeB?: number          // Fusion: B 消耗量
  fusionPenalty?: number           // Fusion: 失败惩罚 bonusPercent
  // ── 元规则型新词条 ──
  maxCharges?: number              // Counter: 每关充能上限
  maxTriggers?: number             // Exhaust: 最大触发次数
  exhaustMult?: number             // Exhaust: 每次触发 base 倍率
  etherealMult?: number            // Ethereal: base 倍率（一关有效）
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
  baseValues: number[]                   // Lv1~N 加算基础值（白装4级，蓝+3级）
  level: number                          // 1-4（白装）或 1-3（蓝+）
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
  chargeAccumulated: number        // 蓄力: 当前蓄力暴击率
  currentDecayMult: number         // 衰减: 当前暴击率加成（每关重置）
  mirrorCopiedAffix: AffixInstance | null  // 倒影: 每关刷新时复制的词条
  mirrorCopiedAffixes: AffixInstance[]     // 倒影质变: 全词条复制（Story 41-5）
  stacks: number                   // 通用叠层计数（脉冲爆发/增幅加成等，每关重置）
  // ── 附魔状态 ──
  apprenticeAccumulated: number    // 学徒(含丰收/适应): 永久成长累积%
  questStacks: number              // 任务: 当前叠层进度
  questCompletions: number         // 任务: 已完成次数
  questTransformed: boolean        // 任务: 已质变（首次完成后永久 true）
  // ── 元规则型运行时 ──
  counterCharges: number           // Counter: 当前充能数（每关恢复）
  exhaustCount: number             // Exhaust: 累计触发次数（跨关）
  etherealTriggered: boolean       // Ethereal: 本关是否已触发
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

/** 技能最大等级（白装4级，蓝+3级） */
export function getSkillMaxLevel(rarity: number): number {
  return rarity === 0 ? 4 : 3
}

/** 附魔触发等级门槛（4 - 稀有度） */
export function getEnchantmentThreshold(rarity: number): number {
  return Math.max(1, 4 - rarity)
}

// ===== 常量表 =====

/** 暴击固定乘数（全局暴击子系统） */
export const CRIT_MULTIPLIER = 2

/** 命运硬币：暴击率上限（超出部分转化为暴击倍数） */
export const FATE_COIN_CRIT_CAP = 0.5
/** 命运硬币：超出暴击率→暴击倍数转化系数（每 1% 超出 = +0.02× 暴击倍数） */
export const FATE_COIN_CONVERSION = 2

/** 基底值：7 种资源 × 4 等级（白装可达 Lv4） */
export const BASE_VALUES: Record<ResourceType, number[]> = {
  base:       [5, 8, 12, 17],
  score:      [15, 24, 36, 50],
  multiplier: [0.2, 0.32, 0.48, 0.67],
  time:       [0.2, 0.32, 0.48, 0.67],
  gold:       [3, 5, 8, 11],
  energy:   [1, 1.6, 2.4, 3.4],
  mutagen:    [1, 1.6, 2.4, 3.4],
}

/** 词条权重键：所有 AffixType（除 Convert 拆为 cross/self） */
export type AffixWeightKey = Exclude<AffixType, AffixType.Convert> | 'convert_cross' | 'convert_self'

/** 词条权重分档：'high' = 6-10 随机，'low' = 1-4 随机，'none' = 0（禁用） */
export type AffixWeightTier = 'high' | 'low' | 'none'

/** 词条基准分档表（每局开始时据此随机生成实际权重） */
export const AFFIX_WEIGHT_TIERS: Record<AffixWeightKey, AffixWeightTier> = {
  convert_cross: 'high',
  convert_self: 'none', // 自源转化已禁用
  [AffixType.Rainbow]: 'low',
  [AffixType.Multiply]: 'low',
  [AffixType.PhaseShift]: 'high',
  [AffixType.EndoExo]: 'high',
  [AffixType.Fusion]: 'low',
  [AffixType.Charge]: 'high',
  [AffixType.Decay]: 'high',
  [AffixType.Pulse]: 'high',
  [AffixType.Crit]: 'high',
  [AffixType.Cascade]: 'high',
  [AffixType.Void]: 'high',
  [AffixType.Resonance]: 'high',
  [AffixType.Mirror]: 'high',
  [AffixType.Splash]: 'high',
  [AffixType.Amplify]: 'high',
  [AffixType.Conduit]: 'low',
  [AffixType.Relay]: 'low',
  [AffixType.Outcast]: 'high',
  [AffixType.Gravity]: 'low',
  [AffixType.Ligature]: 'high',
  [AffixType.Cluster]: 'high',
  [AffixType.Coverage]: 'high',
  [AffixType.Bigram]: 'high',
  [AffixType.Flow]: 'high',
  [AffixType.Confluence]: 'high',
  [AffixType.Turbulence]: 'high',
  [AffixType.WarDrum]: 'high',
  [AffixType.Twin]: 'low',
  [AffixType.Innate]: 'low',
  [AffixType.Counter]: 'low',
  [AffixType.Exhaust]: 'low',
  [AffixType.Ethereal]: 'low',
  [AffixType.Recurse]: 'high',
  [AffixType.Taboo]: 'high',
}

/** 每局动态权重（由 rollAffixWeights 生成，默认取分档中间值） */
export let AFFIX_WEIGHTS: Record<AffixWeightKey, number> = Object.fromEntries(
  Object.entries(AFFIX_WEIGHT_TIERS).map(([k, tier]) => [k, tier === 'high' ? 8 : tier === 'low' ? 2 : 0])
) as Record<AffixWeightKey, number>;

/**
 * 根据词条类型的当前权重计算质变任务所需装备格数。
 * N = max(1, round(weight / 3) - reduction)
 * 高权重(6-10)→2-3格，低权重(1-4)→1格
 * @param reduction 试炼徽章等遗物提供的减少量（默认 0）
 */
export function getQuestEquipTarget(targetAffix: AffixType | AffixType[], reduction: number = 0): number {
  const affixes = Array.isArray(targetAffix) ? targetAffix : [targetAffix]
  let maxWeight = 0
  for (const at of affixes) {
    const key: AffixWeightKey = at === AffixType.Convert ? 'convert_cross' : at as Exclude<AffixType, AffixType.Convert>
    maxWeight = Math.max(maxWeight, AFFIX_WEIGHTS[key] ?? 0)
  }
  return Math.max(1, Math.round(maxWeight / 3) - reduction)
}

/** 根据分档随机生成本局词条权重，需传入 RNG 函数 */
export function rollAffixWeights(rng: () => number): void {
  const entries = Object.entries(AFFIX_WEIGHT_TIERS) as [AffixWeightKey, AffixWeightTier][];
  const result = {} as Record<AffixWeightKey, number>;
  for (const [key, tier] of entries) {
    if (tier === 'none') {
      result[key] = 0;
    } else if (tier === 'high') {
      result[key] = 6 + Math.floor(rng() * 5); // 6-10
    } else {
      result[key] = 1 + Math.floor(rng() * 4); // 1-4
    }
  }
  AFFIX_WEIGHTS = result;
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

/** 转化词条 k 值校准表：[k_min, k_max]（触发层已按 BASE_VALUES 归一化，统一区间） */
export const CONVERT_K_TABLE: Record<ResourceType, [number, number]> = {
  base:       [0.02, 0.05],
  score:      [0.02, 0.05],
  multiplier: [0.02, 0.05],
  time:       [0.02, 0.05],
  gold:       [0.02, 0.05],
  energy:   [0.02, 0.05],
  mutagen:    [0.02, 0.05],
}

// ===== 自动命名 =====

export const AFFIX_NAMES: Record<AffixType, string> = {
  [AffixType.Convert]: '转化',
  [AffixType.Rainbow]: '彩虹',
  [AffixType.Multiply]: '乘算',
  [AffixType.Charge]: '蓄力',
  [AffixType.Decay]: '衰减',
  [AffixType.Pulse]: '脉冲',
  [AffixType.Crit]: '暴击',
  [AffixType.Cascade]: '级联',
  [AffixType.Void]: '虚无',
  [AffixType.Resonance]: '共鸣',
  [AffixType.Mirror]: '倒影',
  [AffixType.Splash]: '溅射',
  [AffixType.Amplify]: '增幅',
  [AffixType.Conduit]: '导能',
  [AffixType.Relay]: '中转',
  [AffixType.Outcast]: '流放',
  [AffixType.Gravity]: '引力',
  [AffixType.Ligature]: '连字',
  [AffixType.WarDrum]: '战鼓',
  [AffixType.Twin]: '双生',
  [AffixType.Recurse]: '递归',
  [AffixType.Taboo]: '禁忌',
  [AffixType.Cluster]: '辅音丛',
  [AffixType.Coverage]: '覆盖度',
  [AffixType.Bigram]: '双字组',
  [AffixType.Flow]: '落差',
  [AffixType.Confluence]: '汇流',
  [AffixType.Turbulence]: '湍流',
  [AffixType.PhaseShift]: '相变',
  [AffixType.EndoExo]: '吸放热',
  [AffixType.Fusion]: '聚变',
  [AffixType.Innate]: '先天',
  [AffixType.Counter]: '反制',
  [AffixType.Exhaust]: '消耗',
  [AffixType.Ethereal]: '虚无',
}

/** 词条功能说明（玩家可读） */
export const AFFIX_DESCRIPTIONS: Record<AffixType, string> = {
  [AffixType.Convert]: '读取一种资源的当前值，按系数加成本资源产出',
  [AffixType.Rainbow]: '每次触发时随机选择一种资源类型产出',
  [AffixType.Multiply]: '产出直接乘以固定倍数',
  [AffixType.Charge]: '按住1秒蓄满，触发时释放暴击率加成；蓄满自动释放或松开提前释放',
  [AffixType.Decay]: '首次触发暴击率最高，逐次衰减至下限，每关重置',
  [AffixType.Pulse]: '每次触发叠层，每叠N层立刻自触发一次',
  [AffixType.Crit]: '触发时有概率暴击',
  [AffixType.Cascade]: '上一个按键与当前键满足指定位置关系时，产出倍增',
  [AffixType.Void]: '指定关系的空位越多加成越高',
  [AffixType.Resonance]: '指定关系的匹配技能触发时叠层，每叠N层自触发一次（升级降低N）',
  [AffixType.Mirror]: '每关结束时从指定关系的邻居中随机复制一个词条，下关替代自身生效',
  [AffixType.Splash]: '自身不产出；触发叠层，每叠N层触发1个匹配技能（升级降低N）',
  [AffixType.Amplify]: '自身不产出；触发叠层，指定关系的匹配技能产出+自身基础值',
  [AffixType.Conduit]: '自身不产出，指定关系的匹配技能触发时额外触发一次',
  [AffixType.Relay]: '自身不产出；指定关系的匹配技能触发时叠层，每叠N层中转触发1个匹配技能（升级降低N，不含其他中转）',
  [AffixType.Outcast]: '单词首尾字母触发时获得额外加成',
  [AffixType.Gravity]: '调整含本键字母的单词出现概率',
  [AffixType.Ligature]: '字母在当前单词中重复出现时，按出现次数倍增产出',
  [AffixType.WarDrum]: '自身不产出；触发叠层，指定关系的匹配技能+暴击率（取决于层数）',
  [AffixType.Twin]: '获得附魔时同时获得两个（而非二选一）',
  [AffixType.Recurse]: '增加暴击率，暴击时额外触发一次（每次暴击率减半）',
  [AffixType.Taboo]: '大幅增加暴击率，若未暴击则产出负值',
  [AffixType.Cluster]: '单词中连续辅音越长（至少2个），产出加成越高',
  [AffixType.Coverage]: '单词中不同字母种类越多，产出加成越高',
  [AffixType.Bigram]: '单词中相邻字母对越罕见，产出加成越高',
  [AffixType.Flow]: '指定关系的邻居中比自己强的越多，产出加成越高',
  [AffixType.Confluence]: '指定关系的邻居资源类型越多样，产出加成越高',
  [AffixType.Turbulence]: '指定关系的邻居强弱差异越大，产出加成越高',
  [AffixType.PhaseShift]: '读取一种资源的本关累积产出当温度，跨阈值时产出跳升；高温持续消耗资源',
  [AffixType.EndoExo]: '读取一种资源的本关累积产出，高于阈值时高产出+消耗（放热），低于阈值时低产出（吸热）',
  [AffixType.Fusion]: '需要两种资源的本关累积产出同时达到阈值才能点火；成功时高倍产出+双消耗，失败则惩罚',
  [AffixType.Innate]: '每关开始时自动触发一次（不需按键）',
  [AffixType.Counter]: '产出为负时消耗充能取消负面效果（每关恢复充能）',
  [AffixType.Exhaust]: '每次触发产出倍增，但触发次数有限，用完词条消失',
  [AffixType.Ethereal]: '本关内其他词条效果提升一级；关卡结束后词条消失',
}

export const RESOURCE_NAMES: Record<ResourceType, string> = {
  base: '基数',
  score: '分数',
  multiplier: '倍率',
  time: '时间',
  gold: '金币',
  energy: '能量',
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
  energy:   0.15,
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
  energy:   1.0,
  mutagen:    1.0,
}

/** 乘算化附魔：基础值替换表（加算基底 → 乘数基底，来源 Story 34.2 旧乘算产出者） */
export const MULTIPLY_OPERATOR_BASE_VALUES: Record<ResourceType, number[]> = {
  base:       [2.0, 2.3, 2.6, 2.9],
  score:      [1.1, 1.15, 1.2, 1.25],
  multiplier: [1.15, 1.2, 1.25, 1.3],
  time:       [1.2, 1.25, 1.3, 1.35],
  gold:       [1.3, 1.5, 1.7, 1.9],
  energy:   [1.8, 2.1, 2.4, 2.7],
  mutagen:    [1.8, 2.1, 2.4, 2.7],
}

// ===== 学徒·观摩 growthPerProc 按 PositionRelation =====

export const APPRENTICE_NEIGHBOR_GROWTH: Record<PositionRelation, number> = {
  [PositionRelation.Adjacent]: 0.06,
  [PositionRelation.SameRow]: 0.04,
  [PositionRelation.SameColumn]: 0.08,
  [PositionRelation.SameHand]: 0.02,
  [PositionRelation.SameFinger]: 0.10,
  [PositionRelation.Symmetric]: 0.12,
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
  { type: EnchantmentType.QuestDevour, name: '吞噬', targetAffix: AffixType.Void, event: 'equip_count', targetStacks: 0, effectDesc: '质变：每次吞噬', transformDesc: '完成后每次触发都寻找最弱邻居吞噬' },
  { type: EnchantmentType.QuestOverload, name: '过载', targetAffix: AffixType.Crit, event: 'equip_count', targetStacks: 0, effectDesc: '质变：保底暴击', transformDesc: '完成后暴击必定触发' },
  { type: EnchantmentType.QuestEcho, name: '回响', targetAffix: AffixType.Pulse, event: 'equip_count', targetStacks: 0, effectDesc: '质变：脉冲连锁', transformDesc: '完成后爆发时触发所有匹配技能（可进入伪循环）' },
  { type: EnchantmentType.QuestChain, name: '连锁', targetAffix: AffixType.Cascade, event: 'equip_count', targetStacks: 0, effectDesc: '质变：双向连锁', transformDesc: '完成后级联双向判定，反向键也触发' },
  { type: EnchantmentType.QuestPurify, name: '净化', targetAffix: AffixType.Decay, event: 'equip_count', targetStacks: 0, effectDesc: '质变：衰减反转为增长', transformDesc: '完成后衰减方向反转，越触发越强' },
  { type: EnchantmentType.QuestCharge, name: '蓄势', targetAffix: AffixType.Outcast, event: 'equip_count', targetStacks: 0, effectDesc: '质变：首尾呼应', transformDesc: '完成后触发词首/词尾时额外触发对端技能' },
  { type: EnchantmentType.QuestRefine, name: '精炼', targetAffix: AffixType.Convert, event: 'equip_count', targetStacks: 0, effectDesc: '质变：双向转化', transformDesc: '完成后转化同时反向产出到源资源' },
  { type: EnchantmentType.QuestEnergize, name: '充能', targetAffix: AffixType.Charge, event: 'equip_count', targetStacks: 0, effectDesc: '质变：满蓄力自动完成', transformDesc: '满蓄力释放时自动打完当前单词，所有被触发技能获得等量暴击率' },
  { type: EnchantmentType.QuestFission, name: '裂变', targetAffix: AffixType.Splash, event: 'equip_count', targetStacks: 0, effectDesc: '质变：溅射链一跳', transformDesc: '完成后溅射目标可再溅射一次' },
  { type: EnchantmentType.QuestStack, name: '层叠', targetAffix: AffixType.Amplify, event: 'equip_count', targetStacks: 0, effectDesc: '质变：叠层触发', transformDesc: '完成后增幅叠层时触发指定关系的匹配技能一次' },
  { type: EnchantmentType.QuestPolarize, name: '极化', targetAffix: AffixType.Gravity, event: 'equip_count', targetStacks: 0, effectDesc: '质变：双向锁定', transformDesc: '完成后吸引字母必含，排斥字母必不含' },
  { type: EnchantmentType.QuestSpectrum, name: '光谱', targetAffix: AffixType.Rainbow, event: 'equip_count', targetStacks: 0, effectDesc: '质变：全资源产出', transformDesc: '完成后产出等比分摊到所有资源' },
  { type: EnchantmentType.QuestMirror, name: '映射', targetAffix: AffixType.Mirror, event: 'equip_count', targetStacks: 0, effectDesc: '质变：全词条复制', transformDesc: '完成后复制指定关系的所有邻居的不同类型词条' },
  { type: EnchantmentType.QuestOverlap, name: '重叠', targetAffix: AffixType.Ligature, event: 'equip_count', targetStacks: 0, effectDesc: '质变：关卡累计计数', transformDesc: '完成后连字按关卡累计按键计数' },
  { type: EnchantmentType.QuestIterate, name: '迭代', targetAffix: AffixType.Recurse, event: 'equip_count', targetStacks: 0, effectDesc: '质变：暴击率不衰减', transformDesc: '完成后暴击重触发时暴击率不再减半' },
  { type: EnchantmentType.QuestSacrifice, name: '献祭', targetAffix: AffixType.Taboo, event: 'equip_count', targetStacks: 0, effectDesc: '质变：惩罚转为随机资源', transformDesc: '完成后惩罚触发时产出转为随机其他资源' },
  { type: EnchantmentType.QuestTwin, name: '镜像', targetAffix: AffixType.Twin, event: 'equip_count', targetStacks: 0, effectDesc: '质变：词条效果加倍', transformDesc: '完成后所有非 Twin 词条效果翻倍' },
  { type: EnchantmentType.QuestConduit, name: '导引', targetAffix: AffixType.Conduit, event: 'equip_count', targetStacks: 0, effectDesc: '质变：导能 +2', transformDesc: '完成后为邻居提供 2 次额外触发' },
  { type: EnchantmentType.QuestRelay, name: '中继', targetAffix: AffixType.Relay, event: 'equip_count', targetStacks: 0, effectDesc: '质变：中转全匹配', transformDesc: '完成后每次中转触发指定关系的所有匹配技能' },
  { type: EnchantmentType.QuestMultiplyOp, name: '乘算化', targetAffix: AffixType.Multiply, event: 'equip_count', targetStacks: 0, effectDesc: '质变：乘算化', transformDesc: '完成后产出变为乘算模式（资源×N 而非资源+N）' },
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
    currentDecayMult: 0,        // 衰减暴击率加成（每关重置为 initialMult）
    mirrorCopiedAffix: null,
    mirrorCopiedAffixes: [],
    stacks: 0,
    apprenticeAccumulated: 0,
    questStacks: 0,
    questCompletions: 0,
    questTransformed: false,
    counterCharges: 0,
    exhaustCount: 0,
    etherealTriggered: false,
  }
}

// ===== 词条参数随等级缩放 =====

/** 缩放模式 */
type ScalingMode = 'add' | 'mult' | 'add-dir'

interface AffixScalingEntry {
  param: keyof AffixInstance
  delta: number
  mode: ScalingMode
}

/** 词条参数每级增量表（来源：旧任务附魔数值强化） */
export const AFFIX_LEVEL_SCALING: Partial<Record<AffixType, AffixScalingEntry>> = {
  [AffixType.Crit]:     { param: 'chance',          delta: 0.05,  mode: 'add' },
  // Pulse: burstMult 已废弃（改为自触发），interval 无需缩放
  [AffixType.Cascade]:  { param: 'cascadeMult',    delta: 0.2,   mode: 'add' },
  [AffixType.Decay]:    { param: 'floor',           delta: 0.02,  mode: 'add' },
  [AffixType.Void]:     { param: 'bonusPerSlot',   delta: 0.05,  mode: 'add' },
  [AffixType.Charge]:   { param: 'maxBonus',       delta: 0.10,  mode: 'add' },
  [AffixType.Outcast]:  { param: 'bonusPercent',   delta: 0.15,  mode: 'add' },
  [AffixType.Convert]:  { param: 'k',              delta: 1.1,   mode: 'mult' },
  // Amplify 每层加成 = 基础产出（绝对值），无需额外参数缩放；升级通过 baseValues 自然增长
  [AffixType.Gravity]:  { param: 'probMult',       delta: 0.15,  mode: 'add-dir' },
  [AffixType.Recurse]:  { param: 'recurseChance',  delta: 0.03,  mode: 'add' },
  [AffixType.Taboo]:    { param: 'bonusPercent',   delta: 0.08,  mode: 'add' },
  [AffixType.WarDrum]:  { param: 'critPerStack',   delta: 0.005, mode: 'add' },
  [AffixType.Multiply]: { param: 'multiplyValue', delta: 0.2,   mode: 'add' },
  [AffixType.Splash]:   { param: 'splashCount',    delta: -1,    mode: 'add' },  // 间隔降低（升级更频繁触发）
  [AffixType.Resonance]:{ param: 'resonanceCount', delta: -1,    mode: 'add' },
  [AffixType.Relay]:    { param: 'relayCount',     delta: -1,    mode: 'add' },
}

/** 四舍五入到指定小数位 */
function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

/**
 * 就地修改词条参数，按升级级数缩放。
 * @param affixes 词条列表（就地修改）
 * @param levelsGained 升了几级（通常 1）
 */
export function applyAffixLevelScaling(affixes: AffixInstance[], levelsGained: number): void {
  for (const affix of affixes) {
    const entry = AFFIX_LEVEL_SCALING[affix.type]
    if (!entry) continue
    const cur = affix[entry.param] as number | undefined
    if (cur == null) continue

    if (entry.mode === 'add') {
      ;(affix as any)[entry.param] = roundTo(cur + entry.delta * levelsGained, 4)
    } else if (entry.mode === 'mult') {
      ;(affix as any)[entry.param] = roundTo(cur * (entry.delta ** levelsGained), 4)
    } else if (entry.mode === 'add-dir') {
      // Gravity: 吸引(>1) +delta, 排斥(<1) -delta, 中性(=1) 不变
      if (cur > 1) {
        ;(affix as any)[entry.param] = roundTo(Math.min(cur + entry.delta * levelsGained, 2), 4)
      } else if (cur < 1) {
        ;(affix as any)[entry.param] = roundTo(Math.max(cur - entry.delta * levelsGained, 0), 4)
      }
      // cur === 1 → 中性，不缩放
    }
  }
}

/**
 * 预览词条参数缩放后的值（不修改原词条）。
 * @returns null 表示该词条无缩放
 */
export function previewAffixScaledValue(
  affix: AffixInstance,
  levelsGained: number,
): { param: keyof AffixInstance; oldVal: number; newVal: number } | null {
  const entry = AFFIX_LEVEL_SCALING[affix.type]
  if (!entry) return null
  const cur = affix[entry.param] as number | undefined
  if (cur == null) return null

  let newVal: number
  if (entry.mode === 'add') {
    newVal = roundTo(cur + entry.delta * levelsGained, 4)
  } else if (entry.mode === 'mult') {
    newVal = roundTo(cur * (entry.delta ** levelsGained), 4)
  } else {
    // add-dir
    if (cur > 1) {
      newVal = roundTo(Math.min(cur + entry.delta * levelsGained, 2), 4)
    } else if (cur < 1) {
      newVal = roundTo(Math.max(cur - entry.delta * levelsGained, 0), 4)
    } else {
      return null // 中性不缩放
    }
  }

  return { param: entry.param, oldVal: cur, newVal }
}
