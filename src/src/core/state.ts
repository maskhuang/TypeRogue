// ============================================
// 打字肉鸽 - 游戏状态管理
// ============================================

import type { GameState, SynergyState } from './types';
import type { StageType } from '../systems/stage/StageConfig';
import { BALANCE } from './constants';

// === 初始状态 ===
export function createInitialState(): GameState {
  const gameState: GameState = {
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
    resources: {
      base: 0,
      score: 0,
      multiplier: BALANCE.BASE_MULTIPLIER,
      time: BALANCE.TIME_PER_LEVEL,
      shield: 0,
    },
    bossModifierPool: [],
    usedRestEvents: [],
    tempBuffs: [],
    sealedKeys: [],
    converterPool: [],
    connectorPool: [],
    pseudoInfiniteState: null,
    seenSkillTypes: new Set(),
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
      evolvedSkills: new Map(),
      enchantedSkills: new Map(),
    },
    shop: {
      items: [],
      refreshCount: 0,
    },
  };

  // Proxy: resources.multiplier ↔ state.multiplier, resources.time ↔ state.time
  // 消除手动同步，读写 resources.multiplier/time 自动映射到 state 顶层字段
  Object.defineProperty(gameState.resources, 'multiplier', {
    get() { return gameState.multiplier; },
    set(v: number) { gameState.multiplier = v; },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(gameState.resources, 'time', {
    get() { return gameState.time; },
    set(v: number) { gameState.time = v; },
    enumerable: true,
    configurable: true,
  });

  return gameState;
}

// === 联动状态 ===
export function createSynergyState(): SynergyState {
  return {
    shieldCount: 0,
    perfectStreak: 0,
    wordSkillCount: 0,
    lastTriggeredSkillId: null,
    skillBaseScore: 0,
    skillMultBonus: 0,
    letterBaseScore: 0,
    // 附魔系统
    decayCounters: new Map(),
  };
}

// === 全局状态实例 ===
export let state = createInitialState();
export let synergy = createSynergyState();

// === 资源重置 ===
export function resetResources(): void {
  state.resources.base = 0;
  state.resources.score = 0;
  state.resources.multiplier = BALANCE.BASE_MULTIPLIER;
  state.resources.time = state.timeMax;
  state.resources.shield = 0;
}

// === 状态重置 ===
export function resetState(): void {
  state = createInitialState();
  synergy = createSynergyState();
}

// === 关卡目标计算 ===
export function calculateTargetScore(level: number, stageType: StageType = 'standard'): number {
  const { TARGET_BASE, TARGET_LINEAR, TARGET_QUADRATIC } = BALANCE;
  const base = Math.floor(TARGET_BASE + level * TARGET_LINEAR + level * level * TARGET_QUADRATIC);
  if (stageType === 'elite') return Math.floor(base * 1.3);
  if (stageType === 'boss') return Math.floor(base * 1.5);
  return base;
}

// === 遗物检查 ===
/**
 * 检查玩家是否拥有指定遗物
 */
export function hasRelic(relicId: string): boolean {
  return state.player.relics.has(relicId);
}
