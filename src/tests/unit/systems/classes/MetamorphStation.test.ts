// ============================================
// 打字肉鸽 - 蜕变台单元测试
// ============================================
// Story 32.9: Task 4 — computeHiddenPool / performMetamorph / getSkillType

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state, resetState } from '../../../../src/core/state';

// --- mocks for side-effect modules ---
vi.mock('../../../../src/effects/sound', () => ({ playSound: vi.fn() }));
vi.mock('../../../../src/systems/battle', () => ({
  showFeedback: vi.fn(),
  updateHUD: vi.fn(),
  setPseudoInfiniteVisual: vi.fn(),
}));
vi.mock('../../../../src/systems/shop', () => ({
  renderBuildManager: vi.fn(),
}));
vi.mock('../../../../src/core/seededRandom', () => ({
  random: vi.fn(() => 0),           // 默认返回 0 → 选第一个
  seed: vi.fn(),
  getSeedState: vi.fn(),
  setSeedState: vi.fn(),
}));
vi.mock('../../../../src/data/skills', () => ({
  getSkillDisplayInfo: vi.fn((_id: string) => ({ icon: '?', name: 'mock', desc: '' })),
  getSkillSchool: vi.fn(() => ({ label: 'mock', cssClass: '' })),
  SKILL_SCHOOL: {},
}));
vi.mock('../../../../src/ui/elements', () => ({
  getElements: () => ({ triggerZone: { appendChild: vi.fn() } }),
}));

// 真实数据模块
import { CONVERTERS } from '../../../../src/data/converters';
import { CONNECTORS, REPLICATORS } from '../../../../src/data/connectors';
import { AMPLIFIERS } from '../../../../src/data/amplifiers';

// 取各类型前几个 ID 作为测试用例
const allConverterIds = Object.keys(CONVERTERS);
const allConnectorIds = Object.keys(CONNECTORS);
const allReplicatorIds = Object.keys(REPLICATORS);
const allAmplifierIds = Object.keys(AMPLIFIERS);

// --- 最小 DOM mock（node 环境无 document）---
function createMockElement(): any {
  return {
    innerHTML: '',
    className: '',
    textContent: '',
    id: '',
    style: {},
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
    addEventListener: vi.fn(),
    remove: vi.fn(),
    children: [],
    setAttribute: vi.fn(),
    getBoundingClientRect: () => ({ right: 0, bottom: 0, width: 0, height: 0, top: 0, left: 0 }),
    onclick: null,
  };
}

vi.stubGlobal('document', {
  createElement: () => createMockElement(),
  getElementById: () => null,
  body: { appendChild: vi.fn() },
});

// 容器 mock（performMetamorph 需要 HTMLElement）
function mockContainer(): any {
  return createMockElement();
}

describe('MetamorphStation', () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  // =============================================
  // getSkillType
  // =============================================
  describe('getSkillType', () => {
    it('产出者 → "producer"', async () => {
      const { getSkillType } = await import('../../../../src/systems/classes/MetamorphStation');
      expect(getSkillType('prod_burst')).toBe('producer');
      expect(getSkillType('prod_mutagen_drip')).toBe('producer');
    });

    it('转化者 → "converter"', async () => {
      const { getSkillType } = await import('../../../../src/systems/classes/MetamorphStation');
      expect(getSkillType(allConverterIds[0])).toBe('converter');
    });

    it('连接者 → "connector"', async () => {
      const { getSkillType } = await import('../../../../src/systems/classes/MetamorphStation');
      expect(getSkillType(allConnectorIds[0])).toBe('connector');
    });

    it('复制者 → "replicator"', async () => {
      const { getSkillType } = await import('../../../../src/systems/classes/MetamorphStation');
      expect(allReplicatorIds.length).toBeGreaterThan(0);
      expect(getSkillType(allReplicatorIds[0])).toBe('replicator');
    });

    it('增幅者 → "amplifier"', async () => {
      const { getSkillType } = await import('../../../../src/systems/classes/MetamorphStation');
      expect(getSkillType(allAmplifierIds[0])).toBe('amplifier');
    });

    it('未知 ID → null', async () => {
      const { getSkillType } = await import('../../../../src/systems/classes/MetamorphStation');
      expect(getSkillType('nonexistent_skill')).toBeNull();
    });
  });

  // =============================================
  // computeHiddenPool
  // =============================================
  describe('computeHiddenPool', () => {
    it('隐藏池 = 全集 - 可见池', async () => {
      const { computeHiddenPool } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      // 可见池只放一半转化者
      const half = Math.ceil(allConverterIds.length / 2);
      state.converterPool = allConverterIds.slice(0, half);

      const hidden = computeHiddenPool('converter');
      // 隐藏池中不应包含可见池的 ID
      for (const id of state.converterPool) {
        expect(hidden).not.toContain(id);
      }
      // 隐藏池非空（全集大于可见池）
      expect(hidden.length).toBeGreaterThan(0);
    });

    it('排除玩家已拥有技能', async () => {
      const { computeHiddenPool } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      state.converterPool = allConverterIds.slice(0, 5);
      // 玩家拥有一个不在可见池中的转化者
      const hiddenCandidate = allConverterIds.find(id => !state.converterPool.includes(id));
      if (hiddenCandidate) {
        state.player.skills.set(hiddenCandidate, { level: 1, purchasePrice: 10 });
        const hidden = computeHiddenPool('converter');
        expect(hidden).not.toContain(hiddenCandidate);
      }
    });

    it('ClassResourceFilter 过滤非本职业技能', async () => {
      const { computeHiddenPool } = await import('../../../../src/systems/classes/MetamorphStation');
      // 以非蜕变师身份调用 → mutagen 类转化者被过滤
      state.classId = 'none';
      state.converterPool = [];
      const hidden = computeHiddenPool('converter');
      // 不应包含 mutagen 转化者
      const mutagenIds = allConverterIds.filter(id => {
        const def = CONVERTERS[id];
        return def && (def.resource === 'mutagen' || def.source === 'mutagen' || def.target === 'mutagen');
      });
      for (const id of mutagenIds) {
        expect(hidden).not.toContain(id);
      }
    });

    it('连接者隐藏池计算', async () => {
      const { computeHiddenPool } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      state.connectorPool = allConnectorIds.slice(0, 3);
      const hidden = computeHiddenPool('connector');
      for (const id of state.connectorPool) {
        expect(hidden).not.toContain(id);
      }
    });

    it('复制者隐藏池计算', async () => {
      const { computeHiddenPool } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      expect(allReplicatorIds.length).toBeGreaterThan(0);
      state.replicatorPool = allReplicatorIds.slice(0, Math.min(3, allReplicatorIds.length));
      const hidden = computeHiddenPool('replicator');
      for (const id of state.replicatorPool) {
        expect(hidden).not.toContain(id);
      }
    });

    it('增幅者隐藏池计算', async () => {
      const { computeHiddenPool } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      state.amplifierPool = allAmplifierIds.slice(0, 5);
      const hidden = computeHiddenPool('amplifier');
      for (const id of state.amplifierPool) {
        expect(hidden).not.toContain(id);
      }
    });

    it('可见池 = 全集 → 隐藏池为空', async () => {
      const { computeHiddenPool } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      state.converterPool = [...allConverterIds];
      const hidden = computeHiddenPool('converter');
      expect(hidden).toHaveLength(0);
    });
  });

  // =============================================
  // performMetamorph
  // =============================================
  describe('performMetamorph', () => {
    // 辅助：准备一个可蜕变的转化者状态
    function setupConverterForMutation() {
      state.classId = 'metamorph';
      const oldId = allConverterIds[0];
      const candidateId = allConverterIds[allConverterIds.length - 1]; // 将从隐藏池中抽取
      // 可见池只含 oldId → 其余都在隐藏池
      state.converterPool = [oldId];
      state.player.skills.set(oldId, { level: 2, purchasePrice: 15 });
      state.player.bindings.set('a', oldId);
      state.mutagenInventory = 5;
      return { oldId, candidateId };
    }

    it('产出者不可蜕变 — 直接返回', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      const prodId = 'prod_burst';
      state.player.skills.set(prodId, { level: 1, purchasePrice: 10 });
      state.player.bindings.set('q', prodId);
      state.mutagenInventory = 10;

      performMetamorph(prodId, 'q', mockContainer());

      // 变异素不应减少
      expect(state.mutagenInventory).toBe(10);
      // 技能不应改变
      expect(state.player.skills.has(prodId)).toBe(true);
    });

    it('变异素不足 → 显示反馈，不蜕变', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { showFeedback } = await import('../../../../src/systems/battle');
      const { oldId } = setupConverterForMutation();
      state.mutagenInventory = 0;

      performMetamorph(oldId, 'a', mockContainer());

      expect(showFeedback).toHaveBeenCalledWith('变异素不足!', '#ff6b6b');
      expect(state.player.skills.has(oldId)).toBe(true);
    });

    it('正常蜕变 — 消耗1变异素，替换技能', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { oldId } = setupConverterForMutation();

      performMetamorph(oldId, 'a', mockContainer());

      // 变异素减1
      expect(state.mutagenInventory).toBe(4);
      // 旧技能已删除
      expect(state.player.skills.has(oldId)).toBe(false);
      // 新技能存在且继承 level
      const newId = state.player.bindings.get('a')!;
      expect(newId).not.toBe(oldId);
      const newData = state.player.skills.get(newId);
      expect(newData).toBeDefined();
      expect(newData!.level).toBe(2);
      expect(newData!.purchasePrice).toBe(15);
    });

    it('附魔迁移 — enchantedSkills 从旧→新', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { oldId } = setupConverterForMutation();
      state.player.enchantedSkills.set(oldId, 'growth');

      performMetamorph(oldId, 'a', mockContainer());

      expect(state.player.enchantedSkills.has(oldId)).toBe(false);
      const newId = state.player.bindings.get('a')!;
      expect(state.player.enchantedSkills.get(newId)).toBe('growth');
    });

    it('成长值迁移 — growthValues 从旧→新', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { oldId } = setupConverterForMutation();
      state.growthValues.set(oldId, 3.5);

      performMetamorph(oldId, 'a', mockContainer());

      expect(state.growthValues.has(oldId)).toBe(false);
      const newId = state.player.bindings.get('a')!;
      expect(state.growthValues.get(newId)).toBe(3.5);
    });

    it('精通计数迁移 — masteryCounters 从旧→新', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { oldId } = setupConverterForMutation();
      state.masteryCounters.set(oldId, 7);

      performMetamorph(oldId, 'a', mockContainer());

      expect(state.masteryCounters.has(oldId)).toBe(false);
      const newId = state.player.bindings.get('a')!;
      expect(state.masteryCounters.get(newId)).toBe(7);
    });

    it('吞噬图标迁移 — devourIcons 从旧→新', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { oldId } = setupConverterForMutation();
      state.devourIcons.set(oldId, '🔥');

      performMetamorph(oldId, 'a', mockContainer());

      expect(state.devourIcons.has(oldId)).toBe(false);
      const newId = state.player.bindings.get('a')!;
      expect(state.devourIcons.get(newId)).toBe('🔥');
    });

    it('免费蜕变 — primal_mutant 遗物首次不扣变异素', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { oldId } = setupConverterForMutation();
      state.player.relics.add('primal_mutant');
      state.player.relicStates['primal_mutant'] = 0;
      state.mutagenInventory = 0; // 即使 0 也能免费

      performMetamorph(oldId, 'a', mockContainer());

      // 变异素仍为 0（未扣费）
      expect(state.mutagenInventory).toBe(0);
      // 遗物状态标记已用
      expect(state.player.relicStates['primal_mutant']).toBe(1);
      // 技能已替换
      expect(state.player.skills.has(oldId)).toBe(false);
    });

    it('免费蜕变已用 → 第二次需要变异素', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { showFeedback } = await import('../../../../src/systems/battle');
      const { oldId } = setupConverterForMutation();
      state.player.relics.add('primal_mutant');
      state.player.relicStates['primal_mutant'] = 1; // 已用
      state.mutagenInventory = 0;

      performMetamorph(oldId, 'a', mockContainer());

      // 应提示不足
      expect(showFeedback).toHaveBeenCalledWith('变异素不足!', '#ff6b6b');
      expect(state.player.skills.has(oldId)).toBe(true);
    });

    it('隐藏池为空 → 显示反馈，不蜕变', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { showFeedback } = await import('../../../../src/systems/battle');
      const { oldId } = setupConverterForMutation();
      // 可见池 = 全集 → 隐藏池为空
      state.converterPool = [...allConverterIds];

      performMetamorph(oldId, 'a', mockContainer());

      expect(showFeedback).toHaveBeenCalledWith('隐藏池已空!', '#ff6b6b');
      // 变异素不应扣费（在隐藏池检查前就返回了）
      expect(state.mutagenInventory).toBe(5);
    });

    it('连续蜕变 — 多次调用都正确执行', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      state.mutagenInventory = 10;

      // 准备两个转化者
      const id1 = allConverterIds[0];
      const id2 = allConverterIds[1];
      state.converterPool = [id1, id2];
      state.player.skills.set(id1, { level: 1, purchasePrice: 10 });
      state.player.skills.set(id2, { level: 3, purchasePrice: 20 });
      state.player.bindings.set('a', id1);
      state.player.bindings.set('b', id2);

      // 第一次蜕变
      performMetamorph(id1, 'a', mockContainer());
      expect(state.mutagenInventory).toBe(9);
      expect(state.player.skills.has(id1)).toBe(false);

      // 第二次蜕变
      const newId1 = state.player.bindings.get('a')!;
      // 更新可见池以排除新技能（模拟真实环境）
      performMetamorph(id2, 'b', mockContainer());
      expect(state.mutagenInventory).toBe(8);
      expect(state.player.skills.has(id2)).toBe(false);
    });

    it('蜕变后播放音效和显示反馈', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { playSound } = await import('../../../../src/effects/sound');
      const { showFeedback } = await import('../../../../src/systems/battle');
      const { oldId } = setupConverterForMutation();

      performMetamorph(oldId, 'a', mockContainer());

      expect(playSound).toHaveBeenCalledWith('skill');
      expect(showFeedback).toHaveBeenCalledWith(
        expect.stringContaining('→'),
        '#2ecc71',
        1.2,
      );
    });
  });
});
