/**
 * words JSON schema — 词库池
 *
 * 仅描述 WORD_POOL 的数据形状；getStarterWords / calculateDeckStats 等运行时函数保留在 words.ts。
 */

import { z } from 'zod';
import wordsJson from '../../../data-json/words.json' with { type: 'json' };

const wordPoolEntrySchema = z.object({
  words: z.array(z.string()),
  cost: z.number(),
  tier: z.number(),
  highlight: z.string().optional(),
});

export const wordsSchema = z.object({
  wordPool: z.record(z.string(), wordPoolEntrySchema),
});

export type WordsData = z.infer<typeof wordsSchema>;

function loadWords(): WordsData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (import.meta as any).env?.DEV !== false;
  if (isDev) {
    return wordsSchema.parse(wordsJson);
  }
  return wordsJson as WordsData;
}

export const WORDS_DATA: WordsData = loadWords();
