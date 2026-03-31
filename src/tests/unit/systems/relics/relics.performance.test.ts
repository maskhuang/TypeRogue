/**
 * Story 36.13: 遗物 Pipeline 性能测试 (AC2)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { state, resetState } from '../../../../src/core/state';
import { clearBehaviorHandlers } from '../../../../src/systems/relics/RelicPipeline';
import { RELICS } from '../../../../src/data/relics';

// 11 个行为模块的关键 pipeline 函数
import { applyBaseShield, applySnowball, resetScoringRelicBattleState } from '../../../../src/systems/relics/ScoringRelicBehaviors';
import { rollProductionDividend, getResourceTideBonus, resetResourceRelicBattleState } from '../../../../src/systems/relics/ResourceRelicBehaviors';
import { getAdjacentPowerBonus, resetTopologyRelicState } from '../../../../src/systems/relics/TopologyRelicBehaviors';
import { calculateComboBuffer, getMultiplierPrismBonus, resetComboRelicState } from '../../../../src/systems/relics/ComboRelicBehaviors';
import { getFirstStrikeBonus, resetSkillRelicState } from '../../../../src/systems/relics/SkillRelicBehaviors';
import { getDiscountMultiplier, resetShopRelicState } from '../../../../src/systems/relics/ShopRelicBehaviors';
import { getWarmUpBonus, resetStageRelicBattleState } from '../../../../src/systems/relics/StageRelicBehaviors';
import { getShieldedValue } from '../../../../src/systems/relics/BossModifierRelicBehaviors';
import { getApprenticeGrowthMultiplier, resetEnchantmentRelicState } from '../../../../src/systems/relics/EnchantmentRelicBehaviors';
import { checkWordCollection, resetWordRelicRunState } from '../../../../src/systems/relics/WordRelicBehaviors';

describe('遗物 Pipeline 性能测试 (Story 36.13 AC2)', () => {
  beforeEach(() => {
    resetState();
    clearBehaviorHandlers();
  });

  it('12 个遗物同时激活时 pipeline 耗时 <2ms（100 次中位数）', () => {
    // 激活 12 个不同子系统的遗物
    const relicsToActivate = [
      'base_shield',       // scoring
      'snowball',          // scoring (2nd)
      'production_dividend',      // resource
      'adjacent_power',    // topology
      'combo_buffer',      // combo
      'multiplier_prism',  // combo (2nd)
      'first_strike',      // skill
      'discount_card',     // shop
      'warm_up',           // stage
      'modifier_shield',   // boss_modifier
      'apprentice_robe',   // enchantment (apprentice_growth → relic id is apprentice_robe)
      'word_collection',   // word
    ];

    for (const id of relicsToActivate) {
      state.player.relics.add(id);
    }

    // 初始化模块级状态
    resetScoringRelicBattleState();
    resetResourceRelicBattleState();
    resetComboRelicState();
    resetSkillRelicState();
    resetShopRelicState();
    resetStageRelicBattleState();
    resetEnchantmentRelicState();
    resetWordRelicRunState();
    resetTopologyRelicState();

    // 设置 multiplier for prism
    state.multiplier = 3.0;

    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();

      // 模拟 completeWord 中遗物相关函数调用链
      applyBaseShield(50);
      applySnowball(50);
      rollProductionDividend();
      getAdjacentPowerBonus('a');
      calculateComboBuffer(10);
      getMultiplierPrismBonus();
      getFirstStrikeBonus();
      getDiscountMultiplier();
      getWarmUpBonus();
      getShieldedValue(100, false);
      getApprenticeGrowthMultiplier();
      checkWordCollection('hello');
      getResourceTideBonus('base');

      const end = performance.now();
      times.push(end - start);
    }

    // 排序取中位数
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];

    expect(median).toBeLessThan(2);
  });

  it('全部 55 通用遗物同时激活时 pipeline 耗时 <5ms', () => {
    // 激活所有通用遗物
    const allRelicIds = Object.keys(RELICS);
    const universalRelics = allRelicIds.filter(id => {
      const relic = RELICS[id];
      return relic.subsystem !== undefined; // 通用遗物有 subsystem
    });

    for (const id of universalRelics) {
      state.player.relics.add(id);
    }

    // 初始化模块级状态
    resetScoringRelicBattleState();
    resetResourceRelicBattleState();
    resetComboRelicState();
    resetSkillRelicState();
    resetShopRelicState();
    resetStageRelicBattleState();
    resetEnchantmentRelicState();
    resetWordRelicRunState();
    resetTopologyRelicState();

    state.multiplier = 3.0;

    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();

      // 同样的 pipeline 调用链
      applyBaseShield(50);
      applySnowball(50);
      rollProductionDividend();
      getAdjacentPowerBonus('a');
      calculateComboBuffer(10);
      getMultiplierPrismBonus();
      getFirstStrikeBonus();
      getDiscountMultiplier();
      getWarmUpBonus();
      getShieldedValue(100, false);
      getApprenticeGrowthMultiplier();
      checkWordCollection('hello');
      getResourceTideBonus('base');

      const end = performance.now();
      times.push(end - start);
    }

    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];

    expect(median).toBeLessThan(5);
  });
});
