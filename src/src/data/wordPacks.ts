// ============================================
// 打字肉鸽 - 牌包系统（条件筛选 + 元数据）
// ============================================

import { WORD_POOL } from './words';
import type { PackCondition } from '../core/types';

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
