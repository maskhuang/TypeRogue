// ============================================
// 打字肉鸽 - 词库数据
// ============================================

import type { WordPool } from '../core/types';

export const WORD_POOL: Record<string, WordPool> = {
  // === 基础词 (初始拥有) ===
  starter: {
    words: 'fire ice bolt spark flame frost storm flash light dark'.split(' '),
    cost: 0,
    tier: 0,
  },

  // === 常见词 (便宜) ===
  common: {
    words: 'burn heat cold snow wind rain wave rock dust sand gold iron steel blade sword shield guard strike slash attack block rush dash jump spin flow glow beam ray cast'.split(' '),
    cost: 5,
    tier: 1,
  },

  // === 技能词 - F系列 ===
  f_words: {
    words: 'fire flame flash frost fury forge fuel fuse flare fever fierce force flood fall fast fade fear fate fame face'.split(' '),
    cost: 8,
    tier: 2,
    highlight: 'f',
  },

  // === 技能词 - S系列 ===
  s_words: {
    words: 'storm spark strike slash shield surge spark steel swift skill spell spin speed shade shine shock snow soul'.split(' '),
    cost: 8,
    tier: 2,
    highlight: 's',
  },

  // === 技能词 - T系列 ===
  t_words: {
    words: 'thunder tide torch twist turn tide test tech trap true time tide tear tank trek torch tower'.split(' '),
    cost: 8,
    tier: 2,
    highlight: 't',
  },

  // === 技能词 - E系列 ===
  e_words: {
    words: 'ember edge echo elite energy earth ever evil eye ease each east edge emit etch even'.split(' '),
    cost: 8,
    tier: 2,
    highlight: 'e',
  },

  // === 短词 (高速) ===
  short: {
    words: 'go up do if or an at by no on so to ax ox it is as we he me be'.split(' '),
    cost: 10,
    tier: 2,
  },

  // === 长词 (高分) ===
  long: {
    words: 'thunder lightning earthquake hurricane blizzard avalanche explosion destruction devastation'.split(' '),
    cost: 12,
    tier: 3,
  },

  // === 特殊词 ===
  special: {
    words: 'phoenix dragon wizard knight castle kingdom warrior champion'.split(' '),
    cost: 15,
    tier: 3,
  },
};

// === 获取起始词库 ===
export function getStarterWords(): string[] {
  return [...WORD_POOL.starter.words];
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

  // 转换为百分比并排序
  const freqPercent: Record<string, number> = {};
  for (const key in freq) {
    freqPercent[key] = Math.round((freq[key] / totalLetters) * 100);
  }

  // 排序获取高频字母
  const sorted = Object.entries(freqPercent).sort((a, b) => b[1] - a[1]);

  return {
    totalWords,
    totalLetters,
    avgLength: avgLengthStr,
    freq: freqPercent,
    topLetters: sorted.slice(0, 8),
  };
}

// === 生成商店可购买的词语 ===
export function generateShopWords(ownedWords: string[]): { word: string; cost: number; highlight?: string }[] {
  const available: { word: string; cost: number; highlight?: string }[] = [];
  const owned = new Set(ownedWords);

  for (const [, pool] of Object.entries(WORD_POOL)) {
    if (pool.tier === 0) continue; // 跳过初始词
    for (const word of pool.words) {
      if (!owned.has(word)) {
        available.push({
          word,
          cost: pool.cost + Math.floor(word.length / 2),
          highlight: pool.highlight,
        });
      }
    }
  }

  // 随机选择一些词
  return available.sort(() => Math.random() - 0.5).slice(0, 8);
}
