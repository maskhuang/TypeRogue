/**
 * Story 36.13: 全流程冒烟测试 (AC5)
 *
 * 端到端验证遗物在完整 run 循环中的生效和生命周期正确性。
 * 模拟：开局→获取遗物→战斗→商店→战斗→结算
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { state, synergy, resetState } from '../../../../src/core/state';
import { clearBehaviorHandlers } from '../../../../src/systems/relics/RelicPipeline';
// Behavior modules — lifecycle functions
import {
  applyBaseShield,
  applySnowball,
  applyLenientJudge,
  getSRankTrophyGold,
  isBlackHoleActive,
  resetScoringRelicBattleState,
  initScoringRelicBehaviors,
} from '../../../../src/systems/relics/ScoringRelicBehaviors';
import {
  checkScoreMagnet,
  getResourceTideBonus,
  incrementWordParity,
  resetResourceRelicBattleState,
  initResourceRelicBehaviors,
} from '../../../../src/systems/relics/ResourceRelicBehaviors';
import {
  calculateComboBuffer,
  hasImmortalCombo,
  resetComboRelicState,
  initComboRelicBehaviors,
} from '../../../../src/systems/relics/ComboRelicBehaviors';
import {
  getFirstStrikeBonus,
  resetSkillRelicState,
  initSkillRelicBehaviors,
} from '../../../../src/systems/relics/SkillRelicBehaviors';
import {
  getWarmUpBonus,
  getEnduranceTimeBonus,
  resetStageRelicBattleState,
  initStageRelicBehaviors,
} from '../../../../src/systems/relics/StageRelicBehaviors';
import {
  getApprenticeGrowthMultiplier,
  resetEnchantmentRelicState,
  initEnchantmentRelicBehaviors,
} from '../../../../src/systems/relics/EnchantmentRelicBehaviors';
import {
  getDiscountMultiplier,
  resetShopRelicState,
  initShopRelicBehaviors,
} from '../../../../src/systems/relics/ShopRelicBehaviors';
import {
  getAdjacentPowerBonus,
  resetTopologyRelicState,
  initTopologyRelicBehaviors,
} from '../../../../src/systems/relics/TopologyRelicBehaviors';
import {
  checkWordCollection,
  resetWordRelicRunState,
  initWordRelicBehaviors,
} from '../../../../src/systems/relics/WordRelicBehaviors';
import {
  getShieldedValue,
  initBossModifierRelicBehaviors,
} from '../../../../src/systems/relics/BossModifierRelicBehaviors';

// === Helper: simulate startLevel ===
function simulateStartLevel() {
  // 重置各行为模块状态（模拟 battle.ts startLevel 中的调用）
  resetScoringRelicBattleState();
  resetResourceRelicBattleState();
  resetComboRelicState();
  resetSkillRelicState();
  resetStageRelicBattleState();
  resetEnchantmentRelicState();
  resetShopRelicState();
  resetTopologyRelicState();
  resetWordRelicRunState();

  // 模拟 targetScore 设置
  state.targetScore = 500;
  state.targetScore = applyLenientJudge(state.targetScore);
  state.score = 0;
  state.combo = 0;
  state.multiplier = 1.0;
  state.time = 30;
}

// === Helper: simulate completeWord ===
function simulateCompleteWord(baseScore: number) {
  // 模拟 completeWord 中的遗物调用链
  const shielded = applyBaseShield(baseScore);
  const snowballed = applySnowball(shielded);
  // 调用其余 pipeline 函数以触发副作用（返回值在此 helper 中不使用）
  checkScoreMagnet();
  getWarmUpBonus();
  getAdjacentPowerBonus('a');
  calculateComboBuffer(state.combo);
  getFirstStrikeBonus();
  getApprenticeGrowthMultiplier();

  incrementWordParity();
  getResourceTideBonus('base');
  checkWordCollection('test');

  // 累加分数
  const finalScore = snowballed;
  if (!isBlackHoleActive()) {
    state.score += finalScore;
  }
  state.combo++;

  return { finalScore };
}

// === Helper: init all behaviors ===
function initAllBehaviors() {
  initScoringRelicBehaviors();
  initResourceRelicBehaviors();
  initComboRelicBehaviors();
  initSkillRelicBehaviors();
  initStageRelicBehaviors();
  initEnchantmentRelicBehaviors();
  initShopRelicBehaviors();
  initTopologyRelicBehaviors();
  initWordRelicBehaviors();
  initBossModifierRelicBehaviors();
}

describe('全流程冒烟测试 (Story 36.13 AC5)', () => {
  beforeEach(() => {
    resetState();
    clearBehaviorHandlers();
  });

  it('完整 run 循环：遗物获取→战斗→商店→战斗→结算', () => {
    // === 开局 ===
    state.level = 1;
    state.gold = 0;

    // === 获取 3 个遗物 ===
    state.player.relics.add('base_shield');      // scoring: 保底 20 分
    state.player.relics.add('score_magnet');      // resource: 每词 +1 分
    state.player.relics.add('warm_up');           // stage: 前 10s +40%

    // === 初始化行为 ===
    initAllBehaviors();

    // === 第一关：战斗 ===
    simulateStartLevel();

    // targetScore 不受 lenient_judge 影响（未持有）
    expect(state.targetScore).toBe(500);

    // completeWord 3 次
    simulateCompleteWord(100);
    expect(state.score).toBeGreaterThanOrEqual(100); // base_shield 保底，但 100 > 20 所以返回 100
    expect(state.combo).toBe(1);

    simulateCompleteWord(100);
    expect(state.combo).toBe(2);

    simulateCompleteWord(100);
    expect(state.combo).toBe(3);
    expect(state.score).toBe(300); // 100 × 3 词（snowball 未持有）

    // === 模拟 endLevel ===
    state.battleStats = {
      rating: 'A',
      accuracy: 0.8,
      speed: 0.5,
      overkill: 0.3,
    } as any;

    // s_rank_trophy 未持有 → 0 金币
    const trophyGold = getSRankTrophyGold('A');
    expect(trophyGold).toBe(0);

    // 模拟基础金币
    const baseGold = 100;
    state.gold += baseGold;
    expect(state.gold).toBe(100);

    // === 商店阶段 ===
    // 折扣卡未持有 → 无折扣
    expect(getDiscountMultiplier()).toBe(1);

    // 获取更多遗物
    state.player.relics.add('snowball');          // scoring: 雪球递增
    state.player.relics.add('lenient_judge');     // scoring: 目标 -10%

    // === 第二关：战斗 ===
    state.level = 2;
    simulateStartLevel();

    // lenient_judge 生效
    expect(state.targetScore).toBe(Math.floor(500 * 0.9)); // 450

    // completeWord — snowball 生效
    const w1 = simulateCompleteWord(100);
    expect(w1.finalScore).toBe(100); // snowball index=0: ×1.0

    const w2 = simulateCompleteWord(100);
    expect(w2.finalScore).toBe(105); // snowball index=1: ×1.05

    const w3 = simulateCompleteWord(100);
    expect(w3.finalScore).toBe(110); // snowball index=2: ×1.10

    // 总分 = 100 + 105 + 110 = 315
    expect(state.score).toBe(315);

    // 胜利检查：315 < 450 — 还需更多词
    expect(state.score < state.targetScore).toBe(true);

    // 再打几词
    simulateCompleteWord(100); // index=3: floor(100*1.15)=114
    simulateCompleteWord(100); // index=4: floor(100*1.20)=120
    // 总分 = 5 个词的 snowball 递增分数之和
    const expected = [0, 1, 2, 3, 4].reduce((sum, i) =>
      sum + Math.floor(100 * (1 + 0.05 * i)), 0);
    expect(state.score).toBe(expected);
    expect(state.score >= state.targetScore).toBe(true); // 通关
  });

  it('遗物 reset 生命周期正确', () => {
    state.player.relics.add('snowball');
    state.player.relics.add('score_magnet');

    initAllBehaviors();

    // 第一关
    simulateStartLevel();
    simulateCompleteWord(100); // snowball index=0
    simulateCompleteWord(100); // snowball index=1
    expect(state.score).toBe(100 + 105); // 205

    // 第二关 — reset
    simulateStartLevel();
    expect(state.score).toBe(0);

    // snowball index 从 0 重新开始
    const w1 = simulateCompleteWord(100);
    expect(w1.finalScore).toBe(100); // index=0: ×1.0
    const w2 = simulateCompleteWord(100);
    expect(w2.finalScore).toBe(105); // index=1: ×1.05

    expect(state.score).toBe(205);
  });

  it('遗物移除后效果消失', () => {
    state.player.relics.add('base_shield');
    state.player.relics.add('lenient_judge');
    state.player.relics.add('snowball');

    initAllBehaviors();
    simulateStartLevel();

    // 验证遗物效果生效
    expect(applyBaseShield(5)).toBe(20);     // 保底 20
    expect(applyLenientJudge(1000)).toBe(900); // 90%

    // 移除遗物
    state.player.relics.delete('base_shield');
    state.player.relics.delete('lenient_judge');
    state.player.relics.delete('snowball');

    // 效果消失
    expect(applyBaseShield(5)).toBe(5);        // 原值
    expect(applyLenientJudge(1000)).toBe(1000); // 原值
  });

  it('多子系统遗物同时生效互不干扰', () => {
    // 同时激活 6 个不同子系统的遗物
    state.player.relics.add('base_shield');      // scoring
    state.player.relics.add('combo_buffer');      // combo
    state.player.relics.add('first_strike');      // skill
    state.player.relics.add('apprentice_robe');   // enchantment
    state.player.relics.add('warm_up');           // stage
    state.player.relics.add('modifier_shield');   // boss_modifier

    initAllBehaviors();
    simulateStartLevel();

    // 各遗物独立返回正确值
    expect(applyBaseShield(5)).toBe(20);
    expect(calculateComboBuffer(10)).toBe(3);     // floor(10 * 0.3) = 3

    synergy.wordSkillCount = 1;
    expect(getFirstStrikeBonus()).toBe(0.2);

    expect(getApprenticeGrowthMultiplier()).toBe(1.3);
    expect(getWarmUpBonus()).toBe(0.40);
    expect(getShieldedValue(100, false)).toBe(100); // shield clamps debuffs, but this is not a debuff
  });
});
