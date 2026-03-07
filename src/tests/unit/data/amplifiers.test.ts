// ============================================
// 增幅者数据完整性 + 工具函数测试
// ============================================
// Story 23.2: 真实数据测试（替代 23.1 mock 注入测试）

import { describe, it, expect } from 'vitest';
import { AMPLIFIERS, isAmplifier, drawAmplifierPool, getAmplifierValue, getAmplifierDesc } from '../../../src/data/amplifiers';
import { PositionRelation } from '../../../src/data/keyboardTopology';
import { createInitialState } from '../../../src/core/state';

// 从真实数据派生 ID 列表（避免硬编码漂移）
const ALL_AMP_IDS = Object.keys(AMPLIFIERS);

describe('增幅者数据完整性', () => {
  it('共 7 个增幅者', () => {
    expect(Object.keys(AMPLIFIERS).length).toBe(7);
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
      expect(amp.operator).toBeTruthy();
      expect(amp.valuePerStack).toBeGreaterThan(0);
      expect(amp.desc).toBeTruthy();
    }
  });

  it('覆盖至少 4 种 PositionRelation', () => {
    const relations = new Set(Object.values(AMPLIFIERS).map(a => a.positionRelation));
    expect(relations.size).toBeGreaterThanOrEqual(4);
  });

  it('至少 4 个 add 运算符', () => {
    const addAmps = Object.values(AMPLIFIERS).filter(a => a.operator === 'add');
    expect(addAmps.length).toBeGreaterThanOrEqual(4);
  });

  it('至少 3 个 multiply 运算符', () => {
    const mulAmps = Object.values(AMPLIFIERS).filter(a => a.operator === 'multiply');
    expect(mulAmps.length).toBeGreaterThanOrEqual(3);
  });

  it('覆盖 base/score/multiplier/time 四种资源', () => {
    const resources = new Set(Object.values(AMPLIFIERS).map(a => a.resource));
    expect(resources).toContain('base');
    expect(resources).toContain('score');
    expect(resources).toContain('multiplier');
    expect(resources).toContain('time');
  });

  it('每个名称唯一', () => {
    const names = Object.values(AMPLIFIERS).map(a => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('每个图标唯一', () => {
    const icons = Object.values(AMPLIFIERS).map(a => a.icon);
    expect(new Set(icons).size).toBe(icons.length);
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
      expect(getAmplifierDesc('amp_base_add_adjacent')).toBe('触发时+1层：🔗相邻技能⚔️基数+1/层');
    });

    it('add 类型 Lv1 生成正确描述', () => {
      const desc = getAmplifierDesc('amp_base_add_adjacent', 1);
      expect(desc).toContain('+');
      expect(desc).toContain('1');
      expect(desc).toContain('基数');
    });

    it('multiply 类型 Lv1 生成百分比描述', () => {
      const desc = getAmplifierDesc('amp_base_mul_adjacent', 1);
      expect(desc).toContain('×');
      expect(desc).toContain('5%');
      expect(desc).toContain('基数');
    });

    it('level=0 时仍计算（不短路）', () => {
      const desc = getAmplifierDesc('amp_base_add_adjacent', 0);
      expect(desc).toContain('+');
    });
  });

  describe('drawAmplifierPool', () => {
    it('请求 0 个返回空数组', () => {
      expect(drawAmplifierPool(0)).toEqual([]);
    });

    it('抽取数量不超过总数', () => {
      const pool = drawAmplifierPool(20);
      expect(pool.length).toBe(7);
    });

    it('抽取指定数量', () => {
      const pool = drawAmplifierPool(5);
      expect(pool.length).toBe(5);
    });

    it('抽取结果不重复', () => {
      const pool = drawAmplifierPool(7);
      expect(new Set(pool).size).toBe(pool.length);
    });

    it('抽取结果均为合法增幅者 ID', () => {
      const pool = drawAmplifierPool(7);
      for (const id of pool) {
        expect(isAmplifier(id)).toBe(true);
      }
    });

    it('默认参数可用', () => {
      const pool = drawAmplifierPool();
      expect(pool.length).toBe(7); // 默认 10，但只有 7 个
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
      // amp_base_add_adjacent: valuePerStack=1, Lv1=1×1.0=1
      expect(getAmplifierValue('amp_base_add_adjacent', 1)).toBe(1);
    });

    it('Lv2 返回 valuePerStack × 1.5', () => {
      // amp_base_add_adjacent: valuePerStack=1, Lv2=1×1.5=1.5
      expect(getAmplifierValue('amp_base_add_adjacent', 2)).toBe(1.5);
    });

    it('Lv3 返回 valuePerStack × 2.0', () => {
      // amp_base_add_adjacent: valuePerStack=1, Lv3=1×2.0=2
      expect(getAmplifierValue('amp_base_add_adjacent', 3)).toBe(2);
    });

    it('level 超过 3 时按 Lv3 计算', () => {
      expect(getAmplifierValue('amp_base_add_adjacent', 5)).toBe(2);
    });

    it('乘法增幅者 Lv1 正确计算', () => {
      // amp_base_mul_adjacent: valuePerStack=0.05, Lv1=0.05×1.0=0.05
      expect(getAmplifierValue('amp_base_mul_adjacent', 1)).toBe(0.05);
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
    state.amplifierStacks.set('amp_base_add_adjacent', 5);
    expect(state.amplifierStacks.get('amp_base_add_adjacent')).toBe(5);
    state.amplifierStacks.set('amp_base_add_adjacent', 10);
    expect(state.amplifierStacks.get('amp_base_add_adjacent')).toBe(10);
    state.amplifierStacks.clear();
    expect(state.amplifierStacks.size).toBe(0);
  });
});
