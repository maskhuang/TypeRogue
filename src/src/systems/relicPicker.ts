// ============================================
// 打字肉鸽 - 遗物三选一系统
// ============================================
// Story 17.1: 遗物脱离商店，改为开局 + 每5关弹出三选一
// Q2: 加权遗物候选生成 + 多渠道获取

import { state, isRelicSlotsFull, addRelicWithCapacity, replaceRelic } from '../core/state';
import { RELICS, MAX_RELIC_SLOTS } from '../data/relics';
import type { RelicRarity } from '../data/relics';
import { renderRelicDisplay, showFeedback } from './battle';
import { playSound } from '../effects/sound';
import { random } from '../core/seededRandom';

// === 加权遗物类型 ===
export interface RelicWeights {
  common: number;
  rare: number;
  legendary: number;
}

export const RELIC_WEIGHT_PRESETS = {
  gameStart:  { common: 70, rare: 25, legendary: 5 },
  eliteDrop:  { common: 0,  rare: 60, legendary: 40 },
  bossDrop:   { common: 0,  rare: 0,  legendary: 100 },
} as const;

// === 是否还有未拥有的遗物 ===
export function hasUnownedRelics(): boolean {
  return Object.keys(RELICS).some(id => !state.player.relics.has(id));
}

// === 生成加权候选遗物 ===
export function generateRelicCandidates(weights: RelicWeights = RELIC_WEIGHT_PRESETS.gameStart): string[] {
  const owned = state.player.relics;
  const available = Object.keys(RELICS).filter(id => !owned.has(id));

  // 按稀有度分桶
  const buckets: Record<RelicRarity, string[]> = { common: [], rare: [], legendary: [] };
  for (const id of available) {
    const rarity = RELICS[id].rarity;
    buckets[rarity].push(id);
  }

  // Fisher-Yates 打散各桶
  for (const key of Object.keys(buckets) as RelicRarity[]) {
    const arr = buckets[key];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // 加权抽取 3 个不重复候选
  const candidates: string[] = [];
  const rarities: RelicRarity[] = ['common', 'rare', 'legendary'];
  const activeRarities = rarities.filter(r => weights[r] > 0 && buckets[r].length > 0);

  while (candidates.length < 3 && activeRarities.length > 0) {
    const totalWeight = activeRarities.reduce((sum, r) => sum + weights[r], 0);
    const roll = random() * totalWeight;
    let cumulative = 0;
    let picked: RelicRarity | null = null;

    for (const r of activeRarities) {
      cumulative += weights[r];
      if (roll < cumulative) {
        picked = r;
        break;
      }
    }
    if (!picked) picked = activeRarities[activeRarities.length - 1];

    const id = buckets[picked].shift();
    if (id) {
      candidates.push(id);
    }

    // 移除已空桶
    for (let i = activeRarities.length - 1; i >= 0; i--) {
      if (buckets[activeRarities[i]].length === 0) {
        activeRarities.splice(i, 1);
      }
    }
  }

  return candidates;
}

// === 显示遗物三选一模态框 ===
export function showRelicPicker(onComplete: () => void, weights?: RelicWeights): void {
  const candidates = generateRelicCandidates(weights);
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
      if (!isRelicSlotsFull()) {
        addRelicWithCapacity(relicId);
        showFeedback(`获得遗物 ${relic.icon} ${relic.name}!`, '#ffe66d');
        playSound('skill');
        renderRelicDisplay();
        finish();
      } else {
        showRelicReplaceUI(relicId, finish);
      }
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

// === 替换模式 UI（导出供商店复用） ===
export function showRelicReplaceUI(newRelicId: string, onDone: () => void): void {
  const newRelic = RELICS[newRelicId];
  if (!newRelic) { onDone(); return; }

  const cardsEl = document.getElementById('relic-picker-cards');
  if (!cardsEl) { onDone(); return; }

  cardsEl.innerHTML = '';

  // 标题提示
  const header = document.createElement('div');
  header.className = 'relic-replace-header';
  header.textContent = `槽位已满！选择要替换的遗物（获得 ${newRelic.icon} ${newRelic.name}）`;
  cardsEl.appendChild(header);

  // 显示当前所有遗物供选择替换
  state.player.relics.forEach(ownedId => {
    const owned = RELICS[ownedId];
    if (!owned) return;
    const sellGold = Math.floor(owned.basePrice * 0.5);

    const card = document.createElement('div');
    card.className = `relic-picker-card relic-rarity-${owned.rarity}`;
    card.innerHTML = `
      <div class="relic-picker-icon">${owned.icon}</div>
      <div class="relic-picker-name">${owned.name}</div>
      <div class="relic-picker-desc">${owned.description}</div>
      <div class="relic-picker-sell">卖出 +${sellGold}g</div>
    `;
    card.onclick = () => {
      const gold = replaceRelic(ownedId, newRelicId);
      showFeedback(`替换遗物！获得 ${newRelic.icon} ${newRelic.name}，卖出 +${gold}g`, '#ffe66d');
      playSound('skill');
      renderRelicDisplay();
      onDone();
    };
    cardsEl.appendChild(card);
  });

  // 放弃按钮
  const giveUp = document.createElement('div');
  giveUp.className = 'relic-picker-card relic-give-up';
  giveUp.innerHTML = `<div class="relic-picker-icon">✕</div><div class="relic-picker-name">放弃</div>`;
  giveUp.onclick = () => onDone();
  cardsEl.appendChild(giveUp);
}
