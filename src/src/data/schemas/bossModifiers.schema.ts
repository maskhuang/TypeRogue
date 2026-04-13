/**
 * bossModifiers JSON schema — Boss 修饰器元数据
 *
 * 仅描述静态 meta 数据；BOSS_MODIFIER_REGISTRY (含 apply/cleanup/onTick 函数)、
 * 所有运行时函数（transformWordForModifier 等）保留在 bossModifiers.ts。
 */

import { z } from 'zod';
import bossModifiersJson from '../../../data-json/bossModifiers.json' with { type: 'json' };

const modifierCategorySchema = z.enum(['offense', 'defense', 'disruption']);

const modifierMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  eliteHint: z.string(),
  category: modifierCategorySchema,
});

export const bossModifiersSchema = z.object({
  modifierIds: z.array(z.string()),
  meta: z.record(z.string(), modifierMetaSchema),
});

export type BossModifiersData = z.infer<typeof bossModifiersSchema>;

function loadBossModifiers(): BossModifiersData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (import.meta as any).env?.DEV !== false;
  if (isDev) {
    return bossModifiersSchema.parse(bossModifiersJson);
  }
  return bossModifiersJson as BossModifiersData;
}

export const BOSS_MODIFIERS_DATA: BossModifiersData = loadBossModifiers();
