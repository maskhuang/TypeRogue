// ============================================
// 打字肉鸽 - 游戏状态管理
// ============================================

import type { GameState, SynergyState } from './types';
import type { StageType } from '../systems/stage/StageConfig';
import { BALANCE } from './constants';
import { MAX_RELIC_SLOTS, getRelicData } from '../data/relics';
import { initRelicState } from '../systems/relics/RelicPipeline';

// === 初始状态 ===
export function createInitialState(): GameState {
  const gameState: GameState = {
    classId: 'none',
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
    gold: 100,
    wordPerfect: true,
    lastMilestone: 0,
    overkill: 0,
    classResourceProduced: {},
    fragmentInventory: {
      a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0, i: 0, j: 0, k: 0, l: 0, m: 0,
      n: 0, o: 0, p: 0, q: 0, r: 0, s: 0, t: 0, u: 0, v: 0, w: 0, x: 0, y: 0, z: 0,
    },
    fragmentQueue: ['_', '_', '_', '_', '_', '_'],
    fragmentQueuePosition: 0,
    craftedWords: [],
    mutagenInventory: 0,
    resources: {
      base: 0,
      score: 0,
      multiplier: BALANCE.BASE_MULTIPLIER,
      time: BALANCE.TIME_PER_LEVEL,
      gold: 0,
      fragment: 0,
      mutagen: 0,
    },
    cycle: 1,
    activeModifiers: [],
    bossModifierPool: [],
    usedRestEvents: [],
    tempBuffs: [],
    sealedKeys: [],
    converterPool: [],
    connectorPool: [],
    amplifierPool: [],
    amplifierStacks: new Map(),
    devourCounters: new Map(),
    growthValues: new Map(),
    masteryCounters: new Map(),
    devourIcons: new Map(),
    pseudoInfiniteState: null,
    seenSkillTypes: new Set(),
    gameMode: 'normal',
    dailySeed: null,
    battleStats: null,
    player: {
      word: '',
      index: 0,
      bindings: new Map(),
      skills: new Map(),
      relics: new Set(),
      relicStates: {},
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

// === 战后统计初始化 ===
export function createBattleStats(): import('./types').BattleStats {
  return {
    keyStats: new Map(),
    skillStats: new Map(),
    wordsCompleted: 0,
    totalChainTriggers: 0,
    maxChainDepth: 0,
    perfectWords: 0,
    rating: '',
  };
}

// === 联动状态 ===
export function createSynergyState(): SynergyState {
  return {
    wordSkillCount: 0,
    lastTriggeredSkillId: null,
    skillBaseScore: 0,
    skillMultBonus: 0,
    letterBaseScore: 0,
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
  state.resources.fragment = 0;
  state.resources.mutagen = 0;
  state.classResourceProduced = {};
  state.fragmentQueuePosition = 0;
}

// === 状态重置 ===
export function resetState(): void {
  state = createInitialState();
  synergy = createSynergyState();
}

// === 关卡目标计算 ===
export function calculateTargetScore(level: number, stageType: StageType = 'standard', cycle: number = 1): number {
  const { TARGET_BASE, TARGET_LINEAR, TARGET_QUADRATIC, CYCLE_SCORE_BASE } = BALANCE;
  const base = Math.floor(TARGET_BASE + level * TARGET_LINEAR + level * level * TARGET_QUADRATIC);
  const scaled = Math.floor(base * Math.pow(CYCLE_SCORE_BASE, cycle - 1));
  if (stageType === 'elite') return Math.floor(scaled * 1.3);
  if (stageType === 'boss') return Math.floor(scaled * 1.5);
  return scaled;
}

// === 遗物管理 ===
/**
 * 检查玩家是否拥有指定遗物
 */
export function hasRelic(relicId: string): boolean {
  return state.player.relics.has(relicId);
}

/**
 * 遗物槽位是否已满
 */
export function isRelicSlotsFull(): boolean {
  return state.player.relics.size >= MAX_RELIC_SLOTS;
}

/**
 * 添加遗物（带容量检查）
 * @returns true=成功添加, false=已拥有或槽位满
 */
export function addRelicWithCapacity(relicId: string): boolean {
  if (state.player.relics.has(relicId)) return false;
  if (isRelicSlotsFull()) return false;
  state.player.relics.add(relicId);
  initRelicState(relicId);
  return true;
}

/**
 * 移除遗物
 */
export function removeRelic(relicId: string): void {
  state.player.relics.delete(relicId);
  delete state.player.relicStates[relicId];
}

/**
 * 替换遗物 — 删旧添新，返回卖出金币
 */
export function replaceRelic(oldId: string, newId: string): number {
  if (state.player.relics.has(newId)) return 0; // 已拥有新遗物，不替换
  const oldRelic = getRelicData(oldId);
  state.player.relics.delete(oldId);
  delete state.player.relicStates[oldId];
  state.player.relics.add(newId);
  initRelicState(newId);
  const sellGold = oldRelic ? Math.floor(oldRelic.basePrice * 0.5) : 0;
  state.gold += sellGold;
  return sellGold;
}
