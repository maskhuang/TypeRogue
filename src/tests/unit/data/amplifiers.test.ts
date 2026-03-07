// ============================================
// 增幅者数据完整性 + 工具函数测试
// ============================================
// 30 个增幅者（5 资源 × 6 范围），统一 +N%/层 机制

import { describe, it, expect } from 'vitest';
import { AMPLIFIERS, isAmplifier, drawAmplifierPool, getAmplifierValue, getAmplifierDesc } from '../../../src/data/amplifiers';
import { PositionRelation } from '../../../src/data/keyboardTopology';
import { createInitialState } from '../../../src/core/state';

// 从真实数据派生 ID 列表（避免硬编码漂移）
const ALL_AMP_IDS = Object.keys(AMPLIFIERS);

describe('增幅者数据完整性', () => {
  it('共 30 个增幅者（5 资源 × 6 范围）', () => {
    expect(Object.keys(AMPLIFIERS).length).toBe(30);
  });

  it('所有 id 唯一', () => {
    const ids = Object.values(AMPLIFIERS).map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('id == key（每条数据的 id 与对象 key 一致）', () => {
    for (const [key, amp] of Object.entries(AMPLIFIERS)) {
      expect(amp.id).toBe(key);
    }
  });

  it('所有字段非空', () => {
    for (const amp of Object.values(AMPLIFIERS)) {
      expect(amp.id).toBeTruthy();
      expect(amp.name).toBeTruthy();
      expect(amp.icon).toBeTruthy();
      expect(amp.resource).toBeTruthy();
      expect(amp.positionRelation).toBeTruthy();
      expect(amp.valuePerStack).toBeGreaterThan(0);
      expect(amp.desc).toBeTruthy();
    }
  });

  it('覆盖全部 6 种 PositionRelation', () => {
    const relations = new Set(Object.values(AMPLIFIERS).map(a => a.positionRelation));
    expect(relations.size).toBe(6);
    for (const rel of Object.values(PositionRelation)) {
      expect(relations.has(rel)).toBe(true);
    }
  });

  it('覆盖全部 5 种资源（base/score/multiplier/time/gold）', () => {
    const resources = new Set(Object.values(AMPLIFIERS).map(a => a.resource));
    expect(resources).toContain('base');
    expect(resources).toContain('score');
    expect(resources).toContain('multiplier');
    expect(resources).toContain('time');
    expect(resources).toContain('gold');
    expect(resources.size).toBe(5);
  });

  it('每种资源恰好 6 个增幅者', () => {
    const byCounts: Record<string, number> = {};
    for (const amp of Object.values(AMPLIFIERS)) {
      byCounts[amp.resource] = (byCounts[amp.resource] || 0) + 1;
    }
    for (const res of ['base', 'score', 'multiplier', 'time', 'gold']) {
      expect(byCounts[res]).toBe(6);
    }
  });

  it('每个名称唯一', () => {
    const names = Object.values(AMPLIFIERS).map(a => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('图标为复合格式（资源图标+范围图标）', () => {
    for (const amp of Object.values(AMPLIFIERS)) {
      // 复合图标至少包含 2 个字符/emoji
      expect(amp.icon.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('positionRelation 使用 PositionRelation 枚举值', () => {
    const validRelations = new Set(Object.values(PositionRelation));
    for (const amp of Object.values(AMPLIFIERS)) {
      expect(validRelations.has(amp.positionRelation)).toBe(true);
    }
  });

  it('desc 与 getAmplifierDesc(id, 1) 一致（防止 valuePerStack/desc 漂移）', () => {
    for (const amp of Object.values(AMPLIFIERS)) {
      expect(amp.desc).toBe(getAmplifierDesc(amp.id, 1));
    }
  });

  it('desc 包含统一 +N%/层 格式', () => {
    for (const amp of Object.values(AMPLIFIERS)) {
      expect(amp.desc).toMatch(/\+[\d.]+%\/层$/);
    }
  });

  it('不存在 operator 字段', () => {
    for (const amp of Object.values(AMPLIFIERS)) {
      expect(amp).not.toHaveProperty('operator');
    }
  });
});

describe('增幅者工具函数', () => {
  describe('isAmplifier', () => {
    it('所有真实增幅者 ID 返回 true', () => {
      for (const id of ALL_AMP_IDS) {
        expect(isAmplifier(id)).toBe(true);
      }
    });

    it('非增幅者 ID 返回 false', () => {
      expect(isAmplifier('prod_burst')).toBe(false);
      expect(isAmplifier('nonexistent')).toBe(false);
      expect(isAmplifier('amp')).toBe(false);
      expect(isAmplifier('')).toBe(false);
    });
  });

  describe('getAmplifierDesc', () => {
    it('无效 id 返回空字符串', () => {
      expect(getAmplifierDesc('nonexistent')).toBe('');
      expect(getAmplifierDesc('nonexistent', 2)).toBe('');
    });

    it('不崩溃', () => {
      expect(() => getAmplifierDesc('')).not.toThrow();
      expect(() => getAmplifierDesc('', 1)).not.toThrow();
    });

    it('无 level 时返回原始 desc', () => {
      expect(getAmplifierDesc('amp_base_adjacent')).toBe(AMPLIFIERS['amp_base_adjacent'].desc);
    });

    it('Lv1 描述包含百分比格式', () => {
      const desc = getAmplifierDesc('amp_base_adjacent', 1);
      expect(desc).toContain('+3%/层');
      expect(desc).toContain('基数');
    });

    it('Lv2 描述反映 ×1.5 缩放', () => {
      const desc = getAmplifierDesc('amp_base_adjacent', 2);
      expect(desc).toContain('+4.5%/层'); // 3% × 1.5
    });

    it('level=0 时仍计算（不短路）', () => {
      const desc = getAmplifierDesc('amp_base_adjacent', 0);
      expect(desc).toContain('+');
    });
  });

  describe('drawAmplifierPool', () => {
    it('请求 0 个返回空数组', () => {
      expect(drawAmplifierPool(0)).toEqual([]);
    });

    it('抽取数量不超过总数', () => {
      const pool = drawAmplifierPool(50);
      expect(pool.length).toBe(30);
    });

    it('抽取指定数量', () => {
      const pool = drawAmplifierPool(5);
      expect(pool.length).toBe(5);
    });

    it('抽取结果不重复', () => {
      const pool = drawAmplifierPool(30);
      expect(new Set(pool).size).toBe(pool.length);
    });

    it('抽取结果均为合法增幅者 ID', () => {
      const pool = drawAmplifierPool(30);
      for (const id of pool) {
        expect(isAmplifier(id)).toBe(true);
      }
    });

    it('默认参数可用', () => {
      const pool = drawAmplifierPool();
      expect(pool.length).toBe(15); // 默认 15，30 个中抽 15
    });
  });

  describe('getAmplifierValue', () => {
    it('无效 id 返回 0', () => {
      expect(getAmplifierValue('nonexistent', 1)).toBe(0);
    });

    it('不崩溃', () => {
      expect(() => getAmplifierValue('', 0)).not.toThrow();
      expect(() => getAmplifierValue('', -1)).not.toThrow();
    });

    it('Lv1 返回 valuePerStack × 1.0', () => {
      // amp_base_adjacent: valuePerStack=0.03, Lv1=0.03
      expect(getAmplifierValue('amp_base_adjacent', 1)).toBeCloseTo(0.03);
    });

    it('Lv2 返回 valuePerStack × 1.5', () => {
      // amp_base_adjacent: valuePerStack=0.03, Lv2=0.045
      expect(getAmplifierValue('amp_base_adjacent', 2)).toBeCloseTo(0.045);
    });

    it('Lv3 返回 valuePerStack × 2.0', () => {
      // amp_base_adjacent: valuePerStack=0.03, Lv3=0.06
      expect(getAmplifierValue('amp_base_adjacent', 3)).toBeCloseTo(0.06);
    });

    it('level 超过 3 时按 Lv3 计算', () => {
      expect(getAmplifierValue('amp_base_adjacent', 5)).toBeCloseTo(0.06);
    });

    it('gold 增幅者正确计算', () => {
      // amp_gold_adjacent: valuePerStack=0.03, Lv1=0.03
      expect(getAmplifierValue('amp_gold_adjacent', 1)).toBeCloseTo(0.03);
    });

    it('symmetric 增幅者高 valuePerStack', () => {
      // amp_base_symmetric: valuePerStack=0.12, Lv1=0.12
      expect(getAmplifierValue('amp_base_symmetric', 1)).toBeCloseTo(0.12);
    });
  });
});

describe('增幅者状态集成', () => {
  it('createInitialState 包含 amplifierStacks（空 Map）和 amplifierPool（空数组）', () => {
    const state = createInitialState();
    expect(state.amplifierStacks).toBeInstanceOf(Map);
    expect(state.amplifierStacks.size).toBe(0);
    expect(state.amplifierPool).toEqual([]);
  });

  it('amplifierStacks 可正确 set/get/clear', () => {
    const state = createInitialState();
    state.amplifierStacks.set('amp_base_adjacent', 5);
    expect(state.amplifierStacks.get('amp_base_adjacent')).toBe(5);
    state.amplifierStacks.set('amp_base_adjacent', 10);
    expect(state.amplifierStacks.get('amp_base_adjacent')).toBe(10);
    state.amplifierStacks.clear();
    expect(state.amplifierStacks.size).toBe(0);
  });
});
