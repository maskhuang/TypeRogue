/**
 * wordPacks JSON schema — 牌包稀有度配置表
 *
 * 5 张静态表：候选词数、玩家选几个、定价、允许/排除的条件类型。
 * 运行时逻辑（filterWordsByCondition / generateWordPacks 等）仍在 wordPacks.ts。
 *
 * 注意：Set<PackConditionType> 在 JSON 中转为 `string[] | null`，wordPacks.ts 载入时重建 Set。
 */

import { z } from 'zod';
import wordPacksJson from '../../../data-json/wordPacks.json' with { type: 'json' };

const rarityConditionRecord = z.object({
  '0': z.array(z.string()).nullable(),
  '1': z.array(z.string()).nullable(),
  '2': z.array(z.string()).nullable(),
  '3': z.array(z.string()).nullable(),
});

export const wordPacksSchema = z.object({
  candidateCount: z.array(z.number()).length(4),
  pickCount: z.array(z.number()).length(4),
  basePrice: z.array(z.number()).length(4),
  allowedConditions: rarityConditionRecord,
  excludedConditions: rarityConditionRecord,
});

export type WordPacksData = z.infer<typeof wordPacksSchema>;

function loadWordPacks(): WordPacksData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (import.meta as any).env?.DEV !== false;
  if (isDev) {
    return wordPacksSchema.parse(wordPacksJson);
  }
  return wordPacksJson as WordPacksData;
}

export const WORD_PACKS_DATA: WordPacksData = loadWordPacks();
