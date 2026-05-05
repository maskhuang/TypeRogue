// ============================================
// 打字肉鸽 - 造词台单元测试
// ============================================
// Story 32.6: Task 8 — 造词逻辑 + 金币计算 + tab 可见性

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state, resetState } from '../../../../src/core/state';

// Mock DOM、音效、战斗反馈
vi.mock('../../../../src/ui/elements', () => ({
  getElements: () => ({
    triggerZone: { appendChild: vi.fn() },
  }),
}));
vi.mock('../../../../src/effects/sound', () => ({
  playSound: vi.fn(),
  emitResourceSound: vi.fn(),
}));
vi.mock('../../../../src/systems/battle', () => ({
  showFeedback: vi.fn(),
  updateHUD: vi.fn(),
  setPseudoInfiniteVisual: vi.fn(),
}));

describe('calculateCraftCost', () => {
  it('无重复字母 → 0g', async () => {
    const { calculateCraftCost } = await import('../../../../src/systems/classes/CraftingStation');
    const result = calculateCraftCost(['e', 'a', 't']);
    expect(result.gold).toBe(0);
    expect(result.fragments).toEqual({ e: 1, a: 1, t: 1 });
  });

  it('单字母重复 2 次 → 5g', async () => {
    const { calculateCraftCost } = await import('../../../../src/systems/classes/CraftingStation');
    const result = calculateCraftCost(['s', 'e', 'e']);
    expect(result.gold).toBe(5);
    expect(result.fragments).toEqual({ s: 1, e: 2 });
  });

  it('单字母重复 3 次 → 5+15=20g', async () => {
    const { calculateCraftCost } = await import('../../../../src/systems/classes/CraftingStation');
    const result = calculateCraftCost(['e', 'e', 'e']);
    expect(result.gold).toBe(20);
    expect(result.fragments).toEqual({ e: 3 });
  });

  it('单字母重复 4 次 → 5+15+30=50g', async () => {
    const { calculateCraftCost } = await import('../../../../src/systems/classes/CraftingStation');
    const result = calculateCraftCost(['e', 'e', 'e', 'e']);
    expect(result.gold).toBe(50);
  });

  it('多字母各重复 → 分别计算', async () => {
    const { calculateCraftCost } = await import('../../../../src/systems/classes/CraftingStation');
    // teeth: e×2=5g, t×2=5g → 10g
    const result = calculateCraftCost(['t', 'e', 'e', 't', 'h']);
    expect(result.gold).toBe(10);
    expect(result.fragments).toEqual({ t: 2, e: 2, h: 1 });
  });

  it('超过 4 次重复使用最大成本 30g', async () => {
    const { calculateCraftCost } = await import('../../../../src/systems/classes/CraftingStation');
    // e×5 → 5+15+30+30=80g
    const result = calculateCraftCost(['e', 'e', 'e', 'e', 'e']);
    expect(result.gold).toBe(80);
  });

  it('大写字母转小写处理', async () => {
    const { calculateCraftCost } = await import('../../../../src/systems/classes/CraftingStation');
    const result = calculateCraftCost(['E', 'A', 'T']);
    expect(result.gold).toBe(0);
    expect(result.fragments).toEqual({ e: 1, a: 1, t: 1 });
  });
});

describe('craftWord', () => {
  const mockGoldUpdate = vi.fn();

  beforeEach(() => {
    resetState();
    mockGoldUpdate.mockClear();
  });

  it('成功造词：碎片扣减 + 金币扣减 + 词进入 wordDeck', async () => {
    const { craftWord } = await import('../../../../src/systems/classes/CraftingStation');
    state.fragmentInventory.e = 5;
    state.fragmentInventory.a = 3;
    state.fragmentInventory.t = 2;
    state.gold = 100;

    const result = craftWord(['e', 'a', 't'], mockGoldUpdate);

    expect(result).toBe(true);
    expect(state.fragmentInventory.e).toBe(4);
    expect(state.fragmentInventory.a).toBe(2);
    expect(state.fragmentInventory.t).toBe(1);
    expect(state.gold).toBe(100); // 无重复，0g
    expect(state.player.wordDeck).toContain('eat');
    expect(state.craftedWords).toContain('eat');
    expect(mockGoldUpdate).toHaveBeenCalled();
  });

  it('造词扣金币（有重复字母）', async () => {
    const { craftWord } = await import('../../../../src/systems/classes/CraftingStation');
    state.fragmentInventory.s = 2;
    state.fragmentInventory.e = 3;
    state.gold = 50;

    const result = craftWord(['s', 'e', 'e'], mockGoldUpdate);

    expect(result).toBe(true);
    expect(state.fragmentInventory.s).toBe(1);
    expect(state.fragmentInventory.e).toBe(1);
    expect(state.gold).toBe(45); // 50 - 5g
    expect(state.player.wordDeck).toContain('see');
    expect(state.craftedWords).toContain('see');
  });

  it('碎片不足 → 拒绝造词，state 无变化', async () => {
    const { craftWord } = await import('../../../../src/systems/classes/CraftingStation');
    state.fragmentInventory.e = 1;
    state.fragmentInventory.a = 0; // 不够
    state.fragmentInventory.t = 1;
    state.gold = 100;

    const result = craftWord(['e', 'a', 't'], mockGoldUpdate);

    expect(result).toBe(false);
    expect(state.fragmentInventory.e).toBe(1); // 未扣
    expect(state.gold).toBe(100);
    expect(state.player.wordDeck).not.toContain('eat');
    expect(state.craftedWords).toHaveLength(0);
  });

  it('金币不足 → 拒绝造词，state 无变化', async () => {
    const { craftWord } = await import('../../../../src/systems/classes/CraftingStation');
    state.fragmentInventory.e = 3;
    state.gold = 2; // e×3 需要 20g

    const result = craftWord(['e', 'e', 'e'], mockGoldUpdate);

    expect(result).toBe(false);
    expect(state.fragmentInventory.e).toBe(3); // 未扣
    expect(state.gold).toBe(2);
    expect(state.craftedWords).toHaveLength(0);
  });

  it('空字母列表 → 返回 false', async () => {
    const { craftWord } = await import('../../../../src/systems/classes/CraftingStation');
    const result = craftWord([], mockGoldUpdate);
    expect(result).toBe(false);
  });

  it('单字母词（长度 < 2）→ 拒绝造词', async () => {
    const { craftWord } = await import('../../../../src/systems/classes/CraftingStation');
    state.fragmentInventory.a = 5;
    state.gold = 100;

    const result = craftWord(['a'], mockGoldUpdate);

    expect(result).toBe(false);
    expect(state.fragmentInventory.a).toBe(5); // 未扣
    expect(state.craftedWords).toHaveLength(0);
  });

  it('造多个词累积到 craftedWords', async () => {
    const { craftWord } = await import('../../../../src/systems/classes/CraftingStation');
    state.fragmentInventory.a = 5;
    state.fragmentInventory.t = 5;
    state.fragmentInventory.e = 5;
    state.gold = 100;

    craftWord(['a', 't'], mockGoldUpdate);
    craftWord(['e', 'a', 't'], mockGoldUpdate);

    expect(state.craftedWords).toEqual(['at', 'eat']);
    expect(state.player.wordDeck).toContain('at');
    expect(state.player.wordDeck).toContain('eat');
  });
});

describe('造词台 tab 可见性', () => {
  it('造词师：isFeatureEnabled("pack-system") === false', async () => {
    const { isFeatureEnabled } = await import('../../../../src/systems/classes/ClassFeatureGate');
    state.classId = 'wordsmith';
    expect(isFeatureEnabled('pack-system')).toBe(false);
  });

  it('非造词师：isFeatureEnabled("pack-system") === true', async () => {
    const { isFeatureEnabled } = await import('../../../../src/systems/classes/ClassFeatureGate');
    state.classId = 'none';
    expect(isFeatureEnabled('pack-system')).toBe(true);
  });

  it('蜕变师：isFeatureEnabled("pack-system") === true', async () => {
    const { isFeatureEnabled } = await import('../../../../src/systems/classes/ClassFeatureGate');
    state.classId = 'metamorph';
    expect(isFeatureEnabled('pack-system')).toBe(true);
  });
});
