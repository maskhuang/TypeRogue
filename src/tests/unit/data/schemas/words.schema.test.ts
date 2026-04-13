/**
 * words schema 测试
 */

import { describe, it, expect } from 'vitest';
import { wordsSchema, WORDS_DATA } from '../../../../src/data/schemas/words.schema';
import { WORD_POOL } from '../../../../src/data/words';

describe('words schema', () => {
  it('schema parse 通过', () => {
    expect(() => wordsSchema.parse(WORDS_DATA)).not.toThrow();
  });

  it('WORD_POOL 存在 common 词池', () => {
    expect(WORD_POOL.common).toBeDefined();
    expect(WORD_POOL.common.words.length).toBeGreaterThan(0);
    expect(WORD_POOL.common.tier).toBe(1);
  });

  it('每个 pool 含 words/cost/tier', () => {
    for (const [name, pool] of Object.entries(WORDS_DATA.wordPool)) {
      expect(pool.words, `${name}.words`).toBeInstanceOf(Array);
      expect(pool.words.length, `${name}.words`).toBeGreaterThan(0);
      expect(typeof pool.cost, `${name}.cost`).toBe('number');
      expect(typeof pool.tier, `${name}.tier`).toBe('number');
    }
  });

  it('至少含 5 个词池', () => {
    expect(Object.keys(WORD_POOL).length).toBeGreaterThanOrEqual(5);
  });

  it('所有词全是小写字母', () => {
    for (const pool of Object.values(WORDS_DATA.wordPool)) {
      for (const w of pool.words) {
        expect(w).toMatch(/^[a-z]+$/);
      }
    }
  });
});
