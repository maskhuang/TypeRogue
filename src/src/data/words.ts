// ============================================
// 打字肉鸽 - 词库数据（基于 popular-english-words 热度排序生成）
// ============================================
// Story 57.1: WORD_POOL 迁至 data-json/words.json，本文件保留运行时函数

import type { WordPool } from '../core/types';
import { random } from '../core/seededRandom';
import { WORDS_DATA } from './schemas/words.schema';

export const WORD_POOL: Record<string, WordPool> = WORDS_DATA.wordPool as Record<string, WordPool>;


// === 获取起始词库（贪心选词，覆盖 ≤ MAX_STARTER_LETTERS 个不同字母） ===
const MAX_STARTER_LETTERS = 10;
const STARTER_WORD_COUNT = 10;

export function getStarterWords(): string[] {
  // 1. 收集 tier 1-2 候选词并洗牌
  const candidates: string[] = [];
  for (const pool of Object.values(WORD_POOL)) {
    if (pool.tier >= 1 && pool.tier <= 2) {
      candidates.push(...pool.words);
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // 2. 贪心选词：每个词计算新增字母数
  const selected: string[] = [];
  const coveredLetters = new Set<string>();

  for (const word of candidates) {
    if (selected.length >= STARTER_WORD_COUNT) break;

    const wordLetters = new Set<string>();
    for (const ch of word.toLowerCase()) {
      if (ch >= 'a' && ch <= 'z') wordLetters.add(ch);
    }

    // 计算新增字母数
    let newLetterCount = 0;
    for (const l of wordLetters) {
      if (!coveredLetters.has(l)) newLetterCount++;
    }

    // 若加入后总字母种类 > MAX_STARTER_LETTERS → 跳过（除非新增=0，全覆盖则始终接受）
    if (newLetterCount > 0 && coveredLetters.size + newLetterCount > MAX_STARTER_LETTERS) continue;

    selected.push(word);
    for (const l of wordLetters) coveredLetters.add(l);
  }

  // 3. 兜底：若不足 STARTER_WORD_COUNT，从候选中补选仅含已覆盖字母的词
  if (selected.length < STARTER_WORD_COUNT) {
    const selectedSet = new Set(selected);
    for (const word of candidates) {
      if (selected.length >= STARTER_WORD_COUNT) break;
      if (selectedSet.has(word)) continue;

      const wordLetters = new Set<string>();
      for (const ch of word.toLowerCase()) {
        if (ch >= 'a' && ch <= 'z') wordLetters.add(ch);
      }

      // 只接受不引入新字母的词
      let allCovered = true;
      for (const l of wordLetters) {
        if (!coveredLetters.has(l)) { allCovered = false; break; }
      }
      if (allCovered) {
        selected.push(word);
        selectedSet.add(word);
      }
    }
  }

  return selected;
}

// === 词库统计 ===
export interface DeckStats {
  totalWords: number;
  totalLetters: number;
  avgLength: string;
  freq: Record<string, number>;
  topLetters: [string, number][];
}

export function calculateDeckStats(wordDeck: string[]): DeckStats {
  const freq: Record<string, number> = {};
  let totalLetters = 0;
  const totalWords = wordDeck.length;
  let avgLength = 0;

  for (const word of wordDeck) {
    avgLength += word.length;
    for (const char of word.toLowerCase()) {
      if (/[a-z]/.test(char)) {
        freq[char] = (freq[char] || 0) + 1;
        totalLetters++;
      }
    }
  }

  const avgLengthStr = totalWords > 0 ? (avgLength / totalWords).toFixed(1) : '0';

  const freqPercent: Record<string, number> = {};
  for (const key in freq) {
    freqPercent[key] = Math.round((freq[key] / totalLetters) * 100);
  }

  const sorted = Object.entries(freqPercent).sort((a, b) => b[1] - a[1]);

  return {
    totalWords,
    totalLetters,
    avgLength: avgLengthStr,
    freq: freqPercent,
    topLetters: sorted.slice(0, 8),
  };
}
