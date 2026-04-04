// ============================================
// 打字肉鸽 - 牌包系统（条件筛选 + 元数据 + 牌包生成）
// ============================================

import { WORD_POOL } from './words';
import type { PackCondition, PackConditionType, WordPack, WordEffect, WordEffectType } from '../core/types';
import { random } from '../core/seededRandom';
import { t } from '../demo/demo-i18n';
import { rollRarity } from './skillGeneration';
import type { SkillRarity } from './affixes';
import { FREQ_UNLOCK_THRESHOLD } from '../systems/letters/LetterFrequencySystem';

// === 牌包稀有度常量 ===

/** 稀有度 → 候选词数 [普通1, 稀有3, 史诗3, 传说3] */
const PACK_RARITY_CANDIDATE_COUNT: [number, number, number, number] = [1, 3, 3, 3];

/** 稀有度 → 玩家选几个（全部=1） */
const PACK_RARITY_PICK_COUNT: [number, number, number, number] = [1, 1, 1, 1];

/** 稀有度 → 定价基础 */
const PACK_RARITY_BASE_PRICE: [number, number, number, number] = [5, 12, 18, 25];

/** 稀有度 → 允许的条件类型集合（null = 全部允许） */
const PACK_RARITY_ALLOWED_CONDITIONS: Record<SkillRarity, Set<PackConditionType> | null> = {
  0: null, // 普通：全部
  1: null, // 稀有：全部（但排除 contains_unowned，见过滤逻辑）
  2: new Set(['contains_owned', 'high_freq', 'long', 'contains']),
  3: new Set(['contains_owned', 'high_freq']),
};

/** 稀有度 → 排除的条件类型 */
const PACK_RARITY_EXCLUDED_CONDITIONS: Record<SkillRarity, Set<PackConditionType> | null> = {
  0: null,
  1: new Set(['contains_unowned']),
  2: null,
  3: null,
};

// === 全量词汇缓存（惰性初始化） ===
let _allWords: string[] | null = null;

export function getAllWords(): string[] {
  if (!_allWords) {
    const seen = new Set<string>();
    _allWords = [];
    for (const pool of Object.values(WORD_POOL)) {
      for (const w of pool.words) {
        const lower = w.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          _allWords.push(lower);
        }
      }
    }
  }
  return _allWords;
}

// === 核心筛选函数 ===

/**
 * 根据牌包条件筛选候选词，排除已拥有的词
 * @param condition 牌包条件
 * @param ownedWords 玩家已拥有的词
 * @param playerFreqs 玩家字频 Map<字母, 出现次数>（contains_owned/contains_unowned 需要）
 */
export function filterWordsByCondition(
  condition: PackCondition,
  ownedWords: string[],
  playerFreqs?: Map<string, number>,
): string[] {
  const owned = new Set(ownedWords.map(w => w.toLowerCase()));

  let candidates: string[];

  switch (condition.type) {
    case 'starts_with': {
      const letter = (condition.letter || '').toLowerCase();
      if (!letter) return [];
      candidates = getAllWords().filter(w => w.startsWith(letter));
      break;
    }
    case 'ends_with': {
      const letter = (condition.letter || '').toLowerCase();
      if (!letter) return [];
      candidates = getAllWords().filter(w => w.endsWith(letter));
      break;
    }
    case 'contains': {
      const letter = (condition.letter || '').toLowerCase();
      if (!letter) return [];
      candidates = getAllWords().filter(w => w.includes(letter));
      break;
    }
    case 'contains_owned': {
      const highFreqLetters = new Set<string>();
      if (playerFreqs) {
        playerFreqs.forEach((count, letter) => {
          if (count >= FREQ_UNLOCK_THRESHOLD) highFreqLetters.add(letter.toLowerCase());
        });
      }
      if (highFreqLetters.size === 0) return [];
      candidates = getAllWords().filter(w =>
        [...highFreqLetters].some(l => w.includes(l)),
      );
      break;
    }
    case 'contains_unowned': {
      if (!playerFreqs) return [];
      const lowFreqLetters = new Set<string>();
      // 所有26个字母中，频率<阈值的视为低频
      for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(97 + i);
        const count = playerFreqs.get(letter) || 0;
        if (count < FREQ_UNLOCK_THRESHOLD) lowFreqLetters.add(letter);
      }
      if (lowFreqLetters.size === 0) return [];
      candidates = getAllWords().filter(w =>
        [...lowFreqLetters].some(l => w.includes(l)),
      );
      break;
    }
    case 'short': {
      const pool = WORD_POOL['short'];
      candidates = pool ? pool.words.map(w => w.toLowerCase()) : [];
      break;
    }
    case 'long': {
      const pool = WORD_POOL['long'];
      candidates = pool ? pool.words.map(w => w.toLowerCase()) : [];
      break;
    }
    case 'special': {
      const pool = WORD_POOL['special'];
      candidates = pool ? pool.words.map(w => w.toLowerCase()) : [];
      break;
    }
    case 'high_freq': {
      const letter = (condition.letter || '').toLowerCase();
      if (!letter) return [];
      const poolKey = `${letter}_words`;
      const pool = WORD_POOL[poolKey];
      candidates = pool ? pool.words.map(w => w.toLowerCase()) : [];
      break;
    }
    default:
      candidates = [];
  }

  // 排除已拥有的词
  return candidates.filter(w => !owned.has(w));
}

// === 条件元数据 ===

interface ConditionMeta {
  name: string;
  desc: string;
  icon: string;
}

export function getConditionMeta(condition: PackCondition): ConditionMeta {
  const letter = (condition.letter || '').toUpperCase();

  switch (condition.type) {
    case 'starts_with':
      return { name: t('pack.starts_with', { letter }), desc: t('pack.starts_with.desc', { letter }), icon: '🔤' };
    case 'ends_with':
      return { name: t('pack.ends_with', { letter }), desc: t('pack.ends_with.desc', { letter }), icon: '🔠' };
    case 'contains':
      return { name: t('pack.contains', { letter }), desc: t('pack.contains.desc', { letter }), icon: '🔍' };
    case 'contains_owned':
      return { name: t('pack.contains_owned'), desc: t('pack.contains_owned.desc'), icon: '💪' };
    case 'contains_unowned':
      return { name: t('pack.contains_unowned'), desc: t('pack.contains_unowned.desc'), icon: '🗺️' };
    case 'short':
      return { name: t('pack.short'), desc: t('pack.short.desc'), icon: '⚡' };
    case 'long':
      return { name: t('pack.long'), desc: t('pack.long.desc'), icon: '📏' };
    case 'special':
      return { name: t('pack.special'), desc: t('pack.special.desc'), icon: '✨' };
    case 'high_freq':
      return { name: t('pack.high_freq', { letter }), desc: t('pack.high_freq.desc', { letter }), icon: '🎯' };
    default:
      return { name: t('pack.unknown'), desc: '', icon: '❓' };
  }
}

// === 条件候选池与权重 ===

/** WORD_POOL 中实际存在 _words 池的字母（动态派生） */
const HIGH_FREQ_LETTERS = Object.keys(WORD_POOL)
  .filter(k => k.endsWith('_words'))
  .map(k => k[0]);

export interface WeightedCondition {
  condition: PackCondition;
  weight: number;
}

/**
 * 构建所有条件实例及权重
 * @param boundKeys 玩家当前绑定技能的键位
 * @param playerFreqs 玩家字频（低频绑定键 high_freq 提权用）
 * @param act 当前 Act（Act 感知权重调整用）
 */
export function buildConditionPool(
  boundKeys: string[],
  playerFreqs?: Map<string, number>,
  act?: number,
): WeightedCondition[] {
  const bound = new Set(boundKeys.map(k => k.toLowerCase()));
  const currentAct = act ?? 1;
  const pool: WeightedCondition[] = [];

  // 按键位状态分配权重：已有+绑定=3，未拥有=2，已有+未绑定=0.5
  const owned = new Set<string>();
  if (playerFreqs) {
    playerFreqs.forEach((freq, letter) => { if (freq >= FREQ_UNLOCK_THRESHOLD) owned.add(letter); });
  }
  function letterWeight(letter: string): number {
    if (bound.has(letter)) return 3;       // 已有且绑定技能
    if (!owned.has(letter)) return 2;      // 未拥有键位
    return 0.5;                            // 已有且未绑定技能
  }

  // starts_with / ends_with / contains — 26 个字母各一个变体
  // QJXV 稀有字母首尾词包权重提升
  const RARE_LETTERS = new Set(['q', 'j', 'x', 'v']);
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(97 + i);
    const w = letterWeight(letter);
    const rareBoost = (RARE_LETTERS.has(letter) && !owned.has(letter)) ? 3 : 1;
    pool.push({ condition: { type: 'starts_with', letter }, weight: w * rareBoost });
    pool.push({ condition: { type: 'ends_with', letter }, weight: w * rareBoost });
    pool.push({ condition: { type: 'contains', letter }, weight: w });
  }

  // contains_owned / contains_unowned
  pool.push({ condition: { type: 'contains_owned' }, weight: 3 });
  pool.push({ condition: { type: 'contains_unowned' }, weight: 2 });

  // short / long / special
  pool.push({ condition: { type: 'short' }, weight: 1 });
  pool.push({ condition: { type: 'long' }, weight: 1 });
  pool.push({ condition: { type: 'special' }, weight: 1 });

  // high_freq — 仅对有 _words 池的字母
  for (const letter of HIGH_FREQ_LETTERS) {
    pool.push({ condition: { type: 'high_freq', letter }, weight: letterWeight(letter) });
  }

  return pool;
}

// === 牌包定价 ===

const BASE_PACK_COST: Record<string, number> = {
  short: 15,
  long: 25,
  special: 30,
  high_freq: 20,
};
const DEFAULT_PACK_COST = 18;

/**
 * 计算牌包价格
 * @param condition 牌包条件
 * @param words 牌包内的词
 */
export function calculatePackCost(condition: PackCondition, words: string[]): number {
  const baseCost = BASE_PACK_COST[condition.type] ?? DEFAULT_PACK_COST;
  const avgLen = words.length > 0
    ? words.reduce((sum, w) => sum + w.length, 0) / words.length
    : 0;
  return baseCost + Math.floor(avgLen / 2);
}

// === 词语效果池（史诗/传说词包附带效果） ===

const WORD_EFFECT_POOL: { type: WordEffectType; epicVal: number; legendVal: number }[] = [
  { type: 'base_score', epicVal: 1, legendVal: 2 },
  { type: 'multiplier', epicVal: 0.1, legendVal: 0.2 },
  { type: 'time',       epicVal: 0.3, legendVal: 0.5 },
  { type: 'gold',       epicVal: 1, legendVal: 2 },
];

function rollWordEffect(rarity: 2 | 3): WordEffect {
  const entry = WORD_EFFECT_POOL[Math.floor(random() * WORD_EFFECT_POOL.length)];
  return {
    type: entry.type,
    value: rarity === 3 ? entry.legendVal : entry.epicVal,
  };
}

// === Fisher-Yates shuffle ===

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// === 频率变化提示 ===

/**
 * 计算牌包中词语带来的字母频率增幅
 * @returns 按增幅降序排列的 [字母, 增幅] 数组
 */
export function getFreqDelta(words: string[]): [string, number][] {
  const delta = new Map<string, number>();
  for (const word of words) {
    for (const ch of word.toLowerCase()) {
      if (ch >= 'a' && ch <= 'z') {
        delta.set(ch, (delta.get(ch) || 0) + 1);
      }
    }
  }
  return [...delta.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * 生成频率变化提示文本（取增幅最大的 1-2 个字母，≥2 次）
 * 注意：统计所有字母（词库层面的频率变化），
 * 与 shop.ts getFreqHints 不同（仅统计绑定键字母，用于展开词行）
 */
function formatFreqHint(words: string[]): string {
  const sorted = getFreqDelta(words).filter(([, n]) => n >= 2);
  if (sorted.length === 0) return '';
  const top = sorted.slice(0, 2);
  return top.map(([l, n]) => `+${n} ${l.toUpperCase()}`).join(' · ');
}

// === 牌包生成 ===

/**
 * 生成指定数量的牌包
 * @param ownedWords 玩家已拥有的词
 * @param playerFreqs 字频 Map（contains_owned/unowned 用）
 * @param boundKeys 玩家绑定技能的键位
 * @param count 要生成的牌包数量
 * @param act 当前 Act（Act 感知权重调整用）
 */
/**
 * 按稀有度过滤条件池
 */
function filterPoolByRarity(pool: WeightedCondition[], rarity: SkillRarity): WeightedCondition[] {
  const allowed = PACK_RARITY_ALLOWED_CONDITIONS[rarity];
  const excluded = PACK_RARITY_EXCLUDED_CONDITIONS[rarity];

  return pool.filter(p => {
    if (allowed && !allowed.has(p.condition.type)) return false;
    if (excluded && excluded.has(p.condition.type)) return false;
    return true;
  });
}

export function generateWordPacks(
  ownedWords: string[],
  playerFreqs: Map<string, number> | undefined,
  boundKeys: string[],
  count: number,
  act?: number,
  maxRarity?: SkillRarity,
): WordPack[] {
  const fullPool = buildConditionPool(boundKeys, playerFreqs, act);
  const packs: WordPack[] = [];
  const usedIndices = new Set<number>();

  while (packs.length < count) {
    // 每个牌包先掷稀有度，clamp 到 Act 上限
    let rarity = rollRarity();
    if (maxRarity !== undefined && rarity > maxRarity) {
      rarity = maxRarity;
    }

    // 按稀有度过滤条件池（排除已使用的条件）
    const available = filterPoolByRarity(fullPool, rarity)
      .filter(p => !usedIndices.has(fullPool.indexOf(p)));
    if (available.length === 0) break;

    // 加权随机选取
    const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
    let roll = random() * totalWeight;
    let picked: WeightedCondition = available[available.length - 1];
    for (let i = 0; i < available.length; i++) {
      roll -= available[i].weight;
      if (roll <= 0) {
        picked = available[i];
        break;
      }
    }

    // 标记已使用
    const originalIndex = fullPool.indexOf(picked);
    usedIndices.add(originalIndex);

    // 候选词数 = 稀有度对应数量（普通1，稀有/史诗/传说3）
    const wordCount = PACK_RARITY_CANDIDATE_COUNT[rarity];
    const pickCount = PACK_RARITY_PICK_COUNT[rarity];

    // 筛选候选词
    const candidates = filterWordsByCondition(picked.condition, ownedWords, playerFreqs);
    if (candidates.length < wordCount) continue; // 候选不足，跳过

    // 随机抽词
    const shuffled = shuffleArray(candidates);
    const words = shuffled.slice(0, wordCount);

    const meta = getConditionMeta(picked.condition);
    const freqHint = formatFreqHint(words);
    const desc = freqHint ? `${meta.desc} · ${freqHint}` : meta.desc;
    // 定价 = 基础价 + 平均词长
    const avgWordLen = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const pack: WordPack = {
      condition: picked.condition,
      name: meta.name,
      desc,
      words,
      pickCount,
      cost: PACK_RARITY_BASE_PRICE[rarity] + Math.floor(avgWordLen),
      rarity,
    };
    // 史诗/传说牌包附带词语效果
    if (rarity >= 2) {
      pack.wordEffect = rollWordEffect(rarity as 2 | 3);
    }
    packs.push(pack);
  }

  return packs;
}
