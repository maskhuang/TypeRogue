import { describe, it, expect, beforeEach } from 'vitest';
import { state, createInitialState } from '../../../src/core/state';
import { KEYS } from '../../../src/core/constants';
import { calculateLetterFrequency } from '../../../src/systems/letters/LetterFrequencySystem';

/**
 * Epic 20: 词库管理 + 字频锁定
 * 纯逻辑测试（不依赖 DOM）
 */

// 复刻 shop.ts 中的核心逻辑用于测试
const MIN_WORD_COUNT = 3;

function removeWord(index: number): { success: boolean; reason?: string } {
  if (index < 0 || index >= state.player.wordDeck.length) return { success: false, reason: 'invalid-index' };
  if (state.player.wordDeck.length <= MIN_WORD_COUNT) return { success: false, reason: 'min-count' };
  if (state.gold < 3) return { success: false, reason: 'no-gold' };
  state.gold -= 3;
  state.player.wordDeck.splice(index, 1);
  return { success: true };
}

function autoUnbindZeroFreqKeys(wordDeck: string[], bindings: Map<string, string>): string[] {
  const letterFreqs = calculateLetterFrequency(wordDeck);
  const unbound: string[] = [];
  const keysToUnbind: string[] = [];
  for (const [key] of bindings) {
    if ((letterFreqs.get(key) ?? 0) === 0) keysToUnbind.push(key);
  }
  for (const key of keysToUnbind) {
    bindings.delete(key);
    unbound.push(key);
  }
  return unbound;
}

function findFreeKeySkippingZeroFreq(
  bindings: Map<string, string>,
  letterFreqs: Map<string, number>,
): string | undefined {
  return KEYS.find(k => !bindings.has(k) && (letterFreqs.get(k) ?? 0) > 0);
}

describe('Epic 20: 词库管理 + 字频锁定', () => {
  beforeEach(() => {
    Object.assign(state, createInitialState());
    state.player.wordDeck = ['apple', 'table', 'phone', 'water', 'tiger'];
    state.gold = 30;
  });

  describe('removeWord — 删词逻辑', () => {
    it('正常删除：扣 3 香蕉，移除词语', () => {
      const result = removeWord(0);
      expect(result.success).toBe(true);
      expect(state.gold).toBe(27);
      expect(state.player.wordDeck).not.toContain('apple');
      expect(state.player.wordDeck.length).toBe(4);
    });

    it('香蕉不足时拒绝删除', () => {
      state.gold = 2;
      const result = removeWord(0);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('no-gold');
      expect(state.player.wordDeck.length).toBe(5);
    });

    it('词库 ≤ MIN_WORD_COUNT 时拒绝删除', () => {
      state.player.wordDeck = ['a', 'b', 'c'];
      const result = removeWord(0);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('min-count');
      expect(state.player.wordDeck.length).toBe(3);
    });

    it('无效索引时拒绝删除', () => {
      expect(removeWord(-1).success).toBe(false);
      expect(removeWord(99).success).toBe(false);
    });

    it('连续删除直到最低词数后停止', () => {
      // 5 words, min 3 → can delete 2
      expect(removeWord(0).success).toBe(true); // 4 left
      expect(removeWord(0).success).toBe(true); // 3 left
      expect(removeWord(0).success).toBe(false); // blocked
      expect(state.player.wordDeck.length).toBe(3);
      expect(state.gold).toBe(24);
    });
  });

  describe('autoUnbindZeroFreqKeys — 零频自动解绑', () => {
    it('字频为 0 的键位技能被解绑', () => {
      // wordDeck 只含 a,p,l,e,t,b,h,o,n,w,r,i,g — 无 z,x
      state.player.bindings.set('a', 'skill_a');
      state.player.bindings.set('z', 'skill_z');
      state.player.bindings.set('x', 'skill_x');

      const unbound = autoUnbindZeroFreqKeys(state.player.wordDeck, state.player.bindings);

      expect(unbound).toContain('z');
      expect(unbound).toContain('x');
      expect(unbound).not.toContain('a');
      expect(state.player.bindings.has('a')).toBe(true);
      expect(state.player.bindings.has('z')).toBe(false);
      expect(state.player.bindings.has('x')).toBe(false);
    });

    it('全部键位有字频时不解绑', () => {
      state.player.bindings.set('a', 'skill_a');
      state.player.bindings.set('p', 'skill_p');

      const unbound = autoUnbindZeroFreqKeys(state.player.wordDeck, state.player.bindings);
      expect(unbound.length).toBe(0);
      expect(state.player.bindings.size).toBe(2);
    });

    it('空词库时全部键解绑', () => {
      state.player.wordDeck = [];
      state.player.bindings.set('a', 'skill_a');
      state.player.bindings.set('b', 'skill_b');

      const unbound = autoUnbindZeroFreqKeys(state.player.wordDeck, state.player.bindings);
      expect(unbound.length).toBe(2);
      expect(state.player.bindings.size).toBe(0);
    });
  });

  describe('findFreeKeySkippingZeroFreq — 自动绑定跳过零频键', () => {
    it('跳过零频键，绑到有频率的空键位', () => {
      const letterFreqs = calculateLetterFrequency(state.player.wordDeck);
      // q 在 KEYS 中靠前但 wordDeck 中无 q → 频率 0 → 跳过
      const freeKey = findFreeKeySkippingZeroFreq(state.player.bindings, letterFreqs);
      expect(freeKey).toBeDefined();
      expect(letterFreqs.get(freeKey!) ?? 0).toBeGreaterThan(0);
    });

    it('所有有频键位已绑定时返回 undefined', () => {
      const letterFreqs = calculateLetterFrequency(state.player.wordDeck);
      // 绑定所有有频率的键
      for (const k of KEYS) {
        if ((letterFreqs.get(k) ?? 0) > 0) {
          state.player.bindings.set(k, `skill_${k}`);
        }
      }
      const freeKey = findFreeKeySkippingZeroFreq(state.player.bindings, letterFreqs);
      expect(freeKey).toBeUndefined();
    });
  });
});
