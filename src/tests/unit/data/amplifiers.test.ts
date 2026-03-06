// ============================================
// 增幅者数据完整性 + 工具函数测试
// ============================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AMPLIFIERS, isAmplifier, drawAmplifierPool, getAmplifierValue, getAmplifierDesc } from '../../../src/data/amplifiers';
import { createInitialState } from '../../../src/core/state';
import type { AmplifierDefinition } from '../../../src/core/types';

// 测试用增幅者数据
const TEST_AMP_ADD: AmplifierDefinition = {
  id: 'amp_test_add', name: '测试加法', icon: '🔧', resource: 'base',
  positionRelation: 'adjacent' as any, operator: 'add', valuePerStack: 2, desc: '测试加法增幅',
};
const TEST_AMP_MUL: AmplifierDefinition = {
  id: 'amp_test_mul', name: '测试乘法', icon: '🔬', resource: 'multiplier',
  positionRelation: 'sameRow' as any, operator: 'multiply', valuePerStack: 0.05, desc: '测试乘法增幅',
};

describe('增幅者工具函数', () => {
  describe('isAmplifier（负路径）', () => {
    it('未注册的 ID 返回 false', () => {
      expect(isAmplifier('prod_burst')).toBe(false);
      expect(isAmplifier('nonexistent')).toBe(false);
      expect(isAmplifier('amp')).toBe(false); // 旧已删除 ID
    });

    it('空 AMPLIFIERS 时任何 ID 返回 false', () => {
      expect(isAmplifier('amp_base_add_adjacent')).toBe(false);
    });
  });

  describe('isAmplifier（正向路径）', () => {
    beforeEach(() => {
      AMPLIFIERS[TEST_AMP_ADD.id] = TEST_AMP_ADD;
    });
    afterEach(() => {
      delete AMPLIFIERS[TEST_AMP_ADD.id];
    });

    it('已注册的 ID 返回 true', () => {
      expect(isAmplifier('amp_test_add')).toBe(true);
    });

    it('其他 ID 仍返回 false', () => {
      expect(isAmplifier('amp_test_mul')).toBe(false);
    });
  });

  describe('getAmplifierDesc（负路径）', () => {
    it('无效 id 返回空字符串', () => {
      expect(getAmplifierDesc('nonexistent')).toBe('');
      expect(getAmplifierDesc('nonexistent', 2)).toBe('');
    });

    it('不崩溃', () => {
      expect(() => getAmplifierDesc('')).not.toThrow();
      expect(() => getAmplifierDesc('', 1)).not.toThrow();
    });
  });

  describe('getAmplifierDesc（正向路径）', () => {
    beforeEach(() => {
      AMPLIFIERS[TEST_AMP_ADD.id] = TEST_AMP_ADD;
      AMPLIFIERS[TEST_AMP_MUL.id] = TEST_AMP_MUL;
    });
    afterEach(() => {
      delete AMPLIFIERS[TEST_AMP_ADD.id];
      delete AMPLIFIERS[TEST_AMP_MUL.id];
    });

    it('无 level 时返回原始 desc', () => {
      expect(getAmplifierDesc('amp_test_add')).toBe('测试加法增幅');
    });

    it('add 类型生成正确描述', () => {
      const desc = getAmplifierDesc('amp_test_add', 1);
      expect(desc).toContain('+');
      expect(desc).toContain('2');
    });

    it('multiply 类型生成百分比描述', () => {
      const desc = getAmplifierDesc('amp_test_mul', 1);
      expect(desc).toContain('×');
      expect(desc).toContain('%');
    });

    it('level=0 时仍计算（不短路）', () => {
      const desc = getAmplifierDesc('amp_test_add', 0);
      // level=0 经过 Math.max(0, Math.min(0,3)-1) = Math.max(0,-1) = 0
      // growthFactors[0] = 1.0 → 2 * 1.0 = 2
      expect(desc).toContain('+');
    });
  });

  describe('drawAmplifierPool（负路径）', () => {
    it('空 AMPLIFIERS 返回空数组', () => {
      expect(drawAmplifierPool(5)).toEqual([]);
      expect(drawAmplifierPool(0)).toEqual([]);
    });

    it('请求 0 个返回空数组', () => {
      expect(drawAmplifierPool(0)).toEqual([]);
    });
  });

  describe('drawAmplifierPool（正向路径）', () => {
    beforeEach(() => {
      AMPLIFIERS[TEST_AMP_ADD.id] = TEST_AMP_ADD;
      AMPLIFIERS[TEST_AMP_MUL.id] = TEST_AMP_MUL;
    });
    afterEach(() => {
      delete AMPLIFIERS[TEST_AMP_ADD.id];
      delete AMPLIFIERS[TEST_AMP_MUL.id];
    });

    it('抽取数量不超过总数', () => {
      const pool = drawAmplifierPool(5);
      expect(pool.length).toBe(2); // 只有 2 个增幅者
    });

    it('抽取结果不重复', () => {
      const pool = drawAmplifierPool(2);
      expect(new Set(pool).size).toBe(pool.length);
    });

    it('默认参数可用', () => {
      const pool = drawAmplifierPool();
      expect(pool.length).toBe(2); // 默认 10，但只有 2 个
    });
  });

  describe('getAmplifierValue（负路径）', () => {
    it('无效 id 返回 0', () => {
      expect(getAmplifierValue('nonexistent', 1)).toBe(0);
    });

    it('不崩溃', () => {
      expect(() => getAmplifierValue('', 0)).not.toThrow();
      expect(() => getAmplifierValue('', -1)).not.toThrow();
    });
  });

  describe('getAmplifierValue（正向路径）', () => {
    beforeEach(() => {
      AMPLIFIERS[TEST_AMP_ADD.id] = TEST_AMP_ADD;
    });
    afterEach(() => {
      delete AMPLIFIERS[TEST_AMP_ADD.id];
    });

    it('Lv1 返回 valuePerStack × 1.0', () => {
      expect(getAmplifierValue('amp_test_add', 1)).toBe(2);
    });

    it('Lv2 返回 valuePerStack × 1.5', () => {
      expect(getAmplifierValue('amp_test_add', 2)).toBe(3);
    });

    it('Lv3 返回 valuePerStack × 2.0', () => {
      expect(getAmplifierValue('amp_test_add', 3)).toBe(4);
    });

    it('level 超过 3 时按 Lv3 计算', () => {
      expect(getAmplifierValue('amp_test_add', 5)).toBe(4);
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
    state.amplifierStacks.set('amp_test', 5);
    expect(state.amplifierStacks.get('amp_test')).toBe(5);
    state.amplifierStacks.set('amp_test', 10);
    expect(state.amplifierStacks.get('amp_test')).toBe(10);
    state.amplifierStacks.clear();
    expect(state.amplifierStacks.size).toBe(0);
  });
});

describe('增幅者数据完整性（空状态）', () => {
  it('AMPLIFIERS 当前为空记录', () => {
    expect(Object.keys(AMPLIFIERS).length).toBe(0);
  });
});
