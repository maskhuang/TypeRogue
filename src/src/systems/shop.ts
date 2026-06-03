// ============================================
// 打字肉鸽 - 商店系统（统一5商品）
// ============================================
// Epic 17: 统一商店 + 刷新/锁定/卖出 + 拖拽交互

import { state, isRelicSlotsFull, addRelicWithCapacity } from '../core/state';
import { resolveRelicEffects, resolveRelicEffectsWithBehaviors, queryRelicFlag } from './relics/RelicPipeline';
import { KEYS, KEYBOARD_ROWS, RESOURCE_LABELS, RESOURCE_ICONS, RESOURCE_COLORS, PUNCTUATION_KEYS, PUNCTUATION_KEYBOARD_EXTENSION, A2_PRICE_MULT, A5_REFRESH_COST_MULT, computePracticeGold, INBOX_MAX } from '../core/constants';
import { getKeysWithRelation, hasRelation, PositionRelation } from '../data/keyboardTopology';


// === 位置关系标签（通过 t('rel.' + posRel) 获取） ===
import { calculateDeckStats } from '../data/words';
import { generateWordPacks, getConditionMeta } from '../data/wordPacks';
import { getElements } from '../ui/elements';
import { playSound, playDeskSound } from '../effects/sound';
import { juiceUp, calculateRating, getRatingTier } from '../effects/juice';
import { showScreen, startLevel, renderRelicDisplay, showFeedback, randomizeScreenBackground, getCalibrationInfo } from './battle';
import type { ShopItem, ResourceType, PackConditionType } from '../core/types';
import { GENERIC_RESOURCES, getActiveResources } from './classes/ClassResourceFilter';
import { getNextBattleNode, isSecondHalf, getPositionInCycle } from './stage/stageFlow';
import { calculateLetterFrequency, calculateLetterScores, FREQ_UNLOCK_THRESHOLD } from './letters/LetterFrequencySystem';
import { getCandidatePool, widenSkillFilter, spawnSkillFromSeed } from './affixV2SkillFilter';
import type { SkillFilter } from '../data/affixV2Trigger';
import { getSectionName, SECTION_COLORS, type SectionTag } from '../data/affixTags';
import { RELICS, MAX_RELIC_SLOTS } from '../data/relics';
import type { RelicWeights } from './relicPicker';
import { generateRelicCandidates, showRelicReplaceUI } from './relicPicker';
// row_medal deleted — autoSelectRowMedal/getRowMedalRowName removed
import { setWordDealerFlag, consumeWordDealerFreeRefresh } from './relics/WordRelicBehaviors';
import { checkUniversalFurnace, initFurnace, getFurnaceConfig, preRollOfferedResources } from './relics/ResourceRelicBehaviors';
import { checkBountyOnStageEnd } from './relics/StageRelicBehaviors';
import { getBountyHunterDiscount } from './relics/BossModifierRelicBehaviors';
import { getSRankTrophyGold, consumeDeadlyGiftFreeRefresh } from './relics/ScoringRelicBehaviors';
import { getDiscountMultiplier, getRecycleSellMultiplier, getBlackMarketExtraSlots, canSmuggleFree, consumeSmuggleFree, isTimedAuction, startAuctionTimer, clearAuctionTimer, resetShopRelicState } from './relics/ShopRelicBehaviors';
import { hasIntermissionFreeRefresh, consumeIntermissionFreeRefresh } from './relics/StageRelicBehaviors';
import { keyTooltip, AFFIX_COLORS } from '../ui/keyboard/KeyTooltip';
import type { KeyTooltipData } from '../ui/keyboard/KeyTooltip';
import { getAffixV2Definition, getV2Color } from '../data/affixV2';
import { extractSelectorFromEffect, resolveSelectorToHighlightKeys } from './affixV2ScopeKeys';
import { random } from '../core/seededRandom';
import { dragManager, registerShapePreviewRenderer } from './dragManager';
import { isFeatureEnabled, getFeatureLostReason } from './classes/ClassFeatureGate';
import { renderCraftPanel, resetCraftInput } from './classes/CraftingStation';
import { renderMetamorphPanel } from './classes/MetamorphStation';
import { eventBus } from '../core/events/EventBus';
import type { DragPayload } from './dragManager';
import { IS_DEMO } from '../demo/demo-config';
import { t, getLocale, localizeItemName, localizeItemDesc, localizeItemFlavor } from '../demo/demo-i18n';
import { formatAffixRef } from '../ui/affixAbbrev';
// Story 60.5: feature flag dispatcher 用 — 按 UserSettings.shopUI 决定 classic / terminal
import { getSettings } from '../core/UserSettings';
import { enterTerminalShop } from '../ui/shopPreview';
import { generateSkill, generateName } from '../data/skillGeneration';
import { createSkillRuntimeState, RARITY_COLORS, RARITY_NAMES, AFFIX_CATEGORY_MAP, RESOURCE_NAMES } from '../data/affixes';
import type { SkillRarity } from '../data/affixes';
import { getEnchantmentSlotCount, filterEnchantmentCandidates, getTransmuteEligibleResources, isApprenticeEnchantment, resolvePhase1, countEmptySlots, getNeighborSkills, isConsonant, categorizeEnchantmentCandidates, weightedPickEnchantment, getAscendThreshold, isAffixGloballyTransformed, evaluateEquipQuests, getExtendedNeighbors, hasSharedMatch, isAuraQuestActive, computeTotalSwarmCount } from '../data/affixTrigger';
import { AffixType as AffixTypeEnum, filterEnchantmentsByClass, filterCategorizedByClass, QUEST_ENCHANTMENT_DEFS, ENCHANTMENT_META, TRANSMUTE_RATIO_TABLE, MULTIPLY_OPERATOR_BASE_VALUES, BASE_VALUES, EnchantmentType as EnchantmentTypeEnum, APPRENTICE_NEIGHBOR_GROWTH, applyAffixLevelScaling, previewAffixScaledValue, getSkillMaxLevel, getQuestEquipTarget, AFFIX_NAMES, CRIT_MULTIPLIER } from '../data/affixes';
import { invalidateBigramCache } from '../data/bigramFrequency';
import type { EnchantmentType } from '../data/affixes';
import type { CategorizedEnchantments } from '../data/affixTrigger';
import { getMonoAffixCategory } from './relics/RelicPipeline';
import { applyRitualEnchantment, generateRitualCandidates, pickRitualChoices, getEligibleSkills as getRitualEligibleSkills } from './ritualEnchantment';
import { consumePendingEnchantSkillIds, maybeGrantV2Enchant, processPendingV2Enchants } from './restStage';
import type { RitualCandidate } from './ritualEnchantment';
import { applyTrainingManual, rerollAllAffixes } from './relics/SkillRelicBehaviors';
import { hasGlassCannon } from './relics/TypingRelicBehaviors';
import { getAscendBaseScale } from '../data/affixTrigger';
import { getEnchantmentChoiceCount, getEnchantAnchorSlotBonus, getEnchantAnchorPriceMultiplier, getMinEnchantmentLevel, getQuestEquipReduction } from './relics/EnchantmentRelicBehaviors';
import { bindShapeToKeys, unbindSkill, unbindKey, autoBindSkill, getBindingState, getSkillAnchorKey } from './bindingManager';
import { getShapeCells, mapShapeToKeys, getShapeRotationCount } from '../data/skillShapes';

// === 零频键位缓存（供自动绑定使用） ===
let cachedLetterFreqs: Map<string, number> | null = null;

// === 限时拍卖倒计时显示值（模块级，供 renderUnifiedShop 重建 UI） ===
let _auctionRemaining: number = -1;

// === 词条制技能定价（Story 35.9） ===

/** 词条制技能按稀有度基础定价（稀有度 0/1/2/3 → 25/50/75/100；对应 1/2/3/4 词条） */
export const AFFIX_RARITY_BASE_PRICES: readonly [number, number, number, number] = [25, 50, 75, 100];

/** 词条制技能定价上限 */
export const AFFIX_SKILL_PRICE_CAP = 100;

/**
 * 词条制技能定价：按稀有度查表 × 等级系数 × 随机波动，上限 100。
 * @param fluctuation 随机波动因子（0.8~1.2），不传则无波动（用于 UI 显示等确定性场景）
 */
export function calculateAffixSkillPrice(rarity: number, level: number, fluctuation: number = 1): number {
  const base = AFFIX_RARITY_BASE_PRICES[Math.min(rarity, 3) as 0 | 1 | 2 | 3];
  const levelMult = 1 + (level - 1) * 0.2;
  return Math.min(Math.round(base * levelMult * fluctuation), AFFIX_SKILL_PRICE_CAP);
}

/** 生成随机价格波动因子（±20%） */
export function rollPriceFluctuation(): number {
  return 0.8 + random() * 0.4;
}

// RARITY_COLORS 从 affixes.ts 导入（白/蓝/黄/橙 四级稀有度边框颜色）

// 稀有度标签（i18n 优先，RARITY_NAMES 作为 fallback）
const RARITY_KEYS = ['common', 'rare', 'epic', 'legendary'] as const;
function rarityLabel(rarity: number): string {
  return t('shop.rarity.' + (RARITY_KEYS[rarity] ?? 'common')) || RARITY_NAMES[rarity as SkillRarity] || '?';
}

// === 形状预览（Story 40.4）===

/**
 * 生成形状预览的 HTML 字符串（CSS Grid 小型网格）
 * @returns HTML 字符串，monomino 返回空字符串
 */
export function renderShapePreview(shapeId: string, rotation: number, rarity: number): string {
  if (rarity <= 0 || shapeId === 'monomino' || !shapeId) return ''

  const cells = getShapeCells(shapeId, rotation)
  if (!cells || cells.length <= 1) return ''

  const maxRow = Math.max(...cells.map(c => c[0])) + 1
  const maxCol = Math.max(...cells.map(c => c[1])) + 1

  // Build filled set for quick lookup
  const filled = new Set(cells.map(([r, c]) => `${r},${c}`))

  let gridHtml = ''
  for (let r = 0; r < maxRow; r++) {
    for (let c = 0; c < maxCol; c++) {
      const isFilled = filled.has(`${r},${c}`)
      gridHtml += `<div class="shape-cell${isFilled ? ' filled' : ''}"></div>`
    }
  }

  return `<div class="shape-preview shape-preview-r${rarity}" style="grid-template-columns:repeat(${maxCol},1fr)">${gridHtml}</div>`
}

/**
 * 返回人类可读的形状描述
 * @returns 描述字符串，monomino 返回空字符串
 */
export function getShapeDescription(shapeId: string, cellCount: number): string {
  if (!shapeId || shapeId === 'monomino' || cellCount <= 1) return ''
  const name = t('shape.' + shapeId)
  // t() returns key itself if not found — treat that as unknown shape
  const hasName = name && name !== 'shape.' + shapeId
  return hasName
    ? t('shape.desc', { count: cellCount, name })
    : t('shape.desc_generic', { count: cellCount })
}

/** 职业可用资源池（排除非对应职业的 fragment/mutagen） */
const getAvailableResources = getActiveResources;

/** 位置 → 最大稀有度映射；Boss 商店(level===0)或后半段 → 全稀有度，前半段仅 white+blue */
function getActMaxRarity(): SkillRarity {
  // level===0 表示 Boss 胜利后的商店（advanceCycle 把 level 设为 0）
  if (state.level === 0 || isSecondHalf(state.level)) return 3 as SkillRarity;
  return 1 as SkillRarity; // 前半段: 0~1 (white + blue)
}

/** 技能在备战席中占据的格子数（每个技能固定 1 格） */
function getSkillSlotCost(_skillId: string): number {
  return 1;
}

/** 备战席容量固定为 5 */
export function getInventoryCapacity(): number {
  return 5;
}

/** 备战席已用格子数（仅计未装备技能） */
export function getInventoryUsed(): number {
  let used = 0;
  const boundSkills = new Set(state.player.bindings.values());
  for (const [skillId] of state.player.skills) {
    if (!boundSkills.has(skillId)) {
      used += getSkillSlotCost(skillId);
    }
  }
  return used;
}

/** 备战席是否已满（新技能无法放入） */
export function isInventoryFull(newSkillSlots: number = 1): boolean {
  return getInventoryUsed() + newSkillSlots > getInventoryCapacity();
}

/** 收集玩家已装备技能拥有的所有词条类型（去重） */
function collectPlayerAffixTypes(): AffixTypeEnum[] {
  const types = new Set<AffixTypeEnum>();
  for (const [, skillId] of state.player.bindings) {
    const affix = state.affixSkills.get(skillId);
    if (!affix) continue;
    for (const a of affix.affixes) {
      types.add(a.type as AffixTypeEnum);
    }
  }
  return [...types];
}


/** 生成单个词条制技能商品（避免与已有技能重名） */
export function generateAffixShopItem(
  itemId: number,
  options?: { rarity?: SkillRarity; resource?: ResourceType; maxRarity?: SkillRarity; excludeNames?: Set<string> },
): ShopItem {
  const resourcePool = getAvailableResources(state.classId);
  const resource = options?.resource ?? resourcePool[Math.floor(random() * resourcePool.length)];
  // 引力/斥力词条刷新偏向：收集所有 Gravity / Repulsion 技能
  const gravitySkills: AffixSkillInstance[] = [];
  const repulsionSkills: AffixSkillInstance[] = [];
  for (const [, sk] of state.affixSkills) {
    if (sk.affixes.some(a => a.type === AffixTypeEnum.Gravity)) gravitySkills.push(sk);
    if (sk.affixes.some(a => a.type === AffixTypeEnum.Repulsion)) repulsionSkills.push(sk);
  }
  const gravityBias = Math.min(0.25 * gravitySkills.length, 0.75);
  const repulsionBias = Math.min(0.25 * repulsionSkills.length, 0.75);
  const shouldBiasGravity = !options?.resource && gravitySkills.length > 0 && random() < gravityBias;
  const shouldBiasRepulsion = !options?.resource && repulsionSkills.length > 0 && random() < repulsionBias;
  const matchesGravity = (sk: AffixSkillInstance): boolean => {
    for (const gs of gravitySkills) {
      if (sk.resource === gs.resource) return true;
      if (sk.affixes.some(a => a.type !== AffixTypeEnum.Gravity && gs.affixes.some(ga => ga.type === a.type))) return true;
    }
    return false;
  };
  const matchesRepulsion = (sk: AffixSkillInstance): boolean => {
    for (const rs of repulsionSkills) {
      if (sk.resource === rs.resource) return true;
      if (sk.affixes.some(a => a.type !== AffixTypeEnum.Repulsion && rs.affixes.some(ra => ra.type === a.type))) return true;
    }
    return false;
  };
  const whiteOnly = false;
  // Act 稀有度上限（仅影响随机掷骰，不影响外部指定的 rarity）
  const actMaxRarity = options?.maxRarity ?? getActMaxRarity();
  let rarity: SkillRarity | undefined;
  if (whiteOnly) {
    rarity = 0 as SkillRarity;
  } else if (options?.rarity !== undefined) {
    rarity = options.rarity; // 外部强制稀有度，不受 Act 上限限制
  } else {
    rarity = undefined; // 由 generateSkill 内部掷骰，之后再 clamp
  }
  // mono_affix 类别限制：重试直到技能含已选类别词条
  const lockedCategory = getMonoAffixCategory();
  const excludeNames = options?.excludeNames;
  const playerClass = state.classId !== 'none' ? state.classId : undefined;
  let skill = generateSkill({ resource, rarity, availableResources: resourcePool, playerClass });
  // clamp：如果 rarity 未指定（随机掷骰），超过 actMaxRarity 时重生成
  if (rarity === undefined && skill.rarity > actMaxRarity) {
    skill = generateSkill({ resource, rarity: actMaxRarity, availableResources: resourcePool, playerClass });
  }
  // 重试：避免与已有技能/本批其他技能重名（最多 10 次）
  if (excludeNames && excludeNames.has(skill.name)) {
    for (let attempt = 0; attempt < 10; attempt++) {
      skill = generateSkill({ resource: resourcePool[Math.floor(random() * resourcePool.length)], rarity: skill.rarity as SkillRarity, availableResources: resourcePool, playerClass });
      if (rarity === undefined && skill.rarity > actMaxRarity) {
        skill = generateSkill({ resource: skill.resource, rarity: actMaxRarity, availableResources: resourcePool, playerClass });
      }
      if (!excludeNames.has(skill.name)) break;
    }
  }
  if (lockedCategory && skill.rarity > 0) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const hasMatch = skill.affixes.some(
        a => AFFIX_CATEGORY_MAP[a.type as keyof typeof AFFIX_CATEGORY_MAP]?.includes(lockedCategory),
      );
      if (hasMatch) break;
      skill = generateSkill({ resource, rarity: skill.rarity as SkillRarity, availableResources: resourcePool, playerClass });
    }
  }
  // 引力偏向：重试直到匹配现有引力技能（同资源或共享非引力词条）
  if (shouldBiasGravity && !matchesGravity(skill)) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const retryRes = gravitySkills[Math.floor(random() * gravitySkills.length)].resource;
      const retrySkill = generateSkill({ resource: retryRes, rarity: skill.rarity as SkillRarity, availableResources: resourcePool, playerClass });
      if (excludeNames?.has(retrySkill.name)) continue;
      skill = retrySkill;
      if (matchesGravity(skill)) break;
    }
  }
  // 斥力偏向：重试直到不匹配任何斥力技能
  if (shouldBiasRepulsion && matchesRepulsion(skill)) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const otherRes = resourcePool.filter(r => !repulsionSkills.some(rs => rs.resource === r));
      const retryRes = otherRes.length > 0
        ? otherRes[Math.floor(random() * otherRes.length)]
        : resourcePool[Math.floor(random() * resourcePool.length)];
      const retrySkill = generateSkill({ resource: retryRes, rarity: skill.rarity as SkillRarity, availableResources: resourcePool, playerClass });
      if (excludeNames?.has(retrySkill.name)) continue;
      skill = retrySkill;
      if (!matchesRepulsion(skill)) break;
    }
  }
  const cost = getAdjustedPrice(calculateAffixSkillPrice(skill.rarity, skill.level, rollPriceFluctuation()));

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

/** 商店基础技能位数（不含 black_market 额外位）· 进店生成 / reroll / terminal reshuffle 统一用此，防漂移。
 *  历史：曾是「3 技能 + 2 牌包」；牌包移到关末后补足为 5 技能位。 */
export const SHOP_SKILL_SLOTS = 5;

/** 生成多个词条制技能商品（保证品类多样性：至少 1 件 rarity≥1，除非 white_only 或 Act 限制；同批内互相去重） */
export function generateAffixShopItems(count: number): ShopItem[] {
  if (count <= 0) return [];
  const items: ShopItem[] = [];
  let nextId = Date.now();

  // 同批内互相去重（不排除已有技能名——重名由 generateShopItems 转为升级）
  const excludeNames = new Set<string>();

  const whiteOnly = queryRelicFlag('white_only') as boolean;
  const actMaxRarity = getActMaxRarity();

  if (whiteOnly) {
    // pure_heart：全部白装
    for (let i = 0; i < count; i++) {
      const item = generateAffixShopItem(nextId++, { excludeNames });
      excludeNames.add(item.affixSkill!.name);
      items.push(item);
    }
    return items;
  }

  // 第 1 件：正常掷骰（不保底蓝装）
  const firstItem = generateAffixShopItem(nextId++, { maxRarity: actMaxRarity, excludeNames });
  excludeNames.add(firstItem.affixSkill!.name);
  items.push(firstItem);

  // 质变·谐振：Resonance 质变后保底一个同资源技能
  if (isAffixGloballyTransformed(AffixTypeEnum.Resonance, state.affixSkills, state.affixSkillStates) && count > items.length) {
    const resSet = new Set<ResourceType>();
    for (const [, sk] of state.affixSkills) {
      for (const a of sk.affixes) {
        if (a.type === AffixTypeEnum.Resonance && a.resource) resSet.add(a.resource);
      }
    }
    if (resSet.size > 0) {
      const res = [...resSet][Math.floor(random() * resSet.size)];
      const item = generateAffixShopItem(nextId++, { resource: res, maxRarity: actMaxRarity, excludeNames });
      excludeNames.add(item.affixSkill!.name);
      items.push(item);
    }
  }

  // 质变·共鸣腔：Echo 质变后保底一个含监听词条的技能
  if (isAffixGloballyTransformed(AffixTypeEnum.Echo, state.affixSkills, state.affixSkillStates) && count > items.length) {
    const echoTypes = new Set<string>();
    for (const [, sk] of state.affixSkills) {
      for (const a of sk.affixes) {
        if (a.type === AffixTypeEnum.Echo) {
          if (a.echoAffixA) echoTypes.add(a.echoAffixA);
          if (a.echoAffixB) echoTypes.add(a.echoAffixB);
        }
      }
    }
    if (echoTypes.size > 0) {
      let matchItem: ShopItem | null = null;
      for (let attempt = 0; attempt < 15; attempt++) {
        const candidate = generateAffixShopItem(nextId++, { maxRarity: actMaxRarity, excludeNames });
        if (candidate.affixSkill!.affixes.some(a => echoTypes.has(a.type))) {
          matchItem = candidate; break;
        }
      }
      if (matchItem) {
        excludeNames.add(matchItem.affixSkill!.name);
        items.push(matchItem);
      }
    }
  }

  // 质变·集结：Union 质变后保底一个匹配技能（同资源或共享词条类型）
  let unionGuaranteed = false;
  if (isAffixGloballyTransformed(AffixTypeEnum.Union, state.affixSkills, state.affixSkillStates)) {
    const unionSkills = [...state.affixSkills.values()].filter(sk => sk.affixes.some(a => a.type === AffixTypeEnum.Union));
    if (unionSkills.length > 0 && count > 1) {
      const ref = unionSkills[Math.floor(random() * unionSkills.length)];
      let matchItem: ShopItem | null = null;
      for (let attempt = 0; attempt < 15; attempt++) {
        const candidate = generateAffixShopItem(nextId++, { maxRarity: actMaxRarity, excludeNames });
        const sk = candidate.affixSkill!;
        // 匹配：同资源 OR 共享词条类型（排除 Union 自身）
        const isMatch = sk.resource === ref.resource
          || sk.affixes.some(a => a.type !== AffixTypeEnum.Union && ref.affixes.some(ra => ra.type === a.type));
        if (isMatch) { matchItem = candidate; break; }
      }
      if (matchItem) {
        excludeNames.add(matchItem.affixSkill!.name);
        items.push(matchItem);
        unionGuaranteed = true;
      }
    }
  }

  // 剩余随机
  const remaining = count - items.length;
  for (let i = 0; i < remaining; i++) {
    const item = generateAffixShopItem(nextId++, { maxRarity: actMaxRarity, excludeNames });
    excludeNames.add(item.affixSkill!.name);
    items.push(item);
  }

  return items;
}

// Old producer/act skill weights removed (词条制 replaces old system)

// === 商店遗物权重：前半段 common+rare，后半段含 epic（传说仅 Boss 掉落） ===
const SHOP_RELIC_WEIGHTS_FIRST: RelicWeights = { common: 70, rare: 30, epic: 0, legendary: 0 };
const SHOP_RELIC_WEIGHTS_SECOND: RelicWeights = { common: 45, rare: 30, epic: 25, legendary: 0 };

// === 生成商店遗物商品 ===
export function generateShopRelicItem(act: number, itemId?: number): ShopItem | null {
  if (isRelicSlotsFull()) return null;
  const weights = (state.level === 0 || isSecondHalf(state.level))
    ? SHOP_RELIC_WEIGHTS_SECOND
    : SHOP_RELIC_WEIGHTS_FIRST;
  const candidates = generateRelicCandidates(weights);
  if (candidates.length === 0) return null;

  const relicId = candidates[0];
  const relic = RELICS[relicId];
  if (!relic) return null;
  // 产资源遗物：上架即赋资源类型，使商店预览即可见（购买前）
  preRollOfferedResources([relicId]);

  return {
    id: `si-${itemId ?? Date.now()}-relic`,
    type: 'relic',
    relicId,
    cost: getAdjustedPrice(relic.basePrice),
    isUpgrade: false,
    locked: false,
  };
}

// === Story 41.1: 附魔台商品生成 ===

/** 附魔商品基础价格 */
const ENCHANTMENT_SHOP_BASE_PRICE = 60;

/** 生成一个附魔台商品（从有空槽的技能池中选取合适的附魔类型） */
function generateShopEnchantmentItem(itemId: number): ShopItem | null {
  // 必须有空槽技能
  const eligible: AffixSkillInstance[] = [];
  const anchorBonus = getEnchantAnchorSlotBonus();
  for (const [, affixSkill] of state.affixSkills) {
    const slotCount = getEnchantmentSlotCount(affixSkill, anchorBonus);
    if (affixSkill.enchantmentIds.length < slotCount) {
      eligible.push(affixSkill);
    }
  }
  if (eligible.length === 0) return null;

  // 合并所有空槽技能的可用附魔候选
  const playerClass = state.classId !== 'none' ? state.classId : undefined;
  // 收集场上所有已装备词条类型
  const equippedAffixTypes = new Set<import('../data/affixes').AffixType>();
  for (const [, s] of state.affixSkills) {
    for (const affix of s.affixes) equippedAffixTypes.add(affix.type);
  }
  const allCandidates: Array<{ enchType: EnchantmentTypeEnum; transmuteRes?: ResourceType; neighborRel?: PositionRelation }> = [];
  const seenKeys = new Set<string>();
  for (const affixSkill of eligible) {
    const categorized = filterCategorizedByClass(
      categorizeEnchantmentCandidates(affixSkill, equippedAffixTypes),
      playerClass,
    );
    const allTypes = [...categorized.apprentice, ...categorized.quest, ...categorized.transmute, ...categorized.operator];
    for (const enchType of allTypes) {
      if ((enchType as string) === 'transmute') {
        const eligibleRes = getTransmuteEligibleResources(affixSkill.resource, playerClass);
        for (const res of eligibleRes) {
          const key = `${enchType}:${res}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            allCandidates.push({ enchType, transmuteRes: res });
          }
        }
      } else if (enchType === EnchantmentTypeEnum.ApprenticeNeighbor) {
        const ALL_POS_RELS = Object.values(PositionRelation);
        const rel = affixSkill.neighborPosRel as PositionRelation | undefined
          ?? ALL_POS_RELS[Math.floor(random() * ALL_POS_RELS.length)];
        const key = `${enchType}:${rel}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allCandidates.push({ enchType, neighborRel: rel });
        }
      } else {
        const key = enchType;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allCandidates.push({ enchType });
        }
      }
    }
  }
  if (allCandidates.length === 0) return null;

  // 随机选一个附魔
  const pick = allCandidates[Math.floor(random() * allCandidates.length)];
  const price = getAdjustedPrice(Math.round(ENCHANTMENT_SHOP_BASE_PRICE * rollPriceFluctuation()));

  return {
    id: `si-${itemId}-ench`,
    type: 'enchantment',
    enchantmentType: pick.enchType,
    transmuteRes: pick.transmuteRes,
    neighborRel: pick.neighborRel as string | undefined,
    cost: price,
    isUpgrade: false,
    locked: false,
  };
}

// === 附魔信息占位（旧系统已移除） ===
export function buildMechanicInfo(_skillId: string): string | undefined {
  return undefined;
}

// === 附魔状态信息（旧系统已移除） ===
export function buildEnchantmentInfo(_skillId: string): string | undefined {
  return undefined;
}

// === 词条制技能 tooltip 数据构建（Story 35.11 AC2/AC8） ===
import type { AffixTooltipInfo, SmartEstimate, EstimateBreakdownLine } from '../ui/keyboard/KeyTooltip';
import type { AffixSkillInstance, SkillRuntimeState, QuestEnchantmentDef } from '../data/affixes';
import { affixV2SkillToTooltipInfo } from '../ui/affixV2TooltipAdapter';


/** 获取技能在指定等级的有效基础值（支持升华 Lv4+） */
function getEffectiveBaseValue(baseValues: number[], level: number): number {
  const maxIdx = baseValues.length - 1;
  if (level - 1 <= maxIdx) return baseValues[level - 1] ?? baseValues[0];
  return Math.round(baseValues[maxIdx] * getAscendBaseScale(level) * 100) / 100;
}

/** 构建词条制技能的 tooltip 扩展字段 */
export function buildAffixTooltipFields(skill: AffixSkillInstance, rt?: SkillRuntimeState): {
  affixInfo: AffixTooltipInfo[]
  enchantments: Array<{ icon: string; name: string; desc: string; color: string }>
  questProgress?: string
  apprenticeGrowth?: string
} {
  const affixInfo: AffixTooltipInfo[] = skill.affixes
    .filter(a => !a.spent)
    .flatMap((a, _affixIdx) => {
      let desc = t('affix_desc.' + a.type);
      // 将「指定关系」/「in range」替换为具体位置关系名（如「同行」「相邻」/「adjacent」）
      if (a.posRel != null) {
        const relName = t('rel.' + a.posRel);
        desc = desc.replace('指定关系的', relName + '的');
        desc = desc.replace('指定关系', relName);
        desc = desc.replace(/\bin range\b/g, relName);
        desc = desc.replace('position relation', relName);
      }
      // 将资源占位符替换为具体资源（Convert）
      if (a.source) {
        const icon = RESOURCE_ICONS[a.source] || '';
        const name = t('resource.' + a.source) || a.source;
        desc = desc.replace('{source}', `${icon}${name}`);
      }
      // 共鸣：替换资源占位符
      if (a.type === 'resonance' && a.resource) {
        const icon = RESOURCE_ICONS[a.resource] || '';
        const name = t('resource.' + a.resource) || a.resource;
        desc = desc.replace('{resource}', `${icon}${name}`);
      }
      // 回响：替换词条类型占位符
      if (a.type === 'echo') {
        desc = desc.replace('{affixA}', formatAffixRef(a.echoAffixA ?? '?'));
        desc = desc.replace('{affixB}', formatAffixRef(a.echoAffixB ?? '?'));
      }
      // 落差：替换 flowK 占位符
      if (a.flowK != null) desc = desc.replace('{flowK}', `${Math.round(a.flowK * 100)}`);
      // 静态数值占位符（从参数移出的固定信息）
      if (a.initialMult != null) desc = desc.replace('{init}', `${Math.round(a.initialMult * 100)}%`);
      if (a.decayPerTrigger != null) desc = desc.replace('{decayRate}', `${Math.round(a.decayPerTrigger * 100)}%`);
      if (a.gainPerSec != null) desc = desc.replace('{gain}', `${a.gainPerSec}s`);
      if (a.maxTriggers != null) desc = desc.replace('{maxTriggers}', String(a.maxTriggers));
      if (a.patchLow != null) desc = desc.replace('{low}', String(a.patchLow));
      // 雇佣：替换金币/加成占位符
      if (a.hireCost != null) desc = desc.replace(/\{hireCost\}/g, String(a.hireCost));
      if (a.hireBonus != null) desc = desc.replace('{hireBonus}', `${Math.round(a.hireBonus * 100)}`);
      // 回音：替换惩罚占位符
      if (a.reechoPenalty != null) desc = desc.replace('{reechoPenalty}', `${Math.round(a.reechoPenalty * 100)}`);
      // 短视：替换加成/代价占位符
      if (a.myopiaBonus != null) desc = desc.replace('{myopiaBonus}', `${Math.round(a.myopiaBonus * 100)}`);
      if (a.myopiaCost != null) desc = desc.replace('{myopiaCost}', String(a.myopiaCost));
      if (a.silkwormK != null) desc = desc.replace('{silkwormK}', `${Math.round(a.silkwormK * 100)}`);
      // 接力/回溯/遗产：替换 N
      if (a.handoffCount != null) desc = desc.replace('{handoffCount}', String(a.handoffCount));
      if (a.rewindCount != null) desc = desc.replace('{rewindCount}', String(a.rewindCount));
      if (a.endowCount != null) desc = desc.replace('{endowCount}', String(a.endowCount));
      // 引力：替换概率占位符
      if (a.probMult != null) desc = desc.replace('{probMult}', a.probMult.toFixed(1));
      // 流放/禁忌：替换暴击率占位符
      if (a.bonusPercent != null) desc = desc.replace('{bonusPercent}', `${Math.round(a.bonusPercent * 100)}`);
      // 增幅：替换加成占位符
      if (a.amplifyK != null) desc = desc.replace('{amplifyK}', `${Math.round(a.amplifyK * 100)}`);
      // 战鼓：替换暴击率占位符
      if (a.critPerStack != null) desc = desc.replace('{critPerStack}', `${Math.round(a.critPerStack * 100)}`);
      // 光环：替换数值占位符
      if (a.auraCrit != null) desc = desc.replace('{auraCrit}', `${Math.round(a.auraCrit * 100)}`);
      if (a.auraMorale != null) desc = desc.replace('{auraMorale}', `${Math.round(a.auraMorale * 100)}`);
      // Mirror: 复制后显示复制词条的完整描述，参数标注「倒影」
      if (a.type === 'mirror' && rt) {
        const copied = (rt.mirrorCopiedAffixes && rt.mirrorCopiedAffixes.length > 0)
          ? rt.mirrorCopiedAffixes
          : rt.mirrorCopiedAffix ? [rt.mirrorCopiedAffix] : null;
        if (copied && copied.length > 0) {
          // 替换为复制词条的信息，每个单独一条
          return copied.map(c => {
            let cDesc = t('affix_desc.' + c.type);
            if (c.posRel != null) {
              const relName = t('rel.' + c.posRel);
              cDesc = cDesc.replace('指定关系的', relName + '的');
              cDesc = cDesc.replace('指定关系', relName);
              cDesc = cDesc.replace(/\bin range\b/g, relName);
              cDesc = cDesc.replace('position relation', relName);
            }
            if (c.source) cDesc = cDesc.replace('{source}', `${RESOURCE_ICONS[c.source] || ''}${t('resource.' + c.source) || c.source}`);
            if (c.type === 'resonance' && c.resource) cDesc = cDesc.replace('{resource}', `${RESOURCE_ICONS[c.resource] || ''}${t('resource.' + c.resource) || c.resource}`);
            if (c.type === 'echo') { cDesc = cDesc.replace('{affixA}', formatAffixRef(c.echoAffixA ?? '?')); cDesc = cDesc.replace('{affixB}', formatAffixRef(c.echoAffixB ?? '?')); }
            return {
              typeName: `${formatAffixRef(c.type)} (${formatAffixRef('mirror')})`,
              typeKey: c.type,
              paramSummary: buildAffixParamSummary(c, skill.level, rt),
              description: cDesc,
            };
          });
        }
      }
      let paramSummary = buildAffixParamSummary(a, skill.level, rt);
      // MonkeyPatch: 标注被修改的词条
      if (rt && a.type !== 'monkey_patch') {
        const pIdx = rt.patchTargetIndex ?? -1;
        const pMult = rt.patchMultiplier ?? 1.0;
        if (pMult !== 1.0 && (pIdx === -2 || pIdx === _affixIdx)) {
          paramSummary += ` 🐒×${pMult.toFixed(2)}`;
        }
      }
      const SELF_ZERO_MATCH_TYPES = ['amplify', 'splash', 'war_drum', 'relay', 'conduit', 'aura_fury', 'aura_morale'];
      const PRODUCING_STACK_TYPES_LIST = ['resonance', 'echo', 'fury', 'tide'];
      // 有自零词条时，屏蔽非自零、非产出型叠层词条的参数和描述（仅保留名称）
      const skillHasSelfZero = skill.affixes.some(sa => SELF_ZERO_MATCH_TYPES.includes(sa.type));
      const shouldHideDetail = skillHasSelfZero
        && !SELF_ZERO_MATCH_TYPES.includes(a.type)
        && !PRODUCING_STACK_TYPES_LIST.includes(a.type);
      return {
        typeName: t('affix.' + a.type),
        typeKey: a.type,
        paramSummary: shouldHideDetail ? '' : paramSummary,
        description: shouldHideDetail ? undefined : desc,
        isMatchAffix: SELF_ZERO_MATCH_TYPES.includes(a.type),
      };
    })

  // V2 词条注入：附魔感知的 tooltip · 已绑定 skill 展示附魔后效果，未绑定回退原 def
  if (skill.v2Ids && skill.v2Ids.length > 0) {
    affixInfo.push(...affixV2SkillToTooltipInfo(skill));
  }

  // 附魔列表
  const enchantments: Array<{ icon: string; name: string; desc: string; color: string }> = [];
  for (const enchId of skill.enchantmentIds) {
    const info = getEnchantmentDisplayInfo(enchId as EnchantmentType, skill.transmuteResource, skill.neighborPosRel, skill.bonusOutputResource);
    if (info) {
      enchantments.push({
        icon: info.icon,
        name: info.name,
        desc: info.desc,
        color: info.categoryColor,
      });
    }
  }

  let questProgress: string | undefined
  let apprenticeGrowth: string | undefined

  if (rt) {
    // 任务进度 / 质变状态
    const questEnch = skill.enchantmentIds
      .map(id => QUEST_ENCHANTMENT_DEFS.find((d: QuestEnchantmentDef) => d.type === id))
      .find((d): d is QuestEnchantmentDef => d != null)
    if (questEnch) {
      if (rt.questTransformed) {
        questProgress = t('tooltip.quest_done', { effect: questEnch.transformDesc || t('quest.' + questEnch.type + '.effect') })
      } else {
        const equipTarget = getQuestEquipTarget(questEnch.targetAffix, getQuestEquipReduction())
        const affixNames = (Array.isArray(questEnch.targetAffix) ? questEnch.targetAffix : [questEnch.targetAffix])
          .map(at => t('affix.' + at) || AFFIX_NAMES[at] || at)
          .join('/')
        questProgress = t('tooltip.quest_equip', { stacks: rt.questStacks, target: equipTarget, affix: affixNames })
      }
    }
    // 学徒成长（显示 EXP / 升华阈值）
    const hasApprentice = skill.enchantmentIds.some(id => isApprenticeEnchantment(id as EnchantmentType))
    if (hasApprentice) {
      const acc = rt.apprenticeAccumulated
      const threshold = skill.level >= 3 ? getAscendThreshold(skill.level) : 0
      if (threshold > 0) {
        apprenticeGrowth = t('tooltip.apprentice_exp', { exp: (acc * 100).toFixed(1), threshold: (threshold * 100).toFixed(0), level: skill.level + 1 })
      } else if (acc > 0) {
        apprenticeGrowth = t('tooltip.apprentice_growth', { pct: (acc * 100).toFixed(1) })
      } else {
        apprenticeGrowth = t('tooltip.apprentice_pending')
      }
    }
  }

  return { affixInfo, enchantments, questProgress, apprenticeGrowth }
}

/**
 * Story 60.9: 工作台 hover tooltip 数据构建
 * 与 classic shop.ts:1908-1990 / 3528-3554 路径行为对齐（去掉升级路径分支 — workbench 无升级语义）
 * 需要 skillId 已经在 state.affixSkills 内（IN-tray + 已绑键 都满足）
 */
export function buildSkillKeyTooltipData(skillId: string, boundKeys?: string[]): KeyTooltipData | null {
  const skill = state.affixSkills.get(skillId)
  if (!skill) return null
  const rt = state.affixSkillStates.get(skillId)
  const baseVal = getEffectiveBaseValue(skill.baseValues, skill.level)
  const resIcon = RESOURCE_ICONS[skill.resource] || ''
  const resName = t('resource.' + skill.resource) || RESOURCE_NAMES[skill.resource] || skill.resource
  // M1 review fix: 与 classic shop.ts:1956-1958 同步守卫 — 仅当全局乘法变换激活时才显示 ×N
  const hasMultOp = (skill.enchantmentIds.includes(EnchantmentTypeEnum.MultiplyOperator as string)
    || skill.enchantmentIds.includes(EnchantmentTypeEnum.QuestMultiplyOp as string))
    && isAffixGloballyTransformed(AffixTypeEnum.Multiply, state.affixSkills, state.affixSkillStates)
  const multOpBase = hasMultOp
    ? (MULTIPLY_OPERATOR_BASE_VALUES[skill.resource]?.[skill.level - 1] ?? baseVal)
    : null

  const data: KeyTooltipData = {
    skill: {
      name: generateName(skill.resource, skill.affixes),
      icon: skill.icon,
      description: hasMultOp ? `${resIcon}${resName}×${multOpBase}` : `${resIcon}${resName}+${baseVal}`,
      level: skill.level,
      school: rarityLabel(skill.rarity),
      schoolCssClass: `rarity-${skill.rarity}`,
    },
  }
  const fields = buildAffixTooltipFields(skill, rt)
  data.skill!.affixInfo = fields.affixInfo
  data.skill!.enchantments = fields.enchantments
  data.skill!.questProgress = fields.questProgress
  data.skill!.apprenticeGrowth = fields.apprenticeGrowth
  data.skill!.critChance = computeSkillCritChance(skill)
  const estimate = computeSmartEstimate(skill, rt, boundKeys && boundKeys.length > 0 ? boundKeys : undefined)
  if (estimate) data.skill!.smartEstimate = estimate
  // 形状描述
  const shapeDesc = getShapeDescription(skill.shapeId ?? 'monomino', getShapeCells(skill.shapeId ?? 'monomino', skill.rotation ?? 0)?.length ?? 1)
  if (shapeDesc) data.skill!.mechanicInfo = shapeDesc
  return data
}

/** 构建单个词条的参数摘要（仅显示会随升级变化的数值） */
function buildAffixParamSummary(a: import('../data/affixes').AffixInstance, skillLevel?: number, rt?: import('../data/affixes').SkillRuntimeState): string {
  switch (a.type) {
    // ── 暴击类（变化值） ──
    case 'crit': return `+${Math.round((a.chance ?? 0) * 100)}%`
    case 'charge': return `×${(a.maxBonus ?? 2.5).toFixed(1)}`
    case 'decay': return `${t('param.decay_label')} ${Math.round((a.floor ?? 0) * 100)}%`
    case 'recurse': return `+${Math.round((a.recurseChance ?? 0) * 100)}%`
    case 'taboo': return `+${Math.round((a.bonusPercent ?? 0) * 100)}%`
    case 'fallacy': return `+${Math.round((a.fallacyK ?? 0) * 100)}%/${t('param.fallacy_per')}`
    // ── 数值类（变化值） ──
    case 'convert': return `${t('resource.' + (a.source ?? '?'))}`
    case 'multiply': return `×${a.multiplyValue?.toFixed(1) ?? '?'}`
    case 'cascade': return `×${a.cascadeMult?.toFixed(1) ?? '?'}`
    case 'outcast': return `+${Math.round((a.bonusPercent ?? 0) * 100)}%${t('param.aura_crit')}`
    case 'void': return `+${Math.round((a.bonusPerSlot ?? 0) * 100)}%/${t('param.void_per')}`
    case 'swarm': return `+${Math.round((a.swarmK ?? 0) * 100)}%/${t('param.void_per')}`
    case 'mercenary': return `${a.hireCost ?? '?'} +${Math.round((a.hireBonus ?? 0) * 100)}%`
    case 'reecho': return `-${Math.round((a.reechoPenalty ?? 0) * 100)}%/${t('param.reecho_per')}`
    case 'myopia': return `+${Math.round((a.myopiaBonus ?? 0) * 100)}% (+${a.myopiaCost ?? '?'}${t('param.myopia_cost')})`
    case 'silkworm': return `+${Math.round((a.silkwormK ?? 0) * 100)}%/${t('param.void_per')}`
    case 'aura_fury': return `+${Math.round((a.auraCrit ?? 0) * 100)}%${t('param.aura_crit')}`
    case 'aura_morale': return `+${Math.round((a.auraMorale ?? 0) * 100)}%`
    case 'fiber': return `${t('param.interval_label')} ${a.fiberInterval ?? 4}`
    case 'spelling': return `${t('param.interval_label')} ${a.spellingInterval ?? 5}`
    case 'proofread': return `${t('param.interval_label')} ${a.proofreadInterval ?? 4}`
    case 'first_edition': return `×${(a.firstEditionMult ?? 2).toFixed(1)}`
    case 'reprint': return `+${Math.round((a.reprintK ?? 0) * 100)}%/${t('param.per_repeat')}`
    case 'matrix': return `+${Math.round((a.matrixK ?? 0) * 100)}%/${t('param.per_letter')}`
    case 'typeset': return `+${Math.round((a.typesetK ?? 0) * 100)}%/${t('param.per_letter')}`
    case 'handoff': return `×${a.handoffCount ?? 0}`
    case 'rewind': return `×${a.rewindCount ?? 0}`
    case 'endow': return `→${a.endowCount ?? 0}`
    case 'gravity': return `+${a.probMult?.toFixed(1) ?? '?'}x`
    case 'repulsion': return `×${a.probMult?.toFixed(2) ?? '?'}`
    case 'exhaust': {
      const max = a.maxTriggers ?? '?';
      const used = rt?.exhaustCount ?? 0;
      const remaining = typeof max === 'number' ? max - used : max;
      return `×${a.exhaustMult?.toFixed(1) ?? '?'} (${remaining}/${max})`
    }
    case 'reflect': return `+${Math.round((a.reflectK ?? 0) * 100)}%`
    // ── 叠层类（变化值） ──
    case 'resonance': return `${t('resource.' + (a.resource ?? 'base'))} ${a.interval ?? 4}`
    case 'echo': return `${formatAffixRef(a.echoAffixA ?? '?')}+${formatAffixRef(a.echoAffixB ?? '?')} ${a.interval ?? 4}`
    case 'fury': return `${a.interval ?? 4}`
    case 'tide': return `${a.interval ?? 6}s`
    case 'war_drum': return `+${Math.round((a.critPerStack ?? 0) * 100)}%/${t('param.wardrum_per')}`
    // ── 拓扑类（变化值） ──
    case 'flow': return `+${Math.round((a.flowK ?? 0) * 100)}%`
    case 'confluence': return `+${Math.round((a.confluenceK ?? 0) * 100)}%`
    case 'union': return `+${Math.round((a.unionK ?? 0) * 100)}%/${t('param.void_per')}`
    // ── 其他（变化值） ──
    case 'ligature': return `×${Math.round((a.ligatureBonus ?? 1.0) * 100)}%`
    case 'innate': return `${a.innateCount ?? 1}${t('param.innate_unit')}`
    case 'monkey_patch': return `~×${(a.patchHigh ?? 2.0).toFixed(1)}`
    // ── 无缩放参数 ──
    case 'amplify': return `+${Math.round((a.amplifyK ?? 0) * 100)}%/${t('param.void_per')}`
    case 'rainbow': case 'twin': case 'mirror':
    case 'conduit': case 'relay': case 'splash':      return ''
    // 蜕变系：按技能等级显示
    case 'excavate': case 'treasure': {
      const rKeys = ['common', 'rare', 'epic', 'legendary']
      return t('shop.rarity.' + rKeys[Math.min((skillLevel ?? 1) - 1, 2)])
    }
    case 'refine': return `${Math.round(50 * (skillLevel ?? 1))}%`
    case 'evolve': return `${Math.round(25 + 25 * (skillLevel ?? 1))}%`
    case 'harvest': return `${50 * (skillLevel ?? 1)}`
    case 'mutacrit': return `+${5 * (skillLevel ?? 1)}%`
    case 'ascend': { const lv = skillLevel ?? 1; return lv >= 3 ? `+1 ${t('param.ascend_guaranteed')}` : `${25 + 25 * lv}%` }
    case 'chain': { const n = skillLevel ?? 1; return n >= 3 ? t('param.chain_all') : `${n}${t('param.chain_unit')}` }
    case 'volatile': { const lv = skillLevel ?? 1; return lv >= 3 ? `2${t('param.volatile_stage')} ×2.0` : `1${t('param.volatile_stage')} ×${(1 + 0.5 * lv).toFixed(1)}` }
    default: return ''
  }
}

// === 智能产出预估（构筑界面 tooltip） ===

// APPRENTICE_ENCHANTMENT_IDS 已被 isApprenticeEnchantment() 取代



/**
 * 计算战斗外可预估的产出：Void / Taboo 词条 + 学徒附魔。
 * 返回 null 表示该技能没有可预估项。
 * @param boundKeys 技能绑定的键位（无绑定时传 undefined，Void 需要；多格技能传所有占据键）
 */
export function computeSmartEstimate(
  skill: AffixSkillInstance,
  rt?: SkillRuntimeState,
  boundKeys?: string | string[],
): SmartEstimate | null {
  // 包含自身不产出的词条时，屏蔽产出预估（词条列表仍正常显示）
  // 注：Endow 不在此列 —— 它虽不直接入账，但"本应产出量"是捐赠基数，
  //     其他词条（Crit/Void/Union 等）对这一数值的放大是有意义的，应照常预估
  const SELF_ZERO_TYPES: string[] = ['conduit', 'amplify', 'splash', 'relay', 'war_drum', 'aura_fury', 'aura_morale']
  if (skill.affixes.some(a => SELF_ZERO_TYPES.includes(a.type))) return null

  const breakdown: EstimateBreakdownLine[] = []

  // Phase 1: 基础值
  const hasMultOp = (skill.enchantmentIds.includes(EnchantmentTypeEnum.MultiplyOperator as string)
    || skill.enchantmentIds.includes(EnchantmentTypeEnum.QuestMultiplyOp as string))
    && isAffixGloballyTransformed(AffixTypeEnum.Multiply, state.affixSkills, state.affixSkillStates)
  const rawBase = resolvePhase1(skill)
  const base = hasMultOp
    ? (MULTIPLY_OPERATOR_BASE_VALUES[skill.resource]?.[skill.level - 1] ?? rawBase)
    : rawBase
  if (hasMultOp) {
    breakdown.push({ typeKey: 'base', label: t('est.base_mult', { val: base }), detail: '' })
  } else {
    breakdown.push({ typeKey: 'base', label: t('est.base_add', { val: base }), detail: '' })
  }

  // 收集 Phase 2 加性和 Phase 3 乘性
  let addPercent = 0  // 加性总百分比
  let multProduct = 1 // 乘性连乘
  let critChanceAccum = 0 // 暴击子系统：累计暴击率
  let hasTabooFlag = false // 禁忌：未暴击时负产出
  /** 格式化 bonus 为 +XX% */
  const fmtBonus = (name: string, bonus: number) =>
    `${name} +${Math.round(bonus * 100)}%`

  for (const affix of skill.affixes) {
    switch (affix.type) {
      case 'void': {
        if (affix.posRel == null) break
        // 41-4: quest stacking removed — 直接使用 affix.bonusPerSlot
        const slotEff = affix.bonusPerSlot ?? 0
        const empty = boundKeys
          ? countEmptySlots(boundKeys, affix.posRel, state.player.bindings)
          : 0
        const bonus = empty * slotEff
        addPercent += bonus
        const emptyLabel = boundKeys ? t('est.void_slots', { count: empty }) : t('est.void_unbound')
        const detail = `(${emptyLabel}×${Math.round(slotEff * 100)}%)`
        breakdown.push({ typeKey: 'void', label: t('est.void', { pct: Math.round(bonus * 100) }), detail })
        break
      }
      case 'taboo': {
        critChanceAccum += affix.bonusPercent ?? 0
        hasTabooFlag = true
        break
      }
      case 'multiply': {
        // Phase 3: 乘算 ×N
        const m = affix.multiplyValue ?? 1
        multProduct *= m
        breakdown.push({ typeKey: 'multiply', label: t('est.multiply', { val: m.toFixed(1) }), detail: '' })
        break
      }
      case 'outcast': {
        // 流放：首/尾字母触发时+暴击率（条件性，不计入总暴击）
        const outcastCrit = affix.bonusPercent ?? 0
        if (outcastCrit > 0) {
          breakdown.push({ typeKey: 'outcast', label: t('est.outcast', { pct: Math.round(outcastCrit * 100) }), detail: '' })
        }
        break
      }
      case 'crit': {
        critChanceAccum += affix.chance ?? 0
        break
      }
      case 'decay': {
        critChanceAccum += affix.initialMult ?? 0
        break
      }
      case 'recurse': {
        critChanceAccum += affix.recurseChance ?? 0
        break
      }
      case 'fallacy': {
        // 赌徒期望暴击率取决于运行时 stacks，预估用初始值 0
        break
      }
      case 'cascade': {
        if (affix.posRel == null) break
        const keys = Array.isArray(boundKeys) ? boundKeys : boundKeys ? [boundKeys] : []
        const hitRate = keys.length > 0 ? computeCascadeHitRate(keys, affix.posRel) : 0
        const m = affix.cascadeMult ?? 1
        const expectedMult = 1 + hitRate * (m - 1)
        multProduct *= expectedMult
        const detail = `(${Math.round(hitRate * 100)}%${t('est.cascade_hit')}×${m.toFixed(1)})`
        breakdown.push({ typeKey: 'cascade', label: t('est.cascade', { val: expectedMult.toFixed(2) }), detail })
        break
      }
      case 'ligature': {
        // Phase 3: 连字乘数 — 字母在单词中出现 ≥2 次时倍增
        const keys = Array.isArray(boundKeys) ? boundKeys : boundKeys ? [boundKeys] : []
        const avgMult = keys.length > 0 ? computeAvgLigatureMult(keys) : 1
        if (avgMult > 1) {
          multProduct *= avgMult
          breakdown.push({ typeKey: 'ligature', label: t('est.ligature', { val: avgMult.toFixed(2) }), detail: '' })
        }
        break
      }
      case 'flow': {
        // 落差：每个同资源且等级更高的邻居 +flowK%
        if (affix.posRel == null) break
        const keys = Array.isArray(boundKeys) ? boundKeys : boundKeys ? [boundKeys] : []
        if (keys.length === 0) break
        const selfLvl = Math.max(0, Math.min(skill.level - 1, 2))
        const selfBase = skill.baseValues[selfLvl] ?? BASE_VALUES[skill.resource]?.[selfLvl] ?? 1
        const neighbors = getNeighborSkills(keys, affix.posRel, { bindings: state.player.bindings, allSkills: state.affixSkills })
        let flowCount = 0
        for (const ns of neighbors) {
          if (ns.resource !== skill.resource) continue
          const nLvl = Math.max(0, Math.min(ns.level - 1, 2))
          const nBase = ns.baseValues[nLvl] ?? BASE_VALUES[ns.resource]?.[nLvl] ?? 1
          if (nBase > selfBase) flowCount++
        }
        if (flowCount > 0) {
          const flowBonus = (affix.flowK ?? 0) * flowCount
          addPercent += flowBonus
          breakdown.push({ typeKey: 'flow', label: t('est.flow', { pct: Math.round(flowBonus * 100) }), detail: t('est.flow_detail', { n: flowCount }) })
        }
        break
      }
      case 'confluence': {
        // 汇流：邻居资源多样性
        if (affix.posRel == null) break
        const keys = Array.isArray(boundKeys) ? boundKeys : boundKeys ? [boundKeys] : []
        if (keys.length === 0) break
        const neighbors = getNeighborSkills(keys, affix.posRel, { bindings: state.player.bindings, allSkills: state.affixSkills })
        const resTypes = new Set<string>()
        for (const ns of neighbors) resTypes.add(ns.resource)
        if (resTypes.size > 0) {
          const bonus = (affix.confluenceK ?? 0) * (1 - 1 / (resTypes.size + 1))
          addPercent += bonus
          breakdown.push({ typeKey: 'confluence', label: t('est.confluence', { pct: Math.round(bonus * 100) }), detail: t('est.confluence_detail', { n: resTypes.size }) })
        }
        break
      }
      case 'union': {
        // 联合：范围内匹配技能越多，加成越高
        if (affix.posRel == null) break
        const keys = Array.isArray(boundKeys) ? boundKeys : boundKeys ? [boundKeys] : []
        if (keys.length === 0) break
        const neighbors = getNeighborSkills(keys, affix.posRel, { bindings: state.player.bindings, allSkills: state.affixSkills })
        let matchCount = 0
        for (const ns of neighbors) {
          if (ns.resource === skill.resource || ns.affixes.some(a => a.type !== affix.type && skill.affixes.some(sa => sa.type === a.type))) matchCount++
        }
        if (matchCount > 0) {
          const bonus = (affix.unionK ?? 0) * matchCount
          addPercent += bonus
          breakdown.push({ typeKey: 'union', label: t('est.union', { pct: Math.round(bonus * 100) }), detail: t('est.union_detail', { n: matchCount }) })
        }
        break
      }
      case 'reflect': {
        const reflectScore = skill.affixes.length * skill.level
        const bonus = (affix.reflectK ?? 0) * reflectScore
        if (bonus > 0) {
          addPercent += bonus
          breakdown.push({ typeKey: 'reflect', label: t('est.reflect', { pct: Math.round(bonus * 100) }), detail: t('est.reflect_detail', { affixes: skill.affixes.length, level: skill.level }) })
        }
        break
      }
      case 'exhaust': {
        if (affix.spent) break // 已耗尽，不再计入预估
        const m = affix.exhaustMult ?? 1
        if (m > 1) {
          multProduct *= m
          breakdown.push({ typeKey: 'exhaust', label: t('est.exhaust', { val: m.toFixed(1) }), detail: t('est.exhaust_detail', { n: affix.maxTriggers ?? '?' }) })
        }
        break
      }
      case 'swarm': {
        // 所有虫群技能共享的"范围内虫群计数"总和
        const swarmCount = computeTotalSwarmCount(state.affixSkills, state.affixSkillStates, state.player.bindings)
        const bonus = (affix.swarmK ?? 0) * swarmCount
        addPercent += bonus
        breakdown.push({ typeKey: 'swarm', label: t('est.swarm', { pct: Math.round(bonus * 100) }), detail: t('est.swarm_count', { count: swarmCount }) })
        break
      }
      case 'mercenary': {
        const hireCost = affix.hireCost ?? 0
        const bonus = affix.hireBonus ?? 0
        if (hireCost <= 0) break
        if (state.gold >= hireCost) {
          let effectiveBonus = bonus
          // 质变·佣兵王：加成 × (1 + gold / (hireCost × 10))
          if (isAffixGloballyTransformed(AffixTypeEnum.Mercenary, state.affixSkills, state.affixSkillStates)) {
            effectiveBonus *= 1 + state.gold / (hireCost * 10)
          }
          addPercent += effectiveBonus
          breakdown.push({ typeKey: 'mercenary', label: t('est.mercenary', { pct: Math.round(effectiveBonus * 100), cost: hireCost }), detail: '' })
        } else {
          breakdown.push({ typeKey: 'mercenary', label: t('est.mercenary_poor'), detail: '' })
        }
        break
      }
      case 'myopia': {
        const myopiaBonus = affix.myopiaBonus ?? 0
        addPercent += myopiaBonus
        breakdown.push({ typeKey: 'myopia', label: t('est.myopia', { pct: Math.round(myopiaBonus * 100), cost: affix.myopiaCost ?? 0 }), detail: '' })
        break
      }
      case 'silkworm': {
        // 预估：基于绑定键在词库中的平均触发次数 N，取词内平均加成 = k × (N+1)/2
        // （stacks 从 1 递增到 N，每次 bonus = stacks × k）
        const silkwormK = affix.silkwormK ?? 0
        const keys = Array.isArray(boundKeys) ? boundKeys : boundKeys ? [boundKeys] : []
        const avgTriggers = keys.length > 0 ? computeAvgTriggersPerWord(keys) : 1
        // 至少按 1 次触发估算
        const n = Math.max(1, avgTriggers)
        const avgBonus = silkwormK * (n + 1) / 2
        addPercent += avgBonus
        breakdown.push({
          typeKey: 'silkworm',
          label: t('est.silkworm', { pct: Math.round(avgBonus * 100) }),
          detail: `(${n.toFixed(1)}×${Math.round(silkwormK * 100)}%/词平均)`,
        })
        break
      }
      case 'first_edition': {
        // 预估：展示最大加成（本词首次出现时的 ×mult）；标签标注"首次"
        const mult = affix.firstEditionMult ?? 2.0
        const bonus = Math.max(0, mult - 1)
        if (bonus > 0) {
          addPercent += bonus
          breakdown.push({ typeKey: 'first_edition', label: t('est.first_edition', { pct: Math.round(bonus * 100) }), detail: t('est.first_edition_detail') })
        }
        break
      }
      case 'reprint': {
        // 预估：显示每次重复 +K%，具体加成取决于本关出现次数，无法静态预测
        const k = affix.reprintK ?? 0
        breakdown.push({ typeKey: 'reprint', label: t('est.reprint', { pct: Math.round(k * 100) }), detail: '' })
        break
      }
      case 'matrix': {
        // 预估：按当前 fragmentQueue 快照算静态交集（单词未知，无法精确，仅展示速率）
        const k = affix.matrixK ?? 0
        const queueSet = new Set<string>()
        for (const ch of state.fragmentQueue ?? []) {
          const low = (ch ?? '').toLowerCase()
          if (low && low !== '_' && low >= 'a' && low <= 'z') queueSet.add(low)
        }
        breakdown.push({ typeKey: 'matrix', label: t('est.matrix', { pct: Math.round(k * 100) }), detail: t('est.matrix_detail', { count: queueSet.size }) })
        break
      }
      case 'typeset': {
        // 预估：按玩家当前词库的真实平均词长计算参考加成（无词库时回退 5）
        const k = affix.typesetK ?? 0
        const deck = state.player.wordDeck ?? []
        const avgLen = deck.length > 0
          ? deck.reduce((s, w) => s + w.length, 0) / deck.length
          : 5
        addPercent += k * avgLen
        breakdown.push({
          typeKey: 'typeset',
          label: t('est.typeset', { pct: Math.round(k * avgLen * 100) }),
          detail: t('est.typeset_detail', { pct: Math.round(k * 100), len: avgLen.toFixed(1) }),
        })
        break
      }
      // 其余词条不预估
      default:
        break
    }
  }

  // 光环预估：扫描邻居光环技能对本技能的加成
  if (boundKeys) {
    const bKeys = Array.isArray(boundKeys) ? boundKeys : [boundKeys]
    const auraGlobal = isAuraQuestActive(EnchantmentTypeEnum.QuestAuraGlobal as unknown as import('../data/affixes').EnchantmentType, state.affixSkills, state.affixSkillStates)
    const auraUniversal = isAuraQuestActive(EnchantmentTypeEnum.QuestAuraUniversal as unknown as import('../data/affixes').EnchantmentType, state.affixSkills, state.affixSkillStates)
    const counted = new Set<string>()
    for (const [nk, nSid] of state.player.bindings) {
      if (bKeys.includes(nk)) continue
      if (counted.has(nSid)) continue
      counted.add(nSid)
      const nSkill = state.affixSkills.get(nSid)
      if (!nSkill) continue
      for (const na of nSkill.affixes) {
        if ((na.type !== 'aura_fury' && na.type !== 'aura_morale') || na.posRel == null) continue
        // 范围检查
        if (!auraGlobal) {
          const auraKeys = [...state.player.bindings].filter(([, sid]) => sid === nSid).map(([k]) => k)
          const inRange = bKeys.some(bk => auraKeys.some(ak => hasRelation(ak, bk, na.posRel!)))
          if (!inRange) continue
        }
        // 匹配检查
        if (!auraUniversal && !hasSharedMatch(skill, nSkill, na.type as AffixTypeEnum)) continue
        if (na.type === 'aura_fury' && (na.auraCrit ?? 0) > 0) {
          critChanceAccum += na.auraCrit!
          breakdown.push({ typeKey: 'aura_fury', label: t('est.aura_fury', { pct: Math.round(na.auraCrit! * 100) }), detail: '' })
        } else if (na.type === 'aura_morale' && (na.auraMorale ?? 0) > 0) {
          addPercent += na.auraMorale!
          breakdown.push({ typeKey: 'aura_morale', label: t('est.aura_morale', { pct: Math.round(na.auraMorale! * 100) }), detail: '' })
        }
        break
      }
    }
  }

  // 暴击子系统合并预估：Crit / Charge / Decay / Taboo 共同贡献暴击率
  if (critChanceAccum > 0) {
    const clampedCrit = Math.min(critChanceAccum, 1)
    if (hasTabooFlag) {
      // 禁忌：暴击 → ×CRIT_MULTIPLIER，未暴击 → ×(-1)
      const expectedMult = clampedCrit * CRIT_MULTIPLIER + (1 - clampedCrit) * (-1)
      multProduct *= Math.max(0, expectedMult) // 防止负期望显示
      breakdown.push({ typeKey: 'crit_summary', label: t('est.crit_taboo', { pct: Math.round(clampedCrit * 100), val: expectedMult.toFixed(2) }), detail: '' })
    } else {
      const expectedMult = 1 + clampedCrit * (CRIT_MULTIPLIER - 1)
      multProduct *= expectedMult
      breakdown.push({ typeKey: 'crit_summary', label: t('est.crit_summary', { pct: Math.round(clampedCrit * 100), val: expectedMult.toFixed(2) }), detail: `(\u00d7${CRIT_MULTIPLIER})` })
    }
  }

  // 学徒附魔：直接改面板值，不需要额外预估行

  // 任务附魔进度 / 质变状态
  const questEnchEst = skill.enchantmentIds
    .map(id => QUEST_ENCHANTMENT_DEFS.find((d: QuestEnchantmentDef) => d.type === id))
    .find((d): d is QuestEnchantmentDef => d != null)
  if (rt && questEnchEst) {
    if (rt.questTransformed) {
      breakdown.push({
        typeKey: 'apprentice',
        label: t('est.quest_done', { effect: questEnchEst.transformDesc || t('quest.' + questEnchEst.type + '.effect') }),
        detail: '',
      })
    } else {
      const equipTarget = getQuestEquipTarget(questEnchEst.targetAffix, getQuestEquipReduction())
      const affixNames = (Array.isArray(questEnchEst.targetAffix) ? questEnchEst.targetAffix : [questEnchEst.targetAffix])
        .map(at => t('affix.' + at) || AFFIX_NAMES[at] || at)
        .join('/')
      breakdown.push({
        typeKey: 'apprentice',
        label: t('est.quest_equip', { stacks: rt.questStacks, target: equipTarget, affix: affixNames }),
        detail: '',
      })
    }
  }

  // 衍生附魔已删除（Story 41.2）

  // 如果只有基础值行、没有任何预估项，返回 null
  if (breakdown.length <= 1) return null

  const estimatedOutput = base * (1 + addPercent) * multProduct
  if (hasMultOp) {
    breakdown.push({ typeKey: 'base', label: t('est.result_mult', { val: formatEstimate(estimatedOutput) }), detail: t('est.result_mult_detail') })
  } else {
    breakdown.push({ typeKey: 'base', label: t('est.result_add', { val: formatEstimate(estimatedOutput) }), detail: t('est.result_add_detail') })
  }

  return { estimatedOutput, breakdown, critChance: critChanceAccum }
}

/** 计算技能的总静态暴击率（所有暴击词条贡献之和） */
export function computeSkillCritChance(skill: AffixSkillInstance): number {
  let crit = 0
  for (const affix of skill.affixes) {
    switch (affix.type) {
      case 'crit': crit += affix.chance ?? 0; break
      case 'taboo': crit += affix.bonusPercent ?? 0; break
      case 'recurse': crit += affix.recurseChance ?? 0; break

      // Charge/Decay/Fallacy 是动态的，不计入静态暴击率
    }
  }
  return crit
}

/** 统计流放词条命中率：词库中首/尾字母命中 boundKeys 的比例 */
function computeOutcastHitRate(boundKeys: string[]): number {
  const deck = state.player.wordDeck
  if (!deck || deck.length === 0) return 0
  const keySet = new Set(boundKeys.map(k => k.toLowerCase()))
  let hits = 0
  for (const word of deck) {
    if (word.length === 0) continue
    const first = word[0].toLowerCase()
    const last = word[word.length - 1].toLowerCase()
    if (keySet.has(first) || keySet.has(last)) hits++
  }
  return hits / deck.length
}

/** 统计词库中每词平均触发次数：绑定键字母在词中出现的次数 */
function computeAvgTriggersPerWord(boundKeys: string[]): number {
  const deck = state.player.wordDeck
  if (!deck || deck.length === 0) return 1
  const keySet = new Set(boundKeys.map(k => k.toLowerCase()))
  let totalTriggers = 0
  for (const word of deck) {
    for (const ch of word) {
      if (keySet.has(ch.toLowerCase())) totalTriggers++
    }
  }
  return totalTriggers / deck.length
}

/** 计算衰减词条期望乘数：基于每词平均触发次数 */
function computeDecayAvgMult(init: number, decayPer: number, floor: number, avgTriggers: number): number {
  const n = Math.max(1, Math.round(avgTriggers))
  let sum = 0
  let cur = init
  for (let i = 0; i < n; i++) {
    sum += cur
    cur = Math.max(floor, cur - decayPer)
  }
  return sum / n
}

/** 统计级联词条命中率：绑定键按下时前一个字母满足位置关系的比例 */
function computeCascadeHitRate(boundKeys: string[], posRel: PositionRelation): number {
  const deck = state.player.wordDeck
  if (!deck || deck.length === 0) return 0
  const keySet = new Set(boundKeys.map(k => k.toLowerCase()))
  let hits = 0
  let total = 0
  for (const word of deck) {
    for (let i = 0; i < word.length; i++) {
      const ch = word[i].toLowerCase()
      if (!keySet.has(ch)) continue
      total++
      if (i > 0) {
        const prev = word[i - 1].toLowerCase()
        if (hasRelation(prev, ch, posRel)) hits++
      }
    }
  }
  return total > 0 ? hits / total : 0
}

/** 统计连字词条期望乘数：绑定键字母在词中出现次数的加权平均 */
function computeAvgLigatureMult(boundKeys: string[]): number {
  const deck = state.player.wordDeck
  if (!deck || deck.length === 0) return 1
  const keySet = new Set(boundKeys.map(k => k.toLowerCase()))
  let totalMult = 0
  let totalTriggers = 0
  for (const word of deck) {
    const w = word.toLowerCase()
    for (const key of keySet) {
      let count = 0
      for (const ch of w) {
        if (ch === key) count++
      }
      if (count > 0) {
        // 连字：出现 ≥2 次时乘以 count，否则 ×1
        totalMult += count >= 2 ? count : 1
        totalTriggers++
      }
    }
  }
  return totalTriggers > 0 ? totalMult / totalTriggers : 1
}

/** 自适应精度格式化：小值保留更多小数位 */
function formatEstimate(v: number): string {
  const a = Math.abs(v)
  if (a < 1) return v.toFixed(2)
  if (a < 10) return v.toFixed(1)
  return Math.round(v).toString()
}

/** 格式化词条参数缩放值（智能精度） */
function formatScaledValue(v: number): string {
  if (v === Math.floor(v)) return v.toString()
  if (Math.abs(v) < 0.01) return v.toFixed(4)
  if (Math.abs(v) < 1) return v.toFixed(2)
  return v.toFixed(1)
}

// === 打开商店 ===
export function openShop(_won: boolean): void {
  state.phase = 'shop';
  ensureDragStartCleanup();
  registerShapePreviewRenderer(renderShapePreview);
  eventBus.emit('shop:opened');
  const el = getElements();

  // 教程模式：跳过金币计算（金币已预设）
  if (!state.isTutorial) {
    // 遗物效果：通过管道解析 on_battle_end 金币加成
    const goldRelicResult = resolveRelicEffects('on_battle_end', { overkill: state.overkill });
    let relicGold = Math.floor(goldRelicResult.effects.gold);

    // 基础金币：100 + 溢出分转化
    const calibInfo = getCalibrationInfo();
    let baseGold: number;
    if (calibInfo.isCalibration) {
      baseGold = computePracticeGold(calibInfo.effectiveScore, state.ascensionLevel);
    } else {
      const target = Math.max(1, state.targetScore);
      const overflow = Math.max(0, state.overkill);
      const pct = overflow / target;
      let ovBonus = 0;
      if (pct <= 0.5) {
        ovBonus = pct * 100 * 0.2;
      } else if (pct <= 1.0) {
        ovBonus = 0.5 * 100 * 0.2 + (pct - 0.5) * 100 * 0.12;
      } else {
        ovBonus = 0.5 * 100 * 0.2 + 0.5 * 100 * 0.12 + (pct - 1.0) * 100 * 0.04;
      }
      baseGold = Math.floor(100 + ovBonus);
    }
    const skillGold = Math.floor(state.resources.gold);



    // 猎物悬赏：zero_errors 在关卡结束时检查
    const bountyEndGold = checkBountyOnStageEnd();
    // Story 36.12: S 级奖杯 — 高评级额外金币（独立加算，不受乘法影响）
    const trophyGold = getSRankTrophyGold(state.battleStats?.rating || 'B');
    const battleGold = Math.floor(baseGold + skillGold + relicGold) + trophyGold + bountyEndGold;
    state.gold += battleGold;
  }

  el.shopLevelNum.textContent = String(state.level);
  // 周目≥2时在商店标题显示周目数
  const shopTitle = document.getElementById('shop-title');
  if (shopTitle) {
    const base = state.cycle >= 2 ? t('shop.cycle_title', { cycle: state.cycle }) : t('shop.title');
    shopTitle.textContent = state.ascensionLevel > 0 ? `${base} [A${state.ascensionLevel}]` : base;
  }
  el.shopScore.textContent = String(state.score);
  el.shopTarget.textContent = String(state.targetScore);
  updateGoldDisplay();

  // Story 36.9: 走私通道 — 每关重置; 黑市门票 — +1 商品位
  resetShopRelicState();
  // 教程模式：若 TutorialMode 预设了 state.shop.items 则沿用；否则（未预设/为空）照常生成，
  // 避免教程商店空无一物导致 phase 5「购买」无从下手。
  if (!state.isTutorial || state.shop.items.length === 0) {
    const shopSlots = SHOP_SKILL_SLOTS + getBlackMarketExtraSlots();
    const locked = state.shop.items.filter(item => item.locked);
    const newItems = generateShopItems(shopSlots - locked.length, getBlackMarketExtraSlots() > 0);
    state.shop.items = [...locked, ...newItems];
  }
  state.shop.refreshCount = 0;

  // Story 36.9: 限时拍卖 — 倒计时（必须在 renderUnifiedShop 之前启动，确保首次渲染能显示）
  // BUGFIX: 仅 classic UI 启动本计时器。terminal/workbench UI 由 enterTerminalShop→
  // startAuctionIfNeeded 启动自己的计时器（归零走 proceedSubmit→executeSubmitTransition，
  // 会复位 previewState.active）。若两套都跑，terminal 那套靠 clearAuctionTimer 顶掉 classic
  // 这套——但仅在 fresh entry；active 卡 true 的二次进店会早退、不顶掉，于是 classic 计时器
  // 归零调用 startBattleBtn.onclick（initShopEvents 设的 next-level 处理器，它 destroy
  // dragManager + startLevel 却漏设 previewState.active=false）→ active 永久卡 true →
  // 下次商店工作台拖拽全死。terminal 模式根本不该起 classic 计时器。
  if (isTimedAuction() && (getSettings().shopUI ?? 'terminal') !== 'terminal') {
    startAuctionTimer(
      (remaining) => {
        _auctionRemaining = remaining;
        const timerDiv = document.getElementById('auction-timer');
        if (timerDiv) timerDiv.textContent = `⏱ ${remaining}s`;
      },
      () => {
        // 倒计时结束 → 自动离开商店
        _auctionRemaining = -1;
        clearAuctionTimer();
        if (el.startBattleBtn.onclick) {
          (el.startBattleBtn.onclick as EventListener)(new MouseEvent('click'));
        }
      },
    );
  }

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
    clearShapePlacement();
  };
  // Story 55-2: 商店背景像素化 — 随机双色渐变
  randomizeScreenBackground(el.shopScreen);

  // 教程模式隐藏"开始下一关"按钮
  el.startBattleBtn.style.display = state.isTutorial ? 'none' : '';

  showScreen('shop');

  // 补偿：检查商店外升到Lv.3但未附魔的技能（如休息关升级）
  checkPendingEnchantments();

  // V2：局内升级（学徒附魔 / upgrade_skill）跨越 Lv.3 的待附魔队列，逐个弹 V2 picker
  processPendingV2Enchants(() => {});

  // Story 60.5: feature flag 派发到 terminal 商店 UI
  // (classic UI 已废弃 · 教程模式也走 terminal · 保留 isTutorial 参数仅供单测用)
  dispatchShopMode(_won, state.isTutorial);
}

/**
 * Story 60.5: shopUI dispatcher — 末尾 hook 调度
 * - terminal 分支：隐藏 #shop-screen + 调 enterTerminalShop
 * - classic 分支：防御性隐藏残留 terminal DOM（用户从 terminal 切回 classic 时）
 *
 * 提取为独立函数以便单元测试（M1）。
 */
export function dispatchShopMode(won: boolean, _isTutorial: boolean): 'classic' | 'terminal' {
  const shopUI = getSettings().shopUI ?? 'terminal';
  // classic UI 已废弃 · isTutorial 不再强制 fallback（避免教程显示旧商店）
  const goTerminal = shopUI === 'terminal';
  if (goTerminal) {
    const shopEl = document.getElementById('shop-screen');
    if (shopEl) shopEl.style.display = 'none';
    enterTerminalShop(won);
    return 'terminal';
  }
  // L1: 防御性隐藏残留 terminal DOM（解决 AC6 — 切换不需 reload）
  for (const id of ['terminal-shop-screen', 'workbench-screen-preview']) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  return 'classic';
}

// === 金币显示 ===
export function updateGoldDisplay(): void {
  const el = getElements();
  el.shopGold.textContent = String(state.gold);
}

// === 价格调整 ===

/** Story 54.4: A2+ 商店价格上涨系数 */
export function getAscensionPriceMultiplier(): number {
  return state.ascensionLevel >= 2 ? A2_PRICE_MULT : 1.0;
}

/** Story 54.6: 计算刷新费用（A5+ 费用翻倍） */
function getRefreshCost(): number {
  const base = (state.shop.refreshCount + 1) * 5;
  const a5Mult = state.ascensionLevel >= 5 ? A5_REFRESH_COST_MULT : 1;
  return Math.round(base * a5Mult * getAscensionPriceMultiplier());
}

export function getAdjustedPrice(baseCost: number): number {
  // Story 36.5: 附魔锚点 — 每个已激活附魔使价格 +10%
  // Story 36.9: 折扣卡 — 所有商品价格 -15%（先涨后折）
  // 困境红利：每个永久修饰器 -5%（上限 30%）
  // Story 54.4: A2+ 价格 ×1.15
  return Math.round(baseCost * getAscensionPriceMultiplier() * getEnchantAnchorPriceMultiplier() * getDiscountMultiplier() * (1 - getBountyHunterDiscount()));
}

// === Fisher-Yates shuffle ===
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// buildMechanicWeightedBucket removed (old producer system)

// === 生成统一商品 ===
function generateShopItems(count: number, guaranteeRare: boolean = false): ShopItem[] {
  if (count <= 0) return [];

  const isSilenced = false;
  const items: ShopItem[] = [];
  let nextId = Date.now();

  // 当前 Cycle（技能权重 + 牌包权重共用）
  const act = state.cycle;

  // 构建词条制技能池（Story 35.9 — 替代旧固定池）
  const skillPool: ShopItem[] = [];
  const maxSkillLevel = queryRelicFlag('max_skill_level') as number;
  /** 按稀有度获取等级上限（白装4级，蓝+3级；遗物可覆盖） */
  const getLevelCap = (rarity: number) => maxSkillLevel === Infinity ? getSkillMaxLevel(rarity) : maxSkillLevel;
  if (!isSilenced) {
    // T4 极简主义：技能数量达上限时不生成新技能
    const maxSkillCount = queryRelicFlag('max_skill_count') as number;
    const skillCountFull = maxSkillCount !== Infinity && state.player.skills.size >= maxSkillCount;

    if (!skillCountFull) {
      // 生成词条制技能商品（同批内互相去重）
      const affixItems = generateAffixShopItems(count);

      // 与已有技能同名 → 直接转为升级项（同一 skillId 只转一次）
      const ownedNameToId = new Map<string, string>();
      for (const [skillId] of state.player.skills) {
        const affix = state.affixSkills.get(skillId);
        if (affix) ownedNameToId.set(affix.name, skillId);
      }
      const convertedSkillIds = new Set<string>();
      for (let i = 0; i < affixItems.length; i++) {
        const item = affixItems[i];
        const ownedSkillId = ownedNameToId.get(item.affixSkill!.name);
        if (ownedSkillId && !convertedSkillIds.has(ownedSkillId)) {
          const ownedData = state.player.skills.get(ownedSkillId);
          const ownedAffix = state.affixSkills.get(ownedSkillId);
          // Story 45: Exhaust/Ethereal 已消耗完的技能不再出现升级
          const rtOwned = state.affixSkillStates.get(ownedSkillId);
          const exhaustConsumed = ownedAffix && !ownedAffix.affixes.some(a => a.type === 'exhaust') && (rtOwned?.exhaustCount ?? 0) > 0;
          if (ownedData && ownedAffix && ownedData.level < getLevelCap(ownedAffix.rarity) && !exhaustConsumed) {
            // 转为升级
            const nextLevel = ownedData.level + 1;
            affixItems[i] = {
              ...item,
              skillId: ownedSkillId,
              affixSkill: { ...ownedAffix, level: nextLevel },
              cost: getAdjustedPrice(calculateAffixSkillPrice(ownedAffix.rarity, nextLevel, rollPriceFluctuation())),
              isUpgrade: true,
            };
            convertedSkillIds.add(ownedSkillId);
          }
        }
      }
      // === 蓝紫橙保底升级 ===
      const UPGRADE_GUARANTEE_BASE = 0.30;
      const UPGRADE_GUARANTEE_PER_CYCLE = 0.15;
      let upgradeChance = Math.min(1.0, UPGRADE_GUARANTEE_BASE + UPGRADE_GUARANTEE_PER_CYCLE * (state.cycle - 1));
      // 前半段（位置 1-5）概率按位置线性递增：pos/5 倍率
      if (!isSecondHalf(state.level)) {
        const pos = getPositionInCycle(state.level);
        upgradeChance *= pos / 5;
      }

      // 仅当正常碰撞没产生升级时触发
      const hasUpgrade = affixItems.some(i => i.isUpgrade);
      if (!hasUpgrade && random() < upgradeChance) {
        // 收集可升级的任意技能
        const candidates: Array<{ skillId: string; affix: AffixSkillInstance }> = [];
        for (const [skillId, skillData] of state.player.skills) {
          const affix = state.affixSkills.get(skillId);
          if (!affix) continue;
          if (convertedSkillIds.has(skillId)) continue;
          if (skillData.level >= getLevelCap(affix.rarity)) continue;
          // Story 45: Exhaust/Ethereal 已消耗完的技能不参与保底升级
          const rt = state.affixSkillStates.get(skillId);
          if (rt && (rt.exhaustCount ?? 0) > 0 && !affix.affixes.some(a => a.type === 'exhaust')) continue;
          candidates.push({ skillId, affix });
        }
        if (candidates.length > 0) {
          const pick = candidates[Math.floor(random() * candidates.length)];
          const nextLevel = state.player.skills.get(pick.skillId)!.level + 1;
          // 替换第一个非升级项
          const replaceIdx = affixItems.findIndex(i => !i.isUpgrade);
          if (replaceIdx >= 0) {
            affixItems[replaceIdx] = {
              ...affixItems[replaceIdx],
              skillId: pick.skillId,
              affixSkill: { ...pick.affix, level: nextLevel },
              cost: getAdjustedPrice(calculateAffixSkillPrice(pick.affix.rarity, nextLevel, rollPriceFluctuation())),
              isUpgrade: true,
            };
            convertedSkillIds.add(pick.skillId);
          }
        }
      }

      skillPool.push(...affixItems);
    }
  }

  // 保底：≥2 技能（优先升级）—— 牌包已移出商店，改为每关结束三选一
  // 优先从升级项中选保底技能，确保玩家看到升级选项
  const guaranteedSkillCount = Math.min(2, skillPool.length);
  for (let g = 0; g < guaranteedSkillCount; g++) {
    const remainUpgrades = skillPool.filter(i => i.isUpgrade);
    if (remainUpgrades.length > 0) {
      const idx = skillPool.indexOf(remainUpgrades[0]);
      items.push(skillPool.splice(idx, 1)[0]);
    } else {
      items.push(skillPool.splice(0, 1)[0]);
    }
  }

  // 遗物商品（最多 1 个，占总 5 槽之一，40%概率刷新）
  // 未刷出遗物时，该位置改为第 3 个技能（保底 3 技能）
  const RELIC_SPAWN_CHANCE = 0.4;
  let relicSpawned = false;
  if (random() < RELIC_SPAWN_CHANCE) {
    const relicItem = generateShopRelicItem(act, nextId++);
    if (relicItem && items.length < count) {
      items.push(relicItem);
      relicSpawned = true;
    }
  }
  if (!relicSpawned && skillPool.length > 0 && items.length < count) {
    items.push(skillPool.splice(0, 1)[0]);
  }

  // Story 41.1: 附魔台商品（Act 3 起，25% 概率，最多 1 个，fate_fork 时最多 2 个）
  if (act >= 3) {
    const ENCHANTMENT_SPAWN_CHANCE = 0.25;
    const maxEnchItems = state.player.relics.has('fate_fork') ? 2 : 1;
    let enchItemCount = 0;
    for (let ei = 0; ei < maxEnchItems && items.length < count; ei++) {
      if (random() < ENCHANTMENT_SPAWN_CHANCE) {
        const enchItem = generateShopEnchantmentItem(nextId++);
        if (enchItem) {
          items.push(enchItem);
          enchItemCount++;
        }
      }
    }
  }

  // 合并剩余池，随机填满
  const remaining = shuffleArray([...skillPool]);
  while (items.length < count && remaining.length > 0) {
    items.push(remaining.shift()!);
  }

  // Story 36.9: 黑市门票 — 额外商品位保底稀有品质技能
  // 确保最后一项是 rarity ≥ 1 的技能（如果不是，替换为新生成的稀有技能）
  if (guaranteeRare && items.length > 0) {
    const lastItem = items[items.length - 1];
    const isRareSkill = lastItem.type === 'skill' && lastItem.affixSkill && lastItem.affixSkill.rarity >= 1;
    if (!isRareSkill) {
      // 先尝试从剩余池中找稀有+技能
      const rareInPool = remaining.find(i => i.type === 'skill' && i.affixSkill && i.affixSkill.rarity >= 1);
      if (rareInPool) {
        items[items.length - 1] = rareInPool;
      } else {
        // 兜底：直接生成一个 rarity=1 的技能替换
        const rareItem = generateAffixShopItem(Date.now(), { rarity: 1 as SkillRarity });
        items[items.length - 1] = rareItem;
      }
    }
  }

  return items;
}

// === 走私通道：找最便宜商品的 index ===
function getSmuggleFreeIndex(): number {
  if (!canSmuggleFree()) return -1;
  let minCost = Infinity;
  let minIdx = -1;
  state.shop.items.forEach((item, i) => {
    if (item.cost < minCost) {
      minCost = item.cost;
      minIdx = i;
    }
  });
  return minIdx;
}

// === 渲染统一商店 ===
function renderUnifiedShop(): void {
  hideAllTooltips();
  const el = getElements();
  el.shopTabs.innerHTML = '';
  el.rewardCards.innerHTML = '';

  // Story 36.9: 限时拍卖 — 重建倒计时 div（每次 renderUnifiedShop 都需重建，因为 innerHTML='' 会清除）
  if (_auctionRemaining >= 0) {
    const timerEl = document.createElement('div');
    timerEl.id = 'auction-timer';
    timerEl.className = 'auction-timer';
    timerEl.textContent = `⏱ ${_auctionRemaining}s`;
    el.rewardCards.appendChild(timerEl);
  }

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
  const refreshCost = getRefreshCost();
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'shop-refresh-btn';
  refreshBtn.innerHTML = t('shop.refresh', { cost: refreshCost });
  if (state.gold < refreshCost) refreshBtn.classList.add('cannot-afford');
  refreshBtn.onclick = () => refreshShop();
  el.shopTabs.appendChild(refreshBtn);

  // Story 36.9: 限时拍卖 — 刷新免费提示
  if (isTimedAuction()) {
    refreshBtn.innerHTML = t('shop.refresh', { cost: 0 });
    refreshBtn.classList.remove('cannot-afford');
  }

  // Story 36.9: 走私通道 — 找最便宜商品
  const smuggleIdx = getSmuggleFreeIndex();

  // 商品卡片
  state.shop.items.forEach((item, index) => {
    renderUnifiedShopCard(item, index, index === smuggleIdx);
  });

}

// === 渲染统一商品卡片 ===
function renderUnifiedShopCard(item: ShopItem, index: number, isSmuggleFree: boolean = false): void {
  const el = getElements();
  const card = document.createElement('div');
  card.className = 'reward-card';
  card.dataset.shopIndex = String(index);
  card.dataset.dragType = 'shop-item';

  // Story 36.9: 走私通道 — 免费商品不显示"买不起"
  const effectiveCost = isSmuggleFree ? 0 : item.cost;
  const canAfford = state.gold >= effectiveCost;
  if (!canAfford) card.classList.add('cannot-afford');
  const costHtml = isSmuggleFree ? '<div class="reward-cost smuggle-free">🆓</div>' : `<div class="reward-cost">💰${item.cost}</div>`;

  if (item.type === 'skill' && item.affixSkill) {
    // 词条制技能卡片（Story 35.9 AC3）
    const affix = item.affixSkill;
    const rarityColor = RARITY_COLORS[affix.rarity] || '#ffffff';
    const rLabel = rarityLabel(affix.rarity);
    const affixNames = affix.affixes.map(a => t('affix.' + a.type)).join(' · ');
    const lvl = state.player.skills.get(item.skillId!)?.level || affix.level;

    let nameLabel = affix.name;
    if (item.isUpgrade) {
      nameLabel = t('shop.upgrade_name', { name: affix.name, from: lvl, to: lvl + 1 });
    }

    card.classList.add('affix-skill-card');
    card.style.borderColor = rarityColor;
    // Story 40.5: 写入形状数据到 DOM dataset（供 buildPayload 读取）
    if (affix.shapeId && affix.shapeId !== 'monomino') {
      card.dataset.shapeId = affix.shapeId;
      card.dataset.rotation = String(affix.rotation ?? 0);
    }
    const shapePreviewHtml = renderShapePreview(affix.shapeId ?? 'monomino', affix.rotation ?? 0, affix.rarity);
    // Story 40.5: 预渲染形状 HTML 供拖拽幽灵使用
    if (shapePreviewHtml) {
      card.dataset.shapePreview = shapePreviewHtml;
    }
    card.innerHTML = `
      <div class="reward-icon">${affix.icon}${shapePreviewHtml}</div>
      <div class="reward-info">
        <div class="reward-name">${nameLabel}</div>
        <div class="reward-desc affix-list">${affixNames || t('shop.no_affix')}</div>
        ${!item.isUpgrade && affix.level > 1 ? `<div class="affix-level">Lv.${affix.level}</div>` : ''}
      </div>
      ${costHtml}
      <div class="reward-type" style="color:${rarityColor}">${item.isUpgrade ? t('shop.upgrade') : rLabel}</div>
      <span class="lock-toggle ${item.locked ? 'locked' : ''}">${item.locked ? '🔒' : '🔓'}</span>
    `;
  } else if (item.type === 'pack' && item.pack) {
    // Pack item — 单词制
    const pack = item.pack;
    const packRarityColor = RARITY_COLORS[pack.rarity] || '#ffffff';
    const packRarityLabel = rarityLabel(pack.rarity);
    const boundKeySet = new Set([...state.player.bindings.keys()]);

    card.classList.add('pack-card');
    card.style.borderColor = packRarityColor;

    const effectHtml = pack.wordEffect
      ? `<div class="word-effect-label" style="color:${packRarityColor};font-size:11px;margin-top:2px;">${formatWordEffectLabel(pack.wordEffect)}</div>`
      : '';

    if (pack.words.length === 1) {
      // 普通(1词): 直接在卡片上显示单词（高亮绑定字母）
      const wordHtml = highlightWord(pack.words[0], boundKeySet);
      card.innerHTML = `
        <div class="reward-icon">${getPackIcon(pack.condition.type)}</div>
        <div class="reward-info">
          <div class="reward-name" style="letter-spacing:1px;">${wordHtml}</div>
          <div class="reward-desc pack-preview">${pack.desc}</div>
          ${effectHtml}
        </div>
        ${costHtml}
        <div class="reward-type pack-type" style="color:${packRarityColor}">${packRarityLabel} ${t('shop.pack_type')}</div>
        <span class="lock-toggle ${item.locked ? 'locked' : ''}">${item.locked ? '🔒' : '🔓'}</span>
      `;
    } else {
      // 稀有/史诗(3候选): 显示条件名 + "三选一"标签
      card.innerHTML = `
        <div class="reward-icon">${getPackIcon(pack.condition.type)}</div>
        <div class="reward-info">
          <div class="reward-name">${pack.name}</div>
          <div class="reward-desc pack-preview">${pack.desc}</div>
          ${effectHtml}
        </div>
        ${costHtml}
        <div class="reward-type pack-type" style="color:${packRarityColor}">${packRarityLabel} · ${t('shop.choose_one')}</div>
        <span class="lock-toggle ${item.locked ? 'locked' : ''}">${item.locked ? '🔒' : '🔓'}</span>
      `;
    }
    // 单词包：悬停时高亮键盘；三选一：仅展开后的候选词行悬停时高亮
    if (pack.words.length === 1) {
      const singleWord = pack.words[0]
      card.addEventListener('mouseenter', () => {
        const letters = new Set<string>()
        for (const c of singleWord.toLowerCase()) if (c >= 'a' && c <= 'z') letters.add(c)
        for (const letter of letters) {
          document.querySelector(`.key-slot[data-key="${letter}"]`)?.classList.add('word-hover-highlight')
        }
      })
      card.addEventListener('mouseleave', () => {
        document.querySelectorAll('.key-slot.word-hover-highlight').forEach(el => el.classList.remove('word-hover-highlight'))
      })
    }
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
        ${(() => { const f = localizeItemFlavor(item.relicId, relic.flavor); return f ? `<div class="reward-flavor">"${f}"</div>` : ''; })()}
      </div>
      ${costHtml}
      <div class="reward-type relic-type relic-rarity-${rarityClass}">${t(`shop.rarity.${rarityClass}`)}</div>
      <span class="lock-toggle ${item.locked ? 'locked' : ''}">${item.locked ? '🔒' : '🔓'}</span>
    `;
  } else if (item.type === 'enchantment' && item.enchantmentType) {
    // Story 41.1: 附魔台商品
    const enchInfo = getEnchantmentDisplayInfo(
      item.enchantmentType as EnchantmentType,
      item.transmuteRes,
      item.neighborRel as PositionRelation | undefined,
    );
    if (!enchInfo) return;

    card.classList.add('enchantment-card');
    card.style.borderColor = enchInfo.categoryColor;
    card.innerHTML = `
      <div class="reward-icon">${enchInfo.icon}</div>
      <div class="reward-info">
        <div class="reward-name">${enchInfo.name}</div>
        <div class="reward-desc">${enchInfo.desc}</div>
      </div>
      ${costHtml}
      <div class="reward-type" style="color:${enchInfo.categoryColor}">${enchInfo.category}</div>
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
    card.onclick = (e) => {
      const pack = item.pack!
      if (pack.words.length > 1) {
        // 三选一词包：切换展开/折叠
        if (card.classList.contains('pack-expanded')) {
          card.nextElementSibling?.classList.contains('pack-expand-panel') && card.nextElementSibling.remove()
          card.classList.remove('pack-expanded')
        } else {
          juiceUp(card, 0.2, 3)
          expandPackCard(card, item, index)
        }
      } else {
        juiceUp(card, 0.2, 3)
        purchasePackItem(index)
      }
    };
  } else if (item.type === 'relic') {
    card.onclick = () => {
      juiceUp(card, 0.2, 3);
      purchaseShopRelicItem(index);
    };
  } else if (item.type === 'enchantment') {
    card.onclick = () => {
      juiceUp(card, 0.2, 3);
      purchaseShopEnchantmentItem(index);
    };
  } else {
    card.onclick = () => {
      juiceUp(card, 0.2, 3);
      purchaseShopItem(index);
    };
  }

  // 词条制技能悬停详情 tooltip（复用 keyTooltip，与构筑界面统一风格）
  if (item.type === 'skill' && item.affixSkill) {
    card.addEventListener('mouseenter', (e: MouseEvent) => {
      hideAllTooltips();
      const skill = item.affixSkill!;
      const baseVals = skill.baseValues;
      const resIcon = RESOURCE_ICONS[skill.resource] || '';
      const resName = t('resource.' + skill.resource) || RESOURCE_NAMES[skill.resource] || skill.resource;
      const baseVal = getEffectiveBaseValue(baseVals, skill.level);
      const skillRt = state.affixSkillStates?.get(skill.id)
      const skillHasMultOp = (skill.enchantmentIds.includes(EnchantmentTypeEnum.MultiplyOperator as string)
        || skill.enchantmentIds.includes(EnchantmentTypeEnum.QuestMultiplyOp as string))
        && isAffixGloballyTransformed(AffixTypeEnum.Multiply, state.affixSkills, state.affixSkillStates);
      const multOpBase = skillHasMultOp
        ? (MULTIPLY_OPERATOR_BASE_VALUES[skill.resource]?.[skill.level - 1] ?? baseVal)
        : null;

      const tooltipData: KeyTooltipData = {
        skill: {
          name: generateName(skill.resource, skill.affixes),
          icon: skill.icon,
          description: skillHasMultOp ? `${resIcon}${resName}×${multOpBase}` : `${resIcon}${resName}+${baseVal}`,
          level: skill.level,
          school: rarityLabel(skill.rarity),
          schoolCssClass: `rarity-${skill.rarity}`,
        },
      };
      if (item.isUpgrade && item.skillId) {
        const curLv = skill.level - 1;
        const curBase = getEffectiveBaseValue(baseVals, curLv);
        const pctChange = curBase > 0 ? Math.round((baseVal / curBase - 1) * 100) : 0;
        tooltipData.skill!.upgradeInfo = t('tooltip.upgrade_info', { from: curLv, to: skill.level, oldVal: curBase, newVal: baseVal, pct: pctChange });

        // 升级前后产出预估对比
        const rt = state.affixSkillStates.get(item.skillId);
        const upgBoundKeys: string[] = [];
        for (const [bk, sid] of state.player.bindings) {
          if (sid === item.skillId) upgBoundKeys.push(bk);
        }
        const bk = upgBoundKeys.length > 0 ? upgBoundKeys : undefined;
        const newEstimate = computeSmartEstimate(skill, rt, bk);
        if (newEstimate) {
          const oldSkill = { ...skill, level: curLv };
          const oldEstimate = computeSmartEstimate(oldSkill, rt, bk);
          // 逐行标注 old→new 变化
          if (oldEstimate) {
            for (let i = 0; i < newEstimate.breakdown.length; i++) {
              const oldLine = oldEstimate.breakdown[i];
              if (oldLine && oldLine.label !== newEstimate.breakdown[i].label) {
                newEstimate.breakdown[i].oldLabel = oldLine.label;
              }
            }
            const delta = newEstimate.estimatedOutput - oldEstimate.estimatedOutput;
            const sign = delta >= 0 ? '+' : '';
            tooltipData.skill!.upgradeEstimate = t('tooltip.upgrade_estimate', {
              old: formatEstimate(oldEstimate.estimatedOutput),
              new: formatEstimate(newEstimate.estimatedOutput),
              delta: sign + formatEstimate(delta),
            });
          }
          tooltipData.skill!.smartEstimate = newEstimate;
        }
        tooltipData.skill!.critChance = computeSkillCritChance(skill);
        const fields = buildAffixTooltipFields(skill, rt);
        tooltipData.skill!.affixInfo = fields.affixInfo;
        // 词条参数升级预览
        for (let i = 0; i < skill.affixes.length; i++) {
          const preview = previewAffixScaledValue(skill.affixes[i], 1);
          if (preview && fields.affixInfo[i]) {
            const paramLabel = t('affix_param.' + (preview.param as string));
            fields.affixInfo[i].upgradeEffect = `${paramLabel}: ${formatScaledValue(preview.oldVal)} → ${formatScaledValue(preview.newVal)}`;
          }
        }
        tooltipData.skill!.enchantments = fields.enchantments;
        tooltipData.skill!.questProgress = fields.questProgress;
        tooltipData.skill!.apprenticeGrowth = fields.apprenticeGrowth;
      } else {
        const fields = buildAffixTooltipFields(skill);
        tooltipData.skill!.affixInfo = fields.affixInfo;
        tooltipData.skill!.enchantments = fields.enchantments;
        tooltipData.skill!.critChance = computeSkillCritChance(skill);
      }
      // Story 40.4: 形状描述
      const shapeDesc = getShapeDescription(skill.shapeId ?? 'monomino', getShapeCells(skill.shapeId ?? 'monomino', skill.rotation ?? 0)?.length ?? 1);
      if (shapeDesc) {
        tooltipData.skill!.mechanicInfo = shapeDesc;
      }
      // 商品 hover: 高亮键盘上匹配的技能
      highlightShopSkillMatches(skill);
      keyTooltip.show(e.clientX, e.clientY, tooltipData);
    });
    card.addEventListener('mouseleave', () => {
      keyTooltip.hide();
      clearRangeHighlight();
    });
  }

  // Story 40.6: 商店卡片右键预览旋转（仅视觉，不修改 state）
  if (item.type === 'skill' && item.affixSkill && item.affixSkill.shapeId && item.affixSkill.shapeId !== 'monomino') {
    let previewRotation = item.affixSkill.rotation ?? 0;
    card.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      const maxRot = getShapeRotationCount(item.affixSkill!.shapeId ?? 'monomino');
      const step = e.shiftKey ? maxRot - 1 : 1;
      previewRotation = (previewRotation + step) % maxRot;
      // 更新卡片内的形状预览
      const iconDiv = card.querySelector('.reward-icon');
      if (iconDiv) {
        const newPreview = renderShapePreview(item.affixSkill!.shapeId ?? 'monomino', previewRotation, item.affixSkill!.rarity);
        const existingPreview = iconDiv.querySelector('.shape-preview');
        if (existingPreview) existingPreview.remove();
        if (newPreview) iconDiv.insertAdjacentHTML('beforeend', newPreview);
      }
      // 更新 dataset 供拖拽读取
      card.dataset.rotation = String(previewRotation);
      if (newPreview) card.dataset.shapePreview = newPreview;
    });
  }

  el.rewardCards.appendChild(card);
}

// === 隐藏所有浮层（统一入口，防止多 tooltip 叠加） ===
function hideAllTooltips(): void {
  keyTooltip.hide();
  hideAffixComparisonPanel();
  document.getElementById('relic-tooltip')?.remove();
}

// 拖拽开始时清理所有 tooltip 和范围高亮（防止拖走技能时高亮残留）
let _dragStartListenerInstalled = false;
function ensureDragStartCleanup(): void {
  if (_dragStartListenerInstalled) return;
  _dragStartListenerInstalled = true;
  document.addEventListener('drag:start', () => {
    hideAllTooltips();
    clearRangeHighlight();
    document.querySelectorAll('.key-slot.void-range-empty').forEach(el => el.classList.remove('void-range-empty'));
    document.querySelectorAll('.inventory-skill.cross-highlight').forEach(el => el.classList.remove('cross-highlight'));
  });
}

// === 词条制技能对比面板 ===
let comparisonPanel: HTMLElement | null = null;

function showAffixComparisonPanel(shopSkill: AffixSkillInstance, cardEl: HTMLElement): void {
  // 找最佳对比目标：优先同资源类型 → 否则取第一个已装备的词条制技能
  let existingSkill: AffixSkillInstance | null = null;
  let existingKey: string | null = null;

  // 第一遍：找同资源类型的已装备技能
  for (const [k, id] of state.player.bindings) {
    if (state.affixSkills.has(id)) {
      const candidate = state.affixSkills.get(id)!;
      if (candidate.resource === shopSkill.resource) {
        existingSkill = candidate;
        existingKey = k;
        break;
      }
    }
  }
  // 第二遍：若无同资源，取第一个词条制技能
  if (!existingSkill) {
    for (const [k, id] of state.player.bindings) {
      if (state.affixSkills.has(id)) {
        existingSkill = state.affixSkills.get(id)!;
        existingKey = k;
        break;
      }
    }
  }

  if (!existingSkill) return; // 无已装备词条制技能，不显示对比

  hideAffixComparisonPanel();
  comparisonPanel = document.createElement('div');
  comparisonPanel.className = 'affix-comparison-panel';
  comparisonPanel.style.cssText = 'position:absolute;z-index:1000;background:#1a1a2e;border:2px solid #333;border-radius:0;padding:10px;font-size:9px;color:#ccc;pointer-events:none;min-width:280px;';

  // 左列：当前技能  右列：商店技能
  const leftCol = buildComparisonColumn(existingSkill, t('est.current_label', { key: existingKey?.toUpperCase() ?? '?' }), shopSkill);
  const rightCol = buildComparisonColumn(shopSkill, '商店候选', existingSkill);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:12px;';
  row.appendChild(leftCol);
  row.appendChild(rightCol);
  comparisonPanel.appendChild(row);

  // 定位
  document.body.appendChild(comparisonPanel);
  const cardRect = cardEl.getBoundingClientRect();
  comparisonPanel.style.left = `${cardRect.right + 8}px`;
  comparisonPanel.style.top = `${cardRect.top}px`;

  // 边界检查
  const panelRect = comparisonPanel.getBoundingClientRect();
  if (panelRect.right > window.innerWidth) {
    comparisonPanel.style.left = `${cardRect.left - panelRect.width - 8}px`;
  }
  if (panelRect.bottom > window.innerHeight) {
    comparisonPanel.style.top = `${window.innerHeight - panelRect.height - 8}px`;
  }
}

function buildComparisonColumn(skill: AffixSkillInstance, label: string, otherSkill: AffixSkillInstance): HTMLElement {
  const col = document.createElement('div');
  col.style.cssText = 'flex:1;min-width:120px;';

  const header = document.createElement('div');
  header.style.cssText = `font-weight:bold;color:${RARITY_COLORS[skill.rarity]};margin-bottom:4px;`;
  header.textContent = `${skill.icon} ${skill.name}`;
  col.appendChild(header);

  const labelDiv = document.createElement('div');
  labelDiv.style.cssText = 'color:#888;font-size:10px;margin-bottom:4px;';
  labelDiv.textContent = label;
  col.appendChild(labelDiv);

  // 稀有度：比对方高→绿，低→红
  const rarityDiv = document.createElement('div');
  const rarityColor = skill.rarity > otherSkill.rarity ? '#2ecc71' : skill.rarity < otherSkill.rarity ? '#e74c3c' : '#ccc';
  rarityDiv.style.cssText = `color:${rarityColor};`;
  rarityDiv.textContent = `${rarityLabel(skill.rarity)} Lv.${skill.level}`;
  col.appendChild(rarityDiv);

  // 词条列表（对方没有的词条类型→蓝色标注为"新增"）
  const otherAffixTypes = new Set(otherSkill.affixes.map(a => a.type));
  for (const affix of skill.affixes) {
    const affixDiv = document.createElement('div');
    const isNew = !otherAffixTypes.has(affix.type);
    affixDiv.style.cssText = `color:${isNew ? '#3498db' : '#e67e22'};font-size:10px;margin-top:2px;`;
    affixDiv.textContent = `[${t('affix.' + affix.type)}] ${buildAffixParamSummary(affix)}${isNew ? ' ' + t('affix.new_tag') : ''}`;
    col.appendChild(affixDiv);
  }

  // 附魔（使用统一信息查找）
  for (const enchId of skill.enchantmentIds) {
    const info = getEnchantmentDisplayInfo(enchId as EnchantmentType, skill.transmuteResource, skill.neighborPosRel, skill.bonusOutputResource);
    const enchName = info ? info.name : enchId.replace(/_/g, ' ');
    const enchColor = info ? info.categoryColor : '#9b59b6';
    const enchIcon = info ? info.icon : '✦';
    const enchDiv = document.createElement('div');
    enchDiv.style.cssText = `color:${enchColor};font-size:10px;margin-top:2px;`;
    enchDiv.textContent = `${enchIcon} ${enchName}`;
    col.appendChild(enchDiv);
  }

  return col;
}

function hideAffixComparisonPanel(): void {
  if (comparisonPanel && comparisonPanel.parentElement) {
    comparisonPanel.parentElement.removeChild(comparisonPanel);
  }
  comparisonPanel = null;
}

// === 牌包辅助函数 ===

import type { WordEffect, WordEffectType } from '../core/types';

const WORD_EFFECT_ICONS: Record<string, string> = {
  base_score: '⬆',
  base_multiplier: '⭐',
  multiplier: '✖',
  time: '⏳',
  gold: '🪙',
  crit: '💥',
  init_time: '⏱',
  init_gold: '💰',
  grant_skill: '🎁',
  init_mult: '✴',
  target_reduce: '🎯',
  skill_output: '⚡',
  init_shield: '🛡',
};

// 仅作用紧接下一关、关末清空的一次性 buff（nextLevelBuff）· 必须显式标注「仅下一关」，
// 否则与永久/逐词词效（init_time 永久 / grant_skill 永久 / base_score 逐词等）混淆。
const NEXT_LEVEL_ONLY_EFFECTS = new Set<WordEffectType>(['init_mult', 'target_reduce', 'skill_output', 'init_shield']);

export function formatWordEffectLabel(effect: WordEffect): string {
  const icon = WORD_EFFECT_ICONS[effect.type] || '';
  const letterHint = effect.targetLetter ? ` [${effect.targetLetter.toUpperCase()}]` : '';
  // crit/target_reduce 的 value 是小数比例 → 百分比整数；skill_output 显示为乘数 ×(1+value)；其余直接显示
  let value: number;
  if (effect.type === 'crit' || effect.type === 'target_reduce') value = Math.round(effect.value * 100);
  else if (effect.type === 'skill_output') value = 1 + effect.value;
  else value = effect.value;
  // 时效后缀（纯文本 · 部分消费端用 textContent，不能塞 HTML）：仅下一关的 buff 显式标注
  // 括号包在 i18n 串里（zh 全角 / en 半角），此处只接空格
  const durTag = NEXT_LEVEL_ONLY_EFFECTS.has(effect.type) ? ` ${t('wordeffect.nextlv')}` : '';
  return `${icon} ${t('wordeffect.' + effect.type, { value })}${letterHint}${durTag}`;
}

function getPackIcon(condType: PackConditionType): string {
  const meta = getConditionMeta({ type: condType });
  return meta.icon;
}

function highlightWord(word: string, _boundKeySet: Set<string>): string {
  // 高亮已解锁字母（频率 >= 阈值），而非仅绑定技能的键位
  const freqs = calculateLetterFrequency(state.player.wordDeck);
  return word.split('').map(c => {
    const lower = c.toLowerCase()
    if (lower >= 'a' && lower <= 'z' && (freqs.get(lower) ?? 0) >= FREQ_UNLOCK_THRESHOLD) {
      return `<span class="bound-letter">${c}</span>`
    }
    return c
  }).join('');
}

export function getFreqHints(word: string): string {
  const boundKeys = new Set([...state.player.bindings.keys()]);
  const counts = new Map<string, number>();
  for (const c of word.toLowerCase()) {
    if (boundKeys.has(c)) counts.set(c, (counts.get(c) || 0) + 1);
  }
  const hints: string[] = [];
  counts.forEach((n, k) => hints.push(`+${n} ${k.toUpperCase()}`));
  return hints.join(' ');
}

// === 词语三选一模态框 ===

function showWordPicker(words: string[], onPick: (word: string) => void, wordEffect?: WordEffect): void {
  const modal = document.getElementById('word-picker-modal');
  const cardsEl = document.getElementById('word-picker-cards');
  if (!modal || !cardsEl) {
    // fallback: 直接选第一个词
    onPick(words[0]);
    return;
  }

  cardsEl.innerHTML = '';
  const boundKeySet = new Set([...state.player.bindings.keys()]);
  const effectLabelHtml = wordEffect
    ? `<div class="word-effect-label" style="color:#e67e22;font-size:11px;margin-top:4px;">${formatWordEffectLabel(wordEffect)}</div>`
    : '';

  words.forEach(word => {
    const card = document.createElement('div');
    card.className = 'word-picker-card';

    const wordHtml = highlightWord(word, boundKeySet);
    const freqHint = getFreqHints(word);

    card.innerHTML = `
      <div class="word-picker-word">${wordHtml}</div>
      <div class="word-picker-len">${word.length} ${t('shop.letters')}</div>
      ${freqHint ? `<div class="word-picker-freq">${freqHint}</div>` : ''}
      ${effectLabelHtml}
    `;

    card.onclick = () => {
      modal.classList.add('word-picker-hidden');
      onPick(word);
    };

    cardsEl.appendChild(card);
  });

  modal.classList.remove('word-picker-hidden');
}

/** 为「获得技能」奖励掷一个 SkillFilter **条件**：从该稀有度实际可用的两类维度
 *  （产出资源 / 段落 tag）里随机挑一个维度、再挑一个值作为约束，把奖励从"纯随机技能"
 *  收紧为"随机但限定 资源 或 段落 的技能"。条件在选择前即定下并展示，但具体掉哪把仍随机。
 *  两维度都无候选时退化为仅稀有度约束。 */
function rollGrantSkillFilter(skillRarity: number): SkillFilter {
  const rarity = Math.max(0, Math.min(3, skillRarity));
  const pool = getCandidatePool('recipe_pool');
  const base = widenSkillFilter({ rarity }, pool);
  const resSet = new Set<string>();
  const tagSet = new Set<SectionTag>();
  for (const s of base.matches) {
    if (s.resourcePool) for (const r of s.resourcePool) resSet.add(r);
    if (s.section) tagSet.add(s.section);
  }
  const resList = [...resSet];
  const tagList = [...tagSet];
  const dims: ('resource' | 'tag')[] = [];
  if (resList.length > 0) dims.push('resource');
  if (tagList.length > 0) dims.push('tag');
  if (dims.length === 0) return { rarity };
  const dim = dims[Math.floor(random() * dims.length)];
  if (dim === 'resource') return { rarity, resource: resList[Math.floor(random() * resList.length)] };
  return { rarity, hasTag: tagList[Math.floor(random() * tagList.length)] };
}

/** 按已定 SkillFilter 掷出一把随机技能（recipe_pool 候选 → widen 兜底 → spawnSkillFromSeed），
 *  返回实例但**不写入 state**。无候选返回 null。 */
function rollRandomSkill(filter: SkillFilter): AffixSkillInstance | null {
  const pool = getCandidatePool('recipe_pool');
  if (pool.length === 0) return null;
  const widen = widenSkillFilter(filter, pool);
  let matches = widen.matches;
  // filter 指定产出资源时优先选 resourcePool 明确含该资源的 seed：
  // 无约束池（resourcePool=undefined）的 seed 虽过 filter，但 spawnSkillFromSeed 会让 generateSkill 随机改资源，
  // 与预览条件不符。挑明确含资源的 seed 可保证产出资源 == 预览条件。
  const wantRes = typeof widen.filter.resource === 'string' ? [widen.filter.resource]
    : Array.isArray(widen.filter.resource) ? widen.filter.resource : null;
  if (wantRes) {
    const strict = matches.filter(s => s.resourcePool && s.resourcePool.some(r => wantRes.includes(r)));
    if (strict.length > 0) matches = strict;
  }
  if (matches.length === 0) return null;
  const seed = matches[Math.floor(random() * matches.length)];
  return spawnSkillFromSeed(seed, 1, widen.filter);
}

/** 把掷出的技能落入 state 并派入收件槽（玩家在随后的商店工作台绑定）。
 *  state 写入与 affixV2BattleIntegration 的 gain_skill 同款（含 affixSkillStates，否则 rarity0 技能零产出）。
 *  收件槽满则返回 false 放弃；对同一技能重复 commit 幂等。 */
function commitGrantedSkill(skill: AffixSkillInstance): boolean {
  if (state.player.inbox.includes(skill.id)) return true;
  if (state.player.inbox.length >= INBOX_MAX) return false;
  state.affixSkills.set(skill.id, skill);
  state.player.skills.set(skill.id, { level: skill.level });
  if (!state.affixSkillStates.has(skill.id)) state.affixSkillStates.set(skill.id, createSkillRuntimeState(skill.id));
  state.player.inbox.push(skill.id);
  return true;
}

/** 一次性元效果：获得 1 个随机技能，派入收件槽。复用 teach 的 gain_skill 管线（filter → roll → commit）。 */
function grantRandomSkill(filter: SkillFilter): void {
  const skill = rollRandomSkill(filter);
  if (skill) commitGrantedSkill(skill);
}

/** 「获得技能」词在补录单上的**条件**预览：只揭示 filter 约束（产出资源 或 段落 tag），不揭示具体技能实例。 */
function buildGrantSkillFilterPreviewHtml(filter: SkillFilter): string {
  const zhLocal = getLocale() === 'zh';
  // 段落 tag 条件优先（若有）：按 section 染色显示段名
  const tagVal = typeof filter.hasTag === 'string' ? filter.hasTag
    : Array.isArray(filter.hasTag) ? filter.hasTag[0] : undefined;
  let cond: string;
  if (tagVal) {
    const sec = tagVal as SectionTag;
    const color = SECTION_COLORS[sec] || 'var(--desk-ink)';
    cond = `<span class="sk-sec" style="color:${color};border-color:${color}">${getSectionName(sec)}</span>`;
  } else {
    const res = typeof filter.resource === 'string' ? filter.resource
      : Array.isArray(filter.resource) ? filter.resource[0] : undefined;
    const resIcon = res ? (RESOURCE_ICONS[res as keyof typeof RESOURCE_ICONS] || '') : '';
    const resName = res ? (t('resource.' + res) || res) : (zhLocal ? '不限资源' : 'ANY');
    cond = `${resIcon}${resName}`;
  }
  // 单句式：获得 …条件… 技能 / GAIN …cond… SKILL
  const phrase = zhLocal
    ? `获得 <span class="sk-cond">${cond}</span> 技能`
    : `GAIN <span class="sk-cond">${cond}</span> SKILL`;
  const full = state.player.inbox.length >= INBOX_MAX
    ? `<span class="sk-full">${zhLocal ? '· 收件槽已满' : '· INBOX FULL'}</span>` : '';
  return `<div class="wp-skill-preview">`
    + `<span class="sk-tag">${phrase}</span>`
    + full
    + `</div>`;
}

// === 每关结束 · 词语补录（文牍式三选一 · 免费 · 可跳过） ===
// 牌包已移出商店：普通关通关后弹出申领单，三个单词候选选 1（或弃用）。
// 视觉与遗物申请表 / 封装工单同源（desk-paper.requisition）。
// 沿用商店原有的 pack-system 职业门控：若某职业失去牌包系统则直接跳过。
export function showWordPackReward(onComplete: () => void): void {
  if (!isFeatureEnabled('pack-system')) {
    onComplete();
    return;
  }

  const boundKeys = [...state.player.bindings.keys()];
  const playerFreqs = calculateLetterFrequency(state.player.wordDeck);
  const packs = generateWordPacks(state.player.wordDeck, playerFreqs, boundKeys, 3, state.cycle, getActMaxRarity());

  // 拍平为单词候选：取每个牌包首词 + 其词效；按词去重
  const seen = new Set<string>();
  const candidates: { word: string; rarity: 0 | 1 | 2 | 3; effect?: WordEffect; grantFilter?: SkillFilter }[] = [];
  for (const pack of packs) {
    const word = pack.words[0];
    if (!word || seen.has(word)) continue;
    seen.add(word);
    candidates.push({ word, rarity: pack.rarity, effect: pack.wordEffect });
  }
  if (candidates.length === 0) {
    onComplete();
    return;
  }

  // 「获得技能」词：选择前即掷定 SkillFilter 条件（产出资源约束），卡片上预览该条件；
  // 选定后再按同一条件掷出随机技能。条件确定但实例随机。
  for (const c of candidates) {
    if (c.effect?.type === 'grant_skill') c.grantFilter = rollGrantSkillFilter(c.rarity);
  }

  const zh = getLocale() === 'zh';
  const workerId = (() => {
    try { return localStorage.getItem('dpca-worker-id') || 'OP. PRIMATE-7842'; }
    catch { return 'OP. PRIMATE-7842'; }
  })();
  const letters = ['A', 'B', 'C', 'D', 'E'];

  // 未解锁字母 = 词库中出现次数 < 阈值（=0）→ 该键位锁定，打字时不会出现、技能/计分无法触发。
  // 在补录单上显出来，让玩家知道还缺哪些字母（选含红字母的词即可解锁该键）。
  const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
  const lockedSet = new Set([...ALPHA].filter(c => (playerFreqs.get(c) ?? 0) < FREQ_UNLOCK_THRESHOLD));
  const keycovLabel = lockedSet.size === 0
    ? (zh ? '字母已全部解锁' : 'ALL KEYS UNLOCKED')
    : (zh ? `未解锁键位 ${lockedSet.size}` : `${lockedSet.size} KEYS LOCKED`);
  const keycovStrip = [...ALPHA]
    .map(c => `<span class="wp-kc${lockedSet.has(c) ? ' lk' : ''}">${c.toUpperCase()}</span>`)
    .join('');
  const keycovHtml = `<div class="wp-keycov"><span class="wp-keycov-label">${keycovLabel}</span><span class="wp-keycov-strip">${keycovStrip}</span></div>`;
  // 候选词内把"当前未解锁"的字母标红 —— 选它即可点亮这些键位
  const renderWordName = (w: string) => w.toUpperCase().split('').map(ch =>
    lockedSet.has(ch.toLowerCase()) ? `<span class="wp-newkey">${ch}</span>` : ch
  ).join('');

  const overlay = document.createElement('div');
  overlay.className = 'wordpack-desk-overlay';
  // 挂进 #game-container（900×600 带边框）而非 body：position:absolute 让外框继续框住它。
  // z-index 9999 > CRT 扫描线层(#game-container::after = 9998) → 申领单盖在扫描线之上，
  // 但仍被容器 border + overflow:hidden 裁进框内（边框由容器自身绘制，不受子元素 z 影响）。
  overlay.style.cssText = 'position:absolute;inset:0;z-index:9999;';

  const stage = document.createElement('div');
  stage.className = 'desk-stage';
  const vignette = document.createElement('div');
  vignette.className = 'desk-vignette';
  const paperStage = document.createElement('div');
  paperStage.className = 'desk-paper-stage';

  const paper = document.createElement('div');
  paper.className = 'desk-paper requisition';
  paper.innerHTML = `
    <div class="desk-paper-header">
      <div class="seal" aria-label="DPCA seal"><img src="/assets/ui/seal-mark.png" alt=""></div>
      <div class="h-text">
        <div class="org">${zh ? 'DPCA · 外部文本回收科' : 'DPCA · EXT. TEXT RECYCLING'}</div>
        <div class="title">${zh ? '词语补录 · WORD INTAKE' : 'WORD INTAKE · 词语补录'}</div>
      </div>
      <div class="form-id">FORM-RC1<br>SEC 4</div>
    </div>
    <div class="wp-meta">
      <div class="req-form-fields">
        <div class="desk-paper-field">
          <div class="label">${zh ? '申领人' : 'APPLICANT'}</div>
          <div class="value printed">${workerId}</div>
        </div>
        <div class="desk-paper-field">
          <div class="label">${zh ? '词库存量' : 'ON FILE'}</div>
          <div class="value printed">${state.player.wordDeck.length}</div>
        </div>
      </div>
      ${keycovHtml}
    </div>
    <div class="req-instruction">${zh
      ? '勾选一个词语补录 · CHECK ONE WORD'
      : 'CHECK ONE WORD'}</div>
    <div class="req-list"></div>
    <div class="desk-input-line">
      <div class="label">${zh ? '▸ 备注栏' : '▸ NOTE'}</div>
      <input type="text" placeholder="A / B / C" maxlength="1" autocomplete="off" style="text-transform:uppercase">
      <div class="desk-enter-hint"><span class="key">↵</span><span>${zh ? '提交' : 'SUBMIT'}</span></div>
    </div>
    <div class="req-skip-row">
      <button class="req-skip">${zh ? '□ 跳过本次补录 · DECLINE' : '□ DECLINE · skip word'}</button>
    </div>
    <div class="desk-stamp-mark" data-tint="green">
      <div class="ring"></div>
      <div class="ring inner"></div>
      <div class="seal-img"><img src="/assets/ui/seal-mark.png" alt=""></div>
      <div class="label">${zh ? 'FILED<br>已录' : 'FILED'}</div>
      <div class="date">${zh ? 'DPCA · 外部文本回收科' : 'DPCA · RECYCLING'}</div>
    </div>
  `;

  const listEl = paper.querySelector('.req-list') as HTMLElement;
  const inputEl = paper.querySelector('input') as HTMLInputElement;
  const skipBtn = paper.querySelector('.req-skip') as HTMLButtonElement;
  const stampEl = paper.querySelector('.desk-stamp-mark') as HTMLElement;

  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    overlay.remove();
    onComplete();
  };

  candidates.forEach(({ word, rarity, effect, grantFilter }, idx) => {
    const letter = letters[idx] ?? String(idx + 1);
    const rarityClass = RARITY_KEYS[rarity] ?? 'common';
    const freqHint = getFreqHints(word);
    let effLabel = effect ? formatWordEffectLabel(effect) : '';
    // 「仅下一关」时效标注标红 —— 本表单经 innerHTML 渲染可上色；formatWordEffectLabel 本体保持纯文本供 textContent 消费端
    if (effLabel) {
      const durStr = t('wordeffect.nextlv');
      if (effLabel.includes(durStr)) effLabel = effLabel.replace(durStr, `<span class="wp-dur">${durStr}</span>`);
    }
    const descParts = [
      zh ? `${word.length} 字母` : `${word.length} letters`,
      freqHint,
      effLabel,
    ].filter(Boolean);

    const row = document.createElement('div');
    row.className = `req-row rarity-${rarityClass}`;
    row.dataset.key = letter;
    row.dataset.word = word;
    row.innerHTML = `
      <div class="checkbox"></div>
      <div class="key-letter">${letter}</div>
      <div>
        <div class="name">${renderWordName(word)}</div>
        <div class="desc">${descParts.join(' · ')}</div>
        ${grantFilter ? buildGrantSkillFilterPreviewHtml(grantFilter) : ''}
      </div>
      <div class="clr">${rarityLabel(rarity)}</div>
    `;
    row.addEventListener('click', () => {
      if (inputEl.disabled) return;
      playDeskSound('paper');
      inputEl.value = letter;
      highlightFromInput();
      setTimeout(() => { if (!inputEl.disabled) submit(); }, 200);
    });
    listEl.appendChild(row);
  });

  function highlightFromInput(): void {
    const v = inputEl.value.toUpperCase();
    listEl.querySelectorAll<HTMLElement>('.req-row').forEach(r => r.classList.remove('active'));
    listEl.querySelector<HTMLElement>(`.req-row[data-key="${v}"]`)?.classList.add('active');
  }

  function submit(): void {
    const v = inputEl.value.toUpperCase();
    const row = listEl.querySelector<HTMLElement>(`.req-row[data-key="${v}"]`);
    const word = row?.dataset.word;
    if (!word) return;
    const chosen = candidates.find(c => c.word === word);
    if (!chosen) return;
    inputEl.disabled = true;
    row?.classList.add('active');

    state.player.wordDeck.push(chosen.word);
    if (chosen.effect) {
      state.wordEffects.set(chosen.word, chosen.effect);
      // 一次性元效果（收录瞬间结算）：
      if (chosen.effect.type === 'init_time') state.player.timeBonus += chosen.effect.value;  // 永久 +初始时间（startTimer 读 timeMax + timeBonus）
      if (chosen.effect.type === 'init_gold') state.gold = (state.gold ?? 0) + chosen.effect.value;  // 按词长入账金币
      if (chosen.effect.type === 'grant_skill') grantRandomSkill(chosen.grantFilter ?? { rarity: chosen.rarity });  // 按预览条件掷出（稀有度=词稀有度 · 资源受 filter 约束）
      // 一次性「下一关」buff：累加到 nextLevelBuff，仅作用紧接的下一关（battle.startLevel 应用 + endLevel 清空）
      const nlb = (state.player.nextLevelBuff ??= { initMult: 0, targetReduce: 0, skillOutput: 0, shield: 0 });
      if (chosen.effect.type === 'init_mult') nlb.initMult += chosen.effect.value;       // +初始倍率
      if (chosen.effect.type === 'target_reduce') nlb.targetReduce += chosen.effect.value; // 目标分数 -X%
      if (chosen.effect.type === 'skill_output') nlb.skillOutput += chosen.effect.value;   // 技能产出 +X
      if (chosen.effect.type === 'init_shield') nlb.shield += chosen.effect.value;          // 开局 +护盾
    }

    stampEl.classList.add('show');
    stage.classList.add('thunk');
    playDeskSound('stamp');
    setTimeout(() => {
      stampEl.classList.remove('show');
      playDeskSound('whoosh');
      finish();
    }, 1000);
  }

  inputEl.oninput = highlightFromInput;
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (!inputEl.disabled) submit(); }
  };
  skipBtn.onclick = () => { if (completed) return; playDeskSound('paper'); playDeskSound('whoosh'); finish(); };

  paperStage.appendChild(paper);
  stage.appendChild(vignette);
  stage.appendChild(paperStage);
  overlay.appendChild(stage);
  (document.getElementById('game-container') ?? document.body).appendChild(overlay);

  requestAnimationFrame(() => {
    paper.classList.add('active');
    inputEl.focus();
  });
}

/** 展开三选一词包：在卡片下方显示候选词行 */
function expandPackCard(card: HTMLElement, item: ShopItem, index: number): void {
  // 折叠其他已展开的词包
  document.querySelectorAll('.reward-card.pack-expanded').forEach(c => {
    if (c.nextElementSibling?.classList.contains('pack-expand-panel')) c.nextElementSibling.remove()
    c.classList.remove('pack-expanded')
  })

  const pack = item.pack!
  card.classList.add('pack-expanded')

  const panel = document.createElement('div')
  panel.className = 'pack-expand-panel'

  pack.words.forEach(word => {
    const row = document.createElement('div')
    row.className = 'pack-word-row'
    row.innerHTML = `
      <span class="word-text">${highlightWord(word, new Set())}</span>
      <span class="pack-word-len">${word.length}${t('shop.letters')}</span>
      <span class="pack-freq-hint">${getFreqHints(word)}</span>
    `
    row.addEventListener('mouseenter', () => {
      const letters = new Set(word.toLowerCase().split('').filter(c => c >= 'a' && c <= 'z'))
      for (const l of letters) document.querySelector(`.key-slot[data-key="${l}"]`)?.classList.add('word-hover-highlight')
    })
    row.addEventListener('mouseleave', () => {
      document.querySelectorAll('.key-slot.word-hover-highlight').forEach(el => el.classList.remove('word-hover-highlight'))
    })
    row.onclick = (e) => {
      e.stopPropagation()
      // 选中该词，直接购买
      const smuggleFree = index === getSmuggleFreeIndex()
      const cost = smuggleFree ? 0 : item.cost
      if (state.gold < cost) { return }
      if (smuggleFree) consumeSmuggleFree()
      state.gold -= cost
      updateGoldDisplay()
      playSound('buy')
      // finalize
      if (state.classId === 'wordsmith') {
        const letters = word.toLowerCase().replace(/[^a-z]/g, '').split('')
        for (const ch of letters) state.fragmentInventory[ch] = (state.fragmentInventory[ch] ?? 0) + 1
        const counts: Record<string, number> = {}
        for (const ch of letters) counts[ch] = (counts[ch] ?? 0) + 1
        const detail = Object.entries(counts).map(([l, n]) => `+${n}${l}`).join(' ')
        // showFeedback(t('shop.disassemble_word', { word, detail }), '#9b59b6')
      } else {
        state.player.wordDeck.push(word)
        invalidateBigramCache()
        // showFeedback(t('shop.add_word', { word }), '#4ecdc4')
      }
      if (pack.wordEffect && state.classId !== 'wordsmith') {
        state.wordEffects.set(word, pack.wordEffect)
      }
      state.shop.items.splice(index, 1)
      renderUnifiedShop()
      renderBuildManager()
      refreshCraftPanelIfVisible()
    }
    panel.appendChild(row)
  })

  // 插入到卡片之后（而非内部），避免 card flex 布局干扰
  card.parentElement?.insertBefore(panel, card.nextSibling)
}

function purchasePackItem(index: number): void {
  const item = state.shop.items[index];
  if (!item || item.type !== 'pack' || !item.pack) return;

  // Story 36.9: 走私通道 — 最便宜商品免费
  const smuggleFree = index === getSmuggleFreeIndex();
  const cost = smuggleFree ? 0 : item.cost;

  if (state.gold < cost) {
    // showFeedback(t('shop.no_gold'), '#ff6b6b');
    return;
  }

  const pack = item.pack;

  const finalizePurchase = (word: string) => {
    if (state.classId === 'wordsmith') {
      // 造词师：词包拆解为碎片，不直接加入词库
      const letters = word.toLowerCase().replace(/[^a-z]/g, '').split('');
      for (const ch of letters) {
        state.fragmentInventory[ch] = (state.fragmentInventory[ch] ?? 0) + 1;
      }
      // 碎片明细
      const counts: Record<string, number> = {};
      for (const ch of letters) counts[ch] = (counts[ch] ?? 0) + 1;
      const detail = Object.entries(counts).map(([l, n]) => `+${n}${l}`).join(' ');
      // showFeedback(t('shop.disassemble_word', { word, detail }), '#9b59b6');
    } else {
      // 非造词师：直接加入词库
      state.player.wordDeck.push(word);
      invalidateBigramCache();
      // showFeedback(t('shop.add_word', { word }), '#4ecdc4');
    }
    // 词语效果：非造词师绑定到词（造词师拆解了词，效果无法绑定）
    if (pack.wordEffect && state.classId !== 'wordsmith') {
      state.wordEffects.set(word, pack.wordEffect);
    }
    state.shop.items.splice(index, 1);
    renderUnifiedShop();
    renderBuildManager();
    refreshCraftPanelIfVisible();
  };

  // 先扣金币
  if (smuggleFree) consumeSmuggleFree();
  state.gold -= cost;
  updateGoldDisplay();
  playSound('buy');

  if (pack.words.length <= pack.pickCount) {
    // 普通: 直接加入词库
    finalizePurchase(pack.words[0]);
  } else {
    // 稀有/史诗: 弹出三选一
    showWordPicker(pack.words, (pickedWord) => {
      finalizePurchase(pickedWord);
    }, pack.wordEffect);
  }
}

// === Lv.3 自动附魔检查（概率递减）· 迁移到 V2 附魔层 ===
// 概率门控 + 授予均委托 restStage.maybeGrantV2Enchant（数 V2 附魔数、公式不变、命中弹 V2 picker）。
function checkAutoEnchantment(skillId: string): void {
  maybeGrantV2Enchant(skillId, () => renderUnifiedShop());
}

/** 展示 Lv.3 触发的附魔选择面板（复用仪式附魔 UI 逻辑） */
function showAutoEnchantmentPanel(
  skillId: string,
  affixSkill: import('../data/affixes').AffixSkillInstance,
  choices: RitualCandidate[],
): void {
  const overlay = document.createElement('div');
  overlay.className = 'enchantment-picker-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;';

  const panel = document.createElement('div');
  panel.style.cssText = 'background:#1a1a2e;border:2px solid #ffd700;border-radius:0;padding:24px;max-width:500px;text-align:center;';

  const title = document.createElement('h3');
  title.textContent = t('ritual.pick_enchant');
  title.style.cssText = 'color:#ffd700;margin:0 0 16px;';
  panel.appendChild(title);

  const choicesDiv = document.createElement('div');
  choicesDiv.style.cssText = 'display:flex;gap:12px;justify-content:center;';

  for (const candidate of choices) {
    const info = getEnchantmentDisplayInfo(candidate.enchType, candidate.transmuteRes, candidate.neighborRel);
    if (!info) continue;

    const btn = document.createElement('button');
    btn.className = 'ritual-choice-btn';
    btn.innerHTML = `
      <div class="ritual-choice-category" style="color:${info.categoryColor}">${info.category}</div>
      <span class="ritual-choice-icon">${info.icon}</span>
      <span class="ritual-choice-name">${info.name}</span>
      <div class="ritual-choice-desc">${info.desc}</div>
    `;
    btn.onclick = () => {
      applyRitualEnchantment(skillId, affixSkill, candidate);
      overlay.remove();
      renderUnifiedShop();
      // 继续检查其他需要附魔的技能
      checkPendingEnchantments();
    };
    choicesDiv.appendChild(btn);
  }

  panel.appendChild(choicesDiv);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

// === 核心购买逻辑（仅技能） ===
// 返回购买的 skillId 或 null（非技能/失败），供调用者做后续绑定/进化
function executePurchase(index: number): { skillId: string; isNew: boolean; cost: number } | null {
  const item = state.shop.items[index];
  if (!item || item.type !== 'skill') return null;

  // Story 36.9: 走私通道 — 最便宜商品免费
  const smuggleFree = index === getSmuggleFreeIndex();
  const cost = smuggleFree ? 0 : item.cost;

  if (state.gold < cost) {
    // showFeedback(t('shop.no_gold'), '#ff6b6b');
    return null;
  }

  const skillId = item.skillId!;

  // T4 遗物约束：购买时再次检查（防止同次商店内先买遗物再买技能绕过限制）
  if (!item.isUpgrade) {
    const maxSkillCount = queryRelicFlag('max_skill_count') as number;
    if (maxSkillCount !== Infinity && state.player.skills.size >= maxSkillCount) {
      // showFeedback(t('shop.skill_count_full'), '#ff6b6b');
      return null;
    }
    // 备战席容量检查
    if (isInventoryFull(1)) {
      // showFeedback(t('shop.inventory_full'), '#ff6b6b');
      return null;
    }
  } else {
    const maxSkillLevel = Infinity;
    const currentLevel = state.player.skills.get(skillId)?.level ?? 0;
    if (maxSkillLevel !== Infinity && currentLevel >= maxSkillLevel) {
      // showFeedback(t('shop.level_capped'), '#ff6b6b');
      return null;
    }
  }

  if (smuggleFree) consumeSmuggleFree();
  state.gold -= cost;
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
        // 商店升级上限 Lv.3（Lv.4+ 通过战斗中自动升华获得）
        data.level = Math.min(3, data.level + 1);
        data.purchasePrice = (data.purchasePrice || 0) + item.cost;
      }
      // 同步更新 affixSkills 中的 level + 词条参数缩放
      const existing = state.affixSkills.get(skillId);
      if (existing) {
        existing.level = data?.level || existing.level;
        applyAffixLevelScaling(existing.affixes, 1);
        // Story 45: 升级含 Exhaust 的技能时重置消耗计数（补充使用次数）
        const rt = state.affixSkillStates.get(skillId);
        if (rt && existing.affixes.some(a => a.type === 'exhaust')) {
          rt.exhaustCount = 0;
        }
      }
      eventBus.emit('skill:upgraded', { skillId, newLevel: data?.level || 1 });
      // 达到附魔等级门槛时触发附魔（统一 Lv.3）
      if (data?.level === getMinEnchantmentLevel()) {
        checkAutoEnchantment(skillId);
      }
      // showFeedback(t('shop.skill_upgrade', { name: affixSkill.name }), '#ffe66d');
    } else {
      // 新词条制技能
      affixSkill.purchasePrice = item.cost;
      state.player.skills.set(skillId, { level: 1, purchasePrice: item.cost });
      state.affixSkills.set(skillId, affixSkill);
      state.affixSkillStates.set(skillId, createSkillRuntimeState(skillId));
      // showFeedback(t('shop.got_skill', { name: affixSkill.name }), '#4ecdc4');
      // 购买时等级=1，统一门槛 Lv.3，不会触发
      if (1 === getMinEnchantmentLevel()) {
        checkAutoEnchantment(skillId);
      }
    }
  }

  state.shop.items.splice(index, 1);

  // T2 遗物事件钩子：技能购买后触发 (Story 28.1)
  resolveRelicEffectsWithBehaviors('on_skill_purchase', {
    purchasedSkillId: skillId,
    isUpgrade: !isNew,
  });

  return { skillId, isNew, cost };
}

/**
 * Story 60.7: T4 极简主义 — 新购买技能自动升至 max_skill_level
 * 从 purchaseShopItem 抽出，让 classic 主流程 + terminal executeBuySkill 共享
 */
export function applyMaxSkillLevelOnPurchase(skillId: string): void {
  const minMaxLevel = queryRelicFlag('max_skill_level') as number;
  if (minMaxLevel === Infinity || minMaxLevel <= 1) return;
  const data = state.player.skills.get(skillId);
  if (!data || data.level >= minMaxLevel) return;
  data.level = minMaxLevel;
  const affixSkill = state.affixSkills.get(skillId);
  if (affixSkill) applyAffixLevelScaling(affixSkill.affixes, minMaxLevel - 1);
}

// === 点击购买商品 ===
function purchaseShopItem(index: number): void {
  const result = executePurchase(index);
  if (!result) return;

  // 点击购买新技能时，自动绑定到第一个空且未锁定键位（频率≥5）
  if (result.isNew && result.skillId && !hasGlassCannon()) {
    autoBindSkill(getBindingState(state), result.skillId, cachedLetterFreqs ?? undefined);
  }

  // T4 极简主义：新购买的技能自动升至 max_skill_level
  if (result.isNew) applyMaxSkillLevelOnPurchase(result.skillId);

  // Story 41.1: 附魔不再由购买自动触发，改为仪式/商店/试炼三渠道获取
  evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
  renderUnifiedShop();
  renderBuildManager();

  // 发送购买事件（引导系统 L1/L2 监听），放在所有后处理完成后
  eventBus.emit('shop:purchase', { type: 'skill', itemId: result.skillId, price: result.cost });
}

// === 购买遗物商品 ===
function purchaseShopRelicItem(index: number): void {
  const item = state.shop.items[index];
  if (!item || item.type !== 'relic' || !item.relicId) return;

  const relicId = item.relicId;
  const relic = RELICS[relicId];
  if (!relic) return;

  // Story 36.9: 走私通道 — 最便宜商品免费
  const smuggleFree = index === getSmuggleFreeIndex();
  const cost = smuggleFree ? 0 : item.cost;

  if (state.gold < cost) {
    // showFeedback(t('shop.no_gold'), '#ff6b6b');
    return;
  }

  if (state.player.relics.has(relicId)) {
    // showFeedback(t('shop.already_owned'), '#ff6b6b');
    return;
  }

  if (!isRelicSlotsFull()) {
    if (smuggleFree) consumeSmuggleFree();
    state.gold -= cost;
    addRelicWithCapacity(relicId);
    updateGoldDisplay();
    // showFeedback(t('shop.got_relic', { icon: relic.icon, name: localizeItemName(relicId, relic.name) }), '#ffe66d');
    playSound('buy');
    // 集训手册效果由 relic:acquired 事件监听处理
    // 资源熔炉 — 购买时随机赋值源/目标资源
    if (relicId === 'universal_furnace') {
      initFurnace(random);
      const cfg = getFurnaceConfig();
      if (cfg) showFeedback(`⚗️ ${t('resource.' + cfg.from)} → ${t('resource.' + cfg.to)}`, '#f39c12');
    }
    // D100 — 购买时立即替换所有技能词条
    if (relicId === 'd_100') {
      const count = rerollAllAffixes();
      // showFeedback removed for d100
    }
    // (row_medal deleted)
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
        if (smuggleFree) consumeSmuggleFree();
        state.gold -= cost;
        updateGoldDisplay();
        state.shop.items.splice(index, 1);
        // 集训手册效果由 relic:acquired 事件监听处理
      }
      const m = document.getElementById('relic-picker-modal');
      if (m) m.classList.add('relic-picker-hidden');
      renderRelicDisplay();
      renderUnifiedShop();
      renderBuildManager();
    });
  }
}

// === Story 41.1: 购买附魔台商品 ===
function purchaseShopEnchantmentItem(index: number): void {
  const item = state.shop.items[index];
  if (!item || item.type !== 'enchantment' || !item.enchantmentType) return;

  // 走私通道
  const smuggleFree = index === getSmuggleFreeIndex();
  const cost = smuggleFree ? 0 : item.cost;

  if (state.gold < cost) {
    // showFeedback(t('shop.no_gold'), '#ff6b6b');
    return;
  }

  // 获取有空槽的技能列表
  const anchorBonus = getEnchantAnchorSlotBonus();
  const eligibleSkills: Array<{ skillId: string; affixSkill: AffixSkillInstance }> = [];
  for (const [skillId, affixSkill] of state.affixSkills) {
    const slotCount = getEnchantmentSlotCount(affixSkill, anchorBonus);
    if (affixSkill.enchantmentIds.length < slotCount) {
      eligibleSkills.push({ skillId, affixSkill });
    }
  }

  if (eligibleSkills.length === 0) {
    // showFeedback(t('shop.no_enchant_target'), '#ff6b6b');
    return;
  }

  // 弹出技能选择界面（扣金在确认选择后执行）
  showEnchantmentTargetSelect(item, index, eligibleSkills, cost, smuggleFree);
}

/** 附魔台：选择目标技能弹窗 */
function showEnchantmentTargetSelect(
  item: ShopItem,
  shopIndex: number,
  eligibleSkills: Array<{ skillId: string; affixSkill: AffixSkillInstance }>,
  cost: number,
  smuggleFree: boolean,
): void {
  let modal = document.getElementById('enchantment-target-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'enchantment-target-modal';
    modal.className = 'ritual-enchantment-overlay';
    document.body.appendChild(modal);
  }

  const enchInfo = getEnchantmentDisplayInfo(
    item.enchantmentType as EnchantmentType,
    item.transmuteRes,
    item.neighborRel as PositionRelation | undefined,
  );
  const enchLabel = enchInfo ? `${enchInfo.icon} ${enchInfo.name}` : item.enchantmentType!;

  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="ritual-enchantment-panel">
      <h2 class="ritual-title">${t('shop.enchant_select_title')}</h2>
      <p class="ritual-subtitle">${t('shop.enchant_select_desc', { name: enchLabel })}</p>
      <div id="enchant-target-list" class="ritual-skill-list"></div>
      <button id="enchant-target-cancel" class="ritual-continue-btn" style="margin-top:12px;opacity:0.7">${t('rest.leave')}</button>
    </div>
  `;

  document.getElementById('enchant-target-cancel')!.onclick = () => {
    modal!.style.display = 'none';
    modal!.innerHTML = '';
  };

  const listEl = document.getElementById('enchant-target-list')!;
  for (const { skillId, affixSkill } of eligibleSkills) {
    const btn = document.createElement('button');
    btn.className = 'ritual-skill-btn';
    btn.innerHTML = `<span class="ritual-skill-icon">${affixSkill.icon}</span><span class="ritual-skill-name">${affixSkill.name}</span>`;
    btn.onclick = () => {
      // 扣金（确认选择后才扣）
      if (smuggleFree) consumeSmuggleFree();
      state.gold -= cost;
      updateGoldDisplay();

      // 写入附魔（复用统一逻辑）
      const candidate: RitualCandidate = {
        enchType: item.enchantmentType! as EnchantmentTypeEnum,
        transmuteRes: item.transmuteRes,
        neighborRel: item.neighborRel as PositionRelation | undefined,
      };
      applyRitualEnchantment(skillId, affixSkill, candidate);

      state.shop.items.splice(shopIndex, 1);

      modal!.style.display = 'none';
      modal!.innerHTML = '';

      const feedbackText = enchInfo
        ? t('ritual.applied', { icon: enchInfo.icon, name: enchInfo.name, skill: affixSkill.name })
        : t('ritual.applied_generic');
      // showFeedback(feedbackText, '#4ecdc4');

      renderUnifiedShop();
      renderBuildManager();
    };
    listEl.appendChild(btn);
  }
}

// === 补偿检查（旧系统已移除，保留空实现） ===
let _shopPendingEnchantIds: string[] = [];

function checkPendingEnchantments(): void {
  // 首次调用时从 restStage 消费待附魔ID
  const consumed = consumePendingEnchantSkillIds();
  if (consumed.length > 0) _shopPendingEnchantIds.push(...consumed);
  if (_shopPendingEnchantIds.length === 0) return;
  const anchorBonus = getEnchantAnchorSlotBonus();
  while (_shopPendingEnchantIds.length > 0) {
    const skillId = _shopPendingEnchantIds.shift()!;
    const affixSkill = state.affixSkills.get(skillId);
    if (!affixSkill) continue;
    const slotCount = getEnchantmentSlotCount(affixSkill, anchorBonus);
    if (affixSkill.enchantmentIds.length >= slotCount) continue;
    const candidates = generateRitualCandidates(affixSkill);
    if (candidates.length > 0) {
      const choices = pickRitualChoices(candidates, 3);
      showAutoEnchantmentPanel(skillId, affixSkill, choices);
      return; // 一次弹一个，回调会再次调用 checkPendingEnchantments
    }
  }
}

// === 刷新商店 ===
function refreshShop(): void {
  let cost = getRefreshCost();
  // Story 36.9: 限时拍卖 — 刷新免费
  if (isTimedAuction()) {
    cost = 0;
  }
  // Story 36.7: 词语经销商 — 消费免费刷新 flag
  if (cost > 0 && consumeWordDealerFreeRefresh()) {
    cost = 0;
    // showFeedback('🤑 免费刷新！', '#ffe66d');
  }
  // Story 36.10: 幕间准备 — 消费免费刷新
  if (cost > 0 && hasIntermissionFreeRefresh()) {
    consumeIntermissionFreeRefresh();
    cost = 0;
    // showFeedback(t('shop.intermission_refresh'), '#88ddff');
  }
  // 致命礼物 — 消费免费刷新
  if (cost > 0 && consumeDeadlyGiftFreeRefresh()) {
    cost = 0;
    // showFeedback(t('shop.deadly_gift_refresh'), '#ffdd00');
  }
  if (cost > 0 && state.gold < cost) {
    // showFeedback(t('shop.no_gold'), '#ff6b6b');
    return;
  }
  state.gold -= cost;
  state.shop.refreshCount++;
  updateGoldDisplay();
  playSound('buy');

  // Story 36.9: 黑市门票 — +1 商品位
  const shopSlots = SHOP_SKILL_SLOTS + getBlackMarketExtraSlots();
  // 保留锁定项，替换未锁定项
  const locked = state.shop.items.filter(item => item.locked);
  const newItems = generateShopItems(shopSlots - locked.length, getBlackMarketExtraSlots() > 0);
  state.shop.items = [...locked, ...newItems];

  renderUnifiedShop();
}

// === 卖出技能 ===
export function sellSkill(skillId: string): void {
  const data = state.player.skills.get(skillId);
  if (!data) return;

  // Story 36.9: 回收专家 — 出售技能回收价从 50% 提升至 75%
  const sellPrice = Math.floor((data.purchasePrice || 15) * getRecycleSellMultiplier());
  state.gold += sellPrice;

  // 双阶段：派发 on_sold（建造期独占触发）· 必须在解绑/删除前发——之后该 skill 词条已不在装配表
  eventBus.emit('skill:sold', { skillId });

  // 移除绑定（多格形状全解）
  unbindSkill(getBindingState(state), skillId);

  // 移除词条制技能数据（AC4 — 运行时状态丢弃）
  state.affixSkills.delete(skillId);
  state.affixSkillStates.delete(skillId);

  // 移除技能
  state.player.skills.delete(skillId);

  updateGoldDisplay();
  // showFeedback(t('shop.sell', { price: sellPrice }), '#ffe66d');
  playSound('buy');
  evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
  renderUnifiedShop();
  renderBuildManager();
}

// === 卖出词语 ===
export function sellWord(index: number): void {
  if (index < 0 || index >= state.player.wordDeck.length) return;
  if (state.player.wordDeck.length <= MIN_WORD_COUNT) {
    // showFeedback(t('shop.min_words', { count: MIN_WORD_COUNT }), '#ff6b6b');
    return;
  }
  const word = state.player.wordDeck[index];
  state.gold += 3;
  state.player.wordDeck.splice(index, 1);
  invalidateBigramCache();
  // 移除词语效果
  state.wordEffects.delete(word);
  updateGoldDisplay();
  // showFeedback(t('shop.sell_word', { word }), '#ffe66d');
  // Story 36.7: 词语经销商 — 卖词后下次刷新免费
  if (setWordDealerFlag()) {
    // showFeedback('🤑 下次刷新免费', '#88ddff');
  }
  playSound('buy');
  renderUnifiedShop();
  renderBuildManager();
}

let _enchantmentOnClose: (() => void) | null = null;

function closeEnchantmentModal(): void {
  const modal = document.getElementById('enchantment-modal');
  if (modal) {
    modal.classList.add('enchantment-hidden');
    modal.style.display = '';
  }
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

/** 附魔类别颜色 */
const ENCHANTMENT_CATEGORY_COLORS: Record<string, string> = {
  apprentice: '#2ecc71',
  quest: '#4ecdc4',
  transmute: '#e67e22',
  passive: '#9b59b6',
  operator: '#e74c3c',
}

// 附魔类别名 — 通过 t('ench_cat.' + category) 获取

/** 统一附魔信息查找 */
export function getEnchantmentDisplayInfo(type: EnchantmentType, transmuteRes?: import('../core/types').ResourceType, neighborRel?: PositionRelation, bonusOutputRes?: import('../core/types').ResourceType): {
  name: string; desc: string; icon: string; category: string; categoryColor: string;
} | null {
  // BonusOutput 特殊处理：显示附加产出的资源
  if (type === EnchantmentTypeEnum.BonusOutput && bonusOutputRes) {
    const resName = t('resource.' + bonusOutputRes)
    const resIcon = RESOURCE_ICONS[bonusOutputRes] || ''
    return {
      name: t('ench_meta.bonus_output', { resource: resName }),
      desc: t('ench_meta.bonus_output.desc', { resource: `${resIcon}${resName}` }),
      icon: '🔀',
      category: t('ench_cat.passive'),
      categoryColor: ENCHANTMENT_CATEGORY_COLORS.passive,
    }
  }
  // Quest 类型
  const questDef = getQuestEnchantmentDef(type);
  if (questDef) {
    const equipTarget = getQuestEquipTarget(questDef.targetAffix, getQuestEquipReduction())
    const affixNames = (Array.isArray(questDef.targetAffix) ? questDef.targetAffix : [questDef.targetAffix])
      .map(at => t('affix.' + at) || AFFIX_NAMES[at] || at)
      .join('/')
    return {
      name: t('quest.' + questDef.type),
      desc: t('ench_info.quest_equip_desc', { effect: t('quest.' + questDef.type + '.effect'), target: equipTarget, affix: affixNames }),
      icon: '✨',
      category: t('ench_cat.quest'),
      categoryColor: ENCHANTMENT_CATEGORY_COLORS.quest,
    };
  }
  // Transmute 特殊处理
  if ((type as string) === 'transmute' && transmuteRes) {
    const ratio = TRANSMUTE_RATIO_TABLE[transmuteRes];
    return {
      name: t('transmute_name.' + transmuteRes),
      desc: t('ench_info.transmute_desc', { pct: (ratio * 100).toFixed(0), name: t('resource.' + transmuteRes) }),
      icon: '🔀',
      category: t('ench_cat.transmute'),
      categoryColor: ENCHANTMENT_CATEGORY_COLORS.transmute,
    };
  }
  // ApprenticeNeighbor 特殊处理：显示分配的位置关系和成长率
  if (type === EnchantmentTypeEnum.ApprenticeNeighbor) {
    if (neighborRel) {
      const growth = APPRENTICE_NEIGHBOR_GROWTH[neighborRel]
      const relLabel = t('rel.' + neighborRel)
      return {
        name: t('ench_info.neighbor_label', { rel: relLabel }),
        desc: t('ench_info.neighbor_desc', { rel: relLabel, pct: (growth * 100).toFixed(1) }),
        icon: '👀',
        category: t('ench_cat.apprentice'),
        categoryColor: ENCHANTMENT_CATEGORY_COLORS.apprentice,
      };
    }
    // 无具体关系时（旧存档兼容）显示通用描述
    return {
      name: t('ench_info.neighbor_generic'),
      desc: t('ench_info.neighbor_generic_desc'),
      icon: '👀',
      category: t('ench_cat.apprentice'),
      categoryColor: ENCHANTMENT_CATEGORY_COLORS.apprentice,
    };
  }
  // ENCHANTMENT_META 查找（学徒/被动/运算符）
  const meta = ENCHANTMENT_META[type as string];
  if (meta) {
    return {
      name: t('ench_meta.' + meta.type),
      desc: t('ench_meta.' + meta.type + '.desc'),
      icon: meta.icon,
      category: t('ench_cat.' + meta.category),
      categoryColor: ENCHANTMENT_CATEGORY_COLORS[meta.category] || '#999',
    };
  }
  return null;
}

/** 获取技能已有词条的共享 posRel（任一即可，因已统一） */
function getSkillPosRel(skill: import('../data/affixes').AffixSkillInstance): PositionRelation | undefined {
  return skill.affixes.find(a => a.posRel != null)?.posRel;
}

/** 词条制技能随机附魔（蜕变师路径） */
function applyAffixRandomEnchantment(
  skillId: string,
  affixSkill: import('../data/affixes').AffixSkillInstance,
  categorized: CategorizedEnchantments,
): void {
  const chosen = weightedPickEnchantment(categorized, random);
  if (!chosen) return;
  affixSkill.enchantmentIds.push(chosen);
  // Transmute：随机分配目标资源
  if ((chosen as string) === 'transmute') {
    const playerClass = state.classId !== 'none' ? state.classId : undefined;
    const eligible = getTransmuteEligibleResources(affixSkill.resource, playerClass);
    if (eligible.length > 0) {
      affixSkill.transmuteResource = eligible[Math.floor(random() * eligible.length)];
    }
  }
  // BonusOutput：随机分配一个与技能产出不同的资源
  if (chosen === EnchantmentTypeEnum.BonusOutput) {
    const allRes = GENERIC_RESOURCES;
    const eligible = allRes.filter(r => r !== affixSkill.resource);
    affixSkill.bonusOutputResource = eligible[Math.floor(random() * eligible.length)];
  }
  // ApprenticeNeighbor：复用技能已有词条的 posRel，否则随机
  if (chosen === EnchantmentTypeEnum.ApprenticeNeighbor) {
    const allRels = Object.values(PositionRelation);
    affixSkill.neighborPosRel = getSkillPosRel(affixSkill) ?? allRels[Math.floor(random() * allRels.length)];
  }
  const info = getEnchantmentDisplayInfo(chosen, affixSkill.transmuteResource, affixSkill.neighborPosRel, affixSkill.bonusOutputResource);
  if (info) {
    // showFeedback(t('shop.random_enchant', { icon: info.icon, name: info.name }), '#f9ca24');
  }
  resolveRelicEffectsWithBehaviors('on_enchantment_acquire', {
    enchantedSkillId: skillId,
    enchantmentId: chosen,
  });
  playSound('buy');
}

/** 词条制技能附魔选择界面 */
function renderAffixEnchantmentModal(
  skillId: string,
  affixSkill: import('../data/affixes').AffixSkillInstance,
  categorized: CategorizedEnchantments,
): void {
  _enchantmentOnClose = null;
  const modal = document.getElementById('enchantment-modal');
  const titleEl = document.getElementById('enchantment-title');
  const branchesEl = document.getElementById('enchantment-branches');
  const cancelBtn = document.getElementById('enchantment-cancel');
  if (!modal || !titleEl || !branchesEl || !cancelBtn) return;

  const playerClass = state.classId !== 'none' ? state.classId : undefined;
  const candidates = [...categorized.apprentice, ...categorized.quest, ...categorized.transmute, ...categorized.operator];

  // 预处理候选：展开 Transmute 资源变体 + ApprenticeNeighbor 位置关系，并标记类别
  type CategoryKey = 'apprentice' | 'quest' | 'transmute' | 'operator';
  type ShownCandidate = { enchType: EnchantmentType; category: CategoryKey; transmuteRes?: import('../core/types').ResourceType; neighborRel?: PositionRelation };
  const ALL_POS_RELS = Object.values(PositionRelation);

  // 建立 enchType → category 映射
  const enchToCat = new Map<EnchantmentType, CategoryKey>();
  for (const e of categorized.apprentice) enchToCat.set(e, 'apprentice');
  for (const e of categorized.quest) enchToCat.set(e, 'quest');
  for (const e of categorized.transmute) enchToCat.set(e, 'transmute');
  for (const e of categorized.operator) enchToCat.set(e, 'operator');

  const expandedCandidates: ShownCandidate[] = [];
  for (const enchType of candidates) {
    const cat = enchToCat.get(enchType)!;
    if ((enchType as string) === 'transmute') {
      const eligible = getTransmuteEligibleResources(affixSkill.resource, playerClass);
      if (eligible.length > 0) {
        const res = eligible[Math.floor(random() * eligible.length)];
        expandedCandidates.push({ enchType, category: cat, transmuteRes: res });
      }
    } else if (enchType === EnchantmentTypeEnum.ApprenticeNeighbor) {
      const rel = getSkillPosRel(affixSkill) ?? ALL_POS_RELS[Math.floor(random() * ALL_POS_RELS.length)];
      expandedCandidates.push({ enchType, category: cat, neighborRel: rel });
    } else {
      expandedCandidates.push({ enchType, category: cat });
    }
  }

  // 按类别分组（用于两层加权抽取）
  const expandedByCategory = new Map<CategoryKey, ShownCandidate[]>();
  for (const sc of expandedCandidates) {
    let arr = expandedByCategory.get(sc.category);
    if (!arr) { arr = []; expandedByCategory.set(sc.category, arr); }
    arr.push(sc);
  }

  // Story 36.5: 命运三岔 — 候选数由遗物决定（默认 2，持有 fate_fork → 3）
  const maxBranches = getEnchantmentChoiceCount();
  const shown = expandedCandidates.length <= maxBranches ? expandedCandidates : (() => {
    const picked: ShownCandidate[] = [];
    const nonEmptyCategories = [...expandedByCategory.values()].filter(a => a.length > 0);
    while (picked.length < maxBranches && nonEmptyCategories.length > 0) {
      // 两层加权：先等权选类别，再类内等权选候选
      const catIdx = Math.floor(random() * nonEmptyCategories.length);
      const catPool = nonEmptyCategories[catIdx];
      const idx = Math.floor(random() * catPool.length);
      const candidate = catPool.splice(idx, 1)[0];
      // 类别池耗尽则移除
      if (catPool.length === 0) nonEmptyCategories.splice(catIdx, 1);
      // dedupe by enchType + transmuteRes
      if (!picked.some(p => p.enchType === candidate.enchType && p.transmuteRes === candidate.transmuteRes)) {
        picked.push(candidate);
      }
    }
    return picked;
  })();

  titleEl.textContent = t('shop.enchant_choose', { name: affixSkill.name });
  branchesEl.innerHTML = '';

  shown.forEach(({ enchType, transmuteRes, neighborRel }) => {
    const info = getEnchantmentDisplayInfo(enchType, transmuteRes, neighborRel);
    if (!info) return;
    const card = document.createElement('div');
    card.className = 'enchantment-branch';
    card.innerHTML = `
      <div class="enchantment-category-tag" style="color:${info.categoryColor}">${info.category}</div>
      <div class="enchantment-branch-icon">${info.icon}</div>
      <div class="enchantment-branch-name">${info.name}</div>
      <div class="enchantment-branch-desc">${info.desc}</div>
    `;
    card.onclick = () => {
      affixSkill.enchantmentIds.push(enchType);
      // Transmute：保存目标资源
      if ((enchType as string) === 'transmute' && transmuteRes) {
        affixSkill.transmuteResource = transmuteRes;
      }
      // ApprenticeNeighbor：保存位置关系
      if (enchType === EnchantmentTypeEnum.ApprenticeNeighbor && neighborRel) {
        affixSkill.neighborPosRel = neighborRel;
      }
      resolveRelicEffectsWithBehaviors('on_enchantment_acquire', {
        enchantedSkillId: skillId,
        enchantmentId: enchType,
      });
      if (state.player.relics.has('star_chart')) {
        state.player.relicStates['star_chart'] = (state.player.relicStates['star_chart'] ?? 0) + 1;
      }
      // showFeedback(t('shop.enchanted', { icon: info.icon, name: info.name }), '#f9ca24');
      playSound('buy');
      closeEnchantmentModal();
      renderUnifiedShop();
      renderBuildManager();
    };
    branchesEl.appendChild(card);
  });

  cancelBtn.onclick = () => closeEnchantmentModal();
  modal.classList.remove('enchantment-hidden');
}

// === 获取技能显示信息 ===
export function getSkillDisplay(skillId: string): { name: string; icon: string; desc: string } {
  const affixSkill = state.affixSkills.get(skillId);
  if (affixSkill) return { name: affixSkill.name, icon: affixSkill.icon, desc: '' };
  return { name: '???', icon: '?', desc: '' };
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

/** #rrggbb → rgba(r,g,b,a) */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** 商品 hover 时高亮键盘上匹配的已装备技能（共鸣/回响等全局匹配） */
function highlightShopSkillMatches(shopSkill: AffixSkillInstance): void {
  clearRangeHighlight();
  applyMatchHighlight(shopSkill, shopSkill.id);
}

/** 全局匹配技能高亮（黄框）：商店、备战席、构筑键盘 */
function applyMatchHighlight(affixSkill: AffixSkillInstance, sourceSkillId: string | null): void {
  const MATCH_AFFIX_TYPES = [AffixTypeEnum.Amplify, AffixTypeEnum.Splash, AffixTypeEnum.WarDrum, AffixTypeEnum.Union, AffixTypeEnum.Relay, AffixTypeEnum.Conduit, AffixTypeEnum.AuraFury, AffixTypeEnum.AuraMorale] as string[];
  const hasMatchAffix = affixSkill.affixes.some(a => MATCH_AFFIX_TYPES.includes(a.type));

  // 匹配条件检查器
  const isMatch = (target: AffixSkillInstance): boolean => {
    if (hasMatchAffix) {
      if (target.resource === affixSkill.resource) return true;
      if (target.affixes.some(a => !MATCH_AFFIX_TYPES.includes(a.type) && affixSkill.affixes.some(sa => sa.type === a.type))) return true;
    }
    for (const affix of affixSkill.affixes) {
      if (affix.type === AffixTypeEnum.Resonance && affix.resource && target.resource === affix.resource) return true;
      if (affix.type === AffixTypeEnum.Echo && affix.echoAffixA && affix.echoAffixB
        && target.affixes.some(a => a.type === affix.echoAffixA || a.type === affix.echoAffixB)) return true;
    }
    return false;
  };

  // 1. 已装备技能（键盘 + 备战席）
  for (const [sid, ns] of state.affixSkills) {
    if (sid === sourceSkillId) continue;
    if (!isMatch(ns)) continue;
    document.querySelectorAll(`.key-slot[data-bound-skill="${sid}"]`).forEach(el => el.classList.add('match-highlight'));
    document.querySelector(`.inventory-skill[data-skill-id="${sid}"]`)?.classList.add('match-highlight');
  }
  // 2. 商店商品
  state.shop.items.forEach((shopItem, idx) => {
    if (shopItem.type !== 'skill' || !shopItem.affixSkill) return;
    if (shopItem.affixSkill.id === sourceSkillId) return;
    if (!isMatch(shopItem.affixSkill)) return;
    const card = document.querySelector(`[data-shop-index="${idx}"]`);
    card?.classList.add('match-highlight');
  });
}

function highlightSkillRange(key: string): void {
  clearRangeHighlight();
  const skillId = state.player.bindings.get(key);
  if (!skillId) return;

  const highlights: { rel: PositionRelation; color: string }[] = [];
  const defaultColor = '#ffe66d';

  // 词条制技能 — 各词条用自己的颜色
  const affixSkill = state.affixSkills.get(skillId);
  if (affixSkill) {
    for (const affix of affixSkill.affixes) {
      if (affix.posRel) {
        highlights.push({ rel: affix.posRel, color: AFFIX_COLORS[affix.type] || defaultColor })
      }
    }
    // 学徒·观摩：附魔的空间关系也需要高亮
    if (affixSkill.neighborPosRel) {
      highlights.push({ rel: affixSkill.neighborPosRel, color: AFFIX_COLORS['apprentice'] || defaultColor })
    }
  }

  if (highlights.length === 0 && !affixSkill) return;

  // Story 40.11: 多格技能使用所有占据键计算邻居高亮范围
  const allKeys: string[] = [];
  for (const [k, sid] of state.player.bindings) {
    if (sid === skillId) allKeys.push(k);
  }
  if (allKeys.length === 0) return;

  // 收集每个键位的颜色（支持多色叠加）
  const keyColors = new Map<string, Set<string>>();
  const addColor = (k: string, color: string) => {
    if (!keyColors.has(k)) keyColors.set(k, new Set());
    keyColors.get(k)!.add(color);
  };

  // 1. 范围高亮（posRel 邻居）— 背景+边框
  for (const { rel, color } of highlights) {
    for (const k of getExtendedNeighbors(allKeys, rel)) {
      addColor(k, color);
    }
  }

  // 1b. V2 词条 selector → 范围高亮（neighbors / all_skills / matched_*；按 section 染色）
  //     legacy 只读 affix.posRel，纯 V2 技能此前在键盘 hover 无范围预览 — 此处补齐
  if (affixSkill?.v2Ids?.length) {
    const occupiedSet = new Set(allKeys);
    for (const defId of affixSkill.v2Ids) {
      const def = getAffixV2Definition(defId);
      if (!def) continue;
      const sel = extractSelectorFromEffect(def.effect);
      if (!sel) continue;
      const color = getV2Color(defId) || defaultColor;
      for (const k of resolveSelectorToHighlightKeys(sel, allKeys, occupiedSet, affixSkill.id)) {
        if (occupiedSet.has(k)) continue;
        addColor(k, color);
      }
    }
  }

  // 2. 匹配技能高亮：全局黄框（商店/备战席/键盘）
  if (affixSkill) {
    applyMatchHighlight(affixSkill, skillId);
  }

  // 范围高亮：背景+边框
  keyColors.forEach((colors, k) => {
    const el = document.querySelector(`.key-slot[data-key="${k}"]`) as HTMLElement | null;
    if (!el) return;
    el.classList.add('range-highlight');
    const colorArr = [...colors];
    if (colorArr.length === 1) {
      el.style.borderColor = colorArr[0];
      el.style.background = hexToRgba(colorArr[0], 0.15);
    } else {
      el.style.borderImage = `linear-gradient(135deg, ${colorArr.join(', ')}) 1`;
      el.style.background = colorArr.map(c => hexToRgba(c, 0.1)).join(', ').replace(/.+/,
        `linear-gradient(135deg, ${colorArr.map(c => hexToRgba(c, 0.12)).join(', ')})`);
    }
  });

}

function clearRangeHighlight(): void {
  document.querySelectorAll('.key-slot.range-highlight').forEach(el => {
    const slot = el as HTMLElement;
    slot.classList.remove('range-highlight');
    slot.style.borderColor = '';
    slot.style.background = '';
    slot.style.boxShadow = '';
    slot.style.borderImage = '';
    // 若该 slot 是技能键位，重新应用其 render-time 词条色
    const k = slot.dataset.key;
    if (k) {
      const skillId = state.player.bindings.get(k);
      if (skillId) {
        const affixSkill = state.affixSkills.get(skillId);
        if (affixSkill) applySkillBorderColor(slot, affixSkill);
      }
    }
  });
  // 清除跨区匹配高亮
  document.querySelectorAll('.match-highlight').forEach(el => el.classList.remove('match-highlight'));
}

/** 应用技能词条色描边（render-time 与 clearRangeHighlight 复用）— 像素风：主色填充 + 角标 */
function applySkillBorderColor(slot: HTMLElement, affixSkill: AffixSkillInstance): void {
  const rarityColor = RARITY_COLORS[affixSkill.rarity] || '#ffffff';
  slot.style.borderColor = rarityColor;
  const affixColors: string[] = [];
  for (const a of affixSkill.affixes) {
    const c = AFFIX_COLORS[a.type];
    if (c && !affixColors.includes(c)) affixColors.push(c);
  }
  if (affixColors.length === 0) return;

  // 主色：边框
  slot.style.borderColor = affixColors[0];

  // 像素风阶梯渐变：硬边多段，每段一个词条色（淡填充）
  const alpha = 0.22;
  const rgbaColors = affixColors.map(c => hexToRgba(c, alpha));
  if (rgbaColors.length === 1) {
    slot.style.background = rgbaColors[0];
  } else {
    const n = rgbaColors.length;
    const stops: string[] = [];
    for (let i = 0; i < n; i++) {
      const start = (i / n * 100).toFixed(2);
      const end = ((i + 1) / n * 100).toFixed(2);
      stops.push(`${rgbaColors[i]} ${start}% ${end}%`);
    }
    slot.style.background = `linear-gradient(135deg, ${stops.join(', ')})`;
  }
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

  // 计算字频（一次遍历）
  const letterFreqs = calculateLetterFrequency(state.player.wordDeck);
  cachedLetterFreqs = letterFreqs;
  const letterScores = calculateLetterScores(state.wordEffects);

  // 低频键位自动解绑（频率<阈值 → 底分为0 → 锁定）— 标点键绕过
  const hasPunctuationRelic = state.player.relics.has('punctuation_liberation');
  const keysToUnbind: string[] = [];
  for (const [key] of state.player.bindings) {
    if (PUNCTUATION_KEYS.includes(key)) continue; // 标点键不受字频限制
    if ((letterFreqs.get(key) ?? 0) < FREQ_UNLOCK_THRESHOLD) keysToUnbind.push(key);
  }
  const unboundSkillIds = new Set<string>();
  for (const key of keysToUnbind) {
    const skillId = state.player.bindings.get(key);
    if (skillId && !unboundSkillIds.has(skillId)) {
      unboundSkillIds.add(skillId);
      unbindSkill(getBindingState(state), skillId);
      const affixSk = state.affixSkills.get(skillId);
      // showFeedback removed for unbound
    }
  }
  if (unboundSkillIds.size > 0) {
    evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
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
    // 标点解放遗物：扩展键盘行
    const extKeys = hasPunctuationRelic ? (PUNCTUATION_KEYBOARD_EXTENSION[rowIndex] || []) : [];
    const extendedRow = [...row, ...extKeys];

    const rowDiv = document.createElement('div');
    rowDiv.className = 'keyboard-row';
    rowDiv.dataset.row = String(rowIndex);

    extendedRow.forEach(k => {
      const slot = document.createElement('div');
      slot.className = 'key-slot';
      slot.dataset.key = k;

      const freq = letterFreqs.get(k) ?? 0;
      const score = letterScores.get(k) ?? 0;
      const skillId = state.player.bindings.get(k);

      // 低频键位锁定（频率<5 → 底分为0）— 标点键绕过
      const isPunctKey = PUNCTUATION_KEYS.includes(k);
      if (freq < FREQ_UNLOCK_THRESHOLD && !isPunctKey) slot.classList.add('freq-locked');

      // 技能键位渲染
      if (skillId && state.affixSkills.has(skillId)) {
        // 词条制技能键位渲染
        const affixSkill = state.affixSkills.get(skillId)!;
        const rarityColor = RARITY_COLORS[affixSkill.rarity] || '#ffffff';
        slot.classList.add('has-skill', 'affix-skill-slot');
        // 有附魔的技能加光晕（匹配稀有度）
        if (affixSkill.enchantmentIds.length > 0) {
          slot.classList.add('enchanted-glow');
          slot.style.setProperty('--enchant-color', rarityColor);
        }
        slot.dataset.dragType = 'skill-key';
        slot.dataset.boundSkill = skillId;
        slot.dataset.rarity = String(affixSkill.rarity);
        const skData = state.player.skills.get(skillId);
        slot.dataset.sellPrice = String(Math.floor((skData?.purchasePrice || 15) / 2));
        // Story 40.5: 形状数据供拖拽系统读取
        if (affixSkill.shapeId && affixSkill.shapeId !== 'monomino') {
          slot.dataset.shapeId = affixSkill.shapeId;
          slot.dataset.rotation = String(affixSkill.rotation ?? 0);
          const preview = renderShapePreview(affixSkill.shapeId, affixSkill.rotation ?? 0, affixSkill.rarity);
          if (preview) slot.dataset.shapePreview = preview;
        }
        applySkillBorderColor(slot, affixSkill);
        slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span><span class="key-skill">${affixSkill.icon}</span>${score > 0 ? `<span class="key-score">${score}</span>` : ''}${freq > 0 ? `<span class="key-freq">${freq}</span>` : ''}`;
      } else {
        slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span>${score > 0 ? `<span class="key-score">${score}</span>` : ''}${freq > 0 ? `<span class="key-freq">${freq}</span>` : ''}`;
      }

      // Tooltip 悬停 + 范围预览（仅有额外信息时显示，否则只靠格子上的字频数字）
      slot.addEventListener('mouseenter', (e: MouseEvent) => {
        hideAllTooltips();
        const hasSkill = !!(skillId && state.affixSkills.has(skillId));
        const hasWordEffect = score > 0;
        if (!hasSkill && !hasWordEffect) return; // 无额外信息，不弹 tooltip

        const freq = letterFreqs.get(k) ?? 0;
        const tooltipData: KeyTooltipData = {
          letter: k,
          score,
          frequency: freq,
        };
        // 词条制技能 tooltip（Story 35.11 AC2/AC8）
        // Story 40.11 CR: 收集所有占据键一次，复用于 estimate + Void 高亮
        const skillAllKeys: string[] = [];
        if (skillId) {
          for (const [bk, sid] of state.player.bindings) {
            if (sid === skillId) skillAllKeys.push(bk);
          }
        }
        if (hasSkill) {
          const affixSkill = state.affixSkills.get(skillId)!;
          const rt = state.affixSkillStates.get(skillId);
          const baseVal = getEffectiveBaseValue(affixSkill.baseValues, affixSkill.level);
          const resIcon = RESOURCE_ICONS[affixSkill.resource] || '';
          const resName = t('resource.' + affixSkill.resource) || RESOURCE_NAMES[affixSkill.resource] || affixSkill.resource;
          const kbHasMultOp = affixSkill.enchantmentIds.includes(EnchantmentTypeEnum.MultiplyOperator as string);
          const kbMultOpBase = kbHasMultOp
            ? (MULTIPLY_OPERATOR_BASE_VALUES[affixSkill.resource]?.[affixSkill.level - 1] ?? baseVal)
            : null;
          tooltipData.skill = {
            name: affixSkill.name,
            icon: affixSkill.icon,
            description: kbHasMultOp ? `${resIcon}${resName}×${kbMultOpBase}` : `${resIcon}${resName}+${baseVal}`,
            level: affixSkill.level,
            school: rarityLabel(affixSkill.rarity),
            schoolCssClass: `rarity-${affixSkill.rarity}`,
          };
          const estimate = computeSmartEstimate(affixSkill, rt, skillAllKeys.length > 0 ? skillAllKeys : undefined);
          const fields = buildAffixTooltipFields(affixSkill, rt);
          tooltipData.skill.affixInfo = fields.affixInfo;
          tooltipData.skill.enchantments = fields.enchantments;
          tooltipData.skill.questProgress = fields.questProgress;
          tooltipData.skill.apprenticeGrowth = fields.apprenticeGrowth;
          tooltipData.skill.smartEstimate = estimate ?? undefined;
          tooltipData.skill.critChance = computeSkillCritChance(affixSkill);
        }
        highlightSkillRange(k);
        // Void 词条空位高亮（Story 40.11 CR: 复用 skillAllKeys 避免重复遍历）
        if (skillId && skillAllKeys.length > 0) {
          const affixSk = state.affixSkills.get(skillId);
          if (affixSk) {
            for (const affix of affixSk.affixes) {
              if (affix.type === 'void' && affix.posRel) {
                const related = getExtendedNeighbors(skillAllKeys, affix.posRel);
                related.forEach(rk => {
                  if (!state.player.bindings.has(rk)) {
                    document.querySelector(`.key-slot[data-key="${rk}"]`)?.classList.add('void-range-empty');
                  }
                });
              }
            }
          }
        }
        const avoidRect = getRangeHighlightRect(slot);
        keyTooltip.show(e.clientX, e.clientY, tooltipData, avoidRect ?? undefined, false);
        // 交叉高亮：键盘→备战席
        if (skillId) {
          document.querySelector(`.inventory-skill[data-skill-id="${skillId}"]`)?.classList.add('cross-highlight');
        }
      });
      slot.addEventListener('mouseleave', () => {
        keyTooltip.hide();
        clearRangeHighlight();
        // Story 34.6 AC7: 清除虚无范围高亮
        document.querySelectorAll('.key-slot.void-range-empty').forEach(el => el.classList.remove('void-range-empty'));
        document.querySelectorAll('.inventory-skill.cross-highlight').forEach(el => el.classList.remove('cross-highlight'));
      });

      // Story 40.6: 右键旋转已装备的多格技能
      const affixSkillForRotation = skillId ? state.affixSkills.get(skillId) : undefined;
      if (skillId && affixSkillForRotation && affixSkillForRotation.shapeId && affixSkillForRotation.shapeId !== 'monomino') {
        slot.addEventListener('contextmenu', (e: MouseEvent) => {
          e.preventDefault();
          handleKeySlotRotation(k, e.shiftKey);
        });
      }

      rowDiv.appendChild(slot);
    });

    el.boundGrid.appendChild(rowDiv);
  });

  // 备战席容量显示（替代原"已拥有技能"标题）
  el.ownedSkills.innerHTML = '';
  const invUsed = getInventoryUsed();
  const invCap = getInventoryCapacity();
  const invLabelEl = el.ownedSkills.parentElement?.querySelector('.inventory-label');
  if (invLabelEl) {
    invLabelEl.textContent = `${t('shop.inventory_label')} ${invUsed}/${invCap}`;
    (invLabelEl as HTMLElement).style.color = invUsed >= invCap ? '#ff6b6b' : '';
  }
  if (state.player.skills.size === 0) {
    el.ownedSkills.innerHTML = `<div style="color:#444;font-size:11px;">${t('shop.buy_skills_hint')}</div>`;
    registerShopDropZones();
    return;
  }

  const boundSkillIds = new Set(state.player.bindings.values());
  state.player.skills.forEach((data, skillId) => {
    const affixSkill = state.affixSkills.get(skillId);
    if (!affixSkill) return;

    // 仅显示未装备技能
    if (boundSkillIds.has(skillId)) return;

    const boundKey: string | undefined = undefined;
    const item = document.createElement('div');
    item.className = 'inventory-skill';
    item.dataset.dragType = 'skill-inventory';
    item.dataset.skillId = skillId;
    item.dataset.sellPrice = String(Math.floor((data.purchasePrice || 15) / 2));
    item.dataset.rarity = String(affixSkill.rarity);
    // Story 40.5: 形状数据供拖拽系统读取
    if (affixSkill.shapeId && affixSkill.shapeId !== 'monomino') {
      item.dataset.shapeId = affixSkill.shapeId;
      item.dataset.rotation = String(affixSkill.rotation ?? 0);
      const preview = renderShapePreview(affixSkill.shapeId, affixSkill.rotation ?? 0, affixSkill.rarity);
      if (preview) item.dataset.shapePreview = preview;
    }
    if (boundKey) item.classList.add('bound');

    {
      // 词条制技能渲染
      const rarityColor = RARITY_COLORS[affixSkill.rarity] || '#ffffff';
      const rLabel = rarityLabel(affixSkill.rarity);
      const affixNames = affixSkill.affixes.map(a => t('affix.' + a.type)).join('·');
      item.style.borderColor = rarityColor;
      item.innerHTML = `
        <span class="inv-icon">${affixSkill.icon}</span>
        <span class="inv-name">${affixSkill.name}</span>
        <span class="inv-school" style="color:${rarityColor}">${rLabel}</span>
        ${data.level > 1 ? `<span class="inv-level">Lv.${data.level}</span>` : ''}
        ${affixNames ? `<span class="inv-affixes" style="color:#888;font-size:10px;">${affixNames}</span>` : ''}
        ${boundKey ? `<span class="inv-key">[${boundKey.toUpperCase()}]</span>` : ''}
      `;

      // 词条制技能悬停预览
      item.addEventListener('mouseenter', (e) => {
        hideAllTooltips();
        const rt = state.affixSkillStates.get(skillId);
        const baseVal = getEffectiveBaseValue(affixSkill.baseValues, affixSkill.level);
        const resIcon = RESOURCE_ICONS[affixSkill.resource] || '';
        const resName = t('resource.' + affixSkill.resource) || RESOURCE_NAMES[affixSkill.resource] || affixSkill.resource;
        const invHasMultOp = affixSkill.enchantmentIds.includes(EnchantmentTypeEnum.MultiplyOperator as string);
        const invMultOpBase = invHasMultOp
          ? (MULTIPLY_OPERATOR_BASE_VALUES[affixSkill.resource]?.[affixSkill.level - 1] ?? baseVal)
          : null;
        const tooltipData: KeyTooltipData = {
          skill: {
            name: affixSkill.name,
            icon: affixSkill.icon,
            description: invHasMultOp ? `${resIcon}${resName}×${invMultOpBase}` : `${resIcon}${resName}+${baseVal}`,
            level: affixSkill.level,
            school: rLabel,
            schoolCssClass: `rarity-${affixSkill.rarity}`,
          },
        };
        const invAllKeys: string[] = [];
        for (const [bk, sid] of state.player.bindings) {
          if (sid === skillId) invAllKeys.push(bk);
        }
        // 备战席未绑定时不做预估，显示完整词条详情
        const estimate = invAllKeys.length > 0 ? computeSmartEstimate(affixSkill, rt, invAllKeys) : null;
        const fields = buildAffixTooltipFields(affixSkill, rt);
        tooltipData.skill!.affixInfo = fields.affixInfo;
        tooltipData.skill!.enchantments = fields.enchantments;
        tooltipData.skill!.questProgress = fields.questProgress;
        tooltipData.skill!.apprenticeGrowth = fields.apprenticeGrowth;
        tooltipData.skill!.smartEstimate = estimate ?? undefined;
        tooltipData.skill!.critChance = computeSkillCritChance(affixSkill);
        if (boundKey) {
          tooltipData.letter = boundKey.toUpperCase();
          highlightSkillRange(boundKey);
        }
        keyTooltip.show(e.clientX, e.clientY, tooltipData);
        // 交叉高亮：备战席→键盘
        document.querySelectorAll(`.key-slot[data-bound-skill="${skillId}"]`).forEach(el => el.classList.add('cross-highlight'));
      });
      item.addEventListener('mouseleave', () => {
        keyTooltip.hide();
        clearRangeHighlight();
        document.querySelectorAll('.key-slot.cross-highlight').forEach(el => el.classList.remove('cross-highlight'));
      });
    }

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
    if (freq < FREQ_UNLOCK_THRESHOLD) block.classList.add('freq-low');
    else if (freq >= 10) block.classList.add('freq-high');
    else block.classList.add('freq-mid');
    block.dataset.letter = letter;
    block.innerHTML = `<span class="freq-char">${letter.toUpperCase()}</span><span class="freq-num">${freq}</span>`;
    freqContainer.appendChild(block);
  }
  el.ownedWords.parentElement!.insertBefore(freqContainer, el.ownedWords);

  // 已解锁字母集合（频率 >= 阈值）
  const unlockedLetters = new Set<string>()
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(97 + i)
    if ((freqs.get(letter) ?? 0) >= FREQ_UNLOCK_THRESHOLD) unlockedLetters.add(letter)
  }

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
      state.player.bindings.has(c.toLowerCase()) ? `<span class="bound-letter">${c}</span>` : c
    ).join('');

    item.appendChild(wordSpan);

    // 显示词语效果标签
    const effect = state.wordEffects.get(word);
    if (effect) {
      const effectSpan = document.createElement('span');
      effectSpan.className = 'word-effect-tag';
      effectSpan.style.cssText = 'font-size:10px;margin-left:4px;opacity:0.85;';
      effectSpan.textContent = formatWordEffectLabel(effect);
      item.appendChild(effectSpan);
    }

    // 悬停时高亮键盘上对应字母的键位
    item.addEventListener('mouseenter', () => {
      const letters = new Set(word.toLowerCase().split('').filter(c => c >= 'a' && c <= 'z'))
      for (const letter of letters) {
        document.querySelector(`.key-slot[data-key="${letter}"]`)?.classList.add('word-hover-highlight')
      }
    })
    item.addEventListener('mouseleave', () => {
      document.querySelectorAll('.key-slot.word-hover-highlight').forEach(el => el.classList.remove('word-hover-highlight'))
    })

    el.ownedWords.appendChild(item);
  });
}

const MIN_WORD_COUNT = 3;

function removeWord(index: number): void {
  if (index < 0 || index >= state.player.wordDeck.length) return;
  if (state.player.wordDeck.length <= MIN_WORD_COUNT) {
    // showFeedback(t('shop.min_words', { count: MIN_WORD_COUNT }), '#ff6b6b');
    return;
  }
  const word = state.player.wordDeck[index];
  state.gold += 3;
  state.player.wordDeck.splice(index, 1);
  invalidateBigramCache();
  // 移除词语效果
  state.wordEffects.delete(word);
  updateGoldDisplay();
  // showFeedback(t('shop.sell_word_feedback', { word }), '#ffe66d');
  // Story 36.7: 词语经销商 — 卖词后下次刷新免费
  if (setWordDealerFlag()) {
    // showFeedback('🤑 下次刷新免费', '#88ddff');
  }
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
    if (current >= FREQ_UNLOCK_THRESHOLD && current - count < FREQ_UNLOCK_THRESHOLD) {
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
      // Story 40.5: 形状放置预览
      onDragEnter: (payload: DragPayload) => {
        highlightShapePlacement(key, payload);
      },
      onDragLeave: (_payload: DragPayload) => {
        clearShapePlacement();
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
        if (!skillId) return;
        unbindSkill(getBindingState(state), skillId);
        evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
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

// === Story 40.5: 形状放置高亮系统 ===
export function highlightShapePlacement(anchorKey: string, payload: DragPayload): void {
  const shapeId = payload.shapeId ?? 'monomino';
  const rotation = payload.rotation ?? 0;

  // monomino 或无形状：仅高亮单键（沿用原有逻辑）
  if (!shapeId || shapeId === 'monomino') return;

  clearShapePlacement();

  // 验证 anchorKey 合法性（防止 CSS selector 注入）
  const normalizedKey = anchorKey.toLowerCase();
  if (!KEYS.includes(normalizedKey)) return;

  const allowPunctHL = state.player.relics.has('punctuation_liberation');
  const targetKeys = mapShapeToKeys(normalizedKey, shapeId, rotation, allowPunctHL);

  if (!targetKeys) {
    // 放不下：红色高亮悬停键
    const slot = document.querySelector(`.key-slot[data-key="${normalizedKey}"]`);
    if (slot) slot.classList.add('shape-preview-invalid');
    return;
  }

  // 可放置：绿色高亮所有目标键位
  const dragSkillId = payload.skillId;
  for (const key of targetKeys) {
    const slot = document.querySelector(`.key-slot[data-key="${key}"]`);
    if (!slot) continue;
    slot.classList.add('shape-preview-valid');
    // 检查被覆盖技能
    const existing = state.player.bindings.get(key);
    if (existing && existing !== dragSkillId) {
      slot.classList.add('shape-preview-displaced');
    }
  }
}

export function clearShapePlacement(): void {
  document.querySelectorAll('.shape-preview-valid, .shape-preview-invalid, .shape-preview-displaced').forEach(el => {
    el.classList.remove('shape-preview-valid', 'shape-preview-invalid', 'shape-preview-displaced');
  });
}

// === Story 40.6: 右键旋转已装备技能 ===
// 右键 = 顺时针，Shift+右键 = 逆时针
// 若目标旋转态放不下，自动尝试下一个有效旋转态
function handleKeySlotRotation(key: string, reverse = false): void {
  const bs = getBindingState(state);
  const skillId = state.player.bindings.get(key);
  if (!skillId) return;

  const affixSkill = state.affixSkills.get(skillId);
  if (!affixSkill) return;

  const shapeId = affixSkill.shapeId ?? 'monomino';
  if (shapeId === 'monomino') return;

  const anchorKey = getSkillAnchorKey(bs, skillId);
  if (!anchorKey) return;

  const currentRotation = affixSkill.rotation ?? 0;
  const maxRot = getShapeRotationCount(shapeId);
  const step = reverse ? maxRot - 1 : 1; // +(maxRot-1) mod maxRot = -1

  // 尝试所有其他旋转态，找到第一个能放下的
  const allowPunctRot = state.player.relics.has('punctuation_liberation');
  let nextRotation = -1;
  let targetKeys: string[] | null = null;
  for (let attempt = 1; attempt < maxRot; attempt++) {
    const candidate = (currentRotation + step * attempt) % maxRot;
    targetKeys = mapShapeToKeys(anchorKey, shapeId, candidate, allowPunctRot);
    if (targetKeys) {
      nextRotation = candidate;
      break;
    }
  }

  if (nextRotation === -1 || !targetKeys) {
    // 所有旋转态都放不下
    playSound('wrong');
    // showFeedback(t('shop.rotate_fail'), '#ff6b6b');
    const skillKeys = [...state.player.bindings.entries()].filter(([, id]) => id === skillId).map(([k]) => k);
    for (const sk of skillKeys) {
      if (!KEYS.includes(sk)) continue;
      const slotEl = document.querySelector(`.key-slot[data-key="${sk}"]`);
      if (slotEl) {
        slotEl.classList.add('shape-shake');
        slotEl.addEventListener('animationend', () => slotEl.classList.remove('shape-shake'), { once: true });
      }
    }
    return;
  }

  // 旋转成功：解绑 → 更新旋转 → 重新绑定
  unbindSkill(bs, skillId);
  affixSkill.rotation = nextRotation;
  const result = bindShapeToKeys(bs, skillId, anchorKey, allowPunctRot);

  if (!result.success) {
    // 防御性回退：恢复旧 rotation 并重新绑定
    affixSkill.rotation = currentRotation;
    bindShapeToKeys(bs, skillId, anchorKey, allowPunctRot);
    playSound('wrong');
    // showFeedback(t('shop.rotate_fail'), '#ff6b6b');
    return;
  }

  if (result.displacedSkillIds.length > 0) {
    // showFeedback(t('shop.rotate_displaced'), '#ffaa00');
  }

  evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
  renderBuildManager();

  // 旋转成功动画：对新绑定键位施加缩放动画
  const newKeys = [...state.player.bindings.entries()].filter(([, id]) => id === skillId).map(([k]) => k);
  for (const nk of newKeys) {
    if (!KEYS.includes(nk)) continue;
    const slotEl = document.querySelector(`.key-slot[data-key="${nk}"]`);
    if (slotEl) {
      slotEl.classList.add('shape-rotating');
      slotEl.addEventListener('animationend', () => slotEl.classList.remove('shape-rotating'), { once: true });
    }
  }
}

// === 拖拽到键位处理 ===
function handleDropOnKey(targetKey: string, payload: DragPayload): void {
  // 回归基本功：禁止装备技能
  if (hasGlassCannon()) {
    // showFeedback(t('shop.no_equip_basic'), '#ff6b6b');
    return;
  }

  const bs = getBindingState(state);
  const allowPunct = state.player.relics.has('punctuation_liberation');

  if (payload.type === 'shop-item') {
    // 从商店拖拽技能到键位 → 购买并绑定
    const index = payload.itemIndex ?? -1;
    const item = state.shop.items[index];
    if (!item || item.type !== 'skill') return;

    const skillId = item.skillId!;

    // 预检形状是否能放下（在扣金币之前）
    const affixSkill = item.affixSkill;
    if (affixSkill) {
      const shapeId = affixSkill.shapeId ?? 'monomino';
      let rotation = affixSkill.rotation ?? 0;
      if (shapeId !== 'monomino') {
        let fitKeys = mapShapeToKeys(targetKey.toLowerCase(), shapeId, rotation, allowPunct);
        // 当前旋转不 fit → 自动尝试其他旋转态
        if (!fitKeys) {
          const rotCount = getShapeRotationCount(shapeId);
          for (let attempt = 1; attempt < rotCount; attempt++) {
            const candidate = (rotation + attempt) % rotCount;
            fitKeys = mapShapeToKeys(targetKey.toLowerCase(), shapeId, candidate, allowPunct);
            if (fitKeys) {
              rotation = candidate;
              affixSkill.rotation = rotation;
              break;
            }
          }
        }
        if (!fitKeys) {
          // showFeedback(t('shop.shape_no_fit'), '#ff6b6b');
          return;
        }
      }
    }

    const result = executePurchase(index);
    if (!result) return;

    // 绑定到目标键位（被覆盖技能自动解绑）
    bindShapeToKeys(bs, skillId, targetKey, allowPunct);

    // Story 41.1: 附魔不再由购买自动触发
    evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
    renderUnifiedShop();
    renderBuildManager();

    // 发送购买事件（引导系统 L1/L2 监听）
    eventBus.emit('shop:purchase', { type: 'skill', itemId: skillId, price: result.cost });
  } else if (payload.type === 'skill-inventory' || payload.type === 'skill-key') {
    // 拖拽已有技能到键位 → 绑定/交换
    const skillId = payload.skillId;
    if (!skillId) return;

    // 拾取旋转：将 payload.rotation 应用到技能
    if (payload.rotation != null) {
      const sk = state.affixSkills.get(skillId);
      if (sk) sk.rotation = payload.rotation;
    }

    const existingSkill = state.player.bindings.get(targetKey);
    const sourceAnchorKey = payload.sourceKey
      ? getSkillAnchorKey(bs, skillId) || payload.sourceKey
      : getSkillAnchorKey(bs, skillId);

    // 交换逻辑：先暂存 → 解绑双方 → 重新绑定
    if (existingSkill && existingSkill !== skillId && sourceAnchorKey) {
      const existingAnchorKey = getSkillAnchorKey(bs, existingSkill);
      // 两个技能互换位置
      unbindSkill(bs, skillId);
      unbindSkill(bs, existingSkill);
      // 尝试绑定到目标键位，失败时自动尝试其他旋转态
      let r1 = bindShapeToKeys(bs, skillId, targetKey, allowPunct);
      if (!r1.success) {
        const affixSkill = state.affixSkills.get(skillId);
        const shapeId = affixSkill?.shapeId ?? 'monomino';
        if (affixSkill && shapeId !== 'monomino') {
          const currentRot = affixSkill.rotation ?? 0;
          const rotCount = getShapeRotationCount(shapeId);
          for (let attempt = 1; attempt < rotCount; attempt++) {
            const candidate = (currentRot + attempt) % rotCount;
            const fitKeys = mapShapeToKeys(targetKey.toLowerCase(), shapeId, candidate, allowPunct);
            if (fitKeys) {
              affixSkill.rotation = candidate;
              r1 = bindShapeToKeys(bs, skillId, targetKey, allowPunct);
              if (r1.success) break;
            }
          }
        }
      }
      if (!r1.success) {
        // 放不下：恢复双方原始绑定
        if (sourceAnchorKey) bindShapeToKeys(bs, skillId, sourceAnchorKey, allowPunct);
        if (existingAnchorKey) bindShapeToKeys(bs, existingSkill, existingAnchorKey, allowPunct);
        // showFeedback(t('shop.shape_no_fit'), '#ff6b6b');
      } else {
        // 记录 r1 可能覆盖的第三方技能及其锚点（用于回退恢复）
        const displacedAnchors = new Map<string, string>();
        for (const dId of r1.displacedSkillIds) {
          if (dId !== existingSkill) {
            const dAnchor = getSkillAnchorKey(bs, dId);
            if (dAnchor) displacedAnchors.set(dId, dAnchor);
          }
        }
        const r2 = existingAnchorKey ? bindShapeToKeys(bs, existingSkill, sourceAnchorKey, allowPunct) : { success: false, displacedSkillIds: [] };
        if (!r2.success && existingAnchorKey) {
          // 对方放不回去：回退全部
          unbindSkill(bs, skillId);
          if (sourceAnchorKey) bindShapeToKeys(bs, skillId, sourceAnchorKey, allowPunct);
          if (existingAnchorKey) bindShapeToKeys(bs, existingSkill, existingAnchorKey, allowPunct);
          // 恢复被覆盖的第三方技能
          for (const [dId, dAnchor] of displacedAnchors) {
            bindShapeToKeys(bs, dId, dAnchor, allowPunct);
          }
          // showFeedback(t('shop.shape_no_fit'), '#ff6b6b');
        }
      }
    } else {
      // 绑定到目标键位（被覆盖技能自动解绑）
      let r = bindShapeToKeys(bs, skillId, targetKey, allowPunct);
      // 当前旋转放不下 → 自动尝试其他旋转态
      if (!r.success) {
        const affixSkill = state.affixSkills.get(skillId);
        const shapeId = affixSkill?.shapeId ?? 'monomino';
        if (affixSkill && shapeId !== 'monomino') {
          const currentRot = affixSkill.rotation ?? 0;
          const rotCount = getShapeRotationCount(shapeId);
          for (let attempt = 1; attempt < rotCount; attempt++) {
            const candidate = (currentRot + attempt) % rotCount;
            const fitKeys = mapShapeToKeys(targetKey.toLowerCase(), shapeId, candidate, allowPunct);
            if (fitKeys) {
              affixSkill.rotation = candidate;
              r = bindShapeToKeys(bs, skillId, targetKey, allowPunct);
              if (r.success) break;
            }
          }
        }
      }
      if (!r.success) {
        // showFeedback(t('shop.shape_no_fit'), '#ff6b6b');
      }
    }

    evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
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
  const resources = getActiveResources(state.classId);
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
  const heatmapHasPunctRelic = state.player.relics.has('punctuation_liberation');
  KEYBOARD_ROWS.forEach((row, ri) => {
    const heatExtKeys = heatmapHasPunctRelic ? (PUNCTUATION_KEYBOARD_EXTENSION[ri] || []) : [];
    const heatRow = [...row, ...heatExtKeys];
    html += '<div class="heatmap-row">';
    heatRow.forEach(k => {
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
      playSound('tab');
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
  const tooltipResources = getActiveResources(state.classId);
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
const RELIC_RARITY_COLORS: Record<string, string> = { common: '#aaa', rare: '#4488cc', epic: '#9b59b6', legendary: '#ffd700' };
function getRarityLabel(rarity: string): string {
  return t(`shop.rarity.${rarity}`);
}

// Story 60.9: export 给 workbench tooltip 复用（仅 export 关键字改动，0 行为变化）
export function showRelicTooltip(e: MouseEvent, relic: import('../data/relics').RelicData): void {
  hideAllTooltips();
  const tip = document.createElement('div');
  tip.id = 'relic-tooltip';
  tip.className = 'key-tooltip';
  const rarityColor = RELIC_RARITY_COLORS[relic.rarity] || '#aaa';
  let descText = localizeItemDesc(relic.id, relic.description);
  tip.innerHTML =
    `<div style="font-size:12px;font-weight:bold;color:#fff;margin-bottom:4px;">${relic.icon} ${localizeItemName(relic.id, relic.name)}</div>` +
    `<div style="font-size:10px;padding:1px 4px;border-radius:0;display:inline-block;margin-bottom:4px;background:rgba(255,255,255,0.08);color:${rarityColor};">${getRarityLabel(relic.rarity)}</div>` +
    `<div style="color:#aaa;font-size:11px;white-space:normal;">${descText}</div>` +
    ((): string => { const f = localizeItemFlavor(relic.id, relic.flavor); return f ? `<div style="color:#666;font-size:10px;font-style:italic;margin-top:4px;">${f}</div>` : ''; })();
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

export function moveRelicTooltip(e: MouseEvent): void {
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

export function hideRelicTooltip(): void {
  document.getElementById('relic-tooltip')?.remove();
}

// === 统计面板 Tab 切换 ===
/** 购买词包后刷新造词台碎片库存（仅当造词台 tab 可见时） */
function refreshCraftPanelIfVisible(): void {
  const craftPanel = document.getElementById('craft-panel');
  if (craftPanel && craftPanel.style.display !== 'none') {
    renderCraftPanel(craftPanel, updateGoldDisplay);
  }
}

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
    playSound('tab');
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

  // 造词师：显示造词台 tab（牌包系统保留，购买获得碎片）
  if (state.classId === 'wordsmith') {
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

  switchTab('build');
  buildTab.onclick = () => switchTab('build');
  statsTab.onclick = () => switchTab('stats');
  wordsTab.onclick = () => switchTab('words');
  if (craftTab) craftTab.onclick = () => { if (state.classId === 'wordsmith') switchTab('craft'); };
  if (metamorphTab) metamorphTab.onclick = () => { if (state.classId === 'metamorph') switchTab('metamorph'); };
}

// === 初始化商店事件 ===
export function initShopEvents(): void {
  const el = getElements();
  el.startBattleBtn.onclick = () => {
    dragManager.destroy();
    // Story 36.9: 限时拍卖 — 离开商店时清理倒计时
    _auctionRemaining = -1;
    clearAuctionTimer();
    // 无限循环：直接进入下一关
    state.level = getNextBattleNode(state.level);
    void startLevel();
  };
}
