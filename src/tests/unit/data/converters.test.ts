// ============================================
// 转化者数据 + 工具函数测试
// Story 19.4 + 21.3 → 34.3 → 34.4: 45 个加算转化者（38 异源 + 7 同源）
// ============================================

import { describe, it, expect } from 'vitest';
import {
  CONVERTERS,
  isConverter,
  getConverterK,
  getSourceValue,
  getConverterDesc,
  drawConverterPool,
} from '../../../src/data/converters';

describe('CONVERTERS 数据完整性', () => {
  const allIds = Object.keys(CONVERTERS);

  it('共 45 个转化者（38 异源 + 7 同源）', () => {
    expect(allIds.length).toBe(45);
  });

  it('所有字段非空', () => {
    for (const id of allIds) {
      const c = CONVERTERS[id];
      expect(c.id, `${id}.id`).toBeTruthy();
      expect(c.name, `${id}.name`).toBeTruthy();
      expect(c.icon, `${id}.icon`).toBeTruthy();
      expect(c.source, `${id}.source`).toBeTruthy();
      expect(c.target, `${id}.target`).toBeTruthy();
      expect(c.formula, `${id}.formula`).toBeTruthy();
      expect(c.desc, `${id}.desc`).toBeTruthy();
    }
  });

  it('每个图标唯一', () => {
    const icons = Object.values(CONVERTERS).map(c => c.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('id 与 key 一致', () => {
    for (const id of allIds) {
      expect(CONVERTERS[id].id).toBe(id);
    }
  });

  it('异源转化者 38 个 source ≠ target', () => {
    const hetero = allIds.filter(id => CONVERTERS[id].source !== CONVERTERS[id].target);
    expect(hetero.length).toBe(38);
  });

  it('同源转化者 7 个 source === target', () => {
    const self = allIds.filter(id => CONVERTERS[id].source === CONVERTERS[id].target);
    expect(self.length).toBe(7);
  });

  it('k > 0', () => {
    for (const id of allIds) {
      expect(CONVERTERS[id].k, `${id}.k`).toBeGreaterThan(0);
    }
  });

  it('formula 全部为 add（乘算已移入附魔）', () => {
    for (const id of allIds) {
      expect(CONVERTERS[id].formula, `${id}.formula`).toBe('add');
    }
  });

  it('source 和 target 是有效资源类型', () => {
    const validResources = ['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen'];
    for (const id of allIds) {
      expect(validResources, `${id}.source`).toContain(CONVERTERS[id].source);
      expect(validResources, `${id}.target`).toContain(CONVERTERS[id].target);
    }
  });

  it('覆盖 45 种唯一 source_target 组合', () => {
    const combos = new Set(allIds.map(id => {
      const c = CONVERTERS[id];
      return `${c.source}_${c.target}`;
    }));
    expect(combos.size).toBe(45);
  });

  it('基数为源 6 个（含同源）', () => {
    const baseSource = allIds.filter(id => CONVERTERS[id].source === 'base');
    expect(baseSource.length).toBe(6);
  });

  it('分数为源 7 个（含同源）', () => {
    const scoreSource = allIds.filter(id => CONVERTERS[id].source === 'score');
    expect(scoreSource.length).toBe(7);
  });

  it('倍率为源 6 个（含同源）', () => {
    const multSource = allIds.filter(id => CONVERTERS[id].source === 'multiplier');
    expect(multSource.length).toBe(6);
  });

  it('时间为源 7 个（含同源）', () => {
    const timeSource = allIds.filter(id => CONVERTERS[id].source === 'time');
    expect(timeSource.length).toBe(7);
  });

  it('金币为源 7 个（含同源）', () => {
    const goldSource = allIds.filter(id => CONVERTERS[id].source === 'gold');
    expect(goldSource.length).toBe(7);
  });

  it('碎片为源或目标 11 个（含同源）', () => {
    const fragmentRelated = allIds.filter(id =>
      CONVERTERS[id].source === 'fragment' || CONVERTERS[id].target === 'fragment'
    );
    expect(fragmentRelated.length).toBe(11);
  });

  it('变异素为源或目标 11 个（含同源）', () => {
    const mutagenRelated = allIds.filter(id =>
      CONVERTERS[id].source === 'mutagen' || CONVERTERS[id].target === 'mutagen'
    );
    expect(mutagenRelated.length).toBe(11);
  });
});

describe('isConverter', () => {
  it('识别转化者 ID', () => {
    expect(isConverter('conv_base_score_add')).toBe(true);
    expect(isConverter('conv_gold_base_add')).toBe(true);
    expect(isConverter('conv_score_gold_add')).toBe(true);
  });

  it('不误判产出者和普通技能', () => {
    expect(isConverter('prod_burst')).toBe(false);
    expect(isConverter('burst')).toBe(false);
    expect(isConverter('nonexistent')).toBe(false);
  });

  it('已删除的乘算转化者不在 CONVERTERS 中', () => {
    expect(isConverter('conv_base_score_mul')).toBe(false);
    expect(isConverter('conv_gold_base_mul')).toBe(false);
    expect(isConverter('conv_fragment_base_mul')).toBe(false);
  });
});

describe('getConverterK', () => {
  it('Lv1 = k × 1.0', () => {
    expect(getConverterK('conv_base_score_add', 1)).toBeCloseTo(1.0);
  });

  it('Lv2 = k × 1.5', () => {
    expect(getConverterK('conv_base_score_add', 2)).toBeCloseTo(1.5);
  });

  it('Lv3 = k × 2.0', () => {
    expect(getConverterK('conv_base_score_add', 3)).toBeCloseTo(2.0);
  });

  it('分数为源的 k 值极小', () => {
    const k1 = getConverterK('conv_score_base_add', 1);
    expect(k1).toBeCloseTo(0.006);
    expect(k1).toBeLessThan(0.01);
  });

  it('不存在的 ID 返回 0', () => {
    expect(getConverterK('nonexistent', 1)).toBe(0);
  });

  it('level 超范围 clamp', () => {
    expect(getConverterK('conv_base_score_add', 0)).toBeCloseTo(1.0);
    expect(getConverterK('conv_base_score_add', 5)).toBeCloseTo(2.0);
  });
});

describe('getSourceValue', () => {
  const resources = { base: 15, score: 200, multiplier: 2.0, time: 40, gold: 15, fragment: 0, mutagen: 0 };

  it('基数为源直接返回 base', () => {
    expect(getSourceValue('base', resources)).toBe(15);
  });

  it('分数为源返回 score + base × multiplier', () => {
    expect(getSourceValue('score', resources)).toBeCloseTo(230);
  });

  it('倍率为源直接返回 multiplier', () => {
    expect(getSourceValue('multiplier', resources)).toBe(2.0);
  });

  it('时间为源直接返回 time', () => {
    expect(getSourceValue('time', resources)).toBe(40);
  });

  it('金币为源直接返回 gold', () => {
    expect(getSourceValue('gold', resources)).toBe(15);
  });

  it('fragment 为源时读取 classResourceProduced', () => {
    const produced = { fragment: 42 };
    expect(getSourceValue('fragment', resources, produced)).toBe(42);
  });

  it('mutagen 为源时读取 classResourceProduced', () => {
    const produced = { mutagen: 10 };
    expect(getSourceValue('mutagen', resources, produced)).toBe(10);
  });

  it('fragment 为源无 classResourceProduced 返回 0', () => {
    expect(getSourceValue('fragment', resources)).toBe(0);
  });
});

describe('getConverterDesc', () => {
  it('加法转化者描述含 +', () => {
    const desc = getConverterDesc('conv_base_score_add', 1);
    expect(desc).toContain('基数');
    expect(desc).toContain('分数');
    expect(desc).toContain('+');
  });

  it('等级影响 k 值显示', () => {
    // conv_base_mult_add has k=0.02 so Lv1=0.02, Lv2=0.03
    const desc1 = getConverterDesc('conv_base_mult_add', 1);
    const desc2 = getConverterDesc('conv_base_mult_add', 2);
    expect(desc1).toContain('0.02');
    expect(desc2).toContain('0.03');
  });

  it('不存在的 ID 返回空字符串', () => {
    expect(getConverterDesc('nonexistent', 1)).toBe('');
  });

  it('金币转化者描述含金币标签', () => {
    const desc = getConverterDesc('conv_gold_base_add', 1);
    expect(desc).toContain('金币');
    expect(desc).toContain('基数');
    expect(desc).toContain('+');
  });

  it('multiplyOverride 产生乘算描述', () => {
    const desc = getConverterDesc('conv_base_score_add', 1, { formula: 'multiply', k: 0.005 });
    expect(desc).toContain('×');
    expect(desc).toContain('0.005');
  });
});

describe('drawConverterPool', () => {
  it('默认抽 20 个', () => {
    const pool = drawConverterPool();
    expect(pool.length).toBe(20);
  });

  it('抽出的都是有效转化者 ID', () => {
    const pool = drawConverterPool();
    for (const id of pool) {
      expect(isConverter(id), `${id} should be a converter`).toBe(true);
    }
  });

  it('无重复', () => {
    const pool = drawConverterPool();
    expect(new Set(pool).size).toBe(pool.length);
  });

  it('自定义数量', () => {
    expect(drawConverterPool(5).length).toBe(5);
    expect(drawConverterPool(35).length).toBe(35);
  });

  it('超过总数时返回全部', () => {
    expect(drawConverterPool(100).length).toBe(45);
  });

  it('加权抽取：同源出现概率低于异源（AC4）', () => {
    // 多次抽取 20 个，统计同源转化者出现频次
    const selfIds = new Set(Object.keys(CONVERTERS).filter(id => CONVERTERS[id].source === CONVERTERS[id].target));
    let selfCount = 0;
    let heteroCount = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      const pool = drawConverterPool(20);
      for (const id of pool) {
        if (selfIds.has(id)) selfCount++;
        else heteroCount++;
      }
    }
    // 同源 7 个 ×3 = 21, 异源 38 个 ×10 = 380, 权重占比 21/401 ≈ 5.2%
    // 20 抽中同源期望 ~1.05 个，异源 ~18.95 个
    // 同源平均占比应显著低于 7/45 ≈ 15.6%（无加权时的均匀比例）
    const selfRatio = selfCount / (selfCount + heteroCount);
    expect(selfRatio).toBeLessThan(0.12); // 加权后应远低于 15.6%
    expect(selfRatio).toBeGreaterThan(0);  // 但不为 0
  });
});

describe('同源转化者数据验证', () => {
  it('7 个同源转化者 source === target', () => {
    const selfIds = Object.keys(CONVERTERS).filter(id => CONVERTERS[id].source === CONVERTERS[id].target);
    expect(selfIds.length).toBe(7);
    for (const id of selfIds) {
      expect(CONVERTERS[id].formula).toBe('add');
    }
  });

  it('同源转化者 k 值在校准范围内', () => {
    // AC2: base 0.02~0.05, score 0.0005~0.001, mult 0.10~0.25, time 0.01~0.025, gold 0.003~0.008, frag/mut 0.02~0.05
    expect(CONVERTERS.conv_base_base_add.k).toBeGreaterThanOrEqual(0.02);
    expect(CONVERTERS.conv_base_base_add.k).toBeLessThanOrEqual(0.05);

    expect(CONVERTERS.conv_score_score_add.k).toBeGreaterThanOrEqual(0.0005);
    expect(CONVERTERS.conv_score_score_add.k).toBeLessThanOrEqual(0.001);

    expect(CONVERTERS.conv_mult_mult_add.k).toBeGreaterThanOrEqual(0.10);
    expect(CONVERTERS.conv_mult_mult_add.k).toBeLessThanOrEqual(0.25);

    expect(CONVERTERS.conv_time_time_add.k).toBeGreaterThanOrEqual(0.01);
    expect(CONVERTERS.conv_time_time_add.k).toBeLessThanOrEqual(0.025);

    expect(CONVERTERS.conv_gold_gold_add.k).toBeGreaterThanOrEqual(0.003);
    expect(CONVERTERS.conv_gold_gold_add.k).toBeLessThanOrEqual(0.008);

    expect(CONVERTERS.conv_fragment_fragment_add.k).toBeGreaterThanOrEqual(0.02);
    expect(CONVERTERS.conv_fragment_fragment_add.k).toBeLessThanOrEqual(0.05);

    expect(CONVERTERS.conv_mutagen_mutagen_add.k).toBeGreaterThanOrEqual(0.02);
    expect(CONVERTERS.conv_mutagen_mutagen_add.k).toBeLessThanOrEqual(0.05);
  });

  it('fragment 同源 k 与 mutagen 同源 k 对称', () => {
    expect(CONVERTERS.conv_fragment_fragment_add.k).toBeCloseTo(CONVERTERS.conv_mutagen_mutagen_add.k);
  });
});

describe('碎片转化者 k 值验证', () => {
  it('conv_fragment_base_add: fragment→base add k=0.08', () => {
    expect(CONVERTERS.conv_fragment_base_add.k).toBeCloseTo(0.08);
    expect(CONVERTERS.conv_fragment_base_add.source).toBe('fragment');
    expect(CONVERTERS.conv_fragment_base_add.target).toBe('base');
    expect(CONVERTERS.conv_fragment_base_add.formula).toBe('add');
  });

  it('conv_fragment_score_add: fragment→score add k=0.8', () => {
    expect(CONVERTERS.conv_fragment_score_add.k).toBeCloseTo(0.8);
  });

  it('conv_base_fragment_add: base→fragment add k=0.08', () => {
    expect(CONVERTERS.conv_base_fragment_add.k).toBeCloseTo(0.08);
    expect(CONVERTERS.conv_base_fragment_add.source).toBe('base');
    expect(CONVERTERS.conv_base_fragment_add.target).toBe('fragment');
  });

  it('碎片相关转化者全为 add formula', () => {
    const fragmentIds = Object.keys(CONVERTERS).filter(id =>
      CONVERTERS[id].source === 'fragment' || CONVERTERS[id].target === 'fragment'
    );
    for (const id of fragmentIds) {
      expect(CONVERTERS[id].formula, id).toBe('add');
    }
  });
});

describe('碎片转化者平衡约束', () => {
  it('fragment→score add k ≤ base→score add k', () => {
    expect(CONVERTERS.conv_fragment_score_add.k).toBeLessThanOrEqual(CONVERTERS.conv_base_score_add.k);
  });

  it('fragment→multiplier add k ≤ base→mult add k', () => {
    expect(CONVERTERS.conv_fragment_mult_add.k).toBeLessThanOrEqual(CONVERTERS.conv_base_mult_add.k);
  });

  it('fragment→time add k ≤ base→time add k', () => {
    expect(CONVERTERS.conv_fragment_time_add.k).toBeLessThanOrEqual(CONVERTERS.conv_base_time_add.k);
  });

  it('fragment→base k 与 mutagen→base k 对称', () => {
    expect(CONVERTERS.conv_fragment_base_add.k).toBeCloseTo(CONVERTERS.conv_mutagen_base_add.k);
  });
});
