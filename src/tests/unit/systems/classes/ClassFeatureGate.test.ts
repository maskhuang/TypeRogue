// ============================================
// 打字肉鸽 - 职业功能门控单元测试
// ============================================
// Story 32.3 Task 5: FeatureGate 系统测试

import { describe, it, expect, beforeEach } from 'vitest';
import { state, resetState } from '../../../../src/core/state';
import { isFeatureEnabled, getFeatureLostReason, FEATURE_LABELS } from '../../../../src/systems/classes/ClassFeatureGate';

describe('isFeatureEnabled', () => {
  beforeEach(() => {
    resetState();
  });

  it('无职业时 pack-system 启用', () => {
    state.classId = 'none';
    expect(isFeatureEnabled('pack-system')).toBe(true);
  });

  it('无职业时 enchant-choice 启用', () => {
    state.classId = 'none';
    expect(isFeatureEnabled('enchant-choice')).toBe(true);
  });

  it('造词师时 pack-system 禁用', () => {
    state.classId = 'wordsmith';
    expect(isFeatureEnabled('pack-system')).toBe(false);
  });

  it('造词师时 enchant-choice 启用', () => {
    state.classId = 'wordsmith';
    expect(isFeatureEnabled('enchant-choice')).toBe(true);
  });

  it('蜕变师时 enchant-choice 禁用', () => {
    state.classId = 'metamorph';
    expect(isFeatureEnabled('enchant-choice')).toBe(false);
  });

  it('蜕变师时 pack-system 启用', () => {
    state.classId = 'metamorph';
    expect(isFeatureEnabled('pack-system')).toBe(true);
  });
});

describe('getFeatureLostReason', () => {
  beforeEach(() => {
    resetState();
  });

  it('无职业时 pack-system 返回 null', () => {
    state.classId = 'none';
    expect(getFeatureLostReason('pack-system')).toBeNull();
  });

  it('造词师时 pack-system 返回失去描述', () => {
    state.classId = 'wordsmith';
    const reason = getFeatureLostReason('pack-system');
    expect(reason).toBe('失去牌包系统（商店无牌包 tab）');
  });

  it('蜕变师时 enchant-choice 返回失去描述', () => {
    state.classId = 'metamorph';
    const reason = getFeatureLostReason('enchant-choice');
    expect(reason).toBe('失去附魔选择权（Lv3 随机附魔）');
  });

  it('蜕变师时 pack-system 返回 null（未失去）', () => {
    state.classId = 'metamorph';
    expect(getFeatureLostReason('pack-system')).toBeNull();
  });

  it('造词师时 enchant-choice 返回 null（未失去）', () => {
    state.classId = 'wordsmith';
    expect(getFeatureLostReason('enchant-choice')).toBeNull();
  });
});

describe('FEATURE_LABELS', () => {
  it('pack-system 标签为「牌包系统」', () => {
    expect(FEATURE_LABELS['pack-system']).toBe('牌包系统');
  });

  it('enchant-choice 标签为「附魔选择权」', () => {
    expect(FEATURE_LABELS['enchant-choice']).toBe('附魔选择权');
  });
});
