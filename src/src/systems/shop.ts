// ============================================
// 打字肉鸽 - 商店系统（统一5商品）
// ============================================
// Epic 17: 统一商店 + 刷新/锁定/卖出 + 拖拽交互

import { state } from '../core/state';
import { resolveRelicEffects, queryRelicFlag } from './relics/RelicPipeline';
import { KEYS, KEYBOARD_ROWS, RESOURCE_LABELS, RESOURCE_ICONS, RESOURCE_COLORS } from '../core/constants';
import { getSkillSchool, getSkillDisplayInfo } from '../data/skills';
import { PRODUCERS, isProducer } from '../data/producers';
import { CONVERTERS, isConverter } from '../data/converters';
import { CONNECTORS, isConnector } from '../data/connectors';
import { ENCHANTMENTS, drawEnchantmentPair } from '../data/enchantments';
import { getKeysWithRelation } from '../data/keyboardTopology';
import type { PositionRelation } from '../data/keyboardTopology';
import { calculateDeckStats, generateShopWords } from '../data/words';
import { getElements } from '../ui/elements';
import { playSound } from '../effects/sound';
import { juiceUp } from '../effects/juice';
import { showScreen, startLevel, renderRelicDisplay, showFeedback, calculateRating } from './battle';
import type { ShopItem, ResourceType } from '../core/types';
import { getNextBattleNode, isRestNode, getActForNode, TOTAL_NODES } from './stage/stageFlow';
import { openRestStage } from './restStage';
import { calculateLetterFrequency, letterFrequencyToScore } from './letters/LetterFrequencySystem';
import { keyTooltip } from '../ui/keyboard/KeyTooltip';
import type { KeyTooltipData } from '../ui/keyboard/KeyTooltip';
import { dragManager } from './dragManager';
import type { DragPayload } from './dragManager';

// === 零频键位缓存（供自动绑定使用） ===
let cachedLetterFreqs: Map<string, number> | null = null;

// === Act 技能权重 ===
export const ACT_SKILL_WEIGHTS: Record<number, { producer: number; converter: number; connector: number }> = {
  1: { producer: 80, converter: 20, connector: 0 },
  2: { producer: 30, converter: 50, connector: 20 },
  3: { producer: 10, converter: 40, connector: 50 },
};

// === 首次获取 tooltip ===
export const SKILL_TYPE_TOOLTIPS: Record<string, { text: string; color: string }> = {
  producer:  { text: '💡 产出者：按键直接产出资源', color: '#4ecdc4' },
  converter: { text: '💡 转化者：读取资源值，产出另一种', color: '#f39c12' },
  connector: { text: '💡 连接者：自动触发周围技能', color: '#9b59b6' },
};

function getSkillCategory(skillId: string): string | null {
  if (isProducer(skillId)) return 'producer';
  if (isConverter(skillId)) return 'converter';
  if (isConnector(skillId)) return 'connector';
  return null;
}

// === 打开商店 ===
export function openShop(_won: boolean): void {
  state.phase = 'shop';
  const el = getElements();

  // 遗物效果：通过管道解析 on_battle_end 金币加成
  const goldRelicResult = resolveRelicEffects('on_battle_end', { overkill: state.overkill });
  const relicGold = Math.floor(goldRelicResult.effects.gold);

  // 技能产出 + 遗物加成（基础金币已在关卡开始时重置为100）
  const skillGold = Math.floor(state.resources.gold);
  state.gold += skillGold + relicGold;
  const battleGold = skillGold + relicGold;

  el.shopLevelNum.textContent = String(state.level);
  el.shopScore.textContent = String(state.score);
  el.shopTarget.textContent = String(state.targetScore);
  el.shopBonus.textContent = battleGold > 0 ? `+${battleGold}` : '0';
  updateGoldDisplay();

  // 保留锁定商品，补充新商品至5个
  const locked = state.shop.items.filter(item => item.locked);
  const newItems = generateShopItems(5 - locked.length);
  state.shop.items = [...locked, ...newItems];
  state.shop.refreshCount = 0;

  renderUnifiedShop();
  renderBuildManager();  // 内部自动注册 drop zones
  renderRelicDisplay();
  initStatsTabs();
  dragManager.init();
  showScreen('shop');

  // 补偿：检查商店外升到Lv.3但未附魔的技能（如休息关升级）
  checkPendingEnchantments();
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

  // 构建技能池（按 Act 权重分类抽取）
  const skillPool: ShopItem[] = [];
  if (!isSilenced) {
    const owned = [...state.player.skills.keys()];
    const poolConverterIds = state.converterPool.filter(id => id in CONVERTERS);
    const poolConnectorIds = state.connectorPool.filter(id => id in CONNECTORS);
    const allSkillIds = [...Object.keys(PRODUCERS), ...poolConverterIds, ...poolConnectorIds];
    const unowned = allSkillIds.filter(id => !owned.includes(id));

    // 按类型分桶
    const act = getActForNode(state.level);
    const weights = ACT_SKILL_WEIGHTS[act] || ACT_SKILL_WEIGHTS[3];
    const producerBucket = shuffleArray(unowned.filter(id => isProducer(id)));
    const converterBucket = shuffleArray(unowned.filter(id => isConverter(id)));
    const connectorBucket = shuffleArray(unowned.filter(id => isConnector(id)));

    // 加权抽取新技能（严格执行 0% 权重 = 绝不出现）
    function weightedPick(): string | null {
      const total = weights.producer + weights.converter + weights.connector;
      const roll = Math.random() * total;
      if (roll < weights.producer && producerBucket.length > 0) return producerBucket.shift()!;
      if (roll < weights.producer + weights.converter && converterBucket.length > 0) return converterBucket.shift()!;
      if (weights.connector > 0 && connectorBucket.length > 0) return connectorBucket.shift()!;
      // fallback: 从非空的、权重 > 0 的桶中取
      if (producerBucket.length > 0) return producerBucket.shift()!;
      if (converterBucket.length > 0) return converterBucket.shift()!;
      if (weights.connector > 0 && connectorBucket.length > 0) return connectorBucket.shift()!;
      return null;
    }

    // 生成加权新技能商品（预抽 3 倍槽位数，保证保底和混合有足够选择）
    const SKILL_POOL_MULTIPLIER = 3;
    for (let i = 0; i < count * SKILL_POOL_MULTIPLIER; i++) {
      const skillId = weightedPick();
      if (!skillId) break;
      skillPool.push({
        id: `si-${nextId++}`,
        type: 'skill',
        skillId,
        cost: getAdjustedPrice(15 + Math.floor(Math.random() * 15)),
        isUpgrade: false,
        locked: false,
      });
    }

    // 第一关金币保底：确保 ≥1 金币类技能（21.4）
    if (state.level === 1 && skillPool.length > 0) {
      const isGoldSkill = (id: string): boolean =>
        id === 'prod_mint' || id === 'prod_treasury' ||
        (id in CONVERTERS && (CONVERTERS[id].source === 'gold' || CONVERTERS[id].target === 'gold'));

      const hasGold = skillPool.some(item => isGoldSkill(item.skillId!));
      if (!hasGold) {
        const goldCandidates = unowned.filter(id => isGoldSkill(id));
        if (goldCandidates.length > 0) {
          const goldId = goldCandidates[Math.floor(Math.random() * goldCandidates.length)];
          skillPool[skillPool.length - 1] = {
            id: `si-${nextId++}`,
            type: 'skill',
            skillId: goldId,
            cost: getAdjustedPrice(15 + Math.floor(Math.random() * 15)),
            isUpgrade: false,
            locked: false,
          };
        }
      }
    }

    // 升级已有技能（未满级的）— 不受 Act 权重限制
    const upgradable = owned.filter(id => {
      if (isConnector(id)) return false; // 连接者固定 Lv1，不可升级
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
    const sk = PRODUCERS[item.skillId!] || CONVERTERS[item.skillId!] || CONNECTORS[item.skillId!];
    if (!sk) return;
    const school = getSkillSchool(item.skillId!);
    const lvl = state.player.skills.get(item.skillId!)?.level || 1;
    const display = getSkillDisplayInfo(item.skillId!, lvl, state.player.enchantedSkills);

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
      showFeedback(`${(PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId])?.name} 升级!`, '#ffe66d');
    } else {
      state.player.skills.set(skillId, { level: 1, purchasePrice: item.cost });
      showFeedback(`获得 ${(PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId])?.name}!`, '#4ecdc4');

      // 首次获取某类型技能时显示 tooltip
      const category = getSkillCategory(skillId);
      if (category && !state.seenSkillTypes.has(category)) {
        state.seenSkillTypes.add(category);
        const tip = SKILL_TYPE_TOOLTIPS[category];
        if (tip) showFeedback(tip.text, tip.color);
      }
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

  // 点击购买新技能时，自动绑定到第一个空且未锁定键位（频率≥5）
  if (result.isNew && result.skillId) {
    const freeKey = KEYS.find(k => !state.player.bindings.has(k) && (cachedLetterFreqs?.get(k) ?? 0) >= 5);
    if (freeKey) state.player.bindings.set(freeKey, result.skillId);
  }

  if (result.skillId) checkAutoEnchantment(result.skillId);

  renderUnifiedShop();
  renderBuildManager();
}

// === 自动进化检查 ===
function checkAutoEnchantment(skillId: string): void {
  const data = state.player.skills.get(skillId);
  if (!data || data.level < 3) return;

  // 产出者/转化者走附魔系统
  if (isProducer(skillId) || isConverter(skillId)) {
    if (state.player.enchantedSkills.has(skillId)) return;
    renderEnchantmentModal(skillId);
  }
}

// === 补偿检查：商店外升级导致的未附魔Lv.3技能 ===
function checkPendingEnchantments(): void {
  const pending: string[] = [];
  for (const [skillId, data] of state.player.skills) {
    if (data.level >= 3 && (isProducer(skillId) || isConverter(skillId)) && !state.player.enchantedSkills.has(skillId)) {
      pending.push(skillId);
    }
  }
  if (pending.length === 0) return;
  // 逐个弹出附魔选择（前一个关闭后弹下一个）
  showEnchantmentQueue(pending, 0);
}

function showEnchantmentQueue(queue: string[], index: number): void {
  if (index >= queue.length) return;
  const skillId = queue[index];
  // 可能在队列过程中已被附魔（用户选择了）
  if (state.player.enchantedSkills.has(skillId)) {
    showEnchantmentQueue(queue, index + 1);
    return;
  }
  renderEnchantmentModal(skillId, () => showEnchantmentQueue(queue, index + 1));
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

  // 移除进化/附魔
  state.player.evolvedSkills.delete(skillId);
  state.player.enchantedSkills.delete(skillId);

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

function closeEnchantmentModal(): void {
  const modal = document.getElementById('enchantment-modal');
  if (modal) modal.classList.add('enchantment-hidden');
  const cb = _enchantmentOnClose;
  _enchantmentOnClose = null;
  if (cb) cb();
}

// === 附魔选择界面 ===
let _enchantmentOnClose: (() => void) | null = null;

function renderEnchantmentModal(skillId: string, onClose?: () => void): void {
  _enchantmentOnClose = onClose || null;
  const modal = document.getElementById('enchantment-modal');
  const titleEl = document.getElementById('enchantment-title');
  const branchesEl = document.getElementById('enchantment-branches');
  const cancelBtn = document.getElementById('enchantment-cancel');
  if (!modal || !titleEl || !branchesEl || !cancelBtn) return;

  const sk = PRODUCERS[skillId] || CONVERTERS[skillId];
  if (!sk) return;

  const [enchA, enchB] = drawEnchantmentPair();
  const enchantments = [ENCHANTMENTS[enchA], ENCHANTMENTS[enchB]];

  titleEl.textContent = `✨ 附魔选择 — ${sk.name} (免费!) ✨`;
  branchesEl.innerHTML = '';

  enchantments.forEach(ench => {
    if (!ench) return;
    const card = document.createElement('div');
    card.className = 'enchantment-branch';
    card.innerHTML = `
      <div class="enchantment-branch-icon">${ench.icon}</div>
      <div class="enchantment-branch-name">${ench.name}</div>
      <div class="enchantment-branch-desc">${ench.desc}</div>
      <div class="enchantment-branch-cost">✨ 免费</div>
    `;
    // 空间附魔范围预览
    if (ench.positionRelation) {
      const boundKey = findKeyForSkill(skillId);
      if (boundKey) {
        card.addEventListener('mouseenter', () => {
          clearRangeHighlight();
          const keys = getKeysWithRelation(boundKey, ench.positionRelation!);
          keys.forEach(k => {
            document.querySelector(`.key-slot[data-key="${k}"]`)
              ?.classList.add('range-highlight');
          });
        });
        card.addEventListener('mouseleave', () => {
          clearRangeHighlight();
        });
      }
    }
    card.onclick = () => applyEnchantment(skillId, ench.id);
    branchesEl.appendChild(card);
  });

  cancelBtn.onclick = closeEnchantmentModal;
  const overlay = modal.querySelector('.enchantment-overlay') as HTMLElement;
  if (overlay) overlay.onclick = closeEnchantmentModal;
  modal.classList.remove('enchantment-hidden');
}

function applyEnchantment(skillId: string, enchantmentId: string): void {
  state.player.enchantedSkills.set(skillId, enchantmentId);
  const ench = ENCHANTMENTS[enchantmentId];
  if (ench) {
    showFeedback(`附魔! ${ench.icon} ${ench.name}`, '#f9ca24');
  }
  playSound('skill');
  closeEnchantmentModal();
  renderUnifiedShop();
  renderBuildManager();
}

// === 获取技能显示信息（进化后使用进化数据） ===
export function getSkillDisplay(skillId: string): { name: string; icon: string; desc: string } {
  const level = state.player.skills.get(skillId)?.level || 1;
  return getSkillDisplayInfo(skillId, level, state.player.enchantedSkills);
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

// === 范围预览高亮 ===
function highlightSkillRange(key: string): void {
  clearRangeHighlight();
  const skillId = state.player.bindings.get(key);
  if (!skillId) return;
  const relations: PositionRelation[] = [];
  const conn = CONNECTORS[skillId];
  if (conn) relations.push(conn.positionRelation);
  const enchId = state.player.enchantedSkills?.get(skillId);
  const ench = enchId ? ENCHANTMENTS[enchId] : null;
  if (ench?.positionRelation) relations.push(ench.positionRelation);
  if (relations.length === 0) return;
  const keys = new Set<string>();
  for (const rel of relations) {
    getKeysWithRelation(key, rel).forEach(k => keys.add(k));
  }
  keys.forEach(k => {
    document.querySelector(`.key-slot[data-key="${k}"]`)
      ?.classList.add('range-highlight');
  });
}

function clearRangeHighlight(): void {
  document.querySelectorAll('.key-slot.range-highlight')
    .forEach(el => el.classList.remove('range-highlight'));
}

/** 计算范围高亮键位+源键位的包围盒（用于tooltip避让） */
function getRangeHighlightRect(sourceSlot: HTMLElement): { top: number; left: number; right: number; bottom: number } | null {
  const highlighted = document.querySelectorAll('.key-slot.range-highlight');
  if (highlighted.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const include = (r: DOMRect) => {
    minX = Math.min(minX, r.left);
    minY = Math.min(minY, r.top);
    maxX = Math.max(maxX, r.right);
    maxY = Math.max(maxY, r.bottom);
  };
  include(sourceSlot.getBoundingClientRect());
  highlighted.forEach(el => include(el.getBoundingClientRect()));
  return { top: minY, left: minX, right: maxX, bottom: maxY };
}

function findKeyForSkill(skillId: string): string | undefined {
  for (const [key, id] of state.player.bindings) {
    if (id === skillId) return key;
  }
  return undefined;
}

export function renderBuildManager(): void {
  const el = getElements();
  el.boundGrid.innerHTML = '';

  // 计算字频（一次遍历），再导出底分
  const letterFreqs = calculateLetterFrequency(state.player.wordDeck);
  cachedLetterFreqs = letterFreqs;
  const letterScores = new Map<string, number>();
  letterFreqs.forEach((count, letter) => {
    const score = letterFrequencyToScore(count);
    if (score > 0) letterScores.set(letter, score);
  });

  // 低频键位自动解绑（频率<5 → 底分为0 → 锁定）
  const keysToUnbind: string[] = [];
  for (const [key] of state.player.bindings) {
    if ((letterFreqs.get(key) ?? 0) < 5) keysToUnbind.push(key);
  }
  for (const key of keysToUnbind) {
    const skillId = state.player.bindings.get(key)!;
    state.player.bindings.delete(key);
    const sk = PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId];
    if (sk) showFeedback(`${sk.name} 已从 ${key.toUpperCase()} 解绑（字频不足）`, '#ff6b6b');
  }

  KEYBOARD_ROWS.forEach((row, rowIndex) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'keyboard-row';
    rowDiv.dataset.row = String(rowIndex);

    row.forEach(k => {
      const slot = document.createElement('div');
      slot.className = 'key-slot';
      slot.dataset.key = k;

      const freq = letterFreqs.get(k) ?? 0;
      const score = letterScores.get(k) ?? 0;
      const skillId = state.player.bindings.get(k);

      // 低频键位锁定（频率<5 → 底分为0）
      if (freq < 5) slot.classList.add('freq-locked');

      // 底分分级样式
      if (score >= 6) slot.classList.add('score-high');
      else if (score >= 3) slot.classList.add('score-mid');
      else if (score >= 1) slot.classList.add('score-low');

      // 技能流派底色
      if (skillId && (PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId])) {
        const display = getSkillDisplay(skillId);
        const school = getSkillSchool(skillId);
        slot.classList.add('has-skill');
        slot.dataset.dragType = 'skill-key';
        slot.dataset.boundSkill = skillId;
        slot.classList.add(school.cssClass);
        slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span><span class="key-skill">${display.icon}</span>${score > 0 ? `<span class="key-score">${score}</span>` : ''}`;
      } else {
        slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span>${score > 0 ? `<span class="key-score">${score}</span>` : ''}`;
      }

      // Tooltip 悬停 + 范围预览
      slot.addEventListener('mouseenter', (e: MouseEvent) => {
        const freq = letterFreqs.get(k) ?? 0;
        const tooltipData: KeyTooltipData = {
          letter: k,
          score,
          frequency: freq,
        };
        if (skillId && (PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId])) {
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
        highlightSkillRange(k);
        const avoidRect = getRangeHighlightRect(slot);
        keyTooltip.show(e.clientX, e.clientY, tooltipData, avoidRect ?? undefined);
      });
      slot.addEventListener('mouseleave', () => {
        keyTooltip.hide();
        clearRangeHighlight();
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
    const sk = PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId];
    if (!sk) return;

    const display = getSkillDisplay(skillId);
    const boundKey = [...state.player.bindings.entries()].find(([, id]) => id === skillId)?.[0];

    const item = document.createElement('div');
    item.className = 'inventory-skill';
    item.dataset.dragType = 'skill-inventory';
    item.dataset.skillId = skillId;
    if (boundKey) item.classList.add('bound');

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

// === 词库面板 ===
function renderWordInventory(): void {
  const el = getElements();
  el.wordCount.textContent = `(${state.player.wordDeck.length})`;
  el.ownedWords.innerHTML = '';

  const boundKeys = new Set(state.player.bindings.keys());

  state.player.wordDeck.forEach((word, index) => {
    const item = document.createElement('div');
    item.className = 'word-item';

    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-text';
    wordSpan.innerHTML = word.split('').map(c =>
      boundKeys.has(c.toLowerCase()) ? `<span class="bound-letter">${c}</span>` : c
    ).join('');

    const delBtn = document.createElement('button');
    delBtn.className = 'word-delete-btn';
    delBtn.textContent = '删 -3💰';
    if (state.gold < 3 || state.player.wordDeck.length <= MIN_WORD_COUNT) delBtn.classList.add('cannot-afford');
    delBtn.onclick = (e) => {
      e.stopPropagation();
      removeWord(index);
    };

    item.appendChild(wordSpan);
    item.appendChild(delBtn);
    el.ownedWords.appendChild(item);
  });
}

const MIN_WORD_COUNT = 3;

function removeWord(index: number): void {
  if (index < 0 || index >= state.player.wordDeck.length) return;
  if (state.player.wordDeck.length <= MIN_WORD_COUNT) {
    showFeedback(`词库最少保留${MIN_WORD_COUNT}个词!`, '#ff6b6b');
    return;
  }
  if (state.gold < 3) {
    showFeedback('金币不足!', '#ff6b6b');
    return;
  }
  const word = state.player.wordDeck[index];
  state.gold -= 3;
  state.player.wordDeck.splice(index, 1);
  updateGoldDisplay();
  showFeedback(`删除 ${word} -3💰`, '#ff6b6b');
  playSound('skill');
  renderUnifiedShop();
  renderWordInventory();
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
        if (slot.classList.contains('freq-locked')) return false;
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

    if (result.skillId) checkAutoEnchantment(result.skillId);
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

// === 统计面板渲染 ===
function renderStatsPanel(): void {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;
  const bs = state.battleStats;
  if (!bs) {
    panel.innerHTML = '<div class="stats-empty">暂无战斗数据</div>';
    return;
  }

  // 评级
  const rating = bs.rating || calculateRating(state.score, state.targetScore);
  const ratingClass = rating.length >= 2 ? 'rating-gold' : rating === 'S' ? 'rating-silver' : rating === 'A' ? 'rating-bronze' : '';

  // 技能产出金币总计
  let totalGold = 0;
  bs.keyStats.forEach(ks => { totalGold += ks.resources.gold; });

  panel.innerHTML = `
    <div class="stats-header">
      <div class="rating-badge ${ratingClass}">${rating}</div>
      <div class="stats-summary">
        <span>完成 ${bs.wordsCompleted} 词</span>
        <span>完美 ${bs.perfectWords} 词</span>
        <span>连锁 ${bs.totalChainTriggers} 次</span>
        ${bs.maxChainDepth > 1 ? `<span>最长链 ${bs.maxChainDepth}</span>` : ''}
        ${totalGold > 0 ? `<span>💰 +${Math.floor(totalGold)}</span>` : ''}
      </div>
    </div>
    <div id="stats-content"></div>
  `;

  currentHeatmapDimension = 'triggerCount';
  renderHeatmapTab(document.getElementById('stats-content')!, bs);
}

// === 热力图色相：240(蓝) → 0(红) ===
function heatColor(ratio: number): string {
  const hue = 240 - ratio * 240;
  return `hsl(${hue}, 80%, ${50 + (1 - ratio) * 15}%)`;
}

// === 热力图维度 ===
type HeatmapDimension = 'triggerCount' | ResourceType;
let currentHeatmapDimension: HeatmapDimension = 'triggerCount';

const HEATMAP_DIMENSIONS: { key: HeatmapDimension; label: string; color: string }[] = [
  { key: 'triggerCount', label: '触发数', color: '#aaa' },
  ...(['base', 'score', 'multiplier', 'time', 'shield', 'gold'] as ResourceType[])
    .map(r => ({ key: r as HeatmapDimension, label: RESOURCE_LABELS[r], color: RESOURCE_COLORS[r] })),
];

function getKeyValue(ks: import('../core/types').KeyStats | undefined, dim: HeatmapDimension): number {
  if (!ks) return 0;
  return dim === 'triggerCount' ? ks.triggerCount : ks.resources[dim as ResourceType];
}

function formatDimValue(val: number, dim: HeatmapDimension): string {
  if (val === 0) return '';
  if (dim === 'triggerCount') return String(val);
  if (dim === 'multiplier') return val.toFixed(2);
  return val.toFixed(1);
}

function renderHeatmapTab(container: HTMLElement, bs: import('../core/types').BattleStats): void {
  // 维度选择器
  let html = '<div class="heatmap-dims">';
  HEATMAP_DIMENSIONS.forEach(d => {
    const active = d.key === currentHeatmapDimension;
    const style = active ? `color:${d.color};border-color:${d.color}` : '';
    html += `<span class="heatmap-dim${active ? ' active' : ''}" data-dim="${d.key}" style="${style}">${d.label}</span>`;
  });
  html += '</div>';

  // 找最大值（归一化基准）
  let maxVal = 0;
  bs.keyStats.forEach(ks => {
    const v = getKeyValue(ks, currentHeatmapDimension);
    if (v > maxVal) maxVal = v;
  });

  html += '<div class="heatmap-keyboard">';
  KEYBOARD_ROWS.forEach(row => {
    html += '<div class="heatmap-row">';
    row.forEach(k => {
      const ks = bs.keyStats.get(k);
      const val = getKeyValue(ks, currentHeatmapDimension);
      const ratio = maxVal > 0 ? val / maxVal : 0;
      const hasSkill = state.player.bindings.has(k) || (ks?.triggerCount ?? 0) > 0;
      const bg = hasSkill && val > 0 ? heatColor(ratio) : 'rgba(255,255,255,0.05)';
      const cls = hasSkill ? 'heatmap-key' : 'heatmap-key heatmap-key-empty';
      const countText = formatDimValue(val, currentHeatmapDimension);
      html += `<div class="${cls}" data-key="${k}" style="background:${bg}">
        <span class="hm-letter">${k.toUpperCase()}</span>
        ${countText ? `<span class="hm-count">${countText}</span>` : ''}
      </div>`;
    });
    html += '</div>';
  });
  html += '</div>';

  container.innerHTML = html;

  // 维度切换事件
  container.querySelectorAll('.heatmap-dim').forEach(el => {
    el.addEventListener('click', () => {
      currentHeatmapDimension = (el as HTMLElement).dataset.dim as HeatmapDimension;
      renderHeatmapTab(container, bs);
    });
  });

  // 悬停详情浮窗
  container.querySelectorAll('.heatmap-key').forEach(el => {
    const key = (el as HTMLElement).dataset.key || '';
    el.addEventListener('mouseenter', (e: Event) => showHeatmapTooltip(e as MouseEvent, key, bs));
    el.addEventListener('mouseleave', hideHeatmapTooltip);
  });
}

function showHeatmapTooltip(e: MouseEvent, key: string, bs: import('../core/types').BattleStats): void {
  hideHeatmapTooltip();
  const ks = bs.keyStats.get(key);
  if (!ks || ks.triggerCount === 0) return;

  const tip = document.createElement('div');
  tip.id = 'heatmap-tooltip';
  tip.className = 'heatmap-tooltip';

  const resourceLines = (['base', 'score', 'multiplier', 'time', 'shield', 'gold'] as ResourceType[])
    .filter(r => ks.resources[r] > 0)
    .map(r => `<div class="ht-resource"><span style="color:${RESOURCE_COLORS[r]}">${RESOURCE_ICONS[r]} ${RESOURCE_LABELS[r]}</span> +${ks.resources[r].toFixed(1)}</div>`)
    .join('');

  tip.innerHTML = `
    <div class="ht-key">${key.toUpperCase()}</div>
    <div class="ht-count">触发 ${ks.triggerCount} 次</div>
    ${resourceLines}
  `;

  tip.style.left = e.clientX + 12 + 'px';
  tip.style.top = e.clientY - 10 + 'px';
  document.body.appendChild(tip);
}

function hideHeatmapTooltip(): void {
  document.getElementById('heatmap-tooltip')?.remove();
}

// === 统计面板 Tab 切换 ===
function initStatsTabs(): void {
  const buildTab = document.getElementById('build-tab');
  const statsTab = document.getElementById('stats-tab');
  const wordsTab = document.getElementById('words-tab');
  const buildManager = document.getElementById('build-manager');
  const statsPanel = document.getElementById('stats-panel');
  const wordPanel = document.getElementById('word-panel');
  if (!buildTab || !statsTab || !wordsTab || !buildManager || !statsPanel || !wordPanel) return;

  function switchTab(active: 'build' | 'stats' | 'words') {
    buildTab!.classList.toggle('active', active === 'build');
    statsTab!.classList.toggle('active', active === 'stats');
    wordsTab!.classList.toggle('active', active === 'words');
    buildManager!.style.display = active === 'build' ? '' : 'none';
    statsPanel!.style.display = active === 'stats' ? '' : 'none';
    wordPanel!.style.display = active === 'words' ? '' : 'none';
    if (active === 'stats') renderStatsPanel();
    if (active === 'words') renderWordInventory();
  }

  switchTab('build');
  buildTab.onclick = () => switchTab('build');
  statsTab.onclick = () => switchTab('stats');
  wordsTab.onclick = () => switchTab('words');
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
