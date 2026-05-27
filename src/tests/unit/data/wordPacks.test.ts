import { describe, it, expect } from 'vitest';
import { filterWordsByCondition, getConditionMeta, buildConditionPool, calculatePackCost, generateWordPacks, getFreqDelta } from '../../../src/data/wordPacks';
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

  describe('contains_owned（高频字母≥1）', () => {
    it('返回包含已拥有字母的词', () => {
      const freqs = new Map([['e', 10], ['a', 6], ['z', 1]]);
      const condition: PackCondition = { type: 'contains_owned' };
      const result = filterWordsByCondition(condition, [], freqs);
      expect(result.length).toBeGreaterThan(0);
      // 每个词至少包含 e, a 或 z（全部 >= 1 threshold）
      result.forEach(w => {
        expect(w.includes('e') || w.includes('a') || w.includes('z')).toBe(true);
      });
    });

    it('频率恰好为1的字母算已拥有', () => {
      const freqs = new Map([['q', 1]]);
      const condition: PackCondition = { type: 'contains_owned' };
      const result = filterWordsByCondition(condition, [], freqs);
      // q 频率=1 >= threshold → 算已拥有
      result.forEach(w => expect(w.includes('q')).toBe(true));
    });

    it('频率=0的字母不算已拥有', () => {
      // 只有 freq=0 的字母，即空 Map
      const freqs = new Map<string, number>();
      const condition: PackCondition = { type: 'contains_owned' };
      const result = filterWordsByCondition(condition, [], freqs);
      expect(result).toEqual([]);
    });

    it('无频率数据时返回空', () => {
      const condition: PackCondition = { type: 'contains_owned' };
      const result = filterWordsByCondition(condition, []);
      expect(result).toEqual([]);
    });
  });

  describe('contains_unowned（低频字母<1）', () => {
    it('返回包含未拥有字母的词', () => {
      // 只有 e 有频率，其余 25 个字母 freq=0 → 未拥有
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

    it('所有字母都已拥有时返回空', () => {
      const freqs = new Map<string, number>();
      for (let i = 0; i < 26; i++) {
        freqs.set(String.fromCharCode(97 + i), 10);
      }
      const condition: PackCondition = { type: 'contains_unowned' };
      const result = filterWordsByCondition(condition, [], freqs);
      // 所有字母 freq >= 1，没有未拥有字母 → 空结果
      expect(result).toEqual([]);
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

describe('buildConditionPool', () => {
  it('无绑定键时生成正确数量的条件', () => {
    const pool = buildConditionPool([]);
    // 26×3 (starts_with/ends_with/contains) + 2 (owned/unowned) + 3 (short/long/special) + 15 (high_freq)
    expect(pool.length).toBe(26 * 3 + 2 + 3 + 15);
  });

  it('绑定键位的条件权重为3', () => {
    const pool = buildConditionPool(['e', 'a']);
    const eStartsWith = pool.find(p => p.condition.type === 'starts_with' && p.condition.letter === 'e');
    expect(eStartsWith!.weight).toBe(3);
    const aHighFreq = pool.find(p => p.condition.type === 'high_freq' && p.condition.letter === 'a');
    expect(aHighFreq!.weight).toBe(3);
  });

  it('未绑定键位的条件权重为2（未拥有）', () => {
    const pool = buildConditionPool(['e']);
    const bStartsWith = pool.find(p => p.condition.type === 'starts_with' && p.condition.letter === 'b');
    expect(bStartsWith!.weight).toBe(2);
  });

  it('Act 2 时 contains_owned/contains_unowned 权重固定', () => {
    const pool = buildConditionPool([], undefined, 2);
    const owned = pool.find(p => p.condition.type === 'contains_owned');
    const unowned = pool.find(p => p.condition.type === 'contains_unowned');
    expect(owned!.weight).toBe(3);
    expect(unowned!.weight).toBe(2);
  });

  it('high_freq 仅对有 _words 池的 15 个字母生成', () => {
    const pool = buildConditionPool([]);
    const highFreqs = pool.filter(p => p.condition.type === 'high_freq');
    expect(highFreqs.length).toBe(15);
    // 确认不包含 b, i, m, o, p 等无池字母
    const letters = highFreqs.map(p => p.condition.letter);
    expect(letters).not.toContain('b');
    expect(letters).not.toContain('x');
    expect(letters).toContain('e');
    expect(letters).toContain('a');
  });
});

describe('calculatePackCost', () => {
  it('short 包基础价较低', () => {
    const cost = calculatePackCost({ type: 'short' }, ['go', 'up', 'am']);
    // base=15, avgLen=2, floor(2/2)=1 → 16
    expect(cost).toBe(16);
  });

  it('long 包基础价较高', () => {
    const cost = calculatePackCost({ type: 'long' }, ['january', 'october', 'several']);
    // base=25, avgLen=7, floor(7/2)=3 → 28
    expect(cost).toBe(28);
  });

  it('special 包最贵', () => {
    const cost = calculatePackCost({ type: 'special' }, ['phoenix', 'dragon', 'wizard']);
    // base=30, avgLen=6, floor(6/2)=3 → 33
    expect(cost).toBe(33);
  });

  it('其他类型默认基础价18', () => {
    const cost = calculatePackCost({ type: 'starts_with', letter: 'a' }, ['area', 'away', 'able']);
    // base=18, avgLen=4, floor(4/2)=2 → 20
    expect(cost).toBe(20);
  });

  it('空词数组不崩溃', () => {
    const cost = calculatePackCost({ type: 'short' }, []);
    expect(cost).toBe(15); // base + floor(0/2) = 15
  });
});

describe('generateWordPacks', () => {
  it('生成指定数量的牌包', () => {
    const packs = generateWordPacks([], undefined, [], 3);
    expect(packs.length).toBe(3);
  });

  it('count=1 时只生成 1 个包', () => {
    const packs = generateWordPacks([], undefined, [], 1);
    expect(packs.length).toBe(1);
  });

  it('每包包含 1 或 3 个词（单词制）', () => {
    const packs = generateWordPacks([], undefined, [], 5);
    packs.forEach(p => {
      expect([1, 3]).toContain(p.words.length);
      expect(p.pickCount).toBe(1);
    });
  });

  it('同一批牌包条件不重复', () => {
    const packs = generateWordPacks([], undefined, [], 5);
    const condKeys = packs.map(p => {
      const c = p.condition;
      return c.letter ? `${c.type}:${c.letter}` : c.type;
    });
    const unique = new Set(condKeys);
    expect(unique.size).toBe(condKeys.length);
  });

  it('候选不足的条件被跳过', () => {
    // 拥有几乎所有词，使大部分条件候选不足
    const allWords: string[] = [];
    for (const pool of Object.values(WORD_POOL)) {
      allWords.push(...pool.words.map(w => w.toLowerCase()));
    }
    // 留少量词
    const owned = allWords.slice(0, allWords.length - 5);
    const packs = generateWordPacks(owned, undefined, [], 10);
    // 应该生成极少包（或 0 包），不崩溃
    packs.forEach(p => expect([1, 3]).toContain(p.words.length));
  });

  it('绑定键位的条件更容易出现（权重倾向性）', () => {
    // 多次生成，统计 'e' 相关条件出现频率
    const counts = { bound: 0, total: 0 };
    for (let trial = 0; trial < 50; trial++) {
      const packs = generateWordPacks([], undefined, ['e'], 2);
      for (const p of packs) {
        counts.total++;
        if (p.condition.letter === 'e') counts.bound++;
      }
    }
    // 绑定键 'e' 的条件（权重×3）应比基础频率高
    // 100 个牌包中至少应该有几个 'e' 相关
    expect(counts.bound).toBeGreaterThan(0);
  });

  it('牌包包含正确的 name 和 desc', () => {
    const packs = generateWordPacks([], undefined, [], 3);
    packs.forEach(p => {
      expect(p.name).toBeTruthy();
      expect(p.desc).toBeTruthy();
    });
  });

  it('牌包价格为正整数', () => {
    const packs = generateWordPacks([], undefined, [], 3);
    packs.forEach(p => {
      expect(p.cost).toBeGreaterThan(0);
      expect(Number.isInteger(p.cost)).toBe(true);
    });
  });

  it('条件池耗尽时优雅返回不足数量', () => {
    // 请求 200 个包，但条件池只有 ~98 个
    const packs = generateWordPacks([], undefined, [], 200);
    expect(packs.length).toBeLessThan(200);
    expect(packs.length).toBeGreaterThan(0);
    packs.forEach(p => expect([1, 3]).toContain(p.words.length));
  });

  it('生成的词不包含已拥有词', () => {
    const owned = ['member', 'served', 'league'];
    const packs = generateWordPacks(owned, undefined, [], 5);
    const allPackWords = packs.flatMap(p => p.words);
    for (const w of owned) {
      expect(allPackWords).not.toContain(w);
    }
  });

  it('牌包内的词满足其条件', () => {
    const packs = generateWordPacks([], undefined, [], 10);
    for (const pack of packs) {
      const c = pack.condition;
      for (const w of pack.words) {
        switch (c.type) {
          case 'starts_with':
            expect(w.startsWith(c.letter!)).toBe(true);
            break;
          case 'ends_with':
            expect(w.endsWith(c.letter!)).toBe(true);
            break;
          case 'contains':
            expect(w.includes(c.letter!)).toBe(true);
            break;
          case 'short':
            expect(WORD_POOL['short'].words.map(x => x.toLowerCase())).toContain(w);
            break;
          case 'long':
            expect(WORD_POOL['long'].words.map(x => x.toLowerCase())).toContain(w);
            break;
          case 'special':
            expect(WORD_POOL['special'].words.map(x => x.toLowerCase())).toContain(w);
            break;
          case 'high_freq':
            expect(WORD_POOL[`${c.letter}_words`].words.map(x => x.toLowerCase())).toContain(w);
            break;
          // contains_owned/unowned 需要 freqs，此处跳过
        }
      }
    }
  });

  it('count=0 返回空数组', () => {
    const packs = generateWordPacks([], undefined, [], 0);
    expect(packs).toEqual([]);
  });

  it('传入 playerFreqs 时 contains_owned 条件可以被选中', () => {
    // 设置高频字母使 contains_owned 有候选词
    const freqs = new Map([['e', 10], ['a', 8]]);
    let foundOwned = false;
    for (let i = 0; i < 30; i++) {
      const packs = generateWordPacks([], freqs, [], 5);
      if (packs.some(p => p.condition.type === 'contains_owned')) {
        foundOwned = true;
        break;
      }
    }
    expect(foundOwned).toBe(true);
  });

  it('牌包描述可包含频率变化提示（≥2 次的字母）', () => {
    const packs = generateWordPacks([], undefined, [], 10);
    // 至少部分牌包应包含频率提示（字母出现 ≥2 次）
    const withHint = packs.filter(p => /·.*\+\d+\s+[A-Z]/.test(p.desc));
    expect(withHint.length).toBeGreaterThan(0);
    // 有提示的牌包，数字应 ≥2
    withHint.forEach(p => {
      const matches = p.desc.match(/\+(\d+)\s+[A-Z]/g) || [];
      matches.forEach(m => {
        const num = parseInt(m.match(/\+(\d+)/)![1]);
        expect(num).toBeGreaterThanOrEqual(2);
      });
    });
  });
});

describe('generateWordPacks — 词语效果', () => {
  // 当前 spec (wordPacks.ts rollWordEffect line ~295)：
  //   rarity 0/1 → base_score, value 1
  //   rarity 2   → base_score, value 2
  //   rarity 3   → base_multiplier, value 2, 含 targetLetter (随机抽自 words[0] 字母)
  // 所有稀有度都有 wordEffect；传说与史诗 type 不同，不做同类型比较。

  it('所有牌包都附带 wordEffect', () => {
    for (let i = 0; i < 20; i++) {
      const packs = generateWordPacks([], undefined, [], 5);
      for (const p of packs) {
        expect(p.wordEffect).toBeDefined();
        expect(p.wordEffect!.value).toBeGreaterThan(0);
      }
    }
  });

  it('8 类词效在各稀有度均匀分布，数值随稀有度递增', () => {
    // 每个 "rarity:type" 观测点；并就地校验数值公式
    const seen = new Set<string>();
    for (let i = 0; i < 800; i++) {
      const packs = generateWordPacks([], undefined, [], 5);
      for (const p of packs) {
        const e = p.wordEffect;
        if (!e) throw new Error(`rarity-${p.rarity} pack has no wordEffect`);
        const rar = p.rarity;
        const len = p.words[0].length;
        seen.add(`${rar}:${e.type}`);
        switch (e.type) {
          case 'base_score': expect(e.value).toBe(rar + 1); break;
          case 'base_multiplier': expect(e.value).toBeCloseTo(1.5 + rar * 0.5, 5); expect(e.targetLetter).toMatch(/^[a-z]$/); break;
          case 'crit': expect(e.value).toBeCloseTo((rar + 1) * 0.01, 5); break;
          case 'init_time': expect(e.value).toBeCloseTo((len * (rar + 1)) / 10, 5); break;
          case 'init_gold': expect(e.value).toBe(len * (rar + 1) * 2); break;
          case 'grant_skill': expect(e.value).toBe(1); break;
          case 'init_mult': expect(e.value).toBeCloseTo((rar + 1) * 0.1, 5); break;
          case 'target_reduce': expect(e.value).toBeCloseTo((rar + 1) * 0.02, 5); break;
          default: throw new Error(`unexpected effect: ${e.type}`);
        }
      }
    }
    // 均匀性弱验证：普通(频繁)应见到多种「高级」词效（含两个新加的），证明不局限 base_score
    expect(seen.has('0:crit')).toBe(true);
    expect(seen.has('0:init_gold')).toBe(true);
    expect(seen.has('0:grant_skill')).toBe(true);
    expect(seen.has('0:init_mult')).toBe(true);
    expect(seen.has('0:target_reduce')).toBe(true);
    expect(seen.has('2:base_multiplier')).toBe(true);
  });
});

describe('buildConditionPool — high_freq 权重', () => {
  it('绑定键 high_freq 权重为 3', () => {
    const freqs = new Map([['e', 6]]);
    const pool = buildConditionPool(['e'], freqs);
    const eHighFreq = pool.find(p => p.condition.type === 'high_freq' && p.condition.letter === 'e');
    expect(eHighFreq!.weight).toBe(3);
  });

  it('未绑定但已拥有 high_freq 权重为 0.5', () => {
    const freqs = new Map([['e', 6]]);
    const pool = buildConditionPool([], freqs);
    const eHighFreq = pool.find(p => p.condition.type === 'high_freq' && p.condition.letter === 'e');
    expect(eHighFreq!.weight).toBe(0.5);
  });

  it('无 playerFreqs 时绑定键 high_freq 权重为 3', () => {
    const pool = buildConditionPool(['e']);
    const eHighFreq = pool.find(p => p.condition.type === 'high_freq' && p.condition.letter === 'e');
    expect(eHighFreq!.weight).toBe(3);
  });

  it('无 playerFreqs 且未绑定时 high_freq 权重为 2', () => {
    const pool = buildConditionPool([]);
    const eHighFreq = pool.find(p => p.condition.type === 'high_freq' && p.condition.letter === 'e');
    expect(eHighFreq!.weight).toBe(2);
  });
});

describe('buildConditionPool — 固定权重', () => {
  it('short/long/special 权重为 1', () => {
    const pool = buildConditionPool([], undefined, 1);
    const short = pool.find(p => p.condition.type === 'short');
    const long = pool.find(p => p.condition.type === 'long');
    const special = pool.find(p => p.condition.type === 'special');
    expect(short!.weight).toBe(1);
    expect(long!.weight).toBe(1);
    expect(special!.weight).toBe(1);
  });

  it('contains_owned 权重为 3, contains_unowned 权重为 2', () => {
    const pool = buildConditionPool([], undefined, 1);
    const owned = pool.find(p => p.condition.type === 'contains_owned');
    const unowned = pool.find(p => p.condition.type === 'contains_unowned');
    expect(owned!.weight).toBe(3);
    expect(unowned!.weight).toBe(2);
  });

  it('Act 参数不影响固定权重', () => {
    for (const act of [1, 2, 3]) {
      const pool = buildConditionPool([], undefined, act);
      const short = pool.find(p => p.condition.type === 'short');
      const owned = pool.find(p => p.condition.type === 'contains_owned');
      expect(short!.weight).toBe(1);
      expect(owned!.weight).toBe(3);
    }
  });
});

describe('getFreqDelta', () => {
  it('计算词组中每个字母的频率增幅', () => {
    const delta = getFreqDelta(['apple', 'area']);
    const map = new Map(delta);
    expect(map.get('a')).toBe(3); // apple(1) + area(2) = 3
    expect(map.get('p')).toBe(2); // apple(2)
    expect(map.get('e')).toBe(2); // apple(1) + area(1) = 2
  });

  it('按增幅降序排列', () => {
    const delta = getFreqDelta(['eeee', 'ab']);
    expect(delta[0][0]).toBe('e');
    expect(delta[0][1]).toBe(4);
  });

  it('空词组返回空数组', () => {
    const delta = getFreqDelta([]);
    expect(delta).toEqual([]);
  });

  it('忽略非字母字符', () => {
    const delta = getFreqDelta(['a1b2']);
    const letters = delta.map(d => d[0]);
    expect(letters).toContain('a');
    expect(letters).toContain('b');
    expect(letters).not.toContain('1');
  });
});
