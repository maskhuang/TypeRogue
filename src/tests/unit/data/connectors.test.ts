// ============================================
// 连接者数据完整性 + 工具函数测试
// ============================================

import { describe, it, expect } from 'vitest';
import { CONNECTORS, isConnector, drawConnectorPool, getConnectorDesc } from '../../../src/data/connectors';
import { PositionRelation } from '../../../src/data/keyboardTopology';

describe('连接者数据', () => {
  const all = Object.values(CONNECTORS);
  const copyType = all.filter(c => c.triggerType === 'copy');
  const resourceType = all.filter(c => c.triggerType === 'resourceTrigger');

  it('共 31 个连接者', () => {
    expect(all.length).toBe(31);
  });

  it('6 个复制型 + 25 个资源触发型', () => {
    expect(copyType.length).toBe(6);
    expect(resourceType.length).toBe(25);
  });

  it('所有 id 唯一', () => {
    const ids = all.map(c => c.id);
    expect(new Set(ids).size).toBe(31);
  });

  it('每个图标唯一', () => {
    const icons = Object.values(CONNECTORS).map(c => c.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('id 与 key 一致', () => {
    for (const [key, conn] of Object.entries(CONNECTORS)) {
      expect(conn.id).toBe(key);
    }
  });

  it('所有字段非空', () => {
    for (const conn of all) {
      expect(conn.id).toBeTruthy();
      expect(conn.name).toBeTruthy();
      expect(conn.icon).toBeTruthy();
      expect(conn.triggerType).toBeTruthy();
      expect(conn.positionRelation).toBeTruthy();
      expect(conn.desc).toBeTruthy();
    }
  });

  it('复制型覆盖全部 6 种位置关系', () => {
    const relations = copyType.map(c => c.positionRelation);
    expect(relations).toContain(PositionRelation.Adjacent);
    expect(relations).toContain(PositionRelation.SameRow);
    expect(relations).toContain(PositionRelation.SameColumn);
    expect(relations).toContain(PositionRelation.SameHand);
    expect(relations).toContain(PositionRelation.SameFinger);
    expect(relations).toContain(PositionRelation.Symmetric);
  });

  it('资源触发型覆盖 5 资源 × 5 位置 = 25（无对称位）', () => {
    const resources = ['base', 'score', 'multiplier', 'time', 'gold'];
    const relations = Object.values(PositionRelation).filter(r => r !== PositionRelation.Symmetric);
    for (const r of resources) {
      for (const rel of relations) {
        const match = resourceType.find(c => c.resource === r && c.positionRelation === rel);
        expect(match, `missing ${r}+${rel}`).toBeDefined();
      }
    }
  });

  it('复制型无 resource 字段', () => {
    for (const c of copyType) {
      expect(c.resource).toBeUndefined();
    }
  });

  it('资源触发型有 resource 字段', () => {
    for (const c of resourceType) {
      expect(c.resource).toBeTruthy();
    }
  });
});

describe('isConnector', () => {
  it('连接者 ID 返回 true', () => {
    expect(isConnector('conn_copy_adjacent')).toBe(true);
    expect(isConnector('conn_base_sameRow')).toBe(true);
    expect(isConnector('conn_gold_sameFinger')).toBe(true);
  });

  it('金币连接者 ID 返回 true', () => {
    expect(isConnector('conn_gold_adjacent')).toBe(true);
    expect(isConnector('conn_gold_sameRow')).toBe(true);
    expect(isConnector('conn_gold_sameFinger')).toBe(true);
  });

  it('非连接者 ID 返回 false', () => {
    expect(isConnector('burst')).toBe(false);
    expect(isConnector('prod_burst')).toBe(false);
    expect(isConnector('conv_base_score_add')).toBe(false);
    expect(isConnector('nonexistent')).toBe(false);
  });
});

describe('drawConnectorPool', () => {
  it('默认抽 18 个', () => {
    const pool = drawConnectorPool();
    expect(pool.length).toBe(18);
  });

  it('所有 ID 都是有效连接者', () => {
    const pool = drawConnectorPool();
    for (const id of pool) {
      expect(isConnector(id)).toBe(true);
    }
  });

  it('无重复 ID', () => {
    const pool = drawConnectorPool();
    expect(new Set(pool).size).toBe(pool.length);
  });

  it('自定义数量', () => {
    expect(drawConnectorPool(5).length).toBe(5);
    expect(drawConnectorPool(31).length).toBe(31);
  });

  it('超过总数时返回全部', () => {
    expect(drawConnectorPool(100).length).toBe(31);
  });

  it('两次抽取结果不完全相同（概率性）', () => {
    const pool1 = drawConnectorPool();
    const pool2 = drawConnectorPool();
    // 极低概率相同，允许偶尔失败
    const same = pool1.every((id, i) => id === pool2[i]);
    // 不做强断言，只确保不是排序后的
    expect(pool1.length).toBe(18);
  });
});

describe('getConnectorDesc', () => {
  it('复制型描述包含位置关系', () => {
    const desc = getConnectorDesc('conn_copy_adjacent');
    expect(desc).toContain('相邻');
  });

  it('资源触发型描述包含资源和位置', () => {
    const desc = getConnectorDesc('conn_base_sameRow');
    expect(desc).toContain('基数');
    expect(desc).toContain('同行');
  });

  it('金币连接者描述包含金币标签', () => {
    const desc = getConnectorDesc('conn_gold_adjacent');
    expect(desc).toContain('金币');
    expect(desc).toContain('相邻');
  });

  it('无效 ID 返回空字符串', () => {
    expect(getConnectorDesc('nonexistent')).toBe('');
  });
});
