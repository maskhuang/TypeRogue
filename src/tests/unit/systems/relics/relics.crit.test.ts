/**
 * §12: 暴击系统遗物单元测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { state, resetState } from '../../../../src/core/state';
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline';
import {
  LUCKY_STRIKE_RATE,
  CRIT_BONUS_GOLD,
  CRIT_CHARGE_THRESHOLD,
  CRIT_STORM_MIN_CRITS,
  CRIT_STORM_BONUS,
  FATE_COIN_MULTIPLIER,
  getLuckyStrikeCritRate,
  getCritBonusGold,
  isCritChargeReady,
  consumeCritCharge,
  advanceCritCharge,
  recordWordCrit,
  getWordCritCount,
  getCritStormBonus,
  isFateCoinActive,
  resetCritRelicWordState,
  resetCritRelicBattleState,
  initCritRelicBehaviors,
} from '../../../../src/systems/relics/CritRelicBehaviors';

describe('暴击系统遗物 (§12)', () => {
  beforeEach(() => {
    resetState();
    clearBehaviorHandlers();
    resetCritRelicBattleState();
  });

  // === 常量值测试 ===
  describe('常量', () => {
    it('LUCKY_STRIKE_RATE = 0.08', () => {
      expect(LUCKY_STRIKE_RATE).toBe(0.08);
    });

    it('CRIT_BONUS_GOLD = 3', () => {
      expect(CRIT_BONUS_GOLD).toBe(3);
    });

    it('CRIT_CHARGE_THRESHOLD = 5', () => {
      expect(CRIT_CHARGE_THRESHOLD).toBe(5);
    });

    it('CRIT_STORM_MIN_CRITS = 2', () => {
      expect(CRIT_STORM_MIN_CRITS).toBe(2);
    });

    it('CRIT_STORM_BONUS = 0.50', () => {
      expect(CRIT_STORM_BONUS).toBe(0.50);
    });

    it('FATE_COIN_MULTIPLIER = 3', () => {
      expect(FATE_COIN_MULTIPLIER).toBe(3);
    });
  });

  // === 幸运一击 (lucky_strike) ===
  describe('幸运一击 (lucky_strike)', () => {
    it('无遗物 → 0', () => {
      expect(getLuckyStrikeCritRate()).toBe(0);
    });

    it('有遗物 → 0.08', () => {
      state.player.relics.add('lucky_strike');
      expect(getLuckyStrikeCritRate()).toBe(0.08);
    });
  });

  // === 暴击奖金 (crit_bonus) ===
  describe('暴击奖金 (crit_bonus)', () => {
    it('无遗物 → 0', () => {
      expect(getCritBonusGold()).toBe(0);
    });

    it('有遗物 → 3', () => {
      state.player.relics.add('crit_bonus');
      expect(getCritBonusGold()).toBe(3);
    });
  });

  // === 暴击蓄力 (crit_charge) ===
  describe('暴击蓄力 (crit_charge)', () => {
    it('无遗物 → isCritChargeReady 始终 false', () => {
      for (let i = 0; i < 10; i++) advanceCritCharge(false);
      expect(isCritChargeReady()).toBe(false);
    });

    it('有遗物 + 4次非暴击 → 未就绪', () => {
      state.player.relics.add('crit_charge');
      for (let i = 0; i < 4; i++) advanceCritCharge(false);
      expect(isCritChargeReady()).toBe(false);
    });

    it('有遗物 + 5次非暴击 → 就绪', () => {
      state.player.relics.add('crit_charge');
      for (let i = 0; i < 5; i++) advanceCritCharge(false);
      expect(isCritChargeReady()).toBe(true);
    });

    it('consumeCritCharge 重置状态', () => {
      state.player.relics.add('crit_charge');
      for (let i = 0; i < 5; i++) advanceCritCharge(false);
      expect(isCritChargeReady()).toBe(true);
      consumeCritCharge();
      expect(isCritChargeReady()).toBe(false);
    });

    it('暴击不推进计数', () => {
      state.player.relics.add('crit_charge');
      for (let i = 0; i < 3; i++) advanceCritCharge(false);
      advanceCritCharge(true); // 暴击，不应推进
      advanceCritCharge(false); // 第4次非暴击
      expect(isCritChargeReady()).toBe(false);
      advanceCritCharge(false); // 第5次非暴击 → 就绪
      expect(isCritChargeReady()).toBe(true);
    });
  });

  // === 暴击风暴 (crit_storm) ===
  describe('暴击风暴 (crit_storm)', () => {
    it('无遗物 → bonus 0', () => {
      recordWordCrit();
      recordWordCrit();
      expect(getCritStormBonus()).toBe(0);
    });

    it('有遗物 + 1次暴击 → bonus 0', () => {
      state.player.relics.add('crit_storm');
      recordWordCrit();
      expect(getCritStormBonus()).toBe(0);
    });

    it('有遗物 + 2次暴击 → bonus 0.50', () => {
      state.player.relics.add('crit_storm');
      recordWordCrit();
      recordWordCrit();
      expect(getCritStormBonus()).toBe(0.50);
    });

    it('resetCritRelicWordState 重置 wordCritCount', () => {
      recordWordCrit();
      recordWordCrit();
      expect(getWordCritCount()).toBe(2);
      resetCritRelicWordState();
      expect(getWordCritCount()).toBe(0);
    });
  });

  // === 命运硬币 (fate_coin) ===
  describe('命运硬币 (fate_coin)', () => {
    it('无遗物 → false', () => {
      expect(isFateCoinActive()).toBe(false);
    });

    it('有遗物 → true', () => {
      state.player.relics.add('fate_coin');
      expect(isFateCoinActive()).toBe(true);
    });
  });

  // === 生命周期 ===
  describe('生命周期', () => {
    it('resetCritRelicBattleState 重置所有状态', () => {
      state.player.relics.add('crit_charge');
      // 推进蓄力到就绪
      for (let i = 0; i < 5; i++) advanceCritCharge(false);
      expect(isCritChargeReady()).toBe(true);
      // 记录暴击
      recordWordCrit();
      recordWordCrit();
      expect(getWordCritCount()).toBe(2);
      // 重置
      resetCritRelicBattleState();
      expect(isCritChargeReady()).toBe(false);
      expect(getWordCritCount()).toBe(0);
    });

    it('initCritRelicBehaviors 注册 2 个行为', () => {
      initCritRelicBehaviors();
      const behaviors = getRegisteredBehaviors();
      expect(behaviors).toContain('crit_storm');
      expect(behaviors).toContain('fate_coin');
    });
  });
});
