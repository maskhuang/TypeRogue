// ============================================
// 打字肉鸽 - 牌包系统（条件筛选 + 元数据 + 牌包生成）
// ============================================

import { WORD_POOL } from './words';
import type { PackCondition, WordPack } from '../core/types';

// === 全量词汇缓存（惰性初始化） ===
let _allWords: string[] | null = null;

function getAllWords(): string[] {
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
          if (count >= 5) highFreqLetters.add(letter.toLowerCase());
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
      // 所有26个字母中，频率<5的视为低频
      for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(97 + i);
        const count = playerFreqs.get(letter) || 0;
        if (count < 5) lowFreqLetters.add(letter);
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
      return { name: `${letter}开头`, desc: `以${letter}开头的词`, icon: '🔤' };
    case 'ends_with':
      return { name: `${letter}结尾`, desc: `以${letter}结尾的词`, icon: '🔠' };
    case 'contains':
      return { name: `含${letter}`, desc: `包含字母${letter}的词`, icon: '🔍' };
    case 'contains_owned':
      return { name: '强化词包', desc: '包含你的高频字母的词', icon: '💪' };
    case 'contains_unowned':
      return { name: '探索词包', desc: '包含你的低频字母的词', icon: '🗺️' };
    case 'short':
      return { name: '短词精选', desc: '2-3字母的短词', icon: '⚡' };
    case 'long':
      return { name: '长词挑战', desc: '7+字母的长词', icon: '📏' };
    case 'special':
      return { name: '奇幻词包', desc: '特殊主题词', icon: '✨' };
    case 'high_freq':
      return { name: `${letter}高频`, desc: `高频${letter}字母词`, icon: '🎯' };
    default:
      return { name: '未知', desc: '', icon: '❓' };
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
 */
export function buildConditionPool(boundKeys: string[]): WeightedCondition[] {
  const bound = new Set(boundKeys.map(k => k.toLowerCase()));
  const pool: WeightedCondition[] = [];

  // starts_with / ends_with / contains — 26 个字母各一个变体
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(97 + i);
    const w = bound.has(letter) ? 3 : 1;
    pool.push({ condition: { type: 'starts_with', letter }, weight: w });
    pool.push({ condition: { type: 'ends_with', letter }, weight: w });
    pool.push({ condition: { type: 'contains', letter }, weight: w });
  }

  // contains_owned / contains_unowned — 固定权重
  pool.push({ condition: { type: 'contains_owned' }, weight: 2 });
  pool.push({ condition: { type: 'contains_unowned' }, weight: 2 });

  // short / long / special — 固定权重
  pool.push({ condition: { type: 'short' }, weight: 1 });
  pool.push({ condition: { type: 'long' }, weight: 1 });
  pool.push({ condition: { type: 'special' }, weight: 1 });

  // high_freq — 仅对有 _words 池的 15 个字母
  for (const letter of HIGH_FREQ_LETTERS) {
    pool.push({ condition: { type: 'high_freq', letter }, weight: bound.has(letter) ? 3 : 1 });
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

// === Fisher-Yates shuffle ===

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// === 牌包生成 ===

/**
 * 生成指定数量的牌包
 * @param ownedWords 玩家已拥有的词
 * @param playerFreqs 字频 Map（contains_owned/unowned 用）
 * @param boundKeys 玩家绑定技能的键位
 * @param count 要生成的牌包数量
 */
export function generateWordPacks(
  ownedWords: string[],
  playerFreqs: Map<string, number> | undefined,
  boundKeys: string[],
  count: number,
): WordPack[] {
  const pool = buildConditionPool(boundKeys);
  const packs: WordPack[] = [];

  while (packs.length < count && pool.length > 0) {
    // 加权随机选取
    const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * totalWeight;
    let pickedIndex = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].weight;
      if (roll <= 0) {
        pickedIndex = i;
        break;
      }
    }

    const picked = pool[pickedIndex];
    // 从池中移除已选条件
    pool.splice(pickedIndex, 1);

    // 筛选候选词
    const candidates = filterWordsByCondition(picked.condition, ownedWords, playerFreqs);
    if (candidates.length < 3) continue; // 候选不足，跳过

    // 随机抽 3 个
    const shuffled = shuffleArray(candidates);
    const words = shuffled.slice(0, 3);

    const meta = getConditionMeta(picked.condition);
    packs.push({
      condition: picked.condition,
      name: meta.name,
      desc: meta.desc,
      words,
      cost: calculatePackCost(picked.condition, words),
    });
  }

  return packs;
}
