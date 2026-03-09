// ============================================
// 打字肉鸽 - 图标注册表测试
// ============================================
// Epic 26 Story 26.1: 跨类型唯一性 + isCompositeIcon + 非空 + 总数

import { describe, it, expect } from 'vitest';
import { getAllIconEntries, findDuplicateIcons, isCompositeIcon } from '../../../src/data/iconRegistry';

describe('图标注册表', () => {
  it('所有条目 icon 非空', () => {
    const entries = getAllIconEntries();
    for (const entry of entries) {
      expect(entry.icon, `${entry.type}:${entry.id} icon 为空`).toBeTruthy();
      expect(entry.icon.trim(), `${entry.type}:${entry.id} icon 为空白`).not.toBe('');
    }
  });

  it('总条目数 = 197（7 资源 + 10 产出 + 34 转化 + 31 连接 + 30 增幅 + 35 附魔 + 37 遗物 + 13 Boss）', () => {
    const entries = getAllIconEntries();
    expect(entries.length).toBe(197);
  });

  it('跨类型原子图标无重复（资源豁免 + 组合图标排除）', () => {
    const duplicates = findDuplicateIcons();
    if (duplicates.size > 0) {
      const details = [...duplicates.entries()]
        .map(([icon, entries]) => `  ${icon}: ${entries.map(e => `${e.type}:${e.id}`).join(', ')}`)
        .join('\n');
      expect.fail(`发现 ${duplicates.size} 组重复图标:\n${details}`);
    }
  });

  describe('isCompositeIcon', () => {
    it('单字素图标返回 false', () => {
      expect(isCompositeIcon('🎯')).toBe(false);
      expect(isCompositeIcon('⚔️')).toBe(false);
      expect(isCompositeIcon('🛡️')).toBe(false);
      expect(isCompositeIcon('💎')).toBe(false);
      expect(isCompositeIcon('📈')).toBe(false);
    });

    it('多字素组合图标返回 true', () => {
      expect(isCompositeIcon('⚔️🔗')).toBe(true);
      expect(isCompositeIcon('🌱📡')).toBe(true);
      expect(isCompositeIcon('⚔️✨')).toBe(true);
      expect(isCompositeIcon('💫🔗')).toBe(true);
      expect(isCompositeIcon('🕳️🤝')).toBe(true);
    });
  });
});
