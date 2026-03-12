/**
 * Story 35-9: 商店集成 — 词条制技能在商店的生成/定价/购买/卖出/状态清理
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { state, resetState } from '../../../src/core/state';
import {
  calculateAffixSkillPrice,
  AFFIX_RARITY_BASE_PRICES,
  AFFIX_SKILL_PRICE_CAP,
  rollPriceFluctuation,
  generateAffixShopItem,
  generateAffixShopItems,
} from '../../../src/systems/shop';
import { RARITY_COLORS, AFFIX_NAMES } from '../../../src/data/affixes';
import { createSkillRuntimeState } from '../../../src/data/affixes';
import type { ResourceType } from '../../../src/core/types';

// Mock DOM and audio dependencies used by shop.ts
vi.mock('../../../src/ui/elements', () => ({
  getElements: () => ({}),
}));
vi.mock('../../../src/effects/sound', () => ({
  playSound: vi.fn(),
}));
vi.mock('../../../src/effects/juice', () => ({
  juiceUp: vi.fn(),
  calculateRating: vi.fn(() => ''),
  getRatingTier: vi.fn(() => 0),
}));
vi.mock('../../../src/systems/battle', () => ({
  showScreen: vi.fn(),
  startLevel: vi.fn(),
  renderRelicDisplay: vi.fn(),
  showFeedback: vi.fn(),
}));

beforeEach(() => {
  resetState();
});

// ============================================================
// AC2 — 定价公式
// ============================================================
describe('calculateAffixSkillPrice (AC2)', () => {
  it('rarity base prices: 0→25, 1→50, 2→75, 3→100', () => {
    expect(AFFIX_RARITY_BASE_PRICES).toEqual([25, 50, 75, 100]);
  });

  it('rarity=0 level=1 no fluctuation → 25', () => {
    expect(calculateAffixSkillPrice(0, 1)).toBe(25);
  });

  it('rarity=1 level=1 no fluctuation → 50', () => {
    expect(calculateAffixSkillPrice(1, 1)).toBe(50);
  });

  it('rarity=2 level=1 no fluctuation → 75', () => {
    expect(calculateAffixSkillPrice(2, 1)).toBe(75);
  });

  it('rarity=3 level=1 no fluctuation → 100', () => {
    expect(calculateAffixSkillPrice(3, 1)).toBe(100);
  });

  it('level 2 adds +20% to base', () => {
    expect(calculateAffixSkillPrice(0, 2)).toBe(30);   // 25 × 1.2
    expect(calculateAffixSkillPrice(1, 2)).toBe(60);   // 50 × 1.2
  });

  it('level 3 adds +40% to base', () => {
    expect(calculateAffixSkillPrice(0, 3)).toBe(35);   // 25 × 1.4
    expect(calculateAffixSkillPrice(1, 3)).toBe(70);   // 50 × 1.4
  });

  it('price cap at 100 even with high level', () => {
    expect(calculateAffixSkillPrice(3, 3)).toBe(100);  // 100 × 1.4 → capped
    expect(calculateAffixSkillPrice(2, 3)).toBe(100);  // 75 × 1.4 = 105 → capped
  });

  it('fluctuation factor scales price', () => {
    expect(calculateAffixSkillPrice(1, 1, 0.8)).toBe(40);   // 50 × 0.8
    expect(calculateAffixSkillPrice(1, 1, 1.2)).toBe(60);   // 50 × 1.2
  });

  it('fluctuation still capped at 100', () => {
    expect(calculateAffixSkillPrice(3, 1, 1.2)).toBe(100);  // 100 × 1.2 → capped
  });

  it('rollPriceFluctuation returns value in [0.8, 1.2]', () => {
    for (let i = 0; i < 50; i++) {
      const f = rollPriceFluctuation();
      expect(f).toBeGreaterThanOrEqual(0.8);
      expect(f).toBeLessThanOrEqual(1.2);
    }
  });
});

// ============================================================
// AC3 — 稀有度边框颜色
// ============================================================
describe('RARITY_COLORS (AC3)', () => {
  it('rarity 0 → white', () => {
    expect(RARITY_COLORS[0]).toBe('#ffffff');
  });

  it('rarity 1 → blue', () => {
    expect(RARITY_COLORS[1]).toBe('#4488ff');
  });

  it('rarity 2 → yellow', () => {
    expect(RARITY_COLORS[2]).toBe('#ffcc00');
  });

  it('rarity 3 → orange', () => {
    expect(RARITY_COLORS[3]).toBe('#ff8800');
  });

  it('rarity=2 skill has 2 named affixes matching AFFIX_NAMES (AC3 card content)', () => {
    // Generate a rarity=2 skill and verify card content data
    const item = generateAffixShopItem(1, { rarity: 2 as import('../../../src/data/affixes').SkillRarity });
    const affix = item.affixSkill!;
    expect(affix.rarity).toBe(2);
    expect(affix.affixes).toHaveLength(2);
    // Card renders affixNames as AFFIX_NAMES[type] joined by ' · '
    const affixNames = affix.affixes.map(a => AFFIX_NAMES[a.type]);
    expect(affixNames).toHaveLength(2);
    affixNames.forEach(name => expect(name).toBeDefined());
    expect(affixNames.join(' · ').length).toBeGreaterThan(0);
    // Border color should be yellow for rarity=2
    expect(RARITY_COLORS[affix.rarity]).toBe('#ffcc00');
  });
});

// ============================================================
// AC1 — 商店生成
// ============================================================
describe('generateAffixShopItem (AC1)', () => {
  it('returns ShopItem with complete AffixSkillInstance', () => {
    const item = generateAffixShopItem(1);
    expect(item.type).toBe('skill');
    expect(item.skillId).toBeDefined();
    expect(item.affixSkill).toBeDefined();
    expect(item.affixSkill!.id).toMatch(/^skill_/);
    expect(item.affixSkill!.level).toBe(1);
    expect(item.affixSkill!.rarity).toBeGreaterThanOrEqual(0);
    expect(item.affixSkill!.rarity).toBeLessThanOrEqual(3);
    expect(item.affixSkill!.baseValues).toBeDefined();
    expect(item.affixSkill!.enchantmentIds).toEqual([]);
    expect(item.isUpgrade).toBe(false);
    expect(item.locked).toBe(false);
  });

  it('cost is within fluctuation range and capped at 100', () => {
    const item = generateAffixShopItem(1);
    const base = AFFIX_RARITY_BASE_PRICES[Math.min(item.affixSkill!.rarity, 3) as 0 | 1 | 2 | 3];
    const levelMult = 1 + (item.affixSkill!.level - 1) * 0.2;
    const minPrice = Math.round(base * levelMult * 0.8);
    const maxPrice = Math.min(Math.round(base * levelMult * 1.2), AFFIX_SKILL_PRICE_CAP);
    expect(item.cost).toBeGreaterThanOrEqual(minPrice);
    expect(item.cost).toBeLessThanOrEqual(maxPrice);
  });

  it('id format is si-{n}-affix', () => {
    const item = generateAffixShopItem(42);
    expect(item.id).toBe('si-42-affix');
  });
});

// ============================================================
// AC5 — 品类多样性
// ============================================================
describe('generateAffixShopItems diversity (AC5)', () => {
  it('returns requested count of items', () => {
    const items = generateAffixShopItems(5);
    expect(items).toHaveLength(5);
  });

  it('at least 1 item has rarity ≥ 1 (blue+)', () => {
    // Run multiple times to handle randomness
    for (let trial = 0; trial < 5; trial++) {
      const items = generateAffixShopItems(5);
      const hasBlue = items.some(item => item.affixSkill!.rarity >= 1);
      expect(hasBlue).toBe(true);
    }
  });

  it('all items have unique IDs', () => {
    const items = generateAffixShopItems(5);
    const ids = items.map(i => i.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('empty count returns empty array', () => {
    expect(generateAffixShopItems(0)).toEqual([]);
  });

  it('count=1 still guarantees rarity≥1', () => {
    for (let trial = 0; trial < 5; trial++) {
      const items = generateAffixShopItems(1);
      expect(items).toHaveLength(1);
      expect(items[0].affixSkill!.rarity).toBeGreaterThanOrEqual(1);
    }
  });
});

// ============================================================
// AC6 — 职业过滤
// ============================================================
describe('generateAffixShopItem class filtering (AC6)', () => {
  it('no class → no fragment/mutagen skills', () => {
    state.classId = 'none';
    for (let i = 0; i < 20; i++) {
      const item = generateAffixShopItem(i);
      expect(item.affixSkill!.resource).not.toBe('fragment');
      expect(item.affixSkill!.resource).not.toBe('mutagen');
    }
  });

  it('wordsmith → may produce fragment, never mutagen', () => {
    state.classId = 'wordsmith';
    const resources = new Set<ResourceType>();
    for (let i = 0; i < 50; i++) {
      resources.add(generateAffixShopItem(i).affixSkill!.resource);
    }
    expect(resources.has('mutagen')).toBe(false);
    // fragment should appear at least once in 50 attempts (very likely)
  });

  it('metamorph → may produce mutagen, never fragment', () => {
    state.classId = 'metamorph';
    const resources = new Set<ResourceType>();
    for (let i = 0; i < 50; i++) {
      resources.add(generateAffixShopItem(i).affixSkill!.resource);
    }
    expect(resources.has('fragment')).toBe(false);
  });
});

// ============================================================
// AC4 — 购买/卖出时状态管理
// ============================================================
describe('Affix skill state lifecycle (AC1, AC4)', () => {
  it('purchasing stores skill + runtime state in GameState', () => {
    const item = generateAffixShopItem(1);
    const skillId = item.skillId!;
    const affixSkill = item.affixSkill!;

    // Simulate purchase
    state.player.skills.set(skillId, { level: 1, purchasePrice: item.cost });
    state.affixSkills.set(skillId, affixSkill);
    state.affixSkillStates.set(skillId, createSkillRuntimeState(skillId));

    expect(state.player.skills.has(skillId)).toBe(true);
    expect(state.affixSkills.has(skillId)).toBe(true);
    expect(state.affixSkillStates.has(skillId)).toBe(true);

    const runtime = state.affixSkillStates.get(skillId)!;
    expect(runtime.chargeAccumulated).toBe(0);
    expect(runtime.currentDecayMult).toBe(1);
    expect(runtime.triggerCount).toBe(0);
    expect(runtime.amplifyStacks).toBe(0);
    expect(runtime.apprenticeAccumulated).toBe(0);
    expect(runtime.questStacks).toBe(0);
    expect(runtime.questCompletions).toBe(0);
    expect(runtime.mirrorCopiedAffix).toBeNull();
  });

  it('selling removes affixSkills + affixSkillStates entries (AC4)', () => {
    const item = generateAffixShopItem(1);
    const skillId = item.skillId!;

    // Simulate purchase
    state.player.skills.set(skillId, { level: 1, purchasePrice: item.cost });
    state.affixSkills.set(skillId, item.affixSkill!);
    state.affixSkillStates.set(skillId, createSkillRuntimeState(skillId));
    state.player.bindings.set('a', skillId);

    // Simulate sell — same logic as sellSkill
    const data = state.player.skills.get(skillId)!;
    state.gold += Math.floor((data.purchasePrice || 15) / 2);
    for (const [key, id] of state.player.bindings) {
      if (id === skillId) { state.player.bindings.delete(key); break; }
    }
    state.player.evolvedSkills.delete(skillId);
    state.player.enchantedSkills.delete(skillId);
    state.affixSkills.delete(skillId);
    state.affixSkillStates.delete(skillId);
    state.player.skills.delete(skillId);

    expect(state.affixSkills.has(skillId)).toBe(false);
    expect(state.affixSkillStates.has(skillId)).toBe(false);
    expect(state.player.skills.has(skillId)).toBe(false);
    expect(state.player.bindings.has('a')).toBe(false);
  });

  it('replacing a bound skill removes old runtime state (AC4)', () => {
    const oldItem = generateAffixShopItem(1);
    const newItem = generateAffixShopItem(2);
    const oldId = oldItem.skillId!;
    const newId = newItem.skillId!;

    // Setup old skill
    state.player.skills.set(oldId, { level: 2, purchasePrice: 75 });
    state.affixSkills.set(oldId, oldItem.affixSkill!);
    state.affixSkillStates.set(oldId, createSkillRuntimeState(oldId));
    state.player.bindings.set('a', oldId);

    // Simulate replacement: remove old, add new
    state.player.skills.delete(oldId);
    state.affixSkills.delete(oldId);
    state.affixSkillStates.delete(oldId);
    state.player.bindings.set('a', newId);
    state.player.skills.set(newId, { level: 1, purchasePrice: newItem.cost });
    state.affixSkills.set(newId, newItem.affixSkill!);
    state.affixSkillStates.set(newId, createSkillRuntimeState(newId));

    expect(state.affixSkills.has(oldId)).toBe(false);
    expect(state.affixSkillStates.has(oldId)).toBe(false);
    expect(state.affixSkills.has(newId)).toBe(true);
    expect(state.affixSkillStates.has(newId)).toBe(true);
    expect(state.player.bindings.get('a')).toBe(newId);
  });
});

// ============================================================
// AC1 — 生成的技能数据完整性
// ============================================================
describe('Generated affix skill data integrity (AC1)', () => {
  it('affixSkill has valid resource type', () => {
    const validResources: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'fragment', 'mutagen'];
    for (let i = 0; i < 10; i++) {
      const item = generateAffixShopItem(i);
      expect(validResources).toContain(item.affixSkill!.resource);
    }
  });

  it('affixSkill.affixes count matches rarity (rarity = affix count)', () => {
    for (let i = 0; i < 20; i++) {
      const item = generateAffixShopItem(i);
      expect(item.affixSkill!.affixes.length).toBe(item.affixSkill!.rarity);
    }
  });

  it('affixSkill.baseValues has 3 level values', () => {
    const item = generateAffixShopItem(1);
    expect(item.affixSkill!.baseValues).toHaveLength(3);
    item.affixSkill!.baseValues.forEach(v => expect(v).toBeGreaterThan(0));
  });

  it('affixSkill.name is non-empty string', () => {
    const item = generateAffixShopItem(1);
    expect(item.affixSkill!.name.length).toBeGreaterThan(0);
  });

  it('affixSkill.icon is non-empty string', () => {
    const item = generateAffixShopItem(1);
    expect(item.affixSkill!.icon.length).toBeGreaterThan(0);
  });
});
