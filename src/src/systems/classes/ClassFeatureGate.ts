// ============================================
// 打字肉鸽 - 职业功能门控
// ============================================
// Story 32.3: 职业「失去」机制框架

import type { FeatureId } from '../../core/types';
import { state } from '../../core/state';
import { CLASS_DEFINITIONS } from '../../data/classes';

/** 功能标签（UI 展示用） */
export const FEATURE_LABELS: Record<FeatureId, string> = {
  'pack-system': '牌包系统',
  'enchant-choice': '附魔选择权',
};

/**
 * 检查指定功能是否在当前职业下可用
 * 无职业时所有功能默认 enabled
 */
export function isFeatureEnabled(feature: FeatureId): boolean {
  const classDef = CLASS_DEFINITIONS[state.classId];
  if (!classDef) return true;
  return classDef.loseFeature !== feature;
}

/**
 * 获取功能被禁用的原因描述
 * 若功能可用则返回 null
 */
export function getFeatureLostReason(feature: FeatureId): string | null {
  const classDef = CLASS_DEFINITIONS[state.classId];
  if (!classDef || classDef.loseFeature !== feature) return null;
  return classDef.loseDescription;
}
