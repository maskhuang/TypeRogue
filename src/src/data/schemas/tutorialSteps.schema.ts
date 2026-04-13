/**
 * tutorialSteps JSON schema — 教程步骤数据
 *
 * 注意：每个 step 的 trigger.condition / content.paramsProvider 是函数，
 * 由 systems/tutorial/tutorialInit.ts 在运行时就地 mutate 注入。
 * 所以 JSON 中不含这两个字段，schema 中也不写它们；TypeScript 接口
 * (TutorialStep) 在 tutorialSteps.ts 中保留 optional 函数字段。
 *
 * 因此本 schema 描述的是"反序列化时的数据形状"，不是"运行时完整 step 形状"。
 */

import { z } from 'zod';
import tutorialStepsJson from '../../../data-json/tutorialSteps.json' with { type: 'json' };

const triggerSchema = z.object({
  event: z.string(),
  delay: z.number().optional(),
});

const anchorPositionSchema = z.enum(['top', 'bottom', 'left', 'right']);

const contentSchema = z.object({
  titleKey: z.string(),
  bodyKey: z.string(),
  anchorElement: z.string().optional(),
  anchorPosition: anchorPositionSchema.optional(),
  highlight: z.string().optional(),
});

const stepSchema = z.object({
  id: z.string(),
  level: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  trigger: triggerSchema,
  content: contentSchema,
  dismissAfter: z.number().optional(),
  prerequisite: z.string().optional(),
  pauseGame: z.boolean().optional(),
});

export const tutorialStepsSchema = z.object({
  L0: z.array(stepSchema),
  L1: z.array(stepSchema),
  L2: z.array(stepSchema),
  L3: z.array(stepSchema),
  L4: z.array(stepSchema),
  L5: z.array(stepSchema),
  demo: z.array(stepSchema),
});

export type TutorialStepsData = z.infer<typeof tutorialStepsSchema>;

function loadTutorialSteps(): TutorialStepsData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (import.meta as any).env?.DEV !== false;
  if (isDev) {
    return tutorialStepsSchema.parse(tutorialStepsJson);
  }
  return tutorialStepsJson as TutorialStepsData;
}

export const TUTORIAL_STEPS_DATA: TutorialStepsData = loadTutorialSteps();
