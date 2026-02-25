// ============================================
// 打字肉鸽 - 遗物三选一系统
// ============================================
// Story 17.1: 遗物脱离商店，改为开局 + 每5关弹出三选一

import { state } from '../core/state';
import { RELICS } from '../data/relics';
import { renderRelicDisplay, showFeedback } from './battle';
import { playSound } from '../effects/sound';

// === 是否应该弹出遗物三选一 ===
export function shouldShowRelicPicker(level: number): boolean {
  // 开局(level 1) + 每5关(5, 10, 15...)
  if (level !== 1 && level % 5 !== 0) return false;
  // 还有未拥有的遗物
  const owned = state.player.relics;
  return Object.keys(RELICS).some(id => !owned.has(id));
}

// === 生成3个候选遗物 ===
export function generateRelicCandidates(): string[] {
  const owned = state.player.relics;
  const available = Object.keys(RELICS).filter(id => !owned.has(id));
  // Fisher-Yates shuffle
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, 3);
}

// === 显示遗物三选一模态框 ===
export function showRelicPicker(onComplete: () => void): void {
  const candidates = generateRelicCandidates();
  if (candidates.length === 0) {
    onComplete();
    return;
  }

  const modal = document.getElementById('relic-picker-modal');
  if (!modal) {
    onComplete();
    return;
  }

  const cardsEl = document.getElementById('relic-picker-cards');
  const skipBtn = document.getElementById('relic-picker-skip');
  if (!cardsEl || !skipBtn) {
    onComplete();
    return;
  }

  // Guard flag 防止快速点击多次触发 onComplete
  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    closeRelicPicker();
    onComplete();
  };

  cardsEl.innerHTML = '';

  candidates.forEach(relicId => {
    const relic = RELICS[relicId];
    if (!relic) return;

    const rarityClass = relic.rarity || 'common';

    const card = document.createElement('div');
    card.className = `relic-picker-card relic-rarity-${rarityClass}`;
    card.innerHTML = `
      <div class="relic-picker-icon">${relic.icon}</div>
      <div class="relic-picker-name">${relic.name}</div>
      <div class="relic-picker-desc">${relic.description}</div>
      <div class="relic-picker-rarity">${rarityClass}</div>
      ${relic.flavor ? `<div class="relic-picker-flavor">"${relic.flavor}"</div>` : ''}
    `;

    card.onclick = () => {
      state.player.relics.add(relicId);
      showFeedback(`获得遗物 ${relic.icon} ${relic.name}!`, '#ffe66d');
      playSound('skill');
      renderRelicDisplay();
      finish();
    };

    cardsEl.appendChild(card);
  });

  skipBtn.onclick = () => finish();

  const overlay = modal.querySelector('.relic-picker-overlay') as HTMLElement;
  if (overlay) {
    overlay.onclick = () => finish();
  }

  modal.classList.remove('relic-picker-hidden');
}

function closeRelicPicker(): void {
  const modal = document.getElementById('relic-picker-modal');
  if (modal) modal.classList.add('relic-picker-hidden');
}
