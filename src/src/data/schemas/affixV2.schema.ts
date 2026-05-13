/**
 * affixV2 JSON schema — 新 affix 系统词条静态数据
 *
 * 来源：docs/design/affix-rewrite-naming-pool.md §1.1-1.8
 * 决策：docs/design/affix-rewrite-research.md §4（C 完全重做）
 */

import { z } from 'zod';
import affixV2Json from '../../../data-json/affixV2.json' with { type: 'json' };

/** Section tag 词表（与 affixTags.ts SECTION_TAGS 同步） */
const sectionTagSchema = z.enum([
  'maintenance', 'locomotion', 'posture', 'agonistic',
  'vocal', 'gesture', 'tool', 'abnormal',
]);

const phaseSchema = z.enum(['P1', 'P2']);

// trigger / effect 字段 JSON 形态用 z.any() 占位
// 严格 schema 在 src/src/data/affixV2Trigger.ts 的 TypeScript 类型中维护；
// 运行时 type-cast 已足够。JSON 未填时 buildDefinition 自动用默认值。
const affixV2DefinitionSchema = z.object({
  id: z.string().min(1),
  name_zh: z.string().min(1),
  name_en: z.string().min(1),
  section: sectionTagSchema,
  phase: phaseSchema,
  notes: z.string().optional(),
  trigger: z.unknown().optional(),
  effect: z.unknown().optional(),
});

export const affixV2DataSchema = z.object({
  $schema: z.string().optional(),
  _doc: z.string().optional(),
  affixes: z.array(affixV2DefinitionSchema),
});

export type AffixV2DefinitionData = z.infer<typeof affixV2DefinitionSchema>;
export type AffixV2Data = z.infer<typeof affixV2DataSchema>;

function loadAffixV2(): AffixV2Data {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (import.meta as any).env?.DEV !== false;
  if (isDev) {
    return affixV2DataSchema.parse(affixV2Json);
  }
  return affixV2Json as AffixV2Data;
}

export const AFFIX_V2_DATA: AffixV2Data = loadAffixV2();
