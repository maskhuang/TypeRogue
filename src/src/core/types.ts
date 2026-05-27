// ============================================
// 打字肉鸽 - 类型定义
// ============================================

import type { BossModifierId } from '../data/bossModifiers';
import type { PositionRelation } from '../data/keyboardTopology';
import type { AffixSkillInstance, SkillRuntimeState } from '../data/affixes';

// === 职业系统 ===
export type ClassId = 'none' | 'wordsmith' | 'metamorph';
export type FeatureId = 'pack-system' | 'enchant-choice';

// === 资源系统 ===
export type ResourceType = 'base' | 'score' | 'multiplier' | 'time' | 'shield' | 'gold' | 'energy' | 'mutagen';

// === 造词师组装流水线 ===
export interface AssemblySlot {
  letter: string;       // 目标字母
  progress: number;     // 当前进度 0~1
  completed: boolean;   // 是否完成
}

export interface AssemblyPipeline {
  slots: AssemblySlot[];  // 流水线槽位（= 目标词的每个字母）
  targetWord: string;     // 正在组装的目标词
}

// === 产出者系统 ===
export type ProducerOperator = 'add' | 'multiply';
export type ProducerMechanic = 'standard' | 'charge' | 'decay' | 'pulse' | 'crit' | 'void';

export interface ChargeParams {
  gainPerSec: number;      // 每秒蓄力百分比 (0.08 = 8%/s)
  maxBonus: number;        // 上限 (2.0 = 200%)
}

export interface DecayParams {
  initialMult: number;     // 初始倍率 (2.0)
  decayPerTrigger: number; // 每次触发衰减量 (0.15)
  floor: number;           // 下限 (0.5)
}

export interface PulseParams {
  interval: number;        // 爆发间隔 (4 = 每第4次)
  burstMult: number;       // 爆发倍率 (3.0)
}

export interface CritParams {
  chance: number;          // 暴击概率 (0.5 = 50%)
  critMult: number;        // 暴击倍率 (2.0)
}

export interface VoidParams {
  posRel: PositionRelation; // 检测范围
  bonusPerSlot: number;     // 每空位加成百分比 (0.25 = 25%)
}

export type MechanicParams = ChargeParams | DecayParams | PulseParams | CritParams | VoidParams;

export interface ProducerDefinition {
  id: string;                       // prod_burst, prod_focus, ...
  name: string;                     // 爆发, 聚能, ...
  icon: string;                     // emoji
  resource: ResourceType;           // 目标资源
  operator: ProducerOperator;       // +N 或 ×N
  values: [number, number, number]; // Lv1, Lv2, Lv3
  desc: string;                     // 玩家可见描述
  mechanic?: ProducerMechanic;      // 机制类型（默认 'standard'）
  mechanicParams?: MechanicParams;  // 机制参数
}

// === 转化者系统 ===
export type ConverterFormula = 'add' | 'multiply';

export interface ConverterDefinition {
  id: string;              // conv_base_score_add, conv_base_score_mul, ...
  name: string;            // 变现, 加冕, ...
  icon: string;            // emoji
  source: ResourceType;    // 源资源（读取当前值，不消耗）
  target: ResourceType;    // 目标资源
  formula: ConverterFormula; // add | multiply
  k: number;               // 基础系数 (Lv1)
  desc: string;            // 玩家可见描述
}

// === 复制者系统 ===
export interface ReplicatorDefinition {
  id: string;                          // conn_copy_adjacent, ...
  name: string;                        // 映射, 广播, ...
  icon: string;                        // emoji
  positionRelation: PositionRelation;   // 位置关系枚举
  desc: string;                        // 玩家可见描述
}

// === 连接者系统 ===
export interface ConnectorDefinition {
  id: string;                          // conn_base_adjacent, ...
  name: string;                        // 震荡, 横波, ...
  icon: string;                        // emoji
  positionRelation: PositionRelation;   // 位置关系枚举
  resource: ResourceType;              // 监听的资源
  desc: string;                        // 玩家可见描述
}

// === 增幅者系统 ===
export interface AmplifierDefinition {
  id: string;                       // amp_base_adjacent, amp_mult_sameRow, ...
  name: string;                     // 铸基, 共振, ...
  icon: string;                     // 复合图标（资源图标+范围图标）
  resource: ResourceType;           // 增幅的目标资源
  positionRelation: PositionRelation; // 影响范围（相邻/同行/同列/...）
  valuePerStack: number;            // 每层增幅百分比（0.03 = 3%/层）
  desc: string;                     // 玩家可见描述
}

// === 增幅者状态 ===
export interface AmplifierState {
  stacks: number;  // 当前叠层数（关卡内累积，关卡结算清零）
}

// === 附魔系统 ===
export type EnchantmentCategory = 'spatial' | 'transmutation' | 'independent' | 'class-exclusive' | 'operator';
export type SpatialEffectType = 'growth' | 'splash' | 'resonance' | 'repulsion' | 'devour';

export interface EnchantmentDefinition {
  id: string;
  name: string;
  icon: string;
  category: EnchantmentCategory;
  spatialType?: SpatialEffectType;
  positionRelation?: PositionRelation;
  effectValue: number;           // 百分比系数 (0.20 = 20%) 或独立型倍率
  extraResource?: ResourceType;  // 变性型专用：额外产出的资源
  multiplyValues?: Record<ResourceType, [number, number, number]>;  // 运算符型：产出者资源→乘算值表
  converterMultiplyK?: Record<string, number>;  // 运算符型：转化者 ${source}_${target} → 乘算 k 值
  desc: string;
}

// === 战后统计 ===
export interface KeyStats {
  triggerCount: number;
  resources: Record<ResourceType, number>;
}

export interface SkillStats {
  triggerCount: number;
  resources: Record<ResourceType, number>;
  chainTriggered: number;
}

export interface BattleStats {
  keyStats: Map<string, KeyStats>;
  skillStats: Map<string, SkillStats>;
  wordsCompleted: number;
  totalChainTriggers: number;
  maxChainDepth: number;
  perfectWords: number;
  rating: string;
}

// === 伪无限模式 ===
export interface PseudoInfiniteState {
  intervalId: number;          // setInterval 返回的 ID
  participantKeys: string[];   // 循环内所有参与者的键位
}

export interface ResourceState {
  base: number;        // 基数（每击键 +1，技能/字母升级累加）
  score: number;       // 即时加分（直接累加到最终分数）— 产出者 prod_loot/prod_crit 写入
  multiplier: number;  // 倍率（基础 + 连击 + 技能加成）
  time: number;        // 时间资源（倒计时秒数）
  shield: number;      // 护盾资源（拥有时优先吸收时间流逝，时间视为暂停；无上限，每关重置）
  gold: number;        // 金币资源（跨词累加，战斗结束转入 state.gold）
  energy: number;      // 能量（造词师专属，本关累计）
  mutagen: number;     // 变异素（蜕变师专属，本关累计）
}

// === 游戏状态 ===
export type GamePhase = 'battle' | 'shop' | 'gameover' | 'victory' | 'ritual' | 'rest';

export interface GameState {
  classId: ClassId;
  level: number;
  phase: GamePhase;
  time: number;
  timeMax: number;
  shield: number;       // 护盾：拥有时时间流逝优先吃护盾（时间视为暂停），无上限，每关战斗开始重置为 0
  score: number;
  targetScore: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  wordScore: number;
  gold: number;
  wordPerfect: boolean;
  lastMilestone: number;
  overkill: number;  // 最后一击超出目标的分数
  overflowScore: number;  // Story 42.3: 跨关累积溢出分（不在关卡间清零）
  lastOverflowRatio: number;  // 上关溢出比例（overkill/targetScore），用于动态增长系数
  calibratedTargetBase: number;  // 第一关校准基数（第一关得分，替代 TARGET_BASE）
  ascensionLevel: number;        // Story 54.1: 本局 Ascension 级别（0-10）
  ascensionInitialModifier: string | null;  // Story 54.6: A6 初始弱化 modifier ID
  cycle: number;                        // 当前周目数（默认 1，通关 Boss 后 +1）
  runSeed: number;                      // Per-run 稳定种子（runStart 时设 Date.now()），用于装饰性轮换（如 banner 申领表单号）
  activeModifiers: BossModifierId[];    // 跨周目累积的 Boss 修饰器列表
  bossModifierPool: BossModifierId[];  // Boss 战前选择的临时修饰器（0-3 个）
  usedBossModifiers: BossModifierId[];  // Story 42.6: 本 Run 已用修饰器列表（不重复抽取用）
  eliteModifier: BossModifierId | null;  // 精英战选中的修饰器（保证出现在 Boss 选取中）
  usedRestEvents: string[];             // 已使用的休息关事件 ID（不重复抽取）
  tempBuffs: TempBuff[];               // 临时 buff 列表（Act 级别过期）
  sealedKeys: SealedKey[];             // 封印键位列表（Act 结束后恢复）
  pseudoInfiniteState: PseudoInfiniteState | null;  // 伪无限模式状态
  seenSkillTypes: Set<string>;                      // 已见技能类型（tooltip 跟踪）
  battleStats: BattleStats | null;                   // 上一战的统计数据（商店中展示）
  classResourceProduced: Record<string, number>;  // 本关累计职业资源产出（fragment/mutagen），每关重置
  fragmentInventory: Record<string, number>;       // 造词师：26 字母碎片库存（A-Z），跨关保持，Run 重置
  fragmentQueue: string[];                          // 造词师：采集队列字母序列（如 ['e','e','a','t','_','_']），跨关保持
  fragmentQueuePosition: number;                    // 造词师：采集队列当前位置（每关重置）
  craftedWords: string[];                           // 造词师：本 Run 已造词列表，跨关保持，Run 重置
  assemblyQueue: AssemblyPipeline[];               // 造词师：组装队列（跨关保持，完成后自动下一个）
  mutagenInventory: number;                        // 蜕变师：变异素库存，跨关保持，Run 重置
  affixSkills: Map<string, AffixSkillInstance>;      // 词条制技能定义（skillId → 完整技能数据），35.9
  affixSkillStates: Map<string, SkillRuntimeState>;  // 词条制技能运行时状态（skillId → 8字段状态），35.9
  ligatureStageCounts: Map<string, number>;           // Story 41-3: 质变 Ligature 关卡累计按键计数
  stageWordCounts: Map<string, number>;               // 造词师 FirstEdition/Reprint: 本关每个单词出现次数
  mutationACounts: Map<string, number>;              // 蜕变A累计次数（skillId → 次数），35.10
  isTutorial: boolean;                     // 教程模式
  endlessUnlocked: boolean;                // 无尽模式是否解锁
  gameMode: 'normal' | 'daily';           // 游戏模式
  dailySeed: number | null;                // 每日挑战种子（daily 模式时非 null）
  wordEffects: Map<string, WordEffect>;
  resources: ResourceState;
  player: PlayerState;
  shop: ShopState;
}

// === 临时 Buff 系统 ===
export interface TempBuff {
  type: 'multiplier' | 'time' | 'targetScore';
  value: number;           // +1.0, -10, 1.5 等
  expiresAtNode: number;   // 在哪个节点后过期
}

// === 封印键位系统 ===
export interface SealedKey {
  key: string;           // 被封印的键位
  skillId: string;       // 原绑定的技能 ID
  expiresAtNode: number; // 过期节点
}

export interface PlayerState {
  word: string;
  index: number;
  bindings: Map<string, string>;  // key -> skillId
  skills: Map<string, SkillInstance>;
  relics: Set<string>; // 上限 MAX_RELIC_SLOTS (12)
  relicStates: Record<string, number>; // 遗物可变状态（ramen 等）
  wordDeck: string[];
  // 被动加成
  baseMultiplier: number;
  comboBonus: number;
  wordBonus: number;
  timeBonus: number;
  evolvedSkills: Map<string, string>;  // skillId → branchId (legacy, kept for save compat)
  collectedWords: Set<string>;  // 词汇收藏：本 Run 已完成单词（36.7）
  inbox: string[];  // IN-tray: 终端购入待装配的 skillId 列表（上限 INBOX_MAX）
}

export interface ShopItem {
  id: string;              // 商品唯一 ID
  type: 'skill' | 'pack' | 'relic' | 'enchantment';
  skillId?: string;
  affixSkill?: AffixSkillInstance;  // 词条制技能数据（35.9）
  pack?: WordPack;         // 牌包数据（type='pack' 时）
  relicId?: string;        // 遗物 ID（type='relic' 时）
  enchantmentType?: string;        // 附魔类型（type='enchantment' 时，Story 41.1）
  transmuteRes?: ResourceType;     // 嬗变目标资源（附魔商品用，Story 41.1）
  neighborRel?: string;            // 位置关系（附魔商品用，Story 41.1）
  cost: number;
  isUpgrade: boolean;      // 重复技能 → true
  locked: boolean;         // 锁定（17.3）
}

export interface ShopState {
  items: ShopItem[];       // 5 个商品
  refreshCount: number;    // 刷新次数（17.3）
}

// === 技能系统 ===

/** 技能实例（玩家持有） */
export interface SkillInstance {
  level: number;
  purchasePrice?: number;  // 购买价格（用于卖出半价计算）
}

// === 词语效果系统 ===
export type WordEffectType = 'base_score' | 'base_multiplier' | 'multiplier' | 'time' | 'gold' | 'crit' | 'init_time' | 'init_gold' | 'grant_skill';
export interface WordEffect { type: WordEffectType; value: number; targetLetter?: string; }

// === 词库系统 ===
export interface WordPool {
  words: string[];
  cost: number;
  tier: number;
  highlight?: string;
}

// === 牌包系统 ===
export type PackConditionType =
  | 'starts_with'
  | 'ends_with'
  | 'contains'
  | 'contains_owned'
  | 'contains_unowned'
  | 'short'
  | 'long'
  | 'special'
  | 'high_freq';

export interface PackCondition {
  type: PackConditionType;
  letter?: string;  // starts_with/ends_with/contains/high_freq 需要
}

export interface WordPack {
  condition: PackCondition;
  name: string;
  desc: string;
  words: string[];       // 候选词（普通1个，稀有/史诗3个）
  pickCount: number;     // 玩家选几个（当前全部=1）
  cost: number;
  rarity: 0 | 1 | 2 | 3;
  wordEffect?: WordEffect;
}

// (旧 ShopReward/ShopWord/ShopSkillItem 已移除，由 ShopItem 替代)

// === 联动系统 ===
export interface SynergyState {
  wordSkillCount: number; // 当前词语触发的技能数量
  lastTriggeredSkillId: string | null; // 本词前一个触发的技能（每词重置）
  skillBaseScore: number; // 技能贡献的基础分（每词重置，结算面板使用）
  skillMultBonus: number; // 技能累积的倍率加成（断连击时重置）
  letterBaseScore: number; // 字母升级贡献的基础分（每词重置）
  triggeredSkillIds: Set<string>; // 本词内已触发过的技能 ID（每词重置，Proofread 校勘用）
}

export interface AdjacentSkill {
  key: string;
  skillId: string;
}

// === UI 元素引用 ===
export interface UIElements {
  // Menu
  mainMenuScreen: HTMLElement;
  // Battle
  battleScreen: HTMLElement;
  word: HTMLElement;
  combo: HTMLElement;
  score: HTMLElement;
  targetScore: HTMLElement;
  multiplier: HTMLElement;
  timerDisplay: HTMLElement;
  timeAccel: HTMLElement;
  timerBar: HTMLElement;
  shieldDisplay: HTMLElement;
  levelLabel: HTMLElement;
  triggerZone: HTMLElement;
  particles: HTMLElement;
  container: HTMLElement;
  playerRelics: HTMLElement;
  activeLibrary: HTMLElement;
  modifierInfo: HTMLElement;
  // Shop
  shopScreen: HTMLElement;
  shopLevelNum: HTMLElement;
  shopScore: HTMLElement;
  shopTarget: HTMLElement;
  shopGold: HTMLElement;
  shopTabs: HTMLElement;
  rewardCards: HTMLElement;
  boundGrid: HTMLElement;
  ownedSkills: HTMLElement;
  wordCount: HTMLElement;
  ownedWords: HTMLElement;
  startBattleBtn: HTMLElement;
  // Ritual
  ritualScreen: HTMLElement;
  // Gameover
  gameoverScreen: HTMLElement;
  gameoverStats: HTMLElement;
}
