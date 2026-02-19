// ============================================
// 打字肉鸽 - UI 元素管理
// ============================================

import type { UIElements } from '../core/types';

let elements: UIElements | null = null;

// === 初始化 UI 元素引用 ===
export function initElements(): UIElements {
  elements = {
    // Battle
    battleScreen: document.getElementById('battle-screen')!,
    word: document.getElementById('word-display')!,
    feedback: document.getElementById('input-feedback')!,
    combo: document.getElementById('combo-count')!,
    score: document.getElementById('score-count')!,
    targetScore: document.getElementById('target-score')!,
    multiplier: document.getElementById('multiplier-display')!,
    timerDisplay: document.getElementById('timer-display')!,
    timerBar: document.getElementById('timer-bar-fill')!,
    levelLabel: document.getElementById('level-label')!,
    battleSkills: document.getElementById('battle-skills')!,
    triggerZone: document.getElementById('skill-trigger-zone')!,
    particles: document.getElementById('particles')!,
    container: document.getElementById('game-container')!,
    playerRelics: document.getElementById('player-relics')!,
    activeLibrary: document.getElementById('active-library')!,
    // Shop
    shopScreen: document.getElementById('shop-screen')!,
    shopLevelNum: document.getElementById('shop-level-num')!,
    shopScore: document.getElementById('shop-score')!,
    shopTarget: document.getElementById('shop-target')!,
    shopBonus: document.getElementById('shop-bonus')!,
    shopGold: document.getElementById('shop-gold')!,
    shopTabs: document.getElementById('shop-tabs')!,
    rewardCards: document.getElementById('reward-cards')!,
    boundGrid: document.getElementById('bound-grid')!,
    ownedSkills: document.getElementById('owned-skills')!,
    shopRelicIcons: document.getElementById('shop-relic-icons')!,
    startBattleBtn: document.getElementById('start-battle-btn')!,
    // Gameover
    gameoverScreen: document.getElementById('gameover-screen')!,
    gameoverStats: document.getElementById('gameover-stats')!,
  };

  return elements;
}

// === 获取 UI 元素 ===
export function getElements(): UIElements {
  if (!elements) {
    throw new Error('UI elements not initialized. Call initElements() first.');
  }
  return elements;
}
