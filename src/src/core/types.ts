// ============================================
// 打字肉鸽 - 类型定义
// ============================================

import type { BossModifierId } from '../data/bossModifiers';
import type { PositionRelation } from '../data/keyboardTopology';

// === 资源系统 ===
export type ResourceType = 'base' | 'score' | 'multiplier' | 'time' | 'shield' | 'gold';

// === 产出者系统 ===
export type ProducerOperator = 'add' | 'multiply';

export interface ProducerDefinition {
  id: string;                       // prod_burst, prod_focus, ...
  name: string;                     // 爆发, 聚能, ...
  icon: string;                     // emoji
  resource: ResourceType;           // 目标资源
  operator: ProducerOperator;       // +N 或 ×N
  values: [number, number, number]; // Lv1, Lv2, Lv3
  desc: string;                     // 玩家可见描述
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

// === 连接者系统 ===
export type ConnectorTriggerType = 'copy' | 'resourceTrigger';

export interface ConnectorDefinition {
  id: string;                          // conn_copy_adjacent, conn_base_adjacent, ...
  name: string;                        // 映射, 震荡, ...
  icon: string;                        // emoji
  triggerType: ConnectorTriggerType;    // copy | resourceTrigger
  positionRelation: PositionRelation;   // 位置关系枚举
  resource?: ResourceType;             // 资源触发型专用：监听的资源
  desc: string;                        // 玩家可见描述
}

// === 附魔系统 ===
export type EnchantmentCategory = 'spatial' | 'transmutation' | 'independent';
export type SpatialEffectType = 'amplify' | 'splash' | 'resonance' | 'repulsion';

export interface EnchantmentDefinition {
  id: string;
  name: string;
  icon: string;
  category: EnchantmentCategory;
  spatialType?: SpatialEffectType;
  positionRelation?: PositionRelation;
  effectValue: number;           // 百分比系数 (0.20 = 20%) 或独立型倍率
  extraResource?: ResourceType;  // 变性型专用：额外产出的资源
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
  shield: number;      // 护盾层数（抵消错误输入）
  gold: number;        // 金币资源（跨词累加，战斗结束转入 state.gold）
}

// === 游戏状态 ===
export type GamePhase = 'battle' | 'shop' | 'gameover' | 'victory' | 'rest';

export interface GameState {
  level: number;
  phase: GamePhase;
  time: number;
  timeMax: number;
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
  bossModifierPool: BossModifierId[];  // Run 级别：3 个随机 Boss 修饰器 ID
  usedRestEvents: string[];            // Run 级别：已使用的休息事件 ID
  tempBuffs: TempBuff[];               // 临时 buff 列表（Act 级别过期）
  sealedKeys: SealedKey[];             // 封印键位列表（Act 结束后恢复）
  converterPool: string[];             // 本局转化者池（40 抽 20）
  connectorPool: string[];             // 本局连接者池（36 抽 18）
  pseudoInfiniteState: PseudoInfiniteState | null;  // 伪无限模式状态
  seenSkillTypes: Set<string>;                      // 已见技能类型（产出者/转化者/连接者 tooltip 跟踪）
  battleStats: BattleStats | null;                   // 上一战的统计数据（商店中展示）
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
  relics: Set<string>;
  wordDeck: string[];
  // 被动加成
  baseMultiplier: number;
  comboBonus: number;
  wordBonus: number;
  timeBonus: number;
  evolvedSkills: Map<string, string>;  // skillId → branchId
  enchantedSkills: Map<string, string>;  // skillId → enchantmentId
}

export interface ShopItem {
  id: string;              // 商品唯一 ID
  type: 'skill' | 'word';
  skillId?: string;
  word?: string;
  cost: number;
  isUpgrade: boolean;      // 重复技能 → true
  locked: boolean;         // 锁定（17.3）
  highlight?: string;      // 词语高频字母
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

// === 遗物系统 ===
export type RelicRarity = 'common' | 'rare' | 'epic';

export interface RelicDefinition {
  name: string;
  icon: string;
  desc: string;
  cost: number;
  rarity: RelicRarity;
  onAcquire?: () => void;
}

// === 词库系统 ===
export interface WordPool {
  words: string[];
  cost: number;
  tier: number;
  highlight?: string;
}

// (旧 ShopReward/ShopWord/ShopSkillItem 已移除，由 ShopItem 替代)

// === 联动系统 ===
export interface SynergyState {
  shieldCount: number;
  perfectStreak: number;
  wordSkillCount: number; // 当前词语触发的技能数量
  lastTriggeredSkillId: string | null; // 本词前一个触发的技能（每词重置）
  skillBaseScore: number; // 技能贡献的基础分（每词重置，结算面板使用）
  skillMultBonus: number; // 技能累积的倍率加成（断连击时重置）
  letterBaseScore: number; // 字母升级贡献的基础分（每词重置）
  // 附魔系统
  decayCounters: Map<string, number>; // ench_decay: 本词内每个技能的触发次数
}

export interface AdjacentSkill {
  key: string;
  skillId: string;
}

// === UI 元素引用 ===
export interface UIElements {
  // Battle
  battleScreen: HTMLElement;
  word: HTMLElement;
  combo: HTMLElement;
  score: HTMLElement;
  targetScore: HTMLElement;
  multiplier: HTMLElement;
  timerDisplay: HTMLElement;
  timerBar: HTMLElement;
  levelLabel: HTMLElement;
  triggerZone: HTMLElement;
  particles: HTMLElement;
  container: HTMLElement;
  playerRelics: HTMLElement;
  activeLibrary: HTMLElement;
  modifierInfo: HTMLElement;
  shieldDisplay: HTMLElement;
  shieldCount: HTMLElement;
  // Shop
  shopScreen: HTMLElement;
  shopLevelNum: HTMLElement;
  shopScore: HTMLElement;
  shopTarget: HTMLElement;
  shopBonus: HTMLElement;
  shopGold: HTMLElement;
  shopTabs: HTMLElement;
  rewardCards: HTMLElement;
  boundGrid: HTMLElement;
  ownedSkills: HTMLElement;
  wordCount: HTMLElement;
  ownedWords: HTMLElement;
  shopRelicIcons: HTMLElement;
  startBattleBtn: HTMLElement;
  // Rest
  restScreen: HTMLElement;
  // Gameover
  gameoverScreen: HTMLElement;
  gameoverStats: HTMLElement;
}
