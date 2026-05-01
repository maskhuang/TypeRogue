// ============================================
// 打字肉鸽 - 职业数据定义
// ============================================
// Story 32.1 Task 1: 职业定义框架

import type { ClassId, FeatureId, ResourceType } from '../core/types';
import { CLASSES_DATA } from './schemas/classes.schema';

/**
 * 职业定义接口
 */
export interface ClassDefinition {
  id: ClassId;
  name: string;
  description: string;
  icon: string;
  /** 独有资源类型 */
  uniqueResource: ResourceType | null;
  /** 失去的能力 */
  loseFeature: FeatureId | null;
  /** 失去能力的描述 */
  loseDescription: string | null;
  /** 初始遗物 ID */
  starterRelic: string | null;
  /** Stage 3 · 工作区域代号 (例: DOC-4B) */
  zoneCode: string;
  /** Stage 3 · 区域中文名 (例: 文牍区) */
  sectionZh: string;
  /** Stage 3 · 区域英文名 (例: DOCUMENTATION SECTION) */
  sectionEn: string;
  /** Stage 3 · 密级 (例: CLR 4-B) */
  clearance: string;
}

/**
 * 所有职业定义
 *
 * 数据来源：data-json/classes.json，由 schemas/classes.schema.ts 校验加载（Story 57.1）
 */
export const CLASS_DEFINITIONS: Record<ClassId, ClassDefinition> =
  CLASSES_DATA.definitions as Record<ClassId, ClassDefinition>;

/**
 * 获取职业定义
 */
export function getClassDefinition(classId: ClassId): ClassDefinition {
  return CLASS_DEFINITIONS[classId];
}

/**
 * 获取所有职业 ID 列表（不含 none）
 */
export function getSelectableClassIds(): ClassId[] {
  return (['wordsmith', 'metamorph'] as ClassId[]);
}
