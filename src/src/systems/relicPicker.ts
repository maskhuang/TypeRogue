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
import { t, getLocale, localizeItemName, localizeItemDesc } from '../demo/demo-i18n';

// === 加权遗物类型 ===
export interface RelicWeights {
  common: number;
  rare: number;
  epic: number;
  legendary: number;
}

export const RELIC_WEIGHT_PRESETS = {
  gameStart:  { common: 100, rare: 0, epic: 0, legendary: 0 },
  eliteDrop:  { common: 0,  rare: 50, epic: 50, legendary: 0 },
  bossDrop:   { common: 0,  rare: 0,  epic: 30, legendary: 70 },
} as const;

// === 是否还有未拥有的遗物 ===
export function hasUnownedRelics(): boolean {
  return Object.keys(RELICS).some(id => !state.player.relics.has(id));
}

// === 生成加权候选遗物 ===
// 造词师专属遗物 ID 集合（非造词师时从候选池排除）
const WORDSMITH_EXCLUSIVE_RELICS = new Set([
  'apprentice_notes', 'masters_lexicon', 'perpetual_queue',
  'word_scissors', 'resonance_mold',
  // 造词师词库遗物
  'word_collection', 'thick_deck', 'long_word_crit',
  'short_sprint', 'long_word_master', 'word_dealer',
  'punctuation_liberation',
]);

// 蜕变师专属遗物 ID 集合
const METAMORPH_EXCLUSIVE_RELICS = new Set([
  'primal_mutant', 'ultimate_mutant_strain', 'gene_stabilizer',
  'chaos_seed', 'fittest_survivors',
  // 蜕变师附魔遗物
  'enchant_dividend', 'enchant_boost', 'rune_spike',
  'apprentice_robe', 'trial_badge', 'fate_fork',
  'greedy_inscription',
]);

/** 开局时不可用的子系统（玩家尚无对应类型技能） */
const GAME_START_EXCLUDED_SUBSYSTEMS: Set<string> = new Set(['stacking']);

export function generateRelicCandidates(weights: RelicWeights = RELIC_WEIGHT_PRESETS.gameStart): string[] {
  const owned = state.player.relics;
  const classId = state.classId;
  const isGameStart = weights === RELIC_WEIGHT_PRESETS.gameStart;
  const available = Object.keys(RELICS).filter(id => {
    if (owned.has(id)) return false;
    // 职业专属遗物过滤
    if (WORDSMITH_EXCLUSIVE_RELICS.has(id) && classId !== 'wordsmith') return false;
    if (METAMORPH_EXCLUSIVE_RELICS.has(id) && classId !== 'metamorph') return false;
    // 开局排除依赖尚不可用子系统的遗物
    if (isGameStart) {
      const relic = RELICS[id];
      if (relic.subsystem && GAME_START_EXCLUDED_SUBSYSTEMS.has(relic.subsystem)) return false;
      if (relic.requiresSubsystem && GAME_START_EXCLUDED_SUBSYSTEMS.has(relic.requiresSubsystem)) return false;
    }
    return true;
  });

  // 按稀有度分桶
  const buckets: Record<RelicRarity, string[]> = { common: [], rare: [], epic: [], legendary: [] };
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

  // 开局保底：宽容评审必定出现在候选中
  const guaranteed: string[] = [];
  if (weights === RELIC_WEIGHT_PRESETS.gameStart) {
    const guaranteedId = 'lenient_judge';
    const rarity = RELICS[guaranteedId]?.rarity;
    if (rarity && buckets[rarity].includes(guaranteedId)) {
      buckets[rarity] = buckets[rarity].filter(id => id !== guaranteedId);
      guaranteed.push(guaranteedId);
    }
  }

  // 加权抽取不重复候选（补齐到 3 个）
  const candidates: string[] = [...guaranteed];
  const rarities: RelicRarity[] = ['common', 'rare', 'epic', 'legendary'];
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

export interface RelicPickerOptions {
  /** i18n key 用于覆盖标题（如 starter 流程使用 'relic_picker.starter_title'） */
  titleKey?: string;
}

// === 显示遗物三选一模态框 ===
export function showRelicPicker(
  onComplete: () => void,
  weights?: RelicWeights,
  options?: RelicPickerOptions,
): void {
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
  const titleEl = modal.querySelector('.relic-picker-title') as HTMLElement | null;
  if (!cardsEl || !skipBtn) {
    onComplete();
    return;
  }

  if (titleEl) {
    const titleKey = options?.titleKey ?? 'relic_picker.title';
    titleEl.textContent = t(titleKey);
    titleEl.setAttribute('data-i18n', titleKey);
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
      <div class="relic-picker-name">${localizeItemName(relicId, relic.name)}</div>
      <div class="relic-picker-desc">${localizeItemDesc(relicId, relic.description)}</div>
      <div class="relic-picker-rarity">${t(`shop.rarity.${rarityClass}`)}</div>
      ${relic.flavor && getLocale() === 'zh' ? `<div class="relic-picker-flavor">"${relic.flavor}"</div>` : ''}
    `;

    card.onclick = () => {
      if (!isRelicSlotsFull()) {
        addRelicWithCapacity(relicId);
        showFeedback(t('shop.got_relic', { icon: relic.icon, name: localizeItemName(relicId, relic.name) }), '#ffe66d');
        playSound('skill');
        renderRelicDisplay();
        finish();
      } else {
        showRelicReplaceUI(relicId, finish);
      }
    };

    cardsEl.appendChild(card);
  });

  skipBtn.onclick = () => { playSound('cancel'); finish(); };

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
  header.textContent = t('relic.slots_full', { icon: newRelic.icon, name: localizeItemName(newRelicId, newRelic.name) });
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
      <div class="relic-picker-name">${localizeItemName(ownedId, owned.name)}</div>
      <div class="relic-picker-desc">${localizeItemDesc(ownedId, owned.description)}</div>
      <div class="relic-picker-sell">${t('relic.sell_label', { gold: sellGold })}</div>
    `;
    card.onclick = () => {
      const gold = replaceRelic(ownedId, newRelicId);
      showFeedback(t('relic.replace', { icon: newRelic.icon, name: localizeItemName(newRelicId, newRelic.name), gold }), '#ffe66d');
      playSound('skill');
      renderRelicDisplay();
      onDone();
    };
    cardsEl.appendChild(card);
  });

  // 放弃按钮
  const giveUp = document.createElement('div');
  giveUp.className = 'relic-picker-card relic-give-up';
  giveUp.innerHTML = `<div class="relic-picker-icon">✕</div><div class="relic-picker-name">${t('relic.give_up')}</div>`;
  giveUp.onclick = () => onDone();
  cardsEl.appendChild(giveUp);
}

