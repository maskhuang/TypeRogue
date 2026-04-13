/**
 * affixes JSON schema — 词条/附魔静态数据表
 *
 * 覆盖面：分类/权重/展示/数值/概率/附魔 meta 等 20+ 张静态表
 *
 * **重要**：所有 `Record<AffixType, X>` / `Record<ResourceType, X>` / `Record<PositionRelation, X>`
 * 在 JSON 中都是 `Record<string, X>`，schema 用 `z.record(z.string(), ...)` 校验，
 * 运行时在 affixes.ts 中 cast 回精细类型。
 *
 * **不抽**（保留在 affixes.ts）：
 *   - AffixType / EnchantmentType enum（运行时类型）
 *   - AffixInstance / AffixSkillInstance / SkillRuntimeState / AffixSkillSaveData interface
 *   - 所有函数（rollAffixWeights / getSkillMaxLevel / createSkillRuntimeState / applyAffixLevelScaling 等）
 *   - AFFIX_WEIGHTS（mutable，由 rollAffixWeights 运行时生成）
 *   - QUEST_AFFIX_MAP / QUEST_ENCHANTMENT_DEFS / AFFIX_LEVEL_SCALING（含 enum keys，后续 Story 细化）
 */

import { z } from 'zod';
import affixesJson from '../../../data-json/affixes.json' with { type: 'json' };

const stringArrayRecord = z.record(z.string(), z.array(z.string()));
const numberRecord = z.record(z.string(), z.number());
const numberArrayRecord = z.record(z.string(), z.array(z.number()));

/**
 * SkillRarity 是 `0 | 1 | 2 | 3` numeric literal union，JSON keys 是字符串 "0"-"3"。
 * 强制 schema 校验键精确存在，避免 `as unknown as Record<SkillRarity, ...>` 宽松 cast 风险。
 */
const rarityKeyedStringMap = z.object({
  '0': z.string(),
  '1': z.string(),
  '2': z.string(),
  '3': z.string(),
});

const enchantmentMetaSchema = z.object({
  icon: z.string(),
  name: z.string(),
  desc: z.string().optional(),
});

export const affixesSchema = z.object({
  // Category & weight
  affixCategoryMap: stringArrayRecord,
  affixWeightTiers: z.record(z.string(), z.enum(['high', 'low', 'none'])),
  affixClassRestriction: z.record(z.string(), z.string()),
  // Display / localization
  affixNames: z.record(z.string(), z.string()),
  affixDescriptions: z.record(z.string(), z.string()),
  resourceNames: z.record(z.string(), z.string()),
  rarityNames: rarityKeyedStringMap,
  rarityColors: rarityKeyedStringMap,
  transmuteNames: z.record(z.string(), z.string()),
  // Numeric / probability
  baseValues: numberArrayRecord,
  rarityProbabilities: z.array(z.number()).length(4),
  critMultiplier: z.number(),
  fateCoinCritCap: z.number(),
  fateCoinConversion: z.number(),
  voidBonusTable: numberRecord,
  swarmBonusTable: numberRecord,
  flowBonusTable: numberRecord,
  confluenceBonusTable: numberRecord,
  unionBonusTable: numberRecord,
  convertKTable: z.record(z.string(), z.tuple([z.number(), z.number()])),
  transmuteRatioTable: numberRecord,
  multiplyOperatorCalibration: numberRecord,
  multiplyOperatorBaseValues: numberArrayRecord,
  apprenticeNeighborGrowth: numberRecord,
  // Enchantment
  enchantmentMeta: z.record(z.string(), enchantmentMetaSchema),
  classRestrictedEnchantments: z.record(z.string(), z.array(z.string())),
  // Legacy
  oldSkillPrefixes: z.array(z.string()),
});

export type AffixesData = z.infer<typeof affixesSchema>;

function loadAffixes(): AffixesData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (import.meta as any).env?.DEV !== false;
  if (isDev) {
    return affixesSchema.parse(affixesJson);
  }
  return affixesJson as AffixesData;
}

export const AFFIXES_DATA: AffixesData = loadAffixes();
