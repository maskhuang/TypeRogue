/**
 * Story 36.12: 结算/评分系统遗物单元测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { state, resetState } from '../../../../src/core/state';
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline';
import {
  BASE_SHIELD_MIN,
  LENIENT_REDUCE,
  S_RANK_GOLD,
  SNOWBALL_INCREMENT,
  applyBaseShield,
  applyLenientJudge,
  getSRankTrophyGold,
  applySnowball,
  isBlackHoleActive,
  accumulateBlackHole,
  settleBlackHole,
  hasBlackHoleSettled,
  getBlackHolePool,
  resetScoringRelicBattleState,
  initScoringRelicBehaviors,
} from '../../../../src/systems/relics/ScoringRelicBehaviors';

describe('结算/评分系统遗物 (Story 36.12)', () => {
  beforeEach(() => {
    resetState();
    clearBehaviorHandlers();
    resetScoringRelicBattleState();
  });

  // === 常量值测试 ===
  describe('常量', () => {
    it('BASE_SHIELD_MIN = 20', () => {
      expect(BASE_SHIELD_MIN).toBe(20);
    });

    it('LENIENT_REDUCE = 0.10', () => {
      expect(LENIENT_REDUCE).toBe(0.10);
    });

    it('S_RANK_GOLD 正确映射', () => {
      expect(S_RANK_GOLD).toEqual({ S: 25, SS: 50, SSS: 100 });
    });

    it('SNOWBALL_INCREMENT = 0.05', () => {
      expect(SNOWBALL_INCREMENT).toBe(0.05);
    });
  });

  // === 基数护盾 (base_shield) ===
  describe('基数护盾 (base_shield)', () => {
    it('无遗物 → 返回原值', () => {
      expect(applyBaseShield(10)).toBe(10);
      expect(applyBaseShield(0)).toBe(0);
    });

    it('有遗物 + score < 20 → 返回 20', () => {
      state.player.relics.add('base_shield');
      expect(applyBaseShield(0)).toBe(20);
      expect(applyBaseShield(10)).toBe(20);
      expect(applyBaseShield(19)).toBe(20);
    });

    it('有遗物 + 负分 → 返回 20（boss diminish 边缘情况）', () => {
      state.player.relics.add('base_shield');
      expect(applyBaseShield(-5)).toBe(20);
      expect(applyBaseShield(-100)).toBe(20);
    });

    it('有遗物 + score >= 20 → 返回原值', () => {
      state.player.relics.add('base_shield');
      expect(applyBaseShield(20)).toBe(20);
      expect(applyBaseShield(50)).toBe(50);
      expect(applyBaseShield(100)).toBe(100);
    });
  });

  // === 宽容评审 (lenient_judge) ===
  describe('宽容评审 (lenient_judge)', () => {
    it('无遗物 → 返回原值', () => {
      expect(applyLenientJudge(1000)).toBe(1000);
    });

    it('有遗物 → floor(target * 0.9)', () => {
      state.player.relics.add('lenient_judge');
      expect(applyLenientJudge(1000)).toBe(900);
      expect(applyLenientJudge(999)).toBe(Math.floor(999 * 0.9));
      expect(applyLenientJudge(500)).toBe(450);
    });
  });

  // === S 级奖杯 (s_rank_trophy) ===
  describe('S 级奖杯 (s_rank_trophy)', () => {
    it('无遗物 → 0', () => {
      expect(getSRankTrophyGold('SSS')).toBe(0);
      expect(getSRankTrophyGold('S')).toBe(0);
    });

    it('有遗物 + S → 25', () => {
      state.player.relics.add('s_rank_trophy');
      expect(getSRankTrophyGold('S')).toBe(25);
    });

    it('有遗物 + SS → 50', () => {
      state.player.relics.add('s_rank_trophy');
      expect(getSRankTrophyGold('SS')).toBe(50);
    });

    it('有遗物 + SSS → 100', () => {
      state.player.relics.add('s_rank_trophy');
      expect(getSRankTrophyGold('SSS')).toBe(100);
    });

    it('有遗物 + A/B/C → 0', () => {
      state.player.relics.add('s_rank_trophy');
      expect(getSRankTrophyGold('A')).toBe(0);
      expect(getSRankTrophyGold('B')).toBe(0);
      expect(getSRankTrophyGold('C')).toBe(0);
    });
  });

  // === 雪球效应 (snowball) ===
  describe('雪球效应 (snowball)', () => {
    beforeEach(() => {
      resetScoringRelicBattleState();
    });

    it('无遗物 → 返回原值（但 wordIndex 仍递增）', () => {
      const score1 = applySnowball(100);
      const score2 = applySnowball(100);
      expect(score1).toBe(100);
      expect(score2).toBe(100);
      // 验证 index 已推进到 2：添加遗物后第 3 词应得到 index=2 的倍率
      state.player.relics.add('snowball');
      expect(applySnowball(100)).toBe(110); // floor(100 * (1 + 0.05*2)) = 110
    });

    it('有遗物 → 第1词 ×1.0（index=0）', () => {
      state.player.relics.add('snowball');
      expect(applySnowball(100)).toBe(100); // floor(100 * (1 + 0.05*0)) = 100
    });

    it('有遗物 → 第2词 ×1.05（index=1）', () => {
      state.player.relics.add('snowball');
      applySnowball(100); // consume index 0
      expect(applySnowball(100)).toBe(105); // floor(100 * 1.05) = 105
    });

    it('有遗物 → 第5词 ×1.20（index=4）', () => {
      state.player.relics.add('snowball');
      for (let i = 0; i < 4; i++) applySnowball(100); // consume index 0-3
      expect(applySnowball(100)).toBe(120); // floor(100 * 1.20) = 120
    });

    it('有遗物 → 递增正确应用非整数结果', () => {
      state.player.relics.add('snowball');
      applySnowball(100); // index 0
      applySnowball(100); // index 1
      applySnowball(100); // index 2
      // index 3: floor(77 * (1 + 0.05*3)) = floor(77 * 1.15) = floor(88.55) = 88
      expect(applySnowball(77)).toBe(88);
    });
  });

  // === 分数黑洞 (score_black_hole) ===
  describe('分数黑洞 (score_black_hole)', () => {
    beforeEach(() => {
      resetScoringRelicBattleState();
    });

    it('无遗物 → isBlackHoleActive 为 false', () => {
      expect(isBlackHoleActive()).toBe(false);
    });

    it('有遗物 → reset 后 isBlackHoleActive 为 true', () => {
      state.player.relics.add('score_black_hole');
      resetScoringRelicBattleState();
      expect(isBlackHoleActive()).toBe(true);
    });

    it('accumulate 正确累加', () => {
      state.player.relics.add('score_black_hole');
      resetScoringRelicBattleState();
      accumulateBlackHole(100);
      accumulateBlackHole(200);
      accumulateBlackHole(50);
      expect(getBlackHolePool()).toBe(350);
    });

    it('settleBlackHole 返回池总额并标记已结算', () => {
      state.player.relics.add('score_black_hole');
      resetScoringRelicBattleState();
      accumulateBlackHole(100);
      accumulateBlackHole(200);
      expect(hasBlackHoleSettled()).toBe(false);
      const pool = settleBlackHole();
      expect(pool).toBe(300);
      expect(hasBlackHoleSettled()).toBe(true);
    });

    it('结算后池值不变（settle 只标记不清空）', () => {
      state.player.relics.add('score_black_hole');
      resetScoringRelicBattleState();
      accumulateBlackHole(100);
      settleBlackHole();
      expect(getBlackHolePool()).toBe(100);
    });
  });

  // === 黑洞 + 雪球联动 (AC7) ===
  describe('黑洞 + 雪球联动 (AC7)', () => {
    beforeEach(() => {
      state.player.relics.add('score_black_hole');
      state.player.relics.add('snowball');
      resetScoringRelicBattleState();
    });

    it('雪球递增正确应用到黑洞池', () => {
      // 模拟 completeWord 中 applySnowball → accumulateBlackHole 流程
      const word1 = applySnowball(100); // index 0: 100 * 1.0 = 100
      accumulateBlackHole(word1);

      const word2 = applySnowball(100); // index 1: 100 * 1.05 = 105
      accumulateBlackHole(word2);

      const word3 = applySnowball(100); // index 2: 100 * 1.10 = 110
      accumulateBlackHole(word3);

      expect(getBlackHolePool()).toBe(100 + 105 + 110);

      const pool = settleBlackHole();
      expect(pool).toBe(315);
    });
  });

  // === 黑洞 + 分数磁铁交互 (H1 review fix) ===
  describe('黑洞 + 分数磁铁交互', () => {
    it('黑洞激活时 accumulateBlackHole 接收磁铁分数', () => {
      state.player.relics.add('score_black_hole');
      resetScoringRelicBattleState();
      expect(isBlackHoleActive()).toBe(true);
      // 模拟 battle.ts 中的逻辑：磁铁分数重定向到黑洞池
      const magnetBonus = 1;
      accumulateBlackHole(magnetBonus);
      accumulateBlackHole(magnetBonus);
      accumulateBlackHole(magnetBonus);
      expect(getBlackHolePool()).toBe(3);
    });
  });

  // === HUD 隐藏/显示 (AC6) ===
  describe('HUD 隐藏/显示 (AC6)', () => {
    it('isBlackHoleActive 正确反映遗物状态', () => {
      expect(isBlackHoleActive()).toBe(false);

      state.player.relics.add('score_black_hole');
      resetScoringRelicBattleState();
      expect(isBlackHoleActive()).toBe(true);

      // hasBlackHoleSettled 初始为 false
      expect(hasBlackHoleSettled()).toBe(false);

      // 结算后 settled 为 true，但 active 仍为 true
      settleBlackHole();
      expect(isBlackHoleActive()).toBe(true);
      expect(hasBlackHoleSettled()).toBe(true);
    });
  });

  // === 生命周期 ===
  describe('生命周期', () => {
    it('reset 重置所有状态', () => {
      state.player.relics.add('snowball');
      state.player.relics.add('score_black_hole');
      resetScoringRelicBattleState();

      // 触发一些状态变化
      applySnowball(100);
      applySnowball(100);
      accumulateBlackHole(100);

      // reset
      resetScoringRelicBattleState();

      // snowball index 重置 — 第一词应该是 ×1.0
      expect(applySnowball(100)).toBe(100);

      // 黑洞池重置
      expect(getBlackHolePool()).toBe(0);
      expect(hasBlackHoleSettled()).toBe(false);
      expect(isBlackHoleActive()).toBe(true); // 遗物仍在
    });

    it('reset 无黑洞遗物时 active 为 false', () => {
      state.player.relics.add('snowball');
      resetScoringRelicBattleState();
      expect(isBlackHoleActive()).toBe(false);
    });
  });

  // === 注册 ===
  describe('注册', () => {
    it('initScoringRelicBehaviors 注册 2 个行为', () => {
      const before = getRegisteredBehaviors().length;
      initScoringRelicBehaviors();
      const after = getRegisteredBehaviors().length;
      expect(after - before).toBe(2);
    });
  });
});
