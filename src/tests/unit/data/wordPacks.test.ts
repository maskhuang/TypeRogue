import { describe, it, expect, beforeEach } from 'vitest';
import { filterWordsByCondition, getConditionMeta } from '../../../src/data/wordPacks';
import { WORD_POOL } from '../../../src/data/words';
import type { PackCondition } from '../../../src/core/types';

describe('filterWordsByCondition', () => {
  const ownedWords = ['hello', 'world'];

  describe('starts_with', () => {
    it('只返回以指定字母开头的词', () => {
      const condition: PackCondition = { type: 'starts_with', letter: 'a' };
      const result = filterWordsByCondition(condition, []);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(w => expect(w.startsWith('a')).toBe(true));
    });

    it('排除已拥有的词', () => {
      // 找一个以特定字母开头的已有词来测试
      const condition: PackCondition = { type: 'starts_with', letter: 'h' };
      const result = filterWordsByCondition(condition, ['hello']);
      expect(result).not.toContain('hello');
    });

    it('letter 为空时返回空数组', () => {
      const condition: PackCondition = { type: 'starts_with' };
      const result = filterWordsByCondition(condition, []);
      expect(result).toEqual([]);
    });
  });

  describe('ends_with', () => {
    it('只返回以指定字母结尾的词', () => {
      const condition: PackCondition = { type: 'ends_with', letter: 'e' };
      const result = filterWordsByCondition(condition, []);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(w => expect(w.endsWith('e')).toBe(true));
    });

    it('letter 为空时返回空数组', () => {
      const condition: PackCondition = { type: 'ends_with' };
      const result = filterWordsByCondition(condition, []);
      expect(result).toEqual([]);
    });
  });

  describe('contains', () => {
    it('只返回包含指定字母的词', () => {
      const condition: PackCondition = { type: 'contains', letter: 'z' };
      const result = filterWordsByCondition(condition, []);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(w => expect(w.includes('z')).toBe(true));
    });

    it('letter 为空时返回空数组', () => {
      const condition: PackCondition = { type: 'contains' };
      const result = filterWordsByCondition(condition, []);
      expect(result).toEqual([]);
    });
  });

  describe('contains_owned（高频字母≥5）', () => {
    it('返回包含高频字母的词', () => {
      const freqs = new Map([['e', 10], ['a', 6], ['z', 1]]);
      const condition: PackCondition = { type: 'contains_owned' };
      const result = filterWordsByCondition(condition, [], freqs);
      expect(result.length).toBeGreaterThan(0);
      // 每个词至少包含 e 或 a
      result.forEach(w => {
        expect(w.includes('e') || w.includes('a')).toBe(true);
      });
    });

    it('频率恰好为5的字母算高频', () => {
      const freqs = new Map([['q', 5]]);
      const condition: PackCondition = { type: 'contains_owned' };
      const result = filterWordsByCondition(condition, [], freqs);
      // q 频率=5 算高频
      result.forEach(w => expect(w.includes('q')).toBe(true));
    });

    it('频率=4的字母不算高频', () => {
      const freqs = new Map([['x', 4]]);
      const condition: PackCondition = { type: 'contains_owned' };
      const result = filterWordsByCondition(condition, [], freqs);
      // x 频率<5，没有高频字母 → 空结果
      expect(result).toEqual([]);
    });

    it('无频率数据时返回空', () => {
      const condition: PackCondition = { type: 'contains_owned' };
      const result = filterWordsByCondition(condition, []);
      expect(result).toEqual([]);
    });
  });

  describe('contains_unowned（低频字母<5）', () => {
    it('返回包含低频字母的词', () => {
      // 除 e 外全部低频
      const freqs = new Map([['e', 10]]);
      const condition: PackCondition = { type: 'contains_unowned' };
      const result = filterWordsByCondition(condition, [], freqs);
      expect(result.length).toBeGreaterThan(0);
    });

    it('无频率数据时返回空', () => {
      const condition: PackCondition = { type: 'contains_unowned' };
      const result = filterWordsByCondition(condition, []);
      expect(result).toEqual([]);
    });

    it('频率=4的字母算低频', () => {
      // 只有 a 高频，其余低频
      const freqs = new Map<string, number>();
      for (let i = 0; i < 26; i++) {
        freqs.set(String.fromCharCode(97 + i), 10);
      }
      freqs.set('x', 4);
      const condition: PackCondition = { type: 'contains_unowned' };
      const result = filterWordsByCondition(condition, [], freqs);
      // 只有 x 是低频，结果中的词都包含 x
      result.forEach(w => expect(w.includes('x')).toBe(true));
    });
  });

  describe('short', () => {
    it('返回 WORD_POOL.short 中的词', () => {
      const condition: PackCondition = { type: 'short' };
      const result = filterWordsByCondition(condition, []);
      const expected = WORD_POOL['short'].words.map(w => w.toLowerCase());
      expect(result.length).toBeGreaterThan(0);
      result.forEach(w => expect(expected).toContain(w));
    });

    it('排除已拥有的词', () => {
      const firstShortWord = WORD_POOL['short'].words[0].toLowerCase();
      const condition: PackCondition = { type: 'short' };
      const result = filterWordsByCondition(condition, [firstShortWord]);
      expect(result).not.toContain(firstShortWord);
    });
  });

  describe('long', () => {
    it('返回 WORD_POOL.long 中的词', () => {
      const condition: PackCondition = { type: 'long' };
      const result = filterWordsByCondition(condition, []);
      expect(result.length).toBeGreaterThan(0);
      const expected = WORD_POOL['long'].words.map(w => w.toLowerCase());
      result.forEach(w => expect(expected).toContain(w));
    });
  });

  describe('special', () => {
    it('返回 WORD_POOL.special 中的词', () => {
      const condition: PackCondition = { type: 'special' };
      const result = filterWordsByCondition(condition, []);
      expect(result.length).toBeGreaterThan(0);
      const expected = WORD_POOL['special'].words.map(w => w.toLowerCase());
      result.forEach(w => expect(expected).toContain(w));
    });
  });

  describe('high_freq', () => {
    it('返回对应字母词池中的词', () => {
      const condition: PackCondition = { type: 'high_freq', letter: 'e' };
      const result = filterWordsByCondition(condition, []);
      expect(result.length).toBeGreaterThan(0);
      const expected = WORD_POOL['e_words'].words.map(w => w.toLowerCase());
      result.forEach(w => expect(expected).toContain(w));
    });

    it('不存在的字母（如 x）返回空数组', () => {
      const condition: PackCondition = { type: 'high_freq', letter: 'x' };
      const result = filterWordsByCondition(condition, []);
      expect(result).toEqual([]);
    });

    it('不存在的字母（如 q）返回空数组', () => {
      const condition: PackCondition = { type: 'high_freq', letter: 'q' };
      const result = filterWordsByCondition(condition, []);
      expect(result).toEqual([]);
    });

    it('letter 为空时返回空数组', () => {
      const condition: PackCondition = { type: 'high_freq' };
      const result = filterWordsByCondition(condition, []);
      expect(result).toEqual([]);
    });
  });

  describe('ownedWords 排除', () => {
    it('所有条件类型都排除已拥有的词', () => {
      // 从 common 池取一个词作为已拥有
      const ownedWord = WORD_POOL['common'].words[0].toLowerCase();
      const conditions: PackCondition[] = [
        { type: 'contains', letter: ownedWord[0] },
      ];
      for (const cond of conditions) {
        const result = filterWordsByCondition(cond, [ownedWord]);
        expect(result).not.toContain(ownedWord);
      }
    });

    it('大小写不敏感排除', () => {
      const condition: PackCondition = { type: 'contains', letter: 'e' };
      const result = filterWordsByCondition(condition, ['MEMBER']);
      expect(result).not.toContain('member');
    });
  });
});

describe('getConditionMeta', () => {
  it('starts_with 返回正确元数据', () => {
    const meta = getConditionMeta({ type: 'starts_with', letter: 'e' });
    expect(meta.name).toBe('E开头');
    expect(meta.desc).toContain('E');
    expect(meta.icon).toBeTruthy();
  });

  it('ends_with 返回正确元数据', () => {
    const meta = getConditionMeta({ type: 'ends_with', letter: 's' });
    expect(meta.name).toBe('S结尾');
  });

  it('contains 返回正确元数据', () => {
    const meta = getConditionMeta({ type: 'contains', letter: 'r' });
    expect(meta.name).toBe('含R');
  });

  it('contains_owned 返回正确元数据', () => {
    const meta = getConditionMeta({ type: 'contains_owned' });
    expect(meta.name).toBe('强化词包');
  });

  it('contains_unowned 返回正确元数据', () => {
    const meta = getConditionMeta({ type: 'contains_unowned' });
    expect(meta.name).toBe('探索词包');
  });

  it('short 返回正确元数据', () => {
    const meta = getConditionMeta({ type: 'short' });
    expect(meta.name).toBe('短词精选');
  });

  it('long 返回正确元数据', () => {
    const meta = getConditionMeta({ type: 'long' });
    expect(meta.name).toBe('长词挑战');
  });

  it('special 返回正确元数据', () => {
    const meta = getConditionMeta({ type: 'special' });
    expect(meta.name).toBe('奇幻词包');
  });

  it('high_freq 返回正确元数据', () => {
    const meta = getConditionMeta({ type: 'high_freq', letter: 'a' });
    expect(meta.name).toBe('A高频');
    expect(meta.icon).toBe('🎯');
  });
});
