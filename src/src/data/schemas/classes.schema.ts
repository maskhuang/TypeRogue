/**
 * classes JSON schema — 职业定义
 *
 * 仅描述静态数据形状；ClassDefinition interface 和 helper 函数（getClassDefinition、
 * getSelectableClassIds）保留在 classes.ts。
 */

import { z } from 'zod';
import classesJson from '../../../data-json/classes.json' with { type: 'json' };

const classIdSchema = z.enum(['none', 'wordsmith', 'metamorph']);

const classDefinitionSchema = z.object({
  id: classIdSchema,
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  uniqueResource: z.string().nullable(),
  loseFeature: z.string().nullable(),
  loseDescription: z.string().nullable(),
  starterRelic: z.string().nullable(),
  // Stage 3 · 工作区域代号字段（duty roster 渲染用）
  zoneCode: z.string(),
  sectionZh: z.string(),
  sectionEn: z.string(),
  clearance: z.string(),
});

export const classesSchema = z.object({
  definitions: z.record(classIdSchema, classDefinitionSchema),
});

export type ClassesData = z.infer<typeof classesSchema>;

function loadClasses(): ClassesData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (import.meta as any).env?.DEV !== false;
  if (isDev) {
    return classesSchema.parse(classesJson);
  }
  return classesJson as ClassesData;
}

export const CLASSES_DATA: ClassesData = loadClasses();
