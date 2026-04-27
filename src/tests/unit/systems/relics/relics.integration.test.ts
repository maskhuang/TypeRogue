/**
 * Story 36.13: 遗物联动矩阵 + 数据完整性 + 获取权重 集成测试
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { state, synergy, resetState } from '../../../../src/core/state';
import { clearBehaviorHandlers, setRelicState, getRelicState, initRelicState } from '../../../../src/systems/relics/RelicPipeline';
import { RELICS, getAllRelicIds, DELETED_RELIC_IDS } from '../../../../src/data/relics';
import type { RelicSubsystem, RelicBehaviorType, RelicRarity } from '../../../../src/data/relics';

// Behavior modules
import { hasGlassCannon, checkSpeedRelics, resetTypingRelicState } from '../../../../src/systems/relics/TypingRelicBehaviors';
import {
  hasImmortalCombo,
  checkComboDetonator,
  checkRhythmDoctor,
  resetComboRelicState,
} from '../../../../src/systems/relics/ComboRelicBehaviors';
import { hasUncrownedKing, shouldBlockEnchantment, getFirstStrikeBonus } from '../../../../src/systems/relics/SkillRelicBehaviors';
import { getEnchantAnchorSlotBonus, getEnchantAnchorPriceMultiplier } from '../../../../src/systems/relics/EnchantmentRelicBehaviors';
import { getDiscountMultiplier } from '../../../../src/systems/relics/ShopRelicBehaviors';
import {
  checkUniversalFurnace,
  getResourceTideBonus,
  incrementWordParity,
  resetResourceRelicBattleState,
} from '../../../../src/systems/relics/ResourceRelicBehaviors';
import {
  applyLenientJudge,
  applySnowball,
  accumulateBlackHole,
  settleBlackHole,
  getBlackHolePool,
  resetScoringRelicBattleState,
} from '../../../../src/systems/relics/ScoringRelicBehaviors';
import {
  getWarmUpBonus,
  getEnduranceTimeBonus,
  WARMUP_DURATION,
  WARMUP_BONUS,
  ENDURANCE_TIME_BONUS,
  resetStageRelicBattleState,
} from '../../../../src/systems/relics/StageRelicBehaviors';

import { generateRelicCandidates, RELIC_WEIGHT_PRESETS } from '../../../../src/systems/relicPicker';
import { setSeededMode, setNormalMode } from '../../../../src/core/seededRandom';

// === 联动矩阵测试 (AC1) ===

describe('遗物联动矩阵 (Story 36.13 AC1)', () => {
  beforeEach(() => {
    resetState();
    clearBehaviorHandlers();
    resetScoringRelicBattleState();
    resetComboRelicState();
    resetResourceRelicBattleState();
  });

  // === #1: 减速津贴 + 加速奖金 ===
  describe('decelerate_reward + accelerate_reward', () => {
    beforeEach(() => {
      state.player.relics.add('decelerate_reward');
      state.player.relics.add('accelerate_reward');
      resetTypingRelicState();
    });

    it('第二个词比第一个慢 → 获得减速津贴', () => {
      checkSpeedRelics(2.0); // 第一个词
      const result = checkSpeedRelics(3.0); // 更慢
      expect(result.timeBonus).toBe(0.5);
      expect(result.goldBonus).toBe(0);
    });

    it('第二个词比第一个快 → 获得加速奖金', () => {
      checkSpeedRelics(3.0); // 第一个词
      const result = checkSpeedRelics(2.0); // 更快
      expect(result.timeBonus).toBe(0);
      expect(result.goldBonus).toBe(2);
    });

    it('玻璃大炮与速度遗物独立', () => {
      state.player.relics.add('glass_cannon_v2');
      expect(hasGlassCannon()).toBe(true);
      checkSpeedRelics(3.0);
      const result = checkSpeedRelics(2.0);
      expect(result.goldBonus).toBe(2);
    });
  });

  // === #2: 不灭连击 + 连击引爆 ===
  describe('immortal_combo + combo_detonator', () => {
    beforeEach(() => {
      state.player.relics.add('immortal_combo');
      state.player.relics.add('combo_detonator');
      initRelicState('combo_detonator');
    });

    it('combo 持续增长，引爆持续在阈值触发', () => {
      expect(hasImmortalCombo()).toBe(true);

      // combo 不断增长，无中断
      let totalDetonations = 0;
      for (let combo = 1; combo <= 50; combo++) {
        const triggered = checkComboDetonator(combo);
        if (triggered > 0) totalDetonations++;
      }

      // 阈值 15, 30, 45 — 应触发 3 次
      expect(totalDetonations).toBe(3);
    });

    it('不灭连击保持 combo 不归零后引爆可持续触发', () => {
      // 模拟 combo 到 15 触发第一次
      expect(checkComboDetonator(15)).toBe(3);
      // combo 到 30 触发第二次
      expect(checkComboDetonator(30)).toBe(3);
      // combo 到 45 触发第三次
      expect(checkComboDetonator(45)).toBe(3);
      // 之后不再触发
      expect(checkComboDetonator(50)).toBe(0);
    });
  });

  // === #3: 不灭连击 + 节奏医生 ===
  describe('immortal_combo + rhythm_doctor', () => {
    beforeEach(() => {
      state.player.relics.add('immortal_combo');
      state.player.relics.add('rhythm_doctor');
      initRelicState('rhythm_doctor');
    });

    it('combo 持续增长，每 10 combo 获得时间奖励', () => {
      expect(hasImmortalCombo()).toBe(true);

      let totalTimeBonuses = 0;
      for (let combo = 1; combo <= 40; combo++) {
        totalTimeBonuses += checkRhythmDoctor(combo);
      }

      // 10, 20, 30, 40 — 应触发 4 次，每次 +1s
      expect(totalTimeBonuses).toBe(4);
    });

    it('不灭连击下 milestone 正确递增', () => {
      // 推到 combo 25
      for (let combo = 1; combo <= 25; combo++) {
        checkRhythmDoctor(combo);
      }
      // milestone 应在 20
      expect(getRelicState('rhythm_doctor')).toBe(20);

      // combo 继续到 30 应触发
      expect(checkRhythmDoctor(30)).toBe(1);
      expect(getRelicState('rhythm_doctor')).toBe(30);
    });
  });

  // === #4: 无冕之王 + 附魔锚点 ===
  describe('uncrowned_king + enchant_anchor', () => {
    beforeEach(() => {
      state.player.relics.add('uncrowned_king');
      state.player.relics.add('enchant_anchor');
    });

    it('无冕之王禁止未附魔技能获得附魔', () => {
      expect(hasUncrownedKing()).toBe(true);
      // 无附魔技能 → shouldBlockEnchantment 返回 true
      expect(shouldBlockEnchantment([])).toBe(true);
      // 已有附魔技能 → 不阻止
      expect(shouldBlockEnchantment(['splash'])).toBe(false);
    });

    it('附魔锚点仍返回 +1 槽位（但对无冕之王的禁止无效）', () => {
      // 锚点功能仍然存在
      expect(getEnchantAnchorSlotBonus()).toBe(1);
      // 但无冕之王阻止附魔的逻辑独立于槽位计算
      // 即使有额外槽位，无附魔的技能仍被阻止
      expect(shouldBlockEnchantment([])).toBe(true);
    });
  });

  // === #5: 折扣卡 + 附魔锚点 ===
  describe('discount_card + enchant_anchor', () => {
    beforeEach(() => {
      state.player.relics.add('discount_card');
      state.player.relics.add('enchant_anchor');
    });

    it('折扣 -15% 与附魔加价 +10% 各自独立返回', () => {
      const discount = getDiscountMultiplier(); // 0.85
      // 无附魔时锚点加价 = 1.0
      const anchorPrice = getEnchantAnchorPriceMultiplier(); // 1 + 0.1 * 0 = 1.0

      expect(discount).toBe(0.85);
      expect(anchorPrice).toBe(1);
    });

    it('有附魔时加价正确叠加', () => {
      // 模拟 2 个技能各有 1 个附魔
      state.affixSkills.set('skill1', {
        id: 'skill1', name: 'test', level: 1, key: 'a',
        affixes: [], enchantmentIds: ['splash'], baseValues: [1, 2, 3],
        generatedName: 'test', rarity: 'common',
      } as any);
      state.affixSkills.set('skill2', {
        id: 'skill2', name: 'test2', level: 1, key: 'b',
        affixes: [], enchantmentIds: ['quest'], baseValues: [1, 2, 3],
        generatedName: 'test2', rarity: 'common',
      } as any);

      const discount = getDiscountMultiplier(); // 0.85
      const anchorPrice = getEnchantAnchorPriceMultiplier(); // 1 + 0.1 * 2 = 1.2

      expect(discount).toBe(0.85);
      expect(anchorPrice).toBeCloseTo(1.2, 5);

      // 商店中最终价格 = base * discount * anchorPrice = base * 0.85 * 1.2 = base * 1.02
      // 加算逻辑取决于 shop.ts 实现，但两个乘数独立可用
    });
  });

  // === #6: 万物熔炉 + 宽容评审 ===
  describe('universal_furnace + lenient_judge', () => {
    beforeEach(() => {
      state.player.relics.add('universal_furnace');
      state.player.relics.add('lenient_judge');
    });

    it('宽容评审降低 target → 更多 overkill → 更多香蕉', () => {
      const originalTarget = 1000;

      // 宽容评审降低 target
      const reducedTarget = applyLenientJudge(originalTarget);
      expect(reducedTarget).toBe(900); // floor(1000 * 0.9)

      // 模拟战斗结束：score 高于 target
      state.score = 1200;
      state.time = 5;

      // 用原始 target 时 overkill = 200
      state.targetScore = originalTarget;
      const furnaceOriginal = checkUniversalFurnace()!;
      expect(furnaceOriginal.bonusGold).toBe(200 + 5); // overkill + time

      // 用宽容 target 时 overkill = 300
      state.targetScore = reducedTarget;
      const furnaceReduced = checkUniversalFurnace()!;
      expect(furnaceReduced.bonusGold).toBe(300 + 5); // overkill + time

      // 宽容评审导致更多香蕉
      expect(furnaceReduced.bonusGold).toBeGreaterThan(furnaceOriginal.bonusGold);
    });
  });

  // === #7: 分数黑洞 + 雪球效应 ===
  describe('score_black_hole + snowball', () => {
    beforeEach(() => {
      state.player.relics.add('score_black_hole');
      state.player.relics.add('snowball');
      resetScoringRelicBattleState();
    });

    it('雪球递增正确应用到黑洞池', () => {
      // 模拟 completeWord 流程
      const word1 = applySnowball(100); // index 0: 100 * 1.0 = 100
      accumulateBlackHole(word1);

      const word2 = applySnowball(100); // index 1: 100 * 1.05 = 105
      accumulateBlackHole(word2);

      const word3 = applySnowball(100); // index 2: 100 * 1.10 = 110
      accumulateBlackHole(word3);

      expect(getBlackHolePool()).toBe(100 + 105 + 110); // 315

      const pool = settleBlackHole();
      expect(pool).toBe(315);
    });
  });

  // === #8: 暖身操 + 续航电池 ===
  describe('warm_up + endurance_battery', () => {
    beforeEach(() => {
      state.player.relics.add('warm_up');
      state.player.relics.add('endurance_battery');
      resetStageRelicBattleState(); // sets _stageStartTime = Date.now()
    });

    it('暖身 10s 窗口基于墙钟时间，不受电池加时影响', () => {
      // 电池返回 +10 秒（加到游戏计时器）
      const timeBonus = getEnduranceTimeBonus();
      expect(timeBonus).toBe(ENDURANCE_TIME_BONUS); // 10

      // 暖身在关卡开始后 <10s 内生效（基于 Date.now()）
      // 刚 reset 后立即调用 — 应在窗口内
      const warmUp = getWarmUpBonus();
      expect(warmUp).toBe(WARMUP_BONUS); // 0.10

      // 两个效果独立：电池加了 10s 到计时器，
      // 但暖身窗口仍基于 _stageStartTime（Date.now()），不是游戏计时器
    });

    it('两个遗物的加成独立计算', () => {
      // 电池固定 +10s
      expect(getEnduranceTimeBonus()).toBe(10);
      // 暖身窗口内 +0.40
      expect(getWarmUpBonus()).toBe(0.40);
      // 它们互不影响
    });
  });

  // === #9: 资源潮汐 + 首发强化 ===
  describe('resource_tide + first_strike', () => {
    beforeEach(() => {
      state.player.relics.add('resource_tide');
      state.player.relics.add('first_strike');
      resetResourceRelicBattleState();
    });

    it('首发强化返回固定分数，潮汐返回百分比，各自独立', () => {
      incrementWordParity(); // wordParity=1 → 奇数 → base 加成
      synergy.wordSkillCount = 1;

      const firstStrike = getFirstStrikeBonus(); // 10 分
      const tideBase = getResourceTideBonus('base'); // 0.4（奇数词 + base）

      expect(firstStrike).toBe(10);
      expect(tideBase).toBe(0.4);
    });

    it('偶数词的 multiplier 加成与首发强化各自独立', () => {
      synergy.wordSkillCount = 1;

      const firstStrike = getFirstStrikeBonus(); // 10 分
      const tideMultiplier = getResourceTideBonus('multiplier'); // 0.4（偶数词）

      expect(firstStrike).toBe(10);
      expect(tideMultiplier).toBe(0.4);
    });
  });
});

// === 获取权重分布测试 (AC3) ===

describe('遗物获取权重分布 (Story 36.13 AC3)', () => {
  beforeEach(() => {
    resetState();
    setSeededMode(12345);
  });

  afterEach(() => {
    setNormalMode();
  });

  it('1000 次模拟中各稀有度出现比例与设计权重偏差 <5%', () => {
    const weights = RELIC_WEIGHT_PRESETS.gameStart;
    // { common: 55, rare: 25, epic: 15, legendary: 5 }
    const totalWeight = weights.common + weights.rare + weights.epic + weights.legendary;
    const expectedRatios: Record<string, number> = {
      common: weights.common / totalWeight,
      rare: weights.rare / totalWeight,
      epic: weights.epic / totalWeight,
      legendary: weights.legendary / totalWeight,
    };

    const counts: Record<string, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    let totalCandidates = 0;

    for (let i = 0; i < 1000; i++) {
      // 每次重置拥有遗物（不累积）
      state.player.relics.clear();
      // 设置种子使结果不同但可复现
      setSeededMode(12345 + i);

      const candidates = generateRelicCandidates(weights);
      for (const id of candidates) {
        const relic = RELICS[id];
        if (relic) {
          counts[relic.rarity]++;
          totalCandidates++;
        }
      }
    }

    // 验证各稀有度偏差 <5 个百分点
    for (const rarity of Object.keys(expectedRatios)) {
      const actualRatio = counts[rarity] / totalCandidates;
      const expected = expectedRatios[rarity];
      const deviation = Math.abs(actualRatio - expected);
      expect(deviation).toBeLessThan(0.05);
    }
  });

  it('class-exclusive 遗物仅在对应职业出现', () => {
    // 非 wordsmith/metamorph 时
    state.classId = 'neutral' as any;
    state.player.relics.clear();
    setSeededMode(99999);

    const WORDSMITH_IDS = new Set(['apprentice_notes', 'masters_lexicon', 'perpetual_queue', 'word_scissors', 'resonance_mold']);
    const METAMORPH_IDS = new Set(['primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer', 'chaos_seed', 'fittest_survivors']);

    // 100 次抽取，非职业不应出现专属遗物
    for (let i = 0; i < 100; i++) {
      state.player.relics.clear();
      setSeededMode(i * 7 + 42);
      const candidates = generateRelicCandidates();
      for (const id of candidates) {
        expect(WORDSMITH_IDS.has(id)).toBe(false);
        expect(METAMORPH_IDS.has(id)).toBe(false);
      }
    }
  });

  it('wordsmith 可获得 wordsmith 专属遗物', () => {
    state.classId = 'wordsmith' as any;
    let foundExclusive = false;

    for (let i = 0; i < 200; i++) {
      state.player.relics.clear();
      setSeededMode(i * 13 + 7);
      const candidates = generateRelicCandidates();
      for (const id of candidates) {
        if (['apprentice_notes', 'masters_lexicon', 'perpetual_queue', 'word_scissors', 'resonance_mold'].includes(id)) {
          foundExclusive = true;
        }
      }
    }

    expect(foundExclusive).toBe(true);
  });
});

// === 数据完整性测试 (AC4) ===

describe('遗物数据完整性 (Story 36.13 AC4)', () => {
  const VALID_SUBSYSTEMS: RelicSubsystem[] = [
    'typing', 'combo', 'skill', 'enchantment', 'topology',
    'word', 'resource', 'shop', 'stage', 'boss_modifier', 'scoring',
  ];

  it('所有 56 通用遗物的 subsystem 字段对应 11 个合法值之一', () => {
    const allIds = getAllRelicIds();
    const universalRelics = allIds.filter(id => RELICS[id].subsystem !== undefined);

    for (const id of universalRelics) {
      const relic = RELICS[id];
      expect(VALID_SUBSYSTEMS).toContain(relic.subsystem);
    }
  });

  it('每子系统遗物数量正确', () => {
    const subsystemCounts: Record<string, number> = {};
    for (const id of getAllRelicIds()) {
      const relic = RELICS[id];
      if (relic.subsystem) {
        subsystemCounts[relic.subsystem] = (subsystemCounts[relic.subsystem] || 0) + 1;
      }
    }

    for (const subsystem of VALID_SUBSYSTEMS) {
      // combo/skill/enchantment/topology have 6 relics each
      const expected = (subsystem === 'combo' || subsystem === 'skill' || subsystem === 'enchantment' || subsystem === 'topology') ? 6 : 5;
      expect(subsystemCounts[subsystem]).toBe(expected);
    }
  });

  it('basePrice 范围合理', () => {
    // 职业专属遗物 basePrice=0，通用遗物按稀有度有区间
    const priceRanges: Record<string, [number, number]> = {
      common: [0, 80],
      rare: [0, 120],
      epic: [0, 200],
      legendary: [0, 250],
    };

    for (const id of getAllRelicIds()) {
      const relic = RELICS[id];
      const [min, max] = priceRanges[relic.rarity];
      expect(relic.basePrice).toBeGreaterThanOrEqual(min);
      expect(relic.basePrice).toBeLessThanOrEqual(max);
    }
  });

  it('DELETED_RELIC_IDS 中的遗物不出现在 RELICS 中', () => {
    for (const deletedId of DELETED_RELIC_IDS) {
      expect(RELICS[deletedId]).toBeUndefined();
    }
  });

  it('有 behaviorType 的遗物的值合法', () => {
    for (const id of getAllRelicIds()) {
      const relic = RELICS[id];
      if (relic.behaviorType) {
        // behaviorType 是字符串，只需验证非空
        expect(typeof relic.behaviorType).toBe('string');
        expect(relic.behaviorType.length).toBeGreaterThan(0);
      }
    }
  });

  it('icon 在所有遗物中完全唯一', () => {
    const icons = getAllRelicIds().map(id => RELICS[id].icon);
    const uniqueIcons = new Set(icons);
    expect(uniqueIcons.size).toBe(icons.length);
  });

  it('通用遗物总数为 59', () => {
    const universalCount = getAllRelicIds().filter(id => RELICS[id].subsystem !== undefined).length;
    expect(universalCount).toBe(59);
  });

  it('职业专属遗物总数为 10（5 造词师 + 5 蜕变师）', () => {
    const classRelics = getAllRelicIds().filter(id => RELICS[id].subsystem === undefined);
    expect(classRelics.length).toBe(10);
  });
});
