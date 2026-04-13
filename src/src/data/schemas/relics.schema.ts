/**
 * relics JSON schema — 遗物定义
 *
 * 53 个遗物的静态数据。RELIC_MODIFIER_DEFS / RELIC_FLAGS 目前为空，不抽。
 * 所有查询函数（getRelicsByRarity 等）保留在 relics.ts。
 *
 * 注意：RelicEffect 的 modifier 字段类型很多（RelicModifierType 联合），schema 中用
 * `z.string()` 通过校验；运行时精细类型由 relics.ts 的 interface 约束。这是 Story
 * dev notes 明确允许的"先用宽类型占位，后续 Story 细化"策略。
 */

import { z } from 'zod';
import relicsJson from '../../../data-json/relics.json' with { type: 'json' };

const relicRaritySchema = z.enum(['common', 'rare', 'epic', 'legendary']);

const relicConditionSchema = z.object({
  type: z.string(),
  threshold: z.number().optional(),
  stageType: z.enum(['normal', 'boss']).optional(),
});

const relicEffectSchema = z.object({
  type: z.string(),
  modifier: z.string(),
  value: z.number(),
  condition: relicConditionSchema.optional(),
});

const relicDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  rarity: relicRaritySchema,
  basePrice: z.number(),
  effects: z.array(relicEffectSchema),
  flavor: z.string().optional(),
  category: z.literal('risk-reward').optional(),
  subsystem: z.string().optional(),
  behaviorType: z.string().optional(),
  requiresSubsystem: z.string().optional(),
});

export const relicsSchema = z.object({
  maxRelicSlots: z.number(),
  relics: z.record(z.string(), relicDataSchema),
  deletedRelicIds: z.array(z.string()),
});

export type RelicsData = z.infer<typeof relicsSchema>;

function loadRelics(): RelicsData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (import.meta as any).env?.DEV !== false;
  if (isDev) {
    return relicsSchema.parse(relicsJson);
  }
  return relicsJson as RelicsData;
}

export const RELICS_DATA: RelicsData = loadRelics();
