// ============================================
// 打字肉鸽 - 词条制技能系统 数据定义
// ============================================
// Story 35.1: 核心数据结构与词条定义
// 设计文档: docs/design/affix-skill-system.md

import type { ResourceType } from '../core/types'
import { PositionRelation } from './keyboardTopology'
// Story 57.1: 大部分静态表迁至 data-json/affixes.json
import { AFFIXES_DATA } from './schemas/affixes.schema'

// ===== 词条类型枚举（31 类，6 类别） ====

export enum AffixType {
  // ── 数值型 numeric ──
  Convert = 'convert',
  Rainbow = 'rainbow',
  Multiply = 'multiply',
  // ── 暴击型 crit ──
  Crit = 'crit',
  Charge = 'charge',
  Decay = 'decay',
  Recurse = 'recurse',
  Taboo = 'taboo',
  Fallacy = 'fallacy',
  // ── 叠层型 stack ──
  Amplify = 'amplify',
  Splash = 'splash',
  Resonance = 'resonance',
  Echo = 'echo',
  Fury = 'fury',
  Tide = 'tide',
  WarDrum = 'war_drum',
  // ── 拓扑型 topology ──
  Void = 'void',
  Swarm = 'swarm',
  Mercenary = 'mercenary',
  Mirror = 'mirror',
  Cascade = 'cascade',
  Flow = 'flow',
  Confluence = 'confluence',
  Union = 'union',
  // ── 词感型 word_sense ──
  Outcast = 'outcast',
  Gravity = 'gravity',
  Ligature = 'ligature',
  // ── 元规则型 meta_rule ──
  Relay = 'relay',
  Conduit = 'conduit',
  Twin = 'twin',
  Innate = 'innate',
  Exhaust = 'exhaust',
  Reflect = 'reflect',
  MonkeyPatch = 'monkey_patch',
  Excavate = 'excavate',
  Treasure = 'treasure',
  Refine = 'refine',
  Evolve = 'evolve',
  Harvest = 'harvest',
  Chain = 'chain',
  Volatile = 'volatile',
  Mutacrit = 'mutacrit',
  Ascend = 'ascend',
  Reecho = 'reecho',
  Myopia = 'myopia',
  AuraFury = 'aura_fury',
  AuraMorale = 'aura_morale',
  Fiber = 'fiber',
  Silkworm = 'silkworm',
  Repulsion = 'repulsion',
  // ── 造词师专属：词内时序型 ──
  Handoff = 'handoff',   // 接力：本技能触发时，让同词之后第一个待触发的技能额外触发 N 次
  Rewind = 'rewind',     // 回溯：本技能触发时，依次让同词已触发的最近 N 个技能各额外触发 1 次
  Endow = 'endow',       // 遗产：本次产出不结算，按标准化转为底分送给同词之后 N 个技能
}

// ===== 词条类别 =====

export type AffixCategory = 'numeric' | 'crit' | 'stack' | 'topology' | 'word_sense' | 'meta_rule' | 'production'

export const AFFIX_CATEGORY_MAP: Record<AffixType, AffixCategory[]> = AFFIXES_DATA.affixCategoryMap as Record<AffixType, AffixCategory[]>

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
  ApprenticeCrit = 'apprentice_crit',
  // ── 任务型（需技能拥有对应词条） ──
  QuestConvertAccum = 'quest_convert_accum',
  QuestDevour = 'quest_devour',
  QuestOverload = 'quest_overload',
  QuestChain = 'quest_chain',
  QuestPurify = 'quest_purify',
  QuestCharge = 'quest_charge',
  QuestRefine = 'quest_refine',
  QuestEnergize = 'quest_energize',
  QuestStack = 'quest_stack',
  QuestPolarize = 'quest_polarize',
  QuestSpectrum = 'quest_spectrum',
  QuestMirror = 'quest_mirror',
  QuestOverlap = 'quest_overlap',
  QuestIterate = 'quest_iterate',
  QuestSacrifice = 'quest_sacrifice',
  QuestTwin = 'quest_twin',
  QuestRelay = 'quest_relay',
  QuestSplash = 'quest_splash',
  QuestFury = 'quest_fury',
  QuestTide = 'quest_tide',
  QuestResonance = 'quest_resonance',
  QuestEcho = 'quest_echo',
  QuestUnion = 'quest_union',
  QuestConduit = 'quest_conduit',
  QuestMultiplyOp = 'quest_multiply_op',
  QuestWarDrum = 'quest_war_drum',
  QuestFallacy = 'quest_fallacy',
  QuestInnate = 'quest_innate',
  QuestExhaust = 'quest_exhaust',
  QuestFlow = 'quest_flow',
  QuestConfluence = 'quest_confluence',
  QuestReflect = 'quest_reflect',
  QuestMonkeyPatch = 'quest_monkey_patch',
  QuestExcavate = 'quest_excavate',
  QuestTreasure = 'quest_treasure',
  QuestMutaRefine = 'quest_muta_refine',
  QuestEvolve = 'quest_evolve',
  QuestHarvest = 'quest_harvest',
  QuestMutaChain = 'quest_muta_chain',
  QuestVolatile = 'quest_volatile',
  QuestMutacrit = 'quest_mutacrit',
  QuestAscend = 'quest_ascend',
  QuestSwarmPropagate = 'quest_swarm_propagate',
  QuestMercenaryWarlord = 'quest_mercenary_warlord',
  QuestRepulsionVacuum = 'quest_repulsion_vacuum',
  QuestSilkwormCocoon = 'quest_silkworm_cocoon',
  QuestAuraGlobal = 'quest_aura_global',
  QuestAuraUniversal = 'quest_aura_universal',
  QuestFiberPierce = 'quest_fiber_pierce',
  QuestAmplifyPulse = 'quest_amplify_pulse',
  QuestReechoRumble = 'quest_reecho_rumble',
  QuestMyopiaForesight = 'quest_myopia_foresight',
  // ── 附加产出（触发时额外产出指定资源） ──
  BonusOutput = 'bonus_output',
  // ── 运算符（保留类型，现通过质变获取） ──
  MultiplyOperator = 'multiply_operator',
}

// ===== 任务附魔 ↔ 词条映射 =====

export const QUEST_AFFIX_MAP: Partial<Record<EnchantmentType, AffixType | AffixType[]>> = {
  [EnchantmentType.QuestDevour]: AffixType.Void,
  [EnchantmentType.QuestOverload]: AffixType.Crit,
  [EnchantmentType.QuestChain]: AffixType.Cascade,
  [EnchantmentType.QuestPurify]: AffixType.Decay,
  [EnchantmentType.QuestCharge]: AffixType.Outcast,    // 蓄势→流放
  [EnchantmentType.QuestRefine]: AffixType.Convert,
  [EnchantmentType.QuestEnergize]: AffixType.Charge,    // 充能→蓄力
  [EnchantmentType.QuestStack]: AffixType.Amplify,
  [EnchantmentType.QuestPolarize]: AffixType.Gravity,
  [EnchantmentType.QuestSpectrum]: AffixType.Rainbow,
  [EnchantmentType.QuestMirror]: AffixType.Mirror,
  [EnchantmentType.QuestOverlap]: AffixType.Ligature,
  [EnchantmentType.QuestIterate]: AffixType.Recurse,
  [EnchantmentType.QuestSacrifice]: AffixType.Taboo,
  [EnchantmentType.QuestConvertAccum]: AffixType.Convert,
  [EnchantmentType.QuestTwin]: AffixType.Twin,
  [EnchantmentType.QuestRelay]: AffixType.Relay,
  [EnchantmentType.QuestSplash]: AffixType.Splash,
  [EnchantmentType.QuestFury]: AffixType.Fury,
  [EnchantmentType.QuestTide]: AffixType.Tide,
  [EnchantmentType.QuestResonance]: AffixType.Resonance,
  [EnchantmentType.QuestEcho]: AffixType.Echo,
  [EnchantmentType.QuestUnion]: AffixType.Union,
  [EnchantmentType.QuestConduit]: AffixType.Conduit,
  [EnchantmentType.QuestMultiplyOp]: AffixType.Multiply,
  [EnchantmentType.QuestWarDrum]: AffixType.WarDrum,
  [EnchantmentType.QuestFallacy]: AffixType.Fallacy,
  [EnchantmentType.QuestInnate]: AffixType.Innate,
  [EnchantmentType.QuestExhaust]: AffixType.Exhaust,
  [EnchantmentType.QuestFlow]: AffixType.Flow,
  [EnchantmentType.QuestConfluence]: AffixType.Confluence,
  [EnchantmentType.QuestReflect]: AffixType.Reflect,
  [EnchantmentType.QuestMonkeyPatch]: AffixType.MonkeyPatch,
  [EnchantmentType.QuestExcavate]: AffixType.Excavate,
  [EnchantmentType.QuestTreasure]: AffixType.Treasure,
  [EnchantmentType.QuestMutaRefine]: AffixType.Refine,
  [EnchantmentType.QuestEvolve]: AffixType.Evolve,
  [EnchantmentType.QuestHarvest]: AffixType.Harvest,
  [EnchantmentType.QuestMutaChain]: AffixType.Chain,
  [EnchantmentType.QuestVolatile]: AffixType.Volatile,
  [EnchantmentType.QuestMutacrit]: AffixType.Mutacrit,
  [EnchantmentType.QuestAscend]: AffixType.Ascend,
  [EnchantmentType.QuestSwarmPropagate]: AffixType.Swarm,
  [EnchantmentType.QuestMercenaryWarlord]: AffixType.Mercenary,
  [EnchantmentType.QuestRepulsionVacuum]: AffixType.Repulsion,
  [EnchantmentType.QuestSilkwormCocoon]: AffixType.Silkworm,
  [EnchantmentType.QuestAuraGlobal]: [AffixType.AuraFury, AffixType.AuraMorale, AffixType.Conduit],
  [EnchantmentType.QuestAuraUniversal]: [AffixType.AuraFury, AffixType.AuraMorale, AffixType.Conduit],
  [EnchantmentType.QuestFiberPierce]: AffixType.Fiber,
  [EnchantmentType.QuestAmplifyPulse]: AffixType.Amplify,
  [EnchantmentType.QuestReechoRumble]: AffixType.Reecho,
  [EnchantmentType.QuestMyopiaForesight]: AffixType.Myopia,
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

export const ENCHANTMENT_META: Record<string, EnchantmentMeta> = AFFIXES_DATA.enchantmentMeta as Record<string, EnchantmentMeta>

/** @deprecated 嬗变系已删除（Story 41.2），保留供旧存档兼容 */
export const TRANSMUTE_NAMES: Record<ResourceType, string> = AFFIXES_DATA.transmuteNames as Record<ResourceType, string>

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
  chance?: number                  // Crit: 暴击概率
  critMult?: number                // Crit: 暴击乘数
  posRel?: PositionRelation        // Void/Mirror/Amplify/Cascade
  bonusPerSlot?: number            // Void: 每空位加成%
  swarmK?: number                  // Swarm: 每个虫群邻居加成%
  hireCost?: number                // Mercenary: 每次触发消耗金币
  hireBonus?: number               // Mercenary: 金币足够时产出加成%
  resource?: ResourceType          // Amplify: 关联资源
  cascadeMult?: number             // Cascade: 级联乘数
  bonusPercent?: number            // Outcast: 首尾字母加成% / Taboo: 暴击率加成
  probMult?: number                // Gravity: 单词出现概率倍率（0~2）
  recurseChance?: number           // Recurse: 重触发概率 15%~30%
  critPerStack?: number            // WarDrum: 每层暴击率
  outcastInterval?: number         // Outcast: 叠层满层间隔（满层触发词另一端）
  spent?: boolean                  // Exhaust: 耗尽后无效化
  reflectK?: number                // Reflect: affixCount × level × K
  patchLow?: number                // MonkeyPatch: 随机系数下界
  patchHigh?: number               // MonkeyPatch: 随机系数上界
  ligatureBonus?: number           // Ligature: 每重复字母的额外乘数加成（1.0 = ×nOccurrences, 1.5 = ×nOcc×1.5）
  innateCount?: number             // Innate: 每关开始自动触发次数
  fallacyK?: number                // Fallacy: 每次未暴击增加的暴击率
  fallacyStacks?: number           // Fallacy: 连续未暴击计数（运行时）
  multiplyValue?: number           // Multiply: 产出乘数 ×N
  interval?: number                // Resonance/Echo: 叠层满层间隔
  echoAffixA?: AffixType           // Echo: 监听的词条类型A
  echoAffixB?: AffixType           // Echo: 监听的词条类型B
  tideRate?: number                // Tide: 每秒叠层速率
  flowK?: number                   // Flow: 每单位归一化落差的 bonusPercent
  unionK?: number                  // Union: 每个匹配技能的 bonusPercent
  confluenceK?: number             // Confluence: 资源多样性加成系数
  maxTriggers?: number             // Exhaust: 最大触发次数
  exhaustMult?: number             // Exhaust: 每次触发 base 倍率
  devourXp?: number                // Void: 吞噬累积经验（运行时）
  devourLevel?: number             // Void: 吞噬等级（运行时）
  reechoPenalty?: number           // Reecho: 每次打错累积的产出惩罚%
  myopiaBonus?: number             // Myopia: 产出加成%
  myopiaCost?: number              // Myopia: 每次触发增加的目标分数
  amplifyK?: number                // Amplify: 给匹配技能的bonusPercent加成
  auraCrit?: number                // AuraFury: 给匹配技能的暴击率加成
  auraMorale?: number              // AuraMorale: 给匹配技能的bonusPercent加成
  fiberInterval?: number           // Fiber: 叠层满层间隔
  silkwormK?: number               // Silkworm: 每点累积损失底分的产出加成%
  handoffCount?: number            // Handoff: 让同词下 1 个技能额外触发 N 次
  rewindCount?: number             // Rewind: 依次触发同词上 N 个已触发技能
  endowCount?: number              // Endow: 向同词下 N 个技能捐赠标准化基础产出
}

// ===== 稀有度 =====

export type SkillRarity = 0 | 1 | 2 | 3

export const RARITY_NAMES: Record<SkillRarity, string> = AFFIXES_DATA.rarityNames as unknown as Record<SkillRarity, string>

export const RARITY_COLORS: Record<SkillRarity, string> = AFFIXES_DATA.rarityColors as unknown as Record<SkillRarity, string>

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
  bonusOutputResource?: ResourceType     // 附加产出附魔目标资源
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
  stacks: number                   // 通用叠层计数（增幅加成等，每关重置）
  // ── 附魔状态 ──
  apprenticeAccumulated: number    // 学徒(含丰收/适应): 永久成长累积%
  questStacks: number              // 任务: 当前叠层进度
  questCompletions: number         // 任务: 已完成次数
  questTransformed: boolean        // 任务: 已质变（首次完成后永久 true）
  // ── 元规则型运行时 ──
  exhaustCount: number             // Exhaust: 累计触发次数（跨关）
  // ── 暴击连击追踪 ──
  critStreak: number               // 连续暴击次数（miss 归零，每关重置）
  missStreak: number               // 连续 miss 次数（暴击归零，每关重置）
  // ── MonkeyPatch 运行时 ──
  patchTargetIndex: number         // 被补丁的词条索引（-1=无效，每关重置）
  patchMultiplier: number          // 随机系数（每关重置，默认 1.0）
  mutacritAccum: number            // Mutacrit：蜕变永久累积暴击率
  reechoStacks: number             // Reecho：当前词内打错累积次数（逐词重置）
  silkwormStacks: number           // Silkworm：当前词内累积损失底分数（逐词重置）
  wordBaseBonus: number            // Endow：本词基础产出加成（逐词重置）
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
  return 3
}

/** 附魔触发等级门槛（统一 Lv.3） */
export function getEnchantmentThreshold(rarity: number): number {
  return 3
}

// ===== 常量表 =====

/** 暴击固定乘数（全局暴击子系统） */
export const CRIT_MULTIPLIER = 2

/** 命运硬币：暴击率上限（超出部分转化为暴击倍数） */
export const FATE_COIN_CRIT_CAP = 0.5
/** 命运硬币：超出暴击率→暴击倍数转化系数（每 1% 超出 = +0.02× 暴击倍数） */
export const FATE_COIN_CONVERSION = 2

/** 基底值：7 种资源 × 4 等级（白装可达 Lv4） */
export const BASE_VALUES: Record<ResourceType, number[]> = AFFIXES_DATA.baseValues as Record<ResourceType, number[]>

/** 词条职业限制：仅指定职业可使用（未列出=全职业通用） */
export const AFFIX_CLASS_RESTRICTION: Partial<Record<AffixType, string>> = AFFIXES_DATA.affixClassRestriction as Partial<Record<AffixType, string>>

/** 词条权重键：所有 AffixType（除 Convert 拆为 cross/self） */
export type AffixWeightKey = Exclude<AffixType, AffixType.Convert> | 'convert_cross' | 'convert_self'

/** 词条权重分档：'high' = 6-10 随机，'low' = 1-4 随机，'none' = 0（禁用） */
export type AffixWeightTier = 'high' | 'low' | 'none'

/** 词条基准分档表（每局开始时据此随机生成实际权重） */
export const AFFIX_WEIGHT_TIERS: Record<AffixWeightKey, AffixWeightTier> = AFFIXES_DATA.affixWeightTiers as Record<AffixWeightKey, AffixWeightTier>

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
export const VOID_BONUS_TABLE: Record<PositionRelation, number> = AFFIXES_DATA.voidBonusTable as Record<PositionRelation, number>

/** 虫群词条 swarmK 按 PositionRelation（与虚无统一） */
export const SWARM_BONUS_TABLE: Record<PositionRelation, number> = AFFIXES_DATA.swarmBonusTable as Record<PositionRelation, number>

/** 落差词条 flowK 按 PositionRelation（与虚无统一） */
export const FLOW_BONUS_TABLE: Record<PositionRelation, number> = AFFIXES_DATA.flowBonusTable as Record<PositionRelation, number>

/** 汇流词条 confluenceK 按 PositionRelation（与虚无统一） */
export const CONFLUENCE_BONUS_TABLE: Record<PositionRelation, number> = AFFIXES_DATA.confluenceBonusTable as Record<PositionRelation, number>

/** 联合词条 unionK 按 PositionRelation（与虚无统一） */
export const UNION_BONUS_TABLE: Record<PositionRelation, number> = AFFIXES_DATA.unionBonusTable as Record<PositionRelation, number>

/** 转化词条 k 值校准表：[k_min, k_max]（触发层已按 BASE_VALUES 归一化，统一区间） */
export const CONVERT_K_TABLE: Record<ResourceType, [number, number]> = AFFIXES_DATA.convertKTable as Record<ResourceType, [number, number]>

// ===== 自动命名 =====

export const AFFIX_NAMES: Record<AffixType, string> = AFFIXES_DATA.affixNames as Record<AffixType, string>

/** 词条功能说明（玩家可读） */
export const AFFIX_DESCRIPTIONS: Record<AffixType, string> = AFFIXES_DATA.affixDescriptions as Record<AffixType, string>

export const RESOURCE_NAMES: Record<ResourceType, string> = AFFIXES_DATA.resourceNames as Record<ResourceType, string>

/** 稀有度掷骰概率 */
export const RARITY_PROBABILITIES: [number, number, number, number] = [0.40, 0.30, 0.20, 0.10]

// ===== 衍生附魔比率表（per-resource） =====

/** @deprecated 嬗变系已删除（Story 41.2），保留供旧存档兼容 */
export const TRANSMUTE_RATIO_TABLE: Record<ResourceType, number> = AFFIXES_DATA.transmuteRatioTable as Record<ResourceType, number>

// ===== 乘算化运算符校准表（per-resource） =====

/** 乘算化附魔：将加算层各项 bonus 转为独立乘数时的校准系数（初始全 1.0，后续平衡调优） */
export const MULTIPLY_OPERATOR_CALIBRATION: Record<ResourceType, number> = AFFIXES_DATA.multiplyOperatorCalibration as Record<ResourceType, number>

/** 乘算化附魔：基础值替换表（加算基底 → 乘数基底，来源 Story 34.2 旧乘算产出者） */
export const MULTIPLY_OPERATOR_BASE_VALUES: Record<ResourceType, number[]> = AFFIXES_DATA.multiplyOperatorBaseValues as Record<ResourceType, number[]>

// ===== 学徒·观摩 growthPerProc 按 PositionRelation =====

export const APPRENTICE_NEIGHBOR_GROWTH: Record<PositionRelation, number> = AFFIXES_DATA.apprenticeNeighborGrowth as Record<PositionRelation, number>

// ===== 职业限定附魔 =====

export const CLASS_RESTRICTED_ENCHANTMENTS: Record<string, EnchantmentType[]> = AFFIXES_DATA.classRestrictedEnchantments as Record<string, EnchantmentType[]>

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
  | 'affixProc' | 'affixProc:cascade' | 'affixProc:recurse' | 'affixProc:taboo_penalty'
  | 'critHit' | 'outcastProc'
  | 'longWord:6' | 'perfectWord' | 'comboReach:15'
  | 'stageCleared' | 'mutationApplied'
  | 'equip_count'

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
  { type: EnchantmentType.QuestDevour, name: '吞噬', targetAffix: AffixType.Void, event: 'equip_count', targetStacks: 0, effectDesc: '质变：吞噬成长', transformDesc: '每次触发吞噬最弱邻居，获得经验并升级（bonusPerSlot+5%/级）' },
  { type: EnchantmentType.QuestOverload, name: '过载', targetAffix: AffixType.Crit, event: 'equip_count', targetStacks: 0, effectDesc: '质变：暴击强化', transformDesc: '暴击倍率翻倍（×2→×4）' },
  { type: EnchantmentType.QuestChain, name: '连锁', targetAffix: AffixType.Cascade, event: 'equip_count', targetStacks: 0, effectDesc: '质变：双向连锁', transformDesc: '完成后级联双向判定，反向键也触发' },
  { type: EnchantmentType.QuestPurify, name: '净化', targetAffix: AffixType.Decay, event: 'equip_count', targetStacks: 0, effectDesc: '质变：衰减反转为增长', transformDesc: '完成后衰减方向反转，越触发越强' },
  { type: EnchantmentType.QuestCharge, name: '谢幕', targetAffix: AffixType.Outcast, event: 'equip_count', targetStacks: 0, effectDesc: '质变：谢幕', transformDesc: '暴击时触发词首字母键上的技能' },
  { type: EnchantmentType.QuestRefine, name: '精炼', targetAffix: AffixType.Convert, event: 'equip_count', targetStacks: 0, effectDesc: '质变：双向转化', transformDesc: '完成后转化同时反向产出到源资源' },
  { type: EnchantmentType.QuestEnergize, name: '充能', targetAffix: AffixType.Charge, event: 'equip_count', targetStacks: 0, effectDesc: '质变：满蓄力自动完成', transformDesc: '满蓄力释放时自动打完当前单词，所有被触发技能获得等量产出倍率' },
  { type: EnchantmentType.QuestStack, name: '层叠', targetAffix: AffixType.Amplify, event: 'equip_count', targetStacks: 0, effectDesc: '质变：叠层触发', transformDesc: '完成后增幅叠层时触发指定关系的匹配技能一次' },
  { type: EnchantmentType.QuestPolarize, name: '潮汐锁定', targetAffix: AffixType.Gravity, event: 'equip_count', targetStacks: 0, effectDesc: '质变：潮汐锁定', transformDesc: '含本键字母的单词必定出现' },
  { type: EnchantmentType.QuestConvertAccum, name: '汲取', targetAffix: AffixType.Convert, event: 'equip_count', targetStacks: 0, effectDesc: '质变：读取存量', transformDesc: '改为读取源资源的累积存量而非技能产出量' },
  { type: EnchantmentType.QuestSpectrum, name: '光谱', targetAffix: AffixType.Rainbow, event: 'equip_count', targetStacks: 0, effectDesc: '质变：全资源产出', transformDesc: '完成后产出等比分摊到所有资源' },
  { type: EnchantmentType.QuestMirror, name: '映射', targetAffix: AffixType.Mirror, event: 'equip_count', targetStacks: 0, effectDesc: '质变：全词条复制', transformDesc: '完成后复制指定关系的所有邻居的不同类型词条' },
  { type: EnchantmentType.QuestOverlap, name: '重叠', targetAffix: AffixType.Ligature, event: 'equip_count', targetStacks: 0, effectDesc: '质变：关卡累计计数', transformDesc: '完成后连字按关卡累计按键计数' },
  { type: EnchantmentType.QuestIterate, name: '迭代', targetAffix: AffixType.Recurse, event: 'equip_count', targetStacks: 0, effectDesc: '质变：暴击率不衰减', transformDesc: '完成后暴击重触发时暴击率不再减半' },
  { type: EnchantmentType.QuestSacrifice, name: '献祭', targetAffix: AffixType.Taboo, event: 'equip_count', targetStacks: 0, effectDesc: '质变：惩罚转为随机资源', transformDesc: '完成后惩罚触发时产出转为随机其他资源' },
  { type: EnchantmentType.QuestTwin, name: '镜像', targetAffix: AffixType.Twin, event: 'equip_count', targetStacks: 0, effectDesc: '质变：词条效果加倍', transformDesc: '完成后所有非 Twin 词条效果翻倍' },
  { type: EnchantmentType.QuestSplash, name: '连锁溅射', targetAffix: AffixType.Splash, event: 'equip_count', targetStacks: 0, effectDesc: '质变：二次溅射', transformDesc: '被溅射的技能还会触发溅射范围内的1个匹配技能' },
  { type: EnchantmentType.QuestFury, name: '狂暴', targetAffix: AffixType.Fury, event: 'equip_count', targetStacks: 0, effectDesc: '质变：暴击光环', transformDesc: '自触发时所有技能本词暴击率+20%' },
  { type: EnchantmentType.QuestTide, name: '涨潮', targetAffix: AffixType.Tide, event: 'equip_count', targetStacks: 0, effectDesc: '质变：连击加速', transformDesc: '叠层速率随连击数递增（×combo/10）' },
  { type: EnchantmentType.QuestResonance, name: '谐振', targetAffix: AffixType.Resonance, event: 'equip_count', targetStacks: 0, effectDesc: '质变：商店保底', transformDesc: '商店中一定会出现同资源技能' },
  { type: EnchantmentType.QuestEcho, name: '共鸣腔', targetAffix: AffixType.Echo, event: 'equip_count', targetStacks: 0, effectDesc: '质变：商店保底', transformDesc: '商店中一定会出现含监听词条的技能' },
  { type: EnchantmentType.QuestUnion, name: '集结', targetAffix: AffixType.Union, event: 'equip_count', targetStacks: 0, effectDesc: '质变：商店保底', transformDesc: '商店中一定会出现匹配技能' },
  { type: EnchantmentType.QuestRelay, name: '中继', targetAffix: AffixType.Relay, event: 'equip_count', targetStacks: 0, effectDesc: '质变：触发全匹配', transformDesc: '完成后每次触发指定关系的所有匹配技能' },
  { type: EnchantmentType.QuestConduit, name: '导引', targetAffix: AffixType.Conduit, event: 'equip_count', targetStacks: 0, effectDesc: '质变：导能 +2', transformDesc: '完成后为邻居提供 2 次额外触发' },
  { type: EnchantmentType.QuestMultiplyOp, name: '乘算化', targetAffix: AffixType.Multiply, event: 'equip_count', targetStacks: 0, effectDesc: '质变：乘算化', transformDesc: '完成后产出变为乘算模式（资源×N 而非资源+N）' },
  { type: EnchantmentType.QuestWarDrum, name: '战号', targetAffix: AffixType.WarDrum, event: 'equip_count', targetStacks: 0, effectDesc: '质变：暴击回馈', transformDesc: '邻居暴击时获得额外+2叠层' },
  { type: EnchantmentType.QuestFallacy, name: '豪赌', targetAffix: AffixType.Fallacy, event: 'equip_count', targetStacks: 0, effectDesc: '质变：豪赌暴击', transformDesc: '暴击时暴击倍率按累计未暴击层数提升（+层数×K）' },
  { type: EnchantmentType.QuestInnate, name: '觉醒', targetAffix: AffixType.Innate, event: 'equip_count', targetStacks: 0, effectDesc: '质变：词语觉醒', transformDesc: '完成词语时也自动触发（次数同关卡开始）' },
  { type: EnchantmentType.QuestExhaust, name: '燃尽', targetAffix: AffixType.Exhaust, event: 'equip_count', targetStacks: 0, effectDesc: '质变：终结技', transformDesc: '最后一次触发时bonus额外×3' },
  { type: EnchantmentType.QuestFlow, name: '瀑布', targetAffix: AffixType.Flow, event: 'equip_count', targetStacks: 0, effectDesc: '质变：双向落差', transformDesc: '邻居比自己低时也加bonus' },
  { type: EnchantmentType.QuestConfluence, name: '洪流', targetAffix: AffixType.Confluence, event: 'equip_count', targetStacks: 0, effectDesc: '质变：分流产出', transformDesc: '每种独特资源额外产出到该资源' },
  { type: EnchantmentType.QuestReflect, name: '内省', targetAffix: AffixType.Reflect, event: 'equip_count', targetStacks: 0, effectDesc: '质变：无限成长', transformDesc: '去除等级上限，每次升级获得一个随机词条' },
  { type: EnchantmentType.QuestMonkeyPatch, name: '热更新', targetAffix: AffixType.MonkeyPatch, event: 'equip_count', targetStacks: 0, effectDesc: '质变：全体patch', transformDesc: '同时修改所有同技能词条（倍率缩为×0.8~1.5）' },
  { type: EnchantmentType.QuestExcavate, name: '深渊', targetAffix: AffixType.Excavate, event: 'equip_count', targetStacks: 0, effectDesc: '质变：传说挖掘', transformDesc: '被蜕变时获得传说遗物（无视等级）' },
  { type: EnchantmentType.QuestTreasure, name: '宝库', targetAffix: AffixType.Treasure, event: 'equip_count', targetStacks: 0, effectDesc: '质变：传说寻宝', transformDesc: '被蜕变时下次商店出现传说商品（无视等级）' },
  { type: EnchantmentType.QuestMutaRefine, name: '精炼', targetAffix: AffixType.Refine, event: 'equip_count', targetStacks: 0, effectDesc: '质变：超额退还', transformDesc: '被蜕变时退还200%变异素' },
  { type: EnchantmentType.QuestEvolve, name: '突变', targetAffix: AffixType.Evolve, event: 'equip_count', targetStacks: 0, effectDesc: '质变：必定进化', transformDesc: '100%稀有度+1且额外+1词条' },
  { type: EnchantmentType.QuestHarvest, name: '丰收', targetAffix: AffixType.Harvest, event: 'equip_count', targetStacks: 0, effectDesc: '质变：黄金收割', transformDesc: '被蜕变时获得250金币' },
  { type: EnchantmentType.QuestMutaChain, name: '瘟疫', targetAffix: AffixType.Chain, event: 'equip_count', targetStacks: 0, effectDesc: '质变：全域连锁', transformDesc: '被蜕变时全键盘技能一起蜕变' },
  { type: EnchantmentType.QuestVolatile, name: '临界', targetAffix: AffixType.Volatile, event: 'equip_count', targetStacks: 0, effectDesc: '质变：持久不稳定', transformDesc: '被蜕变后下3关效果×2.0' },
  { type: EnchantmentType.QuestMutacrit, name: '变异基因', targetAffix: AffixType.Mutacrit, event: 'equip_count', targetStacks: 0, effectDesc: '质变：全技能暴击', transformDesc: '被蜕变时所有已装备技能+暴击率' },
  { type: EnchantmentType.QuestAscend, name: '超越', targetAffix: AffixType.Ascend, event: 'equip_count', targetStacks: 0, effectDesc: '质变：全技能升级', transformDesc: '被蜕变时所有已装备技能升1级' },
  { type: EnchantmentType.QuestSwarmPropagate, name: '繁殖', targetAffix: AffixType.Swarm, event: 'equip_count', targetStacks: 0, effectDesc: '质变：虫群繁殖', transformDesc: '触发时25%概率向全场随机无虫群技能传播虫群词条' },
  { type: EnchantmentType.QuestMercenaryWarlord, name: '佣兵王', targetAffix: AffixType.Mercenary, event: 'equip_count', targetStacks: 0, effectDesc: '质变：囤金暴力', transformDesc: '加成额外乘以(1+金币÷消耗×10)，金币越多越强' },
  { type: EnchantmentType.QuestRepulsionVacuum, name: '真空', targetAffix: AffixType.Repulsion, event: 'equip_count', targetStacks: 0, effectDesc: '质变：真空', transformDesc: '含本键字母的单词必不出现' },
  { type: EnchantmentType.QuestSilkwormCocoon, name: '化茧', targetAffix: AffixType.Silkworm, event: 'equip_count', targetStacks: 0, effectDesc: '质变：化茧', transformDesc: '累积 8 层后本关不再消耗底分且加成保留（逐关重置）' },
  { type: EnchantmentType.QuestAuraGlobal, name: '全域光环', targetAffix: [AffixType.AuraFury, AffixType.AuraMorale, AffixType.Conduit], event: 'equip_count', targetStacks: 0, effectDesc: '质变：全域', transformDesc: '光环作用范围变为全场' },
  { type: EnchantmentType.QuestAuraUniversal, name: '普照光环', targetAffix: [AffixType.AuraFury, AffixType.AuraMorale, AffixType.Conduit], event: 'equip_count', targetStacks: 0, effectDesc: '质变：普照', transformDesc: '光环不再限制匹配技能，作用于范围内所有技能' },
  { type: EnchantmentType.QuestFiberPierce, name: '贯穿', targetAffix: AffixType.Fiber, event: 'equip_count', targetStacks: 0, effectDesc: '质变：贯穿', transformDesc: '满层时触发单词中所有字母键的技能（排除首字母）' },
  { type: EnchantmentType.QuestAmplifyPulse, name: '脉冲', targetAffix: AffixType.Amplify, event: 'equip_count', targetStacks: 0, effectDesc: '质变：脉冲', transformDesc: '叠层时触发范围内1个非匹配技能' },
  { type: EnchantmentType.QuestReechoRumble, name: '轰鸣', targetAffix: AffixType.Reecho, event: 'equip_count', targetStacks: 0, effectDesc: '质变：轰鸣', transformDesc: '打错时随机触发一个含回音词条的技能' },
  { type: EnchantmentType.QuestMyopiaForesight, name: '远见', targetAffix: AffixType.Myopia, event: 'equip_count', targetStacks: 0, effectDesc: '质变：远见', transformDesc: '目标分数每1000点额外+100%产出加成' },
]

// ===== 旧系统技能识别（存档迁移用）=====

/** 旧系统技能 ID 前缀（Epic 19/34: Producer/Converter/Connector/Amplifier） */
export const OLD_SKILL_PREFIXES = AFFIXES_DATA.oldSkillPrefixes

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
    exhaustCount: 0,
    critStreak: 0,
    missStreak: 0,
    patchTargetIndex: -1,
    patchMultiplier: 1.0,
    mutacritAccum: 0,
    reechoStacks: 0,
    silkwormStacks: 0,
    wordBaseBonus: 0,
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
  // ── 暴击类 ──
  [AffixType.Crit]:     { param: 'chance',          delta: 0.05,  mode: 'add' },
  [AffixType.Charge]:   { param: 'maxBonus',       delta: 0.25,  mode: 'add' },
  [AffixType.Decay]:    { param: 'floor',           delta: 0.02,  mode: 'add' },
  [AffixType.Recurse]:  { param: 'recurseChance',  delta: 0.03,  mode: 'add' },
  [AffixType.Taboo]:    { param: 'bonusPercent',   delta: 0.08,  mode: 'add' },
  [AffixType.Fallacy]:  { param: 'fallacyK',       delta: 0.02,  mode: 'add' },
  // ── 数值类 ──
  // Convert: 无参数缩放（固定100%标准化转化率）
  [AffixType.Multiply]: { param: 'multiplyValue', delta: 0.2,   mode: 'add' },
  [AffixType.Cascade]:  { param: 'cascadeMult',    delta: 0.2,   mode: 'add' },
  [AffixType.Outcast]:  { param: 'bonusPercent',     delta: 0.10,  mode: 'add' },
  [AffixType.Void]:     { param: 'bonusPerSlot',   delta: 0.05,  mode: 'add' },
  [AffixType.Swarm]:    { param: 'swarmK',         delta: 0.04,  mode: 'add' },
  [AffixType.Mercenary]:{ param: 'hireBonus',      delta: 0.20,  mode: 'add' },
  [AffixType.Gravity]:  { param: 'probMult',       delta: 0.25,  mode: 'add' },
  [AffixType.Exhaust]:  { param: 'exhaustMult',    delta: 0.3,   mode: 'add' },
  [AffixType.Reflect]:  { param: 'reflectK',       delta: 0.01,  mode: 'add' },
  // ── 叠层类 ──
  [AffixType.Resonance]:{ param: 'interval',       delta: -1,    mode: 'add' },
  [AffixType.Echo]:     { param: 'interval',       delta: -1,    mode: 'add' },
  [AffixType.Fury]:     { param: 'interval',       delta: -1,    mode: 'add' },
  [AffixType.Tide]:     { param: 'interval',       delta: -1,    mode: 'add' },
  [AffixType.WarDrum]:  { param: 'critPerStack',   delta: 0.005, mode: 'add' },
  // ── 拓扑类 ──
  [AffixType.Flow]:     { param: 'flowK',          delta: 0.02,  mode: 'add' },
  [AffixType.Union]:     { param: 'unionK',        delta: 0.03,  mode: 'add' },
  [AffixType.Confluence]:{ param: 'confluenceK',   delta: 0.05,  mode: 'add' },
  // ── 其他 ──
  [AffixType.Ligature]:  { param: 'ligatureBonus',  delta: 0.25,  mode: 'add' },
  [AffixType.Innate]:    { param: 'innateCount',    delta: 1,     mode: 'add' },
  [AffixType.MonkeyPatch]:{ param: 'patchHigh',     delta: 0.3,   mode: 'add' },
  [AffixType.Reecho]:   { param: 'reechoPenalty',  delta: -0.03, mode: 'add' },
  [AffixType.Myopia]:   { param: 'myopiaBonus',    delta: 0.20,  mode: 'add' },
  [AffixType.AuraFury]: { param: 'auraCrit',       delta: 0.03,  mode: 'add' },
  [AffixType.AuraMorale]:{ param: 'auraMorale',    delta: 0.05,  mode: 'add' },
  [AffixType.Fiber]:    { param: 'fiberInterval',  delta: -1,    mode: 'add' },
  [AffixType.Silkworm]: { param: 'silkwormK',      delta: 0.10,  mode: 'add' },
  [AffixType.Repulsion]:{ param: 'probMult',       delta: -0.10, mode: 'add' },
  [AffixType.Amplify]: { param: 'amplifyK',       delta: 0.01,  mode: 'add' },
  // Rainbow / Twin / Mirror / Conduit: 无可缩放数值参数
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
