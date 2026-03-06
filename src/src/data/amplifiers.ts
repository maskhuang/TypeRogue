// ============================================
// 打字肉鸽 - 增幅者技能数据
// ============================================
// Story 23.1: 数据结构与工具函数（空数据，Story 23.2 填充）

import type { AmplifierDefinition } from '../core/types';
import { RESOURCE_LABELS, RESOURCE_ICONS } from '../core/constants';

// === 增幅者数据（Story 23.2 填充）===
export const AMPLIFIERS: Record<string, AmplifierDefinition> = {};

// === 工具函数 ===

/** 检查 ID 是否为增幅者 */
export function isAmplifier(id: string): boolean {
  return id in AMPLIFIERS;
}

/** 每局 run 从增幅者池中随机抽取指定数量 */
export function drawAmplifierPool(count = 10): string[] {
  const all = Object.keys(AMPLIFIERS);
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** 获取增幅者在指定等级的每层增幅值：Lv1=×1.0, Lv2=×1.5, Lv3=×2.0 */
export function getAmplifierValue(id: string, level: number): number {
  const amp = AMPLIFIERS[id];
  if (!amp) return 0;
  const growthFactors = [1.0, 1.5, 2.0];
  const idx = Math.max(0, Math.min(level, 3) - 1);
  return amp.valuePerStack * growthFactors[idx];
}

/** 生成等级相关的增幅者描述 */
export function getAmplifierDesc(id: string, level?: number): string {
  const amp = AMPLIFIERS[id];
  if (!amp) return '';
  if (level == null) return amp.desc;
  const value = getAmplifierValue(id, level);
  const resLabel = RESOURCE_LABELS[amp.resource] || amp.resource;
  const resIcon = RESOURCE_ICONS[amp.resource] || '';
  if (amp.operator === 'add') {
    return `每层为范围内技能${resIcon}${resLabel}+${parseFloat(value.toPrecision(4))}`;
  }
  return `每层为范围内技能${resIcon}${resLabel}×${parseFloat((value * 100).toPrecision(4))}%`;
}
