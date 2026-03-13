// ============================================
// 打字肉鸽 - 商店系统（统一5商品）
// ============================================
// Epic 17: 统一商店 + 刷新/锁定/卖出 + 拖拽交互

import { state, isRelicSlotsFull, addRelicWithCapacity } from '../core/state';
import { resolveRelicEffects, resolveRelicEffectsWithBehaviors, queryRelicFlag } from './relics/RelicPipeline';
import { KEYS, KEYBOARD_ROWS, RESOURCE_LABELS, RESOURCE_ICONS, RESOURCE_COLORS } from '../core/constants';
import { getKeysWithRelation, PositionRelation } from '../data/keyboardTopology';

// === 位置关系标签（从旧 producers.ts 迁移） ===
const RELATION_LABELS: Record<string, string> = {
  [PositionRelation.Adjacent]: '相邻',
  [PositionRelation.SameRow]: '同行',
  [PositionRelation.SameColumn]: '同列',
  [PositionRelation.SameHand]: '同手',
  [PositionRelation.SameFinger]: '同指',
  [PositionRelation.Symmetric]: '对称位',
};
import { calculateDeckStats } from '../data/words';
import { generateWordPacks, getConditionMeta } from '../data/wordPacks';
import { getElements } from '../ui/elements';
import { playSound } from '../effects/sound';
import { juiceUp, calculateRating, getRatingTier } from '../effects/juice';
import { showScreen, startLevel, renderRelicDisplay, showFeedback } from './battle';
import type { ShopItem, ResourceType, PackConditionType } from '../core/types';
import { getNextBattleNode, isRestNode, getActForNode, TOTAL_NODES } from './stage/stageFlow';
import { openRestStage } from './restStage';
import { calculateLetterFrequency, letterFrequencyToScore } from './letters/LetterFrequencySystem';
import { RELICS, MAX_RELIC_SLOTS } from '../data/relics';
import type { RelicWeights } from './relicPicker';
import { generateRelicCandidates, showRelicReplaceUI } from './relicPicker';
import { keyTooltip, AFFIX_COLORS } from '../ui/keyboard/KeyTooltip';
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
import { createSkillRuntimeState, AFFIX_NAMES, AFFIX_DESCRIPTIONS, RARITY_COLORS, RARITY_NAMES, AFFIX_CATEGORY_MAP, RESOURCE_NAMES } from '../data/affixes';
import type { SkillRarity } from '../data/affixes';
import { getEnchantmentSlotCount, filterEnchantmentCandidates, getTransmuteEligibleResources, isApprenticeEnchantment, resolvePhase1, getQuestCompletions, countEmptySlots } from '../data/affixTrigger';
import { filterEnchantmentsByClass, QUEST_ENCHANTMENT_DEFS, ENCHANTMENT_META, TRANSMUTE_NAMES, TRANSMUTE_RATIO_TABLE, EnchantmentType as EnchantmentTypeEnum } from '../data/affixes';
import type { EnchantmentType } from '../data/affixes';
import { getMonoAffixCategory } from './relics/RelicPipeline';

// === 零频键位缓存（供自动绑定使用） ===
let cachedLetterFreqs: Map<string, number> | null = null;

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

// 使用 affixes.ts 的 RARITY_NAMES 作为单一来源；此处别名保持兼容
const RARITY_LABELS = RARITY_NAMES as Record<number, string>;

/** 职业可用资源池（排除非对应职业的 fragment/mutagen） */
function getAvailableResources(classId: string): ResourceType[] {
  const all: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold'];
  if (classId === 'wordsmith') all.push('fragment');
  if (classId === 'metamorph') all.push('mutagen');
  return all;
}

/** Act → 最大稀有度（词条数）映射；Act1 只刷无词条/单词条，Act2 开始双词条，Act3+ 无限制 */
function getActMaxRarity(): SkillRarity {
  // 无尽模式（cycle ≥ 2）无稀有度上限
  if (state.cycle >= 2) return 3 as SkillRarity;
  const act = getActForNode(state.level);
  if (act <= 1) return 1 as SkillRarity;   // Act1: 0~1
  if (act === 2) return 2 as SkillRarity;   // Act2: 0~2
  return 3 as SkillRarity;                  // Act3+: 0~3
}

/** 生成单个词条制技能商品 */
export function generateAffixShopItem(
  itemId: number,
  options?: { rarity?: SkillRarity; resource?: ResourceType; maxRarity?: SkillRarity },
): ShopItem {
  const resourcePool = getAvailableResources(state.classId);
  const resource = options?.resource ?? resourcePool[Math.floor(random() * resourcePool.length)];
  // pure_heart 白装限制：强制 rarity=0
  const whiteOnly = queryRelicFlag('white_only') as boolean;
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
  let skill = generateSkill({ resource, rarity, availableResources: resourcePool });
  // clamp：如果 rarity 未指定（随机掷骰），超过 actMaxRarity 时重生成
  if (rarity === undefined && skill.rarity > actMaxRarity) {
    skill = generateSkill({ resource, rarity: actMaxRarity, availableResources: resourcePool });
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

/** 生成多个词条制技能商品（保证品类多样性：至少 1 件 rarity≥1，除非 white_only 或 Act 限制） */
export function generateAffixShopItems(count: number): ShopItem[] {
  if (count <= 0) return [];
  const items: ShopItem[] = [];
  let nextId = Date.now();

  const whiteOnly = queryRelicFlag('white_only') as boolean;
  const actMaxRarity = getActMaxRarity();

  if (whiteOnly) {
    // pure_heart：全部白装
    for (let i = 0; i < count; i++) {
      items.push(generateAffixShopItem(nextId++));
    }
    return items;
  }

  // 保底第 1 件：rarity≥1（蓝装以上），但不超过 Act 上限
  const guaranteedRarity = Math.min(1, actMaxRarity) as SkillRarity;
  let guaranteed: ShopItem;
  if (guaranteedRarity >= 1) {
    for (let attempt = 0; attempt < 10; attempt++) {
      guaranteed = generateAffixShopItem(nextId++, { maxRarity: actMaxRarity });
      if (guaranteed.affixSkill!.rarity >= 1) break;
    }
    // 如果 10 次都没 ≥1，强制 rarity=1
    if (!guaranteed! || guaranteed!.affixSkill!.rarity < 1) {
      guaranteed = generateAffixShopItem(nextId++, { rarity: 1 as SkillRarity, maxRarity: actMaxRarity });
    }
  } else {
    // Act1 允许的最大 rarity=0 时，无法保底蓝装
    guaranteed = generateAffixShopItem(nextId++, { maxRarity: actMaxRarity });
  }
  items.push(guaranteed!);

  // 剩余随机
  for (let i = 1; i < count; i++) {
    items.push(generateAffixShopItem(nextId++, { maxRarity: actMaxRarity }));
  }

  return items;
}

// Old producer/act skill weights removed (词条制 replaces old system)

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

/** 构建词条制技能的 tooltip 扩展字段 */
export function buildAffixTooltipFields(skill: AffixSkillInstance, rt?: SkillRuntimeState, excludeTypes?: Set<string>): {
  affixInfo: AffixTooltipInfo[]
  questProgress?: string
  apprenticeGrowth?: string
} {
  const affixInfo: AffixTooltipInfo[] = skill.affixes
    .filter(a => !excludeTypes || !excludeTypes.has(a.type))
    .map(a => ({
      typeName: AFFIX_NAMES[a.type],
      typeKey: a.type,
      paramSummary: buildAffixParamSummary(a),
      description: AFFIX_DESCRIPTIONS[a.type] || '',
    }))

  let questProgress: string | undefined
  let apprenticeGrowth: string | undefined

  if (rt) {
    // 任务进度
    if (rt.questStacks > 0 || rt.questCompletions > 0) {
      const questEnch = skill.enchantmentIds
        .map(id => QUEST_ENCHANTMENT_DEFS.find((d: QuestEnchantmentDef) => d.type === id))
        .find((d): d is QuestEnchantmentDef => d != null)
      if (questEnch) {
        questProgress = `任务: ${rt.questStacks}/${questEnch.targetStacks} 层 (完成 ${rt.questCompletions} 次)`
      }
    }
    // 学徒成长
    if (rt.apprenticeAccumulated > 0) {
      apprenticeGrowth = `学徒: +${(rt.apprenticeAccumulated * 100).toFixed(1)}%`
    }
  }

  return { affixInfo, questProgress, apprenticeGrowth }
}

/** 构建单个词条的参数摘要 */
function buildAffixParamSummary(a: import('../data/affixes').AffixInstance): string {
  const rel = a.posRel ? RELATION_LABELS[a.posRel] || a.posRel : '';
  switch (a.type) {
    case 'multiply': return `×${a.multiplier?.toFixed(1) ?? '?'}`
    case 'convert': return `${RESOURCE_ICONS[a.source!] || ''}${RESOURCE_NAMES[a.source!] ?? '?'}→本资源 k=${a.k?.toFixed(3) ?? '?'}`
    case 'charge': return `${Math.round((a.gainPerSec ?? 0) * 100)}%/s 上限${Math.round((a.maxBonus ?? 0) * 100)}%`
    case 'decay': return `初始×${a.initialMult ?? '?'} 衰减${a.decayPerTrigger ?? '?'} 下限×${a.floor ?? '?'}`
    case 'pulse': return `每${a.interval ?? '?'}次 ×${a.burstMult?.toFixed(1) ?? '?'}`
    case 'crit': return `${Math.round((a.chance ?? 0) * 100)}% ×${a.critMult?.toFixed(1) ?? '?'}`
    case 'void': return `${rel}每空位+${Math.round((a.bonusPerSlot ?? 0) * 100)}%`
    case 'resonance': return `${rel}产出${RESOURCE_ICONS[a.resource!] || ''}${RESOURCE_NAMES[a.resource!] ?? '?'}时触发`
    case 'amplify': return `${rel}${RESOURCE_ICONS[a.resource!] || ''}${RESOURCE_NAMES[a.resource!] ?? ''}每层+${Math.round((a.valuePerStack ?? 0) * 100)}%`
    case 'cascade': return `${rel || '上键范围内'} ×${a.cascadeMult?.toFixed(1) ?? '?'}`
    case 'outcast': return `+${Math.round((a.bonusPercent ?? 0) * 100)}%`
    case 'gravity': return `概率×${a.probMult?.toFixed(1) ?? '?'}`
    case 'recurse': return `${Math.round((a.recurseChance ?? 0) * 100)}%重触发`
    case 'taboo': return `+100% / ${Math.round((a.penaltyChance ?? 0) * 100)}%负产出`
    case 'rainbow': return '随机资源'
    case 'mirror': return `${rel}镜像复制`
    case 'link': return `${rel}有[${AFFIX_NAMES[a.watchAffix!] ?? '?'}]词条技能触发时触发`
    case 'splash': {
      if (a.resource) return `${rel}溅射${RESOURCE_NAMES[a.resource] ?? '?'}技能`
      if (a.watchAffix) return `${rel}溅射[${AFFIX_NAMES[a.watchAffix] ?? '?'}]技能`
      return `${rel}溅射触发`
    }
    case 'ligature': return `连字加成`
    case 'twin': return `双附魔`
    default: return ''
  }
}

// === 智能产出预估（构筑界面 tooltip） ===

// APPRENTICE_ENCHANTMENT_IDS 已被 isApprenticeEnchantment() 取代

/**
 * 计算战斗外可预估的产出：Multiply / Void / Taboo 词条 + 学徒附魔。
 * 返回 null 表示该技能没有可预估项。
 * @param boundKey 技能绑定的键位（无绑定时传 undefined，Void 需要）
 */
export function computeSmartEstimate(
  skill: AffixSkillInstance,
  rt?: SkillRuntimeState,
  boundKey?: string,
): SmartEstimate | null {
  const breakdown: EstimateBreakdownLine[] = []

  // Phase 1: 基础值
  const base = resolvePhase1(skill)
  breakdown.push({ typeKey: 'base', label: `基础值 ${base}`, detail: '' })

  // 收集 Phase 2 加性和 Phase 3 乘性
  let addPercent = 0  // 加性总百分比
  let multProduct = 1 // 乘性连乘

  const questC = (questType: import('../data/affixes').EnchantmentType): number => {
    if (!rt) return 0
    return getQuestCompletions(skill, rt, questType)
  }

  for (const affix of skill.affixes) {
    switch (affix.type) {
      case 'multiply': {
        const c = questC('quest_ascend' as import('../data/affixes').EnchantmentType)
        const m = (affix.multiplier ?? 1) + c * 0.15
        multProduct *= m
        const detail = c > 0 ? `(${affix.multiplier?.toFixed(1)}+${c}×0.15 任务)` : ''
        breakdown.push({ typeKey: 'multiply', label: `强化 ×${m.toFixed(2)}`, detail })
        break
      }
      case 'void': {
        if (affix.posRel == null) break
        const c = questC('quest_devour' as import('../data/affixes').EnchantmentType)
        const slotEff = (affix.bonusPerSlot ?? 0) + c * 0.05
        const empty = boundKey
          ? countEmptySlots(boundKey, affix.posRel, state.player.bindings)
          : 0
        const bonus = empty * slotEff
        addPercent += bonus
        // quest_devour c >= 3 额外加成
        let extraBonus = 0
        if (rt && skill.enchantmentIds.includes('quest_devour' as any)) {
          const cd = rt.questCompletions
          if (cd >= 3) {
            extraBonus = cd * 0.10
            addPercent += extraBonus
          }
        }
        const emptyLabel = boundKey ? `${empty}空位` : '未绑定'
        const detail = c > 0
          ? `(${emptyLabel}×${Math.round(slotEff * 100)}%${extraBonus > 0 ? ` +${Math.round(extraBonus * 100)}%额外` : ''})`
          : `(${emptyLabel}×${Math.round((affix.bonusPerSlot ?? 0) * 100)}%)`
        breakdown.push({ typeKey: 'void', label: `虚无 +${Math.round(bonus * 100)}%${extraBonus > 0 ? `+${Math.round(extraBonus * 100)}%` : ''}`, detail })
        break
      }
      case 'taboo': {
        // Phase 2: +100%
        addPercent += 1.0
        // Phase 3: 期望 = ×(1 - 2×effPenalty)
        const c = questC('quest_sacrifice' as import('../data/affixes').EnchantmentType)
        const effPenalty = Math.max(0.02, (affix.penaltyChance ?? 0.1) - c * 0.01)
        const expectMult = 1 - 2 * effPenalty
        multProduct *= expectMult
        const detail = c > 0
          ? `(负产出${Math.round(effPenalty * 100)}%, 任务-${c}%)`
          : `(负产出${Math.round(effPenalty * 100)}%)`
        breakdown.push({ typeKey: 'taboo', label: `禁忌 +100% 期望×${expectMult.toFixed(2)}`, detail })
        break
      }
      // 其余词条不预估
      default:
        break
    }
  }

  // 学徒附魔
  if (rt && rt.apprenticeAccumulated > 0) {
    const hasApprentice = skill.enchantmentIds.some(id => isApprenticeEnchantment(id as import('../data/affixes').EnchantmentType))
    if (hasApprentice) {
      addPercent += rt.apprenticeAccumulated
      breakdown.push({
        typeKey: 'apprentice',
        label: `学徒 +${(rt.apprenticeAccumulated * 100).toFixed(1)}%`,
        detail: '',
      })
    }
  }

  // 如果只有基础值行、没有任何预估项，返回 null
  if (breakdown.length <= 1) return null

  const estimatedOutput = base * (1 + addPercent) * multProduct
  breakdown.push({ typeKey: 'base', label: `≈ ${estimatedOutput.toFixed(1)}`, detail: '(单次预估)' })

  return { estimatedOutput, breakdown }
}

// === 打开商店 ===
export function openShop(_won: boolean): void {
  state.phase = 'shop';
  const el = getElements();

  // 遗物效果：通过管道解析 on_battle_end 金币加成
  const goldRelicResult = resolveRelicEffects('on_battle_end', { overkill: state.overkill });
  const relicGold = Math.floor(goldRelicResult.effects.gold);

  // 基础100 + 技能产出 + 遗物加成（金币跨关累计）
  const baseGold = 100;
  const skillGold = Math.floor(state.resources.gold);
  state.gold += baseGold + skillGold + relicGold;
  const battleGold = baseGold + skillGold + relicGold;

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

// buildMechanicWeightedBucket removed (old producer system)

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
        cost: getAdjustedPrice(calculateAffixSkillPrice(affixSkill.rarity, nextLevel, rollPriceFluctuation())),
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
  hideAllTooltips();
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
        ${!item.isUpgrade && affix.level > 1 ? `<div class="affix-level">Lv.${affix.level}</div>` : ''}
      </div>
      <div class="reward-cost">💰${item.cost}</div>
      <div class="reward-type" style="color:${rarityColor}">${item.isUpgrade ? '升级' : rarityLabel}</div>
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

  // 词条制技能悬停详情 tooltip（复用 keyTooltip，与构筑界面统一风格）
  if (item.type === 'skill' && item.affixSkill) {
    card.addEventListener('mouseenter', (e: MouseEvent) => {
      hideAllTooltips();
      const skill = item.affixSkill!;
      const baseVals = skill.baseValues;
      const resIcon = RESOURCE_ICONS[skill.resource] || '';
      const resName = RESOURCE_NAMES[skill.resource] || skill.resource;
      const baseVal = baseVals[skill.level - 1] ?? baseVals[0];

      const tooltipData: KeyTooltipData = {
        skill: {
          name: skill.name,
          icon: skill.icon,
          description: `${resIcon}${resName}+${baseVal}`,
          level: skill.level,
          school: RARITY_LABELS[skill.rarity] ?? '普通',
          schoolCssClass: `rarity-${skill.rarity}`,
          baseValuesText: `基础产出: Lv.1=${baseVals[0]} / Lv.2=${baseVals[1]} / Lv.3=${baseVals[2]}`,
        },
      };
      if (item.isUpgrade) {
        const curLv = skill.level - 1;
        const curBase = curLv >= 1 ? baseVals[curLv - 1] : 0;
        tooltipData.skill!.upgradeInfo = `升级 Lv.${curLv} → Lv.${skill.level}　基础产出 ${curBase} → ${baseVal}`;
      }
      const fields = buildAffixTooltipFields(skill);
      tooltipData.skill!.affixInfo = fields.affixInfo;
      keyTooltip.show(e.clientX, e.clientY, tooltipData);
    });
    card.addEventListener('mouseleave', () => {
      keyTooltip.hide();
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
  rarityDiv.textContent = `${RARITY_LABELS[skill.rarity]} Lv.${skill.level}`;
  col.appendChild(rarityDiv);

  // 词条列表（对方没有的词条类型→蓝色标注为"新增"）
  const otherAffixTypes = new Set(otherSkill.affixes.map(a => a.type));
  for (const affix of skill.affixes) {
    const affixDiv = document.createElement('div');
    const isNew = !otherAffixTypes.has(affix.type);
    affixDiv.style.cssText = `color:${isNew ? '#3498db' : '#e67e22'};font-size:10px;margin-top:2px;`;
    affixDiv.textContent = `[${AFFIX_NAMES[affix.type]}] ${buildAffixParamSummary(affix)}${isNew ? ' ✦新' : ''}`;
    col.appendChild(affixDiv);
  }

  // 附魔（使用统一信息查找）
  for (const enchId of skill.enchantmentIds) {
    const info = getEnchantmentDisplayInfo(enchId as EnchantmentType, skill.transmuteResource);
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

  // T4 遗物约束：购买时再次检查（防止同次商店内先买遗物再买技能绕过限制）
  if (!item.isUpgrade) {
    const maxSkillCount = queryRelicFlag('max_skill_count') as number;
    if (maxSkillCount !== Infinity && state.player.skills.size >= maxSkillCount) {
      showFeedback(t('shop.skill_count_full'), '#ff6b6b');
      return null;
    }
    // pure_heart 白装限制：禁止购买非白装新技能
    if (queryRelicFlag('white_only') === true && item.affixSkill && item.affixSkill.rarity > 0) {
      showFeedback(t('shop.white_only'), '#ff6b6b');
      return null;
    }
  } else {
    // 升级时检查等级上限（keyboard_flood max_skill_level=1 等）
    const maxSkillLevel = queryRelicFlag('max_skill_level') as number;
    const currentLevel = state.player.skills.get(skillId)?.level ?? 0;
    if (maxSkillLevel !== Infinity && currentLevel >= maxSkillLevel) {
      showFeedback(t('shop.level_capped'), '#ff6b6b');
      return null;
    }
  }

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
      filterEnchantmentCandidates(affixSkill),
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
}

// === 补偿检查（旧系统已移除，保留空实现） ===
function checkPendingEnchantments(): void {
  // no-op: 旧附魔补偿已移除
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

let _enchantmentOnClose: (() => void) | null = null;

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

/** 附魔类别颜色 */
const ENCHANTMENT_CATEGORY_COLORS: Record<string, string> = {
  apprentice: '#2ecc71',
  quest: '#4ecdc4',
  transmute: '#e67e22',
  passive: '#9b59b6',
  operator: '#e74c3c',
}

/** 附魔类别中文名 */
const ENCHANTMENT_CATEGORY_LABELS: Record<string, string> = {
  apprentice: '学徒',
  quest: '任务',
  transmute: '衍生',
  passive: '被动',
  operator: '运算符',
}

/** 统一附魔信息查找 */
function getEnchantmentDisplayInfo(type: EnchantmentType, transmuteRes?: import('../core/types').ResourceType): {
  name: string; desc: string; icon: string; category: string; categoryColor: string;
} | null {
  // Quest 类型
  const questDef = getQuestEnchantmentDef(type);
  if (questDef) {
    return {
      name: questDef.name,
      desc: `${questDef.effectDesc} (${questDef.targetStacks}次触发)`,
      icon: '✨',
      category: ENCHANTMENT_CATEGORY_LABELS.quest,
      categoryColor: ENCHANTMENT_CATEGORY_COLORS.quest,
    };
  }
  // Transmute 特殊处理
  if (type === EnchantmentTypeEnum.Transmute && transmuteRes) {
    const ratio = TRANSMUTE_RATIO_TABLE[transmuteRes];
    return {
      name: TRANSMUTE_NAMES[transmuteRes],
      desc: `额外产出 ${(ratio * 100).toFixed(0)}% 的${RESOURCE_NAMES[transmuteRes]}`,
      icon: '🔀',
      category: ENCHANTMENT_CATEGORY_LABELS.transmute,
      categoryColor: ENCHANTMENT_CATEGORY_COLORS.transmute,
    };
  }
  // ENCHANTMENT_META 查找（学徒/被动/运算符）
  const meta = ENCHANTMENT_META[type as string];
  if (meta) {
    return {
      name: meta.name,
      desc: meta.desc,
      icon: meta.icon,
      category: ENCHANTMENT_CATEGORY_LABELS[meta.category] || meta.category,
      categoryColor: ENCHANTMENT_CATEGORY_COLORS[meta.category] || '#999',
    };
  }
  return null;
}

/** 词条制技能随机附魔（蜕变师路径） */
function applyAffixRandomEnchantment(
  skillId: string,
  affixSkill: import('../data/affixes').AffixSkillInstance,
  candidates: EnchantmentType[],
): void {
  const chosen = candidates[Math.floor(random() * candidates.length)];
  affixSkill.enchantmentIds.push(chosen);
  // Transmute：随机分配目标资源
  if (chosen === EnchantmentTypeEnum.Transmute) {
    const playerClass = state.classId !== 'none' ? state.classId : undefined;
    const eligible = getTransmuteEligibleResources(affixSkill.resource, playerClass);
    if (eligible.length > 0) {
      affixSkill.transmuteResource = eligible[Math.floor(random() * eligible.length)];
    }
  }
  const info = getEnchantmentDisplayInfo(chosen, affixSkill.transmuteResource);
  if (info) {
    showFeedback(t('shop.random_enchant', { icon: info.icon, name: info.name }), '#f9ca24');
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

  const playerClass = state.classId !== 'none' ? state.classId : undefined;

  // 预处理 Transmute 候选：展开为资源变体并预分配
  type ShownCandidate = { enchType: EnchantmentType; transmuteRes?: import('../core/types').ResourceType };
  const expandedCandidates: ShownCandidate[] = [];
  for (const enchType of candidates) {
    if (enchType === EnchantmentTypeEnum.Transmute) {
      const eligible = getTransmuteEligibleResources(affixSkill.resource, playerClass);
      if (eligible.length > 0) {
        // 随机选一个资源作为此候选的展示
        const res = eligible[Math.floor(random() * eligible.length)];
        expandedCandidates.push({ enchType, transmuteRes: res });
      }
    } else {
      expandedCandidates.push({ enchType });
    }
  }

  // 取最多 2 个候选
  const shown = expandedCandidates.length <= 2 ? expandedCandidates : (() => {
    const a = expandedCandidates[Math.floor(random() * expandedCandidates.length)];
    let b = expandedCandidates[Math.floor(random() * expandedCandidates.length)];
    // dedupe by enchType + transmuteRes
    if (a.enchType === b.enchType && a.transmuteRes === b.transmuteRes) {
      return [a];
    }
    return [a, b];
  })();

  titleEl.textContent = t('shop.enchant_choose', { name: affixSkill.name });
  branchesEl.innerHTML = '';

  shown.forEach(({ enchType, transmuteRes }) => {
    const info = getEnchantmentDisplayInfo(enchType, transmuteRes);
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
      if (enchType === EnchantmentTypeEnum.Transmute && transmuteRes) {
        affixSkill.transmuteResource = transmuteRes;
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
  modal.style.display = 'flex';
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
  }

  if (highlights.length === 0) return;

  // 收集每个键位的颜色（后覆盖前）
  const keyColorMap = new Map<string, string>();
  for (const { rel, color } of highlights) {
    for (const k of getKeysWithRelation(key, rel)) {
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
    const affixSk = state.affixSkills.get(skillId);
    if (affixSk) showFeedback(t('shop.unbound', { name: affixSk.name, key: key.toUpperCase() }), '#ff6b6b');
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
        if (skillId && state.affixSkills.has(skillId)) {
          const affixSkill = state.affixSkills.get(skillId)!;
          const rt = state.affixSkillStates.get(skillId);
          const baseVal = affixSkill.baseValues[affixSkill.level - 1] ?? affixSkill.baseValues[0];
          const resIcon = RESOURCE_ICONS[affixSkill.resource] || '';
          const resName = RESOURCE_NAMES[affixSkill.resource] || affixSkill.resource;
          tooltipData.skill = {
            name: affixSkill.name,
            icon: affixSkill.icon,
            description: `${resIcon}${resName}+${baseVal}`,
            level: affixSkill.level,
            school: RARITY_LABELS[affixSkill.rarity] ?? '普通',
            schoolCssClass: `rarity-${affixSkill.rarity}`,
          };
          const estimate = computeSmartEstimate(affixSkill, rt, k);
          const estimatedTypes = estimate ? new Set(affixSkill.affixes.filter(a => ['multiply', 'void', 'taboo'].includes(a.type)).map(a => a.type)) : undefined;
          const fields = buildAffixTooltipFields(affixSkill, rt, estimatedTypes);
          tooltipData.skill.affixInfo = fields.affixInfo;
          tooltipData.skill.questProgress = fields.questProgress;
          tooltipData.skill.apprenticeGrowth = estimate ? undefined : fields.apprenticeGrowth;
          tooltipData.skill.smartEstimate = estimate ?? undefined;
        }
        highlightSkillRange(k);
        // Void 词条空位高亮
        if (skillId) {
          const affixSk = state.affixSkills.get(skillId);
          if (affixSk) {
            for (const affix of affixSk.affixes) {
              if (affix.type === 'void' && affix.posRel) {
                const related = getKeysWithRelation(k, affix.posRel);
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
    const affixSkill = state.affixSkills.get(skillId);
    if (!affixSkill) return;

    const boundKey = [...state.player.bindings.entries()].find(([, id]) => id === skillId)?.[0];
    const item = document.createElement('div');
    item.className = 'inventory-skill';
    item.dataset.dragType = 'skill-inventory';
    item.dataset.skillId = skillId;
    item.dataset.sellPrice = String(Math.floor((data.purchasePrice || 15) / 2));
    if (boundKey) item.classList.add('bound');

    {
      // 词条制技能渲染
      const rarityColor = RARITY_COLORS[affixSkill.rarity] || '#ffffff';
      const rarityLabel = RARITY_LABELS[affixSkill.rarity] || '普通';
      const affixNames = affixSkill.affixes.map(a => AFFIX_NAMES[a.type]).join('·');
      item.style.borderColor = rarityColor;
      item.innerHTML = `
        <span class="inv-icon">${affixSkill.icon}</span>
        <span class="inv-name">${affixSkill.name}</span>
        <span class="inv-school" style="color:${rarityColor}">${rarityLabel}</span>
        ${data.level > 1 ? `<span class="inv-level">Lv.${data.level}</span>` : ''}
        ${affixNames ? `<span class="inv-affixes" style="color:#888;font-size:10px;">${affixNames}</span>` : ''}
        ${boundKey ? `<span class="inv-key">[${boundKey.toUpperCase()}]</span>` : ''}
      `;

      // 词条制技能悬停预览
      item.addEventListener('mouseenter', (e) => {
        hideAllTooltips();
        const rt = state.affixSkillStates.get(skillId);
        const baseVal = affixSkill.baseValues[affixSkill.level - 1] ?? affixSkill.baseValues[0];
        const resIcon = RESOURCE_ICONS[affixSkill.resource] || '';
        const resName = RESOURCE_NAMES[affixSkill.resource] || affixSkill.resource;
        const tooltipData: KeyTooltipData = {
          skill: {
            name: affixSkill.name,
            icon: affixSkill.icon,
            description: `${resIcon}${resName}+${baseVal}`,
            level: affixSkill.level,
            school: rarityLabel,
            schoolCssClass: `rarity-${affixSkill.rarity}`,
          },
        };
        const estimate = computeSmartEstimate(affixSkill, rt, boundKey ?? undefined);
        const estimatedTypes = estimate ? new Set(affixSkill.affixes.filter(a => ['multiply', 'void', 'taboo'].includes(a.type)).map(a => a.type)) : undefined;
        const fields = buildAffixTooltipFields(affixSkill, rt, estimatedTypes);
        tooltipData.skill!.affixInfo = fields.affixInfo;
        tooltipData.skill!.questProgress = fields.questProgress;
        tooltipData.skill!.apprenticeGrowth = estimate ? undefined : fields.apprenticeGrowth;
        tooltipData.skill!.smartEstimate = estimate ?? undefined;
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
  hideAllTooltips();
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
