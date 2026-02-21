// ============================================
// 打字肉鸽 - 游戏状态管理
// ============================================

import type { GameState, SynergyState } from './types';
import { BALANCE } from './constants';

// === 初始状态 ===
export function createInitialState(): GameState {
  return {
    level: 1,
    phase: 'battle',
    time: BALANCE.TIME_PER_LEVEL,
    timeMax: BALANCE.TIME_PER_LEVEL,
    score: 0,
    targetScore: 100,
    combo: 0,
    maxCombo: 0,
    multiplier: BALANCE.BASE_MULTIPLIER,
    wordScore: 0,
    gold: 30,
    wordPerfect: true,
    lastMilestone: 0,
    overkill: 0,
    player: {
      word: '',
      index: 0,
      bindings: new Map(),
      skills: new Map(),
      relics: new Set(),
      wordDeck: [],
      baseMultiplier: BALANCE.BASE_MULTIPLIER,
      comboBonus: BALANCE.COMBO_BONUS,
      wordBonus: 0,
      timeBonus: 0,
      letterBonus: 0,
    },
    shop: {
      rewards: [],
      shopWords: [],
      shopSkills: [],
      shopRelics: [],
      selectedSkill: null,
      selectedKey: null,
      tab: 'skills',
      removeCount: 0,
    },
  };
}

// === 联动状态 ===
export function createSynergyState(): SynergyState {
  return {
    rippleBonus: new Map(),
    echoTrigger: new Set(),
    shieldCount: 0,
    perfectStreak: 0,
    wordSkillCount: 0,
    lastTriggeredSkillId: null,
    echoPending: false,
    ripplePending: false,
    ripplePassthrough: null,
    pulseCount: 0,
  };
}

// === 全局状态实例 ===
export let state = createInitialState();
export let synergy = createSynergyState();

// === 状态重置 ===
export function resetState(): void {
  state = createInitialState();
  synergy = createSynergyState();
}

// === 关卡目标计算 ===
export function calculateTargetScore(level: number): number {
  const { TARGET_BASE, TARGET_LINEAR, TARGET_QUADRATIC } = BALANCE;
  return Math.floor(TARGET_BASE + level * TARGET_LINEAR + level * level * TARGET_QUADRATIC);
}

// === 遗物检查 ===
/**
 * 检查玩家是否拥有指定遗物
 */
export function hasRelic(relicId: string): boolean {
  return state.player.relics.has(relicId);
}
