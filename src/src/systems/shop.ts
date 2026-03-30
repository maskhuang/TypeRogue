// ============================================
// 打字肉鸽 - 商店系统（统一5商品）
// ============================================
// Epic 17: 统一商店 + 刷新/锁定/卖出 + 拖拽交互

import { state, isRelicSlotsFull, addRelicWithCapacity } from '../core/state';
import { resolveRelicEffects, resolveRelicEffectsWithBehaviors, queryRelicFlag } from './relics/RelicPipeline';
import { KEYS, KEYBOARD_ROWS, RESOURCE_LABELS, RESOURCE_ICONS, RESOURCE_COLORS, PUNCTUATION_KEYS, PUNCTUATION_KEYBOARD_EXTENSION } from '../core/constants';
import { getKeysWithRelation, PositionRelation } from '../data/keyboardTopology';
import { getExtendedNeighbors } from '../data/affixTrigger';

// === 位置关系标签（通过 t('rel.' + posRel) 获取） ===
import { calculateDeckStats } from '../data/words';
import { generateWordPacks, getConditionMeta } from '../data/wordPacks';
import { getElements } from '../ui/elements';
import { playSound } from '../effects/sound';
import { juiceUp, calculateRating, getRatingTier } from '../effects/juice';
import { showScreen, startLevel, renderRelicDisplay, showFeedback } from './battle';
import type { ShopItem, ResourceType, PackConditionType } from '../core/types';
import { getNextBattleNode, isSecondHalf, getPositionInCycle } from './stage/stageFlow';
import { calculateLetterFrequency, letterFrequencyToScore } from './letters/LetterFrequencySystem';
import { RELICS, MAX_RELIC_SLOTS } from '../data/relics';
import type { RelicWeights } from './relicPicker';
import { generateRelicCandidates, showRelicReplaceUI } from './relicPicker';
import { autoSelectRowMedal, getRowMedalRowName } from './relics/TopologyRelicBehaviors';
import { setWordDealerFlag, consumeWordDealerFreeRefresh } from './relics/WordRelicBehaviors';
import { checkUniversalFurnace } from './relics/ResourceRelicBehaviors';
import { checkEliteHunterGoldMultiplier } from './relics/StageRelicBehaviors';
import { getBountyHunterDiscount } from './relics/BossModifierRelicBehaviors';
import { getSRankTrophyGold, consumeDeadlyGiftFreeRefresh } from './relics/ScoringRelicBehaviors';
import { getDiscountMultiplier, getRecycleSellMultiplier, getBlackMarketExtraSlots, canSmuggleFree, consumeSmuggleFree, isTimedAuction, startAuctionTimer, clearAuctionTimer, resetShopRelicState } from './relics/ShopRelicBehaviors';
import { hasIntermissionFreeRefresh, consumeIntermissionFreeRefresh } from './relics/StageRelicBehaviors';
import { keyTooltip, AFFIX_COLORS } from '../ui/keyboard/KeyTooltip';
import type { KeyTooltipData } from '../ui/keyboard/KeyTooltip';
import { random } from '../core/seededRandom';
import { dragManager } from './dragManager';
import { CLASS_DEFINITIONS } from '../data/classes';
import { isFeatureEnabled, getFeatureLostReason } from './classes/ClassFeatureGate';
import { renderCraftPanel, resetCraftInput } from './classes/CraftingStation';
import { renderMetamorphPanel } from './classes/MetamorphStation';
import { eventBus } from '../core/events/EventBus';
import type { DragPayload } from './dragManager';
import { IS_DEMO } from '../demo/demo-config';
import { t, getLocale, localizeItemName, localizeItemDesc } from '../demo/demo-i18n';
import { generateSkill } from '../data/skillGeneration';
import { createSkillRuntimeState, RARITY_COLORS, RARITY_NAMES, AFFIX_CATEGORY_MAP, RESOURCE_NAMES } from '../data/affixes';
import type { SkillRarity, AffixType } from '../data/affixes';
import { getEnchantmentSlotCount, filterEnchantmentCandidates, getTransmuteEligibleResources, isApprenticeEnchantment, resolvePhase1, countEmptySlots, categorizeEnchantmentCandidates, weightedPickEnchantment, getAscendThreshold } from '../data/affixTrigger';
import { filterEnchantmentsByClass, filterCategorizedByClass, QUEST_ENCHANTMENT_DEFS, ENCHANTMENT_META, TRANSMUTE_RATIO_TABLE, MULTIPLY_OPERATOR_BASE_VALUES, EnchantmentType as EnchantmentTypeEnum, APPRENTICE_NEIGHBOR_GROWTH, applyAffixLevelScaling, previewAffixScaledValue } from '../data/affixes';
import type { EnchantmentType } from '../data/affixes';
import type { CategorizedEnchantments } from '../data/affixTrigger';
import { getMonoAffixCategory } from './relics/RelicPipeline';
import { applyRitualEnchantment, generateRitualCandidates, pickRitualChoices, getEligibleSkills as getRitualEligibleSkills } from './ritualEnchantment';
import type { RitualCandidate } from './ritualEnchantment';
import { applyTrainingManual } from './relics/SkillRelicBehaviors';
import { getAscendBaseScale } from '../data/affixTrigger';
import { getEnchantmentChoiceCount, getEnchantAnchorSlotBonus, getEnchantAnchorPriceMultiplier, getMinEnchantmentLevel } from './relics/EnchantmentRelicBehaviors';
import { bindShapeToKeys, unbindSkill, unbindKey, autoBindSkill, getBindingState, getSkillAnchorKey } from './bindingManager';
import { getShapeCells, mapShapeToKeys } from '../data/skillShapes';

// === 零频键位缓存（供自动绑定使用） ===
let cachedLetterFreqs: Map<string, number> | null = null;

// === 限时拍卖倒计时显示值（模块级，供 renderUnifiedShop 重建 UI） ===
let _auctionRemaining: number = -1;

// === 词条制技能定价（Story 35.9） ===

/** 词条制技能按稀有度基础定价（0/1/2/3 词条 → 25/50/75/100） */
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
function getAvailableResources(classId: string): ResourceType[] {
  const all: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold'];
  if (classId === 'wordsmith') all.push('fragment');
  if (classId === 'metamorph') all.push('mutagen');
  return all;
}

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

/** 收集玩家已装备技能拥有的所有词条类型（去重，排除 link/splash 自身） */
function collectPlayerAffixTypes(): AffixType[] {
  const types = new Set<AffixType>();
  for (const [, skillId] of state.player.bindings) {
    const affix = state.affixSkills.get(skillId);
    if (!affix) continue;
    for (const a of affix.affixes) {
      if (a.type !== 'link' && a.type !== 'splash') {
        types.add(a.type as AffixType);
      }
    }
  }
  return [...types];
}

/** 收集玩家已装备 Link/Splash 技能监听的词条类型（去重） */
function collectPlayerWatchedAffixTypes(): Set<AffixType> {
  const watched = new Set<AffixType>();
  for (const [, skillId] of state.player.bindings) {
    const skill = state.affixSkills.get(skillId);
    if (!skill) continue;
    for (const a of skill.affixes) {
      if ((a.type === 'link' || a.type === 'splash') && a.watchAffix) {
        watched.add(a.watchAffix as AffixType);
      }
    }
  }
  return watched;
}

/** 生成单个词条制技能商品（避免与已有技能重名） */
export function generateAffixShopItem(
  itemId: number,
  options?: { rarity?: SkillRarity; resource?: ResourceType; maxRarity?: SkillRarity; excludeNames?: Set<string> },
): ShopItem {
  const resourcePool = getAvailableResources(state.classId);
  const resource = options?.resource ?? resourcePool[Math.floor(random() * resourcePool.length)];
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
  let skill = generateSkill({ resource, rarity, availableResources: resourcePool });
  // clamp：如果 rarity 未指定（随机掷骰），超过 actMaxRarity 时重生成
  if (rarity === undefined && skill.rarity > actMaxRarity) {
    skill = generateSkill({ resource, rarity: actMaxRarity, availableResources: resourcePool });
  }
  // 重试：避免与已有技能/本批其他技能重名（最多 10 次）
  if (excludeNames && excludeNames.has(skill.name)) {
    for (let attempt = 0; attempt < 10; attempt++) {
      skill = generateSkill({ resource: resourcePool[Math.floor(random() * resourcePool.length)], rarity: skill.rarity as SkillRarity, availableResources: resourcePool });
      if (rarity === undefined && skill.rarity > actMaxRarity) {
        skill = generateSkill({ resource: skill.resource, rarity: actMaxRarity, availableResources: resourcePool });
      }
      if (!excludeNames.has(skill.name)) break;
    }
  }
  if (lockedCategory && skill.rarity > 0) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const hasMatch = skill.affixes.some(
        a => AFFIX_CATEGORY_MAP[a.type as keyof typeof AFFIX_CATEGORY_MAP] === lockedCategory,
      );
      if (hasMatch) break;
      skill = generateSkill({ resource, rarity: skill.rarity as SkillRarity, availableResources: resourcePool });
    }
  }
  // === Link/Splash watchAffix 偏向：50% 概率引用玩家已有词条类型 ===
  if (skill.rarity > 0) {
    const playerAffixTypes = collectPlayerAffixTypes();
    if (playerAffixTypes.length > 0) {
      for (const affix of skill.affixes) {
        if ((affix.type === 'link' || affix.type === 'splash') && affix.watchAffix && random() < 0.5) {
          affix.watchAffix = playerAffixTypes[Math.floor(random() * playerAffixTypes.length)];
        }
      }
    }
  }
  // === 反向吸引：玩家已装备感应/溅射监听的词条类型，商店更易刷出含该词条的技能 ===
  if (skill.rarity > 0) {
    const watched = collectPlayerWatchedAffixTypes();
    if (watched.size > 0) {
      const hasWatched = skill.affixes.some(a => watched.has(a.type as AffixType));
      if (!hasWatched && random() < 0.5) {
        // 50% 概率重试 1 次，尝试生成含被监听词条的技能
        const candidate = generateSkill({ resource: skill.resource, rarity: skill.rarity as SkillRarity, availableResources: resourcePool });
        if (candidate.affixes.some(a => watched.has(a.type as AffixType))) {
          skill = candidate;
        }
      }
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

  // 保底第 1 件：rarity≥1（蓝装以上），但不超过 Act 上限
  const guaranteedRarity = Math.min(1, actMaxRarity) as SkillRarity;
  let guaranteed: ShopItem;
  if (guaranteedRarity >= 1) {
    for (let attempt = 0; attempt < 10; attempt++) {
      guaranteed = generateAffixShopItem(nextId++, { maxRarity: actMaxRarity, excludeNames });
      if (guaranteed.affixSkill!.rarity >= 1) break;
    }
    // 如果 10 次都没 ≥1，强制 rarity=1
    if (!guaranteed! || guaranteed!.affixSkill!.rarity < 1) {
      guaranteed = generateAffixShopItem(nextId++, { rarity: 1 as SkillRarity, maxRarity: actMaxRarity, excludeNames });
    }
  } else {
    // Act1 允许的最大 rarity=0 时，无法保底蓝装
    guaranteed = generateAffixShopItem(nextId++, { maxRarity: actMaxRarity, excludeNames });
  }
  excludeNames.add(guaranteed!.affixSkill!.name);
  items.push(guaranteed!);

  // 剩余随机
  for (let i = 1; i < count; i++) {
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

/** 获取技能在指定等级的有效基础值（支持升华 Lv4+） */
function getEffectiveBaseValue(baseValues: [number, number, number], level: number): number {
  if (level <= 3) return baseValues[level - 1] ?? baseValues[0];
  return Math.round(baseValues[2] * getAscendBaseScale(level) * 100) / 100;
}

/** 构建词条制技能的 tooltip 扩展字段 */
export function buildAffixTooltipFields(skill: AffixSkillInstance, rt?: SkillRuntimeState, excludeTypes?: Set<string>): {
  affixInfo: AffixTooltipInfo[]
  enchantments: Array<{ icon: string; name: string; desc: string; color: string }>
  questProgress?: string
  apprenticeGrowth?: string
} {
  const affixInfo: AffixTooltipInfo[] = skill.affixes
    .filter(a => !excludeTypes || !excludeTypes.has(a.type))
    .map(a => {
      let desc = t('affix_desc.' + a.type);
      // Mirror: tooltip 显示当前复制的词条
      if (a.type === 'mirror' && rt) {
        // Story 41-5: 质变模式显示所有复制词条
        if (rt.mirrorCopiedAffixes && rt.mirrorCopiedAffixes.length > 0) {
          const summaries = rt.mirrorCopiedAffixes.map(c => `${t('affix.' + c.type)}: ${buildAffixParamSummary(c)}`);
          desc += ` [${summaries.join(' | ')}]`;
        } else if (rt.mirrorCopiedAffix) {
          const copied = rt.mirrorCopiedAffix;
          desc += ` [${t('affix.' + copied.type)}: ${buildAffixParamSummary(copied)}]`;
        }
      }
      return {
        typeName: t('affix.' + a.type),
        typeKey: a.type,
        paramSummary: buildAffixParamSummary(a),
        description: desc,
      };
    })

  // 附魔列表
  const enchantments: Array<{ icon: string; name: string; desc: string; color: string }> = [];
  for (const enchId of skill.enchantmentIds) {
    const info = getEnchantmentDisplayInfo(enchId as EnchantmentType, skill.transmuteResource, skill.neighborPosRel);
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
        questProgress = t('tooltip.quest_progress', { task: t('quest.' + questEnch.type + '.task'), stacks: rt.questStacks, target: questEnch.targetStacks })
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

/** 构建单个词条的参数摘要 */
function buildAffixParamSummary(a: import('../data/affixes').AffixInstance): string {
  const rel = a.posRel ? t('rel.' + a.posRel) : '';
  switch (a.type) {
    case 'convert': return t('param.convert_to_self', { icon: RESOURCE_ICONS[a.source!] || '', name: t('resource.' + a.source!), k: a.k?.toFixed(3) ?? '?' })
    case 'charge': return t('param.charge', { gain: Math.round((a.gainPerSec ?? 0) * 100), max: Math.round((a.maxBonus ?? 0) * 100) })
    case 'decay': return t('param.decay', { init: a.initialMult ?? '?', decay: a.decayPerTrigger ?? '?', floor: a.floor ?? '?' })
    case 'pulse': return t('param.pulse', { interval: a.interval ?? '?', mult: a.burstMult?.toFixed(1) ?? '?' })
    case 'crit': return t('param.crit', { chance: Math.round((a.chance ?? 0) * 100), mult: a.critMult?.toFixed(1) ?? '?' })
    case 'void': return t('param.void', { rel, pct: Math.round((a.bonusPerSlot ?? 0) * 100) })
    case 'resonance': return t('param.resonance', { rel, icon: RESOURCE_ICONS[a.resource!] || '', name: t('resource.' + a.resource!) })
    case 'amplify': return t('param.amplify', { rel, icon: RESOURCE_ICONS[a.resource!] || '', name: t('resource.' + a.resource!), pct: Math.round((a.valuePerStack ?? 0) * 100) })
    case 'cascade': return `${rel || t('param.cascade_fallback')} ×${a.cascadeMult?.toFixed(1) ?? '?'}`
    case 'outcast': return t('param.outcast', { pct: Math.round((a.bonusPercent ?? 0) * 100) })
    case 'gravity': return t('param.gravity', { mult: a.probMult?.toFixed(1) ?? '?' })
    case 'recurse': return t('param.recurse', { pct: Math.round((a.recurseChance ?? 0) * 100) })
    case 'taboo': return t('param.taboo', { pct: Math.round((a.penaltyChance ?? 0) * 100) })
    case 'rainbow': return t('param.rainbow')
    case 'mirror': return t('param.mirror', { rel })
    case 'link': return t('param.link', { rel, affix: t('affix.' + a.watchAffix!) })
    case 'splash': {
      if (a.resource) return t('param.splash_res', { rel, name: t('resource.' + a.resource) })
      if (a.watchAffix) return t('param.splash_affix', { rel, affix: t('affix.' + a.watchAffix) })
      return t('param.splash_default', { rel })
    }
    case 'ligature': return t('param.ligature')
    case 'twin': return t('param.twin')
    case 'multiply': return `×${a.multiplyValue?.toFixed(1) ?? '?'}`
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
  const breakdown: EstimateBreakdownLine[] = []

  // Phase 1: 基础值
  const hasMultOp = skill.enchantmentIds.includes(EnchantmentTypeEnum.MultiplyOperator as string)
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
        // Phase 2: +100%
        addPercent += 1.0
        // Phase 3: 期望 = ×(1 - 2×effPenalty)
        // 41-3/41-4: quest stacking removed — 直接使用 affix.penaltyChance
        const effPenalty = affix.penaltyChance ?? 0.1
        const expectMult = 1 - 2 * effPenalty
        multProduct *= expectMult
        const detail = t('est.taboo_penalty', { pct: Math.round(effPenalty * 100) })
        breakdown.push({ typeKey: 'taboo', label: t('est.taboo', { val: expectMult.toFixed(2) }), detail })
        break
      }
      // 其余词条不预估
      default:
        break
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
      breakdown.push({
        typeKey: 'apprentice',
        label: t('est.quest_progress', { task: t('quest.' + questEnchEst.type + '.task'), stacks: rt.questStacks, target: questEnchEst.targetStacks }),
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

  return { estimatedOutput, breakdown }
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
  eventBus.emit('shop:opened');
  const el = getElements();

  // 遗物效果：通过管道解析 on_battle_end 金币加成
  const goldRelicResult = resolveRelicEffects('on_battle_end', { overkill: state.overkill });
  let relicGold = Math.floor(goldRelicResult.effects.gold);

  // 基础100 + 溢出增幅（上限100%） + 技能产出 + 遗物加成（金币跨关累计）
  const overflowBonus = state.targetScore > 0 ? state.overkill / state.targetScore : 0;
  let baseGold = Math.floor(100 * (1 + overflowBonus));
  const skillGold = Math.floor(state.resources.gold);

  // Story 36.8: 万物熔炉 — 覆盖默认金币计算
  const furnaceResult = checkUniversalFurnace();
  if (furnaceResult) {
    baseGold = 0;
    relicGold = furnaceResult.bonusGold;
  }

  // Review H1: 精英猎手 — 精英关金币翻倍（同步 showGoldReward 显示）
  const eliteMultiplier = checkEliteHunterGoldMultiplier();
  // Story 36.12: S 级奖杯 — 高评级额外金币（独立加算，不受乘法影响）
  const trophyGold = getSRankTrophyGold(state.battleStats?.rating || 'B');
  const battleGold = Math.floor((baseGold + skillGold + relicGold) * eliteMultiplier) + trophyGold;
  state.gold += battleGold;

  el.shopLevelNum.textContent = String(state.level);
  // 周目≥2时在商店标题显示周目数
  const shopTitle = document.getElementById('shop-title');
  if (shopTitle) {
    shopTitle.textContent = state.cycle >= 2 ? t('shop.cycle_title', { cycle: state.cycle }) : t('shop.title');
  }
  el.shopScore.textContent = String(state.score);
  el.shopTarget.textContent = String(state.targetScore);
  updateGoldDisplay();

  // Story 36.9: 走私通道 — 每关重置; 黑市门票 — +1 商品位
  resetShopRelicState();
  const shopSlots = 5 + getBlackMarketExtraSlots();
  // 保留锁定商品，补充新商品
  const locked = state.shop.items.filter(item => item.locked);
  const newItems = generateShopItems(shopSlots - locked.length, getBlackMarketExtraSlots() > 0);
  state.shop.items = [...locked, ...newItems];
  state.shop.refreshCount = 0;

  // Story 36.9: 限时拍卖 — 倒计时（必须在 renderUnifiedShop 之前启动，确保首次渲染能显示）
  if (isTimedAuction()) {
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
  // Story 36.5: 附魔锚点 — 每个已激活附魔使价格 +10%
  // Story 36.9: 折扣卡 — 所有商品价格 -15%（先涨后折）
  // 困境红利：每个永久修饰器 -5%（上限 30%）
  return Math.round(baseCost * getEnchantAnchorPriceMultiplier() * getDiscountMultiplier() * (1 - getBountyHunterDiscount()));
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
  const levelCap = maxSkillLevel === Infinity ? 3 : maxSkillLevel;
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
          if (ownedData && ownedAffix && ownedData.level < levelCap) {
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

      // 仅当正常碰撞没产生蓝+升级时触发
      const hasBlueUpgrade = affixItems.some(i => i.isUpgrade && i.affixSkill && i.affixSkill.rarity >= 1);
      if (!hasBlueUpgrade && random() < upgradeChance) {
        // 收集可升级的蓝+技能
        const candidates: Array<{ skillId: string; affix: AffixSkillInstance }> = [];
        for (const [skillId, skillData] of state.player.skills) {
          const affix = state.affixSkills.get(skillId);
          if (!affix || affix.rarity < 1) continue;
          if (convertedSkillIds.has(skillId)) continue;
          if (skillData.level >= levelCap) continue;
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

  // 构建牌包池（替代词语池）— 职业门控：造词师失去牌包系统
  const packPool: ShopItem[] = [];
  if (isFeatureEnabled('pack-system')) {
    const boundKeys = [...state.player.bindings.keys()];
    const playerFreqs = calculateLetterFrequency(state.player.wordDeck);
    const packs = generateWordPacks(state.player.wordDeck, playerFreqs, boundKeys, 8, act, getActMaxRarity());
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

  // 保底：≥2 技能（优先升级） + ≥1 牌包（如果有的话）
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
  if (packPool.length > 0) {
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
  const remaining = shuffleArray([...skillPool, ...packPool]);
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
  const refreshCost = (state.shop.refreshCount + 1) * 5;
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
    // Pack item
    const pack = item.pack;
    const preview = pack.words.join(', ');
    const packRarityColor = RARITY_COLORS[pack.rarity] || '#ffffff';
    const packRarityLabel = rarityLabel(pack.rarity);

    card.classList.add('pack-card');
    card.style.borderColor = packRarityColor;
    card.innerHTML = `
      <div class="reward-icon">${getPackIcon(pack.condition.type)}</div>
      <div class="reward-info">
        <div class="reward-name">${pack.name}</div>
        <div class="reward-desc pack-preview">${pack.desc} · ${preview}</div>
      </div>
      ${costHtml}
      <div class="reward-type pack-type" style="color:${packRarityColor}">${packRarityLabel} ${t('shop.pack_type')}</div>
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
    card.onclick = () => {
      juiceUp(card, 0.2, 3);
      purchasePackItem(index);
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
      const skillHasMultOp = skill.enchantmentIds.includes(EnchantmentTypeEnum.MultiplyOperator as string);
      const multOpBase = skillHasMultOp
        ? (MULTIPLY_OPERATOR_BASE_VALUES[skill.resource]?.[skill.level - 1] ?? baseVal)
        : null;

      let baseValuesText: string;
      if (skillHasMultOp) {
        const mv = MULTIPLY_OPERATOR_BASE_VALUES[skill.resource];
        baseValuesText = t('tooltip.base_values_mult', { v1: mv?.[0], v2: mv?.[1], v3: mv?.[2] });
      } else {
        baseValuesText = t('tooltip.base_values_add', { v1: baseVals[0], v2: baseVals[1], v3: baseVals[2] });
        if (skill.level > 3) {
          baseValuesText += ` / Lv.${skill.level}=${baseVal}`;
        }
      }
      const tooltipData: KeyTooltipData = {
        skill: {
          name: skill.name,
          icon: skill.icon,
          description: skillHasMultOp ? `${resIcon}${resName}×${multOpBase}` : `${resIcon}${resName}+${baseVal}`,
          level: skill.level,
          school: rarityLabel(skill.rarity),
          schoolCssClass: `rarity-${skill.rarity}`,
          baseValuesText,
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
        const estimatedTypes = newEstimate ? new Set(skill.affixes.filter(a => ['void', 'taboo'].includes(a.type)).map(a => a.type)) : undefined;
        const fields = buildAffixTooltipFields(skill, rt, estimatedTypes);
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
        tooltipData.skill!.apprenticeGrowth = newEstimate ? undefined : fields.apprenticeGrowth;
      } else {
        const fields = buildAffixTooltipFields(skill);
        tooltipData.skill!.affixInfo = fields.affixInfo;
        tooltipData.skill!.enchantments = fields.enchantments;
      }
      // Story 40.4: 形状描述
      const shapeDesc = getShapeDescription(skill.shapeId ?? 'monomino', getShapeCells(skill.shapeId ?? 'monomino', skill.rotation ?? 0)?.length ?? 1);
      if (shapeDesc) {
        tooltipData.skill!.mechanicInfo = shapeDesc;
      }
      keyTooltip.show(e.clientX, e.clientY, tooltipData);
      // Link/Splash watchAffix 高亮
      for (const affix of skill.affixes) {
        if ((affix.type === 'link' || affix.type === 'splash') && affix.watchAffix) {
          highlightWatchAffixKeys(affix.watchAffix);
        }
      }
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
      previewRotation = (previewRotation + 1) % 4;
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
  comparisonPanel.style.cssText = 'position:absolute;z-index:1000;background:#1a1a2e;border:1px solid #333;border-radius:8px;padding:10px;font-size:11px;color:#ccc;pointer-events:none;min-width:280px;';

  // 左列：当前技能  右列：商店技能
  const leftCol = buildComparisonColumn(existingSkill, `当前 [${existingKey?.toUpperCase()}]`, shopSkill);
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
    const info = getEnchantmentDisplayInfo(enchId as EnchantmentType, skill.transmuteResource, skill.neighborPosRel);
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

  // Story 36.9: 走私通道 — 最便宜商品免费
  const smuggleFree = index === getSmuggleFreeIndex();
  const cost = smuggleFree ? 0 : item.cost;

  if (state.gold < cost) {
    showFeedback(t('shop.no_gold'), '#ff6b6b');
    return;
  }

  if (smuggleFree) consumeSmuggleFree();
  state.gold -= cost;
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

// === Lv.3 自动附魔检查（概率递减） ===
function checkAutoEnchantment(skillId: string): void {
  // 统计场上全部技能已有附魔总数
  let totalEnch = 0;
  for (const [, affixSkill] of state.affixSkills) {
    totalEnch += affixSkill.enchantmentIds.length;
  }
  // 第一个附魔必定成功；之后概率 = max(0.1, 0.8 - 0.15 * (totalEnch - 1))
  const prob = totalEnch === 0 ? 1.0 : Math.max(0.1, 0.8 - 0.15 * (totalEnch - 1));
  if (random() >= prob) {
    showFeedback('附魔失败', '#ff6b6b');
    return;
  }
  // 成功：展示 2 选 1 附魔面板
  const affixSkill = state.affixSkills.get(skillId);
  if (!affixSkill) return;
  const candidates = generateRitualCandidates(affixSkill);
  if (candidates.length === 0) return;
  const choices = pickRitualChoices(candidates);
  showAutoEnchantmentPanel(skillId, affixSkill, choices);
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
  panel.style.cssText = 'background:#1a1a2e;border:2px solid #ffd700;border-radius:12px;padding:24px;max-width:500px;text-align:center;';

  const title = document.createElement('h3');
  title.textContent = '✨ 附魔成功！选择一个附魔';
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
    };
    choicesDiv.appendChild(btn);
  }

  panel.appendChild(choicesDiv);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

// === 核心购买逻辑（仅技能） ===
// 返回购买的 skillId 或 null（非技能/失败），供调用者做后续绑定/进化
function executePurchase(index: number): { skillId: string; isNew: boolean } | null {
  const item = state.shop.items[index];
  if (!item || item.type !== 'skill') return null;

  // Story 36.9: 走私通道 — 最便宜商品免费
  const smuggleFree = index === getSmuggleFreeIndex();
  const cost = smuggleFree ? 0 : item.cost;

  if (state.gold < cost) {
    showFeedback(t('shop.no_gold'), '#ff6b6b');
    return null;
  }

  const skillId = item.skillId!;

  // T4 遗物约束：购买时再次检查（防止同次商店内先买遗物再买技能绕过限制）
  if (!item.isUpgrade) {
    const maxSkillCount = queryRelicFlag('max_skill_count') as number;
    if (maxSkillCount !== Infinity && state.player.skills.size >= maxSkillCount) {
      showFeedback(t('shop.skill_count_full'), '#ff6b6b');
      return null;
    }
    // 备战席容量检查
    if (isInventoryFull(1)) {
      showFeedback(t('shop.inventory_full'), '#ff6b6b');
      return null;
    }
  } else {
    const maxSkillLevel = Infinity;
    const currentLevel = state.player.skills.get(skillId)?.level ?? 0;
    if (maxSkillLevel !== Infinity && currentLevel >= maxSkillLevel) {
      showFeedback(t('shop.level_capped'), '#ff6b6b');
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
      }
      eventBus.emit('skill:upgraded', { skillId, newLevel: data?.level || 1 });
      // 达到附魔等级门槛时触发附魔（概率递减）
      // 早期觉醒遗物将门槛从 Lv.3 降至 Lv.2
      if (data?.level === getMinEnchantmentLevel()) {
        checkAutoEnchantment(skillId);
      }
      showFeedback(t('shop.skill_upgrade', { name: affixSkill.name }), '#ffe66d');
    } else {
      // 新词条制技能
      affixSkill.purchasePrice = item.cost;
      state.player.skills.set(skillId, { level: 1, purchasePrice: item.cost });
      state.affixSkills.set(skillId, affixSkill);
      state.affixSkillStates.set(skillId, createSkillRuntimeState(skillId));
      showFeedback(t('shop.got_skill', { name: affixSkill.name }), '#4ecdc4');
    }
  }

  state.shop.items.splice(index, 1);

  // T2 遗物事件钩子：技能购买后触发 (Story 28.1)
  resolveRelicEffectsWithBehaviors('on_skill_purchase', {
    purchasedSkillId: skillId,
    isUpgrade: !isNew,
  });

  return { skillId, isNew };
}

// === 点击购买商品 ===
function purchaseShopItem(index: number): void {
  const result = executePurchase(index);
  if (!result) return;

  // 点击购买新技能时，自动绑定到第一个空且未锁定键位（频率≥5）
  if (result.isNew && result.skillId) {
    autoBindSkill(getBindingState(state), result.skillId, cachedLetterFreqs ?? undefined);
  }

  // T4 极简主义：新购买的技能自动升至 max_skill_level
  const minMaxLevel = queryRelicFlag('max_skill_level') as number;
  if (result.isNew && minMaxLevel !== Infinity && minMaxLevel > 1) {
    const data = state.player.skills.get(result.skillId);
    if (data && data.level < minMaxLevel) {
      data.level = minMaxLevel;
      const affixSkill = state.affixSkills.get(result.skillId);
      if (affixSkill) applyAffixLevelScaling(affixSkill.affixes, minMaxLevel - 1);
      showFeedback(t('shop.auto_level', { level: minMaxLevel }), '#ffe66d');
    }
  }

  // Story 41.1: 附魔不再由购买自动触发，改为仪式/商店/试炼三渠道获取
  renderUnifiedShop();
  renderBuildManager();

  // 发送购买事件（引导系统 L1/L2 监听），放在所有后处理完成后
  eventBus.emit('shop:purchase', { type: 'skill', itemId: result.skillId });
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
    showFeedback(t('shop.no_gold'), '#ff6b6b');
    return;
  }

  if (state.player.relics.has(relicId)) {
    showFeedback(t('shop.already_owned'), '#ff6b6b');
    return;
  }

  if (!isRelicSlotsFull()) {
    if (smuggleFree) consumeSmuggleFree();
    state.gold -= cost;
    addRelicWithCapacity(relicId);
    updateGoldDisplay();
    showFeedback(t('shop.got_relic', { icon: relic.icon, name: localizeItemName(relicId, relic.name) }), '#ffe66d');
    playSound('buy');
    // 集训手册 — 购买时所有技能等级+1（上限 Lv.3）
    if (relicId === 'training_manual') {
      const upgradedIds = applyTrainingManual();
      if (upgradedIds.length > 0) showFeedback(`📖 ${upgradedIds.length}${t('shop.training_manual_feedback') || '个技能升级!'}`, '#00ff88');
      // 达到附魔等级门槛时触发附魔检查
      for (const uid of upgradedIds) {
        const uData = state.player.skills.get(uid);
        if (uData?.level === getMinEnchantmentLevel()) {
          checkAutoEnchantment(uid);
        }
      }
    }
    // Story 36.6: 行会勋章 — 购买时随机选行
    if (relicId === 'row_medal') {
      const row = autoSelectRowMedal();
      showFeedback(t('relic.row_medal_selected', { row }), '#ffd700');
    }
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
        // 集训手册 — 替换购买时也触发等级+1
        if (relicId === 'training_manual') {
          const upgradedIds = applyTrainingManual();
          if (upgradedIds.length > 0) showFeedback(`📖 ${upgradedIds.length}${t('shop.training_manual_feedback') || '个技能升级!'}`, '#00ff88');
          for (const uid of upgradedIds) {
            const uData = state.player.skills.get(uid);
            if (uData?.level === getMinEnchantmentLevel()) {
              checkAutoEnchantment(uid);
            }
          }
        }
        // Story 36.6: 行会勋章 — 替换购买时也随机选行
        if (relicId === 'row_medal') {
          const row = autoSelectRowMedal();
          showFeedback(t('relic.row_medal_selected', { row }), '#ffd700');
        }
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
    showFeedback(t('shop.no_gold'), '#ff6b6b');
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
    showFeedback(t('shop.no_enchant_target'), '#ff6b6b');
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
      showFeedback(feedbackText, '#4ecdc4');

      renderUnifiedShop();
      renderBuildManager();
    };
    listEl.appendChild(btn);
  }
}

// === 补偿检查（旧系统已移除，保留空实现） ===
function checkPendingEnchantments(): void {
  // no-op: 旧附魔补偿已移除
}

// === 刷新商店 ===
function refreshShop(): void {
  let cost = (state.shop.refreshCount + 1) * 5;
  // Story 36.9: 限时拍卖 — 刷新免费
  if (isTimedAuction()) {
    cost = 0;
  }
  // Story 36.7: 词语经销商 — 消费免费刷新 flag
  if (cost > 0 && consumeWordDealerFreeRefresh()) {
    cost = 0;
    showFeedback('🤑 免费刷新！', '#ffe66d');
  }
  // Story 36.10: 幕间准备 — 消费免费刷新
  if (cost > 0 && hasIntermissionFreeRefresh()) {
    consumeIntermissionFreeRefresh();
    cost = 0;
    showFeedback(t('shop.intermission_refresh'), '#88ddff');
  }
  // 致命礼物 — 消费免费刷新
  if (cost > 0 && consumeDeadlyGiftFreeRefresh()) {
    cost = 0;
    showFeedback(t('shop.deadly_gift_refresh'), '#ffdd00');
  }
  if (cost > 0 && state.gold < cost) {
    showFeedback(t('shop.no_gold'), '#ff6b6b');
    return;
  }
  state.gold -= cost;
  state.shop.refreshCount++;
  updateGoldDisplay();
  playSound('buy');

  // Story 36.9: 黑市门票 — +1 商品位
  const shopSlots = 5 + getBlackMarketExtraSlots();
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

  // 移除绑定（多格形状全解）
  unbindSkill(getBindingState(state), skillId);

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
  if (state.player.wordDeck.length <= MIN_WORD_COUNT) {
    showFeedback(t('shop.min_words', { count: MIN_WORD_COUNT }), '#ff6b6b');
    return;
  }
  const word = state.player.wordDeck[index];
  state.gold += 3;
  state.player.wordDeck.splice(index, 1);
  updateGoldDisplay();
  showFeedback(t('shop.sell_word', { word }), '#ffe66d');
  // Story 36.7: 词语经销商 — 卖词后下次刷新免费
  if (setWordDealerFlag()) {
    showFeedback('🤑 下次刷新免费', '#88ddff');
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
export function getEnchantmentDisplayInfo(type: EnchantmentType, transmuteRes?: import('../core/types').ResourceType, neighborRel?: PositionRelation): {
  name: string; desc: string; icon: string; category: string; categoryColor: string;
} | null {
  // Quest 类型
  const questDef = getQuestEnchantmentDef(type);
  if (questDef) {
    return {
      name: t('quest.' + questDef.type),
      desc: t('ench_info.quest_desc', { effect: t('quest.' + questDef.type + '.effect'), task: t('quest.' + questDef.type + '.task') }),
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
  // ApprenticeNeighbor：复用技能已有词条的 posRel，否则随机
  if (chosen === EnchantmentTypeEnum.ApprenticeNeighbor) {
    const allRels = Object.values(PositionRelation);
    affixSkill.neighborPosRel = getSkillPosRel(affixSkill) ?? allRels[Math.floor(random() * allRels.length)];
  }
  const info = getEnchantmentDisplayInfo(chosen, affixSkill.transmuteResource, affixSkill.neighborPosRel);
  if (info) {
    showFeedback(t('shop.random_enchant', { icon: info.icon, name: info.name }), '#f9ca24');
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
      showFeedback(t('shop.enchanted', { icon: info.icon, name: info.name }), '#f9ca24');
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

  if (highlights.length === 0) return;

  // Story 40.11: 多格技能使用所有占据键计算邻居高亮范围
  const allKeys: string[] = [];
  for (const [k, sid] of state.player.bindings) {
    if (sid === skillId) allKeys.push(k);
  }
  if (allKeys.length === 0) return;

  // 收集每个键位的颜色（后覆盖前）
  const keyColorMap = new Map<string, string>();
  for (const { rel, color } of highlights) {
    for (const k of getExtendedNeighbors(allKeys, rel)) {
      keyColorMap.set(k, color);
    }
  }
  keyColorMap.forEach((color, k) => {
    const el = document.querySelector(`.key-slot[data-key="${k}"]`) as HTMLElement | null;
    if (!el) return;
    el.classList.add('range-highlight');
    el.style.borderColor = color;
    el.style.background = hexToRgba(color, 0.15);
    el.style.boxShadow = `0 0 8px ${hexToRgba(color, 0.3)}`;
  });
}

function clearRangeHighlight(): void {
  document.querySelectorAll('.key-slot.range-highlight').forEach(el => {
    el.classList.remove('range-highlight');
    (el as HTMLElement).style.borderColor = '';
    (el as HTMLElement).style.background = '';
    (el as HTMLElement).style.boxShadow = '';
  });
}

/** 高亮所有装备了包含指定词条类型的技能的键位 */
function highlightWatchAffixKeys(watchAffix: AffixType): void {
  const color = AFFIX_COLORS[watchAffix] || '#ffe66d';
  for (const [key, skillId] of state.player.bindings) {
    const affix = state.affixSkills.get(skillId);
    if (!affix) continue;
    const hasMatch = affix.affixes.some(a => a.type === watchAffix);
    if (!hasMatch) continue;
    const el = document.querySelector(`.key-slot[data-key="${key}"]`) as HTMLElement | null;
    if (!el) continue;
    el.classList.add('range-highlight');
    el.style.borderColor = color;
    el.style.background = hexToRgba(color, 0.15);
    el.style.boxShadow = `0 0 8px ${hexToRgba(color, 0.3)}`;
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

  // 计算字频（一次遍历），再导出底分
  const letterFreqs = calculateLetterFrequency(state.player.wordDeck);
  cachedLetterFreqs = letterFreqs;
  const letterScores = new Map<string, number>();
  letterFreqs.forEach((count, letter) => {
    const score = letterFrequencyToScore(count);
    if (score > 0) letterScores.set(letter, score);
  });

  // 低频键位自动解绑（频率<5 → 底分为0 → 锁定）— 标点键绕过
  const hasPunctuationRelic = state.player.relics.has('punctuation_liberation');
  const keysToUnbind: string[] = [];
  for (const [key] of state.player.bindings) {
    if (PUNCTUATION_KEYS.includes(key)) continue; // 标点键不受字频限制
    if ((letterFreqs.get(key) ?? 0) < 5) keysToUnbind.push(key);
  }
  const unboundSkillIds = new Set<string>();
  for (const key of keysToUnbind) {
    const skillId = state.player.bindings.get(key);
    if (skillId && !unboundSkillIds.has(skillId)) {
      unboundSkillIds.add(skillId);
      unbindSkill(getBindingState(state), skillId);
      const affixSk = state.affixSkills.get(skillId);
      if (affixSk) showFeedback(t('shop.unbound', { name: affixSk.name, key: key.toUpperCase() }), '#ff6b6b');
    }
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
      if (freq < 5 && !isPunctKey) slot.classList.add('freq-locked');

      // 底分分级样式
      if (score >= 6) slot.classList.add('score-high');
      else if (score >= 3) slot.classList.add('score-mid');
      else if (score >= 1) slot.classList.add('score-low');

      // 技能键位渲染
      if (skillId && state.affixSkills.has(skillId)) {
        // 词条制技能键位渲染
        const affixSkill = state.affixSkills.get(skillId)!;
        const rarityColor = RARITY_COLORS[affixSkill.rarity] || '#ffffff';
        slot.classList.add('has-skill', 'affix-skill-slot');
        slot.dataset.dragType = 'skill-key';
        slot.dataset.boundSkill = skillId;
        const skData = state.player.skills.get(skillId);
        slot.dataset.sellPrice = String(Math.floor((skData?.purchasePrice || 15) / 2));
        // Story 40.5: 形状数据供拖拽系统读取
        if (affixSkill.shapeId && affixSkill.shapeId !== 'monomino') {
          slot.dataset.shapeId = affixSkill.shapeId;
          slot.dataset.rotation = String(affixSkill.rotation ?? 0);
          const preview = renderShapePreview(affixSkill.shapeId, affixSkill.rotation ?? 0, affixSkill.rarity);
          if (preview) slot.dataset.shapePreview = preview;
        }
        slot.style.borderColor = rarityColor;
        slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span><span class="key-skill">${affixSkill.icon}</span>${score > 0 ? `<span class="key-score">${score}</span>` : ''}`;
      } else {
        slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span>${score > 0 ? `<span class="key-score">${score}</span>` : ''}`;
      }

      // Tooltip 悬停 + 范围预览
      slot.addEventListener('mouseenter', (e: MouseEvent) => {
        hideAllTooltips();
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
        if (skillId && state.affixSkills.has(skillId)) {
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
          const estimatedTypes = estimate ? new Set(affixSkill.affixes.filter(a => ['void', 'taboo'].includes(a.type)).map(a => a.type)) : undefined;
          const fields = buildAffixTooltipFields(affixSkill, rt, estimatedTypes);
          tooltipData.skill.affixInfo = fields.affixInfo;
          tooltipData.skill.enchantments = fields.enchantments;
          tooltipData.skill.questProgress = fields.questProgress;
          tooltipData.skill.apprenticeGrowth = estimate ? undefined : fields.apprenticeGrowth;
          tooltipData.skill.smartEstimate = estimate ?? undefined;
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
              // Link/Splash watchAffix 高亮（叠加在范围高亮之上）
              if ((affix.type === 'link' || affix.type === 'splash') && affix.watchAffix) {
                highlightWatchAffixKeys(affix.watchAffix);
              }
            }
          }
        }
        const avoidRect = getRangeHighlightRect(slot);
        keyTooltip.show(e.clientX, e.clientY, tooltipData, avoidRect ?? undefined);
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
          handleKeySlotRotation(k);
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
        const estimate = computeSmartEstimate(affixSkill, rt, invAllKeys.length > 0 ? invAllKeys : undefined);
        const estimatedTypes = estimate ? new Set(affixSkill.affixes.filter(a => ['void', 'taboo'].includes(a.type)).map(a => a.type)) : undefined;
        const fields = buildAffixTooltipFields(affixSkill, rt, estimatedTypes);
        tooltipData.skill!.affixInfo = fields.affixInfo;
        tooltipData.skill!.enchantments = fields.enchantments;
        tooltipData.skill!.questProgress = fields.questProgress;
        tooltipData.skill!.apprenticeGrowth = estimate ? undefined : fields.apprenticeGrowth;
        tooltipData.skill!.smartEstimate = estimate ?? undefined;
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
  // Story 36.7: 词语经销商 — 卖词后下次刷新免费
  if (setWordDealerFlag()) {
    showFeedback('🤑 下次刷新免费', '#88ddff');
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

  const targetKeys = mapShapeToKeys(normalizedKey, shapeId, rotation);

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
function handleKeySlotRotation(key: string): void {
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
  const nextRotation = (currentRotation + 1) % 4;
  const targetKeys = mapShapeToKeys(anchorKey, shapeId, nextRotation);

  if (!targetKeys) {
    // 旋转失败：音效 + 抖动动画
    playSound('wrong');
    showFeedback(t('shop.rotate_fail'), '#ff6b6b');
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
  const result = bindShapeToKeys(bs, skillId, anchorKey);

  if (!result.success) {
    // 防御性回退：恢复旧 rotation 并重新绑定
    affixSkill.rotation = currentRotation;
    bindShapeToKeys(bs, skillId, anchorKey);
    playSound('wrong');
    showFeedback(t('shop.rotate_fail'), '#ff6b6b');
    return;
  }

  if (result.displacedSkillIds.length > 0) {
    showFeedback(t('shop.rotate_displaced'), '#ffaa00');
  }

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
  const bs = getBindingState(state);

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
      const rotation = affixSkill.rotation ?? 0;
      if (shapeId !== 'monomino') {
        const fitKeys = mapShapeToKeys(targetKey.toLowerCase(), shapeId, rotation);
        if (!fitKeys) {
          showFeedback(t('shop.shape_no_fit'), '#ff6b6b');
          return;
        }
      }
    }

    const result = executePurchase(index);
    if (!result) return;

    // 绑定到目标键位（被覆盖技能自动解绑）
    bindShapeToKeys(bs, skillId, targetKey);

    // Story 41.1: 附魔不再由购买自动触发
    renderUnifiedShop();
    renderBuildManager();

    // 发送购买事件（引导系统 L1/L2 监听）
    eventBus.emit('shop:purchase', { type: 'skill', itemId: skillId });
  } else if (payload.type === 'skill-inventory' || payload.type === 'skill-key') {
    // 拖拽已有技能到键位 → 绑定/交换
    const skillId = payload.skillId;
    if (!skillId) return;

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
      const r1 = bindShapeToKeys(bs, skillId, targetKey);
      if (!r1.success) {
        // 放不下：恢复双方原始绑定
        if (sourceAnchorKey) bindShapeToKeys(bs, skillId, sourceAnchorKey);
        if (existingAnchorKey) bindShapeToKeys(bs, existingSkill, existingAnchorKey);
        showFeedback(t('shop.shape_no_fit'), '#ff6b6b');
      } else {
        // 记录 r1 可能覆盖的第三方技能及其锚点（用于回退恢复）
        const displacedAnchors = new Map<string, string>();
        for (const dId of r1.displacedSkillIds) {
          if (dId !== existingSkill) {
            const dAnchor = getSkillAnchorKey(bs, dId);
            if (dAnchor) displacedAnchors.set(dId, dAnchor);
          }
        }
        const r2 = existingAnchorKey ? bindShapeToKeys(bs, existingSkill, sourceAnchorKey) : { success: false, displacedSkillIds: [] };
        if (!r2.success && existingAnchorKey) {
          // 对方放不回去：回退全部
          unbindSkill(bs, skillId);
          if (sourceAnchorKey) bindShapeToKeys(bs, skillId, sourceAnchorKey);
          if (existingAnchorKey) bindShapeToKeys(bs, existingSkill, existingAnchorKey);
          // 恢复被覆盖的第三方技能
          for (const [dId, dAnchor] of displacedAnchors) {
            bindShapeToKeys(bs, dId, dAnchor);
          }
          showFeedback(t('shop.shape_no_fit'), '#ff6b6b');
        }
      }
    } else {
      // 绑定到目标键位（被覆盖技能自动解绑）
      const r = bindShapeToKeys(bs, skillId, targetKey);
      if (!r.success) {
        showFeedback(t('shop.shape_no_fit'), '#ff6b6b');
      }
    }

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
const RELIC_RARITY_COLORS: Record<string, string> = { common: '#aaa', rare: '#4488cc', epic: '#9b59b6', legendary: '#ffd700' };
function getRarityLabel(rarity: string): string {
  return t(`shop.rarity.${rarity}`);
}

function showRelicTooltip(e: MouseEvent, relic: import('../data/relics').RelicData): void {
  hideAllTooltips();
  const tip = document.createElement('div');
  tip.id = 'relic-tooltip';
  tip.className = 'key-tooltip';
  const rarityColor = RELIC_RARITY_COLORS[relic.rarity] || '#aaa';
  // 行会勋章：动态追加已选行
  let descText = localizeItemDesc(relic.id, relic.description);
  if (relic.id === 'row_medal') {
    const rowName = getRowMedalRowName();
    if (rowName) descText += ` [${rowName}]`;
  }
  tip.innerHTML =
    `<div style="font-size:14px;font-weight:bold;color:#fff;margin-bottom:4px;">${relic.icon} ${localizeItemName(relic.id, relic.name)}</div>` +
    `<div style="font-size:9px;padding:1px 4px;border-radius:3px;display:inline-block;margin-bottom:4px;background:rgba(255,255,255,0.08);color:${rarityColor};">${getRarityLabel(relic.rarity)}</div>` +
    `<div style="color:#aaa;font-size:10px;white-space:normal;">${descText}</div>` +
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
    // Story 36.9: 限时拍卖 — 离开商店时清理倒计时
    _auctionRemaining = -1;
    clearAuctionTimer();
    // 无限循环：直接进入下一关
    state.level = getNextBattleNode(state.level);
    void startLevel();
  };
}
