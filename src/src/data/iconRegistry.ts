// ============================================
// 打字肉鸽 - 图标注册表（仅供测试使用）
// ============================================
// Epic 26: 聚合所有数据源图标，用于跨类型唯一性检查

import { RELICS } from './relics';
import { BOSS_MODIFIER_META } from './bossModifiers';
import { RESOURCE_ICONS } from '../core/constants';

export type IconType = 'relic' | 'bossModifier' | 'resource';

export interface IconEntry {
  icon: string;
  id: string;
  type: IconType;
}

/** 用 Intl.Segmenter 判断多字素图标（如 ⚔️🔗、🌱📡），组合图标不参与去重 */
export function isCompositeIcon(icon: string): boolean {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(icon)];
  return segments.length > 1;
}

/** 聚合所有数据源的图标条目 */
export function getAllIconEntries(): IconEntry[] {
  const entries: IconEntry[] = [];

  for (const [resource, icon] of Object.entries(RESOURCE_ICONS)) {
    entries.push({ icon, id: `resource:${resource}`, type: 'resource' });
  }
  for (const r of Object.values(RELICS)) {
    entries.push({ icon: r.icon, id: r.id, type: 'relic' });
  }
  for (const b of Object.values(BOSS_MODIFIER_META)) {
    entries.push({ icon: b.icon, id: b.id, type: 'bossModifier' });
  }

  return entries;
}

/** 返回重复的原子图标及其使用者（排除组合图标） */
export function findDuplicateIcons(): Map<string, IconEntry[]> {
  const entries = getAllIconEntries();
  const atomicEntries = entries.filter(e => !isCompositeIcon(e.icon));

  // 按图标分组
  const groups = new Map<string, IconEntry[]>();
  for (const entry of atomicEntries) {
    const list = groups.get(entry.icon) || [];
    list.push(entry);
    groups.set(entry.icon, list);
  }

  const duplicates = new Map<string, IconEntry[]>();
  for (const [icon, group] of groups) {
    if (group.length <= 1) continue;
    duplicates.set(icon, group);
  }

  return duplicates;
}
