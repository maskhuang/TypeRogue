// ============================================
// 打字肉鸽 - 商店系统
// ============================================

import { state } from '../core/state';
import { resolveRelicEffects, queryRelicFlag } from './relics/RelicPipeline';
import { KEYS, KEYBOARD_ROWS, ADJACENT_KEYS } from '../core/constants';
import { SKILLS, SYNERGY_TYPES, getSkillSchool } from '../data/skills';
import { RELICS } from '../data/relics';
import { calculateDeckStats, generateShopWords } from '../data/words';
import { getElements } from '../ui/elements';
import { playSound } from '../effects/sound';
import { juiceUp } from '../effects/juice';
import { showScreen, startLevel, renderRelicDisplay, showFeedback } from './battle';
import type { ShopSkillItem } from '../core/types';
import { upgradeLetter, getLetterLevel, getUpgradeCost } from './letters/LetterUpgradeSystem';

// === 打开商店 ===
export function openShop(_won: boolean): void {
  state.phase = 'shop';
  const el = getElements();

  // 遗物效果：通过管道解析 on_battle_end 金币加成
  const goldRelicResult = resolveRelicEffects('on_battle_end', { overkill: state.overkill });
  const relicGold = Math.floor(goldRelicResult.effects.gold);

  // 金币奖励：基础 20 + 剩余时间秒数 + 遗物金币
  const baseGold = 20;
  const timeBonus = Math.floor(state.time);
  const bonus = timeBonus + relicGold;
  state.gold += baseGold + bonus;

  el.shopLevelNum.textContent = String(state.level);
  el.shopScore.textContent = String(state.score);
  el.shopTarget.textContent = String(state.targetScore);
  el.shopBonus.textContent = bonus > 0 ? `+${bonus}` : '0';
  updateGoldDisplay();

  state.shop.tab = 'skills';
  state.shop.selectedSkill = null;
  state.shop.selectedKey = null;
  state.shop.shopWords = [];
  state.shop.shopSkills = generateShopSkills();
  state.shop.shopRelics = generateShopRelics();
  state.shop.freeLetterUpgrade = true;
  state.shop.freeLetterOptions = generateFreeLetterOptions();
  state.shop.removeCount = 0;

  renderShopTabs();
  renderShopContent();
  renderBuildManager();
  renderRelicDisplay();
  showScreen('shop');
}

// === 金币显示 ===
function updateGoldDisplay(): void {
  const el = getElements();
  el.shopGold.textContent = String(state.gold);
}

// === 价格调整 ===
function getAdjustedPrice(baseCost: number): number {
  const discount = queryRelicFlag('price_discount') as number; // lucky_coin: 0.1 or 0
  const greedyMult = queryRelicFlag('greedy_hand') as number; // greedy_hand: 1.5 or 1
  return Math.ceil(baseCost * (1 - discount) * greedyMult);
}

// === 商店标签 ===
function renderShopTabs(): void {
  const el = getElements();
  el.shopTabs.innerHTML = `
    <button class="shop-tab ${state.shop.tab === 'skills' ? 'active' : ''}" data-tab="skills">⚡ 技能</button>
    <button class="shop-tab ${state.shop.tab === 'relics' ? 'active' : ''}" data-tab="relics">🏺 遗物</button>
    <button class="shop-tab ${state.shop.tab === 'deck' ? 'active' : ''}" data-tab="deck">📚 牌库</button>
    <button class="shop-tab ${state.shop.tab === 'letters' ? 'active' : ''}" data-tab="letters">🔤 字母</button>
  `;

  el.shopTabs.querySelectorAll('.shop-tab').forEach(btn => {
    (btn as HTMLElement).onclick = () => {
      state.shop.tab = (btn as HTMLElement).dataset.tab as 'skills' | 'relics' | 'deck' | 'letters';
      renderShopTabs();
      renderShopContent();
    };
  });
}

// === 商店内容 ===
function renderShopContent(): void {
  switch (state.shop.tab) {
    case 'skills':
      renderSkillShop();
      break;
    case 'relics':
      renderRelicShop();
      break;
    case 'deck':
      renderDeckShop();
      break;
    case 'letters':
      renderLetterShop();
      break;
  }
}

// === 生成商店技能 ===
function generateShopSkills(): ShopSkillItem[] {
  const owned = [...state.player.skills.keys()];
  const unowned = Object.keys(SKILLS).filter(id => !owned.includes(id));
  const items: ShopSkillItem[] = [];

  // 新技能
  const shuffled = unowned.sort(() => Math.random() - 0.5).slice(0, 3);
  shuffled.forEach(skillId => {
    items.push({
      type: 'new',
      skillId,
      cost: 15 + Math.floor(Math.random() * 15),
    });
  });

  // 升级已有技能
  if (owned.length > 0) {
    const upgradeId = owned[Math.floor(Math.random() * owned.length)];
    items.push({
      type: 'upgrade',
      skillId: upgradeId,
      cost: 25,
    });
  }

  return items;
}

// === 技能商店 ===
function renderSkillShop(): void {
  const el = getElements();
  el.rewardCards.innerHTML = '';

  // 沉默誓约：禁止购买技能
  if (queryRelicFlag('silence_vow') === true) {
    el.rewardCards.innerHTML = '<div class="shop-empty">🤫 沉默誓约：无法购买技能</div>';
    return;
  }

  state.shop.shopSkills.forEach(item => {
    const sk = SKILLS[item.skillId];
    if (!sk) return;

    // 检查是否已拥有
    if (item.type === 'new' && state.player.skills.has(item.skillId)) return;

    const adjustedCost = getAdjustedPrice(item.cost);

    if (item.type === 'new') {
      const school = getSkillSchool(item.skillId);
      renderShopCard(sk.icon, sk.name, sk.desc, adjustedCost, school.label, school.cssClass, () => {
        if (buyItem(adjustedCost)) {
          state.player.skills.set(item.skillId, { level: 1 });
          const freeKey = KEYS.find(k => !state.player.bindings.has(k));
          if (freeKey) state.player.bindings.set(freeKey, item.skillId);
          renderShopContent();
          renderBuildManager();
        }
      });
    } else if (item.type === 'upgrade') {
      const lvl = state.player.skills.get(item.skillId)?.level || 1;
      const school = getSkillSchool(item.skillId);
      renderShopCard(sk.icon, `${sk.name} → Lv.${lvl + 1}`, '效果提升', adjustedCost, `${school.label}·升级`, school.cssClass, () => {
        if (buyItem(adjustedCost)) {
          const data = state.player.skills.get(item.skillId);
          if (data) data.level++;
          renderShopContent();
        }
      });
    }
  });

  if (el.rewardCards.children.length === 0) {
    el.rewardCards.innerHTML = '<div class="shop-empty">没有可购买的技能</div>';
  }
}

// === 生成商店遗物 ===
function generateShopRelics(): string[] {
  const ownedRelics = state.player.relics;
  const available = Object.keys(RELICS).filter(id => !ownedRelics.has(id));
  return available.sort(() => Math.random() - 0.5).slice(0, 3);
}

// === 遗物商店 ===
function renderRelicShop(): void {
  const el = getElements();
  el.rewardCards.innerHTML = '';

  let hasItems = false;
  state.shop.shopRelics.forEach(relicId => {
    if (state.player.relics.has(relicId)) return;

    const relic = RELICS[relicId];
    if (!relic) return;

    hasItems = true;
    const isRiskReward = relic.category === 'risk-reward';
    const typeLabel = isRiskReward ? `${relic.rarity}·risk` : relic.rarity;
    const typeClass = isRiskReward ? 'risk-reward' : (relic.rarity || 'common');
    const adjustedCost = getAdjustedPrice(relic.basePrice);
    renderShopCard(relic.icon, relic.name, relic.description, adjustedCost, typeLabel, typeClass, () => {
      if (buyItem(adjustedCost)) {
        state.player.relics.add(relicId);
        showFeedback(`获得 ${relic.name}!`, '#ffe66d');
        renderShopContent();
        renderRelicDisplay();
      }
    });
  });

  if (!hasItems) {
    el.rewardCards.innerHTML = '<div class="shop-empty">已收集所有遗物!</div>';
  }
}

// === 牌库商店 ===
function renderDeckShop(): void {
  const el = getElements();
  el.rewardCards.innerHTML = '';

  const stats = calculateDeckStats(state.player.wordDeck);
  const boundKeys = [...state.player.bindings.keys()];

  // 统计面板
  const statsPanel = document.createElement('div');
  statsPanel.className = 'deck-stats-panel';
  statsPanel.innerHTML = `
    <div class="deck-stats-header">
      <span>📚 词库统计</span>
      <span class="deck-count">${stats.totalWords} 词</span>
    </div>
    <div class="deck-stats-info">
      <span>平均长度: ${stats.avgLength}</span>
      <span>|</span>
      <span>高频: ${stats.topLetters.slice(0, 5).map(([l, p]) =>
        `<span class="${boundKeys.includes(l) ? 'highlight-letter' : ''}">${l.toUpperCase()}:${p}%</span>`
      ).join(' ')}</span>
    </div>
  `;
  el.rewardCards.appendChild(statsPanel);

  // 购买词语区
  const buySection = document.createElement('div');
  buySection.className = 'deck-section';
  buySection.innerHTML = '<div class="deck-section-title">🛒 购买词语</div>';

  // 生成商店词语
  if (state.shop.shopWords.length === 0) {
    state.shop.shopWords = generateShopWords(state.player.wordDeck);
  }

  const buyGrid = document.createElement('div');
  buyGrid.className = 'word-grid';

  state.shop.shopWords.forEach((item, idx) => {
    const wordCard = document.createElement('div');
    wordCard.className = 'word-card buyable';
    if (item.highlight && boundKeys.includes(item.highlight)) {
      wordCard.classList.add('recommended');
    }

    const highlightedWord = item.word.split('').map(c =>
      boundKeys.includes(c.toLowerCase()) ? `<span class="bound-letter">${c}</span>` : c
    ).join('');

    const adjustedWordCost = getAdjustedPrice(item.cost);
    wordCard.innerHTML = `
      <span class="word-text">${highlightedWord}</span>
      <span class="word-cost">💰${adjustedWordCost}</span>
    `;

    wordCard.onclick = () => {
      if (buyItem(adjustedWordCost)) {
        state.player.wordDeck.push(item.word);
        state.shop.shopWords.splice(idx, 1);
        showFeedback(`+${item.word}`, '#4ecdc4');
        renderDeckShop();
      }
    };

    buyGrid.appendChild(wordCard);
  });

  buySection.appendChild(buyGrid);
  el.rewardCards.appendChild(buySection);

  // 当前词库区
  const removeCost = getAdjustedPrice(state.shop.removeCount + 1);
  const deckSection = document.createElement('div');
  deckSection.className = 'deck-section';
  deckSection.innerHTML = `<div class="deck-section-title">📖 我的词库 (点击移除，费用: 💰${removeCost})</div>`;

  const deckGrid = document.createElement('div');
  deckGrid.className = 'word-grid deck-grid';

  state.player.wordDeck.forEach((word, idx) => {
    const wordCard = document.createElement('div');
    wordCard.className = 'word-card owned';

    const highlightedWord = word.split('').map(c =>
      boundKeys.includes(c.toLowerCase()) ? `<span class="bound-letter">${c}</span>` : c
    ).join('');

    const canAfford = state.gold >= removeCost;
    if (!canAfford) wordCard.classList.add('cannot-afford');

    wordCard.innerHTML = `<span class="word-text">${highlightedWord}</span><span class="word-cost">-${removeCost}</span>`;

    wordCard.onclick = () => {
      if (state.gold < removeCost) {
        showFeedback('金币不足!', '#ff6b6b');
        return;
      }
      state.player.wordDeck.splice(idx, 1);
      state.gold -= removeCost;
      state.shop.removeCount++;
      updateGoldDisplay();
      showFeedback(`-${word} -${removeCost}💰`, '#ff6b6b');
      renderDeckShop();
    };

    deckGrid.appendChild(wordCard);
  });

  deckSection.appendChild(deckGrid);
  el.rewardCards.appendChild(deckSection);
}

// === 字母升级商店 ===
const LETTER_LEVEL_CLASSES = ['', 'lv1', 'lv2', 'lv3'];

function generateFreeLetterOptions(): string[] {
  const upgradableKeys = KEYS.filter(k => getLetterLevel(k) < 3);
  return upgradableKeys.sort(() => Math.random() - 0.5).slice(0, Math.min(3, upgradableKeys.length));
}

function renderLetterShop(): void {
  const el = getElements();
  el.rewardCards.innerHTML = '';

  // 免费升级区域
  if (state.shop.freeLetterUpgrade) {
    const freeKeys = state.shop.freeLetterOptions;
    if (freeKeys.length > 0) {
      const freeSection = document.createElement('div');
      freeSection.className = 'letter-free-section';

      freeSection.innerHTML = `<div class="letter-free-title">🎁 免费升级（选择一个）</div>`;
      const freeGrid = document.createElement('div');
      freeGrid.className = 'letter-free-grid';

      freeKeys.forEach(k => {
        const level = getLetterLevel(k);
        const card = document.createElement('div');
        card.className = `letter-card free ${LETTER_LEVEL_CLASSES[level]}`;
        card.innerHTML = `
          <span class="letter-name">${k.toUpperCase()}</span>
          <span class="letter-level">Lv.${level} → ${level + 1}</span>
          <span class="letter-cost free-label">FREE</span>
        `;
        card.onclick = () => {
          upgradeLetter(k);
          state.shop.freeLetterUpgrade = false;
          playSound('skill');
          showFeedback(`${k.toUpperCase()} → Lv.${getLetterLevel(k)}!`, '#ffd700');
          renderLetterShop();
        };
        freeGrid.appendChild(card);
      });

      freeSection.appendChild(freeGrid);
      el.rewardCards.appendChild(freeSection);
    } else {
      const allMaxDiv = document.createElement('div');
      allMaxDiv.className = 'letter-free-section';
      allMaxDiv.innerHTML = '<div class="letter-free-title">🎉 所有字母已满级！</div>';
      el.rewardCards.appendChild(allMaxDiv);
      state.shop.freeLetterUpgrade = false;
    }
  }

  // QWERTY 键盘布局
  const letterGrid = document.createElement('div');
  letterGrid.className = 'letter-grid';

  KEYBOARD_ROWS.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'letter-row';

    row.forEach(k => {
      const level = getLetterLevel(k);
      const cost = getUpgradeCost(k);
      const isMax = cost === null;
      const lvClass = isMax ? 'max' : LETTER_LEVEL_CLASSES[level];
      const card = document.createElement('div');
      card.className = `letter-card ${lvClass}`;

      if (!isMax) {
        const adjustedCost = getAdjustedPrice(cost);
        const canAfford = state.gold >= adjustedCost;
        if (!canAfford) card.classList.add('cannot-afford');

        card.innerHTML = `
          <span class="letter-name">${k.toUpperCase()}</span>
          <span class="letter-level">Lv.${level}</span>
          <span class="letter-cost">💰${adjustedCost}</span>
        `;
        card.onclick = () => {
          if (buyItem(adjustedCost)) {
            upgradeLetter(k);
            showFeedback(`${k.toUpperCase()} → Lv.${getLetterLevel(k)}!`, '#ffd700');
            renderLetterShop();
          }
        };
      } else {
        card.innerHTML = `
          <span class="letter-name">${k.toUpperCase()}</span>
          <span class="letter-level">Lv.${level}</span>
          <span class="letter-cost max-label">MAX</span>
        `;
      }

      rowDiv.appendChild(card);
    });

    letterGrid.appendChild(rowDiv);
  });

  el.rewardCards.appendChild(letterGrid);
}

// === 商店卡片渲染 ===
function renderShopCard(
  icon: string,
  name: string,
  desc: string,
  cost: number,
  typeLabel: string,
  typeClass: string,
  onClick: () => void
): void {
  const el = getElements();
  const card = document.createElement('div');
  card.className = 'reward-card';
  if (typeClass === 'risk-reward') card.classList.add('risk-reward-card');

  const canAfford = state.gold >= cost;
  if (!canAfford) card.classList.add('cannot-afford');

  card.innerHTML = `
    <div class="reward-icon">${icon}</div>
    <div class="reward-info">
      <div class="reward-name">${name}</div>
      <div class="reward-desc">${desc}</div>
    </div>
    <div class="reward-cost">💰${cost}</div>
    <div class="reward-type ${typeClass}">${typeLabel}</div>
  `;

  // 3D 卡牌悬停效果
  init3DCardEffect(card);

  card.onclick = () => {
    juiceUp(card, 0.2, 3);
    onClick();
  };

  el.rewardCards.appendChild(card);
}

// === 购买物品 ===
function buyItem(cost: number): boolean {
  if (state.gold < cost) {
    showFeedback('金币不足!', '#ff6b6b');
    return false;
  }
  state.gold -= cost;
  updateGoldDisplay();
  playSound('skill');
  return true;
}

// === 3D 卡牌效果 ===
function init3DCardEffect(card: HTMLElement): void {
  card.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / centerY * -8;
    const rotateY = (x - centerX) / centerX * 8;
    card.style.transform = `scale(1.03) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
}

// === 构筑管理 ===
function isSynergySkill(skillId: string): boolean {
  const sk = SKILLS[skillId];
  return sk ? SYNERGY_TYPES.includes(sk.type) : false;
}

function renderBuildManager(): void {
  const el = getElements();
  el.boundGrid.innerHTML = '';

  let adjacentKeys: string[] = [];
  if (state.shop.selectedKey) {
    adjacentKeys = ADJACENT_KEYS[state.shop.selectedKey] || [];
  } else if (state.shop.selectedSkill) {
    for (const [k, id] of state.player.bindings) {
      if (id === state.shop.selectedSkill) {
        adjacentKeys = ADJACENT_KEYS[k] || [];
        break;
      }
    }
  }

  KEYBOARD_ROWS.forEach((row, rowIndex) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'keyboard-row';
    rowDiv.dataset.row = String(rowIndex);

    row.forEach(k => {
      const slot = document.createElement('div');
      slot.className = 'key-slot';
      slot.dataset.key = k;

      const skillId = state.player.bindings.get(k);
      if (skillId && SKILLS[skillId]) {
        const sk = SKILLS[skillId];
        slot.classList.add('has-skill');
        if (isSynergySkill(skillId)) slot.classList.add('synergy-skill');
        slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span><span class="key-skill">${sk.icon}</span>`;
      } else {
        slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span>`;
      }

      if (state.shop.selectedKey === k) slot.classList.add('selected');
      if (adjacentKeys.includes(k)) slot.classList.add('adjacent-highlight');

      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        clickKeySlot(k);
      });
      rowDiv.appendChild(slot);
    });

    el.boundGrid.appendChild(rowDiv);
  });

  // 已拥有技能
  el.ownedSkills.innerHTML = '';
  if (state.player.skills.size === 0) {
    el.ownedSkills.innerHTML = '<div style="color:#444;font-size:11px;">购买技能开始构筑</div>';
    return;
  }

  state.player.skills.forEach((data, skillId) => {
    const sk = SKILLS[skillId];
    if (!sk) return;

    const boundKey = [...state.player.bindings.entries()].find(([, id]) => id === skillId)?.[0];

    const item = document.createElement('div');
    item.className = 'inventory-skill';
    if (boundKey) item.classList.add('bound');
    if (state.shop.selectedSkill === skillId) item.classList.add('selected');
    if (isSynergySkill(skillId)) item.classList.add('synergy');

    const school = getSkillSchool(skillId);
    item.innerHTML = `
      <span class="inv-icon">${sk.icon}</span>
      <span class="inv-name">${sk.name}</span>
      <span class="inv-school ${school.cssClass}">${school.label}</span>
      ${data.level > 1 ? `<span class="inv-level">Lv.${data.level}</span>` : ''}
      ${boundKey ? `<span class="inv-key">[${boundKey.toUpperCase()}]</span>` : ''}
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      clickSkill(skillId);
    });
    el.ownedSkills.appendChild(item);
  });
}

function clickKeySlot(key: string): void {
  if (state.shop.selectedSkill && queryRelicFlag('silence_vow') === true) {
    showFeedback('沉默誓约：无法绑定技能', '#ff6b6b');
    state.shop.selectedSkill = null;
    renderBuildManager();
    return;
  }
  if (state.shop.selectedSkill) {
    const existingSkill = state.player.bindings.get(key);
    const oldKey = [...state.player.bindings.entries()].find(([, id]) => id === state.shop.selectedSkill)?.[0];
    if (oldKey) state.player.bindings.delete(oldKey);
    if (existingSkill && oldKey) state.player.bindings.set(oldKey, existingSkill);
    state.player.bindings.set(key, state.shop.selectedSkill);
    state.shop.selectedSkill = null;
    state.shop.selectedKey = null;
    playSound('skill');
  } else {
    state.shop.selectedKey = state.shop.selectedKey === key ? null : key;
    state.shop.selectedSkill = null;
  }
  renderBuildManager();
}

function clickSkill(skillId: string): void {
  if (state.shop.selectedKey && queryRelicFlag('silence_vow') === true) {
    showFeedback('沉默誓约：无法绑定技能', '#ff6b6b');
    state.shop.selectedKey = null;
    renderBuildManager();
    return;
  }
  if (state.shop.selectedKey) {
    const oldKey = [...state.player.bindings.entries()].find(([, id]) => id === skillId)?.[0];
    if (oldKey) state.player.bindings.delete(oldKey);
    const existingSkill = state.player.bindings.get(state.shop.selectedKey);
    if (existingSkill && oldKey) state.player.bindings.set(oldKey, existingSkill);
    state.player.bindings.set(state.shop.selectedKey, skillId);
    state.shop.selectedKey = null;
    state.shop.selectedSkill = null;
    playSound('skill');
  } else {
    state.shop.selectedSkill = state.shop.selectedSkill === skillId ? null : skillId;
    state.shop.selectedKey = null;
  }
  renderBuildManager();
}

// === 初始化商店事件 ===
export function initShopEvents(): void {
  const el = getElements();
  el.startBattleBtn.onclick = () => {
    state.level++;
    startLevel();
  };
}
