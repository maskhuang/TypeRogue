// ============================================
// 打字肉鸽 - 商店系统（统一5商品）
// ============================================
// Epic 17: 统一商店 + 刷新/锁定/卖出 + 拖拽交互

import { state, isRelicSlotsFull, addRelicWithCapacity } from '../core/state';
import { resolveRelicEffects, resolveRelicEffectsWithBehaviors, queryRelicFlag } from './relics/RelicPipeline';
import { KEYS, KEYBOARD_ROWS, RESOURCE_LABELS, RESOURCE_ICONS, RESOURCE_COLORS } from '../core/constants';
import { getSkillSchool, getSkillDisplayInfo } from '../data/skills';
import { PRODUCERS, isProducer, getProducerMechanic, MECHANIC_LABELS, MECHANIC_ICONS, RELATION_LABELS } from '../data/producers';
import { CONVERTERS, isConverter } from '../data/converters';
import { CONNECTORS, REPLICATORS, isConnector, isReplicator } from '../data/connectors';
import { AMPLIFIERS, isAmplifier } from '../data/amplifiers';
import { ENCHANTMENTS, drawEnchantmentPair } from '../data/enchantments';
import { getKeysWithRelation, hasRelation } from '../data/keyboardTopology';
import type { PositionRelation } from '../data/keyboardTopology';
import { calculateDeckStats } from '../data/words';
import { generateWordPacks, getConditionMeta } from '../data/wordPacks';
import { getElements } from '../ui/elements';
import { playSound } from '../effects/sound';
import { juiceUp, calculateRating, getRatingTier } from '../effects/juice';
import { showScreen, startLevel, renderRelicDisplay, showFeedback } from './battle';
import type { ShopItem, ResourceType, PackConditionType, ChargeParams, DecayParams, PulseParams, CritParams, VoidParams } from '../core/types';
import { getNextBattleNode, isRestNode, getActForNode, TOTAL_NODES } from './stage/stageFlow';
import { openRestStage } from './restStage';
import { calculateLetterFrequency, letterFrequencyToScore } from './letters/LetterFrequencySystem';
import { getIconCount } from './skills';
import { RELICS, MAX_RELIC_SLOTS } from '../data/relics';
import type { RelicWeights } from './relicPicker';
import { generateRelicCandidates, showRelicReplaceUI } from './relicPicker';
import { keyTooltip } from '../ui/keyboard/KeyTooltip';
import type { KeyTooltipData } from '../ui/keyboard/KeyTooltip';
import { random } from '../core/seededRandom';
import { dragManager } from './dragManager';
import { CLASS_DEFINITIONS } from '../data/classes';
import { isFeatureEnabled, getFeatureLostReason } from './classes/ClassFeatureGate';
import { renderCraftPanel, resetCraftInput } from './classes/CraftingStation';
import { renderMetamorphPanel } from './classes/MetamorphStation';
import type { DragPayload } from './dragManager';
import { IS_DEMO } from '../demo/demo-config';
import { t, getLocale, localizeItemName, localizeItemDesc } from '../demo/demo-i18n';
import { generateSkill } from '../data/skillGeneration';
import { createSkillRuntimeState, AFFIX_NAMES, RARITY_COLORS } from '../data/affixes';
import type { SkillRarity } from '../data/affixes';
import { getEnchantmentSlotCount, filterQuestCandidates } from '../data/affixTrigger';
import { filterEnchantmentsByClass, QUEST_ENCHANTMENT_DEFS } from '../data/affixes';
import type { EnchantmentType } from '../data/affixes';

// === 零频键位缓存（供自动绑定使用） ===
let cachedLetterFreqs: Map<string, number> | null = null;

// === 词条制技能定价（Story 35.9） ===
export const AFFIX_SKILL_BASE_PRICE = 50;

// RARITY_COLORS 从 affixes.ts 导入（白/蓝/黄/橙 四级稀有度边框颜色）

const RARITY_LABELS: Record<number, string> = {
  0: '普通', 1: '魔法', 2: '稀有', 3: '传说',
};

/** 词条制技能定价公式：basePrice × (1 + rarity × 0.5) × (1 + (level-1) × 0.3) */
export function calculateAffixSkillPrice(rarity: number, level: number, basePrice: number = AFFIX_SKILL_BASE_PRICE): number {
  return Math.round(basePrice * (1 + rarity * 0.5) * (1 + (level - 1) * 0.3));
}

/** 职业可用资源池（排除非对应职业的 fragment/mutagen） */
function getAvailableResources(classId: string): ResourceType[] {
  const all: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold'];
  if (classId === 'wordsmith') all.push('fragment');
  if (classId === 'metamorph') all.push('mutagen');
  return all;
}

/** 生成单个词条制技能商品 */
export function generateAffixShopItem(
  itemId: number,
  options?: { rarity?: SkillRarity; resource?: ResourceType },
): ShopItem {
  const resourcePool = getAvailableResources(state.classId);
  const resource = options?.resource ?? resourcePool[Math.floor(random() * resourcePool.length)];
  const skill = generateSkill({ resource, rarity: options?.rarity });
  const cost = getAdjustedPrice(calculateAffixSkillPrice(skill.rarity, skill.level));

  return {
    id: `si-${itemId}-affix`,
    type: 'skill',
    skillId: skill.id,
    affixSkill: skill,
    cost,
    isUpgrade: false,
    locked: false,
  };
}

/** 生成多个词条制技能商品（保证品类多样性：至少 1 件 rarity≥1） */
export function generateAffixShopItems(count: number): ShopItem[] {
  if (count <= 0) return [];
  const items: ShopItem[] = [];
  let nextId = Date.now();

  // 保底第 1 件：rarity≥1（蓝装以上）
  let guaranteed: ShopItem;
  for (let attempt = 0; attempt < 10; attempt++) {
    guaranteed = generateAffixShopItem(nextId++);
    if (guaranteed.affixSkill!.rarity >= 1) break;
  }
  // 如果 10 次都没 ≥1，强制 rarity=1
  if (!guaranteed! || guaranteed!.affixSkill!.rarity < 1) {
    guaranteed = generateAffixShopItem(nextId++, { rarity: 1 as SkillRarity });
  }
  items.push(guaranteed!);

  // 剩余随机
  for (let i = 1; i < count; i++) {
    items.push(generateAffixShopItem(nextId++));
  }

  return items;
}

// === 产出者机制分组权重（Story 34.5） ===
export const PRODUCER_MECHANIC_WEIGHTS: Record<string, number> = {
  standard: 10, charge: 8, decay: 8, pulse: 8, crit: 8, void: 4,
};

// === Act 技能权重 ===
export const ACT_SKILL_WEIGHTS: Record<number, { producer: number; converter: number; connector: number; replicator: number; amplifier: number }> = {
  1: { producer: 80, converter: 20, connector: 0, replicator: 0, amplifier: 0 },
  2: { producer: 25, converter: 45, connector: 15, replicator: 5, amplifier: 10 },
  3: { producer: 10, converter: 35, connector: 25, replicator: 10, amplifier: 20 },
};

// === Act 遗物权重 ===
const ACT_RELIC_WEIGHTS: Record<number, RelicWeights> = {
  1: { common: 60, rare: 30, legendary: 10 },
  2: { common: 30, rare: 50, legendary: 20 },
  3: { common: 10, rare: 40, legendary: 50 },
};

// === 生成商店遗物商品 ===
export function generateShopRelicItem(act: number, itemId?: number): ShopItem | null {
  if (isRelicSlotsFull()) return null;
  const weights = ACT_RELIC_WEIGHTS[act] || ACT_RELIC_WEIGHTS[3];
  const candidates = generateRelicCandidates(weights);
  if (candidates.length === 0) return null;

  const relicId = candidates[0];
  const relic = RELICS[relicId];
  if (!relic) return null;

  return {
    id: `si-${itemId ?? Date.now()}-relic`,
    type: 'relic',
    relicId,
    cost: getAdjustedPrice(relic.basePrice),
    isUpgrade: false,
    locked: false,
  };
}

// === 首次获取 tooltip ===
// i18n-aware tooltip lookup (runtime)
function getSkillTypeTooltip(type: string): { text: string; color: string } | undefined {
  const map: Record<string, { key: string; color: string }> = {
    producer:   { key: 'tooltip.producer',   color: '#4ecdc4' },
    converter:  { key: 'tooltip.converter',  color: '#f39c12' },
    connector:  { key: 'tooltip.connector',  color: '#9b59b6' },
    replicator: { key: 'tooltip.replicator', color: '#8e44ad' },
    amplifier:  { key: 'tooltip.amplifier',  color: '#7c5cbf' },
  };
  const entry = map[type];
  if (!entry) return undefined;
  return { text: t(entry.key), color: entry.color };
}

// Backward-compat export for tests (static ZH values)
export const SKILL_TYPE_TOOLTIPS: Record<string, { text: string; color: string }> = {
  producer:  { text: '💡 产出者：按键直接产出资源', color: '#4ecdc4' },
  converter: { text: '💡 转化者：读取资源值，产出另一种', color: '#f39c12' },
  connector: { text: '💡 连接者：自动触发周围技能', color: '#9b59b6' },
  replicator: { text: '💡 复制者：按键触发周围技能', color: '#8e44ad' },
  amplifier: { text: '💡 增幅者：叠层增幅范围内技能数值', color: '#7c5cbf' },
};

function getSkillCategory(skillId: string): string | null {
  if (isProducer(skillId)) return 'producer';
  if (isConverter(skillId)) return 'converter';
  if (isConnector(skillId)) return 'connector';
  if (isReplicator(skillId)) return 'replicator';
  if (isAmplifier(skillId)) return 'amplifier';
  return null;
}

// === 产出者机制信息（tooltip 用, Story 34.6 AC3） ===
export function buildMechanicInfo(skillId: string): string | undefined {
  if (!isProducer(skillId)) return undefined;
  const prod = PRODUCERS[skillId];
  if (!prod) return undefined;
  const mech = prod.mechanic || 'standard';
  if (mech === 'standard') return undefined;
  const icon = MECHANIC_ICONS[mech] || '';
  const label = MECHANIC_LABELS[mech] || '';
  const params = prod.mechanicParams;
  if (!params) return `${icon}${label}`;
  switch (mech) {
    case 'charge': {
      const cp = params as ChargeParams;
      return `${icon}${label} · 每秒+${Math.round(cp.gainPerSec * 100)}%，上限${Math.round(cp.maxBonus * 100)}%`;
    }
    case 'decay': {
      const dp = params as DecayParams;
      return `${icon}${label} · 初始×${dp.initialMult}，每次-${dp.decayPerTrigger}，下限×${dp.floor}`;
    }
    case 'pulse': {
      const pp = params as PulseParams;
      return `${icon}${label} · 每${pp.interval}次触发×${pp.burstMult}`;
    }
    case 'crit': {
      const crp = params as CritParams;
      return `${icon}${label} · ${Math.round(crp.chance * 100)}%概率×${crp.critMult}`;
    }
    case 'void': {
      const vp = params as VoidParams;
      const relLabel = vp.posRel ? (RELATION_LABELS[vp.posRel] || vp.posRel) : '';
      return `${icon}${label} · ${relLabel}范围每空位+${Math.round(vp.bonusPerSlot * 100)}%`;
    }
    default:
      return `${icon}${label}`;
  }
}

// === 附魔状态信息（tooltip 用） ===
export function buildEnchantmentInfo(skillId: string): string | undefined {
  const enchId = state.player.enchantedSkills.get(skillId);
  if (!enchId) return undefined;
  const ench = ENCHANTMENTS[enchId];
  if (!ench) return undefined;

  const enchName = localizeItemName(enchId, ench.name);
  if (ench.spatialType === 'growth') {
    const growth = state.growthValues.get(skillId) || 0;
    return t('enchant.growth', { icon: ench.icon, name: enchName, pct: Math.round(growth * 100) });
  }
  if (ench.id === 'ench_mastery') {
    const growth = state.growthValues.get(skillId) || 0;
    const count = state.masteryCounters.get(skillId) || 0;
    return t('enchant.mastery', { icon: ench.icon, name: enchName, progress: count % 10, pct: Math.round(growth * 100) });
  }
  if (ench.spatialType === 'devour') {
    const devoured = state.devourIcons.get(skillId);
    const icons = devoured && devoured.length > 0 ? devoured.join('') : '';
    const count = getIconCount(skillId);
    return t('enchant.devour', { icon: ench.icon, name: enchName, icons, count });
  }
  return `${ench.icon} ${enchName}: ${localizeItemDesc(enchId, ench.desc)}`;
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
  // 周目≥2时在商店标题显示周目数
  const shopTitle = document.getElementById('shop-title');
  if (shopTitle) {
    shopTitle.textContent = state.cycle >= 2 ? t('shop.cycle_title', { cycle: state.cycle }) : t('shop.title');
  }
  el.shopScore.textContent = String(state.score);
  el.shopTarget.textContent = String(state.targetScore);
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
  dragManager.onDragStart = (payload) => {
    if (payload.type === 'word' && payload.word) {
      highlightFreqDropWarning(payload.word);
    }
  };
  dragManager.onDragEnd = () => {
    clearFreqDropWarning();
  };
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
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// === Story 34.5: 产出者按机制加权排列 ===
export function buildMechanicWeightedBucket(producerIds: string[]): string[] {
  // 1. 按机制分桶
  const mechBuckets: Record<string, string[]> = {};
  for (const id of producerIds) {
    const mech = getProducerMechanic(id);
    if (!mechBuckets[mech]) mechBuckets[mech] = [];
    mechBuckets[mech].push(id);
  }
  // 2. 每桶内部 shuffle
  for (const arr of Object.values(mechBuckets)) shuffleArray(arr);
  // 3. 加权交织：每次按机制权重 roll 一个组，取出 1 个
  const result: string[] = [];
  for (let i = 0; i < producerIds.length; i++) {
    const entries = Object.entries(mechBuckets).filter(([, arr]) => arr.length > 0);
    if (entries.length === 0) break;
    const totalW = entries.reduce((s, [m]) => s + (PRODUCER_MECHANIC_WEIGHTS[m] || 1), 0);
    const roll = random() * totalW;
    let acc = 0;
    let picked = false;
    for (const [mech, arr] of entries) {
      acc += PRODUCER_MECHANIC_WEIGHTS[mech] || 1;
      if (roll < acc) {
        result.push(arr.shift()!);
        picked = true;
        break;
      }
    }
    if (!picked && entries.length > 0) {
      result.push(entries[0][1].shift()!);
    }
  }
  return result;
}

// === 生成统一商品 ===
function generateShopItems(count: number): ShopItem[] {
  if (count <= 0) return [];

  const isSilenced = queryRelicFlag('silence_vow') === true;
  const items: ShopItem[] = [];
  let nextId = Date.now();

  // 当前 Act（技能权重 + 牌包权重共用）
  const act = getActForNode(state.level);

  // 构建词条制技能池（Story 35.9 — 替代旧固定池）
  const skillPool: ShopItem[] = [];
  if (!isSilenced) {
    // T4 极简主义：技能数量达上限时不生成新技能
    const maxSkillCount = queryRelicFlag('max_skill_count') as number;
    const skillCountFull = maxSkillCount !== Infinity && state.player.skills.size >= maxSkillCount;

    if (!skillCountFull) {
      // 生成词条制技能商品（含品类多样性保证）
      const affixItems = generateAffixShopItems(count);
      skillPool.push(...affixItems);
    }

    // 升级已有词条制技能（未满级的）
    const maxSkillLevel = queryRelicFlag('max_skill_level') as number;
    const levelCap = maxSkillLevel === Infinity ? 3 : maxSkillLevel;
    const upgradableAffix: string[] = [];
    for (const [skillId, data] of state.player.skills) {
      if (data.level < levelCap && state.affixSkills.has(skillId)) {
        upgradableAffix.push(skillId);
      }
    }
    const shuffledUpgrade = shuffleArray(upgradableAffix);
    for (const skillId of shuffledUpgrade) {
      const affixSkill = state.affixSkills.get(skillId)!;
      const nextLevel = (state.player.skills.get(skillId)?.level || 1) + 1;
      skillPool.push({
        id: `si-${nextId++}`,
        type: 'skill',
        skillId,
        affixSkill: { ...affixSkill, level: nextLevel },
        cost: getAdjustedPrice(calculateAffixSkillPrice(affixSkill.rarity, nextLevel)),
        isUpgrade: true,
        locked: false,
      });
    }
  }

  // 构建牌包池（替代词语池）— 职业门控：造词师失去牌包系统
  const packPool: ShopItem[] = [];
  if (isFeatureEnabled('pack-system')) {
    const boundKeys = [...state.player.bindings.keys()];
    const playerFreqs = calculateLetterFrequency(state.player.wordDeck);
    const packs = generateWordPacks(state.player.wordDeck, playerFreqs, boundKeys, 8, act);
    for (const pack of packs) {
      packPool.push({
        id: `si-${nextId++}`,
        type: 'pack',
        pack,
        cost: getAdjustedPrice(pack.cost),
        isUpgrade: false,
        locked: false,
      });
    }
  }

  // 保底：≥1 技能 + ≥1 牌包（如果有的话）
  if (count >= 2 && skillPool.length > 0 && packPool.length > 0) {
    items.push(skillPool.splice(0, 1)[0]);
    items.push(packPool.splice(0, 1)[0]);
  } else if (skillPool.length > 0 && packPool.length === 0) {
    items.push(skillPool.splice(0, 1)[0]);
  } else if (packPool.length > 0) {
    items.push(packPool.splice(0, 1)[0]);
  }

  // 遗物商品（最多 1 个，占总 5 槽之一，40%概率刷新）
  const RELIC_SPAWN_CHANCE = 0.4;
  if (random() < RELIC_SPAWN_CHANCE) {
    const relicItem = generateShopRelicItem(act, nextId++);
    if (relicItem && items.length < count) {
      items.push(relicItem);
    }
  }

  // 合并剩余池，随机填满
  const remaining = shuffleArray([...skillPool, ...packPool]);
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
      <span>${t('shop.deck_stats', { total: stats.totalWords, avg: stats.avgLength })}</span>
      <span>${t('shop.top_freq')} ${stats.topLetters.slice(0, 4).map(([l, p]) =>
        `<span class="${boundKeys.includes(l) ? 'highlight-letter' : ''}">${l.toUpperCase()}:${p}%</span>`
      ).join(' ')}</span>
    </div>
  `;
  el.rewardCards.appendChild(statsRow);

  // 刷新按钮
  const refreshCost = (state.shop.refreshCount + 1) * 5;
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'shop-refresh-btn';
  refreshBtn.innerHTML = t('shop.refresh', { cost: refreshCost });
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

  if (item.type === 'skill' && item.affixSkill) {
    // 词条制技能卡片（Story 35.9 AC3）
    const affix = item.affixSkill;
    const rarityColor = RARITY_COLORS[affix.rarity] || '#ffffff';
    const rarityLabel = RARITY_LABELS[affix.rarity] || '普通';
    const affixNames = affix.affixes.map(a => AFFIX_NAMES[a.type]).join(' · ');
    const lvl = state.player.skills.get(item.skillId!)?.level || affix.level;

    let nameLabel = affix.name;
    if (item.isUpgrade) {
      nameLabel = t('shop.upgrade_name', { name: affix.name, from: lvl, to: lvl + 1 });
    }

    card.classList.add('affix-skill-card');
    card.style.borderColor = rarityColor;
    card.innerHTML = `
      <div class="reward-icon">${affix.icon}</div>
      <div class="reward-info">
        <div class="reward-name">${nameLabel}</div>
        <div class="reward-desc affix-list">${affixNames || '无词条'}</div>
        ${affix.level > 1 ? `<div class="affix-level">Lv.${affix.level}</div>` : ''}
      </div>
      <div class="reward-cost">💰${item.cost}</div>
      <div class="reward-type" style="color:${rarityColor}">${item.isUpgrade ? '升级' : rarityLabel}</div>
      <span class="lock-toggle ${item.locked ? 'locked' : ''}">${item.locked ? '🔒' : '🔓'}</span>
    `;
  } else if (item.type === 'skill') {
    const sk = PRODUCERS[item.skillId!] || CONVERTERS[item.skillId!] || CONNECTORS[item.skillId!] || REPLICATORS[item.skillId!] || AMPLIFIERS[item.skillId!];
    if (!sk) return;
    const school = getSkillSchool(item.skillId!);
    const lvl = state.player.skills.get(item.skillId!)?.level || 1;
    const display = getSkillDisplayInfo(item.skillId!, lvl, state.player.enchantedSkills);

    let nameLabel = display.name;
    let typeLabel = school.label;
    if (item.isUpgrade) {
      nameLabel = t('shop.upgrade_name', { name: display.name, from: lvl, to: lvl + 1 });
      typeLabel = t('shop.upgrade_label', { label: school.label });
    }

    // Story 34.6 AC2: 产出者机制 badge
    const cardMechanic = isProducer(item.skillId!) ? getProducerMechanic(item.skillId!) : null;
    const mechanicBadge = cardMechanic && cardMechanic !== 'standard'
      ? `<span class="mechanic-badge mechanic-${cardMechanic}">${MECHANIC_ICONS[cardMechanic] || ''}${MECHANIC_LABELS[cardMechanic] || ''}</span>` : '';

    card.innerHTML = `
      <div class="reward-icon">${display.icon}</div>
      <div class="reward-info">
        <div class="reward-name">${nameLabel}</div>
        <div class="reward-desc">${display.desc}</div>
      </div>
      <div class="reward-cost">💰${item.cost}</div>
      <div class="reward-type ${school.cssClass}">${typeLabel}${mechanicBadge}</div>
      <span class="lock-toggle ${item.locked ? 'locked' : ''}">${item.locked ? '🔒' : '🔓'}</span>
    `;
  } else if (item.type === 'pack' && item.pack) {
    // Pack item
    const pack = item.pack;
    const preview = pack.words.join(', ');

    card.classList.add('pack-card');
    card.innerHTML = `
      <div class="reward-icon">${getPackIcon(pack.condition.type)}</div>
      <div class="reward-info">
        <div class="reward-name">${pack.name}</div>
        <div class="reward-desc pack-preview">${pack.desc} · ${preview}</div>
      </div>
      <div class="reward-cost">💰${item.cost}</div>
      <div class="reward-type pack-type">${t('shop.pack_type')}</div>
      <span class="lock-toggle ${item.locked ? 'locked' : ''}">${item.locked ? '🔒' : '🔓'}</span>
    `;
  } else if (item.type === 'relic' && item.relicId) {
    // Relic item
    const relic = RELICS[item.relicId];
    if (!relic) return;
    const rarityClass = relic.rarity || 'common';

    card.classList.add('relic-card', `relic-card-${rarityClass}`);
    card.innerHTML = `
      <div class="reward-icon">${relic.icon}</div>
      <div class="reward-info">
        <div class="reward-name">${localizeItemName(item.relicId, relic.name)}</div>
        <div class="reward-desc">${localizeItemDesc(item.relicId, relic.description)}</div>
        ${relic.flavor && getLocale() === 'zh' ? `<div class="reward-flavor">"${relic.flavor}"</div>` : ''}
      </div>
      <div class="reward-cost">💰${item.cost}</div>
      <div class="reward-type relic-type relic-rarity-${rarityClass}">${t(`shop.rarity.${rarityClass}`)}</div>
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

  if (item.type === 'pack') {
    card.onclick = () => {
      juiceUp(card, 0.2, 3);
      purchasePackItem(index);
    };
  } else if (item.type === 'relic') {
    card.onclick = () => {
      juiceUp(card, 0.2, 3);
      purchaseShopRelicItem(index);
    };
  } else {
    card.onclick = () => {
      juiceUp(card, 0.2, 3);
      purchaseShopItem(index);
    };
  }

  el.rewardCards.appendChild(card);
}

// === 牌包辅助函数 ===

function getPackIcon(condType: PackConditionType): string {
  const meta = getConditionMeta({ type: condType });
  return meta.icon;
}

function highlightWord(word: string, boundKeySet: Set<string>): string {
  return word.split('').map(c =>
    boundKeySet.has(c.toLowerCase())
      ? `<span class="bound-letter">${c}</span>` : c
  ).join('');
}

function getFreqHints(word: string): string {
  const boundKeys = new Set([...state.player.bindings.keys()]);
  const counts = new Map<string, number>();
  for (const c of word.toLowerCase()) {
    if (boundKeys.has(c)) counts.set(c, (counts.get(c) || 0) + 1);
  }
  const hints: string[] = [];
  counts.forEach((n, k) => hints.push(`+${n} ${k.toUpperCase()}`));
  return hints.join(' ');
}

function togglePackExpand(card: HTMLElement, item: ShopItem, index: number): void {
  const existing = card.querySelector('.pack-expanded');
  if (existing) {
    existing.remove();
    card.classList.remove('expanded');
    return;
  }

  // 折叠其他已展开的牌包
  document.querySelectorAll('.reward-card.expanded').forEach(c => {
    c.querySelector('.pack-expanded')?.remove();
    c.classList.remove('expanded');
  });

  const pack = item.pack!;
  card.classList.add('expanded');
  const boundKeySet = new Set([...state.player.bindings.keys()]);

  const expandDiv = document.createElement('div');
  expandDiv.className = 'pack-expanded';

  // 渲染每个词行（无 checkbox，仅展示）
  pack.words.forEach((word) => {
    const row = document.createElement('div');
    row.className = 'pack-word-row';

    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-text';
    wordSpan.innerHTML = highlightWord(word, boundKeySet);

    const lenSpan = document.createElement('span');
    lenSpan.className = 'pack-word-len';
    lenSpan.textContent = `${word.length} ${t('shop.letters')}`;

    const freqSpan = document.createElement('span');
    freqSpan.className = 'pack-freq-hint';
    freqSpan.textContent = getFreqHints(word);

    row.append(wordSpan, lenSpan, freqSpan);
    expandDiv.appendChild(row);
  });

  // 购买按钮（整包购买）
  const buyBtn = document.createElement('button');
  buyBtn.className = 'pack-buy-btn';
  buyBtn.textContent = t('shop.buy_pack', { count: pack.words.length, cost: item.cost });
  buyBtn.disabled = state.gold < item.cost;

  buyBtn.onclick = (e) => {
    e.stopPropagation();
    purchasePackItem(index);
  };
  expandDiv.appendChild(buyBtn);

  card.appendChild(expandDiv);
}

function purchasePackItem(index: number): void {
  const item = state.shop.items[index];
  if (!item || item.type !== 'pack' || !item.pack) return;

  if (state.gold < item.cost) {
    showFeedback(t('shop.no_gold'), '#ff6b6b');
    return;
  }

  state.gold -= item.cost;
  updateGoldDisplay();
  playSound('buy');

  // 整包词全部加入词库
  for (const word of item.pack.words) {
    state.player.wordDeck.push(word);
  }

  showFeedback(t('shop.add_words', { count: item.pack.words.length }), '#4ecdc4');
  state.shop.items.splice(index, 1);
  renderUnifiedShop();
  renderBuildManager();
}

// === 核心购买逻辑（仅技能） ===
// 返回购买的 skillId 或 null（非技能/失败），供调用者做后续绑定/进化
function executePurchase(index: number): { skillId: string; isNew: boolean } | null {
  const item = state.shop.items[index];
  if (!item || item.type !== 'skill') return null;

  if (state.gold < item.cost) {
    showFeedback(t('shop.no_gold'), '#ff6b6b');
    return null;
  }

  const skillId = item.skillId!;

  state.gold -= item.cost;
  updateGoldDisplay();
  playSound('buy');

  const isNew = !item.isUpgrade;
  const isAffix = !!item.affixSkill;

  if (isAffix) {
    // 词条制技能购买/升级
    const affixSkill = item.affixSkill!;
    if (item.isUpgrade) {
      const data = state.player.skills.get(skillId);
      if (data) {
        data.level = Math.min(3, data.level + 1);
        data.purchasePrice = (data.purchasePrice || 0) + item.cost;
      }
      // 同步更新 affixSkills 中的 level
      const existing = state.affixSkills.get(skillId);
      if (existing) existing.level = data?.level || existing.level;
      showFeedback(t('shop.skill_upgrade', { name: affixSkill.name }), '#ffe66d');
    } else {
      // 新词条制技能
      affixSkill.purchasePrice = item.cost;
      state.player.skills.set(skillId, { level: 1, purchasePrice: item.cost });
      state.affixSkills.set(skillId, affixSkill);
      state.affixSkillStates.set(skillId, createSkillRuntimeState(skillId));
      showFeedback(t('shop.got_skill', { name: affixSkill.name }), '#4ecdc4');
    }
  } else if (item.isUpgrade) {
    const data = state.player.skills.get(skillId);
    if (data) {
      data.level++;
      data.purchasePrice = (data.purchasePrice || 0) + item.cost;
    }
    const skName = localizeItemName(skillId, (PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId] || REPLICATORS[skillId] || AMPLIFIERS[skillId])?.name || '');
    showFeedback(t('shop.skill_upgrade', { name: skName }), '#ffe66d');
  } else {
    state.player.skills.set(skillId, { level: 1, purchasePrice: item.cost });
    const skName = localizeItemName(skillId, (PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId] || REPLICATORS[skillId] || AMPLIFIERS[skillId])?.name || '');
    showFeedback(t('shop.got_skill', { name: skName }), '#4ecdc4');

    // 首次获取某类型技能时显示 tooltip
    const category = getSkillCategory(skillId);
    if (category && !state.seenSkillTypes.has(category)) {
      state.seenSkillTypes.add(category);
      const tip = getSkillTypeTooltip(category);
      if (tip) showFeedback(tip.text, tip.color);
    }
  }

  state.shop.items.splice(index, 1);

  // T2 遗物事件钩子：技能购买后触发 (Story 28.1)
  resolveRelicEffectsWithBehaviors('on_skill_purchase', {
    purchasedSkillId: skillId,
    isUpgrade: !isNew,
  });
  // T2 campfire_ember 购买计数递增 (Story 28.2)
  if (state.player.relics.has('campfire_ember')) {
    state.player.relicStates['campfire_ember'] = (state.player.relicStates['campfire_ember'] ?? 0) + 1;
  }

  return { skillId, isNew };
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

  // T4 极简主义：新购买的技能自动升至 max_skill_level
  const minMaxLevel = queryRelicFlag('max_skill_level') as number;
  if (result.isNew && minMaxLevel !== Infinity && minMaxLevel > 1) {
    const data = state.player.skills.get(result.skillId);
    if (data && data.level < minMaxLevel) {
      data.level = minMaxLevel;
      showFeedback(t('shop.auto_level', { level: minMaxLevel }), '#ffe66d');
    }
  }

  if (result.skillId) checkAutoEnchantment(result.skillId);

  renderUnifiedShop();
  renderBuildManager();
}

// === 购买遗物商品 ===
function purchaseShopRelicItem(index: number): void {
  const item = state.shop.items[index];
  if (!item || item.type !== 'relic' || !item.relicId) return;

  const relicId = item.relicId;
  const relic = RELICS[relicId];
  if (!relic) return;

  if (state.gold < item.cost) {
    showFeedback(t('shop.no_gold'), '#ff6b6b');
    return;
  }

  if (state.player.relics.has(relicId)) {
    showFeedback(t('shop.already_owned'), '#ff6b6b');
    return;
  }

  if (!isRelicSlotsFull()) {
    state.gold -= item.cost;
    addRelicWithCapacity(relicId);
    updateGoldDisplay();
    showFeedback(t('shop.got_relic', { icon: relic.icon, name: localizeItemName(relicId, relic.name) }), '#ffe66d');
    playSound('buy');
    state.shop.items.splice(index, 1);
    renderRelicDisplay();
    renderUnifiedShop();
    renderBuildManager();
  } else {
    // 槽位已满 → 弹出替换 UI（放弃则不扣金）
    const modal = document.getElementById('relic-picker-modal');
    if (modal) modal.classList.remove('relic-picker-hidden');

    showRelicReplaceUI(relicId, () => {
      // 检查是否成功替换（新遗物已在 relics 中）
      if (state.player.relics.has(relicId)) {
        state.gold -= item.cost;
        updateGoldDisplay();
        state.shop.items.splice(index, 1);
      }
      const m = document.getElementById('relic-picker-modal');
      if (m) m.classList.add('relic-picker-hidden');
      renderRelicDisplay();
      renderUnifiedShop();
      renderBuildManager();
    });
  }
}

// === 自动进化检查 ===
function checkAutoEnchantment(skillId: string): void {
  const data = state.player.skills.get(skillId);
  if (!data || data.level < 3) return;

  // T4 限制遗物：附魔锁定
  if (queryRelicFlag('enchant_lock') === true) {
    showFeedback(t('shop.enchant_locked'), '#ff0000');
    return;
  }

  // 词条制技能走新附魔流程（Quest 附魔 → enchantmentIds）
  const affixSkill = state.affixSkills.get(skillId);
  if (affixSkill) {
    const slotCount = getEnchantmentSlotCount(affixSkill);
    if (affixSkill.enchantmentIds.length >= slotCount) return;
    const candidates = filterEnchantmentsByClass(
      filterQuestCandidates(affixSkill),
      state.classId !== 'none' ? state.classId : undefined,
    );
    if (candidates.length === 0) return;
    // 职业门控：蜕变师失去附魔选择权 → 随机附魔
    if (!isFeatureEnabled('enchant-choice')) {
      applyAffixRandomEnchantment(skillId, affixSkill, candidates);
      renderUnifiedShop();
      renderBuildManager();
    } else {
      renderAffixEnchantmentModal(skillId, affixSkill, candidates);
    }
    return;
  }

  // 旧系统：产出者/转化者/增幅者走附魔系统
  if (isProducer(skillId) || isConverter(skillId) || isAmplifier(skillId)) {
    if (state.player.enchantedSkills.has(skillId)) return;
    // 职业门控：蜕变师失去附魔选择权 → 随机附魔
    if (!isFeatureEnabled('enchant-choice')) {
      applyRandomEnchantment(skillId);
      renderUnifiedShop();
      renderBuildManager();
    } else {
      renderEnchantmentModal(skillId);
    }
  }
}

// === 补偿检查：商店外升级导致的未附魔Lv.3技能 ===
function checkPendingEnchantments(): void {
  // T4 限制遗物：附魔锁定 → 跳过补偿附魔
  if (queryRelicFlag('enchant_lock') === true) return;

  const pending: string[] = [];
  for (const [skillId, data] of state.player.skills) {
    if (data.level >= 3 && (isProducer(skillId) || isConverter(skillId) || isAmplifier(skillId)) && !state.player.enchantedSkills.has(skillId)) {
      pending.push(skillId);
    }
  }
  if (pending.length === 0) return;
  // 逐个弹出附魔选择（前一个关闭后弹下一个）
  showEnchantmentQueue(pending, 0);
  // 随机附魔路径：批量处理完后统一重渲染（避免 N 次冗余重建）
  if (!isFeatureEnabled('enchant-choice')) {
    renderUnifiedShop();
    renderBuildManager();
  }
}

function showEnchantmentQueue(queue: string[], index: number): void {
  if (index >= queue.length) return;
  const skillId = queue[index];
  // 可能在队列过程中已被附魔（用户选择了）
  if (state.player.enchantedSkills.has(skillId)) {
    showEnchantmentQueue(queue, index + 1);
    return;
  }
  // 职业门控：蜕变师失去附魔选择权 → 逐个随机附魔
  if (!isFeatureEnabled('enchant-choice')) {
    applyRandomEnchantment(skillId);
    showEnchantmentQueue(queue, index + 1);
    return;
  }
  renderEnchantmentModal(skillId, () => showEnchantmentQueue(queue, index + 1));
}

// === 刷新商店 ===
function refreshShop(): void {
  const cost = (state.shop.refreshCount + 1) * 5;
  if (state.gold < cost) {
    showFeedback(t('shop.no_gold'), '#ff6b6b');
    return;
  }
  state.gold -= cost;
  state.shop.refreshCount++;
  updateGoldDisplay();
  playSound('buy');

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

  // 移除词条制技能数据（AC4 — 运行时状态丢弃）
  state.affixSkills.delete(skillId);
  state.affixSkillStates.delete(skillId);

  // 移除技能
  state.player.skills.delete(skillId);

  updateGoldDisplay();
  showFeedback(t('shop.sell', { price: sellPrice }), '#ffe66d');
  playSound('buy');
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
  showFeedback(t('shop.sell_word', { word }), '#ffe66d');
  playSound('buy');
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

// === 随机附魔（蜕变师失去附魔选择权时使用） ===
// 不调用 applyEnchantment 避免：双重 feedback + 无用 closeModal + 冗余 re-render
// === 词条制技能附魔（写入 enchantmentIds） ===

function getQuestEnchantmentDef(type: EnchantmentType) {
  return QUEST_ENCHANTMENT_DEFS.find(d => d.type === type);
}

/** 词条制技能随机附魔（蜕变师路径） */
function applyAffixRandomEnchantment(
  skillId: string,
  affixSkill: import('../data/affixes').AffixSkillInstance,
  candidates: EnchantmentType[],
): void {
  const chosen = candidates[Math.floor(random() * candidates.length)];
  affixSkill.enchantmentIds.push(chosen);
  const def = getQuestEnchantmentDef(chosen);
  if (def) {
    showFeedback(t('shop.random_enchant', { icon: '✨', name: def.name }), '#f9ca24');
  }
  resolveRelicEffectsWithBehaviors('on_enchantment_acquire', {
    enchantedSkillId: skillId,
    enchantmentId: chosen,
  });
  if (state.player.relics.has('star_chart')) {
    state.player.relicStates['star_chart'] = (state.player.relicStates['star_chart'] ?? 0) + 1;
  }
  playSound('buy');
}

/** 词条制技能附魔选择界面 */
function renderAffixEnchantmentModal(
  skillId: string,
  affixSkill: import('../data/affixes').AffixSkillInstance,
  candidates: EnchantmentType[],
): void {
  _enchantmentOnClose = null;
  const modal = document.getElementById('enchantment-modal');
  const titleEl = document.getElementById('enchantment-title');
  const branchesEl = document.getElementById('enchantment-branches');
  const cancelBtn = document.getElementById('enchantment-cancel');
  if (!modal || !titleEl || !branchesEl || !cancelBtn) return;

  // 取最多 2 个候选
  const shown = candidates.length <= 2 ? candidates : [
    candidates[Math.floor(random() * candidates.length)],
    candidates[Math.floor(random() * candidates.length)],
  ].filter((v, i, a) => a.indexOf(v) === i); // dedupe

  titleEl.textContent = t('shop.enchant_choose', { name: affixSkill.name });
  branchesEl.innerHTML = '';

  shown.forEach(enchType => {
    const def = getQuestEnchantmentDef(enchType);
    if (!def) return;
    const card = document.createElement('div');
    card.className = 'enchantment-branch';
    card.innerHTML = `
      <div class="enchantment-category-tag" style="color:#4ecdc4">${t('shop.enchant_cat.quest') || '任务'}</div>
      <div class="enchantment-branch-icon">✨</div>
      <div class="enchantment-branch-name">${def.name}</div>
      <div class="enchantment-branch-desc">${def.effectDesc} (${def.targetStacks}次触发)</div>
    `;
    card.onclick = () => {
      affixSkill.enchantmentIds.push(enchType);
      resolveRelicEffectsWithBehaviors('on_enchantment_acquire', {
        enchantedSkillId: skillId,
        enchantmentId: enchType,
      });
      if (state.player.relics.has('star_chart')) {
        state.player.relicStates['star_chart'] = (state.player.relicStates['star_chart'] ?? 0) + 1;
      }
      showFeedback(t('shop.enchanted', { icon: '✨', name: def.name }), '#f9ca24');
      playSound('buy');
      closeEnchantmentModal();
      renderUnifiedShop();
      renderBuildManager();
    };
    branchesEl.appendChild(card);
  });

  cancelBtn.onclick = () => closeEnchantmentModal();
  modal.style.display = 'flex';
}

export function applyRandomEnchantment(skillId: string): void {
  const skillRelation = isAmplifier(skillId) ? AMPLIFIERS[skillId].positionRelation : undefined;
  const [enchA, enchB] = drawEnchantmentPair(skillRelation);
  const chosen = random() < 0.5 ? enchA : enchB;

  // 核心状态写入（同 applyEnchantment）
  state.player.enchantedSkills.set(skillId, chosen);
  const ench = ENCHANTMENTS[chosen];
  if (ench) {
    showFeedback(t('shop.random_enchant', { icon: ench.icon, name: localizeItemName(chosen, ench.name) }), '#f9ca24');
  }

  // 遗物钩子（同 applyEnchantment）
  resolveRelicEffectsWithBehaviors('on_enchantment_acquire', {
    enchantedSkillId: skillId,
    enchantmentId: chosen,
  });
  if (state.player.relics.has('star_chart')) {
    state.player.relicStates['star_chart'] = (state.player.relicStates['star_chart'] ?? 0) + 1;
  }

  playSound('buy');
  // 不调用 closeEnchantmentModal()（未打开模态框）
  // 不调用 renderUnifiedShop / renderBuildManager（由调用方统一处理）
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

  const sk = PRODUCERS[skillId] || CONVERTERS[skillId] || AMPLIFIERS[skillId];
  if (!sk) return;

  // 增幅者：空间附魔只刷与自身范围匹配的
  const skillRelation = isAmplifier(skillId) ? AMPLIFIERS[skillId].positionRelation : undefined;
  const [enchA, enchB] = drawEnchantmentPair(skillRelation);
  const enchantments = [ENCHANTMENTS[enchA], ENCHANTMENTS[enchB]];

  titleEl.textContent = t('shop.enchant_choose', { name: localizeItemName(skillId, sk.name) });
  branchesEl.innerHTML = '';

  enchantments.forEach(ench => {
    if (!ench) return;
    const card = document.createElement('div');
    card.className = 'enchantment-branch';
    const catLabel = ench.category === 'spatial' ? t('shop.enchant_cat.spatial')
      : ench.category === 'transmutation' ? t('shop.enchant_cat.transmutation')
      : t('shop.enchant_cat.independent');
    const catColor = ench.category === 'spatial' ? '#4ecdc4'
      : ench.category === 'transmutation' ? '#ffe66d'
      : '#ff6b6b';
    const enchDescText = isAmplifier(skillId) && ench.category === 'transmutation' && ench.extraResource
      ? t('shop.enchant_dual', { icon: RESOURCE_ICONS[ench.extraResource] || '', label: t(`resource.${ench.extraResource}`), pct: Math.round(ench.effectValue * 100) })
      : localizeItemDesc(ench.id, ench.desc);
    card.innerHTML = `
      <div class="enchantment-category-tag" style="color:${catColor}">${catLabel}</div>
      <div class="enchantment-branch-icon">${ench.icon}</div>
      <div class="enchantment-branch-name">${localizeItemName(ench.id, ench.name)}</div>
      <div class="enchantment-branch-desc">${enchDescText}</div>
      <div class="enchantment-branch-cost">${t('shop.enchant_cost')}</div>
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
    showFeedback(t('shop.enchanted', { icon: ench.icon, name: localizeItemName(enchantmentId, ench.name) }), '#f9ca24');
  }

  // T2 遗物事件钩子：附魔获取后触发 (Story 28.1)
  resolveRelicEffectsWithBehaviors('on_enchantment_acquire', {
    enchantedSkillId: skillId,
    enchantmentId,
  });
  // T2 star_chart 附魔计数递增 (Story 28.2)
  if (state.player.relics.has('star_chart')) {
    state.player.relicStates['star_chart'] = (state.player.relicStates['star_chart'] ?? 0) + 1;
  }

  playSound('buy');
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
  const rep = REPLICATORS[skillId];
  if (rep) relations.push(rep.positionRelation);
  const amp = AMPLIFIERS[skillId];
  if (amp) relations.push(amp.positionRelation);
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
    const sk = PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId] || AMPLIFIERS[skillId];
    if (sk) showFeedback(t('shop.unbound', { name: localizeItemName(skillId, sk.name), key: key.toUpperCase() }), '#ff6b6b');
  }

  // === 遗物数字行 ===
  const relicArray = [...state.player.relics];
  const relicRow = document.createElement('div');
  relicRow.className = 'keyboard-row relic-row';

  const RELIC_KEYS = ['1','2','3','4','5','6','7','8','9','0'];
  RELIC_KEYS.forEach((k, i) => {
    const slot = document.createElement('div');
    slot.className = 'key-slot relic-key-slot';
    slot.dataset.relicIndex = String(i);

    if (relicArray[i]) {
      const relic = RELICS[relicArray[i]];
      if (!relic) return;
      slot.classList.add('has-relic');
      slot.classList.add(`relic-${relic.rarity}`);
      slot.innerHTML = `<span class="key-letter">${k}</span><span class="relic-slot-icon">${relic.icon}</span>`;
      // 富文本悬停提示
      slot.addEventListener('mouseenter', (e: MouseEvent) => {
        showRelicTooltip(e, relic);
      });
      slot.addEventListener('mousemove', (e: MouseEvent) => {
        moveRelicTooltip(e);
      });
      slot.addEventListener('mouseleave', hideRelicTooltip);
    } else {
      slot.classList.add('relic-slot-empty');
      slot.innerHTML = `<span class="key-letter">${k}</span><span class="relic-slot-icon">·</span>`;
    }
    relicRow.appendChild(slot);
  });
  el.boundGrid.appendChild(relicRow);

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
      if (skillId && (PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId] || REPLICATORS[skillId] || AMPLIFIERS[skillId])) {
        const display = getSkillDisplay(skillId);
        const school = getSkillSchool(skillId);
        slot.classList.add('has-skill');
        slot.dataset.dragType = 'skill-key';
        slot.dataset.boundSkill = skillId;
        const skData = state.player.skills.get(skillId);
        slot.dataset.sellPrice = String(Math.floor((skData?.purchasePrice || 15) / 2));
        slot.classList.add(school.cssClass);
        // Story 34.6 AC1: 乘算化附魔金色边框
        if (state.player.enchantedSkills.get(skillId) === 'ench_multiply') {
          slot.classList.add('multiply-enchanted');
        }
        // Story 34.6 AC6: 非 standard 产出者机制角标
        const prodMechanic = isProducer(skillId) ? getProducerMechanic(skillId) : null;
        const mechanicBadgeHtml = prodMechanic && prodMechanic !== 'standard'
          ? `<span class="mechanic-icon-badge">${MECHANIC_ICONS[prodMechanic] || ''}</span>` : '';
        const devoured = state.devourIcons.get(skillId);
        const devourPrefix = devoured && devoured.length > 0 ? `<span class="devour-icons">${devoured.join('')}</span>` : '';
        const growthVal = state.growthValues.get(skillId) || 0;
        const growthBadge = growthVal > 0 ? `<span class="growth-badge">+${Math.round(growthVal * 100)}%</span>` : '';
        slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span><span class="key-skill">${devourPrefix}${display.icon}</span>${growthBadge}${mechanicBadgeHtml}${score > 0 ? `<span class="key-score">${score}</span>` : ''}`;
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
        if (skillId && (PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId] || REPLICATORS[skillId] || AMPLIFIERS[skillId])) {
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
          // 增幅者额外信息：叠层 + 范围内受影响技能
          if (isAmplifier(skillId)) {
            const amp = AMPLIFIERS[skillId];
            tooltipData.skill.amplifierStacks = Math.floor(state.amplifierStacks.get(skillId) || 0);
            const affected: string[] = [];
            for (const [bk, bId] of state.player.bindings) {
              if (bk === k) continue;
              if (!isProducer(bId) && !isConverter(bId)) continue;
              if (hasRelation(bk, k, amp.positionRelation)) {
                const d = getSkillDisplayInfo(bId, undefined, state.player.enchantedSkills);
                affected.push(`${d.icon}${d.name}`);
              }
            }
            tooltipData.skill.affectedSkills = affected;
          }
          // Story 34.6 AC3: 机制信息
          tooltipData.skill.mechanicInfo = buildMechanicInfo(skillId);
          // 附魔状态信息
          tooltipData.skill.enchantmentInfo = buildEnchantmentInfo(skillId);
        }
        highlightSkillRange(k);
        // Story 34.6 AC7: 虚无范围空位高亮
        if (skillId && isProducer(skillId)) {
          const voidProd = PRODUCERS[skillId];
          if (voidProd?.mechanic === 'void' && voidProd.mechanicParams && 'posRel' in voidProd.mechanicParams) {
            const related = getKeysWithRelation(k, (voidProd.mechanicParams as any).posRel);
            related.forEach(rk => {
              if (!state.player.bindings.has(rk)) {
                document.querySelector(`.key-slot[data-key="${rk}"]`)?.classList.add('void-range-empty');
              }
            });
          }
        }
        const avoidRect = getRangeHighlightRect(slot);
        keyTooltip.show(e.clientX, e.clientY, tooltipData, avoidRect ?? undefined);
      });
      slot.addEventListener('mouseleave', () => {
        keyTooltip.hide();
        clearRangeHighlight();
        // Story 34.6 AC7: 清除虚无范围高亮
        document.querySelectorAll('.key-slot.void-range-empty').forEach(el => el.classList.remove('void-range-empty'));
      });

      rowDiv.appendChild(slot);
    });

    el.boundGrid.appendChild(rowDiv);
  });

  // 已拥有技能
  el.ownedSkills.innerHTML = '';
  if (state.player.skills.size === 0) {
    el.ownedSkills.innerHTML = `<div style="color:#444;font-size:11px;">${t('shop.buy_skills_hint')}</div>`;
    registerShopDropZones();
    return;
  }

  state.player.skills.forEach((data, skillId) => {
    const sk = PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId] || AMPLIFIERS[skillId];
    if (!sk) return;

    const display = getSkillDisplay(skillId);
    const boundKey = [...state.player.bindings.entries()].find(([, id]) => id === skillId)?.[0];

    const item = document.createElement('div');
    item.className = 'inventory-skill';
    item.dataset.dragType = 'skill-inventory';
    item.dataset.skillId = skillId;
    item.dataset.sellPrice = String(Math.floor((data.purchasePrice || 15) / 2));
    if (boundKey) item.classList.add('bound');

    const school = getSkillSchool(skillId);
    const evolvedLabel = state.player.evolvedSkills.has(skillId) ? '<span class="inv-evolved">★</span>' : '';
    item.innerHTML = `
      <span class="inv-icon">${display.icon}</span>
      <span class="inv-name">${display.name}</span>
      ${evolvedLabel}
      <span class="inv-school ${school.cssClass}">${school.label}</span>
      ${data.level > 1 ? `<span class="inv-level">Lv.${data.level}</span>` : ''}
      ${boundKey ? `<span class="inv-key">[${boundKey.toUpperCase()}]</span>` : ''}
    `;

    // 悬停预览技能效果
    item.addEventListener('mouseenter', (e) => {
      const tooltipData: KeyTooltipData = {
        skill: {
          name: display.name,
          icon: display.icon,
          description: display.desc,
          level: data.level,
          school: school.label,
          schoolCssClass: school.cssClass,
        },
      };
      // 增幅者额外信息：叠层 + 范围内受影响技能
      if (isAmplifier(skillId) && boundKey) {
        const ampDef = AMPLIFIERS[skillId];
        tooltipData.skill!.amplifierStacks = Math.floor(state.amplifierStacks.get(skillId) || 0);
        const affected: string[] = [];
        for (const [bk, bId] of state.player.bindings) {
          if (bk === boundKey) continue;
          if (!isProducer(bId) && !isConverter(bId)) continue;
          if (hasRelation(bk, boundKey, ampDef.positionRelation)) {
            const d = getSkillDisplayInfo(bId, undefined, state.player.enchantedSkills);
            affected.push(`${d.icon}${d.name}`);
          }
        }
        tooltipData.skill!.affectedSkills = affected;
      }
      // Story 34.6 AC3: 机制信息
      tooltipData.skill!.mechanicInfo = buildMechanicInfo(skillId);
      // 附魔状态信息
      tooltipData.skill!.enchantmentInfo = buildEnchantmentInfo(skillId);
      if (boundKey) {
        tooltipData.letter = boundKey.toUpperCase();
        highlightSkillRange(boundKey);
      }
      keyTooltip.show(e.clientX, e.clientY, tooltipData);
    });
    item.addEventListener('mouseleave', () => {
      keyTooltip.hide();
      clearRangeHighlight();
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

  // 清除旧的字频统计
  el.ownedWords.parentElement!.querySelector('.freq-stats')?.remove();

  // 字频统计区
  const freqs = calculateLetterFrequency(state.player.wordDeck);
  const freqContainer = document.createElement('div');
  freqContainer.className = 'freq-stats';
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(97 + i);
    const freq = freqs.get(letter) || 0;
    const block = document.createElement('div');
    block.className = 'freq-letter';
    if (freq < 5) block.classList.add('freq-low');
    else if (freq >= 10) block.classList.add('freq-high');
    else block.classList.add('freq-mid');
    block.dataset.letter = letter;
    block.innerHTML = `<span class="freq-char">${letter.toUpperCase()}</span><span class="freq-num">${freq}</span>`;
    freqContainer.appendChild(block);
  }
  el.ownedWords.parentElement!.insertBefore(freqContainer, el.ownedWords);

  const boundKeys = new Set(state.player.bindings.keys());

  state.player.wordDeck.forEach((word, index) => {
    const item = document.createElement('div');
    item.className = 'word-item';
    item.dataset.dragType = 'word';
    item.dataset.word = word;
    item.dataset.wordIndex = String(index);
    item.dataset.sellPrice = '3';

    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-text';
    wordSpan.innerHTML = word.split('').map(c =>
      boundKeys.has(c.toLowerCase()) ? `<span class="bound-letter">${c}</span>` : c
    ).join('');

    item.appendChild(wordSpan);
    el.ownedWords.appendChild(item);
  });
}

const MIN_WORD_COUNT = 3;

function removeWord(index: number): void {
  if (index < 0 || index >= state.player.wordDeck.length) return;
  if (state.player.wordDeck.length <= MIN_WORD_COUNT) {
    showFeedback(t('shop.min_words', { count: MIN_WORD_COUNT }), '#ff6b6b');
    return;
  }
  const word = state.player.wordDeck[index];
  state.gold += 3;
  state.player.wordDeck.splice(index, 1);
  updateGoldDisplay();
  showFeedback(t('shop.sell_word_feedback', { word }), '#ffe66d');
  playSound('buy');
  renderUnifiedShop();
  renderWordInventory();
}

// === 卖词字频跌落警告 ===
function highlightFreqDropWarning(word: string): void {
  const freqs = calculateLetterFrequency(state.player.wordDeck);
  const wordCounts = new Map<string, number>();
  for (const c of word.toLowerCase()) {
    wordCounts.set(c, (wordCounts.get(c) || 0) + 1);
  }
  const warnLetters = new Set<string>();
  wordCounts.forEach((count, letter) => {
    const current = freqs.get(letter) || 0;
    if (current >= 5 && current - count < 5) {
      warnLetters.add(letter);
    }
  });
  if (warnLetters.size === 0) return;
  document.querySelectorAll('.freq-letter').forEach(block => {
    const letter = (block as HTMLElement).dataset.letter;
    if (letter && warnLetters.has(letter)) {
      block.classList.add('freq-drop-warn');
    }
  });
}

function clearFreqDropWarning(): void {
  document.querySelectorAll('.freq-letter.freq-drop-warn')
    .forEach(el => el.classList.remove('freq-drop-warn'));
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

  // 2. 已有技能区 — 接受 skill-key（从键盘卸下技能）
  const skillInv = document.getElementById('skill-inventory');
  if (skillInv) {
    dragManager.registerDropZone({
      element: skillInv,
      type: 'skill-inventory',
      accepts: (payload: DragPayload) => payload.type === 'skill-key',
      onDrop: (payload: DragPayload) => {
        const skillId = payload.skillId;
        const sourceKey = payload.sourceKey;
        if (!skillId || !sourceKey) return;
        state.player.bindings.delete(sourceKey);
        renderBuildManager();
      },
    });
  }

  // 3. 卖出区 — 接受 skill-inventory、skill-key、word
  const sellZone = document.getElementById('sell-zone');
  if (sellZone) {
    dragManager.registerDropZone({
      element: sellZone,
      type: 'sell-zone',
      accepts: (payload: DragPayload) => {
        if (payload.type === 'word') {
          return state.player.wordDeck.length > MIN_WORD_COUNT;
        }
        return payload.type === 'skill-inventory' || payload.type === 'skill-key';
      },
      onDrop: (payload: DragPayload) => {
        if (payload.type === 'word' && payload.wordIndex != null) {
          removeWord(payload.wordIndex);
          return;
        }
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

    renderBuildManager();
  }
}

// === 统计面板渲染 ===
function renderStatsPanel(): void {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;
  const bs = state.battleStats;
  if (!bs) {
    panel.innerHTML = `<div class="stats-empty">${t('shop.no_stats')}</div>`;
    return;
  }

  // 评级
  const rating = bs.rating || calculateRating({
    score: state.score,
    targetScore: state.targetScore,
    perfectWords: bs.perfectWords,
    wordsCompleted: bs.wordsCompleted,
    timeRemaining: state.time,
    timeMax: state.timeMax,
  });
  const ratingClass = getRatingTier(rating).cssClass;

  // 技能产出金币总计
  let totalGold = 0;
  bs.keyStats.forEach(ks => { totalGold += ks.resources.gold; });

  panel.innerHTML = `
    <div class="stats-header">
      <div class="rating-badge ${ratingClass}">${rating}</div>
      <div class="stats-summary">
        <span>${t('shop.words_done', { count: bs.wordsCompleted })}</span>
        <span>${t('shop.words_perfect', { count: bs.perfectWords })}</span>
        <span>${t('shop.chain_count', { count: bs.totalChainTriggers })}</span>
        ${bs.maxChainDepth > 1 ? `<span>${t('shop.max_chain', { count: bs.maxChainDepth })}</span>` : ''}
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

function getHeatmapDimensions(): { key: HeatmapDimension; label: string; color: string }[] {
  const resources: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold'];
  // Story 32.2: 激活的职业资源也显示在热力图维度中
  const classRes = CLASS_DEFINITIONS[state.classId]?.uniqueResource;
  if (classRes) resources.push(classRes);
  return [
    { key: 'triggerCount', label: t('shop.heatmap.triggers'), color: '#aaa' },
    ...resources.map(r => ({ key: r as HeatmapDimension, label: t(`resource.${r}`), color: RESOURCE_COLORS[r] })),
  ];
}

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
  getHeatmapDimensions().forEach(d => {
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

  // Story 32.2: 包含激活的职业资源
  const tooltipResources: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold'];
  const tooltipClassRes = CLASS_DEFINITIONS[state.classId]?.uniqueResource;
  if (tooltipClassRes) tooltipResources.push(tooltipClassRes);
  const resourceLines = tooltipResources
    .filter(r => ks.resources[r] > 0)
    .map(r => `<div class="ht-resource"><span style="color:${RESOURCE_COLORS[r]}">${RESOURCE_ICONS[r]} ${t(`resource.${r}`)}</span> +${ks.resources[r].toFixed(1)}</div>`)
    .join('');

  tip.innerHTML = `
    <div class="ht-key">${key.toUpperCase()}</div>
    <div class="ht-count">${t('shop.heatmap.triggered', { count: ks.triggerCount })}</div>
    ${resourceLines}
  `;

  tip.style.left = e.clientX + 12 + 'px';
  tip.style.top = e.clientY - 10 + 'px';
  document.body.appendChild(tip);
}

function hideHeatmapTooltip(): void {
  document.getElementById('heatmap-tooltip')?.remove();
}

// === 遗物悬停提示 ===
const RELIC_RARITY_COLORS: Record<string, string> = { common: '#aaa', rare: '#4488cc', legendary: '#ffd700' };
function getRarityLabel(rarity: string): string {
  return t(`shop.rarity.${rarity}`);
}

function showRelicTooltip(e: MouseEvent, relic: import('../data/relics').RelicData): void {
  hideRelicTooltip();
  const tip = document.createElement('div');
  tip.id = 'relic-tooltip';
  tip.className = 'key-tooltip';
  const rarityColor = RELIC_RARITY_COLORS[relic.rarity] || '#aaa';
  tip.innerHTML =
    `<div style="font-size:14px;font-weight:bold;color:#fff;margin-bottom:4px;">${relic.icon} ${localizeItemName(relic.id, relic.name)}</div>` +
    `<div style="font-size:9px;padding:1px 4px;border-radius:3px;display:inline-block;margin-bottom:4px;background:rgba(255,255,255,0.08);color:${rarityColor};">${getRarityLabel(relic.rarity)}</div>` +
    `<div style="color:#aaa;font-size:10px;white-space:normal;">${localizeItemDesc(relic.id, relic.description)}</div>` +
    (relic.flavor && getLocale() === 'zh' ? `<div style="color:#666;font-size:9px;font-style:italic;margin-top:4px;">${relic.flavor}</div>` : '');
  tip.style.left = e.clientX + 12 + 'px';
  tip.style.top = e.clientY + 12 + 'px';
  document.body.appendChild(tip);
  // 边界检测
  requestAnimationFrame(() => {
    const rect = tip.getBoundingClientRect();
    if (rect.right > window.innerWidth) tip.style.left = (e.clientX - rect.width - 12) + 'px';
    if (rect.bottom > window.innerHeight) tip.style.top = (e.clientY - rect.height - 12) + 'px';
  });
}

function moveRelicTooltip(e: MouseEvent): void {
  const tip = document.getElementById('relic-tooltip');
  if (!tip) return;
  tip.style.left = e.clientX + 12 + 'px';
  tip.style.top = e.clientY + 12 + 'px';
  requestAnimationFrame(() => {
    const rect = tip.getBoundingClientRect();
    if (rect.right > window.innerWidth) tip.style.left = (e.clientX - rect.width - 12) + 'px';
    if (rect.bottom > window.innerHeight) tip.style.top = (e.clientY - rect.height - 12) + 'px';
  });
}

function hideRelicTooltip(): void {
  document.getElementById('relic-tooltip')?.remove();
}

// === 统计面板 Tab 切换 ===
function initStatsTabs(): void {
  const buildTab = document.getElementById('build-tab');
  const statsTab = document.getElementById('stats-tab');
  const wordsTab = document.getElementById('words-tab');
  const craftTab = document.getElementById('craft-tab');
  const metamorphTab = document.getElementById('metamorph-tab');
  const buildManager = document.getElementById('build-manager');
  const statsPanel = document.getElementById('stats-panel');
  const wordPanel = document.getElementById('word-panel');
  const craftPanel = document.getElementById('craft-panel');
  const metamorphPanel = document.getElementById('metamorph-panel');
  if (!buildTab || !statsTab || !wordsTab || !buildManager || !statsPanel || !wordPanel) return;

  type TabId = 'build' | 'stats' | 'words' | 'craft' | 'metamorph';

  function switchTab(active: TabId) {
    buildTab!.classList.toggle('active', active === 'build');
    statsTab!.classList.toggle('active', active === 'stats');
    wordsTab!.classList.toggle('active', active === 'words');
    craftTab?.classList.toggle('active', active === 'craft');
    metamorphTab?.classList.toggle('active', active === 'metamorph');
    buildManager!.style.display = active === 'build' ? '' : 'none';
    statsPanel!.style.display = active === 'stats' ? '' : 'none';
    wordPanel!.style.display = active === 'words' ? '' : 'none';
    if (craftPanel) craftPanel.style.display = active === 'craft' ? '' : 'none';
    if (metamorphPanel) metamorphPanel.style.display = active === 'metamorph' ? '' : 'none';
    if (active === 'stats') renderStatsPanel();
    if (active === 'words') renderWordInventory();
    if (active === 'craft' && craftPanel) {
      renderCraftPanel(craftPanel, updateGoldDisplay);
    }
    if (active === 'metamorph' && metamorphPanel) {
      renderMetamorphPanel(metamorphPanel);
    }
  }

  // 职业门控：造词师失去牌包系统 → 显示造词台 tab，但保留词库 tab（只读）
  if (!isFeatureEnabled('pack-system')) {
    // 显示造词台 tab
    if (craftTab) {
      craftTab.style.display = '';
      resetCraftInput();
    }
  } else {
    // 非造词师：隐藏造词台 tab
    if (craftTab) craftTab.style.display = 'none';
  }

  // 职业门控：蜕变师 → 显示蜕变台 tab
  if (state.classId === 'metamorph') {
    if (metamorphTab) metamorphTab.style.display = '';
  } else {
    if (metamorphTab) metamorphTab.style.display = 'none';
  }

  // Demo: 隐藏词包标签
  if (IS_DEMO && wordsTab) {
    wordsTab.style.display = 'none';
  }

  switchTab('build');
  buildTab.onclick = () => switchTab('build');
  statsTab.onclick = () => switchTab('stats');
  wordsTab.onclick = () => switchTab('words');
  if (craftTab) craftTab.onclick = () => { if (!isFeatureEnabled('pack-system')) switchTab('craft'); };
  if (metamorphTab) metamorphTab.onclick = () => { if (state.classId === 'metamorph') switchTab('metamorph'); };
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
