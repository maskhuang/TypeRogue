// ============================================
// 打字肉鸽 - 类型定义
// ============================================

// === 游戏状态 ===
export type GamePhase = 'battle' | 'shop' | 'gameover' | 'victory';

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
  player: PlayerState;
  shop: ShopState;
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

/** 技能类别：主动需按键触发，被动持续生效 */
export type SkillCategory = 'active' | 'passive';

/** 技能类型 */
export type SkillType =
  | 'score' | 'multiply' | 'time' | 'protect'
  | 'core' | 'aura' | 'lone' | 'echo' | 'void' | 'ripple'
  | 'gamble' | 'chain' | 'overclock'
  | 'pulse' | 'sentinel' | 'mirror' | 'leech' | 'anchor';

/** 主动技能类型（需按键触发） */
export type ActiveSkillType = 'score' | 'multiply' | 'time' | 'protect' | 'echo' | 'ripple' | 'gamble' | 'chain' | 'overclock' | 'pulse' | 'sentinel' | 'leech';

/** 被动技能类型（持续生效，基于键盘布局） */
export type PassiveSkillType = 'core' | 'aura' | 'mirror' | 'anchor';

export interface SkillDefinition {
  name: string;
  icon: string;
  type: SkillType;
  /** 技能类别：主动/被动 */
  category: SkillCategory;
  base: number;
  grow: number;
  desc: string;
  evolutions?: [string, string];  // [branchA_id, branchB_id]
}

export interface SkillInstance {
  level: number;
  purchasePrice?: number;  // 购买价格（用于卖出半价计算）
}

// === 技能进化系统 ===
export interface EvolutionBranch {
  id: string;              // e.g., 'burst_inferno'
  name: string;            // e.g., '烈焰爆发'
  icon: string;            // emoji
  description: string;     // 玩家可见描述
  skillId: string;         // 父技能 ID
  branch: 'A' | 'B';      // 分支标识
  condition: {
    minLevel: number;      // 最低技能等级（通常为 3）
    goldCost: number;      // 进化金币消耗
  };
  flavorText?: string;     // 风味文字
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
  rippleBonus: Map<string, number>;
  echoTrigger: Set<string>;
  shieldCount: number;
  perfectStreak: number;
  wordSkillCount: number; // 当前词语触发的技能数量
  lastTriggeredSkillId: string | null; // 本词前一个触发的技能（每词重置）
  echoPending: boolean; // echo 标记：下一个非 echo 技能触发两次
  ripplePending: boolean; // ripple 标记：下一个非 ripple 技能效果传递
  ripplePassthrough: { score: number; multiply: number; time: number; gold: number; shield: number } | null; // ripple 传递的效果
  pulseCount: number; // pulse 触发计数器（每词重置）
  skillBaseScore: number; // 技能贡献的基础分（每词重置，结算面板使用）
  skillMultBonus: number; // 技能累积的倍率加成（断连击时重置）
  letterBaseScore: number; // 字母升级贡献的基础分（每词重置）
  // 进化系统
  wordCooldowns: Set<string>; // amp_overdrive: 冷却中的技能（每词重置）
  restoreComboCounters: Map<string, number>; // freeze_chrono: 触发计数（跨词保持）
  freezeTriggeredThisWord: Set<string>; // freeze_permafrost: 每词一次追踪
}

export interface AdjacentSkill {
  key: string;
  skillId: string;
  skill: SkillDefinition;
}

// === UI 元素引用 ===
export interface UIElements {
  // Battle
  battleScreen: HTMLElement;
  word: HTMLElement;
  feedback: HTMLElement;
  combo: HTMLElement;
  score: HTMLElement;
  targetScore: HTMLElement;
  multiplier: HTMLElement;
  timerDisplay: HTMLElement;
  timerBar: HTMLElement;
  levelLabel: HTMLElement;
  battleSkills: HTMLElement;
  triggerZone: HTMLElement;
  particles: HTMLElement;
  container: HTMLElement;
  playerRelics: HTMLElement;
  activeLibrary: HTMLElement;
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
  shopRelicIcons: HTMLElement;
  startBattleBtn: HTMLElement;
  // Gameover
  gameoverScreen: HTMLElement;
  gameoverStats: HTMLElement;
}
