// ============================================
// 打字肉鸽 - 商店系统（统一5商品）
// ============================================
// Epic 17: 统一商店 + 刷新/锁定/卖出 + 拖拽交互

import { state } from '../core/state';
import { resolveRelicEffects, queryRelicFlag } from './relics/RelicPipeline';
import { KEYS, KEYBOARD_ROWS } from '../core/constants';
import { SKILLS, SYNERGY_TYPES, getSkillSchool, getEvolutionBranches, EVOLUTIONS, getSkillDisplayInfo } from '../data/skills';
import { PRODUCERS } from '../data/producers';
import { CONVERTERS } from '../data/converters';
import { calculateDeckStats, generateShopWords } from '../data/words';
import { getElements } from '../ui/elements';
import { playSound } from '../effects/sound';
import { juiceUp } from '../effects/juice';
import { showScreen, startLevel, renderRelicDisplay, showFeedback } from './battle';
import type { ShopItem } from '../core/types';
import { getNextBattleNode, getStageType, isRestNode, TOTAL_NODES } from './stage/stageFlow';
import { openRestStage } from './restStage';
import { calculateLetterFrequency, letterFrequencyToScore } from './letters/LetterFrequencySystem';
import { keyTooltip } from '../ui/keyboard/KeyTooltip';
import type { KeyTooltipData } from '../ui/keyboard/KeyTooltip';
import { dragManager } from './dragManager';
import type { DragPayload } from './dragManager';

// === 打开商店 ===
export function openShop(_won: boolean): void {
  state.phase = 'shop';
  const el = getElements();

  // 遗物效果：通过管道解析 on_battle_end 金币加成
  const goldRelicResult = resolveRelicEffects('on_battle_end', { overkill: state.overkill });
  const relicGold = Math.floor(goldRelicResult.effects.gold);

  // 金币奖励：基础 20（精英关 ×2）+ 剩余时间秒数 + 遗物金币
  const currentType = getStageType(state.level);
  const baseGold = currentType === 'elite' ? 40 : 20;
  const timeBonus = Math.floor(state.time);
  const bonus = timeBonus + relicGold;
  state.gold += baseGold + bonus;

  el.shopLevelNum.textContent = String(state.level);
  el.shopScore.textContent = String(state.score);
  el.shopTarget.textContent = String(state.targetScore);
  el.shopBonus.textContent = bonus > 0 ? `+${bonus}` : '0';
  updateGoldDisplay();

  // 保留锁定商品，补充新商品至5个
  const locked = state.shop.items.filter(item => item.locked);
  const newItems = generateShopItems(5 - locked.length);
  state.shop.items = [...locked, ...newItems];
  state.shop.refreshCount = 0;

  renderUnifiedShop();
  renderBuildManager();  // 内部自动注册 drop zones
  renderRelicDisplay();
  dragManager.init();
  showScreen('shop');
}

// === 金币显示 ===
function updateGoldDisplay(): void {
  const el = getElements();
  el.shopGold.textContent = String(state.gold);
}

// === 价格调整 ===
function getAdjustedPrice(baseCost: number): number {
  const discount = (queryRelicFlag('price_discount') as number) || 0;
  const greedyMult = (queryRelicFlag('greedy_hand') as number) || 1;
  return Math.ceil(baseCost * (1 - discount) * greedyMult);
}

// === Fisher-Yates shuffle ===
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// === 生成统一商品 ===
function generateShopItems(count: number): ShopItem[] {
  if (count <= 0) return [];

  const isSilenced = queryRelicFlag('silence_vow') === true;
  const items: ShopItem[] = [];
  let nextId = Date.now();

  // 构建技能池
  const skillPool: ShopItem[] = [];
  if (!isSilenced) {
    const owned = [...state.player.skills.keys()];
    const poolConverterIds = state.converterPool.filter(id => id in CONVERTERS);
    const allSkillIds = [...Object.keys(SKILLS), ...Object.keys(PRODUCERS), ...poolConverterIds];
    const unowned = allSkillIds.filter(id => !owned.includes(id));

    // 新技能
    const shuffledNew = shuffleArray(unowned);
    for (const skillId of shuffledNew) {
      skillPool.push({
        id: `si-${nextId++}`,
        type: 'skill',
        skillId,
        cost: getAdjustedPrice(15 + Math.floor(Math.random() * 15)),
        isUpgrade: false,
        locked: false,
      });
    }

    // 升级已有技能（未满级的）
    const upgradable = owned.filter(id => {
      const data = state.player.skills.get(id);
      return data && data.level < 3;
    });
    const shuffledUpgrade = shuffleArray(upgradable);
    for (const skillId of shuffledUpgrade) {
      skillPool.push({
        id: `si-${nextId++}`,
        type: 'skill',
        skillId,
        cost: getAdjustedPrice(25),
        isUpgrade: true,
        locked: false,
      });
    }
  }

  // 构建词语池
  const wordPool: ShopItem[] = [];
  const shopWords = generateShopWords(state.player.wordDeck);
  for (const sw of shopWords) {
    wordPool.push({
      id: `si-${nextId++}`,
      type: 'word',
      word: sw.word,
      cost: getAdjustedPrice(sw.cost),
      isUpgrade: false,
      locked: false,
      highlight: sw.highlight,
    });
  }

  // 保底：≥1 技能 + ≥1 词语（如果有的话）
  if (count >= 2 && skillPool.length > 0 && wordPool.length > 0) {
    items.push(skillPool.splice(0, 1)[0]);
    items.push(wordPool.splice(0, 1)[0]);
  } else if (skillPool.length > 0 && wordPool.length === 0) {
    items.push(skillPool.splice(0, 1)[0]);
  } else if (wordPool.length > 0) {
    items.push(wordPool.splice(0, 1)[0]);
  }

  // 合并剩余池，随机填满
  const remaining = shuffleArray([...skillPool, ...wordPool]);
  while (items.length < count && remaining.length > 0) {
    items.push(remaining.shift()!);
  }

  return items;
}

// === 渲染统一商店 ===
function renderUnifiedShop(): void {
  const el = getElements();
  el.shopTabs.innerHTML = '';
  el.rewardCards.innerHTML = '';

  // 顶部：词库统计
  const stats = calculateDeckStats(state.player.wordDeck);
  const boundKeys = [...state.player.bindings.keys()];
  const statsRow = document.createElement('div');
  statsRow.className = 'deck-stats-panel';
  statsRow.innerHTML = `
    <div class="deck-stats-header">
      <span>📚 ${stats.totalWords}词 · 均长${stats.avgLength}</span>
      <span>高频: ${stats.topLetters.slice(0, 4).map(([l, p]) =>
        `<span class="${boundKeys.includes(l) ? 'highlight-letter' : ''}">${l.toUpperCase()}:${p}%</span>`
      ).join(' ')}</span>
    </div>
  `;
  el.rewardCards.appendChild(statsRow);

  // 刷新按钮
  const refreshCost = (state.shop.refreshCount + 1) * 5;
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'shop-refresh-btn';
  refreshBtn.innerHTML = `🔄 刷新 (💰${refreshCost})`;
  if (state.gold < refreshCost) refreshBtn.classList.add('cannot-afford');
  refreshBtn.onclick = () => refreshShop();
  el.shopTabs.appendChild(refreshBtn);

  // 5个商品卡片
  state.shop.items.forEach((item, index) => {
    renderUnifiedShopCard(item, index);
  });

  // 进化提示卡片：Lv3 且有进化分支且尚未进化的技能
  state.player.skills.forEach((data, skillId) => {
    if (data.level < 3) return;
    if (state.player.evolvedSkills.has(skillId)) return;
    const branches = getEvolutionBranches(skillId);
    if (branches.length === 0) return;
    const sk = SKILLS[skillId];
    if (!sk) return;
    const school = getSkillSchool(skillId);
    renderShopCard(sk.icon, `${sk.name} 可进化!`, '选择一条进化路线', 0, `${school.label}·进化`, 'evolution-card', () => {
      renderEvolutionModal(skillId, false);
    });
  });
}

// === 渲染统一商品卡片 ===
function renderUnifiedShopCard(item: ShopItem, index: number): void {
  const el = getElements();
  const card = document.createElement('div');
  card.className = 'reward-card';
  card.dataset.shopIndex = String(index);
  card.dataset.dragType = 'shop-item';

  const canAfford = state.gold >= item.cost;
  if (!canAfford) card.classList.add('cannot-afford');

  if (item.type === 'skill') {
    const sk = SKILLS[item.skillId!] || PRODUCERS[item.skillId!];
    if (!sk) return;
    const school = getSkillSchool(item.skillId!);
    const lvl = state.player.skills.get(item.skillId!)?.level || 1;
    const display = getSkillDisplayInfo(item.skillId!, state.player.evolvedSkills, lvl);

    let nameLabel = display.name;
    let typeLabel = school.label;
    if (item.isUpgrade) {
      nameLabel = `${display.name} (升级 Lv.${lvl}→${lvl + 1})`;
      typeLabel = `${school.label}·升级`;
    }

    card.innerHTML = `
      <div class="reward-icon">${display.icon}</div>
      <div class="reward-info">
        <div class="reward-name">${nameLabel}</div>
        <div class="reward-desc">${display.desc}</div>
      </div>
      <div class="reward-cost">💰${item.cost}</div>
      <div class="reward-type ${school.cssClass}">${typeLabel}</div>
      <span class="lock-toggle ${item.locked ? 'locked' : ''}">${item.locked ? '🔒' : '🔓'}</span>
    `;
  } else {
    // Word item
    const highlightedWord = item.word!.split('').map(c =>
      [...state.player.bindings.keys()].includes(c.toLowerCase())
        ? `<span class="bound-letter">${c}</span>` : c
    ).join('');

    card.innerHTML = `
      <div class="reward-icon">📝</div>
      <div class="reward-info">
        <div class="reward-name word-text">${highlightedWord}</div>
        <div class="reward-desc">${item.word!.length}字母${item.highlight ? ` · 高频${item.highlight.toUpperCase()}` : ''}</div>
      </div>
      <div class="reward-cost">💰${item.cost}</div>
      <div class="reward-type word-type">词语</div>
      <span class="lock-toggle ${item.locked ? 'locked' : ''}">${item.locked ? '🔒' : '🔓'}</span>
    `;
  }

  // 锁定按钮事件
  const lockBtn = card.querySelector('.lock-toggle') as HTMLElement;
  if (lockBtn) {
    lockBtn.onclick = (e) => {
      e.stopPropagation();
      item.locked = !item.locked;
      lockBtn.textContent = item.locked ? '🔒' : '🔓';
      lockBtn.classList.toggle('locked', item.locked);
    };
  }

  // 3D 卡牌悬停效果
  init3DCardEffect(card);

  card.onclick = () => {
    juiceUp(card, 0.2, 3);
    purchaseShopItem(index);
  };

  el.rewardCards.appendChild(card);
}

// === 核心购买逻辑（共享） ===
// 返回购买的 skillId（技能）或 null（词语/失败），供调用者做后续绑定/进化
function executePurchase(index: number): { skillId: string | null; isNew: boolean } | null {
  const item = state.shop.items[index];
  if (!item) return null;

  if (state.gold < item.cost) {
    showFeedback('金币不足!', '#ff6b6b');
    return null;
  }

  if (item.type === 'skill') {
    const skillId = item.skillId!;

    // 隐士上限检查（新技能）
    if (!item.isUpgrade) {
      const hermitCapped = state.player.evolvedSkills.get('lone') === 'lone_hermit' && state.player.skills.size >= 4;
      if (hermitCapped) {
        showFeedback('隐士: 技能上限 4!', '#ff6b6b');
        return null;
      }
    }

    state.gold -= item.cost;
    updateGoldDisplay();
    playSound('skill');

    const isNew = !item.isUpgrade;
    if (item.isUpgrade) {
      const data = state.player.skills.get(skillId);
      if (data) {
        data.level++;
        data.purchasePrice = (data.purchasePrice || 0) + item.cost;
      }
      showFeedback(`${(SKILLS[skillId] || PRODUCERS[skillId])?.name} 升级!`, '#ffe66d');
    } else {
      state.player.skills.set(skillId, { level: 1, purchasePrice: item.cost });
      showFeedback(`获得 ${(SKILLS[skillId] || PRODUCERS[skillId])?.name}!`, '#4ecdc4');
    }

    state.shop.items.splice(index, 1);
    return { skillId, isNew };
  } else {
    // 词语
    state.gold -= item.cost;
    updateGoldDisplay();
    playSound('skill');
    state.player.wordDeck.push(item.word!);
    showFeedback(`+${item.word}`, '#4ecdc4');

    state.shop.items.splice(index, 1);
    return { skillId: null, isNew: false };
  }
}

// === 点击购买商品 ===
function purchaseShopItem(index: number): void {
  const result = executePurchase(index);
  if (!result) return;

  // 点击购买新技能时，自动绑定到第一个空键位
  if (result.isNew && result.skillId) {
    const freeKey = KEYS.find(k => !state.player.bindings.has(k));
    if (freeKey) state.player.bindings.set(freeKey, result.skillId);
  }

  if (result.skillId) checkAutoEvolution(result.skillId);

  renderUnifiedShop();
  renderBuildManager();
}

// === 自动进化检查 ===
function checkAutoEvolution(skillId: string): void {
  const data = state.player.skills.get(skillId);
  if (!data || data.level < 3) return;
  if (state.player.evolvedSkills.has(skillId)) return;
  const branches = getEvolutionBranches(skillId);
  if (branches.length === 0) return;

  // 自动弹出免费进化选择
  renderEvolutionModal(skillId, true);
}

// === 刷新商店 ===
function refreshShop(): void {
  const cost = (state.shop.refreshCount + 1) * 5;
  if (state.gold < cost) {
    showFeedback('金币不足!', '#ff6b6b');
    return;
  }
  state.gold -= cost;
  state.shop.refreshCount++;
  updateGoldDisplay();
  playSound('skill');

  // 保留锁定项，替换未锁定项
  const locked = state.shop.items.filter(item => item.locked);
  const newItems = generateShopItems(5 - locked.length);
  state.shop.items = [...locked, ...newItems];

  renderUnifiedShop();
}

// === 卖出技能 ===
export function sellSkill(skillId: string): void {
  const data = state.player.skills.get(skillId);
  if (!data) return;

  const sellPrice = Math.floor((data.purchasePrice || 15) / 2);
  state.gold += sellPrice;

  // 移除绑定
  for (const [key, id] of state.player.bindings) {
    if (id === skillId) {
      state.player.bindings.delete(key);
      break;
    }
  }

  // 移除进化
  state.player.evolvedSkills.delete(skillId);

  // 移除技能
  state.player.skills.delete(skillId);

  updateGoldDisplay();
  showFeedback(`卖出 +${sellPrice}💰`, '#ffe66d');
  playSound('skill');
  renderUnifiedShop();
  renderBuildManager();
}

// === 卖出词语 ===
export function sellWord(index: number): void {
  if (index < 0 || index >= state.player.wordDeck.length) return;
  const word = state.player.wordDeck[index];
  state.gold += 3;
  state.player.wordDeck.splice(index, 1);
  updateGoldDisplay();
  showFeedback(`-${word} +3💰`, '#ffe66d');
  playSound('skill');
  renderUnifiedShop();
  renderBuildManager();
}

// === 进化模态框 ===
function renderEvolutionModal(skillId: string, isFree: boolean): void {
  const modal = document.getElementById('evolution-modal');
  const titleEl = document.getElementById('evolution-title');
  const branchesEl = document.getElementById('evolution-branches');
  const cancelBtn = document.getElementById('evolution-cancel');
  if (!modal || !titleEl || !branchesEl || !cancelBtn) return;

  const sk = SKILLS[skillId];
  if (!sk) return;

  const branches = getEvolutionBranches(skillId);
  if (branches.length === 0) return;

  titleEl.textContent = isFree
    ? `⚡ 技能进化 — ${sk.name} (免费!) ⚡`
    : `⚡ 技能进化 — ${sk.name} ⚡`;
  branchesEl.innerHTML = '';

  branches.forEach(branch => {
    const cost = isFree ? 0 : getAdjustedPrice(branch.condition.goldCost);
    const canAfford = isFree || state.gold >= cost;

    const card = document.createElement('div');
    card.className = `evolution-branch${canAfford ? '' : ' cannot-afford'}`;
    card.innerHTML = `
      <div class="evolution-branch-icon">${branch.icon}</div>
      <div class="evolution-branch-name">${branch.name}</div>
      <div class="evolution-branch-desc">${branch.description}</div>
      <div class="evolution-branch-flavor">"${branch.flavorText || ''}"</div>
      <div class="evolution-branch-cost">${isFree ? '✨ 免费' : `💰 ${cost}`}</div>
    `;

    card.onclick = () => {
      if (!canAfford) {
        showFeedback('金币不足!', '#ff6b6b');
        return;
      }
      evolveSkill(skillId, branch.id, cost);
    };

    branchesEl.appendChild(card);
  });

  cancelBtn.onclick = closeEvolutionModal;
  const overlay = modal.querySelector('.evolution-overlay') as HTMLElement;
  if (overlay) overlay.onclick = closeEvolutionModal;
  modal.classList.remove('evolution-hidden');
}

function closeEvolutionModal(): void {
  const modal = document.getElementById('evolution-modal');
  if (modal) modal.classList.add('evolution-hidden');
}

function evolveSkill(skillId: string, branchId: string, cost: number): void {
  if (cost > 0 && state.gold < cost) return;
  if (cost > 0) state.gold -= cost;
  state.player.evolvedSkills.set(skillId, branchId);
  updateGoldDisplay();

  const evo = EVOLUTIONS[branchId];
  if (evo) {
    showFeedback(`进化! ${evo.icon} ${evo.name}`, '#ffe66d');
  }
  playSound('skill');
  closeEvolutionModal();
  renderUnifiedShop();
  renderBuildManager();
}

// === 获取技能显示信息（进化后使用进化数据） ===
export function getSkillDisplay(skillId: string): { name: string; icon: string; desc: string } {
  const level = state.player.skills.get(skillId)?.level || 1;
  return getSkillDisplayInfo(skillId, state.player.evolvedSkills, level);
}

// === 商店卡片渲染（保留给进化提示卡） ===
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
  if (typeClass === 'evolution-card') card.classList.add('evolution-card');

  const canAfford = cost === 0 || state.gold >= cost;
  if (!canAfford) card.classList.add('cannot-afford');

  card.innerHTML = `
    <div class="reward-icon">${icon}</div>
    <div class="reward-info">
      <div class="reward-name">${name}</div>
      <div class="reward-desc">${desc}</div>
    </div>
    ${cost > 0 ? `<div class="reward-cost">💰${cost}</div>` : ''}
    <div class="reward-type ${typeClass}">${typeLabel}</div>
  `;

  init3DCardEffect(card);

  card.onclick = () => {
    juiceUp(card, 0.2, 3);
    onClick();
  };

  el.rewardCards.appendChild(card);
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

export function renderBuildManager(): void {
  const el = getElements();
  el.boundGrid.innerHTML = '';

  // 计算字频（一次遍历），再导出底分
  const letterFreqs = calculateLetterFrequency(state.player.wordDeck);
  const letterScores = new Map<string, number>();
  letterFreqs.forEach((count, letter) => {
    const score = letterFrequencyToScore(count);
    if (score > 0) letterScores.set(letter, score);
  });

  KEYBOARD_ROWS.forEach((row, rowIndex) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'keyboard-row';
    rowDiv.dataset.row = String(rowIndex);

    row.forEach(k => {
      const slot = document.createElement('div');
      slot.className = 'key-slot';
      slot.dataset.key = k;

      const score = letterScores.get(k) ?? 0;
      const skillId = state.player.bindings.get(k);

      // 底分分级样式
      if (score >= 6) slot.classList.add('score-high');
      else if (score >= 3) slot.classList.add('score-mid');
      else if (score >= 1) slot.classList.add('score-low');

      // 技能流派底色
      if (skillId && (SKILLS[skillId] || PRODUCERS[skillId])) {
        const display = getSkillDisplay(skillId);
        const school = getSkillSchool(skillId);
        slot.classList.add('has-skill');
        slot.dataset.dragType = 'skill-key';
        slot.dataset.boundSkill = skillId;
        if (isSynergySkill(skillId)) slot.classList.add('synergy-skill');
        slot.classList.add(school.cssClass);
        slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span><span class="key-skill">${display.icon}</span>${score > 0 ? `<span class="key-score">${score}</span>` : ''}`;
      } else {
        slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span>${score > 0 ? `<span class="key-score">${score}</span>` : ''}`;
      }

      // Tooltip 悬停
      slot.addEventListener('mouseenter', (e: MouseEvent) => {
        const freq = letterFreqs.get(k) ?? 0;
        const tooltipData: KeyTooltipData = {
          letter: k,
          score,
          frequency: freq,
        };
        if (skillId && (SKILLS[skillId] || PRODUCERS[skillId])) {
          const display = getSkillDisplay(skillId);
          const school = getSkillSchool(skillId);
          const lvl = state.player.skills.get(skillId)?.level ?? 1;
          tooltipData.skill = {
            name: display.name,
            icon: display.icon,
            description: display.desc,
            level: lvl,
            school: school.label,
            schoolCssClass: school.cssClass,
          };
        }
        keyTooltip.show(e.clientX, e.clientY, tooltipData);
      });
      slot.addEventListener('mouseleave', () => {
        keyTooltip.hide();
      });

      rowDiv.appendChild(slot);
    });

    el.boundGrid.appendChild(rowDiv);
  });

  // 已拥有技能
  el.ownedSkills.innerHTML = '';
  if (state.player.skills.size === 0) {
    el.ownedSkills.innerHTML = '<div style="color:#444;font-size:11px;">购买技能开始构筑</div>';
    registerShopDropZones();
    return;
  }

  state.player.skills.forEach((data, skillId) => {
    const sk = SKILLS[skillId] || PRODUCERS[skillId];
    if (!sk) return;

    const display = getSkillDisplay(skillId);
    const boundKey = [...state.player.bindings.entries()].find(([, id]) => id === skillId)?.[0];

    const item = document.createElement('div');
    item.className = 'inventory-skill';
    item.dataset.dragType = 'skill-inventory';
    item.dataset.skillId = skillId;
    if (boundKey) item.classList.add('bound');
    if (isSynergySkill(skillId)) item.classList.add('synergy');

    const school = getSkillSchool(skillId);
    const evolvedLabel = state.player.evolvedSkills.has(skillId) ? '<span class="inv-evolved">★</span>' : '';
    const sellPrice = Math.floor((data.purchasePrice || 15) / 2);
    item.innerHTML = `
      <span class="inv-icon">${display.icon}</span>
      <span class="inv-name">${display.name}</span>
      ${evolvedLabel}
      <span class="inv-school ${school.cssClass}">${school.label}</span>
      ${data.level > 1 ? `<span class="inv-level">Lv.${data.level}</span>` : ''}
      ${boundKey ? `<span class="inv-key">[${boundKey.toUpperCase()}]</span>` : ''}
      <span class="inv-sell" data-sell-skill="${skillId}">卖${sellPrice}💰</span>
    `;

    item.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('inv-sell')) {
        sellSkill(skillId);
      }
    });
    el.ownedSkills.appendChild(item);
  });

  // DOM 重建后自动重注册拖拽放置区
  registerShopDropZones();
}

// === 注册拖拽放置区 ===
function registerShopDropZones(): void {
  dragManager.clearDropZones();

  // 1. 键位 slot — 接受 shop-item(技能)、skill-inventory、skill-key
  const keySlots = document.querySelectorAll('.key-slot') as NodeListOf<HTMLElement>;
  keySlots.forEach(slot => {
    const key = slot.dataset.key || '';
    dragManager.registerDropZone({
      element: slot,
      type: 'key-slot',
      key,
      accepts: (payload: DragPayload) => {
        if (queryRelicFlag('silence_vow') === true) return false;
        if (payload.type === 'shop-item') {
          // 只接受技能类商品
          const item = state.shop.items[payload.itemIndex ?? -1];
          return item?.type === 'skill';
        }
        return payload.type === 'skill-inventory' || payload.type === 'skill-key';
      },
      onDrop: (payload: DragPayload) => {
        handleDropOnKey(key, payload);
      },
    });
  });

  // 2. 卖出区 — 接受 skill-inventory、skill-key
  const sellZone = document.getElementById('sell-zone');
  if (sellZone) {
    dragManager.registerDropZone({
      element: sellZone,
      type: 'sell-zone',
      accepts: (payload: DragPayload) => {
        return payload.type === 'skill-inventory' || payload.type === 'skill-key';
      },
      onDrop: (payload: DragPayload) => {
        const skillId = payload.skillId;
        if (skillId) {
          sellSkill(skillId);
        }
      },
    });
  }
}

// === 拖拽到键位处理 ===
function handleDropOnKey(targetKey: string, payload: DragPayload): void {
  if (payload.type === 'shop-item') {
    // 从商店拖拽技能到键位 → 购买并绑定
    const index = payload.itemIndex ?? -1;
    const item = state.shop.items[index];
    if (!item || item.type !== 'skill') return;

    const skillId = item.skillId!;
    const result = executePurchase(index);
    if (!result) return;

    // 绑定到目标键位（交换现有技能）
    const existingSkill = state.player.bindings.get(targetKey);
    for (const [k, id] of state.player.bindings) {
      if (id === skillId) {
        if (existingSkill) state.player.bindings.set(k, existingSkill);
        else state.player.bindings.delete(k);
        break;
      }
    }
    state.player.bindings.set(targetKey, skillId);

    if (result.skillId) checkAutoEvolution(result.skillId);
    renderUnifiedShop();
    renderBuildManager();
  } else if (payload.type === 'skill-inventory' || payload.type === 'skill-key') {
    // 拖拽已有技能到键位 → 绑定/交换
    const skillId = payload.skillId;
    if (!skillId) return;

    const existingSkill = state.player.bindings.get(targetKey);
    const sourceKey = payload.sourceKey ||
      [...state.player.bindings.entries()].find(([, id]) => id === skillId)?.[0];

    // 移除源位置的绑定
    if (sourceKey) {
      if (existingSkill) {
        state.player.bindings.set(sourceKey, existingSkill);
      } else {
        state.player.bindings.delete(sourceKey);
      }
    }

    state.player.bindings.set(targetKey, skillId);
    playSound('skill');

    renderBuildManager();
  }
}

// === 初始化商店事件 ===
export function initShopEvents(): void {
  const el = getElements();
  el.startBattleBtn.onclick = () => {
    dragManager.destroy();
    // 检测下一节点是否为休息关
    const nextNode = state.level + 1;
    if (nextNode <= TOTAL_NODES && isRestNode(nextNode)) {
      state.level = nextNode;
      openRestStage();
    } else {
      const nextBattle = getNextBattleNode(state.level);
      if (nextBattle === -1 || nextBattle > TOTAL_NODES) {
        return;
      }
      state.level = nextBattle;
      void startLevel();
    }
  };
}
