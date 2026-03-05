// ============================================
// 转化者数据 + 工具函数测试
// Story 19.4: AC1, AC2, AC6, AC13
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

  it('共 40 个转化者', () => {
    expect(allIds.length).toBe(40);
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

  it('id 与 key 一致', () => {
    for (const id of allIds) {
      expect(CONVERTERS[id].id).toBe(id);
    }
  });

  it('source ≠ target', () => {
    for (const id of allIds) {
      const c = CONVERTERS[id];
      expect(c.source, `${id}: source should differ from target`).not.toBe(c.target);
    }
  });

  it('k > 0', () => {
    for (const id of allIds) {
      expect(CONVERTERS[id].k, `${id}.k`).toBeGreaterThan(0);
    }
  });

  it('formula 只能是 add 或 multiply', () => {
    for (const id of allIds) {
      expect(['add', 'multiply']).toContain(CONVERTERS[id].formula);
    }
  });

  it('source 和 target 是有效资源类型', () => {
    const validResources = ['base', 'score', 'multiplier', 'time', 'shield', 'gold'];
    for (const id of allIds) {
      expect(validResources, `${id}.source`).toContain(CONVERTERS[id].source);
      expect(validResources, `${id}.target`).toContain(CONVERTERS[id].target);
    }
  });

  it('覆盖 5 源 × 4 目标 × 2 运算 = 40 种组合', () => {
    const combos = new Set(allIds.map(id => {
      const c = CONVERTERS[id];
      return `${c.source}_${c.target}_${c.formula}`;
    }));
    expect(combos.size).toBe(40);
  });

  it('基数为源 8 个', () => {
    const baseSource = allIds.filter(id => CONVERTERS[id].source === 'base');
    expect(baseSource.length).toBe(8);
  });

  it('分数为源 8 个', () => {
    const scoreSource = allIds.filter(id => CONVERTERS[id].source === 'score');
    expect(scoreSource.length).toBe(8);
  });

  it('倍率为源 8 个', () => {
    const multSource = allIds.filter(id => CONVERTERS[id].source === 'multiplier');
    expect(multSource.length).toBe(8);
  });

  it('时间为源 8 个', () => {
    const timeSource = allIds.filter(id => CONVERTERS[id].source === 'time');
    expect(timeSource.length).toBe(8);
  });

  it('护盾为源 8 个', () => {
    const shieldSource = allIds.filter(id => CONVERTERS[id].source === 'shield');
    expect(shieldSource.length).toBe(8);
  });
});

describe('isConverter', () => {
  it('识别转化者 ID', () => {
    expect(isConverter('conv_base_score_add')).toBe(true);
    expect(isConverter('conv_shield_time_mul')).toBe(true);
  });

  it('不误判产出者和普通技能', () => {
    expect(isConverter('prod_burst')).toBe(false);
    expect(isConverter('burst')).toBe(false);
    expect(isConverter('nonexistent')).toBe(false);
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
    // level 0 → idx=0 → Lv1 倍率
    expect(getConverterK('conv_base_score_add', 0)).toBeCloseTo(1.0);
    // level 5 → idx=2 → Lv3 倍率
    expect(getConverterK('conv_base_score_add', 5)).toBeCloseTo(2.0);
  });
});

describe('getSourceValue', () => {
  const resources = { base: 15, score: 200, multiplier: 2.0, time: 40, shield: 3 };

  it('基数为源直接返回 base', () => {
    expect(getSourceValue('base', resources)).toBe(15);
  });

  it('分数为源返回 score + base × multiplier', () => {
    // 200 + 15 × 2.0 = 230
    expect(getSourceValue('score', resources)).toBeCloseTo(230);
  });

  it('倍率为源直接返回 multiplier', () => {
    expect(getSourceValue('multiplier', resources)).toBe(2.0);
  });

  it('时间为源直接返回 time', () => {
    expect(getSourceValue('time', resources)).toBe(40);
  });

  it('护盾为源直接返回 shield', () => {
    expect(getSourceValue('shield', resources)).toBe(3);
  });

  it('分数为源 mid-game: score=800 + base=15 × mult=2.0 = 830', () => {
    const mid = { base: 15, score: 800, multiplier: 2.0, time: 40, shield: 3 };
    expect(getSourceValue('score', mid)).toBeCloseTo(830);
  });
});

describe('getConverterDesc', () => {
  it('加法转化者描述含 +', () => {
    const desc = getConverterDesc('conv_base_score_add', 1);
    expect(desc).toContain('基数');
    expect(desc).toContain('分数');
    expect(desc).toContain('+');
  });

  it('乘法转化者描述含 ×', () => {
    const desc = getConverterDesc('conv_base_score_mul', 1);
    expect(desc).toContain('×');
  });

  it('等级影响 k 值显示', () => {
    const desc1 = getConverterDesc('conv_base_score_add', 1);
    const desc2 = getConverterDesc('conv_base_score_add', 2);
    expect(desc1).toContain('1');
    expect(desc2).toContain('1.5');
  });

  it('不存在的 ID 返回空字符串', () => {
    expect(getConverterDesc('nonexistent', 1)).toBe('');
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
    expect(drawConverterPool(40).length).toBe(40);
  });

  it('超过总数时返回全部', () => {
    expect(drawConverterPool(100).length).toBe(40);
  });
});
