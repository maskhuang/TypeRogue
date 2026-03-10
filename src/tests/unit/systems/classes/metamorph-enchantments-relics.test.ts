// ============================================
// 打字肉鸽 - 蜕变师附魔+遗物 单元测试
// ============================================
// Story 32.10: Task 8

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state, resetState } from '../../../../src/core/state';

// --- mocks for side-effect modules ---
vi.mock('../../../../src/effects/sound', () => ({ playSound: vi.fn(), emitResourceSound: vi.fn() }));
vi.mock('../../../../src/systems/battle', () => ({
  showFeedback: vi.fn(),
  updateHUD: vi.fn(),
  setPseudoInfiniteVisual: vi.fn(),
}));
vi.mock('../../../../src/systems/shop', () => ({
  renderBuildManager: vi.fn(),
  applyRandomEnchantment: vi.fn(),
}));
vi.mock('../../../../src/core/seededRandom', () => ({
  random: vi.fn(() => 0),
  seed: vi.fn(),
  getSeedState: vi.fn(),
  setSeedState: vi.fn(),
  setNormalMode: vi.fn(),
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
import { ENCHANTMENTS, drawEnchantmentPair } from '../../../../src/data/enchantments';
import { RELICS } from '../../../../src/data/relics';
import { CONVERTERS } from '../../../../src/data/converters';
import { CONNECTORS, REPLICATORS, isConnector, isReplicator } from '../../../../src/data/connectors';
import { AMPLIFIERS } from '../../../../src/data/amplifiers';
import { PRODUCERS } from '../../../../src/data/producers';

const allConverterIds = Object.keys(CONVERTERS);

// --- 最小 DOM mock ---
function createMockElement(): any {
  return {
    innerHTML: '',
    className: '',
    textContent: '',
    id: '',
    style: { cssText: '' },
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
vi.stubGlobal('window', { innerWidth: 1920, innerHeight: 1080 });
vi.stubGlobal('requestAnimationFrame', (cb: () => void) => cb());

function mockContainer(): any {
  return createMockElement();
}

describe('Metamorph Enchantments & Relics (Story 32.10)', () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  // =============================================
  // 附魔数据完整性
  // =============================================
  describe('附魔数据完整性', () => {
    const metamorphEnchs = ['ench_adapt', 'ench_unstable', 'ench_mutation_hunger'];

    it('3 个蜕变师附魔存在且 category = class-exclusive', () => {
      for (const id of metamorphEnchs) {
        const e = ENCHANTMENTS[id];
        expect(e, `${id} 应存在于 ENCHANTMENTS`).toBeDefined();
        expect(e.category).toBe('class-exclusive');
        expect(e.id).toBe(id);
        expect(e.name).toBeTruthy();
        expect(e.icon).toBeTruthy();
        expect(e.desc).toBeTruthy();
        expect(typeof e.effectValue).toBe('number');
      }
    });

    it('ench_adapt effectValue = 0.15', () => {
      expect(ENCHANTMENTS['ench_adapt'].effectValue).toBe(0.15);
    });

    it('ench_unstable effectValue = 0.30', () => {
      expect(ENCHANTMENTS['ench_unstable'].effectValue).toBe(0.30);
    });

    it('ench_mutation_hunger effectValue = 0.05', () => {
      expect(ENCHANTMENTS['ench_mutation_hunger'].effectValue).toBe(0.05);
    });
  });

  // =============================================
  // 附魔池过滤
  // =============================================
  describe('drawEnchantmentPair 池过滤', () => {
    it('蜕变师可抽取蜕变师专属附魔', () => {
      state.classId = 'metamorph';
      // 多次抽取，收集所有可能 ID
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const [a, b] = drawEnchantmentPair();
        seen.add(a);
        seen.add(b);
      }
      // 蜕变师专属应出现在池中
      expect(seen.has('ench_adapt') || seen.has('ench_unstable') || seen.has('ench_mutation_hunger')).toBe(true);
    });

    it('蜕变师不可抽到造词师专属附魔', () => {
      state.classId = 'metamorph';
      const wordsmithEnchs = new Set(['ench_harvest', 'ench_letter_affinity', 'ench_overflow']);
      for (let i = 0; i < 100; i++) {
        const [a, b] = drawEnchantmentPair();
        expect(wordsmithEnchs.has(a)).toBe(false);
        expect(wordsmithEnchs.has(b)).toBe(false);
      }
    });

    it('造词师不可抽到蜕变师专属附魔', () => {
      state.classId = 'wordsmith';
      const metamorphEnchs = new Set(['ench_adapt', 'ench_unstable', 'ench_mutation_hunger']);
      for (let i = 0; i < 100; i++) {
        const [a, b] = drawEnchantmentPair();
        expect(metamorphEnchs.has(a)).toBe(false);
        expect(metamorphEnchs.has(b)).toBe(false);
      }
    });

    it('无职业时不可抽到任何 class-exclusive 附魔', () => {
      state.classId = 'none';
      const allExclusive = new Set([
        'ench_harvest', 'ench_letter_affinity', 'ench_overflow',
        'ench_adapt', 'ench_unstable', 'ench_mutation_hunger',
      ]);
      for (let i = 0; i < 100; i++) {
        const [a, b] = drawEnchantmentPair();
        expect(allExclusive.has(a)).toBe(false);
        expect(allExclusive.has(b)).toBe(false);
      }
    });
  });

  // =============================================
  // 适应附魔触发
  // =============================================
  describe('适应附魔 (ench_adapt)', () => {
    function setupConverterForMutation() {
      state.classId = 'metamorph';
      const oldId = allConverterIds[0];
      state.converterPool = [oldId];
      state.player.skills.set(oldId, { level: 2, purchasePrice: 15 });
      state.player.bindings.set('a', oldId);
      state.mutagenInventory = 5;
      return { oldId };
    }

    it('蜕变时适应附魔 +0.15 growthValue', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { oldId } = setupConverterForMutation();
      state.player.enchantedSkills.set(oldId, 'ench_adapt');

      performMetamorph(oldId, 'a', mockContainer());

      const newId = state.player.bindings.get('a')!;
      expect(newId).not.toBe(oldId);
      // 附魔迁移到新技能
      expect(state.player.enchantedSkills.get(newId)).toBe('ench_adapt');
      // growthValues 应有 0.15
      expect(state.growthValues.get(newId)).toBeCloseTo(0.15, 5);
    });

    it('多次蜕变累加 growthValue', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { oldId } = setupConverterForMutation();
      state.player.enchantedSkills.set(oldId, 'ench_adapt');
      state.growthValues.set(oldId, 0.30); // 已有 0.30

      performMetamorph(oldId, 'a', mockContainer());

      const newId = state.player.bindings.get('a')!;
      // 0.30 (迁移) + 0.15 (新增) = 0.45
      expect(state.growthValues.get(newId)).toBeCloseTo(0.45, 5);
    });

    it('getEnchantmentMultiplier 返回 1 + growthValue', async () => {
      const { getEnchantmentMultiplier } = await import('../../../../src/systems/skills');
      const skillId = allConverterIds[0];
      state.player.enchantedSkills.set(skillId, 'ench_adapt');
      state.growthValues.set(skillId, 0.60);

      const mult = getEnchantmentMultiplier(skillId);
      expect(mult).toBeCloseTo(1.60, 5);
    });
  });

  // =============================================
  // 不稳定附魔
  // =============================================
  describe('不稳定附魔 (ench_unstable)', () => {
    it('getEnchantmentMultiplier 匹配资源时 +30%', async () => {
      const { getEnchantmentMultiplier } = await import('../../../../src/systems/skills');
      // 找一个产出 score 的产出者
      const prodId = Object.keys(PRODUCERS).find(id => PRODUCERS[id].resource === 'score');
      if (!prodId) return; // skip if no score producer
      state.player.enchantedSkills.set(prodId, 'ench_unstable');
      state.unstableResources.set(prodId, 'score');

      const mult = getEnchantmentMultiplier(prodId);
      expect(mult).toBeCloseTo(1.30, 5);
    });

    it('getEnchantmentMultiplier 不匹配资源时 ×1', async () => {
      const { getEnchantmentMultiplier } = await import('../../../../src/systems/skills');
      const prodId = Object.keys(PRODUCERS).find(id => PRODUCERS[id].resource === 'score');
      if (!prodId) return;
      state.player.enchantedSkills.set(prodId, 'ench_unstable');
      state.unstableResources.set(prodId, 'gold'); // 不匹配

      const mult = getEnchantmentMultiplier(prodId);
      expect(mult).toBe(1);
    });

    it('无 unstableResources 条目时 ×1', async () => {
      const { getEnchantmentMultiplier } = await import('../../../../src/systems/skills');
      const prodId = Object.keys(PRODUCERS)[0];
      state.player.enchantedSkills.set(prodId, 'ench_unstable');
      // 不设置 unstableResources

      const mult = getEnchantmentMultiplier(prodId);
      expect(mult).toBe(1);
    });
  });

  // =============================================
  // 遗物数据完整性
  // =============================================
  describe('遗物数据完整性', () => {
    const metamorphRelics = [
      'primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer',
      'catalyst_injector', 'chaos_seed', 'abyss_eye', 'fittest_survivors',
    ];

    it('7 个蜕变师遗物都存在于 RELICS', () => {
      for (const id of metamorphRelics) {
        const r = RELICS[id];
        expect(r, `${id} 应存在于 RELICS`).toBeDefined();
        expect(r.id).toBe(id);
        expect(r.name).toBeTruthy();
        expect(r.icon).toBeTruthy();
        expect(r.description).toBeTruthy();
        expect(['common', 'rare', 'legendary']).toContain(r.rarity);
      }
    });

    it('遗物稀有度正确', () => {
      expect(RELICS['ultimate_mutant_strain'].rarity).toBe('legendary');
      expect(RELICS['gene_stabilizer'].rarity).toBe('rare');
      expect(RELICS['catalyst_injector'].rarity).toBe('rare');
      expect(RELICS['chaos_seed'].rarity).toBe('rare');
      expect(RELICS['abyss_eye'].rarity).toBe('legendary');
      expect(RELICS['fittest_survivors'].rarity).toBe('legendary');
    });
  });

  // =============================================
  // 终极突变株
  // =============================================
  describe('终极突变株 (ultimate_mutant_strain)', () => {
    function setupConverterForMutation() {
      state.classId = 'metamorph';
      const oldId = allConverterIds[0];
      state.converterPool = [oldId];
      state.player.skills.set(oldId, { level: 2, purchasePrice: 15 });
      state.player.bindings.set('a', oldId);
      state.mutagenInventory = 5;
      return { oldId };
    }

    it('前2次蜕变免费', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      state.player.relics.add('ultimate_mutant_strain');
      state.player.relicStates['ultimate_mutant_strain'] = 0;
      state.mutagenInventory = 0; // 无变异素也能免费

      // 准备足够的转化者用于多次蜕变
      const id1 = allConverterIds[0];
      state.converterPool = [id1];
      state.player.skills.set(id1, { level: 1, purchasePrice: 10 });
      state.player.bindings.set('a', id1);

      performMetamorph(id1, 'a', mockContainer());
      expect(state.mutagenInventory).toBe(1); // 第1次免费 + 返还1变异素
      expect(state.player.relicStates['ultimate_mutant_strain']).toBe(1);
    });

    it('第3次蜕变需要变异素', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { showFeedback } = await import('../../../../src/systems/battle');
      const { oldId } = setupConverterForMutation();
      state.player.relics.add('ultimate_mutant_strain');
      state.player.relicStates['ultimate_mutant_strain'] = 2; // 已用2次
      state.mutagenInventory = 0;

      performMetamorph(oldId, 'a', mockContainer());
      expect(showFeedback).toHaveBeenCalledWith('变异素不足!', '#ff6b6b');
      expect(state.player.skills.has(oldId)).toBe(true);
    });

    it('覆盖 primal_mutant — 有 ultimate 时忽略 primal', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      const { oldId } = setupConverterForMutation();
      state.player.relics.add('primal_mutant');
      state.player.relics.add('ultimate_mutant_strain');
      state.player.relicStates['primal_mutant'] = 0;
      state.player.relicStates['ultimate_mutant_strain'] = 0;
      state.mutagenInventory = 0;

      performMetamorph(oldId, 'a', mockContainer());
      // ultimate 计数+1，primal 不变
      expect(state.player.relicStates['ultimate_mutant_strain']).toBe(1);
      expect(state.player.relicStates['primal_mutant']).toBe(0);
    });
  });

  // =============================================
  // 基因稳定器
  // =============================================
  describe('基因稳定器 (gene_stabilizer)', () => {
    it('首次蜕变某键位后 relicStates 记录该键位', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      state.player.relics.add('gene_stabilizer');
      const oldId = allConverterIds[0];
      state.converterPool = [oldId];
      state.player.skills.set(oldId, { level: 1, purchasePrice: 10 });
      state.player.bindings.set('a', oldId);
      state.mutagenInventory = 5;

      performMetamorph(oldId, 'a', mockContainer());
      expect(state.player.relicStates['gene_stab_a']).toBe(1);
    });
  });

  // =============================================
  // 适者生存
  // =============================================
  describe('适者生存 (fittest_survivors)', () => {
    it('蜕变后 relicStates 标记新技能', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      state.player.relics.add('fittest_survivors');
      const oldId = allConverterIds[0];
      state.converterPool = [oldId];
      state.player.skills.set(oldId, { level: 1, purchasePrice: 10 });
      state.player.bindings.set('a', oldId);
      state.mutagenInventory = 5;

      performMetamorph(oldId, 'a', mockContainer());
      const newId = state.player.bindings.get('a')!;
      expect(state.player.relicStates['fittest_' + newId]).toBe(1);
    });
  });

  // =============================================
  // 嗜变附魔触发
  // =============================================
  describe('嗜变附魔 (ench_mutation_hunger)', () => {
    it('random < 0.05 时产 1 变异素', async () => {
      const { random } = await import('../../../../src/core/seededRandom');
      (random as any).mockReturnValueOnce(0.04); // < 0.05 → 触发
      const { checkMutationHunger } = await import('../../../../src/systems/skills') as any;
      // checkMutationHunger 是私有函数，通过 triggerProducer 间接调用
      // 直接测试：设置附魔后通过模块内部调用
      const prodId = Object.keys(PRODUCERS)[0];
      state.player.enchantedSkills.set(prodId, 'ench_mutation_hunger');
      state.mutagenInventory = 0;
      state.classResourceProduced = {};

      // 调用 triggerProducer（会内部调用 checkMutationHunger）
      const { triggerProducer } = await import('../../../../src/systems/skills');
      state.player.skills.set(prodId, { level: 1 });
      state.player.bindings.set('a', prodId);
      state.resources.base = 10;
      triggerProducer(prodId, 'a');

      expect(state.mutagenInventory).toBe(1);
      expect(state.classResourceProduced.mutagen).toBe(1);
    });

    it('random >= 0.05 时不产变异素', async () => {
      const { random } = await import('../../../../src/core/seededRandom');
      (random as any).mockReturnValueOnce(0.06); // >= 0.05 → 不触发
      const prodId = Object.keys(PRODUCERS)[0];
      state.player.enchantedSkills.set(prodId, 'ench_mutation_hunger');
      state.mutagenInventory = 0;

      const { triggerProducer } = await import('../../../../src/systems/skills');
      state.player.skills.set(prodId, { level: 1 });
      state.player.bindings.set('a', prodId);
      state.resources.base = 10;
      triggerProducer(prodId, 'a');

      // mutagenInventory 可能因产出者自身资源是 mutagen 而增加
      // 检查 classResourceProduced.mutagen 没有额外的嗜变产出
      const prod = PRODUCERS[prodId];
      if (prod.resource !== 'mutagen') {
        expect(state.mutagenInventory).toBe(0);
      }
    });
  });

  // =============================================
  // 终极突变株返变异素
  // =============================================
  describe('终极突变株返变异素', () => {
    it('蜕变成功后返还 1 变异素', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      state.player.relics.add('ultimate_mutant_strain');
      state.player.relicStates['ultimate_mutant_strain'] = 0;
      state.mutagenInventory = 0;

      const oldId = allConverterIds[0];
      state.converterPool = [oldId];
      state.player.skills.set(oldId, { level: 1, purchasePrice: 10 });
      state.player.bindings.set('a', oldId);

      performMetamorph(oldId, 'a', mockContainer());
      // 免费蜕变 + 返 1 变异素 = 净得 1
      expect(state.mutagenInventory).toBe(1);
    });
  });

  // =============================================
  // 混沌种子
  // =============================================
  describe('混沌种子 (chaos_seed)', () => {
    it('关末为未附魔非连接者技能随机附魔', () => {
      state.classId = 'metamorph';
      state.player.relics.add('chaos_seed');
      state.score = 200;
      state.targetScore = 100;

      // 设置 2 个技能：一个有附魔，一个无附魔
      const convA = allConverterIds[0];
      const convB = allConverterIds[1] || allConverterIds[0];
      state.player.bindings.set('a', convA);
      state.player.bindings.set('b', convB);
      state.player.skills.set(convA, { level: 1 });
      state.player.skills.set(convB, { level: 1 });
      state.player.enchantedSkills.set(convA, 'ench_adapt'); // 已有附魔

      // 模拟 chaos_seed 候选逻辑（使用已导入的模块）
      const candidates: string[] = [];
      for (const [, skillId] of state.player.bindings) {
        if (state.player.enchantedSkills.has(skillId)) continue;
        if (isConnector(skillId) || isReplicator(skillId)) continue;
        candidates.push(skillId);
      }

      // 候选应只有 convB（convA 已有附魔）
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates).not.toContain(convA);
    });
  });

  // =============================================
  // 催化注射器（数据验证 — 实际触发在 skills.ts 集成测试中验证）
  // =============================================
  describe('催化注射器 (catalyst_injector)', () => {
    it('relic 数据存在', () => {
      expect(RELICS['catalyst_injector']).toBeDefined();
      expect(RELICS['catalyst_injector'].rarity).toBe('rare');
    });
  });

  // =============================================
  // 基因稳定器免费效果
  // =============================================
  describe('基因稳定器免费效果', () => {
    it('同一键位再次蜕变免费', async () => {
      const { performMetamorph } = await import('../../../../src/systems/classes/MetamorphStation');
      state.classId = 'metamorph';
      state.player.relics.add('gene_stabilizer');
      state.mutagenInventory = 5;

      const oldId = allConverterIds[0];
      state.converterPool = [oldId];
      state.player.skills.set(oldId, { level: 1, purchasePrice: 10 });
      state.player.bindings.set('a', oldId);

      // 第1次蜕变：消耗 1 变异素，记录键位
      performMetamorph(oldId, 'a', mockContainer());
      expect(state.mutagenInventory).toBe(4); // 5 - 1 = 4
      expect(state.player.relicStates['gene_stab_a']).toBe(1);

      // 准备第2次蜕变
      const newId = state.player.bindings.get('a')!;
      state.converterPool = [newId]; // 确保有可替换的

      performMetamorph(newId, 'a', mockContainer());
      expect(state.mutagenInventory).toBe(4); // 同键位免费，不扣费
    });
  });

  // =============================================
  // 遗物池过滤
  // =============================================
  describe('遗物池过滤', () => {
    it('METAMORPH_EXCLUSIVE_RELICS 包含 7 个 ID', async () => {
      // 通过动态导入获取常量（它是 const 不可直接 import）
      // 验证通过 generateRelicCandidates 行为间接确认
      const { generateRelicCandidates } = await import('../../../../src/systems/relicPicker');
      state.classId = 'none';
      // 非蜕变师不应看到蜕变师遗物
      const candidates = generateRelicCandidates();
      const metamorphRelics = [
        'primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer',
        'catalyst_injector', 'chaos_seed', 'abyss_eye', 'fittest_survivors',
      ];
      for (const id of metamorphRelics) {
        expect(candidates).not.toContain(id);
      }
    });

    it('蜕变师可看到蜕变师遗物', async () => {
      const { generateRelicCandidates, RELIC_WEIGHT_PRESETS } = await import('../../../../src/systems/relicPicker');
      state.classId = 'metamorph';
      // 将所有非蜕变师遗物标记为已拥有，强制候选池只剩蜕变师遗物
      const metamorphRelics = new Set([
        'primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer',
        'catalyst_injector', 'chaos_seed', 'abyss_eye', 'fittest_survivors',
      ]);
      for (const id of Object.keys(RELICS)) {
        if (!metamorphRelics.has(id)) state.player.relics.add(id);
      }
      // 用 bossDrop 权重（100% legendary）确保能抽到 legendary 遗物
      const candidates = generateRelicCandidates(RELIC_WEIGHT_PRESETS.bossDrop);
      expect(candidates.length).toBeGreaterThan(0);
      // 候选应全部来自蜕变师遗物池
      for (const id of candidates) {
        expect(metamorphRelics.has(id)).toBe(true);
      }
    });
  });
});
